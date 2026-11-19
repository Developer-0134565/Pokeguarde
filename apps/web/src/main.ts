import { adoptPet, closeNursery, openNursery, type Pet } from "/nursery.js";
import { statName } from "/pet-engine.js";
import { getLocale, localeTag, t } from "/i18n.ts";
import { initOverworldSprites, paintOverworld } from "/sprite-runtime.js";

type Move = { slot: number; id: number; name: string; pp: number; ppUps: number };
type Stats = { hp: number; hpMax: number; atk: number; def: number; spa: number; spd: number; spe: number };
type Pkm = {
  pid: number;
  species: number;
  speciesName: string;
  nickname: string;
  isNicknamed: boolean;
  level: number;
  exp: number;
  gender: number | null;
  shiny: boolean;
  ball: number | null;
  language: number | null;
  ivs: number[];
  evs: number[];
  moves: Move[];
  stats: Stats | null;
  legal: boolean | null;
  verdict?: "legal" | "unverified" | "illegal" | null;
  issues?: string[];
  exportTargets?: { system: string; allowed: boolean; reason: string }[];
  legalityReport: string | null;
  nature: number | null;
  ability: number | null;
  heldItem: number | null;
  heldItemName: string | null;
  friendship: number | null;
  metLocation: number | null;
  metLocationName?: string | null;
  metLevel: number | null;
  metDate: string | null;
  eggDate: string | null;
  ot: string | null;
  tid: number | null;
  sid?: number | null;
  slot?: number;
  /** PG-07D: el contrato actual no expone estado; se muestra solo si aparece. */
  status?: unknown;
  statusName?: string | null;
};

type Bag = { pouch: string; items: { index: number; name: string; count: number }[] };
type Dex = { available: boolean; source?: string; caughtCount?: number; seenCount?: number; reason?: string };
/* PG-07F: el contrato ampliado es aditivo; boxes[].slots sigue siendo solo ocupados. */
type BoxPosition = {
  slot: number;
  occupied: boolean;
  ref?: { location: string; box: number; slot: number };
  pokemon?: Pkm;
};
type BoxContract = {
  index: number;
  name: string;
  nameAvailable?: boolean;
  capacity?: number | null;
  occupied?: number;
  empty?: number | null;
  positions?: BoxPosition[];
  slots: Pkm[];
};
type StorageContract = {
  available: boolean;
  availability: "available" | "partial" | "unavailable" | "error" | string;
  boxCount?: number | null;
  boxCountSource?: string | null;
  slotCount?: number | null;
  slotCountSource?: string | null;
  boxDataSlots?: number | null;
  namesAvailable?: boolean;
  emptySlotsKnown?: boolean;
  error?: string | null;
};
type Inventory = {
  detected: boolean;
  saveType: string | null;
  generation: number | null;
  versionName: string | null;
  trainer: { ot: string | null; tid: number | null; sid?: number | null; money: number | null; coins?: number | null; playTime: string | null; gender?: number | null; language?: number | null } | null;
  badges: { property: string; raw: number; bits: number }[] | null;
  pokedex: Dex | null;
  party: Pkm[];
  boxes: BoxContract[];
  storage?: StorageContract | null;
  boxError?: string;
  bag: Bag[];
  counts?: { total: number; legal: number; unverified: number; illegal: number } | null;
  roundTrip: { identical: boolean } | null;
};

type SaveSummary = {
  sha256: string;
  filename: string;
  generation: number | null;
  versionName: string | null;
  trainer: string | null;
  playTime: string | null;
  pokemon: number;
  legal: number;
  unverified?: number;
  illegal: number;
  roundTripIdentical: boolean;
  importedAt: string;
};

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const NATURES = ["Hardy","Lonely","Brave","Adamant","Naughty","Bold","Docile","Relaxed","Impish","Lax","Timid","Hasty","Serious","Jolly","Naive","Modest","Mild","Quiet","Bashful","Rash","Calm","Gentle","Sassy","Careful","Quirky"];

/** Aplica las traducciones a los nodos estáticos de `index.html`. */
function applyStaticI18n() {
  document.documentElement.lang = getLocale();
  document.title = t("app.title");
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.dataset.i18nTitle!));
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria!));
  });
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json();
  if (!res.ok) throw new Error((body as any)?.error ?? `HTTP ${res.status}`);
  return body as T;
}

function esc(text: unknown): string {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function setStatus(text: string, bad = false) {
  const el = $("#status");
  el.textContent = text;
  el.className = "status" + (bad ? " bad" : "");
}

async function loadHealth() {
  const el = $("#health");
  try {
    const h = await api<{ ok: boolean; sidecar: string; dotnet: string }>("/api/health");
    el.textContent = `${h.sidecar} · .NET ${h.dotnet}`;
    el.className = "health ok";
  } catch {
    el.textContent = t("health.down");
    el.className = "health bad";
  }
}

let currentSha: string | null = null;

async function loadSaves() {
  const list = $("#saves");
  try {
    const { saves } = await api<{ saves: SaveSummary[] }>("/api/saves");
    if (saves.length === 0) {
      list.innerHTML = `<li class="muted">${esc(t("saves.empty"))}</li>`;
      return;
    }
    list.innerHTML = saves
      .map(
        (s) => `<li class="save${s.sha256 === currentSha ? " active" : ""}" data-sha="${s.sha256}">
          <div class="save-title">${esc(s.filename)}</div>
          <div class="save-meta">
            <span class="chip">Gen ${s.generation ?? "?"}</span>
            <span class="chip">${esc(s.versionName ?? s.saveType ?? "?")}</span>
            <span class="chip">OT ${esc(s.trainer ?? "?")}</span>
            <span class="chip ${s.illegal ? "bad" : (s.unverified ?? 0) > 0 ? "warn" : "good"}">${s.legal}✔ ${s.unverified ?? 0}? ${s.illegal}✘</span>
          </div>
        </li>`,
      )
      .join("");
    list.querySelectorAll<HTMLLIElement>(".save").forEach((li) => {
      li.onclick = () => openSave(li.dataset.sha!);
    });
  } catch (err) {
    list.innerHTML = `<li class="muted">${esc(t("saves.error", { msg: (err as Error).message }))}</li>`;
  }
}

async function openSave(sha: string) {
  clearDossier();
  currentSha = sha;
  currentSave = null;
  teamSelection = null;
  pcBoxIndex = null;
  pcSlotSelection = null;
  pcFilter = "all";
  pcQuery = "";
  $(".layout").classList.remove("hidden");
  $("#nursery").classList.add("hidden");
  setDossierNav("library");
  await loadSaves();
  const detail = $("#detail");
  detail.className = "panel detail";
  detail.innerHTML = `<p class="placeholder">${esc(t("save.reading"))}</p>`;
  try {
    const { save, inventory } = await api<{ save: SaveSummary; inventory: Inventory }>(`/api/saves/${sha}`);
    renderDetail(save, inventory);
  } catch (err) {
    detail.innerHTML = `<p class="placeholder bad">${esc((err as Error).message)}</p>`;
  }
}

function badgeCount(inv: Inventory): number {
  if (!inv.badges?.length) return 0;
  return inv.badges[0].bits;
}

function renderDetail(save: SaveSummary, inv: Inventory) {
  currentSave = save;
  currentInventory = inv;
  if (teamSelection !== null && !teamRefOf(inv, teamSelection)) teamSelection = null;
  if (pcBoxIndex !== null && !pcBoxByIndex(inv, pcBoxIndex)) {
    pcBoxIndex = null;
    pcSlotSelection = null;
  } else if (pcSlotSelection !== null && !pcSelectionValid(inv, pcBoxIndex, pcSlotSelection)) {
    pcSlotSelection = null;
  }
  const tr = inv.trainer ?? { ot: null, tid: null, money: null, playTime: null };
  const dex = inv.pokedex;
  const detail = $("#detail");
  detail.innerHTML = `
    <div class="detail-head">
      <div>
        <h2>${esc(save.filename)}</h2>
        <p class="sub">${esc(inv.saveType ?? "?")} · ${esc(inv.versionName ?? "?")} · Gen ${inv.generation ?? "?"}</p>
      </div>
      <span class="rt ${inv.roundTrip?.identical ? "good" : "warn"}">
        ${esc(inv.roundTrip?.identical ? t("save.roundtrip.ok") : t("save.roundtrip.bad"))}
      </span>
    </div>

    <dl class="stats-grid">
      <div><dt>${esc(t("detail.trainer"))}</dt><dd>${esc(tr.ot ?? "?")}</dd></div>
      <div><dt>${esc(t("detail.id"))}</dt><dd>${esc(tr.tid ?? "?")}</dd></div>
      <div><dt>${esc(t("detail.money"))}</dt><dd>${tr.money == null ? "?" : tr.money.toLocaleString(localeTag())} ₽</dd></div>
      <div><dt>${esc(t("detail.time"))}</dt><dd>${esc(tr.playTime ?? "?")}</dd></div>
      <div><dt>${esc(t("detail.badges"))}</dt><dd>${badgeCount(inv)}</dd></div>
      <div><dt>${esc(t("detail.dex"))}</dt><dd>${dex?.available ? `${esc(t("dex.seen", { n: dex.seenCount ?? "?" }))} · ${esc(t("dex.caught", { n: dex.caughtCount ?? "?" }))}` : esc(t("dex.unavailable"))}</dd></div>
      <div><dt>${esc(t("detail.pokemon"))}</dt><dd>${esc(t("detail.partyCount", { n: inv.party.length }))} · ${esc(t("detail.totalCount", { n: save.pokemon }))}</dd></div>
      <div><dt>${esc(t("detail.legality"))}</dt><dd>${esc(t("detail.legalityCounts", { legal: save.legal, unverified: save.unverified ?? 0, illegal: save.illegal }))}</dd></div>
    </dl>

    <nav class="tabs">
      <button data-tab="team" class="active">${esc(t("tab.team"))}</button>
      <button data-tab="party">${esc(t("tab.party"))}</button>
      <button data-tab="boxes">${esc(t("tab.boxes"))}</button>
      <button data-tab="bag">${esc(t("tab.bag"))}</button>
      <button data-tab="legality">${esc(t("tab.legality"))}</button>
    </nav>
    <div id="tab"></div>
  `;

  const tab = $("#tab");
  const show = (name: string) => {
    libraryTab = name as LibraryTab;
    detail.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    if (name === "team") {
      tab.innerHTML = teamPanelHtml(inv);
      bindTeamPanel(inv);
    } else {
      if (teamSpriteTimer !== null) {
        clearTimeout(teamSpriteTimer);
        teamSpriteTimer = null;
      }
      if (pcSpriteTimer !== null) {
        clearTimeout(pcSpriteTimer);
        pcSpriteTimer = null;
      }
      if (name === "party")
        tab.innerHTML = grid(inv.party.map((p) => ({ p, location: "party" as const, box: null, slot: Number(p.slot ?? 0) })));
      else if (name === "boxes") {
        tab.innerHTML = pcPanelHtml(inv);
        bindPcPanel(inv);
      }
      else if (name === "bag") tab.innerHTML = bagView(inv);
      else tab.innerHTML = legalityView(inv);
      bindMons(inv);
    }
  };
  detail.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => (b.onclick = () => show(b.dataset.tab!)));
  show(libraryTab);
}

function verdictOf(p: Pkm): "legal" | "unverified" | "illegal" {
  if (p.verdict === "legal" || p.verdict === "unverified" || p.verdict === "illegal") return p.verdict;
  return p.legal === true ? "legal" : p.legal === false ? "illegal" : "unverified";
}

const verdictLabel = (v: "legal" | "unverified" | "illegal"): string => t(`verdict.${v}`);

const VERDICT_CLASS: Record<string, string> = {
  legal: "ok",
  unverified: "warn",
  illegal: "bad",
};

/* PG-07D:team-helpers:start */
/* Funciones puras, sin DOM ni traducciones: también se evalúan en pg07d-check.ts. */
const TEAM_SLOT_COUNT = 6;

/**Devuelve siempre seis posiciones, conservando el orden real del equipo.*/
function teamSlots(party) {
  const list = Array.isArray(party) ? party.slice(0, TEAM_SLOT_COUNT) : [];
  return Array.from({ length: TEAM_SLOT_COUNT }, (_, i) => list[i] ?? null);
}

/**La ranura es la identidad en Gen I/II, donde todos los PID valen 0.*/
function teamRefOf(inv, index) {
  if (!inv || !Number.isInteger(index) || index < 0 || index >= TEAM_SLOT_COUNT) return null;
  const p = (inv.party ?? [])[index];
  if (!p) return null;
  return { p, location: "party", box: null, slot: Number(p.slot ?? index + 1) };
}

/**Gen I no tiene género en el contrato; Gen II+ usa 0 macho, 1 hembra, 2 sin género.*/
function teamGenderMark(gender, generation) {
  if (generation === 1) return "";
  const g = String(gender ?? "").toLowerCase();
  if (g === "0" || g === "male") return "♂";
  if (g === "1" || g === "female") return "♀";
  return "";
}

/**Estado alterado: solo se muestra si el contrato lo entrega con nombre.*/
function teamStatusLabel(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "object" && typeof value.name === "string") return value.name;
  return null;
}

/**Navegación acotada a las seis ranuras; índices inválidos se normalizan.*/
function teamNav(current, key, count = TEAM_SLOT_COUNT) {
  const last = Math.max(0, count - 1);
  if (key === "Home") return 0;
  if (key === "End") return last;
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return current;
  const step = key === "ArrowRight" || key === "ArrowDown" ? 1 : -1;
  const base = Number.isInteger(current) && current >= 0 && current <= last ? current : step > 0 ? -1 : last + 1;
  return Math.max(0, Math.min(last, base + step));
}
/* PG-07D:team-helpers:end */

/* PG-07E:pc-helpers:start */
/* Helpers puros: sin DOM, sin i18n y sin relojes; se evalúan también en pg07e-check.ts
 * y pg07f-check.ts. PG-07F añade lectura del contrato ampliado sin romper el
 * contrato anterior: boxes[].slots siguen siendo solo los Pokémon ocupados. */
const PC_FILTERS = ["all", "legal", "unverified", "illegal"];
const PC_STATUS_TEXT = {
  available: "box.storage.available",
  partial: "box.storage.partial",
  unavailable: "box.storage.unavailable",
  error: "box.storage.error",
  legacy: "box.storage.legacy",
};

function pcBoxes(inv) {
  return inv && Array.isArray(inv.boxes) ? inv.boxes : [];
}

function pcBoxByIndex(inv, index) {
  if (!Number.isInteger(index)) return null;
  return pcBoxes(inv).find((b) => Number(b.index) === index) ?? null;
}

function pcStorage(inv) {
  return inv && inv.storage && typeof inv.storage === "object" ? inv.storage : null;
}

function pcStatusKey(inv) {
  const storage = pcStorage(inv);
  const status = storage && typeof storage.availability === "string" ? storage.availability : "legacy";
  return PC_STATUS_TEXT[status] ?? "box.storage.legacy";
}

function pcPositive(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function pcCapacity(box) {
  return box ? pcPositive(box.capacity) : null;
}

function pcBoxCount(inv) {
  const storage = pcStorage(inv);
  return pcPositive(storage && storage.boxCount) ?? pcBoxes(inv).length;
}

function pcSlotCount(inv) {
  const storage = pcStorage(inv);
  return pcPositive(storage && storage.slotCount);
}

/**Ranuras 1..maxSlot observado; los huecos conservan su posición original.*/
function pcSlotList(box) {
  const slots = box && Array.isArray(box.slots) ? box.slots : [];
  const bySlot = new Map();
  let max = 0;
  for (const p of slots) {
    const s = Number(p && p.slot);
    if (!Number.isInteger(s) || s < 1) continue;
    bySlot.set(s, p);
    if (s > max) max = s;
  }
  return Array.from({ length: max }, (_, i) => bySlot.get(i + 1) ?? null);
}

/**PG-07F: posiciones reales cuando el contrato las expone; si no, fallback PG-07E.*/
function pcPositions(box) {
  const declared = box && Array.isArray(box.positions) ? box.positions : null;
  if (!declared) return pcSlotList(box);
  const bySlot = new Map();
  let max = 0;
  for (const entry of declared) {
    const s = Number(entry && entry.slot);
    if (!Number.isInteger(s) || s < 1) continue;
    const p = entry.occupied ? (entry.pokemon ?? null) : null;
    bySlot.set(s, p);
    if (s > max) max = s;
  }
  const last = Math.max(max, pcCapacity(box) ?? 0);
  return Array.from({ length: last }, (_, i) => bySlot.get(i + 1) ?? null);
}

function pcNameKnown(box) {
  if (!box) return false;
  if (typeof box.nameAvailable === "boolean") return box.nameAvailable;
  return box.name !== null && box.name !== undefined && String(box.name).length > 0;
}

function pcOccupiedCount(box) {
  if (box && Number.isInteger(box.occupied) && box.occupied >= 0) return box.occupied;
  return pcPositions(box).filter(Boolean).length;
}

function pcEmptyCount(box) {
  if (box && Number.isInteger(box.empty) && box.empty >= 0) return box.empty;
  const cap = pcCapacity(box);
  return cap === null ? null : Math.max(0, cap - pcOccupiedCount(box));
}

/**Identidad estable por caja y ranura; en Gen I/II todos los PID valen 0.*/
function pcRefOf(box, slot) {
  if (!box || !Number.isInteger(slot) || slot < 1) return null;
  const p = pcPositions(box)[slot - 1];
  if (!p) return null;
  return { p, location: "box", box: Number(box.index), slot };
}

/**Misma regla que verdictOf: solo usa el resultado ya calculado por PKHeX.*/
function pcVerdictOf(p) {
  if (!p) return null;
  if (p.verdict === "legal" || p.verdict === "unverified" || p.verdict === "illegal") return p.verdict;
  return p.legal === true ? "legal" : p.legal === false ? "illegal" : "unverified";
}

function pcText(p) {
  if (!p) return "";
  return [p.nickname, p.speciesName, p.species].filter((v) => v !== null && v !== undefined).map((v) => String(v)).join(" ");
}

function pcNorm(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function pcMatches(p, filter, query) {
  if (!p) return false;
  if (PC_FILTERS.includes(filter) && filter !== "all" && pcVerdictOf(p) !== filter) return false;
  const q = pcNorm(query);
  return q.length === 0 || pcNorm(pcText(p)).includes(q);
}

function pcCounts(box) {
  const out = { legal: 0, unverified: 0, illegal: 0 };
  for (const p of pcPositions(box)) {
    const v = pcVerdictOf(p);
    if (v && v in out) out[v]++;
  }
  return out;
}

/**Navegación por la cuadrícula visible, con columnas reales calculadas por CSS.*/
function pcNav(current, key, count, columns) {
  const last = Math.max(0, count - 1);
  const cols = Number.isInteger(columns) && columns > 0 ? columns : 1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return current;
  const base = Number.isInteger(current) && current >= 0 && current <= last ? current : 0;
  if (key === "ArrowLeft") return Math.max(0, base - 1);
  if (key === "ArrowRight") return Math.min(last, base + 1);
  if (key === "ArrowUp") return Math.max(0, base - cols);
  return Math.min(last, base + cols);
}

function pcSelectionValid(inv, index, slot) {
  const box = pcBoxByIndex(inv, index);
  return pcRefOf(box, slot) !== null;
}

function pcFocusSlot(box, filter, query) {
  const list = pcPositions(box);
  const hit = list.findIndex((p) => pcMatches(p, filter, query));
  return hit >= 0 ? hit + 1 : 1;
}
/* PG-07E:pc-helpers:end */

/**
 * Un Pokémon con su ranura de origen. Hace falta porque en Gen 1 y 2 todos los
 * `pid` valen 0: la única identidad estable es `location` + `box` + `slot`.
 */
type MonRef = { p: Pkm; location: "party" | "box"; box: number | null; slot: number };

function refsOf(inv: Inventory): MonRef[] {
  return [
    ...inv.party.map((p) => ({ p, location: "party" as const, box: null, slot: Number(p.slot ?? 0) })),
    ...inv.boxes.flatMap((b) =>
      b.slots.map((p) => ({ p, location: "box" as const, box: b.index, slot: Number(p.slot ?? 0) })),
    ),
  ];
}

function monCard(ref: MonRef): string {
  const p = ref.p;
  const v = verdictOf(p);
  const mark = VERDICT_CLASS[v];
  return `<button class="mon" data-pid="${p.pid}" data-loc="${ref.location}" data-box="${ref.box ?? ""}" data-slot="${ref.slot}">
    <span class="lv">${esc(t("mon.level", { n: p.level }))}</span>
    <strong>${esc(p.nickname || p.speciesName)}</strong>
    <span class="sp">${esc(p.speciesName)}</span>
    <span class="state ${mark}" title="${esc(verdictLabel(v))}"></span>
    <span class="held">${p.heldItemName && p.heldItemName !== "(None)" ? esc(p.heldItemName) : ""}</span>
  </button>`;
}

function grid(list: MonRef[]): string {
  if (!list.length) return `<p class="muted">${esc(t("mon.none"))}</p>`;
  return `<div class="mon-grid">${list.map(monCard).join("")}</div>`;
}

/* ------------------------------------------------------------------ */
/* PG-07E — CAJAS DE PC                                               */
/* ------------------------------------------------------------------ */

/**Cajas expuestas por el contrato real; si el formato las incluye vacías, también se navegan.*/
function pcPanelHtml(inv: Inventory): string {
  const boxes = pcBoxes(inv);
  const boxError = (inv as any).boxError as string | undefined;
  if (boxError) {
    return `<section class="pc-panel" id="pc-panel">
      <h3 class="pc-title">${esc(t("box.heading"))}</h3>
      <p class="pc-error">${esc(t("box.readError", { msg: boxError }))}</p>
      <p class="muted tiny">${esc(t("box.contractLimit"))}</p>
    </section>`;
  }
  if (!boxes.length) {
    return `<section class="pc-panel" id="pc-panel">
      <h3 class="pc-title">${esc(t("box.heading"))}</h3>
      <p class="muted">${esc(t("box.noBoxes"))}</p>
      <p class="muted tiny">${esc(t("box.contractLimit"))}</p>
    </section>`;
  }
  if (pcBoxIndex === null || !pcBoxByIndex(inv, pcBoxIndex)) pcBoxIndex = Number(boxes[0].index);
  if (pcSlotSelection !== null && !pcSelectionValid(inv, pcBoxIndex, pcSlotSelection)) pcSlotSelection = null;
  const box = pcBoxByIndex(inv, pcBoxIndex)!;
  const list = pcPositions(box);
  const observed = list.length;
  const capacity = pcCapacity(box);
  const occupied = pcOccupiedCount(box);
  const empty = pcEmptyCount(box);
  const counts = pcCounts(box);
  const i = boxes.findIndex((b) => Number(b.index) === pcBoxIndex);
  const label = pcNameKnown(box) ? box.name : t("box.nameUnknown");
  const boxSummary = capacity === null
    ? `${t("box.observed", { n: observed })} · ${t("box.capacityUnknown")}`
    : `${t("box.capacity", { n: capacity })} · ${t("box.occupiedEmpty", { occupied, empty: empty === null ? "?" : empty })}`;
  return `<section class="pc-panel" id="pc-panel" aria-label="${esc(t("box.heading"))}">
    <div class="pc-head">
      <div class="pc-head-main">
        <h3 class="pc-title">${esc(t("box.heading"))}</h3>
        <p class="muted tiny">${esc(t("box.hint"))}</p>
      </div>
      <div class="pc-nav">
        <button type="button" id="pc-prev" class="ghost" aria-label="${esc(t("box.prev"))}">◀ ${esc(t("box.prev"))}</button>
        <span class="pc-position">${i + 1} / ${boxes.length}</span>
        <button type="button" id="pc-next" class="ghost" aria-label="${esc(t("box.next"))}">${esc(t("box.next"))} ▶</button>
      </div>
    </div>
    <p class="pc-storage muted tiny">${esc(t(pcStatusKey(inv)))} · ${esc(t("box.totalBoxes", { n: pcBoxCount(inv) }))}${pcSlotCount(inv) === null ? "" : ` · ${esc(t("box.slotCount", { n: pcSlotCount(inv) }))}`}</p>
    <div class="pc-identity">
      <div>
        <strong class="pc-box-name">${esc(label)}</strong>
        <span class="pc-box-index">${esc(t("box.index", { n: box.index }))}</span>
      </div>
      <span class="chip">${esc(t("box.count", { n: occupied }))}</span>
    </div>
    <p class="pc-contract muted tiny">${esc(boxSummary)}</p>
    <div class="pc-controls">
      <div class="pc-filters" role="group" aria-label="${esc(t("box.filter"))}">
        ${PC_FILTERS.map((f) => `<button type="button" class="pc-filter${pcFilter === f ? " active" : ""}" data-filter="${f}" aria-pressed="${pcFilter === f}">${esc(t(`box.filter.${f}`))}${f === "all" ? "" : ` <b data-count="${f}">${counts[f]}</b>`}</button>`).join("")}
      </div>
      <label class="pc-search">
        <span>${esc(t("box.search"))}</span>
        <input id="pc-query" type="search" autocomplete="off" value="${esc(pcQuery)}" placeholder="${esc(t("box.search"))}" />
      </label>
    </div>
    <p id="pc-match-note" class="pc-match muted tiny"></p>
    <div id="pc-grid" class="pc-grid" role="listbox" aria-label="${esc(label)}"></div>
    <div id="pc-info" class="pc-info" aria-live="polite"></div>
  </section>`;
}

function pcSlotHtml(p: Pkm | null, slot: number, boxIndex: number, focusSlot: number): string {
  const roving = slot === focusSlot;
  if (!p) {
    return `<button type="button" class="pc-slot empty" data-slot="${slot}" role="option" aria-selected="false" tabindex="${roving ? 0 : -1}">
      <span class="pc-slot-num">${String(slot).padStart(2, "0")}</span>
      <span class="pc-empty-label">${esc(t("box.emptySlot"))}</span>
    </button>`;
  }
  const v = pcVerdictOf(p);
  const matched = pcMatches(p, pcFilter, pcQuery);
  const selected = pcSlotSelection === slot;
  const hasVerdict = p.verdict !== null && p.verdict !== undefined;
  return `<button type="button" class="pc-slot${selected ? " selected" : ""}${matched ? "" : " filtered"}"
      data-slot="${slot}" data-pid="${p.pid}" data-loc="box" data-box="${boxIndex}"
      role="option" aria-selected="${selected}" tabindex="${roving ? 0 : -1}">
    ${selected ? `<span class="pc-selected-tag">${esc(t("box.selected"))}</span>` : ""}
    <span class="pc-slot-num">${String(slot).padStart(2, "0")}</span>
    <span class="pc-sprite-wrap">
      <canvas class="pc-sprite" width="64" height="64" data-species="${p.species}" data-shiny="${p.shiny ? 1 : 0}" aria-hidden="true"></canvas>
      <span class="pc-sprite-note">${esc(t("box.spriteUnavailable"))}</span>
    </span>
    <strong>${esc(p.nickname || p.speciesName)}</strong>
    <span class="pc-species">${esc(p.speciesName)}</span>
    <span class="pc-slot-meta">
      <span>${esc(t("mon.level", { n: p.level }))}</span>
      <span class="chip ${hasVerdict ? (VERDICT_CLASS[v] ?? "unk") : "unk"}">${esc(hasVerdict ? verdictLabel(v!) : t("box.noVerdict"))}</span>
    </span>
  </button>`;
}

function pcGridHtml(box: BoxContract): string {
  const list = pcPositions(box);
  if (!list.length) return `<p class="muted">${esc(t("box.noSlots"))}</p>`;
  const focus = pcFocusSlot(box, pcFilter, pcQuery);
  return list.map((p, i) => pcSlotHtml(p, i + 1, Number(box.index), focus)).join("");
}

function pcInfoHtml(box: BoxContract): string {
  const ref = pcRefOf(box, pcSlotSelection);
  if (!ref) {
    return `<p class="muted">${esc(t("box.contextHint"))}</p>`;
  }
  const p = ref.p;
  const v = pcVerdictOf(p);
  const hasVerdict = p.verdict !== null && p.verdict !== undefined;
  return `<div class="pc-context">
    <div>
      <span class="muted tiny">${esc(t("box.selection"))} · ${esc(t("box.slot", { n: ref.slot }))}</span>
      <strong>${esc(p.nickname || p.speciesName)}</strong>
      <span class="muted">${esc(p.speciesName)} · ${esc(t("mon.level", { n: p.level }))}</span>
      <span class="chip ${hasVerdict ? (VERDICT_CLASS[v] ?? "unk") : "unk"}">${esc(hasVerdict ? verdictLabel(v!) : t("box.noVerdict"))}</span>
    </div>
    <button type="button" id="pc-open" class="primary">${esc(t("box.openDossier"))}</button>
  </div>`;
}

function refreshPcView(inv: Inventory) {
  const box = pcBoxByIndex(inv, pcBoxIndex);
  if (!box) return;
  const grid = document.querySelector<HTMLElement>("#pc-grid");
  const info = document.querySelector<HTMLElement>("#pc-info");
  const note = document.querySelector<HTMLElement>("#pc-match-note");
  const counts = pcCounts(box);
  document.querySelectorAll<HTMLButtonElement>(".pc-filter").forEach((btn) => {
    const f = btn.dataset.filter ?? "all";
    btn.classList.toggle("active", f === pcFilter);
    btn.setAttribute("aria-pressed", String(f === pcFilter));
    const b = btn.querySelector<HTMLElement>("b[data-count]");
    if (b && f in counts) b.textContent = String(counts[f]);
  });
  if (grid) grid.innerHTML = pcGridHtml(box);
  if (info) info.innerHTML = pcInfoHtml(box);
  const matching = pcPositions(box).filter((p) => pcMatches(p, pcFilter, pcQuery)).length;
  if (note) note.textContent = t("box.matchNote", { n: matching });
  paintPcSprites();
}

function pcColumnsOf(grid: HTMLElement): number {
  const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
  return cols > 0 ? cols : 1;
}

function pcChangeBox(inv: Inventory, delta: number, focusBack: string) {
  const boxes = pcBoxes(inv);
  if (!boxes.length) return;
  const i = boxes.findIndex((b) => Number(b.index) === pcBoxIndex);
  const next = boxes[(i + delta + boxes.length) % boxes.length];
  pcBoxIndex = Number(next.index);
  pcSlotSelection = null;
  if (currentSave) renderDetail(currentSave, inv);
  document.querySelector<HTMLButtonElement>(focusBack)?.focus();
}

function pcChoose(inv: Inventory, slot: number, open: boolean) {
  const box = pcBoxByIndex(inv, pcBoxIndex);
  const ref = pcRefOf(box, slot);
  if (!ref) {
    pcSlotSelection = null;
    setStatus(t("box.emptyChosen"), true);
    refreshPcView(inv);
    return;
  }
  pcSlotSelection = slot;
  refreshPcView(inv);
  if (open) pcOpenDossier(ref);
}

function pcOpenDossier(ref: MonRef) {
  openDossierFromLibrary(ref);
  // PG-07C mantiene su firma de dos parámetros: el contexto se fija después.
  dossierReturn = "boxes";
}

function bindPcPanel(inv: Inventory) {
  const panel = document.querySelector<HTMLElement>("#pc-panel");
  if (!panel) return;
  panel.querySelector<HTMLButtonElement>("#pc-prev")?.addEventListener("click", () => pcChangeBox(inv, -1, "#pc-prev"));
  panel.querySelector<HTMLButtonElement>("#pc-next")?.addEventListener("click", () => pcChangeBox(inv, 1, "#pc-next"));
  panel.querySelectorAll<HTMLButtonElement>(".pc-filter").forEach((btn) => {
    btn.onclick = () => {
      pcFilter = btn.dataset.filter ?? "all";
      refreshPcView(inv);
    };
  });
  const input = panel.querySelector<HTMLInputElement>("#pc-query");
  if (input) {
    input.oninput = () => {
      pcQuery = input.value;
      refreshPcView(inv);
    };
  }
  const grid = panel.querySelector<HTMLElement>("#pc-grid");
  if (grid) {
    grid.onclick = (ev) => {
      const card = (ev.target as HTMLElement | null)?.closest<HTMLButtonElement>(".pc-slot");
      if (card) pcChoose(inv, Number(card.dataset.slot), false);
    };
    grid.onkeydown = (ev) => {
      const card = (ev.target as HTMLElement | null)?.closest<HTMLButtonElement>(".pc-slot");
      const box = pcBoxByIndex(inv, pcBoxIndex);
      const count = box ? pcSlotList(box).length : 0;
      const current = card ? Number(card.dataset.slot) - 1 : (pcSlotSelection ?? 1) - 1;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(ev.key)) {
        ev.preventDefault();
        const next = pcNav(current, ev.key, count, pcColumnsOf(grid));
        const cards = Array.from(grid.querySelectorAll<HTMLButtonElement>(".pc-slot"));
        cards[next]?.focus();
        return;
      }
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        if (card) pcChoose(inv, Number(card.dataset.slot), true);
        return;
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        pcSlotSelection = null;
        refreshPcView(inv);
        card?.focus();
        setStatus(t("box.selectionCleared"));
      }
    };
  }
  // Delegación: refreshPcView() repinta #pc-info, así que el botón se sustituye.
  const infoHost = panel.querySelector<HTMLElement>("#pc-info");
  if (infoHost) {
    infoHost.onclick = (ev) => {
      if (!(ev.target as HTMLElement | null)?.closest<HTMLButtonElement>("#pc-open")) return;
      const box = pcBoxByIndex(inv, pcBoxIndex);
      const ref = pcRefOf(box, pcSlotSelection);
      if (ref) pcOpenDossier(ref);
    };
  }
  refreshPcView(inv);
}

/**Pinta los sprites locales con reintento limitado; sin sprite, nota explícita.*/
function paintPcSprites() {
  if (pcSpriteTimer !== null) {
    clearTimeout(pcSpriteTimer);
    pcSpriteTimer = null;
  }
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>("#pc-grid canvas[data-species]"));
  if (!canvases.length) return;
  let tries = 0;
  const attempt = () => {
    pcSpriteTimer = null;
    if (!document.contains(canvases[0])) return;
    let painted = 0;
    for (const canvas of canvases) {
      const g = canvas.getContext("2d");
      if (!g) continue;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, canvas.width, canvas.height);
      const species = Number(canvas.dataset.species);
      if (!Number.isFinite(species) || species <= 0) continue;
      const box = paintOverworld(g, species, canvas.dataset.shiny === "1", "idle", 32, 58);
      if (box) painted++;
      const note = canvas.parentElement?.querySelector<HTMLElement>(".pc-sprite-note");
      if (note) note.textContent = t(box ? "box.spriteReady" : "box.spriteUnavailable");
    }
    if (painted === canvases.length) return;
    if (pcSpriteLoading) return;
    if (tries === 0) {
      pcSpriteLoading = true;
      void initOverworldSprites().then(() => {
        pcSpriteLoading = false;
        tries++;
        if (document.contains(canvases[0])) pcSpriteTimer = window.setTimeout(attempt, 80);
      });
      return;
    }
    if (tries < 10) {
      tries++;
      pcSpriteTimer = window.setTimeout(attempt, 120);
    }
  };
  attempt();
}

function bagView(inv: Inventory): string {
  if (!inv.bag.length) return `<p class="muted">${esc(t("mon.noBag"))}</p>`;
  return inv.bag
    .map(
      (b) => `<section class="pouch"><h3>${esc(b.pouch)}</h3>
        <ul>${b.items.map((i) => `<li><span>${esc(i.name)}</span><b>×${i.count}</b></li>`).join("")}</ul>
      </section>`,
    )
    .join("");
}

function legalityView(inv: Inventory): string {
  const all = [...inv.party, ...inv.boxes.flatMap((b) => b.slots)];
  const bad = all.filter((p) => verdictOf(p) === "illegal");
  const unk = all.filter((p) => verdictOf(p) === "unverified");
  if (!bad.length && !unk.length) return `<p class="muted">${esc(t("legality.clean"))}</p>`;

  const item = (p: Pkm) => {
    const v = verdictOf(p);
    const reasons = (p.issues ?? []).length
      ? `<ul class="issues">${p.issues!.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
      : `<pre>${esc(p.legalityReport ?? t("legality.noReport"))}</pre>`;
    return `<article class="legal-item">
        <h3>${esc(p.speciesName)} ${esc(t("mon.level", { n: p.level }))} <span class="chip ${VERDICT_CLASS[v]}">${esc(verdictLabel(v))}</span></h3>
        ${reasons}
      </article>`;
  };

  const section = (title: string, list: Pkm[]) =>
    list.length
      ? `<h3 class="legal-heading">${title} (${list.length})</h3><div class="legal-list">${list.map(item).join("")}</div>`
      : "";

  return `<div class="legal-wrap">
    ${section(t("legality.illegalHeading"), bad)}
    ${section(t("legality.unverifiedHeading"), unk)}
  </div>`;
}

function bindMons(inv: Inventory) {
  const refs = refsOf(inv);
  const byKey = new Map<string, MonRef>();
  for (const r of refs) byKey.set(`${r.location}|${r.box ?? ""}|${r.slot}`, r);
  document.querySelectorAll<HTMLButtonElement>(".mon").forEach((btn) => {
    btn.onclick = () => {
      const pid = Number(btn.dataset.pid);
      // Con PID se busca por PID; en Gen 1/2 (pid 0) manda la ranura.
      const ref =
        (pid !== 0 ? refs.find((r) => Number(r.p.pid) === pid) : undefined) ??
        byKey.get(`${btn.dataset.loc}|${btn.dataset.box ?? ""}|${btn.dataset.slot}`);
      if (ref) openDossierFromLibrary(ref);
    };
  });
}

/* ------------------------------------------------------------------ */
/* PG-07D — EQUIPO ACTIVO                                              */
/* ------------------------------------------------------------------ */

let teamSpriteTimer: number | null = null;
let teamSpriteLoading = false;

function teamPanelHtml(inv: Inventory): string {
  const slots = teamSlots(inv.party);
  const count = slots.filter(Boolean).length;
  return `<section class="team-panel" aria-label="${esc(t("team.heading"))}">
    <div class="team-head">
      <div>
        <h3 class="team-title">${esc(t("team.heading"))}</h3>
        <p class="muted tiny">${esc(t("team.hint"))}</p>
      </div>
      <span class="chip">${esc(t("team.count", { n: count }))}</span>
    </div>
    <div id="team-panel" class="team-grid" role="listbox" aria-label="${esc(t("team.heading"))}">
      ${slots.map((p, i) => teamSlotHtml(p as Pkm | null, i, inv.generation)).join("")}
    </div>
  </section>`;
}

function teamSlotHtml(p: Pkm | null, index: number, generation: number | null): string {
  const selected = teamSelection === index && p !== null;
  const roving = selected || (teamSelection === null && index === 0);
  if (!p) {
    return `<button type="button" class="team-slot empty" data-index="${index}" role="option" aria-selected="false" tabindex="${roving ? 0 : -1}">
      <span class="team-empty-num">${index + 1}</span>
      <span class="team-empty-label">${esc(t("team.emptySlot"))}</span>
    </button>`;
  }

  const slot = Number(p.slot ?? index + 1);
  const gender = teamGenderMark(p.gender, generation);
  const genderLabel = gender === "♂" ? t("team.genderMale") : gender === "♀" ? t("team.genderFemale") : "";
  const status = teamStatusLabel(p.statusName ?? p.status);
  const hp = p.stats && typeof p.stats.hp === "number" ? p.stats.hp : null;
  const hpMax = p.stats && typeof p.stats.hpMax === "number" ? p.stats.hpMax : null;
  const hpPct =
    hp !== null && hpMax !== null && hpMax > 0
      ? Math.max(0, Math.min(100, Math.round((hp / hpMax) * 100)))
      : null;
  const v = verdictOf(p);
  const hpBlock =
    hpPct === null
      ? `<span class="team-hp muted">${esc(t("team.hp"))}: ${esc(t("dossier.unavailable"))}</span>`
      : `<span class="team-hp"><span>${esc(t("team.hp"))}</span>
          <span class="team-hp-track"><span style="width:${hpPct}%"></span></span>
          <b>${hp}/${hpMax}</b></span>`;

  return `<button type="button" class="team-slot${selected ? " selected" : ""}"
      data-index="${index}" data-pid="${p.pid}" data-loc="party" data-slot="${slot}"
      role="option" aria-selected="${selected}" tabindex="${roving ? 0 : -1}">
    ${selected ? `<span class="team-selected-tag">${esc(t("team.selected"))}</span>` : ""}
    <span class="team-sprite-wrap">
      <canvas class="team-sprite" width="80" height="80" data-species="${p.species}" data-shiny="${p.shiny ? 1 : 0}" aria-hidden="true"></canvas>
      <span class="team-sprite-note">${esc(t("team.spriteUnavailable"))}</span>
    </span>
    <span class="team-info">
      <span class="team-index">${String(index + 1).padStart(2, "0")} · ${esc(t("mon.level", { n: p.level }))}</span>
      <strong>${esc(p.nickname || p.speciesName)}</strong>
      <span class="team-species">${esc(p.speciesName)}</span>
      <span class="team-meta">
        ${gender ? `<span title="${esc(genderLabel)}" aria-label="${esc(genderLabel)}">${esc(gender)}</span>` : ""}
        ${p.shiny ? `<span title="${esc(t("mon.shiny"))}">✦</span>` : ""}
        <span class="chip ${VERDICT_CLASS[v] ?? "unk"}">${esc(verdictLabel(v))}</span>
      </span>
      ${hpBlock}
      ${status ? `<span class="team-status">${esc(t("team.status"))}: ${esc(status)}</span>` : ""}
    </span>
  </button>`;
}

function syncTeamSelection(panel: HTMLElement) {
  panel.querySelectorAll<HTMLButtonElement>(".team-slot").forEach((card, i) => {
    const on = teamSelection === i && !card.classList.contains("empty");
    card.classList.toggle("selected", on);
    card.setAttribute("aria-selected", String(on));
    card.tabIndex = on || (teamSelection === null && i === 0) ? 0 : -1;
    const tag = card.querySelector(".team-selected-tag");
    if (on && !tag) {
      const el = document.createElement("span");
      el.className = "team-selected-tag";
      el.textContent = t("team.selected");
      card.appendChild(el);
    } else if (!on && tag) tag.remove();
  });
}

function bindTeamPanel(inv: Inventory) {
  const panel = document.querySelector<HTMLElement>("#team-panel");
  if (!panel) return;
  const cards = Array.from(panel.querySelectorAll<HTMLButtonElement>(".team-slot"));
  cards.forEach((card) => {
    card.onclick = () => {
      const index = Number(card.dataset.index);
      const ref = teamRefOf(inv, index);
      if (!ref) {
        teamSelection = null;
        syncTeamSelection(panel);
        setStatus(t("team.emptyChosen"), true);
        return;
      }
      teamSelection = index;
      syncTeamSelection(panel);
      openDossierFromLibrary(ref, true);
    };
  });
  panel.onkeydown = (ev) => {
    const from = (ev.target as HTMLElement | null)?.closest<HTMLButtonElement>(".team-slot");
    const index = from ? Number(from.dataset.index) : teamSelection ?? 0;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(ev.key)) {
      ev.preventDefault();
      const next = teamNav(index, ev.key, TEAM_SLOT_COUNT);
      if (next !== null && next !== index) {
        teamSelection = teamRefOf(inv, next) ? next : null;
        syncTeamSelection(panel);
        cards[next]?.focus();
      }
      return;
    }
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      cards[index]?.click();
      return;
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      teamSelection = null;
      syncTeamSelection(panel);
      cards[index]?.focus();
      setStatus(t("team.selectionCleared"));
    }
  };
  paintTeamSprites();
}

/**Pinta los seis sprites locales con reintento limitado; sin sprite, nota explícita.*/
function paintTeamSprites() {
  if (teamSpriteTimer !== null) {
    clearTimeout(teamSpriteTimer);
    teamSpriteTimer = null;
  }
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>("#team-panel canvas[data-species]"));
  if (!canvases.length) return;
  let tries = 0;
  const attempt = () => {
    teamSpriteTimer = null;
    if (!document.contains(canvases[0])) return;
    let painted = 0;
    for (const canvas of canvases) {
      const g = canvas.getContext("2d");
      if (!g) continue;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, canvas.width, canvas.height);
      const species = Number(canvas.dataset.species);
      if (!Number.isFinite(species) || species <= 0) continue;
      const box = paintOverworld(g, species, canvas.dataset.shiny === "1", "idle", 40, 74);
      if (box) painted++;
      const note = canvas.parentElement?.querySelector<HTMLElement>(".team-sprite-note");
      if (note) note.textContent = t(box ? "team.spriteReady" : "team.spriteUnavailable");
    }
    if (painted === canvases.length) return;
    if (teamSpriteLoading) return;
    if (tries === 0) {
      teamSpriteLoading = true;
      void initOverworldSprites().then(() => {
        teamSpriteLoading = false;
        tries++;
        if (document.contains(canvases[0])) teamSpriteTimer = window.setTimeout(attempt, 80);
      });
      return;
    }
    if (tries < 10) {
      tries++;
      teamSpriteTimer = window.setTimeout(attempt, 120);
    }
  };
  attempt();
}

function bars(values: number[], max: number): string {
  return `<div class="bars">${values
    .map(
      (v, i) => `<div class="bar"><span>${esc(statName(i))}</span>
        <div class="track"><div style="width:${Math.round((v / max) * 100)}%"></div></div>
        <b>${v}</b></div>`,
    )
    .join("")}</div>`;
}

/* ------------------------------------------------------------------ */
/* PG-07C — FICHA / DATOS                                             */
/* ------------------------------------------------------------------ */

type DossierVerdict = "legal" | "unverified" | "illegal" | null;
type DossierSource =
  | { kind: "library"; ref: MonRef }
  | { kind: "pet"; pet: Pet };

type DossierData = {
  source: "library" | "pet";
  species: number | null;
  speciesName: string | null;
  nickname: string | null;
  level: number | null;
  gender: number | null;
  shiny: boolean | null;
  ball: number | null;
  language: number | null;
  generation: number | null;
  game: string | null;
  ot: string | null;
  tid: number | null;
  sid: number | null;
  nature: string | null;
  ability: number | null;
  heldItem: string | null;
  friendship: number | null;
  exp: number | null;
  metLocation: string | null;
  metLevel: number | null;
  metDate: string | null;
  eggDate: string | null;
  verdict: DossierVerdict;
  issues: string[];
  legalityReport: string | null;
  exportTargets: { system: string; allowed: boolean; reason: string }[];
  ivs: number[] | null;
  evs: number[] | null;
  pendingEvs: number[] | null;
  stats: Stats | null;
  moves: Move[] | null;
  note: string | null;
  monRef: MonRef | null;
};

type LibraryTab = "team" | "party" | "boxes" | "bag" | "legality";

let currentSave: SaveSummary | null = null;
let libraryTab: LibraryTab = "team";
let teamSelection: number | null = null;
let pcBoxIndex: number | null = null;
let pcSlotSelection: number | null = null;
let pcFilter: string = "all";
let pcQuery: string = "";
let pcSpriteTimer: number | null = null;
let pcSpriteLoading = false;
let currentInventory: Inventory | null = null;
let dossierSource: DossierSource | null = null;
let dossierTab: "ficha" | "datos" = "ficha";
let dossierReturn: "library" | "nursery" | "team" | "boxes" = "library";
let dossierReturnPetId: number | null = null;
let dossierResolved: Pkm | null = null;
let dossierResolvedInventory: Inventory | null = null;
let dossierNote: string | null = null;
let dossierSpriteInit = false;
let dossierSpriteTimer: number | null = null;

const na = () => `<span class="muted">${esc(t("dossier.unavailable"))}</span>`;
const oldGen = (g: number | null) => g === 1 || g === 2;
const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function dataFromPkm(p: Pkm, generation: number | null): DossierData {
  const gen = generation ?? null;
  const natureIndex = numOrNull(p.nature);
  return {
    source: "library",
    species: numOrNull(p.species),
    speciesName: p.speciesName ?? null,
    nickname: p.nickname ?? null,
    level: numOrNull(p.level),
    gender: numOrNull(p.gender),
    shiny: typeof p.shiny === "boolean" ? p.shiny : null,
    ball: numOrNull(p.ball),
    language: numOrNull(p.language),
    generation: gen,
    game: null,
    ot: p.ot ?? null,
    tid: numOrNull(p.tid),
    sid: numOrNull(p.sid),
    nature: oldGen(gen)
      ? null
      : natureIndex !== null
        ? NATURES[natureIndex] ?? String(natureIndex)
        : null,
    ability: oldGen(gen) ? null : numOrNull(p.ability),
    heldItem:
      p.heldItemName ?? (numOrNull(p.heldItem) !== null ? String(numOrNull(p.heldItem)) : null),
    friendship: numOrNull(p.friendship),
    exp: numOrNull(p.exp),
    metLocation: p.metLocationName ?? p.metLocation ?? null,
    metLevel: numOrNull(p.metLevel),
    metDate: p.metDate ?? null,
    eggDate: p.eggDate ?? null,
    verdict: p.verdict ?? verdictOf(p),
    issues: p.issues ?? [],
    legalityReport: p.legalityReport ?? null,
    exportTargets: p.exportTargets ?? [],
    ivs: Array.isArray(p.ivs) ? p.ivs : null,
    evs: Array.isArray(p.evs) ? p.evs : null,
    pendingEvs: null,
    stats: p.stats ?? null,
    moves: Array.isArray(p.moves) ? p.moves : null,
    note: null,
    monRef: null,
  };
}

function dataFromPet(pet: Pet): DossierData {
  const pr = pet.profile;
  const gen = numOrNull(pr.generation);
  return {
    source: "pet",
    species: numOrNull(pr.species),
    speciesName: pr.speciesName ?? null,
    nickname: pr.nickname ?? null,
    level: numOrNull(pr.level),
    gender: numOrNull(pr.gender),
    shiny: typeof pr.shiny === "boolean" ? pr.shiny : null,
    ball: null,
    language: null,
    generation: gen,
    game: null,
    ot: pr.ot ?? null,
    tid: null,
    sid: null,
    nature: oldGen(gen) ? null : pr.nature ?? null,
    ability: null,
    heldItem: null,
    friendship: null,
    exp: null,
    metLocation: pr.metLocationName ?? null,
    metLevel: null,
    metDate: null,
    eggDate: null,
    verdict: null,
    issues: [],
    legalityReport: null,
    exportTargets: [],
    ivs: Array.isArray(pr.ivs) ? pr.ivs : null,
    evs: Array.isArray(pr.baseEvs) ? pr.baseEvs : null,
    pendingEvs: Array.isArray(pet.state.pendingEvs) ? pet.state.pendingEvs : null,
    stats: null,
    moves: null,
    note: null,
    monRef: null,
  };
}

/** Completa campos de partida que PKHeX expone a nivel de save, no por Pokémon. */
function enrichWithSave(d: DossierData, inv: Inventory | null): DossierData {
  if (!inv) return d;
  return {
    ...d,
    game: d.game ?? inv.versionName ?? null,
    ot: d.ot ?? inv.trainer?.ot ?? null,
    tid: d.tid ?? numOrNull(inv.trainer?.tid),
    sid: d.sid ?? numOrNull(inv.trainer?.sid),
  };
}

function dossierData(): DossierData | null {
  if (!dossierSource) return null;
  if (dossierSource.kind === "library") {
    const d = dataFromPkm(dossierSource.ref.p, currentInventory?.generation ?? null);
    d.monRef = dossierSource.ref;
    return enrichWithSave(d, currentInventory);
  }
  const fromProfile = dataFromPet(dossierSource.pet);
  if (!dossierResolved) return { ...fromProfile, note: dossierNote };
  const resolvedInv = dossierResolvedInventory;
  const full = dataFromPkm(dossierResolved, resolvedInv?.generation ?? fromProfile.generation);
  return enrichWithSave(
    {
      ...full,
      source: "pet",
      pendingEvs: fromProfile.pendingEvs,
      note: dossierNote,
    },
    resolvedInv,
  );
}

async function resolvePet(pet: Pet) {
  dossierResolved = null;
  dossierResolvedInventory = null;
  dossierNote = null;
  if (!pet.save) {
    dossierNote = t("dossier.pet.noSave");
    return;
  }
  if (oldGen(numOrNull(pet.profile.generation)) && numOrNull(pet.profile.pid) === 0) {
    dossierNote = t("dossier.pet.noSlot");
    return;
  }
  try {
    const out = await api<{ inventory: Inventory }>(
      `/api/saves/${encodeURIComponent(pet.save)}`,
    );
    const pid = numOrNull(pet.profile.pid);
    const found = refsOf(out.inventory).find((r) => numOrNull(r.p.pid) === pid && pid !== 0);
    if (!found) {
      dossierNote = t("dossier.pet.notFound");
      return;
    }
    const genOk = numOrNull(out.inventory.generation) === numOrNull(pet.profile.generation);
    const speciesOk =
      numOrNull(found.p.species) === numOrNull(pet.profile.species) ||
      String(found.p.speciesName ?? "").toLowerCase() ===
        String(pet.profile.speciesName ?? "").toLowerCase();
    if (!genOk || !speciesOk) {
      dossierNote = t("dossier.pet.mismatch");
      return;
    }
    dossierResolved = found.p;
    dossierResolvedInventory = out.inventory;
  } catch (e) {
    dossierNote = t("dossier.pet.resolveError", { msg: (e as Error).message });
  }
}

/** Texto seguro para atributos y cabeceras; los huecos se marcan explícitamente. */
const dv = (v: unknown) =>
  v === null || v === undefined || v === "" ? t("dossier.unavailable") : String(v);

function dossierRow(label: string, value: string, cls = "") {
  return `<div class="dossier-row ${cls}"><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
}

function dossierVal(v: unknown, suffix = "") {
  if (v === null || v === undefined || v === "") return na();
  return `${esc(String(v))}${suffix ? ` <span class="muted">${esc(suffix)}</span>` : ""}`;
}

function dossierVerdict(v: DossierVerdict) {
  if (!v) return `<span class="chip muted">${esc(t("dossier.unavailable"))}</span>`;
  return `<span class="chip ${VERDICT_CLASS[v] ?? ""}">${esc(verdictLabel(v))}</span>`;
}

function renderFicha(d: DossierData) {
  const old = oldGen(d.generation);
  return `
    <div class="dossier-head">
      <div class="dossier-sprite">
        <canvas id="dossier-sprite" width="160" height="144" aria-label="${esc(t("dossier.species"))}"></canvas>
        <p class="muted tiny" id="dossier-sprite-caption">${esc(t("dossier.spriteUnavailable"))}</p>
      </div>
      <div class="dossier-ident">
        <p class="dossier-kicker">${esc(t("dossier.kicker"))}</p>
        <h2>${esc(dv(d.nickname))}</h2>
        <p class="muted">${esc(dv(d.speciesName))} · ${esc(t("mon.level", { n: dv(d.level) }))}</p>
        <div class="dossier-verdict">${esc(t("dossier.legality"))}: ${dossierVerdict(d.verdict)}</div>
        ${d.shiny === true ? `<span class="chip">${esc(t("mon.shiny"))}</span>` : ""}
      </div>
    </div>
    <dl class="dossier-grid">
      ${dossierRow(t("dossier.species"), dossierVal(d.speciesName ?? (d.species !== null ? `#${d.species}` : null)))}
      ${dossierRow(t("dossier.name"), dossierVal(d.nickname))}
      ${dossierRow(t("dossier.level"), dossierVal(d.level))}
      ${dossierRow(t("dossier.gender"), d.gender === null ? na() : dossierVal(t("dossier.genderValue", { n: d.gender })))}
      ${dossierRow(t("dossier.generation"), dossierVal(d.generation))}
      ${dossierRow(t("dossier.game"), dossierVal(d.game))}
      ${dossierRow(t("dossier.trainer"), dossierVal(d.ot))}
      ${dossierRow(t("dossier.trainerId"), dossierVal(d.tid ?? d.sid))}
      ${dossierRow(t("dossier.nature"), old ? `<span class="muted">${esc(t("dossier.notInGen"))}</span>` : dossierVal(d.nature))}
      ${dossierRow(t("dossier.ability"), old ? `<span class="muted">${esc(t("dossier.notInGen"))}</span>` : d.ability === null ? na() : dossierVal(t("dossier.abilityId", { n: d.ability })))}
      ${dossierRow(t("dossier.item"), d.generation === 1 ? `<span class="muted">${esc(t("dossier.notInGen"))}</span>` : dossierVal(d.heldItem))}
    </dl>
    ${old ? `<p class="muted tiny">${esc(t("dossier.oldGenNote"))}</p>` : ""}
    ${d.note ? `<p class="muted tiny">${esc(d.note)}</p>` : ""}
  `;
}

function renderDatos(d: DossierData) {
  const old = oldGen(d.generation);
  const pending = (d.pendingEvs ?? []).reduce((a, b) => a + b, 0);
  const rows: string[] = [];

  rows.push(`<h3>${esc(t("dossier.stats"))}</h3>`);
  rows.push(
    d.stats
      ? `<div class="stats-grid small">
          <span>${esc(t("statname.hp"))} <b>${d.stats.hp}/${d.stats.hpMax}</b></span>
          <span>${esc(t("statname.atk"))} <b>${d.stats.atk}</b></span>
          <span>${esc(t("statname.def"))} <b>${d.stats.def}</b></span>
          <span>${esc(t("statname.spa"))} <b>${d.stats.spa}</b></span>
          <span>${esc(t("statname.spd"))} <b>${d.stats.spd}</b></span>
          <span>${esc(t("statname.spe"))} <b>${d.stats.spe}</b></span>
        </div>`
      : `<p class="muted tiny">${esc(t("dossier.noStats"))}</p>`,
  );

  rows.push(`<h3>${esc(old ? t("dossier.dvs") : t("dossier.ivs"))}</h3>`);
  rows.push(
    d.ivs ? bars(d.ivs, old ? 15 : 31) : `<p class="muted tiny">${esc(t("dossier.noData"))}</p>`,
  );
  if (old) rows.push(`<p class="muted tiny">${esc(t("dossier.dvNote"))}</p>`);

  rows.push(`<h3>${esc(old ? t("dossier.statexp") : t("dossier.evs"))}</h3>`);
  rows.push(
    d.evs
      ? bars(d.evs, old ? 65535 : 255)
      : `<p class="muted tiny">${esc(t("dossier.noData"))}</p>`,
  );
  if (old) {
    rows.push(`<p class="muted tiny">${esc(t("dossier.statexpNote"))}</p>`);
  } else if (d.evs) {
    rows.push(`<p class="muted tiny">${esc(t("dossier.evTotal", { n: d.evs.reduce((a, b) => a + b, 0) }))}</p>`);
  }
  if (pending > 0) {
    rows.push(`<p class="muted tiny"><b>${esc(t("dossier.pending"))}</b>: ${esc(bars(d.pendingEvs ?? [], old ? 65535 : 255))}</p>`);
    rows.push(`<p class="muted tiny">${esc(t("dossier.pendingNote"))}</p>`);
  }

  rows.push(`<h3>${esc(t("dossier.moves"))}</h3>`);
  rows.push(
    d.moves && d.moves.length
      ? `<ol class="dossier-moves">${d.moves
          .map(
            (m) =>
              `<li><b>${esc(m.name || `#${m.id}`)}</b> <span class="muted">${esc(t("mon.pp", { pp: m.pp }))} · ${esc(t("mon.ppUps", { n: m.ppUps }))}</span></li>`,
          )
          .join("")}</ol>`
      : `<p class="muted tiny">${esc(t("dossier.noMoves"))}</p>`,
  );

  rows.push(`<h3>${esc(t("dossier.other"))}</h3>`);
  rows.push(`<dl class="dossier-grid">
    ${dossierRow(t("dossier.exp"), dossierVal(d.exp))}
    ${dossierRow(t("dossier.friendship"), d.generation === 1 ? `<span class="muted">${esc(t("dossier.notInGen"))}</span>` : dossierVal(d.friendship))}
    ${dossierRow(t("dossier.ball"), old ? `<span class="muted">${esc(t("dossier.notInGen"))}</span>` : dossierVal(d.ball))}
    ${dossierRow(t("dossier.language"), old ? `<span class="muted">${esc(t("dossier.notInGen"))}</span>` : dossierVal(d.language))}
    ${dossierRow(t("dossier.origin"), dossierVal(d.metLocation))}
    ${dossierRow(t("dossier.metLevel"), dossierVal(d.metLevel))}
    ${dossierRow(t("dossier.metDate"), dossierVal(d.metDate))}
    ${dossierRow(t("dossier.eggDate"), dossierVal(d.eggDate))}
  </dl>`);

  if (d.issues.length) {
    rows.push(`<h3>${esc(t("dossier.issues"))}</h3><ul class="dossier-issues">${d.issues
      .map((i) => `<li>${esc(String(i))}</li>`)
      .join("")}</ul>`);
  }
  if (d.legalityReport) {
    rows.push(`<h3>${esc(t("dossier.report"))}</h3><pre class="dossier-report">${esc(d.legalityReport)}</pre>`);
  }
  if (d.exportTargets.length) {
    rows.push(`<h3>${esc(t("dossier.export"))}</h3><ul class="dossier-moves">${d.exportTargets
      .map(
        (x) =>
          `<li><b>${esc(x.system)}</b> <span class="muted">${esc(x.allowed ? t("mon.allowed") : t("mon.blocked"))}${x.reason ? ` · ${esc(x.reason)}` : ""}</span></li>`,
      )
      .join("")}</ul>`);
  }
  if (d.note) rows.push(`<p class="muted tiny">${esc(d.note)}</p>`);
  return rows.join("");
}

function paintDossierSprite(d: DossierData) {
  if (dossierSpriteTimer !== null) {
    clearTimeout(dossierSpriteTimer);
    dossierSpriteTimer = null;
  }
  const c = document.querySelector<HTMLCanvasElement>("#dossier-sprite");
  const caption = document.querySelector<HTMLElement>("#dossier-sprite-caption");
  if (!c || d.species === null) return;
  const g = c.getContext("2d");
  if (!g) return;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, c.width, c.height);
  let tries = 0;
  const show = (): boolean => {
    if (!document.contains(c)) return false;
    const painted = paintOverworld(g, d.species as number, d.shiny === true, "idle", 80, 122);
    if (caption) caption.textContent = t(painted ? "dossier.spriteReady" : "dossier.spriteUnavailable");
    return painted !== null;
  };
  const retry = () => {
    dossierSpriteTimer = null;
    if (!document.contains(c) || show()) return;
    if (dossierSpriteInit) return;
    if (tries === 0) {
      dossierSpriteInit = true;
      void initOverworldSprites().then(() => {
        dossierSpriteInit = false;
        tries++;
        retry();
      });
      return;
    }
    if (tries < 12) {
      tries++;
      dossierSpriteTimer = window.setTimeout(retry, 120);
    }
  };
  retry();
}

let dossierKeyBound = false;
function dossierOnKey(ev: KeyboardEvent) {
  const host = document.querySelector<HTMLElement>("#sheet");
  if (!host || host.classList.contains("hidden")) return;
  if (ev.key === "Escape") {
    ev.preventDefault();
    closeDossier();
  } else if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
    ev.preventDefault();
    dossierTab = dossierTab === "ficha" ? "datos" : "ficha";
    renderDossier();
  } else if (ev.key === "Enter" || ev.key === " ") {
    ev.preventDefault();
    dossierTab = dossierTab === "ficha" ? "datos" : "ficha";
    renderDossier();
  }
}

function renderDossier() {
  const host = document.querySelector<HTMLElement>("#sheet");
  if (!host) return;
  host.classList.remove("hidden");
  const d = dossierData();
  if (!d) {
    host.innerHTML = `
      <div class="device-shell dossier-device">
        <div class="device-ring" aria-hidden="true"></div>
        <div class="dossier-card">
          <p class="dossier-kicker">${esc(t("dossier.kicker"))}</p>
          <p class="placeholder">${esc(t("dossier.empty"))}</p>
          <div class="dossier-actions">
            <button id="dossier-back" class="ghost">← ${esc(t("dossier.back"))}</button>
            <button id="dossier-close" class="ghost">${esc(t("dossier.close"))}</button>
          </div>
        </div>
      </div>`;
  } else {
    host.innerHTML = `
      <div class="device-shell dossier-device">
        <div class="device-ring" aria-hidden="true"></div>
        <div class="device-brand" aria-hidden="true">
          <span>${esc(t("device.brand"))}</span><small>${esc(t("device.model"))}</small>
        </div>
        <div class="dossier-card">
          <div class="dossier-title">
            <div>
              <p class="dossier-kicker">${esc(t("dossier.kicker"))}</p>
              <p class="muted tiny">${esc(t(d.source === "pet" ? "dossier.source.pet" : "dossier.source.library"))}</p>
            </div>
            <div class="tabs dossier-tabs">
              <button data-dossier-tab="ficha" class="${dossierTab === "ficha" ? "active" : ""}">${esc(t("dossier.tab.ficha"))}</button>
              <button data-dossier-tab="datos" class="${dossierTab === "datos" ? "active" : ""}">${esc(t("dossier.tab.datos"))}</button>
            </div>
          </div>
          <div class="dossier-body">${dossierTab === "ficha" ? renderFicha(d) : renderDatos(d)}</div>
          <div class="dossier-actions">
            <button id="dossier-back" class="ghost">← ${esc(t("dossier.back"))}</button>
            <button id="dossier-close" class="ghost">${esc(t("dossier.close"))}</button>
            ${d.monRef && d.verdict !== "illegal" ? `<button id="adopt" class="primary">${esc(t("dossier.adopt"))}</button>` : ""}
            ${d.verdict === "illegal" ? `<span class="muted tiny">${esc(t("dossier.adoptBlocked"))}</span>` : ""}
          </div>
        </div>
      </div>`;
    paintDossierSprite(d);
  }

  host.querySelectorAll<HTMLButtonElement>("[data-dossier-tab]").forEach((btn) => {
    btn.onclick = () => {
      dossierTab = btn.dataset.dossierTab === "datos" ? "datos" : "ficha";
      renderDossier();
    };
  });
  host.querySelector<HTMLButtonElement>("#dossier-back")?.addEventListener("click", closeDossier);
  host.querySelector<HTMLButtonElement>("#dossier-close")?.addEventListener("click", closeDossier);
  host.querySelector<HTMLButtonElement>("#adopt")?.addEventListener("click", () => {
    const source = dossierSource;
    if (!source || source.kind !== "library") return;
    const p = source.ref.p;
    const btn = document.querySelector<HTMLButtonElement>("#adopt");
    if (btn) {
      btn.disabled = true;
      btn.textContent = t("dossier.adoptWorking");
    }
    const identity =
      numOrNull(p.pid) !== 0
        ? { sha256: currentSha ?? undefined, pid: numOrNull(p.pid) ?? 0 }
        : {
            sha256: currentSha ?? undefined,
            location: source.ref.location,
            box: source.ref.box ?? 0,
            slot: source.ref.slot,
          };
    void adoptPet(currentSha ?? "", identity)
      .then((out) => {
        renderDossier();
        closeDossier();
        showNursery(out.pet?.id);
      })
      .catch((e) => {
        setStatus(String((e as Error).message));
        renderDossier();
      });
  });
  if (!dossierKeyBound) {
    document.addEventListener("keydown", dossierOnKey);
    dossierKeyBound = true;
  }
}

function setDossierNav(active: "library" | "sheet" | "nursery") {
  (["library", "sheet", "nursery"] as const).forEach((key) => {
    document.querySelector(`#nav-${key}`)?.classList.toggle("active", key === active);
  });
}

function openDossierFromLibrary(ref: MonRef, fromTeam = false) {
  showLibrary();
  dossierSource = { kind: "library", ref };
  dossierTab = "ficha";
  dossierReturn = fromTeam ? "team" : "library";
  dossierResolved = null;
  dossierNote = null;
  setDossierNav("sheet");
  renderDossier();
}

function openDossierFromPet(pet: Pet) {
  closeNursery();
  document.querySelector(".layout")?.classList.add("hidden");
  document.querySelector("#nursery")?.classList.add("hidden");
  const dialog = document.querySelector<HTMLDialogElement>("#mon");
  if (dialog?.open) dialog.close();
  dossierSource = { kind: "pet", pet };
  dossierTab = "ficha";
  dossierReturn = "nursery";
  dossierReturnPetId = pet.id;
  dossierResolved = null;
  dossierNote = null;
  setDossierNav("sheet");
  renderDossier();
  void resolvePet(pet).then(() => {
    if (dossierSource?.kind === "pet" && dossierSource.pet.id === pet.id) renderDossier();
  });
}

function clearDossier() {
  const host = document.querySelector<HTMLElement>("#sheet");
  if (host) host.classList.add("hidden");
  dossierSource = null;
  dossierResolved = null;
  dossierResolvedInventory = null;
  dossierNote = null;
  dossierReturnPetId = null;
  if (dossierSpriteTimer !== null) {
    clearTimeout(dossierSpriteTimer);
    dossierSpriteTimer = null;
  }
  if (dossierKeyBound) {
    document.removeEventListener("keydown", dossierOnKey);
    dossierKeyBound = false;
  }
}

function closeDossier() {
  const back = dossierReturn;
  const backPetId = dossierReturnPetId;
  clearDossier();
  if (back === "nursery") showNursery(backPetId ?? undefined);
  else if (back === "team") restoreLibrary("team");
  else if (back === "boxes") restoreLibrary("boxes");
  else showLibrary();
}

/** Compatibilidad con el antiguo modal: la ficha es ahora una vista completa. */
function showMon(ref: MonRef) {
  openDossierFromLibrary(ref);
}

async function importFile(file: File) {
  setStatus(t("save.importing", { name: file.name }));
  try {
    const res = await fetch(`/api/saves/upload?filename=${encodeURIComponent(file.name)}`, { method: "POST", body: file });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
    setStatus(body.duplicate ? t("save.duplicate") : t("save.imported"));
    await loadSaves();
    if (body.save?.sha256) await openSave(body.save.sha256);
  } catch (err) {
    setStatus((err as Error).message, true);
  }
}

function wireDrop() {
  const drop = $("#drop");
  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("over");
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("over");
    }),
  );
  drop.addEventListener("drop", (e) => {
    const file = (e as DragEvent).dataTransfer?.files?.[0];
    if (file) importFile(file);
  });
  $<HTMLInputElement>("#file").onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) importFile(file);
  };
  $("#refresh").onclick = () => loadSaves();
}

/* Navegación entre biblioteca, ficha y guardería. */
function libraryChrome() {
  closeNursery();
  $("#nursery").classList.add("hidden");
  $(".layout").classList.remove("hidden");
  setDossierNav("library");
}

function showLibrary() {
  clearDossier();
  libraryChrome();
}

/**Vuelve al panel concreto tras cerrar la ficha, conservando la selección.*/
function restoreLibrary(tab: LibraryTab) {
  clearDossier();
  libraryChrome();
  libraryTab = tab;
  if (currentSave && currentInventory) renderDetail(currentSave, currentInventory);
}

function showNursery(preferId?: number) {
  clearDossier();
  $("#mon")?.close?.();
  $(".layout").classList.add("hidden");
  $("#nursery").classList.remove("hidden");
  setDossierNav("nursery");
  openNursery($("#nursery"), showLibrary, preferId, openDossierFromPet);
}

$("#nav-library").onclick = () => showLibrary();
$("#nav-nursery").onclick = () => showNursery();
$("#nav-sheet").onclick = () => {
  const ref = currentInventory ? refsOf(currentInventory)[0] : undefined;
  if (ref) {
    openDossierFromLibrary(ref);
    return;
  }
  clearDossier();
  dossierTab = "ficha";
  dossierReturn = "library";
  setDossierNav("sheet");
  $(".layout").classList.add("hidden");
  $("#nursery").classList.add("hidden");
  renderDossier();
};

applyStaticI18n();
loadHealth();
loadSaves();
wireDrop();
