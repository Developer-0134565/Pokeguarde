/**
 * PG-08G.2 — Experimento AISLADO de RNG determinista (v2).
 * NO se importa desde producción, NO se integra en scripts/check.sh.
 * Ejecutar: bun run docs/informes/fases/PG-08/PG-08G2/experimentos/rng-v2-spike.ts
 *
 * Demuestra las propiedades exigidas al RandomnessPort de la arquitectura v2:
 * determinismo por contexto, separación de dominios, reanudación por cursor y
 * ausencia de fuentes de azar o de reloj no inyectadas en la lógica.
 */
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

type Purpose = "species" | "gender" | "ivdv" | "nature" | "ability" | "shiny" | "moves";

type DerivationContext = {
  cycleId: string;
  productionEventId: string;
  eggId: string;
  recipientRole: "host" | "guest";
  authoritySequence: number;
  rulesetVersion: string;
  algorithmId: string;
  purpose: Purpose;
};

/** Codificación canónica: orden fijo, separador imposible en los campos. */
function encodeContext(ctx: DerivationContext): string {
  return [
    ctx.cycleId,
    ctx.productionEventId,
    ctx.eggId,
    ctx.recipientRole,
    String(ctx.authoritySequence),
    ctx.rulesetVersion,
    ctx.algorithmId,
    ctx.purpose,
  ].join("\u0000");
}

function deriveSeed(masterSeed: Buffer, ctx: DerivationContext): Buffer {
  return createHmac("sha256", masterSeed).update(encodeContext(ctx), "utf8").digest();
}

function seedRef(seed: Buffer): string {
  // Referencia pública: hash de la semilla derivada. No permite reconstruirla.
  return createHash("sha256").update(Buffer.concat([Buffer.from("pg08g2.seedref"), seed])).digest("hex");
}

class Stream {
  private cursor = 0;
  constructor(private readonly seed: Buffer) {}

  int(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new Error("RANGE_INVALID");
    // Rechazo de módulo para evitar sesgo.
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    for (;;) {
      const block = createHash("sha256")
        .update(this.seed)
        .update(Buffer.from([(this.cursor >>> 24) & 0xff, (this.cursor >>> 16) & 0xff, (this.cursor >>> 8) & 0xff, this.cursor & 0xff]))
        .digest();
      this.cursor += 1;
      const value = block.readUInt32BE(0);
      if (value < limit) return value % maxExclusive;
    }
  }

  pick(length: number): number {
    return this.int(length);
  }

  snapshot(): { cursor: number; seedRef: string } {
    return { cursor: this.cursor, seedRef: seedRef(this.seed) };
  }

  static resume(seed: Buffer, snapshot: { cursor: number; seedRef: string }): Stream {
    if (snapshot.seedRef !== seedRef(seed)) throw new Error("SEED_MISMATCH");
    const s = new Stream(seed);
    s.cursor = snapshot.cursor;
    return s;
  }
}

const MASTER = Buffer.from("pg08g2-experimental-master-seed-not-for-production");
const base: DerivationContext = {
  cycleId: "cycle:nursery-1:stay-a:stay-b:rev1:1",
  productionEventId: "breevt:prod-1",
  eggId: "egg:pair:host:1",
  recipientRole: "host",
  authoritySequence: 7,
  rulesetVersion: "gen2.v1",
  algorithmId: "pg08g2.gen2.dv-v1",
  purpose: "ivdv",
};

const streamOf = (ctx: DerivationContext) => new Stream(deriveSeed(MASTER, ctx));
const draws = (ctx: DerivationContext, n: number) => {
  const s = streamOf(ctx);
  return Array.from({ length: n }, () => s.int(0x100000000));
};
const same = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((v, i) => v === b[i]);

// 1..5: determinismo y separación de dominios
const a1 = draws(base, 8);
const a2 = draws({ ...base }, 8);
const guest = draws({ ...base, eggId: "egg:pair:guest:1", recipientRole: "guest" }, 8);
const nature = draws({ ...base, purpose: "nature" }, 8);
const ruleset = draws({ ...base, rulesetVersion: "gen2.v2" }, 8);
const algorithm = draws({ ...base, algorithmId: "pg08g2.gen2.dv-v2" }, 8);
const cycle = draws({ ...base, cycleId: "cycle:nursery-1:stay-a:stay-b:rev1:2" }, 8);

// 6: reanudación por cursor
const full = streamOf(base);
const first = [full.int(1000), full.int(1000), full.int(1000)];
const snap = full.snapshot();
const restDirect = [full.int(1000), full.int(1000)];
const resumed = Stream.resume(deriveSeed(MASTER, base), snap);
const restResumed = [resumed.int(1000), resumed.int(1000)];

// 7: rangos
const bounded = streamOf({ ...base, purpose: "gender" });
const intsOk = Array.from({ length: 5000 }, () => bounded.int(6)).every((v) => v >= 0 && v < 6);
const picksOk = Array.from({ length: 5000 }, () => streamOf({ ...base, purpose: "nature" }).pick(25)).every(
  (v) => v >= 0 && v < 25,
);

// 8: la semilla maestra no aparece en la referencia pública
const ref = seedRef(deriveSeed(MASTER, base));
const refIsOpaque = ref.length === 64 && !ref.includes(MASTER.toString("hex").slice(0, 16));

// 9: idempotencia de la resolución completa
const resolveOnce = () => JSON.stringify({ seedRef: seedRef(deriveSeed(MASTER, base)), draws: a1 });
const idempotent = resolveOnce() === resolveOnce();

// 10: el propio módulo no usa Math.random ni Date.now
const self = readFileSync(new URL(import.meta.url), "utf8");
const sourceClean =
  !self.includes("Math" + ".random(") && !self.includes("Date" + ".now(");

const checks: Array<[string, boolean]> = [
  ["mismo contexto → misma secuencia", same(a1, a2)],
  ["host != guest (mismo ciclo, distinto huevo)", !same(a1, guest)],
  ["purpose separa canales", !same(a1, nature)],
  ["rulesetVersion separa versiones de reglas", !same(a1, ruleset)],
  ["algorithmId separa algoritmos", !same(a1, algorithm)],
  ["cycleId separa ciclos", !same(a1, cycle)],
  ["reanudar por cursor continúa la secuencia", same(restDirect, restResumed)],
  ["int(6) dentro de rango", intsOk],
  ["pick(25) dentro de rango", picksOk],
  ["seedRef opaco (64 hex, no expone la maestra)", refIsOpaque],
  ["resolución idempotente", idempotent],
  ["sin Math.random ni Date.now en el módulo", sourceClean],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "OK  " : "FAIL"} ${name}`);
  if (!ok) failed++;
}
console.log(`PG-08G2-RNG — ${checks.length - failed}/${checks.length} correctos, ${failed} fallidos`);
console.log(`host[0..3]=${a1.slice(0, 4).join(",")}`);
console.log(`guest[0..3]=${guest.slice(0, 4).join(",")}`);
console.log(`seedRef=${ref}`);
process.exit(failed === 0 ? 0 : 1);
