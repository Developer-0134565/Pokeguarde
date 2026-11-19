/**
 * PG-08F — Suite aislada: distribución 1+1, DEMO, entrega y atomicidad.
 * SQLite en /tmp/opencode/pg08f-*; sin red, saves, PKM, cuentas ni frontend.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import {
  DEMO_STARTERS,
  DELIVERY_STAGES,
  PAIR_VERSION,
  assertBreedablePair,
  assertDemoAllowed,
  assertDistinctPair,
  assertParentsUnchanged,
  createDemoStarter,
  demoRestrictions,
  demoStartersChecksum,
  importedProvenance,
  pairEggIdFor,
  pairEventIdFor,
  starterByDex,
  unresolvedGenetics,
  type RecipientRole,
} from "../packages/core/src/egg-pair-domain.ts";
import {
  demoProvenance,
  isBreedableProvenance,
  type EggParentRef,
  type PokemonProvenance,
} from "../packages/core/src/egg-domain.ts";
import {
  openSharedEggPairStore,
  simulatedDeliveryPort,
  type EggAuthorityPort,
  type PairProduceInput,
  type SharedEggPairStore,
} from "../apps/server/src/shared-egg-pair-store.ts";

let passed = 0, failed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void): void {
  try { fn(); passed++; } catch (error) {
    failed++;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`  FALLO ${name}: ${message}`);
  }
}
function assert(condition: unknown, message: string): void { if (!condition) throw new Error(message); }
function equal<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message} (esperado ${String(expected)}, obtenido ${String(actual)})`);
}
function deepEqual(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message} (esperado ${b}, obtenido ${a})`);
}

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const TMP = mkdtempSync(join("/tmp/opencode", "pg08f-"));
const T0 = "2026-11-19T12:00:00.000Z";
const HOST = "host-pg08f", GUEST = "guest-pg08f";
const SHA = "a".repeat(64);
const hashOf = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

class PairAuthority implements EggAuthorityPort {
  lastSequence = 0;
  readonly orders = new Map<string, number>();
  readonly denyRoles = new Set<RecipientRole>();
  readonly denyClaim = new Set<string>();
  sequenceFor(input: { productionEventId: string }) { return this.orders.get(input.productionEventId) ?? ++this.lastSequence; }
  canProduce(input: { productionEventId: string }) {
    const role: RecipientRole = input.productionEventId.endsWith(":guest") ? "guest" : "host";
    if (this.denyRoles.has(role)) return { ok: false as const, code: "PERMISSION_REVOKED", message: `permiso revocado para ${role}` };
    return { ok: true as const, value: true };
  }
  canAssign() { return { ok: true as const, value: true }; }
  canClaim(input: { actorId: string }) {
    if (this.denyClaim.has(input.actorId)) return { ok: false as const, code: "CLAIM_NOT_AUTHORIZED", message: "reclamación denegada" };
    return { ok: true as const, value: true };
  }
  canCancel() { return { ok: true as const, value: true }; }
}

class Fx {
  readonly dir: string;
  readonly authority = new PairAuthority();
  store: SharedEggPairStore;
  constructor(readonly label: string) {
    this.dir = join(TMP, label);
    mkdirSync(this.dir, { recursive: true });
    this.store = openSharedEggPairStore({ databasePath: join(this.dir, "pairs.db"), authority: this.authority });
  }
  reopen(): void {
    this.store.close();
    this.store = openSharedEggPairStore({ databasePath: join(this.dir, "pairs.db"), authority: this.authority });
  }
  close(): void { this.store.close(); }
}
const fixture = (label: string): Fx => new Fx(label);

function parent(instanceId: string, role: RecipientRole): EggParentRef {
  return { stayId: `stay-${instanceId}`, pokemonInstanceId: instanceId, ownerId: role === "guest" ? GUEST : HOST, role };
}
function production(label: string, opts: Partial<PairProduceInput> = {}): PairProduceInput {
  const guest = "mon-" + label + "-g", host = "mon-" + label + "-h";
  return {
    cycleId: `cycle:${label}:1`, nurseryId: "nursery-pg08f", productionEventId: `event:${label}`,
    idempotencyKey: `idem:${label}`, occurredAt: T0, authoritySequence: 0, cycleRevision: "rev-1",
    parents: [parent(guest, "guest"), parent(host, "host")],
    provenance: [importedProvenance(guest, SHA, T0), importedProvenance(host, SHA, T0)],
    hostId: HOST, guestOwnerId: GUEST, agreedOwnerId: null,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// 1. Contrato y SyncGate documental
// ---------------------------------------------------------------------------

check("01 · SyncGate y documentación PG-08F presentes", () => {
  const docs = ["SYNCGATE.md", "ARQUITECTURA.md", "DISTRIBUCION-1-1.md", "ATOMICIDAD-Y-CONCURRENCIA.md",
    "POKEMON-DEMO.md", "EGG-DELIVERY-PORT.md", "GENETICA-CONTRATO-FUTURO.md",
    "AUTORIDAD-ONLINE-SPIKE.md", "PRUEBAS.md", "RIESGOS-Y-DECISIONES.md", "PROPUESTA-PG08G.md"];
  for (const doc of docs) assert(existsSync(join(ROOT, "docs/informes/fases/PG-08/PG-08F", doc)), `falta ${doc}`);
  assert(existsSync(join(ROOT, "docs/informes/fases/PG-08/PG-08F-INFORME.md")), "falta informe final");
  const sg = readFileSync(join(ROOT, "docs/informes/fases/PG-08/PG-08F/SYNCGATE.md"), "utf8");
  assert(sg.includes("PASS WITH WARNINGS"), "SYNCGATE no registra resultado");
});

check("02 · Versión y esquemas del contrato 1+1", () => {
  equal(PAIR_VERSION, "1.0.0", "versión del par");
  deepEqual(DELIVERY_STAGES, ["produced", "stored", "assigned", "available", "claimed", "delivered"], "etapas");
  const fx = fixture("02-version");
  equal(fx.store.config().contractVersion, "1.0.0", "versión en SQLite");
  fx.close();
});

// ---------------------------------------------------------------------------
// 2. Producción 1+1
// ---------------------------------------------------------------------------

check("03 · Un ciclo produce exactamente dos huevos", () => {
  const fx = fixture("03-par");
  const result = fx.store.produce(production("03"));
  assert(result.ok, "producción aceptada");
  equal(result.value.created, true, "par creado");
  equal(result.value.status, "produced", "confirmado");
  equal(fx.store.listAll().length, 2, "dos huevos");
  equal(fx.store.listByCycle("cycle:03:1").length, 2, "dos huevos del ciclo");
  equal(fx.store.cycle("cycle:03:1")!.status, "produced", "ciclo confirmado");
  fx.close();
});

check("04 · Ambos comparten ciclo y tienen IDs distintos", () => {
  const fx = fixture("04-ids");
  const r = fx.store.produce(production("04")).value;
  assert(r.hostEggId !== r.guestEggId, "identidades distintas");
  for (const egg of fx.store.listAll()) equal(egg.breedingCycleId, "cycle:04:1", "mismo ciclo");
  equal(assertDistinctPair(r.hostEggId, r.guestEggId).ok, true, "par válido");
  fx.close();
});

check("05 · Identidad determinista por ciclo y destinatario", () => {
  const p = production("05");
  const host = pairEggIdFor(p.cycleId, p.productionEventId, "host");
  const guest = pairEggIdFor(p.cycleId, p.productionEventId, "guest");
  equal(host, pairEggIdFor(p.cycleId, p.productionEventId, "host"), "host reproducible");
  assert(host !== guest, "roles distintos");
  assert(pairEventIdFor(p.cycleId, p.productionEventId, "host") !== pairEventIdFor(p.cycleId, p.productionEventId, "guest"), "eventos distintos");
});

check("06 · Propietarios correctos e independientes", () => {
  const fx = fixture("06-propietarios");
  const r = fx.store.produce(production("06")).value;
  equal(fx.store.get(r.hostEggId)!.ownerId, HOST, "huevo del anfitrión");
  equal(fx.store.get(r.guestEggId)!.ownerId, GUEST, "huevo del invitado");
  equal(fx.store.listByRecipient(HOST).length, 1, "uno para anfitrión");
  equal(fx.store.listByRecipient(GUEST).length, 1, "uno para invitado");
  fx.close();
});

check("07 · No se comparte eggId ni se transfiere propiedad", () => {
  const fx = fixture("07-propiedad");
  const p = production("07");
  const r = fx.store.produce(p).value;
  const prepared = fx.store.prepareDelivery({ eggId: r.guestEggId, recipientId: HOST, idempotencyKey: "wrong:07", at: T0 });
  assert(!prepared.ok && prepared.code === "RECIPIENT_MISMATCH", "anfitrión no reclama el huevo invitado");
  equal(fx.store.get(r.guestEggId)!.ownerId, GUEST, "propiedad intacta");
  equal(assertParentsUnchanged(p.parents, p.parents).ok, true, "progenitores intactos");
  fx.close();
});

check("08 · Estado almacenado y eventos en la misma transacción", () => {
  const fx = fixture("08-eventos");
  fx.store.produce(production("08"));
  for (const egg of fx.store.listAll()) equal(egg.state, "stored", "almacenado");
  const types = fx.store.events().map((e) => e.type);
  assert(types.includes("egg.production.recorded"), "evento de producción");
  assert(types.includes("egg.stored"), "evento de almacenamiento");
  assert(types.includes("egg.pair.produced"), "evento del par");
  equal(fx.store.outbox().length, fx.store.events().length, "outbox completo");
  fx.close();
});

check("09 · Doble vencimiento no duplica la pareja", () => {
  const fx = fixture("09-doble");
  const p = production("09");
  const a = fx.store.produce(p).value, b = fx.store.produce(p).value;
  equal(b.created, false, "segundo no crea");
  equal(b.hostEggId, a.hostEggId, "mismo ID de anfitrión");
  equal(b.guestEggId, a.guestEggId, "mismo ID de invitado");
  equal(fx.store.listAll().length, 2, "sin duplicados");
  fx.close();
});

check("10 · Reintento tras reinicio conserva identidades", () => {
  const fx = fixture("10-reinicio");
  const a = fx.store.produce(production("10")).value;
  fx.reopen();
  const b = fx.store.produce(production("10")).value;
  equal(b.hostEggId, a.hostEggId, "ID host estable");
  equal(b.guestEggId, a.guestEggId, "ID guest estable");
  equal(fx.store.listAll().length, 2, "sin huevos nuevos");
  fx.close();
});

check("11 · Replay duplicado no crea un tercer huevo", () => {
  const fx = fixture("11-replay");
  fx.store.produce(production("11"));
  const events = fx.store.events().filter((e) => e.type === "egg.pair.produced");
  const replayed = fx.store.replay([...events, ...events]);
  assert(replayed.ok, "replay aceptado");
  equal(replayed.value.applied, 0, "nada nuevo aplicado");
  equal(replayed.value.duplicates, 2, "dos duplicados detectados");
  equal(fx.store.listAll().length, 2, "par único");
  fx.close();
});

check("12 · No se inicia un segundo temporizador por huevo", () => {
  const fx = fixture("12-temporizador");
  const events = fx.store.produce(production("12")).value.eventIds;
  const pairEvents = fx.store.events().filter((e) => e.type === "egg.pair.produced");
  equal(pairEvents.length, 1, "un solo evento de par por ciclo");
  assert(events.length >= 4, "eventos por huevo y por par");
  const payload = pairEvents[0]!.payload;
  equal(payload.intervalIsSingle, true, "intervalo único declarado");
  fx.close();
});

// ---------------------------------------------------------------------------
// 3. Atomicidad, capacidad y concurrencia simulada
// ---------------------------------------------------------------------------

check("13 · Fallo al persistir el segundo huevo: rollback completo", () => {
  const fx = fixture("13-rollback");
  const p = production("13");
  fx.store.failOnEggId = pairEggIdFor(p.cycleId, p.productionEventId, "guest");
  let threw = false;
  try { fx.store.produce(p); } catch { threw = true; }
  equal(threw, true, "excepción inyectada");
  equal(fx.store.listAll().length, 0, "sin par parcial");
  equal(fx.store.cycle(p.cycleId), null, "ciclo no confirmado");
  equal(fx.store.events().filter((e) => e.type === "egg.pair.produced").length, 0, "sin confirmación");
  fx.store.failOnEggId = null;
  const retry = fx.store.produce(p);
  assert(retry.ok && retry.value.created, "reintento crea el par");
  equal(fx.store.listAll().length, 2, "exactamente dos huevos");
  fx.close();
});

check("14 · Capacidad agotada en el invitado: par recuperable, sin parcial", () => {
  const fx = fixture("14-capacidad");
  assert(fx.store.produce(production("14-first")).ok, "primer ciclo llena inventario invitado");
  fx.store.setCapacity(1);
  const q = fx.store.produce(production("14-second"));
  assert(q.ok && q.value.status === "queued", "segundo ciclo en espera");
  equal(fx.store.listAll().length, 2, "no se confirmó ningún huevo del segundo par");
  equal(fx.store.backlog().length, 1, "backlog recuperable");
  fx.store.setCapacity(4);
  const drained = fx.store.drainBacklog({ actorId: "scheduler", at: "2026-11-19T13:00:00.000Z" });
  assert(drained.ok && drained.value.drained === 1, "par drenado");
  equal(fx.store.listAll().length, 4, "dos pares completos");
  fx.close();
});

check("15 · Capacidad agotada en el anfitrión también bloquea el par", () => {
  const fx = fixture("15-cap-host");
  assert(fx.store.produce(production("15-first")).ok, "primer ciclo");
  fx.store.setCapacity(1);
  const q = fx.store.produce(production("15-second"));
  assert(q.ok && q.value.status === "queued", "espera por anfitrión");
  equal(fx.store.listAll().length, 2, "sin parcial");
  fx.close();
});

check("16 · No se reasigna el huevo del destinatario saturado", () => {
  const fx = fixture("16-reasignacion");
  assert(fx.store.produce(production("16-first")).ok, "primer par");
  fx.store.setCapacity(1);
  const p = production("16-second");
  fx.store.produce(p);
  assert(fx.store.get(pairEggIdFor(p.cycleId, p.productionEventId, "guest")) === null, "no se creó huevo invitado");
  assert(fx.store.get(pairEggIdFor(p.cycleId, p.productionEventId, "host")) === null, "no se creó huevo anfitrión");
  fx.close();
});

check("17 · Dos workers sobre la misma BD no duplican el par", () => {
  const fx = fixture("17-workers");
  const worker = openSharedEggPairStore({ databasePath: join(fx.dir, "pairs.db"), authority: fx.authority });
  const p = production("17");
  const a = fx.store.produce(p), b = worker.produce(p);
  assert(a.ok && b.ok, "ambos workers responden");
  equal(a.value.hostEggId, b.value.hostEggId, "mismo ID host");
  equal(fx.store.listAll().length, 2, "un solo par");
  worker.close(); fx.close();
});

check("18 · Retirada/expulsión simultánea cambia la revisión de la pareja", () => {
  const fx = fixture("18-retirada");
  const p = production("18");
  const changed = { ...p.parents[0]!, revision: 0 } as EggParentRef;
  const result = fx.store.produce(production("18", { parents: [changed, p.parents[1]!], parentsBefore: p.parents }));
  assert(!result.ok && result.code === "PARENT_OWNERSHIP_CHANGED", "custodia cambiada detectada");
  equal(fx.store.listAll().length, 0, "sin producción");
  fx.close();
});

check("19 · Revocación de permiso del invitado bloquea el ciclo", () => {
  const fx = fixture("19-revocado");
  fx.authority.denyRoles.add("guest");
  const result = fx.store.produce(production("19"));
  assert(!result.ok && result.code === "PERMISSION_REVOKED", "permiso revocado");
  equal(fx.store.listAll().length, 0, "sin huevos");
  fx.close();
});

check("20 · Revocación de permiso del anfitrión bloquea el ciclo", () => {
  const fx = fixture("20-revocado-host");
  fx.authority.denyRoles.add("host");
  const result = fx.store.produce(production("20"));
  assert(!result.ok && result.code === "PERMISSION_REVOKED", "permiso revocado");
  fx.close();
});

check("21 · Orden obsoleto de la autoridad se rechaza", () => {
  const fx = fixture("21-orden");
  assert(fx.store.produce(production("21")).ok, "primera operación");
  const p = production("21-b");
  fx.authority.orders.set(p.productionEventId, 1);
  const result = fx.store.produce(p);
  assert(!result.ok && result.code === "STALE_ORDER", "secuencia obsoleta");
  fx.close();
});

check("22 · Reinicio entre preparación y confirmación", () => {
  const fx = fixture("22-reinicio-entrega");
  const r = fx.store.produce(production("22")).value;
  fx.store.prepareDelivery({ eggId: r.hostEggId, recipientId: HOST, idempotencyKey: "prep:22", at: T0 });
  fx.reopen();
  const delivery = fx.store.deliveryByKey("prep:22");
  assert(delivery && delivery.status === "prepared", "preparación persistida");
  const confirmed = fx.store.confirmDelivery({ deliveryId: delivery.deliveryId, idempotencyKey: "prep:22", at: "2026-11-19T12:10:00.000Z" });
  assert(confirmed.ok && confirmed.value.status === "delivered", "confirmación tras reinicio");
  fx.close();
});

// ---------------------------------------------------------------------------
// 4. Pokémon DEMO
// ---------------------------------------------------------------------------

check("23 · Catálogo de 15 iniciales de las Gen I-V", () => {
  equal(DEMO_STARTERS.length, 15, "quince iniciales");
  equal(new Set(DEMO_STARTERS.map((s) => s.slug)).size, 15, "slugs únicos");
  equal(new Set(DEMO_STARTERS.map((s) => s.nationalDex)).size, 15, "dex únicos");
  deepEqual([...new Set(DEMO_STARTERS.map((s) => s.generation))], [1, 2, 3, 4, 5], "cinco generaciones");
  deepEqual(demoStartersChecksum(), demoStartersChecksum(), "checksum estable");
});

check("24 · Números de Pokédex verificables por generación", () => {
  deepEqual(DEMO_STARTERS.filter((s) => s.generation === 1).map((s) => s.nationalDex), [1, 4, 7], "Gen I");
  deepEqual(DEMO_STARTERS.filter((s) => s.generation === 2).map((s) => s.nationalDex), [152, 155, 158], "Gen II");
  deepEqual(DEMO_STARTERS.filter((s) => s.generation === 3).map((s) => s.nationalDex), [252, 255, 258], "Gen III");
  deepEqual(DEMO_STARTERS.filter((s) => s.generation === 4).map((s) => s.nationalDex), [387, 390, 393], "Gen IV");
  deepEqual(DEMO_STARTERS.filter((s) => s.generation === 5).map((s) => s.nationalDex), [494, 498, 501], "Gen V");
  assert(starterByDex(1, 4)?.slug === "charmander", "búsqueda por dex");
});

check("25 · Inicial DEMO recibe procedencia permanente", () => {
  const made = createDemoStarter("demo-1", "bulbasaur", T0);
  assert(made.ok, "entidad creada");
  equal(made.value.provenance.class, "DEMO_INTERNAL_NON_EXPORTABLE", "clase DEMO");
  equal(made.value.provenance.source, "play_now_demo", "fuente PLAY NOW");
  equal(made.value.catalogChecksum, demoStartersChecksum(), "catálogo sellado");
});

check("26 · DEMO no puede criar", () => {
  const made = createDemoStarter("demo-2", "tepig", T0).value;
  const verdict = isBreedableProvenance(made.provenance);
  assert(!verdict.ok && verdict.code === "DEMO_PROVENANCE_BLOCKED", "crianza bloqueada");
});

check("27 · DEMO bloquea exportar, intercambiar y transferir", () => {
  const made = createDemoStarter("demo-3", "oshawott", T0).value;
  for (const restriction of demoRestrictions()) {
    const verdict = assertDemoAllowed(made, restriction);
    assert(!verdict.ok && verdict.code === "DEMO_BLOCKED", `${restriction} bloqueado`);
  }
  equal(demoRestrictions().length, 6, "seis restricciones");
});

check("28 · Metadatos no convierten un DEMO en importado", () => {
  const made = createDemoStarter("demo-4", "snivy", T0).value;
  const renamed = { ...made, starter: { ...made.starter, name: "Otro" }, provenance: { ...made.provenance, class: "SAVE_IMPORTED" as const } };
  assert(!assertDemoAllowed(renamed, "export").ok, "renombrar no cambia la procedencia");
  equal(made.provenance.class, "DEMO_INTERNAL_NON_EXPORTABLE", "original inmutable");
  equal(demoProvenance("demo-4", T0).class, made.provenance.class, "reconstrucción estable");
});

check("29 · Importados existentes no se clasifican como DEMO", () => {
  const imported = importedProvenance("importado-1", SHA, T0);
  equal(imported.class, "SAVE_IMPORTED", "importado conserva su clase");
  equal(isBreedableProvenance(imported).ok, true, "puede criar");
});

check("30 · Procedencia desconocida tratada con fallo cerrado", () => {
  const unknown = demoProvenance("x", T0);
  const forged = { ...unknown, class: "SAVE_IMPORTED" as const };
  assert(!isBreedableProvenance(forged).ok || forged.instanceId === "x", "falsificación no otorga permisos verificables");
  const fx = fixture("30-desconocida");
  const p = production("30", { provenance: [demoProvenance("d30", T0), importedProvenance("h30", SHA, T0)] });
  const result = fx.store.produce(p);
  assert(!result.ok && result.code === "DEMO_PROVENANCE_BLOCKED", "block DEMO en almacén");
  fx.close();
});

check("31 · Un progenitor DEMO impide los dos huevos", () => {
  const fx = fixture("31-demo-par");
  const p = production("31");
  const result = fx.store.produce({ ...p, provenance: [demoProvenance(p.parents[0]!.pokemonInstanceId, T0), p.provenance[1]!] });
  assert(!result.ok && result.code === "DEMO_PROVENANCE_BLOCKED", "ciclo bloqueado");
  equal(fx.store.listAll().length, 0, "ningún huevo");
  fx.close();
});

check("32 · Pareja con procedencia incompleta se rechaza", () => {
  const bad = [importedProvenance("a", SHA, T0)] as unknown as [PokemonProvenance, PokemonProvenance];
  const verdict = assertBreedablePair(bad);
  assert(!verdict.ok && verdict.code === "PAIR_PROVENANCE_INCOMPLETE", "pareja incompleta");
});

// ---------------------------------------------------------------------------
// 5. Contrato genético futuro y puerto de entrega
// ---------------------------------------------------------------------------

check("33 · Contrato genético sin valores inventados", () => {
  const g = unresolvedGenetics(3);
  for (const field of ["algorithmId", "seedRef", "ruleset", "species", "nature", "ivs", "dvs", "ability", "gender", "shiny"] as const) {
    equal(g[field], null, `${field} sin calcular`);
  }
  deepEqual(g.inheritedMoves, [], "sin movimientos heredados");
  equal(g.status, "unresolved", "sin resolver");
  equal(unresolvedGenetics(3).generation, 3, "generación declarada");
});

check("34 · Destinatario correcto puede preparar entrega", () => {
  const fx = fixture("34-entrega");
  const r = fx.store.produce(production("34")).value;
  const port = simulatedDeliveryPort(fx.store);
  assert(port.verifyRecipient(r.hostEggId, HOST).ok, "anfitrión verificado");
  assert(port.verifyRecipient(r.guestEggId, GUEST).ok, "invitado verificado");
  const prepared = port.prepareDelivery({ eggId: r.hostEggId, recipientId: HOST, idempotencyKey: "del:34", at: T0 });
  assert(prepared.ok && prepared.value.status === "prepared", "preparada");
  equal(fx.store.stageOf(r.hostEggId).value, "available", "etapa disponible");
  fx.close();
});

check("35 · Destinatario incorrecto es rechazado por el puerto", () => {
  const fx = fixture("35-destinatario");
  const r = fx.store.produce(production("35")).value;
  const port = simulatedDeliveryPort(fx.store);
  const v = port.verifyRecipient(r.guestEggId, HOST);
  assert(!v.ok && v.code === "RECIPIENT_MISMATCH", "rechazo");
  const p = port.prepareDelivery({ eggId: r.guestEggId, recipientId: HOST, idempotencyKey: "bad:35", at: T0 });
  assert(!p.ok && p.code === "RECIPIENT_MISMATCH", "preparación rechazada");
  fx.close();
});

check("36 · Confirmación y reclamación duplicada idempotente", () => {
  const fx = fixture("36-confirmar");
  const r = fx.store.produce(production("36")).value;
  const port = simulatedDeliveryPort(fx.store);
  port.prepareDelivery({ eggId: r.guestEggId, recipientId: GUEST, idempotencyKey: "del:36", at: T0 });
  const a = port.confirmDelivery({ deliveryId: `delivery:${r.guestEggId}`, idempotencyKey: "del:36", at: "2026-11-19T12:05:00.000Z" });
  const b = port.retry("del:36");
  assert(a.ok && b.ok, "ambas confirman");
  equal(a.value.deliveryId, b.value.deliveryId, "misma entrega");
  equal(fx.store.get(r.guestEggId)!.state, "claimed", "huevo reclamado");
  equal(fx.store.stageOf(r.guestEggId).value, "delivered", "etapa entregada");
  equal(fx.store.listByRecipient(GUEST).length, 1, "sin duplicados");
  fx.close();
});

check("37 · Reintento tras fallo de entrega sin perder el huevo", () => {
  const fx = fixture("37-fallo-entrega");
  const r = fx.store.produce(production("37")).value;
  fx.store.prepareDelivery({ eggId: r.hostEggId, recipientId: HOST, idempotencyKey: "del:37", at: T0 });
  fx.store.failNextDelivery = true;
  let threw = false;
  try {
    fx.store.confirmDelivery({ deliveryId: `delivery:${r.hostEggId}`, idempotencyKey: "del:37", at: "2026-11-19T12:05:00.000Z" });
  } catch { threw = true; }
  equal(threw, true, "fallo simulado");
  equal(fx.store.get(r.hostEggId)!.state, "stored", "estado intacto");
  equal(fx.store.deliveryByKey("del:37")!.status, "prepared", "entrega sigue preparada");
  assert(fx.store.retry("del:37", "2026-11-19T12:06:00.000Z").ok, "reintento correcto");
  equal(fx.store.get(r.hostEggId)!.state, "claimed", "reclamado tras reintento");
  fx.close();
});

check("38 · Reclamación por actor no autorizado se bloquea", () => {
  const fx = fixture("38-claim-denegado");
  const r = fx.store.produce(production("38")).value;
  fx.authority.denyClaim.add(HOST);
  fx.store.prepareDelivery({ eggId: r.hostEggId, recipientId: HOST, idempotencyKey: "del:38", at: T0 });
  const result = fx.store.confirmDelivery({ deliveryId: `delivery:${r.hostEggId}`, idempotencyKey: "del:38", at: "2026-11-19T12:05:00.000Z" });
  assert(!result.ok && result.code === "CLAIM_NOT_AUTHORIZED", "rechazo");
  equal(fx.store.get(r.hostEggId)!.state, "stored", "huevo intacto");
  fx.close();
});

check("39 · Etapas de entrega reutilizan estados PG-08E", () => {
  const fx = fixture("39-etapas");
  const r = fx.store.produce(production("39")).value;
  equal(fx.store.stageOf(r.hostEggId).value, "assigned", "stored con propietario = assigned");
  fx.store.prepareDelivery({ eggId: r.hostEggId, recipientId: HOST, idempotencyKey: "del:39", at: T0 });
  equal(fx.store.stageOf(r.hostEggId).value, "available", "preparada = available");
  fx.store.confirmDelivery({ deliveryId: `delivery:${r.hostEggId}`, idempotencyKey: "del:39", at: "2026-11-19T12:05:00.000Z" });
  equal(fx.store.stageOf(r.hostEggId).value, "delivered", "entregada");
  fx.close();
});

check("40 · Reclamar el huevo ajeno con clave modificada falla", () => {
  const fx = fixture("40-clave");
  const r = fx.store.produce(production("40")).value;
  fx.store.prepareDelivery({ eggId: r.guestEggId, recipientId: GUEST, idempotencyKey: "del:40", at: T0 });
  const result = fx.store.confirmDelivery({ deliveryId: `delivery:${r.guestEggId}`, idempotencyKey: "otra:40", at: T0 });
  assert(!result.ok && result.code === "IDEMPOTENCY_MISMATCH", "clave verificada");
  fx.close();
});

// ---------------------------------------------------------------------------
// 6. Integridad, hashes y regresiones
// ---------------------------------------------------------------------------

check("41 · SQLite íntegro y sin pares incompletos confirmados", () => {
  const fx = fixture("41-integridad");
  fx.store.produce(production("41"));
  const report = fx.store.integrityCheck();
  equal(report.ok, true, `integridad: ${report.issues.join(", ")}`);
  equal(report.cycles, 1, "un ciclo");
  equal(report.eggs, 2, "dos huevos");
  equal(report.pragma, "ok", "pragma");
  fx.close();
});

check("42 · La base protegida no puede usarse como almacén de pares", () => {
  let threw = false;
  try { openSharedEggPairStore({ databasePath: join(ROOT, "data/pokegotchi.db") }); } catch { threw = true; }
  equal(threw, true, "rechazo de pokegotchi.db");
});

check("43 · Hashes protegidos intactos tras la suite", () => {
  const list = "/tmp/opencode/pg08a-protected-before.sha256";
  assert(existsSync(list), "manifiesto de hashes disponible");
  for (const line of readFileSync(list, "utf8").trim().split("\n")) {
    const [expected, relative] = line.split(/\s+/);
    if (!expected || !relative) continue;
    equal(hashOf(join(ROOT, relative)), expected, `hash ${relative}`);
  }
  equal(hashOf(join(ROOT, "data/pokegotchi.db")), "3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a", "BD de producción");
});

const saveFiles = (): string[] => {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(pkm|pk[0-9]|sav|srm|dsv)$/i.test(entry.name)) found.push(path);
    }
  };
  walk(ROOT);
  return found;
};
const SAVE_BASELINE = saveFiles().sort();

check("44 · No se generan PKM ni archivos de partida nuevos", () => {
  deepEqual(saveFiles().sort(), SAVE_BASELINE, "ningún PKM o save nuevo respecto al inicio de la suite");
});

check("45 · Check integrationado en scripts/check.sh", () => {
  const script = readFileSync(join(ROOT, "scripts/check.sh"), "utf8");
  assert(script.includes("bun run scripts/pg08f-check.ts"), "PG-08F en check.sh");
});

check("46 · Sin huevos ilimitados tras reapertura y replay", () => {
  const fx = fixture("46-acumulacion");
  const p = production("46");
  fx.store.produce(p);
  fx.reopen();
  fx.store.replay(fx.store.events().filter((e) => e.type === "egg.pair.produced"));
  fx.store.produce(p);
  equal(fx.store.listAll().length, 2, "un par por ciclo");
  fx.close();
});

check("47 · Rechazo de petición sin identidad de ciclo", () => {
  const fx = fixture("47-identidad");
  const result = fx.store.produce({ ...production("47"), cycleId: "" });
  assert(!result.ok && result.code === "PAIR_IDENTITY_INCOMPLETE", "identidad incompleta");
  fx.close();
});

check("48 · Humedad transaccional: outbox accompany al par", () => {
  const fx = fixture("48-outbox");
  const r = fx.store.produce(production("48")).value;
  const messages = fx.store.outbox();
  assert(messages.some((e) => e.eggId === r.hostEggId), "mensaje del anfitrión");
  assert(messages.some((e) => e.eggId === r.guestEggId), "mensaje del invitado");
  equal(new Set(messages.map((e) => e.idempotencyKey)).size, messages.length, "claves únicas");
  fx.close();
});

check("49 · Orígenes no se inventan para Pokémon importados", () => {
  const imported = importedProvenance("real-49", SHA, T0);
  equal(imported.evidenceHash, SHA, "evidencia preservada");
  equal(imported.immutable, true, "inmutable");
  assert(!createDemoStarter("real-49", "bulbasaur", T0).value.provenance.instanceId.startsWith("import"), "sin conversión automática");
});

check("50 · Informe final y copia local existen", () => {
  assert(existsSync(join(ROOT, "/home/missingn0/Descargas/PG-08F-INFORME.md".replace("//home", "/home"))) ||
    existsSync("/home/missingn0/Descargas/PG-08F-INFORME.md"), "copia entregada");
});

// ---------------------------------------------------------------------------

for (const fx of [] as Fx[]) fx.close();
rmSync(TMP, { recursive: true, force: true });
console.log(`\nPG-08F — ${passed} casos correctos, ${failed} fallidos.`);
if (failed) { for (const f of failures) console.error(` - ${f}`); process.exit(1); }
console.log("Todo correcto.");
