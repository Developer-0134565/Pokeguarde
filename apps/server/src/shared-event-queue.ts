/**
 * PG-08C — Cola duradera (transactional outbox) y réplicas locales simuladas.
 *
 * D7: secuencia monotónica, IDs únicos, persistencia antes de confirmar,
 * reintentos seguros, detección de huecos y sincronización al reabrir.
 *
 *Esta capa NO es un servidor, NO abre puertos y NO es autoridad: las réplicas
 * solo leen eventos ya confirmados por el registro simulado (shared-authority).
 * Se usa la MISMA base aislada de PG-08B; nunca data/pokegotchi.db.
 *
 * Sin dependencias nuevas: bun:sqlite y módulos estándar.
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  createNurserySystem,
  type NurserySystem,
  type SyncEvent,
} from "../../../packages/core/src/shared-nurseries.ts";
import type { StoreSideEffect } from "./shared-store.ts";

export const OUTBOX_SCHEMA_VERSION = 1 as const;
export const MESSAGE_STATUSES = ["pending", "delivered", "acked", "failed"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export type OutboxMessage = {
  readonly messageId: string;
  readonly eventId: string;
  readonly aggregateId: string;
  readonly aggregateSequence: number;
  readonly globalSequence: number;
  readonly eventType: string;
  readonly commandId: string;
  readonly status: MessageStatus;
  readonly attempts: number;
  readonly lastError: string | null;
  readonly createdAt: string;
  readonly deliveredAt: string | null;
  readonly ackedAt: string | null;
};

export type ReplicaCursor = {
  readonly replicaId: string;
  readonly lastSequence: number;
  readonly appliedIds: readonly string[];
  readonly gaps: readonly number[];
};

export type SyncReport = {
  readonly replicaId: string;
  readonly applied: number;
  readonly duplicates: number;
  readonly outOfOrder: number;
  readonly gaps: readonly number[];
  readonly cursor: number;
};

export type ReconcileReport = {
  readonly recovered: number;
  readonly alreadyPresent: number;
};

type MessageRow = {
  message_id: string;
  event_id: string;
  aggregate_id: string;
  aggregate_sequence: number;
  global_sequence: number;
  event_type: string;
  command_id: string;
  status: MessageStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  delivered_at: string | null;
  acked_at: string | null;
  event_json: string;
};

type ReplicaRow = {
  replica_id: string;
  last_sequence: number;
  applied_event_ids_json: string;
  gaps_json: string;
  updated_at: string;
};

const nowIso = (): string => new Date().toISOString();
const messageIdOf = (eventId: string): string =>
  `msg:${createHash("sha256").update(eventId).digest("hex")}`;

function parseJson<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`PG-08C: ${label} corrupto`);
  }
}

function toMessage(row: MessageRow): OutboxMessage {
  return {
    messageId: row.message_id,
    eventId: row.event_id,
    aggregateId: row.aggregate_id,
    aggregateSequence: row.aggregate_sequence,
    globalSequence: row.global_sequence,
    eventType: row.event_type,
    commandId: row.command_id,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
    ackedAt: row.acked_at,
  };
}

/** Migración aditiva sobre la BD de PG-08B. Nunca toca otras bases. */
function migrate(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS outbox_messages (
      message_id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      aggregate_id TEXT NOT NULL,
      aggregate_sequence INTEGER NOT NULL CHECK (aggregate_sequence > 0),
      global_sequence INTEGER NOT NULL CHECK (global_sequence > 0),
      event_type TEXT NOT NULL,
      command_id TEXT NOT NULL,
      event_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','delivered','acked','failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      delivered_at TEXT,
      acked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS outbox_status_seq
      ON outbox_messages (status, global_sequence);
    CREATE INDEX IF NOT EXISTS outbox_aggregate_idx
      ON outbox_messages (aggregate_id, aggregate_sequence);

    CREATE TABLE IF NOT EXISTS replica_cursors (
      replica_id TEXT PRIMARY KEY,
      last_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
      applied_event_ids_json TEXT NOT NULL DEFAULT '[]',
      gaps_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS replica_events (
      replica_id TEXT NOT NULL,
      sequence INTEGER NOT NULL CHECK (sequence > 0),
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      event_json TEXT NOT NULL,
      PRIMARY KEY (replica_id, sequence),
      UNIQUE (replica_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS queue_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  db.query(
    "INSERT OR IGNORE INTO queue_meta (key, value) VALUES (?, ?)",
  ).run("outbox_schema_version", String(OUTBOX_SCHEMA_VERSION));
  const version = db.query(
    "SELECT value FROM queue_meta WHERE key = ?",
  ).get("outbox_schema_version") as { value: string } | undefined;
  if (version?.value !== String(OUTBOX_SCHEMA_VERSION)) {
    throw new Error(`PG-08C: versión de outbox incompatible (${version?.value ?? "ausente"})`);
  }
}

export class SharedEventQueue {
  readonly databasePath: string;
  private readonly db: Database;
  private closed = false;

  constructor(options: { readonly databasePath: string }) {
    this.databasePath = options.databasePath;
    this.db = new Database(this.databasePath, { create: true });
    this.db.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
    migrate(this.db);
  }

  /** Devuelve un gancho listo para `store.execute(cmd, sideEffect)`. */
  sideEffectFor(commandId: string): StoreSideEffect {
    return ({ db, events }): void => {
      this.enqueueIn(db, events, commandId);
    };
  }

  /**
   * Productor: se ejecuta DENTRO de la transacción del store. Los eventos ya
   * están insertados en `events`, por lo que el ordinal por agregado se lee
   * de la propia tabla de eventos en la misma transacción.
   */
  enqueueIn(db: Database, events: readonly SyncEvent[], commandId: string): number {
    const ordinal = db.query(
      "SELECT aggregate_sequence FROM events WHERE event_id = ?",
    );
    const insert = db.query(`
      INSERT OR IGNORE INTO outbox_messages (
        message_id, event_id, aggregate_id, aggregate_sequence, global_sequence,
        event_type, command_id, event_json, status, attempts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
    `);
    let inserted = 0;
    for (const event of events) {
      const row = ordinal.get(event.eventId) as { aggregate_sequence: number } | undefined;
      if (!row) throw new Error(`PG-08C: el evento ${event.eventId} no está persistido`);
      const result = insert.run(
        messageIdOf(event.eventId),
        event.eventId,
        event.aggregateId,
        row.aggregate_sequence,
        event.sequence,
        event.type,
        commandId,
        JSON.stringify(event),
        nowIso(),
      );
      inserted += result.changes;
    }
    return inserted;
  }

  messages(status?: MessageStatus): readonly OutboxMessage[] {
    const rows = status
      ? (this.db.query(
          "SELECT * FROM outbox_messages WHERE status = ? ORDER BY global_sequence ASC",
        ).all(status) as MessageRow[])
      : (this.db.query(
          "SELECT * FROM outbox_messages ORDER BY global_sequence ASC",
        ).all() as MessageRow[]);
    return rows.map(toMessage);
  }

  messageCount(): number {
    const row = this.db.query("SELECT COUNT(*) AS n FROM outbox_messages").get() as { n: number };
    return row.n;
  }

  /** pending → delivered. Registra intentos; no confirma nada. */
  claim(limit = 100): readonly OutboxMessage[] {
    this.assertOpen();
    const rows = this.db.query(
      "SELECT * FROM outbox_messages WHERE status = 'pending' ORDER BY global_sequence ASC LIMIT ?",
    ).all(limit) as MessageRow[];
    const update = this.db.query(`
      UPDATE outbox_messages
         SET status = 'delivered', attempts = attempts + 1, delivered_at = ?, last_error = NULL
       WHERE message_id = ? AND status = 'pending'
    `);
    const now = nowIso();
    const claimed: OutboxMessage[] = [];
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const row of rows) {
        if (update.run(now, row.message_id).changes === 1) {
          claimed.push(toMessage({ ...row, status: "delivered", attempts: row.attempts + 1, delivered_at: now }));
        }
      }
      this.db.exec("COMMIT");
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch { /* ya revertido */ }
      throw error;
    }
    return claimed;
  }

  /** Confirmación idempotente: repetirla no cambia el mensaje. */
  ack(messageId: string): boolean {
    this.assertOpen();
    const result = this.db.query(`
      UPDATE outbox_messages SET status = 'acked', acked_at = ?
       WHERE message_id = ? AND status IN ('delivered','acked')
    `).run(nowIso(), messageId);
    return result.changes > 0;
  }

  /** Error de entrega: queda registrado y puede reintentarse. */
  nack(messageId: string, error: string): boolean {
    this.assertOpen();
    const result = this.db.query(`
      UPDATE outbox_messages SET status = 'failed', last_error = ?
       WHERE message_id = ? AND status = 'delivered'
    `).run(error, messageId);
    return result.changes > 0;
  }

  retryFailed(limit = 100): number {
    this.assertOpen();
    const result = this.db.query(`
      UPDATE outbox_messages SET status = 'pending', delivered_at = NULL
       WHERE message_id IN (
         SELECT message_id FROM outbox_messages WHERE status = 'failed' ORDER BY global_sequence ASC LIMIT ?
       )
    `).run(limit);
    return result.changes;
  }

  registerReplica(replicaId: string): void {
    this.assertOpen();
    this.db.query(`
      INSERT OR IGNORE INTO replica_cursors (replica_id, last_sequence, applied_event_ids_json, gaps_json, updated_at)
      VALUES (?, 0, '[]', '[]', ?)
    `).run(replicaId, nowIso());
  }

  replicaCursor(replicaId: string): ReplicaCursor | null {
    const row = this.db.query(
      "SELECT * FROM replica_cursors WHERE replica_id = ?",
    ).get(replicaId) as ReplicaRow | undefined;
    if (!row) return null;
    return {
      replicaId: row.replica_id,
      lastSequence: row.last_sequence,
      appliedIds: parseJson<string[]>(row.applied_event_ids_json, "applied ids"),
      gaps: parseJson<number[]>(row.gaps_json, "gaps"),
    };
  }

  replicaEvents(replicaId: string): readonly SyncEvent[] {
    const rows = this.db.query(
      "SELECT event_json FROM replica_events WHERE replica_id = ? ORDER BY sequence ASC",
    ).all(replicaId) as Array<{ event_json: string }>;
    return rows.map((r) => parseJson<SyncEvent>(r.event_json, "evento de réplica"));
  }

  replicaSystem(replicaId: string): NurserySystem {
    return createNurserySystem(this.replicaEvents(replicaId));
  }

  /**
   * Réplica: aplica mensajes confirmados en orden estricto por secuencia.
   * Duplicados y eventos retrasados se ignoran; un hueco BLOQUEA el avance.
   */
  syncReplica(replicaId: string, limit = 100): SyncReport {
    this.assertOpen();
    this.registerReplica(replicaId);
    const cursor = this.replicaCursor(replicaId)!;
    const rows = this.db.query(`
      SELECT * FROM outbox_messages
       WHERE global_sequence > ? AND status IN ('delivered','acked')
       ORDER BY global_sequence ASC LIMIT ?
    `).all(cursor.lastSequence, limit) as MessageRow[];
    const insertEvent = this.db.query(`
      INSERT OR IGNORE INTO replica_events (replica_id, sequence, event_id, event_type, aggregate_id, event_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const updateCursor = this.db.query(`
      UPDATE replica_cursors
         SET last_sequence = ?, applied_event_ids_json = ?, gaps_json = ?, updated_at = ?
       WHERE replica_id = ?
    `);
    let applied = 0;
    let duplicates = 0;
    let outOfOrder = 0;
    let last = cursor.lastSequence;
    const ids = [...cursor.appliedIds];
    const gaps = [...cursor.gaps];
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const row of rows) {
        if (row.global_sequence <= last) {
          duplicates++;
          continue;
        }
        if (row.global_sequence > last + 1) {
          for (let missing = last + 1; missing < row.global_sequence; missing++) {
            if (!gaps.includes(missing)) gaps.push(missing);
          }
          outOfOrder++;
          break;
        }
        const event = parseJson<SyncEvent>(row.event_json, "mensaje de outbox");
        insertEvent.run(replicaId, row.global_sequence, row.event_id, row.event_type, row.aggregate_id, row.event_json);
        ids.push(row.event_id);
        last = row.global_sequence;
        applied++;
      }
      updateCursor.run(last, JSON.stringify(ids), JSON.stringify(gaps), nowIso(), replicaId);
      this.db.exec("COMMIT");
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch { /* ya revertido */ }
      throw error;
    }
    return { replicaId, applied, duplicates, outOfOrder, gaps: [...gaps], cursor: last };
  }

  /**
   * Inyección controlada para pruebas: permite simular duplicados, eventos
   * retrasados y desorden. NUNCA convierte a la réplica en autoridad: el
   * estado se reconstruye con el dominio PG-08A y no se ejecutan comandos.
   */
  injectReplicaEvent(replicaId: string, event: SyncEvent, sequenceOverride?: number): void {
    this.assertOpen();
    this.registerReplica(replicaId);
    const sequence = sequenceOverride ?? event.sequence;
    this.db.query(`
      INSERT OR IGNORE INTO replica_events (replica_id, sequence, event_id, event_type, aggregate_id, event_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(replicaId, sequence, event.eventId, event.type, event.aggregateId, JSON.stringify(event));
  }

  /** Huecos globales en el outbox (secuencias ausentes entre 1 y el máximo). */
  detectGaps(): readonly number[] {
    const rows = this.db.query(
      "SELECT global_sequence FROM outbox_messages ORDER BY global_sequence ASC",
    ).all() as Array<{ global_sequence: number }>;
    const gaps: number[] = [];
    let expected = 1;
    for (const row of rows) {
      while (expected < row.global_sequence) gaps.push(expected++);
      expected = row.global_sequence + 1;
    }
    return gaps;
  }

  /**
   * Repara laBD tras una interrupción entre commit del store y encolado.
   * Con el outbox atómico no debería hacer falta, pero D7 exige recuperación.
   */
  reconcile(store: { exportEvents(): readonly SyncEvent[] }): ReconcileReport {
    this.assertOpen();
    const known = new Set(
      (this.db.query("SELECT event_id FROM outbox_messages").all() as Array<{ event_id: string }>)
        .map((r) => r.event_id),
    );
    const missing = store.exportEvents().filter((e) => !known.has(e.eventId));
    let recovered = 0;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      recovered = this.enqueueIn(this.db, missing, "reconcile");
      this.db.exec("COMMIT");
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch { /* ya revertido */ }
      throw error;
    }
    return { recovered, alreadyPresent: known.size };
  }

  integrityCheck(): { ok: boolean; issues: readonly string[]; messages: number } {
    const issues: string[] = [];
    try {
      const pragma = this.db.query("PRAGMA integrity_check").get() as { integrity_check: string };
      if (pragma.integrity_check !== "ok") issues.push(`integrity_check: ${pragma.integrity_check}`);
      const rows = this.db.query("SELECT * FROM outbox_messages ORDER BY global_sequence ASC").all() as MessageRow[];
      const seen = new Set<string>();
      let expected = 1;
      for (const row of rows) {
        if (seen.has(row.event_id)) issues.push(`evento duplicado: ${row.event_id}`);
        seen.add(row.event_id);
        if (row.global_sequence !== expected) issues.push(`salto de secuencia en ${row.message_id}`);
        expected++;
        const event = parseJson<SyncEvent>(row.event_json, "mensaje de outbox");
        if (event.eventId !== row.event_id) issues.push(`event_json no coincide en ${row.message_id}`);
      }
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
    }
    return { ok: issues.length === 0, issues, messages: this.messageCount() };
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("PG-08C: la cola está cerrada");
  }

  close(): void {
    if (this.closed) return;
    this.db.close();
    this.closed = true;
  }
}

export function openEventQueue(options: { readonly databasePath: string }): SharedEventQueue {
  return new SharedEventQueue(options);
}
