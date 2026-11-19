# PG-08E · 06 — Capacidad y saturación

La capacidad de huevos pendientes es configurable (`DEFAULT_EGG_CAPACITY = 4`)
y **no** es un límite definitivo de producto.

`usage()` cuenta solo los huevos en `CAPACITY_STATES`
(`produced`, `pending_assignment`, `stored`). La espera tiene su propia
capacidad (`DEFAULT_BACKLOG_CAPACITY = 0`) medida por `queuedCount()`.

## Comportamiento

- Con espacio: `produce` crea el huevo, publica `egg.production.recorded` y
  devuelve `created: true`.
- Sin espacio y política `single`: rechazo seguro `CAPACITY_EXHAUSTED` que **no**
  consume la clave de idempotencia: el mismo evento puede reintentarse después.
- Sin espacio y política `bounded` con hueco en la espera: se registra
  `egg.queued` con la entrada de producción completa; el evento puede
  recuperarse tras un reinicio.
- Con espera llena: rechazo seguro, sin huevo, sin evento nuevo.
- `setCapacity(n)` con `n < usage()` devuelve `CAPACITY_BELOW_USAGE`: reducir la
  capacidad jamás destruye un huevo confirmado ni lo reasigna.
- Una transición válida a `claimed` libera capacidad. Entonces
  `drainBacklog` revalida permisos, procedencia y capacidad antes de materializar
  cada huevo en espera; los rechazados permanecen en la cola con `attempts++`.

## Casos cubiertos

Disponible, agotada, dos producciones simultáneas en ciclos distintos, reintento
tras liberación, reducción por debajo del uso, saturación de la espera y drenaje
parcial. Ver `07-PRUEBAS.md`.
