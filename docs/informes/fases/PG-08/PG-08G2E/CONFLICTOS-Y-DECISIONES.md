# PG-08G.2E — CONFLICTOS Y DECISIONES

Los estados son `DECIDED`, `PROPOSED`, `UNRESOLVED` o `BLOCKED`. Las opciones
marcadas `PROPOSED` no son decisiones aprobadas.

## 1. Conflictos exigidos por la misión

| ID | Conflicto | Evidencia | Recomendación | Estado |
|---|---|---|---|---|
| C-1 | C2 = 4 anterior frente a inventario 20 de BR-01 | `DECISIONES-D4-D8-D9.md` §4.2; `egg-domain.ts:428`; BR-01 | Reinterpretar C2 como inventario de 20 solo tras confirmar estados; no tocar PG-08A | `PROPOSED` |
| C-2 | Capacidad máxima de huevos pendientes de recogida | BR-05; `DEFAULT_BACKLOG_CAPACITY=0` | Contador `PENDING_CAPACITY` acotado e independiente; valor pendiente | `UNRESOLVED` |
| C-3 | Uno de los inventarios lleno | BR-04; `CAPACITY_EXHAUSTED` | Fallo atómico de los dos huevos, sin consumir idempotencia; reevaluar en el siguiente chequeo | `PROPOSED` |
| C-4 | Hungry cambia durante una ausencia | BR-03; `pet-engine.ts:218-303` | Evaluar en cada chequeo con instantánea determinista; no usar solo valor final | `PROPOSED` |
| C-5 | Los chequeos fallidos consumen el límite de eventos offline | BR-02; BR-07; `maxEvents=5` | Sí como eventos de chequeo procesados; no como huevos producidos | `PROPOSED` |
| C-6 | Procesar 72 h sin perder chequeos con ventana de 24 h | BR-07; R-B4 `maxWindowMs=86400000` | Tres ventanas consecutivas de 24 h con `checkId` determinista y marcas persistidas | `PROPOSED` |
| C-7 | Inicio exacto del cooldown tras recogida tardía | BR-06; BR-05 | `incubationStartedAt` = `at` de la recogida confirmada; nunca `producedAt` | `PROPOSED` |
| C-8 | Persistencia de pendientes y prevención de duplicados | PG-08E/F; `cycleId`, `pair_cycles`, `pair_deliveries` | Persistir `checkId` y resultado; clave de recogida por ciclo/evento/rol; reintentos devuelven el mismo resultado | `PROPOSED` |

## 2. Conflictos adicionales detectados

| ID | Conflicto | Evaluación | Estado |
|---|---|---|---|
| C-9 | Política `ALL` de BR-07 frente a `OfflinePolicy = "single" | "bounded"` en `breeding-engine.ts:55` | Requiere nuevo valor de contrato; no se modifica código. | `PROPOSED` |
| C-10 | Chequeo horario frente a tabla de intervalos por rareza de PG-08D | Chequeo = evaluación; producción = evento condicionado por rareza. | `PROPOSED` |
| C-11 | `maxEvents = 5` es incompatible con 24 chequeos horarios por ventana | Proponer `maxEvents = 24` por ventana de 24 h con intervalo semiabierto `(lastAt, lastAt+24h]`. **No modificado.** | `PROPOSED` |
| C-12 | `HungryActual`/`HungryMax` no existen como campos | Mapear a `PetState.hunger` / 100; requiere confirmación. | `UNRESOLVED` |
| C-13 | `PairMember` no expone hambre | Crear proyección determinista en el futuro piloto; no inventar dato. | `UNRESOLVED` |
| C-14 | Duración del cooldown de incubación no localizada | Fallo cerrado con `UNKNOWN_HATCH_COOLDOWN` hasta referencia aprobada. | `BLOCKED` |
| C-15 | «Inventario» puede ser `stored` o `claimed` | A conserva contratos; B coincide con BR-05 pero exige revisar `CAPACITY_STATES`. | `UNRESOLVED` |
| C-16 | `WINDOW_EXCEEDED` descarta tiempo frente a BR-07 «sin descartar» | Sustituir por procesamiento progresivo por ventanas; requiere decisión. | `PROPOSED` |

## 3. Decisiones que ya no deben reabrirse

- Custodia de dos Pokémon por guardería.
- Distribución 1+1 por ciclo.
- Propiedad por rol y cadena de transferencia evaluada después de la genética.
- `realPkm:false` y `exportable:false` para resultados simulados.
- RNG HMAC-SHA256 y sin equivalencia con cartucho.
- C4 diferido.
- Sin semilla maestra de producción.
- Sin implementación, migraciones, saves, PKM, commits ni pushes.

## 4. Decisiones humanas pendientes

1. Confirmar la definición de inventario y si C2 pasa a 20 con esos estados.
2. Fijar `PENDING_CAPACITY` o confirmar que queda diferida.
3. Confirmar si la tabla de rareza de PG-08D sigue vigente junto al chequeo
   horario.
4. Confirmar el mapeo de Hungry y la proyección desde el estado de la mascota.
5. Confirmar si los chequeos fallidos consumen el presupuesto de eventos.
6. Aprobar o rechazar `maxEvents = 24` por ventana de 24 h y el procesamiento
   de 72 h en tres ventanas.
7. Aportar la referencia de la duración del cooldown de incubación.
8. Elegir la interpretación de estados A/B/C para recogida e inventario.

## 5. Regla de no conversión

Ninguna recomendación de este documento se considera aprobada por el hecho de
estar redactada. Solo BR-01…BR-07 y el contrato PG-08G.3 comunicado por el
propietario tienen carácter de `DECIDED`.
