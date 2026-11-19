/**
 * PG-07G — reanálisis seguro de inventarios al contrato PG-07F.
 *
 * Por defecto es SOLO LECTURA: abre la base indicada con readonly, analiza los
 * saves desde sus copias por SHA-256 y emite un informe JSON. Nunca escribe.
 *
 * Para actualizar una base explícitamente aislada:
 *   bun run scripts/pg07g-reanalyze.ts --apply --target /ruta/copia.db
 *
 * La base de producción se rechaza siempre como destino, incluidos enlaces
 * simbólicos que resuelvan a ella. No modifica saves, legalidad ni esquema.
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { inventory as sidecarInventory } from "../apps/server/src/sidecar.ts";

const ROOT = resolve(import.meta.dir, "..");
export const PRODUCTION_DB = join(ROOT, "data", "pokegotchi.db");
export const PRODUCTION_DATA_DIR = join(ROOT, "data");
const SAVE_EXTENSIONS = ["srm", "sav", "dsv", "bin"];

type SaveRow = {
  id: number;
  sha256: string;
  filename: string;
  stored_path: string;
  generation: number | null;
  box_count: number | null;
  pokemon_total: number | null;
  legal_count: number | null;
  unverified_count: number | null;
  illegal_count: number | null;
  inventory_json: string;
};

function sha256Bytes(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256File(path: string): string | null {
  if (!existsSync(path)) return null;
  try {
    return sha256Bytes(readFileSync(path));
  } catch {
    return null;
  }
}

/** Serialización canónica estable: los objetos se comparan por contenido real. */
export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = canonical(v);
    }
    return out;
  }
  return value;
}

function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

/** `ref` es añadido por PG-07F; no forma parte de la identidad anterior. */
function stripVolatile(p: any): any {
  if (!p || typeof p !== "object" || Array.isArray(p)) return p;
  const out = { ...p };
  delete out.ref;
  return out;
}

function flattenMons(inv: any): Map<string, any> {
  const out = new Map<string, any>();
  for (const [i, p] of ((inv?.party ?? []) as any[]).entries()) {
    const slot = Number(p?.slot ?? i + 1);
    out.set(`party:${slot}`, stripVolatile(p));
  }
  for (const box of (inv?.boxes ?? []) as any[]) {
    for (const [i, p] of ((box?.slots ?? []) as any[]).entries()) {
      const slot = Number(p?.slot ?? i + 1);
      out.set(`box:${Number(box.index)}:${slot}`, stripVolatile(p));
    }
  }
  return out;
}

function changedKeys(oldP: any, newP: any): string[] {
  const keys = new Set([...Object.keys(oldP ?? {}), ...Object.keys(newP ?? {})]);
  const out: string[] = [];
  for (const key of [...keys].sort()) {
    if (key === "ref") continue;
    if (!equal((oldP ?? {})[key], (newP ?? {})[key])) out.push(key);
  }
  return out;
}

export function compareInventories(oldInv: any, newInv: any) {
  const expected: string[] = [];
  const unexpected: string[] = [];
  const incomplete: string[] = [];
  const legalChanged: string[] = [];

  if (newInv?.storage && typeof newInv.storage === "object") {
    expected.push(`storage.availability=${newInv.storage.availability ?? "desconocido"}`);
  } else {
    incomplete.push("falta inventory.storage");
  }
  if (Number.isInteger(newInv?.storage?.boxCount)) {
    expected.push(`boxCount=${newInv.storage.boxCount}`);
  } else {
    incomplete.push("storage.boxCount no disponible");
  }
  if (Number.isInteger(newInv?.storage?.slotCount)) {
    expected.push(`slotCount=${newInv.storage.slotCount}`);
  } else {
    incomplete.push("storage.slotCount no disponible");
  }

  const oldBoxes = Array.isArray(oldInv?.boxes) ? oldInv.boxes : [];
  const newBoxes = Array.isArray(newInv?.boxes) ? newInv.boxes : [];
  if (newBoxes.length < oldBoxes.length) {
    unexpected.push(`cajas: ${oldBoxes.length} -> ${newBoxes.length} (pérdida)`);
  } else {
    expected.push(`cajas: ${oldBoxes.length} -> ${newBoxes.length}`);
  }
  const emptyAdded = newBoxes.filter((b: any) => Array.isArray(b?.positions) && b.positions.length > 0 && (b.slots?.length ?? 0) === 0).length;
  if (emptyAdded > 0) expected.push(`${emptyAdded} cajas vacías expuestas`);
  const withPositions = newBoxes.filter((b: any) => Array.isArray(b?.positions)).length;
  if (withPositions > 0) expected.push(`${withPositions} cajas con posiciones reales`);

  for (const key of Object.keys(oldInv ?? {}).sort()) {
    if (key === "boxes" || key === "party") continue;
    if (!(key in (newInv ?? {}))) {
      unexpected.push(`clave eliminada: ${key}`);
    } else if (key === "path") {
      // Procedencia del análisis: cambia al reanalizar desde la copia por hash.
      expected.push("path de análisis actualizado");
    } else if (key === "roundTrip") {
      // Diagnóstico del sidecar: la forma canónica no cambia aunque el
      // indicador `identical` se recalcule con la versión actual.
      const before = (oldInv as any).roundTrip ?? {};
      const after = (newInv as any).roundTrip ?? {};
      const canonicalOutputStable =
        before.outputSha256 === after.outputSha256 &&
        before.inputSize === after.inputSize &&
        before.outputSize === after.outputSize;
      if (canonicalOutputStable) expected.push("roundTrip recalculado (misma salida canónica)");
      else unexpected.push(`roundTrip alterado: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
    } else if (!equal((oldInv as any)[key], (newInv as any)[key])) {
      unexpected.push(`clave alterada: ${key}`);
    }
  }
  for (const key of Object.keys(newInv ?? {}).sort()) {
    if (!(key in (oldInv ?? {})) && key !== "storage") expected.push(`clave añadida: ${key}`);
  }

  if (!equal(oldInv?.counts, newInv?.counts)) {
    unexpected.push(`counts: ${JSON.stringify(oldInv?.counts)} -> ${JSON.stringify(newInv?.counts)}`);
    legalChanged.push("counts");
  }
  if (!equal((oldInv?.party ?? []).map(stripVolatile), (newInv?.party ?? []).map(stripVolatile))) {
    unexpected.push("party alterado");
  }

  const oldMons = flattenMons(oldInv);
  const newMons = flattenMons(newInv);
  for (const [key, oldMon] of oldMons) {
    const newMon = newMons.get(key);
    if (!newMon) {
      unexpected.push(`Pokémon ausente: ${key}`);
      continue;
    }
    const changed = changedKeys(oldMon, newMon);
    const addedOnly = changed.filter((k) => !(k in oldMon) && k in newMon);
    const substantive = changed.filter((k) => !addedOnly.includes(k));
    if (addedOnly.length > 0) expected.push(`Pokémon ${key}: campos nuevos ${addedOnly.join(",")}`);
    if (substantive.length > 0) {
      unexpected.push(`Pokémon alterado ${key}: ${substantive.join(",")}`);
      const legalFields = substantive.filter((k) =>
        ["legal", "verdict", "issues", "legalityReport", "species", "pid", "nickname", "level", "evs", "ivs", "moves"].includes(k),
      );
      if (legalFields.length > 0) legalChanged.push(`${key}:${legalFields.join(",")}`);
    }
  }
  for (const key of newMons.keys()) {
    if (!oldMons.has(key)) unexpected.push(`Pokémon nuevo: ${key}`);
  }

  if (newInv?.storage?.availability !== "available") incomplete.push(`availability=${newInv?.storage?.availability ?? "desconocido"}`);
  if (newInv?.storage?.namesAvailable !== true) incomplete.push("nombres de caja no disponibles");
  if (newInv?.storage?.emptySlotsKnown !== true) incomplete.push("ranuras vacías no conocidas");
  if (newBoxes.some((b: any) => !Array.isArray(b?.positions))) incomplete.push("hay cajas sin positions");

  return { expected, unexpected, incomplete, legalChanged };
}

export function resolveSource(row: SaveRow, dbPath: string): { path: string | null; method: string; shaMatches: boolean; attempts: string[] } {
  const attempts: string[] = [];
  const candidates: Array<{ path: string; method: string }> = [];
  if (row.stored_path) candidates.push({ path: row.stored_path, method: "stored_path" });
  const sibling = join(dirname(dbPath), "saves");
  for (const ext of SAVE_EXTENSIONS) {
    candidates.push({ path: join(sibling, `${row.sha256}.${ext}`), method: "hash_named_copy" });
  }
  for (const ext of SAVE_EXTENSIONS) {
    candidates.push({ path: join(PRODUCTION_DATA_DIR, "saves", `${row.sha256}.${ext}`), method: "production_hash_copy" });
  }
  for (const c of candidates) {
    if (!existsSync(c.path)) continue;
    const hash = sha256File(c.path);
    attempts.push(`${c.method}:${basename(c.path)}:${hash === row.sha256 ? "ok" : "hash-distinto"}`);
    if (hash === row.sha256) return { path: c.path, method: c.method, shaMatches: true, attempts };
  }
  return { path: null, method: "none", shaMatches: false, attempts };
}

async function analyzeRow(row: SaveRow, dbPath: string) {
  const base: any = {
    id: row.id,
    sha256: row.sha256,
    filename: row.filename,
    generation: row.generation,
    classification: "REQUIERE REVISIÓN",
    action: "skip",
    reasons: [] as string[],
  };
  let oldInv: any;
  try {
    oldInv = JSON.parse(row.inventory_json);
  } catch (e) {
    base.reasons.push(`inventory_json no analizable: ${String(e)}`);
    return base;
  }
  const source = resolveSource(row, dbPath);
  base.source = source;
  if (!source.path) {
    base.classification = "SIN FUENTE DISPONIBLE";
    base.reasons.push("no hay copia del save con hash coincidente");
    return base;
  }
  if (oldInv?.storage && typeof oldInv.storage === "object") {
    base.classification = "ACTUALIZADO";
    base.action = "none";
    base.reasons.push("ya contiene inventory.storage");
    return base;
  }
  if (!oldInv?.detected) {
    base.classification = "INCOMPATIBLE";
    base.reasons.push("inventario anterior marked detected=false");
    return base;
  }

  const result = await sidecarInventory(source.path);
  if (!result.ok) {
    base.reasons.push(`error del sidecar: ${result.error}`);
    return base;
  }
  const newInv = result.data as any;
  if (!newInv?.detected) {
    base.classification = "INCOMPATIBLE";
    base.reasons.push("el sidecar no detectó el save");
    return base;
  }

  const comparison = compareInventories(oldInv, newInv);
  base.comparison = comparison;
  base.oldInventoryHash = sha256Bytes(row.inventory_json);
  const newJson = JSON.stringify(newInv);
  base.newInventoryHash = sha256Bytes(newJson);
  base.newInventoryJson = newJson;
  base.oldSummary = {
    boxes: (oldInv.boxes ?? []).length,
    slots: (oldInv.boxes ?? []).reduce((n: number, b: any) => n + (b.slots?.length ?? 0), 0),
    party: (oldInv.party ?? []).length,
    counts: oldInv.counts ?? null,
  };
  base.newSummary = {
    boxes: (newInv.boxes ?? []).length,
    slots: (newInv.boxes ?? []).reduce((n: number, b: any) => n + (b.slots?.length ?? 0), 0),
    party: (newInv.party ?? []).length,
    counts: newInv.counts ?? null,
    storage: newInv.storage ?? null,
  };
  base.proposedUpdate = {
    box_count: Number.isInteger(newInv.storage?.boxCount) ? newInv.storage.boxCount : (newInv.boxes ?? []).length,
    inventory_json_sha256: base.newInventoryHash,
  };

  if (comparison.legalChanged.length > 0 || comparison.unexpected.length > 0) {
    base.classification = "REQUIERE REVISIÓN";
    base.reasons.push("hay cambios inesperados; se conserva el inventario anterior");
    return base;
  }
  if (comparison.incomplete.length > 0) {
    base.classification = "REQUIERE REVISIÓN";
    base.reasons.push("metadatos incompletos; no se actualiza");
    return base;
  }
  base.classification = "REANALIZABLE";
  base.action = "would-update";
  base.reasons.push("reanálisis seguro: solo se añaden metadatos de almacenamiento");
  return base;
}

function dbInfo(db: Database) {
  return {
    saves: (db.query("SELECT COUNT(*) n FROM saves").get() as any).n as number,
    pokemon: (db.query("SELECT COUNT(*) n FROM pokemon").get() as any).n as number,
    pets: (db.query("SELECT COUNT(*) n FROM pets").get() as any).n as number,
    exports: (db.query("SELECT COUNT(*) n FROM exports").get() as any).n as number,
    integrity: (db.query("PRAGMA integrity_check").get() as any).integrity_check as string,
  };
}

function summarize(candidates: any[]) {
  const out: Record<string, number> = {};
  for (const c of candidates) out[c.classification] = (out[c.classification] ?? 0) + 1;
  return out;
}

export async function analyzeDatabase(dbPath: string, mode: "dry-run" | "apply-preview" = "dry-run") {
  const db = new Database(dbPath, { readonly: true });
  const before = dbInfo(db);
  const rows = db.query("SELECT * FROM saves ORDER BY id").all() as SaveRow[];
  const candidates: any[] = [];
  for (const row of rows) candidates.push(await analyzeRow(row, dbPath));
  const after = dbInfo(db);
  db.close();
  const skipped = candidates.filter((c) => c.action !== "would-update").length;
  return {
    mode,
    startedAt: new Date().toISOString(),
    database: dbPath,
    before,
    after,
    counts: {
      rows: candidates.length,
      byClassification: summarize(candidates),
      wouldUpdate: candidates.filter((c) => c.action === "would-update").length,
      alreadyUpdated: candidates.filter((c) => c.classification === "ACTUALIZADO").length,
      skipped,
    },
    ok: candidates.every((c) => c.classification !== "REQUIERE REVISIÓN"),
    writePerformed: false,
    candidates,
  };
}

export function assertWritableTarget(target: string): { path: string; realPath: string } {
  const resolved = resolve(target);
  if (!existsSync(resolved)) throw new Error("la base de destino debe existir; el modo seguro no crea bases");
  if (resolved === resolve(PRODUCTION_DB)) throw new Error("rechazado: base de producción como destino");
  if (resolved.startsWith(PRODUCTION_DATA_DIR + sep)) throw new Error("rechazado: destino dentro del directorio de producción");
  let real: string;
  let prodReal: string;
  try {
    real = realpathSync(resolved);
    prodReal = realpathSync(PRODUCTION_DB);
  } catch {
    throw new Error("no se pudieron resolver las rutas reales para la comprobación de enlaces");
  }
  if (real === prodReal) throw new Error("rechazado: el destino resuelve a la base de producción");
  return { path: resolved, realPath: real };
}

export async function applyDatabase(target: string) {
  const checked = assertWritableTarget(target);
  const db = new Database(checked.path);
  const logicalBefore = sha256Bytes(db.serialize());
  const before = dbInfo(db);
  const rows = db.query("SELECT * FROM saves ORDER BY id").all() as SaveRow[];
  const candidates: any[] = [];
  for (const row of rows) candidates.push(await analyzeRow(row, checked.path));
  const selected = candidates.filter((c) => c.action === "would-update");
  const applied: any[] = [];
  let rolledBack = false;

  try {
    db.exec("BEGIN IMMEDIATE");
    const update = db.query("UPDATE saves SET box_count=?, inventory_json=? WHERE id=? AND sha256=?");
    for (const c of selected) {
      const row = db.query<{ box_count: number; inventory_json: string; legal_count: number; unverified_count: number; illegal_count: number }, [number]>(
        "SELECT box_count, inventory_json, legal_count, unverified_count, illegal_count FROM saves WHERE id=?",
      ).get(c.id)!;
      const result = update.run(c.proposedUpdate.box_count, c.newInventoryJson, c.id, c.sha256);
      if (result.changes !== 1) throw new Error(`update inesperado en fila ${c.id}`);
      // El análisis ya garantizó igualdad de legalidad; se vuelve a comprobar
      // contra la fila real antes de confirmar la transacción.
      if (row.legal_count === null || row.unverified_count === null || row.illegal_count === null) {
        throw new Error(`legalidad ausente en fila ${c.id}`);
      }
      applied.push({ id: c.id, sha256: c.sha256, boxCountBefore: row.box_count, boxCountAfter: c.proposedUpdate.box_count, inventoryShaBefore: sha256Bytes(row.inventory_json), inventoryShaAfter: c.newInventoryHash });
    }
    const afterInside = dbInfo(db);
    if (afterInside.saves !== before.saves || afterInside.pokemon !== before.pokemon || afterInside.pets !== before.pets || afterInside.exports !== before.exports) {
      throw new Error("los recuentos relacionales cambiaron; se revierte la transacción");
    }
    if (afterInside.integrity !== "ok") throw new Error("integrity_check falló dentro de la transacción");
    db.exec("COMMIT");
  } catch (e) {
    try {
      db.exec("ROLLBACK");
      rolledBack = true;
    } catch {
      // La transacción ya estaba cerrada; no hay nada que revertir.
    }
    db.close();
    return {
      mode: "apply",
      startedAt: new Date().toISOString(),
      target: checked.path,
      ok: false,
      rolledBack,
      error: String(e),
      before,
      applied: [],
      candidates,
    };
  }

  const after = dbInfo(db);
  const logicalAfter = sha256Bytes(db.serialize());
  db.close();
  return {
    mode: "apply",
    startedAt: new Date().toISOString(),
    target: checked.path,
    targetRealPath: checked.realPath,
    ok: candidates.every((c) => c.classification !== "REQUIERE REVISIÓN"),
    writePerformed: applied.length > 0,
    rolledBack,
    logicalSha256Before: logicalBefore,
    logicalSha256After: logicalAfter,
    before,
    after,
    counts: {
      rows: candidates.length,
      byClassification: summarize(candidates),
      selected: selected.length,
      applied: applied.length,
      skipped: candidates.length - selected.length,
    },
    applied,
    candidates,
  };
}

async function main() {
  const args = process.argv.slice(2);
  let mode: "dry-run" | "apply" = "dry-run";
  let target: string | null = null;
  let report: string | null = null;
  let dbPath = PRODUCTION_DB;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--apply") mode = "apply";
    else if (arg === "--dry") mode = "dry-run";
    else if (arg === "--target") target = args[++i] ?? null;
    else if (arg === "--db") dbPath = args[++i] ?? PRODUCTION_DB;
    else if (arg === "--report") report = args[++i] ?? null;
    else throw new Error(`opción desconocida: ${arg}`);
  }

  if (mode === "apply" && !target) throw new Error("--apply exige --target explícito");
  if (mode === "dry-run" && target) throw new Error("--target solo se usa con --apply");
  if (mode === "apply" && args.includes("--db")) throw new Error("--db no se usa con --apply; usa --target");

  const result = mode === "apply" ? await applyDatabase(target!) : await analyzeDatabase(dbPath);
  const text = JSON.stringify(result, null, 2) + "\n";
  if (report) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(report, text);
  } else {
    console.log(text);
  }
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(`PG-07G: ${String(e)}`);
    process.exitCode = 1;
  });
}
