# PG-08G.2F — INVENTARIO Y PENDIENTES

## 1. Decisión vigente

- **Inventario:** máximo 20 huevos **recogidos** (`claimed`) por usuario (BR-01).
- **Pendientes:** capacidad inicial 2 huevos por usuario (BR-02), ampliable con mejoras de tienda pendientes.
- Los pendientes **no** consumen capacidad de inventario; los huevos `claimed` no vuelven a pendientes.

## 2. C2 histórico frente a BR-01

C2=4 aparece en `DECISIONES-D4-D8-D9.md` §4.2 y en `egg-domain.ts:428-429` como `CAPACITY_STATES = ['produced','pending_assignment','stored']`. Esos estados incluyen huevos producidos y asignados, **no solo recogidos**. Por tanto C2 no es literalmente el inventario de BR-01.

**Resolución documental:** no se redefine C2. Se introduce un contador nuevo `EggInventory.capacity = 20` sobre `claimed`, y se mantiene C2 como parámetro histórico de prueba con su semántica antigua. No se editan PG-08A–F ni los informes históricos.

Estado: `RESOLVED` por decisión expresa, con implicación de implementación futura: revisar `CAPACITY_STATES` cuando se autorice PG-08G.3.

## 3. Pendientes 2 frente a entrega 1+1

Cada evento exitoso produce dos huevos, uno por destinatario. La capacidad de 2 es **por usuario**, no por pareja. Un evento con ambos destinatarios con 1 pendiente cabe; con cualquiera en 2, no cabe el par completo.

No se permite entrega parcial ni reasignación al otro propietario (PG-08F). Si falta capacidad, la transacción se revierte y el check se registra como `CHECK_PENDING_FULL` sin consumir presupuesto de eventos exitosos. Esta conducta es `PROPOSED` porque BR-01…BR-08 no fijan explícitamente el comportamiento ante capacidad agotada.

## 4. Estados y transiciones

| Estado | Significado | Cuenta para |
|---|---|---|
| `produced` | Huevo simulado creado en el ciclo | C2 histórico / pendiente lógico |
| `pending_assignment` | Asignación en curso | C2 histórico |
| `stored` | Asignado al propietario, aún no recogido | C2 histórico y pendiente BR-02 |
| `available` | Etapa PG-08F de pendiente de recogida | pendiente BR-02 |
| `claimed` | Recogido manualmente por el usuario | **inventario BR-01** |
| `cancelled` | Terminal sin entrega | ninguno |

`claimed` y `cancelled` son terminales en `egg-domain.ts:342-348`. El cooldown de incubación empieza en `claimedAt`, no en `producedAt`.

## 5. `single` frente a pendientes

`OfflinePolicy = "single"` de PG-08D controla la **reconciliación de ciclos**: un tick tras la desconexión, sin acumular ciclos virtuales. No prohíbe que existan huevos pendientes de recogida: esos son estado del huevo, no backlog de ciclos. BR-08 sustituye esa política por `ALL` en V4; en ningún caso se crea una cola adicional de huevos.

## 6. Invariantes

1. `pending(user) <= 2` salvo mejora aprobada en el futuro.
2. `claimed(user) <= 20`.
3. `pending + claimed` NO es un único contador.
4. Un huevo ocupa como máximo una categoría en un instante.
5. Recogida duplicada devuelve el mismo resultado (`inserted:false`).
6. Capacidad insuficiente para cualquiera de los dos destinatarios ⇒ ningún huevo del par se confirma.
7. Reducir capacidad por debajo del uso → `CAPACITY_BELOW_USAGE`, sin destruir huevos (`shared-egg-store.ts:375-381`).

## 7. Errores

`PENDING_FULL`, `INVENTORY_FULL`, `CAPACITY_EXHAUSTED`, `CAPACITY_BELOW_USAGE`, `CLAIM_DUPLICATE`, `PAIR_PARTIAL_DELIVERY`, `STORE_ISOLATION_VIOLATION`.

## 8. Conflictos cerrados y abiertos

- Cerrado: C2 ≠ inventario; se crea contador nuevo sin redefinir el viejo.
- Cerrado: pendientes separados del inventario, con valor inicial 2.
- Abierto: conducta exacta ante pendiente lleno y futuras mejoras de tienda.
