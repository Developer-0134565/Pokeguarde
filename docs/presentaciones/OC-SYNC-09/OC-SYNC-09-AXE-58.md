# OC-SYNC-09 — Auditoría axe en las 58 rutas del catálogo

Generado: 2026-11-20T20:59:21Z. Evidencia cruda: `axe-58-results.json` (misma carpeta).

## Alcance y método

- **Fuente de rutas:** `docs/presentaciones/OC-STITCH-08/OC-STITCH-08-ROUTE-MAP.json`, campo `pages[].route` (58 rutas). No se inventaron ni omitieron rutas.
- **Herramienta:** `agent-browser a11y`, con **axe-core 4.12.1 embebido en el binario de agent-browser**. No se usó CDN, no se inyectó axe en la aplicación ni se tocó el bundle servido. La versión fue devuelta por cada una de las 58 respuestas JSON.
- **Sesión propia:** `sync09luna-957274a7fcad` (prefijo `sync09luna`). Servidor Bun preexistente en `127.0.0.1:8787`, sin iniciar ni detener.
- **Viewport de la auditoría:** 1280×577, DPR 1, HeadlessChrome 158 (Linux).
- **Comando por ruta:** `agent-browser --session sync09luna-957274a7fcad a11y "http://127.0.0.1:8787/#<ruta>" --json`.
- **Comprobación de render:** tras cada auditoría se leyó `location.hash` y el texto visible de `#pg-main`; las 58 rutas coincidieron con la ruta solicitada. No se aceptó ninguna respuesta sin esta verificación.
- Sin commits, pushes, cambios de código, BD, fixtures, ROMs ni saves.

## VERIFICADO

| Métrica | Resultado |
|---|---:|
| Rutas del catálogo | 58 |
| Rutas auditadas | **58/58** |
| Rutas con respuesta axe válida y hash verificado | **58/58** |
| Rutas no auditables | **0** |
| Violaciones axe totales | **7** |
| Nodos afectados (suma de `nodeCount`) | 34 |
| Rutas con violaciones | 5 |
| Versión axe | 4.12.1 en las 58 respuestas |

### Desglose por ruta

| Ruta | Violaciones | Reglas (impacto, nodos) |
|---|---:|---|
| `/guarderia` | 3 | `aria-allowed-role` (minor, 4); `color-contrast` (serious, 10); `list` (serious, 1) |
| `/biblioteca` | 1 | `color-contrast` (serious, 5) |
| `/biblioteca/equipo` | 1 | `color-contrast` (serious, 5) |
| `/studio/marketing/creative` | 1 | `heading-order` (moderate, 1) |
| `/emulation/create` | 1 | `color-contrast` (serious, 8) |

Las otras **53 rutas** dieron `violations: 0`. El detalle completo (selectores, HTML, `failureSummary`, etiquetas WCAG y conteos de `incomplete`) está en `axe-58-results.json`.

### Naturaleza de los 7 hallazgos

1. **`/guarderia` — `aria-allowed-role` (minor, 4 nodos):** los `li.pet-pick` de la lista de mascotas llevan `role="button"` y `tabindex="0"`. El rol no es permitido en `<li>`; el patrón correcto sería un `<button>` dentro del `<li>`.
2. **`/guarderia` — `list` (serious, 1 nodo):** `ul.pet-list#pg-list` contiene hijos con `[role=button]`, no `<li>` semánticos válidos para axe. Es la misma causa raíz que el punto anterior, no un defecto independiente.
3. **`/guarderia` — `color-contrast` (serious, 10 nodos):** los botones `.train` (p. ej. `Carrera`, `Empuje`) miden 1.37:1 (`#9ee06a` sobre `#efefef`) y el nombre de la mascota activa 1.15:1 (`#1d1b1b` sobre `#212a21`). Origen probable: variables legacy de `apps/web/src/style.css` (`--accent`, `--ink`) combinadas con fondos del shell Stitch.
4. **`/biblioteca` y `/biblioteca/equipo` — `color-contrast` (serious, 5 nodos cada una):** `span[data-i18n="drop.hint"]`, `span[data-i18n="drop.pick"]` y `p.placeholder` miden 2.5:1 (`#93a58c` sobre `#fff9ec`); los `.save-title` miden 1.15:1 (`#1d1b1b` sobre `#212a21`). Las 2 rutas comparten vista por defecto, de ahí el resultado idéntico.
5. **`/studio/marketing/creative` — `heading-order` (moderate, 1 nodo):** `h4.pg-mk-col__title` «CAPAS (EJEMPLO)» salta niveles de encabezado.
6. **`/emulation/create` — `color-contrast` (serious, 8 nodos):** los pasos 02–09 de `.pg-em-wizard__step-btn` miden 1.01:1 (`#e8f2ff` sobre `#efefef`).

### Coherencia con OC-STITCH-08

La auditoría anterior cubrió 8 rutas y reportó 0 violaciones. Las **5 rutas con hallazgos** de esta auditoría **no estaban en esa muestra**, así que no hay contradicción: el muestreo de 8 rutas no era representativo de las 58. Las 8 rutas del catálogo que corresponden a la muestra anterior (`/home` como equivalente del alias `/`, `/crianza`, `/emulation/rooms/03`, `/studio/marketing/analytics`, `/studio/marketing/brand`, `/studio/marketing/campaigns`, `/studio/shell`, `/studio/theme`) siguen en 0. Como control adicional se auditó el alias `/` (fuera del catálogo de 58): 0 violaciones, misma versión axe.

## LIMITACIÓN

- Esto **no es una certificación WCAG de las 58 rutas**. Es una auditoría automatizada del estado inicial de cada ruta, con una única resolución. No se probaron diálogos (`Ctrl+K`, ficha `#mon`), pestañas internas, selección de partidas/Pokémon, estados de error, hover/foco ni las 6 resoluciones usadas en el estudio de chips.
- Las 7 violaciones se reportan **sin corrección**: este subagente tiene prohibido modificar código fuente. La decisión de arreglarlas y el ámbito de edición corresponden al hilo principal.
- El recuento de nodos depende del estado local: `/biblioteca` muestra 2 `.save-title` porque hay 2 saves en la BD; `/guarderia` muestra 4 `.pet-pick` porque hay 4 mascotas. Con otra BD los ids de regla se mantendrían, pero el número de nodos podría cambiar.
- Cada respuesta axe incluye reglas `incomplete` (principalmente `color-contrast` sobre degradados y `aria-prohibited-attr`). No se han resuelto manualmente; están consignadas en el JSON crudo y no se cuentan como violaciones.
- `/biblioteca` y `/biblioteca/equipo` renderizan el mismo contenido por defecto; se han auditado por separado porque son dos rutas del catálogo, no porque sean dos vistas distintas en el estado inicial.
