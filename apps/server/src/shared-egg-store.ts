/**
 * PG-08E — Almacén lógico de huevos simulados, aislado y transaccional.
 *
 * Usa SQLite (`bun:sqlite`) sobre una BD DE PRUEBAS inyectada. NUNCA abre
 * `data/pokegotchi.db` y NUNCA inserta huevos en cajas de partidas. No hay
 * servidor, sockets, PKM, saves ni eclosión.
 *
 * Garantías:
 *  - persistencia y recuperación tras reinicio (abrir/cerrar la misma BD);
 *  - integridad referencial (FK) y unicidad (eggId, ciclo, evento, idempotencia);
 *  - atomicidad por transacción, con `atomic()` para integrar el motor PG-08D;
 *  - outbox durable en la MISMA transacción que el huevo;
 *  - propiedad inmutable tras `stored`; NUNCA último escritor gana;
 *  - rechazo seguro sin consumir idempotencia cuando no hay capacidad.
 */

import { Database } from "bun:sqlite";
import { basename, dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

import {
  EGG_CONTRACT_VERSION,
  EGG_EVENT_TYPES,
  EGG_SCHEMA,
  eggEventIdFor,
  isCapacityState,
  validateEgg,
  assertTransition,
  createEgg,
  markPendingAssignment,
  cancelEgg,
  claimEgg,
  storeEgg,
  type CancelReason,
  type CreateEggInput,
  type EggEvent,
  type EggEventType,
  type EggId,
  type EggRecord,
  type EggState,
  type DomainResult,
} from "../../../packages/core/src/egg-domain.ts";

const ok = <T>(value: T): DomainResult<T> => ({ ok: true, value });
const err = <T>(code: string, message: string): DomainResult<T> => ({ ok: false, code, message });

export const EGG_STORE_SCHEMA = "pg08e.shared-egg-store" as const;
export const EGG_STORE_VERSION = "1.0.0" as const;
export const DEFAULT_EGG_CAPACITY = 4;
export const DEFAULT_BACKLOG_CAPACITY = 0;

export type AccumulationPolicy = "single" | "bounded";
export const ACCUMULATION_POLICIES: readonly AccumulationPolicy[] = Object.freeze(["single", "bounded"]);

export interface EggProductionInput extends CreateEggInput {
  /** Anfitrión de la guardería; la autoridad valida permisos sobre él. */
  readonly hostId: string;
}

export interface EggAuthorityPort {
  /** La autoridad, no el cliente, fija el orden de las operaciones. */
  sequenceFor(input: Pick<EggProductionInput, "productionEventId" | "nurseryId" | "cycleId" | "occurredAt">): number;
  canProduce(input: EggProductionInput): DomainResult<true>;
  canAssign(input: { eggId: EggId; actorId: string; ownerId: string }): DomainResult<true>;
  canClaim(input: { eggId: EggId; actorId: string; ownerId: string }): DomainResult<true>;
  canCancel(input: { eggId: EggId; actorId: string; reason: CancelReason }): DomainResult<true>;
}

/** Autoridad permisiva para pruebas: secuencia monotónica local. */
export function permissiveEggAuthority(): EggAuthorityPort {
  let sequence = 0;
  return {
    sequenceFor: () => ++sequence,
    canProduce: () => ok(true),
    canAssign: () => ok(true),
    canClaim: () => ok(true),
    canCancel: () => ok(true),
  };
}

export interface ProduceOutcome {
  readonly eggId: EggId;
  readonly state: EggState;
  readonly created: boolean;
  readonly queued: boolean;
  readonly eventIds: readonly string[];
}

export interface StoreOutcome<T> {
  readonly value: T;
  readonly eventIds: readonly string[];
}

export interface EggReplayEvent {
  readonly type: EggEventType;
  readonly occurredAt: string;
  readonly idempotencyKey: string;
  readonly eggId: EggId;
  readonly cycleId: string;
  readonly nurseryId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface IntegrityReport {
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly eggs: number;
  readonly events: number;
  readonly backlog: number;
  readonly outbox: number;
  readonly pragma: string;
}

const JSONof = (value: unknown): string => JSON.stringify(value);
const parseJSON = <T>(text: string): T => JSON.parse(text) as T;

/** Clave canónica de un evento, usada también por `replay` tras reinicio. */
function replayKeyOf(event: EggReplayEvent): string {
  if (event.type === "egg.production.recorded" || event.type === "egg.queued") {
    const production = event.payload.production as EggProductionInput | undefined;
    const key = production?.idempotencyKey ?? String(event.payload.idempotencyKey ?? event.idempotencyKey);
    return `${event.type === "egg.queued" ? "queued" : "production"}:${key}`;
  }
  if (event.type === "egg.assignment.pending") return `pending:${event.eggId}:${Date.parse(event.occurredAt)}`;
  if (event.type === "egg.stored") return `stored:${event.eggId}:${Date.parse(event.occurredAt)}`;
  if (event.type === "egg.claimed") return `claimed:${event.eggId}:${Date.parse(event.occurredAt)}`;
  if (event.type === "egg.cancelled") return `cancelled:${event.eggId}:${Date.parse(event.occurredAt)}`;
  return event.idempotencyKey;
}

type EggRow = {
  egg_id: string;
  cycle_id: string;
  nursery_id: string;
  production_event_id: string;
  state: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  payload: string;
};
type EventRow = {
  event_id: string;
  idempotency_key: string;
  type: string;
  egg_id: string;
  cycle_id: string;
  nursery_id: string;
  occurred_at: string;
  payload: string;
};

/** Migración aditiva; nunca toca otra base de datos. */
function migrate(db: Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS egg_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS egg_events (
      event_id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      egg_id TEXT NOT NULL,
      cycle_id TEXT NOT NULL,
      nursery_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS eggs (
      egg_id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL UNIQUE,
      nursery_id TEXT NOT NULL,
      production_event_id TEXT NOT NULL UNIQUE REFERENCES egg_events(event_id),
      state TEXT NOT NULL CHECK (state IN ('produced','pending_assignment','stored','claimed','cancelled')),
      owner_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS egg_state_history (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      egg_id TEXT NOT NULL REFERENCES eggs(egg_id),
      from_state TEXT,
      to_state TEXT NOT NULL,
      reason TEXT,
      actor_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS egg_backlog (
      idempotency_key TEXT PRIMARY KEY,
      production_event_id TEXT NOT NULL UNIQUE,
      cycle_id TEXT NOT NULL UNIQUE,
      nursery_id TEXT NOT NULL,
      authority_sequence INTEGER NOT NULL,
      input TEXT NOT NULL,
      queued_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS egg_outbox (
      message_id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE REFERENCES egg_events(event_id),
      egg_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','delivered')),
      created_at TEXT NOT NULL,
      delivered_at TEXT
    );
    CREATE INDEX IF NOT EXISTS eggs_owner_idx ON eggs (owner_id);
    CREATE INDEX IF NOT EXISTS eggs_nursery_idx ON eggs (nursery_id);
    CREATE INDEX IF NOT EXISTS eggs_state_idx ON eggs (state);
    CREATE INDEX IF NOT EXISTS backlog_order_idx ON egg_backlog (authority_sequence);
  `);
  const insert = db.query("INSERT OR IGNORE INTO egg_meta (key, value) VALUES (?, ?)");
  insert.run("store_schema", EGG_STORE_SCHEMA);
  insert.run("store_version", EGG_STORE_VERSION);
  insert.run("contract_version", EGG_CONTRACT_VERSION);
  insert.run("capacity", String(DEFAULT_EGG_CAPACITY));
  insert.run("accumulation", "single");
  insert.run("backlog_capacity", String(DEFAULT_BACKLOG_CAPACITY));
  insert.run("last_authority_sequence", "0");

  const version = db.query("SELECT value FROM egg_meta WHERE key = ?").get("store_version") as { value: string } | undefined;
  if (version?.value !== EGG_STORE_VERSION) {
    throw new Error(`PG-08E: versión de almacén de huevos incompatible (${version?.value ?? "ausente"})`);
  }
}

export class SharedEggStore {
  readonly databasePath: string;
  private readonly db: Database;
  private readonly authority: EggAuthorityPort;
  private closed = false;

  constructor(options: {
    readonly databasePath: string;
    readonly authority?: EggAuthorityPort;
  }) {
    const path = resolve(options.databasePath);
    if (basename(path).toLowerCase() === "pokegotchi.db") {
      throw new Error("PG-08E: prohibido usar la base original data/pokegotchi.db");
    }
    mkdirSync(dirname(path), { recursive: true });
    this.databasePath = path;
    this.db = new Database(path, { create: true });
    this.authority = options.authority ?? permissiveEggAuthority();
    migrate(this.db);
  }

  close(): void {
    if (this.closed) return;
    this.db.close();
    this.closed = true;
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("PG-08E: almacén cerrado");
  }

  /** Transacción explícita; se puede anidar y envolver `engine.tick()`. */
  atomic<T>(fn: () => T): T {
    this.assertOpen();
    return this.db.transaction(fn)();
  }

  private meta(key: string): string {
    const row = this.db.query("SELECT value FROM egg_meta WHERE key = ?").get(key) as { value: string } | undefined;
    if (!row) throw new Error(`PG-08E: metadato ausente ${key}`);
    return row.value;
  }

  private setMeta(key: string, value: string): void {
    this.db.query("UPDATE egg_meta SET value = ? WHERE key = ?").run(value, key);
  }

  // -------------------------------------------------------------------------
  // Consultas
  // -------------------------------------------------------------------------

  private toEgg(row: EggRow): EggRecord {
    const egg = parseJSON<EggRecord>(row.payload);
    const valid = validateEgg(egg);
    if (!valid.ok) throw new Error(`PG-08E: huevo corrupto ${row.egg_id} (${valid.code})`);
    return egg;
  }

  get(eggId: string): EggRecord | null {
    this.assertOpen();
    const row = this.db.query("SELECT * FROM eggs WHERE egg_id = ?").get(eggId) as EggRow | undefined;
    return row ? this.toEgg(row) : null;
  }

  listByOwner(ownerId: string): readonly EggRecord[] {
    this.assertOpen();
    return (this.db.query("SELECT * FROM eggs WHERE owner_id = ? ORDER BY created_at, egg_id").all(ownerId) as EggRow[]).map((r) => this.toEgg(r));
  }

  listByNursery(nurseryId: string): readonly EggRecord[] {
    this.assertOpen();
    return (this.db.query("SELECT * FROM eggs WHERE nursery_id = ? ORDER BY created_at, egg_id").all(nurseryId) as EggRow[]).map((r) => this.toEgg(r));
  }

  listByCycle(cycleId: string): readonly EggRecord[] {
    this.assertOpen();
    return (this.db.query("SELECT * FROM eggs WHERE cycle_id = ? ORDER BY created_at").all(cycleId) as EggRow[]).map((r) => this.toEgg(r));
  }

  listAll(): readonly EggRecord[] {
    this.assertOpen();
    return (this.db.query("SELECT * FROM eggs ORDER BY created_at, egg_id").all() as EggRow[]).map((r) => this.toEgg(r));
  }

  events(): readonly EggEvent[] {
    this.assertOpen();
    return (this.db.query("SELECT * FROM egg_events ORDER BY occurred_at, event_id").all() as EventRow[]).map((r) => ({
      schema: EGG_SCHEMA,
      version: EGG_CONTRACT_VERSION,
      eventId: r.event_id,
      type: r.type as EggEventType,
      eggId: r.egg_id as EggId,
      cycleId: r.cycle_id,
      nurseryId: r.nursery_id,
      occurredAt: r.occurred_at,
      idempotencyKey: r.idempotency_key,
      payload: parseJSON<Record<string, unknown>>(r.payload),
    }));
  }

  outbox(): readonly EggEvent[] {
    this.assertOpen();
    const rows = this.db.query(`
      SELECT e.* FROM egg_outbox o JOIN egg_events e ON e.event_id = o.event_id
      ORDER BY o.message_id
    `).all() as EventRow[];
    return rows.map((r) => ({
      schema: EGG_SCHEMA,
      version: EGG_CONTRACT_VERSION,
      eventId: r.event_id,
      type: r.type as EggEventType,
      eggId: r.egg_id as EggId,
      cycleId: r.cycle_id,
      nurseryId: r.nursery_id,
      occurredAt: r.occurred_at,
      idempotencyKey: r.idempotency_key,
      payload: parseJSON<Record<string, unknown>>(r.payload),
    }));
  }

  backlog(): readonly { readonly cycleId: string; readonly authoritySequence: number; readonly queuedAt: string }[] {
    this.assertOpen();
    return (this.db.query("SELECT cycle_id, authority_sequence, queued_at FROM egg_backlog ORDER BY authority_sequence").all() as {
      cycle_id: string; authority_sequence: number; queued_at: string;
    }[]).map((r) => ({ cycleId: r.cycle_id, authoritySequence: r.authority_sequence, queuedAt: r.queued_at }));
  }

  history(eggId: string): readonly { readonly from: string | null; readonly to: string; readonly reason: string | null; readonly actorId: string; readonly at: string }[] {
    this.assertOpen();
    return (this.db.query("SELECT * FROM egg_state_history WHERE egg_id = ? ORDER BY seq").all(eggId) as {
      from_state: string | null; to_state: string; reason: string | null; actor_id: string; occurred_at: string;
    }[]).map((r) => ({ from: r.from_state, to: r.to_state, reason: r.reason, actorId: r.actor_id, at: r.occurred_at }));
  }

  config(): { capacity: number; accumulation: AccumulationPolicy; backlogCapacity: number; lastAuthoritySequence: number } {
    this.assertOpen();
    return {
      capacity: Number(this.meta("capacity")),
      accumulation: this.meta("accumulation") as AccumulationPolicy,
      backlogCapacity: Number(this.meta("backlog_capacity")),
      lastAuthoritySequence: Number(this.meta("last_authority_sequence")),
    };
  }

  setCapacity(capacity: number): DomainResult<{ capacity: number }> {
    return this.atomic(() => {
      if (!Number.isInteger(capacity) || capacity < 1) return err("CAPACITY_INVALID", "la capacidad debe ser un entero ≥ 1");
      const used = this.usage();
      if (capacity < used) return err("CAPACITY_BELOW_USAGE", `capacidad ${capacity} por debajo del uso actual ${used}`);
      this.setMeta("capacity", String(capacity));
      return ok({ capacity });
    });
  }

  /** `single` no acumula; `bounded` exige una capacidad explícita. */
  setAccumulation(policy: AccumulationPolicy, backlogCapacity = 0): DomainResult<{ accumulation: AccumulationPolicy; backlogCapacity: number }> {
    return this.atomic(() => {
      if (!ACCUMULATION_POLICIES.includes(policy)) return err("ACCUMULATION_INVALID", "política de acumulación desconocida");
      if (!Number.isInteger(backlogCapacity) || backlogCapacity < 0) return err("BACKLOG_CAPACITY_INVALID", "capacidad de espera inválida");
      if (policy === "single" && backlogCapacity !== 0) {
        return err("SINGLE_BACKLOG_FORBIDDEN", "`single` no permite acumulación; use `bounded`");
      }
      const queued = Number((this.db.query("SELECT COUNT(*) AS n FROM egg_backlog").get() as { n: number }).n);
      if (backlogCapacity < queued) return err("BACKLOG_CAPACITY_BELOW_USAGE", "capacidad de espera por debajo del uso actual");
      this.setMeta("accumulation", policy);
      this.setMeta("backlog_capacity", String(backlogCapacity));
      return ok({ accumulation: policy, backlogCapacity });
    });
  }

  /** Huevos que ocupan capacidad. La espera tiene su propia capacidad. */
  private usage(): number {
    return (this.db.query("SELECT COUNT(*) AS n FROM eggs WHERE state IN ('produced','pending_assignment','stored')").get() as { n: number }).n;
  }

  private queuedCount(): number {
    return (this.db.query("SELECT COUNT(*) AS n FROM egg_backlog").get() as { n: number }).n;
  }

  // -------------------------------------------------------------------------
  // Publicación (outbox en la misma transacción)
  // -------------------------------------------------------------------------

  private publish(type: EggEventType, egg: EggRecord, at: string, idempotencyKey: string, payload: Record<string, unknown>): string {
    const eventId = eggEventIdFor(type, idempotencyKey);
    const existing = this.db.query("SELECT event_id FROM egg_events WHERE idempotency_key = ?").get(idempotencyKey) as { event_id: string } | undefined;
    if (existing) return existing.event_id;
    this.db.query(`
      INSERT INTO egg_events (event_id, idempotency_key, type, egg_id, cycle_id, nursery_id, occurred_at, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, idempotencyKey, type, egg.eggId, egg.breedingCycleId, egg.nurseryId, at, JSONof(payload));
    this.db.query(`
      INSERT INTO egg_outbox (message_id, event_id, egg_id, type, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(`msg:${eventId}`, eventId, egg.eggId, type, at);
    return eventId;
  }

  private recordHistory(egg: EggRecord, from: EggState | null, actorId: string, at: string, reason: string | null): void {
    this.db.query(`
      INSERT INTO egg_state_history (egg_id, from_state, to_state, reason, actor_id, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(egg.eggId, from, egg.state, reason, actorId, at);
  }

  private updateRow(egg: EggRecord): void {
    this.db.query(`
      UPDATE eggs SET state = ?, owner_id = ?, updated_at = ?, payload = ? WHERE egg_id = ?
    `).run(egg.state, egg.ownerId, egg.updatedAt, JSONof(egg), egg.eggId);
  }

  private insertEgg(egg: EggRecord, eventId: string): void {
    this.db.query(`
      INSERT INTO eggs (egg_id, cycle_id, nursery_id, production_event_id, state, owner_id, created_at, updated_at, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(egg.eggId, egg.breedingCycleId, egg.nurseryId, eventId, egg.state, egg.ownerId, egg.createdAt, egg.updatedAt, JSONof(egg));
  }

  // -------------------------------------------------------------------------
  // Producción
  // -------------------------------------------------------------------------

  produce(input: EggProductionInput): DomainResult<ProduceOutcome> {
    return this.atomic(() => this.produceTx(input));
  }

  /** Solo dentro de `atomic()` (o de la transacción externa del integrador). */
  produceTx(input: EggProductionInput): DomainResult<ProduceOutcome> {
    if (!input || !input.cycleId || !input.nurseryId || !input.productionEventId || !input.idempotencyKey) {
      return err("EGG_IDENTITY_INCOMPLETE", "faltan identificadores de producción");
    }
    const eventKey = `production:${input.idempotencyKey}`;
    const queuedKey = `queued:${input.idempotencyKey}`;
    const priorEvent = this.db.query("SELECT event_id, egg_id FROM egg_events WHERE idempotency_key = ?").get(eventKey) as {
      event_id: string; egg_id: string;
    } | undefined;
    const priorQueued = priorEvent ? undefined : this.db.query("SELECT event_id, egg_id FROM egg_events WHERE idempotency_key = ?").get(queuedKey) as {
      event_id: string; egg_id: string;
    } | undefined;
    if (priorEvent || priorQueued) {
      const queued = Boolean(priorQueued) || Number((this.db.query(
        "SELECT COUNT(*) AS n FROM egg_backlog WHERE production_event_id = ?",
      ).get(input.productionEventId) as { n: number }).n) > 0;
      const receipt = priorEvent ?? priorQueued!;
      return ok({
        eggId: receipt.egg_id as EggId,
        state: queued ? "produced" : (this.get(receipt.egg_id)?.state ?? "produced"),
        created: false,
        queued,
        eventIds: [receipt.event_id],
      });
    }
    const priorCycle = this.db.query("SELECT egg_id FROM eggs WHERE cycle_id = ?").get(input.cycleId) as { egg_id: string } | undefined;
    if (priorCycle) return err("CYCLE_DUPLICATE", "el ciclo ya produjo un huevo; no se admite un segundo");

    const authorization = this.authority.canProduce(input);
    if (!authorization.ok) return err(authorization.code, authorization.message);

    const sequence = this.authority.sequenceFor({
      productionEventId: input.productionEventId,
      nurseryId: input.nurseryId,
      cycleId: input.cycleId,
      occurredAt: input.occurredAt,
    });
    const lastSequence = Number(this.meta("last_authority_sequence"));
    if (sequence <= lastSequence) return err("STALE_ORDER", "la autoridad ya ordenó una operación posterior");

    const created = createEgg(input);
    if (!created.ok) return err(created.code, created.message);
    const egg = created.value;

    if (this.usage() >= Number(this.meta("capacity"))) {
      const backlogCapacity = Number(this.meta("backlog_capacity"));
      if (this.meta("accumulation") !== "bounded" || this.queuedCount() >= backlogCapacity) {
        // Rechazo seguro: NO se consume la idempotencia, el evento puede recuperarse.
        return err("CAPACITY_EXHAUSTED", "capacidad agotada; evento no consumido, reintento seguro");
      }
      this.db.query(`
        INSERT INTO egg_backlog (idempotency_key, production_event_id, cycle_id, nursery_id, authority_sequence, input, queued_at, attempts)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(eventKey, input.productionEventId, input.cycleId, input.nurseryId, sequence, JSONof(input), input.occurredAt);
      const eventId = this.publish("egg.queued", egg, input.occurredAt, queuedKey, {
        eggId: egg.eggId, cycleId: input.cycleId, reason: "capacity_exhausted", authoritySequence: sequence,
        production: input,
      });
      this.setMeta("last_authority_sequence", String(sequence));
      return ok({ eggId: egg.eggId, state: "produced", created: true, queued: true, eventIds: [eventId] });
    }

    const eventId = this.publish("egg.production.recorded", egg, input.occurredAt, eventKey, {
      eggId: egg.eggId,
      cycleId: input.cycleId,
      pair: egg.parents.map((p) => p.pokemonInstanceId),
      provenance: egg.provenance.map((p) => p.class),
      authoritySequence: sequence,
      simulated: true,
      production: input,
    });
    this.insertEgg(egg, eventId);
    this.recordHistory(egg, null, input.hostId, egg.createdAt, null);
    this.setMeta("last_authority_sequence", String(sequence));
    return ok({ eggId: egg.eggId, state: "produced", created: true, queued: false, eventIds: [eventId] });
  }

  // -------------------------------------------------------------------------
  // Asignación, propiedad y estados
  // -------------------------------------------------------------------------

  markPending(input: { eggId: string; recipientId: string; actorId: string; at: string }): DomainResult<StoreOutcome<EggRecord>> {
    return this.atomic(() => {
      const egg = this.get(input.eggId);
      if (!egg) return err("EGG_NOT_FOUND", "huevo inexistente");
      const next = markPendingAssignment(egg, input.at, input.recipientId);
      if (!next.ok) return err(next.code, next.message);
      this.updateRow(next.value);
      this.recordHistory(next.value, egg.state, input.actorId, input.at, null);
      const eventId = this.publish("egg.assignment.pending", next.value, input.at,
        `pending:${egg.eggId}:${Date.parse(input.at)}`, { recipientId: input.recipientId, state: "pending_assignment" });
      return ok({ value: next.value, eventIds: [eventId] });
    });
  }

  store(input: { eggId: string; ownerId: string; actorId: string; at: string; recipientId?: string | null }): DomainResult<StoreOutcome<EggRecord>> {
    return this.atomic(() => {
      const egg = this.get(input.eggId);
      if (!egg) return err("EGG_NOT_FOUND", "huevo inexistente");
      const authorization = this.authority.canAssign({ eggId: egg.eggId, actorId: input.actorId, ownerId: input.ownerId });
      if (!authorization.ok) return err(authorization.code, authorization.message);
      if (egg.ownerId !== null && egg.ownerId !== input.ownerId) {
        return err("OWNER_IMMUTABLE", "la propiedad confirmada no puede modificarse");
      }
      const otherUsage = this.usage() - (isCapacityState(egg.state) ? 1 : 0);
      if (otherUsage >= Number(this.meta("capacity"))) {
        return err("CAPACITY_EXHAUSTED", "capacidad agotada; no se almacena el huevo");
      }
      const next = storeEgg(egg, input.ownerId, { at: input.at, recipientId: input.recipientId });
      if (!next.ok) return err(next.code, next.message);
      this.updateRow(next.value);
      this.recordHistory(next.value, egg.state, input.actorId, input.at, null);
      const eventId = this.publish("egg.stored", next.value, input.at,
        `stored:${egg.eggId}:${Date.parse(input.at)}`, { ownerId: next.value.ownerId, policy: next.value.assignmentPolicy });
      return ok({ value: next.value, eventIds: [eventId] });
    });
  }

  claim(input: { eggId: string; actorId: string; at: string }): DomainResult<StoreOutcome<EggRecord>> {
    return this.atomic(() => {
      const egg = this.get(input.eggId);
      if (!egg) return err("EGG_NOT_FOUND", "huevo inexistente");
      if (!egg.ownerId) return err("OWNER_REQUIRED", "el huevo no tiene propietario");
      const authorization = this.authority.canClaim({ eggId: egg.eggId, actorId: input.actorId, ownerId: egg.ownerId });
      if (!authorization.ok) return err(authorization.code, authorization.message);
      const next = claimEgg(egg, input.at);
      if (!next.ok) return err(next.code, next.message);
      this.updateRow(next.value);
      this.recordHistory(next.value, egg.state, input.actorId, input.at, null);
      const eventId = this.publish("egg.claimed", next.value, input.at,
        `claimed:${egg.eggId}:${Date.parse(input.at)}`, { ownerId: egg.ownerId, actorId: input.actorId });
      return ok({ value: next.value, eventIds: [eventId] });
    });
  }

  cancel(input: { eggId: string; actorId: string; at: string; reason: CancelReason }): DomainResult<StoreOutcome<EggRecord>> {
    return this.atomic(() => {
      const egg = this.get(input.eggId);
      if (!egg) return err("EGG_NOT_FOUND", "huevo inexistente");
      const authorization = this.authority.canCancel({ eggId: egg.eggId, actorId: input.actorId, reason: input.reason });
      if (!authorization.ok) return err(authorization.code, authorization.message);
      const next = cancelEgg(egg, input.reason, input.at);
      if (!next.ok) return err(next.code, next.message);
      this.updateRow(next.value);
      this.recordHistory(next.value, egg.state, input.actorId, input.at, input.reason);
      const eventId = this.publish("egg.cancelled", next.value, input.at,
        `cancelled:${egg.eggId}:${Date.parse(input.at)}`, { reason: input.reason, actorId: input.actorId });
      return ok({ value: next.value, eventIds: [eventId] });
    });
  }

  // -------------------------------------------------------------------------
  // Espera segura, recuperación y replay
  // -------------------------------------------------------------------------

  drainBacklog(input: { actorId: string; at: string; limit?: number }): DomainResult<{ drained: number; blocked: number; remaining: number }> {
    return this.atomic(() => {
      const rows = this.db.query("SELECT * FROM egg_backlog ORDER BY authority_sequence LIMIT ?").all(input.limit ?? 100) as {
        idempotency_key: string; production_event_id: string; cycle_id: string; nursery_id: string;
        authority_sequence: number; input: string; queued_at: string; attempts: number;
      }[];
      let drained = 0;
      let blocked = 0;
      for (const row of rows) {
        const production = parseJSON<EggProductionInput>(row.input);
        const authorization = this.authority.canProduce(production);
        if (!authorization.ok) {
          this.db.query("UPDATE egg_backlog SET attempts = attempts + 1 WHERE idempotency_key = ?").run(row.idempotency_key);
          blocked++;
          continue;
        }
        if (this.usage() >= Number(this.meta("capacity"))) {
          this.db.query("UPDATE egg_backlog SET attempts = attempts + 1 WHERE idempotency_key = ?").run(row.idempotency_key);
          blocked++;
          continue;
        }
        const created = createEgg(production);
        if (!created.ok) {
          this.db.query("UPDATE egg_backlog SET attempts = attempts + 1 WHERE idempotency_key = ?").run(row.idempotency_key);
          blocked++;
          continue;
        }
        const egg = created.value;
        const eventId = this.publish("egg.production.recorded", egg, input.at, row.idempotency_key, {
          eggId: egg.eggId, cycleId: egg.breedingCycleId, recoveredFromBacklog: true,
          authoritySequence: row.authority_sequence, simulated: true,
        });
        this.insertEgg(egg, eventId);
        this.recordHistory(egg, null, input.actorId, input.at, null);
        this.db.query("DELETE FROM egg_backlog WHERE idempotency_key = ?").run(row.idempotency_key);
        this.publish("egg.backlog.drained", egg, input.at, `drained:${row.idempotency_key}`, {
          eggId: egg.eggId, authoritySequence: row.authority_sequence,
        });
        drained++;
      }
      const remaining = (this.db.query("SELECT COUNT(*) AS n FROM egg_backlog").get() as { n: number }).n;
      return ok({ drained, blocked, remaining });
    });
  }

  /** Reaplica un registro externo de eventos; idempotente por idempotencyKey. */
  replay(events: readonly EggReplayEvent[]): DomainResult<{ applied: number; duplicates: number }> {
    return this.atomic(() => {
      let applied = 0;
      let duplicates = 0;
      const sorted = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.idempotencyKey.localeCompare(b.idempotencyKey));
      for (const event of sorted) {
        if (!EGG_EVENT_TYPES.includes(event.type)) return err("REPLAY_EVENT_INVALID", `tipo de evento desconocido ${event.type}`);
        if (Number.isNaN(Date.parse(event.occurredAt))) return err("REPLAY_TIMESTAMP_INVALID", "fecha de evento inválida");
        const canonicalKey = replayKeyOf(event);
        const exists = this.db.query("SELECT 1 FROM egg_events WHERE idempotency_key = ?").get(canonicalKey);
        if (exists) { duplicates++; continue; }
        if (event.type === "egg.production.recorded" || event.type === "egg.queued") {
          const production = event.payload.production as EggProductionInput | undefined;
          if (!production) return err("REPLAY_PAYLOAD_INVALID", "falta el evento de producción original");
          const result = this.produceTx(production);
          if (!result.ok) return err(result.code, result.message);
          applied++;
          continue;
        }
        const egg = this.get(event.eggId);
        if (!egg) return err("REPLAY_EGG_MISSING", "no existe el huevo al que apunta el evento");
        let eventId: string;
        if (event.type === "egg.stored") {
          const ownerId = String(event.payload.ownerId ?? "");
          if (!ownerId) return err("REPLAY_PAYLOAD_INVALID", "falta ownerId");
          const result = this.store({ eggId: event.eggId, ownerId, actorId: String(event.payload.actorId ?? "replay"), at: event.occurredAt });
          if (!result.ok) return err(result.code, result.message);
          eventId = result.value.eventIds[0]!;
        } else if (event.type === "egg.claimed") {
          const result = this.claim({ eggId: event.eggId, actorId: String(event.payload.actorId ?? "replay"), at: event.occurredAt });
          if (!result.ok) return err(result.code, result.message);
          eventId = result.value.eventIds[0]!;
        } else if (event.type === "egg.cancelled") {
          const result = this.cancel({
            eggId: event.eggId, actorId: String(event.payload.actorId ?? "replay"), at: event.occurredAt,
            reason: event.payload.reason as CancelReason,
          });
          if (!result.ok) return err(result.code, result.message);
          eventId = result.value.eventIds[0]!;
        } else {
          eventId = this.publish(event.type, egg, event.occurredAt, event.idempotencyKey, event.payload as Record<string, unknown>);
        }
        // Las transiciones ya publicaron con su propia clave canónica.
        void eventId;
        applied++;
      }
      return ok({ applied, duplicates });
    });
  }

  /** Instantánea lógica, sin archivos PKM ni saves. */
  snapshot(): {
    config: ReturnType<SharedEggStore["config"]>;
    eggs: readonly EggRecord[];
    events: readonly EggEvent[];
    backlog: readonly { readonly cycleId: string; readonly authoritySequence: number; readonly queuedAt: string }[];
  } {
    this.assertOpen();
    return { config: this.config(), eggs: this.listAll(), events: this.events(), backlog: this.backlog() };
  }

  integrityCheck(): IntegrityReport {
    this.assertOpen();
    const issues: string[] = [];
    const pragma = String((this.db.query("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check);
    if (pragma !== "ok") issues.push(`pragma: ${pragma}`);
    if (this.meta("store_schema") !== EGG_STORE_SCHEMA) issues.push("store_schema");
    if (this.meta("contract_version") !== EGG_CONTRACT_VERSION) issues.push("contract_version");

    const rows = this.db.query("SELECT * FROM eggs").all() as EggRow[];
    for (const row of rows) {
      let egg: EggRecord;
      try { egg = this.toEgg(row); } catch (error) {
        issues.push(`payload corrupto: ${row.egg_id} (${error instanceof Error ? error.message : String(error)})`);
        continue;
      }
      if (row.state !== egg.state) issues.push(`estado divergente: ${egg.eggId}`);
      if (row.owner_id !== egg.ownerId) issues.push(`propietario divergente: ${egg.eggId}`);
      if (row.cycle_id !== egg.breedingCycleId || row.nursery_id !== egg.nurseryId) issues.push(`identidad divergente: ${egg.eggId}`);
      const production = this.db.query("SELECT 1 FROM egg_events WHERE event_id = ?").get(row.production_event_id);
      if (!production) issues.push(`evento de producción ausente: ${egg.eggId}`);
      const history = this.history(egg.eggId);
      if (history.length === 0) issues.push(`sin historial: ${egg.eggId}`);
      for (let i = 1; i < history.length; i++) {
        if (!assertTransition(history[i - 1]!.to as EggState, history[i]!.to as EggState, history[i]!.reason as CancelReason | null).ok) {
          issues.push(`transición inválida en historial: ${egg.eggId}`);
        }
      }
    }
    const orphanMessages = (this.db.query(`
      SELECT COUNT(*) AS n FROM egg_outbox o LEFT JOIN egg_events e ON e.event_id = o.event_id WHERE e.event_id IS NULL
    `).get() as { n: number }).n;
    if (orphanMessages > 0) issues.push(`outbox huérfano: ${orphanMessages}`);
    const backlogRows = this.db.query("SELECT cycle_id, production_event_id FROM egg_backlog").all() as {
      cycle_id: string; production_event_id: string;
    }[];
    for (const row of backlogRows) {
      if (this.db.query("SELECT 1 FROM eggs WHERE cycle_id = ?").get(row.cycle_id)) issues.push(`backlog duplicado: ${row.cycle_id}`);
      if (!this.db.query("SELECT 1 FROM egg_events WHERE event_id = ?").get(row.production_event_id)) {
        issues.push(`backlog sin evento: ${row.cycle_id}`);
      }
    }
    const eventCount = (this.db.query("SELECT COUNT(*) AS n FROM egg_events").get() as { n: number }).n;
    const outboxCount = (this.db.query("SELECT COUNT(*) AS n FROM egg_outbox").get() as { n: number }).n;
    return {
      ok: issues.length === 0 && pragma === "ok",
      issues,
      eggs: rows.length,
      events: eventCount,
      backlog: backlogRows.length,
      outbox: outboxCount,
      pragma,
    };
  }
}

export function openSharedEggStore(options: {
  readonly databasePath: string;
  readonly authority?: EggAuthorityPort;
}): SharedEggStore {
  return new SharedEggStore(options);
}
