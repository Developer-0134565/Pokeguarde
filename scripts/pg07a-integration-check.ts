// PG-07A: comprobaciones puras de integración y fallback (sin navegador).
// No arranca el servidor, no escribe en SQLite y no lee partidas.
import { isValidSpriteName, spriteCatalog, spritePath, SPRITE_DIR } from "../apps/server/src/sprites.ts";
import {
  directionFromMotion,
  frameOf,
  paintOverworld,
  renderMode,
  resolveEntry,
  setCatalog,
  setPaletteMode,
  setRenderMode,
  spriteStatus,
  tierFor,
  type SpriteEntry,
} from "../apps/web/src/sprite-runtime.ts";

let checks = 0;
const ok = (name: string, cond: boolean) => {
  checks++;
  if (!cond) throw new Error(`FALLO: ${name}`);
  console.log(`  ok  ${name}`);
};

/* ---------- Seguridad del servidor de recursos ---------- */

ok("directorio de sprites autorizado", SPRITE_DIR !== null && SPRITE_DIR.startsWith("/tmp/opencode/"));
ok("nombre PNG simple aceptado", isValidSpriteName("101.png"));
ok("nombre con forma aceptado", isValidSpriteName("001_0.png"));
ok("nombre shiny aceptado", isValidSpriteName("490s.png"));
for (const bad of ["../secreto.png", "sub/101.png", "..\\secreto.png", "101.jpg", "101.png/../../x", ""]) {
  ok(`nombre rechazado: ${bad}`, !isValidSpriteName(bad));
}
const safe = spritePath("101.png");
ok("ruta segura dentro del directorio", !!safe && safe.startsWith(SPRITE_DIR + "/"));
ok("traversal no produce ruta", spritePath("../../etc/passwd.png") === null);

/* ---------- Catálogo real desde /tmp ---------- */

const catalog = await spriteCatalog();
ok("catálogo no vacío", catalog.length > 0);
const find = (id: number) => catalog.find((e) => e.speciesId === id)!;
for (const id of [101, 490, 34, 81, 595, 95, 321]) {
  const e = find(id);
  ok(`especie ${id} en el catálogo`, !!e && /^\d{3}\.png$/.test(e.file));
  ok(`celda válida para ${id}`, !!e && e.cellW > 0 && e.cellH > 0);
}
ok("forma alternativa indexada", Object.keys(find(1).forms).length > 0);
ok("variante shiny indexada", !!find(490).shinyFile);
ok("tier de Wailord según altura", find(321).tier === 64);

/* ---------- Resolución por especie, forma y shiny ---------- */

const electrode = resolveEntry(catalog, 101, false);
ok("resuelve Electrode", electrode?.file === "101.png");
ok("resuelve Manaphy shiny", resolveEntry(catalog, 490, true)?.file === "490s.png");
const pikachuForm = resolveEntry(catalog, 25, false, 0);
ok("resuelve forma 0 de Pikachu", !!pikachuForm && /^025_\d+\.png$/.test(pikachuForm.file));
ok("especie desconocida -> null", resolveEntry(catalog, 99999, false) === null);
ok("ID inválido -> null", resolveEntry(catalog, 0, false) === null);

/* ---------- Direcciones, fotogramas y escalado ---------- */

ok("movimiento a la derecha", directionFromMotion(10, 11, 0) === 2);
ok("movimiento a la izquierda", directionFromMotion(11, 10, 2) === 1);
ok("quieto conserva dirección", directionFromMotion(10, 10.05, 3) === 3);
ok("fila abajo", frameOf(0, true, 0) === 0 && frameOf(0, true, 280) === 1);
ok("fila izquierda", frameOf(1, true, 0) === 4);
ok("fila derecha", frameOf(2, true, 0) === 8);
ok("fila arriba", frameOf(3, true, 0) === 12);
ok("reposo alterna columnas 0 y 2", frameOf(0, false, 0) === 0 && frameOf(0, false, 700) === 2);
ok("tier por defecto", tierFor({ ...find(101), speciesId: 9999 } as SpriteEntry) === 40);
ok("ajuste puntual de Onix", tierFor(find(95)) === 40);
ok("ajuste puntual de Wailord", tierFor(find(321)) === 40);

/* ---------- Fallback y preferencias ---------- */

setCatalog([]);
const fake = { width: 160, height: 144 } as unknown as CanvasRenderingContext2D;
ok("sin catálogo -> fallback", paintOverworld(fake, 101, false, "idle", 74, 103) === null);
ok("estado sin sprites", spriteStatus().entries === 0);
setCatalog(catalog);
ok("sin DOM -> fallback", paintOverworld(fake, 101, false, "idle", 74, 103) === null);
ok("pose dormida -> fallback", paintOverworld(fake, 101, false, "sleep", 74, 103) === null);

const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
};
const withStore = await import("../apps/web/src/sprite-runtime.ts?pg07a-prefs");
ok("preferencia por defecto", withStore.renderMode() === "overworld" && withStore.paletteMode() === "rgba");
withStore.setRenderMode("procedural");
withStore.setPaletteMode("gbc16");
ok("preferencia persistida", JSON.parse(store.get("pokeguarde.pg07a.render")!).mode === "procedural");
ok("modo procedural -> fallback", withStore.paintOverworld(fake, 101, false, "idle", 74, 103) === null);
withStore.setRenderMode("overworld");
withStore.setPaletteMode("rgba");
ok("preferencia restaurada", renderMode() === "overworld");

console.log(`PG-07A integration-check: ${checks} comprobaciones correctas.`);
