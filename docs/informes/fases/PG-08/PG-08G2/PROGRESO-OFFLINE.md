# PG-08G.2 — Progreso offline

**Estado:** diseño propuesto. `single` es el comportamiento actual; `bounded`
existe como soporte sin política aprobada.

## 1. Qué significa «offline» aquí

Hay tres cosas distintas que se llaman offline:

| Situación | Qué ocurre realmente | ¿Genera huevos? |
|---|---|---|
| El cliente cierra la pestaña | El servicio local sigue vivo | Sí, el servicio decide |
| El servicio estuvo parado | No hubo evaluación de ciclos | No mientras está parado; al arrancar se pone al día |
| El usuario no miró la pantalla | Los ciclos se evaluaron igual | Sí, ya ocurrieron |

Diseñar como si «cerrar la pestaña» detuviera la crianza sería un error: la
autoridad es el servicio, no la interfaz. PG-08E ya lo documenta así.

## 2. Modelo de puesta al día

El progreso no es continuo: es una **secuencia discreta de ciclos**. Cada ciclo
tiene identidad determinista:

```
cycleId = cycleIdOf(nurseryId, pair, pairRevision, cycleNumber)
```

Como el identificador es función de datos persistidos, recalcular el intervalo
produce **los mismos** `cycleId`. Eso es lo que hace segura la reanudación: si
ya se procesó el ciclo 7, volver a evaluarlo devuelve el huevo existente con
`created:false` en lugar de crear otro.

### Algoritmo propuesto

```
1. lastAt      = estado.lastProcessedAt
2. now         = clock.now()            // reloj autoritativo inyectado
3. si now < lastAt  → no generar; registrar CLOCK_ROLLBACK; mantener lastAt
4. si política = single:
      si intervalElapsed(now, lastAt) → evaluar UN ciclo
      si no                           → nada
5. si política = bounded:
      n = floor((now - lastAt) / intervalMs)
      n = min(n, maxEvents)                       // UNRESOLVED
      si now - lastAt > maxWindowMs → n = 0 y registrar WINDOW_EXCEEDED  // UNRESOLVED
      para i in 1..n: evaluar ciclo en orden de cycleNumber
6. persistir lastProcessedAt = now (o lastAt + n*intervalMs) y los eventos
7. drenar cola si hay capacidad
```

Nunca se generan huevos «a mano» por tiempo transcurrido: se generan ciclos, y
cada ciclo decide si produce. Un ciclo incompatible no produce nada aunque
hayan pasado diez horas.

## 3. Determinismo

| Elemento | Fuente | Consecuencia |
|---|---|---|
| Reloj | `BreedingClock` inyectado | Pruebas reproducibles; nada de `Date.now()` |
| Orden de ciclos | `cycleNumber` creciente | Misma secuencia en cada replay |
| Identidad de huevo | `pairEggIdFor(cycleId, productionEventId, role)` | Un ciclo no puede producir dos veces el mismo huevo |
| Semilla genética | `DerivationContext` con `cycleId`/`eggId`/`purpose` | El mismo ciclo reconstruye la misma genética |
| Secuencia de autoridad | `authoritySequence` persistida | Sin saltos ni reutilización |

Corolario: **la genética de un huevo ya producido no depende del momento en que
se consulte**. Consultar tarde o temprano da el mismo resultado.

## 4. Prevención de duplicados

Cuatro barreras independientes:

1. **Identidad determinista**: dos intentos del mismo ciclo generan el mismo
   `eggId`.
2. **Clave de idempotencia**: derivada de `cycleId` + `productionEventId` +
   `recipientRole`; el store devuelve el huevo existente.
3. **Regla de ciclo único**: dos eventos del mismo ciclo → `CYCLE_DUPLICATE`.
4. **Marca de progreso**: `lastProcessedAt`/`lastAuthoritySequence` impiden
   reprocesar el mismo intervalo.

Un reintento puede repetir trabajo, pero no puede duplicar resultados.

## 5. Límites temporales

`bounded` necesita dos topes que **no están decididos**:

| Parámetro | Qué limita | Valor | Estado |
|---|---|---|---|
| `maxEvents` | Cuántos ciclos se ponen al día como máximo | — | UNRESOLVED |
| `maxWindowMs` | Antigüedad máxima de la ausencia compensada | — | UNRESOLVED |

Precedente citado y **no adoptado**: la guardería tamagotchi limita la puesta al
día a 7 días. Es una decisión de producto distinta (necesidades, no huevos) y no
se traslada automáticamente.

`single` no necesita topes porque no acumula: un ciclo por evaluación y el
temporizador se reinicia.

## 6. Casos límite

| Caso | Comportamiento propuesto |
|---|---|
| Reloj retrocede (ajuste manual, NTP) | No generar; registrar `CLOCK_ROLLBACK`; no reescribir `lastProcessedAt` hacia atrás |
| Salto de reloj muy grande | `bounded`: `WINDOW_EXCEEDED` y cero ciclos; `single`: un ciclo como máximo |
| Servicio caído durante la ausencia | Al arrancar, puesta al día según política |
| Padres retirados durante la ausencia | No se compensan ciclos posteriores a la retirada; el par deja de ser válido |
| Padres modificados (nivel, especie, objeto) | `assertParentsUnchanged` / `pairRevision` invalidan el ciclo |
| Capacidad llena al ponerse al día | Los ciclos se encolan (`bounded`) o se rechazan sin consumir idempotencia (`single`) |
| Dos instancias del servicio | La BD única serializa; `busy_timeout` y transacciones; no se diseña multi-nodo |
| Cambio de reglas entre versiones | El ciclo conserva `rulesetVersion`; no se recalcula con reglas nuevas |

## 7. Estado que hay que persistir

```
lastProcessedAt        // marca de puesta al día
lastAuthoritySequence  // evita reutilizar secuencias
cycleNumber (por par)  // orden determinista
estado de cada huevo   // PG-08E
genética resuelta      // PG-08G.2+, con algorithmId y rulesetVersion
cursor RNG por huevo   // solo si la resolución es incremental
```

**Nunca** se persiste la semilla maestra. Se persiste `seedRef` (hash opaco) para
poder auditar y para detectar `SEED_MISMATCH` al reanudar.

## 8. Reanudación segura (procedimiento)

1. Cargar estado y verificar integridad (`integrityCheck`).
2. Comparar `lastAuthoritySequence` con la del store de eventos.
3. Reanudar el drenaje de la cola con `drainBacklog`/`replay` antes de producir
   ciclos nuevos (evita adelantar trabajo y dejar huecos).
4. Aplicar la puesta al día según política.
5. Registrar en el log el número de ciclos evaluados, encolados y producidos.

Si la integridad falla, **no** se pone al día: se informa y se espera
intervención. Producir sobre un estado inconsistente multiplicaría el daño.

## 9. Lo que no se promete

- No se reproduce el contador de pasos de los juegos originales.
- No se garantiza que un huevo «habría» aparecido en un momento exacto del
  pasado: se garantiza que los ciclos procesados son deterministas y auditables.
- No hay compensación infinita: el tope es una decisión de producto pendiente.
- No hay ejecución en segundo plano con el servicio apagado.
