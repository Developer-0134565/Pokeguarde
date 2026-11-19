# PG-08G.2 — RNG determinista

**Estado:** diseño especificado y validado con un spike aislado (12/12).
**No implementado en producción.**

## 1. Qué debe garantizar y qué NO

| Garantía | Alcance |
|---|---|
| Determinismo interno | Mismo contexto + misma semilla maestra → mismo resultado, bit a bit. |
| Separación de dominios | Dos huevos del mismo ciclo, o dos propósitos distintos, no comparten secuencia. |
| Reanudación | Se puede cortar y continuar sin repetir ni saltar números. |
| Idempotencia | Repetir la resolución no cambia el resultado. |
| Opacidad | La semilla maestra no se persiste ni se registra; solo un `seedRef`. |
| NO garantizado | Reproducir el RNG real de los cartuchos (LCG de Gen III/IV/V, `Daycare3.TryGetOriginSeed`). No hay equivalencia demostrada y no se afirma. |

Reproducibilidad interna ≠ reproducción exacta del juego original. El motor
simula **reglas** documentadas con azar propio; no clona el generador del
cartucho.

## 2. Contexto de derivación

```ts
interface DerivationContext {
  cycleId: string;            // PG-08D: identifica el ciclo
  productionEventId: string;  // PG-08E/F: identifica el evento de producción
  eggId: string;              // pairEggIdFor(cycleId, productionEventId, role)
  recipientRole: "host" | "guest";
  authoritySequence: number;  // PG-08C: secuencia autoritativa
  rulesetVersion: string;     // p. ej. "gen2.v1"
  algorithmId: string;        // p. ej. "pg08g2.gen2.dv-v1"
  purpose: Purpose;           // canal: species|gender|ivdv|nature|ability|shiny|moves
}
```

Codificación **canónica**: orden fijo de campos y separador `\u0000`, que no
puede aparecer en identificadores. Sin JSON con claves ordenadas por el motor de
turno: el orden se fija en código.

Por qué cada campo:

- `cycleId` + `productionEventId`: separan ciclos y eventos del mismo ciclo.
- `eggId` + `recipientRole`: separan el huevo del anfitrión del del invitado
  aunque compartan ciclo y progenitores (redundancia intencional: si uno se
  corrompe, el otro sigue discriminando).
- `authoritySequence`: ata el resultado a la secuencia de la autoridad, no al
  reloj del cliente.
- `rulesetVersion` + `algorithmId`: un cambio de reglas o de algoritmo produce
  resultados distintos y **no** reinterpreta huevos ya generados.
- `purpose`: evita que el canal de sexo reutilice los bytes de naturaleza.

## 3. Derivación

```
seed  = HMAC-SHA256(masterSeed, encodeContext(ctx))
ref   = SHA-256("pg08g2.seedref" || seed)          // público, 64 hex
block = SHA-256(seed || uint32be(cursor))
value = uint32be(block[0..4])                       // rechazo de módulo
draw(max) = value < floor(2^32/max)*max ? value % max : siguiente bloque
```

- `masterSeed` se inyecta (pruebas) o proviene de la autoridad (futuro). Nunca
  se escribe en SQLite, logs ni eventos.
- `seedRef` permite auditar «este huevo se generó con esta referencia» sin
  permitir reconstruir la semilla.
- El rechazo de módulo evita el sesgo de `%` sobre 2³².

## 4. Persistencia y reanudación

Se persiste, por huevo y canal:

| Dato | Persistir | Motivo |
|---|---|---|
| `cycleId`, `productionEventId`, `eggId`, `recipientRole`, `authoritySequence` | sí | Reconstruir el contexto |
| `rulesetVersion`, `algorithmId` | sí | Saber con qué reglas se generó |
| `seedRef` | sí | Auditoría y verificación de reanudación |
| `cursor` del stream | sí | Continuar sin repetir |
| `masterSeed` | **NO** | Comprometería todos los huevos |
| Resultado resuelto (`ResolvedGenetics`) | sí | El huevo no debe recalcularse al azar |

Al reanudar: `Stream.resume(seed, snapshot)` exige que `snapshot.seedRef`
coincida con la semilla derivada; si no, `SEED_MISMATCH` y no se genera nada.

## 5. Prevención de duplicados

1. La derivación es **función pura** del contexto: repetir produce lo mismo.
2. El store decide si el huevo ya existe (`pairEggIdFor` + idempotency key);
   el RNG nunca crea identidad.
3. Un reintento no avanza el cursor de un huevo ya resuelto: se devuelve el
   resultado persistido.
4. Dos huevos del par no pueden colisionar: `eggId` + `recipientRole` +
   `purpose` están en el contexto.

## 6. Reproducibilidad de pruebas vs seguridad en producción

| Escenario | Semilla maestra | Objetivo |
|---|---|---|
| Test unitario | literal fijo en el test | Resultado exacto y revisable |
| Simulación local | secuencia de autoridad simulada | Estable y auditable |
| Producción futura (no implementada) | secreto de autoridad + entropía del sistema | Impedir que el jugador prediga o manipule rasgos |

Nunca usar la hora del sistema como entropía: es predecible y rompe la
reproducibilidad. Nunca exponer la semilla maestra al cliente.

## 7. Evidencia del spike

Archivo: `docs/informes/fases/PG-08/PG-08G2/experimentos/rng-v2-spike.ts`
(ejecutado con `bun run`, **fuera** de `scripts/check.sh`).

```
OK   mismo contexto → misma secuencia
OK   host != guest (mismo ciclo, distinto huevo)
OK   purpose separa canales
OK   rulesetVersion separa versiones de reglas
OK   algorithmId separa algoritmos
OK   cycleId separa ciclos
OK   reanudar por cursor continúa la secuencia
OK   int(6) dentro de rango
OK   pick(25) dentro de rango
OK   seedRef opaco (64 hex, no expone la maestra)
OK   resolución idempotente
OK   sin Math.random ni Date.now en el módulo
PG-08G2-RNG — 12/12 correctos, 0 fallidos
```

Valores observados (semilla de prueba, no reutilizable):

```
host[0..3]  = 2213081303,4067516777,819963554,3791445596
guest[0..3] = 3922472588,3287468326,175540808,4055952625
seedRef     = b43c12101623d3de47bee4b36f54aa237eb01a8a5e87f7a2807d17480ff1ea6a
```

La primera ejecución dio **11/12**: el escaneo del propio módulo detectó la
cadena prohibida en el comentario de cabecera. Se corrigió el comentario y se
repite el escaneo; el código nunca la usó. Queda registrado como evidencia de
que la comprobación es real y no decorativa.

## 8. Límites

- El spike demuestra propiedades del esquema, **no** corrección de reglas
  genéticas.
- No se ha medido calidad estadística más allá de rangos; no se pretende un
  CSPRNG certificado, solo uno sin sesgo obvio y reproducible.
- `masterSeed` de producción no existe todavía y su custodia es una decisión
  pendiente (autoridad/secretos).
