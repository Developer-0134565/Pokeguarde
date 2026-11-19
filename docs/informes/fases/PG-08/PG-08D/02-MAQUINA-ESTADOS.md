# PG-08D · Máquina de estados y ciclos

## Estados (`CycleState`)

| Estado | Significado |
|---|---|
| `inactive` | Sin pareja válida (menos de dos estancias activas). |
| `ready` | Pareja válida, lista para iniciar; uso interno de evaluación. |
| `running` | Ciclo activo con `startedAt`, `intervalMs` y `dueAt`. |
| `completed` | Intervalo completado; transitorio, se registra el huevo y se abre el siguiente. |
| `stopped` | Ciclo cancelado; `reason` explica por qué. |
| `invalid` | Pareja incompatible, compatibilidad desconocida, rareza no verificable o permiso no vigente. |

## Identidad del ciclo

`cycleId = cycle:<nurseryId>:<stayA>:<stayB>:<pairRevision>:<cycleNumber>`.

`pairRevision` concatena `stayId@revision` de ambos miembros ordenados. Cualquier
cambio de estancia (retirada, nuevo depósito, revocación que sube revisión)
produce un ID distinto: el progreso parcial **nunca** se reutiliza.

## Operaciones

- `evaluate(stays)` — decide `ready` / `inactive` / `invalid` sin efectos.
- `start(stays, key)` — crea el ciclo `running`, emite `breeding.cycle.started`.
- `tick(stays, key)` — comprueba pareja, revisión y `dueAt`; emite
  `breeding.egg.produced`, `breeding.cycle.completed` y el siguiente
  `breeding.cycle.started`. Idempotente por clave de comando y por `eggId`.
- `cancel(reason, key)` — guarda el ciclo como `stopped` y emite
  `breeding.cycle.cancelled`; no borra huevos confirmados.
- `withdrawGuestPokemon` / `expelGuestPokemon` — delegan custodia y cancelan si
  la estancia pertenecía a la pareja.
- `revokeCheck(stays, key)` — cancela con razón `revoke` si el permiso dejó de
  estar vigente.
- `restoreFromEvents(log)` — reconstruye huevos desde el outbox.

## Persistencia

`BreedingState` contiene `cycle`, `eggs`, `processed`, `offlinePolicy`,
`maxPendingEggs` y `lastChangedAt`. `processed` es el registro de claves
idempotentes; se persiste junto al ciclo para que un reintento tras reinicio no
duplique huevos.
