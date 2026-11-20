# OC-SYNC-09 — Corrección de violaciones axe (Fases 3.3/3.5, cierre)

**Estado: VERIFICADO.** De 7 violaciones iniciales en 5 rutas (más 1 detectada en el barrido global) a **0 violaciones en 58/58 rutas**.

## 1. Línea base real

Fuente: `axe-58-results.json` (axe-core 4.12.1 embebido en agent-browser, 58/58 rutas, sesión `sync09luna-957274a7fcad`). El mensaje de completado inicial decía «0 violaciones», pero el JSON real registraba **7 violaciones en 5 rutas**. Se trabajó desde el JSON, no desde el mensaje.

| Ruta | Regla | Nodos |
|---|---|---:|
| `/guarderia` | `aria-allowed-role` | 4 |
| `/guarderia` | `color-contrast` | 10 |
| `/guarderia` | `list` | 1 |
| `/biblioteca` | `color-contrast` | 5 |
| `/biblioteca/equipo` | `color-contrast` | 5 |
| `/studio/marketing/creative` | `heading-order` | 1 |
| `/emulation/create` | `color-contrast` | 8 |

## 2. Causa

Colisión de temas: los componentes heredados de `apps/web/src/style.css` conservan variables oscuras (`--panel-2:#212a21`, `--muted:#93a58c`, `--accent:#9ee06a`) mientras el shell aplica fondos claros (`#fff9ec`, `#efefef`). Además, `<li role="button">` es inválido como hijo directo de `<ul>` y un `<h4>` sin `<h3>` previo rompe el orden de encabezados.

## 3. Cambios aplicados

1. **`apps/web/src/nursery.ts`**: `petRow()` genera `<li class="pet-pick">` sin `role`/`tabindex`/`data-id`, con un `<button type="button" class="pet-pick__btn" data-id aria-pressed aria-label>` interno. Los listeners (`bindGlobalListeners` y `updateSheet`) apuntan a `.pet-pick__btn`. Se conserva el patrón `el.onclick = () =>` exigido por `scripts/pg07b-check.ts`. **No se modificó el motor** (`pet-engine.ts`).
2. **`apps/web/src/style.css`**: `.pet-pick__btn` con grid, color `#e8eee2`, borde y foco; `.pet-pick__btn b` `#f2f6ee`; `.pet-pick .muted` `#c9d6bd`; `.drop strong` `#3b4a33`; `.nursery-controls button.train` `#2f5e1f`; `.save`/`.save-title` claros sobre `#212a21`; `.placeholder` `#55634c` sobre fondo claro; regla contextual `.dossier-card .placeholder { color:#e8eee2; }` para el fondo oscuro `#1a211a`.
3. **`apps/web/src/pages/marketing.ts`**: `.pg-mk-col__title` de `<h4>` a `<h3>`.
4. **`apps/web/src/pages/emulation.css`**: `.pg-em-wizard__step-btn { color:#253347; background:#e6edf6; }` y `[aria-current=step]` con `color:#4a2d00; background:#ffe6a8`.

Bundle regenerado desde `/tmp/opencode/oc-stitch-08/bundle-entry.ts`:
- JS SHA-256 `b446105a9596b41ecc3e79814067d5ebb0b0473998de26c7c21b55d8db9dc006` (127673 B).
- CSS SHA-256 `c88acfd3f97c7a57b1c4f2044bdc7a3184382b54ebde95c732fdcf047af97d15` (21172 B).

## 4. Resultado antes/después

| Medición | Rutas | Violaciones |
|---|---:|---:|
| Línea base (`axe-58-results.json`) | 58 | 7 en 5 rutas |
| Tras correcciones en las 5 rutas | 5 | 2 (`/biblioteca`, `/biblioteca/equipo`) |
| Tras `.drop strong` | 5 | 0 |
| Barrido global (`axe-58-after-fix.json`) | 58 | 1 (`/ficha`) |
| Tras `.dossier-card .placeholder` | 58 | **0** |

El barrido final se ejecutó con `/tmp/opencode/oc-sync-09-a11y-sweep.py` (axe-core 4.12.1 embebido, sin CDN) y guardó `axe-58-after-fix.json` con `routesAudited:58`, `routesWithViolations:0`, `totalViolations:0`. Evidencias intermedias en `evidencias/axe-fix-*.json` y `axe-fix2-*.json`.

## 5. Limitaciones

- El alcance es un único viewport por ruta y el estado inicial de cada página; axe `incomplete` (gradientes/imágenes de fondo) requiere revisión manual y no cuenta como violación.
- No se decayó ninguna regla ni se excluyeron nodos para conseguir el resultado.
- La revisión visual independiente sigue pendiente: el modelo no acepta entrada de imágenes.

## 6. Comandos

```bash
bun run check
python3 /tmp/opencode/oc-sync-09-a11y-sweep.py
```

Ambos EXIT 0. Sin commits, pushes ni cambios en BD, fixtures, ROMs o saves durante esta corrección.
