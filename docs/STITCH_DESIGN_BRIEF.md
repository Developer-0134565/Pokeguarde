# Brief de diseño — Pokeguarde para Google Stitch

Fecha: 19-nov-2026. Auditoría **solo lectura** sobre la aplicación en ejecución
(`http://127.0.0.1:8787`, build local servida por Bun).

Este documento describe la interfaz actual, mide sus problemas y fija las
restricciones que cualquier rediseño debe respetar. Incluye un **prompt maestro**
listo para pegar en Google Stitch.

> Las capturas de referencia no se versionan porque muestran partidas reales
> (entrenador, Pokémon, progreso) y el `.gitignore` excluye `capturas/` y
> `screenshots/`. El anexo explica cómo regenerarlas en dos minutos.

---

## 1. Producto y usuario

Pokeguarde es una aplicación **local** (127.0.0.1, sin cuentas ni nube) con dos
caras:

1. **Biblioteca**: se suelta un save de Pokémon de Gen 1–5 (`.srm`, `.sav`,
   `.dsv`) y se explora todo su contenido — entrenador, dinero, medallas,
   Pokédex, equipo, cajas, mochila y legalidad de cada Pokémon.
2. **Guardería**: un tamagotchi GBC con estética de 4 colores donde una mascota
   adoptada come, juega, se limpia, duerme y entrena con minijuegos que suben
   EV/stat exp **reales**; después se exportan a una copia nueva del save.

Usuario: una sola persona, en escritorio y móvil, que conoce Pokémon y quiere
una herramienta precisa pero agradable, no un panel de administración.

Identidad deseada: **Pokémon GBC / Tamagotchi + interfaz web moderna y cuidada**.
La tensión entre ambas es el eje del rediseño: no debe parecer un emulador
antiguo ni un dashboard genérico.

---

## 2. Inventario de pantallas

### 2.1 Cabecera global (siempre visible)

| Elemento | Contenido | Notas |
|---|---|---|
| Marca | punto lima + `Pokeguarde` + etiqueta `Biblioteca de partidas` | `h1` 19 px |
| Navegación | `Biblioteca` / `Guardería` | botones pill; activo = fondo lima |
| Estado | `PKHeX.Core · .NET 10.0.404` o `servidor sin respuesta` | verde / rojo |

Es sticky, con blur, borde inferior. En móvil envuelve en tres filas (102 px).

### 2.2 Biblioteca sin partida seleccionada

- Panel izquierdo **Partidas** (320 px): botón recargar `↻`; zona de arrastre
  punteada con `.srm · .sav · .dsv (32 KB – 512 KB)` y enlace «o elige un
  archivo»; lista de saves con nombre, generación, juego, OT y contadores
  `✔ legales / ? no verificables / ✘ ilegales`.
- Panel derecho: placeholder «Selecciona una partida para ver el inventario.»

### 2.3 Detalle de partida (pestañas)

Cabecera: nombre de archivo, chip «ida y vuelta idéntica» / «no escribible»,
rejilla de 8 datos (Entrenador, ID, Dinero, Tiempo, Medallas, Pokédex, Pokémon,
Legalidad) y cuatro pestañas pill.

| Pestaña | Contenido | Controles |
|---|---|---|
| **Equipo** | rejilla de tarjetas de Pokémon: nivel, mote/especie, punto de legalidad, objeto | clic abre el modal |
| **Cajas** | una sección por caja, mismas tarjetas | clic abre el modal |
| **Mochila** | bolsillos con listas nombre/cantidad | ninguno |
| **Legalidad** | secciones «Ilegales» y «No verificables» con motivos en texto | ninguno |

Estados: cargando, error de red, sin Pokémon, sin cajas, sin mochila, todo legal.

### 2.4 Modal de Pokémon

Diálogo nativo de 720 px (92vw), scroll interno. Contiene:

- cabecera con nombre, especie, nivel, mote, variocolor y chip de veredicto;
- 6 datos (EXP, naturaleza, amistad, objeto, origen, OT/ID);
- estadísticas calculadas (PS…Velocidad), IV y EV en barras;
- movimientos con PP y PP Ups;
- motivos de ilegalidad o informe de PKHeX;
- destinos de exportación permitidos/bloqueados con su razón;
- botón primario «Llevar a la Guardería» + texto de ayuda.

### 2.5 Guardería

Dos columnas: escenario (1fr) + panel lateral (320 px); una columna ≤1100 px.

**Columna del escenario**

1. Marco tipo consola con el **lienzo 160×144** escalado a entero (2×–7×).
   Dentro: fondo `guarderia.png`, cuenco interactivo, mascota anclada por los
   pies, sueño y, en modo juego, el minijuego.
2. **HUD externo HTML** del mismo ancho que el lienzo: nombre, ánimo, reloj,
   puntos y seis barras (Comida, Felicidad, Energía, Higiene, Disciplina,
   Sueño). Las barras <25 parpadean.
3. Controles: seis acciones (Comer, Jugar, Limpiar, Acariciar, Reprender,
   Dormir/Despertar) con cuenta atrás y seis minijuegos (Carrera, Empuje, Muro,
   Chispa, Calma, Reflejos).
4. Aviso contextual de una línea.

**Columna lateral**

- Lista de mascotas (nombre, nivel, especie, ánimo; activa resaltada).
- Ficha: nivel, especie, naturaleza, edad, peso; seis barras de necesidades;
  entrenamientos, puntos, estado; rejilla de EV pendientes por stat y totales.
- Bloque de exportación: previsualizar (dry-run), informe de aplicado/retenido,
  escribir al save, ruta del archivo.
- Acciones: marcar activa, liberar (con confirmación).

**Minijuego**: pantalla completa del lienzo con título, nombre del juego, stat y
ronda, zona objetivo, cursor animado, feedback (PERFECTO/BIEN/FLOJO),
`ESPACIO / CLIC EN LA ZONA` y precisión. Todo el texto del lienzo es ASCII.

### 2.6 Estados vacíos y de error

- Guardería sin mascotas: `SIN MASCOTA` / `ADOPTA UN POKEMON` en el lienzo y
  placeholder con instrucciones.
- Cargando mascotas, error de API, exportación bloqueada por tope legal,
  exportación sin cambios aplicables.

---

## 3. Navegación y flujo

```
Cabecera ── Biblioteca ── lista de saves ── detalle ── modal Pokémon ── adoptar
    └───── Guardería ── lista de mascotas ── ficha ── acciones / minijuego
                                          └─ exportar (dry-run → escribir)
```

- No hay rutas ni URL por pantalla: todo es una SPA de dos vistas que se
  muestran/ocultan (`#detail`, `#nursery`), más un `<dialog>`.
- «Volver» en la Guardería regresa a la biblioteca conservando la partida.
- La adopción desde el modal navega a la Guardería con esa mascota activa.
- El estado vive en memoria + SQLite local; recargar vuelve a la biblioteca.

---

## 4. Sistema visual actual

### 4.1 Tokens

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0f1410` | fondo con dos radiantes verdes |
| `--panel` | `#1a211a` | paneles |
| `--panel-2` | `#212a21` | tarjetas, filas |
| `--line` | `#33402f` | bordes (casi todo lleva borde) |
| `--ink` | `#e8efe2` | texto principal |
| `--muted` | `#93a58c` | texto secundario |
| `--accent` | `#9ee06a` | lima: enlaces, activo, botón primario, barras |
| `--bad` | `#e8795c` | errores e ilegales |
| `--warn` | `#e5c05a` | no verificable |
| `--good` | `#86cf6a` | legal / éxito |
| `--radius` | `14px` | paneles; el resto usa 6/8/10/12/999 |

### 4.2 Tipografía

- Una sola familia: `ui-monospace, "DejaVu Sans Mono", monospace`.
- Tamaños reales: **10, 11, 12, 13, 15, 16, 19, 20 px** (más 13.33/13.6 por
  defecto del navegador). No hay escala ni line-height sistemáticos.
- Datos y códigos comparten la misma mono que la interfaz.

### 4.3 Componentes

- Botones: `ghost` (borde + muted), `primary` (lima), `danger` (rojo),
  `train` (lima), tabs pill, chips de estado, barras de progreso, tarjetas de
  Pokémon, tarjetas de legalidad, dropzone, diálogo, HUD, marco de consola.
- Radios mezclados (6, 8, 10, 12, 14, 999) y sombras solo en marco y cabecera.

### 4.4 Movimiento

- Fundido día/noche de 1,2 s en el lienzo (20:00–06:00, si existe el asset).
- Parpadeo de necesidades bajas (`steps(1)`, 1 s).
- Cursor del minijuego y animación de la mascota por frames.
- No hay `prefers-reduced-motion`.

---

## 5. Evidencia medida

### Escritorio 1280×900

| Medida | Valor |
|---|---|
| Rejilla principal | `320px + 900px`, gap 16, padding 22 |
| Rejilla de Pokémon | 6 columnas de ~138 px |
| Datos de partida | 8 celdas |
| Modal | 720×774 px, contenido 943 px (scroll), cerrar 24×25 px |
| Pestaña Legalidad | 37 tarjetas, alto 3385 px |
| Cajas / Mochila | 6 secciones / 7 bolsillos; 2043 / 1610 px |
| Guardería | `904px + 320px`; lienzo 800×720; marco 822×742; HUD 800×72 |
| Celdas del HUD | 251 px cada una (3 columnas) |
| Controles | 2 filas; 17 botones <32 px de alto |
| Texto <11 px | 23 nodos en el detalle, 13 en el modal |

### Móvil 390×844

| Medida | Valor |
|---|---|
| Cabecera | 102 px (marca 362×22, nav 205×29, health 187×14) |
| Panel de partidas | 362 px; tarjeta de save 55 px |
| Detalle | cabecera 88 px; datos en 2 columnas de 151 px; tabs 26 px |
| Pokémon | 2 columnas de 162 px |
| Modal | 352×726 px |
| Guardería | lienzo 320×288 (2×), HUD 320×72, sin desborde horizontal |
| Objetivos táctiles | 17 botones <32 px; «volver» 28×25 px |

Contraste medido (WCAG AA): texto principal 15,85:1 sobre `--bg`; secundario
7,09:1; verde de estado 9,88:1. **El contraste no es el problema; el tamaño sí.**

---

## 6. Problemas detectados

### Accesibilidad (prioridad alta)

1. **Foco casi invisible.** No hay `:focus-visible`; el navegador dibuja
   `outline: auto 1px rgb(16, 16, 16)` sobre fondo `#0f1410` (≈1,1:1). Cualquier
   rediseño debe definir un anillo de foco de alto contraste.
2. **Lienzo inaccesible por teclado.** `#pg-canvas` no tiene `tabindex`, rol ni
   nombre; el minijuego responde a `Espacio` pero no se puede enfocar. En móvil
   depende del toque.
3. **Estado por color.** Los puntos de legalidad son `span` de 8 px con `title`;
   el veredicto no se anuncia como texto en la tarjeta.
4. **Objetivos táctiles pequeños.** Acciones de 29–31 px y botones de icono de
   24–28 px, por debajo de 44×44 px.
5. **Texto de 10 px** en chips, niveles y metadatos; 11 px en estados. Legible
   con buena vista, frágil en pantallas densas.
6. **HUD truncado.** La columna de etiqueta mide 62 px y «Disciplina» desborda
   (`scrollWidth > clientWidth`), invadiendo la barra.
7. **Parpadeo sin alternativa.** Las barras bajas parpadean y no hay
   `prefers-reduced-motion`.
8. **Diálogo sin nombre accesible** (`aria-labelledby` al `h2`) y cierre de 24 px.
9. **Mensajes de estado sin `aria-live`** (importación, errores, avisos).
10. **Sin selector de idioma** pese a existir ES/EN (40 claves traducidas).

### Diseño y distribución

11. **Monotonía tipográfica**: todo es monoespaciado, incluidos párrafos y
    botones; la interfaz se lee como terminal, no como producto cuidado.
12. **Dos lenguajes visuales sin puente**: el lienzo GBC de 4 colores convive
    con una UI verde neón; el marco parece un emulador pegado a un dashboard.
13. **Acento sobreutilizado**: el lima marca enlaces, tabs activas, botón
    primario, barras, salud y ánimo; nada destaca porque todo destaca.
14. **Ruido de bordes y radios**: casi cada bloque tiene borde y los radios
    varían sin sistema.
15. **Legalidad abrumadora**: 37 tarjetas seguidas, mensajes crudos de PKHeX en
    inglés y todo el texto de motivos en rojo; sin filtros, agrupación ni
    búsqueda. Es el mayor coste de lectura de la app.
16. **Densidad del detalle**: 8 datos + tabs + rejilla de 6 columnas sin
    jerarquía visual más allá del tamaño.
17. **Modal largo**: 943 px de contenido en 774 px; el cierre flota sobre el
    contenido y compite con la cabecera.
18. **Doble scroll**: la lista de partidas tiene scroll propio (60vh) dentro del
    scroll de página.
19. **Cabecera móvil de 102 px** sticky: se come un 12 % de un viewport de 844.
20. **Guardería móvil**: el HUD de 3 columnas a 320 px deja 251 px por celda pero
    solo 62 px para la etiqueta; los controles se parten en dos filas sin
    jerarquía acción/entrenamiento más allá de un separador invisible.
21. **Sin estados de carga con forma**: placeholders de texto, sin skeletons ni
    progreso.
22. **Sin marca más allá del punto lima**: no hay ilustración, iconografía ni
    personalidad fuera del lienzo.

### Responsive / i18n

23. Breakpoints en 1100, 900 y 720 px; no hay ajuste fino por debajo de 390 px.
24. Los textos EN pueden crecer ~30 %; tabs, chips y HUD están al límite
    (4 tabs en 332 px; «Disciplina» ya desborda en ES).
25. El canvas exige escala entera: 390 px de ancho ⇒ 2× (320 px). No se puede
    «estirar» a 360 px sin romper píxeles.

---

## 7. Restricciones técnicas duras

Un rediseño **no puede** cambiar esto sin una decisión posterior explícita:

1. **Lienzo 160×144** internos (GBC, 10:9), `imageSmoothingEnabled = false`,
   `image-rendering: pixelated`; escala CSS entera entre 2× y 7×.
2. **HUD fuera del lienzo**: el HUD es HTML y debe conservar el ancho exacto del
   lienzo (`160 × escala`). No se puede mover dentro del canvas sin cambiar el
   motor de render.
3. **Coordenadas del escenario**: `ROOM.walk` (franja caminable y suelo),
   `ROOM.sprite` 26×21, `ROOM.sleepSpot`, anclaje por los pies; el fondo es una
   imagen `guarderia.png` de 160×144 y el cuenco es el único objeto interactivo.
4. **No generar sprites ni cambiar el diseño de la habitación** en esta fase.
5. **i18n**: 207 claves ES (completas) y 40 EN con caída a español; el texto del
   canvas solo admite ASCII (fuente 3×5 propia) y las claves se aplican con
   `data-i18n` / `data-i18n-title` / `data-i18n-aria` y helpers dinámicos.
6. **Contratos de API**: `GET /api/health`, `GET/POST /api/saves*`,
   `GET /api/saves/:sha256/pokemon`, `GET/POST/DELETE /api/pets*`,
   `POST /api/pets/:id/action|train|active|export`, `GET /api/pets/:id/exports`,
   `GET /api/exports`, `GET /api/pets/games`.
7. **Datos**: `data/pokegotchi.db` no se publica, no se renombra y no se
   reinicializa; los saves viven solo en local.
8. **Stack**: Bun + TypeScript + CSS + Canvas, sin frameworks de UI; el servidor
   transpila y sirve `/app.js`, `/nursery.js`, `/pet-engine.js`, `/i18n.ts|js`,
   `/daynight.ts|js`. Un rediseño debe caber en un único `style.css` o en pocos
   archivos, sin añadir dependencias.
9. **Acciones y significados**: las seis necesidades, las siete acciones, los
   seis minijuegos, la exportación dry-run/escritura y los tres veredictos
   (legal / no verificable / ilegal) no cambian de comportamiento.

---

## 8. Requisitos del rediseño

**Debe conservar**

- Las dos vistas y su navegación; el modal de Pokémon; las cuatro pestañas.
- El lienzo 160×144 como héroe visual, con escala entera y sin filtrado.
- El HUD externo con las seis necesidades y el reloj.
- Todos los controles y estados existentes, incluida la exportación en dos pasos.
- Legibilidad de datos densos: stats, IV/EV, movimientos, legalidad.
- i18n ES/EN y textos de canvas en ASCII.

**Puede cambiar**

- Tipografía (híbrido sans para UI + mono para datos), escala y jerarquía.
- Paleta de la interfaz, manteniendo el lienzo GBC intacto.
- Estructura del detalle (subnavegación, resumen fijo, tablas).
- Presentación de la legalidad (filtros, agrupación, resumen, lenguaje claro).
- Estados vacíos, carga, errores y microcopy.
- Densidad, radios, sombras, iconografía y movimiento.

**Debe lograr**

- Que la pantalla se lea como «consola de bolsillo dentro de una app moderna»,
  no como un emulador con formularios.
- Que el escenario GBC sea el foco y la UI no compita con él.
- Que en móvil el pulgar llegue a todo y el HUD siga siendo legible.
- Accesibilidad AA: foco visible, objetivos ≥44 px, texto ≥12 px, estado no solo
  por color, movimiento reducible.

---

## 9. Referencias visuales

Capturas generadas durante la auditoría (no versionadas):

| Archivo | Pantalla | Qué muestra |
|---|---|---|
| `01-library-desktop.png` | Biblioteca | Cabecera, dropzone, dos partidas, placeholder |
| `02-detail-party-desktop.png` | Detalle · Equipo | Cabecera, 8 datos, tabs, 6 Pokémon |
| `03-modal-desktop.png` | Modal | Manaphy: stats, IV/EV, movimientos, exportación |
| `04-detail-boxes-desktop.png` | Detalle · Cajas | Secciones por caja |
| `05-detail-bag-desktop.png` | Detalle · Mochila | Bolsillos y cantidades |
| `06-detail-legality-desktop.png` | Detalle · Legalidad | Tarjetas de motivos |
| `07-nursery-desktop.png` | Guardería | Marco, lienzo, HUD, controles, ficha |
| `08-training-desktop.png` | Minijuego | Pantalla de juego dentro del lienzo |
| `09-library-mobile.png` | Biblioteca móvil | Cabecera en 3 filas, panel único |
| `10-detail-mobile.png` | Detalle móvil | Datos a 2 columnas, tabs, tarjetas |
| `11-modal-mobile.png` | Modal móvil | Diálogo 352×726 |
| `12-nursery-mobile.png` | Guardería móvil | Lienzo 2×, HUD, controles |

### Wireframes de referencia

```
ESCRITORIO
┌──────────────────────────────────────────────────────────────┐
│ ● Pokeguarde  Biblioteca de partidas   [Biblioteca][Guardería]  PKHeX │
├───────────────┬──────────────────────────────────────────────┤
│ Partidas    ↻ │ gen4-heartgold-spain.srm      [ida y vuelta] │
│ ┌───────────┐ │ ┌────┬────┬────┬────┬────┬────┬────┬────┐   │
│ │ dropzone  │ │ │ OT │ ID │ ₽  │ t  │ 🏅 │Dex │Mon │Leg │   │
│ └───────────┘ │ └────┴────┴────┴────┴────┴────┴────┴────┘   │
│ ┌───────────┐ │ (Equipo) (Cajas) (Mochila) (Legalidad)       │
│ │ save 1    │ │ ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐        │
│ └───────────┘ │ │mon ││mon ││mon ││mon ││mon ││mon │        │
│ ┌───────────┐ │ └────┘└────┘└────┘└────┘└────┘└────┘        │
│ │ save 2    │ │                                              │
│ └───────────┘ │                                              │
└───────────────┴──────────────────────────────────────────────┘

GUARDERÍA
┌──────────────────────────────────────────────┬───────────────┐
│            ╔══════════════════╗              │ Mascotas      │
│            ║   lienzo 160×144 ║              │ ┌───────────┐ │
│            ║   (2×–7× entero) ║              │ │ ELECTRODE │ │
│            ╚══════════════════╝              │ └───────────┘ │
│            ┌──────────────────┐              │ Ficha         │
│            │ HUD: nombre/ánimo│              │ necesidades   │
│            │ 6 barras         │              │ EV pendientes │
│            └──────────────────┘              │ Exportar      │
│  (Comer)(Jugar)(Limpiar)(Acariciar)…         │ Activar/Liberar│
└──────────────────────────────────────────────┴───────────────┘

MÓVIL
┌──────────────────────┐
│ ● Pokeguarde         │
│ [Biblioteca][Guard.] │
│ PKHeX · .NET         │
├──────────────────────┤
│ Partidas          ↻  │
│ ┌──────────────────┐ │
│ │ dropzone         │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ save             │ │
│ └──────────────────┘ │
├──────────────────────┤
│ detalle / guardería  │
└──────────────────────┘
```

---

## 10. Prompt maestro para Google Stitch

> Pega el bloque en inglés tal cual. Adjunta las capturas 01–12 como referencia
> y pide una pantalla por iteración (Biblioteca, Detalle, Modal, Guardería).

```text
Design a polished, modern web app UI for "Pokeguarde", a local Pokémon save
library with a GBC-style tamagotchi daycare. The product has two modes:
Library (browse a save file: trainer, money, badges, Pokédex, party, boxes,
bag, legality) and Daycare (a 160x144 pixel-art room where one adopted Pokémon
eats, plays, cleans, sleeps and trains through mini-games, then exports real
EVs to a new copy of the save).

Visual direction: "a Game Boy Color screen inside a beautifully crafted modern
app". Keep the pixel canvas as the hero; the surrounding UI must feel current,
calm and precise — not a retro emulator skin and not a generic dashboard.
Think tactile handheld console bezel, soft dark surfaces, warm cream accents,
one confident accent color, generous spacing, crisp data typography.

Palette: deep forest/charcoal background, slightly lighter panels, low-contrast
hairline borders, warm off-white text, a single lime-green accent for primary
actions and live values, amber for "unverified", coral for "illegal/error".
The canvas itself keeps its 4-color GBC palette (light cream, mid green, dark
green, near-black). Bridge the two by echoing the GBC cream in headings and the
GBC green in the bezel, not by flooding the UI with neon.

Typography: pair a clean geometric sans for UI text with a monospace only for
data, IDs, hashes, file names and canvas-adjacent labels. Fluid type scale
(12/14/16/20/28), clear hierarchy, no 10px text. Data tables must stay
scannable.

Layout:
- Desktop: top bar (logo, Library/Daycare segmented nav, engine status);
  Library = 320px save rail + fluid content; content header with save meta and
  a compact stat strip (8 values); pill tabs (Party, Boxes, Bag, Legality);
  responsive card grid for Pokémon with level, nickname/species, held item and
  a legality badge that is icon + text, never color alone. Legality view groups
  issues with filters (all/illegal/unverified), counts and human-readable
  messages.
- Pokémon detail: large accessible dialog or side sheet, sticky header with
  name/species/level/verdict, stat blocks, IV/EV bars, moves, origin, export
  targets, primary "Take to Daycare" action.
- Daycare: two columns (stage + 320px pet rail). Stage = handheld bezel around
  the 160x144 canvas, an external HUD directly below with the same width
  (name, mood, clock, points, six labeled bars). Controls split into "Care"
  (feed, play, clean, pet, scold, sleep) and "Train" (six mini-games), with
  clear cooldown states. Rail = pet switcher, compact pet sheet, pending EV
  grid, two-step export panel (preview → write) with status.
- Mobile 390x844: single column, sticky compact header (max 64px), save rail
  becomes a horizontal card strip or collapsible list, tabs scroll horizontally
  if needed, all tap targets >= 44px, HUD stays under the canvas at exactly
  canvas width, controls wrap into labeled groups.

Required states: empty library, loading skeletons, API error, empty daycare,
pet asleep, low needs, cooldown, training mini-game, export preview with
applied/withheld values, export success with file path, illegal Pokémon blocked.

Accessibility: visible 2px focus ring, keyboard-operable canvas (focusable with
a clear "press Space" hint), status text plus icon (not color-only), >= 4.5:1
contrast, 12px minimum text, reduced-motion support, labelled dialog.

Hard constraints — do not change: canvas internal size 160x144 (10:9), integer
CSS scale 2x-7x, nearest-neighbor (no smoothing), HUD outside the canvas and
exactly canvas-width, room background is a 160x144 illustration, pet anchored by
its feet, no new sprites, dark UI only, Spanish-first copy with English
fallback, no new UI frameworks, all existing actions/states preserved.

Deliver: design tokens, component library (buttons, chips, bars, cards, tabs,
dialog, bezel, HUD, export panel), and high-fidelity screens for Library,
Library detail (4 tabs), Pokémon modal, Daycare, and training mini-game, in
desktop and mobile. Avoid glassmorphism, neon gradients, oversized hero
sections and decorative blob illustrations.
```

### Ajustes por pantalla (opcional, para iterar)

- **Biblioteca**: convertir el dropzone en una tarjeta secundaria cuando ya hay
  partidas; dar a cada save un resumen visual (juego, generación, progreso) y
  un badge de legalidad con texto.
- **Detalle**: fijar un resumen (nombre, OT, progreso) y mover los 8 datos a una
  franja compacta; en Legalidad, empezar por un resumen 68/17/20 con filtros.
- **Modal**: dos columnas en escritorio (identidad/stats a la izquierda,
  movimientos/legalidad a la derecha) y una sola en móvil; cierre de 44 px.
- **Guardería**: bezel con detalles físicos (tornillos, LED, etiqueta), HUD como
  tarjeta de estado, acciones agrupadas Cuidar/Entrenar, ficha lateral con
  jerarquía y exportación plegable.
- **Minijuego**: mantener el canvas puro; añadir fuera de él una barra de
  progreso de ronda y el botón de acción accesible.

---

## 11. Anexo: método y reproducción

- Auditoría de solo lectura sobre la app en ejecución; la navegación no escribe
  en SQLite (las rutas de consulta son GET; las acciones no se ejecutaron).
- Medidas obtenidas con `getBoundingClientRect`, `getComputedStyle` y contraste
  WCAG calculado en el navegador; no se modificó ningún archivo de la app.
- Capturas: `agent-browser`, viewport 1280×900 y 390×844, sesión aislada.
  Para regenerarlas: `bun run dev`, abrir la app, recorrer Biblioteca (Equipo,
  Cajas, Mochila, Legalidad), modal y Guardería, y capturar con
  `agent-browser screenshot`. No se completó ningún minijuego ni exportación.
- Este documento es el único artefacto añadido; no se implementó el rediseño ni
  se tocó el motor, la base de datos o los saves.
