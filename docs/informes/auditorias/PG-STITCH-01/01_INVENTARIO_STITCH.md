# 01 — Inventario y validación de la exportación Stitch

**Misión:** PG-STITCH-01 · **Fase:** A · **Fecha:** 2026-11-19
**Modo:** READ-ONLY sobre el repositorio. Sin ejecución de scripts incluidos en los ZIP, sin contacto a proveedores externos.

## Leyenda de evidencia

| Etiqueta | Significado |
|---|---|
| HECHO OBSERVADO | Verificado con comandos de solo lectura (`stat`, `sha256sum`, `unzip -l/-t`, lectura de texto y `file`). |
| DECISIÓN DOCUMENTADA | Afirmación que consta en un documento del proyecto o de la exportación. |
| PROPUESTA TÉCNICA | Recomendación de esta auditoría; no autoriza implementación. |
| INCERTIDUMBRE | No se pudo establecer con la evidencia disponible. |
| BLOQUEO | Imposibilidad de verificación dentro de las restricciones de la misión. |

---

## 1. ZIP declarado por el usuario

**HECHO OBSERVADO**

| Propiedad | Valor |
|---|---|
| Ruta | `/home/<usuario>/Descargas/stitch_pokeguarde_ui_evolution_system.zip` |
| Existencia | Sí |
| Tamaño | 4.495 bytes |
| SHA-256 | `72ad383e154176c6591b71f91edcc40a3040634be468e9da050e4648884917c1` |
| Integridad (`unzip -t`) | Correcta, sin errores |
| Extracción | `/tmp/opencode/pg-stitch-01/stitch` (aislado, fuera del repositorio) |
| Contenido real | **Un único archivo:** `pokeguarde_resumen_final_y_checklist_de_desarrollo.md` |
| Tamaño del archivo | 9.102 bytes, 87 líneas |
| Fecha declarada en el documento | 2026-11-20 |
| Sistema de diseño declarado | «Pocket Tech 1999» (Space Mono + Space Grotesk) |
| Autoridad legal declarada | PKHeX.Core / .NET 10 |

**HECHO OBSERVADO — ausencias:** el ZIP declarado **no contiene** ningún `code.html`, CSS, JavaScript, imagen, fuente ni archivo de pantalla. No hay carpetas. No hay manifiesto, ni LICENSE, ni ficheros con IDs `SCREEN_*`.

### 1.1 Contenido del único Markdown

| Líneas | Contenido |
|---|---|
| 19-34 | Tabla con las 12 SCREEN declaradas (id + título). |
| 38-78 | Checklist técnico de implementación. |
| 81-84 | Estado de decisiones: `DECIDED` y `PENDIENTE`. |
| 13 | Capacidad 2 Pokémon; canvas 160×144; seis necesidades; seis minijuegos; tope 65.535 en Gen I/II. |
| 15 | Reglas biológicas, excepción Manaphy/Ditto, un huevo por participante, GP, eclosión en 4 etapas. |
| 55 | Propiedad inalienable y recuperación aunque el anfitrión esté desconectado. |
| 56-60 | Flags `allow_ev_berries`, `allow_ev_minigames`, `allow_breeding`, desactivados por defecto y verificados en backend. |
| 64-67 | Bloqueo de bebés/legendarios; un huevo por entrenador; cooldown 15 min–3 h por rareza e IV; verificación UTC. |
| 70-71 | GP gratuitos; «Cero Microtransacciones». |
| 74-77 | DV 0-15; Stat Exp 65.535 con Especial compartido; propuesta de «Cuarentena de Anomalías». |
| 83-84 | `DECIDED` / `PENDIENTE` (fórmula del cooldown, herencia de movimientos, autenticación web). |

---

## 2. Las 12 SCREEN declaradas (solo en la tabla del Markdown)

**HECHO OBSERVADO — ninguna de ellas existe como archivo en ninguno de los ZIP inspeccionados.** Los títulos siguientes son los declarados en el documento, no pantallas recuperadas.

| # | ID declarado | Título declarado | ARCHIVO ENCONTRADO |
|---|---|---|---|
| 1 | SCREEN_25 | Guardería (2/2 Pokémon) | Ninguno |
| 2 | SCREEN_23 | Ficha Manaphy y permisos | Ninguno |
| 3 | SCREEN_21 | Directorio de jugadores | Ninguno |
| 4 | SCREEN_19 | Crianza y validación | Ninguno |
| 5 | SCREEN_17 | Huevos e incubación GP | Ninguno |
| 6 | SCREEN_15 | Eclosión Phione | Ninguno |
| 7 | SCREEN_13 | Animación interactiva Phione | Ninguno |
| 8 | SCREEN_10 | Tienda GP y decoración | Ninguno |
| 9 | SCREEN_8 | Perfil y privacidad | Ninguno |
| 10 | SCREEN_6 | Equipo y mochila | Ninguno |
| 11 | SCREEN_4 | Cajas PC | Ninguno |
| 12 | SCREEN_2 | Inspección de legalidad | Ninguno |

**Conclusión (HECHO OBSERVADO):** la afirmación «se han entregado 12 pantallas» no se sostiene con los archivos disponibles. El número real de diseños gráficos recuperables es **3 diseños base + 5 variantes** (sección 4), y ninguno lleva identificadores `SCREEN_XX`.

---

## 3. ZIP versionado en el repositorio (solo lectura)

| Propiedad | Valor |
|---|---|
| Ruta | `POKEGUARDE_STITCH_COMPLETE_2026-11-19.zip` (untracked; no se modificó) |
| Tamaño | 2.503.615 bytes |
| SHA-256 | `bfa58b8637e37bcdc9a3c355e711a19536c7a5a43ce782ac90ab2cf1531c50c9` |
| Integridad | `unzip -t` correcta |
| Estructura | 24 archivos bajo `STITCH_UPLOAD/` |
| Contenido | `01_ORIGINALES/` con 3 juegos de `code.html`, `DESIGN.md`, `original.zip`, `screen.png`; `02_DOCUMENTACION/` con 8 documentos; `03_RECURSOS_GRAFICOS/guarderia.png`; `IMPORTACION_DESDE_CHAT.md`; `LEEME_STITCH.md` |

`docs/stitch/reference/` contiene el mismo árbol más `README.md`. Ambos directorios figuran como untracked en el estado Git inicial; **no se alteraron**.

---

## 4. ZIP adicionales en Descargas y duplicados

**HECHO OBSERVADO:** se localizaron 8 ZIP adicionales, extraídos en `/tmp/opencode/pg-stitch-01/zips/z1…z12`. Cada uno contiene exactamente `code.html`, `DESIGN.md` y `screen.png`.

### 4.1 Duplicados exactos

| Grupo | SHA-256 `code.html` | Contenido |
|---|---|---|
| z10 = z7 | `af368aed…` | Ficha de escritorio (Gen II/IV, 363/510 EV) |
| z11 = z6 | `5e17fc6b…` | Ficha móvil (TOTAL EVS 363/510) |
| z12 = z5 | `ef5efe8e…` | Guardería de escritorio (carcasa PKG-02) |

Otros `code.html` únicos: z1 `a82ff196…`, z2 `e0c7708e…`, z3 `457bffd9…`, z4 `50f47dea…`, z8 `890332a9…`.

`DESIGN.md`: 8 archivos con `0d86de14…` («Pocket Tech 1999») y 2 con `23a89192…` («Pokéguarde Tactile Daycare», z1 y z8).

`screen.png`: 8 imágenes únicas (z10/z7, z11/z6, z12/z5, z1, z2, z3, z4, z8). Resoluciones:

| variante | Resolución | Modo |
|---|---|---|
| z10 / z7 | 1600 × 1566 | — |
| z11 / z6 | 302 × 1600 | móvil |
| z12 / z5 | 1396 × 1421 | RGBA |
| z1 | 461 × 1600 | — |
| z2 | 1600 × 1280 | — |
| z3 | 1600 × 1415 | — |
| z4 | 1396 × 1433 | RGBA |
| z8 | 1396 × 2787 | RGBA |

### 4.2 Coincidencia con los originales declarados

| ZIP de Descargas | SHA-256 | Coincide con el versionado |
|---|---|---|
| `(5)` guarderia-desktop | `219b158787d2571e8469fa8582c5ab7d3b8c2473cf59b07a5ff6b42a6b492a2c` | Sí |
| `(6)` ficha-mobile | `2adf1a5cc15ff41bfd3eae524b21cec6c100ebd4a0604eea9c58985be1e1b88d` | Sí |
| `(7)` ficha-desktop | `4ebe38c9917b909b88aaa8d8fed270cf2f660d1b06c5fa3fbd874f5812a98d86` | Sí |

---

## 5. Dependencias externas y recursos

**HECHO OBSERVADO — no se contactó a ningún proveedor; solo se leyeron las URLs del HTML.**

| Tipo | Referencias |
|---|---|
| CSS | `https://cdn.tailwindcss.com` (Tailwind en CDN) |
| Fuentes | Google Fonts: Space Grotesk, Space Mono, Material Symbols Outlined, JetBrains Mono, Plus Jakarta Sans, Press Start 2P, VT323 |
| Fuentes de terceros (z12/z5) | `https://cdn.jsdelivr.net/gh/thegrb90/pokered-starter@master/src/assets/font/pokemon-font.ttf`; `https://raw.githubusercontent.com/filipekiss/pokemon-font/master/dist/pokemon-font.woff` |
| Imágenes | `https://lh3.googleusercontent.com/...` |
| CSS/JS locales propios | Ninguno |
| Fuentes locales | Ninguna |
| Licencias de fuentes de terceros | INCERTIDUMBRE: no se verificó licencia ni autorización de redistribución |

---

## 6. Comportamiento de los scripts inline (no operativos)

**HECHO OBSERVADO — los scripts se leyeron, nunca se ejecutaron.**

| Variante | Evidencia | Conclusión |
|---|---|---|
| z12 / z5 | `selectedIndex`, `isPoopCleaned`, `flashButton`, `triggerNavButton`, `triggerConfirmButton`, `dialogue.textContent = …`, `showEmote('🍓')`, `setTimeout(600/1200)` | Simulación de diálogos y animación; sin persistencia |
| z10 / z7 | `previewPanel.classList.toggle('hidden')`; texto «¡Descargado pokemon_crystal.sav!» tras 1.200 ms; `confirm`/`alert` | Exportación **falsa**: no escribe archivo |
| z11 / z6 | `triggerCartridgeSync(btn)` → «CARTUCHO .SAV EXPORTADO CON ÉXITO» tras 1.200 ms | Sincronización **falsa** |

**HECHO OBSERVADO:** no hay `fetch`, `WebSocket`, `indexedDB`, `localStorage` con estado de juego ni llamadas a backend en los `code.html`.

---

## 7. Textos visibles (extraídos por lectura estática)

| Variante | Textos relevantes |
|---|---|
| z12 / z5 | Carcasa `MODEL: PKG-02 SILVER EDITION`; menú CUIDADOS; COMER/JUGAR/LIMPIAR/ACARICIAR/REPRENDER/DORMIR; 3 botones (izq. navegar, centro A, der. B) |
| z3 / z4 | «¡POPÓ!» (sin reglas de frecuencia, penalización ni limpieza aprobadas) |
| z10 / z7 | `GEN II / IV SPEC`, `TOTAL ACUMULADO 363 / 510 EVs`, `LIMITE MAX: 252 c/u`, `NATURALEZA: DÓCIL`, `IVs`, `EXP BASE: 14.240 pts` |
| z11 / z6 | `TOTAL EVS 363 / 510`, `Amistad 220/255`, `Naturaleza Firme`, `Potencial Genético (IVs): SOBRESALIENTE`, `SRAM SINCRONIZADA [CHK: 0x9F4C]` |
| z1 / z8 | **Tres ocupantes** (Chikorita, Cyndaquil, Totodile) y 363/510 EV |
| z2 | `EQUIPO EN GUARDERÍA (3/6)`, `EXP x1.5` |
| z8 | `Laboratorio Genético`, `Sincro-Slot 01`, `Puntos de Cuidado: 1.450 PC` |

---

## 8. Recurso gráfico de fondo

| Archivo | Dimensiones | Modo | SHA-256 |
|---|---|---|---|
| `apps/web/assets/room/guarderia.png` (canónico) | 160 × 144 | RGBA | `bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095` |
| `STITCH_UPLOAD/03_RECURSOS_GRAFICOS/guarderia.png` | 1200 × 896 | RGB | `55b20c80c84a045f98acb6b72ba6fd2242946ff5f79184e29401a691ef892b4b` |
| `~/Descargas/pokeguarde_160x144_pixel_art_room_asset.png` | 160 × 144 | — | `f133a1a5ff7268946858e2f4e8d9a4ca51f0bcce5701916513724d2ba1874d63` |

**CONTRADICCIÓN (HECHO OBSERVADO):** `LEEME_STITCH.md` §8 afirma que el recurso incluido es de 160×144 y es el fondo de producción. El archivo real mide 1200×896 y su hash difiere del canónico. **No sustituir** `apps/web/assets/room/guarderia.png`.

---

## 9. Resumen del inventario

| Concepto | Resultado |
|---|---|
| ZIP declarado íntegro | Sí (4.495 B) |
| Pantallas declaradas | 12 (solo en una tabla de texto) |
| Pantallas entregadas como archivo | **0** |
| Diseños gráficos reales recuperables | **3 base + 5 variantes** |
| `code.html` | 12 archivos, 8 hashes únicos |
| `DESIGN.md` | 12 archivos, 2 hashes únicos |
| `screen.png` | 12 archivos, 8 hashes únicos |
| CSS/JS propios | 0 (todo inline + Tailwind CDN) |
| Fuentes locales | 0 |
| Dependencias externas | Tailwind CDN, Google Fonts, imágenes Google, fuentes GitHub/jsdelivr |
| Backend en los mockups | Ninguno; exportación y sincronización simuladas |
| Licencias de fuentes/sprites de terceros | INCERTIDUMBRE |

## 10. Bloqueos

- **BLOQUEO:** no es posible auditar las 12 pantallas porque no existen como archivos. Solo se puede analizar la tabla declarativa y los 3 diseños + 5 variantes.
- **BLOQUEO:** no se puede verificar licencia de las fuentes de terceros ni de las imágenes alojadas sin contactar a proveedores, acción prohibida por la misión.
- **INCERTIDUMBRE:** no se puede saber si existen más pantallas en Google Stitch no exportadas a estos ZIP.
