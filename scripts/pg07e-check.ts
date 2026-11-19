// Comprobación headless de PG-07E: cajas de PC reales, navegación, filtros y ficha.
// No arranca el servidor, no abre la BD y no escribe en el repositorio.
// Ejecutar: bun run scripts/pg07e-check.ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { has } from "../apps/web/src/i18n.ts";

const root = join(import.meta.dir, "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const sha = (rel: string) =>
  createHash("sha256").update(readFileSync(join(root, rel))).digest("hex");

let fails = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    fails++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

const main = read("apps/web/src/main.ts");
const nursery = read("apps/web/src/nursery.ts");
const html = read("apps/web/index.html");
const css = read("apps/web/src/style.css");
const i18n = read("apps/web/src/i18n.ts");

console.log("PG-07E — CAJAS DE PC");

// 1. Helpers puros: se extraen y evalúan tal como los usa el navegador.
const markerStart = "/* PG-07E:pc-helpers:start */";
const markerEnd = "/* PG-07E:pc-helpers:end */";
const start = main.indexOf(markerStart);
const end = main.indexOf(markerEnd);
check("bloque de helpers presente", start >= 0 && end > start);
const helpers = new Function(
  `${main.slice(start, end + markerEnd.length)}
   return { PC_FILTERS, pcBoxes, pcBoxByIndex, pcSlotList, pcRefOf, pcVerdictOf, pcText, pcNorm, pcMatches, pcCounts, pcNav, pcSelectionValid, pcFocusSlot };`,
)() as {
  PC_FILTERS: string[];
  pcBoxes: (inv: any) => any[];
  pcBoxByIndex: (inv: any, index: number | null) => any;
  pcSlotList: (box: any) => any[];
  pcRefOf: (box: any, slot: number | null) => any;
  pcVerdictOf: (p: any) => string | null;
  pcText: (p: any) => string;
  pcNorm: (text: unknown) => string;
  pcMatches: (p: any, filter: string, query: string) => boolean;
  pcCounts: (box: any) => { legal: number; unverified: number; illegal: number };
  pcNav: (current: number, key: string, count: number, columns: number) => number;
  pcSelectionValid: (inv: any, index: number | null, slot: number | null) => boolean;
  pcFocusSlot: (box: any, filter: string, query: string) => number;
};

check("filtros exactos", JSON.stringify(helpers.PC_FILTERS) === JSON.stringify(["all", "legal", "unverified", "illegal"]));
check("sin inventario no hay cajas", helpers.pcBoxes(null).length === 0 && helpers.pcBoxes({ boxes: null }).length === 0);

const hg = {
  boxes: [
    { index: 1, name: "CAJA 1", slots: Array.from({ length: 29 }, (_, i) => ({ pid: 101 + i, slot: i + 1, speciesName: `M${i + 1}`, nickname: `N${i + 1}`, verdict: "legal" })) },
    { index: 2, name: "CAJA 2", slots: [...Array.from({ length: 12 }, (_, i) => ({ pid: 201 + i, slot: i + 1, speciesName: `V${i + 1}`, verdict: "legal" })), { pid: 214, slot: 15, speciesName: "V15", verdict: "illegal" }, { pid: 215, slot: 16, speciesName: "V16", verdict: "unverified" }, { pid: 220, slot: 21, speciesName: "V21", verdict: "legal" }] },
    { index: 17, name: "Eventos", slots: [{ pid: 301, slot: 20, speciesName: "Manaphy", nickname: "MANAFY", verdict: "legal" }] },
  ],
};
check("número real de cajas del contrato", helpers.pcBoxes(hg).length === 3);
check("índices de caja no contiguos se conservan", helpers.pcBoxByIndex(hg, 1)?.name === "CAJA 1" && helpers.pcBoxByIndex(hg, 17)?.name === "Eventos" && helpers.pcBoxByIndex(hg, 4) === null);
check("caja inexistente no se inventa", helpers.pcBoxByIndex(null, 1) === null && helpers.pcBoxByIndex(hg, null) === null && helpers.pcBoxByIndex(hg, 1.5) === null);

const b2 = helpers.pcBoxByIndex(hg, 2);
const list2 = helpers.pcSlotList(b2);
check("capacidad observada procede del mayor slot real", list2.length === 21 && helpers.pcSlotList(hg.boxes[0]).length === 29 && helpers.pcSlotList(hg.boxes[2]).length === 20);
check("huecos conservan su posición original", list2[0].pid === 201 && list2[11].pid === 212 && list2[12] === null && list2[14].pid === 214 && list2[20].pid === 220);
check("sin slots no se fabrica ranura 1", helpers.pcSlotList({ slots: [] }).length === 0 && helpers.pcSlotList(null).length === 0);

const ref = helpers.pcRefOf(b2, 15);
check("referencia conserva caja y ranura base 1", JSON.stringify(ref) === JSON.stringify({ p: b2.slots[12], location: "box", box: 2, slot: 15 }));
check("ranura vacía o inválida no da referencia", helpers.pcRefOf(b2, 13) === null && helpers.pcRefOf(b2, 0) === null && helpers.pcRefOf(b2, 22) === null && helpers.pcRefOf(b2, 1.5) === null && helpers.pcRefOf(null, 1) === null);
check("selección solo válida si sigue existiendo", helpers.pcSelectionValid(hg, 2, 15) === true && helpers.pcSelectionValid(hg, 2, 13) === false && helpers.pcSelectionValid(hg, 99, 1) === false);

check("veredicto existente se respeta", helpers.pcVerdictOf({ verdict: "legal" }) === "legal" && helpers.pcVerdictOf({ verdict: "unverified" }) === "unverified" && helpers.pcVerdictOf({ verdict: "illegal" }) === "illegal");
check("fallback usa legal booleano y no inventa", helpers.pcVerdictOf({ legal: true }) === "legal" && helpers.pcVerdictOf({ legal: false }) === "illegal" && helpers.pcVerdictOf({}) === "unverified" && helpers.pcVerdictOf(null) === null);
check("texto de búsqueda reúne mote, especie e ID", helpers.pcText({ nickname: "Manolo", speciesName: "Porygon-Z", species: 474 }) === "Manolo Porygon-Z 474");
check("normalización quita acentos y mayúsculas", helpers.pcNorm("  MANAFY  ") === "manafy" && helpers.pcNorm("Porygon-Z") === "porygon-z");

check("filtro todos no oculta", helpers.pcMatches(ref.p, "all", "") === true);
check("filtro legal e ilegal separan estados", helpers.pcMatches(ref.p, "illegal", "") === true && helpers.pcMatches(ref.p, "legal", "") === false && helpers.pcMatches({ verdict: "unverified" }, "unverified", "") === true);
check("no verificable nunca se convierte en ilegal", helpers.pcMatches({ verdict: "unverified" }, "illegal", "") === false);
check("búsqueda por mote, especie y número", helpers.pcMatches({ nickname: "Mi MANAFY", speciesName: "Manaphy", species: 490 }, "all", "manafy") === true && helpers.pcMatches({ nickname: "", speciesName: "Porygon-Z", species: 474 }, "all", "porygon") === true && helpers.pcMatches({ nickname: "", speciesName: "Porygon-Z", species: 474 }, "all", "474") === true);
check("búsqueda sin resultados no muestra Pokémon", helpers.pcMatches(ref.p, "all", "noexiste") === false && helpers.pcMatches(null, "all", "") === false);

const counts = helpers.pcCounts(b2);
check("conteo por veredicto de la caja real", counts.legal === 13 && counts.illegal === 1 && counts.unverified === 1);
check("foco inicial cae en la primera coincidencia", helpers.pcFocusSlot(b2, "illegal", "") === 15 && helpers.pcFocusSlot(b2, "all", "V21") === 21 && helpers.pcFocusSlot(b2, "all", "noexiste") === 1);

check("flechas horizontales acotadas", helpers.pcNav(0, "ArrowLeft", 30, 5) === 0 && helpers.pcNav(29, "ArrowRight", 30, 5) === 29 && helpers.pcNav(7, "ArrowRight", 30, 5) === 8);
check("flechas verticales usan columnas reales", helpers.pcNav(3, "ArrowDown", 30, 5) === 8 && helpers.pcNav(8, "ArrowUp", 30, 5) === 3 && helpers.pcNav(2, "ArrowDown", 30, 1) === 3);
check("Home/End y teclas ajenas", helpers.pcNav(12, "Home", 30, 5) === 0 && helpers.pcNav(2, "End", 30, 5) === 29 && helpers.pcNav(4, "Enter", 30, 5) === 4 && helpers.pcNav(4, "Escape", 30, 5) === 4);
check("índice inválido se normaliza", helpers.pcNav(-5, "ArrowLeft", 30, 5) === 0 && helpers.pcNav(99, "ArrowRight", 30, 5) === 1);

// 2. Integración con la Biblioteca y la FICHA / DATOS de PG-07C.
for (const tab of ["team", "party", "boxes", "bag", "legality"]) {
  check(`pestaña ${tab} intacta`, main.includes(`data-tab="${tab}"`));
}
check("panel de cajas se renderiza desde el inventario", main.includes("tab.innerHTML = pcPanelHtml(inv);") && main.includes("bindPcPanel(inv);"));
check("vista antigua de cajas no se usa", !main.includes("function boxesView(") && !main.includes("tab.innerHTML = boxesView(inv)"));
check("solo cajas presentes del contrato", main.includes("const boxes = pcBoxes(inv);") && main.includes("if (!boxes.length)"));
check("error de lectura informa sin bloquear", main.includes('(inv as any).boxError') && main.includes('t("box.readError"'));
check("capacidad ausente se declara, no se inventa", main.includes('t("box.capacityUnknown")') && /Ranuras observadas/.test(i18n));
check("índices originales en cabecera y ranuras", main.includes('t("box.index", { n: box.index })') && main.includes('t("box.slot", { n: ref.slot })') && main.includes('data-slot="${slot}"'));
check("navegación anterior/siguiente", main.includes('id="pc-prev"') && main.includes('id="pc-next"') && main.includes("function pcChangeBox("));
check("filtros de legalidad sin reordenar", main.includes("data-filter=\"${f}\"") && main.includes("class=\"pc-slot${selected ? \" selected\" : \"\"}${matched ? \"\" : \" filtered\"}\""));
check("búsqueda local sobre datos cargados", main.includes('id="pc-query"') && main.includes("input.oninput") && main.includes("pcQuery = input.value"));
check("información contextual breve", main.includes('id="pc-info"') && main.includes("function pcInfoHtml(") && main.includes('id="pc-open"'));
check("ratón y táctil usan botones", main.includes("grid.onclick") && main.includes("closest<HTMLButtonElement>(\".pc-slot\")") && css.includes("touch-action: manipulation"));
check("teclado ligado al panel, no al documento", main.includes("grid.onkeydown") && !main.includes('addEventListener("keydown", pcOnKey'));
check("atajos completos del panel", ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Enter", " ", "Escape"].every((k) => {
  const block = main.slice(main.indexOf("function bindPcPanel("), main.indexOf("function paintPcSprites("));
  return block.includes(`"${k}"`);
}));
check("Escape cancela selección", main.includes("box.selectionCleared") && /pcSlotSelection = null;[\s\S]{0,120}refreshPcView\(inv\)/.test(main));
check("selección persiste al volver de la ficha", main.includes('dossierReturn = "boxes";') && main.includes('else if (back === "boxes") restoreLibrary("boxes");'));
check("firma PG-07C intacta", main.includes("function openDossierFromLibrary(ref: MonRef, fromTeam = false)") && main.includes("openDossierFromLibrary(ref);"));
check("tipo de retorno ampliado", main.includes('let dossierReturn: "library" | "nursery" | "team" | "boxes" = "library";'));
check("cambio de partida reinicia contexto", /async function openSave\(sha: string\) \{[\s\S]{0,260}pcBoxIndex = null;[\s\S]{0,120}pcSlotSelection = null;/.test(main));
check("validación al repintar descarta contexto obsoleto", main.includes("if (pcBoxIndex !== null && !pcBoxByIndex(inv, pcBoxIndex))") && main.includes("pcSelectionValid(inv, pcBoxIndex, pcSlotSelection)"));
check("sin reordenación persistente", !/boxes\.(sort|reverse|splice)\(|slots\.(sort|reverse|splice)\(/.test(main));
check("sprites locales y pixelación", main.includes("initOverworldSprites()") && main.includes("paintOverworld(") && main.includes("imageSmoothingEnabled = false") && css.includes("image-rendering: pixelated"));
check("un solo listener global de teclado en main", (main.match(/addEventListener\("keydown"/g) ?? []).length === 1);
check("carcasa PG-07B intacta", nursery.includes("onShellKey") && nursery.includes('removeEventListener("keydown", onShellKey)'));
check("sin modal duplicado", !main.includes('id=\\"mon\\"'));
check("sin arrastrar y soltar en cajas", !/draggable|dragstart|dropzone/.test(main.slice(main.indexOf("/* PG-07E — CAJAS DE PC"), main.indexOf("function bars("))));

// 3. i18n: claves nuevas en español y en inglés.
const keys = [
  "box.heading", "box.hint", "box.index", "box.count", "box.observed", "box.capacityUnknown",
  "box.contractLimit", "box.prev", "box.next", "box.filter", "box.filter.all", "box.filter.legal",
  "box.filter.unverified", "box.filter.illegal", "box.search", "box.matchNote", "box.emptySlot",
  "box.selected", "box.slot", "box.noBoxes", "box.readError", "box.noSlots", "box.emptyChosen",
  "box.selectionCleared", "box.selection", "box.openDossier", "box.spriteReady",
  "box.spriteUnavailable", "box.noVerdict", "box.contextHint",
];
for (const k of keys) check(`i18n ${k}`, has(k, "es") && has(k, "en"));
check("texto por defecto en español", i18n.includes('"box.heading": "CAJAS DE PC"') && i18n.includes('"box.filter.unverified": "No verificables"'));

// 4. CSS propio, sin desborde horizontal y objetivo táctil suficiente.
const pcCss = css.slice(css.indexOf("/* ---------- CAJAS DE PC (PG-07E) ---------- */"));
for (const cls of [".pc-panel", ".pc-head", ".pc-nav", ".pc-identity", ".pc-filters", ".pc-search", ".pc-grid", ".pc-slot", ".pc-slot.empty", ".pc-slot.selected", ".pc-slot.filtered", ".pc-sprite", ".pc-info"]) {
  check(`CSS ${cls}`, pcCss.includes(`${cls} {`) || pcCss.includes(`${cls},`) || pcCss.includes(`${cls}.`));
}
check("grid adaptable y sin desborde", /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/.test(pcCss) && /@media \(max-width: 900px\)/.test(pcCss) && /@media \(max-width: 480px\)/.test(pcCss) && /\.pc-grid \{[\s\S]{0,160}overflow-x: hidden/.test(pcCss));
check("objetivos táctiles y foco visible", /min-height:\s*118px/.test(pcCss) && /:focus-visible/.test(pcCss) && /min-height:\s*108px/.test(pcCss));

// 5. Sin dependencias externas.
const external = [main, nursery, html, css, i18n].flatMap((text) => text.match(/https?:\/\/[^\s"')]+/g) ?? []);
check("sin referencias externas", external.length === 0, external.join(", "));

// 6. Salvaguardas de alcance: backend, motor, sprites, sidecar, fondo y BD intactos.
const protectedFiles: Array<[string, string]> = [
  ["f63e915cdb1d3869fafd0a6b7d33774b4c5b25e61a35fb1fbcd91a4e6826315e", "apps/server/src/index.ts"],
  ["fcd95b0c63c059c57228bd7c06b1121247c23f6f18178388d43148f9193fed7b", "apps/server/src/db.ts"],
  ["26955014098ea15f36b21a8a0e714fcccf4183a8e0988cbea801abf9cfd096bb", "apps/web/src/pet-engine.ts"],
  ["9e25e9ecb8f9383294265706bedaefc3dda8dcc9c40fd4f2a08248fd9e8e9ac8", "apps/web/src/sprite-runtime.ts"],
  ["92f43df3284153b4be0a75755f9e7984a78e1aad40064ff6fd8d94a675185f30", "apps/web/src/sprite-render.ts"],
  ["014a489b81b8225424e41332f27ab1d2f9bd2147195177e5a585b47a70f983fa", "services/pkhex/Program.cs"],
  ["bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095", "apps/web/assets/room/guarderia.png"],
  ["3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a", "data/pokegotchi.db"],
];
for (const [expected, rel] of protectedFiles) {
  check(`protegido ${rel}`, sha(rel) === expected);
}

console.log(fails === 0 ? "\nPG-07E OK: todas las comprobaciones pasan." : `\n${fails} fallo(s).`);
process.exit(fails === 0 ? 0 : 1);
