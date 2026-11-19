# PG-08F — Riesgos y decisiones pendientes

## Decisiones mantenidas

- **1+1 por ciclo**, con un solo intervalo de crianza (PG-08D intacto).
- **Propiedad por rol**: anfitrión e invitado, sin transferencia de progenitores.
- **Procedencia DEMO permanente** `DEMO_INTERNAL_NON_EXPORTABLE`, no
  dependiente del frontend; desconocido → fallo cerrado.
- **Sin genética, sin PKM, sin eclosión, sin exportación real.**
- **Entrega simulada** reutilizando los estados de PG-08E.
- **Sin commits, pushes, despliegue, cuentas reales ni modo público.**

## Riesgos abiertos

| Riesgo | Impacto | Mitigación actual |
|---|---|---|
| Capacidad definitiva no decidida (`DEFAULT_PAIR_CAPACITY=4` es de prueba) | Un par puede quedar en backlog si el destino está lleno. | Backlog recuperable y `drainBacklog()`; sin reasignación ni pérdida. Requiere decisión humana. |
| Política de asignación no adoptada | El par fija roles, pero no decide qué hacer con acuerdos previos (`prearranged`) ni con huérfanos (`pending`). | `OWNER_POLICY_BY_ROLE` + `agreedOwnerId` configurable en el dominio base. |
| Acumulación ilimitada de huevos | Saturación futura. | Suite 46 verifica un par por ciclo tras reapertura y replay; falta política de expiración. |
| Atomicidad distribuida inexistente | Fallo parcial entre servicios distintos. | Documentado como recuperación por replay/backlog, nunca como transacción distribuida. |
| Autoridad simulada | Suplantación de identidad si se expusiera. | Sin HTTP; identidades opacas solo en pruebas. Ver spike online. |
| DEMO en exportación/intercambio reales | Riesgo de evadir controles si un futuro flujo no consulta el dominio. | Contratos `assertDemoAllowed` y `assertBreedablePair` listos; **no hay aún flujo HTTP que los invoque**. |
| Archivos de partida | Daño irreversible. | Ninguna ruta escribe saves; 17 hashes verificados; BD protegida rechazada como almacén. |
| Auditoría no independiente | Menor confianza en el spike online. | El subagente agotó cuota; se declara explícitamente en `AUTORIDAD-ONLINE-SPIKE.md`. |

## Decisiones pendientes de autorización humana

1. Capacidad máxima y política de acumulación/expiración de huevos.
2. Política de asignación de propietario cuando no hay rol claro.
3. Conexión del contrato de procedencia DEMO con un PLAY NOW real.
4. Implementación de `EggDeliveryPort` contra un transporte real (sin saves).
5. Selección de infraestructura online (identidad, autoridad, cifrado, backups).
6. Cualquier cambio en saves, exportación real o frontend de Stitch.

## Conclusión

PG-08F entrega contratos y simulaciones verificables, no funcionalidad de
producción. La atomicidad del par es real **dentro de una SQLite**; la
recuperación entre recursos distintos es consistente por replay, no atómica.
Los riesgos anteriores no bloquean la fase actual pero sí cualquier
despliegue público.
