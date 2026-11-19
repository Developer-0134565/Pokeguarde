# PG-08E · 07 — Acumulación controlada

Se conserva el comportamiento experimental de PG-08D: `single` por defecto, un
huevo como máximo por evaluación del ciclo, reiniciando el temporizador desde
el momento de la producción. `bounded` es soporte preparado, no una política
definitiva adoptada.

## Reglas

- El tiempo lo entrega siempre el reloj **autoritativo** inyectado; PG-08E no
  llama a `Date.now()` ni interpreta relojes de cliente.
- Una desconexión del cliente NO se interpreta como desconexión del servicio.
- `single` prohíbe configurar acumulación: `setAccumulation("single", n>0)`
  devuelve `SINGLE_BACKLOG_FORBIDDEN`.
- `bounded` acumula hasta un número explícito de eventos en `egg_backlog`. Cada
  evento conserva su `productionEventId`, `cycleId` y entrada completa.
- Tras un reinicio, la espera se lee de la BD y puede drenarse; no se crean
  huevos ilimitados porque tanto la capacidad como la espera están acotadas.
- Dos eventos para el mismo ciclo se rechazan con `CYCLE_DUPLICATE`; un reintento
  del mismo evento devuelve el huevo existente (`created: false`).

No se inventa una política definitiva de acumulación: la decisión de producto
sigue pendiente.
