/**
 * PG-07H — comprobaciones headless de la actualización supervisada.
 *
 * NUNCA escribe en producción: la base real solo se abre con readonly y todas
 * las escrituras ocurren en copias sintéticas bajo /tmp/opencode.
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { applyDatabase, compareInventories, PRODUCTION_DB, PRODUCTION_DATA_DIR } from "./pg07g-reanalyze.ts";
import {
  AUTHORIZED,
  dbInfo,
  verifyBackup,
  verifyLiveAnalysis,
  verifyPriorDryRun,
  verifyProductionPath,
} from "./pg07h-apply.ts";

const ROOT = resolve(import.meta.dir, "..");
const TMP = "/tmp/opencode/pg07h-check";
const BACKUP_DIR = "/home/missingn0/Descargas/PG-07H-BACKUP/20261119T102213Z";
const DRY_RUN = "/home/missingn0/Descargas/PG-07H/dry-run-real-db.json";
const EXPECTED_FINAL_DB = "3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a";
const EXPECTED_BACKUP_HASH = "42d8a3a105420c2edde14b000d24116c8f1be7675bc4d02e65f0ad7a7fa45d58";
const EXPECTED_COUNTS = { saves: 2, inventories: 2, pokemon: 110, pets: 4, exports: 8, integrity: "ok" };

mkdirSync(TMP, { recursive: true });
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
function sha(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}
function shaFile(path: string) {
  return sha(readFileSync(path));
}
function throws(fn: () => unknown, message: string) {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }
  ok(thrown, message);
}
function copyBackup(name: string) {
  const path = join(TMP, name);
  if (existsSync(path)) unlinkSync(path);
  copyFileSync(join(BACKUP_DIR, "pokegotchi.db"), path);
  return path;
}

// La suite no debe alterar la base real: se registra y se vuelve a comprobar.
const productionHashBefore = shaFile(PRODUCTION_DB);

// --- 1. Rechazo de ejecución sin autorización explícita -------------------
const executorSource = readFileSync(join(ROOT, "scripts", "pg07h-apply.ts"), "utf8");
ok(executorSource.includes("if (execute && pending.length > 0)"), "la escritura está protegida por --execute");
ok(executorSource.includes('if (arg === "--execute") execute = true;'), "--execute es la única vía para autorizar la escritura");
ok(executorSource.includes("if (import.meta.main) await main();"), "importar el ejecutor no dispara la CLI");
const verifyReportPath = join(TMP, "verify-only-suite.json");
const verifyProc = Bun.spawn(
  ["bun", "run", "scripts/pg07h-apply.ts", "--production", PRODUCTION_DB, "--backup", BACKUP_DIR, "--dry-run", DRY_RUN, "--report", verifyReportPath],
  { cwd: ROOT, stdout: "pipe", stderr: "pipe" },
);
const [, verifyErr, verifyCode] = await Promise.all([
  new Response(verifyProc.stdout).text(),
  new Response(verifyProc.stderr).text(),
  verifyProc.exited,
]);
const verifyReport = JSON.parse(readFileSync(verifyReportPath, "utf8"));
ok(verifyCode === 0, `verify-only termina sin error (${verifyCode}) ${verifyErr.slice(0, 200)}`);
eq(verifyReport.mode, "verify-only", "sin --execute el modo es verify-only");
eq(verifyReport.counts.applied, 0, "sin --execute no aplica cambios");
eq(verifyReport.writePerformed, false, "sin --execute no escribe");

// --- 2. Rechazo de ruta incorrecta ----------------------------------------
const wrongPath = join(TMP, "not-production.db");
writeFileSync(wrongPath, readFileSync(join(BACKUP_DIR, "pokegotchi.db")));
throws(() => verifyProductionPath(wrongPath), "rechaza una ruta de producción incorrecta");
throws(() => verifyProductionPath(""), "rechaza la ausencia de --production");
eq(verifyProductionPath(PRODUCTION_DB), resolve(PRODUCTION_DB), "acepta únicamente la ruta exacta autorizada");
const linkPath = join(TMP, "production-link.db");
if (existsSync(linkPath)) unlinkSync(linkPath);
symlinkSync(wrongPath, linkPath);
throws(() => verifyProductionPath(linkPath), "rechaza un enlace que resuelve a otra base");

// --- 3. Rechazo de inventarios no autorizados -----------------------------
eq(AUTHORIZED.map((a) => a.id), [1, 2], "la lista autorizada contiene solo los IDs 1 y 2");
const liveStub = (candidates: any[]) => ({
  ok: true,
  database: resolve(PRODUCTION_DB),
  before: { saves: 2, pokemon: 110, pets: 4, exports: 8, integrity: "ok" },
  candidates,
});
throws(() => verifyLiveAnalysis(liveStub([{ id: 1 }, { id: 2 }, { id: 3 }]), []), "rechaza un tercer inventario");
throws(() => verifyLiveAnalysis(liveStub([{ id: 1 }, { id: 99 }]), []), "rechaza un ID no autorizado");
throws(() => verifyLiveAnalysis(liveStub([{ id: 1 }]), []), "rechaza un número distinto de inventarios");

// --- 4. Backup obligatorio ------------------------------------------------
throws(() => verifyBackup(""), "exige ruta de backup");
throws(() => verifyBackup(join(TMP, "no-existe")), "exige que el directorio de backup exista");
ok(executorSource.includes("verifyBackup(backupInput!)"), "la CLI verifica el backup antes de analizar");

// --- 5. Verificación del backup -------------------------------------------
const backup = verifyBackup(BACKUP_DIR);
eq(backup.sha256, EXPECTED_BACKUP_HASH, "el backup PG-07H coincide con su hash verificado");
eq(backup.manifest.status, "VERIFIED", "el manifiesto del backup está VERIFIED");
eq(backup.manifest.authorizedIds, [1, 2], "el backup cubre exactamente los IDs autorizados");
eq(backup.info, EXPECTED_COUNTS, "el backup tiene los recuentos autorizados");
const badBackup = join(TMP, "bad-backup");
mkdirSync(badBackup, { recursive: true });
const badManifest = { ...backup.manifest, status: "FAILED" };
writeFileSync(join(badBackup, "manifest.json"), JSON.stringify(badManifest));
copyFileSync(join(BACKUP_DIR, "pokegotchi.db"), join(badBackup, "pokegotchi.db"));
writeFileSync(join(badBackup, "pokegotchi.db.sha256"), `${EXPECTED_BACKUP_HASH}  pokegotchi.db\n`);
throws(() => verifyBackup(badBackup), "rechaza un backup no marcado VERIFIED");
badManifest.status = "VERIFIED";
badManifest.sha256 = "0".repeat(64);
writeFileSync(join(badBackup, "manifest.json"), JSON.stringify(badManifest));
throws(() => verifyBackup(badBackup), "rechaza un backup con hash distinto");

// --- 6. Dry-run previo ----------------------------------------------------
const prior = verifyPriorDryRun(DRY_RUN, resolve(PRODUCTION_DB));
ok(typeof prior.startedAt === "string", "acepta el dry-run real de PG-07H");
const badDryPath = join(TMP, "bad-dry-run.json");
const realDry = JSON.parse(readFileSync(DRY_RUN, "utf8"));
writeFileSync(badDryPath, JSON.stringify({ ...realDry, ok: false }));
throws(() => verifyPriorDryRun(badDryPath, resolve(PRODUCTION_DB)), "rechaza un dry-run no satisfactorio");
writeFileSync(badDryPath, JSON.stringify({ ...realDry, database: "/tmp/otra-base.db" }));
throws(() => verifyPriorDryRun(badDryPath, resolve(PRODUCTION_DB)), "rechaza un dry-run de otra base");

// --- Copia aislada para las pruebas transaccionales ------------------------
const workDb = copyBackup("work.db");
const work = new Database(workDb, { readonly: true });
const beforeRows = work.query("SELECT id, sha256, filename, box_count, inventory_json, legal_count, unverified_count, illegal_count FROM saves ORDER BY id").all() as any[];
const beforeInfo = dbInfo(work);
const beforeInventories = beforeRows.map((r) => JSON.parse(r.inventory_json));
work.close();

// --- 7. Actualización transaccional ---------------------------------------
ok(executorSource.includes('db.exec("BEGIN IMMEDIATE")'), "usa BEGIN IMMEDIATE");
ok(executorSource.includes('db.exec("COMMIT")'), "confirma con COMMIT");
ok(executorSource.includes('db.exec("ROLLBACK")'), "revierte con ROLLBACK");
ok(executorSource.includes("UPDATE saves SET box_count=?, inventory_json=? WHERE id=? AND sha256=? AND inventory_json=?"), "el UPDATE cubre solo box_count e inventory_json");
const applied = await applyDatabase(workDb);
eq(applied.counts.applied, 2, "la transacción actualiza exactamente dos inventarios");
eq(applied.ok, true, "la aplicación a la copia es satisfactoria");

// --- 8. Rollback ----------------------------------------------------------
const rollbackDb = copyBackup("rollback.db");
const trigger = new Database(rollbackDb);
trigger.exec("CREATE TRIGGER pg07h_fail BEFORE UPDATE ON saves BEGIN SELECT RAISE(ABORT, 'PG-07H rollback probe'); END;");
trigger.close();
const rolled = await applyDatabase(rollbackDb);
eq(rolled.ok, false, "un error fuerza el fallo de la transacción");
eq(rolled.rolledBack, true, "se ejecuta ROLLBACK ante el error");
eq(rolled.applied, [], "no se registran aplicaciones tras el rollback");
const rollbackCheck = new Database(rollbackDb, { readonly: true });
eq((rollbackCheck.query("SELECT box_count FROM saves WHERE id=1").get() as any).box_count, 6, "el rollback conserva el box_count anterior");
rollbackCheck.close();

// --- 9. Conservación de registros -----------------------------------------
const after = new Database(workDb, { readonly: true });
const afterRows = after.query("SELECT id, sha256, filename, box_count, inventory_json, legal_count, unverified_count, illegal_count FROM saves ORDER BY id").all() as any[];
const afterInfo = dbInfo(after);
after.close();
eq(afterInfo, EXPECTED_COUNTS, "la copia mantiene todos los recuentos e integridad");
eq(afterInfo, beforeInfo, "no cambian los recuentos respecto al backup");

// --- 10. Conservación de legalidad ----------------------------------------
for (const id of [1, 2]) {
  const b = beforeRows.find((r) => r.id === id);
  const a = afterRows.find((r) => r.id === id);
  eq([a.legal_count, a.unverified_count, a.illegal_count], [b.legal_count, b.unverified_count, b.illegal_count], `columnas de legalidad intactas en ${id}`);
  eq(JSON.parse(a.inventory_json).counts, JSON.parse(b.inventory_json).counts, `counts de legalidad intactos en ${id}`);
}

// --- 11. Conservación de identificadores ----------------------------------
eq(afterRows.map((r) => r.id), [1, 2], "se conservan los identificadores");
eq(afterRows.map((r) => r.sha256), beforeRows.map((r) => r.sha256), "se conservan los SHA-256 de partida");
eq(afterRows.map((r) => r.filename), beforeRows.map((r) => r.filename), "se conservan los nombres de archivo");

// --- 12. Idempotencia -----------------------------------------------------
const second = await applyDatabase(workDb);
eq(second.counts.applied, 0, "una segunda ejecución no aplica cambios");
eq(second.writePerformed, false, "la segunda ejecución no escribe");
eq(second.logicalSha256Before, second.logicalSha256After, "el archivo queda byte a byte idéntico");
const idempotentReport = JSON.parse(readFileSync("/home/missingn0/Descargas/PG-07H/apply-idempotent.json", "utf8"));
eq(idempotentReport.mode, "execute-noop", "el informe real de idempotencia es execute-noop");
eq(idempotentReport.counts.applied, 0, "el informe real registra applied: 0");
const live = await analyzeDatabaseLite();
const liveDb = new Database(PRODUCTION_DB, { readonly: true });
const currentRows = liveDb.query("SELECT id, sha256, filename, box_count, inventory_json, legal_count, unverified_count, illegal_count FROM saves ORDER BY id").all() as any[];
liveDb.close();
eq(verifyLiveAnalysis(live, currentRows).map((d: any) => d.state), ["updated", "updated"], "el análisis en vivo confirma que no quedan inventarios pendientes");

async function analyzeDatabaseLite() {
  const { analyzeDatabase } = await import("./pg07g-reanalyze.ts");
  return analyzeDatabase(PRODUCTION_DB);
}

// --- 13. Integridad SQLite ------------------------------------------------
const backupDb = new Database(join(BACKUP_DIR, "pokegotchi.db"), { readonly: true });
eq((backupDb.query("PRAGMA integrity_check").get() as any).integrity_check, "ok", "el backup supera integrity_check");
backupDb.close();
const prodDb = new Database(PRODUCTION_DB, { readonly: true });
eq((prodDb.query("PRAGMA integrity_check").get() as any).integrity_check, "ok", "la producción supera integrity_check");
prodDb.close();

// --- 14. Compatibilidad PG-07F --------------------------------------------
for (const id of [1, 2]) {
  const b = beforeRows.find((r) => r.id === id);
  const a = afterRows.find((r) => r.id === id);
  const oldInv = JSON.parse(b.inventory_json);
  const newInv = JSON.parse(a.inventory_json);
  ok(newInv.storage?.available === true && newInv.storage?.availability === "available", `storage disponible en ${id}`);
  ok(Number.isInteger(newInv.storage?.boxCount) && Number.isInteger(newInv.storage?.slotCount), `capacidad real declarada en ${id}`);
  ok(Array.isArray(newInv.boxes) && newInv.boxes.length === newInv.storage.boxCount, `todas las cajas presentes en ${id}`);
  ok(newInv.boxes.every((box: any) => Array.isArray(box.positions) && box.positions.length === newInv.storage.slotCount), `posiciones completas en ${id}`);
  const cmp = compareInventories(oldInv, newInv);
  eq(cmp.unexpected, [], `sin cambios inesperados en ${id}`);
  eq(cmp.legalChanged, [], `sin cambios de legalidad en ${id}`);
  ok(newInv.boxes.every((box: any) => Array.isArray(box.slots)), `inventory.slots compatible en ${id}`);
}

// --- 15. Ausencia de modificaciones de saves ------------------------------
const SAVE_HASHES: Record<string, string> = {
  "fixtures/FIXTURES.md": "15d63ad32c018f1060f24aa4a99b537cb73a75d4b39375f1731b0cba842433a1",
  "fixtures/gen1-blue-spain.srm": "d0b54f7d76b50f6e37f62112305c18925e550eeaa07ade81790ca833a78b9f7f",
  "fixtures/gen1-blue-usa.srm": "e361b6ea5b16ae1f8d200cc26ea5a40b613ec1a0413d10147147cdd3f2b6cce2",
  "fixtures/gen2-crystalclear-hack.srm": "734cc272a1cdd724d30500f16fbc469f7e8bd34524cb48a66ad10a59ce672f48",
  "fixtures/gen2-polished-hack.srm": "0bc6d242080b5ccb14d5537a04b78fe5a4a4cd5efbd0f18b0ff0eb4f08a62ea0",
  "fixtures/gen3-allin-hack.srm": "928c392597ef8f5e36ceade876d5c835a77811c252dff042740126d910cdea88",
  "fixtures/gen4-heartgold-spain.srm": "1c5e78d94ade25d4f91f8f09a683a8def724a7bb74b4d701331b9ad2275e0212",
  "fixtures/gen5-black-usa.srm": "0ddb7b1701b22fc935f4c0cb0ffce98a7078b8bdd5b824f03ea7bb44978f16be",
  "data/saves/0bc6d242080b5ccb14d5537a04b78fe5a4a4cd5efbd0f18b0ff0eb4f08a62ea0.srm": "0bc6d242080b5ccb14d5537a04b78fe5a4a4cd5efbd0f18b0ff0eb4f08a62ea0",
  "data/saves/1c5e78d94ade25d4f91f8f09a683a8def724a7bb74b4d701331b9ad2275e0212.srm": "1c5e78d94ade25d4f91f8f09a683a8def724a7bb74b4d701331b9ad2275e0212",
  "data/saves/e361b6ea5b16ae1f8d200cc26ea5a40b613ec1a0413d10147147cdd3f2b6cce2.srm": "e361b6ea5b16ae1f8d200cc26ea5a40b613ec1a0413d10147147cdd3f2b6cce2",
};
for (const [file, expected] of Object.entries(SAVE_HASHES)) ok(shaFile(join(ROOT, file)) === expected, `save protegido intacto: ${file}`);

// --- 16. Ausencia de regresiones PG-07A–G ---------------------------------
const PROTECTED: Record<string, string> = {
  "apps/server/src/db.ts": "fcd95b0c63c059c57228bd7c06b1121247c23f6f18178388d43148f9193fed7b",
  "services/pkhex/pkhex.csproj": "b9abdb854c71bcddde1e72dad6342709aa1370e27f62a8c1d4a605ccd693a03d",
  "services/pkhex/Program.cs": "014a489b81b8225424e41332f27ab1d2f9bd2147195177e5a585b47a70f983fa",
  "apps/server/src/index.ts": "f63e915cdb1d3869fafd0a6b7d33774b4c5b25e61a35fb1fbcd91a4e6826315e",
  "apps/web/src/pet-engine.ts": "26955014098ea15f36b21a8a0e714fcccf4183a8e0988cbea801abf9cfd096bb",
  "apps/web/src/sprite-runtime.ts": "9e25e9ecb8f9383294265706bedaefc3dda8dcc9c40fd4f2a08248fd9e8e9ac8",
  "apps/web/src/sprite-render.ts": "92f43df3284153b4be0a75755f9e7984a78e1aad40064ff6fd8d94a675185f30",
  "apps/web/assets/room/guarderia.png": "bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095",
};
for (const [file, expected] of Object.entries(PROTECTED)) ok(shaFile(join(ROOT, file)) === expected, `archivo protegido intacto: ${file}`);
const checkSh = readFileSync(join(ROOT, "scripts", "check.sh"), "utf8");
for (const suite of ["pg07a-integration-check", "pg07b-check", "pg07c-check", "pg07d-check", "pg07e-check", "pg07f-check", "pg07g-check", "pg07h-check"]) {
  ok(checkSh.includes(suite), `check.sh conserva la suite ${suite}`);
}
ok(readFileSync(join(ROOT, "services", "pkhex", "Program.cs"), "utf8").includes("PG-07F:storage-contract:start"), "el sidecar conserva el contrato PG-07F");
ok(readFileSync(join(ROOT, "apps", "web", "src", "main.ts"), "utf8").includes("pcStorage"), "el frontend conserva los helpers PG-07E/F");
ok(readFileSync(join(ROOT, "apps", "web", "src", "i18n.ts"), "utf8").includes("box.storage.available"), "i18n conserva las claves PG-07F");

// La base real solo se leyó: su hash no debe haber cambiado durante la suite.
eq(shaFile(PRODUCTION_DB), productionHashBefore, "la suite no modificó la base de producción");
eq(shaFile(PRODUCTION_DB), EXPECTED_FINAL_DB, "la base de producción conserva el hash final autorizado");
ok(PRODUCTION_DATA_DIR.endsWith("/data"), "la constant de directorio de producción es la esperada");

console.log(`PG-07H: ${checks - failures}/${checks} comprobaciones correctas.`);
if (failures > 0) process.exitCode = 1;
