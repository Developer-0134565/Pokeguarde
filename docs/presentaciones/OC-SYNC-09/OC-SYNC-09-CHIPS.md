# OC-SYNC-09 — Investigación de los chips `.pg-outline__chip`

Generado: 2026-11-20T20:59:21Z. Sesión de navegador propia `sync09luna-957274a7fcad`, servidor preexistente `127.0.0.1:8787`. Solo lectura: **no se modificó CSS, Bundle, BD, fixtures ni saves**.

## Pregunta recibida

El informe `../OC-STITCH-08/visual/responsive-diagnostics.json` (34 casos, 66 entradas `offenders`) afirmaba que chips `.pg-outline__chip` sobrepasaban su contenedor en móvil, mientras que `overflow-check.js` medía 0/58 desbordamientos de documento. Había que decidir si era un problema real de legibilidad o solo del contenedor, sin aplicar `overflow:hidden` indiscriminado.

## VERIFICADO

### Cobertura de medición

| Dimensión | Valor |
|---|---:|
| Resoluciones medidas | **6**: 1920×1080, 1366×768, 1024×768, 768×1024, 390×844, 360×800 |
| Rutas por resolución | **58** (las del catálogo OC-STITCH-08) |
| Observaciones ruta×resolución | **348** |
| Rutas con contenedor de chips visible | 53 por resolución |
| Chips visibles medidos | **740 por resolución** (4.440 mediciones de chip en total) |
| Chips con `right > contenedor.right` | **0** |
| Chips con `right > innerWidth` | **0** |
| Chips recortados por un ancestro con `overflow-x: hidden/clip/auto/scroll` | **0** |
| Chips con texto desbordando su propia caja (`scrollWidth > clientWidth`) | **0** |
| Rutas con `documentElement.scrollWidth > clientWidth` | **0** |
| Rutas con scroll horizontal real (`window.scrollTo(9999,0)` → `scrollX > 0`) | **0** en las 6 resoluciones |

Las 5 rutas sin contenedor visible son vistas legacy (`/home`, `/guarderia`, `/biblioteca`, `/biblioteca/equipo`, `/ficha`): tienen 14 chips en el DOM, pero el contenedor `.pg-outline__chips` está oculto y no entra en el cálculo visual.

### Caso concreto que antes fallaba

A 360×800, en `#/crianza`:

| Chip | Ancho medido ahora | `right` medido | `right` en el diagnóstico antiguo | Contenedor `right` |
|---|---:|---:|---:|---:|
| `nest_cam_wired_standCRIANZA &amp; HUEVOS` | 228 px | 265 px | 407 px | 323 px |
| `storefrontINVENTARIO &amp; TIENDA` | 190,2 px | 227,2 px | 390 px | 323 px |
| `outgoing_mail ENVIAR SOLICITUD DE CONSENTIMIENTO…` | 286 px (2 líneas) | 323 px | — | 323 px |

Estilos calculados del contenedor servido: `display:flex`, `flex-wrap:wrap`, `overflow-x:visible`, rect `[37, 323]`, `scrollWidth = clientWidth = 286`. Estilos calculados de los chips: `white-space:normal`, `overflow-wrap:normal`, `word-break:normal`. El chip más ancho de toda la muestra mide exactamente el ancho del contenedor (287 px a 360×800) y no lo sobrepasa.

**Conclusión sobre el estado actual:** con el bundle servido hoy no hay desbordamiento real de chips, no hay recorte de texto y no hay scroll horizontal. El hallazgo antiguo **no es reproducible** en el entorno actual. No era un problema de legibilidad en el momento de la medición actual: los chips largos se parten en dos líneas y siguen dentro del panel.

### Hash del bundle auditado

`GET /assets/pg08/workbenches.css` → SHA-256 `3c738dd8c5f3ed89d150086db45ce9adc9c945188cfd8f467df0db6dad669344`, idéntico a `apps/web/assets/pg08/workbenches.css` (20.654 B, mtime 2026-11-20 21:17:21 +0100). Se hizo `reload` al inicio de la sesión para evitar caché de CSS.

## LIMITACIÓN

- No se puede identificar con certeza la regla histórica que causó los 395 px de ancho. Los ficheros crudos de la misión anterior en `/tmp/opencode/stitch08l/overflow-*.json` tienen mtime **21:08**, mientras que el bundle servido actual es de **21:17** y el diagnóstico agregado se escribió a las **21:23**. La causa más probable es que se retiró un `white-space:nowrap` o se permitió el partido de palabras, pero el CSS es un archivo sin seguimiento Git y no hay versión anterior en el repo que permita demostrarlo.
- Los datos geometrías se midieron por DOM; no se sustituyen por una revisión visual humana de legibilidad tipográfica (los chips usan `font-size:9px`).
- 61 textos de chips distintos contienen entidades HTML literales (`&amp;`, `&gt;`) porque vienen así del inventario Stitch y se insertan como texto. Esto **sí afecta a la legibilidad** («OVERVIEW &amp; GALLERY», «&gt; Brand Kit»), pero no tiene relación con el desbordamiento. Se documenta como hallazgo separado para que el hilo principal decida.

## Propuesta concreta (NO aplicada)

Endurecimiento preventivo, por si reaparece una regla con `nowrap` o el contenedor se anida en otro flex/grid:

- **Archivo fuente:** `apps/web/src/pages/pages.css` (reglas en las líneas 105–106).
- **Bundle realmente servido:** `apps/web/assets/pg08/workbenches.css` (reglas en las líneas 378–388). Como hoy no hay Vite, hay que reflejar el cambio en ambos o regenerar el bundle con el proceso acordado.

```css
.pg-outline__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.pg-outline__chip {
  border: 1px solid var(--pg-line);
  color: var(--pg-dim);
  padding: 2px 5px;
  font-size: 9px;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  white-space: normal;
  overflow-wrap: anywhere;
}
```

Justificación: `flex-wrap:wrap` ya existe y se conserva; `min-width:0` evita que un ítem flex se niegue a encogerse dentro de un padre estrecho; `max-width:100%` + `box-sizing:border-box` garantizan que borde y padding cuenten dentro del contenedor; `overflow-wrap:anywhere` parte tokens largos como `nest_cam_wired_standCRIANZA`; `white-space:normal` expresa la intención y bloquea un `nowrap` heredado. **No se propone `overflow:hidden`**: ocultaría texto sin avisar.

Para el problema de entidades, el punto de intervención sería `apps/web/src/pages/contract.ts:200` (`el("span", "pg-outline__chip", b)`) o, mejor, la generación del inventario Stitch: decodificar entidades antes de crear el chip. Tampoco se aplicó.

## Estado para el hilo principal

- Desbordamiento de chips: **NO REPRODUCIBLE** con el bundle actual; 0/4.440 mediciones de chip.
- Legibilidad por desbordamiento: **NO AFECTADA**; 0 chips recortados.
- Legibilidad por entidades HTML: **HALLAZGO MENOR**, con corrección propuesta más arriba y sin aplicación.
- Corrección CSS: **PROPUESTA**, no necesaria para el bundle actual; queda a decisión del hilo principal.
