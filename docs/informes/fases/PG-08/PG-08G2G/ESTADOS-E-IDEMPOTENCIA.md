# PG-08G.2G — ESTADOS E IDEMPOTENCIA

**Resultado:** contrato mínimo propuesto y contrastado con el dominio existente. No se crean estados nuevos sin contraste.

## 1. Cadena propuesta vs dominio existente

La secuencia de la directiva es una **propuesta de modelado**:

`eligible → produced → pending → claimed → incubating → hatchable → hatched`

Contraste con los estados que ya existen (VERIFICADO):

| Dominio | Estados reales | Evidencia |
|---|---|---|
| `egg-domain.ts` | `produced`, `pending_assignment`, `stored`, terminales `claimed`, `cancelled` | `:342-348`, `:428-429` |
| `egg-pair-domain.ts` | `DELIVERY_STAGES = produced → stored → assigned → available → claimed → delivered` | `EggDeliveryPort` `:252-255` |
| V4 §4 | produce→store→assign→available→**claimed (= inventario)**→delivered | contrato vigente |

V4 §4 ya resolvió la interpretación B: `available` = pendiente de recogida, `claimed` = inventario. La cadena de la directiva es compatible si se mapea así:

| Propuesto | Mapa al dominio | Estado |
|---|---|---|
| `eligible` | evaluación previa al `BreedingCheck` (no es un estado persistido del huevo) | concepto, no estado nuevo |
| `produced` | `EggProductionEvent` + huevo `produced` | EXISTE |
| `pending` | `pending_assignment`/`stored`/`available` | EXISTE |
| `claimed` | `claimed` = inventario | EXISTE |
| `incubating` | `IncubationTimer` con `startedAt = claimedAt` | **sin duración → BLOCKED** |
| `hatchable` | `readyAt` alcanzado | **BLOCKED** (depende de duración) |
| `hatched` | `hatched: true` | **NO SE CREA** en el piloto (`egg-domain.ts:63-67`) |

No se introducen `incubating`, `hatchable` ni `hatched` como estados operativos: sin duración aprobada, `IncubationTimer` queda `status:"blocked"`. Los dos últimos quedan como conceptos futuros documentales, no implementables en esta fase.

## 2. Identidad canónica del huevo

```text
eggId = derive(HMAC-SHA256, masterKey, "egg" | cycleId | productionEventId | recipientRole | recipientId)
```

- Derivada, estable bajo reintentos y reinicios; nunca aleatoria libre.
- `productionEventId` distingue los dos huevos de un mismo `cycleId`.
- `recipientRole` ∈ `{owner, guest}`; `OWNER_POLICY_BY_ROLE` (`egg-pair-domain.ts`) fija propietario y permisos.
- Par `pairEggIdFor(eggId)` para el huevo hermano; la misma semilla Produce dos derivaciones distintas por rol.
- `gameKey` ∈ `{gen2-gs, gen2-crystal}`; grabado en el evento, no inferido.

## 3. Campos mínimos de persistencia

| Campo | Origen | Nota |
|---|---|---|
| `eggId` | derivado HMAC | identidad canónica |
| `ownerId` | rol | propietario, no anfitrión |
| `cycleId` | evento reproductivo | identidad del ciclo |
| `productionEventId` | derivado | distingue los dos huevos |
| `gameKey` | configuración de la pareja | `gen2-gs`/`gen2-crystal` |
| `producedAt` | reloj inyectado | marca de puesta |
| `pendingSince` | reloj inyectado | entrada a pendiente |
| `claimedAt` | reloj inyectado | recogida confirmada; inicio de incubación |
| `collectedAt` | alias de `claimedAt` | mismo instante |
| `incubationStartedAt` | `= claimedAt` | nunca `producedAt` |
| `hatchProgress` | 0 | no avanza sin duración |
| `cooldownMs` | `null` | `UNKNOWN_HATCH_COOLDOWN` |
| `status` | `blocked` | ver §5 |
| `state` | `produced`→`stored`→`available`→`claimed` | según dominio |
| `idempotencyKey` | `claim:${cycleId}:${productionEventId}:${recipientRole}:${recipientId}` | PROPUESTA estable |
| `simulated` | `true` | `realPkm:false`, `exportable:false`, `hatched:false` |

## 4. Claves de idempotencia y duplicados

- `checkId`: derivado de `nurseryId`, `pairRef`, `checkNumber` monótono; repetirlo devuelve el resultado persistido, no reevalúa.
- `cycleId`: duplicado = reproceso, no nueva producción (`shared-egg-pair-store.ts:366-369`).
- `claimKey`: una recogida por huevo y destinatario; `CLAIM_DUPLICATE` si ya existe; sin duplicados.
- `UNIQUE(cycle_id, recipient_role)` (`:169`) garantiza el invariante 1+1 a nivel de BD.
- `idempotency_key UNIQUE` (`:155,183`) en el store de prueba; base reutilizable.
- Sin `Math.random`, sin `Date.now`: RNG HMAC y reloj inyectados.
- Orden de persistencia: evento → dos huevos → transición de ambos → marca de progreso → `COMMIT`.

## 5. Bloqueo de incubación (explícito)

`cooldownMs = null`; `status = "blocked"`; `blockedReason = "UNKNOWN_HATCH_COOLDOWN"`; `readyAt = null`; `hatchProgress = 0`; sin avance de progreso ni eclosión automática.

La transición `incubating → hatchable → hatched` **no se implementa ni se simula**. No se fija duración por defecto; no se reutilizan 60 min, 1–12 h ni 15 min. `readyAt` permanece nulo y ningún evento `hatchable`/`hatched` se emite. Esto delimita exactamente la etapa G3-E como bloqueada sin bloquear G3-A…D ni G3-F…I.

## 6. Reglas de persistencia

1. SQLite aislada para eventos de crianza; **rechazo explícito** de `data/pokegotchi.db` (`shared-egg-store.ts:242-243`, `shared-egg-pair-store.ts:219-220`).
2. `BEGIN IMMEDIATE` para cualquier transición que cruce más de una fila; confirmación de doble huevo antes de `COMMIT`.
3. No borrar filas: estados terminales `claimed`/`cancelled`; la liberación de capacidad es transición, no borrado.
4. Persistir `cursor` y `checkId` antes de producir; recovery por `replay`/`retry`/`drainBacklog` (`egg-pair-domain.ts`, PG-08F).
5. Sin transacción distribuida con saves, PKM, fixtures, EventStore externo ni red; reconciliación por eventos.
6. Auditoría: todo cambio relevante deja huella con clave de idempotencia y marca temporal.

## 7. Errores

`CHECK_DUPLICATE`, `CYCLE_DUPLICATE`, `CLAIM_DUPLICATE`, `PAIR_PARTIAL_DELIVERY`, `UNKNOWN_HATCH_COOLDOWN`, `UNKNOWN_HUNGRY`, `HUNGRY_HISTORY_UNAVAILABLE`, `CLOCK_ROLLBACK`, `STALE_REVISION`, `STORE_ISOLATION_VIOLATION`.
