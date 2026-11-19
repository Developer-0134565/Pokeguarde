# PG-08F — SyncGate (SG-01 a SG-05)

**Resultado SG-05: PASS WITH WARNINGS.** Fecha: 19-nov-2026. Auditoría anterior
a cualquier cambio de código o documentación. No se ejecutaron `fetch`,
`commit`, `push`, `reset`, `clean`, `stash`, `pull`, `rebase` ni `merge`.

## SG-01 — Estado Git

| Comprobación | Resultado |
|---|---|
| Rama actual | `main` (existe además la rama local de checkpoint `checkpoint/pre-shared-nurseries-2026-11-19` en `819b73b`; no se tocó) |
| HEAD | `7c9c326be0eb4dced4969c5b0f966413d3299dae` |
| `origin/main` | `7c9c326be0eb4dced4969c5b0f966413d3299dae` |
| `HEAD...origin/main` | `0 0` (sin commits pendientes ni cambios remotos integrados) |
| Upstream | `origin/main` |
| Conflictos (`git ls-files -u`) | ninguno |
| Índice (`git diff --cached`) | vacío |
| Modificados / sin seguimiento | 40 entradas en `git status --porcelain`: cambios locales de PG-08B…E, Stitch y sidecar; se conservan todos |
| Diferencias locales | `git diff --stat`: 10 archivos modificados, 2723 inserciones, 131 borrados |

AVISO: `HEAD == origin/main` **no** implica árbol limpio; hay trabajo local sin
commitear que pertenece a fases anteriores y a la integración Stitch. PG-08F no
lo sobrescribe, no lo commitea y solo añade módulos y documentos nuevos, además
de la línea de integración en `scripts/check.sh` y el índice documental.

## SG-02 — Instrucciones y contratos

Leídos: `AGENTS.md` (raíz del repositorio y directorio superior), informes
finales PG-08D y PG-08E, índice `docs/informes/README.md`, documentos
`PG-08E/01…11`, `packages/core/src/egg-domain.ts`,
`packages/core/src/breeding-engine.ts`, `apps/server/src/shared-egg-store.ts`,
`scripts/pg08e-check.ts` y `scripts/check.sh`.

Contradicciones históricas detectadas y resueltas sin reescribir informes:

- `PG-08D/09-PROPUESTA-PG08E.md` proponía otra PG-08E; la autorización vigente
  la sustituyó. PG-08E lo documentó como documento histórico. No afecta PG-08F.
- Las fichas de ejemplo de Stitch muestran Gen II con 510 EV, incompatible con
  el stat exp real; Stitch **no** es autoridad de mecánicas. No se modifica el
  frontend ni el diseño.
- PG-08E dejó sin adoptar las políticas de asignación, capacidad y
  acumulación. PG-08F mantiene ese estado: el par 1+1 fija destinatarios por
  rol, pero no adopta reglas definitivas de reparto ni capacidad máxima.
- El contrato PG-08E permite **un huevo por ciclo** (`eggIdFor(ciclo, evento)`
  y `cycle_id UNIQUE`). PG-08F no puede reescribir esa garantía: añade un módulo
  de par que deriva un evento por destinatario, sin modificar el almacén ni los
  contratos protegidos. Queda documentado en `ARQUITECTURA.md`.

No se encontró contradicción que bloquee la implementación.

## SG-03 — Baseline de pruebas

Ejecutado `bun run check` antes de tocar nada: **EXIT 0**.

| Suite | Resultado |
|---|---:|
| PG-07H | 101/101 |
| PG-08A | 284/284 |
| PG-08B | 22/22 |
| PG-08C | 33/33 |
| PG-08D | 36/36 |
| PG-08E | 48/48 |
| **Total PG-08 (A–E)** | **423/423** |

Nota: el total 423 comunicado en el informe anterior corresponde solo a
PG-08A–E; PG-07H (101) se contabiliza aparte. Además pasaron motor,
día/noche, i18n, PG-07A…G, sidecar PKHeX y compilación .NET.

## SG-04 — Integridad

- `sha256sum -c /tmp/opencode/pg08a-protected-before.sha256`: **17/17 sumas
  coincidentes**, incluidos los siete `.srm` de `fixtures/`.
- `data/pokegotchi.db`:
  `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`
  (idéntico al histórico).
- Saves/exportaciones: 18 archivos entre `fixtures/` y `data/exports/`;
  ninguno modificado. No hay archivos PKM ni `*.pkN` en el repositorio.
- SQLite: existen `data/pokegotchi.db-wal` (0 bytes) y
  `data/pokegotchi.db-shm` (32768 bytes), **preexistentes**. No se borran ni
  se interpretan como residuo de PG-08F; PG-08F usa BD aisladas en
  `/tmp/opencode/pg08f-*`.
- No se conectó a ningún servicio, no se abrió el servidor web y no se
  manipularon inventarios.

## SG-05 — Decisión

**PASS WITH WARNINGS.** Las advertencias son: trabajo local sin commitear de
fases anteriores (debe conservarse), y la presencia de WAL/SHM preexistentes
junto a la BD protegida (sin efecto sobre la integridad verificada). No hay
fallos de pruebas, pérdida de datos, conflicto de contratos ni modificación
de archivos protegidos. Se autoriza a continuar PG-08F.
