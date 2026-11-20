// OC-STITCH-08 — Lote 3: Marketing Studio (UI_PROTOTYPE).
// DOM nativo sobre contract.ts. Sin frameworks, CDN, backend ni APIs externas.
// Ninguna cifra, campaña, publicación o exportación de esta página es real.

import "./marketing.css";
import type { PageEntry } from "./catalog.js";
import { PAGES } from "./catalog.js";
import type { Navigate } from "./contract.js";
import {
  cards,
  code,
  el,
  emptyState,
  moduleRail,
  pageFrame,
  progress,
  referenceOutline,
  section,
  table,
  toolbar,
} from "./contract.js";

type Tile = { title: string; text: string; tag?: string };
type Gauge = { label: string; value: number };
type Row = readonly [string, string];
type ExtraKind =
  | "queue"
  | "palette"
  | "channels"
  | "triPanel"
  | "timeline"
  | "copy"
  | "week"
  | "disclaimer"
  | "manifest";

interface PanelSpec {
  readonly lead: string;
  readonly tiles: readonly Tile[];
  readonly caption: string;
  readonly rows: readonly Row[];
  readonly gauges: readonly Gauge[];
  readonly actions: readonly string[];
  readonly extras?: readonly ExtraKind[];
}

/** Etiquetas cortas de la rail: toman los nombres reales de los botones Stitch. */
const RAIL_LABEL: Readonly<Record<string, string>> = {
  "/studio/marketing": "OVERVIEW",
  "/studio/marketing/brand": "BRAND KIT",
  "/studio/marketing/social": "SOCIAL MEDIA",
  "/studio/marketing/creative": "CREATIVE CANVAS",
  "/studio/marketing/press": "PRESS KIT",
  "/studio/marketing/roadmap": "ROADMAP",
  "/studio/marketing/campaigns": "CAMPAIGNS",
  "/studio/marketing/copy": "AI COPY",
  "/studio/marketing/localization": "LOCALIZATION",
  "/studio/marketing/assets": "MEDIA LIBRARY",
  "/studio/marketing/calendar": "CONTENT CALENDAR",
  "/studio/marketing/community": "COMMUNITY HUB",
  "/studio/marketing/analytics": "ANALYTICS",
  "/studio/marketing/export": "EXPORT CENTER",
};

const EXTRA_TITLE: Readonly<Record<ExtraKind, string>> = {
  queue: "Cola de publicación",
  palette: "Paleta de ejemplo",
  channels: "Canales (inertes)",
  triPanel: "Editor tri-panel",
  timeline: "Hitos ilustrativos",
  copy: "Borradores de ejemplo",
  week: "Semana editorial",
  disclaimer: "Aviso sobre los datos",
  manifest: "Manifiesto de ejemplo",
};

const EXTRA_NOTE: Readonly<Record<ExtraKind, string>> = {
  queue: "No hay elementos programados: la maqueta no publica nada.",
  palette: "Muestras de color para la maqueta; no se aplican al tema real.",
  channels: "Nombres representativos; no hay cuentas conectadas.",
  triPanel: "Tres paneles dibujados; el lienzo no se guarda ni se exporta.",
  timeline: "Fechas y estados ficticios, dispuestos solo para mostrar la estructura.",
  copy: "Textos de muestra generados de forma local y determinista.",
  week: "Celdas y entradas ficticias; no hay calendario persistente.",
  disclaimer: "Las cifras siguientes son ilustrativas, no telemetría real.",
  manifest: "Documento de ejemplo: no se genera ningún archivo descargable.",
};

const OVERVIEW: PanelSpec = {
  lead:
    "Tablero de ejemplo: proyectos, cola de publicación y accesos rápidos. " +
    "Los proyectos son tarjetas ilustrativas; no existe ningún proyecto real.",
  tiles: [
    { title: "Lanzamiento oficial Pokeguarde 1999", text: "Borrador de maqueta sin fecha real.", tag: "EJEMPLO" },
    { title: "Social post — Gen II Daycare Reveal", text: "Borrador ilustrativo sin publicación.", tag: "EJEMPLO" },
    { title: "Boletín de actualizaciones #04", text: "Plantilla de ejemplo sin envío.", tag: "EJEMPLO" },
    { title: "Cronograma de campañas Q4", text: "Cronograma ficticio dibujado para la maqueta.", tag: "EJEMPLO" },
  ],
  caption: "Tablero de ejemplo (Overview)",
  rows: [
    ["Proyectos", "4 tarjetas ilustrativas"],
    ["Cola de publicación", "0 elementos reales"],
    ["Dominio", "marketing · 14 rutas"],
    ["Estado", "PROTOTIPO UI · SIN BACKEND"],
  ],
  gauges: [
    { label: "Avance visual del tablero (ejemplo)", value: 100 },
    { label: "Borradores (ilustrativo)", value: 35 },
    { label: "Publicaciones reales", value: 0 },
  ],
  actions: ["Nuevo proyecto", "Publicar ahora", "Generar informe", "Guardar borrador"],
  extras: ["queue"],
};

const PANELS: Readonly<Record<string, PanelSpec>> = {
  "/studio/marketing": OVERVIEW,

  "/studio/marketing/brand": {
    lead:
      "Bóveda de marca de ejemplo: logotipos, tokens y reglas de uso. " +
      "No se suben, guardan ni descargan archivos.",
    tiles: [
      { title: "Logo primario canónico", text: "Espacio reservado ilustrativo.", tag: "EJEMPLO" },
      { title: "Logotipo horizontal completo", text: "Espacio reservado ilustrativo.", tag: "EJEMPLO" },
      { title: "Emblema hardware / favicon", text: "Espacio reservado ilustrativo.", tag: "EJEMPLO" },
      { title: "Tipografía de marca", text: "Muestra tipográfica de ejemplo.", tag: "EJEMPLO" },
    ],
    caption: "Bóveda de marca (ejemplo)",
    rows: [
      ["Logotipos de ejemplo", "3"],
      ["Paleta de ejemplo", "5 muestras"],
      ["Uso autorizado", "Solo demostración visual"],
      ["Archivos reales", "0"],
    ],
    gauges: [
      { label: "Cobertura de tokens (ejemplo)", value: 80 },
      { label: "Bóveda verificada", value: 0 },
    ],
    actions: ["Subir logotipo", "Guardar paleta", "Aplicar a tema", "Descargar ZIP"],
    extras: ["palette"],
  },

  "/studio/marketing/social": {
    lead:
      "Redacción y programación simuladas: no hay publicaciones, cuentas conectadas ni envíos.",
    tiles: [
      { title: "Hilo Gen II (borrador)", text: "Texto de ejemplo sin publicar.", tag: "EJEMPLO" },
      { title: "Card social 1:1", text: "Composición ilustrativa sin subida.", tag: "EJEMPLO" },
      { title: "Anuncio de boletín", text: "Borrador de muestra sin envío.", tag: "EJEMPLO" },
    ],
    caption: "Cola social (ejemplo)",
    rows: [
      ["Borradores", "3 ilustrativos"],
      ["Cuentas conectadas", "0"],
      ["Publicaciones reales", "0"],
      ["Plataformas", "Solo maqueta"],
    ],
    gauges: [
      { label: "Borradores listos (ejemplo)", value: 60 },
      { label: "Publicado real", value: 0 },
    ],
    actions: ["Redactar publicación", "Programar", "Publicar ahora", "Adjuntar asset"],
    extras: ["channels", "queue"],
  },

  "/studio/marketing/creative": {
    lead:
      "Editor tri-panel ilustrativo: capas, lienzo y propiedades. " +
      "El lienzo mostrado no se guarda ni se exporta.",
    tiles: [
      { title: "Capa · fondo", text: "Bloque visual de ejemplo.", tag: "EJEMPLO" },
      { title: "Capa · titular", text: "Bloque visual de ejemplo.", tag: "EJEMPLO" },
      { title: "Capa · marcador", text: "Sin sprite de terceros.", tag: "MAQUETA" },
    ],
    caption: "Composición (ejemplo)",
    rows: [
      ["Lienzo", "160×144 · marcador"],
      ["Capas", "3 ilustrativas"],
      ["Exportaciones reales", "0"],
      ["Formato", "MAQUETA"],
    ],
    gauges: [
      { label: "Composición (ejemplo)", value: 45 },
      { label: "Alias resueltos (ejemplo)", value: 70 },
    ],
    actions: ["Nueva capa", "Exportar PNG", "Guardar plantilla", "Compartir vista"],
    extras: ["triPanel"],
  },

  "/studio/marketing/press": {
    lead:
      "Dossier de prensa de muestra: ficha técnica, boilerplates, Q&A y aviso legal. " +
      "Sin descargas reales.",
    tiles: [
      { title: "01 · Ficha técnica", text: "Factsheet ilustrativo.", tag: "EJEMPLO" },
      { title: "02 · Boilerplates", text: "Textos editoriales de ejemplo.", tag: "EJEMPLO" },
      { title: "03 · Q&A editorial", text: "Preguntas ficticias.", tag: "EJEMPLO" },
      { title: "04 · Aviso legal", text: "Cláusula de muestra, no asesoramiento.", tag: "EJEMPLO" },
    ],
    caption: "Dossier de prensa (ejemplo)",
    rows: [
      ["Secciones", "4 ilustrativas"],
      ["Assets listados", "3 de ejemplo"],
      ["Descargas reales", "0"],
      ["Estado", "MAQUETA"],
    ],
    gauges: [
      { label: "Dossier (ejemplo)", value: 90 },
      { label: "Licencias verificadas", value: 0 },
    ],
    actions: ["Descargar dossier", "Editar boilerplate", "Publicar nota", "Añadir asset"],
  },

  "/studio/marketing/roadmap": {
    lead:
      "Roadmap y comunicados de ejemplo: hitos ficticios, sin anuncios publicados.",
    tiles: [
      { title: "v2.45 · Johto Daycare", text: "Hito ilustrativo.", tag: "EJEMPLO" },
      { title: "v2.46 · DAM local", text: "Hito ilustrativo.", tag: "EJEMPLO" },
      { title: "v2.47 · i18n", text: "Hito ilustrativo.", tag: "EJEMPLO" },
    ],
    caption: "Roadmap (ejemplo)",
    rows: [
      ["Hitos", "3 ilustrativos"],
      ["Comunicados publicados", "0"],
      ["Fechas", "Ficticias"],
      ["Estado", "MAQUETA"],
    ],
    gauges: [
      { label: "Hito v2.45 (ejemplo)", value: 65 },
      { label: "Comunicados reales", value: 0 },
    ],
    actions: ["Nuevo hito", "Publicar comunicado", "Guardar borrador", "Archivar"],
    extras: ["timeline"],
  },

  "/studio/marketing/campaigns": {
    lead:
      "Campañas y boletines ilustrativos: no se envían correos ni se activan campañas.",
    tiles: [
      { title: "Lanzamiento v2.45 · Johto Daycare", text: "Campaña de ejemplo.", tag: "EJEMPLO" },
      { title: "Eclosión del huevo Manaphy", text: "Evento comunitario ilustrativo.", tag: "EJEMPLO" },
      { title: "Retro Archaeology #04", text: "Boletín de muestra.", tag: "EJEMPLO" },
      { title: "Dry-run SRAM Audit", text: "Campaña de muestra.", tag: "EJEMPLO" },
    ],
    caption: "Campañas (ejemplo)",
    rows: [
      ["Campañas", "4 ilustrativas"],
      ["Boletines enviados", "0"],
      ["Suscriptores reales", "0"],
      ["Estado", "MAQUETA"],
    ],
    gauges: [
      { label: "Redacción (ejemplo)", value: 75 },
      { label: "Envío real", value: 0 },
    ],
    actions: ["Crear campaña", "Enviar boletín", "Duplicar", "Guardar"],
    extras: ["queue"],
  },

  "/studio/marketing/copy": {
    lead:
      "Borradores deterministas y locales: sin LLM en bucle, sin llamadas externas y sin texto publicado.",
    tiles: [
      { title: "Tono archivo 1999", text: "Variante ilustrativa.", tag: "EJEMPLO" },
      { title: "Tono divulgativo", text: "Variante ilustrativa.", tag: "EJEMPLO" },
      { title: "Tono comunidad", text: "Variante ilustrativa.", tag: "EJEMPLO" },
    ],
    caption: "Redacción (ejemplo)",
    rows: [
      ["Borradores", "3 ilustrativos"],
      ["Modelos externos", "0"],
      ["Textos publicados", "0"],
      ["Modo", "LOCAL · MAQUETA"],
    ],
    gauges: [
      { label: "Borrador (ejemplo)", value: 50 },
      { label: "Revisión humana (ejemplo)", value: 20 },
    ],
    actions: ["Generar borrador", "Aplicar tono", "Copiar texto", "Guardar"],
    extras: ["copy"],
  },

  "/studio/marketing/localization": {
    lead:
      "Glosario protegido de ejemplo: términos canónicos ES/EN. " +
      "No se aplica a la interfaz ni se guarda.",
    tiles: [
      { title: "Español (base)", text: "Idioma de referencia ilustrativo.", tag: "EJEMPLO" },
      { title: "English (fallback)", text: "Retorno de ejemplo.", tag: "EJEMPLO" },
      { title: "Glosario PG", text: "Términos de muestra.", tag: "EJEMPLO" },
    ],
    caption: "Glosario (ejemplo)",
    rows: [
      ["Términos", "12 ilustrativos"],
      ["Idiomas", "2 de ejemplo"],
      ["Cambios aplicados", "0"],
      ["Estado", "MAQUETA"],
    ],
    gauges: [
      { label: "Glosario revisado (ejemplo)", value: 40 },
      { label: "Traducciones aplicadas", value: 0 },
    ],
    actions: ["Añadir término", "Exportar glosario", "Aplicar fallback", "Marcar revisado"],
  },

  "/studio/marketing/assets": {
    lead:
      "Biblioteca de recursos ilustrativa: fichas de ejemplo sin subidas ni almacenamiento real.",
    tiles: [
      { title: "Pokeguarde Shell Master", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Banner campaña 16:9", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Habitación Guardería GBC", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Chikorita Overworld Sheet", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Manaphy Overworld Sheet", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Social Card 1:1", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Boletín Header 16:9", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Electrodo Overworld Tier 40", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
    ],
    caption: "Media Library (ejemplo)",
    rows: [
      ["Activos", "8 fichas ilustrativas"],
      ["Archivos subidos", "0"],
      ["Etiquetas", "4 de ejemplo"],
      ["Estado", "DAM MAQUETA"],
    ],
    gauges: [
      { label: "Metadatos (ejemplo)", value: 55 },
      { label: "Archivos reales", value: 0 },
    ],
    actions: ["Subir archivo", "Nueva carpeta", "Descargar original", "Sincronizar DAM"],
  },

  "/studio/marketing/calendar": {
    lead:
      "Calendario editorial de ejemplo: celdas y entradas ficticias, sin programación real.",
    tiles: [
      { title: "Semana 01", text: "Bloques ilustrativos.", tag: "EJEMPLO" },
      { title: "Semana 02", text: "Bloques ilustrativos.", tag: "EJEMPLO" },
      { title: "Semana 03", text: "Bloques ilustrativos.", tag: "EJEMPLO" },
    ],
    caption: "Calendario (ejemplo)",
    rows: [
      ["Entradas", "5 ilustrativas"],
      ["Publicadas", "0"],
      ["Semana activa", "Ficticia"],
      ["Estado", "MAQUETA"],
    ],
    gauges: [
      { label: "Celdas con contenido (ejemplo)", value: 30 },
      { label: "Publicaciones reales", value: 0 },
    ],
    actions: ["Nueva entrada", "Mover a publicada", "Exportar .ics", "Guardar"],
    extras: ["week"],
  },

  "/studio/marketing/community": {
    lead:
      "Centro de comunidad de muestra: anuncios y enlaces inertes. " +
      "No se conecta a Discord ni se publica mensaje alguno.",
    tiles: [
      { title: "Community Hub & Discord Resource Center", text: "Panel ilustrativo.", tag: "EJEMPLO" },
      { title: "Torneo de crianza Johto", text: "Anuncio de muestra.", tag: "EJEMPLO" },
      { title: "Guardería Johto v2.45 disponible", text: "Anuncio de muestra.", tag: "EJEMPLO" },
    ],
    caption: "Comunidad (ejemplo)",
    rows: [
      ["Anuncios", "2 ilustrativos"],
      ["Enlaces externos", "0 · inertes"],
      ["Mensajes enviados", "0"],
      ["Estado", "MAQUETA"],
    ],
    gauges: [
      { label: "Recursos (ejemplo)", value: 60 },
      { label: "Actividad real", value: 0 },
    ],
    actions: ["Redactar anuncio", "Copiar enlace", "Publicar en Discord", "Archivar"],
  },

  "/studio/marketing/analytics": {
    lead:
      "VALORES ILUSTRATIVOS: cifras, tendencias y embudos dibujados para la maqueta. " +
      "No son telemetría real de Pokeguarde ni datos de ningún usuario.",
    tiles: [
      { title: "Tráfico (ejemplo)", text: "1.200 visitas ilustrativas.", tag: "ILUSTRATIVO" },
      { title: "Adopción (ejemplo)", text: "48 adoptiones ilustrativas.", tag: "ILUSTRATIVO" },
      { title: "Auditoría (ejemplo)", text: "12 eventos ilustrativos.", tag: "ILUSTRATIVO" },
    ],
    caption: "Valores ilustrativos — no son métricas reales",
    rows: [
      ["Visitas", "1.200 · ejemplo"],
      ["Adopciones", "48 · ejemplo"],
      ["Embudo", "4 pasos ilustrativos"],
      ["Datos reales", "NINGUNO"],
    ],
    gauges: [
      { label: "Tráfico (ilustrativo)", value: 68 },
      { label: "Embudo (ilustrativo)", value: 42 },
      { label: "Adopción (ilustrativa)", value: 25 },
      { label: "Privacidad (ilustrativo)", value: 100 },
    ],
    actions: ["Exportar CSV", "Actualizar (maqueta)", "Configurar embudo", "Compartir informe"],
    extras: ["disclaimer"],
  },

  "/studio/marketing/export": {
    lead:
      "Empaquetado de muestra: bundles y manifiesto ilustrativos. " +
      "No se generan descargas, archivos ni firmas reales.",
    tiles: [
      { title: "Social Media Launch Pack", text: "Bundle ilustrativo, sin archivos.", tag: "EJEMPLO" },
      { title: "Press Kit & Media Outlets", text: "Bundle ilustrativo, sin archivos.", tag: "EJEMPLO" },
      { title: "Brand & Asset Vault", text: "Bundle ilustrativo, sin archivos.", tag: "EJEMPLO" },
      { title: "Community & Discord", text: "Bundle ilustrativo, sin archivos.", tag: "EJEMPLO" },
    ],
    caption: "Export Center (ejemplo)",
    rows: [
      ["Bundles", "4 ilustrativos"],
      ["Descargas reales", "0"],
      ["Manifiesto", "EJEMPLO"],
      ["Estado", "MAQUETA"],
    ],
    gauges: [
      { label: "Paquetes listos (ejemplo)", value: 80 },
      { label: "Firma real", value: 0 },
    ],
    actions: ["Empaquetar", "Descargar ZIP", "Generar manifiesto", "Firmar paquete"],
    extras: ["manifest"],
  },
};

function banner(): HTMLElement {
  const box = el("div", "pg-mk-banner");
  box.setAttribute("role", "note");
  box.setAttribute("aria-label", "Aviso de maqueta");
  box.append(
    el("span", "pg-mk-badge", "MAQUETA"),
    el(
      "p",
      "pg-mk-banner__text",
      "Marketing Studio de demostración: no publica, envía, sube ni exporta nada. " +
        "Proyectos, campañas, publicaciones y cifras son ejemplos ilustrativos.",
    ),
  );
  return box;
}

function renderExtra(kind: ExtraKind): HTMLElement {
  const box = el("div", `pg-mk-${kind}`);

  switch (kind) {
    case "palette": {
      const swatches: readonly (readonly [string, string])[] = [
        ["#ff5a5f", "Rojo"],
        ["#4fc3f7", "Azul"],
        ["#ffc857", "Ámbar"],
        ["#6ee7a8", "Verde"],
        ["#0c1626", "Fondo"],
      ];
      for (const [hex, name] of swatches) {
        const item = el("div", "pg-mk-swatch");
        const chip = el("span", "pg-mk-swatch__chip");
        chip.style.backgroundColor = hex;
        chip.setAttribute("aria-hidden", "true");
        item.append(chip, el("span", "pg-mk-swatch__label", `${name} · ${hex} (ejemplo)`));
        box.appendChild(item);
      }
      break;
    }
    case "channels": {
      const chips = el("div", "pg-mk-chips");
      for (const label of ["DISCORD (inerte)", "BOLETÍN (inerte)", "SOCIAL (inerte)"]) {
        chips.appendChild(el("span", "pg-mk-chip", label));
      }
      box.appendChild(chips);
      break;
    }
    case "triPanel": {
      const columns: readonly (readonly [string, string])[] = [
        ["CAPAS (EJEMPLO)", "Fondo / Titular / Marcador"],
        ["LIENZO (EJEMPLO)", "160×144 · sin guardar"],
        ["PROPIEDADES (EJEMPLO)", "Opacidad ilustrativa"],
      ];
      for (const [title, body] of columns) {
        const col = el("div", "pg-mk-col");
        col.append(el("h3", "pg-mk-col__title", title), code(body));
        box.appendChild(col);
      }
      break;
    }
    case "timeline": {
      const steps = [
        "v2.44 · revisado (ejemplo)",
        "v2.45 · en maqueta",
        "v2.46 · planificado",
        "v2.47 · idea",
      ];
      for (const [index, label] of steps.entries()) {
        const item = el("div", "pg-mk-step");
        item.append(
          el("span", "pg-mk-step__n", String(index + 1).padStart(2, "0")),
          el("span", undefined, label),
        );
        box.appendChild(item);
      }
      break;
    }
    case "copy": {
      box.append(
        code("EJEMPLO A · Guarda, cría y entrena tus Pokémon clásicos."),
        code("EJEMPLO B · Una guardería portátil para las generaciones I a V."),
      );
      break;
    }
    case "week": {
      const days = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
      for (const [index, day] of days.entries()) {
        const cell = el("div", "pg-mk-day");
        cell.append(
          el("span", "pg-mk-day__name", day),
          el("span", "pg-mk-day__slot", index < 2 ? "Ejemplo" : "—"),
        );
        box.appendChild(cell);
      }
      break;
    }
    case "disclaimer": {
      box.setAttribute("role", "note");
      box.appendChild(
        el(
          "p",
          "pg-mk-disclaimer",
          "VALORES ILUSTRATIVOS: las cifras de esta pantalla son ejemplos visuales. " +
            "No representan visitas, usuarios, adopciones ni ninguna medición real.",
        ),
      );
      break;
    }
    case "manifest": {
      box.appendChild(
        code('{\n  "bundle": "MAQUETA",\n  "files": [],\n  "download": false\n}'),
      );
      break;
    }
    case "queue": {
      box.appendChild(
        emptyState("Cola vacía: la maqueta no tiene publicaciones programadas reales."),
      );
      break;
    }
  }
  return box;
}

function renderPanel(spec: PanelSpec): HTMLElement {
  const wrap = el("div", "pg-mk-panel");
  const split = el("div", "pg-mk-split");
  const main = el("div", "pg-mk-split__main");
  const side = el("div", "pg-mk-split__side");

  main.appendChild(section("Vista previa", spec.lead, cards(spec.tiles)));
  for (const kind of spec.extras ?? []) {
    main.appendChild(section(`Detalle · ${EXTRA_TITLE[kind]}`, EXTRA_NOTE[kind], renderExtra(kind)));
  }

  const gauges = el("div", "pg-mk-gauges");
  for (const gauge of spec.gauges) gauges.appendChild(progress(gauge.label, gauge.value));
  side.appendChild(
    section("Indicadores ilustrativos", "Barras de ejemplo: no miden actividad real.", gauges),
  );
  side.appendChild(
    section("Estructura de ejemplo", "Filas ficticias dibujadas para la maqueta.", table(spec.caption, spec.rows)),
  );
  side.appendChild(
    section(
      "Acciones de maqueta",
      "Todos los controles están desactivados a propósito: no ejecutan acciones.",
      toolbar(spec.actions),
    ),
  );

  split.append(main, side);
  wrap.appendChild(split);
  return wrap;
}

/**
 * Construye el Marketing Studio de la ruta indicada.
 * Las 14 rutas `marketing` del catálogo comparten rail y marco; el panel cambia por módulo.
 */
export function createMarketingWorkbench(page: PageEntry, navigate: Navigate): HTMLElement {
  const frame = pageFrame(page, navigate);

  const rail = PAGES.filter((candidate) => candidate.domain === "marketing").map((candidate) => ({
    label: RAIL_LABEL[candidate.route] ?? candidate.title,
    route: candidate.route,
    active: candidate.route === page.route,
  }));

  frame.aside.append(moduleRail("Marketing Studio", rail, navigate), referenceOutline(page));

  const spec = PANELS[page.route] ?? OVERVIEW;
  frame.body.append(banner(), renderPanel(spec));

  return frame.root;
}
