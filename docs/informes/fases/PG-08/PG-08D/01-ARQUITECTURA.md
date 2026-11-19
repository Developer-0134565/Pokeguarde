# PG-08D · Arquitectura del motor de crianza

## Alcance

Motor **experimental** y local. Produce **registros simulados de huevos**, nunca
PKM, huevos importables ni modificaciones de saves. No hay servidor público, API
HTTP, WebSocket, SSE, cuentas reales, monetización ni Guardipuntos.

## Módulo

`packages/core/src/breeding-engine.ts` es un módulo puro: no importa Bun, SQLite,
DOM, HTTP, PKHeX ni el motor Tamagotchi. Toda dependencia entra por un puerto:

| Puerto | Responsabilidad |
|---|---|
| `BreedingClock` | Hora autoritativa simulada (`now(): string`). Nunca `Date.now()` del cliente. |
| `BreedingCompatibilityProvider` | `compatibility(a,b)` y `rarityOf(m)`; datos verificables inyectables. |
| `BreedingEventSink` | Outbox de la autoridad simulada; `append(event): eventId`. |
| `BreedingCycleStore` | Persistencia del temporizador (`load`/`save`). |
| `CustodyPort` | `withdraw` / `expel` delegados al dominio PG-08A. |

El motor **no duplica** propiedad ni custodia: delega en PG-08A a través de
`CustodyPort`. `permissionActive()` se reutiliza directamente desde
`shared-nurseries.ts`.

## Integración en la suite

`scripts/pg08d-check.ts` implementa los puertos sobre la arquitectura real de
PG-08C sin tocarla:

- `AuthorityCustody` usa `SharedAuthority.submit` con `requestRecovery` +
  `completeRecovery` (vales PG-08A) para retirada y expulsión.
- `SQLiteOutbox` es una tabla `pg08d_breeding_outbox` en la **misma BD temporal
  aislada** de la autoridad, con `UNIQUE(event_id)` y `UNIQUE(idempotency_key)`.
  Los eventos de custodia siguen pasando por el outbox PG-08C real; los eventos
  `breeding.*` tienen un outbox propio porque `SyncEventType` de PG-08A no los
  admite.
- `FileCycleStore` guarda el ciclo en JSON dentro de `/tmp/opencode/pg08d-*`;
  permite simular reinicio de proceso.
- `TestClock`, `TestCompatibility` y `OFFLINE_CUSTODY` hacen deterministas el
  tiempo, la compatibilidad y la pérdida de autoridad.

## Límites

No se modifica `data/pokegotchi.db`, saves, fixtures, sprites, PKHeX.Core,
`shared-nurseries.ts`, `shared-store.ts`, `shared-authority.ts`,
`shared-event-queue.ts` ni la interfaz de producción. No se activa crianza al
depositar: `allow_breeding` sigue desactivado por defecto.
