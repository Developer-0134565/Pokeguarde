# OC-SYNC-09 — Fase 5: regresión ejecutada (TASTRA ASTRA)

**Fecha:** 20-nov-2026 · **Resultado:** **22/22 comandos EXIT 0 · 0 FAIL**.
**Navegador:** `agent-browser`, sesión propia `sync09astra-957274a7fcad`, cerrada al terminar.
**Servidor:** Bun preexistente en `http://127.0.0.1:8787`; no se inició ni se detuvo.

Este documento es nuevo. No se modificó código fuente, tests, BD, fixtures, ROMs,
saves ni motores. No se hicieron commits ni pushes. Los logs crudos están en
`/tmp/opencode/oc-sync-09/logs/` y el raw estructurado en
`docs/presentaciones/OC-SYNC-09/test-results.json`.

## 1. VERIFICADO — comandos y códigos de salida

| # | Comando | Exit | Última línea / resumen |
|---:|---|---:|---|
| 00 | `bun run check` | 0 | `Todo correcto.` |
| 01 | `bun run scripts/pet-check.ts` | 0 | `Motor OK: todas las comprobaciones pasan` |
| 02 | `bun run scripts/night-check.ts` | 0 | `Día/noche OK: todas las comprobaciones pasan.` |
| 03 | `bun run scripts/i18n-check.ts` | 0 | `Traducciones OK: todas las comprobaciones pasan.` |
| 04 | `bun run scripts/stitch05-check.ts` | 0 | `OC-STITCH-05: todas las comprobaciones correctas.` |
| 05 | `bun run scripts/ov-gen12-check.ts` | 0 | `OV-GEN12 check: 23 comprobaciones correctas.` |
| 06 | `bun run scripts/pg06-viewer-check.ts` | 0 | `PG-06 viewer-check: 36 comprobaciones correctas.` |
| 07 | `bun run scripts/pg07a-integration-check.ts` | 0 | `PG-07A integration-check: 54 comprobaciones correctas.` |
| 08 | `bun run scripts/pg07b-check.ts` | 0 | `PG-07B OK: todas las comprobaciones pasan.` |
| 09 | `bun run scripts/pg07c-check.ts` | 0 | `PG-07C OK: todas las comprobaciones pasan.` |
| 10 | `bun run scripts/pg07d-check.ts` | 0 | `PG-07D OK: todas las comprobaciones pasan.` |
| 11 | `bun run scripts/pg07e-check.ts` | 0 | `PG-07E OK: todas las comprobaciones pasan.` |
| 12 | `bun run scripts/pg07f-check.ts` | 0 | `PG-07F OK: 132 comprobaciones correctas.` |
| 13 | `bun run scripts/pg07g-check.ts` | 0 | `PG-07G: 69/69 comprobaciones correctas.` |
| 14 | `bun run scripts/pg07h-check.ts` | 0 | `PG-07H: 101/101 comprobaciones correctas.` |
| 15 | `bun run scripts/pg08a-check.ts` | 0 | `PG-08A: 284/284 comprobaciones correctas.` |
| 16 | `bun run scripts/pg08b-check.ts` | 0 | `PG-08B: 22/22 comprobaciones correctas.` |
| 17 | `bun run scripts/pg08c-check.ts` | 0 | `PG-08C: 33/33 comprobaciones correctas.` |
| 18 | `bun run scripts/pg08d-check.ts` | 0 | `PG-08D — 36 casos correctos, 0 fallidos.` |
| 19 | `bun run scripts/pg08e-check.ts` | 0 | `PG-08E — 48 casos correctos, 0 fallidos.` |
| 20 | `bun run scripts/pg08f-check.ts` | 0 | `PG-08F — 50 casos correctos, 0 fallidos.` |
| 21 | `bun run scripts/pg08g3-check.ts` | 0 | `pg08g3-check: 28/28 OK` |

Detalles del bloque `bun run check` (mismo log, líneas 57-829): motor, día/noche,
i18n, PG-07A (54), OV-GEN12 (23), PG-07B, PG-07C, PG-07D, PG-07E, compilación
del sidecar .NET, PG-07F (132), PG-07G (69), PG-07H (101), PG-08A (284), PG-08B
(22), PG-08C (33), PG-08D (36), PG-08E (48), PG-08F (50) y OC-STITCH-05.
No se registraron avisos/errores del compilador en el log (modo `-v q`).

`stitch05-check.ts` cubre registry, router, Command Bus y store de la capa
Stitch; es el test de router/Command Bus existente. La Guardería y el responsive
se verificaron además en navegador, sección 3.

## 2. VERIFICADO — 20 ciclos Home ↔ Guardería (re-ejecutados)

Se inyectó la sonda de solo instrumentación reutilizada de
`/tmp/opencode/stitch08l/probe.js` (envuelve `requestAnimationFrame`,
`addEventListener` y `removeEventListener`; no cambia la lógica de la app) y se
recorrieron 20 ciclos `#/home` → `#/guarderia` → `#/home`, con **41 muestreos**
(antes + 2 por ciclo). Resultado crudo: `/tmp/opencode/oc-sync-09/cycles-result.json`.

| Métrica | Resultado |
|---|---|
| Ciclos completados | 20/20 |
| Muestreos | 41 |
| `requestAnimationFrame` callbacks vivos (máx.) | **1** |
| Callback duplicado | **false** en los 41 muestreos |
| Nodos DOM | 191 antes del primer montaje → 371 tras él → **371** en los 40 muestreos restantes |
| Listeners conectados (tras inyección) | 0 antes del primer montaje → 27 tras él → **27** en los 40 muestreos restantes |
| Canvas | `width=160`, `height=144` en todos los muestreos con Guardería visible |
| `imageSmoothingEnabled` | `false` en todos esos muestreos |
| `image-rendering` CSS | `pixelated` |
| HUD | existe, es hermano del canvas y no lo contiene |
| Errores de página / mensajes de consola nuevos | **0 / 0** (`errors --json`, `console --json` antes y después) |

**Matización de evidencia:** en esta re-ejecución la sonda se inyectó con la
página ya cargada, por lo que no pudo contar los listeners registrados antes de
la inyección (de ahí el 0 inicial y el total estable de 27). El recuento
absoluto histórico 25 → 52 → 52 de OC-STITCH-08 se **reutiliza**, no se
re-verifica en esta misión. Lo que sí se re-ejecutó íntegramente es: los 20
ciclos, la unicidad del bucle rAF, la estabilidad de nodos/listeners después
del primer montaje, las dimensiones y pixelación del canvas, la posición del HUD
y la ausencia de errores de consola.

## 3. VERIFICADO — responsive re-medido

A **390×844** en `#/guarderia`: `innerWidth=390`,
`document.documentElement.scrollWidth=390` (**overflow X = 0**), canvas lógico
160×144 escalado a **320×288 CSS**, `image-rendering: pixelated`,
`imageSmoothingEnabled=false`, y `#pg-hud` de 320 px, fuera del canvas.
No se re-ejecutaron los 6 viewports completos de OC-STITCH-08; esa cobertura
(0/58 rutas con overflow en 1920×1080, 1366×768, 1024×768, 768×1024, 390×844 y
360×800) se reutiliza de `OC-STITCH-08-REGRESSION.json`, verificación 6.

## 4. Evidencia reutilizada de OC-STITCH-08 (no re-ejecutada por esta misión)

- `docs/presentaciones/OC-STITCH-08/OC-STITCH-08-REGRESSION.json` — 16/16 PASS.
- `docs/presentaciones/OC-STITCH-08/evidencias/OC-STITCH-08-L-ROUTES.json` — 58 rutas.
- `docs/presentaciones/OC-STITCH-08/evidencias/OC-STITCH-08-L-LINKS.json` — 79 enlaces.
- `docs/presentaciones/OC-STITCH-08/evidencias/OC-STITCH-08-L-CYCLES.json` — 20 ciclos históricos.
- `docs/presentaciones/OC-STITCH-08/evidencias/overflow-*.json` — 6 viewports.

No se repitieron el barrido de 58 rutas, las 79 activaciones de enlaces, el
Command Bus Ctrl+K, el historial atrás/adelante ni la recarga de hash directo:
sus resultados históricos se mantienen como evidencia de OC-STITCH-08, no como
verificación nueva de OC-SYNC-09.

## 5. NO EJECUTADO

| Comando / herramienta | Motivo |
|---|---|
| `bash scripts/dev.sh` | Inicia el servidor; el servidor ya estaba activo y estaba prohibido iniciarlo/detenerlo. |
| `bash scripts/spike.sh` | Spike del sidecar, no suite de regresión. |
| `bash scripts/pg06-extract.sh` | Extrae recursos de ROMs; extracción/copia de ROMs prohibida. |
| `bash scripts/import-stitch-references.sh` | Copia referencias al repositorio; no es test. |
| `bun run scripts/pg07g-reanalyze.ts` | Herramienta con capacidad de escritura (`--apply`), no suite de verificación. |
| `bun run scripts/pg07h-apply.ts` | Ejecutor con `--execute` capaz de escribir en producción; su modo `verify-only` sí se ejerció desde `pg07h-check`. |
| `bun run scripts/pg06-viewer.ts` | Visor/servidor auxiliar; no se iniciaron servidores nuevos. |
| `python3 scripts/pg_doc_01_generator.py` y afines | Generadores de documentación, no suites de tests. |
| `python3 scripts/oc_stitch07_visual_compare.py` / `oc_stitch08_visual_compare.py` | Comparadores visuales dependientes de capturas previas; cobertura visual reutilizada y responsive re-medido en vivo. |
| `bun prototypes/pg-ip-02/check.ts`, `pg-ip-03/check.ts`, `pg-ip-04/check.ts`, `pg-ip-04/check-gen2.ts` | Fuera de `scripts/` y ajenos a router/Command Bus/Guardería/responsive; no autorizados con ROMs/fixtures en esta misión. |

No se modificó ningún test para forzar PASS. No se usó `pkill -f`.
