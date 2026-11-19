# Pokeguarde — Continuidad del proyecto

Banco de partidas Pokémon + Guardería tamagotchi. Web **local** (127.0.0.1).
Cubre **Gen 1-5**: GB, GBC, GBA y NDS.

Este archivo es la fuente de verdad para cualquier agente que trabaje aquí.
Si una decisión no está escrita, **preguntar antes de implementarla**.

## Objetivo

1. **Biblioteca de saves**: el usuario suelta un `.srm`/`.sav`/`.dsv` y la app
   muestra un inventario completo de la partida (entrenador, OT/ID, dinero,
   medallas, tiempo, Pokédex, objetos, cajas y equipo).
2. **Ficha de Pokémon**: toda la información posible — especie, mote, nivel, EXP,
   naturaleza, habilidad, objeto, movimientos con PP, stats calculadas, IV/DV,
   EV/stat exp, amistad, origen (met location/level/date), idioma, ball, cintas,
   y el veredicto de legalidad con sus motivos.
3. **Guardería**: elegir un Pokémon y llevarlo a una habitación tamagotchi con
   estética GBC, 160x144 internos, alimentación, juego, limpieza, sueño y
   entrenamiento por minijuegos que suben EV/stat exp reales.
4. **Exportación**: devolver el Pokémon entrenado al save de origen (o a otro
   compatible) solo por cadenas oficiales y solo con cambios legales.

## Decisiones vinculantes (18-nov-2026)

### Motor

- **PKHeX.Core en sidecar .NET** es la única autoridad de parseo, conversión y
  legalidad. No se escriben parsers propios de formatos como fuente principal.
- No WASM, no reimplementar PKHeX en TypeScript, no usar servicios en la nube.
- Backend **Bun + TypeScript + SQLite** (`bun:sqlite`), API en `127.0.0.1`.
- Frontend **Vite + TypeScript + Canvas**. Sin frameworks de UI pesados.

### Cobertura

- v1: **Gen 1 (RB/Y), Gen 2 (G/S/C), Gen 3 (RSE/FRLG), Gen 4 (DP/Pt/HGSS),
  Gen 5 (B/W/B2W2)**.
- Fuera de alcance: Gen 6+, Switch, GameCube, Mystery Dungeon, Ranger, TCG,
  Pinball y demás spin-offs.

### Legalidad

- Legal = el Pokémon pudo existir tal cual por medios oficiales: especie/nivel/
  origen coherentes, movimientos obtenibles por nivel, MT/MO, tutor, huevo o
  evento oficial, EV dentro de límites, sin campos imposibles.
- Ilegal = cualquier combinación imposible aunque el save cargue. Se muestra el
  motivo concreto, no solo un semáforo.
- **IV/DV nunca se editan**: en Gen 1-5 no existe método oficial. Se muestran y
  se usan para el comportamiento de la mascota.
- Un Pokémon legal puede seguir siendo ilegal **para otra edición**: la legalidad
  se evalúa contra el destino de exportación elegido.

### Qué se puede modificar

| Campo | Gen 1 | Gen 2 | Gen 3 | Gen 4-5 |
|---|---|---|---|---|
| Stat exp / EV | sí (5 x 0-65535) | sí | sí (≤510, ≤255/stat) | sí (≤510, ≤255/stat) |
| Amistad | no existe | sí (0-255) | sí | sí |
| Movimientos | nivel, MT/MO, evento | nivel, MT/MO, huevo, evento | + tutor | + relearn |
| Objeto equipado | no | sí | sí | sí |
| Carta (Correo/Mail) | no existe | sí | no existe | sí |
| IV/DV | bloqueado | bloqueado | bloqueado | bloqueado |
| Especie, OT, ID, origen | bloqueado | bloqueado | bloqueado | bloqueado |

- **Movimientos**: solo si el Pokémon puede aprenderlos legalmente en esa edición
  (nivel ≤ actual, MT/MO de la tabla de esa edición e idioma, tutor, huevo si es
  de huevo y el conjunto es coherente, evento oficial curado). Pikachu con Surf
  es válido solo si su met data corresponde al evento de Pokémon Stadium; si no,
  se marca «requiere evento» y **no se reescribe** el met data para fabricarlo.
- **Bayas**: solo las seis reductoras de EV de Gen 3+ (Granada, Safre, Qualot,
  Hondew, Grepa, Tamato), −10 EV con suelo 0. En Gen 1/2 no hay bayas de EV.
- **Objetos**: catálogo curado por generación; nunca objetos clave, de evento no
  activo ni de otra generación. Se compran con puntos de minijuegos.
- **Cartas**: son el objeto **Correo** de Gen 2, 4 y 5, con texto del tamagotchi
  limitado a los caracteres de esa generación. En Gen 1 y 3 no existen en el
  save: la carta vive solo en el diario de la app.

### Cadenas de transferencia (solo oficiales)

```
Gen 1 <-> Gen 2   Time Capsule
Gen 3  -> Gen 4   Pal Park
Gen 4  -> Gen 5   Poké Transfer
Gen 5  -> Gen 6/7 Bank        (fuera de alcance)
Gen 1/2 VC -> Gen 7           (fuera de alcance)
```

**Gen 1/2 -> Gen 3/4/5 no existe.** Ese Pokémon no puede exportarse a NDS de
forma legal; la app lo bloquea y explica por qué. Si el usuario elige destino
NDS, solo se ofrecen Pokémon de Gen 3+.

### Escritura de saves

Protocolo obligatorio, en este orden:

1. Cargar en memoria, abrir **solo lectura** y guardar SHA-256.
2. Prueba de ida y vuelta `parse -> serialize` sobre una **copia clonada** del
   original (`SaveUtil.GetSaveFile` no copia y `Write()` modifica el búfer en
   sitio: comparar contra el propio búfer es una comprobación vacua). Si no
   coincide byte a byte, **no** se bloquea: la salida es la **forma canónica** de
   PKHeX y se informa del diff colateral. Detalle y medición en `docs/FASE-0.md`.
3. Editar solo los campos permitidos del Pokémon afectado; la reescritura puede
   además normalizar relleno y checksums (queda registrado en el informe).
4. Dejar que PKHeX recalcule checksums y refresque las stats del equipo.
5. Revalidar legalidad; si empeora o cambia la identidad, abortar.
6. Salida por defecto a **archivo nuevo** (`Juego.entrenado.srm`) con informe de
   offsets y hashes. Sobrescribir exige confirmación explícita y copia fechada.
7. Registrar en SQLite hashes de entrada/salida y el motivo de cada cambio.

Nunca se escribe en `SHARE/` ni en los originales de Retro sin autorización
explícita del usuario para ese archivo concreto.

## Guardería

- Lienzo interno **160x144** (GBC, 10:9), `imageSmoothingEnabled = false`.
- Escala entera adaptativa: `min(floor((vw−reservaX)/160), floor((vh−180)/144))`,
  mínimo 2 y máximo 7. `reservaX` = 420 px con panel lateral (> 1100 px) y 58 px
  a una columna (≤ 1100 px). En ≤ 720 px la cabecera envuelve y se reducen márgenes;
  el lienzo 2x (320x288) cabe sin desbordes. Por defecto en escritorio: 5x a 6x.
- Paleta GBC de 4 colores; sprites propios 32x32/48x48 con animación por frames.
- Necesidades: hambre, felicidad, energía, higiene, disciplina, peso, edad, sueño.
- Acciones: comer, jugar, limpiar, dormir, entrenar.
- Entrenamiento = minijuegos que suman EV/stat exp **reales** con tope legal y
  ritmo pausado (no un botón de «subir stats»).
- Especie, nivel, naturaleza e IV modulan el comportamiento. Nada de LLM en el
  bucle: la mascota es determinista y reproducible.
- Simulación por marcas de tiempo con puesta al día al abrir; reloj interno.
- Varias mascotas adoptadas, una activa; persistencia en SQLite.
- Sprites de GBC solo como referencia visual, uso personal y no distribuible.

## Estructura

```
Pokeguarde/
  AGENTS.md  README.md
  apps/web/          Vite + TS + Canvas
  apps/server/       Bun + SQLite + API local
  services/pkhex/    sidecar C# con PKHeX.Core
  packages/core/     tipos, legalidad, dominio compartido
  data/              datos empaquetados (gitignored)
  fixtures/          saves de prueba con hash, NUNCA originales
  docs/              legalidad, formatos, guardería, seguridad, cadenas
  scripts/           utilidades de desarrollo
```

## Fases

- **0. Investigación + spike** ✅: documentos de cadenas, formatos y legalidad;
  sidecar que parsea los saves y devuelve JSON de legalidad (la ida y vuelta
  idéntica byte a byte se confirmó solo en Gen 3 y 5; ver arriba).
- **1. Ingesta e inventario** completo de partida y Pokémon. ✅
- **2. Legalidad** con motivos y semáforo por destino de exportación. ✅
- **3. Guardería** con render, necesidades y persistencia. ✅
- **4. Adopción, entrenamiento y exportación verificada.** ✅
- **5. Pulido**, i18n ES, arranque en un comando. ✅

## Prohibiciones

- No tocar `SHARE/` ni los saves reales; trabajar siempre sobre copias.
- No borrar ni sobrescribir archivos del usuario.
- No instalar paquetes ni cambiar configuraciones globales sin permiso.
- No usar servicios externos con partidas reales.
- No inventar datos de Pokémon ni «arreglar» un save para que parezca legal.
- No declarar terminado nada sin la verificación correspondiente.

## Verificación

- Toda funcionalidad de parseo se prueba contra `fixtures/` con hash conocido.
- La ida y vuelta se mide siempre contra una **copia clonada** del original; una
  comparación contra el propio búfer no vale nada.
- Cada exportación deja registro con hashes de entrada/salida y diff resumido.
- Un test que pasa no prueba cobertura: revisar el informe generado.

## Estado del spike (18-nov-2026)

VERIFICADO ejecutando `scripts/spike.sh`:

- SDK .NET **10.0.404** en `~/.dotnet` (sin root). `export PATH="$HOME/.dotnet:$PATH"`.
- Sidecar `services/pkhex` con **PKHeX.Core 26.10.18**, comandos `inspect`,
  `scan` y `members`. `inspect` devuelve JSON y sale con código 1 si no detecta.
- 6 de 7 fixtures detectados: SAV1 (Blue USA y España), SAV2 (Crystal Clear),
  SAV3E (All In), SAV4HGSS (HeartGold España), SAV5BW (Black).
  `gen2-polished-hack` **no se detecta**: límite esperado de los hacks.
- Ida y vuelta idéntica byte a byte solo en **Gen 3 y Gen 5**. Gen 1, 2 y 4 no
  reescriben idéntico: PKHeX los normaliza (relleno de ranuras vacías y checksums).
  Medido como idempotente y sin pérdida (inventario parseado idéntico, checksums
  válidos), así que **no** bloquea la escritura; la salida es la forma canónica
  completa. Detalle en `docs/FASE-0.md` §9.
- No hay saves oficiales de Gen 2 ni de Gen 3 en la colección: esos fixtures son
  hacks, así que su legalidad no es concluyente.
- Hallazgo importante: la legalidad de PKHeX no sirve tal cual en hacks. Hay que
  añadir el estado **«no verificable»** y no bloquear con él.
- Hallazgo: el save español de Gen 1 se desalinea al parsear (traducción con
  bloques distintos). Detectarlo y avisar, nunca «arreglarlo».
- Medallas: PKHeX las da como máscara de bits (`Badges`, `Badges16`), no como
  contador; usar el número de bits activos. Gen 5 no las expone.

Documentos: `docs/FASE-0.md` y `fixtures/FIXTURES.md`.

Siguiente paso acordado: cerrar la investigación pendiente (objetos de mochila,
Dex, cadenas de Gen 3 en detalle) y montar la ingesta + inventario (fase 1).

## Estado de la fase 1 (18-nov-2026)

VERIFICADO en ejecución real:

- `apps/server` (Bun, sin dependencias): API en `127.0.0.1:8787`, SQLite en
  `data/pokegotchi.db` (el nombre del archivo se mantiene a propósito para no
  romper los datos existentes; ver «Estado de la fase 5»), binarios por SHA-256
  en `data/saves/`.
- Rutas: `GET /api/health`, `GET /api/saves`, `POST /api/saves/import`,
  `POST /api/saves/upload`, `GET /api/saves/:sha256`,
  `GET /api/saves/:sha256/pokemon`, `POST /api/saves/:sha256/reparse`,
  `POST /api/saves/reparse`.
- `apps/web`: interfaz TypeScript **sin Vite**; el servidor la transpila con
  `Bun.Transpiler` y sirve `/app.js` y `/style.css`. Desviación consciente del
  plan para no instalar dependencias; migrar a Vite requiere autorización.
- Probado en navegador con `agent-browser`: carga de partidas, pestañas Equipo,
  Cajas, Mochila y Legalidad, y modal de Pokémon con stats, IV, EV, movimientos,
  origen («Route 26»), `OT Antik / 59037-50578` y motivos de ilegalidad.
- Reparseo: los inventarios se guardan en SQLite; tras cambiar el sidecar hay que
  llamar a `POST /api/saves/reparse` (o reimportar) o la UI mostrará datos viejos.

Pendientes de la fase 1/2:

- Estado **«no verificable»**: PKHeX marca ilegal lo que solo es desconocido
  (hacks) o está en otro idioma (falsos «Nickname does not match species name»).
- Nombres de bolsillo y ubicaciones ya se resuelven en inglés; falta i18n ES.
- `pokemon.held_item` guarda el ID; el nombre ya viene en `inventory_json`.
- Filtros y ordenación de Pokémon en la UI.

## Estado de la fase 2 (18-nov-2026)

Legalidad con tres estados, verificada con datos reales:

- `legal`: `LegalityAnalysis.Valid`.
- `unverified` («no verificable»): todas las incidencias son cosméticas/de idioma
  (`Nickname does not match species name`, `In-game Trade Nickname has been
  altered`, `Word Filter`). No bloquea el uso en la Guardería.
- `illegal`: cualquier incidencia estructural (encuentro, PID+, movimientos,
  ball, habilidad/forma, objeto no liberado, sheen).

Medido: HeartGold 105 = 68 legal / 17 no verificable / 20 ilegal (antes 68/37);
Blue USA 5 = 0/0/5; Crystal Clear 22 = 5/0/17; Black 8 = 7/0/1.

`exportTargets` por generación del Pokémon: Gen 1 → GB/GBC; Gen 2 → GB/GBC;
Gen 3 → GBA y NDS (Pal Park); Gen 4 → NDS; Gen 5 → NDS. Gen 1/2 nunca a NDS.

Implementación: `VerdictOf`, `IsCosmetic`, `LegalityIssues`, `CleanIssue` y
`ExportTargets` en el sidecar; `verdict`/`issues` por Pokémon y `counts` por
partida en el JSON de `inventory`; columnas `unverified_count`, `verdict` e
`issues_json` en SQLite (con migración automática); semáforo ámbar en la UI y
secciones «Ilegales» / «No verificables» en la pestaña Legalidad.

Detalle: `docs/LEGALIDAD.md`.

## Estado de la fase 3 (18-nov-2026)

Guardería con motor determinista, render GBC y persistencia, verificada en ejecución:

- Motor puro en `apps/web/src/pet-engine.ts` (`advance`, `applyAction`, `train`,
  `traitsOf`, `natureMods`, `moodOf`, `capsFor`): sin DOM, sin relojes propios,
  mismo resultado en servidor y navegador. `scripts/pet-check.ts` pasa entero.
- Seis necesidades (hambre, felicidad, energía, higiene, disciplina, sueño) más peso,
  edad, entrenamientos y puntos. Decaimiento por hora, sueño autorregulado, colapso
  por agotamiento y puesta al día limitada a **7 días**.
- Siete acciones con enfriamiento (comer 15 min, jugar 8, limpiar 20, acariciar 90 s,
  reprender 4 min, dormir y despertar) y seis minijuegos de entrenamiento, uno por
  stat, con 5 rondas y 45 s entre sesiones.
- Entrenamiento con **EV reales**: Gen 3+ `round(2+6q)` con topes 255/stat y 510;
  Gen 1-2 `round(250+750q)` con tope 65535/stat y sin tope global. Modulado por
  energía, higiene y felicidad; nunca supera el tope legal. `q` acotado a 0..1.
- Persistencia: tabla `pets` en SQLite (`profile_json`, `state_json`, `active`) y rutas
  `GET/POST /api/pets`, `GET/DELETE /api/pets/:id`, `POST /api/pets/:id/action|train|active`
  y `GET /api/pets/games`. Adopción rechaza los `illegal` (422) y permite los `unverified`.
  Liberar solo borra la fila de la Guardería: el save no se toca.
- Render: lienzo 160x144, paleta GBC de 4 colores comprobada con `getImageData`, fuente
  propia 3x5, sala animada y minijuego con cursor. Desviación consciente de la fórmula
  del plan: se usa `min(floor((vw-420)/160), floor((vh-180)/144))` acotada 4-7 porque el
  panel lateral reserva 320 px.
- UI: navegación Biblioteca/Guardería en la cabecera y botón «Llevar a la Guardería» en
  la ficha de cada Pokémon legal o no verificable.

Pendiente de la fase 3/4 (resuelto en la fase 4, ver más abajo): los EV pendientes
**ya se escriben en el save** desde la fase 4; y los arquetipos y rasgos son
aproximaciones deterministas, no datos oficiales.

Detalle: `docs/GUARDERIA.md`.

## Estado de la fase 4 (18-nov-2026)

Adopción, entrenamiento y **exportación verificada** al save. VERIFICADO en
ejecución real (API y navegador).

### Comando `export` del sidecar

`dotnet services/pkhex/bin/Release/net10.0/pkhex.dll export <save> <plan.json>`
compila con **0 avisos / 0 errores**. El plan es JSON:
`{ reason, changes: [ { pid | location+box+slot, species, mode: "add"|"set", evs: [6] } ] }`.
Opciones: `--out <ruta>`, `--dry`, `--allow-overwrite`. Devuelve
`roundTripIdentical`, `normalization`, `diff`, `outputSha256` y, por cambio,
`before`/`target`/`after`/`readBack` + `verdictBefore`/`verdictAfter`.
Si la legalidad empeora, **aborta con exit 3 y no escribe**.

### Salida canónica completa (decisión vinculante)

La salida es la **forma canónica completa** de PKHeX, no un parche mínimo. El
«parche mínimo» se implementó, se midió y se **descartó**: rompe el checksum de
Gen 1 (guardado `0x0E` frente a calculado `0x02`) porque el checksum de Gen 1
cubre justo el relleno de ranuras que PKHeX normaliza; conservarlo exigiría
reimplementar checksums, prohibido. El diff colateral se informa vía
`normalization`. La ida y vuelta sigue sin ser idéntica en Gen 1, 2 y 4; sí en
Gen 3 y 5. No bloquea la escritura (ver protocolo de escritura, paso 2).

### Regla de EV al exportar (recorte, con aviso)

Verificado: **sin EXP ganada**, cada stat solo admite múltiplos de 10 hasta 100
(vitaminas); **con EXP ganada**, hasta 255/510. Al exportar se recorta a lo legal
(`VitaminClamp`) y el sobrante queda **retenido y pendiente** (`withheld`), con
`capped` y una `note` explicativa. Decisión del usuario: «Recortar al exportar y
avisar».

### Gen 1/2: identidad y stat exp

- **No tienen PID** (todos `pid = 0`): la identidad es `location` + `box` + `slot`
  (base 1). La API acepta `{ sha256, pid }` o `{ sha256, location, box, slot }`.
- Tienen **un solo stat exp de Especial**: el índice 3 (`EV_SPA`) ES el stat exp
  especial y el índice 4 (`EV_SPD`) siempre lee 0. El plan va con
  `evs = [p0,p1,p2,p3+p4,0,p5]`; al descontar se resta primero de `pendingEvs[3]`
  y el sobrante de `[4]`.
- La rama `gen <= 2` de `VitaminClamp` es **código muerto inofensivo**: sondas en
  Gen 1 confirmaron que Gen 1/2 **no** tienen la regla de vitamina.

### Backend

- `apps/server/src/db.ts`: `EXPORTS_DIR` (`data/exports/`), tabla `exports` (19
  columnas) con índices, migración que añade `pets.location`/`box_index`/`slot`,
  tipos `ExportRow`, `getExportById`, `listExports(petId?)`.
- `apps/server/src/sidecar.ts`: `exportPlan` + tipos `ExportReport`,
  `ExportChange`, `DiffSummary`.
- `apps/server/src/index.ts`: `POST /api/pets` (adopción por pid o por ranura,
  dedupe por pid o ranura, guarda `location`/`box_index`/`slot`);
  `POST /api/pets/:id/export` (**dry-run por defecto**; 400 si no hay pendientes;
  identidad por pid o ranura; INSERT **siempre** en `exports`; al escribir
  descuenta `pendingEvs` y suma lo aplicado a `baseEvs` del perfil, y añade al
  log una entrada `kind:"export"`); `GET /api/pets/:id/exports`; `GET /api/exports`.
  Ayudante `briefExport` (quita `report_json` del listado).
- `savePet(row, state, profile?)` acepta un perfil opcional: al escribir, el
  export lo usa para pasar lo aplicado de «pendiente» a «base» y que los totales
  que muestra la app coincidan con el archivo real.
- `run()` del sidecar devuelve `ok:true` con `exitCode: 3` cuando hay stdout JSON:
  así se distingue «no se escribió» de un fallo real.

### Frontend

- `apps/web/src/nursery.ts`: `exportBlock`, `exportPreview` (dry-run),
  `exportWrite` (con `confirm`), tipo `ExportOutcome`, `lastExport`, y
  `adoptPet(sha, id: AdoptIdentity)` con `AdoptIdentity = { pid?, location?, box?, slot? }`.
- `apps/web/src/main.ts`: `MonRef`, `refsOf`, `monCard` (con `data-loc`/`data-box`/
  `data-slot`), `bindMons` (busca por PID o por ranura), `showMon(ref)` y adopción
  con identidad por ranura cuando `pid === 0`.
- `apps/web/src/style.css`: `.export-out`, `.danger-text`.
- **Fallo corregido**: el bucle de animación reemplazaba `#pg-sheet` cada ~700 ms
  sin reenganchar los botones (se perdían los listeners de `#pg-activate`/`#pg-export`);
  ahora llama a `updateSheet()`, que repinta y reengancha.

### Verificado en ejecución

- Export real por API (pet 1 Manaphy, `{write:true}`): `written:true`,
  `applied [7,0,0,0,0,0]`, `legal→legal`, archivo
  `data/exports/gen4-heartgold-spain.pet1-20261118133818.entrenado.srm`,
  `outputSha256 ed804e28…`; relectura con `inventory` confirma EV y recuentos
  (105 = 68/17/20); original `fixtures/gen4-heartgold-spain.srm` intacto
  (`1c5e78d9…`); `pendingEvs` a 0 y `baseEvs` a `[14,2,48,96,96,32]`.
- Caso de recorte (pet 4 Magnemite, pend `[4,0,0,0,0,0]`): `capped:true`,
  `withheld [4,0,0,0,0,0]`, `written:false`, **sin archivo nuevo** y pendientes
  intactos, tanto en dry como en real.
- Verificado en navegador (`agent-browser`): el bloque «Exportar al save» aparece;
  Magnemite muestra `Simulación · 5 normalizados`, `Aplicado: nada (todo retenido)`,
  `Retenido: PS 4`, sin botón de escribir; Manaphy tras entrenar muestra
  `Simulación · 137 bytes distintos · 5 normalizados`, `Aplicado: PS +7` y el botón
  «Escribir al save», que escribe el archivo, pone `Escrito`, deja `pendingEvs` a 0
  y muestra la ruta.

Pendiente de la fase 4/5: la exportación **a otro save compatible** (cadenas
oficiales) aún no se ofrece en la UI; hoy siempre escribe una copia nueva del save
de origen. Amistad y movimientos editables siguen sin implementar (solo EV/stat exp).

## Estado de la fase 5 (renombrado F0 y habitación con imagen) (19-nov-2026)

VERIFICADO en ejecución real:

- **Renombrado a Pokeguarde**: `AGENTS.md`, `README.md`, `docs/FASE-0.md`,
  `apps/web/index.html` (título y `h1`) y `apps/server/src/index.ts` (`service` de
  `/api/health` y log de arranque). El campo `service` pasa a `"pokeguarde"`; el
  frontend no lo consume (solo lee `ok`, `sidecar` y `dotnet`), así que el cambio
  no rompe contratos.
- **Excepción deliberada**: `apps/server/src/db.ts` y el archivo
  `data/pokegotchi.db` **no se renombran**. La decisión del usuario es conservar
  los datos existentes (cuatro mascotas) sin borrar, recrear ni reinicializar la
  base. El nombre del archivo es por tanto un resto intencional; renombrarlo
  requiere migrar los datos y una autorización explícita.
- **Fondo de la habitación**: `apps/web/assets/room/guarderia.png` (160x144, 10:9)
  sustituye a la sala dibujada. Se sirve por `GET /assets/*` (ruta del servidor
  Bun, con rechazo de `..` y de rutas absolutas). Si la imagen no carga, se
  mantiene la sala GBC de reserva (`drawRoomFallback`).
- **HUD fuera del lienzo**: la franja inferior de 26 px ya no se reserva. El HUD
  (nombre, ánimo, reloj, puntos y las seis necesidades) se pinta en HTML/CSS bajo
  la pantalla (`#pg-hud`, `paintHud()`); el lienzo queda solo con fondo, objetos
  interactivos y mascota. Las barras con valor menor que 25 parpadean por CSS.
- **Zona caminable configurable**: `ROOM.walk` (`minX`, `maxX`, `groundY`),
  `ROOM.sprite` (`w`, `h`) y `ROOM.sleepSpot` en `nursery.ts`. La mascota se ancla
  por los **pies** y `petPosition` deriva de ahí la esquina superior izquierda; el
  resultado visual es idéntico al anterior (no se movieron coordenadas).
- **Fondo nocturno preparado, sin asset**: `ROOM.nightImage` apunta a
  `/assets/room/guarderia-night.png`; si el archivo no existe, se sigue mostrando
  el diurno. Cuando exista, entra con un **fundido de 1,2 s** (`ROOM.crossfadeMs`)
  entre las 20:00 y las 06:00, dibujando la capa nocturna con `globalAlpha`.
- **Objetos interactivos extensibles**: tipo `RoomObject` (`id`, `box`, `draw`) y
  registro `ROOM_OBJECTS`, con el cuenco como único elemento por ahora. Sin
  gráficos nuevos ni muebles duplicados del fondo.

Pendiente de la fase 5: asset nocturno real (`guarderia-night.png`); la lógica y el
fundido ya están implementados y probados.

## Estado de la fase 5 (i18n, día/noche y comando único) (19-nov-2026)

VERIFICADO en ejecución real:

- **i18n en `apps/web/src/i18n.ts`**: `DICT_ES` completo (español por defecto, sin
  autodetección), `DICT_EN` parcial con retorno al español, `t(key, params)`,
  `setLocale`/`getLocale`, `localeTag`, `formatClock`, `formatNumber`, `has` y `keys`.
  Cubre HUD, necesidades, ánimo, mensajes del motor, botones, navegación, ficha,
  exportación y legalidad.
- `apps/web/index.html` lleva `data-i18n`/`data-i18n-title`/`data-i18n-aria` y
  `main.ts` los aplica (`applyStaticI18n`). `pet-engine.ts` y `nursery.ts` usan `t()`;
  el motor conserva los exports `STAT_LABELS`, `ACTION_INFO`, `TRAIN_GAMES` y
  `MOOD_LABEL` (construidos al cargar) y añade helpers dinámicos `statLabel`,
  `statName`, `actionLabel`, `moodLabel`, `trainLabel`, `trainHint`.
- El servidor sirve `/i18n.ts` y `/i18n.js`, `/daynight.ts` y `/daynight.js` con el
  mismo mapa de módulos que `/app.js`, `/nursery.js` y `/pet-engine.js`.
- **Día/noche**: `apps/web/src/daynight.ts` (`NIGHT_START_HOUR=20`,
  `NIGHT_END_HOUR=6`, `NIGHT_CROSSFADE_MS=1200`, `isNightHour`, `nightTarget`,
  `stepMix`); `nursery.ts` guarda `nightMix`/`lastMixAt` y aplica el alfa.
  Sin `guarderia-night.png` el objetivo es siempre 0: se mantiene `guarderia.png` y no
  se repiten peticiones. El crossfade real no es observable hasta que exista el asset.
- **Arranque en un comando**: `package.json` raíz con `dev`/`check`;
  `scripts/dev.sh` verifica Bun y .NET, compila el sidecar si falta, detecta puerto
  ocupado con mensaje claro y hace `exec env PORT=… bun run apps/server/src/index.ts`
  (sin huérfanos; Ctrl+C/SIGTERM llegan a Bun). `scripts/check.sh` ejecuta
  `pet-check.ts`, `night-check.ts`, `i18n-check.ts` y `dotnet build`.
- **Pruebas**: `bun run check` → todo correcto (motor, día/noche, traducciones y
  sidecar con 0 avisos/0 errores).
- **Endpoints**: `/api/health` 200 (`service:"pokeguarde"`), `/`, `/app.js`,
  `/nursery.js`, `/pet-engine.js`, `/i18n.ts`, `/i18n.js`, `/daynight.ts`,
  `/daynight.js`, `/style.css` y `/assets/room/guarderia.png` sirven 200;
  `/assets/room/guarderia-night.png` → 404 esperado.
- **HUD y escenario en navegador**: escritorio 1280x900 con canvas 160x144 lógico,
  CSS 800x720 (5x), ratio 1,1111, `imageSmoothingEnabled=false`, HUD debajo y del
  mismo ancho, necesidades en español, píxeles del fondo `(5,130)=124,76,46`,
  `(100,100)=76,43,30`, `(80,60)=180,161,138`. Móvil 390x844: canvas 320x288 (2x),
  `overflowX=0`, cabecera envuelta y HUD debajo. Capturas en
  `/tmp/opencode/poke5-nursery-desktop.png`, `poke5-nursery-mobile.png`,
  `poke5-library-mobile.png`.
- **API y BD intactas**: 4 mascotas (2 ELECTRODE activa Nv67, 1 MANAPHY Nv36,
  3 NIDOKING Nv72, 4 MAGNEMITE Nv16); `POST /api/pets/4/action` responde en español
  (`"MAGNEMITE ronronea."`). `data/pokegotchi.db` no se renombró ni se recreó.

Pendiente de comprobar (no verificable aún): efecto visual del fundido nocturno, que
requiere añadir `apps/web/assets/room/guarderia-night.png`.
