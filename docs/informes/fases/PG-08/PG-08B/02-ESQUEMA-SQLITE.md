# PG-08B — Esquema SQLite del EventStore

**Estado:** IMPLEMENTADO Y VERIFICADO (D3).
**Archivo de desarrollo:** `data/shared-pg08b.db`. **Nunca** `data/pokegotchi.db`.

## 1. Aislamiento físico

El módulo `apps/server/src/shared-store.ts` abre su propia conexión:

```ts
new Database(join(DATA_DIR, "shared-pg08b.db"), { create: true })
```

No importa `apps/server/src/db.ts` ni su exportación `db`. El constructor lleva
una guarda explícita: si el nombre de archivo resultante es `pokegotchi.db`,
lanza un error antes de abrir nada. `data/shared-pg08b.db`, `-wal` y `-shm`
están excluidos en `.gitignore`.

PRAGMA aplicados al abrir:

| PRAGMA | Valor | Motivo |
|---|---|---|
| `journal_mode` | `WAL` | lecturas coherentes durante escrituras |
| `busy_timeout` | `5000` | espera acotada si otra conexión tiene el bloqueo |
| `foreign_keys` | `ON` | preparado para futuras tablas de agregado |

No hay claves foráneas declaradas: la fuente de verdad es el propio log de
eventos y los agregados se reconstruyen desde él, de modo que no existe una
tabla padre a la que referenciar sin duplicar estado.

## 2. DDL exacto

```sql
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  sequence INTEGER NOT NULL UNIQUE CHECK (sequence > 0),
  aggregate_id TEXT NOT NULL,
  aggregate_sequence INTEGER NOT NULL CHECK (aggregate_sequence > 0),
  dedupe_key TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  schema_id TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  UNIQUE (aggregate_id, aggregate_sequence)
);

CREATE INDEX IF NOT EXISTS events_aggregate_idx
  ON events (aggregate_id, aggregate_sequence);
CREATE INDEX IF NOT EXISTS events_type_idx
  ON events (event_type);

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT,
  sequence INTEGER NOT NULL,
  event_count INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

## 3. Significado de las columnas de `events`

| Columna | Contenido |
|---|---|
| `event_id` | UUID v4 del `SyncEvent` emitido por el dominio. Clave primaria: un evento nunca se inserta dos veces. |
| `sequence` | Secuencia global monótona del dominio, `UNIQUE` y `> 0`. Es el orden canónico de replay. |
| `aggregate_id` | Identificador del agregado al que pertenece el evento (propietario, guardería, estancia…). |
| `aggregate_sequence` | Ordinal 1, 2, 3… dentro de ese agregado. `UNIQUE(aggregate_id, aggregate_sequence)` impide huecos y duplicationes. |
| `dedupe_key` | `prefijo:idempotencyKey`. `UNIQUE` a nivel SQL. El prefijo replica el mapeo interno de PG-08A (`owner`, `nursery`, `pokemon`, `deposit`, `accept`, `reject`, `grant`, `revoke`, `recovery`, `complete`, `connectivity`, `flag`, `breeding` y, para `care.applied`, `berries`/`minigame`/`care` según `payload.action`). |
| `idempotency_key` | Clave original del comando, conservada para auditoría. |
| `event_type` | Uno de los 14 `SyncEventType` del contrato PG-08A. |
| `schema_id`, `contract_version` | `pg08a.shared-nurseries` / `1.0.0` en cada fila: el payload está versionado por evento, no solo en `meta`. |
| `occurred_at` | ISO UTC con milisegundos, decidido por el dominio (`cmd.at ?? ahora`). |
| `payload_json` | Serialización exacta de `SyncEvent.payload`, sin transformación. |
| `payload_sha256` | SHA-256 de `payload_json`, verificada en cada lectura. |

**Regla de oro:** la persistencia no interpreta el payload. No calcula estados,
no aplica reglas de propiedad ni comprueba permisos: eso pertenece a
`createNurserySystem`. Solo guarda los `SyncEvent` que el dominio emite y los
devuelve en el mismo orden para reconstruir el sistema.

## 4. Snapshots

`snapshots` es una caché opcional y **derivable**: guarda una copia JSON de
`system.snapshot()` junto con su `sequence`, `eventCount` y SHA-256. No es una
fuente de verdad; si un snapshot desaparece, el estado se reconstruye íntegro
desde `events`. `listSnapshots()` devuelve solo metadatos (no el JSON).

## 5. Metadatos de esquema

`meta` se inicializa con `INSERT OR IGNORE`:

| key | value |
|---|---|
| `event_store_schema_version` | `1` |
| `contract_schema_id` | `pg08a.shared-nurseries` |
| `contract_version` | `1.0.0` |
| `created_at` | ISO UTC de creación |

Si al abrir una base existente cualquiera de estos valores difiere, el store
se niega a continuar en lugar de migrar silenciosamente. Ver
[04-migraciones-snapshots-corrupcion.md](04-MIGRACIONES-SNAPSHOTS-CORRUPCION.md).
