# PG-07B — Informe de implementación

**Fecha:** 19-nov-2026
**Agente principal:** Sol (OpenCode)
**Estado:** IMPLEMENTADA Y VERIFICADA (sin commits ni pushes)
**Repositorio:** `/home/<usuario>/Proyectos/Pokeguarde`

---

## 1. Resumen ejecutivo

PG-07B está implementada. La Guardería muestra una carcasa Tamagotchi ovalada rojo carmesí / blanco marfil con aro superior, LCD integrada y tres botones físicos **A (Navegar) / B (Aceptar) / C (Cancelar)**. El HUD sigue fuera del lienzo y usa únicamente datos reales del motor. El canvas conserva su resolución lógica **160×144**, el fondo canónico, los sprites PG-07A y el escalado entero original.

No se implementaron multijugador, dos plazas, crianza, huevos, GP, tienda, nuevas reglas de cuidado ni modificaciones de saves. No se cambió ningún archivo de backend, BD, PKHeX, motor ni sprites.

**Primera fase segura para continuar:** PG-07C (FICHA/DATOS y componentes compartidos), siempre que se apruebe antes la incorporación de una pestaña de navegación dedicada.

---

## 2. Estado Git

### Inicial
- HEAD: `819b73b49a8aca76486173917d7abdb4518290ab`
- Rama: `main`
- Cambios rastreados: 0
- Entradas untracked: 34
- Hash de `git status --porcelain=v1 --untracked-files=all`:
  `5764440642f084e5d417d0e3735a5a7f38c2763fd2eac97d2dab199e85830159`

### Final
- HEAD: `819b73b49a8aca76486173917d7abdb4518290ab` (**idéntico**)
- Rama: `main` (**idéntica**)
- Cambios rastreados: 4 (los autorizados)
  - `apps/web/src/i18n.ts`
  - `apps/web/src/nursery.ts`
  - `apps/web/src/style.css`
  - `scripts/check.sh`
- Entradas untracked: 35 (las 34 iniciales + `scripts/pg07b-check.ts`)
- Hash de estado final:
  `fe2c6321b07a87124d46818ded4a6ce258d82eb9edfcd114fcb6421da9ddb672`

**Confirmación:** no se realizaron commits, pushes, ni cambios en archivos fuera del alcance autorizado.

---

## 3. Referencias visuales realmente utilizadas

- `STITCH_UPLOAD/01_REFERENCIAS_ORIGINALES/guarderia-desktop/DESIGN.md`
  - Sistema «Pocket Tech 1999».
  - `#b51a21` (rojo principal), `#d93636` (rojo claro), `#FFF9F0` / `#f8f2f2` (marfil), `#541111` (sombra).
  - «Bevel Extrusion» (`4px 4px 0 #541111` + realce `2px solid #FFF9F0`).
  - «Inner Sunken Screens» (`inset 3px 3px 0 #1C1A1A`, `inset -3px -3px 0 #FFF9F0`).
  - Botones circulares con sombra inferior y hundimiento al pulsar.
  - Menú GBC con cursor `▶`.
- Texto y estilos del `code.html` de la misma referencia: carcasa ovalada `border-radius: 280px 280px 340px 340px`, menú CUIDADOS, tres botones.

**No utilizado:** `screen.png` (el modelo no puede inspeccionar imágenes; se sustituyó por DESIGN.md + texto/estilos del HTML). No se ejecutó ningún JavaScript procedente de Stitch, no se añadieron CDN, fuentes remotas ni HTML generado copiado directamente.

---

## 4. Archivos modificados y componentes nuevos

| Archivo | Cambio |
|---|---|
| `apps/web/src/nursery.ts` | Estado de foco virtual, funciones `shellFocusables`, `focusKeyOf`, `shellRefreshFocus`, `shellMove`, `shellAccept`, `shellCancel`, `flashShellButton`, `onShellKey`, `bindGlobalListeners`, `unbindGlobalListeners`; markup `.device-shell` con aro, placa, LCD, HUD, controles y botonera A/B/C; `role="button"` y `tabindex` en `.pet-pick`; `updateSheet()` reaplica el foco tras cada repintado. |
| `apps/web/src/style.css` | Carcasa ovalada, aro, placa, LCD hundida, botones circulares, estados pulsados, `.device-focus`, arreglo del grid duplicado `#nursery.nursery`, ajustes responsive. |
| `apps/web/src/i18n.ts` | 8 claves nuevas (`device.brand`, `device.model`, `device.buttons.label`, `device.btn.a|b|c`, `device.focus`, `device.cancelled`) en ES y EN. |
| `scripts/check.sh` | Añadida la comprobación PG-07B. |
| `scripts/pg07b-check.ts` | **Nuevo**: 43 comprobaciones headless de carcasa, botonera, teclado, HUD, i18n, ausencia de dependencias externas e integridad de archivos protegidos. |

**No se creó ningún módulo TS nuevo**: el servidor sirve un mapa estático de módulos (`apps/server/src/index.ts:871-884`) y añadir uno habría exigido modificar backend, fuera de alcance.

### Hallazgo corregido (preexistente)
`#nursery` lleva también la clase `.nursery`, por lo que el grid se aplicaba dos veces. A 1280×900 el `.nursery-main` medía 530 px mientras el canvas medía 800 px y se salía de la carcasa por la izquierda (`x = -98`). Se corrigió únicamente con CSS:

```css
#nursery.nursery { display: block; padding: 0; border: 0; background: none; }
.nursery-main { ...; width: 100%; min-width: 0; }
```

Tras el arreglo, la LCD queda dentro de la carcasa en todos los tamaños probados.

---

## 5. Funcionalidades implementadas

### Carcasa
- Forma ovalada (`border-radius: 46% 46% 30% 30% / 22% 22% 18% 18%`, reducida en móvil).
- Rojo `#D93636` → `#B51A21`, marfil `#FFF9F0`, sombra `#541111`.
- Biselado interior, sombra exterior, aro superior y placa «POKEGUARDE · PKG-02 · GUARDERÍA».
- LCD integrada reutilizando `.screen-frame` sin cambiar el canvas.

### Botonera
- **A — Navegar:** mueve el foco al siguiente elemento interactivo (o al anterior con flechas izquierda/arriba).
- **B — Aceptar:** ejecuta un único `click()` sobre el elemento enfocado; los controles existentes mantienen sus listeners, así que no hay activaciones dobles.
- **C — Cancelar:** aborta el minijuego en curso sin conceder EV ni llamar a la API, o vuelve al primer elemento y actualiza el HUD.
- Teclado: `← ↑` anterior, `→ ↓` siguiente, `Enter`/`Espacio` aceptar, `Escape` cancelar. Se ignoran los atajos cuando el foco está en `input`, `select`, `textarea` o hay un `<dialog>` abierto.
- Ratón y táctil: los tres botones son `<button>` con `aria-label`, estados `:active`/`.pressed`, `:focus-visible` y tamaño mínimo de 44 px en móvil.
- El foco se identifica de forma estable entre repintados y se reaplica desde `updateSheet()` (que se ejecuta cada 700 ms).

### HUD
- Nombre, ánimo, reloj local, puntos y seis necesidades, todos leídos de `local`/`moodOf`/`formatClock`.
- Barras con valor < 25 parpadean (comportamiento previo conservado).
- Línea de foco accessible (`aria-live="polite"`) con la selección actual.

### Salvaguardas
- Listener de `resize` y de `keydown` registrados **una sola vez** por apertura y eliminados en `closeNursery()`; se eliminó el `window.addEventListener("resize", applyScale)` que estaba dentro de `paintShell()`.
- Sin nuevas acciones de cuidado, sin cambios en `pet-engine.ts`, sinSQLite, sin PKHeX y sin writes a saves.

---

## 6. Pruebas ejecutadas

### Estáticas / headless (todas pasan)
| Prueba | Resultado |
|---|---|
| `bun run scripts/pet-check.ts` | OK |
| `bun run scripts/night-check.ts` | OK |
| `bun run scripts/i18n-check.ts` | OK (incluye claves `device.*`) |
| `bun run scripts/pg07a-integration-check.ts` | 54 comprobaciones OK |
| `bun run scripts/pg07b-check.ts` | 43 comprobaciones OK |
| Transpilación TS (`Bun.Transpiler`) de `nursery.ts`, `i18n.ts`, `pg07b-check.ts` | OK |
| `sha256sum -c` de 8 archivos protegidos | 8/8 coinciden |
| Búsqueda de `https?://` en HTML/CSS/TS modificados | 0 referencias |

### Dinámicas (servidor y navegador aislados)
Se copió el repositorio a `/tmp/opencode/pg07b-runtime/` y se arrancó un servidor en **127.0.0.1:8788** con BD copiada. El servidor del usuario en 8787 **no se tocó**.

| Comprobación | Resultado |
|---|---|
| Canvas | `160×144`, `imageSmoothingEnabled=false`, `image-rendering: pixelated`, ratio `1.1111` |
| Fondo canónico | Píxeles `(5,130)=124,76,46`, `(100,100)=76,43,30`, `(80,60)=180,161,138` — idénticos a la referencia |
| Sprites PG-07A | «Overworld activo · 810 sprites disponibles» |
| Escalado 1280×900 | 5× (800×720), LCD dentro de la carcasa, `overflowX=0` |
| Escalado 1366×768 y 768×1024 | 4×, LCD dentro, `overflowX=0` |
| Móvil 390×844 (emulación iPhone 14) | 2× (320×288), `overflowX=0`, botones 44×44 |
| Horizontal 844×390 y 1024×600 | 2×, sin desbordamiento horizontal |
| Botón A | Foco Comer → Jugar |
| Teclado `ArrowRight` | Jugar → Limpiar |
| Botón B | Ejecutó cuidado real; HUD pasó de «con hambre / Comida 9» a «tranquilo / Comida 35», aviso «ha comido una baya» |
| Enter | Ejecutó «Acariciar»; notice «ELECTRODE ronronea.» |
| Botón C durante minijuego | «Acción cancelada.», EV pendientes sin cambios |
| Escape durante minijuego | «Acción cancelada.», sin EV concedidos |
| Táctil / device emulation | Botón A cambió el foco; escala 2× y sin overflow |
| Repetir Biblioteca ↔ Guardería 3 veces | Un solo `ArrowRight` mueve exactamente un paso; 3 botones; sin duplicados |
| Navegación | Biblioteca y Guardería siguen funcionando; sin errores en consola |

### Capturas
- `/tmp/opencode/pg07b-desktop.png` (184.212 B, 1280×900)
- `/tmp/opencode/pg07b-mobile.png` (650.262 B, emulación iPhone 14)

---

## 7. Pruebas omitidas y motivos

| Prueba | Motivo |
|---|---|
| `bun run check` completo | Incluye `dotnet build`, que escribe `bin/obj` en el repositorio; se ejecutaron por separado todas las pruebas puras y la transpilación. |
| Exportación real a `.sav` | Fuera de alcance PG-07B; no se tocó ningún save. |
| Servidor en el repositorio original | El usuario tiene un proceso en 8787; se usó una copia aislada en 8788 para evitar escrituras en la BD real. |
| Inspección visual directa de `screen.png` | El modelo no admite entrada de imágenes; se usaron DESIGN.md, texto y estilos del HTML. |
| Peticiones a CDN / proveedores | Prohibido por la misión; no se contactó a ningún proveedor. |
| Licencias de sprites de terceros | Sigue sin resolver; PG-07B solo reutiliza los sprites ya integrados en PG-07A. |

---

## 8. Riesgos pendientes

1. **Foco virtual:** se reaplica por clave estable; si en el futuro se renombran `data-act`/`data-train`, el foco vuelve al primer elemento (no rompe la aplicación).
2. **Carcasa y escalas mayores:** el arreglo del grid duplicado es CSS y depende de que `#nursery` conserve esa clase; si se refactoriza el HTML, hay que revisar la regla `#nursery.nursery`.
3. **Compatibilidad táctil:** se verificó con emulación de dispositivo y `click`; no se probó en un dispositivo físico.
4. **i18n EN:** es un diccionario parcial por diseño; las claves nuevas se añadieron en ambos idiomas.
5. **Estado de foco en pantallas muy bajas (390 px de alto):** la escala se fija en 2× y aparece scroll vertical; es el comportamiento previo y no hay desbordamiento horizontal.

---

## 9. Recomendación para PG-07C

**Objetivo:** FICHA/DATOS y componentes compartidos.

**Orden recomendado:**
1. Extraer los paneles repetidos (ficha de la mascota, bloque de exportación, lista de mascotas) a componentes reutilizables sin crear nuevos módulos hasta autorizar el cambio del mapa estático del servidor.
2. Añadir la navegación a FICHA/DATOS respetando las pestañas actuales de Biblioteca (`party|boxes|bag|legality`); **requiere decisión previa** sobre si será una quinta pestaña o una vista independiente.
3. Reutilizar `.device-shell` y la botonera A/B/C para la navegación de la ficha.
4. Mantener el canvas 160×144 y `pet-engine.ts` intactos; la ficha debe seguir leyendo el mismo `Pet`/`PetState`.
5. No tocar backend, BD ni legalidad; PG-07C puede ser enteramente visual y de presentación.

**Complejidad relativa:** media. **Dependencias:** PG-07B (completada) y una decisión de navegación del usuario.

---

## 10. Conclusión

PG-07B cumple los criterios de aceptación: carcasa renderizada, tres botones funcionales, canvas 160×144 intacto, sprites PG-07A operativos, HUD con datos reales, interfaz responsive, Biblioteca y Guardería sin regresiones, pruebas aplicables en verde y ninguna modificación de reglas de juego, persistencia, saves ni PKHeX. El repositorio permanece en el mismo commit y sin commits ni pushes realizados por esta misión.
