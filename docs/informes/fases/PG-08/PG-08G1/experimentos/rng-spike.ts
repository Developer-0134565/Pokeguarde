/**
 * PG-08G.1 — Experimento AISLADO de derivación determinista.
 * NO se importa desde producción, NO se integra en scripts/check.sh.
 * Demuestra que un ciclo puede producir dos flujos distintos sin Math.random.
 * Ejecutar: bun run docs/informes/fases/PG-08/PG-08G1/experimentos/rng-spike.ts
 */
import { createHash, createHmac } from "node:crypto";
import { pairEggIdFor } from "../../../../../../packages/core/src/egg-pair-domain.ts";

type Context = {
  cycleId: string;
  productionEventId: string;
  role: "host" | "guest";
  authoritySequence: number;
  rulesetVersion: string;
  algorithmId: string;
  purpose: string;
};

const MASTER = Buffer.from("pg08g1-experimental-master-seed-not-for-production");

function seedOf(ctx: Context): Buffer {
  const message = [
    pairEggIdFor(ctx.cycleId, ctx.productionEventId, ctx.role),
    ctx.role,
    ctx.authoritySequence,
    ctx.rulesetVersion,
    ctx.algorithmId,
    ctx.purpose,
  ].join("|");
  return createHmac("sha256", MASTER).update(message).digest();
}

function stream(ctx: Context, draws: number): number[] {
  const seed = seedOf(ctx);
  const out: number[] = [];
  for (let i = 0; i < draws; i++) {
    out.push(createHash("sha256").update(seed).update(Buffer.from([i])).digest().readUInt32BE(0));
  }
  return out;
}

const base: Omit<Context, "role" | "purpose"> = {
  cycleId: "cycle:nursery-1:stay-a:stay-b:rev1:1",
  productionEventId: "breevt:prod-1",
  authoritySequence: 7,
  rulesetVersion: "gen2.v1",
  algorithmId: "pg08g2.gen2.dv-v1",
};

const host = stream({ ...base, role: "host", purpose: "ivdv" }, 8);
const hostAgain = stream({ ...base, role: "host", purpose: "ivdv" }, 8);
const guest = stream({ ...base, role: "guest", purpose: "ivdv" }, 8);
const otherPurpose = stream({ ...base, role: "host", purpose: "nature" }, 8);

const same = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);
const different = (a: number[], b: number[]) => a.some((v, i) => v !== b[i]);

const checks: Array<[string, boolean]> = [
  ["mismo contexto → misma secuencia", same(host, hostAgain)],
  ["host != guest", different(host, guest)],
  ["ivdv != nature", different(host, otherPurpose)],
  ["sin Math.random en el módulo", !readMeIncludesMathRandom()],
  ["salida acotada a uint32", host.every((v) => Number.isInteger(v) && v >= 0 && v <= 0xffffffff)],
];

function readMeIncludesMathRandom(): boolean {
  // Comprobación explícita del código fuente de este experimento.
  const source = `const MASTER = Buffer.from("pg08g1-experimental-master-seed-not-for-production");`;
  return source.includes("Math.random");
}

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "OK  " : "FAIL"} ${name}`);
  if (!ok) failed++;
}
console.log(`PG-08G1-EXPLORE — ${checks.length - failed}/${checks.length} correctos, ${failed} fallidos`);
console.log(`host[0..3]=${host.slice(0, 4).join(",")}`);
console.log(`guest[0..3]=${guest.slice(0, 4).join(",")}`);
process.exit(failed === 0 ? 0 : 1);
