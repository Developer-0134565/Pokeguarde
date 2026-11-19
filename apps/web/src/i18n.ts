// Internacionalización de la interfaz. Módulo **puro** (sin DOM): lo comparten
// el motor de la Guardería, el navegador y el servidor, así que las mismas
// cadenas se resuelven igual en los tres sitios.
//
// Uso:
//   t("nav.nursery")                 // texto simple
//   t("mon.level", { n: 25 })        // con parámetros {n}
//
// Añadir un idioma: incluye su código en `LOCALES` y su diccionario en `DICTS`.
// Las claves que falten caen al idioma por defecto (`es`) y, si tampoco existen
// allí, se devuelve la propia clave: la interfaz nunca se rompe por una cadena
// que falte.

export type Locale = "es" | "en";

export const LOCALES: readonly Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";

type Dict = Record<string, string>;

/* ------------------------------------------------------------------ */
/* Diccionario español (idioma por defecto y completo)                */
/* ------------------------------------------------------------------ */

const ES: Dict = {
  // Armazón y navegación
  "app.title": "Pokeguarde · Biblioteca de partidas",
  "app.brand": "Pokeguarde",
  "app.tagline": "Biblioteca de partidas",
  "nav.library": "Biblioteca",
  "nav.nursery": "Guardería",
  "nav.back": "Volver a la biblioteca",
  "health.checking": "comprobando…",
  "health.down": "servidor sin respuesta",
  "dialog.close": "Cerrar",

  // Biblioteca
  "saves.heading": "Partidas",
  "saves.refresh": "Recargar",
  "saves.empty": "Todavía no hay partidas importadas.",
  "saves.error": "Error: {msg}",
  "drop.title": "Arrastra un save",
  "drop.hint": ".srm · .sav · .dsv (32 KB – 512 KB)",
  "drop.pick": "o elige un archivo",
  "detail.placeholder": "Selecciona una partida para ver el inventario.",
  "save.reading": "Leyendo partida…",
  "save.roundtrip.ok": "ida y vuelta idéntica",
  "save.roundtrip.bad": "no escribible / sin verificar",
  "save.importing": "Importando {name}…",
  "save.imported": "Partida importada.",
  "save.duplicate": "Esa partida ya estaba importada.",

  // Detalle de partida
  "detail.trainer": "Entrenador",
  "detail.id": "ID",
  "detail.money": "Dinero",
  "detail.time": "Tiempo",
  "detail.badges": "Medallas",
  "detail.dex": "Pokédex",
  "detail.pokemon": "Pokémon",
  "detail.legality": "Legalidad",
  "dex.seen": "{n} vistos",
  "dex.caught": "{n} capturados",
  "dex.unavailable": "no disponible",
  "detail.partyCount": "{n} equipo",
  "detail.totalCount": "{n} total",
  "detail.legalityCounts": "{legal} legales · {unverified} no verificables · {illegal} ilegales",

  // Pestañas
  "tab.party": "Equipo",
  "tab.boxes": "Cajas",
  "tab.bag": "Mochila",
  "tab.legality": "Legalidad",

  // Veredictos de legalidad
  "verdict.legal": "legal",
  "verdict.unverified": "no verificable",
  "verdict.illegal": "ilegal",

  // Lista de Pokémon
  "mon.none": "Sin Pokémon.",
  "mon.noBoxes": "Sin cajas.",
  "mon.noBag": "Sin mochila.",
  "mon.level": "Nv {n}",
  "legality.clean": "Ningún Pokémon marcado como ilegal o no verificable.",
  "legality.illegalHeading": "Ilegales",
  "legality.unverifiedHeading": "No verificables",
  "legality.noReport": "sin informe",

  // Ficha de Pokémon
  "mon.nicknamed": "con mote",
  "mon.notNicknamed": "sin mote",
  "mon.shiny": "✦ variocolor",
  "mon.exp": "EXP",
  "mon.nature": "Naturaleza",
  "mon.friendship": "Amistad",
  "mon.item": "Objeto",
  "mon.origin": "Origen",
  "mon.ot": "OT",
  "mon.stats": "Estadísticas",
  "mon.ivs": "IV (bloqueados)",
  "mon.evs": "EV / stat exp",
  "mon.moves": "Movimientos",
  "mon.pp": "PP {pp}",
  "mon.ppUps": "(+{n})",
  "mon.issues": "Motivos",
  "mon.legalityReport": "Informe de legalidad",
  "mon.export": "Exportación",
  "mon.allowed": "permitido",
  "mon.blocked": "bloqueado",
  "adopt.button": "Llevar a la Guardería",
  "adopt.blocked": "Solo se adoptan Pokémon legales o no verificables.",
  "adopt.hint": "La mascota no modifica el save hasta la exportación.",
  "adopt.working": "Adoptando…",
  "adopt.done": "{name} ya vive en la Guardería.",

  // Nombres largos de stat
  "statname.hp": "PS",
  "statname.atk": "Ataque",
  "statname.def": "Defensa",
  "statname.spa": "At. Esp.",
  "statname.spd": "Def. Esp.",
  "statname.spe": "Velocidad",

  // Abreviaturas de stat (motor y lienzo; solo ASCII)
  "statshort.hp": "PS",
  "statshort.atk": "ATQ",
  "statshort.def": "DEF",
  "statshort.spa": "AT.E",
  "statshort.spd": "DEF.E",
  "statshort.spe": "VEL",

  // Guardería: armazón
  "nursery.heading": "Guardería",
  "nursery.loading": "Cargando mascotas…",
  "nursery.loadError": "No se pudo cargar la Guardería: {msg}",
  "nursery.empty":
    "Aún no has adoptado ninguna mascota. Abre un Pokémon en la biblioteca y pulsa «Llevar a la Guardería».",
  "nursery.footer":
    "Motor determinista v1. Los EV entrenados se acumulan como cambios pendientes y se escriben al save con «Previsualizar exportación»; la salida es siempre un archivo nuevo.",

  // PG-07A: preferencias visuales (no afectan a las mascotas ni al save).
  "render.mode": "Dibujo",
  "render.mode.overworld": "Overworld (sprites)",
  "render.mode.procedural": "Procedural (original)",
  "render.palette": "Paleta",
  "render.palette.rgba": "RGBA original",
  "render.palette.gbc4": "GBC · 4 colores",
  "render.palette.gbc16": "GBC · 16 tonos derivados",
  "render.status.ready": "Overworld activo · {n} sprites disponibles",
  "render.status.procedural": "Renderizado procedural original",
  "render.status.loading": "Cargando sprites…",
  "render.status.unavailable": "Sin sprites locales · fallback procedural",

  "pet.level": "Nv {n}",
  "pet.days": "{n} días",
  "pet.noNature": "sin naturaleza",
  "pet.sleeping": "durmiendo",
  "pet.awake": "despierto",

  // Necesidades
  "need.hunger": "Comida",
  "need.happiness": "Felicidad",
  "need.energy": "Energía",
  "need.hygiene": "Higiene",
  "need.discipline": "Disciplina",
  "need.sleepiness": "Sueño",

  // Estados de ánimo
  "mood.dormido": "durmiendo",
  "mood.hambriento": "con hambre",
  "mood.sucio": "sucio",
  "mood.agotado": "agotado",
  "mood.feliz": "feliz",
  "mood.triste": "triste",
  "mood.normal": "tranquilo",

  // HUD
  "hud.points": "P{n}",

  // Ficha de la mascota
  "sheet.trainings": "Entrenamientos: {n}",
  "sheet.points": "Puntos: {n}",
  "sheet.pending": "Pendiente de escribir",
  "sheet.export": "Exportar al save",
  "sheet.activate": "Marcar activa",
  "sheet.release": "Liberar",
  "unit.ev": "EV",
  "unit.statexp": "stat exp",
  "sheet.totalOf": "{a} / {b}",
  "sheet.totalNoCap": "{a} (sin tope global)",
  "sheet.capLine": "{unit}: {total} · máx {perStat}/stat",

  // Exportación
  "export.pending.none": "No hay EV pendientes: entrena a la mascota antes de exportar.",
  "export.pending.some": "Se escribirán {total} {unit} en un archivo nuevo; el original nunca se toca.",
  "export.preview": "Previsualizar exportación",
  "export.nothing": "nada (todo retenido)",
  "export.state.written": "Escrito",
  "export.state.dry": "Simulación",
  "export.state.none": "No escrito",
  "export.bytes": "{n} bytes distintos",
  "export.normalized": "{n} normalizados",
  "export.write": "Escribir al save",
  "export.file": "Archivo:",
  "export.applied": "Aplicado: {list}",
  "export.withheld": "Retenido: {list}",
  "export.resimulate": "Volver a simular",
  "export.ready": "Simulación lista: revisa el informe antes de escribir.",
  "export.confirmWrite":
    "¿Escribir los EV entrenados en una copia nueva del save de {name}? El original no se toca.",
  "export.wroteTo": "Escrito en {path}.",
  "export.wroteNew": "un archivo nuevo",
  "export.wroteNothing": "No se escribió nada.",

  // Acciones
  "action.feed": "Comer",
  "action.play": "Jugar",
  "action.clean": "Limpiar",
  "action.pet": "Acariciar",
  "action.scold": "Reprender",
  "action.sleep": "Dormir",
  "action.wake": "Despertar",
  "action.wait": "{n}m",
  "pet.active": "{name} es la mascota activa.",
  "pet.releaseConfirm": "¿Liberar a {name}? Solo se borra de la Guardería; el save no se toca.",
  "pet.released": "{name} ha vuelto a su caja.",

  // Entrenamiento
  "train.0.label": "Carrera",
  "train.0.hint": "PS",
  "train.1.label": "Empuje",
  "train.1.hint": "Ataque",
  "train.2.label": "Muro",
  "train.2.hint": "Defensa",
  "train.3.label": "Chispa",
  "train.3.hint": "At. Esp.",
  "train.4.label": "Calma",
  "train.4.hint": "Def. Esp.",
  "train.5.label": "Reflejos",
  "train.5.hint": "Velocidad",
  "train.start": "Entrenamiento de {hint}: pulsa cuando el cursor esté en la zona.",

  // Minijuego (lienzo: solo ASCII, la fuente 3x5 no tiene acentos)
  "game.title": "ENTRENAMIENTO",
  "game.round": "RONDA {n}/{m}",
  "game.saving": "GUARDANDO...",
  "game.hint": "ESPACIO / CLIC EN LA ZONA",
  "game.accuracy": "ACIERTO {n}%",
  "game.perfect": "PERFECTO",
  "game.good": "BIEN",
  "game.weak": "FLOJO",
  "empty.none": "SIN MASCOTA",
  "empty.adopt": "ADOPTA UN POKEMON",

  // Mensajes del motor (se ven en la Guardería y los devuelve la API)
  "msg.adopted": "Has adoptado a {name}.",
  "msg.wokeUp": "{name} se ha despertado solo.",
  "msg.collapsed": "{name} se ha quedado dormido de agotamiento.",
  "msg.starving": "{name} tiene mucha hambre.",
  "msg.sleepCycle": "El ciclo de sueño se ha repetido.",
  "msg.catchup": "Puesta al día limitada a 7 días.",
  "msg.unknownAction": "Acción desconocida.",
  "msg.cooldown": "Espera {min} min para volver a {action}.",
  "msg.sleeping": "{name} está durmiendo.",
  "msg.full": "{name} está lleno.",
  "msg.ate": "{name} ha comido una baya.",
  "msg.tooTiredPlay": "{name} está demasiado cansado para jugar.",
  "msg.played": "{name} se ha divertido.",
  "msg.clean": "{name} está limpio otra vez.",
  "msg.dontDisturb": "{name} duerme; no le molestes.",
  "msg.petted": "{name} ronronea.",
  "msg.obeys": "{name} ya te obedece.",
  "msg.scolded": "{name} baja las orejas.",
  "msg.alreadySleeping": "{name} ya duerme.",
  "msg.curledUp": "{name} se acurruca.",
  "msg.alreadyAwake": "{name} ya está despierto.",
  "msg.woke": "Has despertado a {name}.",
  "msg.trainSleeping": "Está durmiendo.",
  "msg.trainTired": "Está demasiado agotado para entrenar.",
  "msg.trainHungry": "Tiene hambre; dale de comer antes.",
  "msg.trainCooldown": "Descansa {n} s entre rondas.",
  "msg.trainMaxEv": "Ese stat ya está al máximo legal (255) o los EV llegan a 510.",
  "msg.trainMaxStatexp": "Ese stat exp ya está al máximo (65535).",
  "msg.trainGranted": "+{n} {unit} en {stat}{suffix}.",
  "msg.cappedSuffix": " (tope alcanzado)",
};

/* ------------------------------------------------------------------ */
/* Diccionario inglés (borrador: lo que falte cae al español)         */
/* ------------------------------------------------------------------ */

const EN: Dict = {
  "app.tagline": "Save library",
  "nav.library": "Library",
  "nav.nursery": "Daycare",
  "nav.back": "Back to the library",
  "render.mode": "Render",
  "render.mode.overworld": "Overworld (sprites)",
  "render.mode.procedural": "Procedural (original)",
  "render.palette": "Palette",
  "render.palette.rgba": "Original RGBA",
  "render.palette.gbc4": "GBC · 4 colors",
  "render.palette.gbc16": "GBC · 16 derived tones",
  "render.status.ready": "Overworld on · {n} sprites available",
  "render.status.procedural": "Original procedural rendering",
  "render.status.loading": "Loading sprites…",
  "render.status.unavailable": "No local sprites · procedural fallback",
  "health.checking": "checking…",
  "health.down": "server not responding",
  "saves.heading": "Saves",
  "saves.refresh": "Reload",
  "saves.empty": "No saves imported yet.",
  "drop.title": "Drop a save",
  "drop.hint": ".srm · .sav · .dsv (32 KB – 512 KB)",
  "drop.pick": "or pick a file",
  "detail.placeholder": "Pick a save to see its inventory.",
  "tab.party": "Party",
  "tab.boxes": "Boxes",
  "tab.bag": "Bag",
  "tab.legality": "Legality",
  "verdict.legal": "legal",
  "verdict.unverified": "unverified",
  "verdict.illegal": "illegal",
  "need.hunger": "Food",
  "need.happiness": "Happiness",
  "need.energy": "Energy",
  "need.hygiene": "Hygiene",
  "need.discipline": "Discipline",
  "need.sleepiness": "Sleep",
  "mood.dormido": "sleeping",
  "mood.hambriento": "hungry",
  "mood.sucio": "dirty",
  "mood.agotado": "exhausted",
  "mood.feliz": "happy",
  "mood.triste": "sad",
  "mood.normal": "calm",
  "action.feed": "Feed",
  "action.play": "Play",
  "action.clean": "Clean",
  "action.pet": "Pet",
  "action.scold": "Scold",
  "action.sleep": "Sleep",
  "action.wake": "Wake",
};

const DICTS: Record<Locale, Dict> = { es: ES, en: EN };

/* ------------------------------------------------------------------ */
/* API                                                                */
/* ------------------------------------------------------------------ */

let current: Locale = DEFAULT_LOCALE;

/** Cambia el idioma activo. Ignora valores desconocidos. */
export function setLocale(next: string | null | undefined): Locale {
  if (next && (LOCALES as readonly string[]).includes(next)) current = next as Locale;
  return current;
}

export function getLocale(): Locale {
  return current;
}

/** Etiqueta BCP-47 para `toLocaleString`/`toLocaleTimeString`. */
export function localeTag(locale: Locale = current): string {
  return locale === "en" ? "en-US" : "es-ES";
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : whole,
  );
}

/**
 * Traduce una clave. Orden de búsqueda: idioma activo → español → la propia
 * clave. Los parámetros `{nombre}` se sustituyen si existen.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = DICTS[current][key] ?? ES[key] ?? key;
  return interpolate(raw, params);
}

/** ¿Existe la clave en el idioma dado (o en el diccionario por defecto)? */
export function has(key: string, locale: Locale = current): boolean {
  return key in DICTS[locale] || key in ES;
}

/** Reloj local del sistema en el formato del idioma activo. */
export function formatClock(date: Date = new Date(), locale: Locale = current): string {
  return date.toLocaleTimeString(localeTag(locale), { hour: "2-digit", minute: "2-digit" });
}

/** Número con separadores del idioma activo. */
export function formatNumber(value: number, locale: Locale = current): string {
  return value.toLocaleString(localeTag(locale));
}

/** Lista de claves conocidas (útil para comprobaciones de cobertura). */
export function keys(locale: Locale = DEFAULT_LOCALE): string[] {
  return Object.keys(DICTS[locale] ?? {});
}

export { ES as DICT_ES, EN as DICT_EN };
