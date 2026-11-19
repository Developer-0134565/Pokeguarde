/**
 * PG-08A — Contratos aislados de Guarderías Compartidas, propiedad y seguridad.
 *
 * MÓDULO PURO. No importa Bun, SQLite, HTTP, el motor Tamagotchi ni PKHeX.
 * No escribe en producción ni se conecta a endpoints reales. Toda la
 * "autoridad" de este archivo es un registro de eventos en memoria que sirve
 * para demostrar propiedades del modelo y para investigar decisiones
 * pendientes (ver informe PG-08A).
 *
 * Regla fundamental: alojar un Pokémon NUNCA transfiere su propiedad.
 * El anfitrión no tiene operaciones para exportar, eliminar, transferir,
 * cambiar el propietario ni modificar los datos originales del Pokémon.
 */

// ---------------------------------------------------------------------------
// 1. Versionado y constantes del contrato
// ---------------------------------------------------------------------------

export const SCHEMA_ID = "pg08a.shared-nurseries" as const;
export const CONTRACT_VERSION = "1.0.0" as const;
export const NURSERY_CAPACITY = 2 as const;
export const SUPPORTED_GENERATIONS = [1, 2, 3, 4, 5] as const;
export const PERMISSIONS = [
  "allow_ev_berries",
  "allow_ev_minigames",
  "allow_breeding",
] as const;

export type ContractVersion = typeof CONTRACT_VERSION;
export type Permission = (typeof PERMISSIONS)[number];
export type Generation = (typeof SUPPORTED_GENERATIONS)[number];

/** Todas las operaciones que modifica el anfitrión sobre un Pokémon alojado. */
export const HOST_CARE_ACTIONS = [
  "feed",
  "play",
  "clean",
  "sleep",
  "wake",
  "pet",
  "discipline",
] as const;
export type HostCareAction = (typeof HOST_CARE_ACTIONS)[number];

// ---------------------------------------------------------------------------
// 2. Identificadores opacos (branded). NUNCA derivados de especie, mote,
//    posición de caja ni hash de datos: esos valores pueden repetirse.
// ---------------------------------------------------------------------------

export type OwnerId = string & { readonly __brand: "OwnerId" };
export type NurseryId = string & { readonly __brand: "NurseryId" };
export type StayId = string & { readonly __brand: "StayId" };
export type PokemonInstanceId = string & { readonly __brand: "PokemonInstanceId" };
export type EventId = string & { readonly __brand: "EventId" };
export type DepositRequestId = string & { readonly __brand: "DepositRequestId" };
export type RecoveryRequestId = string & { readonly __brand: "RecoveryRequestId" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const IDEMPOTENCY_RE = /^[A-Za-z0-9._:-]{8,128}$/;

// ---------------------------------------------------------------------------
// 3. Resultados y validación estricta
// ---------------------------------------------------------------------------

export type Issue = { readonly path: string; readonly code: string; readonly message: string };
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly Issue[] };

export type ErrorCode =
  | "INVALID_INPUT"
  | "SCHEMA_VERSION_MISMATCH"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "OWNER_MISMATCH"
  | "NURSERY_FULL"
  | "DUPLICATE_STAY"
  | "POKEMON_ALREADY_HOSTED"
  | "NURSERY_NOT_AVAILABLE"
  | "CONSENT_REQUIRED"
  | "PERMISSION_REQUIRED"
  | "PERMISSION_REVOKED"
  | "ILLEGAL_POKEMON"
  | "UNSUPPORTED_GENERATION"
  | "STALE_REVISION"
  | "DUPLICATE_REQUEST"
  | "INVALID_VOUCHER"
  | "VOUCHER_EXPIRED"
  | "STAY_NOT_ACTIVE"
  | "BREEDING_NOT_IMPLEMENTED"
  | "INTERNAL_INCONSISTENCY";

export type OperationError = {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
};

export type OpResult<T> =
  | { readonly ok: true; readonly value: T; readonly eventId: EventId | null }
  | { readonly ok: false; readonly error: OperationError };

const OK = <T>(value: T, eventId: EventId | null = null): OpResult<T> => ({ ok: true, value, eventId });
const ERR = <T>(code: ErrorCode, message: string, details?: Readonly<Record<string, unknown>>): OpResult<T> => ({
  ok: false,
  error: { code, message, ...(details ? { details } : {}) },
});

const fail = (path: string, code: string, message: string): Result<never> => ({
  ok: false,
  issues: [{ path, code, message }],
});
const pass = <T>(value: T): Result<T> => ({ ok: true, value });

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Rechaza claves desconocidas: validación estricta de contrato. */
function keys(value: Record<string, unknown>, allowed: readonly string[], path: string): Issue[] {
  const issues: Issue[] = [];
  for (const k of Object.keys(value)) {
    if (!allowed.includes(k)) issues.push({ path: `${path}.${k}`, code: "UNKNOWN_KEY", message: "clave no permitida" });
  }
  for (const k of allowed) {
    if (!(k in value)) issues.push({ path: `${path}.${k}`, code: "MISSING_KEY", message: "falta clave obligatoria" });
  }
  return issues;
}

function envelope(value: Record<string, unknown>, path: string): Issue[] {
  const issues: Issue[] = [];
  if (value.schema !== SCHEMA_ID) issues.push({ path: `${path}.schema`, code: "BAD_SCHEMA", message: "schema incorrecto" });
  if (value.version !== CONTRACT_VERSION) {
    issues.push({ path: `${path}.version`, code: "BAD_VERSION", message: "versión de contrato no soportada" });
  }
  return issues;
}

function uuid(value: unknown, path: string): Issue[] {
  return typeof value === "string" && UUID_RE.test(value)
    ? []
    : [{ path, code: "BAD_UUID", message: "se espera un UUID v4 en minúsculas" }];
}
function sha(value: unknown, path: string): Issue[] {
  return typeof value === "string" && SHA256_RE.test(value)
    ? []
    : [{ path, code: "BAD_SHA256", message: "se espera un SHA-256 hexadecimal" }];
}
function iso(value: unknown, path: string): Issue[] {
  return typeof value === "string" && ISO_RE.test(value) && !Number.isNaN(Date.parse(value))
    ? []
    : [{ path, code: "BAD_TIMESTAMP", message: "se espera ISO-8601 UTC con milisegundos" }];
}
function validIdempotencyKey(value: unknown, path: string): Issue[] {
  return typeof value === "string" && IDEMPOTENCY_RE.test(value)
    ? []
    : [{ path, code: "BAD_IDEMPOTENCY_KEY", message: "clave de idempotencia inválida" }];
}
function text(value: unknown, path: string, max = 120): Issue[] {
  return typeof value === "string" && value.length > 0 && value.length <= max && value === value.trim()
    ? []
    : [{ path, code: "BAD_TEXT", message: "texto vacío, demasiado largo o con espacios extremos" }];
}
function concat(...groups: Issue[][]): Issue[] {
  return groups.flat();
}
function done<T>(issues: Issue[], value: T): Result<T> {
  return issues.length === 0 ? pass(value) : { ok: false, issues };
}

const asOwnerId = (v: string) => v as OwnerId;
const asNurseryId = (v: string) => v as NurseryId;
const asStayId = (v: string) => v as StayId;
const asPokemonId = (v: string) => v as PokemonInstanceId;
const asEventId = (v: string) => v as EventId;
const asDepositId = (v: string) => v as DepositRequestId;
const asRecoveryId = (v: string) => v as RecoveryRequestId;
export const newId = (): string => crypto.randomUUID();

// ---------------------------------------------------------------------------
// 4. Entidades y contratos
// ---------------------------------------------------------------------------

/** Identidad pública del propietario. Nunca contiene credenciales ni rutas. */
export type Owner = {
  readonly schema: typeof SCHEMA_ID;
  readonly version: ContractVersion;
  readonly id: OwnerId;
  readonly displayName: string;
  readonly createdAt: string;
};

export type NurseryVisibility = "private" | "invite_only" | "public";
export type NurseryAdmission = "open" | "closed";
export type NurseryConnectivity = "connected" | "disconnected";
export type NurseryState =
  | "available"
  | "partially_occupied"
  | "full"
  | "disconnected"
  | "unavailable"
  | "recovery_pending"
  | "sync_error";

/**
 * Tres dimensiones INDEPENDIENTES: visibilidad, admisión y conectividad.
 * `state` es derivado; se guarda por comodidad pero nunca se acepta de entrada.
 */
export type Nursery = {
  readonly schema: typeof SCHEMA_ID;
  readonly version: ContractVersion;
  readonly id: NurseryId;
  readonly hostId: OwnerId;
  readonly visibility: NurseryVisibility;
  readonly admission: NurseryAdmission;
  readonly connectivity: NurseryConnectivity;
  readonly state: NurseryState;
  readonly unavailable: boolean;
  readonly syncError: boolean;
  readonly recoveryPending: boolean;
  readonly capacity: typeof NURSERY_CAPACITY;
  readonly revision: number;
  readonly createdAt: string;
};

export type Verdict = "legal" | "unverified" | "illegal";

/**
 * Procedencia inmutable del Pokémon. `saveSha256` forma parte de la identidad
 * de origen: el PID puede repetirse entre saves y la ranura puede cambiar.
 */
export type PokemonOrigin =
  | {
      readonly kind: "gen1_2";
      readonly saveSha256: string;
      readonly generation: 1 | 2;
      readonly species: number;
      readonly location: number;
      readonly box: number;
      readonly slot: number;
    }
  | {
      readonly kind: "gen3_5";
      readonly saveSha256: string;
      readonly generation: 3 | 4 | 5;
      readonly species: number;
      readonly pid: number;
    };

/**
 * Referencia a un Pokémon original. `instanceId` es la identidad autoritativa;
 * `dataSha256` solo detecta alteraciones, NO identifica al Pokémon.
 */
export type PokemonRef = {
  readonly schema: typeof SCHEMA_ID;
  readonly version: ContractVersion;
  readonly instanceId: PokemonInstanceId;
  readonly origin: PokemonOrigin;
  readonly dataSha256: string;
  readonly verdict: Verdict;
  readonly capturedAt: string;
};

export type StayState =
  | "available"
  | "request_pending"
  | "accepted"
  | "rejected"
  | "stay_active"
  | "pickup_requested"
  | "stay_finished"
  | "recoverable_error";

export type PermissionGrant = {
  readonly permission: Permission;
  readonly grantedBy: OwnerId;
  readonly stayId: StayId;
  readonly grantedAt: string;
  readonly revokedAt: string | null;
  readonly consentKey: string;
  readonly revision: number;
};

export type Stay = {
  readonly schema: typeof SCHEMA_ID;
  readonly version: ContractVersion;
  readonly id: StayId;
  readonly nurseryId: NurseryId;
  readonly ownerId: OwnerId;
  readonly hostId: OwnerId;
  readonly pokemon: PokemonRef;
  /** `own` = el anfitrión cuida su propio Pokémon; `visitor` = Pokémon ajeno. */
  readonly ownershipRelation: "own" | "visitor";
  readonly state: StayState;
  readonly permissions: Readonly<Record<Permission, PermissionGrant | null>>;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly hostOfflineNoted: boolean;
  readonly finishedAt: string | null;
};

export type DepositRequest = {
  readonly schema: typeof SCHEMA_ID;
  readonly version: ContractVersion;
  readonly id: DepositRequestId;
  readonly nurseryId: NurseryId;
  readonly ownerId: OwnerId;
  readonly pokemonId: PokemonInstanceId;
  readonly requestedAt: string;
  readonly idempotencyKey: string;
};

export type RecoveryRequest = {
  readonly schema: typeof SCHEMA_ID;
  readonly version: ContractVersion;
  readonly id: RecoveryRequestId;
  readonly stayId: StayId;
  readonly ownerId: OwnerId;
  readonly requestedAt: string;
  readonly idempotencyKey: string;
  readonly hostConnected: boolean;
  readonly reason: "owner_request" | "host_offline" | "sync_recovery";
};

/**
 * Capacidad de recuperación offline: unVale emitido por el registro
 * autoritativo, NO por el anfitrión. La conectividad del anfitrión es solo
 * información contextual y nunca bloquea la retirada.
 */
export type RecoveryVoucher = {
  readonly schema: typeof SCHEMA_ID;
  readonly version: ContractVersion;
  readonly stayId: StayId;
  readonly ownerId: OwnerId;
  readonly nonce: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revision: number;
  readonly usedAt: string | null;
};

export type SyncEventType =
  | "owner.registered"
  | "nursery.registered"
  | "nursery.connectivity"
  | "nursery.flags"
  | "pokemon.registered"
  | "deposit.requested"
  | "deposit.accepted"
  | "deposit.rejected"
  | "permission.granted"
  | "permission.revoked"
  | "recovery.requested"
  | "recovery.completed"
  | "care.applied"
  | "breeding.requested";

/** Evento de sincronización con idempotencia y secuencia monótona. */
export type SyncEvent = {
  readonly schema: typeof SCHEMA_ID;
  readonly version: ContractVersion;
  readonly eventId: EventId;
  readonly sequence: number;
  readonly type: SyncEventType;
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly idempotencyKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
};

// ---------------------------------------------------------------------------
// 5. Validadores estrictos (exportables, versionados)
// ---------------------------------------------------------------------------

export function validateOwner(value: unknown): Result<Owner> {
  if (!isObj(value)) return fail("owner", "TYPE", "se espera un objeto");
  const issues = [
    ...envelope(value, "owner"),
    ...uuid(value.id, "owner.id"),
    ...text(value.displayName, "owner.displayName", 60),
    ...iso(value.createdAt, "owner.createdAt"),
  ];
  return done(issues, {
    schema: SCHEMA_ID, version: CONTRACT_VERSION, id: asOwnerId(value.id as string),
    displayName: value.displayName as string, createdAt: value.createdAt as string,
  });
}

const VISIBILITIES: readonly NurseryVisibility[] = ["private", "invite_only", "public"];
const ADMISSIONS: readonly NurseryAdmission[] = ["open", "closed"];
const CONNECTIVITIES: readonly NurseryConnectivity[] = ["connected", "disconnected"];
const NURSERY_STATES: readonly NurseryState[] = [
  "available", "partially_occupied", "full", "disconnected", "unavailable", "recovery_pending", "sync_error",
];

export function validateNursery(value: unknown): Result<Nursery> {
  if (!isObj(value)) return fail("nursery", "TYPE", "se espera un objeto");
  const allowed = [
    "schema", "version", "id", "hostId", "visibility", "admission", "connectivity",
    "state", "unavailable", "syncError", "recoveryPending", "capacity", "revision", "createdAt",
  ];
  const issues = [
    ...keys(value, allowed, "nursery"),
    ...envelope(value, "nursery"),
    ...uuid(value.id, "nursery.id"),
    ...uuid(value.hostId, "nursery.hostId"),
    ...(VISIBILITIES.includes(value.visibility as NurseryVisibility) ? [] : [{ path: "nursery.visibility", code: "BAD_ENUM", message: "visibilidad inválida" }]),
    ...(ADMISSIONS.includes(value.admission as NurseryAdmission) ? [] : [{ path: "nursery.admission", code: "BAD_ENUM", message: "admisión inválida" }]),
    ...(CONNECTIVITIES.includes(value.connectivity as NurseryConnectivity) ? [] : [{ path: "nursery.connectivity", code: "BAD_ENUM", message: "conectividad inválida" }]),
    ...(NURSERY_STATES.includes(value.state as NurseryState) ? [] : [{ path: "nursery.state", code: "BAD_ENUM", message: "estado inválido" }]),
    ...(typeof value.unavailable === "boolean" ? [] : [{ path: "nursery.unavailable", code: "TYPE", message: "booleano requerido" }]),
    ...(typeof value.syncError === "boolean" ? [] : [{ path: "nursery.syncError", code: "TYPE", message: "booleano requerido" }]),
    ...(typeof value.recoveryPending === "boolean" ? [] : [{ path: "nursery.recoveryPending", code: "TYPE", message: "booleano requerido" }]),
    ...(value.capacity === NURSERY_CAPACITY ? [] : [{ path: "nursery.capacity", code: "BAD_CAPACITY", message: "la capacidad debe ser 2" }]),
    ...(Number.isInteger(value.revision) && (value.revision as number) >= 0 ? [] : [{ path: "nursery.revision", code: "BAD_REVISION", message: "revisión inválida" }]),
    ...iso(value.createdAt, "nursery.createdAt"),
  ];
  return done(issues, value as unknown as Nursery);
}

function validateOrigin(value: unknown, path: string): Issue[] {
  if (!isObj(value)) return [{ path, code: "TYPE", message: "se espera un objeto" }];
  const base = sha(value.saveSha256, `${path}.saveSha256`);
  if (value.kind === "gen1_2") {
    return concat(
      keys(value, ["kind", "saveSha256", "generation", "species", "location", "box", "slot"], path), base,
      value.generation === 1 || value.generation === 2 ? [] : [{ path: `${path}.generation`, code: "BAD_GENERATION", message: "Gen 1/2 esperada" }],
      Number.isInteger(value.species) && (value.species as number) > 0 ? [] : [{ path: `${path}.species`, code: "BAD_SPECIES", message: "especie inválida" }],
      Number.isInteger(value.location) && (value.location as number) >= 0 ? [] : [{ path: `${path}.location`, code: "BAD_LOCATION", message: "ubicación inválida" }],
      Number.isInteger(value.box) && (value.box as number) >= 1 ? [] : [{ path: `${path}.box`, code: "BAD_BOX", message: "caja base 1" }],
      Number.isInteger(value.slot) && (value.slot as number) >= 1 ? [] : [{ path: `${path}.slot`, code: "BAD_SLOT", message: "ranura base 1" }],
    );
  }
  if (value.kind === "gen3_5") {
    return concat(
      keys(value, ["kind", "saveSha256", "generation", "species", "pid"], path), base,
      [3, 4, 5].includes(value.generation as number) ? [] : [{ path: `${path}.generation`, code: "BAD_GENERATION", message: "Gen 3-5 esperada" }],
      Number.isInteger(value.species) && (value.species as number) > 0 ? [] : [{ path: `${path}.species`, code: "BAD_SPECIES", message: "especie inválida" }],
      Number.isInteger(value.pid) && (value.pid as number) >= 0 && (value.pid as number) <= 0xffffffff ? [] : [{ path: `${path}.pid`, code: "BAD_PID", message: "PID inválido" }],
    );
  }
  return [{ path: `${path}.kind`, code: "BAD_ORIGIN", message: "origen desconocido" }];
}

export function validatePokemonRef(value: unknown): Result<PokemonRef> {
  if (!isObj(value)) return fail("pokemon", "TYPE", "se espera un objeto");
  const issues = concat(
    envelope(value, "pokemon"),
    uuid(value.instanceId, "pokemon.instanceId"),
    validateOrigin(value.origin, "pokemon.origin"),
    sha(value.dataSha256, "pokemon.dataSha256"),
    ["legal", "unverified", "illegal"].includes(value.verdict as string)
      ? [] : [{ path: "pokemon.verdict", code: "BAD_VERDICT", message: "veredicto inválido" }],
    iso(value.capturedAt, "pokemon.capturedAt"),
  );
  return done(issues, value as unknown as PokemonRef);
}

const PERMISSION_SET = new Set<string>(PERMISSIONS);
function validatePermissionGrant(value: unknown, path: string): Issue[] {
  if (value === null) return [];
  if (!isObj(value)) return [{ path, code: "TYPE", message: "se espera objeto o null" }];
  return concat(
    keys(value, ["permission", "grantedBy", "stayId", "grantedAt", "revokedAt", "consentKey", "revision"], path),
    typeof value.permission === "string" && PERMISSION_SET.has(value.permission) ? [] : [{ path: `${path}.permission`, code: "BAD_ENUM", message: "permiso inválido" }],
    uuid(value.grantedBy, `${path}.grantedBy`),
    uuid(value.stayId, `${path}.stayId`),
    iso(value.grantedAt, `${path}.grantedAt`),
    value.revokedAt === null ? [] : iso(value.revokedAt, `${path}.revokedAt`),
    validIdempotencyKey(value.consentKey, `${path}.consentKey`),
    Number.isInteger(value.revision) && (value.revision as number) >= 0 ? [] : [{ path: `${path}.revision`, code: "BAD_REVISION", message: "revisión inválida" }],
  );
}

export function validateStay(value: unknown): Result<Stay> {
  if (!isObj(value)) return fail("stay", "TYPE", "se espera un objeto");
  const issues = concat(
    envelope(value, "stay"),
    uuid(value.id, "stay.id"),
    uuid(value.nurseryId, "stay.nurseryId"),
    uuid(value.ownerId, "stay.ownerId"),
    uuid(value.hostId, "stay.hostId"),
    isObj(value.permissions) && PERMISSIONS.every((p) => p in value.permissions)
      ? PERMISSIONS.flatMap((p) => validatePermissionGrant((value.permissions as Record<string, unknown>)[p], `stay.permissions.${p}`))
      : [{ path: "stay.permissions", code: "BAD_PERMISSIONS", message: "faltan los tres permisos" }],
    ["own", "visitor"].includes(value.ownershipRelation as string)
      ? [] : [{ path: "stay.ownershipRelation", code: "BAD_ENUM", message: "relación inválida" }],
    [
      "available", "request_pending", "accepted", "rejected", "stay_active",
      "pickup_requested", "stay_finished", "recoverable_error",
    ].includes(value.state as string) ? [] : [{ path: "stay.state", code: "BAD_ENUM", message: "estado inválido" }],
    Number.isInteger(value.revision) && (value.revision as number) >= 0 ? [] : [{ path: "stay.revision", code: "BAD_REVISION", message: "revisión inválida" }],
    iso(value.createdAt, "stay.createdAt"), iso(value.updatedAt, "stay.updatedAt"),
    typeof value.hostOfflineNoted === "boolean" ? [] : [{ path: "stay.hostOfflineNoted", code: "TYPE", message: "booleano requerido" }],
    value.finishedAt === null ? [] : iso(value.finishedAt, "stay.finishedAt"),
  );
  if (isObj(value.pokemon)) issues.push(...validatePokemonRef(value.pokemon).ok ? [] : validatePokemonRef(value.pokemon).issues as Issue[]);
  else issues.push({ path: "stay.pokemon", code: "TYPE", message: "referencia de Pokémon inválida" });
  return done(issues, value as unknown as Stay);
}

export function validateDepositRequest(value: unknown): Result<DepositRequest> {
  if (!isObj(value)) return fail("deposit", "TYPE", "se espera un objeto");
  const issues = concat(
    envelope(value, "deposit"), uuid(value.id, "deposit.id"),
    uuid(value.nurseryId, "deposit.nurseryId"), uuid(value.ownerId, "deposit.ownerId"),
    uuid(value.pokemonId, "deposit.pokemonId"), iso(value.requestedAt, "deposit.requestedAt"),
    validIdempotencyKey(value.idempotencyKey, "deposit.idempotencyKey"),
  );
  return done(issues, value as unknown as DepositRequest);
}

export function validateRecoveryRequest(value: unknown): Result<RecoveryRequest> {
  if (!isObj(value)) return fail("recovery", "TYPE", "se espera un objeto");
  const issues = concat(
    envelope(value, "recovery"), uuid(value.id, "recovery.id"),
    uuid(value.stayId, "recovery.stayId"), uuid(value.ownerId, "recovery.ownerId"),
    iso(value.requestedAt, "recovery.requestedAt"),
    validIdempotencyKey(value.idempotencyKey, "recovery.idempotencyKey"),
    typeof value.hostConnected === "boolean" ? [] : [{ path: "recovery.hostConnected", code: "TYPE", message: "booleano requerido" }],
    ["owner_request", "host_offline", "sync_recovery"].includes(value.reason as string)
      ? [] : [{ path: "recovery.reason", code: "BAD_ENUM", message: "motivo inválido" }],
  );
  return done(issues, value as unknown as RecoveryRequest);
}

export function validateRecoveryVoucher(value: unknown): Result<RecoveryVoucher> {
  if (!isObj(value)) return fail("voucher", "TYPE", "se espera un objeto");
  const issues = concat(
    envelope(value, "voucher"), uuid(value.stayId, "voucher.stayId"),
    uuid(value.ownerId, "voucher.ownerId"), validIdempotencyKey(value.nonce, "voucher.nonce"),
    iso(value.issuedAt, "voucher.issuedAt"), iso(value.expiresAt, "voucher.expiresAt"),
    Number.isInteger(value.revision) && (value.revision as number) >= 0 ? [] : [{ path: "voucher.revision", code: "BAD_REVISION", message: "revisión inválida" }],
    value.usedAt === null ? [] : iso(value.usedAt, "voucher.usedAt"),
  );
  return done(issues, value as unknown as RecoveryVoucher);
}

export function validateSyncEvent(value: unknown): Result<SyncEvent> {
  if (!isObj(value)) return fail("event", "TYPE", "se espera un objeto");
  const issues = concat(
    envelope(value, "event"), uuid(value.eventId, "event.eventId"),
    Number.isInteger(value.sequence) && (value.sequence as number) >= 1 ? [] : [{ path: "event.sequence", code: "BAD_SEQUENCE", message: "secuencia inválida" }],
    typeof value.type === "string" && [
      "owner.registered", "nursery.registered", "nursery.connectivity", "nursery.flags",
      "pokemon.registered", "deposit.requested", "deposit.accepted", "deposit.rejected",
      "permission.granted", "permission.revoked", "recovery.requested", "recovery.completed",
      "care.applied", "breeding.requested",
    ].includes(value.type) ? [] : [{ path: "event.type", code: "BAD_ENUM", message: "tipo de evento inválido" }],
    text(value.aggregateId, "event.aggregateId", 64), iso(value.occurredAt, "event.occurredAt"),
    validIdempotencyKey(value.idempotencyKey, "event.idempotencyKey"),
    isObj(value.payload) ? [] : [{ path: "event.payload", code: "TYPE", message: "payload debe ser objeto" }],
  );
  return done(issues, value as unknown as SyncEvent);
}

// ---------------------------------------------------------------------------
// 6. Derivación de estados
// ---------------------------------------------------------------------------

/** El estado nunca se toma del cliente: se deriva de los hechos. */
export function deriveNurseryState(nursery: Nursery, activeCount: number): NurseryState {
  if (activeCount > NURSERY_CAPACITY) return "sync_error";
  if (nursery.syncError) return "sync_error";
  if (nursery.recoveryPending) return "recovery_pending";
  if (nursery.unavailable) return "unavailable";
  if (nursery.connectivity === "disconnected") return "disconnected";
  if (activeCount === 0) return "available";
  if (activeCount === 1) return "partially_occupied";
  return "full";
}

/** Un Pokémon ilegal nunca entra; `unverified` NO equivale a `illegal`. */
export function isAdmittable(pokemon: PokemonRef): boolean {
  return pokemon.verdict === "legal" || pokemon.verdict === "unverified";
}

export function isGenerationSupported(generation: number): generation is Generation {
  return (SUPPORTED_GENERATIONS as readonly number[]).includes(generation);
}

export function permissionActive(stay: Stay, permission: Permission, at: string): boolean {
  const grant = stay.permissions[permission];
  return !!grant && grant.revokedAt === null && grant.revokedAt !== at && Date.parse(at) >= Date.parse(grant.grantedAt);
}

// ---------------------------------------------------------------------------
// 7. Sistema puro: registro de eventos autoritativo simulado
// ---------------------------------------------------------------------------

export type NurserySystem = ReturnType<typeof createNurserySystem>;
type VoidPayload = Record<string, never>;
const VOID: VoidPayload = {};

export type CommandBase = { readonly idempotencyKey: string; readonly at?: string };

export function createNurserySystem(initialEvents: readonly SyncEvent[] = []) {
  let sequence = 0;
  let events: SyncEvent[] = [];
  const idempotency = new Map<string, OpResult<unknown>>();
  const owners = new Map<OwnerId, Owner>();
  const nurseries = new Map<NurseryId, Nursery>();
  const pokemon = new Map<PokemonInstanceId, PokemonRef>();
  const stays = new Map<StayId, Stay>();
  const requests = new Map<DepositRequestId, DepositRequest>();
  const recoveryRequests = new Map<RecoveryRequestId, RecoveryRequest>();
  const vouchers = new Map<string, RecoveryVoucher>();
  const hosted = new Map<PokemonInstanceId, StayId>();

  function emit(type: SyncEventType, aggregateId: string, idempotencyKey: string, at: string, payload: VoidPayload | Record<string, unknown>): EventId {
    const event: SyncEvent = {
      schema: SCHEMA_ID, version: CONTRACT_VERSION,
      eventId: asEventId(newId()), sequence: ++sequence, type, aggregateId,
      occurredAt: at, idempotencyKey, payload,
    };
    events.push(event);
    return event.eventId;
  }

  function apply(event: SyncEvent, useSequence = true): void {
    if (useSequence) sequence = Math.max(sequence, event.sequence);
    const p = event.payload;
    switch (event.type) {
      case "owner.registered": {
        const v = validateOwner(p.owner);
        if (v.ok) owners.set(v.value.id, v.value);
        break;
      }
      case "nursery.registered": {
        const v = validateNursery(p.nursery);
        if (v.ok) nurseries.set(v.value.id, v.value);
        break;
      }
      case "pokemon.registered": {
        const v = validatePokemonRef(p.pokemon);
        if (v.ok) pokemon.set(v.value.instanceId, v.value);
        break;
      }
      case "deposit.requested": {
        const v = validateDepositRequest(p.request);
        if (v.ok) requests.set(v.value.id, v.value);
        break;
      }
      case "deposit.accepted": {
        const sv = validateStay(p.stay);
        if (sv.ok) {
          stays.set(sv.value.id, sv.value);
          hosted.set(sv.value.pokemon.instanceId, sv.value.id);
        }
        // En vivo la solicitud se consume al aceptar: el replay debe hacer lo mismo.
        if (typeof p.requestId === "string") requests.delete(p.requestId as DepositRequestId);
        break;
      }
      case "deposit.rejected":
      case "permission.granted":
      case "permission.revoked":
      case "recovery.requested":
      case "recovery.completed":
      case "care.applied":
      case "nursery.connectivity":
      case "nursery.flags":
      case "breeding.requested": {
        const sv = p.stay ? validateStay(p.stay) : null;
        if (sv && sv.ok) stays.set(sv.value.id, sv.value);
        const nv = p.nursery ? validateNursery(p.nursery) : null;
        if (nv && nv.ok) nurseries.set(nv.value.id, nv.value);
        const rv = p.request ? validateRecoveryRequest(p.request) : null;
        if (rv && rv.ok) recoveryRequests.set(rv.value.id, rv.value);
        const vv = p.voucher ? validateRecoveryVoucher(p.voucher) : null;
        if (vv && vv.ok) vouchers.set(vv.value.nonce, vv.value);
        if (p.finishedStayId && typeof p.finishedStayId === "string") hosted.delete(pokemonIdOfStay(p.finishedStayId));
        break;
      }
    }
  }

  function pokemonIdOfStay(stayId: string): PokemonInstanceId {
    for (const [pid, sid] of hosted) if (sid === stayId) return pid;
    return "" as PokemonInstanceId;
  }

  function refreshNursery(nurseryId: NurseryId, at: string): EventId | null {
    const nursery = nurseries.get(nurseryId);
    if (!nursery) return null;
    const active = [...stays.values()].filter((s) => s.nurseryId === nurseryId && (s.state === "stay_active" || s.state === "pickup_requested")).length;
    const state = deriveNurseryState(nursery, active);
    if (state === nursery.state) return null;
    const next: Nursery = { ...nursery, state, revision: nursery.revision + 1 };
    nurseries.set(nurseryId, next);
    return emit("nursery.flags", nurseryId, `nursery-state:${nurseryId}:${next.revision}`, at, { nursery: next });
  }

  function dedupe<T>(key: string, run: () => OpResult<T>): OpResult<T> {
    const prior = idempotency.get(key);
    if (prior) return prior as OpResult<T>;
    const result = run();
    idempotency.set(key, result as OpResult<unknown>);
    return result;
  }

  function time(cmd: CommandBase): string {
    return cmd.at ?? new Date().toISOString();
  }

  /** Separa los metadatos del comando de la entidad que se valida y se persiste. */
  function payloadOf<T extends CommandBase>(input: T): Omit<T, keyof CommandBase> {
    const { idempotencyKey: _key, at: _at, ...payload } = input as Record<string, unknown>;
    return payload as Omit<T, keyof CommandBase>;
  }

  /**
   * DepositRequest y RecoveryRequest SÍ incluyen `idempotencyKey` en su
   * contrato; solo se elimina `at`, que es metadato de ejecución.
   */
  function withoutAt<T extends CommandBase>(input: T): Omit<T, "at"> {
    const { at: _at, ...payload } = input as Record<string, unknown>;
    return payload as Omit<T, "at">;
  }

  // --- Registro de entidades base -----------------------------------------

  function registerOwner(input: Owner & CommandBase): OpResult<Owner> {
    const at = time(input);
    return dedupe(`owner:${input.idempotencyKey}`, () => {
      const v = validateOwner(payloadOf(input));
      if (!v.ok) return ERR<Owner>("INVALID_INPUT", "propietario inválido", { issues: v.issues });
      if (owners.has(v.value.id)) return ERR<Owner>("DUPLICATE_REQUEST", "el propietario ya existe");
      owners.set(v.value.id, v.value);
      const eventId = emit("owner.registered", v.value.id, input.idempotencyKey, at, { owner: v.value });
      return OK(v.value, eventId);
    });
  }

  function registerNursery(input: Nursery & CommandBase): OpResult<Nursery> {
    const at = time(input);
    return dedupe(`nursery:${input.idempotencyKey}`, () => {
      const v = validateNursery(payloadOf(input));
      if (!v.ok) return ERR<Nursery>("INVALID_INPUT", "guardería inválida", { issues: v.issues });
      if (!owners.has(v.value.hostId)) return ERR<Nursery>("NOT_FOUND", "el anfitrión no está registrado");
      if (nurseries.has(v.value.id)) return ERR<Nursery>("DUPLICATE_REQUEST", "la guardería ya existe");
      const active = 0;
      const next: Nursery = { ...v.value, state: deriveNurseryState(v.value, active) };
      const validated = validateNursery(next);
      if (!validated.ok) return ERR<Nursery>("INTERNAL_INCONSISTENCY", "estado derivado inválido");
      nurseries.set(next.id, next);
      const eventId = emit("nursery.registered", next.id, input.idempotencyKey, at, { nursery: next });
      return OK(next, eventId);
    });
  }

  function registerPokemon(input: PokemonRef & CommandBase): OpResult<PokemonRef> {
    const at = time(input);
    return dedupe(`pokemon:${input.idempotencyKey}`, () => {
      const v = validatePokemonRef(payloadOf(input));
      if (!v.ok) return ERR<PokemonRef>("INVALID_INPUT", "Pokémon inválido", { issues: v.issues });
      if (!isGenerationSupported(v.value.origin.generation)) return ERR<PokemonRef>("UNSUPPORTED_GENERATION", "generación fuera de I–V");
      if (v.value.verdict === "illegal") return ERR<PokemonRef>("ILLEGAL_POKEMON", "un Pokémon ilegal no puede alojarse");
      if (pokemon.has(v.value.instanceId)) return ERR<PokemonRef>("DUPLICATE_REQUEST", "esa instancia ya está registrada");
      pokemon.set(v.value.instanceId, v.value);
      const eventId = emit("pokemon.registered", v.value.instanceId, input.idempotencyKey, at, { pokemon: v.value });
      return OK(v.value, eventId);
    });
  }

  // --- Solicitud y aceptación de depósito ----------------------------------

  function requestDeposit(input: DepositRequest & CommandBase): OpResult<DepositRequest> {
    const at = time(input);
    return dedupe(`deposit:${input.idempotencyKey}`, () => {
      const v = validateDepositRequest(withoutAt(input));
      if (!v.ok) return ERR<DepositRequest>("INVALID_INPUT", "solicitud inválida", { issues: v.issues });
      const req = v.value;
      if (!owners.has(req.ownerId)) return ERR<DepositRequest>("NOT_FOUND", "el propietario no existe");
      const nursery = nurseries.get(req.nurseryId);
      if (!nursery) return ERR<DepositRequest>("NOT_FOUND", "la guardería no existe");
      // Pública NO significa aceptación automática; admisión cerrada rechaza.
      if (nursery.admission === "closed") return ERR<DepositRequest>("NURSERY_NOT_AVAILABLE", "la guardería no admite solicitudes");
      if (nursery.unavailable || nursery.syncError) return ERR<DepositRequest>("NURSERY_NOT_AVAILABLE", "guardería no disponible");
      if (nursery.visibility === "private" && req.ownerId !== nursery.hostId) {
        return ERR<DepositRequest>("UNAUTHORIZED", "guardería privada");
      }
      if (nursery.visibility === "invite_only") {
        // La invitación es una decisión de producto pendiente: sin ella, no se acepta.
        return ERR<DepositRequest>("UNAUTHORIZED", "se requiere invitación (pendiente de diseñar)");
      }
      const mon = pokemon.get(req.pokemonId);
      if (!mon) return ERR<DepositRequest>("NOT_FOUND", "el Pokémon no está registrado");
      if (mon.verdict === "illegal") return ERR<DepositRequest>("ILLEGAL_POKEMON", "Pokémon ilegal");
      if (hosted.has(req.pokemonId)) return ERR<DepositRequest>("POKEMON_ALREADY_HOSTED", "ya está alojado en otra guardería");
      if (requests.has(req.id)) return ERR<DepositRequest>("DUPLICATE_REQUEST", "solicitud duplicada");
      if ([...stays.values()].some((s) => s.pokemon.instanceId === req.pokemonId && s.state === "request_pending")) {
        return ERR<DepositRequest>("DUPLICATE_STAY", "ya hay una solicitud pendiente para ese Pokémon");
      }
      requests.set(req.id, req);
      const eventId = emit("deposit.requested", req.nurseryId, input.idempotencyKey, at, { request: req });
      return OK(req, eventId);
    });
  }

  /** plantilla de estancia; el estado se fuerza a `stay_active`. */
  function makeStay(
    request: DepositRequest, nursery: Nursery, mon: PokemonRef, at: string,
  ): Stay {
    const stayId = asStayId(newId());
    const noGrants: Record<Permission, PermissionGrant | null> = {
      allow_ev_berries: null, allow_ev_minigames: null, allow_breeding: null,
    };
    return {
      schema: SCHEMA_ID, version: CONTRACT_VERSION, id: stayId,
      nurseryId: request.nurseryId, ownerId: request.ownerId, hostId: nursery.hostId,
      pokemon: mon, ownershipRelation: request.ownerId === nursery.hostId ? "own" : "visitor",
      state: "stay_active", permissions: noGrants, revision: 0,
      createdAt: at, updatedAt: at, hostOfflineNoted: false, finishedAt: null,
    };
  }

  function acceptDeposit(
    input: CommandBase & { requestId: DepositRequestId; expectedNurseryRevision?: number },
  ): OpResult<Stay> {
    const at = time(input);
    return dedupe(`accept:${input.idempotencyKey}`, () => {
      if (uuid(input.requestId, "requestId").length > 0) return ERR<Stay>("INVALID_INPUT", "requestId inválido");
      const request = requests.get(input.requestId);
      if (!request) return ERR<Stay>("NOT_FOUND", "la solicitud no existe");
      const nursery = nurseries.get(request.nurseryId);
      if (!nursery) return ERR<Stay>("NOT_FOUND", "la guardería no existe");
      if (input.expectedNurseryRevision !== undefined && input.expectedNurseryRevision !== nursery.revision) {
        return ERR<Stay>("STALE_REVISION", "la guardería cambió mientras se aceptaba", {
          expected: input.expectedNurseryRevision, actual: nursery.revision,
        });
      }
      // Comprobación y reserva atómicas de plaza.
      const active = [...stays.values()].filter(
        (s) => s.nurseryId === nursery.id && (s.state === "stay_active" || s.state === "pickup_requested"),
      );
      if (active.length >= NURSERY_CAPACITY) return ERR<Stay>("NURSERY_FULL", "la guardería ya tiene dos Pokémon");
      const mon = pokemon.get(request.pokemonId);
      if (!mon) return ERR<Stay>("NOT_FOUND", "el Pokémon no existe");
      if (hosted.has(mon.instanceId)) return ERR<Stay>("POKEMON_ALREADY_HOSTED", "el Pokémon ya está alojado");
      const stay = makeStay(request, nursery, mon, at);
      stays.set(stay.id, stay);
      hosted.set(mon.instanceId, stay.id);
      requests.delete(request.id);
      refreshNursery(nursery.id, at);
      const eventId = emit("deposit.accepted", stay.id, input.idempotencyKey, at, { stay, requestId: request.id });
      return OK(stay, eventId);
    });
  }

  function rejectDeposit(input: CommandBase & { requestId: DepositRequestId }): OpResult<DepositRequestId> {
    const at = time(input);
    return dedupe(`reject:${input.idempotencyKey}`, () => {
      const request = requests.get(input.requestId);
      if (!request) return ERR<DepositRequestId>("NOT_FOUND", "la solicitud no existe");
      requests.delete(request.id);
      const eventId = emit("deposit.rejected", request.nurseryId, input.idempotencyKey, at, { requestId: request.id });
      return OK(request.id, eventId);
    });
  }

  // --- Permisos ------------------------------------------------------------

  function grantPermission(
    input: CommandBase & { stayId: StayId; ownerId: OwnerId; permission: Permission; consentKey: string; expectedRevision?: number },
  ): OpResult<Stay> {
    const at = time(input);
    return dedupe(`grant:${input.idempotencyKey}`, () => {
      if (!PERMISSION_SET.has(input.permission)) return ERR<Stay>("INVALID_INPUT", "permiso desconocido");
      const stay = stays.get(input.stayId);
      if (!stay) return ERR<Stay>("NOT_FOUND", "la estancia no existe");
      if (stay.ownerId !== input.ownerId) return ERR<Stay>("OWNER_MISMATCH", "solo el propietario concede permisos");
      if (input.expectedRevision !== undefined && input.expectedRevision !== stay.revision) {
        return ERR<Stay>("STALE_REVISION", "la estancia cambió", { expected: input.expectedRevision, actual: stay.revision });
      }
      if (validIdempotencyKey(input.consentKey, "consentKey").length) return ERR<Stay>("CONSENT_REQUIRED", "consentimiento explícito inválido");
      const current = stay.permissions[input.permission];
      if (current && current.revokedAt === null) {
        return ERR<Stay>("DUPLICATE_REQUEST", "el permiso ya está concedido");
      }
      const grant: PermissionGrant = {
        permission: input.permission, grantedBy: input.ownerId, stayId: stay.id,
        grantedAt: at, revokedAt: null, consentKey: input.consentKey, revision: stay.revision + 1,
      };
      const next: Stay = {
        ...stay, permissions: { ...stay.permissions, [input.permission]: grant },
        revision: stay.revision + 1, updatedAt: at,
      };
      stays.set(next.id, next);
      const eventId = emit("permission.granted", stay.id, input.idempotencyKey, at, { stay: next });
      return OK(next, eventId);
    });
  }

  function revokePermission(
    input: CommandBase & { stayId: StayId; ownerId: OwnerId; permission: Permission },
  ): OpResult<Stay> {
    const at = time(input);
    return dedupe(`revoke:${input.idempotencyKey}`, () => {
      const stay = stays.get(input.stayId);
      if (!stay) return ERR<Stay>("NOT_FOUND", "la estancia no existe");
      if (stay.ownerId !== input.ownerId) return ERR<Stay>("OWNER_MISMATCH", "solo el propietario revoca permisos");
      const grant = stay.permissions[input.permission];
      if (!grant || grant.revokedAt !== null) return ERR<Stay>("PERMISSION_REVOKED", "el permiso no está activo");
      const next: Stay = {
        ...stay,
        permissions: { ...stay.permissions, [input.permission]: { ...grant, revokedAt: at, revision: stay.revision + 1 } },
        revision: stay.revision + 1, updatedAt: at,
      };
      stays.set(next.id, next);
      const eventId = emit("permission.revoked", stay.id, input.idempotencyKey, at, { stay: next });
      return OK(next, eventId);
    });
  }

  // --- Cuidado normal y permisos especiales --------------------------------

  function care(input: CommandBase & { stayId: StayId; actorId: OwnerId; action: HostCareAction }): OpResult<Stay> {
    const at = time(input);
    return dedupe(`care:${input.idempotencyKey}`, () => {
      if (!(HOST_CARE_ACTIONS as readonly string[]).includes(input.action)) return ERR<Stay>("INVALID_INPUT", "acción de cuidado desconocida");
      const stay = stays.get(input.stayId);
      if (!stay) return ERR<Stay>("NOT_FOUND", "la estancia no existe");
      if (stay.hostId !== input.actorId) return ERR<Stay>("UNAUTHORIZED", "solo el anfitrión cuida");
      if (stay.state !== "stay_active" && stay.state !== "pickup_requested") return ERR<Stay>("STAY_NOT_ACTIVE", "la estancia no está activa");
      // No se registra ningún cambio de datos del Pokémon: el cuidado se
      // calcula en el motor local del anfitrión; aquí solo se audita la acción.
      const eventId = emit("care.applied", stay.id, input.idempotencyKey, at, { stayId: stay.id, action: input.action, actorId: input.actorId });
      return OK(stay, eventId);
    });
  }

  /** Aplica bayas reductoras de EV: requiere consentimiento explícito vigente. */
  function applyEvBerries(input: CommandBase & { stayId: StayId; actorId: OwnerId }): OpResult<Stay> {
    const at = time(input);
    return dedupe(`berries:${input.idempotencyKey}`, () => {
      const stay = stays.get(input.stayId);
      if (!stay) return ERR<Stay>("NOT_FOUND", "la estancia no existe");
      if (stay.hostId !== input.actorId) return ERR<Stay>("UNAUTHORIZED", "solo el anfitrión ejecuta");
      const grant = stay.permissions.allow_ev_berries;
      if (!grant) return ERR<Stay>("CONSENT_REQUIRED", "el propietario no concedió allow_ev_berries");
      if (grant.revokedAt !== null) return ERR<Stay>("PERMISSION_REVOKED", "allow_ev_berries fue revocado");
      if (!permissionActive(stay, "allow_ev_berries", at)) return ERR<Stay>("PERMISSION_REQUIRED", "permiso no vigente");
      const eventId = emit("care.applied", stay.id, input.idempotencyKey, at, { stayId: stay.id, action: "ev_berries", actorId: input.actorId });
      return OK(stay, eventId);
    });
  }

  function applyEvMinigame(input: CommandBase & { stayId: StayId; actorId: OwnerId }): OpResult<Stay> {
    const at = time(input);
    return dedupe(`minigame:${input.idempotencyKey}`, () => {
      const stay = stays.get(input.stayId);
      if (!stay) return ERR<Stay>("NOT_FOUND", "la estancia no existe");
      if (stay.hostId !== input.actorId) return ERR<Stay>("UNAUTHORIZED", "solo el anfitrión ejecuta");
      const grant = stay.permissions.allow_ev_minigames;
      if (!grant) return ERR<Stay>("CONSENT_REQUIRED", "el propietario no concedió allow_ev_minigames");
      if (grant.revokedAt !== null) return ERR<Stay>("PERMISSION_REVOKED", "allow_ev_minigames fue revocado");
      if (!permissionActive(stay, "allow_ev_minigames", at)) return ERR<Stay>("PERMISSION_REQUIRED", "permiso no vigente");
      const eventId = emit("care.applied", stay.id, input.idempotencyKey, at, { stayId: stay.id, action: "ev_minigame", actorId: input.actorId });
      return OK(stay, eventId);
    });
  }

  /** PG-08A define el permiso; la crianza NO se implementa todavía. */
  function requestBreeding(input: CommandBase & { stayId: StayId; actorId: OwnerId }): OpResult<Stay> {
    const at = time(input);
    return dedupe(`breeding:${input.idempotencyKey}`, () => {
      const stay = stays.get(input.stayId);
      if (!stay) return ERR<Stay>("NOT_FOUND", "la estancia no existe");
      if (stay.hostId !== input.actorId) return ERR<Stay>("UNAUTHORIZED", "solo el anfitrión solicita");
      const grant = stay.permissions.allow_breeding;
      if (!grant) return ERR<Stay>("CONSENT_REQUIRED", "el propietario no concedió allow_breeding");
      if (grant.revokedAt !== null) return ERR<Stay>("PERMISSION_REVOKED", "allow_breeding fue revocado");
      const eventId = emit("breeding.requested", stay.id, input.idempotencyKey, at, { stayId: stay.id, actorId: input.actorId });
      return ERR<Stay>("BREEDING_NOT_IMPLEMENTED", "permiso verificado; crianza no implementada en PG-08A");
    });
  }

  // --- Conectividad y estados de sincronización ----------------------------

  function setConnectivity(input: CommandBase & { nurseryId: NurseryId; connectivity: NurseryConnectivity }): OpResult<Nursery> {
    const at = time(input);
    return dedupe(`connectivity:${input.idempotencyKey}`, () => {
      if (!CONNECTIVITIES.includes(input.connectivity)) return ERR<Nursery>("INVALID_INPUT", "conectividad inválida");
      const nursery = nurseries.get(input.nurseryId);
      if (!nursery) return ERR<Nursery>("NOT_FOUND", "la guardería no existe");
      const next: Nursery = { ...nursery, connectivity: input.connectivity, revision: nursery.revision + 1 };
      nurseries.set(next.id, next);
      refreshNursery(next.id, at);
      const eventId = emit("nursery.connectivity", next.id, input.idempotencyKey, at, { nursery: next });
      return OK(next, eventId);
    });
  }

  function setNurseryFlag(
    input: CommandBase & { nurseryId: NurseryId; flag: "unavailable" | "syncError" | "recoveryPending"; value: boolean },
  ): OpResult<Nursery> {
    const at = time(input);
    return dedupe(`flag:${input.idempotencyKey}`, () => {
      const nursery = nurseries.get(input.nurseryId);
      if (!nursery) return ERR<Nursery>("NOT_FOUND", "la guardería no existe");
      const next: Nursery = { ...nursery, [input.flag]: input.value, revision: nursery.revision + 1 };
      nurseries.set(next.id, next);
      refreshNursery(next.id, at);
      const eventId = emit("nursery.flags", next.id, input.idempotencyKey, at, { nursery: next });
      return OK(next, eventId);
    });
  }

  // --- Recuperación (no depende de que el anfitrión esté conectado) --------

  function requestRecovery(input: RecoveryRequest & CommandBase): OpResult<{ request: RecoveryRequest; voucher: RecoveryVoucher }> {
    const at = time(input);
    return dedupe(`recovery:${input.idempotencyKey}`, () => {
      const v = validateRecoveryRequest(withoutAt(input));
      if (!v.ok) return ERR("INVALID_INPUT", "solicitud de recuperación inválida", { issues: v.issues });
      const req = v.value;
      const stay = stays.get(req.stayId);
      if (!stay) return ERR("NOT_FOUND", "la estancia no existe");
      if (stay.ownerId !== req.ownerId) return ERR("OWNER_MISMATCH", "solo el propietario recupera");
      if (stay.state !== "stay_active" && stay.state !== "pickup_requested" && stay.state !== "recoverable_error") {
        return ERR("STAY_NOT_ACTIVE", "la estancia no está activa");
      }
      if (recoveryRequests.has(req.id)) return ERR("DUPLICATE_REQUEST", "solicitud duplicada");
      const expires = new Date(Date.parse(at) + 7 * 24 * 3600 * 1000).toISOString();
      const voucher: RecoveryVoucher = {
        schema: SCHEMA_ID, version: CONTRACT_VERSION, stayId: stay.id, ownerId: stay.ownerId,
        nonce: newId(), issuedAt: at, expiresAt: expires, revision: stay.revision + 1, usedAt: null,
      };
      const next: Stay = {
        ...stay, state: "pickup_requested", hostOfflineNoted: !req.hostConnected,
        updatedAt: at, revision: stay.revision + 1,
      };
      stays.set(next.id, next);
      recoveryRequests.set(req.id, req);
      vouchers.set(voucher.nonce, voucher);
      refreshNursery(next.nurseryId, at);
      const eventId = emit("recovery.requested", stay.id, input.idempotencyKey, at, { request: req, stay: next, voucher });
      return OK({ request: req, voucher }, eventId);
    });
  }

  function completeRecovery(
    input: CommandBase & { voucher: RecoveryVoucher; at?: string },
  ): OpResult<Stay> {
    const at = time(input);
    return dedupe(`complete:${input.idempotencyKey}`, () => {
      const v = validateRecoveryVoucher(input.voucher);
      if (!v.ok) return ERR<Stay>("INVALID_INPUT", "vale inválido", { issues: v.issues });
      const voucher = v.value;
      const stay = stays.get(voucher.stayId);
      if (!stay) return ERR<Stay>("NOT_FOUND", "la estancia no existe");
      if (stay.ownerId !== voucher.ownerId) return ERR<Stay>("OWNER_MISMATCH", "el vale no pertenece al propietario");
      if (voucher.revision !== stay.revision) return ERR<Stay>("STALE_REVISION", "el vale quedó obsoleto");
      if (Date.parse(at) > Date.parse(voucher.expiresAt)) return ERR<Stay>("VOUCHER_EXPIRED", "el vale expiró");
      if (stay.state === "stay_finished" || voucher.usedAt !== null) {
        // La retirada repetida es un no-op exitoso: idempotencia de recuperación.
        return OK(stay, null);
      }
      if (stay.state !== "pickup_requested" && stay.state !== "recoverable_error" && stay.state !== "stay_active") {
        return ERR<Stay>("STAY_NOT_ACTIVE", "estado de estancia incompatible");
      }
      const used: RecoveryVoucher = { ...voucher, usedAt: at };
      const next: Stay = { ...stay, state: "stay_finished", finishedAt: at, updatedAt: at, revision: stay.revision + 1 };
      stays.set(next.id, next);
      vouchers.set(used.nonce, used);
      hosted.delete(next.pokemon.instanceId);
      refreshNursery(next.nurseryId, at);
      const eventId = emit("recovery.completed", stay.id, input.idempotencyKey, at, {
        stay: next, voucher: used, finishedStayId: stay.id,
      });
      return OK(next, eventId);
    });
  }

  // --- Consultas, replay y restores ----------------------------------------

  function snapshot() {
    return {
      owners: [...owners.values()].map((v) => ({ ...v })),
      nurseries: [...nurseries.values()].map((v) => ({ ...v })),
      pokemon: [...pokemon.values()].map((v) => ({ ...v })),
      stays: [...stays.values()].map((v) => ({ ...v })),
      requests: [...requests.values()].map((v) => ({ ...v })),
      recoveryRequests: [...recoveryRequests.values()].map((v) => ({ ...v })),
      vouchers: [...vouchers.values()].map((v) => ({ ...v })),
      hosted: [...hosted.entries()],
      sequence,
      eventCount: events.length,
    };
  }

  function exportEvents(): SyncEvent[] {
    return events.map((e) => ({ ...e, payload: { ...e.payload } }));
  }

  /** Prefijo de idempotencia usado por cada tipo de evento al reconstruir. */
  function idempotencyPrefixOf(event: SyncEvent): string {
    switch (event.type) {
      case "owner.registered": return "owner";
      case "nursery.registered": return "nursery";
      case "pokemon.registered": return "pokemon";
      case "deposit.requested": return "deposit";
      case "deposit.accepted": return "accept";
      case "deposit.rejected": return "reject";
      case "permission.granted": return "grant";
      case "permission.revoked": return "revoke";
      case "recovery.requested": return "recovery";
      case "recovery.completed": return "complete";
      case "nursery.connectivity": return "connectivity";
      case "nursery.flags": return "flag";
      case "breeding.requested": return "breeding";
      case "care.applied": {
        const action = event.payload.action;
        if (action === "ev_berries") return "berries";
        if (action === "ev_minigame") return "minigame";
        return "care";
      }
    }
  }

  /** Reconstruye el estado desde el registro: simula reinicio de la app. */
  function restore(log: readonly SyncEvent[]): void {
    const v = log.map((e) => validateSyncEvent(e));
    if (v.some((r) => !r.ok)) throw new Error("PG-08A: registro de eventos inválido");
    owners.clear(); nurseries.clear(); pokemon.clear(); stays.clear();
    requests.clear(); recoveryRequests.clear(); vouchers.clear(); hosted.clear();
    events = []; sequence = 0; idempotency.clear();
    const sorted = [...log].sort((a, b) => a.sequence - b.sequence);
    for (const event of sorted) {
      apply(event);
      events.push({ ...event, payload: { ...event.payload } });
      // La idempotencia de las operaciones DEBE sobrevivir al reinicio;
      // reconstruimos las mismas claves que usan los comandos en vivo.
      idempotency.set(`${idempotencyPrefixOf(event)}:${event.idempotencyKey}`, OK(null, event.eventId));
    }
  }

  // Aplicar el registro inicial (por ejemplo, al restaurar desde disco simulado).
  if (initialEvents.length) restore(initialEvents);

  return {
    registerOwner, registerNursery, registerPokemon,
    requestDeposit, acceptDeposit, rejectDeposit,
    grantPermission, revokePermission,
    care, applyEvBerries, applyEvMinigame, requestBreeding,
    setConnectivity, setNurseryFlag,
    requestRecovery, completeRecovery,
    snapshot, exportEvents, restore,
    getOwner: (id: OwnerId) => owners.get(id),
    getNursery: (id: NurseryId) => nurseries.get(id),
    getStay: (id: StayId) => stays.get(id),
    getVoucher: (nonce: string) => vouchers.get(nonce),
    /** Superficie pública deliberadamente SIN exportar/eliminar/transferir. */
    publicOperations: [
      "registerOwner", "registerNursery", "registerPokemon", "requestDeposit",
      "acceptDeposit", "rejectDeposit", "grantPermission", "revokePermission",
      "care", "applyEvBerries", "applyEvMinigame", "requestBreeding",
      "setConnectivity", "setNurseryFlag", "requestRecovery", "completeRecovery",
      "snapshot", "exportEvents", "restore",
    ] as const,
  };
}
