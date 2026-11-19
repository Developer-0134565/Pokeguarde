# PG-08G.2 — Decisiones D4, D8 y D9

**Ninguna decisión de este documento está DECIDED.** Todas quedan como
**PROPOSED** o **UNRESOLVED**; las que exigen un valor de producto reservado al
usuario no se rellenan con un número inventado.

## 0. Discrepancia de etiquetas — leer antes que nada

Las etiquetas `D4`, `D8` y `D9` **no significan lo mismo** en PG-08A y en esta
misión. Es una discrepancia documental real, no un conflicto de código.

| Etiqueta | Significado en PG-08A (`11-DECISIONES-PENDIENTES.md`) | Significado en PG-08G.2 |
|---|---|---|
| D4 | **Invitaciones y descubrimiento** (cómo se encuentran dos usuarios) | **Capacidad de huevos** |
| D8 | **Retención de datos** (plazos, anonimización) | **Acumulación offline** |
| D9 | **Límites y abuso** (cuotas, rate limiting) | **Asignación y recepción** |

Consecuencias:

1. Este documento usa **D4-G2, D8-G2 y D9-G2** para las materias de esta
   misión. Las de PG-08A se citan como **D4-A, D8-A, D9-A**.
2. Las decisiones D4-A, D8-A y D9-A **siguen pendientes** y no se reabren aquí.
3. Se recomienda que PG-08G.3+ use siempre el sufijo de fase; **no** se
   renumeran los informes históricos.
4. Hay solapamiento parcial: D9-A (límites y abuso) condiciona los valores de
   D4-G2 (capacidad), y D8-A (retención) condiciona la expiración de huevos en
   espera de D9-G2. Se documenta, no se resuelve por analogía.

## D4-G2 — Capacidad de huevos

### Evidencia verificada en código

| Hecho | Fuente |
|---|---|
| `DEFAULT_EGG_CAPACITY = 4` y `DEFAULT_BACKLOG_CAPACITY = 0` | `apps/server/src/shared-egg-store.ts:49-50` |
| Solo cuentan para capacidad los estados `produced`, `pending_assignment`, `stored` (`CAPACITY_STATES`) | `packages/core/src/egg-domain.ts:428-429` |
| `setCapacity(n)` con `n < usage()` → `CAPACITY_BELOW_USAGE`; nunca destruye ni reasigna un huevo | `shared-egg-store.ts:375-381` |
| Sin espacio y política `single` → `CAPACITY_EXHAUSTED` **sin consumir la clave de idempotencia** | `shared-egg-store.ts:502-507` |
| Sin espacio y política `bounded` con hueco → entrada completa en `egg_backlog` | `shared-egg-store.ts:509-513` |
| La capacidad del par se evalúa **por propietario** (`usageFor(hostOwner)`, `usageFor(guestOwner)`) | `shared-egg-pair-store.ts:415-421` |
| `DEFAULT_PAIR_CAPACITY = 4` es valor de prueba declarado, no política | `shared-egg-pair-store.ts:56`, PG-08F `RIESGOS-Y-DECISIONES.md` |
| Máximo **2 Pokémon** por guardería (no huevos) | `AGENTS.md`, PG-08 |

### Subdecisiones separadas (no mezclar en un solo número)

| # | Subdecisión | Estado | Nota |
|---|---|---|---|
| 4.1 | Capacidad de custodia (Pokémon en guardería) | **DECIDED** en `AGENTS.md`: 2 | No es capacidad de huevos |
| 4.2 | Capacidad de almacenamiento de huevos **por propietario** | UNRESOLVED | `4` es valor de prueba |
| 4.3 | Capacidad de la cola de espera (`backlog`) | UNRESOLVED | `0` = sin espera; es un valor de prueba |
| 4.4 | Límite de incubación simultánea | UNRESOLVED | Concepto nuevo: no existe en el código |
| 4.5 | ¿La capacidad se cuenta por propietario, por guardería o por ciclo? | PROPOSED: por propietario | El par ya evalúa por propietario |
| 4.6 | ¿Un huevo reclamado libera capacidad? | DECIDED por comportamiento: sí (`claimed` sale de `CAPACITY_STATES`) | Verificado en PG-08E |

### Alternativas para 4.2 / 4.3 / 4.4

**A. Capacidad por propietario + cola opcional (estado actual del código).**
- Ventajas: ya implementado y probado (48 + 50 casos); impide que un invitado
  sature al anfitrión; el rechazo no pierde eventos.
- Riesgos: dos propietarios con 4 huevos cada uno pueden acumular 8 por
  guardería; la cola `bounded` puede crecer si nadie drena.
- Compatibilidad PG-08A–F: total.
- Estado: PROPOSED.

**B. Capacidad por guardería (un solo contador compartido).**
- Ventajas: más simple de explicar; acota el total por estancia.
- Riesgos: un propietario puede consumir la cuota del otro; requiere cambiar
  `usageFor` y la semántica del par; rompe la simetría 1+1.
- Compatibilidad: media (cambio de contrato en el store del par).
- Estado: alternativa documentada, no recomendada.

**C. Capacidad ilimitada con límite solo de incubación.**
- Ventajas: no rechaza producción; el jugador decide qué incubar.
- Riesgos: crecimiento sin cota en SQLite; sin presión de drenaje; difícil de
  auditar; contradice D9-A (límites y abuso).
- Compatibilidad: baja con las pruebas de saturación de PG-08E.
- Estado: alternativa documentada, no recomendada para v1.

**D. Cuota temporal (huevos por ventana de 24 h) en lugar de capacidad fija.**
- Ventajas: modela el ritmo real de crianza; no bloquea para siempre.
- Riesgos: exige reloj autoritativo y ventana persistida; más superficie de
  abuso; no hay evidencia histórica que fije la tasa.
- Compatibilidad: requiere extensión del store; no rompe PG-08D/E.
- Estado: alternativa documentada.

### Recomendación técnica (no aprobada)

Mantener **A** con tres contadores explícitos y desacoplados: capacidad de
almacenamiento por propietario, capacidad de cola por guardería y límite de
incubación simultánea. Los tres valores numéricos quedan **UNRESOLVED**: deben
fijarse por decisión humana, no por el valor de prueba `4`.

## D8-G2 — Acumulación offline

### Evidencia verificada en código

| Hecho | Fuente |
|---|---|
| `OfflinePolicy = "single" | "bounded"`; `initialState(nurseryId, policy, maxPendingEggs = 1)` | `packages/core/src/breeding-engine.ts:55,184` |
| `single` prohíbe cola: `setAccumulation("single", n>0)` → `SINGLE_BACKLOG_FORBIDDEN` | `shared-egg-store.ts:390-392` |
| `bounded` guarda la entrada completa (ciclo, evento, secuencia de autoridad) y se puede drenar tras reinicio | `shared-egg-store.ts:509-513,613-654` |
| Dos eventos del mismo ciclo → `CYCLE_DUPLICATE`; reintento del mismo evento devuelve el huevo existente (`created:false`) | PG-08E `07-ACUMULACION-OFFLINE.md` |
| El tiempo lo da el reloj autoritativo inyectado; el motor no llama a `Date.now()` | `breeding-engine.ts` (`BreedingClock`), PG-08E §07 |
| Desconexión del cliente ≠ desconexión del servicio | PG-08E §07 |
| Precedente de tope temporal: la guardería tamagotchi limita la puesta al día a **7 días** | `AGENTS.md`, fase 3 |

### Alternativas

**A. `single`: sin acumulación (un huevo por ciclo, temporizador reiniciado).**
- Ventajas: ya es el comportamiento por defecto y está probado; imposible
  duplicar por ausencia; explicable al jugador.
- Riesgos: castiga la ausencia larga; si el servicio estuvo caído, no hay
  compensación.
- Compatibilidad: total.
- Estado: PROPOSED como valor por defecto de v1.

**B. `bounded`: cola acotada de eventos con ventana temporal máxima.**
- Ventajas: compensa ausencias sin crecimiento ilimitado; determinista
  (cada evento conserva su `authoritySequence`); drenable y auditable.
- Riesgos: hay que fijar `maxEvents` y `maxWindowMs` (UNRESOLVED); el drenaje
  debe revalidar capacidad, procedencia y permisos (ya lo hace); una cola llena
  rechaza eventos de forma segura.
- Compatibilidad: total, ya implementado como soporte.
- Estado: PROPOSED para una fase posterior, con valores pendientes.

**C. Acumulación proporcional al tiempo (estilo contador de pasos del juego).**
- Ventajas: se parece más al original.
- Riesgos: exigiría simular pasos o tiempo de juego, que no tenemos; haría el
  resultado dependiente de una magnitud no autoritativa; más difícil de
  reproducir y de auditar.
- Compatibilidad: baja con `BreedingClock`.
- Estado: descartada para v1.

**D. Recomputar todo el intervalo al reconectar (replay total).**
- Ventajas: máxima fidelidad teórica.
- Riesgos: coste O(ciclos), resultados sensibles a cambios de reglas, riesgo de
  duplicados si el replay no es idempotente.
- Compatibilidad: requiere un registro de reglas versionado por ciclo.
- Estado: descartada.

### Determinismo y prevención de duplicados (común a A y B)

- La clave de idempotencia debe derivarse de `cycleId` + `productionEventId` +
  `recipientRole`; PG-08F ya genera identidades estables (`pairEggIdFor`).
- Un reintento devuelve el huevo existente con `created:false`; nunca crea otro.
- La puesta al día se hace **una vez** al abrir, con el reloj autoritativo, y
  deja marca de la última secuencia procesada.
- El tope temporal propuesto se inspira en el límite de 7 días de la guardería,
  pero **no se adopta** hasta decisión humana.

### Recomendación técnica (no aprobada)

`single` en v1; `bounded` solo cuando existan `maxEvents` y `maxWindowMs`
aprobados. El estado RNG y la secuencia de autoridad deben persistirse para que
la reanudación no repita ni salte ciclos.

## D9-G2 — Asignación y recepción

### Evidencia verificada en código

| Hecho | Fuente |
|---|---|
| Políticas: `guest_owner`, `host`, `prearranged`, `pending` | `packages/core/src/egg-domain.ts:35-41` |
| Política fija del par: `host → host`, `guest → guest_owner` | `packages/core/src/egg-pair-domain.ts:63-66` (`OWNER_POLICY_BY_ROLE`) |
| Entrega en dos fases: `prepareDelivery` y `confirmDelivery`, ambas idempotentes | `shared-egg-pair-store.ts:508-561` |
| `retry(idempotencyKey)`, `stageOf(eggId)` y `replay(events)` para recuperación | `shared-egg-pair-store.ts:563-592` |
| Etapas: `produced`, `stored`, `assigned`, `available`, `claimed`, `delivered` | `egg-pair-domain.ts:38-41` |
| Capacidad insuficiente de cualquiera de los dos propietarios → cola, no pérdida | `shared-egg-pair-store.ts:415-421` |
| El store rechaza operar sobre `data/pokegotchi.db` | PG-08F `ARQUITECTURA.md` |

### Subdecisiones

| # | Subdecisión | Estado |
|---|---|---|
| 9.1 | ¿Quién recibe cada huevo del par? | **DECIDED** por PG-08F: anfitrión el suyo, invitado el suyo |
| 9.2 | ¿Se permite `prearranged` (intercambio de destinos)? | UNRESOLVED |
| 9.3 | ¿Se permite `pending` con reclamación posterior? | UNRESOLVED |
| 9.4 | ¿Qué ocurre si el destinatario está a capacidad? | PROPOSED: cola + reintento; nunca borrar |
| 9.5 | ¿Caduca un huevo en espera? | UNRESOLVED (depende de D8-A, retención) |
| 9.6 | ¿Puede el anfitrión rechazar el huevo del invitado? | UNRESOLVED |
| 9.7 | ¿La entrega exige confirmación explícita del destinatario? | PROPOSED: sí, dos fases |

### Alternativas

**A. Política fija 1+1 (estado actual).**
- Ventajas: ya decidida y probada; simétrica; imposible que un huevo quede sin
  dueño; sin negociación.
- Riesgos: no cubre deseos del jugador (p. ej. el invitado quiere ambos).
- Compatibilidad: total con PG-08F.
- Estado: **DECIDED solo en 9.1**; el resto de subdecisiones siguen abiertas.

**B. `prearranged`: destinos acordados antes del ciclo.**
- Ventajas: flexibilidad; permite «este ciclo es para el invitado».
- Riesgos: exige un acuerdo persistido y validado antes de producir; si el
  acuerdo cambia a mitad, hay que invalidar el ciclo; más superficie de abuso.
- Compatibilidad: requiere extender `PairOwnerContext`.
- Estado: PROPOSED a evaluar.

**C. `pending`: el huevo queda sin dueño hasta que alguien lo reclama.**
- Ventajas: útil para regalos o guarderías públicas.
- Riesgos: huevo huérfano; caducidad obligatoria; posible carrera entre
  reclamantes (necesita compare-and-set).
- Compatibilidad: usa `markPendingAssignment`/`claimEgg` ya existentes.
- Estado: PROPOSED solo para flujos futuros.

**D. El anfitrión recibe ambos huevos y decide después.**
- Ventajas: simple para el anfitrión.
- Riesgos: rompe la titularidad del invitado declarada en `AGENTS.md`.
- Estado: descartada (contradice una regla aprobada).

### Entrega atómica y prevención de pérdidas

1. `prepareDelivery` reserva la entrega y devuelve un `deliveryId`; no cambia la
   propiedad todavía.
2. `confirmDelivery` con la misma clave es idempotente: repetir no duplica.
3. Ante caída entre ambas fases, `retry` o `replay` reanudan; `stageOf` permite
   auditar en qué punto quedó.
4. Si el destinatario está a capacidad, el huevo permanece en el store o en la
   cola; **nunca** se elimina para «hacer sitio».
5. La atomicidad real solo existe dentro de una SQLite; entre recursos distintos
   se usa recuperación por replay/backlog, no transacción distribuida (PG-08F).

### Recomendación técnica (no aprobada)

Mantener A para v1 con entrega en dos fases y cola ante capacidad insuficiente.
No habilitar `prearranged` ni `pending` hasta que exista una decisión sobre
caducidad (9.5) y sobre reclamación concurrente (9.3).

## Compatibilidad con PG-08A…F

| Fase | Qué aporta | Qué cambia esta propuesta |
|---|---|---|
| PG-08A | Contratos de identidad, límites y retención (D4-A/D8-A/D9-A) | Nada; se citan como condicionantes |
| PG-08B | Persistencia transaccional SQLite | Nada |
| PG-08C | Autoridad simulada y secuencias | Nada; se usa `authoritySequence` |
| PG-08D | Ciclo, intervalos, `OfflinePolicy` | Nada; se documentan alternativas de valor |
| PG-08E | Huevo, estados, capacidad, cola, procedencia | Nada; se separan los tres contadores |
| PG-08F | Par 1+1, propiedad, entrega en dos fases, DEMO | Nada; se confirma 9.1 como decidida |

## Resumen de estados

| Decisión | Estado |
|---|---|
| D4-G2 capacidad (valores) | UNRESOLVED |
| D4-G2 modelo por propietario | PROPOSED |
| D8-G2 `single` por defecto | PROPOSED |
| D8-G2 `bounded` y sus topes | UNRESOLVED |
| D9-G2 destinatario 1+1 | **DECIDED** (PG-08F) |
| D9-G2 entrega en dos fases | PROPOSED |
| D9-G2 `prearranged` / `pending` / caducidad | UNRESOLVED |
| D4-A, D8-A, D9-A (PG-08A) | Siguen UNRESOLVED, fuera de alcance |
