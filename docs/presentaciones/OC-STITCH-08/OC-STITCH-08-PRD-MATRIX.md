# OC-STITCH-08 — Matriz de conformidad PRD (Fase I)

**Estado:** VERIFICADO (validador ejecutado sin modificar) / PENDIENTE de interpretación funcional donde se indica.
**Fecha:** 2026-11-20. **Ámbito:** solo lectura de datos protegidos; sin commits, pushes ni cambios en motores, BD, fixtures, ROMs, saves o `apps/server/src/index.ts`.

## 1. Entradas canónicas y ejecución literal

| Elemento | Ruta original | SHA-256 | Uso |
|---|---|---|---|
| Validador | `/tmp/opencode/stitch06-refs/prd-validator.txt` | `9a8a76ffd2d7bfb7ca318c1622bc689c702d3035458d83734cc33efb82c2b989` | Copia byte-idéntica a `/tmp/opencode/oc-stitch-08-validator/verify-prd-conformance.ts`; **no se modificó**. |
| PRD | `/tmp/opencode/stitch06-refs/prd-master.json` | `3601b9a6d0f8cc4a78a9d3bba059f65f136c6697a57c4ffaab00b99acf0bcb9f` | Copia byte-idéntica a `/tmp/opencode/oc-stitch-08-validator/prd-canonical.json`; parámetro explícito, sin usar fallback incrustado. |

Comando ejecutado en entorno aislado (`env -i HOME PATH`):

```bash
env -i HOME="$HOME" PATH="$PATH" bun \
  /tmp/opencode/oc-stitch-08-validator/verify-prd-conformance.ts \
  /tmp/opencode/oc-stitch-08-validator/prd-canonical.json \
  > evidencias/prd-validador.stdout.txt \
  2> evidencias/prd-validador.stderr.txt
# exit=1 → evidencias/prd-validador.exit.txt
```

Salida literal (stdout): `5/6 Suites superadas (40 aserciones evaluadas)`, `ESTADO GLOBAL DE CONFORMIDAD: NO CONFORME`. Salida literal (stderr): los dos fallos reproducidos más abajo. **No se alteró el validador ni el PRD para forzar PASS.** Evidencia: `evidencias/prd-validador.stdout.txt`, `evidencias/prd-validador.stderr.txt`, `evidencias/prd-validador.exit.txt` y `evidencias/prd-validador-entorno.json`.

> El validador solo audita **el documento PRD**, no la implementación. Un `PASS` no demuestra fidelidad visual ni funcionamiento; por eso esta matriz separa cinco dimensiones y conserva el resultado literal.

## 2. Dimensiones clasificadas por separado

### 2.1 Documental — coherencia del PRD y del validador

| Suite del validador | Aserciones | Resultado literal | Requisito PRD cubierto | Interpretación |
|---|---:|---|---|---|
| 01. Metadatos y licenciamiento | 5 | PASS | `project_id`, versión `2.4.x`, licencia DMCA Safe Harbor, `zero_rom_policy.enforced`, sin binarios comerciales | VERIFICADO en documento. No implica auditoría de licencias de recursos (PG-IP-01 sigue vigente). |
| 02. Design System / LCD | 7 | PASS | `Pocket Tech 1999`, 160×144, 10:9, `pixelated`, escalados 2x/4x, Space Mono + Space Grotesk | VERIFICADO en documento; la materialización se clasifica en dimensión visual. |
| 03. Arquitectura runtime | 5 | PASS | Bun, puerto 8787, `127.0.0.1`, SQLite WAL, autoridad PKHeX.Core | VERIFICADO en documento; la implantación se clasifica en dimensión estructural. |
| 04. Dominios funcionales RF-01…RF-05 | 10 | **FAIL** | 5 dominios, RF-01.1, RF-01.2, RF-01.4, RF-02.2, RF-03.1 | FAIL literal por dos aserciones; detalle below. No es evidencia de incumplimiento de la app. |
| 05. NFR y accesibilidad | 6 | PASS | 59.97 FPS, ≤2 ms, objetivo ≥44 px, `prefers_reduced_motion`, air-gapped, zero cloud | VERIFICADO en documento; cumplimiento real en dimensión accesibilidad. |
| 06. Matriz FSM y rollback | 7 | PASS | 5 estados `0x01`–`0x05`, auto-rollback en desconexión | VERIFICADO en documento; la emulación no se implementa en esta misión. |

**Fallos literales (stderr, sin reinterpretar):**

```
      └─ [FAIL] RF-01.1 debe exigir Guardería Bi-Plaza (2/2 Pokémon)
      └─ [FAIL] RF-01.4 debe incluir Crianza Biológica y eclosión Phione
```

Diagnóstico documental: el validador exige las cadenas literales `"2/2 Pokémon"` y `"Phione"` dentro de `specs`; el PRD dice «Capacidad máxima de 2 especímenes simultáneos…» y «Generación simétrica de 2 huevos…», con «Phione» solo en `title`. Clasificación: **desalineación entre aserción y documento**, no fallo de implementación. Misma conclusión y mismos dos fallos que `../OC-STITCH-07/OC-STITCH-07-VALIDATOR-AUDIT.md` (sin alterar el validador).

### 2.2 Estructural — coexistencia de PRD, pantallas y componentes

| Elemento | PRD / requisito | Pantallas Stitch | Componente local | Evidencia | Estado |
|---|---|---|---|---|---|
| Inventario y clasificación | cobertura de las 5 áreas del producto | 89 elementos; 64 pantallas web mapeadas → 58 páginas lógicas y 58 rutas | `OC-STITCH-08-FULL-INVENTORY.json`, `OC-STITCH-08-ROUTE-MAP.json` | `OC-STITCH-08-CONTROL-GATE.json` (7/7 condiciones, `ok:true`) | VERIFICADO |
| Dominio 01 núcleo/guardería (`01_CORE_NURSERY`) | RF-01.1–01.5 | Guardería `27103c1c…`, Homepage `44464441…` | `HomeView` (`app/views.ts`), `NurseryView` (`nursery.ts`), motor (`pet-engine.ts`) | `../OC-STITCH-07/evidencias/guarderia-dom-metrics.json`, `route-regression.json` | VERIFICADO (rutas y render); funciones protegidas sin cambios |
| Dominio 02 biblioteca/forense (`02_LIBRARY_FORENSICS`) | RF-02.1–02.4 | Biblioteca, Cajas, Ficha, Forense | `.layout`, `#detail`, `#sheet`, workbench `createCoreWorkbench` | `../OC-STITCH-07/evidencias/route-regression.json`, `command-bus-regression.json` | VERIFICADO (navegación); Time Capsule/emulación no implementada |
| Dominio 03 emulación (`03_PG_EMULATION`) | RF-03.1–03.2 | 18 páginas UI_PROTOTYPE | `createEmulationWorkbench` en bundle `assets/pg08/workbenches.js` | `OC-STITCH-08-ROUTE-MAP.json` | VERIFICADO como maqueta; **PENDIENTE** de motor real |
| Dominio 04 creación (`04_CREATOR_SUITE`) | RF-04.1–04.3 | 10 theme + 3 creator_shell + 3 habitat | `createCreatorWorkbench`, `pages/contract.ts` (`pageFrame`, `moduleRail`) | `OC-STITCH-08-ROUTE-MAP.json`, `../OC-STITCH-07/evidencias/stitch-screens-inventory.json` | VERIFICADO como maqueta navegable |
| Dominio 05 marketing (`05_MARKETING_STUDIO`) | RF-05.1 | 14 páginas | `createMarketingWorkbench` | `OC-STITCH-08-ROUTE-MAP.json` | VERIFICADO como maqueta navegable |
| Runtime local | suite 03 del validador | — | servidor Bun en `127.0.0.1:8787`, SQLite, sidecar .NET | `GET /api/health` → `{"ok":true,"service":"pokeguarde","sidecar":"PKHeX.Core","dotnet":"10.0.404"}` comprobado en esta misión | VERIFICADO |
| Hoja de estilos base de páginas | CSS compartido `pg-*` | todas las páginas de workbench | `apps/web/src/pages/pages.css` | El bundle servido `assets/pg08/workbenches.css` no incluye esas reglas; `/pages.css` devuelve 404 | **BLOQUEADO / incidencia**: corrección de origen aplicada en Fase K, pero no efectiva en el bundle; se replicó en `shell.css` solo para objetivos táctiles |

### 2.3 Funcional — comportamiento observable

| Requisito / rasgo | Pantalla o ruta | Componente | Prueba / observación | Evidencia | Estado |
|---|---|---|---|---|---|
| Homepage y navegación canónica | `#/home`, raíz | `renderHome`, `shell.ts` | En navegador real: raíz y `#/home` renderizan la misma home; 4 enlaces de cabecera visibles | `../OC-STITCH-07/evidencias/route-regression.json`; comprobación propia Fase K | VERIFICADO |
| Guardería 2/2 y seis constantes | `#/guarderia` | `nursery.ts`, `pet-engine.ts` | Motor determinista: `bun run check` EXIT 0 según contexto de la misión (no reejecutado por este subagente) | `../OC-STITCH-07/evidencias/check-final.txt`, `guarderia-dom-metrics.json` | VERIFICADO en regresión previa |
| Biblioteca, cajas, ficha, exportación | `#/biblioteca`, `#/ficha` | servidor + sidecar + UI legada | Sin cambios en esta misión; contrato protegido | `../OC-STITCH-07/evidencias/integrity-check.json`, `CONTROL-GATE.json` | VERIFICADO (sin regresión); no reauditoría funcional nueva |
| Quick Switcher y command bus | overlay global | `switcher.ts` | Dos opciones para «guard», navegación con flechas y Enter a `#/tienda`, diálogo cerrado | `../OC-STITCH-07/evidencias/command-bus-regression.json` | VERIFICADO |
| 58 rutas integradas | todas las de `ROUTE-MAP.json` | `router.ts`, `registry.ts`, `workbenches.js` | Repaso en navegador realizado por la sesión orquestadora; este subagente comprobó `/`, `#/home`, `#/guarderia`, `#/crianza` | `OC-STITCH-08-ROUTE-MAP.json`, `OC-STITCH-08-CONTROL-GATE.json` | VERIFICADO (según evidencia de misión); reauditoría exhaustiva no repetida aquí |
| Estados de página | 58 rutas | `catalog.ts`, `contract.ts` | 5 OPERATIONAL, 1 PARTIAL, 52 UI_PROTOTYPE | `OC-STITCH-08-ROUTE-MAP.json` (`totals.byState`) | VERIFICADO; las 52 maquetas no ejecutan acciones reales |
| Emulación, Cable Link, FPS y latencia | dominio 03 | solo UI prototipo | Sin motor, sin medición de 8192 Hz ni de 59.97 FPS | `../OC-STITCH-07/OC-STITCH-07-PRD-COVERAGE.json` | **PENDIENTE / fuera de alcance**; no se simulated datos |
| FSM `0x01`–`0x05` | documento | sin implementación nueva | Suite 06 PASS sobre el PRD; sin ensayo de desconexión real | `evidencias/prd-validador.stdout.txt` | VERIFICADO documental; **PENDIENTE** funcional |

### 2.4 Visual — fidelidad y sistema de diseño

| Requisito | Referencia Stitch | Implementación | Comparación / evidencia | Estado |
|---|---|---|---|---|
| Cabecera, badges y Homepage «Pocket Tech 1999» | `44464441f20242b0aec53f914e564835` | `views.ts`, `shell.css` | `../OC-STITCH-07/evidencias/diff-home.png`, `visual-comparison.json`, `home-local.png` | VERIFICADO con ajustes documentados en OC-STITCH-07 |
| Guardería GBC y LCD 160×144 (10:9, nearest-neighbor) | `27103c1c412643f189472faa33166698` | Canvas en `nursery.ts`, escala entera | `../OC-STITCH-07/evidencias/guarderia-dom-metrics.json`, `viewport-regression.json` (6 viewports, sin overflow-X), `diff-guarderia.png` | VERIFICADO |
| Quick Switcher 1120 px y estética de carcasa | `81a27d39785945579beba5fb3feecb0c` | `switcher.ts`, `shell.css` | `../OC-STITCH-07/evidencias/switcher-dom-metrics.json`, `diff-switcher.png` | VERIFICADO |
| Tokens y tipografías del PRD | `design-system.json` | `theme/tokens.css`, `shell.css`, `pages.css` | `../OC-STITCH-07/OC-STITCH-07-VISUAL-MATRIX.md` señala tokens ausentes en la comparación | VERIFICADO parcial; **PENDIENTE** de consolidación de tokens |
| Cambios de color de esta misión (Fase K) | referencia roja original `#d93636` | rojo accesible `#c92f2f` en superficies con texto claro; `#b92828` en el degradado superior de la consola; `#ff5a5f` sobre raíl oscuro | `OC-STITCH-08-ACCESSIBILITY.md`, `OC-STITCH-08-AXE-AFTER.json` | VERIFICADO; ligero cambio cromático deliberado para cumplir 4.5:1 |

### 2.5 Accesibilidad — WCAG 2.1 AA

| Requisito PRD / WCAG | Antes (axe 4.12.1) | Después (axe 4.12.1) | Estado |
|---|---|---|---|
| `aria-allowed-role` (4.1.2) — `article[role=link]` ×5 | 5 nodes minor | 5 nodes minor | **BLOQUEADO por ámbito**: la etiqueta está en `apps/web/src/app/views.ts`, fuera de edición permitida |
| `color-contrast` (1.4.3, ≥4.5:1) | 7 nodes serious | 0 nodes | **VERIFICADO / corregido** en `apps/web/src/app/shell.css` |
| `landmark-one-main` (1.3.1) | 1 node moderate | 1 node moderate | **BLOQUEADO por ámbito**: exige `<main>` o `role="main"` en `index.html`/`shell.ts`, fuera de edición permitida |
| Objetivo táctil ≥44 px (PRD) | 12 controles por debajo de 44 px | 0 controles visibles por debajo de 44 px en `/` y `#/crianza` | VERIFICADO / corregido |
| Foco visible (2.4.7), teclado (2.1.1), diálogos, movimiento reducido, doble codificación | — | Comprobaciones DOM reales | VERIFICADO / detalle en `OC-STITCH-08-ACCESSIBILITY.md` |

Evidencia: `OC-STITCH-08-AXE-BEFORE.json`, `OC-STITCH-08-AXE-AFTER.json`, `evidencias/manual-a11y-checks.json`, `../OC-STITCH-07/evidencias/a11y-home.json`.

## 3. Matriz de trazación de aserciones

| ID | Aserción del validador / requisito | Pantalla(s) | Componente | Test / comprobación | Evidencia | Dimensión | Estado |
|---|---|---|---|---|---|---|---|
| A-01 | `project_id`, versión, licencia, Zero-ROM (suite 01, 5) | Homepage, Brief | PRD, políticas PG-IP-01/02 | validador + integridad | `prd-validador.stdout.txt`, `../OC-STITCH-07/evidencias/integrity-check.json` | documental | VERIFICADO |
| A-02 | 160×144, 10:9, `pixelated`, tipografías (suite 02, 7) | Guardería, Homepage | Canvas + `shell.css` | suite 02 + 6 viewports | `prd-validador.stdout.txt`, `viewport-regression.json` | documental / visual | VERIFICADO (documento y render) |
| A-03 | Bun, 8787, loopback, SQLite WAL, PKHeX (suite 03, 5) | — | servidor + sidecar | suite 03 + `/api/health` real | `prd-validador.stdout.txt`, `CONTROL-GATE.json` | documental / estructural | VERIFICADO |
| A-04 | Cinco dominios y RF-01.1/01.2/01.4/02.2/03.1 (suite 04, 10) | Guardería, Biblioteca, Ficha, Emulación | 58 rutas + workbenches | suite 04 + rutas | `prd-validador.stderr.txt`, `ROUTE-MAP.json` | documental / funcional | FAIL documental por dos literales; funcionalidad parcial verificada por separado |
| A-05 | 44 px, reduced-motion, air-gapped (suite 05, 6) | Homepage, Switcher, páginas | CSS + backend local | axe antes/después + comprobación DOM | `AXE-BEFORE.json`, `AXE-AFTER.json`, `manual-a11y-checks.json` | documental / accesibilidad | documento PASS; app con 2 infracciones pendientes fuera de ámbito |
| A-06 | FSM y auto-rollback (suite 06, 7) | — | documento PRD | suite 06 | `prd-validador.stdout.txt` | documental | VERIFICADO documental; PENDIENTE funcional |
| T-01 | Inventario 89 / rutas 58 sin duplicados | todas | catálogo + router | puerta de control 7/7 | `CONTROL-GATE.json`, `FULL-INVENTORY.json` | estructural | VERIFICADO |
| T-02 | Navegación y command bus | Home, Guardería, Switcher | `views.ts`, `switcher.ts` | eventos reales de teclado | `route-regression.json`, `command-bus-regression.json` | funcional | VERIFICADO |
| V-01 | Comparación programática con referencias | Home, Guardería, Switcher | CSS de shell | diff de capturas | `diff-home.png`, `diff-guarderia.png`, `diff-switcher.png`, `visual-comparison.json` | visual | VERIFICADO |
| AC-01 | Sin solo color como indicador de estado (PRD `dual_state_coding`) | Biblioteca, Guardería, páginas | badges y textos `OPERATIVO / PARCIAL / PROTOTIPO / BLOQUEADO`, `aria-current` | inspección de DOM y CSS | `ROUTE-MAP.json`, `pages/contract.ts`, `AXE-AFTER.json` | accesibilidad / visual | VERIFICADO por texto explícito; `aria-current="page"` complementa el color |

## 4. Límites de esta clasificación

- **VERIFICADO** solo significa que existe ejecución o medición local citada; no equivale a certificación legal ni de licencias.
- **PENDIENTE DE COMPROBAR**: funcionamiento de emulación/serial, FPS y latencia del PRD, auditoría visual individual de las 58 rutas y todos los estados de maqueta.
- **BLOQUEADO**: las dos infracciones axe que requieren editar archivos fuera del ámbito autorizado; la hoja `pages.css` no se sirve en el bundle actual.
- No se ejecutó `bun run check` en esta misión por instrucción expresa; se citan los resultados de la misión orquestadora y de OC-STITCH-07 como evidencia preexistente.
