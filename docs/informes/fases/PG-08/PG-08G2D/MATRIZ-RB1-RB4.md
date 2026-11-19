# PG-08G.2D — Matriz de trazabilidad R-B1…R-B4

Fuente literal: `PG-08G2/RIESGOS-Y-BLOQUEOS.md` §2, líneas 23–26. No se ha
reinterpretado el significado de los identificadores. Las decisiones con
etiqueta D4/D8/D9 de PG-08A llevan sufijo `-A`; las de G2 llevan `-G2`.

## 1. Extracción literal

| ID | Descripción original (literal) | Qué impide | Por qué no se resuelve en G2 |
|---|---|---|---|
| R-B1 | **C2** capacidad de almacenamiento de huevos (por propietario) | Fijar el valor definitivo; hoy `4` es de prueba | Reservado al usuario; D4-G2 |
| R-B2 | **C3** capacidad de la cola de espera | Fijar `backlogCapacity`; hoy `0` | Reservado al usuario; D4-G2 |
| R-B3 | **C4** límite de incubación simultánea | Definir siquiera la existencia del contador | Concepto nuevo, sin precedente aprobado |
| R-B4 | `maxEvents` y `maxWindowMs` de acumulación `bounded` | Activar compensación offline con límites | Reservado al usuario; D8-G2 |

## 2. Estado actual, dependencias y alternativas documentadas

### R-B1 — C2

- **Estado actual:** `UNRESOLVED`. `DEFAULT_EGG_CAPACITY=4` y
  `DEFAULT_PAIR_CAPACITY=4` son valores de prueba
  (`apps/server/src/shared-egg-store.ts:49`,
  `apps/server/src/shared-egg-pair-store.ts:56`), no decisiones.
- **Dependencias:** D4-G2 §4.2; D9-A (límites y abuso, pendiente en PG-08A
  §D9); D1-A (identidad, necesaria para «por propietario»); coherencia con la
  custodia de 2 Pokémon por guardería, que **no** es capacidad de huevos.
- **Alternativas documentadas:** A = por propietario + cola opcional
  (recomendada, no aprobada); B = por guardería; C = ilimitada; D = cuota 24 h.
- **Recomendación documentada:** alternativa A, con valores numéricos pendientes;
  tres contadores desacoplados (C2/C3/C4).
- **Consecuencia de no resolverlo:** no puede fijarse el valor definitivo; el
  piloto solo puede operar con un store en memoria y no declararse listo para
  uso (`PROPUESTA-PG08G3.md`, puerta G3-0.2).

### R-B2 — C3

- **Estado actual:** `UNRESOLVED`. `DEFAULT_BACKLOG_CAPACITY=0`
  (`shared-egg-store.ts:50`).
- **Dependencias:** D4-G2 §4.3; D8-G2 (drenaje `bounded`); D8-A (retención,
  condiciona la caducidad, R-B5); D9-G2 §9.4 (cola + reintento, PROPOSED).
- **Alternativas documentadas:** la misma familia A/B/C/D de D4-G2; dentro de A,
  `single` prohíbe cola (`SINGLE_BACKLOG_FORBIDDEN`,
  `shared-egg-store.ts:391`) y `bounded` encola el evento completo sin consumir
  idempotencia (`:506`, `:509-513`, drenaje `:613-654`).
- **Recomendación documentada:** cola opcional solo bajo `bounded`; `single`
  para v1 es PROPOSED, no decidido.
- **Consecuencia:** sin C3, un ciclo con C2 llena se rechaza con
  `CAPACITY_EXHAUSTED`; el huevo no se pierde pero no hay acumulación.

### R-B3 — C4

- **Estado actual:** `UNRESOLVED` y **sin contador implementado**.
- **Dependencias:** D4-G2 §4.4; riesgo R-A16 (`RIESGOS-Y-BLOQUEOS.md:55`), que
  exige un contador independiente de C2; incubación/eclosión de la arquitectura
  v2 (`UNKNOWN_HATCH_CYCLES`).
- **Alternativas documentadas:** (a) no crear el contador; (b) contador
  independiente con límite; (c) reutilizar C2, **descartada** por ser incorrecta
  en ambos sentidos.
- **Recomendación documentada:** ninguna decisión de producto; solo la
  restricción técnica de no mezclar C4 con C2.
- **Consecuencia:** imposible especificar cuántos huevos pueden incubarse a la
  vez; cualquier valor sería inventado.

### R-B4 — `maxEvents` / `maxWindowMs`

- **Estado actual:** `UNRESOLVED`. `OfflinePolicy` existe
  (`breeding-engine.ts:55`) con `single` por defecto
  (`initialState(..., "single", 1)`, `:184`); `bounded` no tiene límites
  aprobados.
- **Dependencias:** D8-G2 (alternativas A `single`, B `bounded`, C proporcional
  al tiempo, D replay total); R-A9 (`CLOCK_ROLLBACK`), R-A10 (`rulesetVersion`);
  precedente de 7 días de la guardería citado pero **no adoptado**.
- **Alternativas documentadas:** A `single` PROPOSED para v1; B `bounded` en
  fase posterior con topes sin decidir; C y D descartadas.
- **Recomendación documentada:** A para v1; B condicionada a R-B4.
- **Consecuencia:** sin `maxEvents`/`maxWindowMs`, el caso OFF-04 debe devolver
  `UNRESOLVED_POLICY` y no generar ciclos; no puede activarse la compensación
  offline.

## 3. Trazabilidad con D4-G2, D8-G2 y D9-G2

| Bloqueo | D4-G2 | D8-G2 | D9-G2 | Contratos PG-08A–F que condicionan |
|---|---|---|---|---|
| R-B1 | §4.2 C2 `UNRESOLVED`; §4.5 por propietario `PROPOSED` | indirecto: la cola solo existe si se elige `bounded` | §9.5 caducidad y §9.6 rechazo, ambos `UNRESOLVED` | D1-A (propiedad), D9-A (cuotas); PG-08F `DEFAULT_PAIR_CAPACITY=4` de prueba |
| R-B2 | §4.3 C3 `UNRESOLVED` | directo: `bounded` requiere C3 > 0 y drenaje | §9.4 cola + reintento `PROPOSED` | D8-A (retención, vía R-B5); atomicidad intra-SQLite de PG-08F |
| R-B3 | §4.4 C4 `UNRESOLVED`, contador inexistente | solo si se decide simular incubación con el tiempo | no aplica | R-A16; contrato de eclosión de G2 (`hatchLevel`, sin PKM) |
| R-B4 | solo interactúa si `bounded` llena C2 | directo: §D8 alternativas A/B y topes | indirecto: entrega tras la puesta al día | PG-08D reloj inyectado; PG-08E/F idempotencia y replay |

## 4. Lo que ya está resuelto por contrato y no debe reabrirse

| Elemento | Estado | Evidencia |
|---|---|---|
| Custodia máxima de 2 Pokémon por guardería | **DECIDED** | `AGENTS.md`, «Guarderías compartidas»; D4-G2 §4.1 |
| Distribución 1+1 por ciclo | **DECIDED** | PG-08F `RIESGOS-Y-DECISIONES.md:5`; D9-G2 §9.1 |
| `claimed` libera capacidad | **DECIDED por comportamiento** | D4-G2 §4.6; `CAPACIDAD-Y-ATOMICIDAD.md` |
| Propiedad por rol (`host→host`, `guest→guest_owner`) | **DECIDED en PG-08F** | `DISTRIBUCION-1-1.md`, `RIESGOS-Y-DECISIONES.md:6` |
| Entrega atómica solo dentro de una SQLite | **DECIDED como alcance** | PG-08F `ATOMICIDAD-Y-CONCURRENCIA.md`; `RIESGOS-Y-DECISIONES.md:38-39` |
| Sin PKM, sin eclosión real y sin exportación | **DECIDED como alcance vigente** | PG-08F `RIESGOS-Y-DECISIONES.md:9`; G2 `PROPUESTA-PG08G3.md` |

Ninguno de estos puntos autoriza por sí solo a fijar C2, C3, C4, `maxEvents` o
`maxWindowMs`.
