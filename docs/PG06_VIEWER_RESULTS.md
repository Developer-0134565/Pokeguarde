# PG-06 Fase C — Resultados del visor aislado

**Estado:** IMPLEMENTADO Y VERIFICADO en Fase C y **CONSOLIDADO EN FASE D** el
19-nov-2026. El visor es **independiente** de la Guardería funcional: no toca
`nursery.ts`, `pet-engine.ts`, la API, SQLite, saves, fixtures ni exportaciones.
**No está integrado** en la app principal.

## 1. Ejecución

Requisitos: Bun y un navegador local. Los sprites **no están en Git**; se leen desde
`/tmp/opencode/pg06/extracted/Gen 1-7 OV SPrites` (o desde `PG06_SPRITE_DIR`).

```bash
# Si hiciera falta regenerar la copia temporal (verifica SHA-256 del 7z):
bash scripts/pg06-extract.sh

# Arrancar el servidor aislado:
PORT=8790 bun scripts/pg06-viewer.ts
# Abrir http://127.0.0.1:8790
```

Variables opcionales:

- `PG06_SPRITE_DIR` — directorio con los PNG originales.
- `PG06_META` — metadatos (`sprite-metadata.json`, por defecto en `/tmp/opencode/pg06/`).
- `PG06_POKEAPI` — CSV de alturas cacheado (por defecto en `/tmp/opencode/pg06/`).

Comprobaciones:

```bash
bun scripts/pg06-viewer-check.ts   # 36/36 tras la Fase D
bun run check                      # motor, día/noche, i18n y sidecar: todo correcto
```

## 2. Archivos nuevos

| Ruta | Función |
|---|---|
| `apps/web/viewer.html` | Interfaz aislada (carcasa roja / LCD), sin dependencias de la app principal. |
| `apps/web/src/sprite-viewer.ts` | Estado, carga con caché, dibujo, comparaciones, animación, arrastre del ancla. |
| `apps/web/src/sprite-render.ts` | Funciones puras: rects alfa, digests, escala por tier, nearest-neighbor, paletas, anclaje. |
| `scripts/pg06-viewer.ts` | Servidor estático en `127.0.0.1:8790`; transpila TS con `Bun.Transpiler`. |
| `scripts/pg06-extract.sh` | Extracción verificada del 7z a `/tmp` (no modifica el original). |
| `scripts/pg06-viewer-check.ts` | 36 pruebas puras del render (tras Fase D). |
| `docs/SPRITE_AUDIT.md` | Auditoría de Fase A (actualizada con Fases C y D). |
| `docs/SPRITE_RENDERING_RFC.md` | Arquitectura; prototipo marcado como implementado y sin integrar. |
| `docs/PG06_VIEWER_RESULTS.md` | Este documento. |

**Checkpoint Git:** los nueve archivos anteriores se incluyeron en un commit local
de `main` con mensaje `feat(pg06): visor aislado de sprites overworld y documentación
de auditoría`. No se incluyeron sprites, derivados, temporales ni datos privados.
Estado Git final:

```
## main...origin/main
?? docs/stitch/reference/
```

`docs/stitch/reference/` era preexistente y sigue intacto y **sin seguimiento**,
conforme a la instrucción de no incluirlo automáticamente. No hay PNG de sprites
ni derivados dentro del repositorio.

## 3. Funcionalidad verificada

| Requisito | Implementación | Evidencia |
|---|---|---|
| Canvas lógico 160×144 y fondo original | `#scene` con `imageSmoothingEnabled=false`, imagen `/room.png` servida desde `apps/web/assets/room/guarderia.png` | capturas `01`, `08`, `09`; `image-rendering: pixelated` en CSS |
| 16 frames y coordenadas reales | `frameRects()` mide 16 rectángulos por corridas de alfa > 8; celdas vacías `w=h=0` | Electrode: 16 celdas, 0 vacías, rect `x10 y18 w44 h42`, digest `a93e859d` |
| Escalas 16/24/40/64 | `scaleForTier()` aplica `factor = tier / alturaVisible`, redondeo a enteros y anclaje por pies | Electrode visible 44×42 → factor 0,952 → destino 42×40 a tier 40; montaje `05-escalas.png` |
| Tres paletas | `rgba` (defecto), `gbc4` (4 colores exactos del nursery) y `gbc16` (16 tonos derivados, aproximación no oficial) | conteo en navegador: RGBA 9 colores visibles, GBC4 **4**, GBC16 8 usados; montaje `04-paletas.png` |
| Ancla de pies ajustable | cruz y caja opcionales, sliders X/Y, arrastre sobre el canvas, botón de restaurar | `footX/footY` 75/103 → 60/95 → restaurado 75/103 |
| Comparaciones | grupos «4 mascotas» (101/490/034/081), «Extremos» (095/321/595/810/643/249), «Shiny actual» y checkboxes individuales | capturas `02-cuatro-mascotas.png`, `03-extremos.png`, `06-shiny.png` |
| Animación | botones Animar/Parar, 4 frames por fila, velocidad configurable 280 ms por defecto | `frameInRow` 0 → 2 tras 700 ms, parado en 2; `playing:false` |
| Direcciones y shiny | selector de fila con etiquetas confirmadas; `readout` informa coincidencia alfa normal/shiny | ver §4 y §5 |
| Aislamiento | servidor propio, sin importar módulos de producción ni consultar `/api/*` | `bun run check` sigue pasando; diff limitado a archivos nuevos |

## 4. Direcciones laterales — RESUELTO

El análisis de siluetas asimétricas en `001.png` (bulbo de Bulbasaur) y `025.png`
(cola de Pikachu) confirma el orden de filas:

| Fila | Dirección | Evidencia |
|---:|---|---|
| 0 | abajo | silueta frontal simétrica, cara visible |
| 1 | **izquierda** | bulbo/cola a la derecha → cuerpo mirando a la izquierda |
| 2 | **derecha** | bulbo/cola a la izquierda → cuerpo mirando a la derecha |
| 3 | arriba | silueta trasera, sin cara |

Las etiquetas del visor se actualizaron en consecuencia. Montaje:
`07-direcciones.png`; contacto 4×4: `pikachu-sheet.png`.

## 5. Hipótesis shiny — CONFIRMADA con matices

- En el visor, las 7 especies probadas (101, 490, 034, 081, 001, 025, 810)
  devuelven `alfa normal/shiny idéntica: 16/16`.
- Sobre los metadatos completos: de **806** pares `NNN.png`/`NNNs.png`,
  **683** tienen la alfa idéntica en los 16 frames, **49** coinciden parcialmente
  (4–14 frames) y **74** no coinciden en ninguno.
- Conclusión: `s` es shiny en la inmensa mayoría de los casos (misma silueta,
  colores distintos), pero los 123 pares atípicos requieren revisión: pueden ser
  formas distintas o variantes con silueta propia. No se ha «arreglado» ninguno.

## 6. Encaje y escala

- Las cuatro mascotas reales (Electrode, Manaphy, Nidoking, Magnemite) caben
  holgadamente en la zona caminable (`x61..89`, pie `y103`) a 16–40 px.
- A 64 px el sprite ocupa `y39..103` (44 % del lienzo) y tapa ventana/mostrador;
  en Wailord y Reshiram además roza la cama (`x≥110`). Por eso 40 px es el
  equilibrio propuesto para la Guardería y 64 px debe reservarse a casos
  puntuales con override.
- El escalado se calcula siempre desde el rectángulo alfa, no desde el tamaño de
  la celda: una celda de 128 px con 116 px visibles (Kyurem) no se trata igual
  que una celda de 64 px con 42 px visibles (Electrode).

## 7. Fase D — consolidación y validación

### 7.1. Las cuatro categorías con siete especies

Medición en navegador sobre el **fotograma 0** (fila «abajo»). `visible` es el
rectángulo alfa medido; la escala se calcula como `tier / visible.h` con redondeo
a enteros. (La tabla de `SPRITE_AUDIT.md` usa la altura visible **máxima** entre
los 16 frames, por eso algunos valores difieren en 1–2 px.)

| ID | Especie | Altura | Celda / hoja | Visible (ancho×alto) | Tier sugerido | 16 px | 24 px | 40 px | 64 px |
|---:|---|---:|---|---:|---:|---:|---:|---:|---:|
| 101 | Electrode | 1,2 m | 64 / 256 | 44×42 | **40** | 17×16 | 25×24 | 42×40 | 67×64 |
| 490 | Manaphy | 0,3 m | 64 / 256 | 32×38 | **16** | 13×16 | 20×24 | 34×40 | 54×64 |
| 034 | Nidoking | 1,4 m | 64 / 256 | 38×42 | **40** | 14×16 | 22×24 | 36×40 | 58×64 |
| 081 | Magnemite | 0,3 m | 64 / 256 | 34×24 | **16** | 23×16 | 34×24 | 57×40 | 91×64 |
| 595 | Joltik | 0,1 m | 64 / 256 | 38×32 | **16** | 19×16 | 29×24 | 48×40 | 76×64 |
| 095 | Onix | 8,8 m | 64 / 256 | 44×58 | **64** | 12×16 | 18×24 | 30×40 | 49×64 |
| 321 | Wailord | 14,5 m | 128 / 512 | 60×70 | **64** | 14×16 | 21×24 | 34×40 | 55×64 |

Las siete especies tienen **0 celdas vacías** y los 16 rectángulos quedan dentro
de la hoja. Conclusiones:

- A 16 px el ancho máximo es 23 px (Magnemite); a 24 px, 34 px; a 40 px, 57 px;
  a 64 px, 91 px (Magnemite, por su silueta ancha) y 67 px (Electrode).
- Con el pie en `y=103`, un tier 64 ocupa `y=39..103` en todos los casos y tapa
  ventana/mostrador. Tier 40 deja el tope en `y=63` y es el equilibrio para las
  cuatro mascotas. Tier 16 puede ser demasiado pequeño para especies como Magnemite.
- La altura de Pokédex decide el tier sugerido, pero la silueta manda: Onix mide
  8,8 m y usa celda 64, mientras Wailord usa celda 128. El renderizador ya lee
  `cellW`/`cellH` y el rectángulo alfa, no la celda completa.
- Capturas: `10-tier-16-7species.png`, `10-tier-24-7species.png`,
  `10-tier-40-7species.png` y `10-tier-64-7species.png` (todas con RGBA y las
  siete especies lado a lado).

### 7.2. GBC16: por qué aparecen menos de 16 tonos

`GBC16` tiene **16 entradas únicas** (4 bases de GBC4 × 4 niveles
`[0,45, 0,7, 1, 1,2]`). El cuantizador elige el tono más cercano por distancia
RGB al cuadrado; como las paletas originales están concentradas en unas pocas
zonas de color, varios candidatos nunca ganan. En electrodos medidos: Electrode
usa **7 de 16** tonos en el frame 0, Manaphy 6, Nidoking 8, Magnemite 7, Joltik
8, Onix 6 y Wailord 5. Con GBC4 se usan 4 de 4 y con RGBA 8 colores en ese frame.

La etiqueta del selector se corrigió a **«GBC · 16 tonos derivados»** (antes
«16 colores», que sugería que todos aparecían) y el `readout` muestra ahora
`tonos usados en este frame: N de 16`. El algoritmo **no se cambió**: 16 es el
tamaño de la paleta y el subconjunto usado es un resultado esperado, no un error.
Captura: `11-gbc16-readout.png`. RGBA sigue siendo la paleta predeterminada.

### 7.3. Dimensiones de hoja y recorte de animación

Además de las 12 fichas del catálogo (celdas 64 y 128 en hojas 256 y 512), se
cargaron hojas atípicas reales con sus celdas correctas:

| Archivo | Hoja | Celda | Frames fuera de hoja/vacíos |
|---|---|---|---:|
| `003-Fighter03.png` | 128×192 | 32×48 | 0 |
| `010.png` | 192×192 | 48×48 | 0 |
| `039.png` | 208×208 | 52×52 | 0 |
| `099-Monster13.png` | 384×384 | 96×96 | 0 |

`frameRects()` respeta `cellW`/`cellH` y recorta solo dentro de los límites de la
imagen; ninguno de los 16 frames se sale ni se recorta. Las dos primeras filas
de la tabla tienen rectángulos que ocupan la celda completa porque esas hojas no
tienen relleno transparente: son candidatas a exclusión o conversión en un
hipotético build, no al visor actual.

### 7.4. Comprobaciones añadidas

`scripts/pg06-viewer-check.ts` pasó de 18 a **36 pruebas**: incluye las cuatro
categorías de escala, unicidad de GBC16, recuento de tonos usados, hojas
128×192 y 208×208, rectángulos dentro de la hoja y 16 frames sin vacíos.

## 8. Anomalías y decisiones pendientes

1. **Licencia**: el 7z no incluye licencia. Ningún sprite ni derivado se ha
   versionado. Sigue bloqueada cualquier integración o redistribución.
2. **Paleta**: el paquete es RGBA a color y las maquetas Stitch piden LCD GBC.
   `GBC16` es una aproximación derivada de la paleta de 4 colores, no una paleta
   oficial. Decidir antes de integrar.
3. **Hojas inválidas**: `54D.png` (sin transparencia) y `600_REAL.png` (12 celdas
   vacías) quedan fuera del catálogo por diseño.
4. **Numeración**: el catálogo usa los IDs del paquete; hay IDs 810–815 y faltan
   751/807/814. Validar el mapa completo antes de usar `speciesId` como clave.
5. **Shiny atípicos**: 123 pares requieren revisión (§5).
6. **`guarderia.zip`**: se inspeccionó en solo lectura (`guarderia.png` 1200×896 y
   `DESIGN.md` del sistema Stitch «Pocket Tech 1999»). **No se usa**: el visor
   emplea el fondo original 160×144 del repositorio.
7. **Guardería principal**: no se integra. Cacas, night asset y reglas de
   aparición siguen sin aprobación.

## 9. Capturas

Todas en `/tmp/opencode/pg06/screenshots/` (fuera de Git):

- `01-inicial.png` — estado inicial, 1280×900.
- `02-cuatro-mascotas.png` — comparación de las cuatro mascotas reales.
- `03-extremos.png` — Onix, Wailord, Joltik, Grookey, Reshiram, Lugia.
- `04-paletas.png` — RGBA / GBC4 / GBC16 lado a lado.
- `05-escalas.png` — 16 / 24 / 40 / 64 px sobre Electrode.
- `06-shiny.png` — Electrode normal frente a shiny.
- `07-direcciones.png` — Pikachu en las cuatro filas de dirección.
- `08-final-desktop.png`, `09-final-mobile.png` — comprobación final de layout
  (390×844 sin desbordamiento horizontal: `scrollWidth = 390`, canvas CSS 296 px).
- `10-tier-16-7species.png`, `10-tier-24-7species.png`, `10-tier-40-7species.png`,
  `10-tier-64-7species.png` — validación de Fase D: siete especies, RGBA y un tier
  por captura.
- `11-gbc16-readout.png` — lectura de «7 de 16 tonos» en el `readout`.
- Capturas intermedias: `pikachu-sheet.png`, `dir-0..3.png`, `pal-*.png`,
  `shiny-*.png`, `tier-*.png`.

## 10. Comprobaciones

- `bun scripts/pg06-viewer-check.ts` → **36/36 correctas** tras la Fase D.
- `bun run check` → todos los bloques correctos; sidecar .NET **0 avisos / 0 errores**.
- Endpoints HTTP 200: `/`, `/sprite-viewer.js`, `/sprite-render.js`,
  `/catalog.json`, `/room.png`, `/sprites/101.png`, `/sprites/101s.png`.
- Navegador: `window.__pg06.ready === true`; snapshot con todos los controles;
  animación, paletas, ancla, comparaciones y direcciones comprobadas.
- No se ejecutaron `git pull`, `reset`, `clean` ni escrituras en `data/`,
  `fixtures/`, saves, API ni Guardería funcional.
