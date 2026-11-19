# CHECKPOINT + SYNCGATE — PG-08G.3 — 2026-11-19

## Alcance y evidencia
- Repositorio remoto inspeccionado: `Developer-0134565/Pokeguarde` (GitHub).
- `main` remoto antes del checkpoint: `7c9c326be0eb4dced4969c5b0f966413d3299dae`.
- Rama aislada creada desde ese SHA: `checkpoint/pg08g3-cuestionario-20261119`.
- Documento cargado: `docs/informes/fases/PG-08/PG-08G3/CUESTIONARIO-75-RECUPERADO.md`.
- Commit documental: `8cf675d39b4ba6741b1206d3dfc1c7947e24bdac`.
- Verificación posterior por GitHub: 75 encabezados numerados, preguntas 70 y 75 presentes; blob SHA `daa1ce76e229b1515dcf616e7893291ed35cdd5d`.
- Total de preguntas originales en fuente: 76; pregunta 76 retirada. 447 alternativas localizadas para preguntas 1–76.
- Fuente del test: https://chatgpt.com/share/6aff6554-3420-83ed-8c49-d87bb6c2306f

## AGENTS y estructura remota
- `AGENTS.md` en raíz (blob `2e25a4334492b6f1cecc2adeea4737c424ab6436`): fuente de verdad, no implementar decisiones no escritas, no tocar saves reales, no declarar éxito sin pruebas.
- Árbol remoto de `main`: 142 entradas, sin truncar. Un `AGENTS.md` detectado; no se detectó `.github/` ni otros AGENTS.md en el árbol remoto.
- `package.json`, `scripts/check.sh`, `scripts/pet-check.ts`, `scripts/night-check.ts`, `scripts/i18n-check.ts`, `scripts/pg06-viewer-check.ts`, `scripts/pg07a-integration-check.ts` están presentes.
- `docs/informes/fases/PG-08/` del `main` remoto contiene PG-08A, pero no los informes locales PG-08G citados anteriormente. No confundir ausencia en remoto con ausencia local.

## Matriz SyncGate
| Puerta | Resultado | Motivo |
|---|---|---|
| Rama checkpoint creada sin alterar main | PASS | Rama nueva desde SHA verificado |
| Documento presente en GitHub | PASS | Relectura del blob y 75 títulos |
| Integridad de fuente de preguntas | PASS parcial | Enunciados y alternativas recuperados, respuestas libres y explicación posterior requieren cotejo |
| Corrección TRD-40 | PASS documental | Pregunta 68: E inicial → A final |
| Pregunta 70 | WARNING | Enunciado recuperado, respuesta explícita numerada 70 no identificada |
| Pregunta 2 | WARNING | Respuesta libre sobre desfallecimiento no corresponde directamente a >7 días offline |
| AGENTS remotos | PASS de inventario | Solo un AGENTS.md detectado en árbol remoto |
| AGENTS locales y agentes OpenCode/Codex | NOT CHECKED | Sin acceso al equipo Fedora |
| Git local: status, staged, divergencia, stash | NOT CHECKED | GitHub remoto no expone working tree local |
| BD local y hashes protegidos | NOT CHECKED | Datos locales inaccesibles |
| `bun run check` y sidecar | NOT RUN | No ejecutados en Fedora |
| Otros repositorios del usuario | INVENTARIADOS | GitHub conectado: LaGranImplosi-n, cosmic-strategy-hub, dfleyends, Shadow, Rimworld, RPGIdle, Pokeguarde; no se modificaron |
| Publicación en `main` | NOT DONE | No merge ni push a main |

## Pendientes prioritarios
1. Sol: ejecutar SyncGate local READ-ONLY en Fedora: `git status --short --branch`, `git rev-parse HEAD`, `git remote -v`, `git log -1`, `git diff --check`, estado de worktrees/stashes, inventario de AGENTS.md, configuración y permisos de agentes sin revelar secretos.
2. Confrontar árbol local y remoto; preservar las entradas preexistentes y los informes PG-08G locales.
3. Recuperar respuesta exacta a la pregunta 70 y resolver contradicción de pregunta 2 con trazabilidad de mensajes.
4. Reconciliar BR, INC, MED y TRD con `AGENTS.md` y contratos locales; no implementar aún.
5. Ejecutar `bun run check` en el equipo con las herramientas y fixtures reales, verificar hashes de BD y archivos protegidos sin modificar.
6. Tras resultados, decidir explícitamente si integrar esta rama en main. No sobrescribir trabajo local.

**Resultado general:** PASS para checkpoint documental remoto; BLOCKED para SyncGate integral y para implementación.
