# PG-08G.1 — Pruebas exploratorias (aisladas, NO integradas)

## Alcance

Se autorizaron pruebas aisladas y no destructivas. No se han creado Pokémon,
PKM ni saves; no se ha abierto SQLite de producción; no se ha modificado el
motor genético ni los contratos aprobados. El único código nuevo es un spike
bajo `docs/informes/fases/PG-08/PG-08G1/experimentos/`, **fuera** de
`scripts/check.sh` y de `src/`.

## Experimento A — Derivación determinista del par 1+1

Archivo: `experimentos/rng-spike.ts`.
Comando: `bun run docs/informes/fases/PG-08/PG-08G1/experimentos/rng-spike.ts`.

Hipótesis: con un contexto que incluya `cycleId`, `productionEventId`,
`recipientRole`, secuencia de autoridad, versión de reglas, algoritmo y
propósito, dos huevos del mismo ciclo reciben flujos distintos y reproducibles
sin `Math.random()`.

Resultado real (EXIT 0):

```
OK   mismo contexto → misma secuencia
OK   host != guest
OK   ivdv != nature
OK   sin Math.random en el módulo
OK   salida acotada a uint32
PG-08G1-EXPLORE — 5/5 correctos, 0 fallidos
host[0..3]=2619427390,3317612982,2969146333,924646081
guest[0..3]=2988193199,778328449,1808688660,3418783480
```

Conclusión: la separación de dominios es viable como diseño. **No** demuestra
que las reglas genéticas de ninguna generación sean correctas; solo que la
derivación no colisiona. La semilla del spike es un literal de prueba y no debe
usarse en producción.

## Experimento B — Inspección de contratos existentes

Lectura directa de `breeding-engine.ts`, `egg-domain.ts`, `egg-pair-domain.ts`,
`shared-egg-store.ts` y `shared-egg-pair-store.ts`. Confirmado:

- `unresolvedGenetics(generation)` devuelve siempre `status:"unresolved"` y
  todos los campos genéticos a `null`.
- `pairEggIdFor(cycleId, productionEventId, role)` ya distingue anfitrión e
  invitado; sirve de entrada al contexto de derivación propuesto.
- No existe ningún tipo `NatureResolver`, `IVDVResolver`, `ShinyResolver` ni
  similar: los nombres de la misión son propuestas.
- Los stores no contienen reglas de herencia.

## Experimento C — API de PKHeX.Core

Ver `PKHEX-AUDIT.md`. Se usó el comando `members` del sidecar, de solo lectura,
para comprobar qué tipos están realmente presentes en la versión 26.10.18. No
se modificó el sidecar ni se invocó ningún generador.

## NO realizado

- No se integró nada en `scripts/check.sh`.
- No se ejecutaron pruebas contra saves ni PKM.
- No se crearon fixtures sintéticos de Pokémon.
- No se instalaron dependencias.
- No se iniciaron servidores ni conexiones de red desde el spike.
