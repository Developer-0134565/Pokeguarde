# PG-07E — CAJAS DE PC · Informe final

**Fecha:** 19-nov-2026  
**Repositorio:** `/home/<usuario>/Proyectos/Pokeguarde`  
**Rama:** `main`  
**HEAD inicial y final:** `819b73b49a8aca76486173917d7abdb4518290ab`  
**Commits/pushes:** ninguno.  
**Estado:** TERMINADO Y VERIFICADO dentro del alcance autorizado.

---

## 1. Autorización y alcance

Se ejecutó PG-07E con autorización completa para implementar y validar, sin solicitar confirmaciones intermedias.

**No se realizó:**

- commits ni pushes;
- escritura, copia ni modificación de partidas;
- cambios en `data/pokegotchi.db`;
- cambios en el sidecar PKHeX.Core ni en el backend protegido;
- movimiento, renombrado, liberación, depósito, intercambio ni edición de Pokémon;
- nueva dependencia externa.

---

## 2. Estado de Git

### Inicial

- Rama `main`, HEAD `819b73b49a8aca76486173917d7abdb4518290ab`.
- `git status --porcelain=v1 --untracked-files=all`: 46 líneas.
- SHA-256 del listado inicial: `aae790ee271805f1070185d8a74b2eff6799b8a21ce127809b484b1ee3cc2d78`.
- Modificados rastreados heredados: `apps/web/index.html`, `apps/web/src/i18n.ts`, `apps/web/src/main.ts`, `apps/web/src/nursery.ts`, `apps/web/src/style.css`, `scripts/check.sh`.
- Sin seguimiento, heredados y conservados: `scripts/pg07b-check.ts`, `scripts/pg07c-check.ts`, `scripts/pg07d-check.ts`, `POKEGUARDE_STITCH_COMPLETE_2026-11-19.zip`, `STITCH_UPLOAD/`, `docs/stitch/reference/`.

### Final

- Rama `main`, HEAD `819b73b49a8aca76486173917d7abdb4518290ab` (idéntico).
- `git status --porcelain=v1 --untracked-files=all`: SHA-256 `3175f9321918e327e7eb8a438c5c0de05b0cdc9719b31a244b72e6c695726c1a`.
- Único cambio nuevo respecto al estado inicial: `scripts/pg07e-check.ts` aparece como archivo sin seguimiento.
- Los archivos `apps/web/index.html` y `apps/web/src/nursery.ts` siguen modificados por fases anteriores; PG-07E no los tocó.

---

## 3. Fase 0 — auditoría previa

Se leyeron `AGENTS.md`, `README.md`, los informes PG-07C y PG-07D, el contrato real del sidecar, el backend y las referencias Stitch disponibles.

### Hallazgos relevantes

- El sidecar construye cada caja desde `isav.BoxData.ToArray()`, con `per = isav.BoxSlotCount` (si es `<= 0`, usa 30), recorre `j = 0..per-1`, guarda `slot = j + 1` y omite Pokémon con `Species == 0`.
- **El sidecar omite cajas enteras vacías.** El contrato expone solo cajas con al menos un Pokémon.
- Cada caja del contrato contiene únicamente `index`, `name` y `slots`; **no expone `capacity`, `count`, número total de cajas ni `BoxSlotCount`**.
- Los índices de caja y ranura son base 1 y pueden no ser contiguos.
- El backend protegido `apps/server/src/index.ts` devuelve el `inventory` completo, pero tampoco publica capacidad ni total de cajas.
- No existe `MANIFEST.json` en `docs/stitch/reference/`; solo el listado de ZIP con hashes. Las maquetas Stitch se trataron como referencia visual, no como contrato de datos.
- No se asignaron identificadores `SCREEN_XX` sin evidencia.
- Las pruebas de referencia `bun run check` terminaron con EXIT 0 antes de modificar código.

### Decisión de representación segura

- Mostrar **solo las cajas presentes en el contrato**.
- Conservar los índices reales de caja y ranura.
- Representar huecos hasta el mayor slot observado en cada caja.
- Mostrar la capacidad como `Capacidad real: no disponible en el contrato` y una `Observado hasta ranura N`.
- No inventar cajas, ranuras ni Pokémon; no usar un valor global fijo como 14 cajas × 20 ranuras.

---

## 4. Datos reales comprobados

Se consultó `dotnet services/pkhex/bin/Release/net10.0/pkhex.dll inventory fixtures/<archivo>` para cada fixture detectable.

| Fixture | Generación | Cajas expuestas | Detalle |
|---|---:|---:|---|
| `gen1-blue-spain.srm` | I | 0 | Solo equipo (1). |
| `gen1-blue-usa.srm` | I | 0 | Solo equipo (5). |
| `gen2-crystalclear-hack.srm` | II | 1 | Caja 1 `BOX1`, 16 ocupadas, ranura máxima 16. |
| `gen3-allin-hack.srm` | III | 1 | Caja 1 `BOX1`, 1 ocupada, ranura máxima 1. |
| `gen4-heartgold-spain.srm` | IV | 6 | Índices `1,2,3,5,17,18`; ocupadas `29,15,5,11,18,21`; ranuras máximas `29,21,6,11,30,24`. |
| `gen5-black-usa.srm` | V | 1 | Caja 1 `CAJA 1`, 3 ocupadas, ranura máxima 3. |
| `gen2-polished-hack.srm` | — | — | No detectado por PKHeX; límite esperado de hacks. |

HeartGold fue el caso más rico:

- Caja 1 `CAJA 1`: 29/29, sin huecos observados.
- Caja 2 `CAJA 2`: 15 ocupadas, ranura máxima 21; huecos reales en `13,14,17,18,19,20`.
- Caja 3 `CAJA 3`: 5 ocupadas, ranura máxima 6.
- Caja 5 `CAJA 5`: 11/11.
- Caja 17 `Eventos`: 18 ocupadas, ranura máxima 30.
- Caja 18 `BELLEZA`: 21 ocupadas, ranura máxima 24.

---

## 5. Componentes implementados

### `apps/web/src/main.ts`

- Bloque puro entre `/* PG-07E:pc-helpers:start */` y `/* PG-07E:pc-helpers:end */`:
  - `PC_FILTERS`;
  - `pcBoxes`, `pcBoxByIndex`, `pcSlotList`;
  - `pcRefOf` (identidad `{ p, location: "box", box, slot }`);
  - `pcVerdictOf` (misma regla que `verdictOf`, sin reinterpretar legalidad);
  - `pcText`, `pcNorm`, `pcMatches`, `pcCounts`;
  - `pcNav`, `pcSelectionValid`, `pcFocusSlot`.
- Estado nuevo: `pcBoxIndex`, `pcSlotSelection`, `pcFilter`, `pcQuery`, `pcSpriteTimer`, `pcSpriteLoading`.
- `dossierReturn` ampliado a `"library" | "nursery" | "team" | "boxes"`.
- `openSave()` reinicia caja, selección, filtro y búsqueda al cambiar de partida.
- `renderDetail()` valida que la caja/ranura conservada siga existiendo antes de repintar.
- Vista `boxesView()` sustituida por el panel de Cajas de PC:
  - cabecera con nombre, índice, conteo, ranura máxima observada y aviso de capacidad desconocida;
  - botones Anterior/Siguiente y posición `N / total`;
  - filtros Todos / Legales / No verificables / Ilegales con conteos reales;
  - búsqueda local;
  - grid con todos los índices originales;
  - huecos marcados;
  - resumen contextual y botón `Abrir FICHA / DATOS`;
  - estados para `boxError`, sin cajas y sin coincidencias.
- Corrección aplicada durante la verificación: `#pc-open` se enlaza por delegación en `#pc-info`, porque `refreshPcView()` repinta ese contenedor.

### `apps/web/src/i18n.ts`

Añadidas 28 claves `box.*` en ES y EN, con español por defecto. Cubren cabecera, navegación, filtros, búsqueda, huecos, selección, veredictos, sprites y estados vacíos/de error.

### `apps/web/src/style.css`

Bloque `/* ---------- CAJAS DE PC (PG-07E) ---------- */`:

- grid de 5 columnas en escritorio, 3 en `<=900px` y 2 en `<=480px`;
- `overflow-x: hidden`;
- objetivos táctiles y `:focus-visible`;
- `image-rendering: pixelated`;
- filtros que atenúan sin ocultar ni reordenar;
- estilos para huecos, selección, resumen y cabecera.

### `scripts/pg07e-check.ts` y `scripts/check.sh`

- Suite nueva con 112 comprobaciones headless.
- `scripts/check.sh` añade la sección `== Cajas de PC (PG-07E) ==` antes del sidecar.

---

## 6. Contratos reutilizados

- `inventory.boxes[].index`, `.name` y `.slots[]`.
- `slots[].slot`, `.species`, `.nickname`, `.level`, `.pid`, `.verdict`, `.issues`, `.legal`, `.hp`, `.gender`, `.shiny` y datos de origen cuando existen.
- `refsOf()` y `openDossierFromLibrary()` de PG-07C: no se duplicó la lógica de FICHA/DATOS.
- `initOverworldSprites()` y `paintOverworld()` de PG-07A, con el patrón de reintento limitado de PG-07D.
- Sistema de legalidad de tres estados del sidecar: `legal`, `unverified`, `illegal`.

No se creó un módulo TypeScript nuevo porque el servidor tiene un mapa fijo de módulos y está fuera de alcance.

---

## 7. Pruebas ejecutadas y resultados reales

### Headless

`bun run check`:

- EXIT `0`.
- `Todo correcto.`
- Motor, día/noche, traducciones, PG-07A 54/54, PG-07B 43/43, PG-07C, PG-07D 77/77 y **PG-07E 112/112**.
- Sidecar PKHeX: compilación correcta, 0 advertencias, 0 errores.
- Hashes protegidos comprobados antes y después, sin cambios.

### Navegador real — escritorio 1280×900

Sesión `pg07e-957274a7fcad`, servidor en `127.0.0.1:8787`.

- HeartGold → pestaña Cajas: 6 cajas navegables, posición `2 / 6`.
- Caja 1: 29 ranuras; conteos reales 21 legales / 6 no verificables / 2 ilegales.
- Caja 2: 21 posiciones; huecos en `13,14,17,18,19,20`.
- Click en ranura 15: resumen `MACHIS · Oddish · Nv 6 · ilegal`.
- `#pc-open`: FICHA visible y navegable entre FICHA y DATOS.
- `Volver`: restaura pestaña `boxes`, caja 2, ranura 15.
- Teclado: `ArrowDown` desde ranura 1 → ranura 6 (5 columnas); `Enter` abre ficha y conserva selección 6.
- `Escape`: limpia selección y muestra `Selección cancelada.`
- Click en hueco 13: avisa y no abre ficha.
- Filtro `Ilegales`: 9 coincidencias, 21 posiciones intactas, no coincidentes atenuados.
- Búsqueda `JYNX`: 1 coincidencia en ranura 21.
- Volver a `Todos` y vaciar búsqueda: sin atenuados, 15 coincidencias.
- Cambio a Gen 1 Blue USA: mensaje seguro de “sin cajas expuestas”, sin selección ni datos obsoletos.
- Sin errores de consola.

### Navegador real — móvil 390×844

- Misma partida, pestaña Cajas: grid de 2 columnas (`162px 162px`).
- `document.documentElement.scrollWidth === innerWidth === 390`: sin desplazamiento horizontal.
- Navegación Anterior/Siguiente funcional.
- Captura generada con `PG-07E-Mobile.png`.

No se dispuso de inspección visual humana de los PNG; la validación se realizó mediante estado del DOM, métricas de viewport y metadatos de archivo.

---

## 8. Capturas

| Archivo | Dimensiones | SHA-256 |
|---|---:|---|
| `/home/<usuario>/Descargas/PG-07E-Desktop.png` | 1280 × 1390 | `a7cb8bed8a2e44d14c8ae578777a71797f9fb27f823ab11556ba72c9507ee478` |
| `/home/<usuario>/Descargas/PG-07E-Mobile.png` | 390 × 2743 | `5985263669ea41866b5815fa34a4e3563ca72650bc3cb1a1adccb243fc5de5d4` |

Las capturas son de página completa (`--full`) para incluir la cabecera, el grid y el resumen contextual.

---

## 9. Protección de datos

Hashes finales, idénticos a los de referencia:

| Archivo | SHA-256 |
|---|---|
| `apps/server/src/index.ts` | `8a910b0a05615c3e22457cc9d414dc89ddf733deb10bf61196c7d63269baf695` |
| `apps/server/src/db.ts` | `fcd95b0c63c059c57228bd7c06b1121247c23f6f18178388d43148f9193fed7b` |
| `apps/web/src/pet-engine.ts` | `26955014098ea15f36b21a8a0e714fcccf4183a8e0988cbea801abf9cfd096bb` |
| `apps/web/src/sprite-runtime.ts` | `9e25e9ecb8f9383294265706bedaefc3dda8dcc9c40fd4f2a08248fd9e8e9ac8` |
| `apps/web/src/sprite-render.ts` | `92f43df3284153b4be0a75755f9e7984a78e1aad40064ff6fd8d94a675185f30` |
| `services/pkhex/Program.cs` | `5b777f4ab83c32636e112903ed712ca4100793b22785492ac2234bade1967278` |
| `apps/web/assets/room/guarderia.png` | `bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095` |
| `data/pokegotchi.db` | `2fb9e76bc8b8bb820a77e21342abe7b079f687749503315e13c0cf95106675e0` |

Los fixtures se verificaron en Fase 0 contra `fixtures/FIXTURES.md`; ninguno fue modificado.

---

## 10. Limitaciones documentadas

1. El contrato actual no expone la capacidad real de cada caja ni el total de cajas del formato. La UI declara explícitamente esa ausencia y calcula solo una “ranura máxima observada”.
2. El sidecar omite cajas vacías; por eso una partida sin Pokémon almacenados muestra un estado informativo y no una cuadrícula inventada.
3. La legalidad se muestra tal cual la entrega PKHeX; el frontend no crea reglas nuevas ni convierte `unverified` en `illegal`.
4. No se comprobó el resultado de legalidad de cada una de las 105 ranuras de HeartGold en navegador; se validaron los conteos y casos concretos (`Porygon-Z` y `Volbeat` ilegales, `Manaphy` legal) y la suite headless cubre las reglas de presentación.
5. Los eventos táctiles físicos reales no se ejecutaron; sí se verificaron los controles HTML y el patrón de clic usado por ratón/táctil.
6. No existe `MANIFEST.json` en las referencias Stitch importadas.
7. Las capturas se validaron por DOM y metadatos, no por inspección visual del modelo.

---

## 11. Riesgos

- Si en el futuro el backend expone `BoxSlotCount` o cajas vacías, el panel deberá incorporar esos datos sin cambiar los índices ya mostrados.
- La representación de huecos depende del mayor slot ocupado; es una aproximación segura, no una afirmación de capacidad del formato.
- Cualquier cambio futuro en el mapa de módulos del servidor debe conservar que PG-07E no introduce un módulo TS nuevo.

---

## 12. Recomendación para la siguiente fase

La siguiente fase útil sería **PG-07F**, centrada en uno de estos puntos, previa autorización:

1. ampliar el contrato del sidecar/backend para publicar capacidad real y cajas vacías, manteniendo compatibilidad con PG-07E;
2. ejecutar una prueba táctil física en dispositivo real;
3. extender la exportación a otro save compatible por cadenas oficiales (todavía pendiente de fases anteriores).

---

## 13. Conclusión

PG-07E quedó **TERMINADA Y VERIFICADA**: las cajas reales son navegables, los índices originales se conservan, la selección vuelve desde FICHA/DATOS a la misma ranura, los filtros y la búsqueda funcionan sin reordenar, el diseño responde en escritorio y móvil, y no se modificaron saves, base de datos, backend, sidecar ni dependencias.
