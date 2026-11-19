# PG-08G.2 — SyncGate (19-nov-2026)

**Resultado: PASS WITH WARNINGS.** Auditoría previa a cualquier escritura
documental de esta misión. No se ejecutaron `fetch`, `pull`, `merge`, `rebase`,
`reset --hard`, `clean`, `stash`, `commit` ni `push`.

## 1. Estado Git

| Comprobación | Resultado |
|---|---|
| Rama | `main` |
| HEAD local | `7c9c326be0eb4dced4969c5b0f966413d3299dae` |
| `origin/main` | `7c9c326be0eb4dced4969c5b0f966413d3299dae` |
| Divergencia `HEAD...origin/main` | `0 0` |
| Upstream | `origin/main` |
| Conflictos (`git ls-files -u`) | vacío |
| Índice (`git diff --cached --stat`) | vacío |
| Entradas de `git status --short` | **46** (10 modificadas + 36 sin seguimiento) |

Coincide exactamente con el estado registrado al cierre de PG-08G.1: mismas 46
entradas, ningún archivo nuevo ni borrado respecto de esa referencia. Se
conservan íntegras, incluidas las de Stitch (`STITCH_UPLOAD/`,
`POKEGUARDE_STITCH_COMPLETE_2026-11-19.zip`, `docs/stitch/reference/`) y las de
PG-08B…G.1.

**Diferencia respecto de PG-08G.1:** ninguna. HEAD, upstream, divergencia y
recuento de entradas son idénticos.

## 2. Baseline de pruebas

`bun run check` → **EXIT 0** (log completo en
`/tmp/opencode/pg08g2-check-syncgate.log`).

| Suite | Resultado |
|---|---:|
| PG-07G | 69/69 |
| PG-07H | 101/101 |
| PG-08A | 284/284 |
| PG-08B | 22/22 |
| PG-08C | 33/33 |
| PG-08D | 36/36 |
| PG-08E | 48/48 |
| PG-08F | 50/50 |
| **Total PG-08 (A–F)** | **473/473** |

Sin regresiones respecto de la referencia histórica (473/473). También pasaron
motor de la guardería, día/noche, i18n, PG-07A…G y la compilación del sidecar.

## 3. Integridad

- 17 hashes protegidos (`/tmp/opencode/pg08a-protected-before.sha256`):
  **17/17 coincidentes**, sin discrepancias. Incluye `apps/server/src/db.ts`,
  `apps/server/src/index.ts`, `apps/web/src/pet-engine.ts`,
  `apps/web/src/sprite-runtime.ts`, `apps/web/src/sprite-render.ts`,
  `apps/web/assets/room/guarderia.png`, `services/pkhex/pkhex.csproj`,
  `services/pkhex/Program.cs`, `fixtures/FIXTURES.md` y los siete `.srm`.
- `data/pokegotchi.db`:
  `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`
  — idéntico a la referencia.
- WAL/SHM preexistentes junto a la BD: `pokegotchi.db-wal` 0 bytes,
  `pokegotchi.db-shm` 32768 bytes (mtime 18:04, sin cambios de contenido
  atribuibles a esta misión). No se borran.
- `data/saves/` y `data/exports/`: sin cambios; mtimes de 18-nov.

## 4. PKHeX.Core

`services/pkhex/pkhex.csproj` sigue fijando **PKHeX.Core 26.10.18**, `net10.0`.
No se recompiló ni se ejecutó el sidecar en esta fase. La auditoría de
`PKHEX-AUDIT.md` (PG-08G.1) se mantiene vigente por no haber cambiado la
referencia.

## 5. Advertencias (no bloqueantes)

1. Trabajo local sin commitear de PG-07/08 y Stitch: **46 entradas**. Esta
   misión no lo toca, no lo commitea y no lo limpia.
2. WAL/SHM preexistentes junto a la base de datos protegida.
3. Las decisiones D4/D8/D9 de esta misión **no** coinciden con las etiquetas
   D4/D8/D9 de PG-08A (ver `DECISIONES-D4-D8-D9.md` §0). Es una discrepancia
   documental preexistente, no un conflicto de código.

## 6. Decisión

**PASS WITH WARNINGS.** Sin fallos críticos: pruebas en verde, hashes intactos,
BD intacta, sin conflictos ni divergencia remota. Se autoriza continuar con la
investigación y la especificación contractual de PG-08G.2, manteniendo el
carácter READ-ONLY sobre producción.
