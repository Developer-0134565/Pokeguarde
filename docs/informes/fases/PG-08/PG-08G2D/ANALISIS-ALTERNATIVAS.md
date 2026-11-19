# PG-08G.2D — Análisis de alternativas

Regla aplicada: analizar todas las alternativas documentadas, comprobar su
compatibilidad con PG-08A–F y **no convertir ninguna recomendación en decisión**.
Las cifras `4`, `0`, `1` y los intervalos citados son valores de prueba o de
simulación, nunca decisiones humanas.

## 1. R-B1 — C2, capacidad de almacenamiento por propietario

| Alternativa | Compatibilidad PG-08A–F | Fidelidad | Idle / UX | Persistencia, determinismo y recuperación | Duplicación o pérdida | Legalidad / exportación |
|---|---|---|---|---|---|---|
| **A. Por propietario + cola opcional** | Compatible: D1-A define propiedad, D9-A define cuotas; no altera `DEFAULT_*` salvo sustitución explícita. | No existe en los juegos: es una política de plataforma, no una mecánica Gen I–V. Debe presentarse como tal. | Mejor para idle: el huesped no pierde su huevo porque el anfitrión esté lleno. | Requiere identidad estable y revisión; `rulesetVersion` no basta. Recuperación por `drainBacklog` y replay. | Sin pérdida si se respeta `CAPACITY_BELOW_USAGE`; sin duplicación si se mantiene la clave `cycleId`+`productionEventId`+`recipientRole`. | Neutral: C2 no cambia genética ni L1–L4. |
| **B. Por guardería** | Choca con propiedad por rol de PG-08F y con la custodia compartida: un visitante quedaría supeditado al anfitrión. | Igualmente artificial. | Simple de explicar, pero puede bloquear al visitante. | No necesita identidad de propietario, pero rompe la trazabilidad por titular. | Riesgo de «huevo huérfano» si se reasigna al liberar capacidad. | Neutral, pero agrava D1-A. |
| **C. Ilimitada** | Contradice D9-A (cuotas y abuso) y el riesgo PG-08F «acumulación ilimitada de huevos». | Ninguna. | Aparente comodidad; degrada el servicio a largo plazo. | Crece sin límite; complica integridad y copias. | No pierde huevos, pero satura y hace imposible distinguir eventos antiguos. | Neutral en legalidad, negativo en operación. |
| **D. Cuota 24 h** | Depende de D1-A/D9-A y de un reloj autoritativo; hoy no hay identidad real. | No existe en cartucho. | Predecible, pero introduce ventanas temporales poco claras en un idle. | Exige `BreedingClock` y marca de ventana; `CLOCK_ROLLBACK` ya contemplado. | Riesgo medio: expiración mal definida puede parecer pérdida. | Neutral; debe reforzar trazabilidad. |

**Recomendación principal:** A, con `capacityOwnerId` derivado del rol y
parámetro numérico pendiente de decisión. Debe conservarse el comportamiento ya
verificado `setCapacity(n < usage()) → CAPACITY_BELOW_USAGE` sin destruir
(`shared-egg-store.ts:379`) y `claimed` liberando capacidad.

**Alternativa conservadora:** mantener `single` sin cola y C2 como parámetro
explícito inyectado, sin valor definitivo, con store en memoria.

**Dependencias técnicas:** D1-A, D9-A, opción D8-G2, definición de
`capacityOwnerId`, límites de C3 y C4 independientes.

## 2. R-B2 — C3, capacidad de la cola

| Alternativa | Compatibilidad | Fidelidad | Idle / UX | Persistencia y recuperación | Duplicación/pérdida | Legalidad |
|---|---|---|---|---|---|---|
| `C3=0` con `single` | Ya implementada y probada en PG-08E/F; D8-G2 la propone para v1. | No existe en el juego; es política de servicio. | Rechazo claro con `CAPACITY_EXHAUSTED`; el usuario puede reclamar y reintentar. | No hay cola que recuperar; idempotencia no se consume. | Mínimo: no se crea el huevo, por lo que no puede perderse. | Neutral. |
| `C3>0` con `bounded` | Compatible con D8-G2, D9-G2 §9.4 y `drainBacklog`. | Igualmente artificial. | Mejor para ausencias largas: guarda el evento completo. | Exige persistir evento, marca, secuencia y cursor RNG; drenar **antes** de poner al día (R-A8). | Riesgo si se reencola un evento ya aplicado; mitigado con idempotencia y `CYCLE_DUPLICATE`. | Neutral; pero la caducidad (R-B5) depende de D8-A. |
| Cola ilimitada | Contradice D9-A y PG-08F. | No. | Engaña al usuario: promete todo sin límite. | No acotable. | Satura; no hay recuperación fiable. | Neutral/negativa en operación. |
| Reasignar al otro propietario | Contradice la propiedad por rol y la distribución 1+1 decidida. | No. | Confuso. | Rompe trazabilidad. | Riesgo alto de doble propietario. | Neutral, pero viola PG-08F. |

**Recomendación principal:** conservar `single` para el piloto; dejar `bounded`
como fase posterior condicionada a C3 y a R-B4. Si se activa, el evento debe
almacenarse completo y drenarse antes de cualquier puesta al día.

**Alternativa conservadora:** C3 explícito en memoria, sin persistencia, para
pruebas de drenaje; nunca en `data/pokegotchi.db`.

**Dependencias:** D8-G2, D8-A (caducidad), D9-G2 §9.4, R-A8, R-A15.

## 3. R-B3 — C4, incubación simultánea

| Alternativa | Compatibilidad | Fidelidad | Idle / UX | Persistencia | Duplicación/pérdida | Legalidad |
|---|---|---|---|---|---|---|
| No crear el contador | Compatible con todo lo vigente; es el estado real. | Los juegos no limitan «incubación simultánea» como recurso de plataforma. | El ciclo de incubación se modela por tiempo, no por cupo. | No hay estado nuevo. | Ninguno. | Neutral. |
| Contador independiente con límite | Compatible solo si no se confunde con C2 (R-A16). | Introduce una restricción de diseño ajena al cartucho; debe presentarse como tal. | Puede añadir una meta de idle interesante, pero también una fuente de bloqueos. | Requiere persistir inicio de incubación y eclosión por huevo. | Riesgo de perder el contador al cerrar; exige recuperación. | Neutral, pero debe documentarse como simulación. |
| Reutilizar C2 | **Descartada**: R-A16 la declara incorrecta en ambos sentidos. | Mezcla almacenamiento con incubación. | Un huevo recluido podría incubar sin querer. | Estado ambiguo. | Riesgo alto. | Neutral, pero frágil. |

**Recomendación principal:** no crear C4 en el piloto. Si se introduce más
adelante, debe ser un contador independiente y su valor una decisión humana.

**Alternativa conservadora:** modelo de incubación por marcas de tiempo, sin
cupo, con `UNKNOWN_HATCH_CYCLES` hasta que exista una decisión.

**Dependencias:** arquitectura v2 capas 6–7, R-A16, contrato de eclosión sin PKM.

## 4. R-B4 — `maxEvents` / `maxWindowMs`

| Alternativa | Compatibilidad | Fidelidad | Idle / UX | Determinismo y recuperación | Duplicación/pérdida | Legalidad |
|---|---|---|---|---|---|---|
| **A. `single`** | Implementada en `breeding-engine.ts`; D8-G2 la propone para v1. | No intenta replicar el temporalizador del cartucho; `PROVISIONAL_INTERVALS_MS` ya es simulación explícita. | Una ausencia larga produce un solo ciclo: fácil de entender y sin «picos». | Reloj inyectado; una marca por ciclo; `CLOCK_ROLLBACK` sin generar. | Cuatro barreras anti-duplicados; reintento `created:false`. | Neutral. |
| **B. `bounded` con topes** | Compatible con D8-G2, pero requiere decidir ambos números. | Tampoco replica el cartucho; es compensación de servicio. | Más generosa en idle, pero puede llenar C2 y exigir C3. | `n=floor((now-lastAt)/intervalMs)`, `min(n,maxEvents)`, `WINDOW_EXCEEDED`; exige persistir secuencia y cursor RNG. | Riesgo si la puesta al día se repite; mitigado con marcas e idempotencia. | Neutral, pero más superficie de validación. |
| **C. Proporcional al tiempo** | Descartada en D8-G2. | Falsa precisión: equipara intervalos simulados con tasas reales. | Difícil de predecir. | Requiere más estado. | Riesgo alto. | Negativo: podría confundirse con tasa oficial. |
| **D. Replay total** | Descartada en D8-G2. | No. | Coste creciente. | Necesita eventos históricos completos; frágil ante cambios de reglas. | Riesgo de reaplicar eventos. | Neutral/negativo. |

**Recomendación principal:** `single` para el piloto; `bounded` queda PROPOSED
y solo se activa con `maxEvents` y `maxWindowMs` decididos por el usuario.

**Alternativa conservadora:** `bounded` con `UNRESOLVED_POLICY` cuando falte
algún tope (caso OFF-04), sin generar ciclos.

**Dependencias:** D8-G2, reloj inyectado de PG-08D, R-A9/R-A10, R-B2 (cola),
D8-A solo para caducidad.

## 5. Compatibilidad agregada con PG-08A–F

Ninguna recomendación modifica los contratos adoptados:

- custodia 2, propiedad por rol y distribución 1+1 permanecen intactas;
- las cuatro capas L1–L4 y `unverified` no cambian;
- `realPkm:false` y `exportable:false` se conservan para todo resultado genético
  simulado;
- la atomicidad sigue siendo intra-SQLite; escribir `.srm` continúa declarado
  como no atómico;
- no se propone cuenta, pago, red, cifrado nuevo ni despliegue público;
- no se reescribe ningún informe histórico ni se integra código en `check.sh`.

## 6. Fidelidad generacional

Las cuatro recomendaciones son políticas de plataforma, **no reglas de
cartucho**. Por tanto no deben presentarse como «fidelidad» a Gen I–V; la
fidelidad se reserva a las reglas por `GameKey` (DVs, IVs, movimientos, shiny,
naturaleza, habilidades, niveles de eclosión). Mezclar ambas sería el error
R-A2/A16. Se mantienen `UNKNOWN`, `CONFLICTING` y `PARTIALLY VERIFIED` donde la
evidencia no permite cerrar.
