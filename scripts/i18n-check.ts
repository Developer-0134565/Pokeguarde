// Comprobación headless del sistema de traducciones.
// Ejecutar: bun run scripts/i18n-check.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DICT_EN,
  DICT_ES,
  LOCALES,
  formatClock,
  getLocale,
  has,
  keys,
  setLocale,
  t,
} from "../apps/web/src/i18n.ts";

let fails = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    fails++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

console.log("Traducciones");

// 1. Español por defecto y completo.
check("idioma por defecto = es", getLocale() === "es");
check("hay diccionario es", keys("es").length > 100, `claves=${keys("es").length}`);
const empty = Object.entries(DICT_ES).filter(([, v]) => !v || !String(v).trim());
check("ninguna cadena es vacía", empty.length === 0, empty.map(([k]) => k).join(", "));
check("t() resuelve en español", t("nav.nursery") === "Guardería");
check("interpolación {n}", t("mon.level", { n: 25 }) === "Nv 25");
check("interpolación múltiple", t("detail.legalityCounts", { legal: 1, unverified: 2, illegal: 3 }) === "1 legales · 2 no verificables · 3 ilegales");
check("clave desconocida devuelve la clave", t("no.existe") === "no.existe");

// 2. Cobertura por áreas de la interfaz (claves críticas).
const REQUIRED = [
  "app.title", "app.brand", "app.tagline",
  "nav.library", "nav.nursery", "nav.back",
  "health.checking", "health.down", "dialog.close",
  "saves.heading", "saves.refresh", "saves.empty", "saves.error",
  "drop.title", "drop.hint", "drop.pick", "detail.placeholder",
  "save.reading", "save.roundtrip.ok", "save.roundtrip.bad",
  "save.importing", "save.imported", "save.duplicate",
  "detail.trainer", "detail.id", "detail.money", "detail.time", "detail.badges",
  "detail.dex", "detail.pokemon", "detail.legality",
  "dex.seen", "dex.caught", "dex.unavailable",
  "tab.party", "tab.boxes", "tab.bag", "tab.legality",
  "verdict.legal", "verdict.unverified", "verdict.illegal",
  "mon.none", "mon.noBoxes", "mon.noBag", "mon.level",
  "mon.nicknamed", "mon.notNicknamed", "mon.shiny", "mon.exp", "mon.nature",
  "mon.friendship", "mon.item", "mon.origin", "mon.ot", "mon.stats",
  "mon.ivs", "mon.evs", "mon.moves", "mon.pp", "mon.ppUps",
  "mon.issues", "mon.legalityReport", "mon.export", "mon.allowed", "mon.blocked",
  "adopt.button", "adopt.blocked", "adopt.hint", "adopt.working", "adopt.done",
  "nursery.heading", "nursery.loading", "nursery.loadError", "nursery.empty", "nursery.footer",
  "pet.level", "pet.days", "pet.noNature", "pet.sleeping", "pet.awake",
  "need.hunger", "need.happiness", "need.energy", "need.hygiene", "need.discipline", "need.sleepiness",
  "mood.dormido", "mood.hambriento", "mood.sucio", "mood.agotado", "mood.feliz", "mood.triste", "mood.normal",
  "hud.points",
  "sheet.trainings", "sheet.points", "sheet.pending", "sheet.export",
  "sheet.activate", "sheet.release", "unit.ev", "unit.statexp",
  "sheet.totalOf", "sheet.totalNoCap", "sheet.capLine",
  "export.pending.none", "export.pending.some", "export.preview", "export.nothing",
  "export.state.written", "export.state.dry", "export.state.none",
  "export.bytes", "export.normalized", "export.write", "export.file",
  "export.applied", "export.withheld", "export.resimulate", "export.ready",
  "export.confirmWrite", "export.wroteTo", "export.wroteNew", "export.wroteNothing",
  "action.feed", "action.play", "action.clean", "action.pet", "action.scold",
  "action.sleep", "action.wake", "action.wait",
  "pet.active", "pet.releaseConfirm", "pet.released",
  "train.start", "game.title", "game.round", "game.saving", "game.hint",
  "game.accuracy", "game.perfect", "game.good", "game.weak",
  "empty.none", "empty.adopt",
  "msg.adopted", "msg.wokeUp", "msg.collapsed", "msg.starving", "msg.sleepCycle",
  "msg.catchup", "msg.unknownAction", "msg.cooldown", "msg.sleeping", "msg.full",
  "msg.ate", "msg.tooTiredPlay", "msg.played", "msg.clean", "msg.dontDisturb",
  "msg.petted", "msg.obeys", "msg.scolded", "msg.alreadySleeping", "msg.curledUp",
  "msg.alreadyAwake", "msg.woke", "msg.trainSleeping", "msg.trainTired",
  "msg.trainHungry", "msg.trainCooldown", "msg.trainMaxEv", "msg.trainMaxStatexp",
  "msg.trainGranted", "msg.cappedSuffix",
];
const missing = REQUIRED.filter((k) => !has(k, "es"));
check("claves críticas presentes en es", missing.length === 0, missing.join(", "));

// 3. Familias dinámicas (stat, acción, ánimo, necesidad y minijuegos).
const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
const ACTIONS = ["feed", "play", "clean", "pet", "scold", "sleep", "wake"];
const MOODS = ["dormido", "hambriento", "sucio", "agotado", "feliz", "triste", "normal"];
const NEEDS = ["hunger", "happiness", "energy", "hygiene", "discipline", "sleepiness"];
const dynamic = [
  ...STAT_KEYS.flatMap((k) => [`statshort.${k}`, `statname.${k}`]),
  ...ACTIONS.map((a) => `action.${a}`),
  ...MOODS.map((m) => `mood.${m}`),
  ...NEEDS.map((n) => `need.${n}`),
  ...Array.from({ length: 6 }, (_, i) => [`train.${i}.label`, `train.${i}.hint`]).flat(),
];
const missingDynamic = dynamic.filter((k) => !has(k, "es"));
check("familias dinámicas en es", missingDynamic.length === 0, missingDynamic.join(", "));

// 4. Claves literales usadas en el código y en el HTML.
const root = join(import.meta.dir, "..");
const sources = [
  "apps/web/src/main.ts",
  "apps/web/src/nursery.ts",
  "apps/web/src/pet-engine.ts",
];
const used = new Set<string>();
for (const rel of sources) {
  const text = readFileSync(join(root, rel), "utf8");
  for (const m of text.matchAll(/\bt\(\s*"([^"]+)"/g)) used.add(m[1]);
}
const html = readFileSync(join(root, "apps/web/index.html"), "utf8");
for (const m of html.matchAll(/data-i18n(?:-title|-aria)?="([^"]+)"/g)) used.add(m[1]);
const unknown = [...used].filter((k) => !has(k, "es"));
check("claves literales del código existen", unknown.length === 0, unknown.join(", "));
check("el HTML usa data-i18n", used.size > 10, `usadas=${used.size}`);

// 5. El lienzo 3x5 solo tiene ASCII: las cadenas de canvas no llevan acentos.
const canvasKeys = keys("es").filter((k) => k.startsWith("game.") || k.startsWith("empty."));
const nonAscii = canvasKeys.filter((k) => !/^[\x20-\x7E]*$/.test(DICT_ES[k]));
check("cadenas de lienzo sin acentos", nonAscii.length === 0, nonAscii.join(", "));

// 6. Inglés preparado: subconjunto del español y mismos parámetros.
check("inglés registrado", LOCALES.includes("en"));
const enOutside = Object.keys(DICT_EN).filter((k) => !(k in DICT_ES));
check("inglés solo usa claves de es", enOutside.length === 0, enOutside.join(", "));
const placeholders = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1])).size;
const badParams = Object.entries(DICT_EN).filter(([k, v]) => placeholders(v) !== placeholders(DICT_ES[k]));
check("mismos parámetros en en y es", badParams.length === 0, badParams.map(([k]) => k).join(", "));

// 7. Cambio de idioma y vuelta atrás; lo que falte cae al español.
setLocale("en");
check("cambio a inglés", getLocale() === "en");
check("inglés traduce lo cubierto", t("nav.nursery") === "Daycare");
check("inglés cae a español si falta", t("msg.catchup") === "Puesta al día limitada a 7 días.");
setLocale("xx");
check("idioma desconocido ignorado", getLocale() === "en");
setLocale("es");
check("vuelta a español", getLocale() === "es" && t("nav.nursery") === "Guardería");

// 8. Reloj local en formato del idioma.
const clock = formatClock(new Date(2026, 0, 1, 20, 5));
check("reloj local 20:05", /20[:.]05/.test(clock), clock);

console.log(fails === 0 ? "\nTraducciones OK: todas las comprobaciones pasan." : `\n${fails} fallo(s).`);
process.exit(fails === 0 ? 0 : 1);
