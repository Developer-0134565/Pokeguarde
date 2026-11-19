# PG-08C — Estudio comparativo D6: recuperación de Pokémon

**Estado: ESTUDIO TÉCNICO. NO DECISIÓN. NO IMPLEMENTACIÓN DE POLÍTICA.**

D6 sigue **pendiente de aprobación humana**. Este documento compara cuatro
alternativas para que la decisión se tome con información, nopara adoptar
ninguna de ellas aquí. El prototipo de vales de siete días de PG-08A/B
**permanece intacto** y no se presenta como política aprobada.

## 1. Invariante obligatorio

> **El derecho del propietario a recuperar su Pokémon no puede caducar.**

Este invariante se aplica a las cuatro alternativas. Lo que puede caducar, si
la decisión futura lo autoriza, es un **instrumento técnico** (un vale, una
reserva, una autorización de retirada), pero **nunca la titularidad ni el
derecho de recuperación**. Un instrumento caducado debe poder reemitirse sin
perder el derecho subyacente.

Consecuencias verificadas en el prototipo actual (`requestRecovery`):

- Un vale caducado produce `VOUCHER_EXPIRED` al intentar canjearlo.
- El propietario puede emitir **otra solicitud con distinto `request.id`**; el
  vale anterior queda obsoleto (`STALE_REVISION`).
- Una solicitud repetida con el **mismo `request.id`** produce
  `DUPLICATE_REQUEST`.
- Tras la recuperación confirmada, la estancia pasa a `stay_finished` y un
  cuidado posterior se rechaza con `STAY_NOT_ACTIVE`.

Esto es comportamiento del prototipo PG-08A, **no** una elección de producto.

## 2. Las tres desconexiones NO son equivalentes

Cualquier política D6 debe tratar por separado estos tres escenarios:

| Escenario | Quién falta | Qué se pierde | Qué NO debe ocurrir |
|---|---|---|---|
| **A. Anfitrión desconectado** | El dispositivo/host que cuida al Pokémon | Interacción inmediata con el huésped | El propietario no queda bloqueado indefinidamente por la ausencia del anfitrión |
| **B. Propietario desconectado** | El titular | Capacidad de solicitar y confirmar | El anfitrión no puede apropiarse, transferir ni eliminar al Pokémon; el cuidado sigue bajo las reglas acordadas |
| **C. Servicio autoritativo desconectado** | El registro que decide revisiones | Garantía de unicidad y arbitraje de conflictos | Las réplicas no se convierten en autoridades; no se aceptan write conflicticos; la recuperación no se fabrica localmente |

Un diseño que trate A, B y C como «está offline, espera» es incorrecto: en A
debe existir una vía de recuperación, en B debe preservarse la titularidad y en
C debe suspenderse la escritura conflictiva sin degradar la propiedad.

## 3. Criterios comunes de comparación

Se evalúan doce criterios por alternativa:

1. Garantía de propiedad
2. Disponibilidad
3. Seguridad
4. Complejidad
5. Dependencia del servidor
6. Comportamiento offline
7. Riesgos de duplicación
8. Experiencia de usuario
9. Compatibilidad con PG-08A/B/C
10. Pruebas necesarias
11. Limitaciones
12. Tratamiento de las tres desconexiones

---

## 4. Alternativa A — Vale temporal renovable

**Descripción.** La autoridad emite un vale con `nonce`, `issuedAt`,
`expiresAt` y `revision`. El propietario lo presenta para recuperar. Si caduca,
puede solicitar otro con distinto `request.id`; el derecho no se pierde.

| Criterio | Evaluación |
|---|---|
| **Garantía de propiedad** | Alta. El vale está ligado a `ownerId` y `stayId`; el dominio rechaza OWNER_MISMATCH. La titularidad se conserva en el estado de la estancia. |
| **Disponibilidad** | Media-alta. Permite recuperación con anfitrión desconectado siempre que el propietario pueda presentar el vale ante la autoridad. |
| **Seguridad** | Media. Depende de la protección anti-replay: el vale queda inutilizado tras el canje (`STALE_REVISION`) y el `nonce` debe ser impredecible. El prototipo usa UUID v4. |
| **Complejidad** | Media. Requiere emisión, caducidad, renovación, revocación y control de reintento. Ya existe un prototipo, pero no una política. |
| **Dependencia del servidor** | Alta para emitir y canjear; el vale es un instrumento autoritativo. |
| **Comportamiento offline** | El vale puede guardarse localmente y presentarse después. Sin autoridad no hay canje confirmado; la confirmación no puede fabricarse en la réplica. |
| **Riesgos de duplicación** | Medios. Mitigados por `nonce` único, `usedAt`, `revision` y dedupe por `idempotencyKey`. El mismo vale con otra clave ya se rechaza. |
| **Experiencia de usuario** | Aceptable, pero la caducidad puede confundir: hay que explicar que «el vale caducó, su derecho no». |
| **Compatibilidad PG-08A/B/C** | **Máxima**. Es exactamente el prototipo existente, con recuperación desconectada ya modelada y persistida en el EventStore. |
| **Pruebas necesarias** | Caducidad, renovación con otro ID, doble canje, replay, vales obsoletos, presentación tardía, revocación y pérdida de confirmación. Parcialmente cubiertas en PG-08C 25/26/27. |
| **Limitaciones** | La caducidad del instrumento no puede interpretarse como pérdida del derecho. Requiere UX cuidadosa y una definición explícita de renovación y revocación. |
| **Desconexiones** | A: atendida por diseño. B: titularidad preservada, pero nadie puede iniciar la retirada. C: el vale puede presentarse en cuanto vuelva la autoridad; mientras tanto no se confirma nada. |

### Alternativa A — resolución de las tres desconexiones

- **Anfitrión desconectado:** es el caso fuerte del vale; el diseño de PG-08A
  (`hostConnected:false`, `hostOfflineNoted`) ya lo contempla.
- **Propietario desconectado:** el vale no puede presentarse; el Pokémon sigue
  alojado y el anfitrión no gana ningún derecho.
- **Servicio desconectado:** el vale no puede canjearse; la posesión no cambia
  y las réplicas no admiten confirmaciones locales.

---

## 5. Alternativa B — Recuperación directa autoritativa

**Descripción.** El propietario autenticado envía una solicitud y la autoridad
transiciona inmediatamente el estado a `stay_finished`, sin vale previo.

| Criterio | Evaluación |
|---|---|
| **Garantía de propiedad** | Alta si la autoridad es correcta; depende por completo de la autenticación del solicitante. |
| **Disponibilidad** | Alta con servicio disponible; **nula** con servicio caído. |
| **Seguridad** | Alta en tránsito si hay autenticación fuerte; exige exclusión de operaciones concurrentes para evitar doble retirada. |
| **Complejidad** | Media-baja en el flujo normal; alta al gestionar desconexión del anfitrión y reconciliación posterior. |
| **Dependencia del servidor** | **Máxima**. No hay recuperación sin autoridad. |
| **Comportamiento offline** | No existe: el propietario desconectado no puede recuperar y el anfitrión desconectado no puede confirmar. |
| **Riesgos de duplicación** | Medios: dos solicitudes concurrentes deben resolverse por revisión optimista; ya hay precedente D5 (`STALE_REVISION`). |
| **Experiencia de usuario** | Mejor en caso normal: una acción y listo. Peor cuando hay desconexión. |
| **Compatibilidad PG-08A/B/C** | Parcial. Requiere un nuevo comando de recuperación directa; PG-08A solo modela `requestRecovery` + `completeRecovery`. No debe eliminar el prototipo de vales. |
| **Pruebas necesarias** | Solicitud autenticada, idempotencia, exclusión con cuidado concurrente, reconciliación del anfitrión, rechazo sin servicio. |
| **Limitaciones** | Incapaz de atender la desconexión del servicio; contradice el objetivo de recuperación offline si se adopta en exclusiva. |
| **Desconexiones** | A: viable, el estado cambia en la autoridad y el anfitrión se entera al volver. B: imposible. C: imposible. |

### Alternativa B — resolución de las tres desconexiones

- **Anfitrión desconectado:** permitiría la retirada inmediata; el host se
  sincroniza después y no puede sobrescribir la recuperación confirmada.
- **Propietario desconectado:** sin recuperación; la titularidad sigue siendo
  suya, pero no puede ejercerse.
- **Servicio desconectado:** bloqueo total de la recuperación.

---

## 6. Alternativa C — Recuperación mediante estado de custodia

**Descripción.** Se separan propiedad y custodia. El propietario solicita
retirada; la autoridad reserva el estado (`pickup_requested`), bloquea nuevas
operaciones de cuidado y emite una confirmación definitiva cuando el trámite
termina.

| Criterio | Evaluación |
|---|---|
| **Garantía de propiedad** | **Máxima Conceptualmente**: propiedad y custodia son campos distintos; la custodia nunca implica titularidad. |
| **Disponibilidad** | Media: la reserva puede hacerse con servicio, la confirmación puede diferirse. |
| **Seguridad** | Alta: la reserva es una transición autoritativa y excluye cuidado posterior (ya verificado: `STAY_NOT_ACTIVE`). |
| **Complejidad** | Alta: exige estados adicionales, reglas de reserva, expiración de reserva, recuperación ante fallos y reconciliación. |
| **Dependencia del servidor** | Alta para la reserva; la confirmación puede ser diferida si se diseña un protocolo específico. |
| **Comportamiento offline** | Parcial: la reserva no se crea sin autoridad, pero la intención puede persistirse localmente y reenviarse. |
| **Riesgos de duplicación** | Bajos si la reserva es única por `stayId` y se usa revisión optimista. |
| **Experiencia de usuario** | Más lenta en casos normales; muy clara en casos de disputa. |
| **Compatibilidad PG-08A/B/C** | Alta: `pickup_requested` ya existe en el dominio, así como `recoverable_error`. Requiere definir semántica de reserva y caducidad sin perder el derecho. |
| **Pruebas necesarias** | Reserva única, bloqueo de cuidado, confirmación definitiva, fallo durante confirmación, reintento, reconciliación y nunca sobrescribir recuperación confirmada. |
| **Limitaciones** | Más estados que gestionar; la caducidad de la reserva no debe borrar la titularidad. |
| **Desconexiones** | A: la reserva puede hacerse y el host se entera al volver. B: la intención queda registrada cuando el propietario vuelve. C: se suspende la confirmación; no se crean reservas locales alternativas. |

### Alternativa C — resolución de las tres desconexiones

- **Anfitrión desconectado:** la reserva bloquea el cuidado y preserva al
  Pokémon hasta la confirmación.
- **Propietario desconectado:** no se confirma la devolución; la custodia sigue
  bajo las reglas vigentes, sin transferencia de propiedad.
- **Servicio desconectado:** no se crean reservas nuevas; las ya confirmadas
  siguen vigentes en las réplicas.

---

## 7. Alternativa D — Modelo híbrido

**Descripción.** Recuperación directa para el caso normal, vale temporal para
operaciones desconectadas y reconciliación al volver a conectarse.

| Criterio | Evaluación |
|---|---|
| **Garantía de propiedad** | Alta si ambas vías comparten la misma autoridad y revisión. |
| **Disponibilidad** | **La más alta de las cuatro**: cubre online y offline. |
| **Seguridad** | Media-alta; exige que la vía offline no pueda fabricar confirmaciones y que la reconciliación resuelva conflictos con D5. |
| **Complejidad** | **La más alta**: dos protocolos, reconciliación, dedupe cruzado y reglas de precedencia. |
| **Dependencia del servidor** | Media: online depende de él; offline permite intención diferida, nunca confirmación definitiva. |
| **Comportamiento offline** | Mejor cobertura; el anfitrión desconectado no bloquea al propietario y el servicio caído no destruye el derecho. |
| **Riesgos de duplicación** | Medios-altos si no hay un identificador común entre ambas vías; mitigable con `commandId` y revisión por agregado. |
| **Experiencia de usuario** | Mejor si se abstrae la complejidad; confusa si se exponen dos flujos distintos. |
| **Compatibilidad PG-08A/B/C** | Alta: reutiliza vales, outbox, réplicas y revisión optimista ya implementados. Añade una vía directa nueva. |
| **Pruebas necesarias** | Todas las de A, B y C, más reconciliación cruzada, precedencia entre vale y retirada directa, y reintentos mixtos. |
| **Limitaciones** | Superficie de prueba grande; requiere una definición clara de cuándo una confirmación offline es definitiva (en esta fase: nunca sin autoridad). |
| **Desconexiones** | A: vale. B: intención diferida del propietario. C: operación directa bloqueada, vale pendiente de canje, sin writes conflictivos. |

### Alternativa D — resolución de las tres desconexiones

- **Anfitrión desconectado:** se usa la vía de vale/offline; la reconciliación
  posterior no puede revertir una recuperación confirmada.
- **Propietario desconectado:** queda registrada la intención; no se concede
  ningún derecho nuevo al anfitrión.
- **Servicio desconectado:** se suspende la autoría de cambios; las réplicas
  solo leen eventos confirmados y detectan huecos.

---

## 8. Matriz rápida

| Criterio | A Vale | B Directa | C Custodia | D Híbrido |
|---|---|---|---|---|
| Garantía de propiedad | Alta | Alta | Máxima | Alta |
| Disponibilidad | Media-alta | Alta online / nula offline | Media | Alta |
| Seguridad | Media | Alta | Alta | Media-alta |
| Complejidad | Media | Media-baja | Alta | Máxima |
| Dependencia del servidor | Alta | Máxima | Alta | Media |
| Offline | Parcial | No | Parcial | Mejor |
| Riesgo duplicación | Medio | Medio | Bajo | Medio-alto |
| UX | Aceptable | Mejor online | Clara pero lenta | Mejor si se abstrae |
| Compatibilidad PG-08A/B/C | Máxima | Parcial | Alta | Alta |
| Anfitrión desconectado | Sí | Sí | Sí | Sí |
| Propietario desconectado | No | No | Parcial | Parcial |
| Servicio desconectado | Diferido | No | Diferido | Diferido |

## 9. Hallazgos del estudio

1. **Ninguna alternativa resuelve por sí sola las tres desconexiones.** B falla
   en las desconexiones de propietario y servicio; A y C no permiten iniciar la
   retirada sin el propietario; D es la única que las cubre, al precio de mayor
   complejidad.
2. **El derecho no caduca en ninguna alternativa.** Solo caducan instrumentos.
3. **La reconciliación debe ser unilateral en un sentido:** una recuperación
   confirmada nunca puede ser sobrescrita por un cuidado tardío ni por una
   réplica desconectada.
4. **La autenticación no sustituye a la autoridad.** Un token válido no autoriza
   a escribir directamente en el EventStore (D1/D5).
5. **El prototipo actual ya cubre una parte del espacio**: vale con caducidad,
   renovación, anti-replay y recuperación con anfitrión desconectado. Esto
   condiciona la compatibilidad, no la decisión.

## 10. Lo que este estudio NO hace

- No elige alternativa.
- No modifica `requestRecovery`, `completeRecovery` ni los vales.
- No introduce crianza, cuentas, servicios públicos ni transferencia remota.
- No cambia el prototipo de PG-08A/B.
- No convierte una recomendación técnica en decisión de producto.

La recomendación técnica, explícitamente **no vinculante**, está en
`08-RECOMENDACION-NO-VINCULANTE.md`. La decisión D6 sigue **pendiente**.
