# OC-STITCH-08 — FASE L: regresión integral

**Fecha:** 20-nov-2026 · **Resultado final:** **16/16 verificaciones PASS · 0 FAIL · 20/20 ciclos PASS** (L-01 cerrada y verificada tras regenerar el bundle con `pages.css`)

Regresión de la app integrada (58 rutas Stitch + 4 rutas legacy) sobre el servidor Bun
preexistente en `http://127.0.0.1:8787`, sin iniciarlo ni detenerlo. Navegación con
`agent-browser` en sesión propia (`stitch08l-957274a7fcad`). No se han tocado BD,
fixtures, ROMs, saves, motores ni código fuente; solo se han creado estos documentos
y los volcados/capturas de `evidencias/`.

## Resumen ejecutivo

| # | Verificación | Estado | Métrica clave |
|---:|---|---|---|
| 1 | Rutas registradas (58 + 4 legacy) | PASS | 58/58 alcanzables; las 4 legacy ya están en el catálogo |
| 2 | Enlaces internos | PASS | 79 activaciones, 0 destinos inválidos (0 `<a href>`; navegación por botones/`role=link`) |
| 3 | Renderizado de páginas | PASS | 58/58 con vista visible y contenido; barrido final 0 anomalías |
| 4 | Rutas huérfanas | PASS | 0 huérfanas; 58 en Command Bus, 13 en cabecera |
| 5 | Errores de consola | PASS | 0 errores de página, 0 mensajes de consola |
| 6 | Overflow horizontal en 6 viewports | **PASS** (tras corrección) | 0 rutas con overflow en los 6 viewports |
| 7 | Navegación con teclado | PASS | Tab/Enter/ArrowDown/Escape verificados con eventos reales |
| 8 | Command Bus Ctrl+K | PASS | 7 dominios localizados; 58 destinos con consulta vacía |
| 9 | Historial atrás/adelante | PASS | 4/4 pasos restauran hash, store y vista |
| 10 | Recarga de hash directo | PASS | F5 en `#/studio/theme/colors` renderiza correctamente |
| 11 | Responsive | PASS | Guardería 2× (320×288) a 390×844, HUD alineado, 0 overflow |
| 12 | Estado UI store | PASS | `notice`/`query` propagados; `localStorage` vacío; BD intacta |
| 13 | Un único bucle rAF | PASS | 0→1 callback, sin duplicados en 41 muestreos |
| 14 | Canvas 160×144 pixel-perfect | PASS | `width=160`, `height=144`, `imageSmoothingEnabled=false` |
| 15 | HUD fuera del canvas | PASS | `#pg-hud` hermano del canvas, mismo ancho CSS |
| 16 | Datos protegidos | PASS | BD y 7 fixtures con SHA-256 idéntico antes/después |

**20 ciclos Home↔Guardería: PASS.** Nodos y listeners conectados estables tras el primer
montaje: DOM 190 → 370 → 370; listeners 25 → 52 → 52; rAF máximo 1, sin callbacks duplicados.
Los 41 puntos de muestreo están en `evidencias/OC-STITCH-08-L-CYCLES.json`.

## Incidencia L-01 (CERRADA Y VERIFICADA, verificación 6)

**Overflow horizontal en viewports móviles/tablet.** El bundle servido
`/assets/pg08/workbenches.css` incluye `core.css`, `creator.css`, `marketing.css` y
`emulation.css`, pero **no incluye `pages.css`**. Por ello las reglas
`.pg-outline__chips { display:flex; flex-wrap:wrap }` y
`.pg-outline__chip { font-size:9px; overflow-wrap:anywhere }` no están activas: los chips
de texto extraído de Stitch se renderizan como `span` inline de 14 px sin ajuste.

Mediciones (58 rutas por viewport):

| Viewport | Rutas con overflow | Máximo | Peor caso |
|---|---:|---:|---|
| 1920×1080 | 0 | 0 px | — |
| 1366×768 | 0 | 0 px | — |
| 1024×768 | 0 | 0 px | — |
| 768×1024 | 1 | +241 px | `/emulation/rooms/03` |
| 390×844 | 12 | +613 px | `/emulation/rooms/03` |
| 360×800 | 21 | +643 px | `/emulation/rooms/03` |

Comprobación en navegador a 360 px: `chipStyle.display = "inline"`,
`font-size = 14px`, `overflow-wrap = normal`, `parentStyle.display = "block"`,
`document.documentElement.scrollWidth = 1003` con `innerWidth = 360`.

**Sugerencia de corrección (no aplicada):** incluir las reglas base de
`apps/web/src/pages/pages.css` en el bundle servido, o servir `pages.css` como ruta
propia y enlazarlo en `index.html`; repetir los 6 viewports. No se modificó código.

Rutas afectadas: `/crianza`, `/perfil`, `/jugadores`, `/tienda`, `/forensics`,
`/studio/theme/spacing`, `/studio/theme/components`, `/studio/theme/layout`,
`/studio/theme/preview`, `/studio/theme/tokens`, `/studio/shell`,
`/studio/shell/export`, `/studio/shell/preview`, `/studio/habitat`,
`/studio/habitat/devices`, `/studio/habitat/library`,
`/studio/marketing/localization`, `/studio/marketing/assets`,
`/studio/marketing/calendar`, `/studio/marketing/community`,
`/emulation/rooms/03`.

## Notas sobre el criterio

- Las 4 rutas legacy están incluidas en las 58 del catálogo; no hay 62 rutas únicas.
- No existen `<a href>` internos: los enlaces son botones con `data-route`, tarjetas
  `role="link"` y los `rail` de los workbenches. Se activaron 79 y todas apuntan a
  rutas registradas.
- `/ficha` no usa `h1`/`h2`/`h3`, pero renderiza texto y controles: se contabiliza
  como PASS por renderizado, no por presencia de encabezado.
- El cierre del Command Bus con Escape actualiza el store mediante el evento
  `close` del `<dialog>`, que llega de forma asíncrona; verificado tras un tick.

## Evidencias

- `OC-STITCH-08-REGRESSION.json` — resultados estructurados de las 16 verificaciones.
- `evidencias/OC-STITCH-08-L-ROUTES.json` — auditoría de las 58 rutas y enlaces.
- `evidencias/OC-STITCH-08-L-LINKS.json` — 79 activaciones de enlaces internos.
- `evidencias/OC-STITCH-08-L-FINAL-SWEEP.json` — barrido final sin anomalías.
- `evidencias/OC-STITCH-08-L-CYCLES.json` — 20 ciclos y 41 muestreos.
- `evidencias/overflow-*.json` — medición por viewport (6 archivos).
- `evidencias/OC-STITCH-08-L-OVERFLOW-EMULATION-ROOMS-03-360.png` — captura del fallo.
- `evidencias/OC-STITCH-08-L-GUARDERIA-DESKTOP.png` — Guardería a 1366×768.
- `evidencias/OC-STITCH-08-L-HASHES-BEFORE.txt` / `-AFTER.txt` — hashes protegidos.

## Estado de datos protegidos

`data/pokegotchi.db` = `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`
antes y después. Los 7 archivos `fixtures/*.srm` y `fixtures/FIXTURES.md` también
coinciden suma a suma. Sin commits, pushes ni cambios en ficheros rastreados.

### Cierre de L-01

Se añadió el import de `pages.css` al entry aislado del bundle y se regeneraron `workbenches.js`/`workbenches.css` (20.378 B). Nueva medición reproducible: **0/58 rutas con overflow** en 1920×1080, 1366×768, 1024×768, 768×1024, 390×844 y 360×800. La verificación 6 pasa a PASS y el resumen queda en 16/16.
