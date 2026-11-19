// PG-06: visor aislado. No importa nada de la Guardería funcional.
import {
  alphaDigest,
  autoTier,
  frameRects,
  imageToImg,
  paint,
  paletteOf,
  prepareFrame,
  scaleForTier,
  toCanvas,
  usedColorCount,
  type Img,
  type PaletteMode,
  type Rect,
} from "/sprite-render.js";

type Entry = {
  id: string;
  speciesId: number;
  name: string;
  file: string;
  shinyFile: string | null;
  height: number;
  cellW: number;
  cellH: number;
  tier: 16 | 24 | 40 | 64;
  group: string;
  note?: string;
};

type FrameData = { img: Img; rects: Rect[]; digests: string[]; empty: number };
type CompareItem = { entry: Entry; shiny: boolean };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const PET_IDS = ["101", "490", "034", "081"];
const EXTREME_IDS = ["095", "321", "595", "810", "643", "249"];

const state = {
  entry: null as Entry | null,
  shiny: false,
  dir: 0,
  frameInRow: 0,
  playing: false,
  speed: 280,
  tier: 40,
  palette: "rgba" as PaletteMode,
  footX: 75,
  footY: 103,
  bg: true,
  anchor: true,
  grid: false,
  compare: [] as CompareItem[],
  sheetVisible: true,
};

let catalog: Entry[] = [];
const cache = new Map<string, Promise<FrameData>>();
const shinyInfo = new Map<string, number>();
let bgReady = false;
let lastTick = 0;
let compareGeneration = 0;
let lastPaint: { x: number; y: number; w: number; h: number } | null = null;
let readoutExtra = "";

const scene = $("scene") as HTMLCanvasElement;
const g = scene.getContext("2d")!;
const sheet = $("sheet") as HTMLCanvasElement;
const gs = sheet.getContext("2d")!;

function spriteUrl(file: string) {
  return `/sprites/${encodeURIComponent(file)}`;
}

function loadData(entry: Entry, shiny: boolean): Promise<FrameData> {
  const file = shiny && entry.shinyFile ? entry.shinyFile : entry.file;
  const key = file;
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = new Promise<FrameData>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const img = imageToImg(image);
      const rects = frameRects(img, entry.cellW, entry.cellH);
      resolve({
        img,
        rects,
        digests: rects.map((r) => alphaDigest(img, r)),
        empty: rects.filter((r) => r.w === 0 || r.h === 0).length,
      });
    };
    image.onerror = () => reject(new Error(`No se pudo cargar ${file}`));
    image.src = spriteUrl(file);
  });
  cache.set(key, promise);
  return promise;
}

async function ensureShinyInfo(entry: Entry) {
  if (!entry.shinyFile || shinyInfo.has(entry.id)) return;
  try {
    const [normal, shiny] = await Promise.all([loadData(entry, false), loadData(entry, true)]);
    let same = 0;
    for (let i = 0; i < 16; i++) if (normal.digests[i] === shiny.digests[i]) same++;
    shinyInfo.set(entry.id, same);
  } catch {
    shinyInfo.set(entry.id, -1);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "rgba(15,56,15,.35)";
  ctx.lineWidth = 1;
  for (let v = 0; v <= 160; v += 16) {
    ctx.beginPath(); ctx.moveTo(v + 0.5, 0); ctx.lineTo(v + 0.5, 144); ctx.stroke();
  }
  for (let v = 0; v <= 144; v += 16) {
    ctx.beginPath(); ctx.moveTo(0, v + 0.5); ctx.lineTo(160, v + 0.5); ctx.stroke();
  }
  ctx.restore();
}

function drawAnchor(ctx: CanvasRenderingContext2D) {
  const x = Math.round(state.footX);
  const y = Math.round(state.footY);
  ctx.save();
  ctx.strokeStyle = "#b51a21";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 5.5, y + 0.5); ctx.lineTo(x + 5.5, y + 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 0.5, y - 5.5); ctx.lineTo(x + 0.5, y + 5.5); ctx.stroke();
  ctx.strokeRect(x - 1.5, y - 1.5, 3, 3);
  if (lastPaint) {
    ctx.strokeStyle = "rgba(181,26,33,.8)";
    ctx.strokeRect(lastPaint.x - 0.5, lastPaint.y - 0.5, lastPaint.w + 1, lastPaint.h + 1);
  }
  ctx.restore();
}

function drawBackdrop(ctx: CanvasRenderingContext2D) {
  if (state.bg && bgReady) {
    const bg = new Image();
    if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0);
    // El fondo real se mantiene en `roomImage` (abajo) para no recargarlo.
  } else {
    ctx.fillStyle = "#9bbc0f";
    ctx.fillRect(0, 0, 160, 144);
  }
}

let roomImage: HTMLImageElement | null = null;

function paintInto(ctx: CanvasRenderingContext2D, data: FrameData, frame: number) {
  const r = data.rects[frame];
  if (!r || r.w === 0) return null;
  const prepared = prepareFrame(data.img, r, state.tier, state.palette);
  const box = paint(ctx, prepared, state.footX, state.footY);
  return { ...box, img: prepared.img };
}

async function drawScene() {
  const entry = state.entry;
  g.clearRect(0, 0, 160, 144);
  if (state.bg && roomImage && roomImage.complete && roomImage.naturalWidth) {
    g.drawImage(roomImage, 0, 0);
  } else {
    drawBackdrop(g);
  }
  if (state.grid) drawGrid(g);
  lastPaint = null;

  if (!entry) {
    $("readout").textContent = "Sin sprite seleccionado.";
    return;
  }
  const data = await loadData(entry, state.shiny);
  const frame = state.dir * 4 + state.frameInRow;
  const painted = paintInto(g, data, frame);
  lastPaint = painted ? { x: painted.x, y: painted.y, w: painted.w, h: painted.h } : null;
  if (state.anchor) drawAnchor(g);

  const r = data.rects[frame];
  const visible = { w: r?.w ?? 0, h: r?.h ?? 0 };
  const scaled = scaleForTier(visible, state.tier);
  const auto = autoTier(entry.height);
  const lines = [
    `${entry.name} · ${state.shiny ? entry.shinyFile : entry.file} · ID ${entry.speciesId}`,
    `celda ${entry.cellW}x${entry.cellH} · hoja ${data.img.width}x${data.img.height} · altura Pokédex ${entry.height} m`,
    `alfa visible ${visible.w}x${visible.h} · tier ${state.tier} px (sugerido ${auto}) · factor ${scaled.factor.toFixed(3)}`,
    `destino ${scaled.w}x${scaled.h} · ancla (${Math.round(state.footX)},${Math.round(state.footY)}) · frame ${frame} = fila ${state.dir}/col ${state.frameInRow}`,
    `rect ${r ? `x${r.x} y${r.y} w${r.w} h${r.h}` : "vacío"} · celdas vacías ${data.empty}/16 · digest alfa ${data.digests[frame]}`,
  ];
  if (state.shiny && entry.shinyFile) {
    const same = shinyInfo.get(entry.id);
    lines.push(same === undefined ? "comparando alfa normal/shiny…" : `alfa normal/shiny idéntica: ${same}/16 fotogramas`);
  }
  const palette = paletteOf(state.palette);
  if (palette && painted) {
    lines.push(`tonos usados en este frame: ${usedColorCount(painted.img)} de ${palette.length}`);
  }
  if (readoutExtra) lines.push(readoutExtra);
  $("readout").textContent = lines.join("\n");
  (window as any).__pg06 = {
    ...((window as any).__pg06 || {}),
    ready: true,
    catalog,
    state,
    lastPaint,
    frame,
    visible,
    scaled,
    usedColors: painted ? usedColorCount(painted.img) : 0,
    digests: data.digests,
    rects: data.rects,
    shinySame: shinyInfo.get(entry.id) ?? null,
    drawScene,
  };
}

async function drawSheet() {
  if (!state.sheetVisible || !state.entry) return;
  gs.clearRect(0, 0, sheet.width, sheet.height);
  gs.fillStyle = "#e0e8d0";
  gs.fillRect(0, 0, sheet.width, sheet.height);
  const data = await loadData(state.entry, state.shiny);
  const selected = state.dir * 4 + state.frameInRow;
  gs.font = "9px monospace";
  gs.textBaseline = "top";
  for (let i = 0; i < 16; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const ox = 8 + col * 76;
    const oy = 8 + row * 76;
    const r = data.rects[i];
    if (!r || r.w === 0) {
      gs.fillStyle = "#541111";
      gs.fillText(`R${row}C${col} ∅`, ox, oy + 64);
      continue;
    }
    const prepared = prepareFrame(data.img, r, 24, state.palette);
    const c = toCanvas(prepared.img);
    gs.imageSmoothingEnabled = false;
    gs.drawImage(c, ox + Math.round((64 - c.width) / 2), oy + Math.round((64 - c.height) / 2));
    gs.fillStyle = i === selected ? "#b51a21" : "#0f380f";
    gs.fillText(`R${row}C${col}${i === selected ? " ◀" : ""}`, ox, oy + 64);
  }
}

async function drawCompare() {
  const panel = $("compare-panel");
  if (state.compare.length === 0) {
    panel.classList.add("hidden");
    return;
  }
  panel.classList.remove("hidden");
  const container = $("compare");
  const generation = ++compareGeneration;
  container.innerHTML = "";
  const canvases: HTMLCanvasElement[] = [];
  for (const item of state.compare) {
    const fig = document.createElement("figure");
    const c = document.createElement("canvas");
    c.width = 160;
    c.height = 144;
    const cap = document.createElement("figcaption");
    cap.textContent = `${item.entry.name}${item.shiny ? " shiny" : ""} · tier ${state.tier} · ${state.palette}`;
    fig.append(c, cap);
    container.append(fig);
    canvases.push(c);
    const data = await loadData(item.entry, item.shiny);
    if (generation !== compareGeneration) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#9bbc0f";
    ctx.fillRect(0, 0, 160, 144);
    if (state.bg && roomImage && roomImage.complete) ctx.drawImage(roomImage, 0, 0);
    paintInto(ctx, data, state.dir * 4 + state.frameInRow);
    const r = data.rects[state.dir * 4 + state.frameInRow];
    cap.textContent += r ? ` · alfa ${r.w}x${r.h}` : " · vacío";
  }
}

function syncControls() {
  for (const b of document.querySelectorAll<HTMLButtonElement>("#dirs button"))
    b.setAttribute("aria-pressed", String(Number(b.dataset.dir) === state.dir));
  for (const b of document.querySelectorAll<HTMLButtonElement>("#tiers button"))
    b.setAttribute("aria-pressed", String(Number(b.dataset.tier) === state.tier));
  ($("frame") as HTMLInputElement).value = String(state.dir * 4 + state.frameInRow);
  $("frame-label").textContent = String(state.dir * 4 + state.frameInRow);
  ($("footx") as HTMLInputElement).value = String(state.footX);
  ($("footy") as HTMLInputElement).value = String(state.footY);
  $("footx-label").textContent = String(state.footX);
  $("footy-label").textContent = String(state.footY);
  ($("play") as HTMLButtonElement).setAttribute("aria-pressed", String(state.playing));
  ($("sheet-toggle") as HTMLButtonElement).setAttribute("aria-pressed", String(state.sheetVisible));
  sheet.classList.toggle("hidden", !state.sheetVisible);
}

function redraw() {
  syncControls();
  void drawScene();
  void drawSheet();
  void drawCompare();
}

function buildUi() {
  const select = $("species") as HTMLSelectElement;
  const groups = new Map<string, Entry[]>();
  for (const e of catalog) {
    if (!groups.has(e.group)) groups.set(e.group, []);
    groups.get(e.group)!.push(e);
  }
  for (const [name, entries] of groups) {
    const og = document.createElement("optgroup");
    og.label = name;
    for (const e of entries) {
      const o = document.createElement("option");
      o.value = e.id;
      o.textContent = `${e.id} · ${e.name}${e.note ? " · " + e.note : ""}`;
      og.append(o);
    }
    select.append(og);
  }
  select.value = PET_IDS[0];

  const list = $("compare-list");
  for (const e of catalog) {
    const lab = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = e.id;
    cb.checked = PET_IDS.includes(e.id);
    cb.addEventListener("change", () => {
      state.compare = Array.from(list.querySelectorAll<HTMLInputElement>("input:checked"))
        .map((x) => catalog.find((y) => y.id === x.value)!)
        .filter(Boolean)
        .map((entry) => ({ entry, shiny: false }));
      void drawCompare();
    });
    lab.append(cb, document.createTextNode(`${e.id} ${e.name}`));
    list.append(lab);
  }
}

function wire() {
  ($("species") as HTMLSelectElement).addEventListener("change", (ev) => {
    state.entry = catalog.find((e) => e.id === (ev.target as HTMLSelectElement).value) ?? null;
    state.shiny = false;
    ($("shiny") as HTMLInputElement).checked = false;
    if (state.entry) state.tier = autoTier(state.entry.height);
    const note = state.entry ? `${state.entry.file} · ${state.entry.cellW}x${state.entry.cellH} · ${state.entry.height} m` : "";
    $("catalog-note").textContent = note;
    if (state.entry) void ensureShinyInfo(state.entry).then(() => redraw());
    redraw();
  });

  ($("shiny") as HTMLInputElement).addEventListener("change", (ev) => {
    state.shiny = (ev.target as HTMLInputElement).checked;
    redraw();
  });

  for (const b of document.querySelectorAll<HTMLButtonElement>("#dirs button")) {
    b.addEventListener("click", () => { state.dir = Number(b.dataset.dir); state.frameInRow = 0; redraw(); });
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>("#tiers button")) {
    b.addEventListener("click", () => { state.tier = Number(b.dataset.tier); redraw(); });
  }

  ($("frame") as HTMLInputElement).addEventListener("input", (ev) => {
    const v = Number((ev.target as HTMLInputElement).value);
    state.dir = Math.floor(v / 4);
    state.frameInRow = v % 4;
    redraw();
  });
  ($("speed") as HTMLInputElement).addEventListener("input", (ev) => {
    state.speed = Number((ev.target as HTMLInputElement).value);
    $("speed-label").textContent = String(state.speed);
  });
  $("play").addEventListener("click", () => { state.playing = !state.playing; lastTick = performance.now(); redraw(); });
  $("stop").addEventListener("click", () => { state.playing = false; redraw(); });

  ($("palette") as HTMLSelectElement).addEventListener("change", (ev) => {
    state.palette = (ev.target as HTMLSelectElement).value as PaletteMode;
    readoutExtra = state.palette === "gbc16"
      ? "paleta gbc16: 16 tonos derivados (el frame usa un subconjunto)"
      : paletteOf(state.palette)
        ? `paleta ${state.palette}: ${paletteOf(state.palette)!.length} colores`
        : "paleta RGBA original (predeterminada)";
    redraw();
  });
  for (const id of ["bg", "anchor", "grid"] as const) {
    ($(id) as HTMLInputElement).addEventListener("change", (ev) => {
      state[id] = (ev.target as HTMLInputElement).checked;
      redraw();
    });
  }
  for (const id of ["footx", "footy"] as const) {
    $(id).addEventListener("input", (ev) => {
      const key = id === "footx" ? "footX" : "footY";
      state[key] = Number((ev.target as HTMLInputElement).value);
      redraw();
    });
  }
  $("resetpos").addEventListener("click", () => { state.footX = 75; state.footY = 103; redraw(); });

  let dragging = false;
  const move = (ev: PointerEvent) => {
    if (!dragging) return;
    const r = scene.getBoundingClientRect();
    state.footX = Math.max(0, Math.min(159, Math.round(((ev.clientX - r.left) * 160) / r.width)));
    state.footY = Math.max(0, Math.min(143, Math.round(((ev.clientY - r.top) * 144) / r.height)));
    redraw();
  };
  scene.addEventListener("pointerdown", (ev) => { dragging = true; scene.setPointerCapture(ev.pointerId); move(ev); });
  scene.addEventListener("pointermove", move);
  scene.addEventListener("pointerup", () => { dragging = false; });

  $("compare-pets").addEventListener("click", () => {
    state.compare = PET_IDS.map((id) => ({ entry: catalog.find((e) => e.id === id)!, shiny: false }));
    for (const cb of ($("compare-list") as HTMLElement).querySelectorAll<HTMLInputElement>("input"))
      cb.checked = PET_IDS.includes(cb.value);
    void drawCompare();
  });
  $("compare-extremes").addEventListener("click", () => {
    state.compare = EXTREME_IDS.filter((id) => catalog.some((e) => e.id === id))
      .map((id) => ({ entry: catalog.find((e) => e.id === id)!, shiny: false }));
    for (const cb of ($("compare-list") as HTMLElement).querySelectorAll<HTMLInputElement>("input"))
      cb.checked = EXTREME_IDS.includes(cb.value);
    void drawCompare();
  });
  $("compare-shiny").addEventListener("click", () => {
    if (!state.entry) return;
    const items: CompareItem[] = [{ entry: state.entry, shiny: false }];
    if (state.entry.shinyFile) items.push({ entry: state.entry, shiny: true });
    state.compare = items;
    void drawCompare();
    if (state.entry.shinyFile) {
      void ensureShinyInfo(state.entry).then(() => {
        readoutExtra = `Comparativa shiny · alfa idéntica ${shinyInfo.get(state.entry!.id)}/16`;
        redraw();
      });
    }
  });
  $("compare-clear").addEventListener("click", () => {
    state.compare = [];
    readoutExtra = "";
    void drawCompare();
  });
  $("sheet-toggle").addEventListener("click", () => {
    state.sheetVisible = !state.sheetVisible;
    $("sheet-toggle").textContent = state.sheetVisible ? "Ocultar hoja 4×4" : "Mostrar hoja 4×4";
    redraw();
  });

  function tick(now: number) {
    if (state.playing && now - lastTick >= state.speed) {
      lastTick = now;
      state.frameInRow = (state.frameInRow + 1) % 4;
      redraw();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function main() {
  const res = await fetch("/catalog.json");
  if (!res.ok) throw new Error(`catálogo no disponible: ${res.status}`);
  catalog = await res.json() as Entry[];
  roomImage = new Image();
  roomImage.onload = () => { bgReady = true; redraw(); };
  roomImage.src = "/room.png";

  buildUi();
  wire();
  state.entry = catalog.find((e) => e.id === PET_IDS[0]) ?? catalog[0] ?? null;
  if (state.entry) {
    state.tier = autoTier(state.entry.height);
    $("species").setAttribute("value", state.entry.id);
    ($("species") as HTMLSelectElement).value = state.entry.id;
    $("catalog-note").textContent = `${state.entry.file} · ${state.entry.cellW}x${state.entry.cellH} · ${state.entry.height} m`;
    void ensureShinyInfo(state.entry).then(() => redraw());
  }
  (window as any).__pg06 = {
    ready: false,
    catalog,
    state,
    loadData,
    helpers: { frameRects, alphaDigest, scaleForTier, prepareFrame, autoTier },
    paletteOf,
  };
  redraw();
}

main().catch((err) => {
  $("readout").textContent = `Error: ${String(err)}`;
  console.error(err);
});
