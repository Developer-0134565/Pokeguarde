# PG-08F — Distribución 1+1

## Decisión

Un ciclo completado de crianza compartida produce **exactamente dos huevos
simulados**: uno para el anfitrión y otro para el propietario del Pokémon
invitado. Ambos proceden de la misma pareja y comparten `cycleId`, pero tienen
identidades, propietarios, eventos y registros de producción independientes.

## Regla de producción

`un ciclo completado = una pareja de huevos`.

El intervalo de PG-08D sigue siendo **único para la pareja**. No se duplica el
temporizador ni se crean dos procesos de crianza. Ejemplo: inicio 12:00,
intervalo 2 h, vencimiento 14:00 → huevo A (anfitrión) y huevo B (invitado);
el siguiente ciclo comienza según las reglas vigentes del motor.

## Identidad determinista

```
eventIdFor(role) = `${productionEventId}:${role}`
eggIdFor(role)   = eggIdForPG08E(cycleId, eventIdFor(role))
```

- `pairEggIdFor(cycleId, productionEventId, "host")` y
  `pairEggIdFor(..., "guest")` son distintos y reproducibles.
- Repetir la misma operación devuelve los mismos identificadores.
- `pairEventIdFor` distingue los eventos de cada destinatario.

`assertDistinctPair()` falla con `PAIR_ID_COLLISION` si ambos IDs coinciden.

## Propietarios

`OWNER_POLICY_BY_ROLE` fija `host → host` y `guest → guest_owner` mediante
`proposedOwnerOf` de PG-08E. No se adopta ninguna política definitiva de
asignación: `guest_owner`, `host`, `prearranged` y `pending` siguen siendo
configurables en el dominio base. No se transfiere la propiedad de los
progenitores: `assertParentsUnchanged()` compara antes/después y devuelve
`PARENT_OWNERSHIP_CHANGED` si difieren.

Un destinatario no puede reclamar el huevo del otro: `prepareDelivery()`
devuelve `RECIPIENT_MISMATCH` y la propiedad permanece intacta.

## Capacidad

La capacidad se comprueba para **los dos** destinatarios antes de confirmar.

- Si falta capacidad en cualquiera de los dos, el par queda en
  `pair_backlog` con estado recuperable y `drainBacklog()` lo reintenta.
- No se confirma un huevo y se pierde el otro.
- No se reasigna el huevo saturado al otro jugador.
- No se eliminan huevos confirmados previamente.
- No se duplica la producción al drenar el backlog.

`DEFAULT_PAIR_CAPACITY = 4` es un valor de prueba. La capacidad definitiva
continúa pendiente de decisión humana (ver `RIESGOS-Y-DECISIONES.md`).

## Todo o nada

`produce()` → `produceTx()` ejecuta una única transacción SQLite. El ciclo se
inserta en `queued` antes de los huevos (para satisfacer la FK) y se pasa a
`produced` solo después de persistir ambos. Cualquier excepción revierte la
transacción completa: no queda ciclo confirmado, ni huevo parcial, ni evento
de par. La inyección `failOnEggId` de la suite demuestra el rollback y el
reintento posterior sin duplicados.

## Verificación

Casos 03–12 y 14–16 de `scripts/pg08f-check.ts` cubren dos huevos por ciclo,
mismo ciclo, IDs distintos, determinismo, propietarios, ausencia de transferencia
de progenitores, doble vencimiento, reintento tras reinicio, replay duplicado,
temporizador único, rollback y capacidad agotada en cada destinatario.
