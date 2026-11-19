// PG-07A: suministro LOCAL y de solo lectura de sprites overworld al frontend.
// El navegador nunca recibe rutas del sistema de archivos: solo nombres de
// archivo validados. El directorio debe estar explícitamente autorizado y debe
// vivir fuera del repositorio (los sprites de terceros no se versionan).

import { existsSync } from "node:fs";
import { join, resolve, sep } from "node:path";

const DEFAULT_DIR = "/tmp/opencode/pg06/extracted/Gen 1-7 OV SPrites";
const ALLOWED_PREFIXES = ["/tmp/opencode/"];
const META = process.env.PG07A_META ?? "/tmp/opencode/pg06/sprite-metadata.json";
const POKEAPI = process.env.PG07A_POKEAPI ?? "/tmp/opencode/pg06/pokeapi-pokemon.csv";

/** Directorio resuelto y autorizado, o null si la configuración no es segura. */
export const SPRITE_DIR: string | null = (() => {
  const raw = process.env.PG07A_SPRITE_DIR ?? DEFAULT_DIR;
  const dir = resolve(raw);
  if (!ALLOWED_PREFIXES.some((p) => dir.startsWith(p))) return null;
  return dir;
})();

export type SpriteEntry = {
  speciesId: number;
  id: string;
  file: string;
  shinyFile: string | null;
  /** Formas por índice numérico, p. ej. `{ "0": "001_0.png" }`. */
  forms: Record<string, string>;
  name: string;
  height: number;
  cellW: number;
  cellH: number;
  tier: 16 | 24 | 40 | 64;
};

/** Nombre de archivo estricto: sin rutas, sin traversal, solo PNG. */
export function isValidSpriteName(name: string): boolean {
  return (
    /^[0-9A-Za-z_+()\-]+\.png$/i.test(name) &&
    !name.includes("..") &&
    !name.includes("/") &&
    !name.includes("\\")
  );
}

/** Ruta absoluta únicamente dentro del directorio autorizado. */
export function spritePath(name: string): string | null {
  if (!SPRITE_DIR || !isValidSpriteName(name)) return null;
  const full = join(SPRITE_DIR, name);
  if (full !== SPRITE_DIR && !full.startsWith(SPRITE_DIR + sep)) return null;
  return full;
}

function tierFor(height: number): 16 | 24 | 40 | 64 {
  if (height <= 0.4) return 16;
  if (height < 1) return 24;
  if (height < 2) return 40;
  return 64;
}

let cache: SpriteEntry[] | null = null;

/**
 * Catálogo indexado por especie. Se construye una sola vez desde los metadatos
 * medidos en PG-06 y el CSV de alturas. Si faltan las fuentes temporales se
 * devuelve una lista vacía: la Guardería sigue funcionando en modo procedural.
 */
export async function spriteCatalog(): Promise<SpriteEntry[]> {
  if (cache) return cache;
  cache = [];
  if (!SPRITE_DIR || !existsSync(SPRITE_DIR)) return cache;
  if (!existsSync(META) || !existsSync(POKEAPI)) return cache;

  try {
    const meta = JSON.parse(await Bun.file(META).text()) as Array<{
      file: string;
      cell: string;
    }>;
    const known = new Set(meta.map((m) => m.file));
    const byFile = new Map(meta.map((m) => [m.file, m]));
    const heights = new Map<number, number>();
    const names = new Map<number, string>();
    for (const line of (await Bun.file(POKEAPI).text()).trim().split("\n").slice(1)) {
      const parts = line.split(",");
      const id = Number(parts[0]);
      heights.set(id, Number(parts[3]) / 10);
      const raw = String(parts[1] ?? "");
      names.set(id, raw.charAt(0).toUpperCase() + raw.slice(1));
    }

    const entries: SpriteEntry[] = [];
    for (const [file, m] of byFile) {
      const base = /^(\d{3})\.png$/i.exec(file);
      if (!base) continue;
      const id = base[1];
      const speciesId = Number(id);
      const [cellW, cellH] = m.cell.split("x").map(Number);
      if (!cellW || !cellH) continue;
      const forms: Record<string, string> = {};
      for (const f of known) {
        const form = new RegExp(`^${id}_(\\d+)\\.png$`, "i").exec(f);
        if (form) forms[form[1]] = f;
      }
      const shinyFile = known.has(`${id}s.png`) ? `${id}s.png` : null;
      const height = heights.get(speciesId) ?? 0;
      entries.push({
        speciesId,
        id,
        file,
        shinyFile,
        forms,
        name: names.get(speciesId) ?? `Pokémon ${speciesId}`,
        height,
        cellW,
        cellH,
        tier: tierFor(height),
      });
    }
    entries.sort((a, b) => a.speciesId - b.speciesId);
    cache = entries;
  } catch {
    cache = [];
  }
  return cache;
}
