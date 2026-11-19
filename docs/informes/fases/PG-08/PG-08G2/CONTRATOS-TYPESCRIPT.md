# PG-08G.2 — Contratos TypeScript (especificación)

**Estado: especificación, NO implementación.** Ningún archivo `.ts` de esta
misión se importa desde producción. Todo el código nuevo vive bajo
`docs/informes/fases/PG-08/PG-08G2/experimentos/`.

## 0. Qué existe ya y se reutiliza

| Símbolo real | Origen | Uso en el diseño |
|---|---|---|
| `DomainResult<T>` | `packages/core/src/egg-domain.ts` | Retorno de todo resolvedor |
| `EggId`, `asEggId` | `egg-domain.ts` | Identidad del huevo |
| `PokemonProvenance` | `egg-domain.ts` | Procedencia inmutable |
| `isBreedableProvenance` | `egg-domain.ts` | Puerta de entrada |
| `EggRecord`, `createEgg`, `validateEgg` | `egg-domain.ts` | Huevo simulado |
| `EggParentRef` | `egg-domain.ts` | Referencia a progenitores |
| `PairMember` | `breeding-engine.ts` | Entrada de compatibilidad |
| `BreedingClock` | `breeding-engine.ts` | Reloj autoritativo |
| `pairEggIdFor` | `egg-pair-domain.ts` | `eggId` por rol |
| `GeneticsAlgorithmRef` | `egg-pair-domain.ts` | Forma base a rellenar |
| `unresolvedGenetics` | `egg-pair-domain.ts` | Estado inicial |
| `EggDeliveryPort` | `egg-pair-domain.ts` | Entrega posterior |
| `assertBreedablePair`, `assertDemoAllowed` | `egg-pair-domain.ts` | Bloqueos |

**No existen** (se proponen aquí): `GameKey`, `GenerationRuleSet`,
`GeneticParent`, `CompatibilityVerdict`, `InheritanceEngine`, `ResolvedGenetics`,
`RandomnessPort`, `IncubationService`, `LegalityValidationPort`.

## 1. Claves y reglas

```ts
export const GAME_KEYS = [
  "gen1-rb", "gen1-y",
  "gen2-gs", "gen2-crystal",
  "gen3-rs", "gen3-emerald", "gen3-frlg",
  "gen4-dp", "gen4-platinum", "gen4-hgss",
  "gen5-bw", "gen5-b2w2",
] as const;
export type GameKey = (typeof GAME_KEYS)[number];

export type StatModel = "DV4" | "IV6";

export type Dv4 = {
  readonly attack: number;   // 0..15
  readonly defense: number;  // 0..15
  readonly speed: number;    // 0..15
  readonly special: number;  // 0..15, único para Sp.Atk y Sp.Def
};

export type Iv6 = readonly [
  hp: number, atk: number, def: number,
  spa: number, spd: number, spe: number,
]; // cada uno 0..31
```

## 2. Reglas por juego

```ts
export type InheritanceRules = {
  readonly mode: "dv_gen2" | "three_ivs" | "emerald_overrides" | "hgss_three_distinct";
  readonly powerItems: boolean;
  readonly distinctStats: boolean;
};

export type NatureRules = {
  readonly everstone:
    | "none"
    | "mother_or_ditto_50"
    | "mother_or_ditto_50_same_language"
    | "any_parent_50"
    | "any_parent_100";
};

export type AbilityRules = {
  readonly normalInheritance: "none" | 0.8;
  readonly hiddenInheritance: "none" | 0.6 | 0.8;
  readonly requiresFemaleWithMale: boolean;
  readonly dittoBlocksInheritance: boolean;
};

export type ShinyRules = {
  readonly source: "dvs" | "pid";
  readonly baseRate: number | "UNKNOWN";
  readonly masudaRate: number | "CONFLICTING" | "none";
  readonly shinyCharm: boolean;
};

export type MoveRules = {
  readonly defaultLevel: number;          // 5 en Gen II/III, 1 en Gen IV/V
  readonly fatherTms: boolean;
  readonly fatherEggMoves: boolean;
  readonly crystalTutor: boolean;
  readonly voltTackle: "none" | "emerald_light_ball" | "light_ball";
  readonly priorityVerified: boolean;     // false en Gen II
};

export type ItemRules = {
  readonly everstone: boolean;
  readonly powerItems: boolean;
  readonly destinyKnotBreedingEffect: false; // nunca en Gen I–V
};

export type SpeciesRules = {
  readonly motherBased: true;
  readonly nidoranSplit: true;
  readonly volbeatIllumiseSplit: boolean;  // Gen III+
  readonly incenseBabies: readonly string[] | "UNVERIFIED";
  readonly manaphyProducesPhione: true;
};

export type GenerationRuleSet = {
  readonly key: GameKey;
  readonly generation: 1 | 2 | 3 | 4 | 5;
  readonly breeding: "NOT_APPLICABLE" | "SUPPORTED";
  readonly statModel: StatModel;
  readonly hatchLevel: number | null;
  readonly inheritance: InheritanceRules;
  readonly nature: NatureRules;
  readonly ability: AbilityRules;
  readonly shiny: ShinyRules;
  readonly moves: MoveRules;
  readonly items: ItemRules;
  readonly species: SpeciesRules;
  readonly verified: boolean;
  readonly notes: readonly string[];
};

export interface GenerationRulesProvider {
  rulesFor(key: GameKey): DomainResult<GenerationRuleSet>;
  supported(): readonly GameKey[];
}
```

## 3. Progenitor genético

```ts
export type GeneticParent = {
  readonly ref: EggParentRef;              // existente
  readonly provenance: PokemonProvenance;  // existente
  readonly gameKey: GameKey;
  readonly species: number;
  readonly form: number;
  readonly level: number;
  readonly gender: "male" | "female" | "genderless";
  readonly eggGroups: readonly number[];
  readonly abilitySlot: 1 | 2 | "hidden";
  readonly nature: number | null;          // null en Gen I/II
  readonly heldItem: number | null;
  readonly language: string;               // p. ej. "es", "en"
  readonly dvs: Dv4 | null;
  readonly ivs: Iv6 | null;
  readonly moves: readonly number[];
};
```

Regla: exactamente uno de `dvs` / `ivs` es no nulo, coherente con `statModel`.
Si no, `DV_MODEL_MISMATCH`.

## 4. Compatibilidad

```ts
export type CompatibilityReason =
  | "OK" | "EGG_GROUP_MISMATCH" | "SAME_GENDER" | "GENDERLESS_WITHOUT_DITTO"
  | "NO_EGGS_DISCOVERED" | "DITTO_WITH_DITTO" | "KINSHIP_DV_MATCH"
  | "NO_BREEDING_IN_GENERATION" | "UNKNOWN_RULES";

export type CompatibilityVerdict = {
  readonly compatible: boolean;
  readonly reason: CompatibilityReason;
  readonly dittoInvolved: boolean;
  readonly effectiveMother: GeneticParent | null;
};

export interface CompatibilityResolver {
  evaluate(
    parents: readonly [GeneticParent, GeneticParent],
    rules: GenerationRuleSet,
  ): DomainResult<CompatibilityVerdict>;
}
```

## 5. Herencia

```ts
export type GeneticPurpose =
  | "species" | "gender" | "ivdv" | "nature" | "ability" | "shiny" | "moves";

export type InheritanceInput = {
  readonly cycleId: string;
  readonly productionEventId: string;
  readonly eggId: EggId;                 // pairEggIdFor(...)
  readonly recipientRole: "host" | "guest";
  readonly authoritySequence: number;
  readonly rules: GenerationRuleSet;
  readonly parents: readonly [GeneticParent, GeneticParent];
  readonly effectiveMother: GeneticParent;
};

export type ResolvedGenetics = {
  readonly schema: "pg08g2.genetics";
  readonly status: "resolved";
  readonly algorithmId: string;          // p. ej. "pg08g2.gen2.dv-v1"
  readonly rulesetVersion: string;       // p. ej. "gen2-crystal.v1"
  readonly gameKey: GameKey;
  readonly seedRef: string;              // sha256 hex de la semilla derivada
  readonly species: number;
  readonly gender: "male" | "female" | "genderless";
  readonly nature: number | null;
  readonly ivs: Iv6 | null;
  readonly dvs: Dv4 | null;
  readonly ability: 1 | 2 | "hidden" | null;
  readonly shiny: boolean;
  readonly inheritedMoves: readonly number[];
  readonly realPkm: false;
  readonly exportable: false;
  readonly notes: readonly string[];
};

export interface InheritanceEngine {
  resolve(
    input: InheritanceInput,
    ports: GeneticsPorts,
  ): DomainResult<ResolvedGenetics>;
}

export type GeneticsPorts = {
  readonly randomness: RandomnessPort;
  readonly clock: BreedingClock;
};
```

### 5.1 Resolvedores

```ts
export interface SpeciesResolver {
  resolve(ctx: InheritanceInput): DomainResult<{ species: number; note?: string }>;
}

export interface GenderResolver {
  resolve(ctx: InheritanceInput, rng: DeterministicStream): DomainResult<ResolvedGender>;
}

export interface StatResolver {
  resolve(ctx: InheritanceInput, rng: DeterministicStream): DomainResult<StatResult>;
}

export type StatResult =
  | { readonly model: "DV4"; readonly dvs: Dv4 }
  | { readonly model: "IV6"; readonly ivs: Iv6 };

export interface NatureResolver {
  resolve(ctx: InheritanceInput, rng: DeterministicStream): DomainResult<number | null>;
}

export interface AbilityResolver {
  resolve(ctx: InheritanceInput, rng: DeterministicStream): DomainResult<1 | 2 | "hidden" | null>;
}

export interface ShinyResolver {
  resolve(ctx: InheritanceInput, rng: DeterministicStream): DomainResult<boolean>;
}

export interface MoveResolver {
  resolve(ctx: InheritanceInput): DomainResult<readonly number[]>;
}
```

## 6. RNG

```ts
export type DerivationContext = {
  readonly cycleId: string;
  readonly productionEventId: string;
  readonly eggId: string;
  readonly recipientRole: "host" | "guest";
  readonly authoritySequence: number;
  readonly rulesetVersion: string;
  readonly algorithmId: string;
  readonly purpose: GeneticPurpose;
};

export type DeterministicStream = {
  /** Entero uniforme en [0, maxExclusive) sin sesgo modular. */
  int(maxExclusive: number): number;
  /** Elección uniforme de un índice. */
  pick(length: number): number;
  /** Copia serializable para reanudar exactamente. */
  snapshot(): { readonly cursor: number; readonly seedRef: string };
};

export interface RandomnessPort {
  stream(ctx: DerivationContext): DeterministicStream;
}
```

## 7. Huevo, incubación y eclosión

```ts
export type EggDraftInput = {
  readonly input: InheritanceInput;
  readonly genetics: ResolvedGenetics;
  readonly provenance: PokemonProvenance;
};

export type EggDraft = {
  readonly cycleId: string;
  readonly productionEventId: string;
  readonly recipientRole: "host" | "guest";
  readonly eggId: EggId;
  readonly genetics: ResolvedGenetics;
  readonly provenance: PokemonProvenance;
};

export interface EggGenerationPort {
  draft(input: EggDraftInput): DomainResult<EggDraft>;
}

export type IncubationState = {
  readonly eggId: EggId;
  readonly requiredCycles: number;
  readonly accumulated: number;
  readonly ready: boolean;
};

export interface IncubationService {
  progress(input: { eggId: EggId; at: number; cycles?: number }): DomainResult<IncubationState>;
  hatch(input: { eggId: EggId; at: number }): DomainResult<HatchResult>;
}

export type HatchResult = {
  readonly eggId: EggId;
  readonly species: number;
  readonly level: number;
  readonly genetics: ResolvedGenetics;
  readonly provenance: PokemonProvenance;
  readonly realPkm: false;
  readonly exportable: false;
};
```

## 8. Legalidad y exportabilidad

```ts
export type PkmCandidate = {
  readonly format: "PK1" | "PK2" | "PK3" | "PK4" | "PK5";
  readonly bytes: Uint8Array;     // PKM real, no simulado
  readonly gameKey: GameKey;
};

export type LegalityVerdict = {
  readonly status: "legal" | "unverified" | "illegal";
  readonly reasons: readonly string[];
  readonly source: "pkhex";
};

export interface LegalityValidationPort {
  validate(candidate: PkmCandidate): Promise<DomainResult<LegalityVerdict>>;
}

export type ExportabilityVerdict = {
  readonly exportable: false;
  readonly blockers: readonly (
    | "NO_REAL_PKM" | "NOT_VALIDATED" | "NO_OFFICIAL_CHAIN"
    | "DEMO_PROVENANCE" | "UNKNOWN_PROVENANCE"
  )[];
};
```

## 9. Tabla de compatibilidad con lo existente

| Contrato nuevo | Sustituye | Extiende | Riesgo de duplicación |
|---|---|---|---|
| `CompatibilityResolver` | — | `BreedingCompatibilityProvider` (intervalo/rareza) | Medio: hay que dejar claro que el provider **no** decide genética |
| `ResolvedGenetics` | `GeneticsAlgorithmRef` (`status:"unresolved"`) | mismo esquema base con `status:"resolved"` | Bajo si se mantiene el mismo nombre de campos |
| `EggGenerationPort` | — | `createEgg` de PG-08E | Bajo: solo compone |
| `IncubationService` | — | — | Ninguno: concepto nuevo |
| `RandomnessPort` | — | — | Ninguno |
| `LegalityValidationPort` | — | `LegalityAnalysis` vía sidecar | Bajo: es un puerto |

## 10. Invariantes verificables por tipos

1. `realPkm` es literalmente `false` y `exportable` literalmente `false`: el
   compilador impide construir un resultado «exportable» sin cambiar el tipo.
2. `StatResult` es una unión discriminada: no se puede devolver `ivs` y `dvs` a
   la vez.
3. `GeneticParent` exige `dvs` o `ivs` coherentes con `statModel`.
4. `DomainResult<T>` obliga a tratar el error; no hay excepciones para flujo
   normal.
5. `DerivationContext` exige `purpose` y `eggId`: no se puede derivar un flujo
   «genérico» sin dominio.

## 11. Lo que este documento NO autoriza

- Crear `packages/core/src/egg-genetics.ts` ni ningún módulo de producción.
- Añadir columnas o migraciones a las SQLite existentes.
- Modificar `breeding-engine.ts`, `egg-domain.ts`, `egg-pair-domain.ts` ni los
  stores.
- Integrar nada en `scripts/check.sh`.
