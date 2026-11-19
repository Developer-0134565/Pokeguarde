# PG-08G.2 — Arquitectura genética V2

**Estado: diseño. Nada implementado.** Esta versión amplía
`PG-08G1/ARQUITECTURA-GENETICA.md` separando en capas lo que en G1 era una sola
lista de contratos, e integrándolo con lo que ya existe (PG-08D/E/F).

## 1. Principio de capas

```
┌──────────────────────────────────────────────────────────────┐
│ 10. Exportabilidad (fuera de alcance)                        │
├──────────────────────────────────────────────────────────────┤
│ 9. Legalidad PKHeX (puerto, implementación futura)           │
├──────────────────────────────────────────────────────────────┤
│ 8. Persistencia (stores existentes PG-08B/E/F)               │
├──────────────────────────────────────────────────────────────┤
│ 7. Eclosión (simulada; no produce PKM)                       │
├──────────────────────────────────────────────────────────────┤
│ 6. Incubación (progreso por reloj autoritativo)              │
├──────────────────────────────────────────────────────────────┤
│ 5. Generación de huevo (EggDraft → EggRecord PG-08E)         │
├──────────────────────────────────────────────────────────────┤
│ 4. Herencia genética (resolvedores por rasgo)                │
├──────────────────────────────────────────────────────────────┤
│ 3. Reglas por juego/versión (GenerationRulesProvider)        │
├──────────────────────────────────────────────────────────────┤
│ 2. Compatibilidad reproductiva                               │
├──────────────────────────────────────────────────────────────┤
│ 1. Motor reproductivo (PG-08D, ya existe: cuándo)            │
└──────────────────────────────────────────────────────────────┘
        RNG determinista (transversal, no una capa)
```

La regla de dependencia es **hacia abajo**: una capa no conoce a la de arriba.
El motor PG-08D decide **cuándo** hay huevo; la capa 4 decide **qué rasgos**
tendría; la capa 5 lo convierte en el `EggRecord` que PG-08E ya sabe validar.

## 2. Capa 1 — Motor reproductivo (existente)

- Archivo: `packages/core/src/breeding-engine.ts`. **No se modifica.**
- Responsabilidad: ciclos, intervalos provisionales, `OfflinePolicy`, eventos,
  `PairEvaluation`, `CustodyPort`.
- Lo que aporta a la genética: `cycleId`, `pairRevision`, número de ciclo y la
  señal de que el ciclo se completó.
- Lo que **no** hace: no decide especie, IVs, naturaleza, habilidad ni shiny.

## 3. Capa 2 — Compatibilidad reproductiva

```ts
interface CompatibilityResolver {
  evaluate(
    parents: readonly [GeneticParent, GeneticParent],
    rules: GenerationRuleSet,
  ): DomainResult<CompatibilityVerdict>;
}

type CompatibilityVerdict = {
  readonly compatible: boolean;
  readonly reason:
    | "OK" | "EGG_GROUP_MISMATCH" | "SAME_GENDER" | "GENDERLESS_WITHOUT_DITTO"
    | "NO_EGGS_DISCOVERED" | "DITTO_WITH_DITTO" | "KINSHIP_DV_MATCH"
    | "NO_BREEDING_IN_GENERATION" | "UNKNOWN_RULES";
  readonly dittoInvolved: boolean;
  readonly effectiveMother: GeneticParent | null; // no-Ditto o hembra
};
```

Invariantes: determinista y puro; `effectiveMother` es `null` si no es
compatible; `KINSHIP_DV_MATCH` solo puede aparecer en `gen2-*`.

## 4. Capa 3 — Reglas por juego

```ts
interface GenerationRulesProvider {
  rulesFor(key: GameKey): DomainResult<GenerationRuleSet>;
  supported(): readonly GameKey[];
}
```

`GenerationRuleSet` agrupa, ya resueltas por versión:

```ts
type GenerationRuleSet = {
  readonly key: GameKey;
  readonly generation: 1 | 2 | 3 | 4 | 5;
  readonly breeding: "NOT_APPLICABLE" | "SUPPORTED";
  readonly statModel: "DV4" | "IV6";
  readonly hatchLevel: number | null;
  readonly inheritance: InheritanceRules;
  readonly ability: AbilityRules;
  readonly nature: NatureRules;
  readonly shiny: ShinyRules;
  readonly moves: MoveRules;
  readonly items: ItemRules;
  readonly species: SpeciesRules;
  readonly verified: boolean;
  readonly notes: readonly string[];
};
```

Fallo cerrado: si `verified === false`, todo lo que dependa de reglas devuelve
`UNKNOWN_RULES` en lugar de un valor por defecto.

## 5. Capa 4 — Herencia genética

Un orquestador y seis resolvedores puros. El orquestador **no** implementa
reglas: las delega y compone.

```ts
interface InheritanceEngine {
  resolve(input: InheritanceInput, ports: GeneticsPorts): DomainResult<ResolvedGenetics>;
}

type InheritanceInput = {
  readonly cycleId: string;
  readonly eggId: string;             // pairEggIdFor(cycleId, productionEventId, role)
  readonly recipientRole: "host" | "guest";
  readonly rules: GenerationRuleSet;
  readonly parents: readonly [GeneticParent, GeneticParent];
  readonly effectiveMother: GeneticParent;
  readonly authoritySequence: number;
};

type GeneticsPorts = {
  readonly randomness: RandomnessPort;
  readonly clock: BreedingClock;      // reutilizado de PG-08D
};

type ResolvedGenetics = {
  readonly schema: "pg08g2.genetics";
  readonly status: "resolved" | "unresolved";
  readonly algorithmId: string;
  readonly rulesetVersion: string;
  readonly gameKey: GameKey;
  readonly seedRef: string;           // hash de la semilla derivada, no la semilla
  readonly species: number | null;
  readonly gender: "male" | "female" | "genderless" | null;
  readonly nature: number | null;
  readonly ivs: readonly [number, number, number, number, number, number] | null;
  readonly dvs: Dv4 | null;
  readonly ability: { readonly slot: 1 | 2 | "hidden" } | null;
  readonly shiny: boolean | null;
  readonly inheritedMoves: readonly number[];
  readonly realPkm: false;
  readonly exportable: false;
  readonly notes: readonly string[];
};
```

Resolvedores (todos puros salvo el acceso al puerto de azar):

| Resolvedor | Entrada clave | Salida |
|---|---|---|
| `SpeciesResolver` | madre efectiva, `SpeciesRules` | especie + nota de incienso |
| `GenderResolver` | especie, `statModel`, azar | sexo (Gen II: derivado de DV) |
| `StatResolver` | `InheritanceRules`, padres, azar | `ivs` o `dvs` |
| `NatureResolver` | `NatureRules`, objetos, idiomas | naturaleza o `null` |
| `AbilityResolver` | `AbilityRules`, madre, Ditto | slot o `null` |
| `ShinyResolver` | `ShinyRules`, DVs o PID simulado | `boolean` o `null` |
| `MoveResolver` | `MoveRules`, padres, especie | lista de movimientos |

**Invariante crítico:** `ResolvedGenetics` **no** es un `PKM`. No contiene PID
real, OT, TID, SID, met location ni ball distinta de Poké Ball.

## 6. Capa 5 — Generación de huevo

Traduce `ResolvedGenetics` al `EggRecord` de PG-08E sin alterar sus contratos.

```ts
interface EggGenerationPort {
  draft(input: EggDraftInput): DomainResult<EggDraft>;
}

type EggDraft = {
  readonly cycleId: string;
  readonly productionEventId: string;
  readonly recipientRole: "host" | "guest";
  readonly genetics: ResolvedGenetics;
  readonly provenance: PokemonProvenance;   // inmutable, ya existente
};
```

Reglas: el `EggRecord` resultante mantiene `EGG_LEGITIMACY` con
`realPkm:false` y `exportable:false`; `provenance` debe pasar
`isBreedableProvenance` antes de crear el huevo; DEMO y desconocido se rechazan.

## 7. Capa 6 — Incubación

Concepto nuevo, **no existe** en el código actual (no confundir con el
temporizador de producción de PG-08D).

```ts
interface IncubationService {
  progress(input: { eggId: string; at: number; steps?: number }): DomainResult<IncubationState>;
  hatch(input: { eggId: string; at: number }): DomainResult<HatchResult>;
}

type IncubationState = {
  readonly eggId: string;
  readonly requiredCycles: number;   // derivado de la especie, no libre
  readonly accumulated: number;
  readonly ready: boolean;
};
```

Invariantes: el progreso se calcula con el reloj autoritativo; reiniciar el
proceso no pierde progreso (persistido); `requiredCycles` viene de la tabla de
la especie, no de un número inventado; sin tabla verificada →
`UNKNOWN_HATCH_CYCLES`.

## 8. Capa 7 — Eclosión

```ts
type HatchResult = {
  readonly eggId: string;
  readonly species: number;
  readonly level: number;           // derivado de GameKey (5 en Gen II/III, 1 en Gen IV/V)
  readonly genetics: ResolvedGenetics;
  readonly provenance: PokemonProvenance;
  readonly realPkm: false;
  readonly exportable: false;
};
```

La eclosión **no** produce un PKM ni un archivo. Produce un objeto de dominio
que, si algún día se materializa, deberá pasar por la capa 9.

## 9. Capa 8 — Persistencia

Se reutilizan los stores existentes: `shared-egg-store.ts` (huevo y cola) y
`shared-egg-pair-store.ts` (par 1+1 y entregas). Cambios necesarios:

- Persistir `ResolvedGenetics` junto al huevo (columna JSON o tabla hija).
- Persistir el estado de incubación (progreso y último `at`).
- Persistir `algorithmId` y `rulesetVersion` por huevo, para poder auditar con
  qué reglas se generó.
- **No** persistir la semilla maestra ni el secreto de autoridad.

## 10. Capa 9 — Legalidad PKHeX (puerto)

```ts
interface LegalityValidationPort {
  validate(candidate: PkmCandidate): Promise<DomainResult<LegalityVerdict>>;
}
```

`PkmCandidate` exige una representación **real** (bytes PKM y formato). Un
`ResolvedGenetics` no es un candidato válido: el puerto debe rechazarlo con
`INVALID_CANDIDATE_NOT_PKM`.

## 11. Capa 10 — Exportabilidad (fuera de alcance)

Requiere: PKM real, validación PKHeX, cadena oficial de transferencia y
protocolo de escritura de `AGENTS.md`. Ninguna de estas condiciones se cumple en
PG-08G.2.

## 12. Errores esperados (catálogo)

| Código | Capa | Significado |
|---|---|---|
| `UNKNOWN_RULES` | 3 | No hay reglas verificadas para ese `GameKey` |
| `NO_BREEDING_IN_GENERATION` | 2 | Gen I |
| `EGG_GROUP_MISMATCH` | 2 | Sin grupo común |
| `SAME_GENDER` | 2 | Mismo sexo |
| `GENDERLESS_WITHOUT_DITTO` | 2 | Genderless sin Ditto |
| `NO_EGGS_DISCOVERED` | 2 | Especie que nunca cría |
| `DITTO_WITH_DITTO` | 2 | Imposible |
| `KINSHIP_DV_MATCH` | 2 | Incompatibilidad Gen II por DVs |
| `DEMO_PROVENANCE_BLOCKED` | 5 | DEMO no cría |
| `UNKNOWN_PROVENANCE_BLOCKED` | 5 | Procedencia desconocida |
| `DV_MODEL_MISMATCH` | 4 | Se intentó IV en Gen I/II o DV en Gen III+ |
| `NATURE_NOT_IN_GENERATION` | 4 | Naturaleza en Gen II |
| `ABILITY_INHERITANCE_NOT_IN_GENERATION` | 4 | Habilidad en Gen III/IV |
| `HIDDEN_ABILITY_WITH_DITTO` | 4 | Herencia oculta con Ditto |
| `EVERSTONE_LANGUAGE_MISMATCH` | 4 | DP/Pt con idiomas distintos |
| `DESTINY_KNOT_NOT_IN_GENERATION` | 4 | Destiny Knot en Gen IV/V |
| `MASUDA_RATE_CONFLICTING` | 4 | Cifra no resuelta |
| `INCENSE_LIST_UNVERIFIED` | 4 | Lista de inciensos incompleta |
| `HATCH_LEVEL_MISMATCH` | 7 | Nivel de eclosión incorrecto |
| `UNKNOWN_HATCH_CYCLES` | 6 | Sin tabla de ciclos |
| `INVALID_CANDIDATE_NOT_PKM` | 9 | Se intentó validar genética simulada |
| `SEED_DOMAIN_COLLISION` | RNG | Dos contextos generaron el mismo flujo |

## 13. Invariantes globales

1. Ningún módulo llama a `Math.random()`, `Date.now()` ni lee el reloj del
   sistema.
2. Toda decisión de azar pasa por `RandomnessPort` con `purpose` explícito.
3. Todo resultado genético es reproducible a partir del contexto persistido.
4. DEMO y procedencia desconocida se rechazan antes de calcular nada.
5. Las reglas no verificadas producen `UNKNOWN_RULES`, nunca valores por defecto.
6. Un huevo simulado nunca se convierte en PKM en esta fase.
7. Las dos ramas del par 1+1 comparten reglas y difieren solo en la semilla.
