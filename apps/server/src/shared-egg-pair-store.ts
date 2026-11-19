/**
 * PG-08F — Almacén aislado del par 1+1 de huevos simulados.
 *
 * SQLite de PRUEBAS inyectada; nunca `data/pokegotchi.db`, nunca cajas,
 * nunca PKM, nunca red. Un ciclo completado produce exactamente dos huevos
 * (anfitrión + propietario invitado) en UNA transacción. Si falla uno,
 * no se confirma ninguno y queda información suficiente para reintentar.
 */

import { Database } from "bun:sqlite";
import { basename, dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

import {
  EGG_CONTRACT_VERSION,
  claimEgg,
  createEgg,
  storeEgg,
  validateEgg,
  type CancelReason,
  type EggId,
  type EggParentRef,
  type EggRecord,
  type EggState,
  type DomainResult,
  type PokemonProvenance,
} from "../../../packages/core/src/egg-domain.ts";
import {
  DELIVERY_SCHEMA,
  PAIR_SCHEMA,
  PAIR_VERSION,
  assertBreedablePair,
  assertDistinctPair,
  assertParentsUnchanged,
  deliveryStageOf,
  pairEggIdFor,
  pairEventIdFor,
  recipientForRole,
  unresolvedGenetics,
  type DeliveryRecord,
  type DeliveryStage,
  type EggDeliveryPort,
  type RecipientRole,
} from "../../../packages/core/src/egg-pair-domain.ts";
import {
  permissiveEggAuthority,
  type EggAuthorityPort,
  type EggProductionInput,
} from "./shared-egg-store.ts";

const ok = <T>(value: T): DomainResult<T> => ({ ok: true, value });
const err = <T>(code: string, message: string): DomainResult<T> => ({ ok: false, code, message });

export const PAIR_STORE_SCHEMA = "pg08f.shared-egg-pair-store" as const;
export const PAIR_STORE_VERSION = "1.0.0" as const;
export const DEFAULT_PAIR_CAPACITY = 4;

export type PairProduceInput = {
  readonly cycleId: string;
  readonly nurseryId: string;
  readonly productionEventId: string;
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly authoritySequence: number;
  readonly cycleRevision: string;
  readonly parents: readonly [EggParentRef, EggParentRef];
  readonly parentsBefore?: readonly [EggParentRef, EggParentRef];
  readonly provenance: readonly [PokemonProvenance, PokemonProvenance];
  readonly hostId: string;
  readonly guestOwnerId: string;
  readonly agreedOwnerId?: string | null;
};

export type PairCycleRecord = {
  readonly cycleId: string;
  readonly nurseryId: string;
  readonly productionEventId: string;
  readonly pairRevision: string;
  readonly hostOwnerId: string;
  readonly guestOwnerId: string;
  readonly hostEggId: EggId;
  readonly guestEggId: EggId;
  readonly status: "produced" | "queued";
  readonly producedAt: string;
  readonly authoritySequence: number;
  readonly genetics: ReturnType<typeof unresolvedGenetics>;
};

export type PairProduceOutcome = {
  readonly cycleId: string;
  readonly hostEggId: EggId;
  readonly guestEggId: EggId;
  readonly status: "produced" | "queued";
  readonly created: boolean;
  readonly eventIds: readonly string[];
};

export type PairEvent = {
  readonly eventId: string;
  readonly type: string;
  readonly eggId: string;
  readonly cycleId: string;
  readonly occurredAt: string;
  readonly idempotencyKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
};

export type PairIntegrity = {
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly cycles: number;
  readonly eggs: number;
  readonly events: number;
  readonly outbox: number;
  readonly deliveryCount: number;
  readonly pragma: string;
};

type CycleRow = {
  cycle_id: string; nursery_id: string; production_event_id: string; pair_revision: string;
  host_owner_id: string; guest_owner_id: string; host_egg_id: string; guest_egg_id: string;
  status: string; produced_at: string; authority_sequence: number; input: string;
};
type EggRow = { egg_id: string; cycle_id: string; recipient_role: string; recipient_id: string; state: string; payload: string };
type EventRow = {
  event_id: string; type: string; egg_id: string; cycle_id: string;
  occurred_at: string; idempotency_key: string; payload: string;
};
type DeliveryRow = {
  delivery_id: string; egg_id: string; recipient_id: string; idempotency_key: string;
  status: string; attempts: number; created_at: string; updated_at: string; note: string | null;
};

const JSONof = (value: unknown): string => JSON.stringify(value);
const parseJSON = <T>(text: string): T => JSON.parse(text) as T;
const eventIdFor = (type: string, key: string): string =>
  `pevt:${createHashLike(`${PAIR_SCHEMA}|${type}|${key}`).slice(0, 24)}`;
function createHashLike(text: string): string {
  // Reutiliza el mismo algoritmo determinista del dominio sin importar node:crypto aquí.
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i) + i, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")
    + h2.toString(16).padStart(8, "0") + h1.toString(16).padStart(8, "0");
}

function migrate(db: Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS pair_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pair_events (
      event_id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, type TEXT NOT NULL,
      egg_id TEXT NOT NULL, cycle_id TEXT NOT NULL, occurred_at TEXT NOT NULL, payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pair_cycles (
      cycle_id TEXT PRIMARY KEY, nursery_id TEXT NOT NULL, production_event_id TEXT NOT NULL UNIQUE,
      pair_revision TEXT NOT NULL, host_owner_id TEXT NOT NULL, guest_owner_id TEXT NOT NULL,
      host_egg_id TEXT NOT NULL, guest_egg_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('produced','queued')),
      produced_at TEXT NOT NULL, authority_sequence INTEGER NOT NULL, input TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pair_eggs (
      egg_id TEXT PRIMARY KEY, cycle_id TEXT NOT NULL REFERENCES pair_cycles(cycle_id),
      recipient_role TEXT NOT NULL CHECK (recipient_role IN ('host','guest')),
      recipient_id TEXT NOT NULL, state TEXT NOT NULL, payload TEXT NOT NULL,
      UNIQUE (cycle_id, recipient_role)
    );
    CREATE TABLE IF NOT EXISTS pair_history (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, egg_id TEXT NOT NULL REFERENCES pair_eggs(egg_id),
      from_state TEXT, to_state TEXT NOT NULL, actor_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL, reason TEXT
    );
    CREATE TABLE IF NOT EXISTS pair_backlog (
      cycle_id TEXT PRIMARY KEY, production_event_id TEXT NOT NULL UNIQUE,
      authority_sequence INTEGER NOT NULL, input TEXT NOT NULL,
      queued_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS pair_deliveries (
      delivery_id TEXT PRIMARY KEY, egg_id TEXT NOT NULL UNIQUE REFERENCES pair_eggs(egg_id),
      recipient_id TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('prepared','delivered','failed')),
      attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, note TEXT
    );
    CREATE TABLE IF NOT EXISTS pair_outbox (
      message_id TEXT PRIMARY KEY, event_id TEXT NOT NULL UNIQUE REFERENCES pair_events(event_id),
      egg_id TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('pending','delivered')),
      created_at TEXT NOT NULL, delivered_at TEXT
    );
    CREATE INDEX IF NOT EXISTS pair_eggs_owner_idx ON pair_eggs (recipient_id);
    CREATE INDEX IF NOT EXISTS pair_eggs_cycle_idx ON pair_eggs (cycle_id);
    CREATE INDEX IF NOT EXISTS pair_backlog_order_idx ON pair_backlog (authority_sequence);
  `);
  const insert = db.query("INSERT OR IGNORE INTO pair_meta (key, value) VALUES (?, ?)");
  insert.run("store_schema", PAIR_STORE_SCHEMA);
  insert.run("store_version", PAIR_STORE_VERSION);
  insert.run("contract_version", EGG_CONTRACT_VERSION);
  insert.run("capacity", String(DEFAULT_PAIR_CAPACITY));
  insert.run("last_authority_sequence", "0");
  const version = (db.query("SELECT value FROM pair_meta WHERE key = ?").get("store_version") as { value: string } | undefined)?.value;
  if (version !== PAIR_STORE_VERSION) throw new Error(`PG-08F: versión incompatible del almacén de pares (${version ?? "ausente"})`);
}

export class SharedEggPairStore {
  readonly databasePath: string;
  private readonly db: Database;
  private readonly authority: EggAuthorityPort;
  private closed = false;

  /** Inyección de fallo para demostrar rollback; lo activa la suite de pruebas. */
  failOnEggId: string | null = null;
  failNextDelivery = false;

  constructor(options: { readonly databasePath: string; readonly authority?: EggAuthorityPort }) {
    const path = resolve(options.databasePath);
    if (basename(path).toLowerCase() === "pokegotchi.db") {
      throw new Error("PG-08F: prohibido usar la base original data/pokegotchi.db");
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
    if (this.closed) throw new Error("PG-08F: almacén cerrado");
  }

  /** Límite transaccional real: todos los recursos viven en esta BD. */
  atomic<T>(fn: () => T): T {
    this.assertOpen();
    return this.db.transaction(fn)();
  }

  private meta(key: string): string {
    const row = this.db.query("SELECT value FROM pair_meta WHERE key = ?").get(key) as { value: string } | undefined;
    if (!row) throw new Error(`PG-08F: metadato ausente ${key}`);
    return row.value;
  }

  private setMeta(key: string, value: string): void {
    this.db.query("UPDATE pair_meta SET value = ? WHERE key = ?").run(value, key);
  }

  config(): { capacity: number; lastAuthoritySequence: number; contractVersion: string } {
    this.assertOpen();
    return {
      capacity: Number(this.meta("capacity")),
      lastAuthoritySequence: Number(this.meta("last_authority_sequence")),
      contractVersion: this.meta("contract_version"),
    };
  }

  setCapacity(capacity: number): DomainResult<{ capacity: number }> {
    return this.atomic(() => {
      if (!Number.isInteger(capacity) || capacity < 1) return err("CAPACITY_INVALID", "capacidad inválida");
      this.setMeta("capacity", String(capacity));
      return ok({ capacity });
    });
  }

  // -------------------------------------------------------------------------
  // Consultas
  // -------------------------------------------------------------------------

  private toEgg(row: EggRow): EggRecord {
    const egg = parseJSON<EggRecord>(row.payload);
    const valid = validateEgg(egg);
    if (!valid.ok) throw new Error(`PG-08F: huevo corrupto ${row.egg_id} (${valid.code})`);
    return egg;
  }

  get(eggId: string): EggRecord | null {
    this.assertOpen();
    const row = this.db.query("SELECT * FROM pair_eggs WHERE egg_id = ?").get(eggId) as EggRow | undefined;
    return row ? this.toEgg(row) : null;
  }

  listByCycle(cycleId: string): readonly EggRecord[] {
    this.assertOpen();
    return (this.db.query("SELECT * FROM pair_eggs WHERE cycle_id = ? ORDER BY recipient_role").all(cycleId) as EggRow[]).map((r) => this.toEgg(r));
  }

  listByRecipient(recipientId: string): readonly EggRecord[] {
    this.assertOpen();
    return (this.db.query("SELECT * FROM pair_eggs WHERE recipient_id = ? ORDER BY cycle_id, recipient_role").all(recipientId) as EggRow[]).map((r) => this.toEgg(r));
  }

  listAll(): readonly EggRecord[] {
    this.assertOpen();
    return (this.db.query("SELECT * FROM pair_eggs ORDER BY cycle_id, recipient_role").all() as EggRow[]).map((r) => this.toEgg(r));
  }

  cycle(cycleId: string): PairCycleRecord | null {
    this.assertOpen();
    const row = this.db.query("SELECT * FROM pair_cycles WHERE cycle_id = ?").get(cycleId) as CycleRow | undefined;
    if (!row) return null;
    return {
      cycleId: row.cycle_id, nurseryId: row.nursery_id, productionEventId: row.production_event_id,
      pairRevision: row.pair_revision, hostOwnerId: row.host_owner_id, guestOwnerId: row.guest_owner_id,
      hostEggId: row.host_egg_id as EggId, guestEggId: row.guest_egg_id as EggId,
      status: row.status as PairCycleRecord["status"], producedAt: row.produced_at,
      authoritySequence: row.authority_sequence, genetics: unresolvedGenetics(Number.NaN),
    };
  }

  events(): readonly PairEvent[] {
    this.assertOpen();
    return (this.db.query("SELECT * FROM pair_events ORDER BY occurred_at, event_id").all() as EventRow[]).map(toEvent);
  }

  outbox(): readonly PairEvent[] {
    this.assertOpen();
    return (this.db.query(`
      SELECT e.* FROM pair_outbox o JOIN pair_events e ON e.event_id = o.event_id ORDER BY o.message_id
    `).all() as EventRow[]).map(toEvent);
  }

  backlog(): readonly { readonly cycleId: string; readonly authoritySequence: number; readonly queuedAt: string }[] {
    this.assertOpen();
    return (this.db.query("SELECT cycle_id, authority_sequence, queued_at FROM pair_backlog ORDER BY authority_sequence").all() as {
      cycle_id: string; authority_sequence: number; queued_at: string;
    }[]).map((r) => ({ cycleId: r.cycle_id, authoritySequence: r.authority_sequence, queuedAt: r.queued_at }));
  }

  delivery(deliveryId: string): DeliveryRecord | null {
    this.assertOpen();
    const row = this.db.query("SELECT * FROM pair_deliveries WHERE delivery_id = ?").get(deliveryId) as DeliveryRow | undefined;
    return row ? toDelivery(row) : null;
  }

  deliveryByKey(idempotencyKey: string): DeliveryRecord | null {
    this.assertOpen();
    const row = this.db.query("SELECT * FROM pair_deliveries WHERE idempotency_key = ?").get(idempotencyKey) as DeliveryRow | undefined;
    return row ? toDelivery(row) : null;
  }

  private usageFor(recipientId: string): number {
    return (this.db.query(
      "SELECT COUNT(*) AS n FROM pair_eggs WHERE recipient_id = ? AND state IN ('produced','pending_assignment','stored')",
    ).get(recipientId) as { n: number }).n;
  }

  // -------------------------------------------------------------------------
  // Producción atómica 1+1
  // -------------------------------------------------------------------------

  produce(input: PairProduceInput): DomainResult<PairProduceOutcome> {
    return this.atomic(() => this.produceTx(input));
  }

  produceTx(input: PairProduceInput, fromBacklog = false): DomainResult<PairProduceOutcome> {
    if (!input || !input.cycleId || !input.productionEventId || !input.idempotencyKey) {
      return err("PAIR_IDENTITY_INCOMPLETE", "faltan identificadores del ciclo");
    }
    const prior = this.db.query("SELECT cycle_id, host_egg_id, guest_egg_id, status FROM pair_cycles WHERE cycle_id = ?").get(input.cycleId) as {
      cycle_id: string; host_egg_id: string; guest_egg_id: string; status: string;
    } | undefined;
    if (prior) {
      return ok({
        cycleId: prior.cycle_id, hostEggId: prior.host_egg_id as EggId, guestEggId: prior.guest_egg_id as EggId,
        status: prior.status as PairProduceOutcome["status"], created: false, eventIds: [],
      });
    }
    const queued = this.db.query("SELECT cycle_id FROM pair_backlog WHERE cycle_id = ?").get(input.cycleId);
    const hostEggId = pairEggIdFor(input.cycleId, input.productionEventId, "host");
    const guestEggId = pairEggIdFor(input.cycleId, input.productionEventId, "guest");
    if (queued && !fromBacklog) return ok({ cycleId: input.cycleId, hostEggId, guestEggId, status: "queued", created: false, eventIds: [] });

    if (!Array.isArray(input.parents) || input.parents.length !== 2) return err("PAIR_PARENTS_INVALID", "se requieren dos progenitores");
    const parentsBefore = input.parentsBefore ?? input.parents;
    const parentsCheck = assertParentsUnchanged(parentsBefore, input.parents);
    if (!parentsCheck.ok) return err(parentsCheck.code, parentsCheck.message);
    const provenanceCheck = assertBreedablePair(input.provenance);
    if (!provenanceCheck.ok) return err(provenanceCheck.code, provenanceCheck.message);
    const distinct = assertDistinctPair(hostEggId, guestEggId);
    if (!distinct.ok) return err(distinct.code, distinct.message);

    const ownerContext = { hostId: input.hostId, guestOwnerId: input.guestOwnerId, agreedOwnerId: input.agreedOwnerId ?? null };
    const ownerOf = (role: RecipientRole): string => recipientForRole(role, ownerContext);
    const hostOwner = ownerOf("host");
    const guestOwner = ownerOf("guest");
    if (!hostOwner || !guestOwner || hostOwner === guestOwner) {
      return err("RECIPIENTS_INVALID", "los dos destinatarios deben ser distintos y estar presentes");
    }
    for (const role of ["host", "guest"] as const) {
      const base: EggProductionInput = {
        cycleId: input.cycleId, nurseryId: input.nurseryId,
        productionEventId: pairEventIdFor(input.cycleId, input.productionEventId, role),
        idempotencyKey: `${input.idempotencyKey}:${role}`, occurredAt: input.occurredAt,
        authoritySequence: input.authoritySequence, cycleRevision: input.cycleRevision,
        parents: input.parents, provenance: input.provenance, hostId: input.hostId,
      };
      const authorization = this.authority.canProduce(base);
      if (!authorization.ok) return err(authorization.code, authorization.message);
    }

    const sequence = this.authority.sequenceFor({
      productionEventId: input.productionEventId, nurseryId: input.nurseryId,
      cycleId: input.cycleId, occurredAt: input.occurredAt,
    });
    if (sequence <= Number(this.meta("last_authority_sequence"))) return err("STALE_ORDER", "orden obsoleto de la autoridad");

    // Capacidad: se comprueban AMBOS destinos antes de confirmar cualquiera.
    if (this.usageFor(hostOwner) >= this.config().capacity || this.usageFor(guestOwner) >= this.config().capacity) {
      this.db.query(`
        INSERT INTO pair_backlog (cycle_id, production_event_id, authority_sequence, input, queued_at, attempts)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(input.cycleId, input.productionEventId, sequence, JSONof(input), input.occurredAt);
      this.publish("egg.queued", hostEggId, input.cycleId, input.occurredAt,
        `queued:${input.cycleId}`, { reason: "capacity_exhausted", hostEggId, guestEggId, authoritySequence: sequence });
      this.setMeta("last_authority_sequence", String(sequence));
      return ok({ cycleId: input.cycleId, hostEggId, guestEggId, status: "queued", created: false, eventIds: [] });
    }

    // El ciclo se inserta ANTES que los huevos: `pair_eggs` tiene FK a él.
    // Sigue siendo todo o nada porque esta operación vive en una transacción.
    this.db.query(`
      INSERT INTO pair_cycles (cycle_id, nursery_id, production_event_id, pair_revision,
        host_owner_id, guest_owner_id, host_egg_id, guest_egg_id, status, produced_at, authority_sequence, input)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)
    `).run(input.cycleId, input.nurseryId, input.productionEventId, input.cycleRevision,
      hostOwner, guestOwner, hostEggId, guestEggId, input.occurredAt, sequence, JSONof(input));

    const eventIds: string[] = [];
    const createdEggs: { role: RecipientRole; egg: EggRecord }[] = [];
    for (const role of ["host", "guest"] as const) {
      const owner = ownerOf(role);
      const productionEventId = pairEventIdFor(input.cycleId, input.productionEventId, role);
      const made = createEgg({
        cycleId: input.cycleId, nurseryId: input.nurseryId, productionEventId,
        idempotencyKey: `${input.idempotencyKey}:${role}`, occurredAt: input.occurredAt,
        authoritySequence: sequence, cycleRevision: input.cycleRevision,
        parents: input.parents, provenance: input.provenance,
        ownerId: owner, recipientId: owner,
        assignmentPolicy: role === "host" ? "host" : "guest_owner",
      });
      if (!made.ok) return err(made.code, made.message);
      const stored = storeEgg(made.value, owner, { at: input.occurredAt, recipientId: owner });
      if (!stored.ok) return err(stored.code, stored.message);
      const egg = stored.value;
      eventIds.push(this.publish("egg.production.recorded", egg.eggId, input.cycleId, input.occurredAt,
        `pair-production:${input.cycleId}:${role}`, {
          role, ownerId: owner, pair: input.parents.map((p) => p.pokemonInstanceId),
          provenance: input.provenance.map((p) => p.class), authoritySequence: sequence, simulated: true,
          genetics: unresolvedGenetics(0),
        }));
      eventIds.push(this.publish("egg.stored", egg.eggId, input.cycleId, input.occurredAt,
        `pair-stored:${egg.eggId}`, { role, ownerId: owner, state: "stored" }));
      this.insertEgg(egg, role, owner);
      this.recordHistory(egg, null, input.hostId, null);
      if (this.failOnEggId === egg.eggId) throw new Error(`PG-08F: fallo de persistencia inyectado en ${egg.eggId}`);
      createdEggs.push({ role, egg });
    }
    const host = createdEggs.find((e) => e.role === "host")!.egg;
    const guest = createdEggs.find((e) => e.role === "guest")!.egg;
    // Solo después de persistir AMBOS huevos se confirma el ciclo.
    this.db.query("UPDATE pair_cycles SET status = 'produced' WHERE cycle_id = ?").run(input.cycleId);
    eventIds.push(this.publish("egg.pair.produced", host.eggId, input.cycleId, input.occurredAt,
      `pair:${input.cycleId}`, {
        hostEggId: host.eggId, guestEggId: guest.eggId, hostOwner, guestOwner,
        sameCycle: true, intervalIsSingle: true, authoritySequence: sequence, simulated: true,
        production: input,
      }));
    this.setMeta("last_authority_sequence", String(sequence));
    return ok({ cycleId: input.cycleId, hostEggId: host.eggId, guestEggId: guest.eggId, status: "produced", created: true, eventIds });
  }

  /** Recuperación del par en espera por capacidad; nunca produce un tercer huevo. */
  drainBacklog(input: { actorId: string; at: string; limit?: number }): DomainResult<{ drained: number; blocked: number; remaining: number }> {
    return this.atomic(() => {
      const rows = this.db.query("SELECT * FROM pair_backlog ORDER BY authority_sequence LIMIT ?").all(input.limit ?? 100) as {
        cycle_id: string; production_event_id: string; authority_sequence: number; input: string; attempts: number;
      }[];
      let drained = 0, blocked = 0;
      for (const row of rows) {
        const original = parseJSON<PairProduceInput>(row.input);
        const result = this.produceTx(original, true);
        if (!result.ok || result.value.status !== "produced") {
          this.db.query("UPDATE pair_backlog SET attempts = attempts + 1 WHERE cycle_id = ?").run(row.cycle_id);
          blocked++;
          continue;
        }
        this.db.query("DELETE FROM pair_backlog WHERE cycle_id = ?").run(row.cycle_id);
        this.publish("egg.backlog.drained", result.value.hostEggId, row.cycle_id, input.at,
          `pair-drained:${row.cycle_id}`, { cycleId: row.cycle_id, authoritySequence: row.authority_sequence });
        drained++;
      }
      const remaining = (this.db.query("SELECT COUNT(*) AS n FROM pair_backlog").get() as { n: number }).n;
      return ok({ drained, blocked, remaining });
    });
  }

  // -------------------------------------------------------------------------
  // Entrega simulada
  // -------------------------------------------------------------------------

  prepareDelivery(input: { eggId: string; recipientId: string; idempotencyKey: string; at: string }): DomainResult<DeliveryRecord> {
    return this.atomic(() => {
      const egg = this.get(input.eggId);
      if (!egg) return err("EGG_NOT_FOUND", "huevo inexistente");
      if (egg.ownerId !== input.recipientId || egg.recipientId !== input.recipientId) {
        return err("RECIPIENT_MISMATCH", "el destinatario no coincide con el propietario del huevo");
      }
      if (egg.state !== "stored") return err("EGG_NOT_AVAILABLE", "el huevo no está disponible para entrega");
      const prior = this.deliveryByKey(input.idempotencyKey);
      if (prior) return ok(prior);
      const byEgg = this.db.query("SELECT * FROM pair_deliveries WHERE egg_id = ?").get(input.eggId) as DeliveryRow | undefined;
      if (byEgg) return ok(toDelivery(byEgg));
      const delivery: DeliveryRecord = {
        schema: DELIVERY_SCHEMA, deliveryId: `delivery:${input.eggId}`, eggId: egg.eggId,
        recipientId: input.recipientId, idempotencyKey: input.idempotencyKey,
        status: "prepared", attempts: 0, createdAt: input.at, updatedAt: input.at, note: null,
      };
      this.db.query(`
        INSERT INTO pair_deliveries (delivery_id, egg_id, recipient_id, idempotency_key, status, attempts, created_at, updated_at, note)
        VALUES (?, ?, ?, ?, 'prepared', 0, ?, ?, NULL)
      `).run(delivery.deliveryId, delivery.eggId, delivery.recipientId, delivery.idempotencyKey, delivery.createdAt, delivery.updatedAt);
      this.publish("egg.pair.delivery.prepared", egg.eggId, egg.breedingCycleId, input.at,
        `delivery-prepared:${input.idempotencyKey}`, { recipientId: input.recipientId, stage: "available" });
      return ok(delivery);
    });
  }

  confirmDelivery(input: { deliveryId: string; idempotencyKey: string; at: string }): DomainResult<DeliveryRecord> {
    return this.atomic(() => {
      const row = this.db.query("SELECT * FROM pair_deliveries WHERE delivery_id = ?").get(input.deliveryId) as DeliveryRow | undefined;
      if (!row) return err("DELIVERY_NOT_FOUND", "entrega inexistente");
      if (row.idempotency_key !== input.idempotencyKey) return err("IDEMPOTENCY_MISMATCH", "clave de entrega distinta");
      if (row.status === "delivered") return ok(toDelivery(row));
      const egg = this.get(row.egg_id);
      if (!egg) return err("EGG_NOT_FOUND", "huevo de la entrega inexistente");
      const authorization = this.authority.canClaim({ eggId: egg.eggId, actorId: row.recipient_id, ownerId: row.recipient_id });
      if (!authorization.ok) return err(authorization.code, authorization.message);
      if (this.failNextDelivery) {
        this.failNextDelivery = false;
        throw new Error("PG-08F: fallo de entrega simulado");
      }
      const next = claimEgg(egg, input.at);
      if (!next.ok) return err(next.code, next.message);
      this.db.query(`UPDATE pair_eggs SET state = ?, payload = ? WHERE egg_id = ?`).run(next.value.state, JSONof(next.value), egg.eggId);
      this.recordHistory(next.value, egg.state, row.recipient_id, null);
      this.publish("egg.claimed", egg.eggId, egg.breedingCycleId, input.at, `claim:${egg.eggId}`, { ownerId: row.recipient_id });
      this.publish("egg.pair.delivery.confirmed", egg.eggId, egg.breedingCycleId, input.at,
        `delivery-confirmed:${input.idempotencyKey}`, { recipientId: row.recipient_id, deliveryId: row.delivery_id });
      this.db.query(`
        UPDATE pair_deliveries SET status = 'delivered', attempts = attempts + 1, updated_at = ?, note = NULL WHERE delivery_id = ?
      `).run(input.at, row.delivery_id);
      return ok(this.delivery(row.delivery_id)!);
    });
  }

  retry(idempotencyKey: string, at = new Date().toISOString()): DomainResult<DeliveryRecord> {
    const delivery = this.deliveryByKey(idempotencyKey);
    if (!delivery) return err("DELIVERY_NOT_FOUND", "clave de entrega desconocida");
    return this.confirmDelivery({ deliveryId: delivery.deliveryId, idempotencyKey, at });
  }

  /** Reaplica eventos de producción; idempotente por ciclo y por evento. */
  replay(events: readonly PairEvent[]): DomainResult<{ applied: number; duplicates: number }> {
    return this.atomic(() => {
      let applied = 0, duplicates = 0;
      const sorted = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.eventId.localeCompare(b.eventId));
      for (const event of sorted) {
        if (event.type !== "egg.pair.produced" && event.type !== "egg.queued") {
          duplicates++;
          continue;
        }
        const production = event.payload.production as PairProduceInput | undefined;
        if (!production) return err("REPLAY_PAYLOAD_INVALID", "el evento no incluye la producción original");
        const result = this.produceTx(production, event.type === "egg.queued");
        if (!result.ok) return err(result.code, result.message);
        if (result.value.created) applied++;
        else duplicates++;
      }
      return ok({ applied, duplicates });
    });
  }

  stageOf(eggId: string): DomainResult<DeliveryStage> {
    const egg = this.get(eggId);
    const row = this.db.query("SELECT * FROM pair_deliveries WHERE egg_id = ?").get(eggId) as DeliveryRow | undefined;
    return ok(deliveryStageOf(egg, row ? toDelivery(row) : null));
  }

  // -------------------------------------------------------------------------
  // Persistencia y auditoría
  // -------------------------------------------------------------------------

  private publish(type: string, eggId: string, cycleId: string, at: string, idempotencyKey: string, payload: Record<string, unknown>): string {
    const prior = this.db.query("SELECT event_id FROM pair_events WHERE idempotency_key = ?").get(idempotencyKey) as { event_id: string } | undefined;
    if (prior) return prior.event_id;
    const eventId = eventIdFor(type, idempotencyKey);
    this.db.query(`
      INSERT INTO pair_events (event_id, idempotency_key, type, egg_id, cycle_id, occurred_at, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, idempotencyKey, type, eggId, cycleId, at, JSONof(payload));
    this.db.query(`
      INSERT INTO pair_outbox (message_id, event_id, egg_id, type, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(`msg:${eventId}`, eventId, eggId, type, at);
    return eventId;
  }

  private recordHistory(egg: EggRecord, from: EggState | null, actorId: string, reason: string | null): void {
    this.db.query(`
      INSERT INTO pair_history (egg_id, from_state, to_state, actor_id, occurred_at, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(egg.eggId, from, egg.state, actorId, egg.updatedAt, reason);
  }

  private insertEgg(egg: EggRecord, role: RecipientRole, recipientId: string): void {
    this.db.query(`
      INSERT INTO pair_eggs (egg_id, cycle_id, recipient_role, recipient_id, state, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(egg.eggId, egg.breedingCycleId, role, recipientId, egg.state, JSONof(egg));
  }

  integrityCheck(): PairIntegrity {
    this.assertOpen();
    const issues: string[] = [];
    const pragma = String((this.db.query("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check);
    if (pragma !== "ok") issues.push(`pragma: ${pragma}`);
    if (this.meta("store_schema") !== PAIR_STORE_SCHEMA) issues.push("store_schema");
    if (this.meta("contract_version") !== EGG_CONTRACT_VERSION) issues.push("contract_version");
    const cycles = this.db.query("SELECT COUNT(*) AS n FROM pair_cycles").get() as { n: number };
    const eggs = this.db.query("SELECT * FROM pair_eggs").all() as EggRow[];
    for (const row of eggs) {
      try {
        const egg = this.toEgg(row);
        if (row.state !== egg.state) issues.push(`estado divergente: ${egg.eggId}`);
      } catch (error) {
        issues.push(`payload corrupto: ${row.egg_id} (${error instanceof Error ? error.message : String(error)})`);
      }
      const byCycle = this.db.query("SELECT 1 FROM pair_cycles WHERE cycle_id = ?").get(row.cycle_id);
      if (!byCycle) issues.push(`ciclo huérfano: ${row.egg_id}`);
    }
    for (const cycle of this.db.query("SELECT * FROM pair_cycles").all() as CycleRow[]) {
      const pair = this.db.query("SELECT COUNT(*) AS n FROM pair_eggs WHERE cycle_id = ?").get(cycle.cycle_id) as { n: number };
      if (cycle.status === "produced" && pair.n !== 2) issues.push(`par incompleto confirmado: ${cycle.cycle_id}`);
      if (cycle.host_egg_id === cycle.guest_egg_id) issues.push(`identidades colisionadas: ${cycle.cycle_id}`);
    }
    const orphan = (this.db.query(`
      SELECT COUNT(*) AS n FROM pair_outbox o LEFT JOIN pair_events e ON e.event_id = o.event_id WHERE e.event_id IS NULL
    `).get() as { n: number }).n;
    if (orphan > 0) issues.push(`outbox huérfano: ${orphan}`);
    const events = (this.db.query("SELECT COUNT(*) AS n FROM pair_events").get() as { n: number }).n;
    const outbox = (this.db.query("SELECT COUNT(*) AS n FROM pair_outbox").get() as { n: number }).n;
    const deliveryCount = (this.db.query("SELECT COUNT(*) AS n FROM pair_deliveries").get() as { n: number }).n;
    return {
      ok: issues.length === 0 && pragma === "ok", issues, cycles: cycles.n, eggs: eggs.length,
      events, outbox, deliveryCount, pragma,
    };
  }
}

function toEvent(row: EventRow): PairEvent {
  return {
    eventId: row.event_id, type: row.type, eggId: row.egg_id, cycleId: row.cycle_id,
    occurredAt: row.occurred_at, idempotencyKey: row.idempotency_key,
    payload: parseJSON<Record<string, unknown>>(row.payload),
  };
}

function toDelivery(row: DeliveryRow): DeliveryRecord {
  return {
    schema: DELIVERY_SCHEMA, deliveryId: row.delivery_id, eggId: row.egg_id as EggId,
    recipientId: row.recipient_id, idempotencyKey: row.idempotency_key,
    status: row.status as DeliveryRecord["status"], attempts: row.attempts,
    createdAt: row.created_at, updatedAt: row.updated_at, note: row.note,
  };
}

export function openSharedEggPairStore(options: {
  readonly databasePath: string;
  readonly authority?: EggAuthorityPort;
}): SharedEggPairStore {
  return new SharedEggPairStore(options);
}

/** Implementación simulada del puerto de entrega; no toca cajas ni saves. */
export function simulatedDeliveryPort(store: SharedEggPairStore): EggDeliveryPort {
  return {
    pendingEggs: (recipientId) => store.listByRecipient(recipientId).filter((egg) => egg.state === "stored"),
    verifyRecipient: (eggId, recipientId) => {
      const egg = store.get(eggId);
      if (!egg) return err("EGG_NOT_FOUND", "huevo inexistente");
      if (egg.ownerId !== recipientId || egg.recipientId !== recipientId) return err("RECIPIENT_MISMATCH", "destinatario incorrecto");
      return ok(true);
    },
    prepareDelivery: (input) => store.prepareDelivery(input),
    confirmDelivery: (input) => store.confirmDelivery(input),
    status: (eggId) => {
      const egg = store.get(eggId);
      if (!egg) return err("EGG_NOT_FOUND", "huevo inexistente");
      const row = store.delivery(eggId);
      return ok({ stage: deliveryStageOf(egg, row), eggState: egg.state, delivery: row });
    },
    retry: (idempotencyKey) => store.retry(idempotencyKey),
  };
}

export type { CancelReason };
