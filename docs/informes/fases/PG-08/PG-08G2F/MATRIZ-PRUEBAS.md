# PG-08G.2F — MATRIZ DE PRUEBAS PROPUESTAS

**Estado:** diseño documental. Ninguna prueba se ha integrado en `scripts/check.sh`
ni se ha ejecutado contra producción.

## 0. Reglas de ejecución futura

- Suite aislada, con reloj y azar inyectados.
- SQLite de prueba solo en `/tmp/opencode/pg08g2f-<suite>-<caso>/`.
- Cada caso declara su `GameKey` (`gen2-gs` o `gen2-crystal` en el piloto).
- Sin `data/pokegotchi.db`, saves, fixtures, PKM, frontend, sidecar ni red.
- Sin `Math.random()` ni `Date.now()`.
- La duración del cooldown y los precios de mejoras de tienda no se fijan aquí.
- Estas pruebas no se añaden a `check.sh` sin autorización expresa.

## 1. Hungry y umbral

| ID | Caso | Criterio esperado |
|---|---|---|
| HUN-01 | `HUN-69.99-falla` | `ratioMicro = 6_999_000`; `HUNGRY_BELOW_THRESHOLD`; chequeo `skipped`; cero huevos; snapshot persistido. |
| HUN-02 | `HUN-70-pasa` | `ratioMicro = 7_000_000`; elegible; `produced`; 1+1. |
| HUN-03 | `HUN-100-pasa` | `ratioMicro = 10_000_000`; elegible; `produced`; 1+1. |
| HUN-04 | `HUN-un-progenitor-bajo` | Un snapshot en 69,99 y otro en 100 → `skipped`; ningún huevo, ni para el progenitor elegible. |
| HUN-05 | `HUN-ambos-bajo` | Dos bloqueos `HUNGRY_BELOW_THRESHOLD`; un único chequeo `skipped`; sin producción. |
| HUN-06 | `HUN-snapshot-desconocido` | `eligibility.status:"unknown"`; `UNKNOWN_HUNGRY`; fallo cerrado; sin huevos. |

## 2. Chequeo horario y producción garantizada

| ID | Caso | Criterio esperado |
|---|---|---|
| CHECK-01 | `CHECK-produccion-garantizada` | Con todas las puertas correctas: `status:"produced"`, dos `eggIds`, `productionEventId` no nulo. No aparece compuerta de rareza. |
| CHECK-02 | `CHECK-repeticion-misma-clave` | Segundo `checkId` idéntico → `duplicate`, `created:false`, mismos `eggIds`, un solo evento. |
| CHECK-03 | `CHECK-misma-clave-contenido-distinto` | `IDEMPOTENCY_REUSE_MISMATCH`; no se reescribe el chequeo ni se produce. |
| CHECK-04 | `CHECK-fallido-no-consume-exito` | Chequeo fallido persistido con `reason`; `checksSucceeded` intacto; el siguiente chequeo elegible produce normalmente. |

## 3. Atomicidad y recuperación

| ID | Caso | Criterio esperado |
|---|---|---|
| ATOM-01 | `ATOM-1+1-todo-o-nada` | Fallo inyectado al escribir el segundo huevo → rollback: ni ciclo, ni evento, ni primer huevo. Reintento → exactamente dos huevos. |
| ATOM-02 | `ATOM-recuperacion-sin-duplicados` | Caída tras confirmar antes del acuse de recibo; `replay` → `applied=0`, `duplicates=N`; persisten exactamente dos huevos por chequeo. |
| ATOM-03 | `ATOM-persistencia-parcial` | Fallo al escribir inventario/timer tras `claimEgg` → rollback completo: huevo sigue `stored`, sin entrada de inventario, sin timer, clave de recogida no consumida; `integrity_check=ok`. |
| ATOM-04 | `ATOM-replay-eventos-aplicados` | Reaplicar el outbox completo → estado idéntico, sin tercer huevo y sin nueva entrada de inventario. |

## 4. Capacidad

| ID | Caso | Criterio esperado |
|---|---|---|
| CAP-01 | `CAP-pendientes-agotado` | Anfitrión en 2/2 pendientes e invitado libre → `CAPACITY_EXHAUSTED(resource:"pending")`; sin huevos para ninguno; idempotencia no consumida. Tras recoger uno, la misma clave produce 1+1. |
| CAP-02 | `CAP-single-backlog-forbidido` | Intento de encolar al estar lleno → `SINGLE_BACKLOG_FORBIDDEN`; `backlog=0`; sin `egg.queued`. |
| CAP-03 | `CAP-reducir-por-debajo-uso` | Reducir pending o inventory por debajo del uso → `CAPACITY_BELOW_USAGE`; ningún huevo destruido ni reasignado. |

## 5. Inventario y recogida manual

| ID | Caso | Criterio esperado |
|---|---|---|
| INV-01 | `INV-19-de-20` | Con 19 `claimed`, recoger un huevo `stored` → `usage=20`; huevo `claimed`; timer creado. |
| INV-02 | `INV-20-de-20` | Con 20 `claimed`, recoger → `CAPACITY_EXHAUSTED(resource:"inventory")`; `claimKey` sigue utilizable; huevo permanece `stored`. |
| CLAIM-01 | `CLAIM-doble-recogida` | Misma `claimKey` dos veces → mismo `deliveryId` y `claimedAt`; `created:false` la segunda; una sola entrada de inventario y un solo timer. |
| CLAIM-02 | `CLAIM-caida-entre-prepare-y-confirm` | Tras `prepareDelivery`, reintentar con la misma clave completa la recogida una sola vez; no se crea segunda entrega. |

## 6. Cooldown e incubación

| ID | Caso | Criterio esperado |
|---|---|---|
| COOL-01 | `COOL-started-at-claimed-at` | Con duración opaca inyectada por el fixture: `startedAt === claimedAt`; `readyAt === claimedAt + duración`; `producedAt` y `preparedAt` no afectan; doble recogida no cambia `startedAt`. |
| COOL-02 | `COOL-sin-duracion-aprobada` | Sin duración: `cooldownMs:null`, `status:"blocked"`, `UNKNOWN_HATCH_COOLDOWN`, `readyAt:null`; sin eclosión. |

## 7. Offline `ALL`

| ID | Caso | Criterio esperado |
|---|---|---|
| OFF-01 | `OFF-24h` | Una ventana, 24 chequeos planificados, 24 `checkId` únicos; sin `WINDOW_EXCEEDED`; `checksSucceeded ≤ 24`. |
| OFF-02 | `OFF-48h` | Dos ventanas consecutivas de 24 h, 48 chequeos; ninguna hora descartada entre ventanas. |
| OFF-03 | `OFF-72h` | Tres ventanas, 72 chequeos; las últimas 24 h no se pierden; `cursor` final = `to`. |
| OFF-04 | `OFF-reconexion-interrumpida` | Interrumpir tras 30 de 48 chequeos; reiniciar desde `cursor`; estado final idéntico al de una ejecución continua; `duplicates=0`. |
| OFF-05 | `OFF-fallidos-y-presupuesto` | Tres chequeos fallidos y 24 elegibles en la misma ventana → `checksFailed=3`, `checksSucceeded=24`, `productionEvents=24`; los fallidos tienen `reason` y cero huevos. |
| OFF-06 | `OFF-reloj-retrocede` | `now < cursor` → `CLOCK_ROLLBACK`; cero chequeos nuevos; `cursor` intacto. |

## 8. Legalidad y aislamiento

| ID | Caso | Criterio esperado |
|---|---|---|
| LEG-01 | `LEG-cuatro-capas-y-exportacion-negativa` | L1 `ok`, L2 `gen2-gs`, L3 `not_evaluable`, L4 `blocked`; `realPkm:false` y `exportable:false` literales; cero archivos PKM o save creados. |
| AIS-01 | `AIS-store-real-prohibido` | Intentar abrir `data/pokegotchi.db` → `STORE_ISOLATION_VIOLATION` antes de cualquier escritura; solo se usan rutas `/tmp/opencode/pg08g2f-*`. |

## 9. Cobertura declarada

- Umbrales 69,99 %, 70 % y 100 %: HUN-01, HUN-02, HUN-03.
- Uno y ambos progenitores bajo el umbral: HUN-04, HUN-05.
- Producción garantizada y 1+1: CHECK-01, ATOM-01.
- Capacidad pendiente agotada: CAP-01.
- Inventario con 19 y 20 huevos: INV-01, INV-02.
- Recogida duplicada: CLAIM-01, CLAIM-02.
- Cooldown desde `claimedAt`: COOL-01, COOL-02.
- 24, 48 y 72 horas offline: OFF-01, OFF-02, OFF-03.
- Reconexión interrumpida: OFF-04.
- Repetición del mismo chequeo: CHECK-02, CHECK-03.
- Chequeos fallidos: HUN-01, HUN-04, HUN-05, CHECK-04, OFF-05.
- Recuperación sin duplicados: ATOM-02, ATOM-04, OFF-04.
- Persistencia atómica: ATOM-01, ATOM-03, CLAIM-02.

**Total:** 30 casos (29 del diseño original más AIS-01, añadido para el aislamiento
de la base de datos real).
