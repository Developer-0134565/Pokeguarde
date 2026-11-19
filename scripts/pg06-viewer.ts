// PG-06: servidor estático AISLADO para el visor de sprites.
// No importa ni modifica apps/server/src/index.ts (API de la Guardería).
// Los sprites se leen desde /tmp; ningún PNG entra en Git.

import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const VIEWER = join(ROOT, "apps/web/viewer.html");
const RENDER_TS = join(ROOT, "apps/web/src/sprite-render.ts");
const VIEWER_TS = join(ROOT, "apps/web/src/sprite-viewer.ts");
const ROOM_PNG = join(ROOT, "apps/web/assets/room/guarderia.png");

const SPRITE_DIR =
  process.env.PG06_SPRITE_DIR ?? "/tmp/opencode/pg06/extracted/Gen 1-7 OV SPrites";
const META = process.env.PG06_META ?? "/tmp/opencode/pg06/sprite-metadata.json";
const POKEAPI = process.env.PG06_POKEAPI ?? "/tmp/opencode/pg06/pokeapi-pokemon.csv";
const PORT = Number(process.env.PORT ?? 8790);

type Curated = { id: string; group: string; note?: string };
const CURATED: Curated[] = [
  { id: "101", group: "Mascotas actuales", note: "Electrode" },
  { id: "490", group: "Mascotas actuales", note: "Manaphy" },
  { id: "034", group: "Mascotas actuales", note: "Nidoking" },
  { id: "081", group: "Mascotas actuales", note: "Magnemite" },
  { id: "025", group: "Referencia de animación", note: "Pikachu" },
  { id: "001", group: "Referencia de animación", note: "Bulbasaur" },
  { id: "095", group: "Extremos y escala", note: "Onix · 8,8 m en celda 64" },
  { id: "321", group: "Extremos y escala", note: "Wailord · 14,5 m" },
  { id: "595", group: "Extremos y escala", note: "Joltik · 0,1 m" },
  { id: "810", group: "Extremos y escala", note: "Grookey · 0,3 m en celda 128" },
  { id: "643", group: "Extremos y escala", note: "Reshiram" },
  { id: "249", group: "Extremos y escala", note: "Lugia" },
];

function fail(msg: string): never {
  console.error(`PG-06: ${msg}`);
  process.exit(1);
}

if (!existsSync(SPRITE_DIR)) {
  fail(`No existe el directorio de sprites: ${SPRITE_DIR}. Ejecuta scripts/pg06-extract.sh`);
}
if (!existsSync(META) || !existsSync(POKEAPI)) {
  fail(`Faltan metadatos en /tmp. Ejecuta scripts/pg06-extract.sh y vuelve a medir.`);
}

const meta = JSON.parse(await Bun.file(META).text()) as Array<{
  file: string;
  cell: string;
  w: number;
  h: number;
  unique_frames: number;
}>;
const byFile = new Map(meta.map((m) => [m.file, m]));

const heights = new Map<number, number>();
const names = new Map<number, string>();
for (const line of (await Bun.file(POKEAPI).text()).trim().split("\n").slice(1)) {
  const parts = line.split(",");
  const id = Number(parts[0]);
  heights.set(id, Number(parts[3]) / 10);
  const raw = parts[1] as string;
  names.set(id, raw.charAt(0).toUpperCase() + raw.slice(1));
}

const catalog = CURATED.map((c) => {
  const speciesId = Number(c.id);
  const file = `${c.id}.png`;
  const m = byFile.get(file);
  if (!m) fail(`Falta ${file} en el directorio de sprites`);
  const [cw, ch] = m.cell.split("x").map(Number);
  const shinyFile = byFile.has(`${c.id}s.png`) ? `${c.id}s.png` : null;
  return {
    id: c.id,
    speciesId,
    name: names.get(speciesId) ?? c.note ?? c.id,
    file,
    shinyFile,
    height: heights.get(speciesId) ?? 0,
    cellW: cw,
    cellH: ch,
    tier: 40,
    group: c.group,
    note: c.note,
  };
});

const transpiler = new Bun.Transpiler({ loader: "ts" });
const jsCache = new Map<string, string>();
async function transpile(path: string) {
  const cached = jsCache.get(path);
  if (cached) return cached;
  const out = transpiler.transformSync(await Bun.file(path).text());
  jsCache.set(path, out);
  return out;
}

const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      if (path === "/" || path === "/viewer.html") {
        return new Response(await Bun.file(VIEWER).text(), { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      if (path === "/sprite-render.js" || path === "/sprite-viewer.js") {
        const src = path === "/sprite-render.js" ? RENDER_TS : VIEWER_TS;
        return new Response(await transpile(src), { headers: { "content-type": "text/javascript; charset=utf-8" } });
      }
      if (path === "/catalog.json") {
        return new Response(JSON.stringify(catalog), { headers: { "content-type": "application/json" } });
      }
      if (path === "/room.png") {
        return new Response(await Bun.file(ROOM_PNG).arrayBuffer(), { headers: { "content-type": "image/png" } });
      }
      if (path.startsWith("/sprites/")) {
        const name = decodeURIComponent(path.slice("/sprites/".length));
        if (!/^[A-Za-z0-9_+()\-]+\.png$/i.test(name)) {
          return new Response("Nombre de sprite no válido", { status: 400 });
        }
        const full = join(SPRITE_DIR, name);
        if (!existsSync(full)) return new Response("No encontrado", { status: 404 });
        return new Response(await Bun.file(full).arrayBuffer(), {
          headers: { "content-type": "image/png", "cache-control": "max-age=3600" },
        });
      }
      return new Response("No encontrado", { status: 404 });
    } catch (err) {
      return new Response(`Error interno: ${String(err)}`, { status: 500 });
    }
  },
});

console.log(`PG-06 visor aislado: http://127.0.0.1:${server.port}`);
console.log(`Sprites: ${SPRITE_DIR}`);
console.log(`Fondo: ${ROOM_PNG} (original 160x144, sin usar guarderia.zip)`);
