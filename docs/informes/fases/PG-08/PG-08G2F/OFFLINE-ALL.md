# PG-08G.2F — PROGRESO OFFLINE `ALL`

**Estado:** decisión documental BR-08; sin implementación.

## 1. Decisión vigente

- Política **ALL**: conservar íntegramente el tiempo pendiente.
- Ventanas consecutivas de hasta **24 horas**.
- Hasta **24 chequeos horarios** por ventana.
- Los chequeos fallidos **no consumen** presupuesto de eventos exitosos.
- No perder chequeos, no duplicar resultados y no crear cola adicional de
  huevos.
- La antigua propuesta `maxEvents = 5` queda **sustituida documentalmente** en
  V4. Chequeos y eventos exitosos son contadores distintos.

## 2. Relación con contratos históricos

`breeding-engine.ts:55` define hoy `OfflinePolicy = "single" | "bounded"`.
PG-08D describe `single` como reinicio tras desconexión y `bounded` como
acumulación limitada con `maxPendingEggs`. Ninguno de los dos conserva todo el
tiempo ni separa fallidos de exitosos.

V4 introduce `OfflinePolicy = "single" | "bounded" | "ALL"` como contrato
**documental**. No se modifica código ni se reescribe PG-08D: esas definiciones
siguen siendo válidas para sus propias aplicaciones. El piloto usa `ALL`.

`ALL` no implica cola de huevos. Se mantienen dos conceptos separados:

| Concepto | Valor V4 | Significado |
|---|---|---|
| `CapacityPolicy.backlogMode` | `single` | Sin `egg.queued`; capacidad agotada → `CAPACITY_EXHAUSTED` o `SINGLE_BACKLOG_FORBIDDEN`. |
| `OfflineReconciliation.policy` | `ALL` | Procesar todo el tiempo pendiente en ventanas, sin descartar horas. |

## 3. Algoritmo documental

1. Leer `lastAt` y `cursor` persistentes.
2. `now = clock.now()` del reloj inyectado. Si `now < cursor` →
   `CLOCK_ROLLBACK`, sin mutación.
3. Dividir `(lastAt, now]` en ventanas semiabiertas `(from, to]` de 24 h:
   24 h → 1 ventana; 48 h → 2; 72 h → 3.
4. En cada ventana, planificar un chequeo por hora, máximo 24. Cada chequeo
   tiene `checkId` determinista e `idempotencyKey` canónica.
5. Persistir el resultado de cada chequeo antes de avanzar `cursor`.
6. Si el chequeo produce, crear el evento y los dos huevos en la misma
   transacción SQLite (PG-08B/F).
7. Si el chequeo se salta o falla, registrar `reason`; `checksSkipped` o
   `checksFailed` aumenta, pero `checksSucceeded` y `productionEvents` no.
8. Repetir el mismo `checkId` devuelve el resultado guardado; no avanza RNG ni
   crea otro huevo.

Está prohibido `WINDOW_EXCEEDED` como mecanismo de descarte. No se adoptan la
acumulación proporcional al tiempo ni el replay total.

## 4. Contadores

| Contador | Cuenta | Límite |
|---|---|---|
| `plannedChecks` | horas planificadas en la ventana | ≤ 24 |
| `checksSucceeded` / `productionEvents` | chequeos que produjeron 1+1 | ≤ 24 por ventana |
| `checksSkipped` | puertas no cumplidas, p. ej. hambre | sin límite distinto; no consume exitos |
| `checksFailed` | errores de persistencia/reloj/versión | no consume exitos |
| `cursor` | última hora persistida | monótono; nunca retrocede |

`maxEvents = 5` no se aplica a ninguno de estos contadores en V4. Puede
permanecer en informes históricos como decisión antigua, sin reescribirlos.

## 5. Reconexión interrumpida

`pending → interrupted → complete`. Al reiniciar se compara integridad, se
lee `cursor`, se reanuda desde la siguiente hora y se reproducen los resultados
ya persistidos por idempotencia. El estado final debe ser idéntico al de una
ejecución continua, con cero duplicados. Si falla la integridad, no se ponen al
día chequeos.

## 6. Límites de evidencia

- La reconstrucción de hambre depende de `advance()` y su ventana verificada de
  7 días; 24/48/72 h caben en ella. Más allá queda `HUNGRY_HISTORY_UNAVAILABLE`
  como conflicto abierto.
- No se promete equivalencia con el contador de pasos del cartucho ni con el
  RNG original.
- Atomicidad real solo dentro de una SQLite; entre la BD de eventos, la BD de
  pares, el frontend o la red se usa replay/reconciliación, no transacción
  distribuida.
