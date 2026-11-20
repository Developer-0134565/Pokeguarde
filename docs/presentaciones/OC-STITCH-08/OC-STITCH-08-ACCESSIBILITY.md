# OC-STITCH-08 — Accesibilidad (Fase K)

**Estado:** VERIFICADO con axe-core 4.12.1 embebido en `agent-browser` (sin CDN) y comprobaciones DOM reales.
**Superficie auditada:** `http://127.0.0.1:8787/` (homepage canónica, la misma que OC-STITCH-07), viewport 1440×900; comprobaciones adicionales en `#/crianza` y en el diálogo del Quick Switcher.
**Referencia:** WCAG 2.1 AA y los requisitos del PRD `non_functional_requirements.accessibility_wcag_aa` (4.5:1, 44 px, `prefers_reduced_motion`, doble codificación texto + icono).

## 1. Antes / después

| Métrica axe | ANTES | DESPUÉS |
|---|---:|---:|
| `violations` | **3** | **2** |
| `passes` | 31 | 31 |
| `incomplete` | 2 | 2 |
| `inapplicable` | 56 | 56 |
| Nodos `aria-allowed-role` (minor) | 5 | 5 |
| Nodos `color-contrast` (serious) | 7 | **0** |
| Nodos `landmark-one-main` (moderate) | 1 | 1 |

Evidencia literal: `OC-STITCH-08-AXE-BEFORE.json` y `OC-STITCH-08-AXE-AFTER.json`. Antes coincide con `../OC-STITCH-07/evidencias/a11y-home.json`: las tres infracciones localizadas son exactamente `aria-allowed-role`, `color-contrast` y `landmark-one-main`.

### Infracción 1 — `color-contrast` (7 nodos) → CORREGIDA

| Elemento | Antes | Después | Ratio |
|---|---|---|---:|
| `.pg-shell-head__badge--red` | `#fff9ec` sobre `#d93636` (4.41:1) | `#fff9ec` sobre `#c92f2f` | 5.09:1 |
| `.pg-shell-nav__link[aria-current="page"]` | 4.41:1 | 5.09:1 | 5.09:1 |
| `.pg-home__play` | 4.41:1 | 5.09:1 | 5.09:1 |
| `.pg-home__cta` (×2) | 4.41:1 | 5.09:1 | 5.09:1 |
| `.pg-home__drop-hint` | `#8f706d` sobre `#fff9ec` (4.25:1) | `#78584f` sobre `#fff9ec` | 6.05:1 |
| `.pg-home__mock-note` | 4.25:1 | 6.05:1 | 6.05:1 |

Cambios aplicados en `apps/web/src/app/shell.css`. Se ajustaron también dos pares que axe marcó como `incomplete` pero que se pueden calcular: `.pg-console__online` (`#06430a` sobre `#9bbc0f`, 5.29:1) y `.pg-switcher__side-brand` (`#ff5a5f` sobre `#1d1b1b`, 5.62:1). La base del degradado de la consola pasó a `#b92828` para que la capa clara superior mantenga ≥4.5:1 con el texto claro (composite calculado ≈4.52:1). La identidad visual se conserva: solo se oscurece ligeramente el rojo y se oscurece el texto secundario.

### Infracción 2 — `aria-allowed-role` (5 nodos) → NO CORREGIDA, BLOQUEADA POR ÁMBITO

Los cinco `article.pg-home__feature` llevan `role="link"`, `tabindex="0"` y `aria-label`, generados en `apps/web/src/app/views.ts:36-45`. ARIA no permite `role="link"` en `<article>`: el rol debe estar en un `<a href>` o, alternativamente, los artículos deben dejar de anunciarse como enlaces (por ejemplo, `role="group"` con un botón real dentro).

**No se corrige**: la solución correcta exige editar `views.ts`, expresamente fuera del ámbito de edición autorizado. No se aplicó ningún parche DOM desde `contract.ts` ni se alteró el bundle para disimular la infracción. Solicitud: autorizar `apps/web/src/app/views.ts` para sustituir cada artículo interactivo por un `<a href="#/...">` (o equivalente semántico nativo), conservando atajos y estilos.

### Infracción 3 — `landmark-one-main` (1 nodo) → NO CORREGIDA, BLOQUEADA POR ÁMBITO

El documento no tiene landmark `<main>`/role="main". Existe `<main class="layout">` en `index.html`, pero las vistas se montan en secciones hermanas (`#pg-home`, `#nursery`, `#sheet`, `#pg-stub`) y el contenido Stitch se inyecta fuera de ese `<main>`; por eso axe sigue detectando ausencia de landmark principal.

**No se corrige**: exige modificar `index.html` y/o `apps/web/src/app/shell.ts`, ambos fuera del ámbito autorizado. Solicitud: autorizar envolver todas las vistas con un único `<main>` (o asignar `role="main"` al contenedor común visible), evitando duplicar landmarks.

## 2. Foco, teclado y diálogos

- **Foco visible (WCAG 2.4.7):** regla global `:focus-visible` en `apps/web/src/theme/base.css` (`outline: 2px solid`, `outline-offset: 2px`). Comprobado en el primer `.pg-home__feature`: `document.activeElement` es el artículo y el outline calculado es `solid` de 3 px. `.pg-btn:focus-visible` y `.pg-rail__item` heredan la regla; `.pg-page__crumb` también.
- **Teclado (WCAG 2.1.1):** con Enter sobre el primer artículo se navega de `#/` a `#/guarderia`; los manejadores Enter/Espacio viven en `views.ts` y el router es hash-based (sin recargas). El Quick Switcher responde a Control+K y a flechas/Enter (`command-bus-regression.json`).
- **Diálogos:** Control+K abre un único `dialog.pg-dialog.pg-dialog--switcher` y coloca el foco en `input.pg-switcher__input`; Escape lo cierra. **Observación pendiente:** tras cerrar, el foco queda en `BODY` en lugar de volver al botón de apertura; corregirlo exige `switcher.ts`, fuera de ámbito. El `<dialog id="mon">` de `index.html` es nativo y tiene botón de cierre; no se abrió una ficha en esta comprobación.
- **Restauración de foco tras cambio de ruta:** al activar un artículo de la home, el foco queda en `BODY`. Mejora deseable (WCAG 2.4.3) en `views.ts`/`router.ts`, fuera de ámbito; no se disimula con CSS.

## 3. Contraste y doble codificación

- Todos los pares auditados por axe superan ahora 4.5:1, con margen ≥0.59:1 sobre el umbral.
- Las Cabeceras/páginas usan texto explícito además de color: `OPERATIVA · DATOS REALES`, `PARCIAL`, `PROTOTIPO UI · SIN BACKEND`, `BLOQUEADO` (`pages/contract.ts`), `aria-current="page"` en la navegación activa y chips con texto en la Guardería. El color nunca es el único indicador (PRD `dual_state_coding`).
- Los botones desactivados de maqueta conservan `title` y `aria-label` con el motivo (`mockButton` en `contract.ts`); WCAG exime controles inactivos del requisito de contraste, y aquí además se explica por qué están inactivos.

## 4. Objetivos táctiles

| Superficie | ANTES | DESPUÉS |
|---|---|---|
| `/` | 12 controles por debajo de 44 px: nav ×4 (30 px), login (32), switcher (32), CTA ×2 (42), inputs ×3 (34), redes ×2 (29) | **0** controles visibles por debajo de 44 px |
| `#/crianza` | breadcrumb (25), botones de maqueta (37), rail ×N (25) además de los de cabecera | **0** controles visibles por debajo de 44 px |

Se fijó `min-height: 44px` en `shell.css` para nav, login, switcher, CTA, inputs y botones sociales; y para `.pg-btn`, `.pg-rail__item` y `.pg-page__crumb` de las páginas integradas. Se aplicó el mismo cambio en la fuente `apps/web/src/pages/pages.css`, pero **esa hoja no se sirve** (el bundle `assets/pg08/workbenches.css` no la incluye y `/pages.css` devuelve 404); por eso la corrección efectiva en la app servida vive en `shell.css`. Incidencia registrada para quien regenere el bundle.

## 5. Movimiento reducido

`apps/web/src/theme/base.css` ya incluye `@media (prefers-reduced-motion: reduce)` con `animation-duration: 0.01ms`, `animation-iteration-count: 1`, `transition-duration: 0.01ms` y `scroll-behavior: auto`. Verificado con emulación real: `matchMedia(...).matches === true`, transición y animación calculadas `1e-05s`, `scrollBehavior: auto`. No se añadió CSS duplicado.

## 6. Sin exclusiones injustificadas

- No se oculta contenido ni se desactiva navegación para cumplir axe. No se eliminaron encabezados, etiquetas ni controles.
- Las maquetas UI_PROTOTYPE siguen siendo navegables y etiquetadas como prototipo; los botones inactivos explican su estado en `title`/`aria-label`.
- El cambio cromático es deliberado y mínimo: se eligió el rojo más oscuro que conserva la estética «Pocket Tech 1999» y cumple 4.5:1.
- Las dos infracciones restantes **no** se justifican como aceptables: están **bloqueadas por el perímetro de edición de esta misión** y se entregan con la solicitud concreta de autorización indicada arriba. No se declara conformidad plena mientras permanezcan.

## 7. Evidencia

- `OC-STITCH-08-AXE-BEFORE.json`, `OC-STITCH-08-AXE-AFTER.json` (axe 4.12.1, salida literal).
- `evidencias/axe-before-crianza.json` (auditoría adicional de una página de workbench).
- `evidencias/manual-a11y-checks.json` (mediciones de objetivo táctil, foco, teclado, diálogo y movimiento reducido).
- `../OC-STITCH-07/evidencias/a11y-home.json` (origen de las tres infracciones).
- Archivos editados: `apps/web/src/app/shell.css`, `apps/web/src/pages/pages.css`. No se editaron motores, BD, saves, fixtures ni `apps/server/src/index.ts`.

---

## Correcciones finales del hilo principal (K-FINAL)

Tras el informe inicial se corrigieron las tres infracciones conocidas:

- **`aria-allowed-role` (5 nodos):** `apps/web/src/app/views.ts` sustituye `article[role=link]` por un `<a href="#/…">` real, con `preventDefault()` y `navigate()` para conservar el comportamiento del router.
- **`landmark-one-main` (1 nodo):** `apps/web/index.html` envuelve todas las vistas en un único `<main id="pg-main">`; el antiguo `<main class="layout">` pasa a `<div class="layout">` y `apps/web/src/app/shell.css` actualiza sus dos selectores.
- **`color-contrast`:** además del trabajo de Terra, se fijó fondo/contraste de `.pg-rail__item` y `.pg-page__crumb` en `pages.css` y se oscureció `.pg-mk-badge` en `marketing.css` (`#b3262b`).

**Resultado final:** 0 violaciones en 8 rutas auditadas (Inicio, Crianza, Emergencia, Theme, Marketing Brand/Analytics/Campaigns y Shell). Los informes estructurados están en `OC-STITCH-08-AXE-AFTER.json`; el informe intermedio se conserva como `OC-STITCH-08-AXE-AFTER-STITCHK.json`.

Quedan `incomplete` informativos (2 reglas por ruta), documentados y no ocultados: son comprobaciones que axe no puede resolver automáticamente y requieren criterio humano.
