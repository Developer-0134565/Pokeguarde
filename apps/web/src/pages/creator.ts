import "./creator.css";
import type { PageEntry } from "./catalog.js";
import type { Navigate } from "./contract.js";
import { PAGES } from "./catalog.js";
import {
  cards,
  code,
  el,
  emptyState,
  mockButton,
  moduleRail,
  pageFrame,
  referenceOutline,
  section,
  table,
  toolbar,
} from "./contract.js";

// OC-STITCH-08 — Lote 2 (Creator Suite).
// Tres workspaces reconstruidos con DOM nativo y las primitivas de contract.ts.
// Todo es UI_PROTOTYPE: no hay backend, persistencia, exportación ni analítica.

function styled<T extends HTMLElement>(node: T, className: string): T {
  node.classList.add(className);
  return node;
}

/** Decodifica entidades del HTML de Stitch sin insertar HTML. */
function plain(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function flag(): HTMLElement {
  const box = el("div", "pg-cr-flag");
  box.append(
    el("span", "pg-cr-flag__tag", "MAQUETA"),
    el(
      "span",
      "pg-cr-flag__text",
      "Interfaz de referencia: sin backend, sin datos de usuario y sin acciones reales.",
    ),
  );
  return box;
}

function note(text: string): HTMLElement {
  return el("p", "pg-cr-note", text);
}

/** Contenido real extraído de page.sources[0], presentado solo como lectura. */
function referencePanel(page: PageEntry): HTMLElement {
  const box = el("div", "pg-cr-ref");
  const src = page.sources[0];
  const headings = (src?.headings ?? []).map(plain).filter(Boolean).slice(0, 10);
  const controls = (src?.buttons ?? []).map(plain).filter(Boolean).slice(0, 14);

  box.appendChild(el("h3", "pg-cr-ref__title", "Contenido real extraído de la referencia"));
  if (headings.length === 0 && controls.length === 0) {
    const empty = el("div", "pg-cr-ref-empty");
    empty.appendChild(emptyState("La referencia Stitch no expone encabezados ni controles extraíbles."));
    box.appendChild(empty);
    return box;
  }
  if (headings.length) {
    box.appendChild(el("h4", "pg-cr-ref__sub", "Secciones"));
    const list = el("ul", "pg-cr-ref__list");
    for (const heading of headings) list.appendChild(el("li", undefined, heading));
    box.appendChild(list);
  }
  if (controls.length) {
    box.appendChild(el("h4", "pg-cr-ref__sub", "Controles de la referencia (solo lectura)"));
    const chips = el("div", "pg-cr-chips");
    for (const control of controls) chips.appendChild(el("span", "pg-cr-chip", control));
    box.appendChild(chips);
  }
  box.appendChild(
    note("Etiquetas tomadas del HTML de Stitch. No son botones de esta app y no ejecutan nada."),
  );
  return box;
}

function asMock(b: HTMLButtonElement): HTMLButtonElement {
  b.classList.add("pg-cr-mock");
  return b;
}

function mock(label: string, why: string): HTMLButtonElement {
  return asMock(mockButton(`${label} (MAQUETA)`, why));
}

function actionRow(items: readonly { label: string; why: string }[]): HTMLElement {
  const row = el("div", "pg-cr-actions");
  for (const item of items) row.appendChild(mock(item.label, item.why));
  return row;
}

/** Barra inerte: reutiliza toolbar() y refuerza el etiquetado MAQUETA. */
function inertToolbar(labels: readonly string[]): HTMLElement {
  const bar = styled(toolbar(labels.map((label) => `${label} · MAQUETA`)), "pg-cr-toolbar");
  bar.setAttribute(
    "aria-label",
    "Barra de herramientas de maqueta: ninguna acción está implementada",
  );
  for (const b of bar.querySelectorAll("button")) asMock(b);
  return bar;
}

/** Controles de navegación reales de la referencia, convertidos en maquetas inertes. */
function referenceToolbar(page: PageEntry): HTMLElement {
  const pattern =
    /OVERVIEW|COLORS|TYPOGRAPHY|SPACING|COMPONENT|LAYOUT|PREVIEW|TOKEN|DESIGN|EXPORT|PRESET|HABITAT|COMPILE|TEST RUN|GUARDAR|VALIDAR|IMPORT/i;
  const labels = (page.sources[0]?.buttons ?? [])
    .map(plain)
    .filter((label) => pattern.test(label))
    .slice(0, 8);
  return inertToolbar(labels.length ? labels : ["CONTROLES DE REFERENCIA"]);
}

function railFor(page: PageEntry, navigate: Navigate, title: string): HTMLElement {
  const entries = PAGES.filter((candidate) => candidate.domain === page.domain).map((candidate) => ({
    label: candidate.title,
    route: candidate.route,
    active: candidate.route === page.route,
  }));
  const rail = styled(moduleRail(title, entries, navigate), "pg-cr-rail");
  for (const b of rail.querySelectorAll("button")) b.classList.add("pg-cr-rail-item");
  return rail;
}

function moduleCards(page: PageEntry): HTMLElement {
  const items = PAGES.filter((candidate) => candidate.domain === page.domain).map((candidate) => ({
    title: candidate.title,
    text: candidate.notes,
    tag: "MAQUETA",
  }));
  return styled(cards(items), "pg-cr-cards");
}

/** Galería de temas: nombres reales del catálogo, muestras dibujadas sin assets externos. */
function themeGallery(): HTMLElement {
  const gallery = PAGES.find((candidate) => candidate.route === "/studio/theme");
  const names = (gallery?.sources[0]?.headings ?? [])
    .map(plain)
    .filter((heading) => heading === heading.toUpperCase() && !/THEME STUDIO|PREDEFINED/i.test(heading))
    .slice(0, 5);

  const box = el("div", "pg-cr-swatches");
  if (names.length === 0) {
    box.appendChild(emptyState("La galería de temas no expone nombres extraíbles."));
    return box;
  }
  names.forEach((name, index) => {
    const tile = el("div", `pg-cr-swatch pg-cr-swatch--${(index % 5) + 1}`);
    tile.setAttribute("role", "img");
    tile.setAttribute("aria-label", `Muestra visual de maqueta: ${name}`);
    tile.append(el("span", "pg-cr-swatch__name", name), el("span", "pg-cr-swatch__hint", "MAQUETA"));
    box.appendChild(tile);
  });
  return box;
}

function themeTokens(page: PageEntry): HTMLElement {
  const rows: readonly (readonly [string, string])[] = [
    ["Superficie", "--pg-cr-surface · panel de maqueta, no persistido"],
    ["Acento", "--pg-cr-accent · rojo de carcasa / azul de LCD (referencia visual)"],
    ["Texto", "--pg-cr-ink · alto contraste sobre panel oscuro"],
    ["Tipografía", "Monoespacio técnica · escala de encabezados de la referencia"],
    ["Densidad", "Panel compacto · rejilla de módulos"],
    ["Estado", `${page.state} · sin escritura en DESIGN.md`],
  ];
  return styled(
    table("Tokens visuales de la maqueta (solo referencia, no se guardan)", rows),
    "pg-cr-table",
  );
}

function themeWorkbench(page: PageEntry, navigate: Navigate): HTMLElement {
  const frame = pageFrame(page, navigate);
  frame.aside.append(
    styled(referenceOutline(page), "pg-cr-outline"),
    railFor(page, navigate, "Módulos Theme Studio (10 rutas)"),
  );

  const work = el("div", "pg-cr-workbench");
  work.append(
    flag(),
    styled(
      section(
        "Panel de trabajo · Theme Studio",
        "Reconstrucción de la referencia: encabezados y controles extraídos del catálogo de Stitch.",
        referencePanel(page),
        referenceToolbar(page),
      ),
      "pg-cr-sec",
    ),
    styled(section("Galería de temas (maqueta)", themeGallery()), "pg-cr-sec"),
    styled(section("Módulos del Studio", moduleCards(page)), "pg-cr-sec"),
    styled(
      section(
        "Tokens visuales",
        themeTokens(page),
        code("pg-cr-* · prefijo reservado; sin escritura en DESIGN.md"),
        note("No se escribe DESIGN.md ni se persisten valores."),
      ),
      "pg-cr-sec",
    ),
  );
  frame.body.appendChild(work);
  return frame.root;
}

/** Carcasa dibujada: role=img y sin controles interactivos. */
function shellView(): HTMLElement {
  const wrap = el("div", "pg-cr-shell");
  wrap.setAttribute(
    "role",
    "img",
  );
  wrap.setAttribute(
    "aria-label",
    "Maqueta de carcasa roja y blanca con pantalla LCD y tres teclas dibujadas, no interactivas.",
  );

  const frame = el("div", "pg-cr-shell__frame");
  const lcd = el("div", "pg-cr-shell__lcd");
  lcd.append(el("span", undefined, "LCD 160×144"), el("span", "pg-cr-shell__lcd-sub", "REFERENCIA"));
  const keys = el("div", "pg-cr-shell__keys");
  keys.append(
    el("span", "pg-cr-shell__key", "A"),
    el("span", "pg-cr-shell__key", "B"),
    el("span", "pg-cr-shell__key", "C"),
  );
  frame.append(lcd, keys);
  wrap.append(
    frame,
    el("p", "pg-cr-shell__caption", "Vista de carcasa reconstruida. Sin exportación ni archivos generados."),
  );
  return wrap;
}

function shellExport(): HTMLElement {
  const box = el("div", "pg-cr-export");
  box.appendChild(
    styled(
      table("Export Center · artefactos de maqueta (no se generan archivos)", [
        ["Máscara WebP", "Solo referencia visual; sin archivo"],
        ["SHELL-MANIFEST.JSON", "Solo referencia textual; sin descarga"],
        ["Validación", "No se ejecuta; sin análisis de assets"],
        ["Estado", "UI_PROTOTYPE · sin backend"],
      ]),
      "pg-cr-table",
    ),
  );
  box.appendChild(
    actionRow([
      { label: "EXPORTAR MÁSCARA WEBP", why: "Maqueta visual: no genera ni descarga archivos." },
      { label: "GENERAR MANIFIESTO JSON", why: "Maqueta visual: no escribe ficheros." },
      { label: "COMPILAR PAQUETE", why: "Maqueta visual: no compila ni publica." },
    ]),
  );
  box.appendChild(note("Ningún botón de esta sección guarda, exporta ni publica contenido."));
  return box;
}

function shellWorkbench(page: PageEntry, navigate: Navigate): HTMLElement {
  const frame = pageFrame(page, navigate);
  frame.aside.append(
    styled(referenceOutline(page), "pg-cr-outline"),
    railFor(page, navigate, "Módulos Shell Studio (3 rutas)"),
  );

  const work = el("div", "pg-cr-workbench");
  work.append(
    flag(),
    styled(
      section(
        "Panel de trabajo · Shell Studio",
        "Editor tri-panel reconstruido a partir de la referencia; sin edición persistente.",
        referencePanel(page),
        referenceToolbar(page),
      ),
      "pg-cr-sec",
    ),
    styled(section("Vista de carcasa (maqueta)", shellView()), "pg-cr-sec"),
    styled(section("Export center inerte", shellExport()), "pg-cr-sec"),
  );
  frame.body.appendChild(work);
  return frame.root;
}

/** Presets: nombres reales extraídos de la ruta de biblioteca del catálogo. */
function presetLibrary(): HTMLElement {
  const library = PAGES.find((candidate) => candidate.route === "/studio/habitat/library");
  const names = (library?.sources[0]?.headings ?? [])
    .map(plain)
    .filter((heading) => !/HABITAT LIBRARY|CREATE NEW HABITAT/i.test(heading));

  const box = el("div", "pg-cr-presets");
  if (names.length === 0) {
    box.appendChild(emptyState("La biblioteca no expone presets extraíbles."));
  } else {
    box.appendChild(
      styled(
        cards(
          names.map((name) => ({
            title: name,
            text: "Preset de referencia visual. No se aplica al Canvas ni se guarda.",
            tag: "PRESET · MAQUETA",
          })),
        ),
        "pg-cr-cards",
      ),
    );
  }
  box.appendChild(
    actionRow([
      { label: "IMPORT HABITAT", why: "Maqueta visual: no importa ni guarda hábitats." },
      { label: "NEW HABITAT", why: "Maqueta visual: no crea hábitats." },
    ]),
  );
  return box;
}

function habitatEditor(): HTMLElement {
  const box = el("div", "pg-cr-editor");
  const lcd = el("div", "pg-cr-lcd");
  lcd.setAttribute("role", "img");
  lcd.setAttribute(
    "aria-label",
    "Maqueta de pantalla 160 por 144: rejilla de referencia, sin Canvas real ni fondo modificado.",
  );
  lcd.append(
    el("span", "pg-cr-lcd__tag", "160×144"),
    el("span", "pg-cr-lcd__grid"),
    el("span", "pg-cr-lcd__msg", "SIN CANVAS · SOLO REFERENCIA"),
  );

  const guard = el("p", "pg-cr-guard");
  guard.append(
    el("strong", undefined, "Protección: "),
    document.createTextNode("no se crea ni altera el Canvas 160×144, ni el fondo versionado "),
    el("code", "pg-cr-code", "/assets/room/guarderia.png"),
    document.createTextNode("."),
  );
  box.append(lcd, guard);
  return box;
}

function habitatWorkbench(page: PageEntry, navigate: Navigate): HTMLElement {
  const frame = pageFrame(page, navigate);
  frame.aside.append(
    styled(referenceOutline(page), "pg-cr-outline"),
    railFor(page, navigate, "Módulos Habitat Studio (3 rutas)"),
  );

  const work = el("div", "pg-cr-workbench");
  work.append(
    flag(),
    styled(
      section(
        "Panel de trabajo · Habitat Studio",
        "Workspace reconstruido: presets y editor en modo maqueta.",
        referencePanel(page),
        referenceToolbar(page),
      ),
      "pg-cr-sec",
    ),
    styled(section("Biblioteca de presets", presetLibrary()), "pg-cr-sec"),
    styled(section("Editor de hábitat (maqueta)", habitatEditor()), "pg-cr-sec"),
  );
  frame.body.appendChild(work);
  return frame.root;
}

function unsupportedWorkbench(page: PageEntry, navigate: Navigate): HTMLElement {
  const frame = pageFrame(page, navigate);
  frame.aside.appendChild(styled(referenceOutline(page), "pg-cr-outline"));
  const work = el("div", "pg-cr-workbench");
  work.append(
    flag(),
    styled(
      section(
        "Dominio fuera de Creator Suite",
        "Esta vista se gestiona en otro módulo de la app.",
        emptyState(`El dominio ${page.domain} no tiene workspace en Creator Suite.`),
      ),
      "pg-cr-sec",
    ),
  );
  frame.body.appendChild(work);
  return frame.root;
}

export function createCreatorWorkbench(page: PageEntry, navigate: Navigate): HTMLElement {
  switch (page.domain) {
    case "theme":
      return themeWorkbench(page, navigate);
    case "creator_shell":
      return shellWorkbench(page, navigate);
    case "habitat":
      return habitatWorkbench(page, navigate);
    default:
      return unsupportedWorkbench(page, navigate);
  }
}
