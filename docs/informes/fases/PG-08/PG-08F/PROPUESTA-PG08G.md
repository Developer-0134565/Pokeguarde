# PG-08F — Propuesta para PG-08G (NO AUTORIZADA)

Esta fase es solo una propuesta. No se ha implementado nada de lo siguiente.

## Objetivo propuesto

Cerrar el ciclo de vida simulado hasta la entrega verificable sin tocar saves
reales: definir políticas y conectar el puerto de entrega a un transporte
local inmutable, con auditoría completa.

## Trabajo propuesto

1. **Política de capacidad y acumulación**: sustituir `DEFAULT_PAIR_CAPACITY`
   por una decisión humana documentada, con expiración de backlog y reglas
   claras para pares huérfanos.
2. **Política de asignación**: definir el comportamiento de `pending` y
   `prearranged`, y la resolución de disputas de propiedad.
3. **Catálogo DEMO conectado**: selección de inicial y creación de entidad
   DEMO desde un flujo local (todavía sin HTTP público), con badge derivado
   de la procedencia y no al revés.
4. **EggDeliveryPort con transporte local**: implementación que persista
   entregas en un log inmutable y permita inspeccionarlas, sin escribir
   inventarios ni PKM.
5. **Contrato genético verificable**: decidir el algoritmo y la semilla, sin
   usar azar no reproducible y sin generar PKM. Seguiría siendo simulación.
6. **Auditoría independiente**: repetir el spike de autoridad online con un
   revisor separado y una lista de refutaciones.

## Restricciones propuestas (idénticas a PG-08F)

- Sin commits/pushes sin autorización.
- Sin frontend Stitch, saves, PKM, PKHeX.Core, exportación real ni servidor
  público.
- Sin cuentas reales, OAuth, pagos ni dependencias de pago.
- Mantener los 17 hashes protegidos y la BD `pokegotchi.db` intacta.

## Criterios de aceptación propuestos

- Política de capacidad y asignación aprobada por escrito.
- Entrega simulada reconstruible desde eventos, con idempotencia demostrada.
- DEMO bloqueado en todos los contratos que se añadan.
- Regresiones PG-08A–F en verde y hashes intactos.
- Informe técnico con decisiones, riesgos y límites claramente marcados.
