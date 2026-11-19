# PG-08D · Contratos de retirada y expulsión (D6)

## Decisión aprobada

D6 quedó aprobada por el usuario en la autorización de PG-08D. El derecho de
recuperación **nunca caduca**. No se exige consentimiento del anfitrión para la
retirada del propietario, ni consentimiento del propietario para una expulsión
que solo devuelve la custodia.

## Comandos

```ts
withdrawGuestPokemon({ stayId, ownerId, idempotencyKey })
expelGuestPokemon({ stayId, hostId, ownerId, idempotencyKey })
```

## Implementación

El motor **no implementa propiedad**: delega en `CustodyPort`. En la suite,
`AuthorityCustody` ejecuta comandos reales contra `SharedAuthority`:

1. `requestRecovery` con `hostConnected: false` (anfitrión desconectado) y un
   vale PG-08A con caducidad de 7 días.
2. `completeRecovery` con el vale y la identidad del propietario registrada.

La expulsión verifica que `hostId` coincide con el `hostId` de la guardería de la
estancia; un anfitrión ajeno recibe `HOST_MISMATCH` y no produce efectos.
La autoridad **simulada** emite el vale y completa la recuperación con la
identidad del propietario que obra en el registro: esto se documenta
explícitamente como simulación local, **no como garantía online real**.

Si la autoridad está desconectada (`OFFLINE_CUSTODY`), la operación devuelve
`AUTHORITY_OFFLINE`, no cancela el ciclo, no emite eventos y no afirma que la
retirada fue confirmada.

## Efectos atómicos observados

- La estancia pasa a `stay_finished`; el anfitrión no se convierte en dueño.
- El ciclo activo pasa a `stopped` con razón `withdraw` o `expel`.
- Se emiten `breeding.cycle.cancelled` y `breeding.guest.withdrawn` / `.expelled`.
- Los huevos ya confirmados se conservan.
- Una pareja incompleta no puede producir nuevos huevos.

La transacción real de custodia es la de PG-08A/PG-08C (EventStore + outbox
atómicos). Los eventos de crianza se registran en el outbox auxiliar de la BD
aislada. Si la transacción falla, no existe retirada parcial.
