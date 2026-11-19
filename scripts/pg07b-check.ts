// Comprobación headless de PG-07B: carcasa, botonera, HUD y salvaguardas.
// No arranca el servidor, no abre la BD y no escribe en el repositorio.
// Ejecutar: bun run scripts/pg07b-check.ts
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

const nursery = read("apps/web/src/nursery.ts");
const css = read("apps/web/src/style.css");
const html = read("apps/web/index.html");

console.log("PG-07B — carcasa, botonera y HUD");

// 1. LCD intacta: resolución lógica y pixelación.
check("canvas lógico 160x144", /id="pg-canvas" width="160" height="144"/.test(nursery));
check("suavizado desactivado", /imageSmoothingEnabled\s*=\s*false/.test(nursery));
check("pixelación CSS", /image-rendering:\s*pixelated/.test(css));
check("escala entera 2..7", /Math\.min\(7,\s*Math\.max\(2,\s*fit\)\)/.test(nursery));

// 2. Carcasa y referencias visuales autorizadas.
check("carcasa envolvente", /class="device-shell"/.test(nursery) && /\.device-shell\s*\{/.test(css));
check("aro superior", /class="device-ring"/.test(nursery) && /\.device-ring\s*\{/.test(css));
check("rojo principal #D93636", /#D93636/i.test(css));
check("rojo oscuro #B51A21", /#B51A21/i.test(css));
check("marfil #FFF9F0", /#FFF9F0/i.test(css));
check("fondo canónico sin alterar",
  sha("apps/web/assets/room/guarderia.png") ===
    "bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095");

// 3. Botonera A/B/C y teclado.
for (const k of ["a", "b", "c"]) {
  check(`botón ${k.toUpperCase()} presente`,
    new RegExp(`data-shell-btn="${k}"`).test(nursery) &&
      new RegExp(`which === "${k}"`).test(nursery));
}
for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Enter", " ", "Escape"]) {
  check(`atajo ${key === " " ? "Espacio" : key}`, nursery.includes(`case "${key}":`));
}
check("cancelación sin API de entrenamiento", /Abandona el minijuego sin conceder EV/.test(nursery));

// 4. Listeners únicos y foco resistente a repintados.
const resizeHits = nursery.match(/addEventListener\("resize"/g) ?? [];
check("un solo listener de resize", resizeHits.length === 1, `n=${resizeHits.length}`);
check("bind/unbind de listeners globales",
  /function bindGlobalListeners\(/.test(nursery) && /function unbindGlobalListeners\(/.test(nursery) &&
    /unbindGlobalListeners\(\);/.test(nursery) && /bindGlobalListeners\(\);/.test(nursery));
const updateSheet = nursery.slice(nursery.indexOf("function updateSheet()"), nursery.indexOf("function paintHud()"));
check("updateSheet reaplica el foco", /shellRefreshFocus\(\);/.test(updateSheet));
const petPickBlock = updateSheet.slice(updateSheet.indexOf("querySelectorAll<HTMLElement>(\".pet-pick\")"));
check("sin listeners duplicados en pet-pick",
  /el\.onclick = \(\) =>/.test(petPickBlock) && !/el\.addEventListener/.test(petPickBlock));

// 5. HUD con datos reales del motor (no valores de relleno).
const hud = nursery.slice(nursery.indexOf("function paintHud()"), nursery.indexOf("/* Acciones"));
for (const token of ["st.hunger", "st.happiness", "st.energy", "st.hygiene", "st.discipline", "st.sleepiness", "formatClock()", "st.points"]) {
  check(`HUD usa ${token}`, hud.includes(token));
}

// 6. i18n: todas las claves nuevas deben existir en español; inglés con los mismos parámetros.
for (const k of [
  "device.brand", "device.model", "device.buttons.label",
  "device.btn.a", "device.btn.b", "device.btn.c", "device.focus", "device.cancelled",
]) {
  check(`i18n ${k}`, has(k, "es") && has(k, "en"));
}

// 7. Sin dependencias externas ni módulos nuevos que el servidor no sirve.
const external = [nursery, css, html].flatMap((text) => text.match(/https?:\/\/[^\s"')]+/g) ?? []);
check("sin referencias externas", external.length === 0, external.join(", "));
check("sin módulo TS nuevo", !/from "\/device/.test(nursery));

// 8. Salvaguardas de alcance: los archivos protegidos no cambiaron durante la fase.
const protectedBefore = readFileSync("/tmp/opencode/pg07b-protected-before.sha256", "utf8");
const bad: string[] = [];
for (const line of protectedBefore.trim().split("\n")) {
  const [expected, rel] = line.trim().split(/\s+/);
  if (!expected || !rel) continue;
  if (sha(rel) !== expected) bad.push(rel);
}
check("archivos protegidos intactos", bad.length === 0, bad.join(", "));

console.log(fails === 0 ? "\nPG-07B OK: todas las comprobaciones pasan." : `\n${fails} fallo(s).`);
process.exit(fails === 0 ? 0 : 1);
