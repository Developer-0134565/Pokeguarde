# 02 — Auditoría de la arquitectura real

**Misión:** PG-STITCH-01 · **Fase:** B · **Fecha:** 2026-11-19
**Alcance:** inspección estática de `/home/<usuario>/Proyectos/Pokeguarde`. No se iniciaron servicios, no se ejecutaron tests que escriban en el árbol de trabajo, no se abrió la base de datos.

## 1. Estado Git

| Concepto | Valor |
|---|---|
| HEAD inicial | `819b73b49a8aca76486173917d7abdb4518290ab` |
| Rama | `main` |
| Cambios rastreados | Ninguno |
| Entradas untracked | 34: `POKEGUARDE_STITCH_COMPLETE_2026-11-19.zip`, `STITCH_UPLOAD/…`, `docs/stitch/reference/…` |
| Hash del `git status --porcelain=v1 --untracked-files=all` inicial | `5764440642f084e5d417d0e3735a5a7f38c2763fd2eac97d2dab199e85830159` |

La verificación final se registra en `08_INFORME_EJECUTIVO.md`.

---

## 2. Mapa de rutas verificadas

**HECHO OBSERVADO — todas las rutas citadas existen.**

### Frontend (`apps/web/`)

| Ruta | Tamaño | Función |
|---|---|---|
| `index.html` | 2.010 B | Cabecera, panel de partidas, `#nursery`, `<dialog id="mon">`, carga de `/app.js` |
| `src/main.ts` | 19.278 B | Navegación, inventario, pestañas, modal, i18n, carga de saves |
| `src/nursery.ts` | 44.470 B | Guardería: render, cuidados, entrenamiento, exportación |
| `src/pet-engine.ts` | 21.183 B | Motor determinista puro (sin DOM ni relojes propios) |
| `src/i18n.ts` | 14.878 B | Diccionarios ES/EN y formateo |
| `src/sprite-render.ts` | 8.621 B | Funciones puras de sprites GBC y detección de frames por alfa |
| `src/sprite-runtime.ts` | 8.476 B | Catálogo, preferencias, caché y pintado de overworld |
| `src/sprite-viewer.ts` | 17.896 B | Visor de sprites PG-06 |
| `src/daynight.ts` | 1.809 B | Día/noche y fundido |
| `src/style.css` | 14.451 B | Estilos de la app |
| `viewer.html` | — | Visor de sprites |
| `assets/room/guarderia.png` | 160×144 RGBA | Fondo canónico |

### Backend y sidecar

| Ruta | Tamaño | Función |
|---|---|---|
| `apps/server/src/index.ts` | 32.472 B | Servidor Bun, API REST, archivos estáticos |
| `apps/server/src/db.ts` | 6.949 B | SQLite (`bun:sqlite`), esquema y migraciones |
| `apps/server/src/sidecar.ts` | 4.086 B | Cliente del sidecar .NET |
| `apps/server/src/sprites.ts` | 4.234 B | Catálogo y validación de sprites |
| `services/pkhex/Program.cs` | 39.322 B | PKHeX.Core: `inspect`, `scan`, `members`, `export` |
| `services/pkhex/pkhex.csproj` | — | PKHeX.Core 26.10.18, .NET 10 |

### Pruebas y utilidades

`scripts/check.sh`, `dev.sh`, `pet-check.ts`, `night-check.ts`, `i18n-check.ts`, `pg06-extract.sh`, `pg06-viewer-check.ts`, `pg06-viewer.ts`, `pg07a-integration-check.ts`, `spike.sh`, `import-stitch-references.ts`, `import-stitch-references.sh`.

### Documentación (todos existen)

`AGENTS.md`, `README.md`, `docs/STITCH_DESIGN_BRIEF.md`, `STITCH_IMPLEMENTATION_PLAN.md`, `SHARED_NURSERIES_SPEC.md`, `BREEDING_DESIGN_RFC.md`, `POKEMON_SECURITY_RFC.md`, `MONETIZATION_DESIGN_RFC.md`, `ROADMAP.md`, `PG07A_INTEGRATION_REPORT.md`, `PG-06_SPRITE_AUDIT_TASK.md`, `PG06_VIEWER_RESULTS.md`, `SPRITE_AUDIT.md`, `SPRITE_RENDERING_RFC.md`, `FASE-0.md`, `GUARDERIA.md`, `LEGALIDAD.md`, `FIXTURES.md`.

---

## 3. Aplicación web y navegación

**HECHO OBSERVADO:**
- `apps/web/index.html:10-21`: solo dos controles de navegación: `#nav-library` y `#nav-nursery`.
- `:23-41`: panel de saves y detalle; `:43`: sección `#nursery`; `:45-48`: `<dialog id="mon">`; `:50`: `<script type="module" src="/app.js">`.
- `main.ts:462-480`: `showLibrary()` / `showNursery(preferId?)` alternan `.layout` y `#nursery` y marcan el botón activo. **No hay enrutado por URL/hash, ni pestaña FICHA/DATOS, ni Equipo Activo como vista propia.**
- `main.ts:80-90`: `applyStaticI18n()` aplica `data-i18n`, `data-i18n-title` y `data-i18n-aria`.
- `main.ts:173-221`: `renderDetail()` con pestañas `party|boxes|bag|legality` (declaradas en :200-203).
- `main.ts:222-237`: `verdictOf`, `verdictLabel`, `VERDICT_CLASS` (legal / no verificable / ilegal).
- `main.ts:239-263`: `MonRef`, `refsOf`, `monCard` (incluye `data-loc`/`data-box`/`data-slot` para Gen 1/2).
- `main.ts:268-318`: `boxesView`, `bagView`, `legalityView`.
- `main.ts:319-343`: `bindMons` y `showMon` (modal de ficha).
- `main.ts:425-460`: subida y drag & drop de saves.

**Conclusión:** la navegación vigente es **Biblioteca / Guardería**, con detalle de partida por pestañas. La navegación objetivo de Stitch (GUARDERÍA, FICHA/DATOS, EQUIPO ACTIVO, BIBLIOTECA) no existe y sustituirla rompería el flujo actual; debe plantearse como capa aditiva (ver informe 06).

---

## 4. Motor Tamagotchi

**HECHO OBSERVADO (`pet-engine.ts`):**

| Símbolo | Línea | Función |
|---|---|---|
| `ENGINE_VERSION` | 12 | Versión del motor |
| `HOUR`, `DAY`, `MAX_CATCHUP_MS = 7*DAY` | 14-18 | Tiempo y tope de puesta al día |
| `STAT_KEYS`, `STAT_LABELS` | 23-25 | Seis stats |
| `traitsOf`, `natureMods`, `createState` | 117, 165, 174 | Rasgos, naturaleza y estado inicial |
| `advance` | 218 | Decaimiento, sueño, colapso y catch-up |
| `ActionId = feed\|play\|clean\|pet\|scold\|sleep\|wake` | 314 | Siete acciones |
| `ACTION_INFO` | 316-324 | Cooldowns: 15 min, 8 min, 20 min, 90 s, 4 min, 0, 0 |
| `applyAction` | 329 | Aplicación de cuidados |
| `TRAIN_GAMES` | 439-443 | Seis minijuegos, uno por stat |
| `TRAIN_COOLDOWN = 45_000` | 445 | 45 s entre sesiones |
| `capsFor` | 455-459 | Gen≥3: 255/stat y 510 total EV; Gen≤2: 65.535/stat, sin tope global, unidad `statexp` |
| `evTotals` | 461 | Totales |
| `train` | 482-557 | Concesión `round(2+6q)` EV o `round(250+750q)` stat exp (:504), moduladores (:507-509), límite legal (:511-514), rechazo por sueño/cansancio/hambre/enfriamiento (:491-499), `pendingEvs` (:535), puntos tope 9.999 (:542) |
| `moodOf`, `MOOD_LABEL`, `ageDays` | 565, 575, 588 | Ánimo y edad |

**HECHO OBSERVADO:** el motor es puro, sin DOM ni reloj propio; mismo resultado en servidor y navegador. i18n con 232 claves contadas.

---

## 5. Guardería y render

**HECHO OBSERVADO (`nursery.ts`):**

| Símbolo | Línea | Función |
|---|---|---|
| `Pet`, `ExportOutcome` | 38-69 | Tipos de mascota y resultado de exportación |
| Paleta GBC `C` | 75 | 4 colores |
| Fuente 3×5 `GLYPHS` | 87-115 | Tipografía del lienzo |
| Estado `pets`, `activeId`, `local` | 128-130 | Una sola mascota activa |
| `ROOM` | 154 | Zona caminable, sprite, punto de sueño, imagen nocturna |
| `nightMix` | 201-214 | Fundido día/noche |
| `AdoptIdentity`, `adoptPet` | 248-250 | Adopción por PID o ranura |
| `openNursery` | 266-285 | Carga, selección, render e inicio del bucle |
| `refreshPets` | 302-308 | `pets.find(p => p.active) ?? pets[0]`: **un único foco activo** |
| `paintShell` | 318-402 | `<canvas id="pg-canvas" width="160" height="144">` (:326), HUD (:328), controles (:329), lista (:338), selectores de render (:339-356), `#pg-sheet` |
| `exportBlock` | 427-492 | Dry-run, aplicado/retenido; botón de escritura solo si `e.dryRun && e.ok && e.applied.some(n > 0)` (:470) |
| `petSheet`, `paintControls` | 494-568 | Ficha rápida y 6 cuidados + 6 entrenamientos |
| `updateSheet` | 570-592 | Repinta y **reengancha listeners** (corrección de regresión previa) |
| `paintHud` | 599 | HUD HTML bajo el lienzo |
| `exportPreview`, `exportWrite` | 704, 728 | Simulación y escritura confirmada |
| Bucle RAF | 864-891 | Animación |
| `applyScale` | 895-915 | Escala entera, `imageRendering='pixelated'` (:912), ancho del HUD (:915) |
| `ROOM_OBJECTS = [BOWL]` | 1000 | Único objeto interactivo: cuenco |
| `drawRoom`, `drawPet` | 1007-1041, 1118 | Fondo + capa nocturna y mascota |

**HECHO OBSERVADO — ausencias:** no hay cacas en el motor ni en el render (solo aparecen en mockups y documentos de diseño). No hay campos `owner`, `user_id`, `permission`, `guest`, `visitante` en `apps/web/src` ni `apps/server/src`. No hay selección de dos mascotas simultáneas ni foco por mascota.

---

## 6. Render de sprites (PG-07A, ya implementado)

| Ruta | Detalle |
|---|---|
| `sprite-render.ts:11,27,42,55` | `GBC4`, `GBC16`, `paletteOf`, `frameRects` (mide alfa > 8 en 16 celdas; **no asume cuadrícula 4×4 sin inspección**) |
| `sprite-runtime.ts:17-42` | `RenderMode`, `SpriteEntry`, `PREF_KEY`, `FRAME_MS=280`, `IDLE_MS=700`, `MOTION_MS=220`, `TIER_OVERRIDES` 95→40 y 321→40 |
| `sprite-runtime.ts:99-220` | `resolveEntry`, `directionFromMotion`, `frameOf` (4×4), `tierFor`, `initOverworldSprites`, `getSheet` (valida 16 rects), `paintOverworld` (devuelve `null` en sleep/procedural) |
| `sprites.ts:9-20,37,47,54-59,68-120` | Directorio permitido bajo `/tmp/opencode/`, validación de nombre, `tierFor(height)` (≤0,4→16; <1→24; <2→40; else 64), catálogo |
| `index.ts:815-844` | `/api/sprites/catalog`, `/api/sprites/:name` |
| `index.ts:858-884` | Estáticos con rechazo de `..`, barras invertidas y rutas absolutas; mapa de módulos JS |

---

## 7. Backend y persistencia

**HECHO OBSERVADO (`apps/server/src/index.ts`):**

| Ruta API | Línea | Estado |
|---|---|---|
| `/api/health` | 405 | Implementada |
| `/api/saves` GET | 409 | Implementada |
| `/api/saves/import` POST | 414 | Implementada |
| `/api/saves/upload` POST | 428 | Implementada |
| `/api/saves/:sha` GET | 435 | Implementada |
| `/api/saves/:sha/reparse` POST | 442 | Implementada |
| `/api/saves/reparse` POST | 450 | Implementada |
| `/api/saves/:sha/pokemon` GET | 460 | Implementada; filtros `legal=true|false`, `q` |
| `/api/pets` POST | 486-559 | Implementada; rechaza `illegal` (:507), dedupe PID/ranura (:511-523), `first = listPets().length===0` (:529) |
| `/api/pets/:id` GET/DELETE | 561-580 | Implementada |
| `/api/pets/:id/action` POST | 582 | Implementada |
| `/api/pets/:id/train` POST | 606 | Implementada |
| `/api/pets/:id/export` POST | 634 | Implementada (dry-run por defecto) |
| `/api/pets/:id/exports`, `/api/exports` GET | 790, 796 | Implementadas |
| `/api/pets/:id/active` POST | 801 | Implementada |
| `/api/pets/games` GET | 811 | Implementada |

**AUSENCIAS (HECHO OBSERVADO):** no hay rutas de usuarios, directorio, solicitudes, permisos, guarderías compartidas, crianza, huevos, Guardipuntos ni tienda.

**HECHO OBSERVADO (`db.ts`):**
- `DATA_DIR`, `SAVES_DIR`, `EXPORTS_DIR` (:5-8); BD `data/pokegotchi.db` (:13; nombre conservado a propósito).
- Tablas `saves` (:19-41), `pokemon` (:43-68), `pets` (:75-91; `active INTEGER DEFAULT 0`, **sin columna `owner`**), `exports` (:97-118, 19 columnas con hashes e informe).
- Migraciones (:124-138): `unverified_count`, `verdict`, `issues_json`, `location`, `box_index`, `slot`.
- Acceso (:165-229): `getSaveBySha`, `getSaveById`, `getPetById`, `listPets`, `getExportById`, `listExports`.
- La BD tiene WAL (`data/pokegotchi.db-wal`, ~2,1 MB); **no se abrió** para evitar escrituras.

---

## 8. PKHeX.Core

**HECHO OBSERVADO (`services/pkhex/Program.cs`):**
- Comandos `inspect`, `scan`, `members`, `export`.
- `SaveUtil.GetSaveFile` (:78, :262); `Write()` modifica el búfer en sitio, por eso se usa copia clonada (:67, :258, :262, :277).
- `roundTripIdentical` (:280-286).
- Veredicto triple `VerdictOf`/`IsCosmetic`/`LegalityIssues` (:875-895): `unverified` cuando todas las incidencias son cosméticas.
- `ExportTargets` (:908); `VitaminClamp` (:1093) y aplicación en export (:400-410); revalidación (:389-410); `Write()` final (:463); `new LegalityAnalysis(pkm)` (:579, :709).
- `apps/server/src/sidecar.ts`: `inventory`, `inspect`, `exportPlan` (:122), `sidecarVersion` (:134); tipos `ExportReport`, `ExportChange`, `DiffSummary` (:55-91).

---

## 9. Pruebas, build y arranque

| Ítem | Estado observado |
|---|---|
| `package.json` | Solo scripts `dev` y `check` |
| `scripts/check.sh` | `pet-check.ts`, `night-check.ts`, `i18n-check.ts`, `pg07a-integration-check.ts`, `dotnet build services/pkhex -c Release -v q --nologo` |
| `pet-check.ts` | Determinismo, límites, sueño, cooldowns, EV |
| `night-check.ts` | Ventana 20:00-06:00 y fundido 1.200 ms |
| `i18n-check.ts` | >100 claves ES, clamping, claves literales, ASCII en cadenas del lienzo |
| `pg07a-integration-check.ts` | Catálogo y formas |
| `pg06-viewer-check.ts` | Existe, **no incluido** en `check.sh` |
| Ausencias | Sin tests HTTP, concurrencia, usuarios, permisos, export E2E automatizado ni migraciones |
| Ejecución en esta misión | **No se ejecutó** `bun run check`: el build de dotnet escribe en `services/pkhex/bin/obj`, prohibido por el modo READ-ONLY |

---

## 10. Componentes reutilizables (inventario para el plan)

| Componente | Rutas | Reutilizable para |
|---|---|---|
| Motor determinista | `pet-engine.ts` | PG-07B, PG-07C, PG-08, PG-09 (necesidades y EV reales) |
| Render GBC 160×144 + HUD | `nursery.ts` | PG-07B, PG-07C, PG-10 |
| Escalado entero y pixelación | `nursery.ts:895-915` | Todas las fases visuales |
| i18n (232 claves) | `i18n.ts` | Todas las fases |
| Catálogo de sprites PG-07A | `sprite-render.ts`, `sprite-runtime.ts`, `sprites.ts` | PG-07B/C, PG-10 |
| Ficha y veredictos | `main.ts:222-343` | PG-07C, PG-04 forense |
| Exportación con dry-run | `nursery.ts:427-492,704-760`; `sidecar.ts:122` | PG-07C, PG-09 |
| API de saves y PKHeX | `index.ts:405-477`; `Program.cs` | PG-07C, PG-09 |
| Esquema SQLite y migraciones | `db.ts` | PG-08, PG-09, PG-10 |
| Fondo canónico y día/noche | `guarderia.png`, `daynight.ts` | PG-07B, PG-10 |

---

## 11. Conclusión de la fase B

La aplicación es **funcional y coherente** para las fases 0-5 y PG-07A: ingestión, legalidad triple, guardería local de una mascota activa, entrenamiento con EV reales y exportación verificada. La arquitectura es pequeña, sin frameworks UI y sin dependencias externas en producción. Todo lo que Stitch muestra como multijugador, crianza, economía y navegación social **no existe en código**: son diseños. La separación entre motor puro, render y API permite implementar las nuevas fases de forma incremental sin reescribir lo existente.
