# PG-08A — 2. Modelo de propiedad

## Regla fundamental

**Alojar un Pokémon nunca transfiere su propiedad.** El cambio de guardería es
un cambio de *cuidador*, no de *dueño*. `Stay.ownerId` se fija al crear la
estancia y ninguna operación de este contrato lo modifica.

## Entidades

| Entidad | Identidad | Paper |
|---|---|---|
| `Owner` | `OwnerId` (UUID v4 opaco) | Persona que posee el Pokémon. `displayName` es solo presentación. |
| `Nursery` | `NurseryId` (UUID v4) | Guardería de un anfitrión; capacidad fija 2. |
| `PokemonRef` | `PokemonInstanceId` (UUID v4) | Instancia concreta del Pokémon. `origin` es inmutable. |
| `Stay` | `StayId` (UUID v4) | Registro de alojamiento; une dueño, anfitrión, Pokémon y permisos. |
| `RecoveryVoucher` | `nonce` + `stayId` | Autorización temporal de retirada emitida por el registro. |

## Por qué UUID y no datos del Pokémon

Especie, mote, nivel, ranura de caja, PID y hash de datos **pueden repetirse**:
- En Gen 1/2 el PID es siempre 0.
- Dos saves distintos pueden tener el mismo mote y especie.
- Un `dataSha256` cambia si se entrena, y dos Pokémon clonados pueden tener el
  mismo contenido.
- La ranura de caja cambia al mover al Pokémon.

Por tanto la identidad autoritativa es un UUID interno opaco, nunca derivado de
esos campos. `dataSha256` solo detecta alteraciones; `origin` (con
`saveSha256` + `location/box/slot` en Gen 1-2 o `pid` en Gen 3-5) conserva la
procedencia para auditoría, sin servir de clave de propiedad.

## Separación de papeles

- **Propietario original** (`ownerId`): concede y revoca permisos, solicita y
  completa la recuperación. Puede ser a la vez anfitrión (`own`) o no
  (`visitor`).
- **Anfitrión** (`hostId`): cuida, registra acciones y aplica EV/bayas solo con
  consentimiento vigente. No es dueño del visitante.
- **Registro autoritativo simulado**: secuencia de `SyncEvent` en memoria con
  `restore()`; es la única fuente de verdad del modelo. En PG-08A **no es un
  servidor real**.

## Lo que el anfitrión NO puede hacer

La superficie pública de `createNurserySystem()` tiene 19 operaciones y
deliberadamente excluye: exportar a save, eliminar Pokémon, transferirlo,
cambiar de propietario o modificar sus datos originales. `care()` emite un
evento de auditoría pero no toca `stay.pokemon`. `exportEvents()` solo vuelca
el registro en memoria para auditoría/replay; no escribe saves.

## Invariantes verificadas

1. `stay.ownerId` permanece igual desde `deposit.accepted` hasta
   `recovery.completed`.
2. Solo el `ownerId` puede `grantPermission`, `revokePermission` y
   `requestRecovery` (error `OWNER_MISMATCH`).
3. `PokemonRef` es byte-idéntico (JSON) antes y después de cualquier cuidado.
4. Un `PokemonInstanceId` solo puede tener un `Stay` activo a la vez
   (`hosted` map; error `POKEMON_ALREADY_HOSTED`).
5. Ninguna operación pública cambia el propietario ni el origen.

## Riesgo residual

El modelo garantiza la propiedad **dentro del registro**. Un save copiado
fuera de la aplicación seguirá siendo copiable; ningún contrato de software
puede impedirlo sin control del archivo y de la identidad del usuario. Ver
`06-AMENAZAS.md` y `11-DECISIONES-PENDIENTES.md`.
