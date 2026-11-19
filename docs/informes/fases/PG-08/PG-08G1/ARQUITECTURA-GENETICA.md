# PG-08G.1 — Arquitectura genética propuesta (NO IMPLEMENTADA)

Los nombres de esta fase son **propuestas**. Salvo `DomainResult<T>`,
`PokemonProvenance`, `EggParentRef`, `PairMember`, `EggRecord`,
`BreedingCompatibilityProvider`, `EggDeliveryPort` y `GeneticsAlgorithmRef`,
**no existen** en el repositorio. Nada de lo siguiente está implementado ni se
integrará en `scripts/check.sh`.

## Principios

1. **Sin duplicación**: reutilizar los contratos de PG-08D/E/F. El motor PG-08D
   decide *cuándo* se completa un ciclo; PG-08E decide *qué es un huevo*;
   PG-08F decide *a quién pertenece*. PG-08G.2 decidirá *qué rasgos simulados*
   lleva cada huevo.
2. **Sin PKM**: el resultado es una estructura de dominio con
   `legitimacy: SIMULATED_LOG_ONLY`, `realPkm:false`, `exportable:false`.
3. **Reglas por juego, no una regla global**: `GenerationRulesProvider`
   selecciona el conjunto según generación y versión.
4. **Todo inyectable**: reloj, procedencia, compatibilidad, aleatoriedad y
   validación son puertos; ningún módulo genético lee reloj del sistema ni
   llama a `Math.random()`.
5. **Fallo cerrado**: sin reglas verificadas o sin procedencia suficiente, se
   devuelve `UNKNOWN_*` / `DEMO_*` y no se produce genética.

## Contratos propuestos

```ts
// A. Compatibilidad (extiende, no sustituye, BreedingCompatibilityProvider)
interface BreedingCompatibility {
  evaluate(
    a: GeneticParent, b: GeneticParent,
    rules: GenerationRuleSet,
  ): DomainResult<CompatibilityResult>;
}

// B. Especie resultante
interface OffspringSpeciesResolver {
  resolve(input: {
    parents: readonly [GeneticParent, GeneticParent];
    speciesRules: SpeciesRuleSet;
  }): DomainResult<SpeciesResult>;
}

// C. Orquestador de herencia
interface InheritanceEngine {
  resolve(input: InheritanceInput, ports: GeneticsPorts): DomainResult<ResolvedGenetics>;
}

// D–I. Resolvedores especializados (todos puros salvo el puerto de azar)
interface NatureResolver { resolve(ctx: InheritanceContext): NatureResult; }
interface IVDVResolver { resolve(ctx: InheritanceContext): IVDVResult; }
interface AbilityResolver { resolve(ctx: InheritanceContext): AbilityResult; }
interface GenderResolver { resolve(ctx: InheritanceContext): GenderResult; }
interface ShinyResolver { resolve(ctx: InheritanceContext): ShinyResult; }
interface EggMoveResolver { resolve(ctx: InheritanceContext): EggMoveResult; }

// J. Validación futura (nunca en PG-08G.1)
interface LegalityValidationPort {
  validate(candidate: ValidationCandidate): DomainResult<LegalityVerdict>;
}

// K. Aleatoriedad reproducible por prueba, impredecible en producción
interface RandomnessPort {
  stream(context: DerivationContext): DeterministicStream;
}

// L. Reglas por generación/versión
interface GenerationRulesProvider {
  rulesFor(game: GameKey): DomainResult<GenerationRuleSet>;
}
```

`GeneticParent` es una proyección de `PairMember` + `PokemonProvenance` +
datos de especie/nivel/objeto, **no** un PKM. `InheritanceContext` incluye
`cycleId`, `eggId`, `recipientRole`, `rulesetVersion`, semilla derivada y los
dos progenitores. `ResolvedGenetics` reutiliza los campos de
`GeneticsAlgorithmRef` (ahora rellenos) pero mantiene `realPkm:false`.

## Flujo propuesto para el par 1+1

```
cycle completed (PG-08D)
  ├─ pair eggs (PG-08F): hostEggId, guestEggId
  ├─ rulesFor(game) → GenerationRuleSet
  ├─ compatibility.evaluate(ambos padres) → OK / DEMO / UNKNOWN
  ├─ para cada huevo, con contexto distinto:
  │    species → gender → IV/DV → nature → ability → shiny → egg moves
  └─ ResolvedGenetics por huevo (simulado, no PKM)
```

El mismo ciclo produce dos resultados **distintos** porque el contexto de
derivación incluye `recipientRole` y `eggId` (ver `RNG-Y-DETERMINISMO.md`).
Las reglas históricas son las mismas para ambos; solo cambia la semilla.

## Relación con los contratos existentes

| Contrato existente | Uso en PG-08G.2 propuesto |
|---|---|
| `BreedingCompatibilityProvider` | Se mantiene para el intervalo/rareza; `BreedingCompatibility` añade Helpers de especie sin reemplazarlo. |
| `unresolvedGenetics()` | Se mantiene como estado inicial; un resolvedor posterior devuelve la misma forma con campos rellenos. |
| `EggDeliveryPort` | No se toca: la genética viaja como payload de un huevo simulado. |
| `EggAuthorityPort` | Aporta la secuencia usada en la derivación de contexto. |
| `isBreedableProvenance()` | Puerta de entrada obligatoria; DEMO y desconocido se rechazan antes de cualquier cálculo. |

## Lo que NO se propone

- No convertir `ResolvedGenetics` en PKM ni en huevo exportable.
- No modificar `breeding-engine.ts`, `egg-domain.ts`, stores ni sidecar.
- No añadir dependencias ni servidor.
- No elegir proving/authority online.
- No fijar tasas de shiny, probabilidades de naturaleza ni recombinación sin
  evidencia documentada en `MATRIZ-GENERACIONES.md`.
