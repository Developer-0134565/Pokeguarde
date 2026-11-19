# PG-08F — Arquitectura

## Alcance

PG-08F añade una **capa de par** sobre los contratos de PG-08A…E. No sustituye
ni reescribe ningún módulo protegido. Todo lo nuevo es interno, local y
simulado; no hay rutas HTTP, frontend, genética, PKM ni escrituras en saves.

## Módulos nuevos

| Módulo | Responsabilidad |
|---|---|
| `packages/core/src/egg-pair-domain.ts` | Contrato puro: identidad determinista del par, procedencia de progenitores, catálogo DEMO, contrato genético sin resolver y puerto de entrega. Sin SQLite ni reloj propio. |
| `apps/server/src/shared-egg-pair-store.ts` | Persistencia SQLite aislada del par: producción atómica, backlog recuperable, entrega simulada idempotente, replay, outbox y comprobación de integridad. |
| `scripts/pg08f-check.ts` | 50 casos aislados con BD en `/tmp/opencode/pg08f-*`. |

## Relación con PG-08E

PG-08E garantiza **un huevo por ciclo**: `eggIdFor(cycle, event)` y
`cycle_id UNIQUE` en `eggs`. Esa garantía permanece intacta; no se modifica
`shared-egg-store.ts` ni `egg-domain.ts`.

PG-08F no «mete dos huevos» en ese almacén. Introduce su propio evento de
producción de par (`egg.pair.produced`) con **un evento por destinatario**
(`pairEventIdFor(cycle, productionEvent, role)`), de modo que:

- `pairEggIdFor(cycle, productionEvent, role)` deriva cada identidad mediante
  `eggIdFor` de PG-08E, conservando el formato y el contrato de propiedad.
- El intervalo de crianza sigue siendo **uno para la pareja** (PG-08D).
- `produced/queued` en `pair_cycles` describe la operación; los dos huevos son
  registros independientes en `pair_eggs` con propietarios distintos.

No se crea un segundo proceso de crianza ni se duplica el temporizador.

## Esquemas y constantes

- `PAIR_SCHEMA = "pg08f.egg-pair-domain"`, `PAIR_VERSION = "1.0.0"`.
- `PAIR_STORE_SCHEMA = "pg08f.shared-egg-pair-store"`, versión `1.0.0`.
- `DEFAULT_PAIR_CAPACITY = 4` (configurable; **no** es una decisión de
  capacidad definitiva).
- `DELIVERY_STAGES = ["produced","stored","assigned","available","claimed","delivered"]`.
- Catálogo DEMO: `DEMO_STARTERS_SCHEMA = "pg08f.demo-starters"`.
- Genética futura: `GENETICS_SCHEMA = "pg08f.genetics-contract"`.

## Límites transaccionales

La base de datos del par es una sola SQLite, por lo que **sí** existe una
transacción real para: ciclo, dos huevos, historia de estados, eventos, outbox
y backlog. No se afirma atomicidad distribuida entre esta BD y `pokegotchi.db`,
el EventStore de PG-08B o la autoridad simulada: entre ellos se usa
preparación + recuperación por `replay()` y `drainBacklog()`.

El almacén se abre con `PRAGMA foreign_keys = ON` y `busy_timeout = 5000`.
Rechaza explícitamente rutas que apunten a `data/pokegotchi.db`.

## Flujo de producción

1. Validación de identidad del ciclo y de revisiones de los progenitores.
2. Verificación de procedencia: DEMO y desconocido bloquean el ciclo.
3. Verificación de permisos y orden de autoridad.
4. Comprobación de capacidad para **ambos** destinatarios.
5. Transacción: inserción del ciclo en `queued`, inserción de los dos huevos,
   eventos, historial y outbox; confirmación del ciclo como `produced`.
6. Si falta capacidad, se registra en `pair_backlog`; el par se recupera con
   `drainBacklog()` sin reasignar ni duplicar.

## Estado y trazabilidad

Cada huevo tiene su propio `state` y su historial (`pair_history`). Los eventos
son inmutables y llevan clave de idempotencia única. El `pair_outbox` acompaña
a los eventos en la misma transacción. `integrityCheck()` verifica que no
existan pares incompletos confirmados y que los pragma sean los esperados.

## Lo que NO hace

- No toca saves, PKM, inventarios, legalidad ni PKHeX.Core.
- No calcula genética, IV/DV, naturalezas ni movimientos.
- No expone HTTP ni conecta con el frontend de Stitch.
- No implementa cuentas, OAuth, cifrado de producción ni servidor público.
