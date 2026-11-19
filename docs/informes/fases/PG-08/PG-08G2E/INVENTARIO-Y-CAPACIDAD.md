# PG-08G.2E — INVENTARIO Y CAPACIDAD

## 1. Evidencia verificada

| Campo | Fuente real | Observación |
|---|---|---|
| C2 anterior | `DECISIONES-D4-D8-D9.md` §4.2; `CAPACIDAD-Y-ATOMICIDAD.md` | Capacidad de huevos por propietario en estados `produced`, `pending_assignment` y `stored`. Valor anterior de prueba: 4. |
| Constante real | `apps/server/src/shared-egg-store.ts:49` | `DEFAULT_EGG_CAPACITY = 4`. |
| Cola C3 | `apps/server/src/shared-egg-store.ts:50` | `DEFAULT_BACKLOG_CAPACITY = 0`. |
| Capacidad del par | `apps/server/src/shared-egg-pair-store.ts:56` | `DEFAULT_PAIR_CAPACITY = 4`. |
| Estados con capacity | `packages/core/src/egg-domain.ts:428-429` | `CAPACITY_STATES = ["produced","pending_assignment","stored"]`; `claimed` y `cancelled` no cuentan. |
| Uso por destinatario | `apps/server/src/shared-egg-pair-store.ts:348-352` | Cuenta `produced`, `pending_assignment` y `stored` por `recipient_id`. |
| Rechazo sin destrucción | `shared-egg-store.ts:375-381` | `setCapacity(n < usage)` → `CAPACITY_BELOW_USAGE`. |
| Sin hueco | `shared-egg-store.ts:502-507` | `CAPACITY_EXHAUSTED` sin consumir idempotencia. |

## 2. BR-01 frente a C2

BR-01 fija **20 huevos por usuario** para el inventario y dice que sustituye
C2 = 4 «en el ámbito de inventario de huevos».

La verificación documental muestra que C2 no es literalmente «inventario»:
cuenta también huevos `produced` y `pending_assignment`, es decir, huevos aún no
reclamados. Por tanto **no se puede afirmar** que BR-01 ya haya redefinido C2
sin antes decidir qué estados forman el inventario.

### Alternativas

| Opción | Descripción | Consecuencia |
|---|---|---|
| A | Inventario = `stored`; C2 pasa a 20 y sigue contando `produced`, `pending_assignment`, `stored`. | Mínima fricción con `CAPACITY_STATES`; pending comparte cupo con inventario. |
| B | Inventario = `claimed`; se amplía `CAPACITY_STATES` con `claimed`. | Coincide con «al recoger pasan al inventario», pero modifica un contrato histórico de PG-08E. |
| C | Nuevo estado `in_inventory` entre `stored` y `claimed`. | Máxima claridad semántica; exige migración y nuevas transiciones. |
| D | Mantener C2 = 4 para pending y crear `INVENTORY_CAPACITY=20` para `stored`. | Separa recursos, pero contradice literalmente «sustituye C2». |

**Recomendación (PROPOSED):** opción B, con una definición explícita de
`INVENTORY_STATES` y sin reescribir informes históricos. Requiere aprobación
humana porque cambia el conjunto de estados que ocupan capacidad.

## 3. Capacidad pendiente de recogida

No hay valor aprobado. BR-05 exige que los huevos permanezcan pendientes antes
de la recogida, por lo que C3 = 0 no describe ese escenario sin más.

### Alternativas

| Opción | Descripción | Riesgo |
|---|---|---|
| 1 | `PENDING_CAPACITY = 0`; recogida inmediata. | Contradice BR-05. |
| 2 | `PENDING_CAPACITY = 20`, igual que inventario. | Puede doblar el cupo efectivo por usuario. |
| 3 | `PENDING_CAPACITY = N` independiente, con `N` pendiente de aprobación. | Más fiel a la separación de contadores; exige decidir `N`. |
| 4 | Pendiente ilimitado. | Contradice D9-A y R-B2. |

**Recomendación (PROPOSED):** opción 3 con un valor acotado y decidido por el
propietario; hasta entonces, cualquier implementación de prueba debe usar un
valor `TEST_PENDING_CAPACITY` explícito y no declararse lista para producto.

## 4. Comportamiento si un inventario está lleno

**Recomendación (PROPOSED):** fallo atómico de todo el evento. No se crea ningún
huevo, no se consume idempotencia de producción y se registra un evento
`CHECK_CAPACITY_FULL` con el `checkId` correspondiente. El siguiente chequeo
horario vuelve a evaluar; no se encola porque R-B2 prohíbe cola adicional.

Alternativa conservadora: producir solo el huevo del propietario con hueco.
**No recomendada**: rompe 1+1 y requiere una regla de reparto no aprobada.

## 5. Invariantes que se conservan

- Ningún contador baja de la ocupación real.
- `setCapacity(n < usage)` → `CAPACITY_BELOW_USAGE`, sin destrucción.
- Misma clave de idempotencia ⇒ como máximo un huevo por destinatario y evento.
- Los dos huevos del par tienen propietarios distintos.
- `claimed`/`cancelled` son terminales y no pueden reabrirse.
- C2, C3 y C4 siguen siendo conceptualmente independientes; C4 continúa diferido.

## 6. Decisión humana pendiente

Confirmar qué estados constituyen el inventario y fijar `PENDING_CAPACITY`.
Sin esa decisión no debe modificarse `CAPACITY_STATES` ni la constante de
capacidad de producción.
