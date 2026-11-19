// Comprobación headless de PG-07C: FICHA / DATOS, navegación y salvaguardas.
// No arranca el servidor, no abre la BD y no escribe en el repositorio.
// Ejecutar: bun run scripts/pg07c-check.ts
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

console.log("PG-07C — FICHA / DATOS");

// 1. Navegación de tercera vía sin sustituir las pestañas de Biblioteca.
check("botón de navegación Ficha", /id="nav-sheet"/.test(html) && /data-i18n="nav.sheet"/.test(html));
check("panel de ficha", /id="sheet" class="panel dossier hidden"/.test(html));
check(
  "pestañas de Biblioteca intactas",
  ["party", "boxes", "bag", "legality"].every((tab) => main.includes(`data-tab="${tab}"`)),
);
check("nav-sheet enlazado", /\$\("#nav-sheet"\)\.onclick/.test(main));
check("callback de Guardería", /openNursery\(\$\("#nursery"\), showLibrary, preferId, openDossierFromPet\)/.test(main));
check("limpieza al entrar en Biblioteca", /function showLibrary\(\) \{\s*clearDossier\(\);/.test(main));
check("limpieza al entrar en Guardería", /function showNursery\(preferId\?: number\) \{\s*clearDossier\(\);/.test(main));
check("restaura la mascota al volver", /dossierReturnPetId = pet\.id/.test(main));

// 2. Orígenes reales: Pkm del inventario y perfil de la Guardería.
for (const token of [
  "type DossierData",
  "let currentInventory",
  "function dataFromPkm",
  "function dataFromPet",
  "function enrichWithSave",
  "function resolvePet",
  "function renderFicha",
  "function renderDatos",
]) {
  check(`bloque ${token}`, main.includes(token));
}
check("inventario asignado al abrir save", /currentInventory = inv;/.test(main));
check("perfil usa EV guardados", /pr\.baseEvs/.test(main));
check("pendientes separados", /pet\.state\.pendingEvs/.test(main));
check("resolución por API real", /\/api\/saves\//.test(main));
check("dato no disponible explícito", /dossier\.unavailable/.test(main));
check("inventario resuelto separado", /let dossierResolvedInventory/.test(main));
check("validación de generación y especie al resolver mascota", /const genOk/.test(main) && /const speciesOk/.test(main));
check("rechazo de resolución divergente", /dossier\.pet\.mismatch/.test(main));
check("objeto inexistente en Gen I", /d\.generation === 1 \? .*dossier\.notInGen/.test(main));

// 3. Una sola adopción: se eliminó el modal antiguo con lógica duplicada.
const adoptCalls = main.match(/adoptPet\(/g) ?? [];
check("única llamada a adoptPet", adoptCalls.length === 1, `n=${adoptCalls.length}`);
check("sin modal de adopción duplicado", !/id=\\"mon\\"/.test(main));
check(
  "showMon es alias de la ficha",
  /function showMon\(ref: MonRef\) \{\s*openDossierFromLibrary\(ref\);\s*\}/.test(main),
);

// 4. Respeto por generación: DVs/Stat Exp en I-II, IV/EV en III-V.
check("DVs 0-15 en Gen I/II", /bars\(d\.ivs, old \? 15 : 31\)/.test(main));
check("Stat Exp 65535 en Gen I/II", /bars\(d\.evs, old \? 65535 : 255\)/.test(main));
check("sin límites modernos en Gen I/II", !/old \? 510/.test(main));
check("naturaleza/habilidad no existen en Gen I/II", (main.match(/dossier\.notInGen/g) ?? []).length >= 2);
check("nota de Especial compartido", main.includes('t("dossier.statexpNote")'));
check("total EV solo en Gen III+", main.includes('t("dossier.evTotal"'));
check("evidencia de legalidad", /function dossierVerdict/.test(main));
check("PP con parámetro correcto", /t\("mon\.pp", \{ pp: m\.pp \}\)/.test(main));

// 5. Teclado y listeners: una sola suscripción global.
const keyBlock = main.slice(main.indexOf("function dossierOnKey"), main.indexOf("function renderDossier"));
for (const key of ["Escape", "ArrowLeft", "ArrowRight", "Enter", " "]) {
  check(`atajo ${key === " " ? "Espacio" : key}`, keyBlock.includes(`ev.key === "${key}"`));
}
check("guardia de listener de teclado", /dossierKeyBound/.test(main));
check("desenganche de teclado", /removeEventListener\("keydown", dossierOnKey\)/.test(main));
check("pestañas usan onclick", /btn\.onclick = \(\) =>/.test(main));

// 6. i18n: todas las claves nuevas existen en ES y, cuando se traducen, en EN.
for (const k of [
  "nav.sheet",
  "dossier.kicker", "dossier.back", "dossier.close",
  "dossier.tab.ficha", "dossier.tab.datos",
  "dossier.source.library", "dossier.source.pet",
  "dossier.unavailable", "dossier.notInGen", "dossier.oldGenNote",
  "dossier.species", "dossier.name", "dossier.level", "dossier.gender", "dossier.genderValue",
  "dossier.generation", "dossier.game", "dossier.trainer", "dossier.trainerId",
  "dossier.nature", "dossier.ability", "dossier.abilityId", "dossier.item", "dossier.legality",
  "dossier.spriteReady", "dossier.spriteUnavailable",
  "dossier.stats", "dossier.moves", "dossier.exp", "dossier.dvs", "dossier.ivs", "dossier.dvNote",
  "dossier.statexp", "dossier.statexpNote", "dossier.evs", "dossier.evTotal",
  "dossier.pending", "dossier.pendingNote", "dossier.friendship", "dossier.ball", "dossier.language",
  "dossier.idValue", "dossier.origin", "dossier.metLevel", "dossier.metDate", "dossier.eggDate",
  "dossier.issues", "dossier.report", "dossier.export", "dossier.noData", "dossier.empty",
  "dossier.pet.noSave", "dossier.pet.noSlot", "dossier.pet.notFound", "dossier.pet.resolveError", "dossier.pet.mismatch",
  "dossier.adopt", "dossier.adoptWorking", "dossier.adoptBlocked", "dossier.adoptHint",
  "dossier.noMoves", "dossier.noStats", "dossier.noTechnical", "dossier.other",
]) {
  check(`i18n ${k}`, has(k, "es") && has(k, "en"));
}

// 7. Sin dependencias externas ni recursos remotos.
const external = [main, nursery, html, css].flatMap((text) => text.match(/https?:\/\/[^\s"')]+/g) ?? []);
check("sin referencias externas", external.length === 0, external.join(", "));

// 8. CSS propio y responsive.
const dossierCss = css.slice(css.indexOf("/* ---------- FICHA / DATOS"));
check("estilos de ficha", /\.dossier\s*\{/.test(dossierCss) && /\.dossier-card\s*\{/.test(dossierCss));
check("estilos de sprite", /\.dossier-sprite canvas\s*\{/.test(dossierCss) && /image-rendering:\s*pixelated/.test(dossierCss));
check("responsive 1100", /@media \(max-width: 1100px\)/.test(dossierCss));
check("responsive 720", /@media \(max-width: 720px\)/.test(dossierCss));

// 9. Salvaguardas de alcance: backend, motor, sprites, sidecar, fondo y BD intactos.
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

console.log(fails === 0 ? "\nPG-07C OK: todas las comprobaciones pasan." : `\n${fails} fallo(s).`);
process.exit(fails === 0 ? 0 : 1);
