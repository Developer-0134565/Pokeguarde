# PG-08C — Cola duradera (transactional outbox)

**Estado:** VERIFICADO (33/33 en `scripts/pg08c-check.ts`, casos 05-08, 14-16, 30).
**Implementación:** `apps/server/src/shared-event-queue.ts` (esquema v1).

## 1. Principio

No se publica un evento de dominio hasta que su persistencia y la de sus
mensajes de salida forman **una sola transacción**. Se usa la misma BD aislada
de PG-08B; nunca `data/pokegotchi.db`.

`SharedNurseryStore.execute(command, sideEffect?)` invoca el efecto dentro de
`BEGIN IMMEDIATE`, después de insertar todos los eventos nuevos y antes del
`COMMIT`. Si el efecto lanza, el `catch` hace `ROLLBACK`: no queda ni evento ni
mensaje. El parámetro es opcional, por lo que los 22 casos de PG-08B siguen
pasando sin cambios.

## 2. Esquema

| Tabla | Clave | Finalidad |
|---|---|---|
| `outbox_messages` | `message_id` PK, `event_id` UNIQUE | Mensajes de salida; estado, intentos y errores |
| `replica_cursors` | `replica_id` PK | Cursor global, IDs aplicados y huecos conocidos |
| `replica_events` | `(replica_id, sequence)` PK, `(replica_id, event_id)` UNIQUE | Eventos materializados por réplica |
| `queue_meta` | `key` PK | `outbox_schema_version = 1` |

`message_id = "msg:" + sha256(event_id)`: un mismo evento produce siempre el
mismo mensaje, y `INSERT OR IGNORE` evita duplicados.

`status ∈ {pending, delivered, acked, failed}`. `global_sequence` es la
secuencia del EventStore; `aggregate_sequence` se lee de la tabla `events` en
la misma transacción (no se recalcula).

## 3. Ciclo de vida

1. **Producción atómica** — `enqueueIn(db, events, commandId)` desde el
   `sideEffect` de la autoridad. No existe ventana entre commit y encolado.
2. **Entrega** — `claim(limit)` mueve `pending → delivered` e incrementa
   `attempts`. No confirma: la réplica aún no ha aplicado el evento.
3. **Aplicación** — `syncReplica(replicaId, limit)` lee mensajes
   `delivered`/`acked` en orden estricto, los inserta en `replica_events` y
   avanza el cursor en la misma transacción.
4. **Confirmación** — `ack(messageId)` pasa a `acked`; repetirlo es idempotente.
5. **Fallo** — `nack(messageId, error)` registra `last_error` y deja el mensaje
   en `failed`; `retryFailed()` lo devuelve a `pending`.

## 4. Garantías D7

- **Secuencia monotónica y IDs únicos:** `sequence` del EventStore + `UNIQUE`
  por evento y mensaje.
- **Persistencia antes de confirmar:** el recibo de autoridad, el evento y el
  mensaje se escriben juntos; la confirmación al cliente ocurre tras `COMMIT`.
- **Reintentos seguros:** `commandId` produce un recibo idéntico (`duplicate`),
  sin nuevos eventos ni mensajes.
- **Entrega no exactamente una vez:** se garantiza effects idempotentes por
  `event_id` y por `commandId`, no entrega única.
- **Detección de huecos:** `detectGaps()` (global) y `gaps` en cada réplica. Si
  falta `lastSequence + 1`, la réplica **no avanza**.
- **Recuperación tras reinicio:** `reconcile(store)` re-encola eventos
  confirmados ausentes; `reopen` restaura store, cola, recibos y revisiones.

## 5. Límites

Es una cola **local de simulación**: no hay workers, temporizadores, red ni
entrega automática. `claim` y `syncReplica` los invoca el arnés de pruebas.
No se ha implementado ningún transporte (WebSocket/SSE/HTTP), conforme a la
restricción de la misión.
