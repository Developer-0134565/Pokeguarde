# PG-08G.2 — Capacidad y atomicidad

**Estado:** modelo propuesto sobre contratos existentes. No se modifica código.

## 1. Tres contadores, no uno

El error de diseño más fácil es usar un único número «capacidad». Hay tres
cosas distintas que hoy se confunden bajo la palabra capacidad:

| # | Contador | Qué mide | Dónde vive | Estado |
|---|---|---|---|---|
| C1 | Custodia | Pokémon físicamente en la guardería (máx. 2) | `AGENTS.md`, dominio | **DECIDED** |
| C2 | Almacenamiento de huevos | Huevos en `produced`/`pending_assignment`/`stored` | `shared-egg-store.ts`, `shared-egg-pair-store.ts` | UNRESOLVED (valor) |
| C3 | Cola de espera | Eventos de producción sin materializar | `egg_backlog` / `pair_backlog` | UNRESOLVED (valor) |

Además, un cuarto concepto **no existe todavía**:

| # | Contador | Qué mide | Estado |
|---|---|---|---|
| C4 | Incubación simultánea | Huevos en proceso de eclosión a la vez | UNRESOLVED, concepto nuevo |

C1 no se toca: está aprobado y no depende de huevos. C2 y C3 ya están
implementados con valores de prueba (`4` y `0`). C4 habría que diseñarlo.

## 2. Semántica verificada de la capacidad actual

| Comportamiento | Verificado en |
|---|---|
| Solo `produced`, `pending_assignment`, `stored` consumen capacidad | `egg-domain.ts` `CAPACITY_STATES` |
| `claimed` y `cancelled` liberan capacidad | `isCapacityState` |
| `setCapacity(n < usage())` → `CAPACITY_BELOW_USAGE`; no destruye ni reasigna | `shared-egg-store.ts` |
| Sin espacio con `single` → `CAPACITY_EXHAUSTED`, **sin consumir** la clave de idempotencia | `shared-egg-store.ts` |
| Sin espacio con `bounded` y hueco libre → entrada completa en la cola | `shared-egg-store.ts` |
| El par evalúa capacidad **por propietario**: si cualquiera está lleno, encola | `shared-egg-pair-store.ts` `usageFor` |
| Drenar la cola revalida permisos, procedencia y capacidad | `drainBacklog` |

Consecuencia: la capacidad nunca provoca pérdida de datos. Provoca **espera**.

## 3. Modelo propuesto

```
capacidad efectiva(propietario) = C2(propietario)
ocupación(propietario)          = huevos en CAPACITY_STATES de ese propietario
si ocupación < capacidad        → producir
si ocupación = capacidad        → encolar (si C3 > 0) o rechazar sin consumir idempotencia
```

Reglas:

1. **C2 por propietario**, no por guardería: evita que un invitado sature al
   anfitrión y mantiene la simetría 1+1.
2. **C3 por guardería**: la cola es un recurso compartido de la estancia.
3. **C4 independiente de C2**: un huevo almacenado no está incubando; incubar es
   una acción explícita del propietario.
4. Ningún contador se reduce por debajo de la ocupación real.
5. Los valores son parámetros de política, no constantes del dominio.

## 4. Atomicidad: qué es realmente atómico

| Operación | Alcance atómico | Fuera de transacción |
|---|---|---|
| Crear ciclo + dos huevos + evento | Una transacción SQLite (`produceTx`) | Notificación al cliente |
| Reclamar huevo | Una transacción (transición de estado) | Publicación de evento |
| Preparar entrega | Una transacción (registro de entrega) | Aviso al destinatario |
| Confirmar entrega | Una transacción (cambio de propietario) | Métricas |
| Escribir un `.srm` | **No atómico**: archivo en disco | Validación posterior |

Regla de oro ya vigente en PG-08F: **atomicidad real solo dentro de una
SQLite**. Entre recursos distintos (BD + archivo + red) no hay transacción
distribuida; se usa recuperación por replay/backlog. No se debe prometer
atomicidad que el sistema no puede dar.

Detalle del orden en el par: el ciclo se inserta en `status='queued'` **antes**
de los huevos y se confirma como `'produced'` al final. Así la FK se satisface y
un fallo intermedio deja un ciclo en cola recuperable, no huérfanos.

## 5. Entrega en dos fases (D9-G2)

```
prepareDelivery(eggId, recipientId, idempotencyKey) → deliveryId (reserva)
confirmDelivery(deliveryId, idempotencyKey)          → propiedad transferida
```

| Fallo | Resultado | Recuperación |
|---|---|---|
| Caída antes de `prepare` | Nada reservado | Reintentar la producción |
| Caída tras `prepare`, antes de `confirm` | Entrega reservada, huevo aún del emisor | `retry(idempotencyKey)` |
| Caída durante `confirm` | Transacción completa o inexistente | `stageOf(eggId)` + `replay` |
| Cliente reintenta `confirm` | Idempotente: mismo resultado | — |
| Destinatario a capacidad | La entrega no se confirma; el huevo permanece | Esperar reclamo o drenaje |
| Destinatario rechaza | `recipient_rejected` (causa de cancelación existente) | Huevo vuelve a disponible según política |

Nunca se borra un huevo para liberar capacidad. Nunca se sobrescribe el
propietario anterior sin confirmación.

## 6. Invariantes

1. `ocupación ≤ capacidad` en todo momento observable.
2. Un huevo existe en exactamente un estado de `EGG_STATES`.
3. `claimed` ⇒ existe un propietario único y una entrega confirmada.
4. Un evento de producción con la misma clave de idempotencia produce como
   máximo un huevo.
5. Los dos huevos del par tienen propietarios distintos y procedencia común.
6. Reducir capacidad por debajo de la ocupación está prohibido, no «ajustado».
7. Un fallo deja el sistema en un estado recuperable por `replay`, nunca en
   pérdida silenciosa.

## 7. Errores esperados

`CAPACITY_INVALID`, `CAPACITY_BELOW_USAGE`, `CAPACITY_EXHAUSTED`,
`BACKLOG_CAPACITY_BELOW_USAGE`, `SINGLE_BACKLOG_FORBIDDEN`, `CYCLE_DUPLICATE`,
`IDEMPOTENCY_REUSE_MISMATCH`, `DELIVERY_ALREADY_CONFIRMED`,
`DELIVERY_RECIPIENT_UNKNOWN`, `EGG_NOT_AVAILABLE`, `STORE_ISOLATION_VIOLATION`
(el store se niega a operar sobre `data/pokegotchi.db`).

## 8. Lo que falta decidir

- Valor de C2 por propietario (hoy `4`, de prueba).
- Valor de C3 (hoy `0`, de prueba).
- Existencia y valor de C4.
- Caducidad de huevos en cola (depende de D8-A, retención).
- Qué ocurre si el propietario pierde la identidad (D1-A) con huevos almacenados.

## 9. Pruebas que la implementación futura deberá pasar

Ver `MATRIZ-DE-PRUEBAS.md`, secciones de capacidad y atomicidad: saturación,
liberación por reclamo, reducción por debajo de ocupación, caída entre fases,
reintento idempotente, drenaje con capacidad liberada y drenaje con capacidad
aún llena.
