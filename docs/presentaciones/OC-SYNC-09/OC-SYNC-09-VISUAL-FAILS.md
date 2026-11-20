# OC-SYNC-09 — Fases 3.1 y 3.2: VISUAL_FAIL y REVIEW_REQUIRED

Misión: **OC-SYNC-09 (Tarra Terra)**. Fecha: 20-nov-2026. Ámbito: **solo lectura**. No se han modificado capturas, mapas diff, JSON de Fase J, frontend, BD, fixtures, ROMs, saves ni motores. No se han ejecutado commits ni pushes.

> El modelo que ejecuta esta misión **no acepta entrada de imágenes**. No se ha realizado revisión visual de las 348 capturas ni de los 348 mapas diff. Todo lo afirmado aquí es programático (JSON, DOM medido y documentación preexistente).

## 0. Evidencias de partida (hashes verificados)

| Archivo | SHA-256 |
|---|---|
| `docs/presentaciones/OC-STITCH-08/visual/visual-comparison.json` | `134582ac8e51b030981e8cf12b921d7d13c32daccad1cb6e34505dcc1f1e2e0d` |
| `docs/presentaciones/OC-STITCH-08/visual/responsive-diagnostics.json` | `d7b2a91b878edbabd0b9c07ffd627eec2a7375a44cd7d9c1f0de85c708c0aed4` |
| `docs/presentaciones/OC-STITCH-08/OC-STITCH-08-REGRESSION.json` | `c3421e660eb211bc8a7b6fe5a0e6dabe205786a2d8baa3783cd26bde9afe6130` |

`visual-comparison.json` declara 58 páginas, 348 comprobaciones, 58 referencias disponibles, 0 `REFERENCE_MISSING` y el reparto `VISUAL_PASS 27 / VISUAL_WARNING 4 / VISUAL_FAIL 12 / REVIEW_REQUIRED 15`. `independentVisualReview` = `PENDIENTE DE COMPROBAR (modelo sin entrada de imágenes)`.

## 1. Regla que produce un VISUAL_FAIL

Fuente: `scripts/oc_stitch08_visual_compare.py`, líneas 503-514 y 547-552.

1. Se marca `hard` si falta navegación, captura o PNG local; si el render está vacío/casi vacío (`textLen < 40`), hay errores JS o falta el host; o si `overflowX > 0.05 * ancho`.
2. Cualquier `hard` convierte la página en `VISUAL_FAIL`, con prioridad sobre `REVIEW_REQUIRED`, `VISUAL_WARNING` y `VISUAL_PASS`.
3. `overflowX = document.documentElement.scrollWidth − document.documentElement.clientWidth` (líneas 485-486). No es una métrica de píxeles ni de tokens.

**VERIFICADO:** los 12 `VISUAL_FAIL` tienen una única razón `hard`: desbordamiento horizontal. En sus 72 comprobaciones por resolución no hay navegación fallida, captura ausente, host ausente, `errorCount > 0` ni `textLen < 40` (rango observado: 1460-2460). Ninguno fue marcado por píxel, SSIM, histograma o coincidencia de tokens.

## 2. Fase 3.1 — las 12 páginas VISUAL_FAIL

Orden de resoluciones en las columnas: `1920x1080 / 1366x768 / 1024x768 / 768x1024 / 390x844 / 360x800`. Los valores son `overflowX` en píxeles, extraídos del JSON real. `tok` es `tokenMatchRate` (— = evidencia de tokens insuficiente; **no** es la causa del FAIL).

| Ruta | Slug | Referencia Stitch (ID / tamaño PNG) | overflowX por resolución | tok | Causa programática (DOM) |
|---|---|---|---|---|---|
| `/crianza` | `crianza` | `e390b05b3c2d…` / 2560×3652 | `0/0/0/0/17/47` | 1.0 | `.pg-outline__chip` «nest_cam_wired_standCRIANZA & HUEVOS» (right 407, ancho 395) y «storefrontINVENTARIO & TIENDA» (right 390, ancho 378) |
| `/perfil` | `perfil` | `757ca63c6623…` / 2560×4158 | `0/0/0/0/17/47` | 1.0 | Los mismos dos chips de `/crianza` |
| `/jugadores` | `jugadores` | `25d1b91e4ab5…` / 2560×2318 | `0/0/0/0/143/173` | 1.0 | Chip «backpackInventario & Tienda» (right 533, ancho 521); a 360 px también «inventory_2Biblioteca» (right 382) |
| `/tienda` | `tienda` | `ba30ae2e5685…` / 2560×3272 | `0/0/0/0/17/47` | 1.0 | Los mismos dos chips de `/crianza` |
| `/forensics` | `forensics` | `bd45903df0cb…` / 2560×2916 | `0/0/0/0/260/290` | 1.0 | Cuatro chips: «▼BIBLIOTECA[03]» (right 432), «◀TIENDA[04]» (533), «Guardería» (608) y «Ficha / Datos» (right 650, ancho 638) |
| `/studio/shell` | `studio-shell` | `fa47a8c2c6ec…` / 2560×2408 | `0/0/0/0/17/47` | — | Chip «play_arrowTEST RUN» (right 407, ancho 395) |
| `/studio/shell/export` | `studio-shell-export` | `60f8b75cee31…` / 2560×2232 | `0/0/0/0/17/47` | 1.0 | Chip «play_arrowTEST RUN» |
| `/studio/shell/preview` | `studio-shell-preview` | `b62752700f89…` / 2560×3404 | `0/0/0/0/17/47` | — | Chip «play_arrowTEST RUN» |
| `/studio/habitat` | `studio-habitat` | `ad7dddf3c06b…` / 1396×1117 | `0/0/0/0/218/248` | 1.0 | Chips «play_arrowPREVIEW» (right 449) y «file_downloadEXPORT» (right 608) |
| `/studio/habitat/devices` | `studio-habitat-devices` | `670ec1e65735…` / 1396×1117 | `0/0/0/0/17/47` | — | Chip «play_arrowTEST RUN» |
| `/studio/habitat/library` | `studio-habitat-library` | `1c4e250da1d7…` / 2560×3256 | `0/0/0/0/218/248` | 1.0 | Chips «play_arrowPREVIEW» y «file_downloadEXPORT» |
| `/emulation/rooms/03` | `emulation-rooms-03` | `193db1ef6251…` / 2560×5306 | `0/0/0/241/613/643` | 1.0 | A 768 px: «devicesChasis» (824), «drawEditor» (908), «paletteBrand Kit» (right 1009, ancho 991). A 390/360 px: nueve chips, entre ellos «inventory_2Cajas», «backpackMochila», «forestBiomas» y «devicesChasis» |

Las referencias completas están en `/tmp/opencode/oc-stitch-08/screens/<slug>.png`; la ruta exacta de cada PNG y el `stitchId` completo figuran en `visual-comparison.json`. Los 34 casos de desbordamiento medidos por el sondeo de Fase J están en `responsive-diagnostics.json`; **todos** los ofensores localizados son `SPAN.pg-outline__chip`.

### 2.1 Clasificación con evidencia

**VERIFICADO — en el estado capturado fue un fallo real de implementación, no una limitación del comparador.** El comparador aplicó correctamente su regla determinista: midió `scrollWidth > clientWidth` y localizó elementos reales que sobresalían. La causa raíz está documentada en `docs/presentaciones/OC-STITCH-08/OC-STITCH-08-REGRESSION.md`, incidencia **L-01**: el bundle `/assets/pg08/workbenches.css` servido en aquel momento incluía `core.css`, `creator.css`, `marketing.css` y `emulation.css`, pero **no `pages.css`**. Sin esas reglas, `.pg-outline__chips` no era `flex`/`flex-wrap` y `.pg-outline__chip` se renderizaba como `span` inline de 14 px sin `overflow-wrap:anywhere`. La comprobación en navegador registró `chipStyle.display = "inline"`, `font-size = 14px`, `overflow-wrap = normal`, `parentStyle.display = "block"` y `scrollWidth = 1003` con `innerWidth = 360`.

**VERIFICADO — el fallo ya no es reproducible en el estado actual.** El cierre de L-01 añadió el `import` de `pages.css` al entry aislado (`/tmp/opencode/oc-stitch-08/bundle-entry.ts`) y regeneró `workbenches.js`/`workbenches.css`. La verificación 6 de `OC-STITCH-08-REGRESSION.json` está en `PASS` con **0/58 rutas con overflow en las seis resoluciones**; su lista `affectedRoutes` incluye las 12 rutas de esta tabla. La remedición posterior a L-01 está en `/tmp/opencode/oc-stitch-08/overflow-*.json`: los seis archivos registran `overflowCount: 0`. **Los volcados `docs/presentaciones/OC-STITCH-08/evidencias/overflow-*.json` son la medición anterior al arreglo** (p. ej., a 360×800 conservan `maxOverflow: 643`) y no deben citarse como prueba de la corrección; el informe de regresión los enumera como evidencia de la incidencia original. En comprobación de solo lectura de esta misión, `GET /assets/pg08/workbenches.css` devolvió 200 y 20654 bytes con SHA-256 `3c738dd8c5f3ed89d150086db45ce9adc9c945188cfd8f467df0db6dad669344`, idéntico al fichero en disco y con las reglas `.pg-outline__chips`/`.pg-outline__chip` presentes.

**PENDIENTE DE COMPROBAR — por qué el DOM de la Fase J conservaba el CSS antiguo.** El manifiesto de captura registra para el bundle el SHA-256 `e308e39aca50785f6ecb67fa81fce23ad13259be34b7d346f9241ee97e2eb440`, que coincide con el `workbenches.js` actual, mientras que sus mediciones DOM siguen mostrando los overflow previos a L-01. No se ha podido determinar en esta misión de solo lectura si la sesión de navegador `stitch08j-957274a7fcad` conservó CSS en caché, si las mediciones se tomaron antes de la regeneración y el manifiesto se reescribió después, o si intervino otro factor de temporización. No se ha reejecutado el comparador ni se han alterado sus entradas.

**Consecuencia:** los 12 `VISUAL_FAIL` se conservan como registro literal de Fase J. **No se recalifican a PASS** sin una recaptura; tampoco se modifica ninguna pantalla correcta para mejorar métricas. La corrección de-estilo correspondiente ya fue ejecutada y verificada en Fase L, fuera del alcance de esta misión.

## 3. Fase 3.2 — las 15 páginas REVIEW_REQUIRED se mantienen

Fuente: el mismo `visual-comparison.json`. Las 15 cumplen que (a) no hay ninguna razón `hard`, (b) existe al menos una razón de evidencia insuficiente y (c) `independentVisualReview` sigue siendo `PENDIENTE DE COMPROBAR`. Por tanto **no se convierten en aprobadas** por la ausencia de errores automáticos.

| Ruta | Slug | Motivo de revisión | overflow menor adicional |
|---|---|---|---|
| `/home` | `home` | Referencia variante estrecha (1396 px); `tokenMatchRate` 0.5385 | — |
| `/guarderia` | `guarderia` | Ningún token del catálogo aparece en el HTML de referencia | — |
| `/biblioteca` | `biblioteca` | Ningún token aparece en el HTML **y** referencia estrecha (1396 px) | — |
| `/biblioteca/equipo` | `biblioteca-equipo` | Ningún token aparece en el HTML de referencia | — |
| `/ficha` | `ficha` | Ningún token aparece en el HTML **y** referencia estrecha (1396 px) | — |
| `/studio/theme/spacing` | `studio-theme-spacing` | Ningún token aparece en el HTML de referencia | 13 px a 360×800 |
| `/studio/theme/components` | `studio-theme-components` | Ningún token aparece en el HTML de referencia | 5 px a 360×800 |
| `/studio/theme/layout` | `studio-theme-layout` | Ningún token aparece en el HTML de referencia | 5 px a 360×800 |
| `/studio/theme/preview` | `studio-theme-preview` | Ningún token aparece en el HTML de referencia | 5 px a 360×800 |
| `/studio/marketing` | `studio-marketing` | Referencia variante estrecha (1396 px); `tokenMatchRate` 1.0 | — |
| `/studio/marketing/localization` | `studio-marketing-localization` | Ningún token aparece en el HTML de referencia | 13 px a 360×800 |
| `/studio/marketing/calendar` | `studio-marketing-calendar` | Ningún token aparece en el HTML de referencia | 13 px a 360×800 |
| `/emulation/rooms/01` | `emulation-rooms-01` | Ningún token aparece en el HTML de referencia | — |
| `/emulation/rooms/05` | `emulation-rooms-05` | Ningún token aparece en el HTML de referencia | — |
| `/emulation/battle` | `emulation-battle` | Ningún token aparece en el HTML de referencia | — |

Desglose verificado: **2** solo por referencia estrecha, **11** solo por ausencia de tokens en el HTML de referencia y **2** por ambas causas (`/biblioteca`, `/ficha`). Seis de las 15 arrastran además un overflow «menor» (5 o 13 px) que, según la regla del comparador (línea 556), es `soft` y no sustituye al motivo de revisión. Las 15 referencias existen (`htmlEvidence: true`, 0 `REFERENCE_MISSING`), pero eso no aporta criterio visual humano.

## 4. Límites

- **VERIFICADO:** enumeración, causas y clasificación según los JSON y documentos citados.
- **PENDIENTE DE COMPROBAR:** fidelidad visual real de las 58 páginas; efecto visual de los cambios de Fase L en las capturas de Fase J (requiere recaptura); causa exacta del DOM desactualizado en la sesión `stitch08j`.
- **NO REALIZADO:** inspección visual de capturas (modelo sin entrada de imágenes), edición de pantallas, reclasificación de estados en `visual-comparison.json` y nuevas mediciones de navegador.
