/**
 * PG-08F — Dominio puro de distribución 1+1, Pokémon DEMO y contrato futuro.
 *
 * NO modifica los contratos PG-08D/E. Un ciclo completo produce DOS huevos
 * simulados con identidades distintas, mismos progenitores, procedencia
 * verificable y propietarios independientes. No hay genética, eclosión, PKM,
 * saves, red ni azar. Ningún inicial DEMO puede criar, exportar ni intercambiar.
 */

import { createHash } from "node:crypto";

import {
  classifyProvenance,
  demoProvenance,
  eggIdFor,
  isBreedableProvenance,
  proposedOwnerOf,
  type AssignmentPolicy,
  type EggId,
  type EggParentRef,
  type EggRecord,
  type PokemonProvenance,
  type DomainResult,
} from "./egg-domain.ts";

const ok = <T>(value: T): DomainResult<T> => ({ ok: true, value });
const err = <T>(code: string, message: string): DomainResult<T> => ({ ok: false, code, message });

export const PAIR_SCHEMA = "pg08f.egg-pair-domain" as const;
export const PAIR_VERSION = "1.0.0" as const;
export const DELIVERY_SCHEMA = "pg08f.egg-delivery" as const;
export const GENETICS_SCHEMA = "pg08f.genetics-contract" as const;
export const DEMO_STARTERS_SCHEMA = "pg08f.demo-starters" as const;

export const RECIPIENT_ROLES = ["host", "guest"] as const;
export type RecipientRole = (typeof RECIPIENT_ROLES)[number];

export const DELIVERY_STAGES = [
  "produced", "stored", "assigned", "available", "claimed", "delivered",
] as const;
export type DeliveryStage = (typeof DELIVERY_STAGES)[number];

const stableHash = (label: string): string => createHash("sha256").update(label).digest("hex");

/** Un ciclo = un par; el intervalo sigue siendo ÚNICO para la pareja (PG-08D). */
export function pairEventIdFor(cycleId: string, productionEventId: string, role: RecipientRole): string {
  if (!cycleId || !productionEventId) throw new Error("PG-08F: ciclo o evento vacío");
  if (!RECIPIENT_ROLES.includes(role)) throw new Error("PG-08F: destinatario desconocido");
  return `${productionEventId}:${role}`;
}

/** Identidad determinista y distinta por destinatario, compatible con PG-08E. */
export function pairEggIdFor(cycleId: string, productionEventId: string, role: RecipientRole): EggId {
  return eggIdFor(cycleId, pairEventIdFor(cycleId, productionEventId, role));
}

export type PairOwnerContext = {
  readonly hostId: string;
  readonly guestOwnerId: string;
  readonly agreedOwnerId?: string | null;
};

export const OWNER_POLICY_BY_ROLE: Readonly<Record<RecipientRole, AssignmentPolicy>> = Object.freeze({
  host: "host",
  guest: "guest_owner",
});

export function recipientForRole(role: RecipientRole, context: PairOwnerContext): string {
  return proposedOwnerOf(OWNER_POLICY_BY_ROLE[role], context) ?? "";
}

export function assertDistinctPair(host: EggId, guest: EggId): DomainResult<true> {
  if (!host || !guest || host === guest) return err("PAIR_ID_COLLISION", "los huevos del par deben tener identidades distintas");
  return ok(true);
}

/** Un progenitor DEMO o desconocido bloquea todo el ciclo. */
export function assertBreedablePair(provenance: readonly [PokemonProvenance, PokemonProvenance]): DomainResult<true> {
  if (!Array.isArray(provenance) || provenance.length !== 2) {
    return err("PAIR_PROVENANCE_INCOMPLETE", "se requiere procedencia de ambos progenitores");
  }
  for (const p of provenance) {
    const verdict = isBreedableProvenance(p);
    if (!verdict.ok) return err(verdict.code, verdict.message);
  }
  return ok(true);
}

/** Los progenitores no cambian de propietario por producir un par. */
export function assertParentsUnchanged(
  before: readonly [EggParentRef, EggParentRef],
  after: readonly [EggParentRef, EggParentRef],
): DomainResult<true> {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    return err("PARENT_OWNERSHIP_CHANGED", "la propiedad de los progenitores es inmutable");
  }
  return ok(true);
}

// ---------------------------------------------------------------------------
// Catálogo tipado de iniciales DEMO (Gen I-V). Solo metadatos verificables.
// ---------------------------------------------------------------------------

export type StarterEntry = {
  readonly generation: 1 | 2 | 3 | 4 | 5;
  readonly nationalDex: number;
  readonly name: string;
  readonly slug: string;
};

/** Números de la Pokédex Nacional, verificables y sin derivar de PKHeX. */
export const DEMO_STARTERS: readonly StarterEntry[] = Object.freeze([
  { generation: 1, nationalDex: 1, name: "Bulbasaur", slug: "bulbasaur" },
  { generation: 1, nationalDex: 4, name: "Charmander", slug: "charmander" },
  { generation: 1, nationalDex: 7, name: "Squirtle", slug: "squirtle" },
  { generation: 2, nationalDex: 152, name: "Chikorita", slug: "chikorita" },
  { generation: 2, nationalDex: 155, name: "Cyndaquil", slug: "cyndaquil" },
  { generation: 2, nationalDex: 158, name: "Totodile", slug: "totodile" },
  { generation: 3, nationalDex: 252, name: "Treecko", slug: "treecko" },
  { generation: 3, nationalDex: 255, name: "Torchic", slug: "torchic" },
  { generation: 3, nationalDex: 258, name: "Mudkip", slug: "mudkip" },
  { generation: 4, nationalDex: 387, name: "Turtwig", slug: "turtwig" },
  { generation: 4, nationalDex: 390, name: "Chimchar", slug: "chimchar" },
  { generation: 4, nationalDex: 393, name: "Piplup", slug: "piplup" },
  { generation: 5, nationalDex: 494, name: "Snivy", slug: "snivy" },
  { generation: 5, nationalDex: 498, name: "Tepig", slug: "tepig" },
  { generation: 5, nationalDex: 501, name: "Oshawott", slug: "oshawott" },
]);

export const demoStartersChecksum = (): string => stableHash(`${DEMO_STARTERS_SCHEMA}|${JSON.stringify(DEMO_STARTERS)}`);

export function starterBySlug(slug: string): StarterEntry | null {
  return DEMO_STARTERS.find((s) => s.slug === slug) ?? null;
}

export function starterByDex(generation: StarterEntry["generation"], nationalDex: number): StarterEntry | null {
  return DEMO_STARTERS.find((s) => s.generation === generation && s.nationalDex === nationalDex) ?? null;
}

export type DemoPokemon = {
  readonly schema: typeof DEMO_STARTERS_SCHEMA;
  readonly instanceId: string;
  readonly starter: StarterEntry;
  readonly provenance: PokemonProvenance;
  readonly catalogChecksum: string;
};

/** Crea una ENTIDAD DEMO en memoria; nunca un PKM ni una entrada en save. */
export function createDemoStarter(instanceId: string, slug: string, at: string): DomainResult<DemoPokemon> {
  const starter = starterBySlug(slug);
  if (!starter || !instanceId || Number.isNaN(Date.parse(at))) return err("STARTER_INVALID", "inicial o identidad inválida");
  return ok({
    schema: DEMO_STARTERS_SCHEMA,
    instanceId,
    starter,
    provenance: demoProvenance(instanceId, at),
    catalogChecksum: demoStartersChecksum(),
  });
}

export type DemoRestriction = "breed" | "export" | "trade" | "transfer" | "import_convert" | "legal_bypass";

export function demoRestrictions(): readonly DemoRestriction[] {
  return ["breed", "export", "trade", "transfer", "import_convert", "legal_bypass"] as const;
}

/** Restricciones del dominio: NO dependen de un badge ni de metadatos cambiantes. */
export function assertDemoAllowed(pokemon: DemoPokemon, restriction: DemoRestriction): DomainResult<true> {
  if (pokemon.provenance.class !== "DEMO_INTERNAL_NON_EXPORTABLE") {
    return err("DEMO_CLASS_INVALID", "entidad sin procedencia DEMO permanente");
  }
  return err("DEMO_BLOCKED", `Pokémon DEMO: ${restriction} bloqueado por contrato`);
}

export function importedProvenance(instanceId: string, saveSha256: string, at: string): PokemonProvenance {
  return classifyProvenance({ instanceId, source: "save_import", saveSha256 }, at);
}

// ---------------------------------------------------------------------------
// Contrato de genética futura (sin calcular ni inventar valores)
// ---------------------------------------------------------------------------

export type GeneticsAlgorithmRef = {
  readonly schema: typeof GENETICS_SCHEMA;
  readonly status: "unresolved";
  readonly algorithmId: null;
  readonly seedRef: null;
  readonly ruleset: null;
  readonly generation: number | null;
  readonly species: null;
  readonly nature: null;
  readonly ivs: null;
  readonly dvs: null;
  readonly ability: null;
  readonly gender: null;
  readonly shiny: null;
  readonly inheritedMoves: readonly never[];
  readonly note: string;
};

export function unresolvedGenetics(generation: number): GeneticsAlgorithmRef {
  return {
    schema: GENETICS_SCHEMA,
    status: "unresolved",
    algorithmId: null,
    seedRef: null,
    ruleset: null,
    generation: Number.isInteger(generation) ? generation : null,
    species: null,
    nature: null,
    ivs: null,
    dvs: null,
    ability: null,
    gender: null,
    shiny: null,
    inheritedMoves: [],
    note: "PG-08F: contrato futuro; sin genética calculada, sin PKM y sin azar",
  };
}

// ---------------------------------------------------------------------------
// Puerto de entrega simulada: reutiliza los estados PG-08E, no los duplica.
// ---------------------------------------------------------------------------

export type DeliveryRecord = {
  readonly schema: typeof DELIVERY_SCHEMA;
  readonly deliveryId: string;
  readonly eggId: EggId;
  readonly recipientId: string;
  readonly idempotencyKey: string;
  readonly status: "prepared" | "delivered" | "failed";
  readonly attempts: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly note: string | null;
};

/** `available` es un estado lógico de entrega, no un huevo en caja ni un save. */
export function deliveryStageOf(egg: EggRecord | null, delivery: DeliveryRecord | null): DeliveryStage {
  if (delivery?.status === "delivered") return "delivered";
  if (!egg) return "produced";
  if (egg.state === "claimed") return "claimed";
  if (egg.state === "cancelled") return "produced";
  if (delivery?.status === "prepared") return "available";
  if (egg.state === "stored" || egg.state === "pending_assignment") return egg.ownerId ? "assigned" : "stored";
  return "produced";
}

export interface EggDeliveryPort {
  pendingEggs(recipientId: string): readonly EggRecord[];
  verifyRecipient(eggId: string, recipientId: string): DomainResult<true>;
  prepareDelivery(input: { eggId: string; recipientId: string; idempotencyKey: string; at: string }): DomainResult<DeliveryRecord>;
  confirmDelivery(input: { deliveryId: string; idempotencyKey: string; at: string }): DomainResult<DeliveryRecord>;
  status(eggId: string): DomainResult<{ stage: DeliveryStage; eggState: string; delivery: DeliveryRecord | null }>;
  retry(idempotencyKey: string): DomainResult<DeliveryRecord>;
}
