/**
 * PG-08D — Motor experimental de crianza, temporizadores persistentes y
 * recuperación inmediata (D6).
 *
 * MÓDULO PURO. No importa Bun, SQLite, HTTP, DOM, PKHeX ni el motor
 * Tamagotchi. Toda dependencia externa entra por puertos inyectables:
 *
 *   - BreedingClock          -> tiempo autoritativo (NUNCA Date.now() del cliente)
 *   - BreedingCompatibility  -> reglas verificables y rareza (política inyectable)
 *   - BreedingEventSink      -> outbox de la autoridad simulada
 *   - BreedingCycleStore     -> persistencia del temporizador
 *   - CustodyPort            -> retirada/expulsión sobre el dominio PG-08A
 *
 * El motor NO duplica las reglas de propiedad o custodia de PG-08A: delega la
 * retirada y la expulsión en `CustodyPort` y solo reacciona cancelando el ciclo.
 * Los huevos son REGISTROS SIMULADOS: no son PKM, no se insertan en saves y no
 * tienen herencia, IV, naturaleza ni movimientos.
 */

import {
  permissionActive,
  type PermissionGrant,
  type Stay,
} from "./shared-nurseries.ts";

// ---------------------------------------------------------------------------
// 1. Identidad y constantes
// ---------------------------------------------------------------------------

export const BREEDING_SCHEMA = "pg08d.breeding-engine" as const;
export const BREEDING_VERSION = "1.0.0" as const;
export const MIN_INTERVAL_MS = 3_600_000 as const;   // 1 hora
export const MAX_INTERVAL_MS = 43_200_000 as const;  // 12 horas
export const HOUR_MS = 3_600_000 as const;

export const RARITIES = [
  "common", "uncommon", "rare", "very_rare", "epic", "legendary_compatible", "extreme", "unknown",
] as const;
export type Rarity = (typeof RARITIES)[number];

/** Tabla PROVISIONAL de simulación. No es una clasificación oficial. */
export const PROVISIONAL_INTERVALS_MS: Readonly<Record<Rarity, number>> = Object.freeze({
  common: 1 * HOUR_MS,
  uncommon: 2 * HOUR_MS,
  rare: 4 * HOUR_MS,
  very_rare: 6 * HOUR_MS,
  epic: 8 * HOUR_MS,
  legendary_compatible: 10 * HOUR_MS,
  extreme: 12 * HOUR_MS,
  unknown: 0, // incompatible: bloquea la producción
});

export type Compatibility = "compatible" | "incompatible" | "unknown";
export type CycleState = "inactive" | "ready" | "running" | "completed" | "stopped" | "invalid";
export type OfflinePolicy = "single" | "bounded";
export type CancelReason = "withdraw" | "expel" | "revoke" | "pair_incomplete" | "incompatible" | "manual";

export type OpResult<T> =
  | { readonly ok: true; readonly value: T; readonly eventId: string | null }
  | { readonly ok: false; readonly code: string; readonly message: string };

const OK = <T>(value: T, eventId: string | null = null): OpResult<T> => ({ ok: true, value, eventId });
const ERR = <T>(code: string, message: string): OpResult<T> => ({ ok: false, code, message });

// ---------------------------------------------------------------------------
// 2. Puertos inyectables
// ---------------------------------------------------------------------------

/** Reloj autoritativo. La hora SIEMPRE la entrega la autoridad simulada. */
export interface BreedingClock {
  now(): string;
}

/**
 * Reglas de compatibilidad y rareza verificables.
 * Si no hay datos para una pareja, `compatibility` debe devolver "unknown"
 * y la producción queda bloqueada.
 */
export interface BreedingCompatibilityProvider {
  compatibility(a: PairMember, b: PairMember): Compatibility;
  rarityOf(member: PairMember): Rarity;
}

/** Sumidero de eventos: se espera un outbox transaccional de la autoridad. */
export interface BreedingEventSink {
  append(event: BreedingEvent): string;
}

/** Persistencia del temporizador y de los huevos confirmados. */
export interface BreedingCycleStore {
  load(): BreedingState | null;
  save(state: BreedingState): void;
}

/** Resultado de una operación de custodia ejecutada por la autoridad. */
export type CustodyResult =
  | { readonly ok: true; readonly finalStayId: string; readonly confirmed: boolean }
  | { readonly ok: false; readonly code: string; readonly message: string };

/**
 * Custodia: el motor NO implementa propiedad. Estas operaciones delegan en el
 * dominio PG-08A a través de la autoridad simulada.
 */
export interface CustodyPort {
  withdraw(input: { stayId: string; ownerId: string; idempotencyKey: string; at: string }): CustodyResult;
  expel(input: { stayId: string; hostId: string; ownerId: string; idempotencyKey: string; at: string }): CustodyResult;
}

// ---------------------------------------------------------------------------
// 3. Entidades
// ---------------------------------------------------------------------------

/** Proyección mínima de una estancia PG-08A; NO sustituye a `Stay`. */
export type PairMember = {
  readonly stayId: string;
  readonly pokemonId: string;
  readonly species: number;
  readonly generation: number;
  readonly ownerId: string;
  readonly hostId: string;
  readonly permissions: Readonly<Record<"allow_ev_berries" | "allow_ev_minigames" | "allow_breeding", PermissionGrant | null>>;
  readonly revision: number;
};

export type BreedingEventType =
  | "breeding.cycle.started"
  | "breeding.cycle.completed"
  | "breeding.cycle.cancelled"
  | "breeding.egg.produced"
  | "breeding.guest.withdrawn"
  | "breeding.guest.expelled";

/** Evento auditável e idempotente. `occurredAt` viene del reloj inyectado. */
export type BreedingEvent = {
  readonly schema: typeof BREEDING_SCHEMA;
  readonly version: typeof BREEDING_VERSION;
  readonly eventId: string;
  readonly type: BreedingEventType;
  readonly nurseryId: string;
  readonly cycleId: string;
  readonly occurredAt: string;
  readonly idempotencyKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
};

export type EggRecord = {
  readonly eggId: string;
  readonly cycleId: string;
  readonly nurseryId: string;
  readonly pair: readonly [string, string];
  readonly producedAt: string;
  readonly intervalMs: number;
  readonly simulated: true;
  readonly generation: number;
};

export type BreedingCycle = {
  readonly cycleId: string;
  readonly nurseryId: string;
  readonly pair: readonly [string, string];
  readonly pairRevision: string;
  readonly state: CycleState;
  readonly cycleNumber: number;
  readonly startedAt: string;
  readonly intervalMs: number;
  readonly dueAt: string;
  readonly eventId: string | null;
  readonly eggId: string | null;
  readonly reason: string | null;
};

export type BreedingState = {
  readonly schema: typeof BREEDING_SCHEMA;
  readonly version: typeof BREEDING_VERSION;
  readonly nurseryId: string;
  readonly cycle: BreedingCycle | null;
  readonly eggs: readonly EggRecord[];
  readonly processed: readonly string[];
  readonly offlinePolicy: OfflinePolicy;
  readonly maxPendingEggs: number;
  readonly lastChangedAt: string;
};

export function initialState(nurseryId: string, offlinePolicy: OfflinePolicy = "single", maxPendingEggs = 1): BreedingState {
  if (offlinePolicy !== "single" && offlinePolicy !== "bounded") {
    throw new Error("PG-08D: política offline desconocida");
  }
  if (!Number.isInteger(maxPendingEggs) || maxPendingEggs < 1) {
    throw new Error("PG-08D: maxPendingEggs debe ser un entero positivo");
  }
  return {
    schema: BREEDING_SCHEMA, version: BREEDING_VERSION, nurseryId,
    cycle: null, eggs: [], processed: [], offlinePolicy, maxPendingEggs,
    lastChangedAt: EPOCH,
  };
}
const EPOCH = "1970-01-01T00:00:00.000Z";

// ---------------------------------------------------------------------------
// 4. Utilidades puras
// ---------------------------------------------------------------------------

export function clampInterval(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return MIN_INTERVAL_MS;
  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, Math.round(ms)));
}

/** Identificador establishes: una pareja anterior NUNCA reutiliza progreso. */
export function cycleIdOf(nurseryId: string, pair: readonly [string, string], pairRevision: string, cycleNumber: number): string {
  return `cycle:${nurseryId}:${pair[0]}:${pair[1]}:${pairRevision}:${cycleNumber}`;
}

export function pairRevisionOf(a: PairMember, b: PairMember): string {
  const ids = [a.stayId, b.stayId].sort();
  const left = ids[0] === a.stayId ? a : b;
  const right = ids[0] === a.stayId ? b : a;
  return `${left.stayId}@${left.revision}|${right.stayId}@${right.revision}`;
}

export function eggIdOf(cycleId: string): string {
  return `egg:${cycleId}`;
}

export function isPairActive(stays: readonly Stay[], nurseryId: string): PairMember[] {
  return stays
    .filter((s) => s.nurseryId === nurseryId && (s.state === "stay_active" || s.state === "pickup_requested"))
    .map((s) => ({
      stayId: s.id,
      pokemonId: s.pokemon.instanceId,
      species: s.pokemon.origin.species,
      generation: s.pokemon.origin.generation,
      ownerId: s.ownerId,
      hostId: s.hostId,
      permissions: s.permissions,
      revision: s.revision,
    }));
}

/** Permiso PG-08A vigente. Se reutiliza `permissionActive`; no se reimplementa. */
export function breedingPermitted(member: PairMember, at: string): boolean {
  return permissionActive(member as unknown as Stay, "allow_breeding", at);
}

export function maxRarity(a: Rarity, b: Rarity): Rarity {
  const order: readonly Rarity[] = [
    "unknown", "common", "uncommon", "rare", "very_rare", "epic", "legendary_compatible", "extreme",
  ];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

// ---------------------------------------------------------------------------
// 5. Motor
// ---------------------------------------------------------------------------

export type BreedingEngineOptions = {
  readonly nurseryId: string;
  readonly clock: BreedingClock;
  readonly compatibility: BreedingCompatibilityProvider;
  readonly events: BreedingEventSink;
  readonly store: BreedingCycleStore;
  readonly custody: CustodyPort;
  readonly offlinePolicy?: OfflinePolicy;
  readonly maxPendingEggs?: number;
};

export type PairEvaluation = {
  readonly state: Exclude<CycleState, "completed">;
  readonly reason: string;
  readonly pair: readonly PairMember[];
  readonly compatibility: Compatibility;
  readonly rarity: Rarity;
  readonly intervalMs: number;
};

export function createBreedingEngine(options: BreedingEngineOptions) {
  const {
    nurseryId, clock, compatibility, events, store, custody,
    offlinePolicy = "single", maxPendingEggs = 1,
  } = options;

  let state: BreedingState = store.load() ?? initialState(nurseryId, offlinePolicy, maxPendingEggs);
  if (state.nurseryId !== nurseryId) throw new Error("PG-08D: el estado persistido pertenece a otra guardería");
  if (state.schema !== BREEDING_SCHEMA || state.version !== BREEDING_VERSION) {
    throw new Error("PG-08D: versión de estado incompatible");
  }

  const persist = (): void => store.save(state);

  /** Registra una clave de comando como procesada (persiste con el estado). */
  const mark = (key: string): void => {
    if (!state.processed.includes(key)) {
      state = { ...state, processed: [...state.processed, key] };
    }
  };

  const emit = (
    type: BreedingEventType,
    cycleId: string,
    key: string,
    payload: Record<string, unknown>,
  ): string => {
    if (state.processed.includes(key)) {
      return state.cycle?.eventId ?? "";
    }
    const event: BreedingEvent = {
      schema: BREEDING_SCHEMA,
      version: BREEDING_VERSION,
      eventId: `bev:${key}`,
      type,
      nurseryId,
      cycleId,
      occurredAt: clock.now(),
      idempotencyKey: key,
      payload,
    };
    const eventId = events.append(event);
    mark(key);
    return eventId;
  };

  /** Evalúa la pareja using SOLO el estado autoritativo y el reloj inyectado. */
  function evaluate(stays: readonly Stay[], at = clock.now()): PairEvaluation {
    const pair = isPairActive(stays, nurseryId).slice(0, 2);
    if (pair.length < 2) {
      return { state: "inactive", reason: "pareja incompleta", pair, compatibility: "unknown", rarity: "unknown", intervalMs: 0 };
    }
    const verdict = compatibility.compatibility(pair[0]!, pair[1]!);
    if (verdict === "incompatible") {
      return { state: "invalid", reason: "pareja incompatible", pair, compatibility: verdict, rarity: "unknown", intervalMs: 0 };
    }
    if (verdict === "unknown") {
      return { state: "invalid", reason: "compatibilidad desconocida", pair, compatibility: verdict, rarity: "unknown", intervalMs: 0 };
    }
    const rarity = maxRarity(compatibility.rarityOf(pair[0]!), compatibility.rarityOf(pair[1]!));
    if (rarity === "unknown" || PROVISIONAL_INTERVALS_MS[rarity] <= 0) {
      return { state: "invalid", reason: "rareza no verificable", pair, compatibility: verdict, rarity, intervalMs: 0 };
    }
    if (!pair.every((m) => breedingPermitted(m, at))) {
      return { state: "invalid", reason: "autorización de crianza no vigente", pair, compatibility: verdict, rarity, intervalMs: 0 };
    }
    const intervalMs = clampInterval(PROVISIONAL_INTERVALS_MS[rarity]);
    return { state: "ready", reason: "pareja válida", pair, compatibility: verdict, rarity, intervalMs };
  }

  function cancel(reason: CancelReason, idempotencyKey: string): OpResult<BreedingCycle | null> {
    const at = clock.now();
    const cmdKey = `command:cancel:${idempotencyKey}`;
    if (state.processed.includes(cmdKey)) return OK(state.cycle);
    mark(cmdKey);
    const current = state.cycle;
    if (!current || current.state === "stopped" || current.state === "inactive") {
      state = { ...state, lastChangedAt: at };
      persist();
      return OK(null);
    }
    const stopped: BreedingCycle = {
      ...current, state: "stopped", reason, eventId: null, eggId: null,
    };
    emit("breeding.cycle.cancelled", current.cycleId, `cancel:${idempotencyKey}`, {
      cycleId: current.cycleId, reason, pair: current.pair,
    });
    // Reinicio COMPLETO: el progreso parcial no se conserva.
    state = { ...state, cycle: stopped, lastChangedAt: at };
    persist();
    return OK(stopped);
  }

  function start(stays: readonly Stay[], idempotencyKey: string): OpResult<BreedingCycle> {
    const at = clock.now();
    const cmdKey = `command:start:${idempotencyKey}`;
    if (state.processed.includes(cmdKey) && state.cycle) return OK(state.cycle);
    mark(cmdKey);
    const ev = evaluate(stays, at);
    if (ev.state !== "ready") return ERR(ev.state === "invalid" ? "INVALID_PAIR" : "NO_PAIR", ev.reason);
    const revision = pairRevisionOf(ev.pair[0]!, ev.pair[1]!);
    const cycleNumber = (state.cycle?.cycleNumber ?? 0) + 1;
    const id = cycleIdOf(nurseryId, [ev.pair[0]!.stayId, ev.pair[1]!.stayId], revision, cycleNumber);
    const cycle: BreedingCycle = {
      cycleId: id, nurseryId,
      pair: [ev.pair[0]!.stayId, ev.pair[1]!.stayId],
      pairRevision: revision, state: "running", cycleNumber,
      startedAt: at, intervalMs: ev.intervalMs,
      dueAt: new Date(Date.parse(at) + ev.intervalMs).toISOString(),
      eventId: null, eggId: null, reason: null,
    };
    const eventId = emit("breeding.cycle.started", id, `start:${id}`, {
      cycleId: id, pair: cycle.pair, intervalMs: cycle.intervalMs, dueAt: cycle.dueAt, cycleNumber,
    });
    state = { ...state, cycle: { ...cycle, eventId }, lastChangedAt: at };
    persist();
    return OK(state.cycle, eventId);
  }

  /** Debe llamarse con el estado de estancias vigente para comprobar la pareja. */
  function tick(stays: readonly Stay[], idempotencyKey: string): OpResult<EggRecord | null> {
    const at = clock.now();
    const cmdKey = `command:tick:${idempotencyKey}`;
    if (state.processed.includes(cmdKey)) return OK(null);
    mark(cmdKey);
    const cycle = state.cycle;
    if (!cycle || cycle.state !== "running") return ERR("NO_RUNNING_CYCLE", "no hay ciclo activo");
    const ev = evaluate(stays, at);
    if (ev.state !== "ready") {
      cancel("pair_incomplete", `tick-cancel:${idempotencyKey}`);
      return ERR("PAIR_GONE", ev.reason);
    }
    const currentRev = pairRevisionOf(ev.pair[0]!, ev.pair[1]!);
    if (currentRev !== cycle.pairRevision || ev.pair[0]!.stayId !== cycle.pair[0] || ev.pair[1]!.stayId !== cycle.pair[1]) {
      cancel("pair_incomplete", `tick-revision:${idempotencyKey}`);
      return ERR("STALE_PAIR", "la pareja cambió; el ciclo queda cancelado");
    }
    if (Date.parse(at) < Date.parse(cycle.dueAt)) return OK(null);

    const eggId = eggIdOf(cycle.cycleId);
    if (state.eggs.some((e) => e.eggId === eggId)) {
      // Reintento: el huevo ya fue confirmado; solo se reanuda el siguiente ciclo.
      return OK(state.eggs.find((e) => e.eggId === eggId)!);
    }
    if (state.eggs.length >= state.maxPendingEggs) {
      return ERR("EGG_CAP", "capacidad máxima de huevos pendientes alcanzada");
    }
    const egg: EggRecord = {
      eggId, cycleId: cycle.cycleId, nurseryId, pair: cycle.pair,
      producedAt: at, intervalMs: cycle.intervalMs, simulated: true,
      generation: ev.pair[0]!.generation,
    };
    const eventId = emit("breeding.egg.produced", cycle.cycleId, `egg:${eggId}`, {
      eggId, cycleId: cycle.cycleId, pair: cycle.pair, producedAt: at,
      simulated: true, intervalMs: cycle.intervalMs,
    });
    emit("breeding.cycle.completed", cycle.cycleId, `complete:${cycle.cycleId}`, { eggId, cycleId: cycle.cycleId });
    state = { ...state, eggs: [...state.eggs, egg], lastChangedAt: at };

    // Política offline explícita: por defecto UN huevo por ciclo y se reinicia
    // desde ahora; `bounded` permite como máximo `maxPendingEggs` por desconexión.
    const nextNumber = cycle.cycleNumber + 1;
    const nextId = cycleIdOf(nurseryId, cycle.pair, cycle.pairRevision, nextNumber);
    const next: BreedingCycle = {
      ...cycle, cycleId: nextId, state: "running", cycleNumber: nextNumber,
      startedAt: at, dueAt: new Date(Date.parse(at) + cycle.intervalMs).toISOString(),
      eventId: null, eggId: eggId, reason: null,
    };
    const nextEventId = emit("breeding.cycle.started", nextId, `start:${nextId}`, {
      cycleId: nextId, pair: next.pair, intervalMs: next.intervalMs, dueAt: next.dueAt, cycleNumber: nextNumber,
    });
    state = { ...state, cycle: { ...next, eventId: nextEventId } };
    persist();
    return OK(egg, eventId || nextEventId);
  }

  /** Retirada del propietario: delega custodia en PG-08A y cancela el ciclo. */
  function withdrawGuestPokemon(input: {
    stayId: string; ownerId: string; idempotencyKey: string;
  }): OpResult<{ finalStayId: string; confirmed: boolean; cancelled: BreedingCycle | null }> {
    const at = clock.now();
    if (state.processed.includes(`withdraw:${input.idempotencyKey}`)) {
      return OK({ finalStayId: input.stayId, confirmed: true, cancelled: null });
    }
    const result = custody.withdraw({ ...input, at });
    if (!result.ok) return ERR(result.code, result.message);
    const cancelled = state.cycle?.pair.includes(input.stayId)
      ? cancel("withdraw", `withdraw:${input.idempotencyKey}`).value ?? null
      : null;
    emit("breeding.guest.withdrawn", state.cycle?.cycleId ?? "none", `withdraw:${input.idempotencyKey}`, {
      stayId: input.stayId, ownerId: input.ownerId, finalStayId: result.finalStayId,
    });
    state = { ...state, lastChangedAt: at };
    persist();
    return OK({ finalStayId: result.finalStayId, confirmed: true, cancelled }, null);
  }

  /** Expulsión del anfitrión: custodia delegada; sin cambio de propiedad. */
  function expelGuestPokemon(input: {
    stayId: string; hostId: string; ownerId: string; idempotencyKey: string;
  }): OpResult<{ finalStayId: string; confirmed: boolean; cancelled: BreedingCycle | null }> {
    const at = clock.now();
    if (state.processed.includes(`expel:${input.idempotencyKey}`)) {
      return OK({ finalStayId: input.stayId, confirmed: true, cancelled: null });
    }
    const result = custody.expel({ ...input, at });
    if (!result.ok) return ERR(result.code, result.message);
    const cancelled = state.cycle?.pair.includes(input.stayId)
      ? cancel("expel", `expel:${input.idempotencyKey}`).value ?? null
      : null;
    emit("breeding.guest.expelled", state.cycle?.cycleId ?? "none", `expel:${input.idempotencyKey}`, {
      stayId: input.stayId, hostId: input.hostId, ownerId: input.ownerId, finalStayId: result.finalStayId,
    });
    state = { ...state, lastChangedAt: at };
    persist();
    return OK({ finalStayId: result.finalStayId, confirmed: true, cancelled }, null);
  }

  /** Revocación: cancela inmediatamente si el permiso ya no está vigente. */
  function revokeCheck(stays: readonly Stay[], idempotencyKey: string): OpResult<BreedingCycle | null> {
    const at = clock.now();
    const ev = evaluate(stays, at);
    if (ev.state === "ready") return OK(null);
    if (!state.cycle || state.cycle.state !== "running") return OK(null);
    return cancel("revoke", `revoke:${idempotencyKey}`);
  }

  /** Reconstruye los huevos confirmados desde el registro de eventos. */
  function restoreFromEvents(log: readonly BreedingEvent[]): { eggs: number; cancelled: number } {
    let eggs = 0;
    let cancelled = 0;
    for (const event of [...log].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) {
      if (event.type === "breeding.egg.produced") {
        const eggId = String(event.payload.eggId ?? "");
        if (eggId && !state.eggs.some((e) => e.eggId === eggId)) {
          const cycleId = String(event.payload.cycleId ?? "");
          state = {
            ...state,
            eggs: [...state.eggs, {
              eggId, cycleId, nurseryId,
              pair: (event.payload.pair as readonly [string, string]) ?? ["", ""],
              producedAt: event.occurredAt,
              intervalMs: Number(event.payload.intervalMs ?? 0),
              simulated: true,
              generation: Number(event.payload.generation ?? 0),
            }],
          };
          eggs++;
        }
      }
      if (event.type === "breeding.cycle.cancelled") cancelled++;
    }
    persist();
    return { eggs, cancelled };
  }

  return {
    evaluate,
    start,
    tick,
    cancel,
    withdrawGuestPokemon,
    expelGuestPokemon,
    revokeCheck,
    restoreFromEvents,
    snapshot: (): BreedingState => JSON.parse(JSON.stringify(state)) as BreedingState,
    state: (): BreedingState => state,
  };
}

export type BreedingEngine = ReturnType<typeof createBreedingEngine>;
