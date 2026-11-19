/**
 * PG-07G — comprobaciones headless del reanálisis seguro.
 *
 * No abre la base de producción, no importa `db.ts`, no usa las rutas de
 * reparseo y no escribe en fixtures. Toda escritura ocurre en DB sintéticas
 * bajo /tmp/opencode.
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  analyzeDatabase,
  applyDatabase,
  assertWritableTarget,
  canonical,
  compareInventories,
  PRODUCTION_DB,
  resolveSource,
} from "./pg07g-reanalyze.ts";

const ROOT = resolve(import.meta.dir, "..");
const TMP = "/tmp/opencode/pg07g-check";
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

function sha(s: Uint8Array | string) {
  return createHash("sha256").update(s).digest("hex");
}

function readSha(path: string) {
  return sha(readFileSync(path));
}

const FIXTURES = [
  "gen1-blue-spain.srm",
  "gen1-blue-usa.srm",
  "gen2-crystalclear-hack.srm",
  "gen2-polished-hack.srm",
  "gen3-allin-hack.srm",
  "gen4-heartgold-spain.srm",
  "gen5-black-usa.srm",
  "FIXTURES.md",
];
const fixtureHashesBefore = new Map(FIXTURES.map((f) => [f, readSha(join(ROOT, "fixtures", f))]));

const BACKUP = "/home/missingn0/Descargas/PG-07G-BACKUP/20261119T094717Z/pokegotchi.db";
ok(existsSync(BACKUP), "existe el backup verificado PG-07G");

const src = new Database(BACKUP, { readonly: true });
const legacyRows = src.query("SELECT id, sha256, filename, stored_path, generation, box_count, inventory_json, legal_count, unverified_count, illegal_count FROM saves ORDER BY id").all() as any[];
src.close();
ok(legacyRows.length === 2, "el backup contiene exactamente dos partidas");
const row4 = legacyRows.find((r) => r.generation === 4)!;
const row1 = legacyRows.find((r) => r.generation === 1)!;
ok(!!row4 && !!row1, "hay fixtures reales de Gen 4 y Gen 1");
const legacy4 = JSON.parse(row4.inventory_json);
const legacy1 = JSON.parse(row1.inventory_json);

// --- 1, 11, 12, 13, 14: contrato antiguo y comparación --------------------
ok(!("storage" in legacy4), "inventario antiguo de Gen 4 no tiene storage");
ok(!("storage" in legacy1), "inventario antiguo de Gen 1 no tiene storage");
const resolved4 = resolveSource(row4, PRODUCTION_DB);
ok(resolved4.shaMatches === true, "resuelve la copia hash-named de Gen 4");
ok(resolved4.path?.endsWith(row4.sha256 + ".srm"), "la fuente resuelta usa el SHA-256 real");
const resolvedMissing = resolveSource({ ...row4, sha256: "f".repeat(64) } as any, PRODUCTION_DB);
ok(resolvedMissing.path === null, "no fabrica fuente para un hash ausente");

// Contrato sintético ya actualizado (idempotencia de forma).
const updated4 = { ...legacy4, storage: { available: true, availability: "available", boxCount: 18, slotCount: 30, namesAvailable: true, emptySlotsKnown: true } };
ok(!!updated4.storage, "inventario actualizado sintético contiene storage");

// Inventario incompleto y detección de cambios inesperados.
const incompleteCompare = compareInventories({ ...legacy1, counts: undefined }, { ...legacy1, counts: { total: 5 } });
ok(incompleteCompare.unexpected.some((s) => s.includes("counts")), "detecta cambios inesperados en counts");

const modernCompare = compareInventories(legacy4, {
  ...legacy4,
  boxes: legacy4.boxes.map((b: any) => ({ ...b, positions: b.slots.map((p: any, i: number) => ({ slot: i + 1, occupied: true, pokemon: p })) })),
  storage: { available: true, availability: "available", boxCount: 18, slotCount: 30, namesAvailable: true, emptySlotsKnown: true },
});
ok(modernCompare.unexpected.length === 0, "la comparación sintética PG-07F no tiene cambios inesperados");
ok(modernCompare.legalChanged.length === 0, "la comparación sintética no cambia legalidad");
const dropped = compareInventories(legacy4, { ...legacy4, boxes: legacy4.boxes.slice(0, -1) });
ok(dropped.unexpected.some((s) => s.includes("pérdida")), "detecta pérdida de cajas");
const changedPid = compareInventories(legacy4, { ...legacy4, boxes: legacy4.boxes.map((b: any, i: number) => i === 0 ? { ...b, slots: b.slots.map((p: any, j: number) => j === 0 ? { ...p, pid: 1 } : p) } : b) });
ok(changedPid.legalChanged.length > 0, "detecta alteración de PID como cambio de legalidad");
const addedBoxField = compareInventories(legacy4, { ...legacy4, boxes: legacy4.boxes.map((b: any) => ({ ...b, slots: b.slots.map((p: any) => ({ ...p, box: b.index })) })) });
ok(addedBoxField.unexpected.length === 0, "acepta el campo nuevo `box` de PG-07F");
const roundTripChanged = compareInventories(legacy4, { ...legacy4, roundTrip: { ...legacy4.roundTrip, outputSha256: "distinto" } });
ok(roundTripChanged.unexpected.some((s) => s.includes("roundTrip")), "rechaza salida canónica distinta");

// --- Canonicalización y campo volátil ------------------------------------
eq(canonical({ b: 1, a: [2, { d: 4, c: 3 }] }), { a: [2, { c: 3, d: 4 }], b: 1 }, "canonical ordena claves de forma estable");
const refCompare = compareInventories({ ...legacy1, party: legacy1.party.map((p: any) => ({ ...p, ref: { old: true } })) }, { ...legacy1, party: legacy1.party.map((p: any) => ({ ...p, ref: { location: "party", slot: 1 } })) });
ok(refCompare.unexpected.length === 0, "ignora `ref` como campo volátil nuevo");

// --- DB sintéticas y clasificaciones -------------------------------------
function createDb(name: string, rows: any[], withTrigger = false) {
  const path = join(TMP, `${name}-${process.pid}.db`);
  if (existsSync(path)) unlinkSync(path);
  const db = new Database(path);
  db.exec(`
    CREATE TABLE saves (id INTEGER PRIMARY KEY, sha256 TEXT UNIQUE, filename TEXT, stored_path TEXT,
      generation INTEGER, box_count INTEGER, pokemon_total INTEGER, legal_count INTEGER,
      unverified_count INTEGER, illegal_count INTEGER, inventory_json TEXT);
    CREATE TABLE pokemon (id INTEGER PRIMARY KEY, save_sha256 TEXT, location TEXT, box_index INTEGER, slot INTEGER);
    CREATE TABLE pets (id INTEGER PRIMARY KEY);
    CREATE TABLE exports (id INTEGER PRIMARY KEY);
    INSERT INTO pets (id) VALUES (1),(2),(3),(4);
    INSERT INTO exports (id) VALUES (1),(2),(3),(4),(5),(6),(7),(8);
  `);
  const ins = db.query("INSERT INTO saves (id,sha256,filename,stored_path,generation,box_count,pokemon_total,legal_count,unverified_count,illegal_count,inventory_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  for (const r of rows) ins.run(r.id, r.sha256, r.filename, r.stored_path, r.generation, r.box_count, r.pokemon_total, r.legal_count, r.unverified_count, r.illegal_count, typeof r.inventory_json === "string" ? r.inventory_json : JSON.stringify(r.inventory_json));
  if (withTrigger) db.exec("CREATE TRIGGER pg07g_fail_update BEFORE UPDATE ON saves BEGIN SELECT RAISE(ABORT, 'PG-07G rollback probe'); END;");
  const total = rows[0]?.pokemon_total ?? (typeof rows[0]?.inventory_json === "string" ? JSON.parse(rows[0].inventory_json).counts?.total : undefined) ?? 0;
  for (let i = 1; i <= total; i++) db.query("INSERT INTO pokemon (id,save_sha256,location,box_index,slot) VALUES (?,?,?,?,?)").run(i, rows[0].sha256, "box", 1, i);
  db.close();
  return path;
}

const corruptPath = join(TMP, `corrupt-${process.pid}.srm`);
writeFileSync(corruptPath, Buffer.from("PG-07G instrumented analysis failure"));
const corruptSha = sha(readFileSync(corruptPath));
const unknownSha = "9".repeat(64);
const polishPath = join(ROOT, "fixtures", "gen2-polished-hack.srm");
const polishSha = readSha(polishPath);

const classificationRows = [
  { ...row4, id: 1, stored_path: join(ROOT, "data", "saves", `${row4.sha256}.srm`), inventory_json: JSON.stringify(legacy4) },
  { ...row1, id: 2, stored_path: join(ROOT, "data", "saves", `${row1.sha256}.srm`), inventory_json: JSON.stringify(updated4) },
  { ...row1, id: 3, sha256: unknownSha, stored_path: "/tmp/opencode/no-existe.srm", inventory_json: JSON.stringify(legacy1) },
  { ...row1, id: 4, sha256: corruptSha, stored_path: corruptPath, inventory_json: JSON.stringify(legacy1) },
  { ...row1, id: 5, sha256: polishSha, filename: "gen2-polished-hack.srm", stored_path: polishPath, generation: 2, inventory_json: JSON.stringify({ ...legacy1, detected: true }) },
  { ...row1, id: 6, sha256: "8".repeat(64), stored_path: corruptPath, inventory_json: "{" },
];
const classificationDb = createDb("classification", classificationRows);
const classified = await analyzeDatabase(classificationDb);
ok(classified.before.integrity === "ok", "BD sintética de clasificación íntegra");
eq(classified.candidates.map((c: any) => c.classification).slice(0, 2), ["REANALIZABLE", "ACTUALIZADO"], "clasifica REANALIZABLE y ACTUALIZADO");
ok(classified.candidates[2].classification === "SIN FUENTE DISPONIBLE", "clasifica fuente ausente");
ok(classified.candidates[3].classification !== "REANALIZABLE", "no marca como reanalizable un save incompatible");
ok(classified.candidates[5].classification === "REQUIERE REVISIÓN", "clasifica inventario incompleto como revisión");
ok(classified.candidates.every((c: any) => c.action !== "would-update" || c.comparison.unexpected.length === 0), "ningún candidato con cambios inesperados es actualizable");
ok(classified.candidates.every((c: any) => c.action !== "would-update" || c.comparison.legalChanged.length === 0), "ningún candidato cambia legalidad");

// --- Aplicación aislada, idempotencia, relaciones e integridad -----------
const applyDb = createDb("apply", [classificationRows[0]]);
const legalBefore = (() => {
  const db = new Database(applyDb, { readonly: true });
  const r = db.query("SELECT legal_count, unverified_count, illegal_count, inventory_json FROM saves WHERE id=1").get() as any;
  db.close();
  return r;
})();
const applied = await applyDatabase(applyDb);
ok(applied.ok === true && applied.counts.applied === 1, "aplica una actualización a la copia aislada");
const afterDb = new Database(applyDb, { readonly: true });
const afterRow = afterDb.query("SELECT id, sha256, box_count, inventory_json, legal_count, unverified_count, illegal_count FROM saves WHERE id=1").get() as any;
const afterInfo = {
  saves: (afterDb.query("SELECT COUNT(*) n FROM saves").get() as any).n,
  pokemon: (afterDb.query("SELECT COUNT(*) n FROM pokemon").get() as any).n,
  pets: (afterDb.query("SELECT COUNT(*) n FROM pets").get() as any).n,
  exports: (afterDb.query("SELECT COUNT(*) n FROM exports").get() as any).n,
  integrity: (afterDb.query("PRAGMA integrity_check").get() as any).integrity_check,
};
afterDb.close();
const afterInv = JSON.parse(afterRow.inventory_json);
eq(afterRow.id, 1, "conserva el identificador de partida");
eq(afterRow.sha256, row4.sha256, "conserva el SHA-256 de partida");
eq(afterInfo, { saves: 1, pokemon: 105, pets: 4, exports: 8, integrity: "ok" }, "conserva relaciones e integridad tras la aplicación");
eq([afterRow.legal_count, afterRow.unverified_count, afterRow.illegal_count], [legalBefore.legal_count, legalBefore.unverified_count, legalBefore.illegal_count], "conserva columnas de legalidad");
eq(afterInv.counts, JSON.parse(legalBefore.inventory_json).counts, "conserva counts de legalidad");
eq(afterInv.party.length, 6, "conserva el equipo");
eq(afterInv.boxes.reduce((n: number, b: any) => n + b.slots.length, 0), 99, "conserva los 99 Pokémon de caja");
ok(!!afterInv.storage && afterInv.storage.boxCount === 18, "genera storage con 18 cajas reales");
ok(afterInv.boxes.every((b: any) => Array.isArray(b.positions) && b.positions.length === 30), "genera 30 posiciones por caja");
ok(afterInv.boxes.some((b: any) => b.slots.length === 0 && b.positions.length === 30), "representa cajas vacías reales");
ok(afterInv.boxes.some((b: any) => b.positions.some((p: any) => !p.occupied)), "representa ranuras vacías reales");
ok(afterInv.boxes[0].slots.every((p: any) => Number.isInteger(p.box) && Number.isInteger(p.slot)), "conserva índices originales de caja y ranura");
const second = await applyDatabase(applyDb);
ok(second.counts.applied === 0 && second.counts.byClassification.ACTUALIZADO === 1, "segunda ejecución es idempotente");
eq(second.logicalSha256Before, second.logicalSha256After, "la repetición no cambia el archivo");

// --- Rollback forzado ----------------------------------------------------
const rollbackDb = createDb("rollback", [classificationRows[0]], true);
const rolled = await applyDatabase(rollbackDb);
ok(rolled.ok === false && rolled.rolledBack === true, "revierte la transacción ante un error forzado");
eq(rolled.applied, [], "no registra aplicaciones tras rollback");
const rollbackDb2 = new Database(rollbackDb, { readonly: true });
eq((rollbackDb2.query("SELECT box_count FROM saves WHERE id=1").get() as any).box_count, 6, "rollback conserva box_count anterior");
rollbackDb2.close();

// --- Protección de escritura --------------------------------------------
let productionRejected = false;
try {
  assertWritableTarget(PRODUCTION_DB);
} catch {
  productionRejected = true;
}
ok(productionRejected, "rechaza la base de producción como destino");
let relativeRejected = false;
try {
  assertWritableTarget(join(ROOT, "data", "pokegotchi.db"));
} catch {
  relativeRejected = true;
}
ok(relativeRejected, "rechaza rutas dentro de data/");
const symlinkPath = join(TMP, `pg07g-prod-link-${process.pid}.db`);
symlinkSync(PRODUCTION_DB, symlinkPath);
let symlinkRejected = false;
try {
  assertWritableTarget(symlinkPath);
} catch {
  symlinkRejected = true;
}
ok(symlinkRejected, "rechaza enlaces simbólicos que resuelven a producción");
let missingRejected = false;
try {
  assertWritableTarget(join(TMP, "no-existe.db"));
} catch {
  missingRejected = true;
}
ok(missingRejected, "rechaza destinos inexistentes");

// --- Integración, i18n y regresiones ------------------------------------
const main = readFileSync(join(ROOT, "apps/web/src/main.ts"), "utf8");
ok(main.includes("PG-07E:pc-helpers:start"), "consulta los helpers puros PG-07E/F reales");
ok(main.includes("pcStorage") && main.includes("pcPositions") && main.includes("pcCapacity"), "el frontend lee el contrato PG-07F");
const index = readFileSync(join(ROOT, "apps/server/src/index.ts"), "utf8");
ok(index.includes("StorageContract") && index.includes("BoxPosition"), "el backend tipa el contrato ampliado");
ok(index.includes("reparse"), "existen rutas de reparseo (no se invocan en esta prueba)");
const sidecar = readFileSync(join(ROOT, "services/pkhex/Program.cs"), "utf8");
ok(sidecar.includes("PG-07F:storage-contract:start"), "el sidecar conserva el bloque PG-07F");
const checkSh = readFileSync(join(ROOT, "scripts/check.sh"), "utf8");
ok(checkSh.includes("pg07g-check.ts"), "la suite PG-07G está integrada en check.sh");
const i18n = readFileSync(join(ROOT, "apps/web/src/i18n.ts"), "utf8");
ok(i18n.includes("box.storage.available") && i18n.includes("box.totalBoxes"), "i18n conserva las claves PG-07F");
const protectedHashes: Array<[string, string]> = [
  ["data/pokegotchi.db", "3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a"],
  ["apps/server/src/db.ts", "fcd95b0c63c059c57228bd7c06b1121247c23f6f18178388d43148f9193fed7b"],
  ["services/pkhex/pkhex.csproj", "b9abdb854c71bcddde1e72dad6342709aa1370e27f62a8c1d4a605ccd693a03d"],
  ["apps/web/src/pet-engine.ts", "26955014098ea15f36b21a8a0e714fcccf4183a8e0988cbea801abf9cfd096bb"],
  ["apps/web/src/sprite-runtime.ts", "9e25e9ecb8f9383294265706bedaefc3dda8dcc9c40fd4f2a08248fd9e8e9ac8"],
  ["apps/web/src/sprite-render.ts", "92f43df3284153b4be0a75755f9e7984a78e1aad40064ff6fd8d94a675185f30"],
  ["apps/web/assets/room/guarderia.png", "bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095"],
];
for (const [file, expected] of protectedHashes) ok(readSha(join(ROOT, file)) === expected, `hash protegido intacto: ${file}`);
for (const f of FIXTURES) ok(readSha(join(ROOT, "fixtures", f)) === fixtureHashesBefore.get(f), `fixture intacto: ${f}`);

console.log(`PG-07G: ${checks - failures}/${checks} comprobaciones correctas.`);
if (failures > 0) process.exitCode = 1;
