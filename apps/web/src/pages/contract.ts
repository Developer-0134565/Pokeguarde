// OC-STITCH-08 — Contrato compartido de las páginas integradas.
// Toda página se construye con DOM nativo sobre este módulo: una sola cabecera,
// un único indicador de estado y estilos comunes. Sin frameworks ni CDN.

import type { PageEntry, PageState } from "./catalog.js";

export type Navigate = (path: string) => void;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function button(label: string, onClick?: () => void, className = "pg-btn"): HTMLButtonElement {
  const b = el("button", className, label);
  b.type = "button";
  if (onClick) b.addEventListener("click", onClick);
  return b;
}

/** Botón de maqueta: visible, accesible y explícitamente inerte. */
export function mockButton(label: string, why = "Maqueta visual: esta acción no está implementada en modo local."): HTMLButtonElement {
  const b = button(label);
  b.disabled = true;
  b.title = why;
  b.setAttribute("aria-label", `${label} (${why})`);
  return b;
}

const STATE_LABEL: Record<PageState, string> = {
  OPERATIONAL: "OPERATIVA · DATOS REALES",
  PARTIAL: "PARCIAL · DATOS REALES DISPONIBLES",
  UI_PROTOTYPE: "PROTOTIPO UI · SIN BACKEND",
  BLOCKED: "BLOQUEADO",
};

export interface PageFrame {
  readonly root: HTMLElement;
  readonly body: HTMLElement;
  readonly aside: HTMLElement;
  readonly content: HTMLElement;
}

/** Marco común: título, dominio, estado, breadcrumb y aviso de prototipo. */
export function pageFrame(page: PageEntry, navigate: Navigate): PageFrame {
  const root = el("section", "pg-page");
  root.dataset.pgStitch = page.sources[0]?.id ?? "";
  root.dataset.pgDomain = page.domain;
  root.dataset.pgState = page.state;

  const head = el("header", "pg-page__head");
  const kicker = el("div", "pg-page__kicker");
  kicker.append(
    el("span", "pg-page__domain", page.domain.toUpperCase()),
    el("span", `pg-page__state pg-page__state--${page.state.toLowerCase()}`, STATE_LABEL[page.state]),
  );
  const title = el("h1", "pg-page__title", page.title);
  const crumbs = el("nav", "pg-page__crumbs");
  crumbs.setAttribute("aria-label", "Ruta de navegación");
  const home = button("INICIO", () => navigate("/home"), "pg-page__crumb");
  crumbs.append(home, el("span", "pg-page__crumb-sep", "/"), el("span", "pg-page__crumb-current", page.title));
  head.append(kicker, title, crumbs);

  const notice = el("p", "pg-page__notice");
  if (page.state === "UI_PROTOTYPE") {
    notice.textContent = `${page.notes} Interfaz de referencia: no ejecuta acciones externas ni inventa datos.`;
  } else if (page.state === "PARTIAL") {
    notice.textContent = `${page.notes} Los datos disponibles proceden de la app local.`;
  } else {
    notice.textContent = page.notes;
  }

  const layout = el("div", "pg-page__layout");
  const content = el("div", "pg-page__content");
  const body = el("div", "pg-page__body");
  const aside = el("aside", "pg-page__aside");
  content.append(notice, body);
  layout.append(content, aside);
  root.append(head, layout);
  return { root, body, aside, content };
}

export function section(title: string, subtitle?: string, ...children: Node[]): HTMLElement {
  const s = el("section", "pg-sec");
  const h = el("h2", "pg-sec__title", title);
  s.appendChild(h);
  if (subtitle) s.appendChild(el("p", "pg-sec__sub", subtitle));
  for (const child of children) s.appendChild(child);
  return s;
}

export function table(caption: string, rows: readonly (readonly [string, string])[]): HTMLElement {
  const wrap = el("div", "pg-table-wrap");
  const t = el("table", "pg-table");
  const cap = el("caption", undefined, caption);
  const thead = el("thead");
  const hr = el("tr");
  hr.append(el("th", undefined, "CAMPO"), el("th", undefined, "VALOR"));
  thead.appendChild(hr);
  const tbody = el("tbody");
  for (const [k, v] of rows) {
    const tr = el("tr");
    tr.append(el("th", undefined, k), el("td", undefined, v));
    tbody.appendChild(tr);
  }
  t.append(cap, thead, tbody);
  wrap.appendChild(t);
  return wrap;
}

export function cards(items: readonly { title: string; text: string; tag?: string }[]): HTMLElement {
  const grid = el("div", "pg-cards");
  for (const item of items) {
    const card = el("article", "pg-card");
    if (item.tag) card.appendChild(el("span", "pg-card__tag", item.tag));
    card.append(el("h3", "pg-card__title", item.title), el("p", "pg-card__text", item.text));
    grid.appendChild(card);
  }
  return grid;
}

export function toolbar(labels: readonly string[]): HTMLElement {
  const bar = el("div", "pg-toolbar");
  bar.setAttribute("aria-label", "Barra de herramientas de maqueta");
  for (const label of labels) bar.appendChild(mockButton(label));
  return bar;
}

export function emptyState(text: string): HTMLElement {
  const box = el("div", "pg-empty");
  box.setAttribute("role", "status");
  box.append(el("span", "pg-empty__icon", "□"), el("p", undefined, text));
  return box;
}

export function progress(label: string, value: number): HTMLElement {
  const row = el("div", "pg-progress");
  const head = el("div", "pg-progress__head");
  head.append(el("span", undefined, label), el("span", undefined, `${Math.round(value)}%`));
  const track = el("div", "pg-progress__track");
  const fill = el("div", "pg-progress__fill");
  fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
  track.appendChild(fill);
  row.append(head, track);
  return row;
}

export function code(text: string): HTMLElement {
  return el("code", "pg-code", text);
}

/** Lista lateral de módulos de un Studio; comparte estilo entre dominios. */
export function moduleRail(
  title: string,
  entries: readonly { label: string; route: string; active: boolean }[],
  navigate: Navigate,
): HTMLElement {
  const rail = el("nav", "pg-rail");
  rail.setAttribute("aria-label", title);
  rail.appendChild(el("h2", "pg-rail__title", title));
  const list = el("div", "pg-rail__list");
  for (const entry of entries) {
    const b = button(entry.label, () => navigate(entry.route), "pg-rail__item");
    if (entry.active) {
      b.classList.add("is-active");
      b.setAttribute("aria-current", "page");
    }
    list.appendChild(b);
  }
  rail.appendChild(list);
  return rail;
}

/** Extrae los titulares de la referencia Stitch para mostrarlos como taxonomía. */
export function referenceOutline(page: PageEntry): HTMLElement {
  const src = page.sources[0];
  const box = el("div", "pg-outline");
  box.appendChild(el("h3", "pg-outline__title", "Estructura de la referencia"));
  const headings = src?.headings ?? [];
  const buttons = src?.buttons ?? [];
  if (headings.length === 0 && buttons.length === 0) {
    box.appendChild(emptyState("La referencia Stitch no expone encabezados extraíbles."));
    return box;
  }
  if (headings.length) {
    box.appendChild(el("h4", "pg-outline__sub", "Secciones"));
    const ul = el("ul", "pg-outline__list");
    for (const h of headings.slice(0, 10)) ul.appendChild(el("li", undefined, h));
    box.appendChild(ul);
  }
  if (buttons.length) {
    box.appendChild(el("h4", "pg-outline__sub", "Controles"));
    const chips = el("div", "pg-outline__chips");
    for (const b of buttons.slice(0, 14)) chips.appendChild(el("span", "pg-outline__chip", b));
    box.appendChild(chips);
  }
  if (src) box.appendChild(el("p", "pg-outline__id", `Stitch ${src.id.slice(0, 8)} · ${src.resolution}`));
  return box;
}
