# PG-08G.2E — CHEQUEOS HORARIOS

## 1. Decisión BR-02

Comprobar las condiciones de crianza cada **60 minutos**. Cada chequeo debe
tener identidad determinista. Un chequeo **no** es un huevo: puede terminar en
producción, en espera o en omisión.

## 2. Evidencia existente

- `packages/core/src/breeding-engine.ts:32` → `MIN_INTERVAL_MS = 3_600_000`.
- `packages/core/src/breeding-engine.ts:42-51` → tabla `PROVISIONAL_INTERVALS_MS`:
  common 1 h, uncommon 2 h, rare 4 h, very_rare 6 h, epic 8 h,
  legendary_compatible 10 h, extreme 12 h, unknown 0 (bloquea).
- `packages/core/src/breeding-engine.ts:209-211` →
  `cycleIdOf(nurseryId, pair, pairRevision, cycleNumber)`.
- `packages/core/src/breeding-engine.ts:213-218` → `pairRevisionOf` canónico.
- `PG-08D/03-POLITICA-INTERVALOS.md:16-21` → la tabla es simulación explícita,
  no clasificación oficial ni balance definitivo.

## 3. Conflicto con los intervalos por rareza

BR-02 no dice explícitamente que la tabla de rareza quede derogada. Por ello
deben distinguirse dos conceptos:

- **Chequeo:** oportunidad horaria de evaluar permiso, Hungry, capacidad y
  compatibilidad.
- **Producción:** evento que puede ocurrir en un chequeo cuando además se cumple
  el intervalo vigente de la pareja.

### Alternativas

| Opción | Descripción | Evaluación |
|---|---|---|
| A | Chequeo horario + intervalo de rareza vigente. | Conserva PG-08D; recomendada. |
| B | Chequeo horario igual a producción, sin tabla de rareza. | Simple, pero deroga una tabla aprobada como simulación; requiere decisión. |
| C | Chequeo horario solo para Hungry/capacidad;producción sigue por `dueAt`. | Similar a A; menos claro para auditoría. |

**Recomendación (PROPOSED):** opción A, documentando que el chequeo es una
evaluación y no una garantía de huevo.

## 4. Identidad determinista propuesta

`checkId = check:${nurseryId}:${pair[0]}:${pair[1]}:${pairRevision}:${checkNumber}`

Reglas propuestas:

1. `checkNumber` crece de forma monótona por par y revisión.
2. El tiempo del chequeo sale del reloj inyectado de la autoridad; nunca de
   `Date.now()` del cliente.
3. El mismo `checkId` se ejecuta como máximo una vez; un reintento devuelve el
   resultado ya persistido.
4. Un chequeo fallido produce un evento de auditoría con `reason`, no un huevo.
5. Los chequeos no consumen idempotencia de producción salvo que terminen en un
   evento 1+1 confirmado.

## 5. Resultados posibles de un chequeo

| Resultado | Produce huevos | Observación |
|---|---|---|
| `CHECK_OK_PRODUCED` | Sí, 2 | Producción y asignación atómicas. |
| `CHECK_HUNGRY_BELOW_THRESHOLD` | No | BR-03; se guarda el ratio evaluado. |
| `CHECK_CAPACITY_FULL` | No | No se consume idempotencia; se reevalúa en el siguiente chequeo. |
| `CHECK_RARITY_NOT_DUE` | No | Opción A; el intervalo vigente aún no vence. |
| `CHECK_PAIR_INVALID` | No | Pareja incompleta, incompatible o sin permiso vigente. |
| `CHECK_DUPLICATE` | No | Reintento de un `checkId` ya procesado. |

## 6. Decisión humana pendiente

Confirmar si la tabla de rareza permanece como compuerta de producción (A) o si
BR-02 la sustituye (B). No se modifica ninguna tabla sin esa decisión.
