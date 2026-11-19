# PG-08G.2G — CONTRATO DE CRIANZA V5 (PILOTO GEN II)

**Vigencia:** consolida las ocho decisiones aprobadas en la directiva §4. **Ejecución:** NO autorizada. V5 no reescribe V3/V4 ni informes históricos; solo estabiliza identificadores y delimita el piloto.

## 1. Identificadores estables y colisión resuelta

La numeración `BR` se reutilizó entre fases. Para evitar ambigüedad se adopta el prefijo **`G2G-BR-nn`** para las decisiones de esta directiva:

| ID estable | Directiva §4 | Equivalente G2F | Estado |
|---|---|---|---|
| `G2G-BR-01` | Inventario 20 `claimed` | `G2F-BR-01` | APPROVED |
| `G2G-BR-02` | 2 pendientes por usuario | `G2F-BR-02` | APPROVED |
| `G2G-BR-03` | Chequeo 60 min, producción 1+1 garantizada | `G2F-BR-03` + parte de `G2F-BR-05` | APPROVED |
| `G2G-BR-04` | Hungry ≥70 % por progenitor | `G2F-BR-04` | APPROVED |
| `G2G-BR-05` | Recogida manual idempotente | `G2F-BR-06` | APPROVED |
| `G2G-BR-06` | Incubación desde `claimedAt` | `G2F-BR-06` (cooldown) + `G2F-BR-07` | APPROVED en el inicio; duración BLOCKED |
| `G2G-BR-07` | Vigencia documental V4 | nueva (resuelve la colisión histórica) | APPROVED |
| `G2G-BR-08` | Offline `ALL` | `G2F-BR-08` | APPROVED |

`G2F-BR-07` (incubación) y la antigua `BR-07` de G2E (offline `ALL`) permanecen en sus documentos originales. V4 prevalece donde contradiga a numeraciones anteriores; no se editan esos informes.

## 2. Capacidad

| Contador | Valor | Estado | Fuente |
|---|---|---|---|
| `EggInventory.capacity` | 20 huevos `claimed` por usuario | APPROVED | `G2G-BR-01` |
| `PendingEggCapacity.initial` | 2 pendientes por usuario | APPROVED | `G2G-BR-02` |
| Mejoras de tienda | fuera de alcance | DEFERRED | `G2G-BR-02` |
| C2 = 4 (`DEFAULT_PAIR_CAPACITY`) | dato de prueba | SIN AUTORIDAD | `shared-egg-pair-store.ts:56` |
| `DEFAULT_BACKLOG_CAPACITY = 0` | dato de prueba, `single` | SIN AUTORIDAD | `shared-egg-store.ts:50` |
| PC Boxes | subsistema independiente | FUERA DE ALCANCE | `apps/web/src/main.ts:368-392` |
| C4 incubación simultánea | no se crea | DEFERRED | `G2G-BR-07`, V4 §1 |

Invariantes: `pending(user) ≤ 2`; `claimed(user) ≤ 20`; contadores separados; ningún pendiente consume inventario; ningún `claimed` vuelve a pendiente; nunca entrega parcial.

## 3. Chequeo y producción

- `BreedingCheck` cada **60 minutos**, `checkId` determinista derivado de `nurseryId`, `pairRef` y `checkNumber` monótono (`V4 §2`, `HUNGRY-Y-CHEQUEOS.md §3`).
- Condiciones: pareja Gen II válida, procedencia criable, autorización vigente, ambos `HungrySnapshot.ratio ≥ 0.70`, capacidad pendiente libre para **ambos** destinatarios.
- Si se cumplen: **producción garantizada**, dos huevos simulados, uno por propietario. Sin probabilidad de puesta ni compuerta de rareza (`G2G-BR-03`; V4 §2; `CONFLICTOS-RESUELTOS-Y-ABIERTOS.md` §1.4).
- Resultados: `CHECK_OK_PRODUCED`, `HUNGRY_BELOW_THRESHOLD`, `CAPACITY_EXHAUSTED`/`PENDING_FULL`, `PAIR_INVALID`, `CHECK_DUPLICATE`, `PROVENANCE_REJECTED`.
- Chequeo fallido: no consume presupuesto de eventos exitosos; sí se persiste para evitar reproceso.

## 4. Hungry

- No hay `HungryActual`/`HungryMax`: se usa `PetState.hunger` (0–100, inicial 82, `clamp(v,0,100)`), `pet-engine.ts:68,92,180`.
- `HungrySnapshot = { actual: hunger, max: 100, ratio: hunger / 100, at }`, con `source: observed | projected` (`V4 §3`, `HUNGRY-Y-CHEQUEOS.md §2`).
- Umbral: `ratio ≥ 0.70` equivale a `hunger ≥ 70`. Casos límite y reconstrucción: ver `HUNGRY-OFFLINE.md`.
- Más allá de 7 días: `HUNGRY_HISTORY_UNAVAILABLE`, sin decidir (V4 §7; `DECISIONES-DEFINITIVAS.md` §4).

## 5. Entrega, recogida e incubación

- `EggProductionEvent` crea dos `PendingEgg` con identidad derivada de `cycleId`, `productionEventId` y `recipientRole`.
- `EggClaim` manual e idempotente; al confirmar, el huevo pasa a `claimed` y entra al inventario (`G2G-BR-05`).
- `IncubationTimer.startedAt = claimedAt`, nunca `producedAt`, `preparedAt` ni `storedAt`. Un reintento no reinicia la marca (`G2F/INCUBACION-COOLDOWN-AUDIT.md §5`; `G2E/INCUBACION-Y-COOLDOWN.md §3-4`).
- Duración: `cooldownMs = null`, `status = "blocked"`, `blockedReason = "UNKNOWN_HATCH_COOLDOWN"`, `readyAt = null`. Sin eclosión automática. Ver `COOLDOWN-RECUPERACION.md`.

## 6. Offline `ALL`

- Política contractual `ALL`: conservar todo el tiempo pendiente; ventanas semiabiertas `(from, to]` de hasta 24 h; hasta 24 chequeos por ventana (`G2G-BR-08`, V4 §5).
- 24/48/72 h → 1/2/3 ventanas consecutivas; sin descartar horas; sin cola adicional de huevos.
- Contadores separados: `checksProcessed` (incluye fallidos), `checksSucceeded`/`productionEvents` (solo 1+1). `maxEvents=5` sustituido documentalmente.
- `backlogMode = single` es independiente de `OfflineReconciliation.policy = ALL` (`OFFLINE-ALL.md §2`).
- Código actual: `OfflinePolicy = "single" | "bounded"` (`breeding-engine.ts:55`); `ALL` requiere implementación futura.

## 7. Atomicidad e idempotencia

- `BEGIN IMMEDIATE` → reconstrucción desde eventos → ejecución → inserción de todos los eventos → `COMMIT`; excepción → `ROLLBACK` (PG-08B).
- `prepareDelivery`/`confirmDelivery`/`retry` idempotentes; `replay`, `drainBacklog`, `integrityCheck` para recuperación (PG-08F).
- Clave de recogida canónica: `pickup:${cycleId}:${productionEventId}:${recipientRole}:${recipientId}` (PROPUESTA de G2E §5; no elevada a APPROVED por esta misión).
- Persistir `checkId` y su resultado antes de producir, para distinguir «chequeo evaluado» de «producción confirmada».
- Sin transacción distribuida con `data/pokegotchi.db`, EventStore externo ni red.

## 8. Invariantes globales

1. Un ciclo exitoso = exactamente dos huevos, uno por propietario.
2. Misma semilla para reglas, distinta derivación por `recipientRole`/`eggId`.
3. `realPkm:false`, `exportable:false`, `simulated:true`, `hatched:false`.
4. RNG HMAC-SHA256; sin equivalencia con cartucho; sin semilla maestra persistida.
5. Sin IV/DV editados, sin met data inventado, sin exportación, sin eclosión real.
6. Sin `Math.random`, sin `Date.now`; reloj y azar inyectados.
7. Identidades derivadas estables bajo reintentos y reinicios.

## 9. Errores contractuales

`CAPACITY_EXHAUSTED`, `INVENTORY_FULL`, `PENDING_FULL`, `HUNGRY_BELOW_THRESHOLD`, `UNKNOWN_HUNGRY`, `HUNGRY_HISTORY_UNAVAILABLE`, `CHECK_DUPLICATE`, `CYCLE_DUPLICATE`, `PAIR_PARTIAL_DELIVERY`, `UNKNOWN_HATCH_COOLDOWN`, `UNRESOLVED_POLICY`, `CLOCK_ROLLBACK`, `WINDOW_EXCEEDED`, `STALE_REVISION`, `STORE_ISOLATION_VIOLATION`, `CAPACITY_BELOW_USAGE`.

## 10. Bloqueos del piloto

1. **Duración del cooldown** — `BLOCKED`,CASE B confirmada; afecta solo a la etapa G3-E.
2. **Hungry >7 días** — `UNRESOLVED`; fuera de los casos 24/48/72 h exigidos.
3. **Conducta exacta ante capacidad agotada** — `PROPOSED`; resolución técnica sin nueva decisión de producto propuesta en `CAPACIDADES-Y-ATOMICIDAD.md §4`.
4. **Implementación de `ALL`** — pendiente; el código solo expone `single|bounded`.

Ninguno de estos bloqueos autoriza implementación. V5 es un contrato de preparación.
