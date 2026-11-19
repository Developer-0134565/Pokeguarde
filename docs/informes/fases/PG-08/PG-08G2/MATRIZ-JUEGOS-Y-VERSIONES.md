# PG-08G.2 — Matriz de juegos y versiones

**Objetivo:** convertir la matriz por generación de PG-08G.1 en una matriz por
**juego/versión de mecánicas**, que es la unidad que debe consumir el motor.
Ninguna fila está implementada.

## 1. Claves de juego propuestas (`GameKey`)

| `GameKey` | Juego | Generación | Crianza | Estado de reglas |
|---|---|---|---:|---|
| `gen1-rb` | Red / Blue | 1 | No | VERIFIED (ausencia) |
| `gen1-y` | Yellow | 1 | No | VERIFIED (ausencia) |
| `gen2-gs` | Gold / Silver | 2 | Sí | VERIFIED |
| `gen2-crystal` | Crystal | 2 | Sí | VERIFIED (tutor de movimientos incluido) |
| `gen3-rs` | Ruby / Sapphire | 3 | Sí | VERIFIED |
| `gen3-emerald` | Emerald | 3 | Sí | VERIFIED |
| `gen3-frlg` | FireRed / LeafGreen | 3 | Sí | VERIFIED |
| `gen4-dp` | Diamond / Pearl | 4 | Sí | VERIFIED |
| `gen4-platinum` | Platinum | 4 | Sí | VERIFIED (asumida = DP, ver nota) |
| `gen4-hgss` | HeartGold / SoulSilver | 4 | Sí | VERIFIED |
| `gen5-bw` | Black / White | 5 | Sí | VERIFIED |
| `gen5-b2w2` | Black 2 / White 2 | 5 | Sí | VERIFIED |

**Nota sobre Platinum:** la documentación consultada agrupa DP/Pt en la misma
regla de herencia (mecanismo de overrides tipo Emerald) y en la restricción de
idioma del Everstone. No se encontró una fuente que documente una diferencia
propia de Platinum en crianza. Se marca como **VERIFIED con nota**: si aparece
evidencia en contra, se separa `gen4-platinum` de `gen4-dp`.

**Nota sobre Yellow:** comparte la ausencia de crianza con RB. Su única
particularidad relevante (Pikachu inicial, objeto al cruzar Time Capsule) no
afecta a la crianza porque no existe.

## 2. Matriz de mecánicas por `GameKey`

Leyenda: ✅ aplica · ❌ no existe · ⚠️ aplica con condición · ❓ sin verificar

| Mecánica | gen1 | gen2 | gen3-rs | gen3-emerald | gen3-frlg | gen4-dp/pt | gen4-hgss | gen5-bw | gen5-b2w2 |
|---|---|---|---|---|---|---|---|---|---|
| Crianza | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modelo de IV/DV | DV4 | DV4 | IV6 | IV6 | IV6 | IV6 | IV6 | IV6 | IV6 |
| Herencia de stats | ❌ | Def copia, Spc ±8 | 3 IVs | overrides 3–5 | 3 IVs | overrides 3–5 | 3 IVs distintos | 3 IVs distintos | 3 IVs distintos |
| Power Items | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Everstone (naturaleza) | ❌ | ❌ (no hay naturaleza) | ❌ | ✅ 50 % madre/Ditto | ❌ | ⚠️ 50 % madre/Ditto, solo mismo idioma | ✅ 50 % cualquier portador | ✅ 50 % cualquier portador, entre idiomas | ✅ **100 %** |
| Destiny Knot (crianza) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Herencia de habilidad normal | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 80 % (hembra+macho) |
| Herencia de habilidad oculta | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 60 % (hembra+macho) | ✅ 80 % (hembra+macho) |
| Volt Tackle por Light Ball | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Inciensos para bebés | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Nivel de eclosión | — | 5 | 5 | 5 | 5 | 1 | 1 | 1 | 1 |
| Ball del huevo | — | Poké Ball | Poké Ball | Poké Ball | Poké Ball | Poké Ball | Poké Ball | Poké Ball | Poké Ball |
| Shiny por | — | DVs | PID | PID | PID | PID | PID | PID | PID |
| Masuda | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ CONFLICTING | ⚠️ CONFLICTING | ✅ 6 rolls | ✅ 6 rolls |
| Shiny Charm | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Time Capsule (Gen I) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 3. Diferencias que el motor **debe** distinguir

| Par de versiones | Diferencia | Riesgo si se ignora |
|---|---|---|
| `gen3-rs` / `gen3-frlg` vs `gen3-emerald` | Herencia de IVs (3 exactos vs overrides) y Everstone | IVs imposibles; naturaleza mal asignada |
| `gen3-*` vs `gen4-*` | Nivel de eclosión (5 → 1) | Huevo con nivel ilegal |
| `gen4-dp`/`pt` vs `gen4-hgss` | Power Items, mecanismo de IVs, Everstone por idioma | IVs y naturaleza incorrectos |
| `gen4-*` vs `gen5-*` | Habilidades heredables (solo Gen V) | Habilidad imposible |
| `gen5-bw` vs `gen5-b2w2` | Everstone 50 % → 100 %; habilidad normal 80 %; Shiny Charm | Probabilidades y habilidades incorrectas |
| `gen2-*` vs `gen3-*` | DVs vs IVs; shiny por DVs vs PID | Shiny y stats imposibles |
| `gen1-*` vs todo | No hay crianza | Crianza retroactiva inventada |

## 4. Relación con lo que ya existe en el repositorio

| Concepto del repo | Relación con `GameKey` |
|---|---|
| `SaveFile.Generation` / `Version` de PKHeX | Fuente de verdad para derivar `GameKey` al leer un save real |
| `exportTargets` del sidecar (`Program.cs`) | Decisión propia de Pokeguarde; **no** la decide PKHeX |
| `PROVISIONAL_INTERVALS_MS` de PG-08D | Intervalo de simulación, **no** tasa oficial del juego |
| `Rarity` (`common`…`extreme`) | Clasificación provisional de simulación, no oficial |
| `DEMO_STARTERS` de PG-08F | 15 iniciales Gen I–V; ninguno puede criar |
| `GeneticsAlgorithmRef.generation` | Hoy `number | null`; el diseño V2 recomienda `GameKey` |

## 5. Regla de selección

```
GameKey = derive(saveFile.Version, saveFile.Generation)
rules   = GenerationRulesProvider.rulesFor(GameKey)
if (!rules.verified) → UNKNOWN_RULES (no se produce genética)
```

- Un `GameKey` desconocido **no** cae por defecto a la generación.
- Un save hack (p. ej. Crystal Clear) no cambia las reglas: se aplica la regla
  del juego base y se marca `unverified` donde la evidencia no alcance.
- La cadena de exportación se evalúa **después** de la genética, no antes.

## 6. Cobertura y huecos

| Hueco | Estado |
|---|---|
| Lista completa de inciensos por juego | PARTIALLY VERIFIED |
| Herencia de forma Gen III–V | PARTIALLY VERIFIED / UNKNOWN |
| Prioridad exacta de movimientos Gen II | PARTIALLY VERIFIED |
| Ratio Masuda Gen IV | CONFLICTING |
| Amistad inicial del huevo | UNKNOWN |
| Tasas de aparición de huevo Gen V | PARTIALLY VERIFIED (no se usan como temporizador) |

Ninguno de estos huecos bloquea un piloto de Gen II; todos bloquean una
implementación «completa Gen I–V» sin decisiones adicionales.
