# PG-08G.2F — CONFLICTOS RESUELTOS Y ABIERTOS

Los estados son `RESUELTO`, `PARCIAL`, `ABIERTO` y `BLOQUEADO`. `RESUELTO`
significa que hay decisión expresa o evidencia verificable; una recomendación
redactada aquí no constituye aprobación.

## 1. Conflictos exigidos

| # | Conflicto | Estado | Fundamento |
|---|---|---|---|
| 1 | C2 = 4 histórico frente a inventario 20 | **RESUELTO** | BR-01 define inventario como huevos `claimed`, máximo 20. C2 contaba `produced`/`pending_assignment`/`stored` (`egg-domain.ts:428-429`); no se reescribe ni se equipara. Se introduce `EggInventory.capacity=20`, distinto de C2. |
| 2 | Pendientes 2 frente a entrega 1+1 | **RESUELTO** con detalle abierto | BR-02 fija 2 pendientes **por usuario**; BR-05 entrega un huevo a cada propietario. La comprobación de capacidad se hace para ambos antes de confirmar; el comportamiento exacto con un inventario/pendiente lleno queda abierto con recomendación de fallo atómico. |
| 3 | `single` frente a huevos pendientes | **RESUELTO** | `single` prohíbe cola adicional (`SINGLE_BACKLOG_FORBIDDEN`); `pending` es el estado normal de recogida de PG-08F (`available`), no una cola C3. BR-08 añade `ALL` solo para reconciliación offline. |
| 4 | Rareza PG-08D frente a producción garantizada | **RESUELTO** | BR-03: si se cumplen todas las condiciones, se produce. La tabla PROVISIONAL de PG-08D se conserva para otras aplicaciones; no es compuerta en este piloto. |
| 5 | Semántica real de Hungry | **RESUELTO** | No hay `HungryActual`/`HungryMax`; `PetState.hunger` está acotado 0–100 (`pet-engine.ts:68,92`). La proyección `actualE2/maxE2` usa el límite verificado, sin crear campo nuevo. |
| 6 | Hungry durante ausencia | **PARCIAL** | BR-04 exige reconstrucción por hora, no valor único. `advance()` permite hacerlo con reloj inyectado hasta su ventana verificada de 7 días; 24/48/72 h caben. Más allá: `HUNGRY_HISTORY_UNAVAILABLE`, abierto. |
| 7 | `maxEvents = 5` frente a 24 chequeos | **RESUELTO** | BR-08 sustituye documentalmente la propuesta antigua. `plannedChecks`/`checksSucceeded` ≤ 24 por ventana; fallidos y saltados se contienen aparte y no consumen el presupuesto de éxitos. |
| 8 | `ALL` frente a `OfflinePolicy` actual | **RESUELTO documentalmente** | `breeding-engine.ts:55` solo tiene `single|bounded`. V4 define `ALL` como nueva política contractual; no se modifica código ni se reescribe PG-08D. |
| 9 | Estados `stored`, `pending` y `claimed` | **RESUELTO** | `stored`/`available` son pendientes (≤2 por usuario); `claimed` entra al inventario (≤20) e inicia el cooldown. No se crea `in_inventory`; `CAPACITY_STATES` histórico queda intacto. |
| 10 | Cooldown de incubación | **BLOQUEADO** | Auditoría exhaustiva: sin valor ni fórmula aprobada. `UNKNOWN_HATCH_COOLDOWN`. Véase `INCUBACION-COOLDOWN-AUDIT.md`. |
| 11 | Capacidad agotada e idempotencia | **PARCIAL** | PG-08B/F garantizan `CAPACITY_EXHAUSTED` sin consumir clave y dedupe `UNIQUE`. Falta decidir si el par se cancela y se reevalúa en el siguiente chequeo o se retiene de otra forma. Recomendación: fallo atómico y reevaluación. |
| 12 | Recuperación tras interrupciones | **RESUELTO** | PG-08B (`BEGIN IMMEDIATE`, eventos `fresh`, rollback) y PG-08F (`replay`, `retry`, `drainBacklog`, `integrityCheck`). Atomicidad solo intra-SQLite; entre recursos, reconciliación. |

## 2. Conflictos adicionales abiertos

| ID | Conflicto | Estado | Recomendación (no aprobada) |
|---|---|---|---|
| A-1 | Precios, niveles y máximo de mejoras de pendientes | **ABIERTO** | BR-02 los difiere; no inventarlos. |
| A-2 | Inventario lleno en el momento de recoger | **ABIERTO** | `CAPACITY_EXHAUSTED(resource:"inventory")`; clave disponible; huevo sigue pendiente. |
| A-3 | Ausencia mayor a 7 días | **ABIERTO** | `HUNGRY_HISTORY_UNAVAILABLE`; no inferir hambre. |
| A-4 | Duración del cooldown | **BLOQUEADO** | Aportar referencia propietaria o fórmula cerrada. |
| A-5 | Implementación real de `ALL` | **ABIERTO** | Nuevo valor de contrato; requiere autorización de ejecución. |
| A-6 | Migración de stores existentes | **ABIERTO** | No autorizada; G3 debe usar stores aislados en `/tmp`. |

## 3. Decisiones que no se reabren

Custodia de 2 Pokémon por guardería; distribución 1+1; propiedad por rol;
`realPkm:false` y `exportable:false`; RNG HMAC-SHA256 sin equivalencia con
cartucho; C4 diferido; sin semilla maestra de producción; sin implementación,
migraciones, saves, PKM, commits ni pushes.

## 4. Regla de no conversión

Solo BR-01…BR-08 y el contrato PG-08G.3 comunicado por el propietario tienen
carácter `DECIDED`. Las recomendaciones de este informe no se consideran
aprobadas por estar documentadas.
