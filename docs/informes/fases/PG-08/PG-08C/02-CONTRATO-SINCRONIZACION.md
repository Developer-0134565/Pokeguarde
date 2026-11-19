# PG-08C — Contrato de sincronización (D7)

**Estado: IMPLEMENTADO Y VERIFICADO.** Sin WebSocket, SSE ni endpoints: la
sincronización es una operación local explícita (`syncReplica`) sobre la misma
base aislada.

## 1. Réplicas simuladas

| Réplica | Papel | Autoridad? |
|---|---|---|
| `authority` | registro autoritativo local | sí, pero solo a través de `SharedAuthority.submit()` |
| `owner-device` | dispositivo del propietario | **no** |
| `host-device` | dispositivo del anfitrión | **no** |

Cada réplica tiene su propio cursor (`replica_cursors`), su conjunto de IDs
aplicados y su lista de huecos. Ninguna réplica ejecuta comandos: construye su
estado con `createNurserySystem(events)` a partir de eventos ya confirmados.

## 2. Mensaje de salida

`outbox_messages` guarda:

- `message_id` = `msg:` + SHA-256 del `eventId` (único y determinista).
- `event_id`, `event_type`, `aggregate_id`, `aggregate_sequence` (ordinal del
  agregado) y `global_sequence` (ordinal monotónico del log).
- `command_id` que lo originó (o `reconcile` si se recuperó).
- `status` ∈ `pending | delivered | acked | failed`, `attempts`, `last_error`,
  `created_at`, `delivered_at`, `acked_at` y `event_json` completo.

La secuencia global es la del EventStore (`events.sequence`); por tanto es
monotónica y sin huecos en condiciones normales. La secuencia por agregado se
lee de `events.aggregate_sequence` **dentro de la transacción**.

## 3. Reglas de entrega

1. **Persistencia antes de confirmar**: el mensaje se inserta en el `COMMIT`
   del store; no existe una ventana en la que el evento esté confirmado y el
   mensaje no.
2. **Entrega no exactamente una vez**: `claim()` mueve `pending → delivered`
   e incrementa `attempts`. Puede repetirse; los efectos de la réplica son
   idempotentes por `eventId`.
3. **Confirmación idempotente**: `ack()` acepta `delivered` y `acked`; repetirlo
   no cambia el mensaje.
4. **Errores**: `nack(motivo)` → `failed`; `retryFailed()` → `pending` para
   reintentar sin perder el registro del error previo.
5. **Orden estricto**: `syncReplica` solo aplica el mensaje
   `lastSequence + 1`. Si llega un salto, registra los números ausentes en
   `gaps_json`, incrementa `outOfOrder` y **no avanza**.
6. **Duplicados y rezagados**: un mensaje con secuencia ≤ cursor no se aplica;
   un `eventId` ya aplicado se descarta por `UNIQUE(replica_id, event_id)`.
7. **Recuperación al reabrir**: al reconstructir el objeto se conservan cursor,
   eventos aplicados y huecos. La réplica puede reanudar desde el último cursor.
8. **Reconciliación**: `reconcile(store)` vuelve a encolar los eventos del log
   que no tengan mensaje. Es una red de seguridad: con el outbox atómico no
   debería hacer falta.

## 4. Las tres desconexiones NO son equivalentes

| Situación | Efecto observado en pruebas | Recuperación |
|---|---|---|
| **Anfitrión desconectado** | `host-device` se queda en cursor 0 mientras `owner-device` avanza. La guardería sigue aceptando comandos de la autoridad. | Al reconectar, `syncReplica("host-device")` aplica todos los pendientes en orden. |
| **Propietario desconectado** | `owner-device` no tiene eventos; el dispositivo del anfitrión sí. El derecho del propietario **no se pierde ni caduca**. | Sync al volver; se reconstruyen los dos propietarios y las estancias. |
| **Servicio autoritativo desconectado** | No hay nueva decisión posible: las réplicas pueden seguir leyendo su último estado, pero no pueden convertirse en autoridad. | Requiere un servicio autoritativo real (fuera de alcance). En la simulación se representa reiniciando store+queue sobre el mismo fichero. |

Esta distinción es obligatoria por D6 y se documenta sin decidir política.

## 5. Detección de huecos

- `detectGaps()`: huecos globales en el outbox.
- `syncReplica().gaps`: huecos detectados por una réplica concreta.
- `integrityCheck()` de la cola: secuencia contigua, IDs únicos y coherencia
  entre `event_json` y las columnas del mensaje.

Los casos 15 y 16 de `scripts/pg08c-check.ts` eliminan un mensaje de una BD
temporal, verifican que la réplica se bloquea en el hueco, y comprueban que
`reconcile()` lo repara y la sincronización se reanuda.

## 6. Sincronización "al abrir"

No hay sesión remota: el equivalente local es `syncReplica(id)` tras
reconstruir el objeto sobre la BD persistida (casos 06, 11 y 13). El cursor y
los IDs aplicados sobreviven al reinicio, de modo que no se reintentan eventos
ya procesados.
