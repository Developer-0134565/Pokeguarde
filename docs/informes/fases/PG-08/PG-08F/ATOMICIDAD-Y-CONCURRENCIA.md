# PG-08F — Atomicidad y concurrencia

## Límite transaccional real

Ciclo, dos huevos, historial de estados, eventos, outbox y backlog viven en
**una sola SQLite** (`pair_*.db`). `produceTx()` los escribe dentro de una
transacción: si falla la persistencia de cualquiera de los dos huevos, no se
confirma el par, no se marca el ciclo entregado y no queda producción parcial.

La tabla `pair_cycles` se inserta primero con `status='queued'` y se actualiza
a `'produced'` al final; esto permite satisfacer `FOREIGN KEY` sin afirmar una
confirmación anticipada. `pair_backlog` guarda la operación pendiente por si
el destino está saturado.

**No hay atomicidad distribuida** entre esta BD y `pokegotchi.db`, el EventStore
PG-08B, la autoridad simulada o un futuro servicio online. Entre recursos con
distinto límite transaccional se usa preparación + recuperación:

- `replay(events)` aplica eventos nuevos, cuenta duplicados y no crea un tercer
  huevo.
- `drainBacklog()` reintenta pares en espera sin duplicarlos.
- `retry(idempotencyKey, at)` reintenta entregas de forma idempotente.

## Idempotencia

Claves canónicas derivadas del ciclo, el evento de producción, el destinatario y
el instante lógico. Los eventos y las entregas tienen `UNIQUE` sobre su clave de
idempotencia. Un doble vencimiento, un worker duplicado o un replay producen
los mismos IDs y un solo par.

## Concurrencia cubierta

| Caso | Resultado |
|---|---|
| Doble vencimiento (09) | Un solo par; la segunda llamada no crea huevos nuevos. |
| Dos workers sobre la misma BD (17) | Ambos devuelven el mismo `hostEggId`; solo dos huevos. |
| Reintento tras reinicio (10, 22) | Identidades conservadas; entrega preparada no se duplica. |
| Replay duplicado (11, 46) | `applied=0`, `duplicates=2`, par único incluso tras reapertura. |
| Retirada/expulsión simultánea (18) | Cambio de revisión detectado → `PARENT_OWNERSHIP_CHANGED`, sin producción. |
| Revocación de permiso (19, 20) | `PERMISSION_REVOKED` para invitado o anfitrión; sin huevos. |
| Orden obsoleto (21) | `STALE_ORDER`; la autoridad simulada controla la secuencia. |
| Capacidad agotada (14–16) | Par en backlog, sin confirmación parcial ni reasignación. |
| Fallo de persistencia (13) | Rollback completo; reintento crea exactamente dos huevos. |

## Garantías y límites

- `PRAGMA foreign_keys = ON` y `busy_timeout = 5000`.
- El reloj es un parámetro (`occurredAt`/`at`), nunca interno: reproducibilidad.
- **Simulación local**: dos workers en el mismo proceso con la misma BD no son
  una prueba de concurrencia distribuida real.
- La autoridad es simulada y local (PG-08C). Un servicio online necesitaría
  consenso, firmas y control de replay real; ver `AUTORIDAD-ONLINE-SPIKE.md`.
- La garantía **no** cubre fallos de disco, corrupción de SQLite ni un proceso
  externo que modifique la BD a mano. `integrityCheck()` detecta pares
  incompletos y devuelve `ok:false` con los motivos.

## Recuperación documentada, no atomicidad falsa

Cuando un participate no comparte límite transaccional, el sistema conserva
suficiente información (eventos inmutables, backlog, claves de idempotencia,
revisión de custodia y secuencia de autoridad) para reconstruir el estado por
replay. Se documenta como **recuperación consistente**, no como transacción
distribuida.
