# OC-SYNC-09 — SyncGate inicial

Fecha de verificación: 20-nov-2026. Todo lo aquí registrado se obtuvo en ejecución real, antes de cualquier modificación.

## 1. Repositorio

| Dato | Valor |
|---|---|
| Raíz | `/home/missingn0/Proyectos/Pokeguarde` |
| Rama activa | `main` |
| HEAD local (inicial) | `b8cacb340088ad096b952e9196d6c16e0354e10b` |
| Asunto HEAD | `docs(stitch): add visual reference designs (deduplicated)` |
| Remoto `origin` (fetch/push) | `https://github.com/Developer-0134565/Pokeguarde.git` |

`git fetch origin` ejecutado sin alterar el árbol de trabajo:

| Dato | Valor |
|---|---|
| HEAD local tras fetch | `b8cacb340088ad096b952e9196d6c16e0354e10b` |
| `origin/main` tras fetch | `b8cacb340088ad096b952e9196d6c16e0354e10b` |
| Divergencia `HEAD...origin/main` | `0 0` (ahead 0, behind 0) |

No había avance remoto que analizar.

## 2. Estado del árbol

`git status --porcelain=v1 -uall`: 1166 líneas, de las cuales 18 son archivos rastreados modificados/borrados y el resto entradas `??` (la mayoría capturas y mapas diff de la Fase J de OC-STITCH-08, además de documentación y prototipos de misiones anteriores).

`git diff --cached --stat`: vacío. No había nada preparado.

Archivos rastreados modificados/borrados:

| Archivo | Δ | Procedencia |
|---|---|---|
| `.gitignore` | +4 | Otra misión |
| `AGENTS.md` | +74 | Otra misión |
| `apps/server/src/index.ts` | +25 | Otra misión (NO incluir) |
| `apps/server/src/sprites.ts` | +40 −6 | Otra misión |
| `apps/web/index.html` | +16 −2 | **OC-STITCH-08** (shell y landmark) |
| `apps/web/src/i18n.ts` | +2 | Otra misión |
| `apps/web/src/main.ts` | +74 −7 | **OC-STITCH-08** (adaptadores y bootShell) |
| `apps/web/src/nursery.ts` | +11 | Otra misión |
| `docs/LEGALIDAD.md` | −76 | Otra misión (borrado) |
| `docs/informes/README.md` | +19 | Otra misión |
| `docs/informes/pruebas/PG-07G/hashes.json` | +1 −1 | Otra misión |
| `scripts/check.sh` | +8 | Otra misión |
| `scripts/pg07a-integration-check.ts` | +7 −1 | Otra misión |
| `scripts/pg07c-check.ts` | +3 −1 | Otra misión |
| `scripts/pg07d-check.ts` | +3 −1 | Otra misión |
| `scripts/pg07e-check.ts` | +3 −1 | Otra misión |
| `scripts/pg07h-check.ts` | +3 −1 | Otra misión |
| `scripts/pg08e-check.ts` | +21 −2 | Otra misión |

Los diffs completos de `apps/web/index.html` y `apps/web/src/main.ts` se revisaron: contienen exclusivamente el shell, el landmark `<main id="pg-main">`, el switcher, los adaptadores `syncRoute`/`hideShellViews` y `bootShell`. Son dependencias autorizadas de OC-STITCH-08/05.

## 3. Hashes de datos protegidos (verificados antes de cualquier cambio)

| Archivo | SHA-256 | Resultado |
|---|---|---|
| `data/pokegotchi.db` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` | Idéntico a línea base |
| `apps/server/src/index.ts` | `6db1a5aa58178dda531a9f172a24a8526702d7ca53099da5110fe5c7139c14f7` | Idéntico a línea base |

Los siete fixtures se verifican por separado en `OC-SYNC-09-INTEGRITY.md`. Los archivos bajo `docs/ROMS/` están sin seguimiento y **no** se incluirán en ningún commit.

Nota: `apps/server/src/index.ts` aparece modificado en el diff rastreado, pero su contenido actual es byte-idéntico al hash protegido; esos +25 líneas son cambios preexistentes de otra misión, no de OC-STITCH-08. No se tocará ni se actualizará `/tmp/opencode/pg07b-protected-before.sha256`.

## 4. Fuentes documentales consultadas

- `docs/presentaciones/OC-STITCH-07/OC-STITCH-07-INFORME.md` y su `VALIDACION.json`.
- `docs/presentaciones/OC-STITCH-08/OC-STITCH-08-INFORME.md`, `OC-STITCH-08-COVERAGE.md` y `OC-STITCH-08-MODIFIED-FILES.md`.
- `docs/presentaciones/OC-STITCH-08/OC-STITCH-08-ROUTE-MAP.json` (58 rutas).
- `docs/presentaciones/OC-STITCH-08/visual/visual-comparison.json`, `VISUAL-COVERAGE.md` y `responsive-diagnostics.json`.
- `docs/presentaciones/OC-STITCH-08/OC-STITCH-08-PRD-MATRIX.md`.
- `docs/presentaciones/OC-STITCH-08/OC-STITCH-08-REGRESSION.json`.
- `docs/presentaciones/MISIONES.json` (19 entradas; una sola para OC-STITCH-08).

## 5. Procesos simultáneos

`ps` mostró procesos preexistentes ajenos a esta misión: servidor Bun de Pokeguarde en `:8787`, visor `pg06-viewer.ts` en `:8790`, servidores del prototipo `pg-ip-03`, y el writer local `/tmp/opencode/oc-stitch-08/writer.py` en `:8901`. Ninguno escribe sobre los archivos candidatos a commit. No se detuvo ni reinició ninguno.

## 6. Decisión del gate

**SYNCGATE PASS.** No hay divergencia remota, no hay cambios preparados, los datos protegidos están intactos y la procedencia de los archivos de OC-STITCH-08 está identificada en `OC-STITCH-08-MODIFIED-FILES.md`. Se continúa con auditoría y correcciones antes de preparar commits. No se ejecutaron `reset --hard`, `clean`, `rebase`, `merge`, `stash`, `pull --rebase` ni push.
