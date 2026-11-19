/**
 * PG-07H — ejecutor REAL y explícito de la actualización de inventarios.
 *
 * PG-07G rechaza deliberadamente escribir en producción. Este script es un
 * mecanismo separado, autorizado solo por PG-07H, que NO modifica ese
 * comportamiento seguro.Por defecto solo verifica; para escribir se exigen
 * todas las banderas siguientes:
 *
 *   bun run scripts/pg07h-apply.ts \
 *     --execute \
 *     --production /home/missingn0/Proyectos/Pokeguarde/data/pokegotchi.db \
 *     --backup /home/missingn0/Descargas/PG-07H-BACKUP/<UTC> \
 *     --dry-run /home/missingn0/Descargas/PG-07H/dry-run-real-db.json \
 *     --report /home/missingn0/Descargas/PG-07H/apply-real.json
 *
 * Solo actualiza `box_count` e `inventory_json` de los IDs 1 y 2, dentro de
 * una transacción BEGIN IMMEDIATE. Cualquier verificación fallida aborta.
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { analyzeDatabase, PRODUCTION_DB, PRODUCTION_DATA_DIR } from "./pg07g-reanalyze.ts";

type Authorized = {
  id: number;
  filename: string;
  sha256: string;
  oldInventoryHash: string;
  newInventoryHash: string;
  boxCount: number;
};

/**lista cerrada: ningún otro registro puede ser tocado */
export const AUTHORIZED: Authorized[] = [
  {
    id: 1,
    filename: "gen4-heartgold-spain.srm",
    sha256: "1c5e78d94ade25d4f91f8f09a683a8def724a7bb74b4d701331b9ad2275e0212",
    oldInventoryHash: "66b756bf6a67e5c1fd137e9411dc551fba46c049622cd8751cdd94b2ba479e65",
    newInventoryHash: "5ee712b6456696ca9d83200767885c6d84cfb5f6f2e35c62450b36dd9fc1f3b7",
    boxCount: 18,
  },
  {
    id: 2,
    filename: "gen1-blue-usa.srm",
    sha256: "e361b6ea5b16ae1f8d200cc26ea5a40b613ec1a0413d10147147cdd3f2b6cce2",
    oldInventoryHash: "7adb5535ca8488132fd358390c55128801236b355b1be5ff6d654b16e09043bc",
    newInventoryHash: "2552c2c4eb57de99c1a7249fa236785b40d13a98e5685c074f1bc8483a3acfdc",
    boxCount: 12,
  },
];

const EXPECTED_COUNTS = { saves: 2, inventories: 2, pokemon: 110, pets: 4, exports: 8 };
const VALID_SOURCES = new Set(["hash_named_copy", "production_hash_copy"]);

function sha(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaFile(path: string): string {
  return sha(readFileSync(path));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`PG-07H: ${message}`);
}

export function dbInfo(db: Database) {
  return {
    saves: (db.query("SELECT COUNT(*) n FROM saves").get() as any).n as number,
    inventories: (db.query("SELECT COUNT(*) n FROM saves WHERE inventory_json IS NOT NULL").get() as any).n as number,
    pokemon: (db.query("SELECT COUNT(*) n FROM pokemon").get() as any).n as number,
    pets: (db.query("SELECT COUNT(*) n FROM pets").get() as any).n as number,
    exports: (db.query("SELECT COUNT(*) n FROM exports").get() as any).n as number,
    integrity: (db.query("PRAGMA integrity_check").get() as any).integrity_check as string,
  };
}

export function verifyProductionPath(input: string): string {
  assert(input, "falta --production");
  const resolved = resolve(input);
  const expected = resolve(PRODUCTION_DB);
  assert(resolved === expected, `la ruta de producción no es la exacta autorizada (${resolved})`);
  assert(existsSync(resolved), "la base de producción no existe");
  let actual: string;
  let expectedReal: string;
  try {
    actual = realpathSync(resolved);
    expectedReal = realpathSync(expected);
  } catch {
    throw new Error("PG-07H: no se pudieron resolver las rutas reales");
  }
  assert(actual === expectedReal, "la ruta de producción resuelve a otro archivo");
  return resolved;
}

export function verifyBackup(input: string) {
  assert(input, "falta --backup");
  const dir = resolve(input);
  assert(existsSync(dir), "el directorio de backup no existe");
  assert(!dir.startsWith(PRODUCTION_DATA_DIR + sep), "el backup no puede estar dentro de data/");
  const manifestPath = join(dir, "manifest.json");
  const dbPath = join(dir, "pokegotchi.db");
  const sumPath = join(dir, "pokegotchi.db.sha256");
  for (const p of [manifestPath, dbPath, sumPath]) assert(existsSync(p), `falta archivo de backup: ${p}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert(manifest.status === "VERIFIED", "el backup no está marcado VERIFIED");
  assert(manifest.idsVerified === true, "el backup no verificó los identificadores");
  assert(JSON.stringify(manifest.authorizedIds) === JSON.stringify([1, 2]), "el backup no cubre exactamente los IDs 1 y 2");
  assert(manifest.saves === EXPECTED_COUNTS.saves && manifest.pokemon === EXPECTED_COUNTS.pokemon, "el backup no coincide con los recuentos autorizados");
  assert(manifest.sourceIntegrity === "ok" && manifest.backupIntegrity === "ok", "el backup no superó integrity_check");
  assert(manifest.source === resolve(PRODUCTION_DB), "el backup no procede de la base de producción autorizada");
  const actualHash = shaFile(dbPath);
  assert(actualHash === manifest.sha256, `hash del backup distinto del manifiesto (${actualHash})`);
  const sum = readFileSync(sumPath, "utf8").trim().split(/\s+/)[0];
  assert(sum === manifest.sha256, "el archivo .sha256 del backup no coincide con el manifiesto");
  const verificationDb = new Database(dbPath, { readonly: true });
  let backupInfo: ReturnType<typeof dbInfo>;
  try {
    backupInfo = dbInfo(verificationDb);
  } finally {
    verificationDb.close();
  }
  assert(backupInfo.integrity === "ok", "el backup no puede abrirse con integridad ok");
  assert(backupInfo.saves === 2 && backupInfo.pokemon === 110 && backupInfo.inventories === 2, "el backup no contiene 2 partidas / 2 inventarios / 110 Pokémon");
  return { directory: dir, manifest, sha256: actualHash, info: backupInfo };
}

export function verifyPriorDryRun(input: string, production: string) {
  assert(input, "falta --dry-run");
  const path = resolve(input);
  assert(existsSync(path), "no existe el dry-run previo");
  const report = JSON.parse(readFileSync(path, "utf8"));
  assert(report.ok === true, "el dry-run previo no fue satisfactorio");
  assert(report.mode === "dry-run", "el archivo indicado no es un dry-run");
  assert(resolve(report.database) === production, "el dry-run previo no corresponde a la base de producción autorizada");
  assert(report.before?.integrity === "ok", "el dry-run previo no registró integridad ok");
  assert(Array.isArray(report.candidates) && report.candidates.length === 2, "el dry-run previo no cubre exactamente dos inventarios");
  const byId = new Map<number, any>(report.candidates.map((c: any) => [Number(c.id), c]));
  for (const a of AUTHORIZED) {
    const c = byId.get(a.id);
    assert(c, `el dry-run previo no incluye el ID autorizado ${a.id}`);
    assert(c.sha256 === a.sha256, `hash de save inesperado en el ID ${a.id}`);
    assert(c.filename === a.filename, `nombre de partida inesperado en el ID ${a.id}`);
    if (c.oldInventoryHash) assert(c.oldInventoryHash === a.oldInventoryHash, `hash de inventario antiguo inesperado en el ID ${a.id}`);
    if (c.newInventoryHash) assert(c.newInventoryHash === a.newInventoryHash, `hash de inventario nuevo inesperado en el ID ${a.id}`);
    if (c.classification === "REANALIZABLE") {
      assert(Array.isArray(c.comparison?.unexpected) && c.comparison.unexpected.length === 0, `cambios inesperados en el ID ${a.id}`);
      assert(Array.isArray(c.comparison?.legalChanged) && c.comparison.legalChanged.length === 0, `legalidad alterada en el ID ${a.id}`);
    }
  }
  return { path, startedAt: report.startedAt ?? null };
}

export function verifyLiveAnalysis(live: any, currentRows: any[]) {
  assert(live.ok === true, "el análisis en vivo no fue satisfactorio");
  assert(live.database === resolve(PRODUCTION_DB), "el análisis en vivo no apunta a la base autorizada");
  assert(live.before.integrity === "ok", "integridad inicial no ok");
  assert(
    live.before.saves === EXPECTED_COUNTS.saves &&
      live.before.inventories === undefined &&
      live.before.pokemon === EXPECTED_COUNTS.pokemon &&
      live.before.pets === EXPECTED_COUNTS.pets &&
      live.before.exports === EXPECTED_COUNTS.exports,
    "los recuentos iniciales no coinciden con los autorizados",
  );
  assert(Array.isArray(live.candidates) && live.candidates.length === 2, "el análisis en vivo no devuelve exactamente dos inventarios");
  const ids = live.candidates.map((c: any) => Number(c.id)).sort((a: number, b: number) => a - b);
  assert(JSON.stringify(ids) === JSON.stringify([1, 2]), "los identificadores en vivo no son exactamente 1 y 2");
  const decisions: Array<{ a: Authorized; candidate: any; state: "pending" | "updated" }> = [];
  for (const a of AUTHORIZED) {
    const c = live.candidates.find((x: any) => Number(x.id) === a.id);
    assert(c, `falta el inventario autorizado ${a.id}`);
    assert(c.sha256 === a.sha256, `hash de save inesperado en vivo para el ID ${a.id}`);
    assert(c.filename === a.filename, `nombre inesperado en vivo para el ID ${a.id}`);
    assert(c.classification === "REANALIZABLE" || c.classification === "ACTUALIZADO", `clasificación inaceptable para el ID ${a.id}: ${c.classification}`);
    assert(c.source?.shaMatches === true && VALID_SOURCES.has(c.source?.method), `fuente no verificada para el ID ${a.id}`);
    if (c.classification === "REANALIZABLE") {
      assert(Array.isArray(c.comparison?.unexpected) && c.comparison.unexpected.length === 0, `cambios inesperados en vivo para el ID ${a.id}`);
      assert(Array.isArray(c.comparison?.legalChanged) && c.comparison.legalChanged.length === 0, `legalidad alterada en vivo para el ID ${a.id}`);
      assert(Array.isArray(c.comparison?.incomplete) && c.comparison.incomplete.length === 0, `metadatos incompletos en vivo para el ID ${a.id}`);
      assert(c.action === "would-update", `acción inesperada para el ID ${a.id}`);
      assert(c.oldInventoryHash === a.oldInventoryHash, `inventario antiguo inesperado en vivo para el ID ${a.id}`);
      assert(c.newInventoryHash === a.newInventoryHash, `inventario nuevo inesperado en vivo para el ID ${a.id}`);
      assert(c.proposedUpdate?.box_count === a.boxCount, `box_count propuesto inesperado para el ID ${a.id}`);
      assert(typeof c.newInventoryJson === "string" && sha(c.newInventoryJson) === a.newInventoryHash, `JSON propuesto no coincide con el hash autorizado para el ID ${a.id}`);
      decisions.push({ a, candidate: c, state: "pending" });
    } else {
      assert(c.action === "none", `acción inesperada para el ID ${a.id} ya actualizado`);
      assert(typeof c.newInventoryJson === "undefined" || c.newInventoryJson === null, `inventario ya actualizado inesperadamente recalculado en el ID ${a.id}`);
      const row = currentRows.find((r) => Number(r.id) === a.id);
      assert(row, `falta la fila real del ID ${a.id} ya actualizado`);
      assert(Number(row.box_count) === a.boxCount, `box_count inesperado en el ID ${a.id} ya actualizado`);
      assert(typeof row.inventory_json === "string" && sha(row.inventory_json) === a.newInventoryHash, `inventario ya actualizado no coincide con el hash autorizado en el ID ${a.id}`);
      decisions.push({ a, candidate: c, state: "updated" });
    }
  }
  return decisions;
}

async function main() {
  const args = process.argv.slice(2);
  let execute = false;
  let productionInput: string | null = null;
  let backupInput: string | null = null;
  let dryRunInput: string | null = null;
  let reportInput: string | null = null;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--execute") execute = true;
    else if (arg === "--production") productionInput = args[++i] ?? null;
    else if (arg === "--backup") backupInput = args[++i] ?? null;
    else if (arg === "--dry-run") dryRunInput = args[++i] ?? null;
    else if (arg === "--report") reportInput = args[++i] ?? null;
    else throw new Error(`PG-07H: opción desconocida ${arg}`);
  }
  assert(reportInput, "falta --report");
  const reportPath = resolve(reportInput);
  assert(dirname(reportPath) !== PRODUCTION_DATA_DIR && !reportPath.startsWith(PRODUCTION_DATA_DIR + sep), "el informe no puede escribirse dentro de data/");

  let outcome: any;
  try {
    const production = verifyProductionPath(productionInput!);
    const backup = verifyBackup(backupInput!);
    const prior = verifyPriorDryRun(dryRunInput!, production);
    const live = await analyzeDatabase(production);

    const beforeDb = new Database(production, { readonly: true });
    let productionBefore: ReturnType<typeof dbInfo>;
    let currentRows: any[];
    try {
      productionBefore = dbInfo(beforeDb);
      currentRows = beforeDb.query("SELECT id, sha256, filename, box_count, inventory_json, legal_count, unverified_count, illegal_count FROM saves ORDER BY id").all() as any[];
    } finally {
      beforeDb.close();
    }
    const decisions = verifyLiveAnalysis(live, currentRows);
    assert(JSON.stringify(productionBefore) === JSON.stringify({ ...EXPECTED_COUNTS, integrity: "ok" }), "la base real cambió respecto al estado autorizado");
    assert(currentRows.length === 2, "hay partidas adicionales no autorizadas");
    for (const r of currentRows) assert(r.id === 1 || r.id === 2, `ID no autorizado presente: ${r.id}`);

    const applied: any[] = [];
    let rolledBack = false;
    let writePerformed = false;
    let productionAfter = productionBefore;
    const pending = decisions.filter((d) => d.state === "pending");

    if (execute && pending.length > 0) {
      const db = new Database(production);
      const logicalBefore = sha(db.serialize());
      try {
        db.exec("BEGIN IMMEDIATE");
        const update = db.query("UPDATE saves SET box_count=?, inventory_json=? WHERE id=? AND sha256=? AND inventory_json=?");
        for (const { a } of pending) {
          const row = db.query<{ box_count: number; inventory_json: string; legal_count: number; unverified_count: number; illegal_count: number }, [number]>(
            "SELECT box_count, inventory_json, legal_count, unverified_count, illegal_count FROM saves WHERE id=?",
          ).get(a.id)!;
          assert(row.inventory_json !== null, `inventario nulo en el ID ${a.id}`);
          assert(sha(row.inventory_json) === a.oldInventoryHash, `el inventario del ID ${a.id} cambió durante la transacción`);
          assert([row.legal_count, row.unverified_count, row.illegal_count].every((n) => typeof n === "number"), `legalidad ausente en el ID ${a.id}`);
          const json = pending.find((d) => d.a.id === a.id)!.candidate.newInventoryJson as string;
          assert(sha(json) === a.newInventoryHash, `JSON a escribir no coincide con el hash autorizado en el ID ${a.id}`);
          const res = update.run(a.boxCount, json, a.id, a.sha256, row.inventory_json);
          assert(res.changes === 1, `UPDATE inesperado en el ID ${a.id} (${res.changes} filas)`);
          const check = db.query<{ box_count: number; inventory_json: string }, [number]>("SELECT box_count, inventory_json FROM saves WHERE id=?").get(a.id)!;
          assert(check.box_count === a.boxCount && sha(check.inventory_json) === a.newInventoryHash, `reescritura no verificada en el ID ${a.id}`);
          applied.push({ id: a.id, sha256: a.sha256, boxCountBefore: row.box_count, boxCountAfter: a.boxCount, inventoryShaBefore: a.oldInventoryHash, inventoryShaAfter: a.newInventoryHash });
        }
        const inside = dbInfo(db);
        assert(JSON.stringify(inside) === JSON.stringify(EXPECTED_COUNTS_FINAL), `recuentos alterados dentro de la transacción: ${JSON.stringify(inside)}`);
        db.exec("COMMIT");
        writePerformed = applied.length > 0;
        productionAfter = inside;
        const afterDb = new Database(production, { readonly: true });
        let finalHashes: any[];
        try {
          finalHashes = afterDb.query("SELECT id, box_count, inventory_json FROM saves ORDER BY id").all() as any[];
        } finally {
          afterDb.close();
        }
        for (const { a } of pending) {
          const row = finalHashes.find((r) => r.id === a.id);
          assert(row && row.box_count === a.boxCount && sha(row.inventory_json) === a.newInventoryHash, `verificación posterior falló en el ID ${a.id}`);
        }
        outcome = {
          ok: true,
          mode: "execute",
          startedAt: new Date().toISOString(),
          production,
          backup,
          priorDryRun: prior,
          authorizedIds: AUTHORIZED.map((a) => a.id),
          before: productionBefore,
          after: productionAfter,
          counts: { authorized: 2, pending: pending.length, alreadyUpdated: decisions.length - pending.length, applied: applied.length, skipped: decisions.length - applied.length },
          applied,
          writePerformed,
          rolledBack,
          logicalSha256Before: logicalBefore,
          logicalSha256After: sha(db.serialize()),
          live: { classifications: live.candidates.map((c: any) => ({ id: c.id, classification: c.classification })) },
        };
      } catch (e) {
        try {
          db.exec("ROLLBACK");
          rolledBack = true;
        } catch {
          // la transacción ya está cerrada
        }
        db.close();
        throw e;
      }
      db.close();
    } else {
      outcome = {
        ok: true,
        mode: execute ? "execute-noop" : "verify-only",
        startedAt: new Date().toISOString(),
        production,
        backup,
        priorDryRun: prior,
        authorizedIds: AUTHORIZED.map((a) => a.id),
        before: productionBefore,
        after: productionBefore,
        counts: { authorized: 2, pending: pending.length, alreadyUpdated: decisions.length - pending.length, applied: 0, skipped: decisions.length },
        applied: [],
        writePerformed: false,
        rolledBack,
        live: { classifications: live.candidates.map((c: any) => ({ id: c.id, classification: c.classification })) },
      };
    }
  } catch (e) {
    outcome = { ok: false, mode: execute ? "execute" : "verify-only", startedAt: new Date().toISOString(), error: String(e) };
  }

  writeFileSync(reportPath, JSON.stringify(outcome, null, 2) + "\n");
  console.log(JSON.stringify(outcome, null, 2));
  if (!outcome.ok) process.exitCode = 1;
}

const EXPECTED_COUNTS_FINAL = { ...EXPECTED_COUNTS, integrity: "ok" };

if (import.meta.main) await main();
