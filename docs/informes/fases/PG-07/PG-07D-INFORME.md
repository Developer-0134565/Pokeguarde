# PG-07D — EQUIPO ACTIVO en la Biblioteca

**Fecha:** 19-nov-2026  
**Estado:** TERMINADO Y VERIFICADO  
**Repositorio:** `/home/<usuario>/Proyectos/Pokeguarde`  
**HEAD (sin cambios):** `819b73b49a8aca76486173917d7abdb4518290ab` (rama `main`)

## 1. Objetivo

Implementar `EQUIPO ACTIVO` dentro de la Biblioteca con seis espacios reales, en el orden de la partida, y permitir abrir la FICHA/DATOS existente de PG-07C conservando la posición y el contexto de retorno. Sin commits, pushes ni cambios en archivos protegidos.

## 2. VERIFICADO

### 2.1 Auditoría previa

- Leídos los documentos y el informe de PG-07C, y comprobado el estado Git inicial.
- Estado Git inicial: HEAD `819b73b49a8aca76486173917d7abdb4518290ab`; hash del `git status` inicial `43dd1da9fc5d1792ebbe6b5a361e0cffd6d8ebf4313e9dbe077f71abb27e2d3b`.
- Contrato real confirmado: `GET /api/saves/:sha256` entrega `inventory.party`. No existe campo de estado alterado en `PkmJson`, por lo que no se inventa: solo se muestra si el contrato lo aporta.
- `stats.hp` y `stats.hpMax` sí existen y se usan para la barra de PS.
- Género: `"0"` macho, `"1"` hembra, `"2"` sin género. En Gen I no se muestra porque el campo no existe en ese juego, aunque el sidecar devuelva un valor.
- No se creó módulo TS nuevo porque el servidor tiene un mapa fijo de módulos y estaba fuera de alcance. Las funciones puras se aislaron entre marcadores dentro de `main.ts`.
- No se añadió un listener global de teclado: el teclado del panel va ligado a `panel.onkeydown`.

### 2.2 Implementación

- Nueva pestaña `Equipo activo`, conservando íntegras `Equipo`, `Cajas`, `Mochila` y `Legalidad`.
- Panel con exactamente seis ranuras; las vacías dicen `Sin Pokémon`; nunca se genera un Pokémon ficticio.
- Orden real de `inventory.party`; nunca se ordena ni se reordena persistentemente.
- Cada ranura muestra sprite local, número de posición, nivel, nombre/apodo, especie, género cuando corresponde, legalidad, PS reales y estado solo si existe.
- Selección por flechas, `Home`/`End`, `Enter`/Espacio y `Escape`; ratón/click y botones reales accesibles; `touch-action: manipulation`.
- Click en ranura vacía: aviso `Esa ranura está vacía; no hay ficha que abrir.` y no se abre ninguna ficha.
- La selección se mantiene al abrir y cerrar la ficha; se descarta al cambiar de partida.
- `openDossierFromLibrary(ref, fromTeam)` reutiliza la ficha PG-07C. `closeDossier()` usa `restoreLibrary("team")` para repintar el panel y recuperar la selección.
- `showLibrary()` se mantuvo sin parámetros para no romper la comprobación PG-07C; el retorno contextual se implementó en `restoreLibrary(tab)`.
- Sprites overworld locales con reintento limitado, `imageSmoothingEnabled = false` y CSS `image-rendering: pixelated`. Si no hay sprite, se muestra `Sprite no disponible`.
- i18n ES y EN añadidas; español por defecto.
- CSS GBC/Pocket Tech 1999 con grid de 3 columnas, 2 columnas ≤900 px y 1 columna ≤480 px.

### 2.3 Archivos modificados por PG-07D

- `apps/web/src/main.ts` — helpers puros del equipo, panel, selección, sprites y retorno contextual.
- `apps/web/src/i18n.ts` — claves `tab.team` y `team.*` en ES/EN.
- `apps/web/src/style.css` — bloque `EQUIPO ACTIVO (PG-07D)` y mediaqueries.
- `scripts/pg07d-check.ts` — nueva suite headless (sin seguimiento).
- `scripts/check.sh` — registro de la suite PG-07D.

`apps/web/index.html` y `apps/web/src/nursery.ts` ya estaban modificados por PG-07B/C y no fueron tocados por PG-07D.

### 2.4 Archivos protegidos intactos

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

No se escribieron partidas, no se exportaron Pokémon, no se adoptó ninguna mascota y no se tocaron cajas, mochila, legalidad, Guardería, Stitch, base de datos ni sidecar.

### 2.5 Pruebas

- `bun run check` → **EXIT 0**, `Todo correcto.` Incluye motor, día/noche, i18n, PG-07A 54/54, PG-07B 43/43, PG-07C completo, PG-07D completo y sidecar con 0 avisos/0 errores.
- `bun run scripts/pg07d-check.ts` → **77 comprobaciones correctas**, sin fallos.
- Dos fallos iniciales estaban en el propio test: comparar `ref.pid` en vez de `ref.p.pid`, y buscar `touch-action` en `main.ts` en vez de CSS. Corregidos sin tocar la implementación.
- Un fallo posterior de PG-07C se debió a haber cambiado la firma de `showLibrary()`; se restauró la firma y se movió el retorno a `restoreLibrary(tab)`.

### 2.6 Navegador real

Servidor real en `127.0.0.1:8787`, sesión aislada de `agent-browser`, sin consola con errores.

**Escritorio 1280×900:**
- Pestaña `Equipo activo` visible con seis ranuras.
- HeartGold España: seis Pokémon reales, en orden: MANAPHY Nv36, NIDOKING Nv72, ELECTRODE Nv67, HO-OH Nv59, ALAKAZAM Nv78, GOLEM Nv61.
- PS y legalidad reales por ranura, incluido `PS 0/190` e `ilegal` en GOLEM.
- Seis sprites locales cargados tras la inicialización asíncrona.
- Grid de 3 columnas, una selección activa, `overflowX = 0`.
- Flecha derecha desde la primera ranura seleccionó NIDOKING; `Enter` abrió su ficha con PS `157/225`; `← Volver` regresó a `EQUIPO ACTIVO` con NIDOKING todavía seleccionado.
- Cambio a Blue USA: cinco Pokémon reales y sexta ranura `Sin Pokémon`; la selección anterior se descartó. Click en la ranura vacía mostró el aviso y no abrió ficha.
- `Escape` canceló la selección con `Selección cancelada.`
- Cambio a `Equipo` y vuelta a `Equipo activo`: seis ranuras repintadas.

**Móvil 390×844:**
- Grid de 1 columna, seis ranuras, `overflowX = 0`.
- Sin desplazamiento horizontal; cabecera y HUD adaptados.
- Captura tomada con el panel desplazado a la parte superior de la vista.

## 3. Capturas

| Archivo | Tamaño | SHA-256 |
|---|---|---|
| `/home/<usuario>/Descargas/PG-07D-Desktop.png` | 1280×900 | `64498464679ed2fe9ec631adaf6bb08d4fa46b6ef26de996efc208d679cdf00a` |
| `/home/<usuario>/Descargas/PG-07D-Mobile.png` | 390×844 | `e131ecf3bdb39d1c3f3b2ad333f4ac056eab47dd6a1fb2cad01fed75a517d161` |

## 4. Decisiones

- Reutilizar la vista `#sheet` de PG-07C en lugar de crear una segunda ficha.
- Mostrar `Sin Pokémon` en los huecos, sin rellenar con especies inventadas.
- No mostrar género en Gen I ni estado alterado si el contrato no lo expone.
- Mantener `showLibrary()` sin parámetros por compatibilidad con PG-07C; añadir `restoreLibrary(tab)` para el retorno desde la ficha.
- No añadir módulo TS nuevo por el mapa fijo de rutas del servidor.
- No tratar los mockups Stitch como autoridad de datos ni asignar IDs `SCREEN_XX` sin evidencia.

## 5. Estado Git final

- HEAD sin cambios: `819b73b49a8aca76486173917d7abdb4518290ab`.
- Sin commits ni pushes.
- `git status --porcelain=v1 --untracked-files=all` → 46 líneas; SHA-256 del listado: `aae790ee271805f1070185d8a74b2eff6799b8a21ce127809b484b1ee3cc2d78`.
- Modificados: `apps/web/index.html`, `apps/web/src/i18n.ts`, `apps/web/src/main.ts`, `apps/web/src/nursery.ts`, `apps/web/src/style.css`, `scripts/check.sh`.
- Nuevo sin seguimiento: `scripts/pg07d-check.ts`.
- Permanecen intactos los archivos sin seguimiento preexistentes de PG-07B, PG-07C, Stitch y el ZIP de referencias.

## 6. PENDIENTE DE COMPROBAR

- No se emularon eventos `touchstart`/`touchend` reales: se verificaron botones HTML, click y `touch-action: manipulation`, pero no un dispositivo táctil físico.
- No había ningún save con campo de estado alterado en el contrato; su renderizado se cubrió con pruebas headless, no con datos reales.
- No se dispuso de un save corrupto para provocar un error de lectura en navegador; los casos `party` nula, inválida y selección fuera de rango se cubren en `pg07d-check.ts`.
- El aspecto visual definitivo frente a los mockups Stitch sigue en revisión; PG-07D solo conserva la estética GBC/Pocket Tech ya vigente.
