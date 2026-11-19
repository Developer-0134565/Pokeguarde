# PG-08G.2F — CONTRATOS TYPESCRIPT PROPUESTOS

**Estado:** propuesta documental. No se han creado módulos de producción, no se
ha modificado `packages/core`, `apps/*`, `services/pkhex` ni `scripts/check.sh`.
Los tipos siguientes son la especificación para un futuro PG-08G.3, no código
autorizado para ejecutarse.

## 1. Constantes y convenciones

```ts
export const PG08G2F_SCHEMA = "pg08g2f" as const;
export const HUNGRY_THRESHOLD_MICRO = 700_000 as const;  // 0,70 exacto
export const MAX_CHECKS_PER_WINDOW = 24 as const;        // una hora dentro de 24 h
export const WINDOW_MS = 86_400_000 as const;
export const INVENTORY_CAPACITY = 20 as const;
export const PENDING_CAPACITY = 2 as const;
```

- `GameKey` queda limitado en el piloto a `gen2-gs` y `gen2-crystal`; cualquier
  otra clave devuelve `UNKNOWN_RULES`.
- El patrón de clave de idempotencia es el de PG-08A:
  `/^[A-Za-z0-9._:-]{8,128}$/`.
- Los relojes son inyectados. Queda prohibido `Date.now()` y `Math.random()` en
  la implementación futura.
- Se distinguen dos conceptos que no deben mezclarse:
  `CapacityPolicy.backlogMode: "single"` (no hay cola de huevos) y
  `OfflineReconciliation.policy: "ALL"` (se procesa todo el tiempo pendiente).

## 2. Los once tipos

### 2.1 `IdempotencyKey`

```ts
export type IdempotencyKey = string & { readonly __brand: "IdempotencyKey" };
export function asIdempotencyKey(value: string): DomainResult<IdempotencyKey>;

export function checkKeyOf(
  nurseryId: string, pairRevisionRef: string, checkNumber: number,
): IdempotencyKey; // check:<nursery>:<pairRef>:<n>
export function productionKeyOf(checkId: string): IdempotencyKey;          // prod:<checkId>
export function claimKeyOf(
  checkId: string, role: RecipientRole, ownerId: string,
): IdempotencyKey;                                                         // claim:<checkId>:<rol>:<propietario>
export function offlineKeyOf(reconciliationId: string): IdempotencyKey;    // offline:<id>
```

`pairRevisionRef` es una referencia hash de 16 hexadecimales, nunca el valor
crudo, que puede contener caracteres no admitidos por el patrón.

### 2.2 `HungrySnapshot`

```ts
export type HungrySource = "observed" | "projected";

export type HungrySnapshot = {
  readonly stayId: string;
  readonly role: RecipientRole;
  readonly at: string;
  readonly actualE2: number;   // centésimas: 69,99 -> 6999
  readonly maxE2: number;      // proyección verificada: 10000
  readonly ratioMicro: number; // floor(actualE2 * 1_000_000 / maxE2)
  readonly source: HungrySource;
  readonly meetsThreshold: boolean; // ratioMicro >= 700_000
};
```

`maxE2 = 10000` no es un campo nuevo: es el límite superior verificado de
`PetState.hunger` (`clamp(v, 0, 100)` en `pet-engine.ts:92`). El campo
persistido sigue siendo `hunger`; `HungrySnapshot` es una proyección por
chequeo, con reloj inyectado.

### 2.3 `CapacityPolicy`

```ts
export type CapacityPolicy = {
  readonly custody: 2;                              // PG-08A, no se modifica
  readonly pending: 2;                             // por propietario
  readonly inventory: 20;                          // por propietario
  readonly backlog: 0;
  readonly backlogMode: "single";                  // sin cola adicional
  readonly pendingStates: typeof CAPACITY_STATES;  // produced|pending_assignment|stored
  readonly inventoryStates: readonly ["claimed"];  // claimed, sin estado nuevo
};
```

C2 histórico no se reescribe: pertenece a `CAPACITY_STATES` y sigue documentado
como valor de prueba `4` en los informes históricos. El inventario V4 es un
contador distinto sobre `claimed`.

### 2.4 `BreedingEligibility`

```ts
export type CapacityResource = "pending" | "inventory";

export type EligibilityBlockerCode =
  | "PAIR_INCOMPLETE" | "PARENTS_CHANGED" | "PERMISSION_REVOKED"
  | "DEMO_PROVENANCE_BLOCKED" | "UNKNOWN_PROVENANCE_BLOCKED"
  | "HUNGRY_BELOW_THRESHOLD" | "CAPACITY_EXHAUSTED"
  | "UNKNOWN_HUNGRY" | "UNKNOWN_RULES" | "CLOCK_ROLLBACK";

export type BreedingEligibility =
  | { readonly status: "eligible"; readonly gameKey: GameKey;
      readonly pair: readonly [string, string]; readonly pairRevision: string;
      readonly cycleId: string;
      readonly hungry: readonly [HungrySnapshot, HungrySnapshot]; }
  | { readonly status: "ineligible"; readonly gameKey: GameKey;
      readonly pair: readonly [string, string]; readonly pairRevision: string;
      readonly cycleId: string | null;
      readonly hungry: readonly [HungrySnapshot, HungrySnapshot];
      readonly blockers: readonly EligibilityBlocker[]; }
  | { readonly status: "unknown"; readonly gameKey: GameKey;
      readonly pair: readonly [string, string]; readonly pairRevision: string;
      readonly cycleId: null;
      readonly hungry: readonly [HungrySnapshot | null, HungrySnapshot | null];
      readonly blockers: readonly EligibilityBlocker[]; };
```

`unknown` falla cerrado: sin datos verificables no se calcula genética ni se
producen huevos.

### 2.5 `BreedingCheck`

```ts
export type BreedingCheckStatus = "produced" | "skipped" | "failed" | "duplicate";
export type CheckFailureCode =
  | "PERSISTENCE_FAILED" | "CLOCK_ROLLBACK"
  | "CHECK_BUDGET_EXCEEDED" | "VERSION_MISMATCH";

export type BreedingCheck = {
  readonly schema: typeof PG08G2F_SCHEMA;
  readonly kind: "breeding.check";
  readonly checkId: string;                  // estable y único
  readonly idempotencyKey: IdempotencyKey;
  readonly nurseryId: string;
  readonly pair: readonly [string, string];
  readonly pairRevision: string;
  readonly at: string;
  readonly status: BreedingCheckStatus;
  readonly eligibility: BreedingEligibility;
  readonly productionEventId: string | null;
  readonly cycleId: string | null;
  readonly eggIds: readonly [EggId, EggId] | null; // null: el chequeo NO es un huevo
  readonly created: boolean;                 // false en reintento/duplicate
  readonly reason: EligibilityBlockerCode | CheckFailureCode | null;
};
```

`checkId = check:<nurseryId>:<pairRef>:<checkNumber>`, con `checkNumber`
monótono por par y revisión. `eggIds` solo existe cuando `status === "produced"`.

### 2.6 `EggProductionEvent`

```ts
export type EggProductionEvent = {
  readonly schema: typeof PG08G2F_SCHEMA;
  readonly kind: "egg.production.event";
  readonly eventId: string;
  readonly checkId: string;
  readonly productionEventId: string;
  readonly cycleId: string;
  readonly nurseryId: string;
  readonly pair: readonly [string, string];
  readonly pairRevision: string;
  readonly at: string;
  readonly authoritySequence: number;
  readonly idempotencyKey: IdempotencyKey;
  readonly pairEggs: readonly [
    { readonly role: "host";  readonly ownerId: string; readonly eggId: EggId },
    { readonly role: "guest"; readonly ownerId: string; readonly eggId: EggId },
  ];
};
```

Las identidades se derivan con `pairEggIdFor` de PG-08F. Los dos `eggId` son
distintos y la propiedad se conserva por rol.

### 2.7 `PendingEgg`

```ts
export type PendingEggState = "produced" | "pending_assignment" | "stored";
export type SimulatedStamp = {
  readonly legitimacy: EggLegitimacy;    // EGG_LEGITIMACY de PG-08E
  readonly realPkm: false;
  readonly exportable: false;
  readonly layers: {
    readonly L1: "ok";
    readonly L2: "ok" | "deferred";
    readonly L3: "not_evaluable";
    readonly L4: "blocked";
  };
};
export type PendingEgg = {
  readonly eggId: EggId;
  readonly ownerId: string;
  readonly recipientRole: RecipientRole;
  readonly state: PendingEggState;       // nunca 'claimed'
  readonly checkId: string;
  readonly cycleId: string;
  readonly productionEventId: string;
  readonly producedAt: string;
  readonly claimKey: IdempotencyKey;
  readonly simulated: SimulatedStamp;
};
```

### 2.8 `EggInventory`

```ts
export type ClaimedEggEntry = {
  readonly eggId: EggId;
  readonly ownerId: string;
  readonly claimedAt: string;
};
export type EggInventory = {
  readonly ownerId: string;
  readonly capacity: 20;
  readonly usage: number;                // === entries.length
  readonly entries: readonly ClaimedEggEntry[];
  readonly states: readonly ["claimed"];
};
```

### 2.9 `EggClaim`

```ts
export type EggClaimStatus = "prepared" | "claimed";
export type EggClaim = {
  readonly claimKey: IdempotencyKey;
  readonly eggId: EggId;
  readonly ownerId: string;
  readonly deliveryId: string;
  readonly status: EggClaimStatus;
  readonly preparedAt: string;
  readonly claimedAt: string | null;
  readonly created: boolean;             // false en reintento
  readonly timerStartedAt: string | null; // === claimedAt
};
```

Un fallo se devuelve como `DomainResult<EggClaim>` con `ok:false`; no se
persiste un error que consuma la clave.

### 2.10 `IncubationTimer`

```ts
export type IncubationStatus = "blocked" | "running" | "ready";
export type IncubationTimer = {
  readonly eggId: EggId;
  readonly ownerId: string;
  readonly claimedAt: string;
  readonly startedAt: string;             // INVARIANTE: startedAt === claimedAt
  readonly cooldownMs: number | null;     // null: duración aún no aprobada
  readonly status: IncubationStatus;
  readonly readyAt: string | null;
  readonly blockedReason: "UNKNOWN_HATCH_COOLDOWN" | null;
};
```

No se crea C4 y no hay eclosión automática mientras `cooldownMs === null`.

### 2.11 `OfflineReconciliation`

```ts
export type OfflineWindowStatus = "pending" | "complete";
export type OfflineWindow = {
  readonly index: number;
  readonly from: string;                 // intervalo (from, to]
  readonly to: string;
  readonly plannedChecks: number;        // <= 24
  readonly succeededChecks: number;      // consume presupuesto
  readonly skippedChecks: number;        // no consume
  readonly failedChecks: number;         // no consume
  readonly status: OfflineWindowStatus;
};
export type OfflineReconciliation = {
  readonly schema: typeof PG08G2F_SCHEMA;
  readonly kind: "offline.reconciliation";
  readonly policy: "ALL";
  readonly from: string;
  readonly to: string;
  readonly cursor: string;               // última marca procesada
  readonly windows: readonly OfflineWindow[];
  readonly checksAttempted: number;
  readonly checksSucceeded: number;
  readonly checksSkipped: number;
  readonly checksFailed: number;
  readonly productionEvents: number;
  readonly status: "pending" | "interrupted" | "complete";
};
```

## 3. Transiciones de estado

### Chequeo horario

| Desde | Condición | Hasta | Efecto |
|---|---|---|---|
| `planned` | `eligibility.status === "eligible"` | `produced` | Producción garantizada: dos huevos, un evento y el check en la misma transacción. |
| `planned` | Puerta no cumplida | `skipped` | Se persiste `reason`; sin huevos y sin consumo de presupuesto de éxito. |
| `planned` | Error de reloj o persistencia | `failed` | Auditoría con `reason`; sin huevos y sin consumo de éxito. |
| `checkId` ya persistido | Misma clave | `duplicate` | Devuelve el resultado guardado; `created:false`; sin mutación. |

La tabla PROVISIONAL de rareza de PG-08D no genera `CHECK_RARITY_NOT_DUE` en
este flujo: pasar el chequeo significa producir.

### Huevo y recogida

| Desde | Acción | Hasta | Condición |
|---|---|---|---|
| — | `produceTx` | `produced` | Se crean los dos huevos con `pairEggIdFor`. |
| `produced` | asignación por rol | `pending_assignment` (opcional) o `stored` | En la misma transacción. |
| `stored` | `prepareDelivery` | `stored` + `DeliveryRecord("prepared")` | Reserva; aún no inventario. |
| `stored` + preparado | `confirmDelivery` | `claimed` | Recogida manual; `claimedAt` del reloj inyectado. |
| `claimed` | cualquier acción | terminal | No se reabre ni se reasigna. |
| `produced|pending_assignment|stored` | cancelación | `cancelled` | Terminal; motivo obligatorio. |

`claimed` sale de `CAPACITY_STATES` y entra en `inventoryStates`. No se crea
`in_inventory`.

### Incubación

| Condición | Estado |
|---|---|
| Recogida confirmada sin duración aprobada | `blocked`, `UNKNOWN_HATCH_COOLDOWN`, `readyAt:null`. |
| Duración aprobada inyectada y `now < readyAt` | `running`. |
| `now >= readyAt` | `ready`; no eclosiona automáticamente. |
| Doble recogida | No crea otro timer; `startedAt` intacto. |

### Offline

`pending → interrupted → complete` o `pending → complete`. Ventanas `(from, to]`
de 24 h; un `checkId` por hora; máximo 24 chequeos con éxito persistido por
ventana. Los chequeos `skipped` y `failed` se contabilizan aparte. El `cursor`
avanza solo tras persistir cada resultado.

## 4. Catálogo de errores

| Ámbito | Códigos |
|---|---|
| Claves | `BAD_IDEMPOTENCY_KEY`, `IDEMPOTENCY_REUSE_MISMATCH`, `IDEMPOTENCY_MISMATCH` |
| Chequeo | `CHECK_DUPLICATE`, `CLOCK_ROLLBACK`, `CHECK_BUDGET_EXCEEDED`, `VERSION_MISMATCH`, `PERSISTENCE_FAILED` |
| Pareja, permiso y procedencia | `PAIR_INCOMPLETE`, `PARENTS_CHANGED`, `PERMISSION_REVOKED`, `DEMO_PROVENANCE_BLOCKED`, `UNKNOWN_PROVENANCE_BLOCKED`, `UNKNOWN_RULES` |
| Hungry | `HUNGRY_BELOW_THRESHOLD`, `UNKNOWN_HUNGRY`, `HUNGRY_HISTORY_UNAVAILABLE` |
| Capacidad | `CAPACITY_INVALID`, `CAPACITY_BELOW_USAGE`, `CAPACITY_EXHAUSTED` (`pending|inventory`), `SINGLE_BACKLOG_FORBIDDEN` |
| Producción | `CYCLE_DUPLICATE`, `PAIR_ID_COLLISION`, `AUTHORITY_SEQUENCE_INVALID`, `PRODUCTION_ROLLBACK` |
| Recogida | `EGG_NOT_FOUND`, `EGG_NOT_AVAILABLE`, `RECIPIENT_MISMATCH`, `DELIVERY_NOT_FOUND`, `CLAIM_DUPLICATE`, `OWNER_IMMUTABLE`, `INVALID_TRANSITION` |
| Incubación | `UNKNOWN_HATCH_COOLDOWN`, `EGG_NOT_CLAIMED` |
| Legalidad | `INVALID_CANDIDATE_NOT_PKM`, `NO_REAL_PKM`, `NOT_VALIDATED`, `NO_OFFICIAL_CHAIN`, `DEMO_PROVENANCE`, `UNKNOWN_PROVENANCE` |
| Offline | `WINDOW_INVALID`, `CHECK_BUDGET_EXCEEDED`, `CLOCK_ROLLBACK` |

`CAPACITY_EXHAUSTED` no consume la clave de idempotencia, igual que en
PG-08E/F.

## 5. Invariantes y atomicidad

1. **1+1 indivisible**: ciclo, evento, dos huevos, contadores pendientes,
   resultado del chequeo y eventos del outbox se escriben en una sola
   transacción SQLite. Si falla el segundo huevo, no queda el primero.
2. **Propiedad por rol**: `host → hostId`, `guest → guestOwnerId`. Ninguna
   capacidad, espera ni recuperación reasigna el huevo.
3. **Capacidades separadas**: custodia 2; pendientes 2 sobre `CAPACITY_STATES`;
   inventario 20 sobre `claimed`; `backlog:0` con `backlogMode:"single"`.
   `ocupación ≤ capacidad` siempre. Reducir por debajo del uso da
   `CAPACITY_BELOW_USAGE` sin destrucción.
4. **Sin cola invisible**: prohibido `backlog > 0`, `bounded` o `egg.queued`
   nuevo. Sin hueco: `CAPACITY_EXHAUSTED` y reevaluación en el siguiente chequeo.
5. **Chequeo distinto de huevo**: `eggIds === null` salvo `status:"produced"`.
   Un `checkId` se procesa como máximo una vez.
6. **Hungry estricto y determinista**: `ratioMicro >= 700_000`, evaluado en cada
   chequeo offline con reloj inyectado. Sin snapshot verificable, fallo cerrado.
7. **RNG**: HMAC-SHA256 con `DerivationContext` de PG-08G.2; semilla maestra no
   persistida; un reintento no avanza el cursor.
8. **Recogida atómica**: comprobación de hueco, `claimEgg`,
   `DeliveryRecord("delivered")`, entrada de inventario y timer en la misma
   transacción. Con inventario lleno, nada cambia y la clave sigue disponible.
9. **Cooldown anclado**: `startedAt === claimedAt`. Ni `producedAt` ni
   `preparedAt` cuentan. Sin duración aprobada, `cooldownMs:null`.
10. **Offline sin pérdida**: política `ALL`, ventanas de 24 h, hasta 24 éxitos
    por ventana, 72 h en tres ventanas. Prohibido `WINDOW_EXCEEDED` como descarte.
    `CLOCK_ROLLBACK` aborta sin mutar.
11. **Fallidos no consumen exitosos**: `failedChecks` y `skippedChecks` se
    registran aparte; `checksSucceeded` y `productionEvents` solo crecen con
    producción confirmada.
12. **Cuatro capas separadas**: L1 interna, L2 generacional (`gen2-gs` o
    `gen2-crystal`), L3 no evaluable sin PKM, L4 bloqueada. `realPkm:false` y
    `exportable:false` son literales de tipo.
13. **Límite transaccional real**: atomicidad solo dentro de SQLite. Entre BD,
    red, archivos o autoridad remota se usa replay/reconciliación.
14. **Aislamiento**: stores de prueba en `/tmp/opencode/pg08g2f-*`; rechazo de
    `data/pokegotchi.db` con `STORE_ISOLATION_VIOLATION`.

## 6. Regla de no implementación

Este documento no autoriza crear los tipos en código, importarlos desde
producción, tocar migraciones, abrir la BD real ni integrar pruebas en
`scripts/check.sh`. Todo eso exige una autorización de ejecución posterior.
