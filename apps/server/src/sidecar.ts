import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");
const SIDECAR_DIR = join(ROOT, "services", "pkhex");
const DLL = join(SIDECAR_DIR, "bin", "Release", "net10.0", "pkhex.dll");

export type SidecarResult<T> =
  | { ok: true; data: T; exitCode: number }
  | { ok: false; error: string; exitCode: number; stderr: string };

function dotnetPath(): string {
  const home = process.env.HOME ?? "";
  const local = join(home, ".dotnet", "dotnet");
  return existsSync(local) ? local : "dotnet";
}

async function run(args: string[]): Promise<SidecarResult<unknown>> {
  const useDll = existsSync(DLL);
  const cmd = useDll
    ? [dotnetPath(), DLL, ...args]
    : [dotnetPath(), "run", "--project", SIDECAR_DIR, "--", ...args];

  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0 && !stdout.trim()) {
    return { ok: false, error: stderr.trim() || `exit ${exitCode}`, exitCode, stderr };
  }
  try {
    return { ok: true, data: JSON.parse(stdout), exitCode };
  } catch {
    return {
      ok: false,
      error: "respuesta no JSON del sidecar",
      exitCode,
      stderr: stderr || stdout.slice(0, 400),
    };
  }
}

export async function inventory(path: string) {
  return run(["inventory", path]);
}

export async function inspect(path: string) {
  return run(["inspect", path]);
}

/** Resumen de bytes distintos entre la entrada y la salida (lo publica el sidecar). */
export type DiffSummary = {
  changedBytes: number;
  firstOffset: number | null;
  lastOffset: number | null;
  sizeDelta: number;
};

/** Un cambio del plan tal como lo informa el sidecar, con la relectura de PKHeX. */
export type ExportChange = {
  pid: number;
  species: number;
  mode: string;
  requested: number[];
  location?: string;
  box?: number | null;
  slot?: number;
  foundPid?: number;
  speciesName?: string;
  before?: number[];
  target?: number[];
  after?: number[];
  readBack?: number[];
  verdictBefore?: string;
  verdictAfter?: string;
  issuesAfter?: string[];
  /** true si PKHeX solo admitía EV de vitamina y se recortó. */
  capped?: boolean;
  /** Lo que quedó sin escribir por el recorte (por stat). */
  withheld?: number[];
  note?: string;
  worsened?: boolean;
  ok?: boolean;
  changed?: boolean;
  error?: string;
};

export type ExportReport = {
  file: string;
  path: string;
  dry: boolean;
  inputSize: number;
  inputSha256: string;
  detected: boolean;
  saveType?: string;
  generation?: number;
  version?: string;
  /** ¿El save reescribe idéntico byte a byte? Gen 3 y Gen 5 sí; Gen 1, 2 y 4 no. */
  roundTripIdentical?: boolean;
  /** Bytes que PKHeX corrige al reescribir (normalización), medidos sobre una copia clonada. */
  normalization?: DiffSummary;
  reason?: string;
  changes?: ExportChange[];
  anyWorsened?: boolean;
  anyChanged?: boolean;
  written?: boolean;
  outputSize?: number;
  outputSha256?: string;
  outputPath?: string | null;
  diff?: DiffSummary;
  note?: string;
  error?: string;
};

/**
 * Escribe el plan de entrenamiento sobre una copia del save. Sin `--dry` genera
 * un archivo nuevo; el sidecar aborta (exit 3) si la legalidad empeoraría.
 */
export async function exportPlan(
  savePath: string,
  planPath: string,
  opts: { out?: string; dry?: boolean; allowOverwrite?: boolean } = {},
): Promise<SidecarResult<ExportReport>> {
  const args = ["export", savePath, planPath];
  if (opts.out) args.push("--out", opts.out);
  if (opts.dry) args.push("--dry");
  if (opts.allowOverwrite) args.push("--allow-overwrite");
  return run(args) as Promise<SidecarResult<ExportReport>>;
}

export async function sidecarVersion(): Promise<string | null> {
  const proc = Bun.spawn([dotnetPath(), "--version"], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim() || null;
}
