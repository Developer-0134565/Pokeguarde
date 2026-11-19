# 06 — Estrategia de migración visual

**Misión:** PG-STITCH-01 · **Fase:** F · **Fecha:** 2026-11-19
**Estado:** PROPUESTA TÉCNICA. No autoriza implementación.

## 1. Principio rector

La migración visual debe ser **aditiva y reversible**: envolver el LCD existente con una carcasa de dispositivo, sin reescribir el motor, sin sustituir el canvas, sin copiar el HTML generado por Stitch y sin incorporar dependencias. Los mockups son **referencia de intención**, no código fuente.

---

## 2. Elementos que DEBEN conservarse

| Elemento | Evidencia | Regla |
|---|---|---|
| Canvas lógico 160×144 | `nursery.ts:326` | No cambiar `width`/`height` del elemento |
| Fondo canónico | `apps/web/assets/room/guarderia.png`, 160×144 RGBA, `bcedbd66…` | No sustituir por el PNG de 1200×896 de Stitch |
| Pixelación | `nursery.ts:912` `imageRendering='pixelated'`; `imageSmoothingEnabled=false` | Mantener nearest-neighbor |
| Escalado entero | `applyScale()` :895-915 | `min(floor((vw−420)/160), floor((vh−180)/144))`, cotas vigentes, 2x en móvil |
| Paleta GBC | `nursery.ts:75`, 4 colores | El LCD sigue siendo GBC/Crystal, no los colores de la carcasa |
| Fuente 3×5 del lienzo | `nursery.ts:87-115` | No sustituir por `Press Start 2P` ni fuentes remotas |
| Sprites PG-07A | `sprite-runtime.ts`, fallback procedural | Reutilizar; no regenerar ni redistribuir |
| HUD HTML | `nursery.ts:599` | Se mantiene bajo el lienzo, no dentro de él |
| Listeners | `updateSheet()` :570-592 | Único punto de repintado/enganche |
| Navegación vigente | `main.ts:462-480`; `index.html:10-21` | Biblioteca/Guardería siguen operativas; FICHA/DATOS se añade |
| Gestión de saves | `main.ts:425-460`; `index.ts:405-477` | Sin cambios |
| i18n ES | `i18n.ts`, 232 claves | Toda cadena nueva pasa por `t()` |
| Accesibilidad | `data-i18n-aria`, `<dialog>` | Botones con `aria-label` y foco visible |

---

## 3. Elementos que NO deben copiarse de Stitch

| Elemento | Motivo |
|---|---|
| `https://cdn.tailwindcss.com` | Dependencia externa, prohibida por el modo local y sin permiso de instalación |
| Google Fonts / fuentes de GitHub/jsdelivr | Referencias externas inseguras, licencia no verificada |
| `https://lh3.googleusercontent.com/...` | Imágenes alojadas fuera de la app |
| `screen.png` como sprite | Son capturas de maquetas, no spritesheets ni assets de 160×144 |
| Carcasa `1200×896` del ZIP | No es el fondo canónico (§8 de `LEEME_STITCH.md` es incorrecto) |
| Tres ocupantes | Contradice la capacidad DECIDIDA de 2 |
| 510 EV / 252 / naturaleza / IV en Gen II | Contradice Stat Exp 65.535 por stat |
| «¡Descargado pokemon_crystal.sav!», checksums `0x9F4C`, «CARTUCHO EXPORTADO» | Simulaciones DOM, no exportación real |
| Cacas | Sin frecuencia, penalización, persistencia ni limpieza aprobadas |
| `EXP x1.5`, inyección SRAM, «Puntos PC» | Sin respaldo documental |
| Emojis dentro del LCD | No son GBC; el HUD/lienzo usa fuente propia |

---

## 4. Arquitectura visual propuesta

```
index.html
  ├─ header (Biblioteca / Guardería / [FICHA/DATOS])   ← main.ts
  ├─ .layout (saves + detalle con pestañas)            ← main.ts (sin tocar)
  └─ #nursery
       └─ .device-shell            ← NUEVO: carcasa ovalada roja/blanca (CSS puro)
            ├─ .device-screen
            │    ├─ canvas#pg-canvas 160×144           ← existente, intacto
            │    └─ (capa de ejemplos / diálogo si se aprueba)
            ├─ #pg-hud                                 ← existente, bajo el lienzo
            ├─ #pg-controls                            ← existente, 6 cuidados + 6 entrenamientos
            ├─ #pg-sheet                               ← existente; extraer a pet-sheet.ts
            └─ .device-buttons                         ← NUEVO: 3 botones accesibles
                 ├─ [izq]  ciclar foco / volver
                 ├─ [centro] A / aceptar
                 └─ [der]  B / cancelar
```

**Regla de oro:** la carcasa es **CSS/HTML alrededor** del canvas; nunca se dibuja dentro del lienzo de 160×144. El `.device-screen` tiene el mismo ancho que el canvas escalado; el HUD no se mete en el LCD.

---

## 5. Refactorización recomendada

| Acción | Archivo | Detalle |
|---|---|---|
| Extraer plantilla de ficha | `nursery.ts:494-530` → `src/pet-sheet.ts` | Misma función, sin duplicar lógica; reutilizable por PG-07C y visitantes |
| Extraer tarjeta de exportación | `nursery.ts:427-492,704-760` → `src/export-card.ts` | Mantiene dry-run y `withheld` |
| Centralizar botones | `paintShell()` / `paintControls()` | Un solo `bindShellButtons()` invocado desde `updateSheet()` |
| Variables CSS | `style.css` | `--shell-red`, `--shell-white`, `--lcd-*`; colores de carcasa separados de la paleta GBC |
| Sin frameworks | — | Ni React, ni Tailwind, ni migrador de Vite sin autorización (`AGENTS.md`) |

**No refactorizar:** `pet-engine.ts`, `db.ts`, `index.ts`, `Program.cs`, `daynight.ts`, `sprite-runtime.ts`.

---

## 6. CSS aprovechable de los mockups

Solo como **referencia visual** (proporciones de la carcasa, presencia de tres botones, contraste rojo/blanco, disposición del LCD). Todo debe reescribirse en `apps/web/src/style.css` con selectores propios y sin clases de Tailwind. No se puede copiar el `<style>` generado porque depende de Tailwind CDN y de fuentes remotas.

---

## 7. Accesibilidad

- Tres botones con `aria-label` traducido vía `t()`.
- Navegación por teclado: Tab/Shift+Tab y Enter/Espacio; flechas para ciclar foco si se aprueba.
- `focus-visible` con contraste alto dentro de la paleta permitida.
- Diálogos con `<dialog>` nativo ya existente; no sustituir por `div` con `setTimeout`.
- Las barras de necesidades ya tienen etiquetas de texto en el HUD; conservarlas.
- No depender de emojis ni de color como único indicador de estado.

---

## 8. Responsive

- Mantener la fórmula y cotas de `applyScale()`: ≥2x, ≤7x, reserva lateral de 420 px con panel y 58 px a una columna.
- A 390×844: canvas 320×288 (2x), sin desbordes horizontales, cabecera envuelta.
- La carcasa debe escalar con el canvas; si añade margen, debe descontarse de `reserveX` o ajustarse el contenedor, sin cambiar la resolución interna.
- En pantallas grandes, la carcasa no debe forzar más de 7x.

---

## 9. Pruebas visuales exigidas antes de aceptar PG-07B

1. `getImageData` en `(5,130)`, `(100,100)` y `(80,60)` del fondo → mismos valores que en la fase 5 (`124,76,46`; `76,43,30`; `180,161,138`).
2. `canvas.width === 160 && canvas.height === 144`.
3. `getComputedStyle(canvas).imageRendering === 'pixelated'`.
4. Ratio medido 1,1111; escala 5x a 1280×900, 2x a 390×844.
5. `overflowX === 0` en móvil.
6. Los siete cuidados y seis entrenamientos siguen respondiendo tras diez repintados de la ficha.
7. Sin peticiones de red a dominios externos.
8. Sin dependencias nuevas en `package.json`.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| La carcasa tapa el HUD | HUD fuera de `.device-screen`, debajo del canvas |
| Se pierde pixelación por transform CSS | Escalar el canvas por estilos, nunca dibujar a resolución mayor |
| Se rompen los listeners al repintar | Usar `updateSheet()` como único punto |
| Se sustituye el fondo por el de 1200×896 | Comparar hash antes/después |
| Se cuelan fuentes remotas | Solo fuentes del sistema/fuente 3×5 propia |
| Se interpreta el mockup de 3 ocupantes como regla | Capacidad 2 y una activa en local |
| Se incluyen cacas «porque salen en el dibujo» | Requieren aprobación y spike separado |
| La maqueta móvil de 302 px de ancho se copia literal | Se ignora; se usa la fórmula responsive vigente |
