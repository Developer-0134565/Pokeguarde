/**
 * PG-08B — EventStore local, transaccional y aislado de Guarderías Compartidas.
 *
 * FRONTERA D2 (autoridad vs caché):
 *   Este archivo NO es un servidor autoritativo desplegado. Es un registro
 *   local de desarrollo. Un registro central real (D2) todavía no existe.
 *   Aquí se demuestra el contrato de almacenamiento: eventos append-only,
 *   reconstrucción determinista, idempotencia y transacciones atómicas.
 *
 * REGLAS:
 *   - NUNCA abre `data/pokegotchi.db` (hay una guarda de seguridad explícita).
 *   - NO reimplementa ninguna regla de dominio: ejecuta las operaciones de
 *     `createNurserySystem` y guarda EXACTAMENTE los `SyncEvent` que emite.
 *   - D1: exige un `AuthenticatedOwner`; un `ownerId` suelto NO es prueba.
 *     `OwnerAuthenticator` es solo una interfaz: no hay cuentas, claves
 *     privadas reales ni inicio de sesión.
 *
 * Sin dependencias nuevas: solo `bun:sqlite` y módulos estándar.
 */

import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import {
  CONTRACT_VERSION,
  SCHEMA_ID,
  createNurserySystem,
  validateSyncEvent,
  type ErrorCode,
  type NurserySystem,
  type OpResult,
  type OperationError,
  type SyncEvent,
  type SyncEventType,
} from "../../../packages/core/src/shared-nurseries.ts";

// ---------------------------------------------------------------------------
// 1. Constantes y seguridad de archivo
// ---------------------------------------------------------------------------

/** Versión del esquema SQL de este EventStore (independiente del contrato PG-08A). */
export const EVENT_STORE_SCHEMA_VERSION = 1;
export const SHARED_DB_FILENAME = "shared-pg08b.db";
export const PRODUCTION_DB_FILENAME = "pokegotchi.db";
export const DEFAULT_SHARED_DB_PATH = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "data",
  SHARED_DB_FILENAME,
);

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// ---------------------------------------------------------------------------
// 2. D1 — Identidad: interfaz, nunca implementación ni credenciales reales
// ---------------------------------------------------------------------------

/** Prueba opaca presentada por un llamador. NUNCA contiene la identidad en claro. */
export type OwnerProof = {
  readonly keyId: string;
  readonly signature: string;
  readonly signedAt: string;
};

/** Resultado de una autenticación correcta. Es lo único que acepta el store. */
export type AuthenticatedOwner = {
  readonly ownerId: string;
  readonly verifiedAt: string;
};

/**
 * D1 — Capa de autenticación independiente del proveedor.
 *
 * SOLO se define la interfaz. No se entrega implementación, no se crean
 * cuentas y no se almacenan claves privadas. El store exige el resultado
 * (`AuthenticatedOwner`) y verifica que corresponda al actor de la operación.
 */
export interface OwnerAuthenticator {
  authenticate(proof: OwnerProof, at?: string): AuthenticatedOwner | Promise<AuthenticatedOwner>;
}

// ---------------------------------------------------------------------------
// 3. Contrato público del store
// ---------------------------------------------------------------------------

export const STORE_OPERATIONS = [
  "registerOwner",
  "registerNursery",
  "registerPokemon",
  "requestDeposit",
  "acceptDeposit",
  "rejectDeposit",
  "grantPermission",
  "revokePermission",
  "care",
  "applyEvBerries",
  "applyEvMinigame",
  "requestBreeding",
  "setConnectivity",
  "setNurseryFlag",
  "requestRecovery",
  "completeRecovery",
] as const;

export type StoreOperation = (typeof STORE_OPERATIONS)[number];

export type StoreCommand = {
  readonly operation: StoreOperation;
  /** Se pasa tal cual al dominio, que hace validación estricta de claves. */
  readonly input: Readonly<Record<string, unknown>>;
  /** D1: identidad YA autenticada. Nunca un `ownerId` arbitrario. */
  readonly auth: AuthenticatedOwner;
};

/**
 * PG-08C — gancho aditivo para el patrón transactional outbox.
 *
 * Se invoca DENTRO de la misma transacción que persiste los eventos, antes del
 * COMMIT. Si lanza, `execute` hace ROLLBACK y no queda ni evento ni mensaje.
 * NO altera ninguna regla del dominio PG-08A ni el comportamiento de los 22
 * casos de PG-08B (el parámetro es opcional).
 */
export type StoreSideEffect = (context: {
  /** Conexión del store, dentro de la transacción activa. */
  readonly db: Database;
  /** Eventos recién insertados por este comando (pueden ser varios). */
  readonly events: readonly SyncEvent[];
  readonly outcome: StoreOutcome;
}) => void;

export type StoreOutcome<T = unknown> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly eventId: string | null;
      readonly inserted: boolean;
      readonly sequence: number | null;
    }
  | {
      readonly ok: false;
      readonly error: OperationError;
      readonly inserted: false;
      readonly sequence: number | null;
    };

export type SnapshotRecord = {
  readonly id: number;
  readonly label: string | null;
  readonly sequence: number;
  readonly eventCount: number;
  readonly sha256: string;
  readonly createdAt: string;
};

export type IntegrityReport = {
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly eventCount: number;
};

type EventRow = {
  event_id: string;
  sequence: number;
  aggregate_id: string;
  aggregate_sequence: number;
  dedupe_key: string;
  idempotency_key: string;
  event_type: string;
  schema_id: string;
  contract_version: string;
  occurred_at: string;
  payload_json: string;
  payload_sha256: string;
};

// ---------------------------------------------------------------------------
// 4. Utilidades de persistencia
// ---------------------------------------------------------------------------

/**
 * Debe coincidir con el prefijo interno `idempotencyPrefixOf` de PG-08A para
 * que la dedupe del dominio y la restricción UNIQUE de SQL signifiquen lo mismo.
 */
export function dedupeKeyOf(event: SyncEvent): string {
  let prefix: string;
  switch (event.type) {
    case "owner.registered": prefix = "owner"; break;
    case "nursery.registered":
    case "nursery.connectivity":
    case "nursery.flags": prefix = "nursery"; break;
    case "pokemon.registered": prefix = "pokemon"; break;
    case "deposit.requested": prefix = "deposit"; break;
    case "deposit.accepted": prefix = "accept"; break;
    case "deposit.rejected": prefix = "reject"; break;
    case "permission.granted": prefix = "grant"; break;
    case "permission.revoked": prefix = "revoke"; break;
    case "recovery.requested": prefix = "recovery"; break;
    case "recovery.completed": prefix = "complete"; break;
    case "breeding.requested": prefix = "breeding"; break;
    case "care.applied": {
      const action = event.payload.action;
      prefix = action === "ev_berries" ? "berries" : action === "ev_minigame" ? "minigame" : "care";
      break;
    }
  }
  return `${prefix}:${event.idempotencyKey}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// 5. EventStore
// ---------------------------------------------------------------------------

export class SharedNurseryStore {
  readonly databasePath: string;
  private readonly db: Database;
  private system: NurserySystem;
  private closed = false;

  constructor(options: { databasePath?: string } = {}) {
    const path = options.databasePath ?? DEFAULT_SHARED_DB_PATH;
    // D3 — guarda de seguridad: jamás se abre la BD de producción.
    if (basename(path) === PRODUCTION_DB_FILENAME) {
      throw new Error("PG-08B: prohibido abrir la base de datos de producción");
    }
    mkdirSync(dirname(path), { recursive: true });
    this.databasePath = path;
    this.db = new Database(path, { create: true });
    this.db.exec("PRAGMA journal_mode=WAL;");
    this.db.exec("PRAGMA busy_timeout=5000;");
    this.db.exec("PRAGMA foreign_keys=ON;");
    this.migrate();
    this.system = createNurserySystem(this.readEvents());
  }

  // --- Esquema y migraciones (solo en la BD nueva) --------------------------

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        sequence INTEGER NOT NULL UNIQUE CHECK (sequence > 0),
        aggregate_id TEXT NOT NULL,
        aggregate_sequence INTEGER NOT NULL CHECK (aggregate_sequence > 0),
        dedupe_key TEXT NOT NULL UNIQUE,
        idempotency_key TEXT NOT NULL,
        event_type TEXT NOT NULL,
        schema_id TEXT NOT NULL,
        contract_version TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        payload_sha256 TEXT NOT NULL,
        UNIQUE (aggregate_id, aggregate_sequence)
      );

      CREATE INDEX IF NOT EXISTS events_aggregate_idx
        ON events (aggregate_id, aggregate_sequence);

      CREATE INDEX IF NOT EXISTS events_type_idx
        ON events (event_type);

      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT,
        sequence INTEGER NOT NULL,
        event_count INTEGER NOT NULL,
        snapshot_json TEXT NOT NULL,
        snapshot_sha256 TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    const put = this.db.query(
      "INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)",
    );
    put.run("event_store_schema_version", String(EVENT_STORE_SCHEMA_VERSION));
    put.run("contract_schema_id", SCHEMA_ID);
    put.run("contract_version", CONTRACT_VERSION);
    put.run("created_at", nowIso());

    const get = this.db.query("SELECT value FROM meta WHERE key = ?");
    const storedSchema = (get.get("event_store_schema_version") as { value: string } | null)?.value;
    if (storedSchema !== String(EVENT_STORE_SCHEMA_VERSION)) {
      throw new Error(
        `PG-08B: versión de esquema incompatible (${storedSchema} != ${EVENT_STORE_SCHEMA_VERSION})`,
      );
    }
    const storedContract = (get.get("contract_version") as { value: string } | null)?.value;
    if (storedContract !== CONTRACT_VERSION) {
      throw new Error(
        `PG-08B: versión de contrato incompatible (${storedContract} != ${CONTRACT_VERSION})`,
      );
    }
    const storedSchemaId = (get.get("contract_schema_id") as { value: string } | null)?.value;
    if (storedSchemaId !== SCHEMA_ID) {
      throw new Error(
        `PG-08B: identificador de contrato incompatible (${storedSchemaId} != ${SCHEMA_ID})`,
      );
    }
  }

  /** SQL primitivo de sólo lectura, para diagnóstico y verificación. */
  readMeta(): Readonly<Record<string, string>> {
    this.assertOpen();
    const rows = this.db.query("SELECT key, value FROM meta ORDER BY key").all() as Array<{
      key: string;
      value: string;
    }>;
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  // --- Lectura y reconstrucción --------------------------------------------

  private rowToEvent(row: EventRow): SyncEvent {
    let payload: unknown;
    try {
      payload = JSON.parse(row.payload_json);
    } catch {
      throw new Error(`PG-08B: payload corrupto en ${row.event_id}`);
    }
    if (!isObject(payload)) {
      throw new Error(`PG-08B: payload no es objeto en ${row.event_id}`);
    }
    const candidate = {
      schema: row.schema_id,
      version: row.contract_version,
      eventId: row.event_id,
      sequence: row.sequence,
      type: row.event_type,
      aggregateId: row.aggregate_id,
      occurredAt: row.occurred_at,
      idempotencyKey: row.idempotency_key,
      payload,
    } as unknown as SyncEvent;
    const validated = validateSyncEvent(candidate);
    if (!validated.ok) {
      throw new Error(
        `PG-08B: evento inválido ${row.event_id}: ${validated.issues.map((i) => i.message).join("; ")}`,
      );
    }
    const actualHash = sha256(row.payload_json);
    if (actualHash !== row.payload_sha256) {
      throw new Error(`PG-08B: hash de payload no coincide en ${row.event_id}`);
    }
    return validated.value;
  }

  private readEvents(): SyncEvent[] {
    const rows = this.db.query("SELECT * FROM events ORDER BY sequence ASC").all() as EventRow[];
    return rows.map((row) => this.rowToEvent(row));
  }

  /** Reconstruye el observable SOLO desde el registro persistido. */
  private materialize(): void {
    this.system = createNurserySystem(this.readEvents());
  }

  getSystem(): NurserySystem {
    this.assertOpen();
    return this.system;
  }

  snapshot(): ReturnType<NurserySystem["snapshot"]> {
    this.assertOpen();
    return this.system.snapshot();
  }

  exportEvents(): SyncEvent[] {
    this.assertOpen();
    return this.system.exportEvents();
  }

  eventCount(): number {
    this.assertOpen();
    return (this.db.query("SELECT COUNT(*) AS n FROM events").get() as { n: number }).n;
  }

  /**
   * Compara el snapshot observable contra uno reconstruido desde cero.
   * Si son distintos, hay divergencia entre memoria y persistencia.
   */
  verifyDeterminism(): { equal: boolean; live: string; rebuilt: string } {
    this.assertOpen();
    const live = JSON.stringify(this.system.snapshot());
    const rebuilt = JSON.stringify(createNurserySystem(this.readEvents()).snapshot());
    return { equal: live === rebuilt, live, rebuilt };
  }

  // --- Transacciones --------------------------------------------------------

  private lastSequence(): number {
    return (this.db.query("SELECT COALESCE(MAX(sequence), 0) AS n FROM events").get() as { n: number }).n;
  }

  private nextAggregateSequence(aggregateId: string): number {
    const row = this.db
      .query("SELECT COALESCE(MAX(aggregate_sequence), 0) AS n FROM events WHERE aggregate_id = ?")
      .get(aggregateId) as { n: number };
    return row.n + 1;
  }

  private insertEvent(event: SyncEvent): void {
    const validated = validateSyncEvent(event);
    if (!validated.ok) {
      throw new Error(
        `PG-08B: no se puede persistir un evento inválido: ${validated.issues.map((i) => i.message).join("; ")}`,
      );
    }
    const payloadJson = JSON.stringify(event.payload);
    this.db
      .query(`
        INSERT INTO events (
          event_id, sequence, aggregate_id, aggregate_sequence, dedupe_key,
          idempotency_key, event_type, schema_id, contract_version,
          occurred_at, payload_json, payload_sha256
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        event.eventId,
        event.sequence,
        event.aggregateId,
        this.nextAggregateSequence(event.aggregateId),
        dedupeKeyOf(event),
        event.idempotencyKey,
        event.type,
        event.schema,
        event.version,
        event.occurredAt,
        payloadJson,
        sha256(payloadJson),
      );
  }

  /**
   * Importa eventos ya emitidos por el dominio (por ejemplo, desde una sesión
   * PG-08A en memoria). Valida la estructura pero NO inventa reglas de dominio.
   * Los eventos repetidos se omiten por `event_id`.
   */
  importEvents(events: readonly SyncEvent[]): { inserted: number; skipped: number } {
    this.assertOpen();
    let inserted = 0;
    let skipped = 0;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const exists = this.db.query("SELECT 1 AS yes FROM events WHERE event_id = ?");
      for (const event of events) {
        if (exists.get(event.eventId)) {
          skipped++;
          continue;
        }
        this.insertEvent(event);
        inserted++;
      }
      this.db.exec("COMMIT");
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch { /* ya revertido */ }
      this.materialize();
      throw error;
    }
    this.materialize();
    return { inserted, skipped };
  }

  /**
   * Ejecuta un comando autorizado. Secuencia: autenticación → autoría →
   * precondiciones (dominio) → persistencia atómica → estado observable.
   */
  execute(command: StoreCommand, sideEffect?: StoreSideEffect): StoreOutcome {
    this.assertOpen();
    const baseSequence = this.lastSequence();

    this.db.exec("BEGIN IMMEDIATE");
    let outcome: StoreOutcome | null = null;
    /** Eventos nuevos de este comando; el outbox los consume antes del COMMIT. */
    let pendingEvents: readonly SyncEvent[] = [];
    const commit = (): void => {
      // PG-08C: el efecto (receipt, revisiones, outbox) comparte transacción.
      // Si lanza, el catch de abajo revierte EVENTOS y efecto a la vez.
      if (sideEffect && outcome) sideEffect({ db: this.db, events: pendingEvents, outcome });
      this.db.exec("COMMIT");
    };
    try {
      const candidate = createNurserySystem(this.readEvents());
      // Un comando puede emitir VARIOS eventos (p. ej. acceptDeposit emite
      // nursery.flags y deposit.accepted). Capturamos todos los ids previos
      // para persistir el conjunto completo y conservar secuencias contiguas.
      const before = new Set(candidate.exportEvents().map((e) => e.eventId));

      const authIssue = this.authorize(candidate, command);
      if (authIssue) {
        outcome = { ok: false, error: authIssue, inserted: false, sequence: baseSequence };
        commit();
      } else {
        const result = this.dispatch(candidate, command);
        if (!result.ok) {
          outcome = { ok: false, error: result.error, inserted: false, sequence: baseSequence };
          commit(); // sin eventos de dominio; el receipt de rechazo va en el efecto
        } else {
          // Persistimos TODOS los eventos nuevos, no solo el que devuelve OK:
          // refreshNursery emite nursery.flags antes del evento principal.
          const fresh = candidate.exportEvents().filter((e) => !before.has(e.eventId));
          // Un rejudo legítimo devuelve el eventId original sin emitir nada.
          if (result.eventId !== null && !before.has(result.eventId) && !fresh.some((e) => e.eventId === result.eventId)) {
            throw new Error("PG-08B: el dominio devolvió un eventId sin evento persistible");
          }
          for (const event of fresh) this.insertEvent(event);
          pendingEvents = fresh;
          const inserted = fresh.length > 0;
          const sequence = fresh.reduce((max, e) => Math.max(max, e.sequence), baseSequence);
          outcome = {
            ok: true,
            value: result.value,
            eventId: result.eventId,
            inserted,
            sequence,
          };
          commit();
        }
      }
    } catch (error) {
      try { this.db.exec("ROLLBACK"); } catch { /* ya revertido */ }
      this.materialize();
      throw error;
    }

    this.materialize();
    return outcome as StoreOutcome;
  }

  /** D1: la identidad autenticada debe corresponder al actor de la operación. */
  private authorize(system: NurserySystem, command: StoreCommand): OperationError | null {
    const auth = command.auth;
    if (
      !isObject(auth) ||
      typeof auth.ownerId !== "string" ||
      !UUID_RE.test(auth.ownerId) ||
      typeof auth.verifiedAt !== "string" ||
      !ISO_RE.test(auth.verifiedAt)
    ) {
      return { code: "UNAUTHORIZED", message: "se exige una identidad autenticada válida" };
    }

    const input = command.input;
    const expected = this.authoritativeOwnerOf(system, command.operation, input);
    if (expected !== null && expected !== auth.ownerId) {
      return {
        code: "OWNER_MISMATCH",
        message: "la identidad autenticada no corresponde al propietario o actor de la operación",
      };
    }
    return null;
  }

  /**
   * Dueño/actor derivado del propio input o del estado autoritativo.
   * `registerPokemon` no tiene campo de propietario: la propiedad se fija en
   * `requestDeposit`; el store no inventa una regla de dominio adicional.
   */
  private authoritativeOwnerOf(
    system: NurserySystem,
    operation: StoreOperation,
    input: Readonly<Record<string, unknown>>,
  ): string | null {
    switch (operation) {
      case "registerOwner": return asString(input.id);
      case "registerNursery": return asString(input.hostId);
      case "requestDeposit":
      case "grantPermission":
      case "revokePermission":
      case "requestRecovery": return asString(input.ownerId);
      case "care":
      case "applyEvBerries":
      case "applyEvMinigame":
      case "requestBreeding": return asString(input.actorId);
      case "completeRecovery": {
        const voucher = input.voucher;
        return isObject(voucher) ? asString(voucher.ownerId) : null;
      }
      case "acceptDeposit":
      case "rejectDeposit": {
        const snap = system.snapshot();
        const request = snap.requests.find((r) => r.id === input.requestId);
        const nursery = request ? snap.nurseries.find((n) => n.id === request.nurseryId) : null;
        return nursery?.hostId ?? null;
      }
      case "setConnectivity":
      case "setNurseryFlag": {
        const snap = system.snapshot();
        const nursery = snap.nurseries.find((n) => n.id === input.nurseryId);
        return nursery?.hostId ?? null;
      }
      case "registerPokemon": return null;
    }
  }

  private dispatch(system: NurserySystem, command: StoreCommand): OpResult<unknown> {
    // El límite es inseguro desde TS: el dominio valida estrictamente cada
    // input. El store NO duplica esas validaciones.
    const input = command.input as never;
    switch (command.operation) {
      case "registerOwner": return system.registerOwner(input);
      case "registerNursery": return system.registerNursery(input);
      case "registerPokemon": return system.registerPokemon(input);
      case "requestDeposit": return system.requestDeposit(input);
      case "acceptDeposit": return system.acceptDeposit(input);
      case "rejectDeposit": return system.rejectDeposit(input);
      case "grantPermission": return system.grantPermission(input);
      case "revokePermission": return system.revokePermission(input);
      case "care": return system.care(input);
      case "applyEvBerries": return system.applyEvBerries(input);
      case "applyEvMinigame": return system.applyEvMinigame(input);
      case "requestBreeding": return system.requestBreeding(input);
      case "setConnectivity": return system.setConnectivity(input);
      case "setNurseryFlag": return system.setNurseryFlag(input);
      case "requestRecovery": return system.requestRecovery(input);
      case "completeRecovery": return system.completeRecovery(input);
    }
  }

  // --- Snapshots, integridad y cierre --------------------------------------

  saveSnapshot(label: string | null = null): SnapshotRecord {
    this.assertOpen();
    const snap = this.system.snapshot();
    const json = JSON.stringify(snap);
    const createdAt = nowIso();
    const result = this.db
      .query(`
        INSERT INTO snapshots (label, sequence, event_count, snapshot_json, snapshot_sha256, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(label, snap.sequence, snap.eventCount, json, sha256(json), createdAt);
    return {
      id: Number(result.lastInsertRowid),
      label,
      sequence: snap.sequence,
      eventCount: snap.eventCount,
      sha256: sha256(json),
      createdAt,
    };
  }

  listSnapshots(): SnapshotRecord[] {
    this.assertOpen();
    const rows = this.db
      .query("SELECT id, label, sequence, event_count, snapshot_json, snapshot_sha256, created_at FROM snapshots ORDER BY id")
      .all() as Array<{
        id: number;
        label: string | null;
        sequence: number;
        event_count: number;
        snapshot_json: string;
        snapshot_sha256: string;
        created_at: string;
      }>;
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      sequence: r.sequence,
      eventCount: r.event_count,
      sha256: r.snapshot_sha256,
      createdAt: r.created_at,
    }));
  }

  integrityCheck(): IntegrityReport {
    this.assertOpen();
    const issues: string[] = [];
    const pragma = this.db.query("PRAGMA integrity_check").get() as { integrity_check: string };
    if (pragma.integrity_check !== "ok") issues.push(`SQLite: ${pragma.integrity_check}`);

    try {
      const events = this.readEvents();
      for (let i = 0; i < events.length; i++) {
        if (events[i].sequence !== i + 1) {
          issues.push(`secuencia no contigua en la posición ${i}`);
          break;
        }
      }
      // Cada fila debe corresponder a su ORDINAL dentro del agregado, no al
      // total de eventos del agregado (que era un error de comparación).
      const rows = this.db.query(
        "SELECT aggregate_id, aggregate_sequence FROM events ORDER BY sequence ASC",
      ).all() as Array<{ aggregate_id: string; aggregate_sequence: number }>;
      const seen = new Map<string, number>();
      for (const row of rows) {
        const expected = (seen.get(row.aggregate_id) ?? 0) + 1;
        seen.set(row.aggregate_id, expected);
        if (row.aggregate_sequence !== expected) {
          issues.push(`secuencia de agregado inconsistente: ${row.aggregate_id}`);
          break;
        }
      }
      return { ok: issues.length === 0, issues, eventCount: events.length };
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
      return { ok: false, issues, eventCount: 0 };
    }
  }

  assertOpen(): void {
    if (this.closed) throw new Error("PG-08B: el EventStore está cerrado");
  }

  close(): void {
    if (!this.closed) {
      this.db.close();
      this.closed = true;
    }
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Apertura rápida con la ruta por defecto (`data/shared-pg08b.db`). */
export function openSharedStore(options: { databasePath?: string } = {}): SharedNurseryStore {
  return new SharedNurseryStore(options);
}

/** Códigos de error expuestos para los consumidores del store. */
export type SharedStoreErrorCode = ErrorCode | "UNAUTHORIZED" | "OWNER_MISMATCH";
export type SyncEventTypeName = SyncEventType;
