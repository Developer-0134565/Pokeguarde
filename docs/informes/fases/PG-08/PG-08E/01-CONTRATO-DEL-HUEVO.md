# PG-08E · 01 — Contrato del huevo simulado

Módulo: `packages/core/src/egg-domain.ts`. Esquema `pg08e.egg-domain`, versión `1.0.0`.
El módulo es puro: no importa Bun, HTTP, DOM, PKHeX ni el motor Tamagotchi.

## Identidad

`eggIdFor(cycleId, productionEventId)` produce `egg:<ciclo>:<sha256-16>`. La
identidad NO se deriva del nombre, la especie, el PID ni ningún atributo del
Pokémon. Dos eventos distintos del mismo ciclo tienen IDs distintos; el mismo
evento siempre produce el mismo ID, incluso tras reiniciar el almacén.

`EggRecord` contiene: `schema`, `version`, `eggId`, `nurseryId`,
`breedingCycleId`, `parents` (par de `EggParentRef` con `stayId`,
`pokemonInstanceId`, `ownerId` y `role`), `producedAt`, `productionEventId`,
`ownerId`, `recipientId`, `assignmentPolicy`, `state`, `cancelReason`,
`contractVersion`, `provenance` (por progenitor), `legitimacy`, `createdAt` y
`updatedAt`.

`validateEgg` comprueba esquema, versión, ID derivado, integridad de la pareja,
formato de fechas, clase de procedencia de cada progenitor, legitimidad y
motivo de cancelación.

## Legitimidad

`EGG_LEGITIMACY` declara permanentemente:

- `simulated: true`
- `realPkm: false`
- `exportable: false`
- `hatched: false`
- `class: "SIMULATED_LOG_ONLY"`

No hay herencia de IV/DV, naturaleza, habilidad, movimientos huevo, shiny ni
inserción en cajas o saves. No se crean archivos PKM.

## Eventos

`EggEvent` usa `pg08e.egg-domain` y tipos `egg.production.recorded`,
`egg.queued`, `egg.assignment.pending`, `egg.stored`, `egg.claimed`,
`egg.cancelled` y `egg.backlog.drained`. Cada evento lleva `eventId`,
`idempotencyKey`, `occurredAt` y un `payload` verificable; el evento de
producción incluye la entrada completa para poder reconstruir el huevo mediante
replay.

## Regla de oro

Un huevo es un registro lógico. Nunca es un Pokémon, nunca se exporta y nunca
se usa para «arreglar» una partida.
