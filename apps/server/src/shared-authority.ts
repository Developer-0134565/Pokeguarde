/**
 * PG-08C — Registro autoritativo LOCAL SIMULADO (D5) e identidad de prueba (D1).
 *
 * NO es un servicio desplegado: no escucha puertos, no expone API y no crea
 * cuentas. La autenticación de prueba usa un token HMAC con secreto en memoria
 * y queda explícitamente marcada como NO APTA PARA PRODUCCIÓN.
 *
 * D5: una única autoridad decide; cada agregado tiene una revisión lógica;
 * las revisiones obsoletas producen STALE_REVISION; nunca último escritor gana.
 * Las decisiones del dominio PG-08A NO se duplican: este módulo solo controla
 * identidad, idempotencia de comandos, revisión y persistencia atómica.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Database } from "bun:sqlite";
import type { OperationError } from "../../../packages/core/src/shared-nurseries.ts";
import {
  SharedEventQueue,
} from "./shared-event-queue.ts";
import {
  SharedNurseryStore,
  type AuthenticatedOwner,
  type StoreCommand,
  type StoreOperation,
  type StoreOutcome,
} from "./shared-store.ts";

export const AUTHORITY_SCHEMA_VERSION = 1 as const;
/** Validez arbitraria del token de prueba. NO es política de producto. */
export const TEST_TOKEN_TTL_MS = 60 * 60 * 1000;

const nowIso = (): string => new Date().toISOString();

// ---------------------------------------------------------------------------
// Identidad de prueba (D1)
// ---------------------------------------------------------------------------

export type TestToken = {
  readonly token: string;
  readonly ownerId: string;
  readonly issuedAt: string;
};

/**
 * ADVERTENCIA: solo para simulaciones locales. No crea cuentas, no guarda
 * claves privadas y no sustituye a un proveedor de identidad real.
 */
export class TestIdentityProvider {
  private readonly secret: Buffer;

  constructor(secret?: string) {
    this.secret = secret ? Buffer.from(secret, "utf8") : randomBytes(32);
  }

  issue(ownerId: string, at = nowIso()): TestToken {
    // El ISO contiene puntos: se firma el epoch en ms para que el token
    // tenga exactamente tres componentes separados por '.'.
    const stamp = String(Date.parse(at));
    const payload = `${ownerId}.${stamp}`;
    const signature = createHmac("sha256", this.secret).update(payload).digest("base64url");
    return { token: `${payload}.${signature}`, ownerId, issuedAt: at };
  }

  verify(token: string, at = nowIso()): AuthenticatedOwner | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [ownerId, stamp, signature] = parts;
    const issuedMs = Number(stamp);
    if (!Number.isInteger(issuedMs)) return null;
    const expected = createHmac("sha256", this.secret)
      .update(`${ownerId}.${stamp}`)
      .digest("base64url");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const age = Date.parse(at) - issuedMs;
    if (!Number.isFinite(age) || age < 0 || age > TEST_TOKEN_TTL_MS) return null;
    return { ownerId, verifiedAt: at };
  }
}

/** D1: un `ownerId` suelto NUNCA se acepta como prueba de identidad. */
export const isOwnerIdAlone = (value: unknown): boolean => typeof value === "string";

// ---------------------------------------------------------------------------
// Comandos y recibos
// ---------------------------------------------------------------------------

export type AuthorityCommand = {
  readonly commandId: string;
  readonly operation: StoreOperation;
  readonly input: Readonly<Record<string, unknown>>;
  readonly principal: TestToken;
  /** D5: revisión esperada del agregado. Si no se da, no se exige. */
  readonly expectedRevision?: number;
  readonly aggregateId?: string;
};

export type AuthorityReceipt = {
  readonly commandId: string;
  readonly operation: string;
  readonly ownerId: string;
  readonly accepted: boolean;
  readonly code: string | null;
  readonly eventIds: readonly string[];
  readonly revision: number;
  readonly completedAt: string;
};

export type AuthorityResult = {
  readonly ok: boolean;
  readonly code: string | null;
  readonly eventId: string | null;
  readonly eventIds: readonly string[];
  readonly revision: number;
  readonly duplicate: boolean;
  readonly receipt: AuthorityReceipt;
  readonly outcome: StoreOutcome | null;
};

class StaleRevisionSignal extends Error {
  constructor(readonly expected: number, readonly actual: number) {
    super(`PG-08C: STALE_REVISION (esperada ${expected}, actual ${actual})`);
  }
}

type CommandRow = { command_id: string; receipt_json: string; created_at: string };
type RevisionRow = { aggregate_id: string; revision: number; updated_at: string };

function migrate(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS authority_commands (
      command_id TEXT PRIMARY KEY,
      receipt_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS authority_revisions (
      aggregate_id TEXT PRIMARY KEY,
      revision INTEGER NOT NULL CHECK (revision >= 0),
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS authority_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  db.query("INSERT OR IGNORE INTO authority_meta (key, value) VALUES (?, ?)")
    .run("authority_schema_version", String(AUTHORITY_SCHEMA_VERSION));
  const row = db.query("SELECT value FROM authority_meta WHERE key = ?")
    .get("authority_schema_version") as { value: string } | undefined;
  if (row?.value !== String(AUTHORITY_SCHEMA_VERSION)) {
    throw new Error(`PG-08C: versión de autoridad incompatible (${row?.value ?? "ausente"})`);
  }
}

// ---------------------------------------------------------------------------
// Autoridad
// ---------------------------------------------------------------------------

export class SharedAuthority {
  private readonly db: Database;
  private closed = false;

  constructor(
    readonly store: SharedNurseryStore,
    readonly queue: SharedEventQueue,
    readonly identities: TestIdentityProvider = new TestIdentityProvider(),
  ) {
    this.db = new Database(store.databasePath, { create: true });
    this.db.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
    migrate(this.db);
  }

  /** Revisión lógica actual de un agregado (0 si no existe). */
  revisionOf(aggregateId: string): number {
    const row = this.db.query(
      "SELECT revision FROM authority_revisions WHERE aggregate_id = ?",
    ).get(aggregateId) as { revision: number } | undefined;
    return row?.revision ?? 0;
  }

  receiptOf(commandId: string): AuthorityReceipt | null {
    const row = this.db.query(
      "SELECT * FROM authority_commands WHERE command_id = ?",
    ).get(commandId) as CommandRow | undefined;
    return row ? JSON.parse(row.receipt_json) as AuthorityReceipt : null;
  }

  receipts(): readonly AuthorityReceipt[] {
    return (this.db.query("SELECT * FROM authority_commands ORDER BY created_at ASC").all() as CommandRow[])
      .map((r) => JSON.parse(r.receipt_json) as AuthorityReceipt);
  }

  revisions(): Readonly<Record<string, number>> {
    const rows = this.db.query("SELECT * FROM authority_revisions ORDER BY aggregate_id ASC").all() as RevisionRow[];
    return Object.fromEntries(rows.map((r) => [r.aggregate_id, r.revision]));
  }

  /**
   * Envía un comando a la autoridad. Confirmación SOLO tras COMMIT.
   * El efecto (recibo + revisión + outbox) comparte transacción con los
   * eventos del dominio gracias al gancho StoreSideEffect.
   */
  submit(command: AuthorityCommand): AuthorityResult {
    this.assertOpen();
    const verified = this.identities.verify(command.principal.token);
    if (!verified) {
      const receipt: AuthorityReceipt = {
        commandId: command.commandId,
        operation: command.operation,
        ownerId: "unauthenticated",
        accepted: false,
        code: "UNAUTHORIZED",
        eventIds: [],
        revision: 0,
        completedAt: nowIso(),
      };
      return {
        ok: false, code: "UNAUTHORIZED", eventId: null, eventIds: [],
        revision: 0, duplicate: false, receipt, outcome: null,
      };
    }

    const prior = this.receiptOf(command.commandId);
    if (prior) return this.fromReceipt(prior, true, null);

    const aggregateId = command.aggregateId ?? this.aggregateOf(command);
    const expectedRevision = command.expectedRevision;
    const input: Record<string, unknown> = { ...command.input };
    // El dominio valida claves estrictamente: solo estos dos aceptan revisión.
    if (expectedRevision !== undefined && command.operation === "acceptDeposit") {
      input.expectedNurseryRevision = expectedRevision;
    }
    if (expectedRevision !== undefined && command.operation === "grantPermission") {
      input.expectedRevision = expectedRevision;
    }
    const storeCommand: StoreCommand = {
      operation: command.operation,
      input,
      auth: verified,
    };

    let duplicate = false;
    let stored: AuthorityReceipt | null = null;
    try {
      const outcome = this.store.execute(storeCommand, ({ db, events, outcome }) => {
        // Re-chequeo DENTRO de la transacción: protege reintentos concurrentes.
        const existing = db.query(
          "SELECT receipt_json FROM authority_commands WHERE command_id = ?",
        ).get(command.commandId) as { receipt_json: string } | undefined;
        if (existing) {
          duplicate = true;
          stored = JSON.parse(existing.receipt_json) as AuthorityReceipt;
          throw new StaleRevisionSignal(-1, -1); // señal de reintento idempotente
        }
        const current = (db.query(
          "SELECT revision FROM authority_revisions WHERE aggregate_id = ?",
        ).get(aggregateId) as { revision: number } | undefined)?.revision ?? 0;
        if (expectedRevision !== undefined && expectedRevision !== current) {
          throw new StaleRevisionSignal(expectedRevision, current);
        }
        const nextRevision = current + (outcome.ok ? 1 : 0);
        stored = {
          commandId: command.commandId,
          operation: command.operation,
          ownerId: verified.ownerId,
          accepted: outcome.ok,
          code: outcome.ok ? null : outcome.error.code,
          eventIds: events.map((e) => e.eventId),
          revision: nextRevision,
          completedAt: nowIso(),
        };
        db.query(
          "INSERT INTO authority_commands (command_id, receipt_json, created_at) VALUES (?, ?, ?)",
        ).run(command.commandId, JSON.stringify(stored), stored.completedAt);
        if (outcome.ok) {
          db.query(`
            INSERT INTO authority_revisions (aggregate_id, revision, updated_at) VALUES (?, ?, ?)
            ON CONFLICT (aggregate_id) DO UPDATE SET revision = excluded.revision, updated_at = excluded.updated_at
          `).run(aggregateId, nextRevision, stored.completedAt);
        }
        this.queue.enqueueIn(db, events, command.commandId);
      });

      if (duplicate && stored) return this.fromReceipt(stored, true, null);
      if (!stored) throw new Error("PG-08C: la autoridad no registró el recibo");
      return this.fromReceipt(stored, false, outcome);
    } catch (error) {
      if (error instanceof StaleRevisionSignal) {
        if (error.expected === -1) {
          const found = this.receiptOf(command.commandId);
          if (found) return this.fromReceipt(found, true, null);
        }
        return this.staleResult(command, verified, expectedRevision ?? 0, error.actual);
      }
      throw error;
    }
  }

  /** Réplica local: solo lee, NUNCA ejecuta comandos. */
  replicaSystem(replicaId: string) {
    return this.queue.replicaSystem(replicaId);
  }

  private fromReceipt(
    receipt: AuthorityReceipt,
    duplicate: boolean,
    outcome: StoreOutcome | null,
  ): AuthorityResult {
    return {
      ok: receipt.accepted,
      code: receipt.code,
      eventId: receipt.eventIds.length ? receipt.eventIds[receipt.eventIds.length - 1]! : null,
      eventIds: receipt.eventIds,
      revision: receipt.revision,
      duplicate,
      receipt,
      outcome,
    };
  }

  private staleResult(
    command: AuthorityCommand,
    verified: AuthenticatedOwner,
    expected: number,
    actual: number,
  ): AuthorityResult {
    const error: OperationError = {
      code: "STALE_REVISION",
      message: `revisión obsoleta: esperada ${expected}, actual ${actual}`,
    };
    const receipt: AuthorityReceipt = {
      commandId: command.commandId,
      operation: command.operation,
      ownerId: verified.ownerId,
      accepted: false,
      code: "STALE_REVISION",
      eventIds: [],
      revision: actual,
      completedAt: nowIso(),
    };
    const outcome: StoreOutcome = { ok: false, error, inserted: false, sequence: actual };
    return {
      ok: false, code: "STALE_REVISION", eventId: null, eventIds: [],
      revision: actual, duplicate: false, receipt, outcome,
    };
  }

  private aggregateOf(command: AuthorityCommand): string {
    if (command.aggregateId) return command.aggregateId;
    const i = command.input;
    const reqId = i.requestId;
    if (command.operation === "acceptDeposit" || command.operation === "rejectDeposit") {
      if (typeof reqId === "string") {
        const request = this.store.getSystem().snapshot().requests.find((r) => r.id === reqId);
        if (request) return `nursery:${request.nurseryId}`;
      }
    }
    const id = i.nurseryId ?? i.stayId;
    if (typeof id === "string") return `${command.operation === "registerNursery" ? "nursery" : "stay"}:${id}`;
    if (typeof i.id === "string") return `owner:${i.id}`;
    return `op:${command.operation}:${createHash("sha256").update(command.commandId).digest("hex").slice(0, 12)}`;
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("PG-08C: la autoridad está cerrada");
  }

  close(): void {
    if (this.closed) return;
    this.db.close();
    this.closed = true;
  }
}

/** Firma corta y estable de un comando, útil como commandId determinista. */
export function commandIdOf(parts: readonly string[]): string {
  return `cmd:${createHash("sha256").update(parts.join("|")).digest("hex")}`;
}
