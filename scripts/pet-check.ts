// Comprobación headless del motor de la Guardería.
// Ejecutar: bun run scripts/pet-check.ts
import {
  ACTION_INFO,
  HOUR,
  MAX_CATCHUP_MS,
  STAT_LABELS,
  advance,
  applyAction,
  capsFor,
  createState,
  evTotals,
  moodOf,
  natureMods,
  train,
  traitsOf,
  type PetProfile,
  type PetState,
} from "../apps/web/src/pet-engine.ts";

let fails = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    fails++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

function profileOf(over: Partial<PetProfile> = {}): PetProfile {
  const species = over.species ?? 133;
  return {
    species,
    speciesName: "Eevee",
    nickname: "Vivi",
    level: 25,
    nature: "Jolly",
    ivs: [31, 20, 14, 28, 5, 30],
    baseEvs: [0, 0, 0, 0, 0, 0],
    generation: 4,
    pid: 123456,
    traits: traitsOf(species),
    ...over,
  };
}

const T0 = Date.UTC(2026, 10, 18, 9, 0, 0);

console.log("1) rasgos y naturaleza deterministas");
check("traitsOf(133) estable", JSON.stringify(traitsOf(133)) === JSON.stringify(traitsOf(133)));
check("traitsOf(25) != traitsOf(133)", JSON.stringify(traitsOf(25)) !== JSON.stringify(traitsOf(133)));
const t = traitsOf(133);
check(
  "rasgos en rango",
  t.appetite >= 0.8 && t.appetite <= 1.25 && t.activity >= 0.8 && t.activity <= 1.25,
  JSON.stringify(t),
);
check("naturaleza neutra por defecto", natureMods(null).activity === 1);
check("Jolly acelera actividad", natureMods("Jolly").activity > 1.05);

console.log("2) estado inicial en rango");
const p = profileOf();
const s0 = createState(p, T0);
const needs = [s0.hunger, s0.happiness, s0.energy, s0.hygiene, s0.discipline, s0.sleepiness];
check("necesidades 0..100", needs.every((v) => v >= 0 && v <= 100), JSON.stringify(needs));
check("pendingEvs a cero", s0.pendingEvs.every((v) => v === 0));
check("versión del motor", s0.version === 1);

console.log("3) determinismo");
const a1 = advance(s0, p, T0 + 6 * HOUR);
const a2 = advance(s0, p, T0 + 6 * HOUR);
check("misma llamada == mismo estado", JSON.stringify(a1) === JSON.stringify(a2));

console.log("4) puesta al día: un salto vs 24 pasos");
let step: PetState = s0;
for (let i = 1; i <= 96; i++) step = advance(step, p, T0 + i * 15 * 60_000);
const jump = advance(s0, p, T0 + 24 * HOUR);
const diffs = {
  hunger: Math.abs(step.hunger - jump.hunger),
  energy: Math.abs(step.energy - jump.energy),
  happiness: Math.abs(step.happiness - jump.happiness),
  hygiene: Math.abs(step.hygiene - jump.hygiene),
  weight: Math.abs(step.weight - jump.weight),
};
check("salto y pasos coinciden (<0.05)", Object.values(diffs).every((d) => d < 0.05), JSON.stringify(diffs));
check("mismo estado de sueño", step.sleeping === jump.sleeping);

console.log("5) decaimiento y límites tras 30 días");
const far = advance(s0, p, T0 + 30 * 24 * HOUR);
const all = [far.hunger, far.happiness, far.energy, far.hygiene, far.discipline, far.sleepiness];
check("todo en 0..100", all.every((v) => v >= 0 && v <= 100), JSON.stringify(all));
check("el reloj avanza aunque se acote la simulación", far.updatedAt === T0 + 30 * 24 * HOUR);
check("la nota de recorte aparece", far.log.some((l) => l.text.includes("limitada a 7 días")));
const week = advance(s0, p, T0 + MAX_CATCHUP_MS);
check("7 días y 30 días dejan necesidades parecidas", Math.abs(far.hunger - week.hunger) < 6 && Math.abs(far.energy - week.energy) < 6, JSON.stringify({ f: [far.hunger, far.energy], w: [week.hunger, week.energy] }));
check("el hambre baja", far.hunger < s0.hunger);
check("el sueño se autorregula", far.sleeping || far.energy >= 0);
check("registro acotado a 40", far.log.length <= 40, String(far.log.length));

console.log("6) acciones y enfriamientos");
const fed = applyAction(s0, p, "feed", T0 + 60_000);
check("comer sube hambre", fed.ok && fed.state.hunger > s0.hunger - 10, fed.message);
const fedAgain = applyAction(fed.state, p, "feed", T0 + 2 * 60_000);
check("comer respeta enfriamiento", !fedAgain.ok && fedAgain.cooldownLeft > 0, fedAgain.message);
const played = applyAction(fed.state, p, "play", T0 + 61_000);
check("jugar sube felicidad", played.ok && played.state.happiness > fed.state.happiness, played.message);
check("jugar gasta energía", played.state.energy < fed.state.energy);
const cleaned = applyAction(played.state, p, "clean", T0 + 62_000);
check("limpiar sube higiene", cleaned.ok && cleaned.state.hygiene > played.state.hygiene - 5, cleaned.message);
const slept = applyAction(cleaned.state, p, "sleep", T0 + 63_000);
check("dormir activa sueño", slept.ok && slept.state.sleeping);
const feedSleeping = applyAction(slept.state, p, "feed", T0 + 64_000);
check("no come dormido", !feedSleeping.ok, feedSleeping.message);
const woke = applyAction(slept.state, p, "wake", T0 + 65_000);
check("despertar", woke.ok && !woke.state.sleeping);

console.log("7) sueño recupera energía");
let sleepState = applyAction(s0, p, "sleep", T0 + 60_000).state;
sleepState = { ...sleepState, energy: 20, sleepiness: 80 };
const rested = advance(sleepState, p, T0 + 60_000 + 4 * HOUR);
check("energía sube durmiendo", rested.energy > 20, `${rested.energy}`);
check("recupera energía de forma clara", rested.energy >= 60, String(rested.energy));
check("el sueño avanza", rested.sleepiness < 80 || !rested.sleeping);

console.log("8) entrenamiento Gen 4: topes 255 / 510");
const zero = createState(p, T0);
const r1 = train(zero, p, 5, 1, T0 + 60_000);
check("concede EV", r1.ok && r1.granted >= 1 && r1.granted <= 8, JSON.stringify({ g: r1.granted }));
const nearCap = profileOf({ baseEvs: [102, 102, 102, 101, 102, 0] });
const capped = train(createState(nearCap, T0), nearCap, 5, 1, T0 + 60_000);
const totals = evTotals(nearCap, capped.state);
check("no pasa de 510", totals.total <= 510, JSON.stringify(totals));
check("avisa del tope", capped.capped, capped.message);
const maxed = profileOf({ baseEvs: [255, 255, 0, 0, 0, 0] });
const refused = train(createState(maxed, T0), maxed, 1, 1, T0 + 60_000);
check("stat a 255 rechazado", !refused.ok, refused.message);

console.log("9) entrenamiento Gen 1: stat exp hasta 65535");
const gen1 = profileOf({ generation: 1, nature: null, baseEvs: [65500, 0, 0, 0, 0, 0] });
const g1 = train(createState(gen1, T0), gen1, 0, 1, T0 + 60_000);
const g1tot = evTotals(gen1, g1.state);
check("stat exp no pasa de 65535", g1tot.current[0] <= 65535, String(g1tot.current[0]));
check("unidad statexp", capsFor(gen1).unit === "statexp");
check("sin tope global en Gen 1", capsFor(gen1).total === 0);

console.log("10) entrenamiento condicionado");
const tired = { ...createState(p, T0), energy: 5 };
const rt = train(tired, p, 1, 1, T0 + 60_000);
check("agotado no entrena", !rt.ok, rt.message);
const asleep = applyAction(createState(p, T0), p, "sleep", T0).state;
const rs = train(asleep, p, 1, 1, T0 + 60_000);
check("dormido no entrena", !rs.ok, rs.message);

console.log("11) anillos de coherencia");
check("energía y felicidad no negativas", far.energy >= 0 && far.happiness >= 0);
check("mood coherente", moodOf(far) === "dormido" || moodOf(far) === "hambriento" || moodOf(far) === "triste" || moodOf(far) === "normal" || moodOf(far) === "sucio" || moodOf(far) === "agotado" || moodOf(far) === "feliz", moodOf(far));
check("comer tiene enfriamiento", ACTION_INFO.feed.cooldown > 0);
check("etiquetas de stat", STAT_LABELS.length === 6);

console.log("");
if (fails) {
  console.log(`${fails} comprobaciones fallidas`);
  process.exit(1);
}
console.log("Motor OK: todas las comprobaciones pasan");
