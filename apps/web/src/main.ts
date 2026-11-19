import { adoptPet, closeNursery, openNursery } from "/nursery.js";
import { statName } from "/pet-engine.js";
import { getLocale, localeTag, t } from "/i18n.ts";

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
};

type Bag = { pouch: string; items: { index: number; name: string; count: number }[] };
type Dex = { available: boolean; source?: string; caughtCount?: number; seenCount?: number; reason?: string };
type Inventory = {
  detected: boolean;
  saveType: string | null;
  generation: number | null;
  versionName: string | null;
  trainer: { ot: string | null; tid: number | null; sid?: number | null; money: number | null; coins?: number | null; playTime: string | null; gender?: number | null; language?: number | null } | null;
  badges: { property: string; raw: number; bits: number }[] | null;
  pokedex: Dex | null;
  party: Pkm[];
  boxes: { index: number; name: string; slots: Pkm[] }[];
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
  currentSha = sha;
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
      <button data-tab="party" class="active">${esc(t("tab.party"))}</button>
      <button data-tab="boxes">${esc(t("tab.boxes"))}</button>
      <button data-tab="bag">${esc(t("tab.bag"))}</button>
      <button data-tab="legality">${esc(t("tab.legality"))}</button>
    </nav>
    <div id="tab"></div>
  `;

  const tab = $("#tab");
  const show = (name: string) => {
    detail.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    if (name === "party")
      tab.innerHTML = grid(inv.party.map((p) => ({ p, location: "party" as const, box: null, slot: Number(p.slot ?? 0) })));
    else if (name === "boxes") tab.innerHTML = boxesView(inv);
    else if (name === "bag") tab.innerHTML = bagView(inv);
    else tab.innerHTML = legalityView(inv);
    bindMons(inv);
  };
  detail.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) => (b.onclick = () => show(b.dataset.tab!)));
  show("party");
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

function boxesView(inv: Inventory): string {
  if (!inv.boxes.length) return `<p class="muted">${esc(t("mon.noBoxes"))}</p>`;
  return inv.boxes
    .map(
      (b) => `<section class="box">
        <h3>${esc(b.name)} <span class="muted">(${b.slots.length})</span></h3>
        ${grid(b.slots.map((p) => ({ p, location: "box" as const, box: b.index, slot: Number(p.slot ?? 0) })))}
      </section>`,
    )
    .join("");
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
      if (ref) showMon(ref);
    };
  });
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

function showMon(ref: MonRef) {
  const p = ref.p;
  const dlg = $<HTMLDialogElement>("#mon");
  const st = p.stats;
  $("#mon-body").innerHTML = `
    <header class="mon-head">
      <div>
        <h2>${esc(p.nickname || p.speciesName)}</h2>
        <p class="sub">${esc(p.speciesName)} · ${esc(t("mon.level", { n: p.level }))} · ${esc(p.isNicknamed ? t("mon.nicknamed") : t("mon.notNicknamed"))}${p.shiny ? ` · ${esc(t("mon.shiny"))}` : ""}</p>
      </div>
      <span class="chip ${p.verdict === "unverified" || (!p.verdict && p.legal === null) ? "warn" : VERDICT_CLASS[verdictOf(p)]}">
        ${esc(verdictLabel(verdictOf(p)))}
      </span>
    </header>

    <dl class="stats-grid small">
      <div><dt>${esc(t("mon.exp"))}</dt><dd>${p.exp.toLocaleString(localeTag())}</dd></div>
      <div><dt>${esc(t("mon.nature"))}</dt><dd>${p.nature == null ? "?" : NATURES[p.nature] ?? p.nature}</dd></div>
      <div><dt>${esc(t("mon.friendship"))}</dt><dd>${p.friendship ?? "—"}</dd></div>
      <div><dt>${esc(t("mon.item"))}</dt><dd>${esc(p.heldItemName ?? "—")}</dd></div>
      <div><dt>${esc(t("mon.origin"))}</dt><dd>${esc(p.metLocationName ?? p.metLocation ?? "?")} · ${esc(t("mon.level", { n: p.metLevel ?? "?" }))}</dd></div>
      <div><dt>${esc(t("mon.ot"))}</dt><dd>${esc(p.ot ?? "?")} / ${p.tid ?? "?"}-${p.sid ?? "?"}</dd></div>
    </dl>

    ${st ? `<h3>${esc(t("mon.stats"))}</h3><dl class="stats-grid small">
      <div><dt>${esc(statName(0))}</dt><dd>${st.hp} / ${st.hpMax}</dd></div>
      <div><dt>${esc(statName(1))}</dt><dd>${st.atk}</dd></div>
      <div><dt>${esc(statName(2))}</dt><dd>${st.def}</dd></div>
      <div><dt>${esc(statName(3))}</dt><dd>${st.spa}</dd></div>
      <div><dt>${esc(statName(4))}</dt><dd>${st.spd}</dd></div>
      <div><dt>${esc(statName(5))}</dt><dd>${st.spe}</dd></div>
    </dl>` : ""}

    <h3>${esc(t("mon.ivs"))}</h3>${bars(p.ivs, 31)}
    <h3>${esc(t("mon.evs"))}</h3>${bars(p.evs, Math.max(1, ...p.evs))}

    <h3>${esc(t("mon.moves"))}</h3>
    <ol class="moves">${p.moves.map((m) => `<li>${esc(m.name)} <span class="muted">${esc(t("mon.pp", { pp: m.pp }))}${m.ppUps ? ` ${esc(t("mon.ppUps", { n: m.ppUps }))}` : ""}</span></li>`).join("")}</ol>

    ${(p.issues ?? []).length ? `<h3>${esc(t("mon.issues"))}</h3><ul class="issues">${p.issues!.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : p.legalityReport ? `<h3>${esc(t("mon.legalityReport"))}</h3><pre>${esc(p.legalityReport)}</pre>` : ""}

    ${p.exportTargets?.length ? `<h3>${esc(t("mon.export"))}</h3><ul class="targets">${p.exportTargets
      .map((target) => `<li class="${target.allowed ? "ok" : "bad"}"><b>${esc(target.system.toUpperCase())}</b> ${esc(target.allowed ? t("mon.allowed") : t("mon.blocked"))} <span class="muted">${esc(target.reason)}</span></li>`)
      .join("")}</ul>` : ""}

    <div class="adopt">
      <button id="adopt" class="primary" ${verdictOf(p) === "illegal" ? "disabled" : ""}>${esc(t("adopt.button"))}</button>
      <p id="adopt-msg" class="muted tiny">${esc(verdictOf(p) === "illegal" ? t("adopt.blocked") : t("adopt.hint"))}</p>
    </div>
  `;
  dlg.showModal();

  const btn = $("#adopt") as HTMLButtonElement | null;
  if (btn) {
    btn.onclick = async () => {
      const msg = $("#adopt-msg")!;
      btn.disabled = true;
      msg.textContent = t("adopt.working");
      const identity =
        Number(p.pid) !== 0
          ? { pid: Number(p.pid) }
          : { location: ref.location, box: ref.box ?? 0, slot: ref.slot };
      const out = await adoptPet(currentSha, identity);
      msg.textContent = out.message;
      msg.classList.toggle("bad", !out.ok);
      if (out.ok) {
        setTimeout(() => {
          dlg.close();
          showNursery(out.pet?.id);
        }, 450);
      } else {
        btn.disabled = false;
      }
    };
  }
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

/* Navegación entre biblioteca y guardería. */
function showLibrary() {
  closeNursery();
  $("#nursery").classList.add("hidden");
  $(".layout").classList.remove("hidden");
  $("#nav-library").classList.add("active");
  $("#nav-nursery").classList.remove("active");
}

function showNursery(preferId?: number) {
  $("#mon")?.close?.();
  $(".layout").classList.add("hidden");
  $("#nursery").classList.remove("hidden");
  $("#nav-library").classList.remove("active");
  $("#nav-nursery").classList.add("active");
  openNursery($("#nursery"), showLibrary, preferId);
}

$("#nav-library").onclick = () => showLibrary();
$("#nav-nursery").onclick = () => showNursery();

applyStaticI18n();
loadHealth();
loadSaves();
wireDrop();
