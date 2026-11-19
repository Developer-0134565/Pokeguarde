# PG-06 — Auditoría de sprites overworld (Fase A)

**Estado:** auditoría **READ-ONLY** completada el 19-nov-2026. No se ha modificado el
motor, la API, la BD, los saves, la Guardería funcional ni el repositorio de sprites.
**Fecha:** 2026-11-19. **Responsable:** OpenCode/Sol.

## 0. Alcance y conservación

- Archivo de entrada: `/home/missingn0/Descargas/Gen 1-7 OV SPrites.7z`.
  - Tamaño 6.812.720 bytes; SHA-256 `525ee41f6f6667f6d3ff9c1cb96d0eb4ba57a25e0f5f19b73d1c4ee9598d6d7c`.
  - `7z l`: tipo 7z, `Method = LZMA2:24`, `Solid = +`, 1 bloque, 1 carpeta, 2937 archivos.
  - El archivo original **no se ha modificado**. Solo se listó (`7z l`) y se extrajo una
    copia a `/tmp/opencode/pg06/extracted/` para medir píxeles.
- Estado Git al inicio: `main` @ `214541a`, `origin/main` sin divergencia (`0 0`),
  árbol rastreado limpio, único directorio sin seguimiento `docs/stitch/reference/`
  (13 archivos de los mockups Stitch). **No se tocó.** No hay stashes.
  Checkpoint `origin/checkpoint/pre-stitch-2026-11-19` @ `52b8dd7`.
- Este documento, `SPRITE_RENDERING_RFC.md` y `PG06_VIEWER_RESULTS.md` son
  documentación; el visor y sus scripts son archivos nuevos y aislados. **No se ha
  añadido ningún PNG al repositorio.**

## 1. Inventario verificado

| Concepto | Resultado |
|---|---|
| Entradas del archivo | 2937 PNG + 1 carpeta raíz `Gen 1-7 OV SPrites` |
| Tamaños de hoja | 256×256: **2758**; 512×512: **158**; 192×192: **8**; 208×208: **7**; 128×192: **5**; 384×384: **1** |
| Modos PIL | RGBA: 2927; paleta `P`: 10 |
| Transparencia | Los 2927 RGBA tienen alfa con rango 0..255. De los 10 `P`: 6 con tabla de transparencia `bytes`, 3 con índice entero y **1 sin transparencia** (`54D.png`). |
| Tamaño sin comprimir | 12.652.881 bytes (≈12,1 MB) |
| Archivos de licencia/readme dentro del 7z | **Ninguno** |
| Rutas inseguras (`..`, absolutas, `\`) | 0 |

### Cuadrícula real

**No se asumió 4×4**: se verificó con corridas de columnas/filas completamente
transparentes. Ejemplos medidos (`001.png`, celda 64): columnas vacías `0-11, 52-75,
116-139, 180-203, 244-255`; filas vacías `0-29, 64-93, 126-157, 190-223`. En
`810.png` (celda 128) los cortes caen en `0/128/256/384/512`. Las 2937 imágenes
encajan en una cuadrícula **4×4**; los tamaños de celda son:

| Celda | Archivos |
|---|---:|
| 64×64 | 2758 |
| 128×128 | 158 |
| 48×48 | 8 |
| 52×52 | 7 |
| 32×48 (128×192) | 5 |
| 96×96 | 1 |

**Celda ≠ dibujo visible.** El rectángulo alfa de una celda de 64 px mide
normalmente 24–56 px de alto; en celdas de 128 px, 80–116 px. La medición
completa está en `/tmp/opencode/pg06/sprite-metadata.{csv,json}` (16 rectángulos
por archivo, digest por fotograma, altura/pie y número de frames únicos).

### Convención de nombres (inferida de patrones + píxeles)

- `NNN.png`: especie y forma por defecto; `NNN_0.png` suele ser **idéntico byte a byte**
  (forma 0). Ejemplo: `001.png` y `001_0.png` comparten SHA-256.
- `NNNs.png`: **variante shiny**, muy probable. Evidencia: `001.png` y `001s.png`
  tienen los **16 digests alfa idénticos** (misma silueta) pero cambian todos los
  colores pares dominantes (p. ej. `(104,208,120)` → `(160,208,56)`). Lo mismo en
  `003`, `025` y `810`. No se ha confirmado con una ficha oficial.
- `_1`, `_2`, …: índice de forma/variante (muchos son copias sin cambios, p. ej.
  `649_1..4` = `649`).
- Sufijos `-sp`, `-wt`, `-at`, `-sm`, `(male)`, `(female)`, `f####`, `+`, `D`:
  formas o personajes especiales; no todos son Pokémon estándar
  (`003-Fighter03`, `029-Cleric05`, `080+103`, `099-Monster13`, `105-Civilian05`,
  `108-Civilian08`, `118-Civilian18`).
- Duplicados: **1933 hashes únicos**, 995 grupos duplicados, **1004 copias extra**
  (principalmente `_0`/`s_0` y formas sin cambios).

### Animación de 16 fotogramas

- Organización inferida: **4 filas de dirección × 4 columnas de animación**.
- Orden de dirección inferido de las siluetas en ASCII (Pikachu `025` y
  Bulbasaur `001`): fila 0 = frente/abajo (simétrica), filas 1 y 2 = laterales
  espejo (cola/bulbo a un lado), fila 3 = espalda/arriba. El **sentido exacto
  izquierda/derecha de las filas 1 y 2 queda pendiente de confirmación visual**
  con un visor de imágenes; no se afirma como dato cerrado.
- Dentro de cada fila hay un ciclo de 4 pasos con balanceo vertical alterno:
  en celdas de 64 px los pares 0/2 y 1/3 cambian ~2 px en `y`; en celdas de 128
  px el balanceo es de ~2–4 px. Los pares no son idénticos en general: p. ej.
  `001.png` fila 0 tiene 96 píxeles distintos entre el frame 0 y el 2.
- Distribución de frames únicos por hoja: 16 únicos en 2021 hojas; 12 en 308;
  8 en 291; 6 en 95; el resto valores menores. En 435 hojas se cumple
  exactamente `frame0 == frame2` y `frame1 == frame3` en las 4 filas.
- Casos especiales: `100.png` (Voltorb) tiene **4 frames únicos**, es decir una
  imagen estática por dirección; `101.png` (Electrode) tiene 6; `595.png` (Joltik)
  tiene 8; `600_REAL.png` solo tiene la fila 0 y **12 celdas vacías**.

### Anomalías registradas

1. `600_REAL.png`: 12 celdas vacías; descartar del manifest o marcar `incomplete`.
2. `54D.png`: modo `P` **sin transparencia** y un solo frame repetido 16 veces;
   descartar.
3. `715_0.png` y `718_0.png`: modo `P` con transparencia; requieren conversión a RGBA.
4. Cinco hojas de 128×192 y una de 384×384 con celdas no cuadradas; el render debe
   leer `cellWidth`/`cellHeight` del manifest, no asumir 64.
5. El archivo se llama «Gen 1-7» pero contiene IDs **810, 811, 812, 813 y 815**
   ( especies de Gen 8 en la numeración actual ) con paletas atípicas (incluida una
   hoja en escala de grises, `812.png`). Origen/versión a confirmar.
6. Faltan los IDs **751, 807 y 814** en el rango 1..815.
7. La numeración de `100.png`/`101.png` coincide con la Pokédex (Voltorb/Electrode,
   comprobado por colores dominantes), pero la presencia de IDs 810–815 y la
   ausencia de 751/807/814 aconsejan validar el mapa completo antes de usarlo como
   clave. **No se corrigió ningún archivo.**

## 2. Altura oficial y silueta

**Fuente:** `https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon.csv`
(consultado el 19-nov-2026, 47.082 bytes, cacheado solo en
`/tmp/opencode/pg06/pokeapi-pokemon.csv`). `height` viene en decímetros y se
convirtió a metros. PokéAPI publica una *fair use policy* que pide **cachear
localmente**; por eso no se hicieron 815 peticiones ni se añadió el CSV al repo.
Las formas heredan la altura de su especie base (aproximación documentada).

Distribución de la altura visible máxima por fotograma, agrupada por el umbral
propuesto de altura de Pokédex:

| Altura Pokédex | n | Mediana visible (px de celda) | Rango | Tamaños de celda frecuentes |
|---|---:|---:|---:|---|
| ≤ 0,4 m | 483 | 36 | 20–108 | 64 (456), 128 (14) |
| 0,5–0,9 m | 910 | 38 | 22–126 | 64 (896), 128 (12) |
| 1,0–1,9 m | 1221 | 48 | 32–126 | 64 (1199), 128 (17) |
| ≥ 2,0 m | 323 | 56 | 22–126 | 64 (207), 128 (115) |

**Conclusión:** la altura de Pokédex es una pista **débil**. El tamaño de la celda
sigue al detalle artístico, no a la altura: `810` mide 0,3 m pero usa celda de 128
con 108 px visibles, mientras Onix (`095`, 8,8 m) usa celda de 64 con 60 px
visibles. El tier final debe calcularse con el **rectángulo alfa medido**, con la
altura oficial solo como prior y con `overrides` explícitos.

## 3. Encaje en el Canvas 160×144

Referencias reales del renderer actual (`apps/web/src/nursery.ts`): fondo
`/assets/room/guarderia.png` (160×144 RGBA, 75 colores), `ROOM.walk =
{minX:61,maxX:89,groundY:103}`, caja de arquetipo `sprite = {w:26,h:21}`,
cuenco en `x14..36, y104..112`, cama en `x110..156, y84..112`, `imageSmoothingEnabled =
false`, escala entera y anclaje por los pies.

Simulación con el pie fijo en `y=103` y centro `x=75`, suponiendo los umbrales
propuestos (≤0,4→16, 0,5–0,9→24, 1,0–1,9→40, ≥2,0→64) y escala uniforme según
la altura visible medida:

| ID | Especie | Altura | Archivo | Celda | Visible alto×ancho | Escala | Ancho final | Tope y |
|---:|---|---:|---|---|---:|---:|---:|---:|
| 101 | Electrode | 1,2 m | `101.png` | 64×64 | 42×44 | 40/42 = 0,95 | 42 | 63 |
| 490 | Manaphy | 0,3 m | `490.png` | 64×64 | 38×36 | 16/38 = 0,42 | 15 | 87 |
| 34 | Nidoking | 1,4 m | `034.png` | 64×64 | 42×48 | 40/42 = 0,95 | 46 | 63 |
| 81 | Magnemite | 0,3 m | `081.png` | 64×64 | 26×34 | 16/26 = 0,62 | 21 | 87 |
| 95 | Onix | 8,8 m | `095.png` | 64×64 | 60×52 | 64/60 = 1,07 | 55 | 39 |
| 321 | Wailord | 14,5 m | `321.png` | 128×128 | 70×82 | 64/70 = 0,91 | 75 | 39 |
| 595 | Joltik | 0,1 m | `595.png` | 64×64 | 32×38 | 16/32 = 0,50 | 19 | 87 |
| 643 | Reshiram | 3,2 m | `643.png` | 128×128 | 110×124 | 64/110 = 0,58 | 72 | 39 |
| 646 | Kyurem | 3,0 m | `646.png` | 128×128 | 116×116 | 64/116 = 0,55 | 64 | 39 |
| 249 | Lugia | 5,2 m | `249.png` | 128×128 | 80×88 | 64/80 = 0,80 | 70 | 39 |

- Un sprite de 64 px ocupa el 44 % de la altura del lienzo (`y=39..103`) y tapa
  la ventana y el mostrador del fondo (zona aproximada `y=40..100`). No sale del
  lienzo ni solapa el cuenco (`x14..36`); en Wailord/Reshiram llega hasta
  `x≈37..112` y **roza el borde de la cama** (`x≥110`).
- 16 y 24 px son discretos pero legibles; 40 px es el equilibrio para las cuatro
  mascotas actuales; 64 px debe ser una excepción (potencial oclusión), no la
  regla por altura ≥2 m.
- Las cuatro mascotas reales de la BD (`Electrode`, `Manaphy`, `Nidoking`,
  `Magnemite`) están presentes con sprite `normal` y `shiny`.

## 4. Licencias y procedencia — BLOQUEO

- El 7z **no contiene licencia ni créditos**. Una búsqueda preliminar encuentra un
  post de Reddit *«Pokemon Gen 1-7 Overworld Sprites [Download Link; GoogleDrive]»*
  en `r/PokemonRMXP` (2021) como **origen probable**, sin declaración de licencia
  accesible desde este entorno (Reddit devuelve 403 al contenido). Las fechas
  internas de los PNG (2014 y 2018) encajan con una recopilación comunitaria.
- Los sprites derivan de recursos gráficos de Nintendo/Game Freak/Creatures.
  **No se incorporan al repositorio**, no se publican y no se redistribuyen sin
  autorización explícita del usuario y revisión de licencia.
- Los datos de altura de PokéAPI sí son reutilizables con caché local, pero tampoco
  se han versionado: solo están en `/tmp` con su URL y fecha de consulta.
- La app en tiempo de ejecución **no debe requerir Internet**; cualquier manifest
  o subset de sprites deberá ser local y pasar el filtro de licencia.

## 5. Artefactos generados (todos en `/tmp/opencode/pg06/`, fuera del repo)

| Ruta | Contenido |
|---|---|
| `archive-list.txt` | Listado literal del 7z (2938 líneas: 1 carpeta + 2937 PNG) |
| `extracted/Gen 1-7 OV SPrites/*.png` | Copia extraída solo para medir; no versionada |
| `sprite-metadata.csv` / `.json` | 2937 filas con celda, modo, rectángulo alfa y frames por archivo |
| `sheet-001.png`, `sheet-003.png`, `sheet-025.png`, `sheet-810.png`, `sheet-812.png`, `sheet-88_1.png` | Hojas de contacto 4×4 con celdas ampliadas y etiquetas R/C |
| `pokeapi-pokemon.csv` | Caché de alturas con procedencia |
| `analyze_sprites.py` | Script de medición reproducible |

### Estado VERIFICADO / PENDIENTE

**VERIFICADO:** inventario, cuadrícula 4×4, canales alfa, duplicados, ciclo de 16
frames, tamaños visibles, alturas y encaje teórico en 160×144. En la Fase C se
confirmó además el orden lateral por siluetas asimétricas (fila 1 = izquierda,
fila 2 = derecha; bulbo de `001` y cola de `025`) y la hipótesis `s = shiny`:
683 de 806 pares `NNN`/`NNNs` tienen la alfa idéntica en los 16 frames y las 7
especies probadas en el visor dan 16/16. En la Fase D se validaron las cuatro
categorías de escala con siete especies y se comprobó que el renderizador respeta
hojas 128×192, 192×192, 208×208 y 384×384 sin recortar los 16 fotogramas.

**PENDIENTE DE COMPROBAR:** licencia; confirmación de los 123 pares `NNNs` atípicos
(49 con coincidencia parcial, 74 sin ninguna coincidencia); numeración completa del
paquete; efecto visual del fundido nocturno (sin asset) y decisión de paleta
(color completo vs. 4 colores GBC). Detalle en `PG06_VIEWER_RESULTS.md`.

## 6. Siguiente paso

La arquitectura está en `SPRITE_RENDERING_RFC.md`. El visor aislado quedó
implementado en la Fase C y consolidado en la Fase D, pero **sigue sin integrarse**
en la Guardería: la licencia y la paleta definitiva siguen bloqueando cualquier
incorporación de sprites o derivados al repositorio.
