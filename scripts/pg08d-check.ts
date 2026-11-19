/**
 * PG-08D — Motor experimental de crianza, temporizadores persistentes y
 * recuperación inmediata (D6).
 *
 * SUITE AISLADA: cada caso usa una BD SQLite y un archivo de ciclo en
 * /tmp/opencode/pg08d-*, y los elimina al terminar. NUNCA escribe en
 * data/pokegotchi.db; solo lee hashes para comprobar que no cambian.
 *
 * Sin servidor, sockets, cuentas reales, huevos PKM ni archivos de guardado.
 * Los huevos son REGISTROS SIMULADOS en un outbox propio.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Database } from "bun:sqlite";

import {
  CONTRACT_VERSION,
  NURSERY_CAPACITY,
  SCHEMA_ID,
  type Nursery,
  type Owner,
  type PokemonRef,
  type DepositRequest,
  type RecoveryRequest,
  type Stay,
} from "../packages/core/src/shared-nurseries.ts";
import { openSharedStore, type SharedNurseryStore } from "../apps/server/src/shared-store.ts";
import { openEventQueue, type SharedEventQueue } from "../apps/server/src/shared-event-queue.ts";
import {
  SharedAuthority,
  TestIdentityProvider,
  type AuthorityResult,
  type TestToken,
} from "../apps/server/src/shared-authority.ts";
import {
  BREEDING_SCHEMA,
  BREEDING_VERSION,
  HOUR_MS,
  MAX_INTERVAL_MS,
  MIN_INTERVAL_MS,
  PROVISIONAL_INTERVALS_MS,
  clampInterval,
  createBreedingEngine,
  cycleIdOf,
  eggIdOf,
  initialState,
  isPairActive,
  maxRarity,
  pairRevisionOf,
  type BreedingClock,
  type BreedingCompatibilityProvider,
  type BreedingCycleStore,
  type BreedingEngine,
  type BreedingEvent,
  type BreedingEventSink,
  type BreedingState,
  type Compatibility,
  type CustodyPort,
  type CustodyResult,
  type PairMember,
  type Rarity,
} from "../packages/core/src/breeding-engine.ts";

// ---------------------------------------------------------------------------
// 0. Arnés
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (error) {
    failed++;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`  FAIL ${name}: ${message}`);
    if (process.env.PG08D_STACK) console.error(error instanceof Error ? error.stack : "");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  assert(a === b, `${message} (esperado ${b}, obtenido ${a})`);
}

const TMP_ROOT = (() => {
  const base = "/tmp/opencode";
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return mkdtempSync(join(base, "pg08d-"));
})();

const ROOT = join(import.meta.dir, "..");
const PROTECTED: Readonly<Record<string, string>> = {
  "data/pokegotchi.db": join(ROOT, "data", "pokegotchi.db"),
  "packages/core/src/shared-nurseries.ts": join(ROOT, "packages", "core", "src", "shared-nurseries.ts"),
  "apps/server/src/shared-store.ts": join(ROOT, "apps", "server", "src", "shared-store.ts"),
  "apps/server/src/shared-authority.ts": join(ROOT, "apps", "server", "src", "shared-authority.ts"),
  "apps/server/src/shared-event-queue.ts": join(ROOT, "apps", "server", "src", "shared-event-queue.ts"),
  "scripts/pg08c-check.ts": join(ROOT, "scripts", "pg08c-check.ts"),
  "scripts/check.sh": join(ROOT, "scripts", "check.sh"),
};
const hashOf = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");
const hashesBefore = Object.fromEntries(
  Object.entries(PROTECTED).map(([label, path]) => [label, hashOf(path)]),
) as Record<string, string>;

// ---------------------------------------------------------------------------
// 1. Datos de prueba y utilidades deterministas
// ---------------------------------------------------------------------------

const T0 = "2026-11-19T00:00:00.000Z";
const HOUR = HOUR_MS;
const SHA = "a".repeat(64);

const OWNER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // anfitrión
const OWNER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // propietario visitante
const NURSERY_A = "11111111-1111-4111-8111-111111111111";
const MON1 = "22222222-2222-4222-8222-222222222222"; // Ditto (132)
const MON2 = "33333333-3333-4333-8333-333333333333"; // común (218)
const REQ1 = "44444444-4444-4444-8444-444444444444";
const REQ2 = "55555555-5555-4555-8555-555555555555";
const REQ_AGAIN = "66666666-6666-4666-8666-666666666666";

/** UUID v4 determinista derivado de una clave; solo para pruebas. */
function uuidFrom(label: string): string {
  const bytes = createHash("sha256").update(label).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function ownerOf(id: string, name: string): Owner {
  return { schema: SCHEMA_ID, version: CONTRACT_VERSION, id: id as Owner["id"], displayName: name, createdAt: T0 };
}
function nurseryOf(id: string, hostId: string): Nursery {
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION,
    id: id as Nursery["id"], hostId: hostId as Owner["id"],
    visibility: "public", admission: "open", connectivity: "connected",
    state: "available", unavailable: false, syncError: false, recoveryPending: false,
    capacity: NURSERY_CAPACITY, revision: 0, createdAt: T0,
  };
}
function pokemonOf(instanceId: string, species: number): PokemonRef {
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION,
    instanceId: instanceId as PokemonRef["instanceId"],
    origin: { kind: "gen3_5", saveSha256: SHA, generation: 4, species, pid: 1234 },
    dataSha256: SHA, verdict: "legal", capturedAt: T0,
  };
}
function depositOf(id: string, pokemonId: string, key: string): DepositRequest {
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION,
    id: id as DepositRequest["id"],
    nurseryId: NURSERY_A as Nursery["id"],
    ownerId: OWNER_B as Owner["id"],
    pokemonId: pokemonId as PokemonRef["instanceId"],
    requestedAt: T0, idempotencyKey: key,
  };
}
function recoveryOf(id: string, stayId: string, key: string): RecoveryRequest {
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION,
    id: id as RecoveryRequest["id"],
    stayId: stayId as RecoveryRequest["stayId"],
    ownerId: OWNER_B as Owner["id"],
    requestedAt: T0, idempotencyKey: key,
    hostConnected: false, reason: "host_offline",
  };
}

const plus = (iso: string, ms: number): string => new Date(Date.parse(iso) + ms).toISOString();

// ---------------------------------------------------------------------------
// 2. Puertos de prueba
// ---------------------------------------------------------------------------

class TestClock implements BreedingClock {
  constructor(private at: string = T0) {}
  now(): string { return this.at; }
  set(iso: string): void { this.at = iso; }
  advance(ms: number): void { this.at = plus(this.at, ms); }
}

class TestCompatibility implements BreedingCompatibilityProvider {
  private readonly unknownSpecies: ReadonlySet<number>;
  private readonly blockedSpecies: ReadonlySet<number>;
  private readonly rarities: ReadonlyMap<number, Rarity>;
  constructor(opts: {
    unknown?: Iterable<number>;
    blocked?: Iterable<number>;
    rarities?: Iterable<readonly [number, Rarity]>;
  } = {}) {
    this.unknownSpecies = new Set(opts.unknown ?? []);
    this.blockedSpecies = new Set(opts.blocked ?? [150, 151, 249, 250, 494]);
    this.rarities = new Map(opts.rarities ?? []);
  }
  compatibility(a: PairMember, b: PairMember): Compatibility {
    if (this.unknownSpecies.has(a.species) || this.unknownSpecies.has(b.species)) return "unknown";
    if (this.blockedSpecies.has(a.species) || this.blockedSpecies.has(b.species)) return "incompatible";
    return "compatible";
  }
  rarityOf(member: PairMember): Rarity {
    return this.rarities.get(member.species) ?? "common";
  }
}

class SQLiteOutbox implements BreedingEventSink {
  private readonly db: Database;
  constructor(path: string) {
    this.db = new Database(path, { create: true });
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pg08d_breeding_outbox (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        idempotency_key TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        event_json TEXT NOT NULL
      )
    `);
  }
  append(event: BreedingEvent): string {
    const existing = this.db.query(
      "SELECT event_id FROM pg08d_breeding_outbox WHERE idempotency_key = ?",
    ).get(event.idempotencyKey) as { event_id: string } | undefined;
    if (existing) return existing.event_id;
    this.db.query(`
      INSERT INTO pg08d_breeding_outbox
        (event_id, idempotency_key, event_type, occurred_at, event_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(event.eventId, event.idempotencyKey, event.type, event.occurredAt, JSON.stringify(event));
    return event.eventId;
  }
  events(): BreedingEvent[] {
    return (this.db.query("SELECT event_json FROM pg08d_breeding_outbox ORDER BY sequence ASC").all() as { event_json: string }[])
      .map((row) => JSON.parse(row.event_json) as BreedingEvent);
  }
  count(): number {
    return (this.db.query("SELECT COUNT(*) AS n FROM pg08d_breeding_outbox").get() as { n: number }).n;
  }
  close(): void { this.db.close(); }
}

class FileCycleStore implements BreedingCycleStore {
  constructor(readonly path: string) {}
  load(): BreedingState | null {
    return existsSync(this.path) ? JSON.parse(readFileSync(this.path, "utf8")) as BreedingState : null;
  }
  save(state: BreedingState): void {
    writeFileSync(this.path, JSON.stringify(state));
  }
}

/** Custodia real sobre la autoridad simulada PG-08C (D6, local y simulada). */
class AuthorityCustody implements CustodyPort {
  constructor(
    private readonly authority: SharedAuthority,
    private readonly store: SharedNurseryStore,
    private readonly tokens: ReadonlyMap<string, TestToken>,
  ) {}

  private stayOf(stayId: string): Stay | null {
    return this.store.getSystem().snapshot().stays.find((s) => s.id === stayId) ?? null;
  }

  private recover(stay: Stay, ownerId: string, key: string, at: string): CustodyResult {
    const token = this.tokens.get(ownerId);
    if (!token) return { ok: false, code: "UNAUTHORIZED", message: "sin identidad verificada del propietario" };
    const reqKey = `pg08d-rec:${key}`;
    const request = recoveryOf(uuidFrom(reqKey), stay.id, reqKey);
    const issued = this.authority.submit({
      commandId: `cmd:${reqKey}`,
      operation: "requestRecovery",
      input: { ...request, at },
      principal: token,
      aggregateId: `stay:${stay.id}`,
    });
    if (!issued.ok) {
      if (issued.code === "STAY_NOT_ACTIVE" || issued.code === "DUPLICATE_REQUEST") {
        return { ok: true, finalStayId: stay.id, confirmed: false };
      }
      return { ok: false, code: issued.code ?? "RECOVERY_FAILED", message: "no se pudo emitir el vale de recuperación" };
    }
    const outcome = issued.outcome;
    if (!outcome?.ok) return { ok: false, code: "RECOVERY_FAILED", message: "la autoridad no devolvió vale" };
    const voucher = (outcome.value as { voucher: Record<string, unknown> }).voucher;
    const doneKey = `pg08d-done:${key}`;
    const completed = this.authority.submit({
      commandId: `cmd:${doneKey}`,
      operation: "completeRecovery",
      input: { voucher, idempotencyKey: doneKey, at },
      principal: token,
      aggregateId: `stay:${stay.id}`,
    });
    if (!completed.ok) {
      return { ok: false, code: completed.code ?? "RECOVERY_FAILED", message: "no se pudo canjear el vale" };
    }
    return { ok: true, finalStayId: stay.id, confirmed: true };
  }

  withdraw(input: { stayId: string; ownerId: string; idempotencyKey: string; at: string }): CustodyResult {
    const stay = this.stayOf(input.stayId);
    if (!stay) return { ok: false, code: "NOT_FOUND", message: "la estancia no existe" };
    if (stay.state === "stay_finished") {
      return { ok: true, finalStayId: stay.id, confirmed: false };
    }
    if (stay.ownerId !== input.ownerId) {
      return { ok: false, code: "OWNER_MISMATCH", message: "solo el propietario retira" };
    }
    return this.recover(stay, input.ownerId, input.idempotencyKey, input.at);
  }

  expel(input: { stayId: string; hostId: string; ownerId: string; idempotencyKey: string; at: string }): CustodyResult {
    const stay = this.stayOf(input.stayId);
    if (!stay) return { ok: false, code: "NOT_FOUND", message: "la estancia no existe" };
    const nursery = this.store.getSystem().snapshot().nurseries.find((n) => n.id === stay.nurseryId);
    if (!nursery || nursery.hostId !== input.hostId) {
      return { ok: false, code: "HOST_MISMATCH", message: "solo el anfitrión de la guardería expulsa" };
    }
    if (stay.state === "stay_finished") {
      return { ok: true, finalStayId: stay.id, confirmed: false };
    }
    if (stay.ownerId !== input.ownerId) {
      return { ok: false, code: "OWNER_MISMATCH", message: "el destino de la expulsión es el propietario registrado" };
    }
    // La autoridad SIMULADA ejecuta la devolución con la identidad del
    // propietario que obra en el registro; NO es una garantía online real.
    return this.recover(stay, input.ownerId, input.idempotencyKey, input.at);
  }
}

const OFFLINE_CUSTODY: CustodyPort = {
  withdraw: () => ({ ok: false, code: "AUTHORITY_OFFLINE", message: "autoridad no disponible" }),
  expel: () => ({ ok: false, code: "AUTHORITY_OFFLINE", message: "autoridad no disponible" }),
};

// ---------------------------------------------------------------------------
// 3. Fixture de dominio + motor
// ---------------------------------------------------------------------------

type Who = "A" | "B";
type FixtureOpts = {
  twoStays?: boolean;
  grantPermissions?: boolean;
  rarities?: Iterable<readonly [number, Rarity]>;
  unknown?: Iterable<number>;
  blocked?: Iterable<number>;
  offlinePolicy?: "single" | "bounded";
  maxPendingEggs?: number;
  custody?: CustodyPort;
};

type Fixture = {
  label: string;
  path: string;
  store: SharedNurseryStore;
  queue: SharedEventQueue;
  authority: SharedAuthority;
  identities: TestIdentityProvider;
  tokenA: TestToken;
  tokenB: TestToken;
  tokens: Map<string, TestToken>;
  clock: TestClock;
  compat: TestCompatibility;
  outbox: SQLiteOutbox;
  cycleStore: FileCycleStore;
  custody: CustodyPort;
  engine: BreedingEngine;
  stayIds: string[];
  stays: () => Stay[];
};

function dirOf(label: string): string {
  const dir = join(TMP_ROOT, label);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function submit(
  fx: Fixture,
  commandId: string,
  operation: Parameters<SharedAuthority["submit"]>[0]["operation"],
  input: Readonly<Record<string, unknown>>,
  who: Who = "A",
  extra: Partial<Pick<Parameters<SharedAuthority["submit"]>[0], "expectedRevision" | "aggregateId">> = {},
): AuthorityResult {
  const key = commandId.startsWith("cmd:") ? commandId : `cmd:${commandId}`;
  return fx.authority.submit({
    commandId: key,
    operation,
    input: { idempotencyKey: key, ...input, at: T0 },
    principal: who === "A" ? fx.tokenA : fx.tokenB,
    ...extra,
  });
}

type OkLike = {
  readonly ok: boolean;
  readonly code?: string | null;
  readonly outcome?: { readonly ok: boolean; readonly error?: { readonly message: string } } | null;
};

function ok(result: OkLike, what: string): void {
  assert(
    result.ok,
    `${what} rechazado: ${result.code ?? ""} ${result.outcome && !result.outcome.ok ? result.outcome.error?.message ?? "" : ""}`,
  );
}

function fixture(label: string, opts: FixtureOpts = {}): Fixture {
  const dir = dirOf(label);
  const path = join(dir, "store.db");
  const store = openSharedStore({ databasePath: path });
  const queue = openEventQueue({ databasePath: path });
  const identities = new TestIdentityProvider();
  const authority = new SharedAuthority(store, queue, identities);
  const tokenA = identities.issue(OWNER_A);
  const tokenB = identities.issue(OWNER_B);
  const tokens = new Map([[OWNER_A, tokenA], [OWNER_B, tokenB]]);
  const clock = new TestClock();
  const compat = new TestCompatibility({
    rarities: opts.rarities, unknown: opts.unknown, blocked: opts.blocked,
  });
  const outbox = new SQLiteOutbox(path);
  const cycleStore = new FileCycleStore(join(dir, "cycle.json"));
  const custody = opts.custody ?? new AuthorityCustody(authority, store, tokens);

  const fx: Fixture = {
    label, path, store, queue, authority, identities, tokenA, tokenB, tokens,
    clock, compat, outbox, cycleStore, custody,
    engine: null as unknown as BreedingEngine,
    stayIds: [],
    stays: () => store.getSystem().snapshot().stays,
  };

  ok(submit(fx, "owner-a", "registerOwner", ownerOf(OWNER_A, "Anfitrión"), "A"), "registro anfitrión");
  ok(submit(fx, "owner-b", "registerOwner", ownerOf(OWNER_B, "Visitante"), "B"), "registro visitante");
  ok(submit(fx, "nursery", "registerNursery", nurseryOf(NURSERY_A, OWNER_A), "A"), "registro guardería");
  ok(submit(fx, "mon-1", "registerPokemon", pokemonOf(MON1, 132), "B"), "registro Ditto");
  ok(submit(fx, "mon-2", "registerPokemon", pokemonOf(MON2, 218), "B"), "registro Pokémon común");

  const accept = (reqId: string, monId: string, key: string, who: Who): string => {
    ok(submit(fx, `req-${key}`, "requestDeposit", depositOf(reqId, monId, `deposit-${key}`), who), `solicitud ${key}`);
    const result = submit(fx, `accept-${key}`, "acceptDeposit", { requestId: reqId }, "A");
    ok(result, `aceptación ${key}`);
    const stay = fx.stays().find((s) => s.pokemon.instanceId === monId && s.state === "stay_active");
    assert(stay, `la estancia ${key} debe existir`);
    return stay!.id;
  };

  fx.stayIds.push(accept(REQ1, MON1, "one", "B"));
  if (opts.twoStays) {
    fx.stayIds.push(accept(REQ2, MON2, "two", "B"));
  }
  if (opts.grantPermissions !== false) {
    for (const [index, stayId] of fx.stayIds.entries()) {
      ok(submit(fx, `grant-${index}`, "grantPermission", {
        stayId, ownerId: OWNER_B, permission: "allow_breeding", consentKey: `consent-breed-${index}`,
      }, "B", { aggregateId: `stay:${stayId}` }), `permiso de crianza ${index}`);
    }
  }

  fx.engine = createBreedingEngine({
    nurseryId: NURSERY_A,
    clock, compatibility: compat, events: outbox, store: cycleStore, custody,
    offlinePolicy: opts.offlinePolicy ?? "single",
    maxPendingEggs: opts.maxPendingEggs ?? 1,
  });
  return fx;
}

function reopenEngine(fx: Fixture): BreedingEngine {
  return createBreedingEngine({
    nurseryId: NURSERY_A,
    clock: fx.clock, compatibility: fx.compat, events: fx.outbox,
    store: new FileCycleStore(fx.cycleStore.path), custody: fx.custody,
    offlinePolicy: fx.cycleStore.load()?.offlinePolicy ?? "single",
    maxPendingEggs: fx.cycleStore.load()?.maxPendingEggs ?? 1,
  });
}

function redeposit(fx: Fixture, monId: string, reqId: string, key: string): Stay {
  ok(submit(fx, `redep-req-${key}`, "requestDeposit", depositOf(reqId, monId, `dep-${key}`), "B"), `nueva solicitud ${key}`);
  ok(submit(fx, `redep-acc-${key}`, "acceptDeposit", { requestId: reqId }, "A"), `nueva aceptación ${key}`);
  const stay = fx.stays().find((s) => s.pokemon.instanceId === monId && s.state === "stay_active");
  assert(stay, `la nueva estancia ${key} debe existir`);
  ok(submit(fx, `redep-grant-${key}`, "grantPermission", {
    stayId: stay!.id, ownerId: OWNER_B, permission: "allow_breeding", consentKey: `consent-again-${key}`,
  }, "B", { aggregateId: `stay:${stay!.id}` }), `nuevo permiso ${key}`);
  return fx.stays().find((s) => s.id === stay!.id)!;
}

function closeFixture(fx: Fixture): void {
  fx.store.close(); fx.queue.close(); fx.authority.close(); fx.outbox.close();
}

// ---------------------------------------------------------------------------
// 4. Casos
// ---------------------------------------------------------------------------

check("01 · Contrato, constantes y tabla provisional", () => {
  equal(BREEDING_SCHEMA, "pg08d.breeding-engine", "esquema del motor");
  equal(BREEDING_VERSION, "1.0.0", "versión del motor");
  equal(MIN_INTERVAL_MS, HOUR, "mínimo de una hora");
  equal(MAX_INTERVAL_MS, 12 * HOUR, "máximo de doce horas");
  equal(PROVISIONAL_INTERVALS_MS.common, HOUR, "común = 1 h");
  equal(PROVISIONAL_INTERVALS_MS.extreme, 12 * HOUR, "extremo = 12 h");
  equal(PROVISIONAL_INTERVALS_MS.unknown, 0, "desconocido bloquea");
  equal(initialState(NURSERY_A).eggs, [], "estado inicial sin huevos");
  fx01Close();
});
function fx01Close(): void { /* caso sin BD: no hay nada que cerrar */ }

check("02 · Pareja compatible: evaluación ready", () => {
  const fx = fixture("02-pareja-compatible", { twoStays: true });
  const ev = fx.engine.evaluate(fx.stays());
  equal(ev.state, "ready", "pareja válida");
  equal(ev.pair.length, 2, "dos miembros");
  equal(ev.compatibility, "compatible", "compatibilidad declarada");
  equal(ev.intervalMs, HOUR, "intervalo de común");
  closeFixture(fx);
});

check("03 · Pareja incompleta: inactive", () => {
  const fx = fixture("03-pareja-incompleta");
  const ev = fx.engine.evaluate(fx.stays());
  equal(ev.state, "inactive", "sin pareja");
  equal(fx.engine.start(fx.stays(), "start-03").ok, false, "no se inicia ciclo");
  equal(fx.engine.snapshot().cycle, null, "sin ciclo");
  closeFixture(fx);
});

check("04 · Pareja incompatible: invalid sin huevos", () => {
  const fx = fixture("04-incompatible", { twoStays: true, blocked: [218] });
  const ev = fx.engine.evaluate(fx.stays());
  equal(ev.state, "invalid", "pareja incompatible");
  equal(ev.compatibility, "incompatible", "motivo de compatibilidad");
  equal(fx.engine.start(fx.stays(), "start-04").ok, false, "start rechazado");
  fx.clock.advance(13 * HOUR);
  equal(fx.engine.tick(fx.stays(), "tick-04").ok, false, "tick rechazado");
  equal(fx.engine.snapshot().eggs.length, 0, "sin huevos");
  closeFixture(fx);
});

check("05 · Compatibilidad desconocida: no se fabrica huevo", () => {
  const fx = fixture("05-desconocida", { twoStays: true, unknown: [218] });
  const ev = fx.engine.evaluate(fx.stays());
  equal(ev.state, "invalid", "desconocida es inválida");
  equal(ev.compatibility, "unknown", "estado unknown");
  equal(fx.engine.snapshot().eggs.length, 0, "sin huevos");
  closeFixture(fx);
});

check("06 · Inicio de ciclo y persistencia inmediata", () => {
  const fx = fixture("06-inicio", { twoStays: true });
  const result = fx.engine.start(fx.stays(), "start-06");
  assert(result.ok, "el inicio debe tener éxito");
  const cycle = result.value;
  equal(cycle.state, "running", "ciclo activo");
  equal(cycle.cycleNumber, 1, "primer ciclo");
  equal(cycle.dueAt, plus(T0, HOUR), "primer vencimiento a la hora");
  assert(cycle.cycleId.startsWith(`cycle:${NURSERY_A}:`), "ID estable con guardería");
  assert(existsSync(fx.cycleStore.path), "el temporizador se persistió");
  equal(fx.outbox.count(), 1, "un evento de inicio");
  equal(fx.outbox.events()[0]!.type, "breeding.cycle.started", "tipo de evento");
  closeFixture(fx);
});

check("07 · Intervalos: mínimo, máximo y valores inválidos", () => {
  equal(clampInterval(0), HOUR, "cero → 1 h");
  equal(clampInterval(-50), HOUR, "negativo → 1 h");
  equal(clampInterval(Number.NaN), HOUR, "NaN → 1 h");
  equal(clampInterval(37 * HOUR), 12 * HOUR, "37 h → 12 h");
  equal(maxRarity("common", "extreme"), "extreme", "rareza máxima de la pareja");
  equal(maxRarity("unknown", "rare"), "rare", "unknown no gana");
  const fx = fixture("07-intervalos", {
    twoStays: true,
    rarities: [[132, "common"], [218, "extreme"]],
  });
  equal(fx.engine.evaluate(fx.stays()).intervalMs, 12 * HOUR, "la pareja usa la rareza mayor");
  closeFixture(fx);
});

check("08 · Primer huevo nunca antes de una hora", () => {
  const fx = fixture("08-primer-huevo", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-08"), "inicio");
  fx.clock.set(plus(T0, HOUR - 1000));
  equal(fx.engine.tick(fx.stays(), "tick-early").value, null, "un segundo antes: sin huevo");
  equal(fx.engine.snapshot().eggs.length, 0, "sin huevos");
  fx.clock.set(plus(T0, HOUR));
  const egg = fx.engine.tick(fx.stays(), "tick-due");
  assert(egg.ok, "debe producirse el huevo");
  assert(egg.value.eggId.startsWith("egg:cycle:"), "ID del huevo derivado del ciclo");
  equal(fx.engine.snapshot().eggs.length, 1, "un huevo");
  closeFixture(fx);
});

check("09 · Segundo ciclo tras el primer huevo", () => {
  const fx = fixture("09-segundo-ciclo", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-09"), "inicio");
  fx.clock.advance(HOUR);
  const first = fx.engine.tick(fx.stays(), "tick-09");
  assert(first.ok && first.value, "primer huevo");
  const cycle = fx.engine.snapshot().cycle!;
  equal(cycle.cycleNumber, 2, "segundo ciclo");
  equal(cycle.eggId, first.value.eggId, "referencia al huevo anterior");
  equal(cycle.dueAt, plus(T0, 2 * HOUR), "nuevo vencimiento");
  assert(cycle.cycleId !== first.value.cycleId, "el ID del ciclo cambió");
  closeFixture(fx);
});

check("10 · Persistencia del temporizador tras reinicio del proceso", () => {
  const fx = fixture("10-reinicio", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-10"), "inicio");
  const before = JSON.parse(JSON.stringify(fx.engine.snapshot().cycle));
  const restarted = reopenEngine(fx);
  equal(restarted.snapshot().cycle, before, "el ciclo sobrevive al reinicio");
  fx.clock.advance(HOUR);
  const egg = restarted.tick(fx.stays(), "tick-tras-reinicio");
  assert(egg.ok && egg.value, "el huevo se produce tras reiniciar");
  equal(restarted.snapshot().eggs.length, 1, "un solo huevo");
  closeFixture(fx);
});

check("11 · Idempotencia de tick con la misma clave", () => {
  const fx = fixture("11-idempotencia-tick", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-11"), "inicio");
  fx.clock.advance(HOUR);
  const first = fx.engine.tick(fx.stays(), "tick-11");
  const second = fx.engine.tick(fx.stays(), "tick-11");
  equal(first.ok, true, "primera ejecución");
  equal(second.value, null, "reintento sin efecto");
  equal(fx.engine.snapshot().eggs.length, 1, "un huevo");
  equal(fx.outbox.events().filter((e) => e.type === "breeding.egg.produced").length, 1, "un evento de huevo");
  closeFixture(fx);
});

check("12 · Doble ejecución concurrente sobre el mismo ciclo", () => {
  const fx = fixture("12-doble-ejecucion", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-12"), "inicio");
  fx.clock.advance(HOUR);
  const a = fx.engine.tick(fx.stays(), "tick-12-a");
  const b = fx.engine.tick(fx.stays(), "tick-12-b");
  equal(a.ok && a.value !== null, true, "primera tick produce");
  equal(b.value, null, "segunda tick no produce otro");
  equal(fx.engine.snapshot().eggs.length, 1, "sin duplicado");
  equal(new Set(fx.outbox.events().map((e) => e.idempotencyKey)).size, fx.outbox.count(), "claves únicas en outbox");
  closeFixture(fx);
});

check("13 · Dos comandos concurrentes: cancelación gana", () => {
  const fx = fixture("13-concurrentes", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-13"), "inicio");
  fx.clock.advance(HOUR);
  const cancelled = fx.engine.cancel("manual", "cancel-13");
  assert(cancelled.ok, "cancelación aceptada");
  const tick = fx.engine.tick(fx.stays(), "tick-13");
  equal(tick.ok, false, "tick posterior rechazado");
  equal(tick.code, "NO_RUNNING_CYCLE", "motivo");
  equal(fx.engine.snapshot().eggs.length, 0, "sin huevo");
  closeFixture(fx);
});

check("14 · Retirada por el propietario: custodia y ciclo", () => {
  const fx = fixture("14-retirada", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-14"), "inicio");
  const result = fx.engine.withdrawGuestPokemon({
    stayId: fx.stayIds[0]!, ownerId: OWNER_B, idempotencyKey: "withdraw-14",
  });
  assert(result.ok, `retirada rechazada: ${result.ok ? "" : result.code}`);
  equal(result.value.confirmed, true, "retirada confirmada por la autoridad");
  equal(fx.engine.snapshot().cycle?.state, "stopped", "ciclo detenido");
  equal(fx.engine.snapshot().cycle?.reason, "withdraw", "motivo");
  equal(fx.stays().find((s) => s.id === fx.stayIds[0])?.state, "stay_finished", "custodia devuelta");
  assert(fx.outbox.events().some((e) => e.type === "breeding.guest.withdrawn"), "evento de retirada");
  closeFixture(fx);
});

check("15 · Expulsión por el anfitrión: sin cambio de propiedad", () => {
  const fx = fixture("15-expulsion", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-15"), "inicio");
  const result = fx.engine.expelGuestPokemon({
    stayId: fx.stayIds[0]!, hostId: OWNER_A, ownerId: OWNER_B, idempotencyKey: "expel-15",
  });
  assert(result.ok, `expulsión rechazada: ${result.ok ? "" : result.code}`);
  equal(fx.engine.snapshot().cycle?.state, "stopped", "ciclo detenido");
  equal(fx.engine.snapshot().cycle?.reason, "expel", "motivo");
  const stay = fx.stays().find((s) => s.id === fx.stayIds[0])!;
  equal(stay.ownerId, OWNER_B, "la propiedad no cambia");
  equal(stay.state, "stay_finished", "estancia terminada");
  assert(fx.outbox.events().some((e) => e.type === "breeding.guest.expelled"), "evento de expulsión");
  closeFixture(fx);
});

check("16 · Expulsión rechazada a un anfitrión ajeno", () => {
  const fx = fixture("16-anfitrion-ajeno", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-16"), "inicio");
  const result = fx.engine.expelGuestPokemon({
    stayId: fx.stayIds[0]!, hostId: OWNER_B, ownerId: OWNER_B, idempotencyKey: "expel-16",
  });
  equal(result.ok, false, "rechazada");
  equal(result.code, "HOST_MISMATCH", "motivo de autoridad");
  equal(fx.engine.snapshot().cycle?.state, "running", "el ciclo sigue activo");
  equal(fx.outbox.events().some((e) => e.type === "breeding.guest.expelled"), false, "sin evento falso");
  closeFixture(fx);
});

check("17 · Cancelación manual y progreso descartado", () => {
  const fx = fixture("17-cancelacion", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-17"), "inicio");
  const oldId = fx.engine.snapshot().cycle!.cycleId;
  fx.clock.advance(30 * 60_000);
  const result = fx.engine.cancel("manual", "cancel-17");
  assert(result.ok, "cancelación aceptada");
  const cycle = fx.engine.snapshot().cycle!;
  equal(cycle.state, "stopped", "estado stopped");
  equal(cycle.cycleId, oldId, "el ciclo cancelado conserva su ID");
  equal(cycle.reason, "manual", "motivo");
  fx.clock.advance(HOUR);
  equal(fx.engine.tick(fx.stays(), "tick-17").ok, false, "no se reanuda");
  equal(fx.engine.snapshot().eggs.length, 0, "sin huevo");
  closeFixture(fx);
});

check("18 · Nuevo depósito reinicia el ciclo desde cero", () => {
  const fx = fixture("18-nuevo-deposito", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-18"), "inicio");
  const oldId = fx.engine.snapshot().cycle!.cycleId;
  fx.clock.advance(30 * 60_000);
  ok(fx.engine.withdrawGuestPokemon({
    stayId: fx.stayIds[0]!, ownerId: OWNER_B, idempotencyKey: "withdraw-18",
  }), "retirada");
  fx.clock.advance(2 * HOUR);
  const again = redeposit(fx, MON1, REQ_AGAIN, "again");
  equal(again.state, "stay_active", "el Pokémon vuelve a alojarse");
  equal(isPairActive(fx.stays(), NURSERY_A).length, 2, "pareja reformada");
  const started = fx.engine.start(fx.stays(), "start-18-b");
  assert(started.ok, "nuevo ciclo");
  assert(started.value.cycleId !== oldId, "ID nuevo: no reutiliza progreso");
  equal(started.value.cycleNumber, 2, "número de ciclo incremental");
  equal(started.value.startedAt, fx.clock.now(), "arranca en el nuevo tiempo");
  equal(started.value.dueAt, plus(fx.clock.now(), HOUR), "vencimiento desde cero");
  closeFixture(fx);
});

check("19 · Permisos desactivados por defecto", () => {
  const fx = fixture("19-sin-permisos", { twoStays: true, grantPermissions: false });
  const ev = fx.engine.evaluate(fx.stays());
  equal(ev.state, "invalid", "sin permiso no hay pareja válida");
  assert(ev.reason.includes("autorización"), "motivo de autorización");
  equal(fx.engine.start(fx.stays(), "start-19").ok, false, "sin ciclo");
  equal(isPairActive(fx.stays(), NURSERY_A).length, 2, "los permisos no alteran la estancia");
  closeFixture(fx);
});

check("20 · Revocación impide nuevas producciones", () => {
  const fx = fixture("20-revocacion", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-20"), "inicio");
  ok(submit(fx, "revoke-20", "revokePermission", {
    stayId: fx.stayIds[0]!, ownerId: OWNER_B, permission: "allow_breeding",
  }, "B", { aggregateId: `stay:${fx.stayIds[0]}` }), "revocación");
  fx.clock.advance(HOUR);
  const stopped = fx.engine.revokeCheck(fx.stays(), "revoke-check-20");
  assert(stopped.ok, "revokeCheck aceptado");
  equal(fx.engine.snapshot().cycle?.reason, "revoke", "motivo de revocación");
  equal(fx.engine.tick(fx.stays(), "tick-20").ok, false, "sin producción");
  equal(fx.engine.snapshot().eggs.length, 0, "sin huevos");
  closeFixture(fx);
});

check("21 · Huevo confirmado antes de la retirada se conserva", () => {
  const fx = fixture("21-huevo-antes-retirada", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-21"), "inicio");
  fx.clock.advance(HOUR);
  assert(fx.engine.tick(fx.stays(), "tick-21").ok, "huevo confirmado");
  const eggsBefore = fx.engine.snapshot().eggs.length;
  ok(fx.engine.withdrawGuestPokemon({
    stayId: fx.stayIds[1]!, ownerId: OWNER_B, idempotencyKey: "withdraw-21",
  }), "retirada");
  equal(fx.engine.snapshot().eggs.length, eggsBefore, "el huevo confirmado no se elimina");
  equal(fx.engine.snapshot().cycle?.state, "stopped", "el ciclo se detiene");
  closeFixture(fx);
});

check("22 · Retirada un segundo antes del vencimiento", () => {
  const fx = fixture("22-retirada-antes", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-22"), "inicio");
  fx.clock.set(plus(T0, HOUR - 1000));
  ok(fx.engine.withdrawGuestPokemon({
    stayId: fx.stayIds[0]!, ownerId: OWNER_B, idempotencyKey: "withdraw-22",
  }), "retirada antes del vencimiento");
  fx.clock.set(plus(T0, HOUR + 5000));
  equal(fx.engine.tick(fx.stays(), "tick-22").ok, false, "no se produce huevo");
  equal(fx.engine.snapshot().eggs.length, 0, "sin huevo");
  closeFixture(fx);
});

check("23 · Orden autoritativo ante operaciones simultáneas", () => {
  const first = fixture("23-orden-retirada", { twoStays: true });
  ok(first.engine.start(first.stays(), "start-23a"), "inicio A");
  first.clock.advance(HOUR);
  ok(first.engine.withdrawGuestPokemon({
    stayId: first.stayIds[0]!, ownerId: OWNER_B, idempotencyKey: "withdraw-23",
  }), "retirada primero");
  equal(first.engine.tick(first.stays(), "tick-23a").ok, false, "sin huevo");

  const second = fixture("23-orden-huevo", { twoStays: true });
  ok(second.engine.start(second.stays(), "start-23b"), "inicio B");
  second.clock.advance(HOUR);
  assert(second.engine.tick(second.stays(), "tick-23b").ok, "huevo primero");
  ok(second.engine.withdrawGuestPokemon({
    stayId: second.stayIds[0]!, ownerId: OWNER_B, idempotencyKey: "withdraw-23",
  }), "retirada después");
  equal(second.engine.snapshot().eggs.length, 1, "el huevo confirmado se conserva");
  equal(second.engine.snapshot().cycle?.state, "stopped", "sin ciclo nuevo con pareja incompleta");
  closeFixture(first); closeFixture(second);
});

check("24 · Retirada con anfitrión desconectado", () => {
  const fx = fixture("24-anfitrion-offline", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-24"), "inicio");
  // El dominio PG-08A modela la desconexión del anfitrión con
  // `hostConnected: false` en la solicitud de recuperación (no hace falta
  // fluctuar la conectividad de la guardería, que es otro agregado).
  const result = fx.engine.withdrawGuestPokemon({
    stayId: fx.stayIds[0]!, ownerId: OWNER_B, idempotencyKey: "withdraw-24",
  });
  assert(result.ok && result.value.confirmed, "la retirada se confirma con autoridad simulada");
  equal(fx.stays().find((s) => s.id === fx.stayIds[0])!.hostOfflineNoted, true, "desconexión registrada");
  closeFixture(fx);
});

check("25 · Autoridad desconectada: sin confirmación ni cambios parciales", () => {
  const fx = fixture("25-autoridad-offline", { twoStays: true, custody: OFFLINE_CUSTODY });
  ok(fx.engine.start(fx.stays(), "start-25"), "inicio");
  const eventsBefore = fx.outbox.count();
  const failed = fx.engine.withdrawGuestPokemon({
    stayId: fx.stayIds[0]!, ownerId: OWNER_B, idempotencyKey: "withdraw-25",
  });
  equal(failed.ok, false, "sin confirmación");
  equal(failed.code, "AUTHORITY_OFFLINE", "motivo");
  equal(fx.engine.snapshot().cycle?.state, "running", "el ciclo sigue");
  equal(fx.outbox.count(), eventsBefore, "sin eventos de retirada");
  const recovered = createBreedingEngine({
    nurseryId: NURSERY_A, clock: fx.clock, compatibility: fx.compat,
    events: fx.outbox, store: new FileCycleStore(fx.cycleStore.path),
    custody: new AuthorityCustody(fx.authority, fx.store, fx.tokens),
  });
  const retried = recovered.withdrawGuestPokemon({
    stayId: fx.stayIds[0]!, ownerId: OWNER_B, idempotencyKey: "withdraw-25",
  });
  assert(retried.ok, `reintento rechazado: ${retried.ok ? "" : retried.code}`);
  equal(recovered.snapshot().cycle?.state, "stopped", "ciclo detenido al confirmar");
  closeFixture(fx);
});

check("26 · Reloj manipulado por el cliente: ignorado", () => {
  const fx = fixture("26-reloj-manipulado", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-26"), "inicio");
  const forged = fx.engine.tick as unknown as (stays: Stay[], key: string, at: string) => unknown;
  const forgedResult = forged(fx.stays(), "tick-forged", plus(T0, 99 * HOUR)) as { value: unknown };
  equal(forgedResult.value, null, "un at falso no adelanta el reloj");
  equal(fx.engine.snapshot().eggs.length, 0, "sin huevo fraudulento");
  fx.clock.advance(HOUR);
  assert(fx.engine.tick(fx.stays(), "tick-real").ok, "solo el reloj autoritativo produce");
  equal(fx.engine.snapshot().eggs.length, 1, "un huevo");
  closeFixture(fx);
});

check("27 · Reconstrucción determinista desde eventos", () => {
  const fx = fixture("27-reconstruccion", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-27"), "inicio");
  fx.clock.advance(HOUR);
  assert(fx.engine.tick(fx.stays(), "tick-27").ok, "huevo");
  const fresh = createBreedingEngine({
    nurseryId: NURSERY_A, clock: fx.clock, compatibility: fx.compat,
    events: fx.outbox, store: new FileCycleStore(join(dirOf("27-reconstruccion"), "fresh.json")),
    custody: fx.custody,
  });
  equal(fresh.snapshot().eggs.length, 0, "estado nuevo vacío");
  const restored = fresh.restoreFromEvents(fx.outbox.events());
  equal(restored.eggs, 1, "un huevo reconstruido");
  equal(fresh.snapshot().eggs.length, 1, "huevo presente");
  const again = fresh.restoreFromEvents(fx.outbox.events());
  equal(again.eggs, 0, "reconstrucción idempotente");
  equal(fresh.snapshot().eggs.length, 1, "sin duplicados");
  closeFixture(fx);
});

check("28 · Outbox de crianza: eventos, claves y unicidad", () => {
  const fx = fixture("28-outbox", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-28"), "inicio");
  fx.clock.advance(HOUR);
  assert(fx.engine.tick(fx.stays(), "tick-28").ok, "huevo");
  const events = fx.outbox.events();
  const types = events.map((e) => e.type);
  assert(types.includes("breeding.cycle.started"), "inicio");
  assert(types.includes("breeding.egg.produced"), "huevo");
  assert(types.includes("breeding.cycle.completed"), "ciclo completado");
  equal(events.every((e) => e.schema === BREEDING_SCHEMA && e.version === BREEDING_VERSION), true, "sobres de eventos");
  equal(new Set(events.map((e) => e.eventId)).size, events.length, "IDs únicos");
  equal(new Set(events.map((e) => e.idempotencyKey)).size, events.length, "claves únicas");
  const duplicate = fx.outbox.append(events[0]!);
  equal(duplicate, events[0]!.eventId, "append duplicado devuelve el mismo ID");
  equal(fx.outbox.count(), events.length, "sin filas nuevas");
  closeFixture(fx);
});

check("29 · Integridad SQLite de ambos registros", () => {
  const fx = fixture("29-integridad", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-29"), "inicio");
  ok(fx.engine.withdrawGuestPokemon({
    stayId: fx.stayIds[0]!, ownerId: OWNER_B, idempotencyKey: "withdraw-29",
  }), "retirada");
  equal(fx.store.integrityCheck().ok, true, "integridad del EventStore");
  equal(fx.queue.detectGaps(), [], "sin huecos en el outbox de custodia");
  equal(fx.queue.integrityCheck().ok, true, "integridad de la cola");
  equal(fx.store.eventCount(), fx.queue.messageCount(), "un mensaje por evento de custodia");
  equal(fx.outbox.count(), fx.outbox.events().length, "outbox de crianza íntegro");
  closeFixture(fx);
});

check("30 · Protección de saves y bases de producción", () => {
  equal(hashOf(PROTECTED["data/pokegotchi.db"]!), hashesBefore["data/pokegotchi.db"]!, "BD de producción intacta");
  equal(hashOf(PROTECTED["packages/core/src/shared-nurseries.ts"]!), hashesBefore["packages/core/src/shared-nurseries.ts"]!, "dominio PG-08A intacto");
  for (const [label, path] of Object.entries(PROTECTED)) {
    equal(hashOf(path), hashesBefore[label]!, `${label} intacto`);
  }
  const strays = readdirSync(TMP_ROOT)
    .flatMap((dir) => readdirSync(join(TMP_ROOT, dir)))
    .filter((name) => /\.(sav|srm|pkm|pk[0-9])$/i.test(name));
  equal(strays, [], "ningún archivo de guardado generado por la suite");
});

check("31 · Política single: un huevo pendiente como máximo", () => {
  const fx = fixture("31-single", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-31"), "inicio");
  fx.clock.advance(HOUR);
  assert(fx.engine.tick(fx.stays(), "tick-31-a").ok, "primer huevo");
  fx.clock.advance(HOUR);
  const capped = fx.engine.tick(fx.stays(), "tick-31-b");
  equal(capped.ok, false, "segundo ciclo bloqueado");
  equal(capped.code, "EGG_CAP", "motivo de capacidad");
  equal(fx.engine.snapshot().eggs.length, 1, "un solo huevo pendiente");
  closeFixture(fx);
});

check("32 · Política bounded: hasta un máximo configurable", () => {
  const fx = fixture("32-bounded", {
    twoStays: true, offlinePolicy: "bounded", maxPendingEggs: 3,
  });
  ok(fx.engine.start(fx.stays(), "start-32"), "inicio");
  for (let i = 1; i <= 3; i++) {
    fx.clock.advance(HOUR);
    assert(fx.engine.tick(fx.stays(), `tick-32-${i}`).ok, `huevo ${i}`);
  }
  equal(fx.engine.snapshot().eggs.length, 3, "tres huevos pendientes");
  fx.clock.advance(HOUR);
  equal(fx.engine.tick(fx.stays(), "tick-32-4").code, "EGG_CAP", "tope alcanzado");
  closeFixture(fx);
});

check("33 · Legendario compatible con condición verificable", () => {
  const fx = fixture("33-legendario", {
    twoStays: true, blocked: [], rarities: [[132, "common"], [218, "legendary_compatible"]],
  });
  const ev = fx.engine.evaluate(fx.stays());
  equal(ev.state, "ready", "solo si el proveedor lo autoriza");
  equal(ev.intervalMs, 10 * HOUR, "intervalo legendario compatible");
  closeFixture(fx);
});

check("34 · Huevos simulados: sin PKM, herencia ni saves", () => {
  const fx = fixture("34-simulados", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-34"), "inicio");
  fx.clock.advance(HOUR);
  const egg = fx.engine.tick(fx.stays(), "tick-34");
  assert(egg.ok && egg.value, "huevo producido");
  equal(egg.value.simulated, true, "marcado como simulado");
  equal(Object.keys(egg.value).sort(), [
    "cycleId", "eggId", "generation", "intervalMs", "nurseryId", "pair", "producedAt", "simulated",
  ], "sin campos de herencia/PK M");
  const files = (readdirSafe(dirOf("34-simulados"))).sort();
  equal(files.filter((f) => /\.(sav|srm|pkm|pk[0-9])$/i.test(f)), [], "sin archivos de guardado");
  closeFixture(fx);
});
function readdirSafe(dir: string): string[] {
  return readdirSync(dir);
}

check("35 · Reanudación tras reconexión con clave nueva", () => {
  const fx = fixture("35-reconexion", { twoStays: true });
  ok(fx.engine.start(fx.stays(), "start-35"), "inicio");
  const restarted = reopenEngine(fx);
  fx.clock.advance(HOUR);
  const a = restarted.tick(fx.stays(), "tick-35-a");
  assert(a.ok && a.value, "huevo tras reconexión");
  fx.clock.advance(HOUR);
  equal(restarted.tick(fx.stays(), "tick-35-b").code, "EGG_CAP", "política aplicada");
  equal(restarted.snapshot().eggs.length, 1, "sin duplicados");
  equal(fx.outbox.events().filter((e) => e.type === "breeding.egg.produced").length, 1, "un evento de huevo");
  closeFixture(fx);
});

check("36 · Proveedor de compatibilidad inyectable y verificable", () => {
  const fx = fixture("36-proveedor", { twoStays: true, blocked: [218] });
  equal(fx.engine.evaluate(fx.stays()).state, "invalid", "proveedor restrictivo");
  const permissive = createBreedingEngine({
    nurseryId: NURSERY_A, clock: fx.clock,
    compatibility: new TestCompatibility({ blocked: [], rarities: [[132, "rare"], [218, "common"]] }),
    events: fx.outbox, store: fx.cycleStore, custody: fx.custody,
  });
  const ev = permissive.evaluate(fx.stays());
  equal(ev.state, "ready", "proveedor permisivo");
  equal(ev.rarity, "rare", "rareza del proveedor");
  equal(ev.intervalMs, 4 * HOUR, "intervalo según rareza");
  closeFixture(fx);
});

// ---------------------------------------------------------------------------
// 5. Cierre
// ---------------------------------------------------------------------------

try {
  for (const dir of readdirSafe(TMP_ROOT)) rmSync(join(TMP_ROOT, dir), { recursive: true, force: true });
  rmSync(TMP_ROOT, { recursive: true, force: true });
} catch {
  // La limpieza es best-effort: los archivos están fuera del repositorio.
}

console.log(`PG-08D — ${passed} casos correctos, ${failed} fallidos.`);
if (failures.length) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
console.log("Todo correcto.");
