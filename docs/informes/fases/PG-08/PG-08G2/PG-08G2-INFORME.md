# PG-08G.2 — Informe consolidado

**Misión:** GENETIC CONTRACTS & BREEDING DESIGN
**Fecha:** 19-nov-2026
**Estado:** INVESTIGACIÓN Y ESPECIFICACIÓN COMPLETADAS. **Sin implementación de producción.**
**Hash SHA-256:** se registra en `PG-08G2-INFORME.sha256` y en `/home/missingn0/Descargas/PG-08G2-INFORME.md.sha256` (se evita la autorreferencia dentro del propio documento).

> Nota de alcance: no se implementó el motor genético, no se modificaron motor,
> base de datos, saves, fixtures, frontend ni sidecar, no se generaron Pokémon y
> no se hicieron commits ni pushes. **Se detiene aquí a la espera de autorización
> expresa para PG-08G.3.**

## 1. Estado inicial y final del repositorio

| Magnitud | Inicial | Final |
|---|---|---|
| Rama | `main` | `main` |
| HEAD | `7c9c326be0eb4dced4969c5b0f966413d3299dae` | `7c9c326be0eb4dced4969c5b0f966413d3299dae` |
| `origin/main` | `7c9c326…` | `7c9c326…` |
| Divergencia | `0 0` | `0 0` |
| Conflictos | ninguno | ninguno |
| Índice | vacío | vacío |
| Entradas locales | 46 (10 M + 36 ??) | 46 + los entregables de esta misión, sin seguimiento |
| Commits / pushes | ninguno | ninguno |

No se ejecutaron `fetch`, `pull`, `merge`, `rebase`, `reset --hard`, `clean`,
`stash` ni `checkout` destructivo. Las 46 entradas preexistentes (PG-07/08 y
Stitch) se conservan íntegras.

## 2. SyncGate

**Resultado: PASS WITH WARNINGS.** Registro completo en `SYNCGATE.md`.

- `bun run check` → EXIT 0: PG-07G 69/69, PG-07H 101/101, PG-08A 284,
  PG-08B 22, PG-08C 33, PG-08D 36, PG-08E 48, PG-08F 50 → **473/473**.
- 17 hashes protegidos: **17/17** coincidentes.
- `data/pokegotchi.db`: `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`.
  WAL 0 bytes y SHM 32768 bytes, preexistentes y sin borrar.
- `data/saves/` y `data/exports/` intactos.
- PKHeX.Core **26.10.18** sin cambios ni recompilación.
- Advertencias: trabajo local sin commitear, WAL/SHM, y discrepancia de
  etiquetas D4/D8/D9 entre PG-08A y esta misión (resuelta con sufijo `-G2`).

## 3. Fuentes y método

- Se leyeron íntegramente los 14 entregables de `PG-08G1/` como base.
- Investigación web con `webfetch` sobre `https://r.jina.ai/https://bulbapedia.bulbagarden.net/wiki/…` y Serebii (`websearch` HTTP 402, Bulbapedia directo 403).
- **Fuente primaria:** desensamblados `pret/pokecrystal` (`breeding.asm`,
  `daycare.asm`, `mon_stats.asm`, constantes) y `pret/pokeemerald`
  (`src/daycare.c`). Cuando código y prosa discrepan, se documenta y manda el
  código.
- Dos subagentes independientes: uno de fuentes secundarias y otro de
  desensamblado. **No son auditorías independientes entre sí** en sentido
  estricto: el primero compartió fuentes con la fase anterior (R-E7).

## 4. Resumen de investigación

### 4.1 Matriz por juego

Doce `GameKey`, no una regla por generación: `gen1-rb`, `gen1-y`, `gen2-gs`,
`gen2-crystal`, `gen3-rs`, `gen3-emerald`, `gen3-frlg`, `gen4-dp`,
`gen4-platinum`, `gen4-hgss`, `gen5-bw`, `gen5-b2w2`. Platinum se agrupa con DP
con nota. Ver `MATRIX-JUEGOS-Y-VERSIONES.md` (17 mecánicas × 9 columnas) y
`CONTRATOS-GENERACIONALES.md`.

### 4.2 Conflictos cerrados

| Conflicto | Resolución | Confianza |
|---|---|---|
| Masuda Gen IV | 4 rerolls + base = 5/8192 ≈ 1/1639; Serebii 1/2048 omite la base | VERIFIED (secundaria) |
| Masuda Gen V | 6 tiradas = 1/1365,75; con Charm 8 = 1/1024,44 | VERIFIED |
| Shiny Charm | Solo B2/W2; modificador por `GameKey`, no por generación | VERIFIED |
| Inciensos | 9 objetos; Sea/Lax en Gen III; cualquiera de los dos progenitores | VERIFIED |
| Formas | Burmy/Shellos/Basculin maternas; Deerling estacional; Rotom normal | VERIFIED |
| Everstone | R/S/FRLG nada; Emerald 50 % madre/Ditto; DP/Pt mismo idioma; HGSS cualquier portador; B/W entre idiomas; B2/W2 100 % | VERIFIED con contradicción declarada |
| Destiny Knot | Sin efecto de crianza hasta Gen VI | VERIFIED |
| Movimientos Gen II | Inserción + FIFO truncado, sin tope de nivel; la «lista de prioridad» de Bulbapedia es Gen VI+ | VERIFICADO POR CÓDIGO |
| DVs Gen II | Def + 3 bits bajos de Special bloquean; también con Ditto; dos shiny nunca crían | VERIFICADO POR CÓDIGO |
| Herencia DV Gen II | Sexo opuesto; Ditto siempre; `SkipDVs` si bebé sin género; hembra+Ditto no hereda movimientos | VERIFICADO POR CÓDIGO |
| IVs Emerald | 3 índices sorteados con bug de eliminación (HP/Def infrarrepresentados, repeticiones); prosa simplifica | VERIFICADO POR CÓDIGO |
| Volt Tackle | Solo Pichu + Light Ball, desde Emerald, se aplica al final descartando el primer movimiento | VERIFICADO POR CÓDIGO |
| Especies | Nidoran 50/50; Illumise→Volbeat; Manaphy→Phione nunca Manaphy; bebé = primera etapa | VERIFICADO POR CÓDIGO |

Aritmética: `P = 1 − (8191/8192)^n`; n=3 → 1/2731,00; n=5 → 1/1638,80; n=6 → 1/1365,75; n=8 → 1/1024,44. La UI debe mostrar fracciones (`8/8192`).

### 4.3 Conflictos abiertos

- Rerolls de Masuda con fuente primaria: **UNKNOWN**.
- Everstone + Masuda en HGSS: **CONFLICTING** en Bulbapedia. Se adopta la
  lectura conservadora: en todo Gen IV con Masuda, sin bonus de naturaleza.
- Herencia de amistad en huevos: **UNKNOWN**.
- Tasas de aparición Gen V: **PARTIALLY VERIFIED**; no se usan como temporizador.
- Hembra con habilidad oculta en juego sin slot oculto: **PARCIAL**.
- Naturaleza Gen IV/V más allá de Emerald, formas alternativas, Poké Balls y
  movimientos de evento: **UNKNOWN**.

Detalle y citas en `CONFLICTOS-Y-EVIDENCIAS.md` (§1–§11).

## 5. Decisiones D4, D8 y D9

- **D4-G2 capacidad**: DECIDED solo la custodia de 2 Pokémon (AGENTS.md) y que
  `claimed` libera capacidad; el modelo por propietario es PROPOSED; los
  valores C2/C3 y el concepto C4 (incubación) son UNRESOLVED. Alternativas A
  (recomendada), B, C y D documentadas.
- **D8-G2 acumulación offline**: `single` PROPOSED para v1; `bounded` con
  `maxEvents`/`maxWindowMs` UNRESOLVED; alternativas proporcional al tiempo y
  replay total descartadas. Reloj autoritativo, sin `Date.now()`.
- **D9-G2 asignación**: 1+1 DECIDED por PG-08F; entrega en dos fases PROPOSED;
  `prearranged`, `pending`, caducidad y rechazo del anfitrión UNRESOLVED.
- Las etiquetas D4/D8/D9 de PG-08A significan invitaciones/retención/límites y
  **no** se reabren; se usa sufijo `-G2`.

## 6. Arquitectura diseñada

Diez capas con dependencia hacia abajo: motor reproductivo (existente),
compatibilidad, reglas por juego, herencia, generación de huevo, incubación,
eclosión, persistencia, legalidad PKHeX (puerto) y exportabilidad (fuera de
alcance). RNG determinista transversal. Interfaces TypeScript completas en
`CONTRATOS-TYPESCRIPT.md`; invariantes y catálogo de ~24 errores en
`ARQUITECTURA-GENETICA-V2.md`.

Puntos críticos:

- `ResolvedGenetics` tiene `realPkm:false` y `exportable:false` como literales.
- `GenerationRuleSet` exige `GameKey` y `verified`; si no, `UNKNOWN_RULES`.
- `MoveRules.strategy:'insertion_fifo_truncate'` y `levelCap:null` en Gen II;
  `SpeciesRules.genderlessInheritsDvs:false`; `formSource:'none'|'mother'|'season'`.
- `LegalityValidationPort` exige bytes PKM reales; `INVALID_CANDIDATE_NOT_PKM`.
- Se reutilizan los stores PG-08E/F; no se persiste la semilla maestra.

## 7. RNG y reproducibilidad

Esquema HMAC-SHA256 sobre contexto canónico (`cycleId`, `productionEventId`,
`eggId`, `recipientRole`, `authoritySequence`, `rulesetVersion`, `algorithmId`,
`purpose`) + SHA-256-CTR con rechazo de módulo. `seedRef` opaco; `Stream.resume`
con `SEED_MISMATCH`. Spike aislado `experimentos/rng-v2-spike.ts`: **12/12,
EXIT 0**, fuera de `scripts/check.sh`.

```
host[0..3]  = 2213081303,4067516777,819963554,3791445596
guest[0..3] = 3922472588,3287468326,175540808,4055952625
seedRef     = b43c12101623d3de47bee4b36f54aa237eb01a8a5e87f7a2807d17480ff1ea6a
```

**No se afirma equivalencia con el RNG de los cartuchos.** La primera ejecución
del spike dio 11/12 por una cadena prohibida en un comentario; corregida y
repetida. Evidencia de que la comprobación es real.

## 8. Legalidad y PKHeX

Cuatro capas separadas: L1 interna, L2 generacional, L3 PKHeX, L4
exportabilidad. PKHeX.Core 26.10.18 ofrece `LegalityAnalysis`, validadores de
crianza y plantillas `EncounterEgg2..9`, pero **no genera huevos desde dos
progenitores**. El veredicto actual usa subcadenas inglesas (`IsCosmetic`),
declara-do frágil; la migración a `LegalityCheckResultCode` no está autorizada.
`unverified` es «no concluyente»: permite Guardería, no habilita exportación.

## 9. Pruebas ejecutadas en esta misión

| Prueba | Resultado |
|---|---|
| `bun run check` (SyncGate) | EXIT 0; 473/473 PG-08 y 101/101 PG-07H |
| 17 hashes protegidos | 17/17 |
| Integridad BD | hash esperado |
| `rng-v2-spike.ts` | 12/12, EXIT 0 |
| Verificación final | ver `SYNCGATE.md` y el apartado 12 de este informe |

`MATRIZ-DE-PRUEBAS.md` define 15 familias y ~180 casos para la futura
implementación, con cobertura mínima por `GameKey` y criterios de aceptación.

## 10. Archivos creados o modificados

**Creados** en `docs/informes/fases/PG-08/PG-08G2/`: los 15 entregables
(listados en el índice) y `experimentos/rng-v2-spike.ts`. **Modificado**:
`docs/informes/README.md` (bloque añadido, sin reescribir informes históricos).
**Copia:** `/home/missingn0/Descargas/PG-08G2-INFORME.md`.

No se modificaron archivos de producción, saves, BD, fixtures ni exportaciones.

## 11. Riesgos y bloqueos

Doce decisiones reservadas al usuario (R-B1…R-B12), siete riesgos de evidencia
(R-E1…R-E7) y dieciséis riesgos de arquitectura (R-A1…R-A16). Inventario
completo en `RIESGOS-Y-BLOQUEOS.md`. Lo que no bloquea: piloto Gen II, RNG de
pruebas y el estado `unverified` en la Guardería.

## 12. Recomendación de alcance para PG-08G.3

1. Puerta previa G3-0.1…G3-0.5: confirmar alcance, decidir R-B1…R-B4, decidir
   si se replica el bug de `InheritIVs` y confirmar que el RNG de producción
   sigue fuera de alcance.
2. Piloto vertical **Gen II** (`gen2-gs`, `gen2-crystal`) con reglas por
   desensamblado, azar inyectado, sin PKM, sin `data/`, sin `scripts/check.sh`.
3. Aceptación: pruebas T-COMP/T-DV/T-SHINY/T-MOVE/T-SPEC en verde, sin
   `Math.random`/`Date.now`, `realPkm:false`, `exportable:false`, 473/473 y
   17 hashes intactos, sin commits ni pushes.
4. G4…G8 como hoja de ruta, condicionada a las decisiones pendientes.

### 12.1 Verificación final ejecutada

| Comprobación | Resultado |
|---|---|
| `bun run check` | EXIT 0; PG-07H 101/101; PG-08A 284, B 22, C 33, D 36, E 48, F 50 (473/473) |
| 17 hashes protegidos | 17/17 coincidentes |
| `data/pokegotchi.db` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` |
| HEAD / `origin/main` / divergencia | `7c9c326…` / `7c9c326…` / `0 0` |
| `git status --short` | 47 entradas (46 preexistentes + directorio `PG-08G2/`) |
| Reflog | Sin commits nuevos; HEAD sigue en `7c9c326` |
| Entregables | 15 `.md` + `experimentos/rng-v2-spike.ts` |
| Copia en Descargas | `cmp` idéntico; SHA-256 coincidente |
| Caracteres CJK en los entregables | ninguno |

Copia y hash: `/home/missingn0/Descargas/PG-08G2-INFORME.md`; el SHA-256
authoritativo de ambos ficheros está en los ficheros `.sha256` laterales.

**No se inicia PG-08G.3 sin autorización expresa.**
