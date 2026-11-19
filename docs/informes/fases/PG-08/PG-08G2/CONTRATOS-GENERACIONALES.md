# PG-08G.2 — Contratos generacionales

**Estado: especificación, NO implementación.** Ningún contrato de este documento
existe en el repositorio. Se apoya en la investigación verificada de PG-08G.1
(`MATRIZ-GENERACIONES.md`, `GEN-II.md` … `GEN-V.md`) y en los contratos reales de
PG-08D/E/F.

## 0. Regla transversal

El comportamiento **no** se selecciona por `generation: number`. Se selecciona por
una clave de juego (`GameKey`) que identifica juego y versión de mecánicas:

```
Gen 3 no es una regla: R/S/FRLG ≠ Emerald
Gen 4 no es una regla: DP/Pt ≠ HGSS
Gen 5 no es una regla: B/W ≠ B2/W2
Gen 1 no tiene crianza: no se simula
```

Todo resolvedor recibe `GameKey` y devuelve `UNKNOWN_RULES` si la combinación no
está cubierta por una regla marcada `VERIFIED` o `PARTIALLY VERIFIED` con nota.

## 1. Generación I — contrato de ausencia

```ts
type Gen1Contract = {
  readonly breeding: "NOT_APPLICABLE";
  readonly canProduceEgg: false;
  readonly dvs: {
    readonly kind: "DV4";            // Atk, Def, Spe, Spc (0..15)
    readonly hpDerived: true;        // bits bajos de los otros cuatro
    readonly editable: false;
  };
  readonly timeCapsule: {
    readonly existsIn: readonly ["gen2-gs", "gen2-crystal"];
    readonly forbids: readonly ["gen2_species", "eggs", "mail", "gen2_moves"];
    readonly typeChangeCancels: true; // salvo Magnemite/Magneton
    readonly heldItemFromCatchRate: true;
  };
};
```

**Invariantes**

- `resolveCompatibility()` sobre cualquier Pokémon de Gen I devuelve
  `NOT_APPLICABLE` con motivo `NO_BREEDING_IN_GENERATION`.
- Un DV **nunca** se convierte en IV por regla propia. La única conversión
  documentada es la del Poké Transporter (fuera del alcance Gen 1–5) y **no** se
  replica.
- Un Pokémon de Gen I no puede ser progenitor de un huevo de Gen III+.

**Errores esperados:** `NO_BREEDING_IN_GENERATION`, `DV_EDIT_FORBIDDEN`,
`CROSS_GEN_BREEDING_IMPOSSIBLE`.

## 2. Generación II — contrato de DVs

```ts
type Gen2Contract = {
  readonly breeding: "SUPPORTED";
  readonly dvModel: "DV4";
  readonly hatchLevel: 5;
  readonly genderFrom: "attack_dv";
  readonly shinyFrom: "dvs";
  readonly dvInheritance: {
    readonly source: "opposite_gender_or_ditto";
    readonly defense: "copy";
    readonly special: "copy_or_pm8";   // 50 % igual
    readonly attack: "random";
    readonly speed: "random";
    readonly hp: "derived";
  };
  readonly kinshipBlock: {
    readonly rule: "def_equal_and_special_equal_or_pm8";
    readonly effect: "incompatible";
  };
  readonly heldItems: {
    readonly everstone: "no_breeding_effect";
    readonly powerItems: "NOT_APPLICABLE";
    readonly destinyKnot: "NOT_APPLICABLE";
  };
  readonly abilityInheritance: "NOT_APPLICABLE";
  readonly nature: "NOT_APPLICABLE";
};
```

**Invariantes**

- El shiny se **deriva** de DVs; no existe PID shiny en Gen II. Prohibido asignar
  un shiny «por PID» a un huevo de Gen II.
- El sexo se deriva del Attack DV frente al ratio; no es un campo libre.
- `special` es **un solo DV**; no hay DV separado de Sp.Atk/Sp.Def.
- Dos progenitores shiny caen en la incompatibilidad de parentesco: el contrato
  debe devolver `incompatible` con motivo `KINSHIP_DV_MATCH`, no intentar criar.
- Prioridad exacta de movimientos: `PARTIALLY VERIFIED` → el resolvedor de
  movimientos debe devolver `UNKNOWN_RULES` si hay más de 4 candidatos y la
  prioridad no está verificada en la versión objetivo.

**Errores:** `KINSHIP_DV_MATCH`, `DV_MODEL_MISMATCH`, `SHINY_REQUIRES_PID`
(usar `SHINY_NOT_PID_BASED`), `NATURE_NOT_IN_GENERATION`.

## 3. Generación III — contrato con dos ramas

```ts
type Gen3Contract = {
  readonly breeding: "SUPPORTED";
  readonly ivModel: "IV6";           // 0..31
  readonly hatchLevel: 5;
  readonly genderFrom: "pid";
  readonly shinyFrom: "pid";
  readonly abilityInheritance: "NONE";  // aleatoria entre las posibles
  readonly nature: {
    readonly rsFrlg: "random";
    readonly emerald: "everstone_mother_or_ditto_50";
  };
  readonly ivInheritance: {
    readonly rsFrlg: { readonly inherited: 3 };
    readonly emerald: { readonly mode: "overrides"; readonly randomStats: "3..5" };
  };
  readonly voltTackle: {
    readonly rsFrlg: false;
    readonly emerald: "light_ball_either_parent";
  };
  readonly incenseBabies: "required";   // lista PARTIALLY VERIFIED
  readonly ball: "poke_ball";
};
```

**Invariantes**

- `ivInheritance` de Emerald **no** es «3 IVs heredados»: es un mecanismo de
  sobrescritura que puede dejar 3–5 stats aleatorios. Modelarlo como «3 exactos»
  es un error de fidelidad documentado.
- Las habilidades **no** se heredan en Gen III; cualquier resolvedor que las
  herede debe fallar con `ABILITY_INHERITANCE_NOT_IN_GENERATION`.
- Volt Tackle solo existe vía Light Ball en Emerald.
- Sin incienso, la especie es el primer estado de la cadena de la madre; con
  incienso cambia. La lista completa sigue `PARTIALLY VERIFIED`.

**Errores:** `EMERALD_OVERRIDE_REQUIRES_SEED`, `ABILITY_INHERITANCE_NOT_IN_GENERATION`,
`INCENSE_LIST_UNVERIFIED`, `VOLT_TACKLE_NOT_AVAILABLE`.

## 4. Generación IV — contrato con dos ramas

```ts
type Gen4Contract = {
  readonly breeding: "SUPPORTED";
  readonly ivModel: "IV6";
  readonly hatchLevel: 1;
  readonly abilityInheritance: "NONE";
  readonly nature: {
    readonly dpPt: "everstone_mother_or_ditto_50_same_language_only";
    readonly hgss: "everstone_any_parent_50";
  };
  readonly ivInheritance: {
    readonly dpPt: { readonly mode: "overrides"; readonly randomStats: "3..5" };
    readonly hgss: { readonly inherited: 3; readonly distinctStats: true;
                     readonly powerItems: true };
  };
  readonly powerItems: { readonly dpPt: false; readonly hgss: true };
  readonly destinyKnot: "NO_BREEDING_EFFECT";
  readonly masuda: { readonly exists: true; readonly rate: "CONFLICTING" };
};
```

**Invariantes**

- Destiny Knot **no** interviene en la crianza en Gen IV. Un contrato que lo
  aplique es incorrecto.
- Power Items solo en HGSS; en DP/Pt no afectan.
- Everstone en DP/Pt **falla si los progenitores tienen distinto idioma de
  origen**; en HGSS funciona con cualquier portador.
- El ratio Masuda en Gen IV está `CONFLICTING` (≈1/1639 vs 1/2048): el contrato
  debe devolver un rango o `UNKNOWN_RATE`, nunca una probabilidad canónica.

**Errores:** `DESTINY_KNOT_NOT_IN_GENERATION`, `POWER_ITEM_NOT_IN_VERSION`,
`EVERSTONE_LANGUAGE_MISMATCH`, `MASUDA_RATE_CONFLICTING`.

## 5. Generación V — contrato con dos ramas y habilidades

```ts
type Gen5Contract = {
  readonly breeding: "SUPPORTED";
  readonly ivModel: "IV6";
  readonly hatchLevel: 1;
  readonly ivInheritance: { readonly inherited: 3; readonly distinctStats: true;
                            readonly powerItems: true };
  readonly destinyKnot: "NO_BREEDING_EFFECT";
  readonly everstone: {
    readonly bw: "any_parent_50_cross_language_ok";
    readonly b2w2: "any_parent_100_random_if_both";
  };
  readonly abilities: {
    readonly bw: { readonly normal: "none"; readonly hidden: 0.60 };
    readonly b2w2: { readonly normal: 0.80; readonly hidden: 0.80 };
    readonly requiresFemaleWithMale: true;
    readonly dittoBlocksInheritance: true;
    readonly malesAndGenderless: "never";
  };
  readonly shinyCharm: { readonly bw: false; readonly b2w2: true };
};
```

**Invariantes**

- La herencia de habilidad exige **hembra criando con macho**; con Ditto no se
  hereda ni en B/W ni en B2/W2.
- En B/W la habilidad **normal** no se hereda; solo la oculta al 60 %.
- Everstone en B2/W2 es 100 %; en B/W es 50 %.
- Shiny Charm solo existe en B2/W2.
- Machos y genderless nunca transmiten habilidad.

**Errores:** `HIDDEN_ABILITY_WITH_DITTO`, `ABILITY_INHERITANCE_MALE`,
`EVERSTONE_RATE_MISMATCH`, `SHINY_CHARM_NOT_IN_VERSION`.

## 6. Contrato de compatibilidad (común a Gen II–V)

```ts
type CompatibilityContract = {
  readonly requiresSharedEggGroup: true;
  readonly requiresOppositeGender: true;
  readonly ditto: {
    readonly compatibleWith: "all_but_ditto";
    readonly genderlessRequiresDitto: true;
    readonly dittoWithDitto: "incompatible";
  };
  readonly noEggsDiscovered: "never_breeds";
  readonly gen2Extra: "kinship_dv_block" | null;
};
```

**Invariantes**

- Genderless **solo** cría con Ditto.
- `No Eggs Discovered` nunca cría, en ninguna generación.
- Ditto + Ditto es imposible.
- La incompatibilidad por DVs es exclusiva de Gen II; aplicarla en Gen III+ es un
  error.

**Errores:** `EGG_GROUP_MISMATCH`, `SAME_GENDER`, `GENDERLESS_WITHOUT_DITTO`,
`NO_EGGS_DISCOVERED`, `DITTO_WITH_DITTO`, `KINSHIP_DV_MATCH` (Gen II).

## 7. Especie del huevo (común)

```ts
type SpeciesContract = {
  readonly baseFormOfMother: true;          // o del no-Ditto
  readonly specialPairs: {
    readonly nidoran: "50_50";
    readonly volbeatIllumise: "50_50";      // solo Gen III+
  };
  readonly incenseBabies: readonly string[] | "UNVERIFIED";
  readonly manaphyPhione: "phione_only";    // Manaphy no se obtiene criando
};
```

**Invariantes**

- La especie se decide por la **madre** (o el no-Ditto), nunca por el padre.
- Nidoran♀/♂ y Volbeat/Illumise son parejas 50/50.
- Manaphy + Ditto produce **Phione**, nunca Manaphy.
- Si la lista de inciensos no está verificada, devolver `INCENSE_LIST_UNVERIFIED`
  y no inventar la especie.

## 8. Eclosión

| Generación | Nivel de eclosión | Fuente |
|---|---|---|
| I | N/A (no hay huevos) | G1 |
| II | 5 | G1 VERIFIED |
| III | 5 | G1 VERIFIED |
| IV | 1 | G1 VERIFIED |
| V | 1 | G1 VERIFIED |

**Invariante:** el nivel de eclosión no es un parámetro libre del motor; se deriva
de `GameKey`. Un huevo de Gen II con nivel 1 es un error de contrato.

**Error:** `HATCH_LEVEL_MISMATCH`.

## 9. Qué queda fuera de estos contratos

- PID, OT, TID, SID, met location, idioma de origen y ball distinta de Poké Ball:
  no se generan en PG-08G.2 ni en el contrato genético simulado.
- Cualquier probabilidad shiny «exacta» más allá de lo documentado.
- La equivalencia con el RNG real de los cartuchos: **no** se afirma.
- La exportación: ver `LEGALIDAD-Y-PKHEX.md`.
