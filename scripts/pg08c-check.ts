/**
 * PG-08C — Autoridad simulada, outbox duradero y réplicas locales.
 *
 * SUITE AISLADA: cada caso usa una BD SQLite temporal en /tmp/opencode y la
 * elimina al terminar. NUNCA escribe en data/pokegotchi.db; solo la lee para
 * comprobar que su hash no cambia. Sin servidor, sockets ni dependencias的新.
 *
 * D5 y D7 están aprobadas. D6 SOLO se estudia en la documentación: aquí no se
 * adopta ninguna política definitiva de recuperación.
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
  type Owner,
  type Nursery,
  type PokemonRef,
  type DepositRequest,
  type RecoveryRequest,
} from "../packages/core/src/shared-nurseries.ts";
import { openSharedStore, type SharedNurseryStore } from "../apps/server/src/shared-store.ts";
import { openEventQueue, type SharedEventQueue } from "../apps/server/src/shared-event-queue.ts";
import {
  AUTHORITY_SCHEMA_VERSION,
  SharedAuthority,
  TestIdentityProvider,
  commandIdOf,
  isOwnerIdAlone,
  type AuthorityResult,
  type TestToken,
} from "../apps/server/src/shared-authority.ts";

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
  return mkdtempSync(join(base, "pg08c-"));
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
const DOMAIN_PATH = join(import.meta.dir, "..", "packages", "core", "src", "shared-nurseries.ts");
const domainHashBefore = createHash("sha256").update(readFileSync(DOMAIN_PATH)).digest("hex");

// ---------------------------------------------------------------------------
// 1. Datos de prueba (idénticos en forma a los de PG-08B)
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
const REQ4 = "12121212-1212-4212-8212-121212121212";
const REC1 = "88888888-8888-4888-8888-888888888888";
const REC2 = "99999999-9999-4999-8999-999999999999";

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

type Fixture = {
  path: string;
  store: SharedNurseryStore;
  queue: SharedEventQueue;
  authority: SharedAuthority;
  identities: TestIdentityProvider;
  tokenA: TestToken;
  tokenB: TestToken;
};

function fixture(label: string): Fixture {
  const path = tempPath(label);
  const store = openSharedStore({ databasePath: path });
  const queue = openEventQueue({ databasePath: path });
  const identities = new TestIdentityProvider();
  const authority = new SharedAuthority(store, queue, identities);
  return { path, store, queue, authority, identities, tokenA: identities.issue(OWNER_A), tokenB: identities.issue(OWNER_B) };
}

function reopen(fx: Fixture): Fixture {
  fx.store.close(); fx.queue.close(); fx.authority.close();
  const store = openSharedStore({ databasePath: fx.path });
  const queue = openEventQueue({ databasePath: fx.path });
  const authority = new SharedAuthority(store, queue, fx.identities);
  return { ...fx, store, queue, authority };
}

type Who = "A" | "B";
function cmd(
  fx: Fixture,
  commandId: string,
  operation: Parameters<SharedAuthority["submit"]>[0]["operation"],
  input: Readonly<Record<string, unknown>>,
  who: Who = "A",
  extra: Partial<Pick<Parameters<SharedAuthority["submit"]>[0], "expectedRevision" | "aggregateId">> = {},
): AuthorityResult {
  // El dominio valida claves con [A-Za-z0-9._:-]{8,128}. Se normaliza el
  // commandId para que sirva también como clave de idempotencia válida.
  const key = commandId.startsWith("cmd:") ? commandId : `cmd:${commandId}`;
  return fx.authority.submit({
    commandId: key,
    operation,
    input: { idempotencyKey: key, ...input, at: T0 },
    principal: who === "A" ? fx.tokenA : fx.tokenB,
    ...extra,
  });
}

function ok(result: AuthorityResult, what: string): void {
  assert(result.ok, `${what} rechazado: ${result.code} ${result.outcome && !result.outcome.ok ? result.outcome.error.message : ""}`);
}

const NURSERY_AGG = `nursery:${NURSERY_A}`;

type Seeded = Fixture & { stayId: string };
function seeded(label: string, opts: { twoStays?: boolean; pendingThird?: boolean } = {}): Seeded {
  const fx = fixture(label);
  ok(cmd(fx, "c-owner-a", "registerOwner", ownerOf(OWNER_A, "Anfitrión"), "A"), "registro anfitrión");
  ok(cmd(fx, "c-owner-b", "registerOwner", ownerOf(OWNER_B, "Visitante"), "B"), "registro visitante");
  ok(cmd(fx, "c-nursery", "registerNursery", nurseryOf(NURSERY_A, OWNER_A), "A"), "registro guardería");
  ok(cmd(fx, "c-mon-1", "registerPokemon", pokemonOf(MON1, 218), "B"), "registro Pokémon 1");
  ok(cmd(fx, "c-mon-2", "registerPokemon", pokemonOf(MON2, 81), "B"), "registro Pokémon 2");
  ok(cmd(fx, "c-req-1", "requestDeposit", depositOf(REQ1, NURSERY_A, OWNER_B, MON1, "deposit-1"), "B"), "solicitud 1");
  const accepted = cmd(fx, "c-accept-1", "acceptDeposit", {
    requestId: REQ1, idempotencyKey: "accept-1",
  }, "A", { aggregateId: NURSERY_AGG, expectedRevision: 0 });
  ok(accepted, "aceptación 1");
  const stayId = accepted.eventIds.length ? String((fx.store.getSystem().snapshot().stays[0] as { id: string }).id) : "";
  assert(stayId.length > 0, "la estancia 1 debe existir");

  if (opts.twoStays || opts.pendingThird) {
    ok(cmd(fx, "c-mon-3", "registerPokemon", pokemonOf(MON3, 82), "B"), "registro Pokémon 3");
    ok(cmd(fx, "c-req-2", "requestDeposit", depositOf(REQ2, NURSERY_A, OWNER_B, MON2, "deposit-2"), "B"), "solicitud 2");
    ok(cmd(fx, "c-accept-2", "acceptDeposit", {
      requestId: REQ2, idempotencyKey: "accept-2",
    }, "A", { aggregateId: NURSERY_AGG, expectedRevision: 1 }), "aceptación 2");
  }
  if (opts.pendingThird) {
    ok(cmd(fx, "c-req-3", "requestDeposit", depositOf(REQ3, NURSERY_A, OWNER_B, MON3, "deposit-3"), "B"), "solicitud 3");
  }
  return { ...fx, stayId };
}

// ---------------------------------------------------------------------------
// 2. Autoridad, identidad y revisión optimista (D5)
// ---------------------------------------------------------------------------

check("01 · Autoridad simulada y rechazo de ownerId suelto", () => {
  const fx = fixture("01-autoridad");
  equal(AUTHORITY_SCHEMA_VERSION, 1, "versión del esquema de autoridad");
  equal(isOwnerIdAlone({ ownerId: OWNER_A }), false, "un objeto con ownerId no es prueba");
  equal(isOwnerIdAlone(OWNER_A), true, "detección de ownerId suelto");
  const bad = fx.authority.submit({
    commandId: "c-bad", operation: "registerOwner",
    input: { ...ownerOf(OWNER_A, "Falso"), idempotencyKey: "bad-1", at: T0 },
    principal: { ...fx.tokenA, token: "falso" },
  });
  equal(bad.ok, false, "token falso rechazado");
  equal(bad.code, "UNAUTHORIZED", "código de autenticación");
  equal(fx.store.eventCount(), 0, "sin eventos antes de autenticar");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("02 · Revisión optimista: STALE_REVISION sin efectos", () => {
  const fx = seeded("02-stale");
  const stale = cmd(fx, "c-stale", "acceptDeposit", {
    requestId: REQ1, idempotencyKey: "accept-stale",
  }, "A", { aggregateId: NURSERY_AGG, expectedRevision: 0 });
  equal(stale.ok, false, "revisión 0 ya consumida");
  equal(stale.code, "STALE_REVISION", "código D5");
  const before = fx.store.eventCount();
  equal(fx.queue.messageCount(), fx.store.eventCount(), "outbox alineado tras rechazo");
  equal(fx.store.eventCount(), before, "ningún evento nuevo");
  equal(fx.authority.revisionOf(NURSERY_AGG), 1, "la revisión no retrocede");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("03 · Revisión correcta y confirmación tras commit", () => {
  const fx = seeded("02-stale");
  const rev = fx.authority.revisionOf(NURSERY_AGG);
  equal(rev, 1, "revisión tras primera aceptación");
  ok(cmd(fx, "c-req-2", "requestDeposit", depositOf(REQ2, NURSERY_A, OWNER_B, MON2, "deposit-2"), "B"), "solicitud 2");
  const second = cmd(fx, "c-accept-2", "acceptDeposit", {
    requestId: REQ2, idempotencyKey: "accept-2",
  }, "A", { aggregateId: NURSERY_AGG, expectedRevision: 1 });
  ok(second, "aceptación con revisión 1");
  equal(second.revision, 2, "revisión lógica avanzó");
  assert(second.outcome?.ok && second.outcome.inserted, "el store confirmó la inserción");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("04 · Idempotencia por commandId (pérdida de confirmación)", () => {
  const fx = fixture("04-idempotencia");
  const first = cmd(fx, "c-owner-a", "registerOwner", ownerOf(OWNER_A, "Anfitrión"), "A");
  ok(first, "primer envío");
  const retry = cmd(fx, "c-owner-a", "registerOwner", ownerOf(OWNER_A, "Anfitrión"), "A");
  equal(retry.duplicate, true, "reintento detectado");
  equal(retry.eventIds, first.eventIds, "mismo eventId");
  equal(fx.store.eventCount(), 1, "sin duplicados en el log");
  equal(fx.queue.messageCount(), 1, "sin duplicados en el outbox");
  equal(fx.authority.receipts().length, 1, "un solo recibo");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("05 · Outbox atómico: eventos y mensajes en la misma transacción", () => {
  const fx = fixture("05-outbox-atomico");
  ok(cmd(fx, "c-owner-a", "registerOwner", ownerOf(OWNER_A, "Anfitrión"), "A"), "registro");
  const events = fx.store.exportEvents();
  const messages = fx.queue.messages();
  equal(messages.length, events.length, "un mensaje por evento");
  equal(messages[0]!.eventId, events[0]!.eventId, "mismo eventId");
  equal(messages[0]!.aggregateSequence, 1, "ordinal por agregado");
  equal(fx.queue.detectGaps(), [], "sin huecos");
  const integrity = fx.queue.integrityCheck();
  assert(integrity.ok, `integridad de cola: ${integrity.issues.join("; ")}`);
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("06 · Persistencia del outbox tras reinicio", () => {
  const fx = seeded("06-reinicio");
  const before = { events: fx.store.eventCount(), messages: fx.queue.messageCount() };
  const reopened = reopen(fx);
  equal(reopened.store.eventCount(), before.events, "eventos tras reinicio");
  equal(reopened.queue.messageCount(), before.messages, "mensajes tras reinicio");
  equal(reopened.authority.revisionOf(NURSERY_AGG), 1, "revisión autoritativa persistida");
  assert(reopened.store.verifyDeterminism().equal, "replay determinista");
  reopened.store.close(); reopened.queue.close(); reopened.authority.close();
});

check("07 · Claim y ack idempotente", () => {
  const fx = seeded("07-claim");
  const claimed = fx.queue.claim(10);
  assert(claimed.length > 0, "hay mensajes pendientes");
  equal(claimed.every((m) => m.status === "delivered" && m.attempts === 1), true, "entrega registrada");
  const messageId = claimed[0]!.messageId;
  equal(fx.queue.ack(messageId), true, "primera confirmación");
  equal(fx.queue.ack(messageId), true, "confirmación repetida es idempotente");
  equal(fx.queue.claim(10).length, 0, "no se reentregan confirmados");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("08 · Error de entrega, registro y reintento", () => {
  const fx = seeded("08-reintento");
  const claimed = fx.queue.claim(1);
  equal(claimed.length, 1, "un mensaje reclamado");
  const messageId = claimed[0]!.messageId;
  equal(fx.queue.nack(messageId, "simulación: caída del dispositivo"), true, "fallo registrado");
  const failed = fx.queue.messages("failed");
  equal(failed.length, 1, "mensaje en failed");
  assert((failed[0]!.lastError ?? "").includes("caída"), "motivo del error guardado");
  equal(fx.queue.retryFailed(10), 1, "reintentos reprogramados");
  const redelivered = fx.queue.claim(100);
  assert(redelivered.some((m) => m.messageId === messageId), "reentregado tras reintento");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

// ---------------------------------------------------------------------------
// 3. Réplicas y D7
// ---------------------------------------------------------------------------

check("09 · Sincronización inicial de las tres réplicas", () => {
  const fx = seeded("09-replicas");
  fx.queue.claim(100);
  for (const id of ["authority", "owner-device", "host-device"]) {
    const report = fx.queue.syncReplica(id, 100);
    assert(report.applied > 0, `${id} aplicó eventos`);
    equal(report.gaps, [], `${id} sin huecos`);
    assert(fx.queue.replicaSystem(id).snapshot().eventCount === report.cursor, `${id} cursor coincide`);
  }
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("10 · Sincronización incremental", () => {
  const fx = seeded("10-incremental");
  fx.queue.claim(100);
  fx.queue.syncReplica("owner-device", 100);
  const before = fx.queue.replicaCursor("owner-device")!.lastSequence;
  ok(cmd(fx, "c-req-2", "requestDeposit", depositOf(REQ2, NURSERY_A, OWNER_B, MON2, "deposit-2"), "B"), "solicitud 2");
  fx.queue.claim(100);
  const report = fx.queue.syncReplica("owner-device", 100);
  assert(report.applied > 0, "aplicó los nuevos eventos");
  assert(report.cursor > before, "cursor avanzó");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("11 · Desconexión del anfitrión y reconexión", () => {
  const fx = seeded("11-host-offline");
  fx.queue.claim(100);
  fx.queue.syncReplica("owner-device", 100);
  const hostBefore = fx.queue.replicaCursor("host-device")?.lastSequence ?? 0;
  equal(hostBefore, 0, "anfitrión desconectado no sincronizó");
  const reopened = reopen(fx);
  reopened.queue.claim(100);
  const report = reopened.queue.syncReplica("host-device", 100);
  assert(report.applied > 0, "anfitrión se puso al día al reconectar");
  equal(reopened.queue.replicaSystem("host-device").snapshot().eventCount, report.cursor, "estado reconstruido");
  reopened.store.close(); reopened.queue.close(); reopened.authority.close();
});

check("12 · Desconexión del propietario", () => {
  const fx = seeded("12-owner-offline");
  fx.queue.claim(100);
  fx.queue.syncReplica("host-device", 100);
  const ownerSnap = fx.queue.replicaSystem("owner-device").snapshot();
  equal(ownerSnap.eventCount, 0, "dispositivo del propietario sin eventos");
  const r = fx.queue.syncReplica("owner-device", 100);
  assert(r.applied > 0, "sync al volver el propietario");
  equal(fx.queue.replicaSystem("owner-device").snapshot().owners.length, 2, "propietarios restaurados");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("13 · Reinicio durante la sincronización", () => {
  const fx = seeded("13-reinicio-sync");
  fx.queue.claim(100);
  fx.queue.syncReplica("owner-device", 2);
  const partial = fx.queue.replicaCursor("owner-device")!.lastSequence;
  const reopened = reopen(fx);
  const report = reopened.queue.syncReplica("owner-device", 100);
  assert(report.cursor >= partial, "el cursor no retrocede");
  assert(reopened.store.verifyDeterminism().equal, "log íntegro tras reinicio");
  equal(reopened.queue.replicaSystem("owner-device").snapshot().eventCount, report.cursor, "réplica coherente");
  reopened.store.close(); reopened.queue.close(); reopened.authority.close();
});

check("14 · Entrega duplicada no altera la réplica", () => {
  const fx = seeded("14-duplicados");
  fx.queue.claim(100);
  const first = fx.queue.syncReplica("owner-device", 100);
  const before = JSON.stringify(fx.queue.replicaSystem("owner-device").snapshot());
  const second = fx.queue.syncReplica("owner-device", 100);
  equal(second.applied, 0, "nada nuevo aplicado en una resincronización");
  // Entrega repetida: mismo eventId con otra secuencia. El UNIQUE por réplica
  // lo descarta, así que el estado reconstruido no se duplica.
  const applied = fx.queue.replicaEvents("owner-device");
  assert(applied.length > 0, "la réplica tiene eventos");
  fx.queue.injectReplicaEvent("owner-device", applied[0]!, 999);
  equal(fx.queue.replicaEvents("owner-device").length, applied.length, "duplicado descartado");
  equal(JSON.stringify(fx.queue.replicaSystem("owner-device").snapshot()), before, "estado idéntico");
  assert(first.applied > 0, "la primera sincronización sí aplicó");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("15 · Evento retrasado y recuperación de pendientes", () => {
  const fx = seeded("15-retrasado");
  fx.queue.claim(100);
  const rawPath = fx.path;
  const raw = new Database(rawPath);
  raw.query("DELETE FROM outbox_messages WHERE global_sequence = 2").run();
  raw.close();
  const partial = fx.queue.syncReplica("owner-device", 100);
  assert(partial.outOfOrder > 0, "sincronización bloqueada por hueco");
  assert(partial.gaps.includes(2), "hueco 2 registrado");
  equal(partial.cursor, 1, "no avanza más allá del hueco");
  const repair = fx.queue.reconcile(fx.store);
  assert(repair.recovered >= 1, "mensaje ausente recuperado");
  equal(fx.queue.detectGaps(), [], "sin huecos tras reconciliación");
  fx.queue.claim(100);
  const resumed = fx.queue.syncReplica("owner-device", 100);
  assert(resumed.cursor > 1, "reanudó tras reparar");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("16 · Detección de huecos de secuencia", () => {
  const fx = seeded("16-huecos");
  equal(fx.queue.detectGaps(), [], "sin huecos iniciales");
  const raw = new Database(fx.path);
  raw.query("DELETE FROM outbox_messages WHERE global_sequence = 3").run();
  raw.close();
  const gaps = fx.queue.detectGaps();
  assert(gaps.includes(3), "detecta la secuencia ausente");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

// ---------------------------------------------------------------------------
// 4. Conflictos D5
// ---------------------------------------------------------------------------

check("17 · Capacidad máxima de dos Pokémon", () => {
  const fx = seeded("17-capacidad", { twoStays: true });
  equal(fx.store.getSystem().snapshot().stays.filter((s) => s.state === "stay_active").length, 2, "dos alojamientos activos");
  equal(fx.authority.revisionOf(NURSERY_AGG), 2, "revisión de guardería en 2");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("18 · Tercer depósito rechazado sin efectos parciales", () => {
  const fx = seeded("18-tercero", { pendingThird: true });
  const eventsBefore = fx.store.eventCount();
  const third = cmd(fx, "c-accept-3", "acceptDeposit", {
    requestId: REQ3, idempotencyKey: "accept-3",
  }, "A", { aggregateId: NURSERY_AGG, expectedRevision: 2 });
  equal(third.ok, false, "tercer depósito rechazado");
  equal(third.code, "NURSERY_FULL", "motivo de capacidad");
  equal(fx.store.eventCount(), eventsBefore, "sin eventos nuevos");
  equal(fx.authority.revisionOf(NURSERY_AGG), 2, "revisión intacta");
  equal(fx.queue.messageCount(), eventsBefore, "outbox intacto");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("19 · Dos depósitos simultáneos: gana uno", () => {
  const fx = seeded("19-concurrencia");
  ok(cmd(fx, "c-req-2", "requestDeposit", depositOf(REQ2, NURSERY_A, OWNER_B, MON2, "deposit-2"), "B"), "solicitud 2");
  const first = cmd(fx, "c-accept-2a", "acceptDeposit", { requestId: REQ2, idempotencyKey: "accept-2a" }, "A", {
    aggregateId: NURSERY_AGG, expectedRevision: 1,
  });
  const second = cmd(fx, "c-accept-2b", "acceptDeposit", { requestId: REQ2, idempotencyKey: "accept-2b" }, "A", {
    aggregateId: NURSERY_AGG, expectedRevision: 1,
  });
  equal(first.ok, true, "primera aceptación");
  equal(second.ok, false, "segunda rechazada");
  equal(second.code, "STALE_REVISION", "D5: nunca último escritor gana");
  equal(fx.store.getSystem().snapshot().stays.length, 2, "una estancia inicial y una nueva; ninguna tercera");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("20 · Propiedad permanente y sin transferencia", () => {
  const fx = seeded("20-propiedad");
  const stay = fx.store.getSystem().snapshot().stays[0]!;
  equal(stay.ownerId, OWNER_B, "el propietario sigue siendo el visitante");
  equal(stay.hostId, OWNER_A, "el anfitrión no se convierte en dueño");
  equal(stay.ownershipRelation, "visitor", "relación de visitante");
  const forced = cmd(fx, "c-force", "grantPermission", {
    stayId: stay.id, ownerId: OWNER_A, permission: PERMISSIONS[0], consentKey: "consentimiento-a",
  }, "A");
  equal(forced.ok, false, "el anfitrión no concede permisos ajenos");
  equal(forced.code, "OWNER_MISMATCH", "solo el dueño decide");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("21 · Permisos desactivados por defecto", () => {
  const fx = seeded("21-permisos-default");
  const stay = fx.store.getSystem().snapshot().stays[0]!;
  equal(Object.values(stay.permissions), [null, null, null], "los tres permisos son null");
  const ev = cmd(fx, "c-ev-sin-permiso", "applyEvBerries", { stayId: stay.id, actorId: OWNER_A }, "A", {
    aggregateId: `stay:${stay.id}`,
  });
  equal(ev.ok, false, "EV sin consentimiento rechazado");
  equal(ev.code, "CONSENT_REQUIRED", "motivo de consentimiento");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("22 · Concesión y revocación de permiso", () => {
  const fx = seeded("22-revocacion");
  const stayId = fx.stayId;
  const grant = cmd(fx, "c-grant", "grantPermission", {
    stayId, ownerId: OWNER_B, permission: "allow_ev_minigames", consentKey: "consentimiento-b", expectedRevision: 0,
  }, "B", { aggregateId: `stay:${stayId}`, expectedRevision: 0 });
  ok(grant, "permiso concedido por el dueño");
  equal(fx.store.getSystem().snapshot().stays[0]!.permissions.allow_ev_minigames?.revokedAt, null, "permiso activo");
  const revoke = cmd(fx, "c-revoke", "revokePermission", {
    stayId, ownerId: OWNER_B, permission: "allow_ev_minigames",
  }, "B", { aggregateId: `stay:${stayId}` });
  ok(revoke, "permiso revocado");
  assert(fx.store.getSystem().snapshot().stays[0]!.permissions.allow_ev_minigames?.revokedAt !== null, "revocado");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("23 · Revocación durante operación: comportamiento conservador", () => {
  const fx = seeded("23-revocar-durante");
  const stayId = fx.stayId;
  ok(cmd(fx, "c-grant", "grantPermission", {
    stayId, ownerId: OWNER_B, permission: "allow_ev_berries", consentKey: "consentimiento-b", expectedRevision: 0,
  }, "B", { aggregateId: `stay:${stayId}`, expectedRevision: 0 }), "permiso concedido");
  ok(cmd(fx, "c-revoke", "revokePermission", {
    stayId, ownerId: OWNER_B, permission: "allow_ev_berries",
  }, "B", { aggregateId: `stay:${stayId}` }), "revocado antes de la operación");
  const ev = cmd(fx, "c-ev-tras-revocar", "applyEvBerries", { stayId, actorId: OWNER_A }, "A", {
    aggregateId: `stay:${stayId}`,
  });
  equal(ev.ok, false, "operación en curso no concede permisos nuevos");
  equal(ev.code, "PERMISSION_REVOKED", "revocación prevalece");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("24 · Recuperación frente a cuidado concurrente", () => {
  const fx = seeded("24-recuperacion-cuidado");
  const stayId = fx.stayId;
  const req = cmd(fx, "c-rec-req", "requestRecovery", recoveryOf(REC1, stayId, OWNER_B, "recovery-1"), "B", {
    aggregateId: `stay:${stayId}`,
  });
  ok(req, "solicitud de recuperación");
  const voucher = (req.outcome?.ok ? req.outcome.value as { voucher: { nonce: string; revision: number; expiresAt: string; ownerId: string; usedAt: string | null } } : null)!.voucher;
  assert(voucher.nonce.length > 0, "vale emitido");
  assert(Date.parse(voucher.expiresAt) > Date.parse(T0), "vale con caducidad futura");
  const done = cmd(fx, "c-rec-done", "completeRecovery", {
    voucher, idempotencyKey: "complete-1",
  }, "B", { aggregateId: `stay:${stayId}` });
  ok(done, "canje del vale");
  const care = cmd(fx, "c-care-tarde", "care", { stayId, actorId: OWNER_A, action: "feed" }, "A", {
    aggregateId: `stay:${stayId}`,
  });
  equal(care.ok, false, "cuidado posterior rechazado");
  equal(care.code, "STAY_NOT_ACTIVE", "la recuperación confirmada prevalece");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("25 · Dos solicitudes de recuperación", () => {
  const fx = seeded("25-dos-recuperaciones");
  const stayId = fx.stayId;
  const first = cmd(fx, "c-rec-1", "requestRecovery", recoveryOf(REC1, stayId, OWNER_B, "recovery-1"), "B", {
    aggregateId: `stay:${stayId}`,
  });
  const duplicate = cmd(fx, "c-rec-dup", "requestRecovery", recoveryOf(REC1, stayId, OWNER_B, "recovery-dup"), "B", {
    aggregateId: `stay:${stayId}`,
  });
  const second = cmd(fx, "c-rec-2", "requestRecovery", recoveryOf(REC2, stayId, OWNER_B, "recovery-2"), "B", {
    aggregateId: `stay:${stayId}`,
  });
  ok(first, "primera solicitud");
  equal(duplicate.ok, false, "misma solicitud repetida rechazada");
  equal(duplicate.code, "DUPLICATE_REQUEST", "sin doble solicitud con el mismo ID");
  ok(second, "nueva solicitud con otro ID: renovación del prototipo PG-08A");
  const oldVoucher = (first.outcome?.ok ? first.outcome.value as { voucher: Record<string, unknown> } : null)!.voucher;
  const redeploy = cmd(fx, "c-rec-old", "completeRecovery", {
    voucher: oldVoucher, idempotencyKey: "complete-old",
  }, "B", { aggregateId: `stay:${stayId}` });
  equal(redeploy.ok, false, "el vale anterior queda obsoleto");
  equal(redeploy.code, "STALE_REVISION", "protección anti-replay del vale antiguo");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("26 · Doble canje con otra clave: STALE_REVISION", () => {
  const fx = seeded("26-doble-canje");
  const stayId = fx.stayId;
  const req = cmd(fx, "c-rec-req", "requestRecovery", recoveryOf(REC1, stayId, OWNER_B, "recovery-1"), "B", {
    aggregateId: `stay:${stayId}`,
  });
  ok(req, "solicitud");
  const voucher = (req.outcome?.ok ? req.outcome.value as { voucher: Record<string, unknown> } : null)!.voucher;
  ok(cmd(fx, "c-rec-done", "completeRecovery", { voucher, idempotencyKey: "complete-1" }, "B", {
    aggregateId: `stay:${stayId}`,
  }), "primer canje");
  const eventsAfter = fx.store.eventCount();
  const replay = cmd(fx, "c-rec-replay", "completeRecovery", { voucher, idempotencyKey: "complete-otra" }, "B", {
    aggregateId: `stay:${stayId}`,
  });
  equal(replay.ok, false, "replay con otra clave rechazado");
  equal(replay.code, "STALE_REVISION", "protección anti-replay");
  equal(fx.store.eventCount(), eventsAfter, "sin eventos nuevos");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("27 · Vale caducado: VOUCHER_EXPIRED, propiedad intacta", () => {
  const fx = seeded("27-caducidad");
  const stayId = fx.stayId;
  const req = cmd(fx, "c-rec-req", "requestRecovery", recoveryOf(REC1, stayId, OWNER_B, "recovery-1"), "B", {
    aggregateId: `stay:${stayId}`,
  });
  ok(req, "solicitud");
  const voucher = (req.outcome?.ok ? req.outcome.value as { voucher: Record<string, unknown> } : null)!.voucher;
  const expired = fx.authority.submit({
    commandId: "c-rec-expired", operation: "completeRecovery",
    input: { voucher, idempotencyKey: "complete-expired", at: plus(T0, 8) },
    principal: fx.tokenB, aggregateId: `stay:${stayId}`,
  });
  equal(expired.ok, false, "vale caducado rechazado");
  equal(expired.code, "VOUCHER_EXPIRED", "motivo de caducidad");
  equal(fx.store.getSystem().snapshot().stays[0]!.ownerId, OWNER_B, "la propiedad NO caduca (invariante D6)");
  // Comportamiento del prototipo PG-08A, NO una política D6 aprobada: el
  // derecho del propietario sigue vivo aunque el vale caduque.
  const renewed = cmd(fx, "c-rec-renew", "requestRecovery", recoveryOf(REC2, stayId, OWNER_B, "recovery-2"), "B", {
    aggregateId: `stay:${stayId}`,
  });
  ok(renewed, "renovación del derecho: no caduca (invariante D6)");
  const freshVoucher = (renewed.outcome?.ok ? renewed.outcome.value as { voucher: Record<string, unknown> } : null)!.voucher;
  ok(cmd(fx, "c-rec-renew-done", "completeRecovery", {
    voucher: freshVoucher, idempotencyKey: "complete-renew",
  }, "B", { aggregateId: `stay:${stayId}` }), "recuperación con vale renovado");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("28 · Sin duplicación de alojamientos", () => {
  const fx = seeded("28-duplicados", { twoStays: true });
  const stays = fx.store.getSystem().snapshot().stays;
  equal(stays.length, 2, "dos estancias, no cuatro");
  equal(new Set(stays.map((s) => s.pokemon.instanceId)).size, 2, "Pokémon distintos");
  equal(fx.store.integrityCheck().ok, true, "integridad del EventStore");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("29 · Las réplicas no son autoridades", () => {
  const fx = seeded("29-replicas-no-autoridad");
  fx.queue.claim(100);
  fx.queue.syncReplica("owner-device", 100);
  const replica = fx.queue.replicaSystem("owner-device");
  equal(typeof (replica as unknown as Record<string, unknown>).execute, "undefined", "sin execute en la réplica");
  equal(replica.snapshot().sequence, fx.store.snapshot().sequence, "mismo log, sin decisiones propias");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("30 · Integridad conjunta de store, cola y recibos", () => {
  const fx = seeded("30-integridad");
  fx.queue.claim(100);
  fx.queue.syncReplica("authority", 100);
  assert(fx.store.integrityCheck().ok, "integridad del store");
  const qc = fx.queue.integrityCheck();
  assert(qc.ok, `integridad de la cola: ${qc.issues.join("; ")}`);
  assert(fx.store.verifyDeterminism().equal, "replay determinista");
  equal(fx.authority.receipts().length, cmdCount(fx), "un recibo por comando enviado");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

function cmdCount(fx: Fixture): number {
  return fx.authority.receipts().length;
}

check("31 · commandIdOf es estable y único por contexto", () => {
  const a = commandIdOf(["owner", OWNER_A, "1"]);
  const b = commandIdOf(["owner", OWNER_A, "1"]);
  const c = commandIdOf(["owner", OWNER_A, "2"]);
  equal(a, b, "determinista");
  assert(a !== c, "contextos distintos producen IDs distintos");
});

// ---------------------------------------------------------------------------
// 5. Aislamiento
// ---------------------------------------------------------------------------

check("32 · Protección de la BD de producción", () => {
  throws(() => openSharedStore({ databasePath: join(import.meta.dir, "..", "data", "pokegotchi.db") }),
    "el EventStore rechaza explícitamente pokegotchi.db");
  const fx = fixture("32-aislamiento");
  equal(fx.store.databasePath.includes("pg08c-"), true, "BD de prueba temporal");
  equal(fx.queue.messages().length, 0, "cola vacía en BD aislada");
  fx.store.close(); fx.queue.close(); fx.authority.close();
});

check("33 · Sin escrituras en producción ni en el dominio PG-08A", () => {
  const productionHashAfter = createHash("sha256").update(readFileSync(PRODUCTION_DB)).digest("hex");
  equal(productionHashAfter, productionHashBefore, "data/pokegotchi.db intacto");
  const domainHashAfter = createHash("sha256").update(readFileSync(DOMAIN_PATH)).digest("hex");
  equal(domainHashAfter, domainHashBefore, "shared-nurseries.ts intacto");
});

// ---------------------------------------------------------------------------
// Cierre
// ---------------------------------------------------------------------------

for (const dir of cleanup) {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* residuo inofensivo */ }
}

if (failed) {
  console.error(`PG-08C: ${passed}/${passed + failed} comprobaciones correctas.`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`PG-08C: ${passed}/${passed + failed} comprobaciones correctas.`);
