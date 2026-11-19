# PG-08F — EggDeliveryPort (entrega simulada)

## Contrato

`EggDeliveryPort` en `packages/core/src/egg-pair-domain.ts` expone:

```
pendingEggs(recipientId): readonly EggRecord[]
verifyRecipient(eggId, recipientId): DomainResult<true>
prepareDelivery({ eggId, recipientId, idempotencyKey, at }): DomainResult<DeliveryRecord>
confirmDelivery({ deliveryId, idempotencyKey, at }): DomainResult<DeliveryRecord>
status(eggId): DomainResult<{ stage, eggState, delivery }>
retry(idempotencyKey[, at]): DomainResult<DeliveryRecord>
```

`SharedEggPairStore` implementa el puerto sobre su BD aislada. `DeliveryRecord`
registra `deliveryId`, `eggId`, `recipientId`, `idempotencyKey`, `status`
(`prepared`/`delivered`/`failed`), intentos y marcas de tiempo.

## Etapas

`DELIVERY_STAGES = produced → stored → assigned → available → claimed → delivered`.

`deliveryStageOf()` y `stageOf()` reutilizan los estados de PG-08E; **no** se
duplica la máquina de estados ni se introducen transiciones incompatibles.
`available` es un estado **lógico de entrega**, no un huevo dentro de una caja
ni una entrada en un save. `delivered` significa entrega confirmada por el
puerto simulado, nunca huevo escrito en un archivo de partida.

## Flujo

1. `verifyRecipient()` comprueba que el destinatario coincide con el
   propietario del huevo; si no, `RECIPIENT_MISMATCH`.
2. `prepareDelivery()` crea un registro `prepared` con clave de idempotencia
   única. No modifica el save ni el inventario.
3. `confirmDelivery()` pasa a `delivered`; una segunda confirmación con la
   misma clave devuelve el mismo registro (idempotencia).
4. `status()` informa de la etapa derivada sin inventar estados nuevos.
5. `retry()` reintenta con la misma clave, sin perder el huevo ni duplicar la
   entrega.

## Pruebas

Casos 34–40 y 22: destinatario correcto e incorrecto, reclamación duplicada,
reintento, reconstrucción tras reinicio entre preparación y confirmación,
actor no autorizado, etapas derivadas de PG-08E y reclamación del huevo ajeno
con clave modificada.

## Límites

- No entrega huevos a cajas de partidas originales.
- No genera PKM, no modifica inventarios reales y no usa PKHeX.Core.
- No hay rutas HTTP ni conexión con Stitch.
- La simulación demuestra el contrato y la idempotencia; **no** equivale a una
  entrega en producción ni a un sistema de mensajería fiable.
