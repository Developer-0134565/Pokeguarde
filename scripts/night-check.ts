// Comprobación headless de la lógica día/noche de la habitación.
// Ejecutar: bun run scripts/night-check.ts
import {
  NIGHT_CROSSFADE_MS,
  NIGHT_END_HOUR,
  NIGHT_START_HOUR,
  isNightHour,
  nightTarget,
  stepMix,
} from "../apps/web/src/daynight.ts";

let fails = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    fails++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

console.log("Día/noche");

// 1. Ventana nocturna 20:00 -> 06:00 con hora local.
check("noche empieza a las 20:00", isNightHour(20));
check("noche a las 23:00", isNightHour(23));
check("noche a medianoche", isNightHour(0));
check("noche a las 05:00", isNightHour(5));
check("05:59 sigue siendo noche", isNightHour(5.99));
check("06:00 ya es de día", !isNightHour(6));
check("mediodía es de día", !isNightHour(12));
check("19:59 todavía es de día", !isNightHour(19.99));
check("constantes 20/6", NIGHT_START_HOUR === 20 && NIGHT_END_HOUR === 6);

const nightHours = Array.from({ length: 24 }, (_, h) => h).filter(isNightHour);
check("horas nocturnas exactas", nightHours.join(",") === "0,1,2,3,4,5,20,21,22,23", nightHours.join(","));

// 2. Sin asset nocturno se mantiene el fondo diurno, también de noche.
check("sin asset y de noche -> 0", nightTarget(23, false) === 0);
check("sin asset y de día -> 0", nightTarget(12, false) === 0);
check("con asset y de noche -> 1", nightTarget(23, true) === 1);
check("con asset y de día -> 0", nightTarget(12, true) === 0);

// 3. Crossfade de 1,2 s.
check("duración del fundido = 1200 ms", NIGHT_CROSSFADE_MS === 1200);
check("0 -> 1 tarda 1,2 s", near(stepMix(0, 1, 1200), 1));
check("0 -> 1 a mitad tarda 0,6 s", near(stepMix(0, 1, 600), 0.5));
check("0 -> 1 en 0,6 s no llega", near(stepMix(0, 1, 599), 599 / 1200));
check("1 -> 0 tarda 1,2 s", near(stepMix(1, 0, 1200), 0));
check("no se pasa del objetivo", near(stepMix(0, 1, 5000), 1));
check("no baja del objetivo", near(stepMix(1, 0, 5000), 0));
check("fotograma sin tiempo no avanza", near(stepMix(0.3, 1, 0), 0.3));
check("dt negativo no avanza", near(stepMix(0.3, 1, -50), 0.3));
check("duración 0 salta al objetivo", near(stepMix(0.3, 1, 16, 0), 1));

// 4. Suma de fotogramas = fundido completo en 1,2 s.
let mix = 0;
let frames = 0;
while (mix < 1 && frames < 1000) {
  mix = stepMix(mix, 1, 16);
  frames++;
}
check("fundido completo con fotogramas de 16 ms", near(mix, 1) && frames >= 75 && frames <= 76, `frames=${frames}`);

// 5. Vuelta noche -> día simétrica.
let back = 1;
for (let i = 0; i < 75; i++) back = stepMix(back, 0, 16);
check("vuelta a diurno completa", near(back, 0));

console.log(fails === 0 ? "\nDía/noche OK: todas las comprobaciones pasan." : `\n${fails} fallo(s).`);
process.exit(fails === 0 ? 0 : 1);
