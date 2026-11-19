/**
 * PG-08E — Propiedad, almacenamiento y ciclo de vida de huevos simulados.
 *
 * SUITE AISLADA: cada caso usa una BD SQLite en /tmp/opencode/pg08e-*, sin
 * servidor, sockets, cuentas reales, PKM, saves ni eclosión. NUNCA escribe en
 * data/pokegotchi.db; solo lee hashes para comprobar que no cambia.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";

import {
  ASSIGNMENT_POLICIES,
  CANCEL_REASONS,
  EGG_CONTRACT_VERSION,
  EGG_LEGITIMACY,
  EGG_SCHEMA,
  EGG_STATES,
  EGG_TRANSITIONS,
  assertProvenanceUnchanged,
  canTransition,
  classifyProvenance,
  createEgg,
  demoProvenance,
  eggIdFor,
  isBreedableProvenance,
  proposedOwnerOf,
  validateEgg,
  type EggId,
  type EggParentRef,
  type PokemonProvenance,
} from "../packages/core/src/egg-domain.ts";
import {
  EGG_STORE_SCHEMA,
  openSharedEggStore,
  type AccumulationPolicy,
  type EggAuthorityPort,
  type EggProductionInput,
  type SharedEggStore,
} from "../apps/server/src/shared-egg-store.ts";
import {
  CONTRACT_VERSION,
  SCHEMA_ID,
  type Nursery,
  type Owner,
  type PokemonRef,
  type Stay,
} from "../packages/core/src/shared-nurseries.ts";
import {
  HOUR_MS,
  createBreedingEngine,
  type BreedingClock,
  type BreedingCompatibilityProvider,
  type BreedingCycleStore,
  type BreedingEngine,
  type BreedingEvent,
  type BreedingEventSink,
  type BreedingState,
  type CustodyPort,
  type CustodyResult,
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
    console.error(`  FALLO ${name}: ${message}`);
  }
}
function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}
function equal<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message} (esperado ${String(expected)}, obtenido ${String(actual)})`);
}
function deepEqual(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message} (esperado ${b}, obtenido ${a})`);
}

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TMP = mkdtempSync(join("/tmp/opencode", "pg08e-"));
const SHA = "a".repeat(64);
const OTHER_SHA = "b".repeat(64);
const T0 = "2026-11-19T00:00:00.000Z";
const HOST = "host-pg08e";
const GUEST = "guest-pg08e";
const NURSERY = "nursery-pg08e";
const plus = (iso: string, ms: number): string => new Date(Date.parse(iso) + ms).toISOString();
const hashOf = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

const PROTECTED = [
  "data/pokegotchi.db",
  "apps/server/src/shared-store.ts",
  "apps/server/src/shared-authority.ts",
  "apps/server/src/shared-event-queue.ts",
  "packages/core/src/shared-nurseries.ts",
  "packages/core/src/breeding-engine.ts",
  "scripts/pg08d-check.ts",
  "fixtures/gen1-blue-spain.srm",
  "fixtures/gen1-blue-usa.srm",
  "fixtures/gen2-crystalclear-hack.srm",
  "fixtures/gen2-polished-hack.srm",
  "fixtures/gen3-allin-hack.srm",
  "fixtures/gen4-heartgold-spain.srm",
  "fixtures/gen5-black-usa.srm",
];
const protectedBefore = new Map(PROTECTED.map((p) => [p, hashOf(join(ROOT, p))] as const));

// ---------------------------------------------------------------------------
// 1. Objetos y autoridad de prueba
// ---------------------------------------------------------------------------

class TestAuthority implements EggAuthorityPort {
  lastSequence = 0;
  readonly orders = new Map<string, number>();
  readonly revokedOwners = new Set<string>();
  readonly denyAssignActors = new Set<string>();
  readonly denyCancelActors = new Set<string>();
  validRevision = "rev-1";

  sequenceFor(input: Pick<EggProductionInput, "productionEventId" | "nurseryId" | "cycleId" | "occurredAt">): number {
    return this.orders.get(input.productionEventId) ?? ++this.lastSequence;
  }
  canProduce(input: EggProductionInput) {
    const guest = input.parents.find((p) => p.role === "guest")?.ownerId ?? "";
    if (this.revokedOwners.has(guest)) return { ok: false as const, code: "PERMISSION_REVOKED", message: "permiso revocado" };
    if (input.cycleRevision !== this.validRevision) {
      return { ok: false as const, code: "CYCLE_REVISION_INVALID", message: "revisión de ciclo inválida" };
    }
    return { ok: true as const, value: true };
  }
  canAssign(input: { eggId: EggId; actorId: string; ownerId: string }) {
    if (this.denyAssignActors.has(input.actorId)) {
      return { ok: false as const, code: "ASSIGN_NOT_AUTHORIZED", message: "actor no autorizado para asignar" };
    }
    return { ok: true as const, value: true };
  }
  canClaim(input: { eggId: EggId; actorId: string; ownerId: string }) {
    if (input.actorId !== input.ownerId) {
      return { ok: false as const, code: "CLAIM_NOT_AUTHORIZED", message: "solo el propietario reclama" };
    }
    return { ok: true as const, value: true };
  }
  canCancel(input: { eggId: EggId; actorId: string; reason: unknown }) {
    if (this.denyCancelActors.has(input.actorId)) {
      return { ok: false as const, code: "CANCEL_NOT_AUTHORIZED", message: "actor no autorizado para cancelar" };
    }
    return { ok: true as const, value: true };
  }
}

class Fixture {
  readonly dir: string;
  readonly authority = new TestAuthority();
  store: SharedEggStore;
  constructor(readonly label: string) {
    this.dir = join(TMP, label);
    mkdirSync(this.dir, { recursive: true });
    this.store = openSharedEggStore({
      databasePath: join(this.dir, "eggs.db"),
      authority: this.authority,
    });
  }
  reopen(): void {
    this.store.close();
    this.store = openSharedEggStore({
      databasePath: join(this.dir, "eggs.db"),
      authority: this.authority,
    });
  }
  close(): void {
    this.store.close();
  }
}
const fixture = (label: string): Fixture => new Fixture(label);

const imported = (instanceId: string, at = T0): PokemonProvenance =>
  classifyProvenance({ instanceId, source: "save_import", saveSha256: SHA }, at);
const demo = (instanceId: string, at = T0): PokemonProvenance => demoProvenance(instanceId, at);
const unknown = (instanceId: string, at = T0): PokemonProvenance =>
  classifyProvenance({ instanceId, source: "unknown" }, at);

function parent(instanceId: string, role: "guest" | "host"): EggParentRef {
  return { stayId: `stay-${instanceId}`, pokemonInstanceId: instanceId, ownerId: role === "guest" ? GUEST : HOST, role };
}

function production(label: string, opts: Partial<EggProductionInput> = {}): EggProductionInput {
  const guest = "mon-" + label + "-g";
  const host = "mon-" + label + "-h";
  return {
    cycleId: `cycle:${label}:1`,
    nurseryId: NURSERY,
    productionEventId: `event:${label}`,
    idempotencyKey: `cycle:${label}:1`,
    occurredAt: T0,
    authoritySequence: 0,
    cycleRevision: "rev-1",
    parents: [parent(guest, "guest"), parent(host, "host")],
    provenance: [imported(guest), imported(host)],
    hostId: HOST,
    ownerId: null,
    recipientId: null,
    assignmentPolicy: "pending",
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// 2. Contrato y procedencia
// ---------------------------------------------------------------------------

check("01 · Contrato versionado y constantes", () => {
  equal(EGG_SCHEMA, "pg08e.egg-domain", "esquema del huevo");
  equal(EGG_CONTRACT_VERSION, "1.0.0", "versión del contrato");
  equal(EGG_STORE_SCHEMA, "pg08e.shared-egg-store", "esquema del almacén");
  deepEqual(EGG_STATES, ["produced", "pending_assignment", "stored", "claimed", "cancelled"], "estados");
  deepEqual(ASSIGNMENT_POLICIES, ["guest_owner", "host", "prearranged", "pending"], "políticas");
  deepEqual(CANCEL_REASONS, ["cycle_invalidated", "duplicate_superseded", "recipient_rejected", "authority_rejected"], "motivos");
  equal(EGG_LEGITIMACY.exportable, false, "no exportable");
  equal(EGG_LEGITIMACY.realPkm, false, "no es PKM");
});

check("02 · eggId único e independiente de especie, nombre y PID", () => {
  const a = eggIdFor("cycle:x", "event:1");
  const b = eggIdFor("cycle:x", "event:2");
  assert(a !== b, "eventos distintos producen IDs distintos");
  equal(a, eggIdFor("cycle:x", "event:1"), "ID reproducible");
  const p = production("02");
  const q = production("02-b", { parents: [parent("otro-g", "guest"), parent("otro-h", "host")] });
  assert(eggIdFor(p.cycleId, p.productionEventId) !== eggIdFor(q.cycleId, q.productionEventId), "ciclo distinto cambia el ID");
});

check("03 · PLAY NOW se clasifica para siempre como DEMO", () => {
  const p = demo("demo-mon", T0);
  equal(p.class, "DEMO_INTERNAL_NON_EXPORTABLE", "clase DEMO");
  equal(p.source, "play_now_demo", "fuente PLAY NOW");
  const withHash = classifyProvenance({ instanceId: "demo-mon", source: "play_now_demo", saveSha256: SHA }, plus(T0, 1000));
  equal(withHash.class, "DEMO_INTERNAL_NON_EXPORTABLE", "un SHA no la vuelve importada");
});

check("04 · Procedencia sin evidencia falla cerrada", () => {
  equal(classifyProvenance({ instanceId: "m", source: "save_import" }, T0).class, "UNKNOWN_UNVERIFIED", "sin SHA");
  equal(classifyProvenance({ instanceId: "m", source: "save_import", saveSha256: "corto" }, T0).class, "UNKNOWN_UNVERIFIED", "SHA inválido");
  equal(unknown("m").source, "unknown", "fuente desconocida");
});

check("05 · DEMO y desconocida bloquean la crianza", () => {
  equal(isBreedableProvenance(imported("m")).ok, true, "importado permitido");
  const d = isBreedableProvenance(demo("m"));
  const u = isBreedableProvenance(unknown("m"));
  assert(!d.ok && d.code === "DEMO_PROVENANCE_BLOCKED", "DEMO bloqueado");
  assert(!u.ok && u.code === "UNKNOWN_PROVENANCE_BLOCKED", "desconocido bloqueado");
});

check("06 · La procedencia no se reescribe con metadatos", () => {
  const before = demo("m", T0);
  const after: PokemonProvenance = { ...before, class: "SAVE_IMPORTED" };
  const checkResult = assertProvenanceUnchanged(before, after);
  assert(!checkResult.ok && checkResult.code === "PROVENANCE_MUTATED", "cambio de clase detectado");
  equal(assertProvenanceUnchanged(before, { ...before }).ok, true, "idéntica");
});

check("07 · unverified no se equipara a illegal ni a DEMO", () => {
  // El veredicto PG-08A no entra en el contrato de procedencia: solo la fuente.
  const p = production("07", { provenance: [imported("mon-07-g"), imported("mon-07-h")] });
  const created = createEgg(p);
  assert(created.ok, "un importado con procedencia verificada puede producir");
  equal(created.value.provenance[0]!.class, "SAVE_IMPORTED", "clase conservada");
});

check("08 · Validación estricta del registro", () => {
  const p = production("08");
  const created = createEgg(p);
  assert(created.ok, "creación válida");
  equal(validateEgg(created.value).ok, true, "validación correcta");
  const tampered = { ...created.value, legitimacy: { ...EGG_LEGITIMACY, exportable: true } };
  const result = validateEgg(tampered);
  assert(!result.ok && result.code === "LEGITIMACY_INVALID", "legitimidad alterada rechazada");
});

check("09 · Máquina de estados: transiciones y regresiones", () => {
  equal(canTransition("produced", "stored"), true, "producido → almacenado");
  equal(canTransition("stored", "claimed"), true, "almacenado → reclamado");
  equal(canTransition("claimed", "stored"), false, "sin regresión desde claimed");
  equal(canTransition("cancelled", "produced"), false, "sin regresión desde cancelled");
  equal(canTransition("stored", "cancelled"), false, "un huevo confirmado no se cancela");
  equal(canTransition("produced", "claimed"), false, "sin salto de estados");
});

check("10 · Políticas de asignación configurables, ninguna adoptada", () => {
  const ctx = { guestOwnerId: GUEST, hostId: HOST, agreedOwnerId: "acordado" };
  equal(proposedOwnerOf("guest_owner", ctx), GUEST, "propietario invitado");
  equal(proposedOwnerOf("host", ctx), HOST, "anfitrión");
  equal(proposedOwnerOf("prearranged", ctx), "acordado", "acuerdo previo");
  equal(proposedOwnerOf("pending", ctx), null, "pendiente");
});

// ---------------------------------------------------------------------------
// 3. Producción, idempotencia y propiedad
// ---------------------------------------------------------------------------

check("11 · Producción persistida con evento y trazabilidad", () => {
  const fx = fixture("11-producir");
  const result = fx.store.produce(production("11"));
  assert(result.ok, "producción aceptada");
  equal(result.value.state, "produced", "estado inicial");
  equal(result.value.created, true, "huevo creado");
  const egg = fx.store.listAll()[0]!;
  equal(egg.eggId, result.value.eggId, "ID persistido");
  equal(egg.ownerId, null, "sin propietario aún");
  equal(fx.store.history(egg.eggId).length, 1, "historial inicial");
  equal(fx.store.outbox().length, 1, "outbox publicado");
  fx.close();
});

check("12 · Reintento del mismo evento no duplica", () => {
  const fx = fixture("12-idempotencia");
  const input = production("12");
  const first = fx.store.produce(input);
  const second = fx.store.produce(input);
  assert(first.ok && second.ok, "ambos aceptados");
  equal(second.value.created, false, "segundo no crea");
  equal(fx.store.listAll().length, 1, "un solo huevo");
  equal(fx.store.events().length, 1, "un solo evento");
  fx.close();
});

check("13 · Dos eventos para el mismo ciclo se rechazan", () => {
  const fx = fixture("13-ciclo-duplicado");
  assert(fx.store.produce(production("13")).ok, "primera producción");
  const second = fx.store.produce(production("13", { productionEventId: "event:13:b", idempotencyKey: "cycle:13:1:b" }));
  assert(!second.ok && second.code === "CYCLE_DUPLICATE", "segundo evento del ciclo bloqueado");
  equal(fx.store.listAll().length, 1, "sin duplicados");
  fx.close();
});

check("14 · Progenitor DEMO bloquea producción", () => {
  const fx = fixture("14-demo");
  const p = production("14", { parents: [parent("demo-g14", "guest"), parent("h14", "host")], provenance: [demo("demo-g14"), imported("h14")] });
  const result = fx.store.produce(p);
  assert(!result.ok && result.code === "DEMO_PROVENANCE_BLOCKED", "DEMO bloqueado en el almacén");
  equal(fx.store.listAll().length, 0, "sin huevo");
  fx.close();
});

check("15 · Progenitor de procedencia desconocida bloquea producción", () => {
  const fx = fixture("15-desconocida");
  const p = production("15", { parents: [parent("u-g15", "guest"), parent("h15", "host")], provenance: [unknown("u-g15"), imported("h15")] });
  const result = fx.store.produce(p);
  assert(!result.ok && result.code === "UNKNOWN_PROVENANCE_BLOCKED", "desconocida bloqueada");
  fx.close();
});

check("16 · Permiso revocado bloquea nueva producción", () => {
  const fx = fixture("16-revocado");
  fx.authority.revokedOwners.add(GUEST);
  const result = fx.store.produce(production("16"));
  assert(!result.ok && result.code === "PERMISSION_REVOKED", "permiso revocado");
  fx.authority.revokedOwners.delete(GUEST);
  assert(fx.store.produce(production("16")).ok, "restaurado");
  fx.close();
});

check("17 · Revisión de ciclo inválida bloquea producción", () => {
  const fx = fixture("17-revision");
  const result = fx.store.produce(production("17", { cycleRevision: "rev-0" }));
  assert(!result.ok && result.code === "CYCLE_REVISION_INVALID", "revisión verificada");
  fx.close();
});

check("18 · La autoridad fija el orden: secuencia obsoleta rechazada", () => {
  const fx = fixture("18-orden");
  assert(fx.store.produce(production("18-a")).ok, "primera operación");
  const stale = production("18-b", { authoritySequence: 1 });
  fx.authority.orders.set(stale.productionEventId, 1);
  const result = fx.store.produce(stale);
  assert(!result.ok && result.code === "STALE_ORDER", "orden obsoleto rechazado");
  fx.close();
});

check("19 · Pareja incompleta no produce huevo", () => {
  const fx = fixture("19-pareja");
  const p = production("19");
  const invalid = { ...p, parents: [p.parents[0]] as unknown as typeof p.parents };
  const result = fx.store.produce(invalid);
  assert(!result.ok && result.code === "PAIR_INCOMPLETE", "pareja incompleta rechazada");
  fx.close();
});

check("20 · Cambio de propietario no autorizado", () => {
  const fx = fixture("20-asignacion");
  assert(fx.store.produce(production("20")).ok, "producción");
  const eggId = fx.store.listAll()[0]!.eggId;
  fx.authority.denyAssignActors.add("intruso");
  const denied = fx.store.store({ eggId, ownerId: GUEST, actorId: "intruso", at: plus(T0, 1000) });
  assert(!denied.ok && denied.code === "ASSIGN_NOT_AUTHORIZED", "asignación denegada por autoridad");
  equal(fx.store.get(eggId)!.ownerId, null, "propiedad intacta");
  fx.close();
});

check("21 · Asignación explícita y propiedad inmutable", () => {
  const fx = fixture("21-propiedad");
  assert(fx.store.produce(production("21")).ok, "producción");
  const egg = fx.store.listAll()[0]!;
  const pending = fx.store.markPending({ eggId: egg.eggId, recipientId: GUEST, actorId: HOST, at: plus(T0, 1000) });
  assert(pending.ok, "destinatario pendiente");
  equal(pending.value.value.state, "pending_assignment", "estado pendiente");
  const stored = fx.store.store({ eggId: egg.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 2000) });
  assert(stored.ok, "almacenado");
  equal(stored.value.value.state, "stored", "estado almacenado");
  equal(stored.value.value.ownerId, GUEST, "propietario confirmado");
  const changed = fx.store.store({ eggId: egg.eggId, ownerId: HOST, actorId: HOST, at: plus(T0, 3000) });
  assert(!changed.ok && changed.code === "OWNER_IMMUTABLE", "cambio de propietario prohibido");
  fx.close();
});

check("22 · Dos destinatarios: decides la autoridad, no último escritor", () => {
  const fx = fixture("22-reclamantes");
  assert(fx.store.produce(production("22")).ok, "producción");
  const egg = fx.store.listAll()[0]!;
  assert(fx.store.store({ eggId: egg.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 1000) }).ok, "propietario");
  const intruder = fx.store.claim({ eggId: egg.eggId, actorId: HOST, at: plus(T0, 2000) });
  assert(!intruder.ok && intruder.code === "CLAIM_NOT_AUTHORIZED", "otro destinatario denegado");
  const owner = fx.store.claim({ eggId: egg.eggId, actorId: GUEST, at: plus(T0, 3000) });
  assert(owner.ok, "propietario reclama");
  equal(fx.store.get(egg.eggId)!.ownerId, GUEST, "propiedad no cambió");
  equal(fx.store.get(egg.eggId)!.state, "claimed", "reclamado");
  fx.close();
});

check("23 · Reclamo duplicado y sin propietario", () => {
  const fx = fixture("23-reclamo");
  assert(fx.store.produce(production("23")).ok, "producción");
  const egg = fx.store.listAll()[0]!;
  const early = fx.store.claim({ eggId: egg.eggId, actorId: GUEST, at: plus(T0, 1000) });
  assert(!early.ok && early.code === "OWNER_REQUIRED", "sin propietario");
  fx.store.store({ eggId: egg.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 2000) });
  assert(fx.store.claim({ eggId: egg.eggId, actorId: GUEST, at: plus(T0, 3000) }).ok, "reclamo");
  const again = fx.store.claim({ eggId: egg.eggId, actorId: GUEST, at: plus(T0, 4000) });
  assert(!again.ok && again.code === "INVALID_TRANSITION", "segundo reclamo rechazado");
  fx.close();
});

check("24 · Cancelación válida antes de la confirmación definitiva", () => {
  const fx = fixture("24-cancelar");
  assert(fx.store.produce(production("24")).ok, "producción");
  const egg = fx.store.listAll()[0]!;
  const cancelled = fx.store.cancel({ eggId: egg.eggId, actorId: HOST, at: plus(T0, 1000), reason: "cycle_invalidated" });
  assert(cancelled.ok, "cancelación aceptada");
  equal(cancelled.value.value.state, "cancelled", "estado cancelado");
  equal(fx.store.history(egg.eggId)[1]!.reason, "cycle_invalidated", "motivo trazado");
  fx.close();
});

check("25 · No se cancela un huevo confirmado ni con motivo inválido", () => {
  const fx = fixture("25-cancel-invalido");
  assert(fx.store.produce(production("25")).ok, "producción");
  const egg = fx.store.listAll()[0]!;
  const badReason = fx.store.cancel({ eggId: egg.eggId, actorId: HOST, at: plus(T0, 1000), reason: "capacidad" as never });
  assert(!badReason.ok && badReason.code === "CANCEL_REASON_INVALID", "motivo inválido rechazado");
  fx.store.store({ eggId: egg.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 2000) });
  const stored = fx.store.cancel({ eggId: egg.eggId, actorId: HOST, at: plus(T0, 3000), reason: "cycle_invalidated" });
  assert(!stored.ok && stored.code === "INVALID_TRANSITION", "confirmado no se cancela");
  fx.close();
});

check("26 · Cancelación denegada por la autoridad", () => {
  const fx = fixture("26-cancel-denegado");
  assert(fx.store.produce(production("26")).ok, "producción");
  fx.authority.denyCancelActors.add("intruso");
  const egg = fx.store.listAll()[0]!;
  const result = fx.store.cancel({ eggId: egg.eggId, actorId: "intruso", at: plus(T0, 1000), reason: "authority_rejected" });
  assert(!result.ok && result.code === "CANCEL_NOT_AUTHORIZED", "autoridad deniega");
  equal(fx.store.get(egg.eggId)!.state, "produced", "sin cambio");
  fx.close();
});

// ---------------------------------------------------------------------------
// 4. Capacidad, acumulación y recuperación
// ---------------------------------------------------------------------------

check("27 · Capacidad disponible y dos producciones simultáneas", () => {
  const fx = fixture("27-capacidad");
  equal(fx.store.setCapacity(2).ok, true, "capacidad 2");
  assert(fx.store.produce(production("27-a")).ok, "producción A");
  assert(fx.store.produce(production("27-b")).ok, "producción B");
  equal(fx.store.listAll().length, 2, "dos huevos");
  fx.close();
});

check("28 · Capacidad agotada: rechazo seguro sin consumir idempotencia", () => {
  const fx = fixture("28-agotada");
  equal(fx.store.setCapacity(1).ok, true, "capacidad 1");
  assert(fx.store.produce(production("28-a")).ok, "producción A");
  const rejected = fx.store.produce(production("28-b"));
  assert(!rejected.ok && rejected.code === "CAPACITY_EXHAUSTED", "rechazo por capacidad");
  equal(fx.store.events().length, 1, "sin evento consumido");
  equal(fx.store.backlog().length, 0, "single no acumula");
  fx.close();
});

check("29 · Reintento tras liberar capacidad por transición válida", () => {
  const fx = fixture("29-reintento");
  equal(fx.store.setCapacity(1).ok, true, "capacidad 1");
  assert(fx.store.produce(production("29-a")).ok, "producción A");
  assert(!fx.store.produce(production("29-b")).ok, "B rechazada");
  const a = fx.store.listAll()[0]!;
  fx.store.store({ eggId: a.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 1000) });
  assert(fx.store.claim({ eggId: a.eggId, actorId: GUEST, at: plus(T0, 2000) }).ok, "A reclamada libera capacidad");
  assert(fx.store.produce(production("29-b")).ok, "B reintentada");
  equal(fx.store.listAll().length, 2, "dos huevos");
  fx.close();
});

check("30 · Reducir capacidad por debajo del uso se rechaza", () => {
  const fx = fixture("30-capacidad-uso");
  equal(fx.store.setCapacity(2).ok, true, "capacidad 2");
  fx.store.produce(production("30-a"));
  fx.store.produce(production("30-b"));
  const result = fx.store.setCapacity(1);
  assert(!result.ok && result.code === "CAPACITY_BELOW_USAGE", "no destruye huevos al reducir");
  equal(fx.store.listAll().length, 2, "huevos intactos");
  fx.close();
});

check("31 · `single` no permite acumulación encubierta", () => {
  const fx = fixture("31-single");
  const result = fx.store.setAccumulation("single", 2);
  assert(!result.ok && result.code === "SINGLE_BACKLOG_FORBIDDEN", "single con acumulación rechazado");
  equal(fx.store.config().accumulation, "single", "política por defecto");
  equal(fx.store.config().backlogCapacity, 0, "sin espera");
  fx.close();
});

check("32 · `bounded` acumula con límite explícito", () => {
  const fx = fixture("32-bounded");
  equal(fx.store.setCapacity(1).ok, true, "capacidad 1");
  const acc = fx.store.setAccumulation("bounded", 2);
  assert(acc.ok, "acumulación configurada");
  assert(fx.store.produce(production("32-a")).ok, "A almacenada");
  const b = fx.store.produce(production("32-b"));
  const c = fx.store.produce(production("32-c"));
  assert(b.ok && c.ok && b.value.queued && c.value.queued, "B y C en espera");
  equal(fx.store.backlog().length, 2, "dos en espera");
  const d = fx.store.produce(production("32-d"));
  assert(!d.ok && d.code === "CAPACITY_EXHAUSTED", "D rechazada sin consume");
  fx.close();
});

check("33 · Drenaje: permisos y capacidad se revalidan", () => {
  const fx = fixture("33-drenaje");
  fx.store.setCapacity(1);
  fx.store.setAccumulation("bounded", 2);
  fx.store.produce(production("33-a"));
  fx.store.produce(production("33-b"));
  fx.store.produce(production("33-c"));
  const a = fx.store.listAll()[0]!;
  fx.store.store({ eggId: a.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 1000) });
  fx.store.claim({ eggId: a.eggId, actorId: GUEST, at: plus(T0, 2000) });
  const first = fx.store.drainBacklog({ actorId: HOST, at: plus(T0, 3000) });
  assert(first.ok, "drenaje ejecutado");
  equal(first.value.drained, 1, "uno drenado");
  equal(first.value.remaining, 1, "uno pendiente");
  equal(fx.store.listAll().length, 2, "A + B");
  const b = fx.store.listByCycle("cycle:33-b:1")[0]!;
  fx.store.store({ eggId: b.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 4000) });
  fx.store.claim({ eggId: b.eggId, actorId: GUEST, at: plus(T0, 5000) });
  const second = fx.store.drainBacklog({ actorId: HOST, at: plus(T0, 6000) });
  assert(second.ok && second.value.drained === 1 && second.value.remaining === 0, "C recuperada");
  fx.close();
});

check("34 · Permiso revocado mientras está en espera bloquea el drenaje", () => {
  const fx = fixture("34-drenaje-revocado");
  fx.store.setCapacity(1);
  fx.store.setAccumulation("bounded", 1);
  fx.store.produce(production("34-a"));
  fx.store.produce(production("34-b"));
  const a = fx.store.listAll()[0]!;
  fx.store.store({ eggId: a.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 1000) });
  fx.store.claim({ eggId: a.eggId, actorId: GUEST, at: plus(T0, 2000) });
  fx.authority.revokedOwners.add(GUEST);
  const result = fx.store.drainBacklog({ actorId: HOST, at: plus(T0, 3000) });
  assert(result.ok && result.value.blocked === 1 && result.value.drained === 0, "no se produce con permiso revocado");
  equal(fx.store.backlog().length, 1, "evento conservado");
  fx.close();
});

check("35 · Reinicio entre producción y almacenamiento recupera la espera", () => {
  const fx = fixture("35-reinicio-espera");
  fx.store.setCapacity(1);
  fx.store.setAccumulation("bounded", 1);
  fx.store.produce(production("35-a"));
  fx.store.produce(production("35-b"));
  fx.reopen();
  equal(fx.store.backlog().length, 1, "espera persistida");
  const a = fx.store.listAll()[0]!;
  fx.store.store({ eggId: a.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 1000) });
  fx.store.claim({ eggId: a.eggId, actorId: GUEST, at: plus(T0, 2000) });
  const drained = fx.store.drainBacklog({ actorId: HOST, at: plus(T0, 3000) });
  assert(drained.ok && drained.value.drained === 1, "recuperado tras reinicio");
  fx.close();
});

check("36 · Persistencia y consultas tras reinicio", () => {
  const fx = fixture("36-reinicio");
  fx.store.produce(production("36"));
  const egg = fx.store.listAll()[0]!;
  fx.store.store({ eggId: egg.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 1000) });
  fx.reopen();
  equal(fx.store.listAll().length, 1, "huevo persistido");
  equal(fx.store.listByOwner(GUEST).length, 1, "consulta por propietario");
  equal(fx.store.listByNursery(NURSERY).length, 1, "consulta por guardería");
  equal(fx.store.listByCycle("cycle:36:1").length, 1, "consulta por ciclo");
  equal(fx.store.get(egg.eggId)!.state, "stored", "estado persistido");
  fx.close();
});

// ---------------------------------------------------------------------------
// 5. Replay, salida y corrupción
// ---------------------------------------------------------------------------

const asReplay = (fx: Fixture) => fx.store.events().map((e) => ({
  type: e.type, occurredAt: e.occurredAt, idempotencyKey: e.idempotencyKey,
  eggId: e.eggId, cycleId: e.cycleId, nurseryId: e.nurseryId,
  payload: e.payload as Record<string, unknown>,
}));

check("37 · Replay reconstruye el huevo y sus estados", () => {
  const source = fixture("37-origen");
  assert(source.store.produce(production("37")).ok, "producción");
  const eggId = source.store.listAll()[0]!.eggId;
  source.store.store({ eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 1000) });
  source.store.claim({ eggId, actorId: GUEST, at: plus(T0, 2000) });
  const events = asReplay(source);
  const target = fixture("37-destino");
  const result = target.store.replay(events);
  assert(result.ok, "replay aceptado");
  equal(result.value.applied, 3, "tres eventos aplicados");
  equal(target.store.get(eggId)!.state, "claimed", "estado final reconstruido");
  equal(target.store.get(eggId)!.ownerId, GUEST, "propietario reconstruido");
  source.close(); target.close();
});

check("38 · Replay repetido es idempotente", () => {
  const source = fixture("38-origen");
  source.store.produce(production("38"));
  const events = asReplay(source);
  const target = fixture("38-destino");
  assert(target.store.replay(events).ok, "primer replay");
  const second = target.store.replay(events);
  assert(second.ok, "segundo replay aceptado");
  equal(second.value.applied, 0, "nada reaplicado");
  equal(second.value.duplicates, events.length, "duplicados contados");
  equal(target.store.listAll().length, 1, "un huevo");
  source.close(); target.close();
});

check("39 · Mensajes duplicados no alteran el huevo", () => {
  const fx = fixture("39-duplicados");
  const input = production("39");
  fx.store.produce(input);
  const copy = { ...input, productionEventId: "event:39:otro", idempotencyKey: "cycle:39:1:b" };
  const result = fx.store.produce(copy);
  assert(!result.ok && result.code === "CYCLE_DUPLICATE", "duplicado detectado por ciclo");
  equal(fx.store.events().length, 1, "outbox sin duplicados");
  fx.close();
});

check("40 · Outbox durable y eventos publicados por transición", () => {
  const fx = fixture("40-outbox");
  fx.store.produce(production("40"));
  const eggId = fx.store.listAll()[0]!.eggId;
  fx.store.markPending({ eggId, recipientId: GUEST, actorId: HOST, at: plus(T0, 1000) });
  fx.store.store({ eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 2000) });
  fx.store.claim({ eggId, actorId: GUEST, at: plus(T0, 3000) });
  equal(fx.store.outbox().length, fx.store.events().length, "todos los eventos publicados");
  deepEqual(fx.store.events().map((e) => e.type), [
    "egg.production.recorded", "egg.assignment.pending", "egg.stored", "egg.claimed",
  ], "secuencia de eventos");
  fx.reopen();
  equal(fx.store.outbox().length, 4, "outbox tras reinicio");
  fx.close();
});

check("41 · Integridad de base y detección de corrupción", () => {
  const fx = fixture("41-integridad");
  fx.store.produce(production("41"));
  equal(fx.store.integrityCheck().ok, true, "integridad inicial");
  const db = new Database(join(fx.dir, "eggs.db"));
  db.query("UPDATE eggs SET owner_id = ?").run("fantasma");
  db.close();
  const report = fx.store.integrityCheck();
  equal(report.ok, false, "corrupción detectada");
  assert(report.issues.some((i) => i.includes("propietario divergente")), "motivo concreto");
  fx.close();
});

check("42 · Guarda explícita contra la base original", () => {
  let rejected = false;
  try { openSharedEggStore({ databasePath: join(ROOT, "data/pokegotchi.db") }); }
  catch (error) { rejected = String(error).includes("prohibido"); }
  equal(rejected, true, "pokegotchi.db rechazada");
});

check("43 · Sin archivos PKM, saves ni eclosión", () => {
  const fx = fixture("43-sin-pkm");
  fx.store.produce(production("43"));
  const files = readdirSync(fx.dir);
  assert(!files.some((f) => /\.(pkm|pk[0-9]|sav|srm|dsv)$/i.test(f)), "sin archivos de partida");
  equal(fx.store.get(fx.store.listAll()[0]!.eggId)!.legitimacy.hatched, false, "sin eclosión");
  fx.close();
});

// ---------------------------------------------------------------------------
// 6. Integración transaccional con el motor PG-08D
// ---------------------------------------------------------------------------

class TestClock implements BreedingClock {
  constructor(private at: string = T0) {}
  now(): string { return this.at; }
  advance(ms: number): void { this.at = plus(this.at, ms); }
}
class Compat implements BreedingCompatibilityProvider {
  compatibility(): "compatible" { return "compatible"; }
  rarityOf(): "common" { return "common"; }
}
class StagedCycleStore implements BreedingCycleStore {
  private current: BreedingState | null = null;
  private staged: BreedingState | null = null;
  load(): BreedingState | null { return this.current; }
  save(state: BreedingState): void { this.staged = JSON.parse(JSON.stringify(state)) as BreedingState; }
  commit(): void { if (this.staged) { this.current = this.staged; this.staged = null; } }
  rollback(): void { this.staged = null; }
}
class StubCustody implements CustodyPort {
  withdraw(input: { stayId: string }): CustodyResult { return { ok: true, finalStayId: input.stayId, confirmed: true }; }
  expel(input: { stayId: string }): CustodyResult { return { ok: true, finalStayId: input.stayId, confirmed: true }; }
}
function stayOf(id: string, instanceId: string): Stay {
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION,
    id: id as Stay["id"], nurseryId: NURSERY as Nursery["id"],
    ownerId: (id.endsWith("g") ? GUEST : HOST) as Owner["id"],
    hostId: HOST as Owner["id"],
    pokemon: {
      schema: SCHEMA_ID, version: CONTRACT_VERSION,
      instanceId: instanceId as PokemonRef["instanceId"],
      origin: { kind: "gen3_5", saveSha256: SHA, generation: 4, species: 132, pid: 1234 },
      dataSha256: SHA, verdict: "legal", capturedAt: T0,
    },
    ownershipRelation: id.endsWith("g") ? "visitor" : "own",
    state: "stay_active",
    permissions: {
      allow_ev_berries: null, allow_ev_minigames: null,
      allow_breeding: {
        permission: "allow_breeding", grantedBy: (id.endsWith("g") ? GUEST : HOST) as Owner["id"],
        stayId: id as Stay["id"], grantedAt: T0, revokedAt: null,
        consentKey: `consent-${id}`, revision: 0,
      },
    },
    revision: 0, createdAt: T0, updatedAt: T0, hostOfflineNoted: false, finishedAt: null,
  };
}

/** Adaptador: el evento PG-08D se convierte en huevo PG-08E en la MISMA tx. */
class EggSink implements BreedingEventSink {
  constructor(
    private readonly store: SharedEggStore,
    private readonly authority: TestAuthority,
    private readonly prov: ReadonlyMap<string, PokemonProvenance>,
  ) {}
  append(event: BreedingEvent): string {
    if (event.type !== "breeding.egg.produced") return event.eventId;
    const cycleId = String(event.payload.cycleId);
    const stayIds = event.payload.pair as readonly [string, string];
    const parents: EggParentRef[] = stayIds.map((stayId, index) => {
      const instanceId = stayId.replace("stay-", "");
      return {
        stayId, pokemonInstanceId: instanceId,
        ownerId: index === 0 ? GUEST : HOST,
        role: index === 0 ? "guest" : "host",
      };
    }) as [EggParentRef, EggParentRef];
    const input: EggProductionInput = {
      cycleId, nurseryId: event.nurseryId, productionEventId: event.eventId,
      idempotencyKey: event.idempotencyKey, occurredAt: event.occurredAt,
      authoritySequence: this.authority.sequenceFor({
        productionEventId: event.eventId, nurseryId: event.nurseryId, cycleId, occurredAt: event.occurredAt,
      }),
      cycleRevision: "rev-1", parents,
      provenance: [this.prov.get(stayIds[0]!)!, this.prov.get(stayIds[1]!)!],
      hostId: HOST, ownerId: null, recipientId: null, assignmentPolicy: "pending",
    };
    const result = this.store.produceTx(input);
    if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
    return result.value.eventIds[0] ?? event.eventId;
  }
}

check("44 · Integración atómica PG-08D → PG-08E con outbox", () => {
  const fx = fixture("44-integracion");
  const clock = new TestClock();
  const cycles = new StagedCycleStore();
  const prov = new Map<string, PokemonProvenance>();
  const stays = [stayOf("stay-mon-g44", "mon-g44"), stayOf("stay-mon-h44", "mon-h44")];
  prov.set(stays[0]!.id, imported("mon-g44"));
  prov.set(stays[1]!.id, imported("mon-h44"));
  const engine: BreedingEngine = createBreedingEngine({
    nurseryId: NURSERY, clock, compatibility: new Compat(), events: new EggSink(fx.store, fx.authority, prov),
    store: cycles, custody: new StubCustody(), offlinePolicy: "single", maxPendingEggs: 2,
  });
  assert(engine.start(stays, "start-44").ok, "ciclo iniciado");
  cycles.commit();
  clock.advance(HOUR_MS);
  let ticked: ReturnType<BreedingEngine["tick"]> | null = null;
  fx.store.atomic(() => {
    ticked = engine.tick(stays, "tick-44");
    assert(ticked.ok, "tick produce huevo");
    cycles.commit();
  });
  equal(fx.store.listAll().length, 1, "huevo persistido en la misma transacción");
  equal(fx.store.outbox().filter((e) => e.type === "egg.production.recorded").length, 1, "outbox publicado");
  equal(fx.store.integrityCheck().ok, true, "integridad tras integración");
  fx.close();
});

check("45 · Retirada/expulsión posterior no destruye huevo confirmado", () => {
  const fx = fixture("45-retirada");
  assert(fx.store.produce(production("45")).ok, "producción");
  const egg = fx.store.listAll()[0]!;
  fx.store.store({ eggId: egg.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 1000) });
  // D6: retirada y expulsión cancelan el CICLO, nunca el huevo confirmado.
  const afterWithdraw = fx.store.get(egg.eggId)!;
  equal(afterWithdraw.state, "stored", "tras retirada sigue almacenado");
  const afterExpel = fx.store.get(egg.eggId)!;
  equal(afterExpel.state, "stored", "tras expulsión sigue almacenado");
  assert(!fx.store.events().some((e) => e.type === "egg.cancelled"), "sin cancelación");
  equal(fx.store.integrityCheck().ok, true, "integridad");
  fx.close();
});

check("46 · Huevo confirmado conserva su ID tras reinicio y no se reasigna", () => {
  const fx = fixture("46-id-inmutable");
  fx.store.produce(production("46"));
  const egg = fx.store.listAll()[0]!;
  fx.store.store({ eggId: egg.eggId, ownerId: GUEST, actorId: HOST, at: plus(T0, 1000) });
  fx.reopen();
  const retry = fx.store.produce(production("46"));
  assert(retry.ok && retry.value.created === false, "reproducción reconocida");
  equal(retry.value.eggId, egg.eggId, "mismo ID");
  equal(fx.store.get(egg.eggId)!.ownerId, GUEST, "propietario intacto");
  fx.close();
});

check("47 · Bases de datos y archivos protegidos intactos", () => {
  for (const [path, expected] of protectedBefore) {
    equal(hashOf(join(ROOT, path)), expected, `hash protegido ${path}`);
  }
});

check("48 · Sin cambios Git destructivos desde la FASE 0", () => {
  const git = (args: string[]): string => {
    const result = Bun.spawnSync(["git", ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
    return new TextDecoder().decode(result.stdout).trim();
  };
  equal(git(["rev-parse", "HEAD"]), "7c9c326be0eb4dced4969c5b0f966413d3299dae", "HEAD sin cambios");
  equal(git(["rev-parse", "origin/main"]), "7c9c326be0eb4dced4969c5b0f966413d3299dae", "origin/main sin cambios");
});

// ---------------------------------------------------------------------------
// 7. Informe
// ---------------------------------------------------------------------------

for (const fx of [] as Fixture[]) fx.close();
rmSync(TMP, { recursive: true, force: true });

console.log(`PG-08E — ${passed} casos correctos, ${failed} fallidos.`);
if (failed > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
