// OC-STITCH-08 — Lote 4 (Emulation Suite).
// Prototipo visual sobre DOM nativo y el contrato compartido. Sin emulación,
// transporte de Cable Link, streaming, sesiones ni datos reales de partida.

import "./emulation.css";

import {
  button,
  cards,
  code,
  el,
  emptyState,
  mockButton,
  moduleRail,
  pageFrame,
  progress,
  referenceOutline,
  section,
  table,
  toolbar,
} from "./contract.js";
import type { PageEntry } from "./catalog.js";
import type { Navigate } from "./contract.js";

type Source = PageEntry["sources"][number];

/** Aviso literal exigido para Battle Room y Trade Room. */
const LINK_DISCLAIMER =
  "No hay emulación, streaming, Cable Link, combates ni intercambios reales. Protocolo futuro: Cable Link emulado.";

/** 18 rutas del dominio `emulation`, agrupadas para el rail lateral. */
const RAIL_GROUPS: readonly {
  readonly title: string;
  readonly entries: readonly { readonly label: string; readonly route: string }[];
}[] = [
  {
    title: "Descubrimiento · explorador y flujos",
    entries: [
      { label: "01 · Room Explorer / Live Wall", route: "/emulation" },
      { label: "02 · Mapa de flujos 01–06", route: "/emulation/flows" },
      { label: "03 · Crear sala (9 pasos)", route: "/emulation/create" },
    ],
  },
  {
    title: "Salas 01–05",
    entries: [
      { label: "04 · Sala 01 · un jugador", route: "/emulation/rooms/01" },
      { label: "05 · Sala 02 · dos jugadores", route: "/emulation/rooms/02" },
      { label: "06 · Sala 03 · dual viewport", route: "/emulation/rooms/03" },
      { label: "07 · Sala 04 · espectador", route: "/emulation/rooms/04" },
      { label: "08 · Sala 05 · pantalla completa", route: "/emulation/rooms/05" },
    ],
  },
  {
    title: "Enlace · protocolo futuro",
    entries: [
      { label: "09 · Battle Room", route: "/emulation/battle" },
      { label: "10 · Trade Room", route: "/emulation/trade" },
    ],
  },
  {
    title: "Room Suite Studio · overview + 7 secciones",
    entries: [
      { label: "11 · Studio · overview", route: "/emulation/studio" },
      { label: "12 · Studio · room manager", route: "/emulation/studio/manager" },
      { label: "13 · Studio · live monitor", route: "/emulation/studio/monitor" },
      { label: "14 · Studio · link manager", route: "/emulation/studio/link" },
      { label: "15 · Studio · permisos", route: "/emulation/studio/permissions" },
      { label: "16 · Studio · session logs", route: "/emulation/studio/logs" },
      { label: "17 · Studio · analytics", route: "/emulation/studio/analytics" },
      { label: "18 · Studio · emulator adapters", route: "/emulation/studio/adapters" },
    ],
  },
];

/** Nueve pasos inertes del asistente; los textos salen del HTML real de Stitch. */
const CREATE_STEPS: readonly { readonly label: string; readonly detail: string }[] = [
  {
    label: "01 · Modalidad de sala",
    detail: "PG CREATE ROOM — ASISTENTE DE CONFIGURACIÓN V2.4. Selección visual; no crea ninguna sala.",
  },
  {
    label: "02 · Generación y formato",
    detail: "Gen I–II (GBC), Gen III (GBA), Gen IV (DS) y Gen V (DS-2). Solo etiquetas de referencia, sin ROM.",
  },
  {
    label: "03 · Adaptador",
    detail: "Paso 04: ADAPTADOR. Especificación futura aislada; no se carga ni se registra ningún adaptador.",
  },
  {
    label: "04 · ROM / SAV",
    detail: "IGNORAR (SRAM SOLO LECTURA). No se importan, leen, copian ni transmiten partidas.",
  },
  {
    label: "05 · Sincronización",
    detail: "APLICAR PARCHE DE SINCRONIZACIÓN. Acción inerte: no escribe buffers ni saves.",
  },
  {
    label: "06 · Participantes",
    detail: "Sin cuentas, identidades ni invitaciones. Los nombres del mockup no son datos de sesión.",
  },
  {
    label: "07 · Permisos",
    detail: "Matriz de permisos ilustrativa; no concede ni revoca acceso a nada.",
  },
  {
    label: "08 · Parámetros LINK",
    detail: "Cable Link emulado como protocolo futuro. No hay transporte, paquetes ni ACK reales.",
  },
  {
    label: "09 · Validación tri-estado",
    detail: "MATRIZ DE VALIDACIÓN TRI-ESTADO. Documento visual: no emite veredicto de legalidad.",
  },
];

/** Encabezados reales del mapa de flujos (no se ejecutan transiciones). */
const FLOW_LABELS = [
  "OBSERVAR PARTIDA",
  "CREAR BATALLA",
  "UNIRSE A BATALLA",
  "INTERCAMBIAR",
  "ADMINISTRAR SALA",
  "CONFIGURAR EMULADOR",
] as const;

const CONTROL_RE =
  /(CREAR|CONECTAR|UNIR|STREAM|TRANSMISI|SYNC|REINICIAR|SALIR|CONFIGURAR|VIEWPORT|AUDIO|APLICAR|GUARDAR|ABORTAR|LUCHAR|HUIR|LISTO|PAUSAR|PURGAR|EXPORTAR|FORZAR|DESCONECTAR|BUSCADOR|FILTROS|ACK)/i;
const PLAYER_RE = /(P1|P2|JUGADOR|TRAINER|ANFITRI|HUÉSPED|ESPECTADOR|CHASSIS|HW:)/i;

let wizardSeq = 0;

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function sourceOf(page: PageEntry): Source | undefined {
  return page.sources[0];
}

/** Headings y buttons literales de `page.sources[0]`, sin inventar contenido. */
function sourceStrip(page: PageEntry): HTMLElement {
  const src = sourceOf(page);
  const wrap = el("div", "pg-em-source");
  wrap.appendChild(
    el("h3", "pg-em-source__title", `Referencia Stitch · ${src ? decodeEntities(src.title) : "sin fuente"}`),
  );
  if (!src) {
    wrap.appendChild(emptyState("La entrada del catálogo no expone una pantalla Stitch asociada."));
    return wrap;
  }
  const headings = el("ul", "pg-em-source__list");
  for (const heading of src.headings) headings.appendChild(el("li", undefined, decodeEntities(heading)));
  wrap.appendChild(headings);
  const chips = el("div", "pg-em-source__chips");
  for (const label of src.buttons) chips.appendChild(el("span", "pg-em-source__chip", decodeEntities(label)));
  wrap.appendChild(chips);
  return wrap;
}

/** Controles tomados de la referencia; todos desactivados y etiquetados como INERTE. */
function realMockControls(page: PageEntry, limit = 8): HTMLElement {
  const labels = (sourceOf(page)?.buttons ?? [])
    .map(decodeEntities)
    .filter((label) => CONTROL_RE.test(label));
  const chosen = (labels.length ? labels : ["CONECTAR", "UNIRSE", "INICIAR STREAMING"]).slice(0, limit);
  const bar = toolbar(chosen.map((label) => `${label} · INERTE`));
  bar.classList.add("pg-em-toolbar");
  return bar;
}

/** LCD de referencia 160×144: nunca contiene una partida ni un sprite real. */
function viewport(label: string): HTMLElement {
  const wrap = el("div", "pg-em-viewport");
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", `${label}: pantalla LCD de referencia 160×144 sin señal real`);
  const screen = el("div", "pg-em-viewport__screen");
  screen.append(
    el("span", "pg-em-viewport__label", "LCD 160×144 · 10:9"),
    el("span", "pg-em-viewport__signal", "SIN SEÑAL"),
    el("span", "pg-em-viewport__note", label),
  );
  wrap.appendChild(screen);
  return wrap;
}

function connectionPanel(page: PageEntry): HTMLElement {
  const src = sourceOf(page);
  const box = el("div", "pg-em-connection");
  box.append(
    table("Estado de conexión (maqueta, sin datos de sesión)", [
      ["Enlace", "NO ACTIVO · prototipo UI"],
      ["Cable Link", "NO IMPLEMENTADO"],
      ["Streaming", "NO IMPLEMENTADO"],
      ["Sesión / jugadores", "SIN DATOS REALES"],
      ["Referencia Stitch", src ? `${src.id.slice(0, 8)} · ${src.resolution}` : "—"],
    ]),
    progress("Datos de sesión reales disponibles", 0),
    el("p", "pg-em-hint", "El 0 % es una etiqueta del prototipo, no una medición de red."),
  );
  return box;
}

function playerCards(page: PageEntry): HTMLElement {
  const labels = (sourceOf(page)?.buttons ?? []).map(decodeEntities).filter((label) => PLAYER_RE.test(label)).slice(0, 4);
  if (labels.length === 0) {
    return cards([
      { title: "JUGADOR 1 · MAQUETA", text: "Sin identidad, save ni datos de sesión.", tag: "SIN SESIÓN" },
      { title: "JUGADOR 2 · MAQUETA", text: "Sin identidad, save ni datos de sesión.", tag: "SIN SESIÓN" },
    ]);
  }
  return cards(
    labels.map((label, index) => ({
      title: label,
      text: "Texto impreso en la maqueta Stitch; no identifica a una persona ni a una partida.",
      tag: index === 0 ? "P1 · MAQUETA" : index === 1 ? "P2 · MAQUETA" : "REFERENCIA",
    })),
  );
}

function roomView(page: PageEntry): HTMLElement {
  const wrap = el("div", "pg-em-view pg-em-view--room");
  const grid = el("div", "pg-em-grid pg-em-grid--room");
  grid.append(
    section(
      "Panel de jugadores",
      "Participantes de maqueta. No hay sesión, cuentas ni identidades reales.",
      playerCards(page),
    ),
    section("Estado de conexión", "Estados representados visualmente; ninguno es una medición.", connectionPanel(page)),
    section("Viewport", "Panel de referencia 160×144; no se dibuja ninguna partida.", viewport("Sala de referencia")),
  );
  wrap.append(
    grid,
    section("Referencia de la sala", "Encabezados y controles literales de page.sources[0].", sourceStrip(page)),
    realMockControls(page),
  );
  return wrap;
}

function warningBox(): HTMLElement {
  const box = el("div", "pg-em-warning");
  box.setAttribute("role", "note");
  box.setAttribute("aria-label", "Aviso obligatorio: prototipo sin enlace real");
  box.dataset.pgEmDisclaimer = "1";
  box.append(
    el("strong", undefined, "AVISO OBLIGATORIO · PROTOTIPO VISUAL"),
    el("span", "pg-em-warning__text", LINK_DISCLAIMER),
  );
  return box;
}

function linkRoomView(page: PageEntry): HTMLElement {
  const isBattle = page.route === "/emulation/battle";
  const headings = (sourceOf(page)?.headings ?? []).map(decodeEntities);
  const panels = headings.length
    ? headings
    : [isBattle ? "TRAINER RED [SIMULADO]" : "PROTOCOLO [SIMULADO]"];
  const wrap = el("div", "pg-em-view pg-em-view--link");
  wrap.appendChild(warningBox());
  const grid = el("div", "pg-em-grid pg-em-grid--link");
  grid.append(
    section(
      isBattle ? "Entrenadores de maqueta" : "Motor de reglas de maqueta",
      "Etiquetas literales de la referencia Stitch. No se muestra ningún resultado.",
      cards(
        panels.map((label) => ({
          title: label,
          text: "Referencia visual: no se ejecuta ninguna acción ni se calcula un resultado.",
          tag: "SIMULADO",
        })),
      ),
      viewport(isBattle ? "Combate no simulado" : "Intercambio no simulado"),
    ),
    section(
      "Estado del enlace",
      "Sin transporte, sin sesión y sin intercambio.",
      connectionPanel(page),
      code("Protocolo futuro: Cable Link emulado · sin implementación"),
    ),
  );
  wrap.append(
    grid,
    section("Referencia del enlace", "Headings y botones reales del HTML de Stitch.", sourceStrip(page)),
    realMockControls(page, 6),
  );
  return wrap;
}

function explorerView(page: PageEntry): HTMLElement {
  const headings = (sourceOf(page)?.headings ?? []).map(decodeEntities);
  const rooms = headings.filter((heading) => /Torneo|Intercambio|Sala Abierta|Hoenn|Bóveda/i.test(heading)).slice(0, 6);
  const cells = rooms.length ? rooms : headings.slice(2, 8);
  const wrap = el("div", "pg-em-view pg-em-view--explorer");
  wrap.append(
    section(
      "Mural en vivo · 6 celdas de monitorización",
      "Celdas de referencia. Ninguna muestra una partida, un jugador ni una señal real.",
      cards(
        cells.length
          ? cells.map((label, index) => ({
              title: label,
              text: "Celda del mural Stitch. Sin streaming ni datos de sesión.",
              tag: `CELL ${String(index + 1).padStart(2, "0")} · SIN SEÑAL`,
            }))
          : [{ title: "Sin celdas extraíbles", text: "La referencia no expone títulos de sala.", tag: "MAQUETA" }],
      ),
    ),
    section("Filtros y acciones del mural", "Todos los controles están desactivados en el prototipo.", realMockControls(page)),
    section("Referencia del explorador", "Headings y botones reales del HTML de Stitch.", sourceStrip(page)),
  );
  return wrap;
}

function flowsView(page: PageEntry): HTMLElement {
  const wrap = el("div", "pg-em-view pg-em-view--flows");
  wrap.append(
    section(
      "Mapa maestro de flujos 01–06",
      "Documentación visual dentro de la app: no hay transiciones ni máquina de estados activa.",
      cards(
        FLOW_LABELS.map((label, index) => ({
          title: `${String(index + 1).padStart(2, "0")} · ${label}`,
          text: "Flujo documental de la referencia Stitch; no se dispara ningún evento.",
          tag: "SOLO LECTURA",
        })),
      ),
    ),
    section(
      "Matriz de estados (documental)",
      "Tabla de referencia: no representa el estado de una sesión real.",
      table(
        "Flujos del mapa maestro",
        FLOW_LABELS.map((label, index) => [`F${String(index + 1).padStart(2, "0")}`, `${label} · sin transición real`] as const),
      ),
    ),
    section("Referencia de flujos", "Headings y botones reales del HTML de Stitch.", sourceStrip(page)),
    realMockControls(page, 6),
  );
  return wrap;
}

function createWizard(page: PageEntry): HTMLElement {
  const seq = ++wizardSeq;
  let active = 0;
  const stepButtons: HTMLButtonElement[] = [];

  const wrap = el("div", "pg-em-view pg-em-view--wizard");
  wrap.appendChild(
    section(
      "Asistente de 9 pasos · maqueta",
      "Recorrido visual de navegación. Ningún paso guarda configuración ni crea una sala.",
    ),
  );

  const wizard = el("div", "pg-em-wizard");
  const steps = el("nav", "pg-em-wizard__steps");
  steps.setAttribute("aria-label", "Pasos del asistente (solo interfaz)");
  const panel = el("div", "pg-em-wizard__panel");
  panel.setAttribute("aria-live", "polite");

  const render = (): void => {
    stepButtons.forEach((buttonEl, index) => {
      const current = index === active;
      buttonEl.setAttribute("aria-pressed", String(current));
      if (current) {
        buttonEl.classList.add("is-current");
        buttonEl.setAttribute("aria-current", "step");
      } else {
        buttonEl.classList.remove("is-current");
        buttonEl.removeAttribute("aria-current");
      }
    });
    const step = CREATE_STEPS[active] ?? CREATE_STEPS[0];
    const title = el("h3", "pg-em-wizard__title", step.label);
    title.id = `pg-em-wizard-title-${seq}`;
    panel.replaceChildren(
      title,
      el("p", "pg-em-wizard__detail", step.detail),
      emptyState("Paso inerte: no escribe datos, no abre enlaces y no inicia emulación."),
    );
    panel.setAttribute("aria-labelledby", title.id);
  };

  const setStep = (index: number): void => {
    active = Math.max(0, Math.min(CREATE_STEPS.length - 1, index));
    render();
  };

  CREATE_STEPS.forEach((step, index) => {
    const stepButton = button(step.label, () => setStep(index), "pg-em-wizard__step-btn");
    stepButton.setAttribute("aria-label", `${step.label} — mostrar paso (maqueta)`);
    stepButtons.push(stepButton);
    steps.appendChild(stepButton);
  });

  const nav = el("div", "pg-em-wizard__nav");
  nav.append(
    button("◀ PASO ANTERIOR", () => setStep(active - 1)),
    button("PASO SIGUIENTE ▶", () => setStep(active + 1)),
    mockButton("CREAR SALA · INERTE", "Maqueta visual: no se crea ninguna sala."),
    mockButton("GUARDAR BORRADOR EN LOCAL · INERTE", "Maqueta visual: no se guarda ningún borrador."),
  );
  wizard.append(steps, panel, nav);
  wrap.appendChild(wizard);
  wrap.appendChild(
    section(
      "Referencia del asistente",
      "Controles y encabezados reales del HTML de Stitch.",
      sourceStrip(page),
      realMockControls(page, 5),
    ),
  );
  render();
  return wrap;
}

function studioView(page: PageEntry): HTMLElement {
  const src = sourceOf(page);
  const headings = (src?.headings ?? []).map(decodeEntities);
  const buttons = (src?.buttons ?? []).map(decodeEntities);
  const modules = buttons
    .filter((label) => /^(\d{2}\s|>\s?|OVERVIEW|ROOM|MONITOR|LINK|PERMISSION|LOG|ANALYTIC|ADAPTER)/i.test(label))
    .slice(0, 10);
  const moduleCards = modules.length
    ? modules.map((label, index) => ({
        title: label,
        text: "Módulo de referencia: no consulta ni modifica salas, enlaces ni telemetría.",
        tag: `M${String(index + 1).padStart(2, "0")}`,
      }))
    : [{ title: "Sin submódulos extraíbles", text: "La pantalla Stitch no expone entradas de rail.", tag: "MAQUETA" }];

  const wrap = el("div", "pg-em-view pg-em-view--studio");
  wrap.append(
    section(page.title, page.notes, cards(moduleCards), realMockControls(page, 6)),
    section(
      "Ficha de la pantalla",
      "Metadatos del mockup Stitch; no son datos de una sesión de emulación.",
      table("Referencia", [
        ["Fuente Stitch", src ? `${src.id.slice(0, 8)} · ${decodeEntities(src.title).slice(0, 52)}` : "—"],
        ["Clasificación", src?.classification ?? "—"],
        ["Resolución", src?.resolution ?? "—"],
        ["Estado del catálogo", page.state],
      ]),
      headings.length
        ? table(
            "Secciones del mockup",
            headings.map((heading, index) => [`H${String(index + 1).padStart(2, "0")}`, heading] as const),
          )
        : emptyState("Esta pantalla Stitch no expone encabezados extraíbles."),
    ),
    section("Referencia del estudio", "Headings y botones reales del HTML de Stitch.", sourceStrip(page)),
    el("p", "pg-em-note", "Analíticas, registros y monitores de esta suite son ilustrativos: no proceden de ejecución real."),
  );
  return wrap;
}

function viewFor(page: PageEntry): HTMLElement {
  const route = page.route;
  if (route === "/emulation") return explorerView(page);
  if (route === "/emulation/flows") return flowsView(page);
  if (route === "/emulation/create") return createWizard(page);
  if (route.startsWith("/emulation/rooms/")) return roomView(page);
  if (route === "/emulation/battle" || route === "/emulation/trade") return linkRoomView(page);
  if (route.startsWith("/emulation/studio")) return studioView(page);
  return emptyState("Ruta no reconocida dentro del catálogo de emulación.");
}

export function createEmulationWorkbench(page: PageEntry, navigate: Navigate): HTMLElement {
  const frame = pageFrame(page, navigate);
  frame.root.classList.add("pg-em-root");
  frame.root.dataset.pgEmRoute = page.route;
  frame.root.dataset.pgEmRouteCount = String(RAIL_GROUPS.reduce((total, group) => total + group.entries.length, 0));

  for (const group of RAIL_GROUPS) {
    frame.aside.appendChild(
      moduleRail(
        group.title,
        group.entries.map((entry) => ({ ...entry, active: entry.route === page.route })),
        navigate,
      ),
    );
  }
  frame.aside.appendChild(referenceOutline(page));
  frame.body.appendChild(viewFor(page));
  return frame.root;
}
