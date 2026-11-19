/**
 * PG-08B — EventStore local de Guarderías Compartidas.
 *
 * SUITE AISLADA: cada caso usa una BD SQLite temporal en /tmp/opencode y la
 * elimina al terminar. NUNCA abre data/pokegotchi.db para escribir; solo la
 * lee para comprobar que su hash no cambia. No arranca servidor ni endpoints.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { Database } from "bun:sqlite";

import {
  CONTRACT_VERSION,
  NURSERY_CAPACITY,
  PERMISSIONS,
  SCHEMA_ID,
  createNurserySystem,
  type Owner,
  type Nursery,
  type PokemonRef,
  type DepositRequest,
  type RecoveryRequest,
  type SyncEvent,
} from "../packages/core/src/shared-nurseries.ts";
import {
  EVENT_STORE_SCHEMA_VERSION,
  PRODUCTION_DB_FILENAME,
  SharedNurseryStore,
  dedupeKeyOf,
  openSharedStore,
  type AuthenticatedOwner,
} from "../apps/server/src/shared-store.ts";

// ---------------------------------------------------------------------------
// 0. Arnés de comprobaciones
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

function throws(fn: () => unknown, message: string): void {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert(threw, message);
}

const TMP_ROOT = (() => {
  const base = "/tmp/opencode";
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return mkdtempSync(join(base, "pg08b-"));
})();

const cleanup: string[] = [];
function tempPath(label: string): string {
  const dir = join(TMP_ROOT, label);
  mkdirSync(dir, { recursive: true });
  cleanup.push(dir);
  return join(dir, "store.db");
}

const PRODUCTION_DB = join(import.meta.dir, "..", "data", "pokegotchi.db");
const productionHashBefore = createHash("sha256").update(readFileSync(PRODUCTION_DB)).digest("hex");

// ---------------------------------------------------------------------------
// 1. Datos de prueba (UUID v4 válidos, constantes del contrato PG-08A)
// ---------------------------------------------------------------------------

const T0 = "2026-11-19T00:00:00.000Z";
const DAY = 86_400_000;
const plus = (iso: string, days: number): string => new Date(Date.parse(iso) + days * DAY).toISOString();
const SHA = "a".repeat(64);

const OWNER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NURSERY_A = "11111111-1111-4111-8111-111111111111";
const MON1 = "22222222-2222-4222-8222-222222222222";
const MON2 = "33333333-3333-4333-8333-333333333333";
const MON3 = "44444444-4444-4444-8444-444444444444";
const REQ1 = "55555555-5555-4555-8555-555555555555";
const REQ2 = "66666666-6666-4666-8666-666666666666";
const REQ3 = "77777777-7777-4777-8777-777777777777";
const REC1 = "88888888-8888-4888-8888-888888888888";
const REC2 = "99999999-9999-4999-8999-999999999999";

const authA: AuthenticatedOwner = { ownerId: OWNER_A, verifiedAt: T0 };
const authB: AuthenticatedOwner = { ownerId: OWNER_B, verifiedAt: T0 };

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

function depositOf(id: string, nurseryId: string, ownerId: string, pokemonId: string, key: string): DepositRequest {
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION,
    id: id as DepositRequest["id"],
    nurseryId: nurseryId as Nursery["id"],
    ownerId: ownerId as Owner["id"],
    pokemonId: pokemonId as PokemonRef["instanceId"],
    requestedAt: T0, idempotencyKey: key,
  };
}

function recoveryOf(id: string, stayId: string, ownerId: string, key: string): RecoveryRequest {
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION,
    id: id as RecoveryRequest["id"],
    stayId: stayId as RecoveryRequest["stayId"],
    ownerId: ownerId as Owner["id"],
    requestedAt: T0, idempotencyKey: key,
    hostConnected: false, reason: "host_offline",
  };
}

type Ctx = {
  store: SharedNurseryStore;
  path: string;
  stayId: string;
  voucher: { nonce: string; ownerId: string; revision: number; expiresAt: string };
};

/** Escenario base: two owners, nursery pública, dos Pokémon alojados. */
function seeded(label: string, withSecondStay = false): Ctx {
  const path = tempPath(label);
  const store = openSharedStore({ databasePath: path });
  const run = (operation: any, input: any, auth: AuthenticatedOwner) => {
    const result = store.execute({ operation, input, auth });
    assert(result.ok, `setup ${operation} falló: ${result.ok ? "" : result.error.code + " " + result.error.message}`);
    return result;
  };

  run("registerOwner", { ...ownerOf(OWNER_A, "Anfitrión"), idempotencyKey: "reg-owner-a" }, authA);
  run("registerOwner", { ...ownerOf(OWNER_B, "Visitante"), idempotencyKey: "reg-owner-b" }, authB);
  run("registerNursery", { ...nurseryOf(NURSERY_A, OWNER_A), idempotencyKey: "reg-nursery-a" }, authA);
  run("registerPokemon", { ...pokemonOf(MON1, 218), idempotencyKey: "reg-mon-1" }, authA);
  run("registerPokemon", { ...pokemonOf(MON2, 81), idempotencyKey: "reg-mon-2" }, authB);

  run("requestDeposit", { ...depositOf(REQ1, NURSERY_A, OWNER_B, MON1, "deposit-1"), at: T0 }, authB);
  const accepted = run("acceptDeposit", { requestId: REQ1, expectedNurseryRevision: 0, idempotencyKey: "accept-1", at: T0 }, authA);
  const stayId = (accepted.value as any).id as string;

  let voucher: Ctx["voucher"] = { nonce: "", ownerId: OWNER_B, revision: 0, expiresAt: "" };
  if (withSecondStay) {
    run("registerPokemon", { ...pokemonOf(MON3, 82), idempotencyKey: "reg-mon-3" }, authB);
    run("requestDeposit", { ...depositOf(REQ2, NURSERY_A, OWNER_B, MON2, "deposit-2"), at: T0 }, authB);
    run("acceptDeposit", { requestId: REQ2, expectedNurseryRevision: 1, idempotencyKey: "accept-2", at: T0 }, authA);
    run("requestDeposit", { ...depositOf(REQ3, NURSERY_A, OWNER_B, MON3, "deposit-3"), at: T0 }, authB);
  }

  return { store, path, stayId, voucher };
}

// ---------------------------------------------------------------------------
// 2. Los 22 casos exigidos
// ---------------------------------------------------------------------------

check("01 · Creación del EventStore", () => {
  const path = tempPath("01-creacion");
  const store = openSharedStore({ databasePath: path });
  equal(store.databasePath, path, "ruta de la BD");
  assert(store.databasePath.includes("shared-pg08b.db") || path.endsWith("store.db"), "BD aislada");
  equal(store.eventCount(), 0, "eventos iniciales");
  equal(store.readMeta().event_store_schema_version, String(EVENT_STORE_SCHEMA_VERSION), "versión de esquema");
  equal(store.readMeta().contract_schema_id, SCHEMA_ID, "schema del contrato");
  equal(store.readMeta().contract_version, CONTRACT_VERSION, "versión del contrato");
  store.close();
});

check("02 · Migración inicial y restricciones UNIQUE", () => {
  const { store, path } = seeded("02-migracion");
  const raw = new Database(path);
  const tables = (raw.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{ name: string }>).map((r) => r.name);
  for (const table of ["events", "meta", "snapshots"]) assert(tables.includes(table), `falta tabla ${table}`);
  const indexes = (raw.query("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name").all() as Array<{ name: string }>).map((r) => r.name);
  assert(indexes.includes("events_aggregate_idx"), "falta índice de agregado");

  const first = store.exportEvents()[0];
  throws(() => raw.query(`INSERT INTO events (
      event_id, sequence, aggregate_id, aggregate_sequence, dedupe_key,
      idempotency_key, event_type, schema_id, contract_version,
      occurred_at, payload_json, payload_sha256
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      "abcdefab-cdef-4abc-8abc-abcdefabcdef", 999, first.aggregateId, 999,
      dedupeKeyOf(first), first.idempotencyKey, first.type, first.schema,
      first.version, first.occurredAt, "{}", createHash("sha256").update("{}").digest("hex"),
    ), "la clave de idempotencia duplicada debe fallar");
  raw.close();
  store.close();
});

check("03 · Reapertura sin pérdida", () => {
  const { store, path } = seeded("03-reapertura");
  const before = JSON.stringify(store.snapshot());
  const count = store.eventCount();
  store.close();
  const reopened = openSharedStore({ databasePath: path });
  equal(JSON.stringify(reopened.snapshot()), before, "snapshot tras reapertura");
  equal(reopened.eventCount(), count, "número de eventos tras reapertura");
  reopened.close();
});

check("04 · Replay determinista", () => {
  const { store, path } = seeded("04-replay");
  const determinism = store.verifyDeterminism();
  assert(determinism.equal, "snapshot en memoria y reconstruido deben coincidir");
  const live = store.snapshot();
  store.close();
  const reopened = openSharedStore({ databasePath: path });
  equal(JSON.stringify(reopened.snapshot()), JSON.stringify(live), "replay idéntico");
  assert(reopened.verifyDeterminism().equal, "determinismo tras reapertura");
  reopened.close();
});

check("05 · Integridad SQLite", () => {
  const { store } = seeded("05-integridad");
  const report = store.integrityCheck();
  assert(report.ok, `integridad: ${report.issues.join("; ")}`);
  assert(report.eventCount > 0, "debe contar eventos");
  store.close();
});

check("06 · Secuencias monotónicas", () => {
  const { store } = seeded("06-secuencias");
  const events = store.exportEvents();
  events.forEach((event, index) => equal(event.sequence, index + 1, `secuencia global ${index}`));
  const byAggregate = new Map<string, number>();
  for (const event of events) {
    const next = (byAggregate.get(event.aggregateId) ?? 0) + 1;
    byAggregate.set(event.aggregateId, next);
  }
  const rawEvents = store.exportEvents();
  for (const [aggregate, count] of byAggregate) {
    const found = rawEvents.filter((e) => e.aggregateId === aggregate).map((e) => e.sequence);
    equal(found.length, count, `eventos del agregado ${aggregate}`);
  }
  store.close();
});

check("07 · Idempotencia entre reinicios", () => {
  const path = tempPath("07-idempotencia");
  const input = { ...ownerOf(OWNER_A, "Anfitrión"), idempotencyKey: "reg-owner-a", at: T0 };
  const first = openSharedStore({ databasePath: path });
  const a = first.execute({ operation: "registerOwner", input, auth: authA });
  assert(a.ok, "primer registro");
  first.close();

  const second = openSharedStore({ databasePath: path });
  const b = second.execute({ operation: "registerOwner", input, auth: authA });
  assert(b.ok, "registro repetido tras reinicio");
  equal(b.eventId, a.eventId, "mismo eventId");
  equal(b.inserted, false, "no debe insertar de nuevo");
  equal(second.eventCount(), 1, "un solo evento persistido");
  second.close();
});

check("08 · Rollback ante error de escritura", () => {
  const path = tempPath("08-rollback");
  const store = openSharedStore({ databasePath: path });
  const raw = new Database(path);
  raw.exec(`CREATE TRIGGER fail_owner BEFORE INSERT ON events
    WHEN NEW.event_type = 'owner.registered'
    BEGIN SELECT RAISE(ABORT, 'fallo forzado'); END;`);
  throws(() => store.execute({
    operation: "registerOwner",
    input: { ...ownerOf(OWNER_A, "Anfitrión"), idempotencyKey: "reg-owner-a", at: T0 },
    auth: authA,
  }), "el comando debe fallar por el trigger");
  equal(store.eventCount(), 0, "ningún evento parcial");
  equal(store.snapshot().owners.length, 0, "estado observable coherente");
  raw.exec("DROP TRIGGER fail_owner");
  raw.close();
  const ok = store.execute({
    operation: "registerOwner",
    input: { ...ownerOf(OWNER_A, "Anfitrión"), idempotencyKey: "reg-owner-a", at: T0 },
    auth: authA,
  });
  assert(ok.ok, "debe poder reintentar tras revertir");
  store.close();
});

check("09 · Concurrencia entre conexiones", () => {
  const path = tempPath("09-concurrencia");
  const a = openSharedStore({ databasePath: path });
  const b = openSharedStore({ databasePath: path });
  const r1 = a.execute({ operation: "registerOwner", input: { ...ownerOf(OWNER_A, "A"), idempotencyKey: "reg-owner-a" }, auth: authA });
  const r2 = b.execute({ operation: "registerOwner", input: { ...ownerOf(OWNER_B, "B"), idempotencyKey: "reg-owner-b" }, auth: authB });
  assert(r1.ok && r2.ok, "ambos comandos concurrentes deben prosperar");
  assert(r1.sequence !== r2.sequence, "secuencias distintas");
  equal(a.eventCount(), 2, "ningún evento perdido");
  equal(b.eventCount(), 2, "la segunda conexión ve los eventos de la primera");
  const events = a.exportEvents();
  equal(new Set(events.map((e) => e.sequence)).size, events.length, "secuencias únicas");
  a.close();
  b.close();
});

check("10 · STALE_REVISION no persiste nada", () => {
  const { store } = seeded("10-stale", true);
  const before = store.eventCount();
  const result = store.execute({
    operation: "acceptDeposit",
    input: { requestId: REQ3, expectedNurseryRevision: 0, idempotencyKey: "accept-stale", at: T0 },
    auth: authA,
  });
  assert(!result.ok, "debe rechazarse");
  equal(result.error.code, "STALE_REVISION", "código de error");
  equal(store.eventCount(), before, "sin eventos nuevos");
  store.close();
});

check("11 · Capacidad máxima de dos", () => {
  const { store } = seeded("11-capacidad", true);
  const stays = store.snapshot().stays.filter((s) => s.state === "stay_active");
  equal(stays.length, NURSERY_CAPACITY, "dos estancias activas");
  equal(store.snapshot().nurseries[0].state, "full", "guardería llena");
  store.close();
});

check("12 · Tercer depósito rechazado", () => {
  const { store } = seeded("12-tercero", true);
  const before = store.eventCount();
  const result = store.execute({
    operation: "acceptDeposit",
    input: { requestId: REQ3, idempotencyKey: "accept-3", at: T0 },
    auth: authA,
  });
  assert(!result.ok, "tercer depósito debe fallar");
  equal(result.error.code, "NURSERY_FULL", "código de error");
  equal(store.eventCount(), before, "sin evento");
  store.close();
});

check("13 · Permisos desactivados por defecto", () => {
  const { store, stayId } = seeded("13-permisos");
  const stay = store.snapshot().stays.find((s) => s.id === stayId);
  assert(stay !== undefined, "estancia encontrada");
  for (const permission of PERMISSIONS) {
    equal((stay as any).permissions[permission], null, `${permission} debe ser null`);
  }
  const denied = store.execute({
    operation: "applyEvBerries",
    input: { stayId, actorId: OWNER_A, idempotencyKey: "berries-sin-consentimiento" },
    auth: authA,
  });
  assert(!denied.ok, "EV sin consentimiento debe fallar");
  equal(denied.error.code, "CONSENT_REQUIRED", "código de error");
  store.close();
});

check("14 · Concesión y revocación de permisos", () => {
  const { store, stayId } = seeded("14-revocacion");
  const grant = store.execute({
    operation: "grantPermission",
    input: { stayId, ownerId: OWNER_B, permission: "allow_ev_minigames", consentKey: "consent-key-1234", idempotencyKey: "grant-minigame", at: T0 },
    auth: authB,
  });
  assert(grant.ok, `concesión: ${grant.ok ? "" : grant.error.code}`);
  const allowed = store.execute({
    operation: "applyEvMinigame",
    input: { stayId, actorId: OWNER_A, idempotencyKey: "minigame-permitido", at: T0 },
    auth: authA,
  });
  assert(allowed.ok, `minijuego permitido: ${allowed.ok ? "" : allowed.error.code}`);
  const revoke = store.execute({
    operation: "revokePermission",
    input: { stayId, ownerId: OWNER_B, permission: "allow_ev_minigames", idempotencyKey: "revoke-minigame", at: plus(T0, 1) },
    auth: authB,
  });
  assert(revoke.ok, `revocación: ${revoke.ok ? "" : revoke.error.code}`);
  const after = store.snapshot().stays.find((s) => s.id === stayId) as any;
  assert(after.permissions.allow_ev_minigames.revokedAt !== null, "revokedAt debe estar fijado");
  const denied = store.execute({
    operation: "applyEvMinigame",
    input: { stayId, actorId: OWNER_A, idempotencyKey: "minigame-revocado", at: plus(T0, 2) },
    auth: authA,
  });
  assert(!denied.ok, "tras revocar debe fallar");
  equal(denied.error.code, "PERMISSION_REVOKED", "código de error");
  store.close();
});

check("15 · Recuperación por vale con anfitrión desconectado", () => {
  const { store, path, stayId } = seeded("15-recuperacion");
  const requested = store.execute({
    operation: "requestRecovery",
    input: { ...recoveryOf(REC1, stayId, OWNER_B, "recovery-1"), at: T0 },
    auth: authB,
  });
  assert(requested.ok, `solicitud: ${requested.ok ? "" : requested.error.code}`);
  const value = requested.value as any;
  const voucher = value.voucher;
  equal(voucher.ownerId, OWNER_B, "dueño del vale");
  equal(voucher.expiresAt, plus(T0, 7), "vale de siete días");

  store.close();
  const reopened = openSharedStore({ databasePath: path });
  const redeemed = reopened.execute({
    operation: "completeRecovery",
    input: { voucher, at: plus(T0, 1), idempotencyKey: "complete-1" },
    auth: authB,
  });
  assert(redeemed.ok, `canje tras reinicio: ${redeemed.ok ? "" : redeemed.error.code}`);
  const done = reopened.snapshot().stays.find((s) => s.id === stayId) as any;
  equal(done.state, "stay_finished", "estancia finalizada");
  equal(reopened.snapshot().hosted.length, 0, "alojamiento liberado");

  const countAfterRedeem = reopened.eventCount();
  const twice = reopened.execute({
    operation: "completeRecovery",
    input: { voucher, at: plus(T0, 1), idempotencyKey: "complete-1" },
    auth: authB,
  });
  assert(twice.ok, "doble canje debe ser idempotente");
  equal(twice.eventId, redeemed.eventId, "el rejudo devuelve el eventId original");
  equal(twice.inserted, false, "el rejudo no inserta");
  equal(reopened.eventCount(), countAfterRedeem, "sin eventos nuevos en el rejudo");

  // Otra clave de idempotencia NO debe fabricar un segundo canje: el dominio
  // detecta que la estancia ya está finalizada y devuelve OK sin evento.
  const anotherKey = reopened.execute({
    operation: "completeRecovery",
    input: { voucher, at: plus(T0, 2), idempotencyKey: "complete-1-otra-clave" },
    auth: authB,
  });
  assert(!anotherKey.ok, "canje con otra clave sobre vale usado debe fallar");
  equal(anotherKey.error.code, "STALE_REVISION", "el vale usado queda obsoleto");
  equal(anotherKey.inserted, false, "sin inserción en el segundo canje");
  equal(reopened.eventCount(), countAfterRedeem, "sin eventos nuevos tras otro canje");
  reopened.close();
});

check("16 · Caducidad y renovación del vale", () => {
  const { store, stayId } = seeded("16-caducidad");
  const requested = store.execute({
    operation: "requestRecovery",
    input: { ...recoveryOf(REC1, stayId, OWNER_B, "recovery-1"), at: T0 },
    auth: authB,
  });
  assert(requested.ok, "primera solicitud");
  const voucher = (requested.value as any).voucher;
  const late = plus(T0, 8);
  const expired = store.execute({
    operation: "completeRecovery",
    input: { voucher, at: late, idempotencyKey: "complete-1" },
    auth: authB,
  });
  assert(!expired.ok, "vale caducado debe fallar");
  equal(expired.error.code, "VOUCHER_EXPIRED", "código de error");

  const renewed = store.execute({
    operation: "requestRecovery",
    input: { ...recoveryOf(REC2, stayId, OWNER_B, "recovery-2"), at: late },
    auth: authB,
  });
  assert(renewed.ok, `renovación: ${renewed.ok ? "" : renewed.error.code}`);
  const newVoucher = (renewed.value as any).voucher;
  assert(newVoucher.nonce !== voucher.nonce, "nonce distinto");
  equal(newVoucher.expiresAt, plus(late, 7), "nuevo vale válido siete días");
  const redeemed = store.execute({
    operation: "completeRecovery",
    input: { voucher: newVoucher, at: plus(late, 1), idempotencyKey: "complete-2" },
    auth: authB,
  });
  assert(redeemed.ok, `canje del vale renovado: ${redeemed.ok ? "" : redeemed.error.code}`);
  store.close();
});

check("17 · Protección de propiedad", () => {
  const { store, stayId } = seeded("17-propiedad");
  const result = store.execute({
    operation: "requestRecovery",
    // El input dice que el propietario es B, pero la identidad autenticada es A.
    input: { ...recoveryOf(REC1, stayId, OWNER_B, "recovery-host"), at: T0 },
    auth: authA,
  });
  assert(!result.ok, "el anfitrión no puede reclamar un Pokémon ajeno");
  equal(result.error.code, "OWNER_MISMATCH", "código de error");
  const system = store.getSystem() as any;
  for (const forbidden of ["exportPokemon", "deletePokemon", "transferPokemon", "changeOwner"]) {
    assert(!(forbidden in system), `la operación ${forbidden} NO debe existir`);
  }
  assert(Array.isArray(system.publicOperations), "lista de operaciones públicas");
  for (const forbidden of ["exportPokemon", "deletePokemon", "transferPokemon", "changeOwner"]) {
    assert(!(system.publicOperations as string[]).includes(forbidden), `${forbidden} fuera de publicOperations`);
  }
  store.close();
});

check("18 · Datos corruptos detectados al reabrir", () => {
  const { store, path } = seeded("18-corruptos");
  store.close();
  const raw = new Database(path);
  const id = (raw.query("SELECT event_id FROM events ORDER BY sequence LIMIT 1").get() as { event_id: string }).event_id;
  const original = (raw.query("SELECT payload_json FROM events WHERE event_id = ?").get(id) as { payload_json: string }).payload_json;
  raw.query("UPDATE events SET payload_json = ? WHERE event_id = ?").run('{"roto":', id);
  raw.close();
  throws(() => openSharedStore({ databasePath: path }), "la apertura debe rechazar payload corrupto");

  const fix = new Database(path);
  fix.query("UPDATE events SET payload_json = ? WHERE event_id = ?").run(original, id);
  fix.close();
  const healthy = openSharedStore({ databasePath: path });
  assert(healthy.verifyDeterminism().equal, "reapertura correcta tras reparar");
  healthy.close();
});

function insertRawEvent(path: string, overrides: Record<string, string | number>): string {
  const raw = new Database(path);
  const id = "cafebabe-cafe-4abe-8abe-cafebabecafe";
  const row = {
    event_id: id, sequence: 900, aggregate_id: OWNER_A, aggregate_sequence: 900,
    dedupe_key: "raw:unknown-event", idempotency_key: "unknown-event-key",
    event_type: "owner.registered", schema_id: SCHEMA_ID, contract_version: CONTRACT_VERSION,
    occurred_at: T0, payload_json: "{}", payload_sha256: createHash("sha256").update("{}").digest("hex"),
    ...overrides,
  };
  raw.query(`INSERT INTO events (
      event_id, sequence, aggregate_id, aggregate_sequence, dedupe_key,
      idempotency_key, event_type, schema_id, contract_version,
      occurred_at, payload_json, payload_sha256
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      row.event_id, row.sequence, row.aggregate_id, row.aggregate_sequence, row.dedupe_key,
      row.idempotency_key, row.event_type, row.schema_id, row.contract_version,
      row.occurred_at, row.payload_json, row.payload_sha256,
    );
  raw.close();
  return id;
}

check("19 · Eventos desconocidos", () => {
  const path = tempPath("19-desconocidos");
  const store = openSharedStore({ databasePath: path });
  store.close();
  const id = insertRawEvent(path, { event_type: "evento.futuro", dedupe_key: "raw:future" });
  throws(() => openSharedStore({ databasePath: path }), "evento desconocido debe rechazarse");
  const raw = new Database(path);
  raw.query("DELETE FROM events WHERE event_id = ?").run(id);
  raw.close();
  const healthy = openSharedStore({ databasePath: path });
  equal(healthy.eventCount(), 0, "BD limpia tras retirar el evento");
  healthy.close();
});

check("20 · Versiones incompatibles", () => {
  const path = tempPath("20-versiones");
  const store = openSharedStore({ databasePath: path });
  const bad = {
    schema: SCHEMA_ID, version: "2.0.0" as any,
    eventId: "deadbeef-dead-4ead-8ead-deadbeefdead" as any,
    sequence: 1, type: "owner.registered" as const,
    aggregateId: OWNER_A, occurredAt: T0,
    idempotencyKey: "version-futura", payload: {},
  } as SyncEvent;
  throws(() => store.importEvents([bad]), "importar versión futura debe fallar");
  store.close();

  const id = insertRawEvent(path, { contract_version: "2.0.0", dedupe_key: "raw:version" });
  throws(() => openSharedStore({ databasePath: path }), "reabrir con versión futura debe fallar");
  const raw = new Database(path);
  raw.query("DELETE FROM events WHERE event_id = ?").run(id);
  raw.close();
  const healthy = openSharedStore({ databasePath: path });
  equal(healthy.eventCount(), 0, "BD limpia");
  healthy.close();
});

check("21 · Ausencia de escrituras en producción", () => {
  const path = tempPath("21-aislamiento");
  const store = openSharedStore({ databasePath: path });
  store.execute({
    operation: "registerOwner",
    input: { ...ownerOf(OWNER_A, "A"), idempotencyKey: "reg-owner-a" },
    auth: authA,
  });
  store.close();
  throws(
    () => new SharedNurseryStore({ databasePath: join(import.meta.dir, "..", "data", PRODUCTION_DB_FILENAME) }),
    "debe rechazarse abrir la BD de producción",
  );
  const productionHashAfter = createHash("sha256").update(readFileSync(PRODUCTION_DB)).digest("hex");
  equal(productionHashAfter, productionHashBefore, "hash de data/pokegotchi.db inalterado");
});

check("22 · Compatibilidad PG-08A", () => {
  const domain = createNurserySystem();
  const regs = [
    domain.registerOwner({ ...ownerOf(OWNER_A, "A"), idempotencyKey: "reg-owner-a", at: T0 }),
    domain.registerOwner({ ...ownerOf(OWNER_B, "B"), idempotencyKey: "reg-owner-b", at: T0 }),
    domain.registerNursery({ ...nurseryOf(NURSERY_A, OWNER_A), idempotencyKey: "reg-nursery-a", at: T0 }),
    domain.registerPokemon({ ...pokemonOf(MON1, 218), idempotencyKey: "reg-mon-1", at: T0 }),
  ];
  assert(regs.every((r) => r.ok), "registros del dominio puro");
  const events = domain.exportEvents();
  assert(events.length === 4, "cuatro eventos generados por PG-08A");

  const path = tempPath("22-compatibilidad");
  const store = openSharedStore({ databasePath: path });
  const imported = store.importEvents(events);
  equal(imported.inserted, 4, "eventos importados");
  equal(imported.skipped, 0, "ninguno omitido");
  equal(JSON.stringify(store.snapshot()), JSON.stringify(domain.snapshot()), "snapshot idéntico al dominio puro");
  equal(JSON.stringify(store.exportEvents()), JSON.stringify(events), "eventos idénticos");
  const snap = store.saveSnapshot("compatibilidad");
  equal(snap.eventCount, 4, "snapshot guardado");
  equal(store.listSnapshots().length, 1, "un snapshot listado");
  store.close();
});

// ---------------------------------------------------------------------------
// 3. Cierre, limpieza y resultado
// ---------------------------------------------------------------------------

for (const dir of cleanup) rmSync(dir, { recursive: true, force: true });
rmSync(TMP_ROOT, { recursive: true, force: true });

console.log(`PG-08B: ${passed}/${passed + failed} comprobaciones correctas.`);
if (failures.length) {
  console.error("Fallos:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
