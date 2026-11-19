# PG-08C — Matriz de conflictos y concurrencia (D5)

**Estado:** VERIFICADO (casos 17-28 de `scripts/pg08c-check.ts`).
**Regla soberana:** una única autoridad lógica decide; nunca último escritor
gana; una operación rechazada no produce efectos parciales.

| Escenario | Resultado observado | Código | Efectos |
|---|---|---|---|
| Dos depósitos sobre el mismo `requestId`, ambos con `expectedRevision = 1` | Primero aceptado; segundo rechazado | `STALE_REVISION` | Una sola estancia nueva; revisión avanza una vez |
| Tercer depósito con la guardería llena | Rechazado | `NURSERY_FULL` | Sin eventos, sin mensajes, revisión intacta |
| Revisión obsoleta (`expectedRevision = 0` tras aceptar) | Rechazado | `STALE_REVISION` | Sin eventos; recibo de rechazo persistido |
| Reintento con el mismo `commandId` tras perder la confirmación | Respuesta idéntica | — | `duplicate: true`; sin eventos nuevos |
| El anfitrión intenta conceder un permiso ajeno | Rechazado | `OWNER_MISMATCH` | La titularidad no cambia |
| EV sin consentimiento | Rechazado | `CONSENT_REQUIRED` | Sin modificación de estadísticas |
| Permiso revocado antes de la operación en curso | Rechazado | `PERMISSION_REVOKED` | No se conceden permisos nuevos |
| Recuperación completada y cuidado posterior | Cuidado rechazado | `STAY_NOT_ACTIVE` | Ninguna réplica sobrescribe la recuperación |
| Dos solicitudes con el mismo `request.id` | Segunda rechazada | `DUPLICATE_REQUEST` | Un solo vale para ese ID |
| Dos solicitudes con distinto ID | Segunda aceptada (renovación del prototipo) | — | Vale anterior queda obsoleto: su canje da `STALE_REVISION` |
| Canje de vale caducado | Rechazado | `VOUCHER_EXPIRED` | La propiedad sigue siendo del dueño |
| Doble canje con distinta clave | Segundo rechazado | `STALE_REVISION` | Sin segundo `stay_finished` |
| Capacidad | Máximo dos alojamientos activos | — | Tercero rechazado sin efectos |

## 1. Revisión optimista

`authority_revisions` guarda una revisión **lógica** por agregado. El dominio
PG-08A ya incrementa `Nursery.revision` en `refreshNursery`, pero no todas las
operaciones lo incrementan (p. ej. `care`). La revisión de la autoridad cubre
todos los comandos aceptados y es la que se comprueba en D5.

Solo dos operaciones reenvían la revisión al dominio, porque son las únicas que
aceptan ese campo en su contrato: `acceptDeposit → expectedNurseryRevision` y
`grantPermission → expectedRevision`. El resto se valida en la autoridad.

## 2. Revocación durante una operación en curso

**Comportamiento conservador implementado:** si el permiso ya está revocado en
el momento de aplicar la operación, esta se rechaza con `PERMISSION_REVOKED`.
No se concede ningún permiso nuevo ni se reintenta automáticamente.

**Decisión de producto pendiente:** qué hacer si la revocación llega *después*
de que el comando fue aceptado pero *antes* de que la réplica del anfitrión lo
aplique (¿revertir, compensar o conservar?). No se ha adoptado ninguna
política. La implementación actual nunca agrava el permiso.

## 3. Invariantes comprobadas

- No se supera la capacidad de dos.
- El dueño conserva `ownerId`, `hostId` y `ownershipRelation = "visitor"`.
- No aparecen alojamientos duplicados: `UNIQUE(aggregate_id, aggregate_sequence)`
  en el log y `UNIQUE(replica_id, event_id)` en las réplicas.
- `verifyDeterminism()` e `integrityCheck()` siguen correctos tras cada conflicto.
