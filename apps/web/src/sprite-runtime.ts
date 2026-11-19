// PG-07A: adapter entre la Guardería funcional y el renderer puro de PG-06.
// No toca el motor, las necesidades, la API de persistencia ni el fondo.
// Cualquier fallo (catálogo, red, decodificación, celdas vacías) devuelve null y el
// llamador aplica el renderer procedural original.

import {
  autoTier,
  frameRects,
  imageToImg,
  paint,
  prepareFrame,
  type Img,
  type PaletteMode,
  type Rect,
} from "./sprite-render.js";

export type RenderMode = "overworld" | "procedural";
export type SpriteEntry = {
  speciesId: number;
  id: string;
  file: string;
  shinyFile: string | null;
  forms: Record<string, string>;
  name: string;
  height: number;
  cellW: number;
  cellH: number;
  tier: 16 | 24 | 40 | 64;
};
export type PaintedBox = { x: number; y: number; w: number; h: number };
type Sheet = { img: Img; rects: Rect[] };

const PREF_KEY = "pokeguarde.pg07a.render";
const FRAME_MS = 280;
const IDLE_MS = 700;
const MOTION_MS = 220;

/** Ajustes puntuales para que las siluetas gigantes no tapen el LCD. */
export const TIER_OVERRIDES: Record<number, 16 | 24 | 40 | 64> = {
  95: 40, // Onix
  321: 40, // Wailord
};

function readPrefs(): { mode: RenderMode; palette: PaletteMode } {
  const fallback: { mode: RenderMode; palette: PaletteMode } = { mode: "overworld", palette: "rgba" };
  try {
    if (typeof localStorage === "undefined") return fallback;
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return fallback;
    const v = JSON.parse(raw) as { mode?: string; palette?: string };
    return {
      mode: v.mode === "procedural" || v.mode === "overworld" ? v.mode : fallback.mode,
      palette:
        v.palette === "rgba" || v.palette === "gbc4" || v.palette === "gbc16"
          ? v.palette
          : fallback.palette,
    };
  } catch {
    return fallback;
  }
}

const prefs = readPrefs();
let catalog: SpriteEntry[] = [];
let loading: Promise<void> | null = null;
const sheets = new Map<string, Sheet | null>();
const pendingFiles = new Set<string>();
let lastFootX: number | null = null;
let lastMotionAt = 0;
let direction: 0 | 1 | 2 | 3 = 0;
let walking = false;
let lastError = "";

function savePrefs() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* modo incógnito o almacenamiento lleno: la preferencia dura esta sesión */
  }
}

export function renderMode(): RenderMode {
  return prefs.mode;
}
export function paletteMode(): PaletteMode {
  return prefs.palette;
}
export function setRenderMode(mode: RenderMode) {
  prefs.mode = mode === "procedural" ? "procedural" : "overworld";
  savePrefs();
}
export function setPaletteMode(palette: PaletteMode) {
  prefs.palette = palette === "gbc4" || palette === "gbc16" ? palette : "rgba";
  savePrefs();
}

/** Resuelve el archivo por ID de especie, forma y variante shiny. */
export function resolveEntry(
  entries: SpriteEntry[],
  species: number,
  shiny = false,
  form?: number | string,
): SpriteEntry | null {
  const id = Math.trunc(Number(species));
  if (!Number.isFinite(id) || id <= 0) return null;
  const candidates = entries.filter((e) => e.speciesId === id);
  if (!candidates.length) return null;
  const base = candidates.find((e) => new RegExp(`^0*${id}\\.png$`, "i").test(e.file)) ?? candidates[0];
  const wanted = form === undefined || form === null ? undefined : String(form);
  // Sin forma explícita se usa la hoja base; con forma, la variante pedida.
  // Nunca se elige una forma «por defecto» porque no sabemos si es la del save.
  const file = (wanted !== undefined ? base.forms[wanted] : undefined) ?? base.file;
  const shinyFile = shiny && base.shinyFile ? base.shinyFile : null;
  return { ...base, file: shinyFile ?? file, shinyFile };
}

/** Dirección a partir del movimiento horizontal; conserva la última si está quieto. */
export function directionFromMotion(
  previousX: number,
  nextX: number,
  current: 0 | 1 | 2 | 3,
): 0 | 1 | 2 | 3 {
  const dx = nextX - previousX;
  if (Math.abs(dx) < 0.15) return current;
  return dx > 0 ? 2 : 1;
}

/** Fila 0 abajo, 1 izquierda, 2 derecha, 3 arriba; 4 frames por fila. */
export function frameOf(dir: number, walk: boolean, now: number): number {
  const row = (((Math.trunc(dir) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  const col = walk ? Math.floor(now / FRAME_MS) % 4 : Math.floor(now / IDLE_MS) % 2 === 0 ? 0 : 2;
  return row * 4 + col;
}

/** Tier por altura, con ajustes puntuales por especie. */
export function tierFor(entry: SpriteEntry): 16 | 24 | 40 | 64 {
  return TIER_OVERRIDES[entry.speciesId] ?? entry.tier ?? autoTier(entry.height);
}

export function setCatalog(entries: SpriteEntry[]): void {
  catalog = Array.isArray(entries) ? entries : [];
  lastError = "";
}

/** Carga el catálogo una vez. Si falla, la Guardería sigue en procedural. */
export function initOverworldSprites(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch("/api/sprites/catalog", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { entries?: SpriteEntry[] };
      setCatalog(Array.isArray(data.entries) ? data.entries : []);
    } catch (err) {
      setCatalog([]);
      lastError = `catálogo no disponible: ${String(err)}`;
    }
  })();
  return loading;
}

function getSheet(entry: SpriteEntry, file: string): Sheet | null {
  if (sheets.has(file)) return sheets.get(file)!;
  if (pendingFiles.has(file) || typeof document === "undefined") return null;
  pendingFiles.add(file);
  const image = new Image();
  image.onload = () => {
    pendingFiles.delete(file);
    try {
      const img = imageToImg(image);
      const rects = frameRects(img, entry.cellW, entry.cellH);
      const valid =
        rects.length === 16 &&
        rects.every(
          (r) => r.w > 0 && r.h > 0 && r.x >= 0 && r.y >= 0 && r.x + r.w <= img.width && r.y + r.h <= img.height,
        );
      if (!valid) {
        sheets.set(file, null);
        lastError = `hoja inválida (${file}): celdas vacías o fuera de la imagen`;
        return;
      }
      sheets.set(file, { img, rects });
    } catch (err) {
      sheets.set(file, null);
      lastError = `no se pudo decodificar ${file}: ${String(err)}`;
    }
  };
  image.onerror = () => {
    pendingFiles.delete(file);
    sheets.set(file, null);
    lastError = `no se pudo cargar ${file}`;
  };
  image.src = `/api/sprites/${encodeURIComponent(file)}`;
  return null;
}

/**
 * Pinta el sprite si procede. Devuelve null para que `nursery.ts` use el
 * procedural (modo Procedural, sprite ausente, cargando, error o pose dormida).
 */
export function paintOverworld(
  g: CanvasRenderingContext2D,
  species: number,
  shiny: boolean,
  pose: string,
  footX: number,
  footY: number,
  form?: number | string,
): PaintedBox | null {
  if (prefs.mode !== "overworld" || pose === "sleep" || !catalog.length) return null;
  const entry = resolveEntry(catalog, species, shiny, form);
  if (!entry || (!entry.cellW && !entry.cellH)) return null;

  const file = shiny && entry.shinyFile ? entry.shinyFile : entry.file;
  const sheet = getSheet(entry, file);
  if (!sheet) return null;

  const now = Date.now();
  if (lastFootX === null) {
    lastFootX = footX;
    lastMotionAt = now;
  } else if (now - lastMotionAt >= MOTION_MS) {
    const next = directionFromMotion(lastFootX, footX, direction);
    walking = next !== direction || Math.abs(footX - lastFootX) >= 0.15;
    direction = next;
    lastFootX = footX;
    lastMotionAt = now;
  }
  const active = pose === "idle" ? direction : 0;
  const frame = frameOf(active, pose === "idle" && walking, now);
  const rect = sheet.rects[frame];
  if (!rect || rect.w === 0) return null;

  try {
    return paint(g, prepareFrame(sheet.img, rect, tierFor(entry), prefs.palette), footX, footY);
  } catch (err) {
    lastError = `fallo al pintar: ${String(err)}`;
    return null;
  }
}

export function spriteStatus() {
  return {
    mode: prefs.mode,
    palette: prefs.palette,
    entries: catalog.length,
    loaded: [...sheets.values()].filter(Boolean).length,
    error: lastError,
  };
}

/** Solo para pruebas: reinicia el estado sin tocar preferencias. */
export function resetSpriteRuntime() {
  sheets.clear();
  pendingFiles.clear();
  lastFootX = null;
  lastMotionAt = 0;
  direction = 0;
  walking = false;
  lastError = "";
}
