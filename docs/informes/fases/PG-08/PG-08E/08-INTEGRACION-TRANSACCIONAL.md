# PG-08E · 08 — Integración transaccional con PG-08D

Orden aplicado a cada producción:

1. Validación de la pareja (`createEgg` exige dos progenitores distintos).
2. Validación de permisos (`canProduce` de la autoridad inyectada).
3. Validación de procedencia (`isBreedableProvenance` por progenitor).
4. Verificación del ciclo (`cycleRevision`).
5. Verificación de la revisión y del orden (`sequenceFor`, `STALE_ORDER`).
6. Evento `breeding.egg.produced` del motor PG-08D.
7. Creación lógica del huevo (`produceTx`).
8. Persistencia atómica en `eggs` + `egg_events` + `egg_state_history`.
9. Publicación en `egg_outbox` dentro de la misma transacción.
10. Confirmación idempotente por `production:${idempotencyKey}`.

## Atomicidad

La suite usa un `StagedCycleStore`: `engine.tick()` escribe el ciclo en un
estado preparado y `commit()` se ejecuta **dentro** de `store.atomic(...)`; si
la creación del huevo falla, se hace `rollback()` del ciclo y SQLite revierte
huevo, eventos e historial. Así se obtiene una transacción compuesta verificable
sin parches sobre el motor PG-08D.

Si se usara un `BreedingCycleStore` no transaccional, la garantía sería de
**recuperación consistente**, no de atomicidad estricta: el evento de producción
lleva la entrada completa y `replay` reconstruye el huevo sin duplicados. Esta
limitación queda documentada; no se afirma una atomicidad que la arquitectura
no ofrece.

No se confirmó una producción como almacenada antes de asegurar su persistencia.
