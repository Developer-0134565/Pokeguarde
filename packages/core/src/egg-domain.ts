/**
 * PG-08E — Dominio puro de huevos simulados: identidad, procedencia,
 * propiedad, destinatario, estados y legitimidad.
 *
 * MÓDULO PURO. No importa Bun, SQLite, HTTP, DOM, PKHeX ni el motor
 * Tamagotchi. Los huevos son REGISTROS SIMULADOS: no son PKM, no eclosionan,
 * no tienen IV/DV, naturaleza, habilidad, movimientos ni shiny, y NUNCA se
 * insertan en un save.
 *
 * La procedencia es un contrato AISLADO: PG-08A no modela aún el origen
 * PLAY NOW / DEMO. Ninguna clasificación se infiere de nombre, especie, PID
 * ni del veredicto de legalidad (`unverified` NO es `illegal` ni DEMO).
 */

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// 1. Identidad y constantes
// ---------------------------------------------------------------------------

export const EGG_SCHEMA = "pg08e.egg-domain" as const;
export const EGG_CONTRACT_VERSION = "1.0.0" as const;
export const PROVENANCE_SCHEMA = "pg08e.provenance" as const;
export const PROVENANCE_VERSION = "1.0.0" as const;

export const EGG_STATES = [
  "produced",
  "pending_assignment",
  "stored",
  "claimed",
  "cancelled",
] as const;
export type EggState = (typeof EGG_STATES)[number];

export const ASSIGNMENT_POLICIES = [
  "guest_owner",
  "host",
  "prearranged",
  "pending",
] as const;
export type AssignmentPolicy = (typeof ASSIGNMENT_POLICIES)[number];

export const PROVENANCE_CLASSES = [
  "SAVE_IMPORTED",
  "DEMO_INTERNAL_NON_EXPORTABLE",
  "UNKNOWN_UNVERIFIED",
] as const;
export type ProvenanceClass = (typeof PROVENANCE_CLASSES)[number];

export const CANCEL_REASONS = [
  "cycle_invalidated",
  "duplicate_superseded",
  "recipient_rejected",
  "authority_rejected",
] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export type EggId = string & { readonly __brand: "EggId" };
export const asEggId = (value: string): EggId => value as EggId;

/** Legitimidad del registro: es información, nunca un PKM disfrazado. */
export const EGG_LEGITIMACY = Object.freeze({
  class: "SIMULATED_LOG_ONLY",
  simulated: true,
  realPkm: false,
  exportable: false,
  hatched: false,
});
export type EggLegitimacy = typeof EGG_LEGITIMACY;

export type DomainResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: string; readonly message: string };

const ok = <T>(value: T): DomainResult<T> => ({ ok: true, value });
const err = <T>(code: string, message: string): DomainResult<T> => ({ ok: false, code, message });

const stableHash = (label: string): string =>
  createHash("sha256").update(label).digest("hex");

/** Identidad estable: NO depende de nombre, especie, PID ni contenido del Pokémon. */
export function eggIdFor(cycleId: string, productionEventId: string): EggId {
  if (!cycleId || !productionEventId) throw new Error("PG-08E: ciclo o evento vacío");
  return asEggId(`egg:${cycleId}:${stableHash(`pg08e.egg|${cycleId}|${productionEventId}`).slice(0, 16)}`);
}

export function eggEventIdFor(eventType: string, idempotencyKey: string): string {
  return `eggevt:${stableHash(`pg08e.event|${eventType}|${idempotencyKey}`).slice(0, 24)}`;
}

// ---------------------------------------------------------------------------
// 2. Procedencia (contrato aislado, inmutable)
// ---------------------------------------------------------------------------

export const PROVENANCE_SOURCES = ["save_import", "play_now_demo", "unknown"] as const;
export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number];

export interface ProvenanceInput {
  readonly instanceId: string;
  readonly source: ProvenanceSource;
  /** Obligatorio y verificable cuando `source === "save_import"`. */
  readonly saveSha256?: string | null;
  readonly evidenceHash?: string | null;
}

export interface PokemonProvenance {
  readonly schema: typeof PROVENANCE_SCHEMA;
  readonly version: typeof PROVENANCE_VERSION;
  readonly instanceId: string;
  readonly source: ProvenanceSource;
  readonly class: ProvenanceClass;
  readonly evidenceHash: string | null;
  readonly classifiedAt: string;
  readonly immutable: true;
}

/** PLAY NOW se clasifica para siempre como DEMO no exportable. */
export function demoProvenance(instanceId: string, at: string): PokemonProvenance {
  return classifyProvenance({ instanceId, source: "play_now_demo" }, at);
}

/**
 * Clasificación explícita. Ante ausencia de evidencia, FALLO CERRADO:
 * `UNKNOWN_UNVERIFIED`. Registros existentes NUNCA reciben una procedencia
 * inventada; hay que aportar `save_import` con SHA verificable.
 */
export function classifyProvenance(input: ProvenanceInput, at: string): PokemonProvenance {
  if (!input || !input.instanceId || Number.isNaN(Date.parse(at))) {
    throw new Error("PG-08E: procedencia inválida");
  }
  const source = input.source;
  if (!PROVENANCE_SOURCES.includes(source)) throw new Error("PG-08E: fuente de procedencia desconocida");
  const validSaveHash = typeof input.saveSha256 === "string" && /^[a-f0-9]{64}$/i.test(input.saveSha256);
  let classification: ProvenanceClass;
  if (source === "play_now_demo") {
    classification = "DEMO_INTERNAL_NON_EXPORTABLE";
  } else if (source === "save_import" && validSaveHash) {
    classification = "SAVE_IMPORTED";
  } else {
    classification = "UNKNOWN_UNVERIFIED";
  }
  return {
    schema: PROVENANCE_SCHEMA,
    version: PROVENANCE_VERSION,
    instanceId: input.instanceId,
    source,
    class: classification,
    evidenceHash: validSaveHash ? input.saveSha256! : (input.evidenceHash ?? null),
    classifiedAt: new Date(at).toISOString(),
    immutable: true,
  };
}

export function isBreedableProvenance(provenance: PokemonProvenance): DomainResult<true> {
  if (!provenance || provenance.schema !== PROVENANCE_SCHEMA || provenance.version !== PROVENANCE_VERSION) {
    return err("PROVENANCE_CONTRACT_INVALID", "procedencia sin contrato PG-08E válido");
  }
  if (provenance.class === "DEMO_INTERNAL_NON_EXPORTABLE") {
    return err("DEMO_PROVENANCE_BLOCKED", "Pokémon DEMO interno: no criar, producir, intercambiar ni exportar");
  }
  if (provenance.class !== "SAVE_IMPORTED") {
    return err("UNKNOWN_PROVENANCE_BLOCKED", "procedencia desconocida: producción bloqueada");
  }
  return ok(true);
}

/** Un metadato nunca puede convertir un DEMO en importado (ni viceversa). */
export function assertProvenanceUnchanged(before: PokemonProvenance, after: PokemonProvenance): DomainResult<true> {
  if (before.instanceId !== after.instanceId
    || before.source !== after.source
    || before.class !== after.class
    || before.evidenceHash !== after.evidenceHash
    || before.classifiedAt !== after.classifiedAt) {
    return err("PROVENANCE_MUTATED", "la clasificación de procedencia es permanente");
  }
  return ok(true);
}

// ---------------------------------------------------------------------------
// 3. Contrato del huevo
// ---------------------------------------------------------------------------

export interface EggParentRef {
  readonly stayId: string;
  readonly pokemonInstanceId: string;
  readonly ownerId: string;
  readonly role: "guest" | "host";
}

export interface EggProductionOrigin {
  readonly productionEventId: string;
  readonly idempotencyKey: string;
  readonly producedAt: string;
  readonly authoritySequence: number;
  readonly cycleRevision: string;
}

export interface EggRecord {
  readonly schema: typeof EGG_SCHEMA;
  readonly version: typeof EGG_CONTRACT_VERSION;
  readonly eggId: EggId;
  readonly nurseryId: string;
  readonly breedingCycleId: string;
  readonly parents: readonly [EggParentRef, EggParentRef];
  readonly provenance: readonly [PokemonProvenance, PokemonProvenance];
  readonly producedAt: string;
  readonly production: EggProductionOrigin;
  readonly ownerId: string | null;
  readonly recipientId: string | null;
  readonly assignmentPolicy: AssignmentPolicy;
  readonly state: EggState;
  readonly cancelReason: CancelReason | null;
  readonly legitimacy: EggLegitimacy;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateEggInput {
  readonly cycleId: string;
  readonly nurseryId: string;
  readonly productionEventId: string;
  readonly idempotencyKey: string;
  readonly occurredAt: string;
  readonly authoritySequence: number;
  readonly cycleRevision: string;
  readonly parents: readonly [EggParentRef, EggParentRef];
  readonly provenance: readonly [PokemonProvenance, PokemonProvenance];
  readonly ownerId?: string | null;
  readonly recipientId?: string | null;
  readonly assignmentPolicy: AssignmentPolicy;
}

export function validateEgg(egg: EggRecord): DomainResult<true> {
  if (!egg || egg.schema !== EGG_SCHEMA || egg.version !== EGG_CONTRACT_VERSION) {
    return err("EGG_CONTRACT_INVALID", "versión de contrato de huevo inválida");
  }
  const expected = eggIdFor(egg.breedingCycleId, egg.production.productionEventId);
  if (egg.eggId !== expected) {
    return err("EGG_ID_MISMATCH", "el eggId no deriva del ciclo y del evento de producción");
  }
  if (!egg.nurseryId || !egg.breedingCycleId || !egg.production.productionEventId || !egg.production.idempotencyKey) {
    return err("EGG_IDENTITY_INCOMPLETE", "identidad del huevo incompleta");
  }
  if (!Number.isFinite(egg.production.authoritySequence) || egg.production.authoritySequence < 0) {
    return err("AUTHORITY_SEQUENCE_INVALID", "secuencia authority inválida");
  }
  if (Number.isNaN(Date.parse(egg.producedAt)) || Number.isNaN(Date.parse(egg.createdAt)) || Number.isNaN(Date.parse(egg.updatedAt))) {
    return err("EGG_TIMESTAMP_INVALID", "marcas de tiempo inválidas");
  }
  if (!Array.isArray(egg.parents) || egg.parents.length !== 2) {
    return err("PAIR_INCOMPLETE", "el huevo debe tener dos progenitores");
  }
  const [a, b] = egg.parents;
  if (!a || !b || a.stayId === b.stayId || a.pokemonInstanceId === b.pokemonInstanceId
    || !a.stayId || !b.stayId || !a.pokemonInstanceId || !b.pokemonInstanceId
    || !a.ownerId || !b.ownerId || !["guest", "host"].includes(a.role) || !["guest", "host"].includes(b.role)) {
    return err("PAIR_INVALID", "referencias de progenitores inválidas");
  }
  if (!Array.isArray(egg.provenance) || egg.provenance.length !== 2) {
    return err("PROVENANCE_INCOMPLETE", "procedencia incompleta");
  }
  for (let i = 0; i < 2; i++) {
    const provenance = egg.provenance[i]!;
    if (provenance.instanceId !== egg.parents[i]!.pokemonInstanceId) {
      return err("PROVENANCE_MISMATCH", "la procedencia no corresponde al progenitor");
    }
    if (provenance.immutable !== true) {
      return err("PROVENANCE_MUTABLE", "la procedencia debe ser inmutable");
    }
  }
  if (!EGG_STATES.includes(egg.state)) return err("EGG_STATE_INVALID", "estado de huevo desconocido");
  if (!ASSIGNMENT_POLICIES.includes(egg.assignmentPolicy)) {
    return err("ASSIGNMENT_POLICY_INVALID", "política de asignación desconocida");
  }
  if (egg.state === "cancelled" && !egg.cancelReason) {
    return err("CANCEL_REASON_MISSING", "un huevo cancelado exige motivo");
  }
  if (egg.state !== "cancelled" && egg.cancelReason !== null) {
    return err("CANCEL_REASON_UNEXPECTED", "motivo de cancelación fuera de estado");
  }
  if (egg.legitimacy.class !== EGG_LEGITIMACY.class
    || egg.legitimacy.simulated !== true
    || egg.legitimacy.realPkm !== false
    || egg.legitimacy.exportable !== false
    || egg.legitimacy.hatched !== false) {
    return err("LEGITIMACY_INVALID", "el huevo debe ser solo un registro simulado");
  }
  return ok(true);
}

export function createEgg(input: CreateEggInput): DomainResult<EggRecord> {
  if (!input.cycleId || !input.nurseryId || !input.productionEventId || !input.idempotencyKey) {
    return err("EGG_IDENTITY_INCOMPLETE", "faltan identificadores de producción");
  }
  if (!Array.isArray(input.parents) || input.parents.length !== 2) {
    return err("PAIR_INCOMPLETE", "se requieren dos progenitores");
  }
  if (!Array.isArray(input.provenance) || input.provenance.length !== 2) {
    return err("PROVENANCE_INCOMPLETE", "se requiere procedencia de ambos progenitores");
  }
  for (const provenance of input.provenance) {
    const check = isBreedableProvenance(provenance);
    if (!check.ok) return err(check.code, check.message);
  }
  if (!ASSIGNMENT_POLICIES.includes(input.assignmentPolicy)) {
    return err("ASSIGNMENT_POLICY_INVALID", "política de asignación desconocida");
  }
  const egg: EggRecord = {
    schema: EGG_SCHEMA,
    version: EGG_CONTRACT_VERSION,
    eggId: eggIdFor(input.cycleId, input.productionEventId),
    nurseryId: input.nurseryId,
    breedingCycleId: input.cycleId,
    parents: [input.parents[0], input.parents[1]],
    provenance: [input.provenance[0], input.provenance[1]],
    producedAt: new Date(input.occurredAt).toISOString(),
    production: {
      productionEventId: input.productionEventId,
      idempotencyKey: input.idempotencyKey,
      producedAt: new Date(input.occurredAt).toISOString(),
      authoritySequence: input.authoritySequence,
      cycleRevision: input.cycleRevision,
    },
    ownerId: input.ownerId ?? null,
    recipientId: input.recipientId ?? null,
    assignmentPolicy: input.assignmentPolicy,
    state: "produced",
    cancelReason: null,
    legitimacy: { ...EGG_LEGITIMACY },
    createdAt: new Date(input.occurredAt).toISOString(),
    updatedAt: new Date(input.occurredAt).toISOString(),
  };
  const valid = validateEgg(egg);
  return valid.ok ? ok(egg) : err(valid.code, valid.message);
}

// ---------------------------------------------------------------------------
// 4. Máquina de estados (sin regresiones ni transiciones arbitrarias)
// ---------------------------------------------------------------------------

/** Transiciones permitidas. `claimed` y `cancelled` son terminales. */
export const EGG_TRANSITIONS: Readonly<Record<EggState, readonly EggState[]>> = Object.freeze({
  produced: ["pending_assignment", "stored", "cancelled"],
  pending_assignment: ["stored", "cancelled"],
  stored: ["claimed"],
  claimed: [],
  cancelled: [],
});

export function canTransition(from: EggState, to: EggState): boolean {
  return (EGG_TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: EggState, to: EggState, reason: CancelReason | null = null): DomainResult<true> {
  if (!canTransition(from, to)) return err("INVALID_TRANSITION", `transición ${from} → ${to} no permitida`);
  if (to === "cancelled" && (!reason || !CANCEL_REASONS.includes(reason))) {
    return err("CANCEL_REASON_INVALID", "cancelación exige motivo válido");
  }
  return ok(true);
}

export interface TransitionOptions {
  readonly at: string;
  readonly ownerId?: string | null;
  readonly recipientId?: string | null;
  readonly reason?: CancelReason | null;
}

function withTransition(egg: EggRecord, to: EggState, options: TransitionOptions): DomainResult<EggRecord> {
  const valid = validateEgg(egg);
  if (!valid.ok) return err(valid.code, valid.message);
  const transition = assertTransition(egg.state, to, options.reason ?? null);
  if (!transition.ok) return err(transition.code, transition.message);
  if (Number.isNaN(Date.parse(options.at))) return err("TIMESTAMP_INVALID", "fecha de transición inválida");
  if (options.at < egg.updatedAt) return err("TIME_REGRESSION", "la transición no puede ir hacia atrás en el tiempo");
  if (egg.ownerId !== null && options.ownerId !== undefined && options.ownerId !== egg.ownerId) {
    return err("OWNER_IMMUTABLE", "la propiedad confirmada no puede modificarse");
  }
  const next: EggRecord = {
    ...egg,
    state: to,
    ownerId: options.ownerId !== undefined ? options.ownerId : egg.ownerId,
    recipientId: options.recipientId !== undefined ? options.recipientId : egg.recipientId,
    cancelReason: to === "cancelled" ? (options.reason ?? null) : null,
    updatedAt: new Date(options.at).toISOString(),
  };
  const check = validateEgg(next);
  return check.ok ? ok(next) : err(check.code, check.message);
}

/** Asignar y almacenar: `stored` es la confirmación definitiva del huevo. */
export function storeEgg(egg: EggRecord, ownerId: string, options: { at: string; recipientId?: string | null }): DomainResult<EggRecord> {
  if (!ownerId) return err("OWNER_REQUIRED", "se exige propietario confirmado para almacenar");
  return withTransition(egg, "stored", { ...options, ownerId });
}

export function markPendingAssignment(egg: EggRecord, at: string, recipientId?: string): DomainResult<EggRecord> {
  if (egg.ownerId !== null) return err("OWNER_ALREADY_ASSIGNED", "el huevo ya tiene propietario");
  return withTransition(egg, "pending_assignment", { at, recipientId });
}

export function claimEgg(egg: EggRecord, at: string): DomainResult<EggRecord> {
  if (egg.ownerId === null) return err("OWNER_REQUIRED", "no se puede reclamar sin propietario");
  return withTransition(egg, "claimed", { at });
}

export function cancelEgg(egg: EggRecord, reason: CancelReason, at: string): DomainResult<EggRecord> {
  return withTransition(egg, "cancelled", { at, reason });
}

/**
 * Política configurable de asignación: NINGUNA se adopta como definitiva.
 * Sirve para preparar políticas sin sortear ni repartir automáticamente.
 */
export function proposedOwnerOf(
  policy: AssignmentPolicy,
  context: { readonly guestOwnerId: string; readonly hostId: string; readonly agreedOwnerId?: string | null },
): string | null {
  switch (policy) {
    case "guest_owner": return context.guestOwnerId;
    case "host": return context.hostId;
    case "prearranged": return context.agreedOwnerId ?? null;
    case "pending": return null;
  }
}

/** Estados que ocupan capacidad (aún no reclamados ni cancelados). */
export const CAPACITY_STATES: readonly EggState[] = Object.freeze(["produced", "pending_assignment", "stored"]);
export const isCapacityState = (state: EggState): boolean => CAPACITY_STATES.includes(state);

/** Tipos de evento publicados por el almacén de huevos. */
export const EGG_EVENT_TYPES = [
  "egg.production.recorded",
  "egg.queued",
  "egg.assignment.pending",
  "egg.stored",
  "egg.claimed",
  "egg.cancelled",
  "egg.backlog.drained",
] as const;
export type EggEventType = (typeof EGG_EVENT_TYPES)[number];

export interface EggEvent {
  readonly schema: typeof EGG_SCHEMA;
  readonly version: typeof EGG_CONTRACT_VERSION;
  readonly eventId: string;
  readonly type: EggEventType;
  readonly eggId: EggId;
  readonly cycleId: string;
  readonly nurseryId: string;
  readonly occurredAt: string;
  readonly idempotencyKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
}
