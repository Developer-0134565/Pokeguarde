# PG-08G.1 — Auditoría READ-ONLY de PKHeX.Core

**Método:** inspección de `services/pkhex/pkhex.csproj`, `Program.cs`, metadatos
del ensamblado y reflexión mediante el comando existente `members` del sidecar.
No se compiló, no se abrió ningún save/BD y no se invocó `inspect`, `inventory`
ni `export`. Sumas SHA-256 de `Program.cs`, `pkhex.csproj`, `pkhex.dll` y
`PKHeX.Core.dll` idénticas antes y después; `git status` final idéntico al
inicial. Artefacto temporal: `/tmp/opencode/pg08g1-before.sha256`.

## 1. Versión — VERIFICADO

- `PKHeX.Core` **26.10.18**, `net10.0`, .NET SDK `10.0.404`.
- Metadatos del binario: `26.10.18.0`,
  `P26.10.18+Branch.master.Sha.bfe89c74a3f5265805e364b79bc04ad38ebbc5ea.261019055404`.
- `pkhex.dll` (12:09) posterior a `Program.cs` (10:12): el binario refleja el
  código actual.
- No hay XML de documentación en el paquete NuGet.

## 2. API de legalidad — VERIFICADO

`PKHeX.Core.LegalityAnalysis` expone `Results`, `Valid`, `Info`,
`EncounterMatch`, `EncounterOriginal`, `HasResult(code)`, `IndexOfResult(code)`
y `AddLine`. También existen `LegalityFormatting`, `LegalInfo`,
`LegalityCheckResultCode`, `LegalitySettings`, `ExternalLegalityCheck` y
`LegalityCheckLocalization`.

**Hallazgo:** el veredicto de tres estados de Pokeguarde (`legal` /
`unverified` / `illegal`) **no es una API de PKHeX**. `Program.cs` compara
subcadenas del informe en inglés (`Nickname does not match species name`,
`In-game Trade Nickname has been altered`, `Word Filter`). Es lógica propia y
frágil ante idioma o versión. Existe `LegalityCheckResultCode` como alternativa
estructurada, pero no se ha verificado que cubra todos los casos cosméticos.

## 3. APIs por dominio — VERIFICADO (existencia de miembros)

| Dominio | Tipos/API confirmados |
|---|---|
| PKM | `PKM`, `PK1`, `PK2`, `PK3`, `PK4`, `PK5`, `GBPKM` (`DV16`, `EV_SPC`, `IsShiny`), `PID`, `IV_*`, `Nature`, `Ability`, `Gender`, `Ball`, `MetLocation`, `EggLocation`, `Friendship`, `PSV/TSV`, `RefreshChecksum` |
| Especies | `PersonalTable.RB/Y/GS/C/RS/E/FR/LG/DP/Pt/HGSS/BW/B2W2`, `GameData.GetPersonal`, `GameData.GetLearnSource` |
| Movimientos | `Learnset` (`GetAllMoves`, `GetAllLevels`, `GetIsLearn`, `TryGetLevelLearnMove`, `GetBaseEggMoves`), `MoveLearnInfo`, `LegalMoveInfo.CanLearn`, `GetMoveSources` |
| Naturaleza | `Nature` (25 valores), `NatureUtil`, `NatureAmp` |
| IV/DV | `PKM.IV_*`, `GBPKM.DV16`, `GetIsShinyGB`, `EncounterCriteria.GetCombinedDVs`, `Legal.GetIsFixedIVSequenceValid*` |
| Habilidades | `Ability`, `AbilityNumber`, `AbilityPermission`, `HiddenAbilityPermission`, `AbilityBreedLegality.IsHiddenPossible5/6/7/HOME`, `AbilityVerifier` |
| PID/shiny | `PIDIV`, `PIDType`, `GenerateMethodH/J/K`, `ShinyUtil`, `Shiny`, `Daycare3.TryGetOriginSeed` |
| Encuentros | `IEncounterable`, `EncounterMatch`, `EncounterGenerator1..9`, `EncounterMovesetGenerator` |
| EV/EXP | `EffortExpLegality.GetRequiredEffortEXP(...)` |

`Program.cs` usa directamente `PKM`, `SaveFile`, `SaveUtil`, `GameInfo`,
`GameStrings`, `LegalityAnalysis`, `PK1`, `PK2`, `PK4` y enums `Species`,
`Nature`, `Ability`, `Gender`; por tanto esos tipos son accesibles desde otro
ensamblado (**VERIFICADO**).

## 4. Crianza y huevos — lo que PKHeX realmente ofrece

### 4.1 No hay simulador de herencia de dos padres — VERIFICADO

Enumeración de tipos con `egg|breed|daycare|generat|inherit`: aparecen
`Breeding`, `BulkGenerator`, `EncounterGenerator*`, `EncounterEgg2..9`,
`ChainBreed*`, `MoveBreed*`, `AbilityBreedLegality`, `Daycare3..8b`,
`EggHatch*`, `EggStateLegality`, `EggVerifier`, `EggGroup`, `EggSource2/3/4/5/6`.
**No existe** `EggGenerator`/`BreedGenerator` ni un método que acepte dos PKM
progenitoras y devuelva un huevo. `BulkGenerator` genera encuentros, no
crianza.

### 4.2 Qué sí hace — firmas VERIFICADAS; comportamiento interno NO VERIFICADO

- **Validación de crianza**: `Breeding.CanHatchAsEgg`, `IsGenderSpeciesDetermination`,
  `IsSplitBreedNotBabySpecies`; `MoveBreed.Validate/GetExpectedMoves`;
  `MoveBreed2..6.Validate`; `ChainBreedLegality.IsValid`; devuelven el origen de
  cada movimiento (`EggSource*`: base, huevo del padre, TM del padre, nivel,
  tutor, Volt Tackle). **No calculan descendencia.**
- **Plantilla de huevo → PKM**: `EncounterEgg2..9.ConvertToPKM(ITrainerInfo,
  EncounterCriteria)` con `AbilityPermission`, `Ball`, `Shiny`, `Learn` y
  `EncounterCriteria` (Gender, Ability, Nature, Shiny, IV, Level, Hidden Power,
  Form, `SetRandomIVs`, `GetCombinedDVs`). Es generación **desde plantilla +
  criterios + entrenador**, no desde dos progenitores.
- **Forense de semilla**: `Daycare3.TryGetOriginSeed` / `TryGetOriginSeedEmerald`
  / `IsValidProcPID`; `Daycare5/6/7/8b` exponen `Seed` e `IsEggAvailable`.
  Sirve para **validar** un huevo, no para simular la herencia paso a paso.
- **Eclosión**: `EggHatchLegality.ForceHatch/Trade/GetHatchLocation4`,
  `EggStateLegality`, `EggHatchLocation3..9`, `EggVerifier`.
- **Guardería del save**: `IDaycareStorage`, `IDaycareEggState`,
  `IDaycareExperience`, `IDaycareMulti`, `IDaycareRandomState<T>`: slots y
  semilla, sin reglas de herencia.

### 4.3 Conclusión

PKHeX.Core 26.10.18 ofrece validadores, plantillas de encuentro huevo, forense
de semillas y validación de eclosión. **No** ofrece un motor de herencia a
partir de dos progenitores. Esa lógica debe ser de Pokeguarde y, si algún día se
materializa en un PKM, validarse después con `new LegalityAnalysis(pkm)`.

## 5. Público estable vs. interno — limitación metodológica VERIFICADA

El comando `members` recorre `Assembly.GetTypes()` y
`BindingFlags.Public|Instance|Static|DeclaredOnly` **sin filtrar
`Type.IsPublic`**. Por eso lista tipos internos y máquinas de estado del
compilador (`EncounterMovesetGenerator+<GetEggs>d__20`, `<G>$…`). Por tanto
«miembro listado» ≠ «tipo accesible desde otro ensamblado».

| Clase | Estado |
|---|---|
| `LegalityAnalysis`, `SaveUtil`, `SaveFile`, `GameInfo`, `GameStrings`, `PKM`, `PK1/2/4`, enums | **VERIFICADO público** (los usa `Program.cs` y compila) |
| `PersonalTable`, `GameData`, `EncounterCriteria`, `EncounterEgg*`, `SimpleTrainerInfo`, `ITrainerInfo`, `LegalInfo`, `LegalityFormatting`, `EffortExpLegality`, `ShinyUtil`, `Breeding`, `MoveBreed*`, `ChainBreed*`, `Daycare*`, `Egg*` | **NO VERIFICADO** que el tipo sea público; solo se vio el miembro |
| `<GetEggs>d__20`, `<G>$…`, `LegalityAnalyzers`, `ChainBreedTrace`, `EggSource*` | Auxiliar interno, **INFERIDO** |

No hay garantía de estabilidad semántica: la referencia está fijada a
26.10.18 (commit `bfe89c74…`); actualizar exige repetir esta auditoría.

## 6. Reparto recomendado

**Delegar a PKHeX:** parseo de saves, lectura/relectura de campos, veredicto y
motivos (`LegalityAnalysis.Results/Valid/Report`), esfuerzo/EXP
(`EffortExpLegality`), tablas por edición y movimientos (`PersonalTable`,
`GameData`, `Learnset`, `MoveBreed*`), huevo/eclosión
(`EggHatchLocation*`, `EggStateLegality`, `EggVerifier`,
`EncounterEggN.ConvertToPKM`), ball/abilidad/género/shiny/PID y localizaciones.

**Implementar en Pokeguarde:** guardería y minijuegos; propiedad, recuperación,
idempotencia y trazabilidad; cadenas oficiales de transferencia; frontera
DEMO/simulado/real; RNG con separación de dominios; reglas históricas de
herencia; catálogo de objetos/bayas/correo; formatos de caracteres. **Nunca**
pasar un `ResolvedGenetics` simulado a `LegalityAnalysis`.

## 7. Riesgos accionables

1. `VitaminClamp` (`Program.cs` 1166-1192) codifica a mano múltiplos de 10 y
   pasos de 2560, y detecta el problema por texto. Existe
   `EffortExpLegality.GetRequiredEffortEXP`; **NO VERIFICADO** que sea
   sustituto directo. Merece spike antes de consolidar la regla casera.
2. Veredicto por subcadenas en inglés: frágil ante idioma/versión. Considerar
   `LegalityCheckResultCode` + `Results`.
3. No prometer «crianza legal automática»: no hay generador de dos padres; todo
   huevo materializado debe pasar por `LegalityAnalysis` antes de exportarse.

## 8. NO VERIFICADO

- Implementación interna de `EncounterEggN.ConvertToPKM`,
  `EggHatchLegality.ForceHatch`, `MoveBreed*.Validate`,
  `ChainBreedLegality.IsValid` (solo firmas).
- Visibilidad real `public`/`internal` de la mayoría de tipos listados.
- Equivalencia exacta entre `EffortExpLegality` y la política de recorte de
  Pokeguarde.
- Cobertura de códigos estructurados para todos los casos cosméticos.
- No se validó ningún Pokémon real ni se ejecutó exportación.
