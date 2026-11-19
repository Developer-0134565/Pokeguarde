# PG-08G.2D — Plan propuesto para PG-08G.3

**NO AUTORIZADO. NO EJECUTADO.** Este plan solo prepara el siguiente incremento.
La puerta `G3-0.1…G3-0.5` de `PG-08G2/PROPUESTA-PG08G3.md` sigue cerrada.

## 0. Regla de ubicación

Todo archivo nuevo viviría bajo
`docs/informes/fases/PG-08/PG-08G3/`; si es código, bajo
`.../PG-08G3/experimentos/I<nn>-<nombre>/`. Los stores SQLite temporales,
solo en `/tmp/opencode/pg08g3-<suite>-<caso>/`. Las rutas de producción
(`packages/core/src/...`, `apps/server/src/...`) quedan **prohibidas** salvo
autorización expresa posterior.

## 1. Puertas previas

1. **G3-0.1** confirmar piloto `gen2-gs` / `gen2-crystal`, sin Gen III–V.
2. **G3-0.2** decidir R-B1 (C2) y R-B2 (C3) como mínimo.
3. **G3-0.3** decidir R-B3 (C4) y R-B4 (`maxEvents`/`maxWindowMs`) o confirmar
   que siguen diferidos.
4. **G3-0.4** decidir si se replica el bug `InheritIVs` de Gen III (no afecta al
   piloto).
5. **G3-0.5** confirmar que la semilla maestra de producción sigue fuera de
   alcance.

**Deriva documental a tratar en I1, no a silenciar:** `CONTRATOS-TYPESCRIPT.md`
aún describe `masudaRate:"CONFLICTING"`, `incenseBabies:"UNVERIFIED"` y un
`MoveRules` sin `strategy`/`levelCap`, mientras `CONFLICTOS-Y-EVIDENCIAS.md`
§10–§11 exige estructuras con 5/8192 y 6/8192, tabla de 9 inciensos,
`formSource`, `genderlessInheritsDvs`, `masudaBlocksEverstone` y
`strategy:'insertion_fifo_truncate'`. Igualmente, MOVE-08 de
`MATRIZ-DE-PRUEBAS.md` espera `MOVE_PRIORITY_UNVERIFIED` mientras la fuente
primaria exige `MOVE_ORDER_FIFO`. Se registraría como `DOC_DRIFT` y se corregiría
solo con autorización.

Cadena de dependencias: `I1 → I2 → I3 → I4 → I5 → I6 → I7 → I8 → I9 → I10`.
I3 no necesita RNG; I4 sí. I9 puede ejecutarse con dobles aunque I6–I8 estén
parciales.

## 2. Incrementos

### I1 — Contratos y tipos

- **Archivos previstos:** `experimentos/I1-contratos/{game-keys.ts,types.ts,rules-contract.ts,adapters.ts,drift.md,contract-check.ts}`. `adapters.ts` solo mapea tipos existentes a `GeneticParent`; no los modifica.
- **Dependencias:** documentos G2; lectura de `egg-domain.ts`, `egg-pair-domain.ts`, `breeding-engine.ts`. Sin RNG, sin SQLite.
- **Pruebas:** `DET-08`, `EXP-05`, `COMP-09`, `LEG-02`; aserción de las 12 `GameKey`.
- **Riesgos:** R-A1, R-A2, R-A10/A11/A12, R-E1/R-E2, deriva documental.
- **Aceptación:** script EXIT 0; 12 claves exactas; `rulesFor` solo verifica `gen2-*` en el piloto; cualquier otra clave → `UNKNOWN_RULES`; cero `Math.random`/`Date.now`; el experimento nunca es importado desde producción.
- **Reversibilidad:** borrar `I1-contratos/`; sin efectos externos.
- **Bloqueos:** ninguno de R-B1…R-B4. Store en memoria: sí.

### I2 — RNG determinista

- **Archivos previstos:** `experimentos/I2-rng/{rng.ts,derivation-context.ts,vectors.json,rng-check.ts}`. `vectors.json` guarda solo `seedRef` y sorteos, nunca semilla maestra.
- **Dependencias:** I1 y el spike 12/12 como referencia algorítmica; no se importa desde producción.
- **Pruebas:** `DET-01`…`DET-10`: mismo contexto, separación host/guest, `purpose`, `rulesetVersion`, `algorithmId`, `cycleId`, reanudación, `SEED_MISMATCH`, rangos, escaneo y opacidad.
- **Riesgos:** R-A3/A4/A5/A6, R-B10, falso sentido de equivalencia con cartucho.
- **Aceptación:** reproduce `host[0..3]=2213081303,4067516777,819963554,3791445596`, `seedRef=b43c1210…`; la semilla literal solo en código de prueba, nunca en vectores, logs ni BD.
- **Reversibilidad:** borrar directorio.
- **Bloqueos:** ninguno. Store en memoria: sí.

### I3 — Compatibilidad reproductiva

- **Archivos previstos:** `experimentos/I3-compat/{compatibility.ts,gen1-negative.ts,gen2-kinship.ts,provenance-gate.ts,compatibility-check.ts}`.
- **Dependencias:** I1; reutiliza `isBreedableProvenance`, `assertBreedablePair`, `assertParentsUnchanged`, `OWNER_POLICY_BY_ROLE`. No necesita I2.
- **Pruebas:** `COMP-01`…`COMP-15`. COMP-12 usa un `GenerationRuleSet` de prueba rotulado `TEST_ONLY` que solo declara ausencia del bloqueo Gen II; COMP-13/14 verifican rechazo previo de DEMO/desconocido.
- **Riesgos:** R-A1, R-A13, bloqueo por DVs con Ditto y dos shinies; no aplicar parentesco en Gen III+.
- **Aceptación:** 15/15; `effectiveMother === null` si incompatible; `KINSHIP_DV_MATCH` solo en `gen2-*`; ningún azar invocado en casos rechazados.
- **Reversibilidad:** borrar directorio.
- **Bloqueos:** ninguno. Store en memoria: sí.

### I4 — Herencia por generación y juego

- **Archivos previstos:** `experimentos/I4-inheritance/{gen2-rules.ts,resolvers/{species,gender,stat,nature,ability,shiny,move}.ts,inheritance-engine.ts,inheritance-check.ts}`.
- **Dependencias:** I1, I2, I3; `PG-08G1/GEN-II.md`; `CONFLICTOS-Y-EVIDENCIAS.md` §11.1–11.4 y §11.10.
- **Pruebas:** `DV-01`…`DV-10`; `SHINY-01`…`04` y `10`; `MOVE-01/03/04/05/06/08/12` (MOVE-08 con `DOC_DRIFT` → `MOVE_ORDER_FIFO`); `SPEC-01/02/03/09/11`; `NAT-01`; `ITEM-02`; `IV-12`; `DV-07/08`; `LEG-02`. Quedan fuera PID/habilidad/incienso de otras generaciones.
- **Riesgos:** R-E3/R-E4, G3-0.4 diferido, R-A10; `SkipDVs`; hembra+Ditto sin moves; `special` como DV único; sexo por Attack DV (umbrales 1/3/7/11).
- **Aceptación:** DVs 0–15 con HP derivado; Special copiado o ±8 al 50 % con semilla fija; shiny 1/8192 base y 1/64 con progenitor shiny de sexo opuesto; cero naturalezas/habilidades/IVs en Gen II; reproducción exacta desde `seedRef`.
- **Reversibilidad:** borrar directorio.
- **Bloqueos:** ninguno. Store en memoria: sí.

### I5 — Generación de huevos simulados

- **Archivos previstos:** `experimentos/I5-egg/{draft.ts,egg-generation.ts,fake-provenance.ts,egg-generation-check.ts}`. `fake-provenance.ts` usa identificadores sintéticos, nunca hashes de fixtures.
- **Dependencias:** I3, I4; `createEgg`, `validateEgg`, `pairEggIdFor`, `EGG_LEGITIMACY`, esquema de `unresolvedGenetics`.
- **Pruebas:** `EXP-01/02/05`, `LEG-01/02`, reconfirmación de COMP-13/14 en la entrada, `DET-09` con `EggDraft` rehidratado.
- **Riesgos:** R-A11/A12/A13; mezclar `ResolvedGenetics` con PKM; perder `rulesetVersion`/`algorithmId`.
- **Aceptación:** `validateEgg` OK; legitimidad `simulated:true`, `realPkm:false`, `exportable:false`, `hatched:false`, `class:SIMULATED_LOG_ONLY`; procedencia DEMO/desconocida rechazada antes de derivar azar; cero `.pkm`/`.srm`.
- **Reversibilidad:** borrar directorio.
- **Bloqueos:** ninguno: el borrador no consulta capacidad. Store en memoria: sí.

### I6 — Capacidad y entrega atómica

- **Archivos previstos:** `experimentos/I6-capacity/{memory-store.ts,sqlite-tmp-adapter.ts,capacity-check.ts,delivery-check.ts}`. El adaptador puede instanciar stores existentes con ruta `/tmp/opencode/pg08g3-cap/<caso>.db`; no los edita.
- **Dependencias:** I5; contratos de PG-08E (`CAPACITY_STATES`, `EGG_TRANSITIONS`, `egg_backlog`) y PG-08F (`OWNER_POLICY_BY_ROLE`, `prepareDelivery`/`confirmDelivery`/`retry`/`replay`, `DELIVERY_STAGES`).
- **Pruebas:** `CAP-01`…`CAP-11` y `ATOM-01`…`ATOM-10`. ATOM-08 debe usar un centinela `/tmp/opencode/pg08g3-atom08/pokegotchi.db`, **nunca la ruta real**.
- **Riesgos:** **R-B1/R-B2**, R-A7, R-A14/A15, ambigüedad de capacidad por propietario vs guardería, falso `delivered` como entrega real.
- **Aceptación:** con `TEST_C2`/`TEST_C3` explícitos: `CAPACITY_EXHAUSTED` sin consumir idempotencia; `CAPACITY_BELOW_USAGE` sin destruir; `claimed` libera y permite `drainBacklog`; doble `prepare`/`confirm` sin duplicar; caída recuperable por `retry`/`replay`; cero aperturas de la BD real.
- **Reversibilidad:** borrar directorio y los `/tmp/opencode/pg08g3-*`; BD protegida nunca abierta.
- **Bloqueos:** R-B1/R-B2 bloquean la declaración de producto, no las pruebas estructurales con valores de prueba. Store en memoria: sí; rollback real requiere SQLite en `/tmp`.

### I7 — Progreso offline

- **Archivos previstos:** `experimentos/I7-offline/{offline-policy.ts,catch-up.ts,offline-check.ts}`.
- **Dependencias:** I6, I2, `BreedingClock` inyectado de PG-08D; orden `integrityCheck → drainBacklog → puesta al día → métricas` (R-A8).
- **Pruebas:** `OFF-01/02/03/07/08/09/10/11/12` con `single`. `OFF-04/05/06/13` requieren `bounded` y quedan `UNRESOLVED` hasta R-B4/R-B2.
- **Riesgos:** **R-B4**, R-B2, R-A8/A9; no adoptar el precedente de 7 días como valor; sin acumulación proporcional ni replay total.
- **Aceptación:** reloj solo inyectado; `CLOCK_ROLLBACK` sin generar ni reescribir marca; reintento devuelve mismos `cycleId` con `created:false`; reinicio reanuda desde marca; integridad fallida ⇒ cero puesta al día; `bounded` sin topes ⇒ `UNRESOLVED_POLICY`.
- **Reversibilidad:** borrar directorio y `/tmp`; ninguna marca fuera del store de prueba.
- **Bloqueos:** R-B4 para `bounded`; R-B1/R-B2 para OFF-13. Store en memoria: sí para `single`.

### I8 — Incubación y eclosión

- **Archivos previstos:** `experimentos/I8-incubation/{incubation.ts,hatch.ts,hatch-cycles-source.md,incubation-check.ts}`.
- **Dependencias:** I5, I6, I7; `GenerationRuleSet.hatchLevel`. La tabla de ciclos de eclosión por especie **no existe** en los documentos leídos: debe declararse la fuente o cerrarse con `UNKNOWN_HATCH_CYCLES`.
- **Pruebas:** `SPEC-09/10`, `DET-05`, `EXP-05`; `LEG-01` para `HATCH_LEVEL_MISMATCH`.
- **Riesgos:** **R-B3**, R-A16, hueco de evidencia de ciclos, tendencia a materializar PKM.
- **Aceptación:** progreso persistido y reanudable desde `at` inyectado; `requiredCycles` solo de tabla verificada; `HatchResult` sin bytes PKM y con `realPkm:false`/`exportable:false`; C4 independiente de C2; sin tabla ⇒ fallo cerrado.
- **Reversibilidad:** borrar directorio; ningún huevo real ni save se altera.
- **Bloqueos:** R-B3 para el límite concurrente. Store en memoria: sí para progreso por huevo.

### I9 — Validación interna y generacional

- **Archivos previstos:** `experimentos/I9-validation/{internal-validator.ts,generational-validator.ts,legality-port-double.ts,validation-check.ts}`.
- **Dependencias:** I1–I8; cuatro capas de `LEGALIDAD-Y-PKHEX.md`; `PkmCandidate` solo con bytes sintéticos en memoria o doble del puerto.
- **Pruebas:** `LEG-01`…`LEG-10` y `EXP-01`…`EXP-05`; refuerzo `DET-08`, `DET-10`, `COMP-09`.
- **Riesgos:** R-B8 (migración `IsCosmetic`, no autorizada), R-B9, R-A11/A12, falsos `legal` por mezclar L2 con L3.
- **Aceptación:** cuatro capas informadas por separado; `ResolvedGenetics` → `INVALID_CANDIDATE_NOT_PKM`; L3 con doble no invoca `services/pkhex`; L4 siempre bloqueado; cero archivos PKM.
- **Reversibilidad:** borrar directorio; sidecar intacto.
- **Bloqueos:** ninguno de R-B1…R-B4 para validación simulada; R-B8/R-B9 impiden extenderla a producción. Store en memoria: sí.

### I10 — Integración controlada y regresión

- **Archivos previstos:** `experimentos/I10-regression/{pg08g3-check.ts,syncgate.md,PG-08G3-INFORME.md,.sha256}`. **No** `scripts/check.sh`, **no** `package.json`.
- **Dependencias:** I1–I9; baseline de `SYNCGATE.md` G2.
- **Pruebas:** rerun completo de T-COMP…T-DET, T-LEG, T-EXP con la misma semilla; comparación bit a bit; 473/473 PG-08A–F y 101/101 PG-07H; 17 hashes; hash de BD; recuento de `git status`.
- **Riesgos:** integración silenciosa en `check.sh`; R-B1…R-B4 si se declara «listo»; R-E7; `bun run check` compila el sidecar y escribe `bin`/`obj` (no `Program.cs`).
- **Aceptación:** script propio EXIT 0; cero regresiones; 17/17 hashes; BD `3c6fb194…3001fb4a`; sin archivos nuevos fuera de `PG-08G3/`; HEAD y remoto inalterados; mismas 47 entradas Git; sin commits/pushes.
- **Reversibilidad:** borrar `PG-08G3/`; sin hooks ni artefactos persistentes.
- **Bloqueos:** R-B1…R-B4 bloquean cualquier declaración de producto; integración en `check.sh` exige autorización expresa. Store en memoria: sí para regresión aislada.

## 3. Mapa de bloqueos

| Bloqueo | Incrementos afectados | Sin decisión |
|---|---|---|
| R-B1 (C2) | I6, I7 (OFF-13), I8, I10 | I6 usa `TEST_C2`; I7 no libera capacidad productiva; I8 no declara destino |
| R-B2 (C3) | I6, I7 (OFF-04/05/13), I10 | CAP-03/10 y OFF-13 solo con valores de prueba |
| R-B3 (C4) | I8, I10 | progreso por huevo sí; límite concurrente no |
| R-B4 (topes) | I7 (OFF-04/05/06/13), I10 | `single` avanza; `bounded` → `UNRESOLVED_POLICY`/`WINDOW_EXCEEDED` |

**Ejecutables íntegramente en memoria:** I1, I2, I3, I4, I5, I9.
**Parciales:** I6, I7 (`single`), I8 (sin C4), I10 (aislado).
**Producto listo:** ninguno mientras R-B1…R-B4 sigan sin decidir.

## 4. Prohibiciones operativas

- `data/pokegotchi.db`: no abrir, migrar ni borrar WAL/SHM. La guarda por
  `basename` de `shared-egg-store.ts` y `shared-egg-pair-store.ts` se verificaría
  antes de cualquier caso; ATOM-08 usa centinela en `/tmp`.
- No tocar `fixtures/`, `data/saves/`, `data/exports/`, saves ni crear
  `.pkm`/`.srm`/`.sav`/`.dsv`.
- No tocar `apps/web/**`, `services/pkhex/Program.cs`, `pkhex.csproj`,
  `breeding-engine.ts`, `egg-domain.ts`, `egg-pair-domain.ts`, stores, `db.ts`,
  `index.ts` ni `scripts/check.sh`.
- No `Math.random()`, `Date.now()`, semilla maestra en logs/BD, red, cuentas ni
  cifrado nuevo. Sin equivalencia con RNG de cartucho.
- No `clean`, `stash`, `reset`, `checkout` destructivo, `fetch`, `pull`,
  `commit` ni `push`; conservar las 47 entradas locales.
