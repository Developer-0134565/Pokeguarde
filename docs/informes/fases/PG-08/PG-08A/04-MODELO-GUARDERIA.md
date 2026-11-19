# PG-08A — 4. Modelo de guardería

## Capacidad

`NURSERY_CAPACITY = 2`, constante del contrato y validador estricto: una
`Nursery` con cualquier otro valor se rechaza. La comprobación se hace en
`acceptDeposit`, donde se cuentan estancias en `stay_active` o
`pickup_requested` de esa guardería; si ya hay dos, se devuelve
`NURSERY_FULL`. La reserva y la comprobación son atómicas dentro del registro
(una sola llamada, sin `await` intermedio en el modelo simulado).

## Dimensiones independientes

| Dimensión | Valores |
|---|---|
| Visibilidad | `private`, `invite_only`, `public` |
| Admisión | `open`, `closed` |
| Conectividad | `connected`, `disconnected` |
| Disponibilidad | `unavailable`, `syncError`, `recoveryPending` (banderas) |
| Ocupación | derivada del número de estancias activas |

La visibilidad **no** implica admisión: una guardería `public` sigue creando
solicitudes pendientes y exige aceptación explícita. `private` rechaza a quien
no es el anfitrión; `invite_only` rechaza hasta que se defina el sistema de
invitaciones (decisión pendiente). Cerrar la admisión o desconectar no expulsa a
los Pokémon ya alojados.

## Estados derivados (`deriveNurseryState`)

| Estado | Condición (en orden de prioridad) |
|---|---|
| `sync_error` | Más de dos activos, o bandera `syncError` |
| `recovery_pending` | Bandera `recoveryPending` |
| `unavailable` | Bandera `unavailable` |
| `disconnected` | Conectividad `disconnected` |
| `available` | 0 activos |
| `partially_occupied` | 1 activo |
| `full` | 2 activos |

El estado se **deriva** de los hechos; el cliente no puede imponerlo.
`refreshNursery()` lo recalcula tras cada cambio relevante y emite
`nursery.flags`.

## Estados de estancia

`available`, `request_pending`, `accepted`, `rejected`, `stay_active`,
`pickup_requested`, `stay_finished`, `recoverable_error`.

## Reglas de depósito

1. `requestDeposit` **siempre** crea `request_pending`; nunca acepta
   automáticamente.
2. Requiere dueño y guardería existentes, Pokémon registrado y admisible
   (`legal` o `unverified`; nunca `illegal`).
3. Rechaza si la guardería está cerrada, no disponible, en error o si el
   visitante no tiene visibilidad permitida.
4. Rechaza duplicados: misma solicitud, solicitud pendiente previa para el
   mismo Pokémon o alojamiento ya activo en otra guardería.
5. `acceptDeposit` verifica la revisión optimista
   (`expectedNurseryRevision` → `STALE_REVISION`), la capacidad y el
   alojamiento previo; solo entonces crea la estancia `stay_active`.

## Concurrencia simulada

Dos aceptaciones basadas en la misma revisión no pueden ganar: la primera
incrementa la revisión y la segunda obtiene `STALE_REVISION`. La suite lo
verifica (test 11). En un servidor real esto exige transacción con bloqueo
optimista o `BEGIN IMMEDIATE`; PG-08A solo demuestra la propiedad del modelo.

## Local frente a compartido

Los datos locales del anfitrión (sus propios Pokémon, su save, su progreso) no
se mezclan con los visitantes: cada `Stay` porta su `ownershipRelation`
(`own`/`visitor`) y su propio `ownerId`. El módulo no importa `pet-engine.ts`,
no conoce `pendingEvs` y no escribe SQLite.
