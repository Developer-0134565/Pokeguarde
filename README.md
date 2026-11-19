# Pokeguarde

Biblioteca local de partidas Pokémon (Gen 1-5) con inventario completo y una
**Guardería** tamagotchi en resolución de Game Boy Color.

Estado: **fases 1, 2, 3, 4 y 5 hechas y verificadas**. La web lee saves reales, muestra
el inventario completo, la ficha de cada Pokémon, la legalidad en tres estados y una
**Guardería** con motor determinista y render GBC. La fase 4 añade la **exportación
verificada**: los EV entrenados se escriben en una **copia nueva** del save, con
previsualización (dry-run), informe de diff y validación de legalidad. La fase 5
añade **i18n con español por defecto**, el **ciclo día/noche** de la habitación
(preparado para el asset nocturno) y el **arranque en un solo comando**.

## Arranque en un comando

```bash
cd Pokeguarde
bun run dev      # API + web en http://127.0.0.1:8787
bun run check    # motor, día/noche, traducciones y compilación del sidecar
```

`bun run dev` comprueba Bun y el SDK de .NET, compila el sidecar PKHeX si aún no
existe, detecta si el puerto 8787 está ocupado (con mensaje claro) y arranca la API.
El sidecar no queda como proceso permanente: se lanza por petición. Al usar `exec`,
Ctrl+C y SIGTERM llegan directamente a Bun, sin dejar procesos huérfanos. Para otro
puerto: `PORT=9000 bun run dev`.

`bun run check` no arranca el servidor: ejecuta las pruebas del motor
(`scripts/pet-check.ts`), del ciclo día/noche (`scripts/night-check.ts`), de las
traducciones (`scripts/i18n-check.ts`) y compila el sidecar en Release.


## Requisitos

- .NET SDK 10 (instalado en `~/.dotnet`, sin root).
- Bun 1.3+ (sirve la API y transpila el TypeScript del frontend al vuelo).

Exporta siempre el PATH del SDK en esta sesión:

```bash
export PATH="$HOME/.dotnet:$PATH"
```

## Sidecar de lectura (funciona ya)

```bash
cd services/pkhex

# Inspeccionar un save: inventario + legalidad + prueba de ida y vuelta
dotnet run -- inspect ../../fixtures/gen4-heartgold-spain.srm

# Buscar saves en una carpeta y decir qué son
dotnet run -- scan /ruta/a/tus/saves

# Explorar la API de PKHeX.Core (para no adivinar nombres)
dotnet run -- members Badge SAV1
```

`inspect` devuelve JSON por stdout. Si el save no se reconoce, sale con código 1
y un objeto `{"detected": false, ...}`.

## Servidor y web

La forma recomendada es `bun run dev` (ver arriba). Para arrancarlo a mano:

```bash
export PATH="$HOME/.dotnet:$PATH"
cd apps/server
bun run src/index.ts        # queda escuchando en http://127.0.0.1:8787
```

Abre `http://127.0.0.1:8787`, arrastra un `.srm`/`.sav`/`.dsv` y aparecerá la
partida con sus pestañas Equipo, Cajas, Mochila y Legalidad.

Rutas de la API:

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | estado del servicio y del sidecar |
| GET | `/api/saves` | partidas importadas |
| POST | `/api/saves/import` | `{ "path": "/ruta/absoluta/al/save" }` |
| POST | `/api/saves/upload?filename=x.srm` | cuerpo binario del save |
| GET | `/api/saves/:sha256` | resumen + inventario completo |
| GET | `/api/saves/:sha256/pokemon?legal=&q=` | búsqueda de Pokémon |
| POST | `/api/saves/:sha256/reparse` | relee el save y refresca el inventario |
| POST | `/api/saves/reparse` | refresca todas las partidas |
| GET | `/api/pets` | mascotas adoptadas con su estado al día |
| POST | `/api/pets` | `{ "sha256": "...", "pid": 123 }` o `{ "sha256": "...", "location": "box", "box": 0, "slot": 1 }` (Gen 1/2 sin PID) adopta un Pokémon |
| GET/DELETE | `/api/pets/:id` | ficha de la mascota; borrar exige `{ "confirm": true }` |
| POST | `/api/pets/:id/action` | `{ "action": "feed" }` (feed, play, clean, pet, scold, sleep, wake) |
| POST | `/api/pets/:id/train` | `{ "stat": 0, "score": 0.9 }` suma EV/stat exp reales |
| POST | `/api/pets/:id/active` | marca la mascota activa |
| GET | `/api/pets/games` | minijuegos y enfriamientos de las acciones |
| POST | `/api/pets/:id/export` | `{}` previsualiza (dry-run); `{ "write": true }` escribe una copia nueva del save |
| GET | `/api/pets/:id/exports` | historial de exportaciones de la mascota |
| GET | `/api/exports` | historial de exportaciones (todas) |

Notas de implementación:

- El frontend vive en `apps/web` en TypeScript y **no usa Vite**: el servidor
  transpila `src/main.ts`, `src/nursery.ts` y `src/pet-engine.ts` con `Bun.Transpiler`
  y los sirve como `/app.js`, `/nursery.js` y `/pet-engine.js`; los módulos puros
  compartidos se sirven como `/i18n.ts` (o `/i18n.js`) y `/daynight.ts`
  (o `/daynight.js`). Es una desviación consciente del plan inicial para no instalar
  dependencias; se puede migrar a Vite cuando se autorice `npm install`. El motor de
  la Guardería se comparte tal cual entre navegador y servidor, así que la simulación
  es la misma en ambos.
- **i18n**: todos los textos visibles salen de `apps/web/src/i18n.ts`, con diccionario
  español completo (idioma por defecto, sin autodetección) e inglés parcial con
  retorno al español para lo que falte. La UI aplica `data-i18n` sobre el HTML
  estático y usa `t()` en tiempo de render para el resto. El lienzo GBC usa una
  fuente 3x5 solo ASCII, así que sus cadenas (`game.*`, `empty.*`) van sin tildes.
- **Día/noche**: la lógica pura está en `apps/web/src/daynight.ts`; es de noche de
  20:00 a 06:00 (hora local) y el cambio de fondo usa un fundido de 1,2 s. Hoy no
  existe `apps/web/assets/room/guarderia-night.png`, así que se mantiene el fondo
  diurno (`guarderia.png`) sin peticiones repetidas al asset inexistente.
- Los saves se guardan por SHA-256 en `data/saves/` y el inventario completo en
  SQLite (`data/pokegotchi.db`; el archivo conserva ese nombre a propósito para no
  romper los datos existentes). Reimportar el mismo archivo no duplica.
- Si el sidecar no reconoce un save (típico en hacks), la API responde 422 con el
  hash y una pista, en lugar de inventar datos.

## Qué hace hoy

- Detecta y parsea saves de Gen 1, 2, 3, 4 y 5 (también hacks, cuando su estructura
  es compatible).
- Extrae entrenador, dinero, tiempo, medallas (como máscara), equipo, cajas y, por
  Pokémon: especie, mote, nivel, EXP, naturaleza, habilidad, objeto, amistad, IV,
  EV, movimientos y legalidad con motivos.
- Mide la ida y vuelta `parse → serialize` sobre una **copia clonada**. Si no es
  idéntica byte a byte no se bloquea: la salida es la forma canónica de PKHeX y el
  diff colateral se informa en el registro de cada exportación.
- Web local con lista de partidas, equipo, cajas, mochila, Pokédex, medallas y
  ficha completa de cada Pokémon (stats, IV, EV, movimientos con PP, origen,
  amistad y motivos de ilegalidad).
- **Guardería**: adoptas un Pokémon legal o no verificable y vive en una habitación
  160x144 con paleta GBC de 4 colores. Seis necesidades que decaen con el reloj real,
  siete acciones con enfriamiento, sueño autorregulado y seis minijuegos que suman
  **EV/stat exp reales** con el tope legal de cada generación (255/510 en Gen 3+,
  65535 por stat en Gen 1-2). Varias mascotas, una activa, con puesta de día al abrir.
- **Exportación verificada** (fase 4): desde la Guardería previsualizas el cambio
  (dry-run, sin tocar nada), ves el diff y la legalidad antes/después y escribes los
  EV en una **copia nueva** del save (`Juego.entrenado.srm`). El original nunca se
  sobrescribe. Si los EV no caben en lo legal, se recortan y se avisa; el sobrante
  queda pendiente. La salida es la forma canónica completa de PKHeX y el diff
  colateral se informa. Cada exportación queda registrada en SQLite con hashes.
- **Interfaz en español** (fase 5): cadenas centralizadas en `i18n.ts`, con el
  español como idioma por defecto y el inglés preparado. HUD, necesidades, estados,
  mensajes, botones y navegación se traducen por la misma API; añadir otro idioma es
  completar su diccionario.
- **Habitación con imagen y día/noche** (fase 5): el lienzo 160x144 usa
  `assets/room/guarderia.png` con nearest-neighbor; el HUD vive en HTML/CSS debajo
  de la pantalla. De 20:00 a 06:00 se prepara un fundido de 1,2 s al fondo nocturno
  cuando exista el asset; mientras no exista, se mantiene el diurno.

## Qué no hace todavía

- La exportación **a otro save compatible** (cadenas oficiales Gen 3→4, 4→5) no se
  ofrece en la UI: hoy siempre escribe una copia nueva del save de origen.
- Solo se editan EV/stat exp; amistad y movimientos editables aún no.

Limitaciones conocidas:

- La legalidad de PKHeX da **falsos positivos** en hacks y en saves de idioma no
  inglés evaluados con cadenas inglesas; por eso existe el estado «no verificable»
  (ámbar) que no bloquea la Guardería.
- En Gen 1-3 PKHeX no expone Pokédex; la app lo indica en vez de inventarlo.
- Los nombres de bolsillo de la mochila llegan en inglés.
- Los rasgos de personalidad y los arquetipos de sprite de la Guardería son
  aproximaciones deterministas, no datos oficiales.

## Estructura

```
apps/web        interfaz en TS servida por Bun (sin Vite)
apps/server     API local Bun + SQLite
services/pkhex  sidecar C# con PKHeX.Core (funcional)
data            datos generados, fuera de git
fixtures        saves de prueba con hash fijado
docs            investigación y decisiones
scripts         utilidades
```

## Documentos

- `AGENTS.md`: reglas del proyecto y decisiones vinculantes.
- `docs/FASE-0.md`: cadenas de transferencia, legalidad, matriz de edición,
  protocolo de escritura y límites encontrados.
- `docs/LEGALIDAD.md`: los tres estados, motivos cosméticos y destinos de exportación.
- `docs/GUARDERIA.md`: motor determinista, necesidades, acciones, minijuegos, topes
  de EV/stat exp, render GBC, HUD, ciclo día/noche e i18n.
- `fixtures/FIXTURES.md`: hashes y resultados del spike.

La exportación y su protocolo de escritura están en `AGENTS.md` («Estado de la
fase 4» y «Escritura de saves») y la medición de ida y vuelta en `docs/FASE-0.md` §9.

## Aviso

Los sprites de GBC y los datos de PokeAPI/Showdown son material de terceros para
uso personal; no se distribuyen con el proyecto.
