# PG-08G.1 — SyncGate (SG-01 a SG-05)

**Resultado SG-05: PASS WITH WARNINGS.** Fecha: 19-nov-2026. Auditoría anterior
a cualquier otra modificación. No se ejecutaron `fetch`, `pull`, `merge`,
`rebase`, `reset --hard`, `clean`, `stash`, `commit` ni `push`.

## SG-01 — Estado Git

| Comprobación | Resultado |
|---|---|
| Rama actual | `main` (existe la rama local de checkpoint `checkpoint/pre-shared-nurseries-2026-11-19` en `819b73b`; no se tocó) |
| HEAD local | `7c9c326be0eb4dced4969c5b0f966413d3299dae` (idéntico al histórico comunicado) |
| `origin/main` | `7c9c326be0eb4dced4969c5b0f966413d3299dae` |
| `HEAD...origin/main` | `0 0`; sin commits pendientes ni cambios remotos integrados |
| Upstream | `origin/main` |
| Conflicto / índice | `git ls-files -u` vacío; `git diff --cached` vacío |
| Árbol de trabajo | 44 entradas en `git status --short`: cambios locales de PG-08B…F, Stitch y sidecar; **se conservan todos** |
| `git diff --stat` | 10 archivos modificados, 2749 inserciones, 131 borrados |

AVISO: `HEAD == origin/main` **no** implica árbol limpio. PG-08G.1 no
sobrescribe, commitea ni borra ese trabajo; solo añade documentación y pruebas
exploratorias aisladas.

## SG-02 — Instrucciones y contratos

Leídos: `AGENTS.md` del repositorio y del directorio superior, informes finales
PG-08D/E/F, `packages/core/src/breeding-engine.ts`,
`packages/core/src/egg-domain.ts`, `packages/core/src/egg-pair-domain.ts`,
`apps/server/src/shared-egg-store.ts`,
`apps/server/src/shared-egg-pair-store.ts`, `services/pkhex/pkhex.csproj` y
`services/pkhex/Program.cs`.

Hallazgos que condicionan el diseño:

- `breeding-engine.ts` define `Compatibility`, `Rarity`, intervalos
  **provisionales** y un `BreedingCompatibilityProvider` inyectable. No contiene
  reglas genéticas reales: su `EggRecord` es un marcador de simulación con
  `simulated: true`.
- `egg-domain.ts` fija `EGG_LEGITIMACY = SIMULATED_LOG_ONLY` con `realPkm:false`
  y `exportable:false`; la procedencia es inmutable y DEMO no cría.
- `egg-pair-domain.ts` ya define `unresolvedGenetics()` con campos `null` y
  `EggDeliveryPort`. **No** existe aún `BreedingCompatibility`, `NatureResolver`
  ni ninguno de los resolvedores de la misión: los nombres son propuestas, no
  contratos existentes.
- `shared-egg-store.ts` y `shared-egg-pair-store.ts` son stores SQLite aislados
  con idempotencia, replay y outbox; no contienen lógica genética.
- PKHeX.Core está fijado en la versión **26.10.18**. El sidecar usa
  `LegalityAnalysis`, `SaveUtil`, `PKM` y `GameInfo`; no hay generador de
  huevos. Detalle en `PKHEX-AUDIT.md`.

No hay contradicción que bloquee la investigación. Las reglas 1+1, DEMO y
procedencia de PG-08F se mantienen; PG-08G.1 no las reabre.

## SG-03 — Baseline de pruebas

Ejecutado `bun run check`: **EXIT 0**.

| Suite | Resultado |
|---|---:|
| PG-07H | 101/101 |
| PG-08A | 284/284 |
| PG-08B | 22/22 |
| PG-08C | 33/33 |
| PG-08D | 36/36 |
| PG-08E | 48/48 |
| PG-08F | 50/50 |
| **Total PG-08 (A–F)** | **473/473** |

Coincide con el baseline comunicado. PG-07H se contabiliza aparte. También
pasaron motor, día/noche, i18n, PG-07A…G y compilación del sidecar.

## SG-04 — Integridad

- `sha256sum -c /tmp/opencode/pg08a-protected-before.sha256`: **17/17 sumas
  coincidentes**, incluidos los siete `.srm` de `fixtures/`.
- `data/pokegotchi.db`:
  `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`
  (idéntico al histórico).
- Saves/exportaciones: 12 archivos entre `fixtures/`, `data/saves/` y
  `data/exports/`; ninguno modificado. No hay archivos PKM ni `*.pkN`.
- Existen WAL/SHM preexistentes junto a la BD protegida (`pokegotchi.db-wal`
  0 bytes, `-shm` 32768 bytes). No se borran ni se interpretan como residuo de
  esta misión.
- No se abrió el servidor web, no se conectó a ningún servicio y no se
  manipularon inventarios.

## SG-05 — Decisión

**PASS WITH WARNINGS.** Advertencias: trabajo local sin commitear de fases
anteriores y WAL/SHM preexistentes. No hay fallos de pruebas, pérdida de datos,
conflicto de contratos ni modificación de archivos protegidos. Se autoriza a
continuar PG-08G.1.
