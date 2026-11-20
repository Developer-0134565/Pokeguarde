# OC-STITCH-08 — Cobertura visual (Fase J)

Generado: 2026-11-20T20:23:00+00:00.

## Metodología

Normalización de la PNG completa de Stitch al ancho de cada resolución con recorte superior del viewport; métricas exploratorias de píxel sobre una muestra proporcional <=360 px; tokens del HTML de referencia contrastados con el DOM local; comprobaciones deterministas de render/overflow. Sin revisión visual humana.

Se navega por las 58 rutas del catálogo con `agent-browser` en una sesión propia
(`stitch08j-957274a7fcad`), en las resoluciones 1920×1080, 1366×768, 1024×768, 768×1024, 390×844, 360×800.
El servidor preexistente no se inicia ni se detiene; solo se consumen `/api/health` y
el bundle `/assets/pg08/workbenches.js`.

## Métricas separadas

1. **Píxel (exploratoria):** MAE, RMSE, PSNR, intersección de histogramas,
   proporción de píxeles cambiados y SSIM global sobre una muestra proporcional ≤360 px.
   La referencia se escala al ancho de la resolución y se recorta al alto del viewport.
2. **Tokens (exploratoria):** coincidencia entre los tokens del catálogo que SÍ aparecen
   en el HTML de Stitch y el DOM local. Si ningún token aparece en el HTML se reporta
   evidencia insuficiente, no un 0. No mide posición ni estilo.
3. **Geometría/render (determinista):** presencia del host, longitud de texto, marcadores,
   errores de página, botones/encabezados y desbordamiento horizontal/vertical.

## Reglas de resultado (por página)

- `REFERENCE_MISSING`: falta la PNG de referencia.
- `VISUAL_FAIL`: fallo determinista (sin captura, render vacío/casi vacío, error JS
  o desbordamiento horizontal >5%).
- `VISUAL_WARNING`: aviso objetivo (overflow menor, tokens <0.50 o divergencia métrica extrema).
- `REVIEW_REQUIRED`: la evidencia es insuficiente o ambigua (referencia variante de ancho
  estrecho o ningún token del catálogo respaldado por el HTML) y hace falta criterio humano.
- `VISUAL_PASS`: solo pasaron las comprobaciones programáticas. **No** certifica fidelidad visual.

## Archivos protegidos

Esta misión no editó frontend, BD, saves ni ROMs. El estado se compara con la línea base
del `CONTROL_GATE` de la misión:
- Coinciden: 4.
- Difieren: 1 (`apps/web/src/main.ts`).
- Si hay diferencias, proceden de cambios concurrentes ajenos a esta fase J (el bundle se
  sirve desde un servidor preexistente); no se han revertido ni sobrescrito.

## Resultados

- Páginas: **58**; comprobaciones por resolución: **348**.
- Referencias disponibles: **58**; faltaron: **0**.
- Mapas de diferencia: **348**.

| Resultado | Páginas |
|---|---:|
| VISUAL_PASS | 27 |
| VISUAL_WARNING | 4 |
| VISUAL_FAIL | 12 |
| REFERENCE_MISSING | 0 |
| REVIEW_REQUIRED | 15 |

## Limitación obligatoria

**La revisión visual independiente queda PENDIENTE DE COMPROBAR.** El modelo que ejecuta
esta misión no acepta entrada de imágenes: ha medido píxeles y tokens y ha verificado el DOM,
pero no ha **visto** las capturas. Los histogramas y SSIM no acreditan fidelidad total,
especialmente cuando la referencia tiene 2560 px de ancho y el viewport local es distinto.
Las capturas y los mapas `diff-*.png` se entregan para que una persona o un modelo con
entrada de imágenes complete la revisión.

## Detalle por página

| Ruta | Estado | Resultado | Tokens | SSIM 1920×1080 | Motivo principal |
|---|---|---:|---:|---:|---|
| `/home` | OPERATIONAL | REVIEW_REQUIRED | 0.5385 | 0.0099 | 1920x1080: referencia es variante estrecha (1396px) |
| `/guarderia` | OPERATIONAL | REVIEW_REQUIRED | — | 0.032 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/biblioteca` | OPERATIONAL | REVIEW_REQUIRED | — | 0.0332 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/biblioteca/equipo` | OPERATIONAL | REVIEW_REQUIRED | — | 0.0339 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/ficha` | OPERATIONAL | REVIEW_REQUIRED | — | 0.2783 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/crianza` | UI_PROTOTYPE | VISUAL_FAIL | 1.0 | 0.0287 | 360x800: desbordamiento horizontal 47px |
| `/perfil` | UI_PROTOTYPE | VISUAL_FAIL | 1.0 | 0.0188 | 360x800: desbordamiento horizontal 47px |
| `/jugadores` | UI_PROTOTYPE | VISUAL_FAIL | 1.0 | 0.0365 | 390x844: desbordamiento horizontal 143px |
| `/tienda` | UI_PROTOTYPE | VISUAL_FAIL | 1.0 | 0.0155 | 360x800: desbordamiento horizontal 47px |
| `/forensics` | PARTIAL | VISUAL_FAIL | 1.0 | 0.016 | 390x844: desbordamiento horizontal 260px |
| `/studio/theme` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0496 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/theme/colors` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0196 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/theme/typography` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | -0.0511 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/theme/spacing` | UI_PROTOTYPE | REVIEW_REQUIRED | — | -0.015 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/studio/theme/components` | UI_PROTOTYPE | REVIEW_REQUIRED | — | -0.0171 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/studio/theme/layout` | UI_PROTOTYPE | REVIEW_REQUIRED | — | -0.0225 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/studio/theme/preview` | UI_PROTOTYPE | REVIEW_REQUIRED | — | -0.0602 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/studio/theme/tokens` | UI_PROTOTYPE | VISUAL_WARNING | 1.0 | -0.0356 | 360x800: desbordamiento horizontal menor 5px |
| `/studio/theme/designmd` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0196 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/theme/tripanel` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | -0.0463 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/shell` | UI_PROTOTYPE | VISUAL_FAIL | — | -0.038 | 360x800: desbordamiento horizontal 47px |
| `/studio/shell/export` | UI_PROTOTYPE | VISUAL_FAIL | 1.0 | 0.213 | 360x800: desbordamiento horizontal 47px |
| `/studio/shell/preview` | UI_PROTOTYPE | VISUAL_FAIL | — | -0.0143 | 360x800: desbordamiento horizontal 47px |
| `/studio/habitat` | UI_PROTOTYPE | VISUAL_FAIL | 1.0 | 0.1731 | 390x844: desbordamiento horizontal 218px |
| `/studio/habitat/devices` | UI_PROTOTYPE | VISUAL_FAIL | — | -0.0933 | 360x800: desbordamiento horizontal 47px |
| `/studio/habitat/library` | UI_PROTOTYPE | VISUAL_FAIL | 1.0 | 0.135 | 390x844: desbordamiento horizontal 218px |
| `/studio/marketing` | UI_PROTOTYPE | REVIEW_REQUIRED | 1.0 | -0.0414 | 1920x1080: referencia es variante estrecha (1396px) |
| `/studio/marketing/brand` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0101 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/marketing/social` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | -0.0098 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/marketing/creative` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0567 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/marketing/press` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.1168 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/marketing/roadmap` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0179 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/marketing/campaigns` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0163 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/marketing/copy` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0149 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/marketing/localization` | UI_PROTOTYPE | REVIEW_REQUIRED | — | 0.0534 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/studio/marketing/assets` | UI_PROTOTYPE | VISUAL_WARNING | 1.0 | -0.0674 | 360x800: desbordamiento horizontal menor 13px |
| `/studio/marketing/calendar` | UI_PROTOTYPE | REVIEW_REQUIRED | — | 0.0336 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/studio/marketing/community` | UI_PROTOTYPE | VISUAL_WARNING | 1.0 | 0.0405 | 360x800: desbordamiento horizontal menor 13px |
| `/studio/marketing/analytics` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0602 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/studio/marketing/export` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | -0.0806 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/flows` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.047 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/create` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0186 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/rooms/01` | UI_PROTOTYPE | REVIEW_REQUIRED | — | -0.0076 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/emulation/rooms/02` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.1507 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/rooms/03` | UI_PROTOTYPE | VISUAL_FAIL | 1.0 | 0.1928 | 768x1024: desbordamiento horizontal 241px |
| `/emulation/rooms/04` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.115 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/rooms/05` | UI_PROTOTYPE | REVIEW_REQUIRED | — | 0.1466 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/emulation/battle` | UI_PROTOTYPE | REVIEW_REQUIRED | — | 0.0444 | 1920x1080: ningún token del catálogo aparece en el HTML de referencia |
| `/emulation/trade` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0668 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/studio` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0037 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/studio/manager` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0347 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/studio/monitor` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0261 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/studio/link` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.0246 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/studio/permissions` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.001 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/studio/logs` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | -0.0038 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/studio/analytics` | UI_PROTOTYPE | VISUAL_PASS | 1.0 | 0.252 | Comprobaciones programáticas superadas; sin revisión visual independiente. |
| `/emulation/studio/adapters` | UI_PROTOTYPE | VISUAL_WARNING | 1.0 | 0.0319 | 1920x1080: divergencia métrica extrema (SSIM 0.0319, hist 0.1597) |

Archivos: `visual-comparison.json` (resultados completos), `capture-manifest.json`
(evidencia de captura), `captures/<slug>/<res>.png`, `diff/diff-<slug>-<res>.png`
y `responsive-diagnostics.json` (elementos desbordados, solo lectura).

## Hallazgo responsive (sin modificar frontend)

Se detectaron **34** casos de overflow. Todos los ofensores
localizados en el sondeo son chips de `.pg-outline__chip` (metadatos de referencia),
clases más frecuentes: `{'pg-outline__chip': 66}`. El ajuste correspondería a estilos
del frontend y **no se ha aplicado** (prohibido en esta fase); se reporta al agente padre.
