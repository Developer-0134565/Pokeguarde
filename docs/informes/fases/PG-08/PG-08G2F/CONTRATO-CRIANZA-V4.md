# PG-08G.2F — CONTRATO DE CRIANZA V4

**Vigencia:** consolida BR-01…BR-08 para el piloto Gen II. **Ejecución:** NO autorizada. V4 sustituye documentalmente a V3 en los puntos decididos; no reescribe V3 ni informes históricos.

## 1. Modelo de capacidad

| Contador | Valor | Estado | Fuente |
|---|---|---|---|
| `EggInventory.capacity` | 20 huevos `claimed` por usuario | `DECIDED` | BR-01 |
| `PendingEggCapacity.initial` | 2 pendientes por usuario | `DECIDED` | BR-02 |
| Mejoras de tienda | pendientes | `DEFERRED` | BR-02 |
| C2 histórico (`produced`/`pending_assignment`/`stored`) | 4 de prueba | histórico, no redefinido | PG-08E/F |
| C3 / C4 | C3 = pendientes del nuevo contrato; C4 diferido | `DECIDED` / `DEFERRED` | BR-02 / BR-07 |

Invariantes: `pending <= 2`, `claimed <= 20`, contadores separados, ningún pendiente cuenta como inventario, ningún huevo `claimed` vuelve a pendiente.

## 2. Chequeo y producción

- `BreedingCheck` cada 60 minutos con `checkId` determinista derivado de `nurseryId`, `pairRevision`, `checkNumber` y ventana lógica.
- Condiciones: pareja compatible Gen II (`gen2-gs`/`gen2-crystal`), procedencia criable, ambos `HungrySnapshot.ratio >= 0.70`, capacidad pendiente disponible para ambos destinatarios.
- Si se cumplen, **producción garantizada**: dos huevos simulados, uno por propietario. No se consulta la tabla PROVISIONAL de rareza de PG-08D para decidir la puesta en este piloto.
- Resultados: `CHECK_OK_PRODUCED`, `CHECK_HUNGRY_BELOW_THRESHOLD`, `CHECK_PENDING_FULL`, `CHECK_PAIR_INVALID`, `CHECK_DUPLICATE`, `CHECK_PROVENANCE_REJECTED`.
- Un chequeo fallido **no** consume el presupuesto de eventos exitosos; sí se registra como chequeo procesado para evitar reprocesos.

## 3. Hungry

- No existe campo `HungryActual`/`HungryMax`: se usa `PetState.hunger` (0–100, inicial 82).
- `HungrySnapshot = { actual: hunger, max: 100, ratio: hunger / 100, at }`. `max = 100` es el límite verificado por `clamp(v,0,100)`, no un campo nuevo.
- `PairMember` no expone hambre: hace falta una proyección determinista futura, sin persistir un campo inventado.
- Offline: reconstruir hambre **por cada hora** con las mismas reglas de `advance()` (1.7/h dormido, 3.6/h despierto, moderadores derasgo/naturaleza, bloques de 15 min, reloj inyectado). No reutilizar el valor de desconexión para todas las horas.

## 4. Entrega, recogida e incubación

- `EggProductionEvent` crea dos `PendingEgg` con identidades derivadas de `cycleId`, `productionEventId` y `recipientRole`.
- `EggClaim` es manual e idempotente; al confirmarse, el huevo pasa a `claimed` y entra al inventario.
- `IncubationTimer` comienza en `claimedAt`, nunca en `producedAt`. Duración: `UNKNOWN_HATCH_COOLDOWN`, `BLOCKED` hasta referencia aprobada. C4 no se crea.
- Etapas PG-08F `produced → stored → assigned → available → claimed → delivered` se conservan; `available` = pendiente de recogida, `claimed` = inventario.

## 5. Offline ALL

- `OfflinePolicy = "ALL"` pasa a ser el valor contractual de V4. El código actual solo tiene `single | bounded`: su implementación es trabajo futuro de PG-08G.3.
- Conservar todo el tiempo pendiente; procesar ventanas consecutivas de hasta 24 h usando intervalo semiabierto `(lastAt, lastAt + 24h]`.
- Hasta **24 chequeos por ventana**; cada chequeo tiene `checkId` propio y su resultado se persiste.
- Contadores separados: `checksProcessed` (incluye fallidos) y `successfulEvents` (solo Producción 1+1). `maxEvents=5` queda **sustituido** por esta distinción en V4.
- 72 h = tres ventanas de 24 h; sin descartar tiempo; sin cola adicional de huevos.

## 6. Atomicidad e idempotencia

- Según PG-08B: autenticación → `BEGIN IMMEDIATE` → reconstrucción desde eventos → ejecución → inserción de **todos** los eventos nuevos → `COMMIT`; excepción → `ROLLBACK`.
- Según PG-08F: ciclo `queued` → dos huevos → `produced` en una sola SQLite; `prepareDelivery`/`confirmDelivery`/`retry` idempotentes; `replay` y `drainBacklog` para recuperación.
- No hay atomicidad distribuida con `data/pokegotchi.db` saves, EventStore externo ni servicios online. `data/pokegotchi.db` no se abre ni se migra en esta misión.

## 7. Invariantes globales

1. Un ciclo exitoso = exactamente dos huevos, uno por propietario.
2. Misma semilla para las reglas, distinta derivación por `recipientRole`/`eggId`.
3. `realPkm:false`, `exportable:false`, `simulated:true`, `hatched:false`.
4. RNG HMAC-SHA256; sin equivalencia con RNG de cartucho; semilla maestra nunca persistida.
5. Cuatro capas de legalidad separadas: interna, generacional, PKHeX, exportabilidad.
6. Sin IV/DV editados, sin met data inventado, sin exportación.
7. Sin `Math.random`, sin `Date.now`; reloj inyectado.
8. Cada identidad derivada es estable bajo reintentos y reinicios.

## 8. Errores contractuales

`CAPACITY_EXHAUSTED`, `INVENTORY_FULL`, `PENDING_FULL`, `HUNGRY_BELOW_THRESHOLD`, `CHECK_DUPLICATE`, `CYCLE_DUPLICATE`, `PAIR_ID_COLLISION`, `RECIPIENT_MISMATCH`, `PARENT_OWNERSHIP_CHANGED`, `UNKNOWN_HATCH_COOLDOWN`, `UNRESOLVED_POLICY`, `CLOCK_ROLLBACK`, `WINDOW_EXCEEDED`, `STALE_REVISION`, `STORE_ISOLATION_VIOLATION`, `INVALID_CANDIDATE_NOT_PKM`.

## 9. Bloqueos reales

- `UNKNOWN_HATCH_COOLDOWN` (`BLOCKED`): sin duración ni fórmula aprobable.
- Conducta ante pendiente lleno: propuesta pendiente (fallo atómico del par, sin consumir idempotencia).
- Implementación de `ALL`: pendiente de PG-08G.3 con autorización expresa.
- PG-08G.3 sigue **NO autorizado**.
