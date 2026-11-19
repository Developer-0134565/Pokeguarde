# PG-08G.1 — RNG y determinismo del par 1+1 (propuesta, NO implementada)

## Requisitos

Un ciclo, dos huevos, dos propietarios, dos resultados genéticos distintos,
reproducibilidad controlada en pruebas y ausencia de duplicados por reintento.
No se usa `Math.random()` en lógica crítica.

## Error que debe evitarse

Derivar la genética solo de `cycleId` daría la **misma secuencia** al huevo del
anfitrión y al del invitado. Derivar solo de `eggId` mezclaría identidad con
azar. La solución propuesta es un contexto de derivación con **separación de
dominios** y una semilla maestra autoritativa.

## Contexto de derivación propuesto

```ts
interface DerivationContext {
  readonly cycleId: string;        // PG-08D/PG-08F
  readonly eggId: string;          // pairEggIdFor(cycleId, recipientRole)
  readonly recipientRole: "host" | "guest_owner";
  readonly authoritySequence: number;
  readonly idempotencyKey: string;
  readonly rulesetVersion: string; // p. ej. "gen2.v1"
  readonly algorithmId: string;    // p. ej. "pg08g2.gen2.dv-v1"
  readonly purpose: string;        // "species" | "gender" | "ivdv" | ...
}
```

Semilla efectiva propuesta (conceptual):

```
seed = HMAC-SHA256(
  masterSeed,
  encode(cycleId | eggId | recipientRole | authoritySequence |
         rulesetVersion | algorithmId | purpose)
)
stream = SHA256-CTR(seed, contador)
draw(channel) =bytes → número entero dentro del rango de la regla
```

`purpose` evita que, por ejemplo, el canal de sexo reutilice los bytes de
naturaleza. `recipientRole` y `eggId` garantizan que los dos huevos del par
reciban flujos distintos aunque compartan ciclo y progenitores.

## Reproducibilidad vs seguridad

| Escenario | Semilla maestra | Objetivo |
|---|---|---|
| Prueba / replay determinista | Valor fijo inyectado por el test | Reproducir exactamente el mismo resultado; verificar idempotencia y replay. |
| Simulación local | Secuencia de autoridad simulada (inyectada) | Resultado estable y auditable. |
| Producción futura (NO implementada) | Secreto de la autoridad + entropía del sistema, nunca expuesto al jugador | Evitar que el jugador prediga o manipule rasgos. |

**No** se propone usar la hora del sistema como única entropía: es predecible y
no reproducible. **No** se propone publicar la semilla maestra en el registro
de eventos; se registra solo un `algorithmId`, `rulesetVersion` y un hash de la
semilla derivada, suficiente para auditoría sin permitir reconstruirla.

## Idempotencia

PG-08F ya garantiza identidades estables (`pairEggIdFor`) y claves de
idempotencia. La derivación propuesta es una **función pura** del contexto, por
lo que repetir `resolve()` tras un reintento produce el mismo resultado. El
almacén es quien decide si ese resultado ya fue confirmado; la genética nunca
decide por sí misma si un huevo existe.

## Reglas históricas y RNG

La forma de aplicar el azar depende de la generación y se documenta con evidencia en
`MATRIZ-GENERACIONES.md`: en Gen II el sexo, el shiny y parte de los DVs están
ligados a la misma semilla; en Gen III+ existen herencia de IVs, naturaleza y
habilidad; en Gen IV/V cambian los objetos de herencia. Hasta que esas reglas
estén marcadas como VERIFIED, el resolvedor debe devolver `UNKNOWN_RULES` y no
inventar valores.

## Lo que NO se implementa en PG-08G.1

- Ningún PRNG en código de producción.
- Ninguna semilla real ni archivo de configuración de secretos.
- Ninguna probabilidad de shiny, sexo o habilidad.
- Ningún cálculo que convierta el resultado en PKM.
