# PG-08G.2E — PRODUCCIÓN Y RECOGIDA

## 1. Decisiones BR-04 y BR-05

- Cada evento exitoso produce **1 huevo para A y 1 para B**.
- Producción y asignación deben ser atómicas.
- Los huevos quedan pendientes de recogida; al recogerse pasan al inventario
  del propietario.
- La recogida es idempotente, sin pérdidas ni duplicados.

## 2. Evidencia PG-08F verificada

- `apps/server/src/shared-egg-pair-store.ts:358-360` → `produce()` envuelve
  `produceTx()` en `this.atomic(...)`.
- `apps/server/src/shared-egg-pair-store.ts:366-369` → si `cycle_id` ya existe,
  la operación se considera reproceso, no una nueva producción.
- `apps/server/src/shared-egg-pair-store.ts:348-352` → `usageFor(recipientId)`
  cuenta `produced`, `pending_assignment` y `stored`.
- `apps/server/src/shared-egg-pair-store.ts:449-459` → cada huevo pasa a
  `stored` con su propietario y se publica `egg.stored`.
- `apps/server/src/shared-egg-pair-store.ts:508-561` →
  `prepareDelivery`/`confirmDelivery` son idempotentes y publican
  `egg.claimed` al confirmar.
- `packages/core/src/egg-domain.ts:342-348` → `stored -> claimed` es la única
  transición saliente de `stored`; `claimed` es terminal.
- `packages/core/src/egg-domain.ts:415-424` → las políticas de asignación son
  propuestas, no adoptadas; el destino real se deriva del rol.

## 3. Atomicidad de 1+1

La transacción de producción debe incluir, como mínimo:

1. verificación de identidad del ciclo y no reproceso;
2. comprobación de capacidad para **ambos** destinatarios;
3. creación de los dos huevos con propietario por rol;
4. transición a `stored` (o al estado de pendiente acordado) de ambos;
5. publicación de los eventos de producción y asignación;
6. actualización de la marca de progreso del chequeo.

Si cualquiera falla, se revierte toda la transacción. No se permite producir un
solo huevo: eso rompería BR-04.

## 4. Estados: pendiente frente a inventario

Existe una ambigüedad documental:

| Interpretación | Pendiente de recogida | Inventario | Cooldown BR-06 |
|---|---|---|---|
| A | `produced` / `pending_assignment` | `stored` | al entrar en `stored` |
| B | `produced` / `pending_assignment` / `stored` | `claimed` | al confirmar entrega (`claimed`) |
| C | `produced` / `pending_assignment` | nuevo `in_inventory` | al entrar en `in_inventory` |

**Recomendación (PROPOSED):** opción B, porque coincide con «al recogerlos pasan
al inventario». Requiere ampliar `CAPACITY_STATES` y revisar PG-08E; no se
aplica unilateralmente. La opción A es la conservadora y evita tocar contratos
históricos, pero hace que «recoger» signifique confirmar entrega sin cambiar de
estado de inventario.

## 5. Recogida idempotente

Clave propuesta:

`pickupKey = pickup:${cycleId}:${productionEventId}:${recipientRole}:${recipientId}`

Reglas:

1. La primera recogida ejecuta la transición válida y publica el evento.
2. Reintentos con la misma clave devuelven el mismo resultado, con
   `created:false`.
3. Una recogida sobre un huevo ya terminal devuelve el resultado previo, nunca
   un error que invite a repetir la operación.
4. La recogida no puede alterar propietario, especie, genética ni procedencia.
5. Si el inventario está lleno en el momento de la recogida, la operación
   devuelve `CAPACITY_EXHAUSTED` y no consume la clave de recogida.

## 6. Persistencia de pendientes y anti-duplicados

Los controles ya disponibles son:

- `cycleId` determinista por pareja y revisión.
- `productionEventId` e `idempotencyKey` por evento.
- `pair_cycles` con `host_egg_id` y `guest_egg_id` únicos.
- `pair_deliveries` con `idempotency_key` y estados `prepared`/`delivered`.
- Outbox de eventos y cola de reproducción con `authoritySequence`.

Regla adicional propuesta: persistir el `checkId` y su resultado antes de
intentar cualquier producción, de modo que un reinicio a mitad de operación
pueda distinguir «chequeo ya evaluado» de «producción ya confirmada».

## 7. Decisión humana pendiente

Confirmar la interpretación A, B o C de estados y la clave de recogida. Sin
esa decisión no debe modificarse `EGG_TRANSITIONS` ni la maquinaria de
entrega de PG-08F.
