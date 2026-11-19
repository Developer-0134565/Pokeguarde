// Comprobación headless de PG-07F: contrato completo de Cajas de PC.
// No arranca el servidor, no abre SQLite y no escribe en partidas ni fixtures.
// Ejecutar: bun run scripts/pg07f-check.ts
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT_EN, DICT_ES, has } from "../apps/web/src/i18n.ts";

const root = join(import.meta.dir, "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const digest = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
const sha = (rel: string) => digest(readFileSync(join(root, rel)));

let fails = 0;
let passed = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    fails++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

const main = read("apps/web/src/main.ts");
const css = read("apps/web/src/style.css");
const i18n = read("apps/web/src/i18n.ts");
const serverIndex = read("apps/server/src/index.ts");
const sidecar = read("services/pkhex/Program.cs");

console.log("PG-07F — CONTRATO COMPLETO DE CAJAS DE PC");

// 1. Helpers puros, extraídos tal como los usa el navegador.
const markerStart = "/* PG-07E:pc-helpers:start */";
const markerEnd = "/* PG-07E:pc-helpers:end */";
const start = main.indexOf(markerStart);
const end = main.indexOf(markerEnd);
check("bloque de helpers presente", start >= 0 && end > start);
const helpers = new Function(
  `${main.slice(start, end + markerEnd.length)}
   return { PC_FILTERS, PC_STATUS_TEXT, pcBoxes, pcBoxByIndex, pcStorage, pcStatusKey, pcPositive,
     pcCapacity, pcBoxCount, pcSlotCount, pcSlotList, pcPositions, pcNameKnown, pcOccupiedCount,
     pcEmptyCount, pcRefOf, pcVerdictOf, pcText, pcNorm, pcMatches, pcCounts, pcNav,
     pcSelectionValid, pcFocusSlot };`,
)() as {
  PC_FILTERS: string[];
  PC_STATUS_TEXT: Record<string, string>;
  pcBoxes: (inv: any) => any[];
  pcBoxByIndex: (inv: any, index: number | null) => any;
  pcStorage: (inv: any) => any;
  pcStatusKey: (inv: any) => string;
  pcPositive: (value: unknown) => number | null;
  pcCapacity: (box: any) => number | null;
  pcBoxCount: (inv: any) => number;
  pcSlotCount: (inv: any) => number | null;
  pcSlotList: (box: any) => any[];
  pcPositions: (box: any) => any[];
  pcNameKnown: (box: any) => boolean;
  pcOccupiedCount: (box: any) => number;
  pcEmptyCount: (box: any) => number | null;
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

// 2. Compatibilidad del contrato anterior (PG-07E).
const legacy = {
  boxes: [{
    index: 2,
    name: "BOX2",
    slots: [
      { pid: 1, slot: 15, speciesName: "JYNX", nickname: "Jynx", legal: true },
      { pid: 2, slot: 3, speciesName: "ABRA", nickname: "Abra", legal: false },
    ],
  }],
};
const legacySlots = helpers.pcSlotList(legacy.boxes[0]);
check("sin inventario no hay cajas", helpers.pcBoxes(null).length === 0 && helpers.pcBoxes({ boxes: null }).length === 0);
check("contrato anterior sin storage", helpers.pcStorage(legacy) === null && helpers.pcStatusKey(legacy) === "box.storage.legacy");
check("legacy conserva huecos en su posición", legacySlots.length === 15 && legacySlots[0] === null && legacySlots[2].pid === 2 && legacySlots[14].pid === 1);
check("legacy no inventa capacidad", helpers.pcCapacity(legacy.boxes[0]) === null && helpers.pcEmptyCount(legacy.boxes[0]) === null);
check("legacy mantiene identidad por ranura", helpers.pcRefOf(legacy.boxes[0], 15)?.p.pid === 1 && helpers.pcRefOf(legacy.boxes[0], 1) === null);
check("legacy usa posiciones derivadas", JSON.stringify(helpers.pcPositions(legacy.boxes[0]).map((p) => (p ? p.pid : null))) === JSON.stringify(legacySlots.map((p) => (p ? p.pid : null))));
check("filtros PG-07E intactos", JSON.stringify(helpers.PC_FILTERS) === JSON.stringify(["all", "legal", "unverified", "illegal"]));

// 3. Contrato ampliado: metadatos, ranuras reales y estados.
const occupiedA = { pid: 11, slot: 1, speciesName: "MANAPHY", nickname: "Mana", legal: true, verdict: "legal" };
const occupiedB = { pid: 12, slot: 3, speciesName: "ABRA", nickname: "Abra", legal: false, verdict: "illegal" };
const extended = {
  storage: {
    available: true,
    availability: "available",
    boxCount: 3,
    boxCountSource: "SaveFile.BoxCount",
    slotCount: 4,
    slotCountSource: "SaveFile.BoxSlotCount",
    boxDataSlots: 12,
    namesAvailable: true,
    emptySlotsKnown: true,
    error: null,
  },
  boxes: [
    {
      index: 1,
      name: "CAJA 1",
      nameAvailable: true,
      capacity: 4,
      occupied: 2,
      empty: 2,
      positions: [
        { slot: 1, occupied: true, ref: { location: "box", box: 1, slot: 1 }, pokemon: occupiedA },
        { slot: 2, occupied: false, ref: { location: "box", box: 1, slot: 2 } },
        { slot: 3, occupied: true, ref: { location: "box", box: 1, slot: 3 }, pokemon: occupiedB },
        { slot: 4, occupied: false, ref: { location: "box", box: 1, slot: 4 } },
      ],
      slots: [occupiedA, occupiedB],
    },
    {
      index: 3,
      name: "",
      nameAvailable: true,
      capacity: 4,
      occupied: 0,
      empty: 4,
      positions: [1, 2, 3, 4].map((slot) => ({ slot, occupied: false, ref: { location: "box", box: 3, slot } })),
      slots: [],
    },
    {
      index: 5,
      name: "",
      nameAvailable: false,
      capacity: 4,
      occupied: 1,
      empty: 3,
      positions: [1, 2, 3, 4].map((slot) => ({
        slot,
        occupied: slot === 2,
        ref: { location: "box", box: 5, slot },
        ...(slot === 2 ? { pokemon: { ...occupiedA, pid: 13, slot: 2 } } : {}),
      })),
      slots: [{ ...occupiedA, pid: 13, slot: 2 }],
    },
  ],
};
check("storage reconocido", helpers.pcStorage(extended)?.availability === "available" && helpers.pcStatusKey(extended) === "box.storage.available");
check("boxCount y slotCount reales", helpers.pcBoxCount(extended) === 3 && helpers.pcSlotCount(extended) === 4 && helpers.pcCapacity(extended.boxes[0]) === 4);
check("índices originales no consecutivos", extended.boxes.map((b: any) => b.index).join(",") === "1,3,5" && extended.boxes.map((b: any) => b.index).every((n: number) => Number.isInteger(n)));
check("posiciones reales conservan huecos", helpers.pcPositions(extended.boxes[0]).length === 4 && helpers.pcPositions(extended.boxes[0])[1] === null && helpers.pcPositions(extended.boxes[0])[2]?.pid === 12);
check("caja vacía expone todas sus ranuras", helpers.pcPositions(extended.boxes[1]).length === 4 && helpers.pcOccupiedCount(extended.boxes[1]) === 0 && helpers.pcEmptyCount(extended.boxes[1]) === 4);
check("caja llena y nombres", helpers.pcNameKnown(extended.boxes[0]) === true && helpers.pcNameKnown(extended.boxes[2]) === false && helpers.pcOccupiedCount(extended.boxes[2]) === 1);
check("conteos declamados y derivados coinciden", helpers.pcOccupiedCount(extended.boxes[0]) === extended.boxes[0].slots.length && helpers.pcEmptyCount(extended.boxes[0]) === 2);
check("selección por ranura real", helpers.pcRefOf(extended.boxes[0], 3)?.p.pid === 12 && helpers.pcRefOf(extended.boxes[0], 2) === null && helpers.pcSelectionValid(extended, 1, 3));
const counts = helpers.pcCounts(extended.boxes[0]);
check("verdicts por posición", counts.legal === 1 && counts.illegal === 1 && counts.unverified === 0);
check("búsqueda no compacta posiciones", helpers.pcPositions(extended.boxes[0]).length === 4 && helpers.pcFocusSlot(extended.boxes[0], "illegal", "abra") === 3 && helpers.pcMatches(occupiedB, "legal", "") === false);
check("navegación PG-07E intacta", helpers.pcNav(3, "ArrowUp", 8, 4) === 3 - 4 || helpers.pcNav(3, "ArrowUp", 8, 4) === 0);
check("valores positivos no convierten desconocido en cero", helpers.pcPositive(null) === null && helpers.pcPositive(0) === null && helpers.pcPositive("30") === 30);

const incomplete = {
  storage: { available: false, availability: "partial", boxCount: 1, slotCount: null, boxDataSlots: 2, namesAvailable: false, emptySlotsKnown: false, error: null },
  boxes: [{ index: 1, name: "", nameAvailable: false, capacity: null, occupied: undefined, empty: null, slots: [{ pid: 9, slot: 2, speciesName: "RATTATA", legal: true }] }],
};
check("datos incompletos: estado explícito", helpers.pcStatusKey(incomplete) === "box.storage.partial" && helpers.pcCapacity(incomplete.boxes[0]) === null && helpers.pcEmptyCount(incomplete.boxes[0]) === null);
check("datos incompletos: fallback sin compactar", helpers.pcPositions(incomplete.boxes[0]).length === 2 && helpers.pcPositions(incomplete.boxes[0])[0] === null && helpers.pcRefOf(incomplete.boxes[0], 2)?.p.pid === 9);
const noStorage = { storage: { available: false, availability: "unavailable", boxCount: null, slotCount: null, boxDataSlots: 0 }, boxes: [] };
check("almacenamiento no disponible", helpers.pcBoxes(noStorage).length === 0 && helpers.pcBoxCount(noStorage) === 0 && helpers.pcStatusKey(noStorage) === "box.storage.unavailable");
check("error del sidecar se distingue", helpers.pcStatusKey({ storage: { availability: "error" } }) === "box.storage.error");
check("sin partida cargada degrada sin cajas", helpers.pcBoxes(null).length === 0 && helpers.pcStorage(null) === null && helpers.pcBoxCount(null) === 0);

// 4. Integración frontend, i18n y CSS.
const mainRequired = [
  "function pcStorage(", "function pcPositions(", "function pcNameKnown(", "function pcOccupiedCount(",
  "function pcEmptyCount(", "function pcStatusKey(", "const list = pcPositions(box);",
  "const matching = pcPositions(box).filter(", 't("box.capacity"', 't("box.occupiedEmpty"',
  't("box.nameUnknown")', "t(pcStatusKey(inv))", 'data-filter="${f}"',
  'class="pc-slot${selected ? " selected" : ""}${matched ? "" : " filtered"}"',
  'id="pc-grid"', 'id="pc-open"', 'dossierReturn = "boxes";',
];
const missingMain = mainRequired.filter((s) => !main.includes(s));
check("frontend usa el contrato ampliado sin romper PG-07E", missingMain.length === 0, missingMain.join(" | "));
check("capacidad desconocida sigue declarándose", main.includes('t("box.capacityUnknown")') && /Ranuras observadas/.test(i18n));
check("índices originales en cabecera y ranuras", main.includes('t("box.index", { n: box.index })') && main.includes('t("box.slot", { n: ref.slot })'));
check("sin cajas inventadas en el frontend", !/Array\.from\(\s*\{\s*length:\s*24|for\s*\(.*<\s*24/.test(main));

const requiredI18n = [
  "box.storage.available", "box.storage.partial", "box.storage.unavailable", "box.storage.error",
  "box.storage.legacy", "box.totalBoxes", "box.slotCount", "box.capacity", "box.occupiedEmpty", "box.nameUnknown",
];
const missingI18n = requiredI18n.filter((k) => !has(k, "es") || !has(k, "en"));
check("i18n ES/EN completo", missingI18n.length === 0, missingI18n.join(", "));
const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const badParams = requiredI18n.filter((k) => params(DICT_ES[k]) !== params(DICT_EN[k]));
check("parámetros ES/EN equivalentes", badParams.length === 0, badParams.join(", "));
check("CSS del estado de almacenamiento", /\.pc-storage\b/.test(css) && /\.pc-grid\b/.test(css));

// 5. Backend y sidecar: transporte aditivo, sin esquema ni escrituras nuevas.
const backendRequired = ["type BoxPosition", "type BoxContract", "type StorageContract", "boxes: BoxContract[]", "storage?: StorageContract | null", "boxError?: string", "positions?: BoxPosition[]", "JSON.stringify(inv)"];
const missingBackend = backendRequired.filter((s) => !serverIndex.includes(s));
check("backend transporta metadatos sin tocar persistencia", missingBackend.length === 0, missingBackend.join(" | "));
const sourceStart = sidecar.indexOf("/* PG-07F:storage-contract:start */");
const sourceEnd = sidecar.indexOf("/* PG-07F:storage-contract:end */");
check("bloque de almacenamiento localizado", sourceStart >= 0 && sourceEnd > sourceStart);
const storageBlock = sidecar.slice(sourceStart, sourceEnd);
check("lectura de almacenamiento sin escrituras", !/(File\.Write|WriteAll|WriteText|SetBoxSlot|SetBoxData|RefreshChecksum|export)/i.test(storageBlock));
check("APIs reales de PKHeX.Core", /isav\.HasBox/.test(storageBlock) && /isav\.BoxCount/.test(storageBlock) && /isav\.BoxSlotCount/.test(storageBlock) && /isav\.BoxData\.ToArray\(\)/.test(storageBlock) && /"GetBoxName"/.test(storageBlock));
check("desconocidos publicados como null", /\["boxCount"\] = null/.test(storageBlock) && /\["capacity"\] = per > 0 \? per : null/.test(storageBlock));
check("dependencia PKHeX.Core intacta", sha("services/pkhex/pkhex.csproj") === "b9abdb854c71bcddde1e72dad6342709aa1370e27f62a8c1d4a605ccd693a03d");

// 6. Fixtures reales: una generación solo se declara cubierta si hay evidencia.
const dll = join(root, "services/pkhex/bin/Release/net10.0/pkhex.dll");
const home = process.env.HOME ?? "";
const dotnet = existsSync(join(home, ".dotnet/dotnet")) ? join(home, ".dotnet/dotnet") : "dotnet";
check("DLL del sidecar disponible", existsSync(dll));

async function inventoryOf(rel: string): Promise<any> {
  const proc = Bun.spawn({
    cmd: [dotnet, dll, "inventory", join(root, rel)],
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  await new Response(proc.stderr).text();
  await proc.exited;
  return JSON.parse(stdout);
}

type FixtureCase = {
  file: string;
  generation: number;
  boxCount: number;
  slotCount: number;
  boxDataSlots: number;
  occupied: number[];
  firstName: string;
  total: number;
};
const fixtures: FixtureCase[] = [
  { file: "fixtures/gen1-blue-usa.srm", generation: 1, boxCount: 12, slotCount: 20, boxDataSlots: 240, occupied: Array(12).fill(0), firstName: "Box 1", total: 5 },
  { file: "fixtures/gen1-blue-spain.srm", generation: 1, boxCount: 12, slotCount: 20, boxDataSlots: 240, occupied: Array(12).fill(0), firstName: "Box 1", total: 1 },
  { file: "fixtures/gen2-crystalclear-hack.srm", generation: 2, boxCount: 14, slotCount: 20, boxDataSlots: 280, occupied: [16, ...Array(13).fill(0)], firstName: "BOX1", total: 22 },
  { file: "fixtures/gen3-allin-hack.srm", generation: 3, boxCount: 14, slotCount: 30, boxDataSlots: 420, occupied: [1, ...Array(13).fill(0)], firstName: "BOX1", total: 4 },
  { file: "fixtures/gen4-heartgold-spain.srm", generation: 4, boxCount: 18, slotCount: 30, boxDataSlots: 540, occupied: [29, 15, 5, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 21], firstName: "CAJA 1", total: 105 },
  { file: "fixtures/gen5-black-usa.srm", generation: 5, boxCount: 24, slotCount: 30, boxDataSlots: 720, occupied: [3, ...Array(23).fill(0)], firstName: "CAJA 1", total: 8 },
];
const hashesBefore = new Map(fixtures.map((c) => [c.file, sha(c.file)]));
const dbBefore = sha("data/pokegotchi.db");
const parsed: Record<string, any> = {};
for (const c of fixtures) {
  const inv = await inventoryOf(c.file);
  parsed[c.file] = inv;
  const tag = `Gen ${c.generation} ${c.file.split("/").pop()}`;
  check(`${tag}: detectado`, inv.detected === true && inv.generation === c.generation);
  check(`${tag}: storage disponible`, inv.storage?.availability === "available" && inv.storage?.available === true);
  check(`${tag}: boxCount real`, inv.storage?.boxCount === c.boxCount && inv.storage?.boxCountSource === "SaveFile.BoxCount");
  check(`${tag}: capacidad real por formato`, inv.storage?.slotCount === c.slotCount && inv.storage?.slotCountSource === "SaveFile.BoxSlotCount" && inv.storage?.boxDataSlots === c.boxDataSlots);
  check(`${tag}: todas las cajas, incluidas vacías`, inv.boxes?.length === c.boxCount && helpers.pcBoxCount(inv) === c.boxCount);
  check(`${tag}: nombres reales`, inv.boxes?.[0]?.name === c.firstName && inv.storage?.namesAvailable === true);
  check(`${tag}: índices originales`, inv.boxes?.every((b: any, i: number) => b.index === i + 1 && b.capacity === c.slotCount));
  check(`${tag}: posiciones reales`, inv.boxes?.every((b: any) => b.positions?.length === c.slotCount && b.positions?.every((p: any, j: number) => p.slot === j + 1 && p.ref?.box === b.index && p.ref?.slot === j + 1)));
  check(`${tag}: ocupación real`, JSON.stringify(inv.boxes?.map((b: any) => b.occupied)) === JSON.stringify(c.occupied));
  check(`${tag}: vacías y ocupadas coherentes`, inv.boxes?.every((b: any) => b.empty === c.slotCount - b.occupied && b.slots.length === b.occupied));
  check(`${tag}: orden original conservado`, inv.boxes?.every((b: any) => b.slots.every((p: any, j: number) => p.slot === b.positions[p.slot - 1].slot && p.box === b.index)));
  check(`${tag}: total de legalidad intacto`, inv.counts?.total === c.total && inv.counts.total === inv.party.length + inv.boxes.reduce((n: number, b: any) => n + b.occupied, 0));
  check(`${tag}: sin sprite no se fabrica`, inv.boxes?.every((b: any) => b.slots.every((p: any) => p.species > 0)));
}
check("cambio de partida sin estado obsoleto", helpers.pcBoxCount(parsed["fixtures/gen1-blue-usa.srm"]) === 12 && helpers.pcBoxCount(parsed["fixtures/gen5-black-usa.srm"]) === 24);
check("caja totalmente vacía navegable", parsed["fixtures/gen1-blue-usa.srm"].boxes.every((b: any) => b.occupied === 0 && b.empty === 20 && b.positions.length === 20));
check("caja parcialmente ocupada", parsed["fixtures/gen4-heartgold-spain.srm"].boxes[3].occupied === 0 && parsed["fixtures/gen4-heartgold-spain.srm"].boxes[16].occupied === 18);
check("caja completa no se inventa", parsed["fixtures/gen4-heartgold-spain.srm"].boxes.every((b: any) => b.occupied < b.capacity));
check("nombres singulares de Gen IV", parsed["fixtures/gen4-heartgold-spain.srm"].boxes[16].name === "Eventos" && parsed["fixtures/gen4-heartgold-spain.srm"].boxes[17].name === "BELLEZA");

const invalid = await inventoryOf("fixtures/gen2-polished-hack.srm");
check("partida inválida: sin cajas inventadas", invalid.detected === false && invalid.boxes === undefined && invalid.storage === undefined);

// 7. Protección de datos.
for (const c of fixtures) check(`fixture sin escribir ${c.file.split("/").pop()}`, sha(c.file) === hashesBefore.get(c.file));
check("SQLite sin cambios", sha("data/pokegotchi.db") === dbBefore);
check("pet-engine sin cambios", sha("apps/web/src/pet-engine.ts") === "26955014098ea15f36b21a8a0e714fcccf4183a8e0988cbea801abf9cfd096bb");
check("fondo canónico sin cambios", sha("apps/web/assets/room/guarderia.png") === "bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095");

console.log(`\n${fails === 0 ? `PG-07F OK: ${passed} comprobaciones correctas.` : `${fails} fallo(s).`}`);
process.exit(fails === 0 ? 0 : 1);
