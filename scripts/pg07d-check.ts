// Comprobación headless de PG-07D: EQUIPO ACTIVO, selección, ficha y salvaguardas.
// No arranca el servidor, no abre la BD y no escribe en el repositorio.
// Ejecutar: bun run scripts/pg07d-check.ts
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

console.log("PG-07D — EQUIPO ACTIVO");

// 1. Funciones puras: se extraen y evalúan tal como las usa el navegador.
const start = main.indexOf("/* PG-07D:team-helpers:start */");
const end = main.indexOf("/* PG-07D:team-helpers:end */");
check("bloque de helpers presente", start >= 0 && end > start);
const helpers = new Function(
  `${main.slice(start, end + "/* PG-07D:team-helpers:end */".length)}
   return { TEAM_SLOT_COUNT, teamSlots, teamRefOf, teamGenderMark, teamStatusLabel, teamNav };`,
)() as {
  TEAM_SLOT_COUNT: number;
  teamSlots: (party: any[]) => any[];
  teamRefOf: (inv: any, index: number) => any;
  teamGenderMark: (gender: unknown, generation: number | null) => string;
  teamStatusLabel: (value: unknown) => string | null;
  teamNav: (current: number | null, key: string, count?: number) => number | null;
};

check("seis ranuras exactas", helpers.TEAM_SLOT_COUNT === 6);
const mon = (pid: number, slot: number) => ({ pid, slot, speciesName: `M${slot}` });
const slots = helpers.teamSlots([mon(11, 1), mon(22, 2), mon(33, 3)]);
check("equipo parcial conserva orden y rellena huecos", slots.length === 6 && slots[0].pid === 11 && slots[2].pid === 33 && slots[3] === null && slots[5] === null);
const full = helpers.teamSlots(Array.from({ length: 9 }, (_, i) => mon(i + 1, i + 1)));
check("nunca aparece un séptimo Pokémon", full.length === 6 && full[5].pid === 6);
check("equipo vacío produces seis huecos", helpers.teamSlots([]).every((s) => s === null));

const inv = { party: [mon(0, 1), mon(4128216059, 2)] };
check("identidad Gen I/II por ranura", JSON.stringify(helpers.teamRefOf(inv, 0)) === JSON.stringify({ p: mon(0, 1), location: "party", box: null, slot: 1 }));
check("identidad Gen III+ por PID", helpers.teamRefOf(inv, 1).p.pid === 4128216059 && helpers.teamRefOf(inv, 1).slot === 2);
check("índice fuera de rango no produce referencia", helpers.teamRefOf(inv, -1) === null && helpers.teamRefOf(inv, 6) === null && helpers.teamRefOf(inv, 3) === null);
check("equipo no nulo o inválido", helpers.teamRefOf(null, 0) === null && helpers.teamRefOf(inv, 1.5) === null);

check("Gen I no muestra género", helpers.teamGenderMark("0", 1) === "" && helpers.teamGenderMark("1", 1) === "");
check("Gen II+ macho/hembra", helpers.teamGenderMark("0", 2) === "♂" && helpers.teamGenderMark("1", 4) === "♀");
check("género numérico y sin género", helpers.teamGenderMark(0, 3) === "♂" && helpers.teamGenderMark(2, 5) === "" && helpers.teamGenderMark("?", 5) === "");

check("estado ausente no se inventa", helpers.teamStatusLabel(null) === null && helpers.teamStatusLabel(undefined) === null && helpers.teamStatusLabel("") === null);
check("estado presente se muestra", helpers.teamStatusLabel("BRN") === "BRN" && helpers.teamStatusLabel({ name: "SLP" }) === "SLP");
check("estado numérico no finito se descarta", helpers.teamStatusLabel(Number.NaN) === null);

check("flechas acotadas a 0..5", helpers.teamNav(0, "ArrowLeft") === 0 && helpers.teamNav(5, "ArrowRight") === 5);
check("flechas verticales también navegan", helpers.teamNav(2, "ArrowDown") === 3 && helpers.teamNav(2, "ArrowUp") === 1);
check("Home/End", helpers.teamNav(3, "Home") === 0 && helpers.teamNav(3, "End") === 5);
check("índice inválido se normaliza", helpers.teamNav(null, "ArrowRight") === 0 && helpers.teamNav(null, "ArrowLeft") === 5);
check("otras teclas no mueven", helpers.teamNav(2, "Enter") === 2 && helpers.teamNav(2, "Escape") === 2);

// 2. Integración real en la Biblioteca y en la ficha PG-07C.
for (const tab of ["team", "party", "boxes", "bag", "legality"]) {
  check(`pestaña ${tab} intacta`, main.includes(`data-tab="${tab}"`));
}
check("panel se inicializa en modo equipo", main.includes('let libraryTab: LibraryTab = "team";') && main.includes("show(libraryTab);"));
check("renderiza el panel desde el inventario actual", main.includes("tab.innerHTML = teamPanelHtml(inv);") && main.includes("bindTeamPanel(inv);"));
check("six slots en el DOM", main.includes('id="team-panel" class="team-grid" role="listbox"'));
check("selección por ratón/táctil usa botones", main.includes("card.onclick = () =>") && css.includes("touch-action: manipulation"));
check("teclado ligado al panel, no al documento", main.includes("panel.onkeydown = (ev) =>") && !main.includes('addEventListener("keydown", teamOnKey'));
const teamBlock = main.slice(main.indexOf("/* PG-07D — EQUIPO ACTIVO"), main.indexOf("function bars("));
check("atajos del panel", ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Enter", " ", "Escape"].every((k) => teamBlock.includes(`"${k}"`)));
check("Escape cancela selección", main.includes("team.selectionCleared") && main.includes("teamSelection = null;"));
check("selección se descarta al cambiar de partida", /async function openSave\(sha: string\) \{[\s\S]{0,180}teamSelection = null;/.test(main));
check("sin reordenación persistente", !/party\.(sort|reverse|splice)\(/.test(main));
check("ficha existente reutilizada", main.includes("function openDossierFromLibrary(ref: MonRef, fromTeam = false)") && main.includes("openDossierFromLibrary(ref, true)"));
check("retorno contextual al equipo", main.includes('dossierReturn = fromTeam ? "team" : "library";') && main.includes('else if (back === "team") restoreLibrary("team");'));
check("al volver se repinta conservando selección", /function restoreLibrary\(tab: LibraryTab\)[\s\S]{0,320}renderDetail\(currentSave, currentInventory\)/.test(main) && main.includes('restoreLibrary("team")'));
check("avatar y PS del contrato real", main.includes("data-species=") && main.includes("p.stats.hpMax") && main.includes("hpPct === null"));
check("estado solo si existe", main.includes("teamStatusLabel(p.statusName ?? p.status)"));
check("sprite local con reintento y pixelación", main.includes("initOverworldSprites()") && main.includes("paintOverworld(") && main.includes("imageSmoothingEnabled = false") && css.includes("image-rendering: pixelated"));
check("un solo listener global de teclado en main", (main.match(/addEventListener\("keydown"/g) ?? []).length === 1);
check("carcasa PG-07B intacta", nursery.includes("onShellKey") && nursery.includes("removeEventListener(\"keydown\", onShellKey)"));
check("sin modal duplicado", !main.includes('id=\\"mon\\"'));

// 3. i18n: claves nuevas en español y en inglés.
for (const k of [
  "tab.team",
  "team.heading", "team.hint", "team.count", "team.emptySlot", "team.selected",
  "team.spriteReady", "team.spriteUnavailable", "team.hp", "team.status",
  "team.genderMale", "team.genderFemale", "team.emptyChosen", "team.selectionCleared",
]) {
  check(`i18n ${k}`, has(k, "es") && has(k, "en"));
}
check("texto por defecto en español", i18n.includes('"tab.team": "Equipo activo"') && i18n.includes('"team.heading": "EQUIPO ACTIVO · 6 RANURAS"'));

// 4. CSS propio, sin desborde horizontal y objetivo táctil suficiente.
const teamCss = css.slice(css.indexOf("/* ---------- EQUIPO ACTIVO (PG-07D) ---------- */"));
for (const cls of [".team-panel", ".team-grid", ".team-slot", ".team-slot.empty", ".team-slot.selected", ".team-sprite", ".team-hp-track", ".team-status"]) {
  check(`CSS ${cls}`, teamCss.includes(`${cls} {`) || teamCss.includes(`${cls},`) || teamCss.includes(`${cls}.`));
}
check("grid adaptable", /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/.test(teamCss) && /@media \(max-width: 900px\)/.test(teamCss) && /@media \(max-width: 480px\)/.test(teamCss));
check("objetivos táctiles y foco visible", /min-height:\s*108px/.test(teamCss) && /:focus-visible/.test(teamCss));

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

console.log(fails === 0 ? "\nPG-07D OK: todas las comprobaciones pasan." : `\n${fails} fallo(s).`);
process.exit(fails === 0 ? 0 : 1);
