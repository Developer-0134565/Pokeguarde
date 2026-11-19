# Guardería: motor, render y límites

Implementado en `apps/web/src/pet-engine.ts` (motor puro, sin DOM), `apps/web/src/daynight.ts`
(lógica pura día/noche), `apps/web/src/i18n.ts` (traducciones), `apps/web/src/nursery.ts`
(render y puente con la API) y las rutas `/api/pets*` de `apps/server/src/index.ts`.
Estado medido el 19-nov-2026.

## Principio: determinismo

El motor no guarda relojes ni temporizadores propios. Todo el estado se deriva de
`(estado previo, perfil, marca de tiempo)`:

```
advance(state, profile, now) -> PetState
```

El servidor y el navegador usan **la misma función**; por eso un tick corto y una
semana cerrada dan el mismo resultado. `scripts/pet-check.ts` lo comprueba: un salto
de 24 h y 96 pasos de 15 min coinciden con diferencia < 0.05.

- `ENGINE_VERSION = 1`.
- Puesta al día máxima: **7 días** (`MAX_CATCHUP_MS`). Más allá se simula una semana y
  el diario anota «Puesta al día limitada a 7 días».
- El diario se recorta a las **40** últimas entradas.
- Nada de LLM en el bucle: la personalidad es una función de la especie.

## Perfil: qué modula el comportamiento

`PetProfile` guarda lo que viene del save y nunca se reescribe: `species`, `level`,
`nature`, `ivs`, `baseEvs`, `generation`, `pid`, `ot`, `shiny`, `gender`.

- **IV/DV**: solo se usan para el vigor (`vigorOf` = suma / 186) y nunca se editan.
- **Rasgos** (`traitsOf(species)`): `appetite`, `efficiency`, `cleanliness`,
  `sociability`, `activity` (0.80-1.25) y `nocturne` (≈18 % de las especies).
  Es una función determinista de la especie, documentada como **aproximación
  coherente**, no una tabla real de 649 entradas.
- **Naturalezas** (`natureMods`): tabla de las 25 con modificadores de `appetite`,
  `activity` y `mood`. Ejemplos: `Adamant` apetito ×1.12; `Timid` actividad ×1.14;
  `Calm` ánimo ×0.90; `Bashful`, `Quirky`, `Hardy`, `Docile`, `Serious` neutras.
- **Nivel**: la madurez (`level/100`) reduce el gasto de energía (`1.12 − 0.24·m`).

Estado inicial (`createState`): hambre 82, felicidad `70 + sociabilidad·8`, energía
`88 + vigor·8`, higiene 90, disciplina 55, sueño 18, peso ideal
`2 + especie/42 + nivel/32 + apetito·0.6` kg, EV pendientes a 0.

## Necesidades y decaimiento (por hora, despierto / dormido)

| Necesidad | Despierto | Durmiendo |
|---|---|---|
| Hambre | −3.6 · apetito · naturaleza | −1.7 · apetito · naturaleza |
| Higiene | −3.0 · limpieza | −1.1 · limpieza |
| Energía | −4.2 · actividad · naturaleza · (1.12 − 0.24·madurez) / eficiencia | **+15 · eficiencia** |
| Sueño | +6.2 · hora (+2.8 si es nocturno y es de noche) | −26 |
| Disciplina | −0.55 | −0.15 |

Todas las barras se recortan a 0..100. La felicidad no es un número fijo: persigue

```
objetivo = min(hambre, higiene)·0.45 + energía·0.30 + disciplina·0.15 + 12
```

y se mueve hacia él a un ritmo de `2.4 · ánimo` por hora.

Eventos automáticos:

- Se duerme solo al llegar a energía 0 (y anota «se ha quedado dormido de agotamiento»).
- Se despierta solo a energía ≥ 99.5 o sueño ≤ 0.
- Hambre 0: −4 de felicidad y aviso en el diario (una vez por puesta al día).
- El peso tiende al ideal un 2 % por hora; se gana +0.18 kg por comida.
- Puntos: +0.15 por hora (tope 9999).

## Acciones

| Acción | Tecla | Enfriamiento | Efecto |
|---|---|---|---|
| Comer | 1 | 15 min | hambre +26·(1.12 − 0.1·apetito), felicidad +4, higiene −5, energía +3, peso +0.18 kg |
| Jugar | 2 | 8 min | felicidad +12·sociabilidad, energía −9, higiene −6, disciplina +1.5, sueño +6 |
| Limpiar | 3 | 20 min | higiene +45, felicidad +2, energía −3 |
| Acariciar | 4 | 90 s | felicidad +5, disciplina +1, sueño +2 |
| Reprender | 5 | 4 min | disciplina +12, felicidad −10 (no pasa de disciplina 85) |
| Dormir | 6 | — | se acuesta |
| Despertar | — | — | lo despierta; si energía < 30, felicidad −5 |

Rechazos con motivo (HTTP 409, nunca un fallo silencioso): comer dormido o con hambre
> 92 («está lleno»), jugar dormido o con energía < 20, acariciar dormido, reprender con
disciplina ≥ 85, despertar a quien ya está despierto, y cualquier acción dentro de su
enfriamiento («Espera N min para volver a comer»).

## Entrenamiento por minijuegos

Seis juegos, uno por stat, con el orden de PKHeX:

| Juego | Stat |
|---|---|
| Carrera | PS |
| Empuje | Ataque |
| Muro | Defensa |
| Chispa | At. Esp. |
| Calma | Def. Esp. |
| Reflejos | Velocidad |

Minijuego: 5 rondas, el cursor barre una barra y hay que pulsar dentro de la zona
(Espacio, Intro o clic). El periodo empieza en 1500 ms y baja 150 ms por ronda (mínimo
700). La zona objetivo es determinista por `pid`, stat y ronda; el acierto vale
`1 − distancia/0.22` acotado a 0..1. El `score` final es la media de las 5 rondas.

Concesión de EVs reales (`train`):

```
Gen 3+  :  round(2 + 6·q)      unidad EV      topes 255/stat, 510 total
Gen 1-2 :  round(250 + 750·q)  unidad stat exp tope 65535/stat, sin tope global
```

Después se modula por condición: `0.55 + 0.45·(energía·0.6 + higiene·0.25 + felicidad·0.15)`,
con un mínimo de 1. Nunca se supera el tope legal: si el stat está a 255 o el total a 510,
la concesión se recorta y el mensaje lo dice («+N EV en PS (tope alcanzado)»); si no cabe
nada, se rechaza con el motivo.

`q` está acotado a 0..1, verificado: `score 7` concede lo mismo que `score 1`, y un score
negativo deja el mínimo legal.

Coste de cada sesión: energía −12, hambre −7, higiene −6, felicidad +7·q, disciplina +1,
+1 entrenamiento, puntos `20 + 80·q`. Enfriamiento entre rondas: **45 s**.

Requisitos para entrenar: despierto, energía ≥ 15, hambre ≥ 10.

## Adopción, liberación y persistencia

- `POST /api/pets` con `{sha256, pid}`: rechaza **422** si el veredicto es `illegal`
  (los `unverified` sí se adoptan), **409** si ese Pokémon ya está adoptado, **404** si el
  pid no está en la partida. La primera mascota queda activa.
- Varias mascotas conviven; una activa. `POST /api/pets/:id/active` cambia la activa.
- `DELETE /api/pets/:id` exige `{confirm:true}` y **solo borra la fila de la Guardería**:
  no toca el save.
- `profile_json` guarda el perfil; `state_json` el estado. Los rasgos se recalculan al
  cargar porque son función pura de la especie.
- `petView(row, now)` aplica `advance` y persiste si cambió: abrir la Guardería después de
  horas de ausencia ya muestra el estado real (verificado con un retroceso de 3 h:
  hambre 93 → 81.3, energía 75.2 → 62.9, higiene 72.9 → 63.0, felicidad 100 → 92.8).

## Render

- Lienzo interno **160x144** (10:9), `imageSmoothingEnabled = false` e
  `image-rendering: pixelated`. Escala entera adaptativa:
  - escritorio ancho (> 1100 px, panel lateral de 320 px): se reservan 420 px;
  - una sola columna (≤ 1100 px): se reservan 58 px (padding + marco);
  - mínimo **2x** y máximo **7x**. En pantallas ≤ 720 px la cabecera envuelve y se
    reducen márgenes para que el lienzo 2x (320x288) quepa sin desbordes horizontales.
    El HUD conserva siempre el mismo ancho que el lienzo.
- **Fondo**: `apps/web/assets/room/guarderia.png` (160x144) servido por `GET /assets/*`
  (rechaza `..` y rutas absolutas). Si la imagen no carga, se usa la sala GBC de
  reserva (`drawRoomFallback`).
- **HUD fuera del lienzo**: `#pg-hud` en HTML/CSS bajo la pantalla, con nombre, ánimo,
  reloj local, puntos y las seis necesidades. La franja inferior del lienzo ya no se
  reserva. Las barras con valor < 25 parpadean por CSS.
- **Objetos interactivos**: registro `ROOM_OBJECTS` (tipo `RoomObject`: `id`, `box`,
  `draw`); hoy solo el cuenco (con bayas si hambre < 75).
- La mascota se ancla por los **pies**: `ROOM.walk` (`minX`, `maxX`, `groundY`) y
  `ROOM.sprite` (`w`, `h`) definen la franja caminable y la caja de dibujo;
  `ROOM.sleepSpot` marca la cama. Las coordenadas visuales no cambiaron al pasar a
  fondo fotográfico.
- Paleta GBC de 4 colores (`#0f380f`, `#306230`, `#8bac0f`, `#9bbc0f`) en los
  elementos dibujados (sprites, fuente, objetos); el fondo es una imagen y por tanto
  no está limitado a esa paleta.
- Fuente propia 3x5 dibujada píxel a píxel (sin fuentes del sistema); solo ASCII.
- La mascota se dibuja con seis arquetipos (cuadrúpedo, bípedo, ave, serpiente, acuático,
  bola) elegidos por una tabla curada de especies icónicas y, en su defecto, por un hash.
  Es una **aproximación visual**, no un dato del save. Hay variante shiny y pose de
  dormido, comer, feliz y triste.
- Efectos de ambiente: moscas si higiene < 35, «Z» si duerme, corazones si está feliz.

## Ciclo día/noche

La lógica pura vive en `apps/web/src/daynight.ts`; `nursery.ts` solo guarda el estado
(`nightMix`, `lastMixAt`) y lo aplica al dibujar.

- Es de noche de **20:00 a 06:00** (hora local inclusive/exclusiva):
  `isNightHour(hour)`.
- `nightTarget(hour, hasNightImage)` devuelve 1 solo si toca noche **y** existe la
  imagen nocturna; si no, 0. Sin asset se mantiene `guarderia.png` y no se repiten
  peticiones al archivo inexistente.
- `stepMix(current, target, dtMs, durationMs)` avanza el fundido sin pasarse del
  objetivo. `NIGHT_CROSSFADE_MS = 1200` (1,2 s).
- `ROOM.nightImage` apunta a `/assets/room/guarderia-night.png`; cuando exista se
  dibuja encima con `globalAlpha`, tanto al entrar como al salir de la noche.
- `scripts/night-check.ts` comprueba la ventana 20→06, la ausencia de asset, el
  fundido de 1,2 s, la suma de fotogramas y la vuelta a diurno.

## i18n

- `apps/web/src/i18n.ts`: diccionario `DICT_ES` completo, `DICT_EN` parcial con
  retorno al español, `t(key, params)`, `setLocale`/`getLocale`, `localeTag`,
  `formatClock`, `formatNumber`, `has` y `keys`.
- **Español por defecto**, sin autodetección del navegador. Un idioma desconocido se
  ignora y una clave ausente en inglés cae al español.
- Los textos cubren HUD, necesidades, estados/ánimo, mensajes del motor, botones,
  navegación, ficha, exportación y legalidad. `index.html` lleva `data-i18n`,
  `data-i18n-title` y `data-i18n-aria`; `main.ts` los aplica al arrancar.
- El motor conserva los exports `STAT_LABELS`, `ACTION_INFO`, `TRAIN_GAMES` y
  `MOOD_LABEL` (construidos al cargar, por compatibilidad) y añade helpers dinámicos
  `statLabel`, `statName`, `actionLabel`, `moodLabel`, `trainLabel` y `trainHint`.
  La UI usa los helpers en tiempo de render.
- El lienzo 3x5 solo tiene glifos ASCII: `game.*` y `empty.*` van sin tildes.
- `scripts/i18n-check.ts` valida claves críticas y dinámicas, literales del código y
  del HTML, ASCII en canvas, subconjunto inglés, mismos parámetros y reloj local.

## Límites conocidos

- La exportación **a otro save compatible** (cadenas oficiales Gen 3→4, 4→5) aún no
  se ofrece en la UI: hoy siempre escribe una copia nueva del save de origen.
- Solo se editan EV/stat exp; amistad y movimientos editables siguen sin implementarse.
- El asset nocturno `guarderia-night.png` no existe todavía; el fundido está probado en
  la lógica pura, pero su efecto visual queda pendiente de añadir la imagen.
- Los arquetipos y rasgos son aproximaciones deterministas, no datos oficiales.
- El ánimo y el diario son de la app: en Gen 1 y 3 no existen cartas en el save.
- Solo Gen 1-5: `capsFor` asume stat exp en Gen 1-2 y EV en Gen 3+.
