// Guardería: render GBC sobre un lienzo de 160x144 y puente con la API de mascotas.
// El motor (/pet-engine.js) es puro; aquí solo se dibuja y se envían acciones.
import {
  ACTION_INFO,
  TRAIN_GAMES,
  actionLabel,
  advance,
  applyAction,
  moodOf,
  moodLabel,
  statLabel,
  train,
  trainHint,
  trainLabel,
  type ActionId,
  type PetProfile,
  type PetState,
  type StatIndex,
} from "/pet-engine.js";
import { NIGHT_CROSSFADE_MS, nightTarget, stepMix } from "/daynight.js";
import { formatClock, t } from "/i18n.ts";
import {
  initOverworldSprites,
  paletteMode,
  paintOverworld,
  renderMode,
  setPaletteMode,
  setRenderMode,
  spriteStatus,
  type PaletteMode,
  type RenderMode,
} from "/sprite-runtime.js";

/* ------------------------------------------------------------------ */
/* Tipos de la API                                                    */
/* ------------------------------------------------------------------ */

type Pet = {
  id: number;
  save: string | null;
  active: boolean;
  createdAt: string;
  profile: PetProfile;
  state: PetState;
  mood: ReturnType<typeof moodOf>;
  ageDays: number;
  evs: number[];
  totalEvs: number;
  caps: { perStat: number; total: number; unit: "ev" | "statexp" };
};

/** Respuesta de `POST /api/pets/:id/export` (dry-run o escritura real). */
type ExportOutcome = {
  ok: boolean;
  written: boolean;
  dryRun: boolean;
  note?: string;
  error?: string;
  applied: number[];
  withheld: number[];
  report: {
    roundTripIdentical?: boolean;
    normalization?: { changedBytes: number };
    diff?: { changedBytes: number };
    outputPath?: string | null;
    outputSha256?: string;
  };
  pet: Pet;
};

/* ------------------------------------------------------------------ */
/* Paleta y utilidades de dibujo                                      */
/* ------------------------------------------------------------------ */

const C = ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"] as const;

type G = CanvasRenderingContext2D;

const px = (g: G, x: number, y: number, w = 1, h = 1, c = 0) => {
  g.fillStyle = C[c];
  g.fillRect(Math.round(x), Math.round(y), w, h);
};

const rect = (g: G, x: number, y: number, w: number, h: number, c = 0) => px(g, x, y, w, h, c);

/* Fuente 3x5 dibujada píxel a píxel: nada de antialiasing ni fuentes del sistema. */
const GLYPHS: Record<string, string> = {
  " ": "000000000000000",
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
  I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
  Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
  Y: "101101010010010", Z: "111001010100111",
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001011001111",
  "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001",
  "8": "111101111101111", "9": "111101111001111",
  ":": "000010000010000", ".": "000000000000010", "!": "010010010000010", "?": "111001011000010",
  "-": "000000111000000", "/": "001001010100100", "+": "000010111010000", "%": "101001010100101",
  "(": "001010010010001", ")": "100010010010100", "*": "000101010101000",
};

function text(g: G, str: string, x: number, y: number, c = 0) {
  let cx = Math.round(x);
  for (const ch of String(str).toUpperCase()) {
    const glyph = GLYPHS[ch];
    if (glyph) {
      for (let i = 0; i < 15; i++) {
        if (glyph[i] === "1") px(g, cx + (i % 3), y + Math.floor(i / 3), 1, 1, c);
      }
    }
    cx += 4;
  }
}

const textWidth = (s: string) => Math.max(0, String(s).length * 4 - 1);

/* ------------------------------------------------------------------ */
/* Estado del módulo                                                  */
/* ------------------------------------------------------------------ */

let root: HTMLElement | null = null;
let onBack: (() => void) | null = null;
let canvas: HTMLCanvasElement | null = null;
let g: G | null = null;
let raf = 0;
let pets: Pet[] = [];
let activeId: number | null = null;
let local: PetState | null = null;
let notice = "";
let mode: "room" | "game" = "room";
let scale = 6;
let lastPaint = 0;
let game: GameState | null = null;
let busy = false;
/** Última previsualización/exportación de la mascota activa (se limpia al cambiar). */
let lastExport: ExportOutcome | null = null;

/* ------------------------------------------------------------------ */
/* Fondo de la habitación                                             */
/* ------------------------------------------------------------------ */

/**
 * La habitación es una imagen 160x144 (10:9) que sustituye a la sala dibujada.
 * Se sirve desde `apps/web/assets/room/`. Si aún no ha cargado, se usa la sala
 * GBC de reserva para no dejar el lienzo en negro.
 *
 * Coordenadas en píxeles del lienzo (160x144). La mascota se ancla por los
 * PIES: `walk` define la franja caminable y la línea del suelo, y `sprite` la
 * caja de dibujo del arquetipo; de ahí se deriva la esquina superior izquierda
 * que espera `drawPet`. No hay franja reservada para HUD dentro de la imagen.
 */
const ROOM = {
  /** Fondo diurno provisional. */
  dayImage: "/assets/room/guarderia.png",
  /** Fondo nocturno: aún no existe; si falta, se mantiene el diurno. */
  nightImage: "/assets/room/guarderia-night.png",
  /** Zona caminable: rango horizontal de los pies y línea del suelo. */
  walk: { minX: 61, maxX: 89, groundY: 103 },
  /** Caja de dibujo del arquetipo en pie. */
  sprite: { w: 26, h: 21 },
  /** Punto donde se acuesta a dormir (esquina superior izquierda del sprite). */
  sleepSpot: { x: 120, y: 88 },
  /** Duración del fundido día -> noche, en milisegundos. */
  crossfadeMs: NIGHT_CROSSFADE_MS,
};

let roomDay: HTMLImageElement | null = null;
let roomNight: HTMLImageElement | null = null;
let roomDayReady = false;
let roomNightReady = false;

function loadRoom() {
  if (!roomDay) {
    const img = new Image();
    img.onload = () => {
      roomDayReady = true;
    };
    img.onerror = () => {
      roomDayReady = false;
    };
    img.src = ROOM.dayImage;
    roomDay = img;
  }
  if (!roomNight) {
    const img = new Image();
    img.onload = () => {
      roomNightReady = true;
    };
    // Si el asset nocturno no existe todavía, se mantiene el fondo diurno.
    img.onerror = () => {
      roomNightReady = false;
    };
    img.src = ROOM.nightImage;
    roomNight = img;
  }
}

/** Fundido día/noche: 0 = diurno, 1 = nocturno. */
let nightMix = 0;
let lastMixAt = 0;

/**
 * Avanza el fundido hacia su objetivo (0 o 1) a ritmo de `crossfadeMs`.
 * La lógica pura vive en `daynight.ts`; aquí solo se guarda el estado.
 * Sin imagen nocturna cargada el objetivo es siempre 0 (se mantiene el diurno).
 */
function advanceNightMix(now: number): number {
  const target = nightTarget(new Date().getHours(), roomNightReady);
  const dt = lastMixAt ? Math.max(0, now - lastMixAt) : 0;
  lastMixAt = now;
  nightMix = stepMix(nightMix, target, dt, ROOM.crossfadeMs);
  return nightMix;
}

type GameState = {
  stat: StatIndex;
  label: string;
  round: number;
  rounds: number;
  zone: number;
  period: number;
  startedAt: number;
  scores: number[];
  flash: { at: number; text: string } | null;
  finished: boolean;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((body as any)?.error ?? (body as any)?.message ?? `HTTP ${res.status}`);
  return body as T;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (k) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[k]!);

function activePet(): Pet | null {
  return pets.find((p) => p.id === activeId) ?? pets[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Entrada pública                                                    */
/* ------------------------------------------------------------------ */

export type AdoptIdentity = { pid?: number; location?: string; box?: number; slot?: number };

export async function adoptPet(
  sha: string,
  id: AdoptIdentity,
): Promise<{ ok: boolean; message: string; pet?: Pet }> {
  try {
    const out = await api<{ pet: Pet }>("/api/pets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sha256: sha, ...id }),
    });
    return { ok: true, message: t("adopt.done", { name: out.pet.profile.nickname }), pet: out.pet };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function openNursery(host: HTMLElement, back: () => void, preferId?: number) {
  root = host;
  onBack = back;
  host.innerHTML = `<div class="nursery-loading">${esc(t("nursery.loading"))}</div>`;
  try {
    await refreshPets();
    if (preferId && pets.some((p) => p.id === preferId)) {
      activeId = preferId;
      local = activePet()?.state ?? null;
    }
  } catch (e) {
    host.innerHTML = `<p class="placeholder bad">${esc(t("nursery.loadError", { msg: (e as Error).message }))}</p>`;
    return;
  }
  paintShell();
  loadRoom();
  // El catálogo es best-effort: si falla, el procedural sigue dibujando.
  void initOverworldSprites().then(updateRenderStatus);
  startLoop();
}

export function closeNursery() {
  cancelAnimationFrame(raf);
  raf = 0;
  mode = "room";
  game = null;
  local = null;
  canvas = null;
  g = null;
  root = null;
}

/* ------------------------------------------------------------------ */
/* Carga y refresco                                                   */
/* ------------------------------------------------------------------ */

async function refreshPets() {
  const out = await api<{ pets: Pet[] }>("/api/pets");
  pets = out.pets;
  const act = pets.find((p) => p.active) ?? pets[0] ?? null;
  activeId = act?.id ?? null;
  local = act ? { ...act.state } : null;
}

function activeProfile(): PetProfile | null {
  return activePet()?.profile ?? null;
}

/* ------------------------------------------------------------------ */
/* Interfaz HTML                                                      */
/* ------------------------------------------------------------------ */

function paintShell() {
  if (!root) return;
  const pet = activePet();

  root.innerHTML = `
    <div class="nursery">
      <div class="nursery-main">
        <div class="screen-frame">
          <canvas id="pg-canvas" width="160" height="144"></canvas>
        </div>
        <div class="pg-hud" id="pg-hud"></div>
        <div class="nursery-controls" id="pg-controls"></div>
        <p class="nursery-notice" id="pg-notice">${esc(notice)}</p>
      </div>
      <aside class="nursery-side">
        <div class="panel-head">
          <h2>${esc(t("nursery.heading"))}</h2>
          <button id="pg-back" class="ghost" title="${esc(t("nav.back"))}">←</button>
        </div>
        ${pet ? "" : `<p class="placeholder">${esc(t("nursery.empty"))}</p>`}
        <ul class="pet-list" id="pg-list">${pets.map(petRow).join("")}</ul>
        <div class="pg-render" id="pg-render">
          <div class="pg-render-row">
            <label for="pg-mode">${esc(t("render.mode"))}</label>
            <select id="pg-mode">
              <option value="overworld"${renderMode() === "overworld" ? " selected" : ""}>${esc(t("render.mode.overworld"))}</option>
              <option value="procedural"${renderMode() === "procedural" ? " selected" : ""}>${esc(t("render.mode.procedural"))}</option>
            </select>
          </div>
          <div class="pg-render-row">
            <label for="pg-palette">${esc(t("render.palette"))}</label>
            <select id="pg-palette">
              <option value="rgba"${paletteMode() === "rgba" ? " selected" : ""}>${esc(t("render.palette.rgba"))}</option>
              <option value="gbc4"${paletteMode() === "gbc4" ? " selected" : ""}>${esc(t("render.palette.gbc4"))}</option>
              <option value="gbc16"${paletteMode() === "gbc16" ? " selected" : ""}>${esc(t("render.palette.gbc16"))}</option>
            </select>
          </div>
          <p class="muted tiny" id="pg-render-status"></p>
        </div>
        <div id="pg-sheet">${pet ? petSheet(pet) : ""}</div>
        <p class="muted tiny">${esc(t("nursery.footer"))}</p>
      </aside>
    </div>
  `;

  canvas = root.querySelector<HTMLCanvasElement>("#pg-canvas");
  if (canvas) {
    g = canvas.getContext("2d");
    if (g) g.imageSmoothingEnabled = false;
    canvas.addEventListener("pointerdown", onPointer);
    applyScale();
    window.addEventListener("resize", applyScale);
  }

  root.querySelector<HTMLButtonElement>("#pg-back")?.addEventListener("click", () => onBack?.());
  root.querySelectorAll<HTMLElement>(".pet-pick").forEach((el) => {
    el.addEventListener("click", () => {
      activeId = Number(el.dataset.id);
      local = activePet()?.state ?? null;
      lastExport = null;
      mode = "room";
      paintShell();
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => doAction(btn.dataset.act as ActionId));
  });
  root.querySelectorAll<HTMLButtonElement>("[data-train]").forEach((btn) => {
    btn.addEventListener("click", () => startGame(Number(btn.dataset.train) as StatIndex));
  });
  root.querySelector<HTMLButtonElement>("#pg-activate")?.addEventListener("click", activate);
  root.querySelector<HTMLButtonElement>("#pg-release")?.addEventListener("click", release);
  root.querySelector<HTMLSelectElement>("#pg-mode")?.addEventListener("change", (ev) => {
    setRenderMode((ev.currentTarget as HTMLSelectElement).value as RenderMode);
    updateRenderStatus();
  });
  root.querySelector<HTMLSelectElement>("#pg-palette")?.addEventListener("change", (ev) => {
    setPaletteMode((ev.currentTarget as HTMLSelectElement).value as PaletteMode);
    updateRenderStatus();
  });

  paintControls();
  updateRenderStatus();
  updateSheet();
}

/** Estado visible del selector: catálogo, carga y último fallo (si lo hay). */
function updateRenderStatus() {
  const el = root?.querySelector<HTMLElement>("#pg-render-status");
  if (!el) return;
  const s = spriteStatus();
  const key = !s.entries || (s.error && s.loaded === 0)
    ? "render.status.unavailable"
    : s.mode === "procedural"
        ? "render.status.procedural"
        : "render.status.ready";
  el.textContent = t(key, { n: s.entries, msg: s.error });
}

function petRow(p: Pet) {
  const on = p.id === activeId;
  return `<li class="pet-pick ${on ? "on" : ""}" data-id="${p.id}">
    <b>${esc(p.profile.nickname)}</b>
    <span class="muted">${esc(t("pet.level", { n: p.profile.level }))} · ${esc(p.profile.speciesName)}</span>
    <span class="chip ${on ? "good" : ""}">${esc(moodLabel(p.mood))}</span>
  </li>`;
}

/** Bloque «Exportar al save»: previsualización dry-run y confirmación de escritura. */
function exportBlock(p: Pet) {
  const st = local ?? p.state;
  const pend = (st.pendingEvs ?? []).map((n) => Math.max(0, Math.round(n)));
  const total = pend.reduce((a, b) => a + b, 0);
  const unit = p.caps.unit === "ev" ? t("unit.ev") : t("unit.statexp");
  const off = busy ? " disabled" : "";

  if (!lastExport) {
    const disabled = total === 0 ? " disabled" : off;
    const hint =
      total === 0
        ? t("export.pending.none")
        : t("export.pending.some", { total, unit });
    return `
      <div class="sheet-actions">
        <button id="pg-export" class="primary"${disabled}>${esc(t("export.preview"))}</button>
      </div>
      <p class="muted tiny">${esc(hint)}</p>
    `;
  }

  const e = lastExport;
  const fmtPlus = (arr: number[]) =>
    [0, 1, 2, 3, 4, 5]
      .map((i) => ((arr[i] ?? 0) > 0 ? `${statLabel(i as StatIndex)} +${arr[i]}` : null))
      .filter(Boolean)
      .join(" · ");
  const fmtPlain = (arr: number[]) =>
    [0, 1, 2, 3, 4, 5]
      .map((i) => ((arr[i] ?? 0) > 0 ? `${statLabel(i as StatIndex)} ${arr[i]}` : null))
      .filter(Boolean)
      .join(" · ");
  const applied = fmtPlus(e.applied) || t("export.nothing");
  const withheld = fmtPlain(e.withheld);
  const estado = e.written
    ? t("export.state.written")
    : e.dryRun
      ? t("export.state.dry")
      : t("export.state.none");
  const bytes = e.report?.diff ? ` · ${t("export.bytes", { n: e.report.diff.changedBytes })}` : "";
  const norm = e.report?.normalization?.changedBytes
    ? ` · ${t("export.normalized", { n: e.report.normalization.changedBytes })}`
    : "";
  const canWrite = e.dryRun && e.ok && e.applied.some((n) => n > 0);
  const writeBtn = canWrite
    ? `<button id="pg-export-write" class="primary"${off}>${esc(t("export.write"))}</button>`
    : "";
  const fileLine =
    e.written && e.report?.outputPath
      ? `<p class="muted tiny">${esc(t("export.file"))} <code>${esc(e.report.outputPath)}</code></p>`
      : "";
  return `
    <div class="export-out">
      <p class="muted tiny"><b>${esc(estado)}</b>${bytes}${norm}</p>
      <p class="muted tiny">${esc(t("export.applied", { list: applied }))}</p>
      ${withheld ? `<p class="muted tiny">${esc(t("export.withheld", { list: withheld }))}</p>` : ""}
      ${e.note ? `<p class="muted tiny">${esc(e.note)}</p>` : ""}
      ${e.error ? `<p class="muted tiny danger-text">${esc(e.error)}</p>` : ""}
      ${fileLine}
      <div class="sheet-actions">
        ${writeBtn}
        <button id="pg-export" class="ghost"${off}>${esc(t("export.resimulate"))}</button>
      </div>
    </div>
  `;
}

function petSheet(p: Pet) {
  const st = local ?? p.state;
  const bar = (label: string, value: number) =>
    `<div class="need"><span>${label}</span><div class="track"><div style="width:${Math.round(value)}%"></div></div><b>${Math.round(value)}</b></div>`;
  const unit = p.caps.unit === "ev" ? t("unit.ev") : t("unit.statexp");
  const total = p.caps.total
    ? t("sheet.totalOf", { a: p.totalEvs, b: p.caps.total })
    : t("sheet.totalNoCap", { a: p.totalEvs });

  return `
    <h3>${esc(p.profile.nickname)} <span class="muted">${esc(t("pet.level", { n: p.profile.level }))}</span></h3>
    <p class="muted tiny">${esc(p.profile.speciesName)} · ${esc(p.profile.nature ?? t("pet.noNature"))} · ${esc(t("pet.days", { n: p.ageDays }))} · ${Math.round(st.weight * 10) / 10} kg</p>
    <div class="needs">
      ${bar(t("need.hunger"), st.hunger)}
      ${bar(t("need.happiness"), st.happiness)}
      ${bar(t("need.energy"), st.energy)}
      ${bar(t("need.hygiene"), st.hygiene)}
      ${bar(t("need.discipline"), st.discipline)}
      ${bar(t("need.sleepiness"), st.sleepiness)}
    </div>
    <p class="muted tiny">${esc(t("sheet.trainings", { n: st.sessions }))} · ${esc(t("sheet.points", { n: Math.floor(st.points) }))} · ${esc(st.sleeping ? t("pet.sleeping") : t("pet.awake"))}</p>
    <h3>${esc(t("sheet.pending"))}</h3>
    <div class="ev-pending">
      ${[0, 1, 2, 3, 4, 5].map(
        (i) =>
          `<div><span>${esc(statLabel(i as StatIndex))}</span><b>${(st.pendingEvs?.[i] ?? 0) > 0 ? "+" : ""}${st.pendingEvs?.[i] ?? 0}</b><span class="muted">${p.evs[i] ?? 0}</span></div>`,
      ).join("")}
    </div>
    <p class="muted tiny">${esc(t("sheet.capLine", { unit, total: p.totalEvs, perStat: p.caps.perStat }))}</p>
    <h3>${esc(t("sheet.export"))}</h3>
    ${exportBlock(p)}
    <div class="sheet-actions">
      ${p.active ? "" : `<button id="pg-activate" class="ghost">${esc(t("sheet.activate"))}</button>`}
      <button id="pg-release" class="ghost danger">${esc(t("sheet.release"))}</button>
    </div>
  `;
}

function paintControls() {
  const pet = activePet();
  const box = root?.querySelector<HTMLElement>("#pg-controls");
  if (!box) return;
  if (!pet) {
    box.innerHTML = "";
    return;
  }
  const st = local ?? pet.state;
  const now = Date.now();
  const btn = (act: ActionId) => {
    const info = ACTION_INFO[act];
    const left = (st.lastActionAt?.[act] ?? 0) + info.cooldown - now;
    const wait = left > 0 ? Math.ceil(left / 60000) : 0;
    return `<button data-act="${act}" class="ghost" ${wait ? "disabled" : ""}>${esc(actionLabel(act))}${wait ? ` <em>${esc(t("action.wait", { n: wait }))}</em>` : ""}</button>`;
  };

  box.innerHTML = `
    ${btn("feed")}
    ${btn("play")}
    ${btn("clean")}
    ${btn("pet")}
    ${btn("scold")}
    ${st.sleeping ? `<button data-act="wake" class="ghost">${esc(actionLabel("wake"))}</button>` : `<button data-act="sleep" class="ghost">${esc(actionLabel("sleep"))}</button>`}
    <span class="sep"></span>
    ${TRAIN_GAMES.map(
      (game) => `<button data-train="${game.stat}" class="train" ${st.sleeping || st.energy < 15 ? "disabled" : ""}>${esc(trainLabel(game.stat))}</button>`,
    ).join("")}
  `;

  box.querySelectorAll<HTMLButtonElement>("[data-act]").forEach((b) =>
    b.addEventListener("click", () => doAction(b.dataset.act as ActionId)),
  );
  box.querySelectorAll<HTMLButtonElement>("[data-train]").forEach((b) =>
    b.addEventListener("click", () => startGame(Number(b.dataset.train) as StatIndex)),
  );
}

function updateSheet() {
  const pet = activePet();
  const sheet = root?.querySelector<HTMLElement>("#pg-sheet");
  if (sheet && pet) sheet.innerHTML = petSheet(pet);
  paintHud();
  root?.querySelector<HTMLElement>("#pg-notice") &&
    (root.querySelector<HTMLElement>("#pg-notice")!.textContent = notice);
  paintControls();
  updateRenderStatus();
  root?.querySelector<HTMLButtonElement>("#pg-activate")?.addEventListener("click", activate);
  root?.querySelector<HTMLButtonElement>("#pg-release")?.addEventListener("click", release);
  root?.querySelector<HTMLButtonElement>("#pg-export")?.addEventListener("click", exportPreview);
  root?.querySelector<HTMLButtonElement>("#pg-export-write")?.addEventListener("click", exportWrite);
  root?.querySelectorAll<HTMLElement>(".pet-pick").forEach((el) => {
    el.onclick = () => {
      activeId = Number(el.dataset.id);
      local = activePet()?.state ?? null;
      lastExport = null;
      mode = "room";
      paintShell();
    };
  });
}

/**
 * HUD fuera del lienzo: nombre, ánimo, reloj, puntos y las seis necesidades.
 * Antes se pintaba en la franja inferior del canvas (y118-144), que ahora queda
 * libre para la imagen de la habitación.
 */
function paintHud() {
  const box = root?.querySelector<HTMLElement>("#pg-hud");
  if (!box) return;
  const pet = activePet();
  if (!pet) {
    box.innerHTML = "";
    return;
  }
  const st = local ?? pet.state;
  const name = pet.profile.nickname || pet.profile.speciesName;
  const mood = moodLabel(st.sleeping ? "dormido" : moodOf(st));
  const needs: [string, number][] = [
    [t("need.hunger"), st.hunger],
    [t("need.happiness"), st.happiness],
    [t("need.energy"), st.energy],
    [t("need.hygiene"), st.hygiene],
    [t("need.discipline"), st.discipline],
    [t("need.sleepiness"), st.sleepiness],
  ];
  const clock = formatClock();
  box.innerHTML = `
    <div class="hud-top">
      <b class="hud-name">${esc(name)}</b>
      <span class="hud-mood">${esc(mood)}</span>
      <span class="hud-meta">${esc(clock)} · ${esc(t("hud.points", { n: Math.floor(st.points) }))}</span>
    </div>
    <div class="hud-needs">
      ${needs
        .map(([label, value]) => {
          const v = Math.round(Math.max(0, Math.min(100, value)));
          return `<div class="hud-need${v < 25 ? " low" : ""}"><span>${esc(label)}</span><div class="track"><div style="width:${v}%"></div></div><b>${v}</b></div>`;
        })
        .join("")}
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* Acciones                                                           */
/* ------------------------------------------------------------------ */

async function doAction(action: ActionId) {
  const pet = activePet();
  if (!pet || busy) return;
  busy = true;
  try {
    const out = await api<{ ok: boolean; message: string; pet: Pet }>(`/api/pets/${pet.id}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    notice = out.message;
    replacePet(out.pet);
    paintControls();
    updateSheet();
  } catch (e) {
    notice = (e as Error).message;
    updateSheet();
  } finally {
    busy = false;
  }
}

function replacePet(p: Pet) {
  const i = pets.findIndex((x) => x.id === p.id);
  if (i >= 0) pets[i] = p;
  if (p.id === activeId) local = { ...p.state };
}

async function activate() {
  const pet = activePet();
  if (!pet) return;
  try {
    const out = await api<{ pets: Pet[] }>(`/api/pets/${pet.id}/active`, { method: "POST" });
    pets = out.pets;
    activeId = pet.id;
    local = activePet()?.state ?? null;
    notice = t("pet.active", { name: pet.profile.nickname });
    paintShell();
  } catch (e) {
    notice = (e as Error).message;
    updateSheet();
  }
}

async function release() {
  const pet = activePet();
  if (!pet) return;
  if (!confirm(t("pet.releaseConfirm", { name: pet.profile.nickname }))) return;
  try {
    await api(`/api/pets/${pet.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    notice = t("pet.released", { name: pet.profile.nickname });
    await refreshPets();
    paintShell();
  } catch (e) {
    notice = (e as Error).message;
    updateSheet();
  }
}

/** Previsualiza la exportación (dry-run): no escribe nada en el save. */
async function exportPreview() {
  const pet = activePet();
  if (!pet || busy) return;
  busy = true;
  updateSheet();
  try {
    const out = await api<ExportOutcome>(`/api/pets/${pet.id}/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    lastExport = out;
    notice = t("export.ready");
    replacePet(out.pet);
  } catch (e) {
    lastExport = null;
    notice = (e as Error).message;
  } finally {
    busy = false;
    updateSheet();
  }
}

/** Escribe de verdad: pide confirmación y genera un archivo nuevo. */
async function exportWrite() {
  const pet = activePet();
  if (!pet || busy) return;
  if (!confirm(t("export.confirmWrite", { name: pet.profile.nickname }))) {
    return;
  }
  busy = true;
  updateSheet();
  try {
    const out = await api<ExportOutcome>(`/api/pets/${pet.id}/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ write: true }),
    });
    lastExport = out;
    notice = out.written
      ? t("export.wroteTo", { path: out.report.outputPath ?? t("export.wroteNew") })
      : out.note ?? out.error ?? t("export.wroteNothing");
    replacePet(out.pet);
  } catch (e) {
    notice = (e as Error).message;
  } finally {
    busy = false;
    updateSheet();
  }
}

/* ------------------------------------------------------------------ */
/* Minijuego de entrenamiento                                         */
/* ------------------------------------------------------------------ */

function startGame(stat: StatIndex) {
  const pet = activePet();
  if (!pet) return;
  game = {
    stat,
    label: trainLabel(stat),
    round: 0,
    rounds: 5,
    zone: zoneFor(stat, 0),
    period: 1500,
    startedAt: performance.now(),
    scores: [],
    flash: null,
    finished: false,
  };
  mode = "game";
  notice = t("train.start", { hint: trainHint(stat) });
  updateSheet();
}

/** Zona objetivo determinista: depende del stat, la ronda y el PID. */
function zoneFor(stat: number, round: number): number {
  const pid = activePet()?.profile.pid ?? 1;
  const h = Math.imul((pid >>> 0) ^ (stat * 2654435761) ^ (round * 97 + 13), 0x9e3779b1) >>> 0;
  // Se deja margen a ambos lados para que el cursor pueda pasarse.
  return 0.22 + ((h % 1000) / 1000) * 0.56;
}

function cursorAt(gs: GameState, now: number): number {
  const dt = (now - gs.startedAt) / gs.period;
  return dt % 1;
}

function onPointer() {
  if (mode === "game" && game && !game.finished) hit();
  else if (mode === "room") {
    doAction("pet");
  }
}

function hit() {
  const gs = game;
  if (!gs || gs.finished) return;
  const now = performance.now();
  const pos = cursorAt(gs, now);
  const dist = Math.abs(pos - (gs.zone + 0.05));
  const score = Math.max(0, 1 - dist / 0.22);
  gs.scores.push(score);
  gs.flash = {
    at: now,
    text: score > 0.75 ? t("game.perfect") : score > 0.4 ? t("game.good") : t("game.weak"),
  };
  gs.round += 1;

  if (gs.round >= gs.rounds) {
    gs.finished = true;
    finishGame();
  } else {
    gs.zone = zoneFor(gs.stat, gs.round);
    gs.period = Math.max(700, gs.period - 150);
    gs.startedAt = now;
  }
}

async function finishGame() {
  const gs = game;
  const pet = activePet();
  if (!gs || !pet) return;
  const avg = gs.scores.reduce((a, b) => a + b, 0) / Math.max(1, gs.scores.length);
  const profile = pet.profile;
  const state = local ?? pet.state;

  try {
    const out = await api<{ ok: boolean; message: string; granted: number; pet: Pet }>(
      `/api/pets/${pet.id}/train`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stat: gs.stat, score: avg }),
      },
    );
    notice = out.message;
    replacePet(out.pet);
  } catch (e) {
    // Si el servidor lo rechaza (agotado, tope, enfriamiento) se aplica en local
    // solo para mostrar el aviso, sin tocar la persistencia.
    const localOut = train(state, profile, gs.stat, avg, Date.now());
    notice = (e as Error).message || localOut.message;
  }

  setTimeout(() => {
    mode = "room";
    game = null;
    paintShell();
  }, 1400);
}

/* ------------------------------------------------------------------ */
/* Bucle y dibujo                                                     */
/* ------------------------------------------------------------------ */

function startLoop() {
  cancelAnimationFrame(raf);
  let lastSync = 0;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (!canvas || !g) return;

    const pet = activePet();
    if (!pet) {
      drawEmpty(g);
      return;
    }

    if (!local) local = { ...pet.state };
    // Puesta al día local: mismo motor puro que usa el servidor.
    if (now - lastSync > 500) {
      local = advance(local, pet.profile, Date.now());
      lastSync = now;
    }

    if (mode === "game" && game) drawGame(g, pet, game, performance.now());
    else drawRoom(g, pet, local, performance.now());

    if (now - lastPaint > 700) {
      lastPaint = now;
      // updateSheet repinta la ficha Y reengancha los botones; si solo se
      // reemplazara el innerHTML, los listeners (#pg-activate, #pg-export…)
      // se perderían en cada repintado.
      updateSheet();
    }
  };
  raf = requestAnimationFrame(tick);
}

function applyScale() {
  if (!canvas) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Por encima de 1100px el panel lateral ocupa 320px + gap + padding: se
  // reservan 420px. Por debajo el layout pasa a una sola columna (CSS
  // `@media (max-width: 1100px)`), así que solo hay que descontar el padding
  // de la guardería (18px por lado) y el marco del lienzo (~22px).
  const reserveX = vw > 1100 ? 420 : 58;
  const byWidth = Math.floor((vw - reserveX) / 160);
  const byHeight = Math.floor((vh - 180) / 144);
  const fit = Math.min(byWidth, byHeight);
  // Escala entera y sin deformar; hasta 2x en pantallas estrechas para no
  // provocar desbordes horizontales, y nunca más de 7x. Si no cabe ni a 2x
  // (ventanas muy pequeñas) se mantiene 2x y la página hace scroll vertical.
  scale = Number.isFinite(fit) && fit > 0 ? Math.min(7, Math.max(2, fit)) : 2;
  canvas.style.width = `${160 * scale}px`;
  canvas.style.height = `${144 * scale}px`;
  canvas.style.imageRendering = "pixelated";
  // El HUD vive en HTML: se alinea con el ancho del lienzo.
  const hud = root?.querySelector<HTMLElement>("#pg-hud");
  if (hud) hud.style.width = `${160 * scale}px`;
}

function drawEmpty(g: G) {
  rect(g, 0, 0, 160, 144, 0);
  text(g, t("empty.none"), 40, 64, 2);
  text(g, t("empty.adopt"), 26, 76, 1);
}

/* --- sala ---------------------------------------------------------- */

/** Sala GBC de reserva: se usa solo hasta que carga la imagen del fondo. */
function drawRoomFallback(g: G, frame: number) {
  // pared con tramado
  rect(g, 0, 0, 160, 92, 2);
  for (let y = 0; y < 92; y += 2) {
    for (let x = (y / 2) % 2 === 0 ? 0 : 2; x < 160; x += 4) px(g, x, y, 1, 1, 1);
  }
  rect(g, 0, 91, 160, 1, 0);

  // suelo
  rect(g, 0, 92, 160, 26, 1);
  for (let x = 0; x < 160; x += 8) px(g, x + (frame ? 0 : 4), 96 + ((x / 8) % 2) * 6, 1, 1, 0);

  // ventana
  rect(g, 104, 10, 48, 36, 0);
  rect(g, 106, 12, 44, 32, 3);
  rect(g, 127, 12, 2, 32, 0);
  rect(g, 106, 26, 44, 2, 0);
  px(g, 112, 18, 8, 2, 2);
  px(g, 114, 16, 5, 2, 2);
  px(g, 136, 34, 8, 1, 2);

  // póster con pokébola
  rect(g, 10, 12, 24, 20, 0);
  rect(g, 12, 14, 20, 16, 1);
  px(g, 20, 18, 6, 6, 3);
  px(g, 22, 20, 2, 2, 0);
  px(g, 18, 20, 8, 1, 0);

  // estantería con libros
  rect(g, 44, 14, 26, 3, 0);
  for (let i = 0; i < 5; i++) px(g, 46 + i * 4, 8 + (i % 2), 2, 6, i % 2 ? 3 : 1);

  // planta
  rect(g, 42, 100, 12, 8, 0);
  rect(g, 44, 102, 8, 5, 1);
  px(g, 46, 94, 2, 6, 2);
  px(g, 49, 92, 2, 8, 2);
  px(g, 43, 96, 2, 4, 2);

  // cama
  rect(g, 110, 84, 46, 28, 0);
  rect(g, 112, 86, 42, 24, 2);
  rect(g, 114, 88, 12, 8, 3);
  rect(g, 112, 96, 42, 14, 1);
}

/**
 * Elemento interactivo de la habitación. Se dibuja ENCIMA del fondo (capa 1)
 * y declara su caja de impacto en coordenadas del lienzo para futuras
 * interacciones. No duplica los muebles que ya trae la imagen de fondo.
 */
type RoomObject = {
  id: string;
  /** Caja de impacto, en píxeles del lienzo 160x144. */
  box: { x: number; y: number; w: number; h: number };
  draw: (g: G, st: PetState, frame: number) => void;
};

/** Cuenco de comida: único objeto interactivo visible por ahora. */
const BOWL: RoomObject = {
  id: "bowl",
  box: { x: 14, y: 104, w: 22, h: 8 },
  draw: (g, st) => {
    rect(g, 14, 104, 22, 2, 0);
    rect(g, 16, 106, 18, 6, 0);
    rect(g, 17, 106, 16, 4, 1);
    if (st.hunger < 75) {
      for (let i = 0; i < 4; i++) px(g, 19 + i * 4, 107 + (i % 2), 2, 1, 3);
    }
  },
};

/** Registro de objetos interactivos de la habitación. */
const ROOM_OBJECTS: RoomObject[] = [BOWL];

/** Capa interactiva: se dibuja ENCIMA del fondo. */
function drawInteractive(g: G, st: PetState, frame: number) {
  for (const obj of ROOM_OBJECTS) obj.draw(g, st, frame);
}

function drawRoom(g: G, pet: Pet, st: PetState, now: number) {
  const frame = Math.floor(now / 280) % 2;
  const bob = st.sleeping ? 0 : frame;

  // Capa 0: fondo diurno; si no ha cargado, la sala GBC de reserva.
  if (roomDayReady && roomDay) g.drawImage(roomDay, 0, 0, 160, 144);
  else drawRoomFallback(g, frame);

  // Fundido día -> noche: solo si existe la imagen nocturna.
  const mix = advanceNightMix(now);
  if (mix > 0 && roomNightReady && roomNight) {
    g.globalAlpha = mix;
    g.drawImage(roomNight, 0, 0, 160, 144);
    g.globalAlpha = 1;
  }

  // Capa 1: elementos interactivos.
  drawInteractive(g, st, frame);

  // Capa 2: mascota. El sprite overworld es opcional: cualquier fallo vuelve
  // al dibujo procedural original, que sigue siendo el fallback canónico.
  const pos = petPosition(pet, st, now);
  const pose = petPose(pet, st, now);
  const feetX = pos.x + Math.floor(ROOM.sprite.w / 2);
  const feetY = pos.y + ROOM.sprite.h;
  const spriteBox = paintOverworld(
    g,
    pet.profile.species,
    !!pet.profile.shiny,
    pose,
    feetX,
    feetY,
  );
  if (!spriteBox) {
    drawPet(
      g,
      shapeOf(pet.profile.species),
      pos.x,
      pos.y + (pose === "sleep" ? 1 : bob),
      pose,
      !!pet.profile.shiny,
      frame,
    );
  }
  // Los efectos se anclan al dibujo que esté visible (sprite o procedural).
  const fx = spriteBox?.x ?? pos.x;
  const fy = spriteBox?.y ?? pos.y;

  if (st.hygiene < 35) {
    for (let i = 0; i < 3; i++) {
      const phase = (now / 900 + i * 0.33) % 1;
      px(g, fx + 20 + Math.sin(phase * 6) * 3, fy + 2 - phase * 10, 2, 2, 0);
    }
  }
  if (pose === "sleep") {
    const tick = Math.floor(now / 900) % 3;
    text(g, "Z", fx + 18, fy - 4 - tick * 2, 0);
    if (tick > 0) text(g, "Z", fx + 22, fy - 8 - tick, 0);
  }
  if (pose === "happy" && Math.floor(now / 400) % 2 === 0) {
    drawHeart(g, fx + 8, fy - 6);
    drawHeart(g, fx + 24, fy - 10);
  }
}

/**
 * Posición de dibujo (esquina superior izquierda) de la mascota.
 * Deriva de la zona caminable: los pies recorren `walk.minX..walk.maxX` sobre
 * la línea `walk.groundY` y el sprite se centra en horizontal y se apoya encima.
 */
function petPosition(pet: Pet, st: PetState, now: number) {
  if (st.sleeping) return { ...ROOM.sleepSpot };
  const { minX, maxX, groundY } = ROOM.walk;
  const mid = (minX + maxX) / 2;
  const amp = (maxX - minX) / 2;
  const seed = (pet.profile.pid >>> 0) % 360;
  const feetX = Math.round(mid + Math.sin((now / 1000) * 0.35 + seed) * amp);
  return { x: feetX - Math.floor(ROOM.sprite.w / 2), y: groundY - ROOM.sprite.h };
}

export function petPose(pet: Pet, st: PetState, now: number): "idle" | "sleep" | "eat" | "happy" | "sad" {
  if (st.sleeping) return "sleep";
  const last = st.lastActionAt ?? {};
  const recent = (k: string, ms: number) => now - (last[k] ?? 0) < ms;
  if (recent("feed", 1800)) return "eat";
  if (recent("play", 1800)) return "happy";
  if (moodOf(st) === "triste" || moodOf(st) === "hambriento") return "sad";
  return "idle";
}

function drawHeart(g: G, x: number, y: number) {
  px(g, x, y, 2, 1, 0);
  px(g, x + 3, y, 2, 1, 0);
  px(g, x, y + 1, 5, 1, 0);
  px(g, x + 1, y + 2, 3, 1, 0);
  px(g, x + 2, y + 3, 1, 1, 0);
}

/* --- dibujo de la mascota ------------------------------------------ */

/** Arquetipo visual. Aproximación estética, no un dato del save. */
export function shapeOf(species: number): number {
  const known: Record<number, number> = {
    1: 5, 2: 5, 3: 5, 4: 1, 5: 1, 6: 2, 7: 1, 8: 1, 9: 1, 12: 2, 15: 2, 16: 2, 17: 2, 18: 2,
    25: 1, 26: 1, 39: 5, 52: 1, 54: 1, 94: 1, 95: 3, 131: 4, 133: 0, 134: 0, 135: 0, 136: 0,
    143: 5, 147: 3, 148: 3, 149: 1, 150: 1, 151: 1, 172: 1, 175: 5, 196: 0, 197: 0, 470: 0, 471: 0,
  };
  if (known[species] != null) return known[species];
  return Math.abs(Math.imul(species + 7, 2654435761)) % 6;
}

function drawPet(g: G, shape: number, x: number, y: number, pose: string, shiny: boolean, frame: number) {
  const body = shiny ? 1 : 3;
  const shade = shiny ? 2 : 2;
  const line = 0;
  const eye = pose === "sleep" ? 0 : 0;
  const blink = pose === "idle" && frame === 1 && Math.random() < 0;
  void blink;

  if (pose === "sleep") {
    // acurrucado: cuerpo bajo y ancho
    rect(g, x + 2, y + 8, 20, 8, body);
    rect(g, x + 4, y + 16, 16, 2, shade);
    rect(g, x + 14, y + 6, 8, 7, body);
    px(g, x + 16, y + 9, 2, 1, line);
    px(g, x + 20, y + 9, 2, 1, line);
    return;
  }

  switch (shape) {
    case 0: // cuadrúpedo
      rect(g, x + 3, y + 9, 15, 6, body);
      rect(g, x + 1, y + 7, 2, 5, body);
      rect(g, x + 13, y + 5, 8, 8, body);
      rect(g, x + 13, y + 3, 2, 2, body);
      rect(g, x + 18, y + 3, 2, 2, body);
      rect(g, x + 5, y + 15, 2, 3, body);
      rect(g, x + 13, y + 15, 2, 3, body);
      px(g, x + 15, y + 7, 1, 1, eye);
      px(g, x + 19, y + 7, 1, 1, eye);
      px(g, x + 20, y + 10, 2, 1, line);
      break;
    case 1: // bípedo
      rect(g, x + 6, y + 8, 10, 10, body);
      rect(g, x + 5, y + 3, 12, 8, body);
      rect(g, x + 5, y + 1, 3, 3, body);
      rect(g, x + 14, y + 1, 3, 3, body);
      rect(g, x + 3, y + 10, 3, 6, body);
      rect(g, x + 16, y + 10, 3, 6, body);
      rect(g, x + 8, y + 18, 3, 3, body);
      rect(g, x + 12, y + 18, 3, 3, body);
      px(g, x + 8, y + 6, 1, 1, eye);
      px(g, x + 13, y + 6, 1, 1, eye);
      px(g, x + 9, y + 9, 4, 1, line);
      break;
    case 2: // ave
      rect(g, x + 5, y + 6, 12, 11, body);
      rect(g, x + 4, y + 8, 3, 6, shade);
      rect(g, x + 12, y + 3, 7, 7, body);
      px(g, x + 19, y + 6, 3, 2, 2);
      px(g, x + 14, y + 5, 1, 1, eye);
      rect(g, x + 7, y + 17, 2, 3, body);
      rect(g, x + 13, y + 17, 2, 3, body);
      px(g, x + 9, y + 12, 5, 2, shade);
      break;
    case 3: // serpiente
      for (let i = 0; i < 5; i++) rect(g, x + 4 + i * 3, y + 14 - i * 2, 5, 5, i % 2 ? body : shade);
      rect(g, x + 17, y + 3, 7, 6, body);
      px(g, x + 19, y + 5, 1, 1, eye);
      px(g, x + 22, y + 5, 1, 1, eye);
      px(g, x + 24, y + 7, 2, 1, line);
      break;
    case 4: // acuático
      rect(g, x + 4, y + 7, 14, 10, body);
      rect(g, x + 17, y + 8, 4, 8, shade);
      rect(g, x + 6, y + 5, 8, 3, shade);
      px(g, x + 8, y + 10, 1, 1, eye);
      px(g, x + 13, y + 10, 1, 1, eye);
      px(g, x + 9, y + 13, 5, 1, line);
      px(g, x + 3, y + 4, 1, 1, 3);
      px(g, x + 1, y + 0, 1, 1, 3);
      break;
    default: // bola
      rect(g, x + 4, y + 6, 16, 12, body);
      rect(g, x + 6, y + 3, 12, 4, body);
      rect(g, x + 6, y + 18, 12, 2, shade);
      px(g, x + 9, y + 10, 2, 2, eye);
      px(g, x + 15, y + 10, 2, 2, eye);
      rect(g, x + 11, y + 14, 4, 1, line);
      rect(g, x + 2, y + 9, 2, 5, body);
      break;
  }

  if (pose === "eat") {
    px(g, x + (shape === 0 ? 20 : 13), y + (shape === 0 ? 11 : 10), 3, 2, 0);
  }
  if (pose === "happy") {
    px(g, x + 2, y + 2, 1, 1, 3);
    px(g, x + 20, y + 1, 1, 1, 3);
  }
  if (pose === "sad") {
    // gotita de sudor
    px(g, x + 22, y + 4, 1, 2, 0);
  }
}

/* --- minijuego ------------------------------------------------------ */

function drawGame(g: G, pet: Pet, gs: GameState, now: number) {
  rect(g, 0, 0, 160, 144, 0);
  rect(g, 0, 104, 160, 40, 1);

  text(g, t("game.title"), 6, 6, 3);
  text(g, gs.label.toUpperCase(), 6, 16, 2);
  text(
    g,
    `${statLabel(gs.stat)}  ${t("game.round", { n: Math.min(gs.round + 1, gs.rounds), m: gs.rounds })}`,
    6,
    26,
    1,
  );

  const pos = cursorAt(gs, now);
  const dist = Math.abs(pos - (gs.zone + 0.05));
  const pose = gs.finished ? "happy" : dist < 0.12 ? "happy" : "idle";
  drawPet(g, shapeOf(pet.profile.species), 68, 52, pose, !!pet.profile.shiny, Math.floor(now / 280) % 2);

  // barra
  rect(g, 13, 94, 134, 14, 2);
  rect(g, 14, 95, 132, 12, 0);
  const zoneX = Math.round(gs.zone * 132);
  rect(g, 14 + zoneX, 95, 13, 12, 1);
  rect(g, 14 + zoneX, 95, 1, 12, 2);
  rect(g, 14 + zoneX + 12, 95, 1, 12, 2);
  const cx = 14 + Math.round(pos * 132);
  rect(g, cx, 93, 2, 16, 3);
  px(g, cx, 93, 3, 1, 0);

  // rondas
  for (let i = 0; i < gs.rounds; i++) {
    const done = i < gs.scores.length;
    rect(g, 62 + i * 8, 114, 5, 5, done ? 3 : 1);
    if (done) px(g, 63 + i * 8, 115, 3, 3, 0);
  }

  const hint = gs.finished ? t("game.saving") : t("game.hint");
  text(g, hint, Math.round(80 - textWidth(hint) / 2), 126, 2);
  if (gs.flash && now - gs.flash.at < 700) {
    text(g, gs.flash.text, 54, 84, 3);
  }
  const avg = gs.scores.length ? gs.scores.reduce((a, b) => a + b, 0) / gs.scores.length : 0;
  text(g, t("game.accuracy", { n: Math.round(avg * 100) }), 40, 136, 1);
}

/* ------------------------------------------------------------------ */
/* Teclado                                                            */
/* ------------------------------------------------------------------ */

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (!root) return;
    if (mode === "game" && (e.code === "Space" || e.code === "Enter")) {
      e.preventDefault();
      if (game && !game.finished) hit();
      return;
    }
    const map: Record<string, ActionId> = {
      "1": "feed", "2": "play", "3": "clean", "4": "pet", "5": "scold", "6": "sleep",
    };
    const act = map[e.key];
    if (act) doAction(act);
  });
}

/* Reexportes usados por main.ts */
export { TRAIN_GAMES };
