# PG-08D · Riesgos y decisiones pendientes

## Riesgos

| Riesgo | Mitigación implementada | Estado |
|---|---|---|
| Huevos duplicados por reintentos | Claves de comando persistidas + `eggId` derivado del `cycleId` + `UNIQUE` en el outbox | Cubierto |
| Producción con pareja rota | `pairRevision` y comprobación de estancias en cada `tick` | Cubierto |
| Reloj del cliente manipulado | API sin `at`; `clock.now()` inyectado | Cubierto |
| Retirada parcial si falla la autoridad | `CustodyPort` devuelve error antes de cancelar o emitir | Cubierto |
| Expulsión por un anfitrión ajeno | Verificación de `hostId` contra la guardería de la estancia | Cubierto |
| Acumulación silenciosa offline | Políticas `single` y `bounded`, ambas explícitas | Cubierto; elección de balance pendiente |
| Compatibilidad inventada | Proveedor inyectable; `unknown` bloquea la producción | Cubierto; datos reales pendientes |
| Confundir simulación con crianza real | Huevos `simulated: true`, sin PKM/save/PKHeX | Cubierto |
| Colisión de dedupe al cambiar conectividad | No se manipula conectividad en la prueba de retirada; se usa `hostConnected: false` | Evitado en la suite; revisar en integración futura |

## Decisiones pendientes (NO adoptadas silenciosamente)

- Cálculo definitivo de rareza de la pareja y tabla definitiva de intervalos.
- Acumulación de huevos mientras la aplicación está cerrada.
- Propietario o destinatario de cada huevo.
- Capacidad máxima de huevos pendientes en producto.
- Reglas de herencia genética (IV/DV, naturaleza, movimientos huevo, habilidad, shiny).
- Generaciones compatibles con crianza y excepciones específicas de especies.
- Destino de los huevos confirmados al finalizar la estancia.
- Sustituir la autoridad simulada por una garantía online real (fuera de alcance).

No se crean comportamientos permanentes de producto para estos puntos. La tabla
de intervalos y las políticas offline son configurables y provisionales.

## Límites de la verificación

No se han probado hilos reales, red, despliegue ni PKHeX sobre huevos. La
concurrencia se simula serializando comandos. La legalidad de una futura crianza
real exigiría validación con PKHeX.Core en una fase posterior.
