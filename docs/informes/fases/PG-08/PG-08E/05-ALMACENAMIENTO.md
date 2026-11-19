# PG-08E · 05 — Almacenamiento lógico aislado

Módulo: `apps/server/src/shared-egg-store.ts`. Esquema `pg08e.shared-egg-store`,
versión `1.0.0`. El constructor rechaza explícitamente `pokegotchi.db`.

## Tablas

- `egg_meta` — versión, capacidad, política de acumulación.
- `egg_events` — eventos confirmados, `idempotency_key` UNIQUE.
- `eggs` — `egg_id` PK, `cycle_id` UNIQUE, FK al evento de producción, estado
  CHECK, propietario y payload JSON canónico.
- `egg_state_history` — trazabilidad de transiciones con FK al huevo.
- `egg_backlog` — eventos en espera, `idempotency_key` PK, `cycle_id` UNIQUE.
- `egg_outbox` — mensajes publicados, FK al evento, estado `pending`/`delivered`.

## Garantías

Persistencia, integridad referencial (PRAGMA `foreign_keys = ON`), unicidad de
ID y de ciclo, idempotencia por clave canónica, recuperación tras `close()` y
reapertura, consultas por propietario/guardería/ciclo, capacidad configurable y
detección de corrupción.

`atomic(fn)` permite agrupar varias operaciones en una transacción; `produceTx`
está preparado para invocarse dentro de una transacción mayor (integración con
PG-08D). `integrityCheck()` valida `PRAGMA integrity_check`, parseo de payloads,
coincidencia de columnas con el payload, FK del evento, historial, outbox
huérfano y backlog duplicado.

## Límites

La BD se crea en la ruta inyectada; la suite usa `/tmp/opencode/pg08e-*` y la
elimina al terminar. Nunca se inserta un huevo en las cajas de una partida ni
se escribe un save. No hay API HTTP ni servidor público en esta fase.
