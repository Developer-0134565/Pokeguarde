# PG-08B — Migraciones, snapshots y recuperación ante corrupción

**Estado:** IMPLEMENTADO Y VERIFICADO.

## 1. Migraciones

`migrate()` usa `CREATE TABLE IF NOT EXISTS` sobre una BD recién creada o ya
existente. Afecta **exclusivamente** a `data/shared-pg08b.db` (o a la ruta
temporal indicada en las pruebas). Nunca crea, altera ni lee para escritura
`data/pokegotchi.db`.

Tras crear tablas e índices, inserta las cuatro claves de `meta` con
`INSERT OR IGNORE` y las valida. Si `event_store_schema_version`,
`contract_schema_id` o `contract_version` no coinciden con los valores
esperados (`1`, `pg08a.shared-nurseries`, `1.0.0`), el constructor lanza un
error y la BD queda sin usar. **No hay migraciones silenciosas hacia adelante
ni hacia atrás**: un cambio de contrato exige una decisión humana y una fase
nueva.

Esto cubre el caso 20 (versiones incompatibles): una base con `contract_version`
futuro se rechaza en la apertura, no se interpreta con el código actual.

## 2. Snapshots

`saveSnapshot(label?)`:

- toma `system.snapshot()` (owners, nurseries, pokemon, stays, requests,
  recoveryRequests, vouchers, hosted, sequence, eventCount);
- serializa a JSON y calcula su SHA-256;
- inserta una fila en `snapshots` con `label`, `sequence`, `event_count`,
  `created_at` y el hash.

`listSnapshots()` devuelve solo metadatos, sin el JSON. Un snapshot es una
**caché derivable**: se puede borrar sin pérdida; nunca se usa para reconstruir
el estado, que siempre se deriva del log.

`verifyDeterminism()` construye un segundo sistema desde `readEvents()` y
compara `JSON.stringify(snapshot())` del sistema observable con el del
reconstruido. Es la comprobación automática de «replay determinista» y
«coincidencia de snapshots» (caso 04).

## 3. Recuperación ante corrupción

`integrityCheck()` devuelve `{ ok, issues, eventCount }` y comprueba:

1. `PRAGMA integrity_check` de SQLite → debe ser `ok`.
2. Secuencia global contigua `1..N` sin huecos ni duplicados.
3. Ordinal por agregado: para cada fila, ordenada por `sequence`,
   `aggregate_sequence` debe ser `(ocurrencias previas de ese agregado) + 1`.
   Comparar contra el total de eventos del agregado es un error ya corregido:
   una guardería con varias transiciones de estado tiene varios `nursery.flags`
   legítimos.
4. Hash de cada `payload_json` contra `payload_sha256`.

`rowToEvent()` es la primera línea de defensa en cada lectura: hace
`JSON.parse`, construye el `SyncEvent`, lo pasa por `validateSyncEvent` del
dominio (que exige esquema y versión exactos, UUID v4, ISO, clave de
idempotencia y tipo conocido) y verifica el SHA-256. Cualquier fallo lanza una
excepción: el store **se niega a materializar un estado corrupto** en lugar de
«arreglarlo».

## 4. Eventos desconocidos y datos corruptos

- **Evento con tipo no reconocido:** `validateSyncEvent` lo rechaza; la BD no
  se abre con ese registro (caso 19).
- **Payload alterado a mano:** el SHA-256 no coincide y se rechaza (caso 18).
- **Versión de contrato distinta:** rechazo en `meta` y en el sobre del evento
  (caso 20).
- **Fallo de inserción a mitad de transacción:** `ROLLBACK` y reconstrucción
  desde la BD; no queda rastro parcial (caso 08).

La recuperación es, por diseño, **detectar y abandonar**, no reparar. No se
reescriben ni se descartan eventos: ante corrupción se conserva el archivo, se
informa y se decide con el usuario. No existe una operación pública de
«reparación automática».

## 5. Cierre y reapertura

`close()` marca el store como cerrado y cierra la conexión; cualquier uso
posterior lanza un error. `openSharedStore(path?)` abre de nuevo, ejecuta
`migrate()`, lee todos los eventos ordenados por `sequence` y devuelve un
sistema equivalente. Es el mecanismo verificado en los casos 03, 04 y 07:
estado, permisos, propietarios y alojamientos sobreviven al reinicio.
