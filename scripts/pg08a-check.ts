/**
 * PG-08A — contratos aislados de Guarderías Compartidas.
 *
 * NUNCA toca producción: el módulo bajo prueba es TS puro, sin SQLite, HTTP,
 * sistema de archivos ni reloj propio. La base real solo se LEE para comprobar
 * que su hash no cambia durante la suite.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CONTRACT_VERSION,
  NURSERY_CAPACITY,
  PERMISSIONS,
  SCHEMA_ID,
  SUPPORTED_GENERATIONS,
  createNurserySystem,
  deriveNurseryState,
  isAdmittable,
  isGenerationSupported,
  newId,
  validateNursery,
  validateOwner,
  validatePokemonRef,
  validateRecoveryVoucher,
  validateStay,
  validateSyncEvent,
} from "../packages/core/src/shared-nurseries.ts";

const ROOT = resolve(import.meta.dir, "..");
const T0 = "2026-11-19T12:00:00.000Z";
const sha = (seed: string) => createHash("sha256").update(seed).digest("hex");
const at = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();

let checks = 0;
let failures = 0;
function ok(condition: unknown, message: string) {
  checks++;
  if (!condition) {
    failures++;
    console.error(`  ✗ ${message}`);
  }
}
function eq(actual: unknown, expected: unknown, message: string) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), `${message} (real=${JSON.stringify(actual)}, esperado=${JSON.stringify(expected)})`);
}
function code(result: { ok: boolean; error?: { code?: string } } | null, expected: string, message: string) {
  ok(!!result && !result.ok && result.error?.code === expected, `${message} (esperado ${expected}, real ${JSON.stringify(result)})`);
}

function makeOwner(name: string) {
  return { schema: SCHEMA_ID, version: CONTRACT_VERSION, id: newId() as any, displayName: name, createdAt: T0 } as const;
}
function makeNursery(hostId: string, over: Record<string, unknown> = {}) {
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION, id: newId() as any, hostId: hostId as any,
    visibility: "public", admission: "open", connectivity: "connected", state: "available",
    unavailable: false, syncError: false, recoveryPending: false, capacity: NURSERY_CAPACITY,
    revision: 0, createdAt: T0, ...over,
  } as any;
}
function makePokemon(seed: string, generation: number, verdict: string, over: Record<string, unknown> = {}) {
  const origin = generation <= 2
    ? { kind: "gen1_2", saveSha256: sha(seed), generation, species: 25, location: 0, box: 1, slot: 1 }
    : { kind: "gen3_5", saveSha256: sha(seed), generation, species: 25, pid: 12345 };
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION, instanceId: newId() as any, origin,
    dataSha256: sha(`${seed}-data`), verdict, capturedAt: T0, ...over,
  } as any;
}
function makeDeposit(nursery: any, owner: any, mon: any, seed: string, over: Record<string, unknown> = {}) {
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION, id: newId() as any,
    nurseryId: nursery.id, ownerId: owner.id, pokemonId: mon.instanceId,
    requestedAt: T0, idempotencyKey: `dep-${seed}`, ...over,
  } as any;
}
function makeRecovery(stay: any, owner: any, hostConnected: boolean, seed: string, over: Record<string, unknown> = {}) {
  return {
    schema: SCHEMA_ID, version: CONTRACT_VERSION, id: newId() as any,
    stayId: stay.id, ownerId: owner.id, requestedAt: T0, idempotencyKey: `rec-${seed}`,
    hostConnected, reason: hostConnected ? "owner_request" : "host_offline", ...over,
  } as any;
}

type Fixture = ReturnType<typeof fixture>;
function fixture(nurseryOver: Record<string, unknown> = {}) {
  const sys = createNurserySystem();
  const host = makeOwner("Anfitrión");
  const visitor = makeOwner("Visitante");
  const other = makeOwner("Otro");
  const nursery = makeNursery(host.id, nurseryOver);
  const legal = makePokemon("legal", 4, "legal");
  const unverified = makePokemon("unverified", 2, "unverified");
  const illegal = makePokemon("illegal", 5, "illegal");
  for (const [i, o] of [host, visitor, other].entries()) {
    ok(sys.registerOwner({ ...o, idempotencyKey: `owner-${i}-reg` }).ok, `registra propietario ${o.displayName}`);
  }
  ok(sys.registerNursery({ ...nursery, idempotencyKey: "nursery-1" }).ok, "registra guardería");
  ok(sys.registerPokemon({ ...legal, idempotencyKey: "poke-legal" }).ok, "registra Pokémon legal");
  ok(sys.registerPokemon({ ...unverified, idempotencyKey: "poke-unverified" }).ok, "registra Pokémon no verificable");
  return { sys, host, visitor, other, nursery, legal, unverified, illegal };
}
function depositMon(f: Fixture, mon: any, owner: any, seed: string, opts: { accept?: boolean; expectedRevision?: number } = {}) {
  const req = makeDeposit(f.nursery, owner, mon, seed);
  const request = f.sys.requestDeposit(req);
  if (!request.ok || opts.accept === false) return { request, accept: null as any };
  const revision = opts.expectedRevision ?? f.sys.getNursery(f.nursery.id)!.revision;
  const accept = f.sys.acceptDeposit({ idempotencyKey: `accept-${seed}`, requestId: req.id, expectedNurseryRevision: revision });
  return { request, accept };
}

const productionHashBefore = sha(readFileSync(resolve(ROOT, "data/pokegotchi.db")));

// --- 1. Propietario válido -------------------------------------------------
{
  const f = fixture();
  ok(validateOwner(f.visitor).ok, "validación estricta de propietario válido");
  ok(f.sys.getOwner(f.visitor.id)?.displayName === "Visitante", "el propietario registrado se conserva");
  eq(f.sys.snapshot().owners.length, 3, "tres propietarios registrados");
}

// --- 2. Propietario incorrecto ---------------------------------------------
{
  const f = fixture();
  const { accept } = depositMon(f, f.legal, f.visitor, "wrong-owner");
  ok(accept.ok, "depósito previo aceptado");
  const stay = accept.value;
  code(f.sys.requestRecovery(makeRecovery(stay, f.host, true, "wrong")), "OWNER_MISMATCH", "el anfitrión no puede recuperar");
  code(f.sys.grantPermission({ idempotencyKey: "wrong-grant", stayId: stay.id, ownerId: f.host.id, permission: "allow_ev_berries", consentKey: "consent-wrong01" }), "OWNER_MISMATCH", "el anfitrión no puede conceder permisos");
  code(f.sys.revokePermission({ idempotencyKey: "wrong-revoke", stayId: stay.id, ownerId: f.other.id, permission: "allow_ev_berries" }), "OWNER_MISMATCH", "un tercero no puede revocar");
}

// --- 3. Capacidad máxima de dos Pokémon ------------------------------------
{
  const f = fixture();
  const a = depositMon(f, f.legal, f.visitor, "cap-1");
  const b = depositMon(f, f.unverified, f.visitor, "cap-2");
  ok(a.accept.ok && b.accept.ok, "dos depósitos aceptados");
  eq(f.sys.snapshot().hosted.length, 2, "exactamente dos alojamientos");
  eq(f.sys.getNursery(f.nursery.id)!.state, "full", "estado derivado full");
  eq(NURSERY_CAPACITY, 2, "capacidad declarada dos");
  eq(validateNursery(f.sys.getNursery(f.nursery.id)).ok, true, "la guardería sigue siendo válida");
}

// --- 4. Intento de tercer depósito -----------------------------------------
{
  const f = fixture();
  depositMon(f, f.legal, f.visitor, "third-1");
  depositMon(f, f.unverified, f.visitor, "third-2");
  const third = makePokemon("third", 3, "legal");
  ok(f.sys.registerPokemon({ ...third, idempotencyKey: "poke-third" }).ok, "tercer Pokémon registrado");
  const c = depositMon(f, third, f.visitor, "third-3");
  code(c.accept, "NURSERY_FULL", "tercer depósito rechazado por capacidad");
  eq(f.sys.snapshot().hosted.length, 2, "el rechazo no añade alojamiento");
}

// --- 5. Permisos desactivados por defecto ----------------------------------
{
  const f = fixture();
  const { accept } = depositMon(f, f.legal, f.visitor, "perms-off");
  eq(Object.fromEntries(PERMISSIONS.map((p) => [p, accept.value.permissions[p]])),
    Object.fromEntries(PERMISSIONS.map((p) => [p, null])), "los tres permisos nacen null");
  ok(validateStay(accept.value).ok, "la estancia con permisos null es válida");
  code(f.sys.applyEvBerries({ idempotencyKey: "berries-off", stayId: accept.value.id, actorId: f.host.id }), "CONSENT_REQUIRED", "bayas EV sin consentimiento");
  code(f.sys.applyEvMinigame({ idempotencyKey: "mini-off", stayId: accept.value.id, actorId: f.host.id }), "CONSENT_REQUIRED", "minijuegos EV sin consentimiento");
  code(f.sys.requestBreeding({ idempotencyKey: "breed-off", stayId: accept.value.id, actorId: f.host.id }), "CONSENT_REQUIRED", "breeding sin consentimiento");
}

// --- 6. Consentimiento explícito -------------------------------------------
{
  const f = fixture();
  const { accept } = depositMon(f, f.legal, f.visitor, "consent");
  const stay = accept.value;
  code(f.sys.grantPermission({ idempotencyKey: "bad-consent", stayId: stay.id, ownerId: f.visitor.id, permission: "allow_ev_berries", consentKey: "x" }), "CONSENT_REQUIRED", "clave de consentimiento inválida");
  const grant = f.sys.grantPermission({ idempotencyKey: "good-consent", stayId: stay.id, ownerId: f.visitor.id, permission: "allow_ev_berries", consentKey: "consent-berries-01", expectedRevision: stay.revision });
  ok(grant.ok, "el propietario concede el permiso");
  ok(f.sys.applyEvBerries({ idempotencyKey: "berries-ok", stayId: stay.id, actorId: f.host.id }).ok, "el anfitrión aplica bayas con consentimiento");
  ok(f.sys.getStay(stay.id)!.permissions.allow_ev_berries?.revokedAt === null, "el permiso queda vigente");
  eq(f.sys.getStay(stay.id)!.permissions.allow_ev_minigames, null, "los permisos son independientes");
}

// --- 7. Revocación ---------------------------------------------------------
{
  const f = fixture();
  const { accept } = depositMon(f, f.legal, f.visitor, "revoke");
  const stay = accept.value;
  ok(f.sys.grantPermission({ idempotencyKey: "grant-rev", stayId: stay.id, ownerId: f.visitor.id, permission: "allow_ev_minigames", consentKey: "consent-mini-001" }).ok, "permiso concedido");
  const revoked = f.sys.revokePermission({ idempotencyKey: "revoke-1", stayId: stay.id, ownerId: f.visitor.id, permission: "allow_ev_minigames" });
  ok(revoked.ok, "el propietario revoca");
  code(f.sys.applyEvMinigame({ idempotencyKey: "mini-revoked", stayId: stay.id, actorId: f.host.id }), "PERMISSION_REVOKED", "la revocación bloquea nuevas operaciones");
  code(f.sys.revokePermission({ idempotencyKey: "revoke-2", stayId: stay.id, ownerId: f.visitor.id, permission: "allow_ev_minigames" }), "PERMISSION_REVOKED", "revocar dos veces se rechaza");
  ok(f.sys.care({ idempotencyKey: "care-still", stayId: stay.id, actorId: f.host.id, action: "feed" }).ok, "el cuidado normal sigue permitido");
}

// --- 8. Recuperación por propietario ---------------------------------------
{
  const f = fixture();
  const { accept } = depositMon(f, f.legal, f.visitor, "recover");
  const stay = accept.value;
  const req = f.sys.requestRecovery(makeRecovery(stay, f.visitor, true, "recover"));
  ok(req.ok, "el propietario solicita la recuperación");
  ok(validateRecoveryVoucher(req.value.voucher).ok, "el vale es válido");
  const done = f.sys.completeRecovery({ idempotencyKey: "complete-recover", voucher: req.value.voucher });
  ok(done.ok, "la retirada se completa");
  eq(done.value.state, "stay_finished", "la estancia finaliza");
  eq(f.sys.snapshot().hosted.length, 0, "el alojamiento se libera");
  eq(f.sys.getNursery(f.nursery.id)!.state, "available", "la guardería vuelve a estar disponible");
}

// --- 9. Recuperación con anfitrión offline ---------------------------------
{
  const f = fixture();
  const { accept } = depositMon(f, f.legal, f.visitor, "offline");
  const stay = accept.value;
  ok(f.sys.setConnectivity({ idempotencyKey: "offline-conn", nurseryId: f.nursery.id, connectivity: "disconnected" }).ok, "anfitrión desconectado");
  const req = f.sys.requestRecovery(makeRecovery(stay, f.visitor, false, "offline"));
  ok(req.ok, "la recuperación se solicita con el anfitrión offline");
  ok(f.sys.getStay(stay.id)!.hostOfflineNoted === true, "se registra que el anfitrión estaba offline");
  ok(f.sys.completeRecovery({ idempotencyKey: "complete-offline", voucher: req.value.voucher, at: at(60000) }).ok, "la retirada offline se completa");
  eq(f.sys.getStay(stay.id)!.state, "stay_finished", "estado final tras retirada offline");
}

// --- 10. Solicitudes duplicadas --------------------------------------------
{
  const f = fixture();
  const req = makeDeposit(f.nursery, f.visitor, f.legal, "dupok");
  const first = f.sys.requestDeposit(req);
  const repeated = f.sys.requestDeposit({ ...req, idempotencyKey: req.idempotencyKey });
  ok(first.ok && repeated.ok, "la repetición con la misma clave es idempotente");
  eq(first.eventId, repeated.eventId, "se devuelve el mismo evento");
  const sameId = f.sys.requestDeposit({ ...req, idempotencyKey: "dup-otra-clave" });
  code(sameId, "DUPLICATE_REQUEST", "otra clave con el mismo ID se rechaza");
  const acc1 = f.sys.acceptDeposit({ idempotencyKey: "accept-dup", requestId: req.id });
  const acc2 = f.sys.acceptDeposit({ idempotencyKey: "accept-dup", requestId: req.id });
  ok(acc1.ok && acc2.ok, "aceptar dos veces con la misma clave es idempotente");
  eq(acc1.eventId, acc2.eventId, "misma clave de aceptación, mismo evento");
}

// --- 11. Operaciones concurrentes simuladas --------------------------------
{
  const f = fixture();
  const r1 = makeDeposit(f.nursery, f.visitor, f.legal, "race-1");
  const mon2 = makePokemon("race2", 4, "legal");
  ok(f.sys.registerPokemon({ ...mon2, idempotencyKey: "poke-race2" }).ok, "segundo Pokémon registrado");
  const r2 = makeDeposit(f.nursery, f.visitor, mon2, "race-2");
  ok(f.sys.requestDeposit(r1).ok && f.sys.requestDeposit(r2).ok, "dos solicitudes pendientes");
  const revision = f.sys.getNursery(f.nursery.id)!.revision;
  const a = f.sys.acceptDeposit({ idempotencyKey: "race-a", requestId: r1.id, expectedNurseryRevision: revision });
  const b = f.sys.acceptDeposit({ idempotencyKey: "race-b", requestId: r2.id, expectedNurseryRevision: revision });
  const oks = [a, b].filter((r) => r.ok);
  eq(oks.length, 1, "solo una de dos aceptaciones concurrentes gana");
  const stale = [a, b].find((r) => !r.ok);
  eq(stale && !stale.ok ? stale.error.code : null, "STALE_REVISION", "la otra detecta revisión obsoleta");
  eq(f.sys.snapshot().hosted.length, 1, "no se supera la capacidad");
}

// --- 12. Identificadores inválidos -----------------------------------------
{
  const f = fixture();
  const bad = { ...f.visitor, id: "no-uuid" as any };
  ok(!validateOwner(bad).ok, "validador rechaza ID no UUID");
  ok(!validatePokemonRef({ ...f.legal, instanceId: "../secreto" }).ok, "validador rechaza instanceId inválido");
  const badReq = f.sys.requestDeposit(makeDeposit(f.nursery, f.visitor, f.legal, "bad-id", { id: "no-uuid" }));
  code(badReq, "INVALID_INPUT", "la operación rechaza solicitudes con ID inválido");
  const acceptBad = f.sys.acceptDeposit({ idempotencyKey: "accept-bad-id", requestId: "no-uuid" as any });
  code(acceptBad, "INVALID_INPUT", "acceptDeposit rechaza requestId inválido (corrección PG-08A)");
  ok(!validateSyncEvent({ ...f.sys.exportEvents()[0], eventId: "no-uuid" }).ok, "validador rechaza evento con ID inválido");
}

// --- 13. Estados inconsistentes --------------------------------------------
{
  const f = fixture();
  ok(f.sys.setNurseryFlag({ idempotencyKey: "flag-unavail", nurseryId: f.nursery.id, flag: "unavailable", value: true }).ok, "marca guardería no disponible");
  eq(f.sys.getNursery(f.nursery.id)!.state, "unavailable", "estado derivado unavailable");
  code(f.sys.requestDeposit(makeDeposit(f.nursery, f.visitor, f.legal, "unavail")), "NURSERY_NOT_AVAILABLE", "no acepta depósitos si no está disponible");
  ok(f.sys.setNurseryFlag({ idempotencyKey: "flag-unavail-off", nurseryId: f.nursery.id, flag: "unavailable", value: false }).ok, "restaura disponibilidad");
  ok(f.sys.setConnectivity({ idempotencyKey: "flag-disc", nurseryId: f.nursery.id, connectivity: "disconnected" }).ok, "desconecta");
  eq(f.sys.getNursery(f.nursery.id)!.state, "disconnected", "estado derivado disconnected");
  eq(deriveNurseryState({ ...f.nursery, syncError: true }, 0), "sync_error", "syncError prevalece");
  eq(deriveNurseryState(f.nursery, 3), "sync_error", "más de dos ocupantes es inconsistente");
}

// --- 14. Repetición de mensajes / replay -----------------------------------
{
  const f = fixture();
  const { accept } = depositMon(f, f.legal, f.visitor, "replay");
  const stay = accept.value;
  ok(f.sys.grantPermission({ idempotencyKey: "grant-replay", stayId: stay.id, ownerId: f.visitor.id, permission: "allow_ev_berries", consentKey: "consent-replay-01" }).ok, "permiso concedido");
  const log = f.sys.exportEvents();
  ok(log.every((e) => e.sequence >= 1 && validateSyncEvent(e).ok), "todos los eventos son válidos y están secuenciados");
  const restored = createNurserySystem(log);
  eq(restored.snapshot().stays.length, 1, "el replay reconstruye la estancia");
  eq(restored.getStay(stay.id)!.permissions.allow_ev_berries?.consentKey, "consent-replay-01", "el replay conserva el permiso");
  eq(restored.snapshot().eventCount, log.length, "el replay conserva el número de eventos");
  eq(restored.snapshot().requests.length, 0, "el replay consume la solicitud aceptada");
  eq(restored.snapshot().hosted.length, 1, "el replay reconstruye el alojamiento");
  const repeated = restored.requestDeposit(makeDeposit(f.nursery, f.visitor, f.legal, "replay"));
  ok(repeated.ok, "la repetición con la misma clave sigue siendo idempotente tras reiniciar");
  eq(repeated.eventId, log.find((e) => e.type === "deposit.requested")!.eventId, "se reutiliza el evento original");
}

// --- 15. Guardería privada -------------------------------------------------
{
  const f = fixture({ visibility: "private" });
  code(depositMon(f, f.legal, f.visitor, "private-visitor").request, "UNAUTHORIZED", "un visitante no ve una guardería privada");
  const own = depositMon(f, f.legal, f.host, "private-host");
  ok(own.request.ok && own.accept.ok, "el anfitrión sí puede depositar en su guardería privada");
  eq(own.accept.value.ownershipRelation, "own", "relación own");
}

// --- 16. Pública sin aceptación automática ---------------------------------
{
  const f = fixture({ visibility: "public", admission: "open" });
  const { request, accept } = depositMon(f, f.legal, f.visitor, "public-auto", { accept: false });
  ok(request.ok, "la solicitud pública se registra");
  eq(accept, null, "no se acepta automáticamente");
  eq(f.sys.snapshot().stays.length, 0, "no existe estancia todavía");
  eq(f.sys.snapshot().requests.length, 1, "queda una solicitud pendiente");
  const accepted = f.sys.acceptDeposit({ idempotencyKey: "accept-public", requestId: request.value.id });
  ok(accepted.ok, "el anfitrión acepta explícitamente");
  eq(accepted.value.ownershipRelation, "visitor", "relación visitor");
  const closed = fixture({ admission: "closed" });
  code(closed.sys.requestDeposit(makeDeposit(closed.nursery, closed.visitor, closed.legal, "closed")), "NURSERY_NOT_AVAILABLE", "admisión cerrada rechaza solicitudes");
}

// --- 17. Pokémon sin legalidad verificada ----------------------------------
{
  const f = fixture();
  ok(isAdmittable(f.legal) && isAdmittable(f.unverified), "legal y no verificable son admisibles");
  eq(isAdmittable(f.illegal), false, "ilegal no es admisible");
  code(f.sys.registerPokemon({ ...f.illegal, idempotencyKey: "poke-illegal" }), "ILLEGAL_POKEMON", "no se registra un Pokémon ilegal");
  const { accept } = depositMon(f, f.unverified, f.visitor, "unverified");
  ok(accept.ok, "un Pokémon no verificable sí se aloja");
}

// --- 18. Compatibilidad generacional ---------------------------------------
{
  for (const gen of [1, 2, 3, 4, 5]) {
    ok(isGenerationSupported(gen), `Gen ${gen} soportada`);
    const f = fixture();
    const mon = makePokemon(`gen${gen}`, gen, "legal");
    ok(validatePokemonRef(mon).ok, `Gen ${gen}: referencia válida`);
    ok(f.sys.registerPokemon({ ...mon, idempotencyKey: `poke-gen${gen}` }).ok, `Gen ${gen}: registro aceptado`);
    const { accept } = depositMon(f, mon, f.visitor, `gen${gen}`);
    ok(accept.ok, `Gen ${gen}: depósito aceptado`);
    ok(validateStay(accept.value).ok, `Gen ${gen}: estancia válida`);
  }
  eq(isGenerationSupported(6), false, "Gen 6 fuera de alcance");
  ok(!validatePokemonRef(makePokemon("gen6", 6, "legal")).ok, "referencia Gen 6 rechazada");
  ok(!validatePokemonRef(makePokemon("bad12", 1, "legal", { origin: { kind: "gen1_2", saveSha256: sha("x"), generation: 1, species: 25, location: 0, box: 0, slot: 1 } })).ok, "Gen 1/2 exige ranura válida");
  eq([...SUPPORTED_GENERATIONS], [1, 2, 3, 4, 5], "catálogo de generaciones exacto");
}

// --- 19. Separación de datos locales y compartidos -------------------------
{
  const f = fixture();
  const { accept } = depositMon(f, f.legal, f.visitor, "separation");
  const stay = accept.value;
  const before = JSON.stringify(stay.pokemon);
  ok(f.sys.care({ idempotencyKey: "care-1", stayId: stay.id, actorId: f.host.id, action: "feed" }).ok, "cuidado registrado");
  ok(f.sys.care({ idempotencyKey: "care-2", stayId: stay.id, actorId: f.host.id, action: "clean" }).ok, "otro cuidado registrado");
  eq(JSON.stringify(f.sys.getStay(stay.id)!.pokemon), before, "los datos del Pokémon NO se modifican");
  const ops = f.sys.publicOperations as readonly string[];
  // `exportEvents` solo vuelca el registro de auditoría en memoria; NO exporta
  // un Pokémon ni escribe un save. El resto de verbos están prohibidos.
  const forbiddenOps = ["export", "exportpokemon", "exportsave", "delete", "deletepet", "removepet", "transfer", "transferpokemon", "changeowner", "setowner"];
  for (const forbidden of forbiddenOps) {
    ok(!ops.some((op) => op.toLowerCase() === forbidden), `sin operación pública ${forbidden}`);
  }
  ok(ops.includes("exportEvents"), "exportEvents queda disponible solo como auditoría del registro");
  eq(ops.length, 19, "superficie pública acotada a 19 operaciones");
  const source = readFileSync(resolve(ROOT, "packages/core/src/shared-nurseries.ts"), "utf8");
  for (const forbidden of ["bun:sqlite", "node:fs", "fetch(", "data/pokegotchi.db", "pet-engine"]) {
    ok(!source.includes(forbidden), `el módulo no depende de ${forbidden}`);
  }
}

// --- 20. Ausencia de escritura en producción -------------------------------
{
  eq(sha(readFileSync(resolve(ROOT, "data/pokegotchi.db"))), productionHashBefore, "la BD real no cambió durante la suite");
  const checkSh = readFileSync(resolve(ROOT, "scripts/check.sh"), "utf8");
  ok(checkSh.includes("pg08a-check"), "la suite está integrada en check.sh");
  ok(readFileSync(resolve(ROOT, "apps/web/src/pet-engine.ts"), "utf8").includes("export function train"), "el motor PG-07 permanece intacto y separado");
  const pkg = readFileSync(resolve(ROOT, "package.json"), "utf8");
  ok(!pkg.includes("pg08a-apply"), "no existe ejecutor de escritura PG-08A");
}

console.log(`PG-08A: ${checks - failures}/${checks} comprobaciones correctas.`);
if (failures > 0) process.exitCode = 1;
