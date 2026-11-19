# PG-08G.2G — DECISIONES HUMANAS PENDIENTES

**Regla:** aquí se elevan únicamente decisiones que requieren criterio propietario. Los detalles resolubles técnicamente se resolvieron en los contratos; no se han convertido propuestas en aprobaciones.

## 1. Bloqueantes del piloto (P0)

| # | Decisión | Evidencia | Opciones / propuesta | Afecta |
|---|---|---|---|---|
| D-01 | **Duración o fórmula de incubación** | `UNKNOWN_HATCH_COOLDOWN` (`G2F/INCUBACION-COOLDOWN-AUDIT.md:3,55-74`; G2E C-14 `BLOCKED`); RFC rango 15 min–3 h con «fórmula pendiente»; `git log -S` confirma valor nunca aprobado | A: aportar valor con cita; B: completar fórmula rareza+suma DVs; C: `TEST_ONLY` aislado. **Sin elegir.** | **G3-E** (únicamente) |

## 2. No bloqueantes del piloto, necesarias para cierre (P1)

| # | Decisión | Evidencia | Propuesta (NO aprobada) | Afecta |
|---|---|---|---|---|
| D-02 | Confirmar prefijo estable `G2G-BR-nn` y vigencia V4 | colisión BR-05/06/07 entre G2E, G2F y la directiva §4 | Adoptar `G2G-BR-nn`; no reescribir históricos | G3-A (documental, resuelto en V5) |
| D-03 | Ratificar «pendiente lleno → fallo atómico del par, sin consumir idempotencia, reevaluar siguiente chequeo» | V4 §9 `(a)` abierta; `shared-egg-store.ts:506` ya no consume idempotencia con capacidad agotada | Consecuencia técnica de BR-02/03/08 + PG-08B/F; no nueva regla | G3-C |
| D-04 | Caducidad / retención de huevos pendientes | D8-A `UNRESOLVED` (`DECISIONES-D4-D8-D9.md:179`); prohibido inventar descarte | Elevar sin proponer valor; no eliminar huevos | G3-C (solo si se quiere caducidad) |
| D-05 | Conducta con Hungry >7 días | `MAX_CATCHUP_MS=7*DAY`; V4 §7; conflictos A-3 | `HUNGRY_HISTORY_UNAVAILABLE`; no extender sin análisis del motor | G3-B, G3-F |
| D-06 | Proyección Hungry desde `PairMember`/perfil de mascota | `PairMember` (:113-123) no expone hambre; campos `HungryActual`/`HungryMax` inexistentes | `HungrySnapshot` derivado; persistir marca por progenitor por hora | G3-B |
| D-07 | Clave canónica de recogida | G2E §5.5 la marca `PROPOSED`, no `APPROVED` | `claim:${cycleId}:${productionEventId}:${recipientRole}:${recipientId}` | G3-D |

## 3. Fuera del alcance del piloto (P2/P3, NO bloqueantes)

| # | Decisión | Estado | Por qué no bloquea |
|---|---|---|---|
| D-08 | TRD-40 rev2 retención 24 h | Declarada, sin texto local | Pertenece a recompensas comerciales; excluida por directiva §3 |
| D-09 | TRD-42 rareza del huevo entregado | Declarada, sin texto local | Excluida del bloqueo; ver `RAREZA-Y-PRODUCCION.md`; no derogada |
| D-10 | TRD-43 recompensas fraudulentas liberadas | Declarada, sin texto local | Sin recompensas en el piloto |
| D-11 | TRD-44 intervención administrativa por deuda comercial | Declarada, sin texto local | Sin deudas en el piloto |
| D-12 | TRD-45 comprar/intercambiar con deuda | Declarada, sin texto local | Sin economía en el piloto |
| D-13 | TRD-46 proteger artículos comprados | Declarada, sin texto local | Sin artículos comprados en el piloto |
| D-14 | TRD-47 / pregunta 76 | **NO aprobada**, retirada | No se incorpora |
| D-15 | BR-09…BR-11, MED-01…MED-08, INC-01…INC-16 | Sin contrato local recuperable | Sin dependencia técnica directa demostrable; ver `DEPENDENCIAS-EXCLUIDAS.md` |
| D-16 | Mejoras de tienda: precios, niveles, máximo de pendientes | Fuera de alcance por `G2G-BR-02` | No necesario para el piloto |

## 4. Decisiones que NO se han reabierto

- No se han modificado `G2F-BR-01…08`, V3, V4, C-14, D4-D9-A, HUNGRY-Y-CHEQUEOS.md, INVENTARIO-Y-PENDIENTES.md, OFFLINE-ALL.md ni ningún contrato histórico.
- No se han convertido `PROPOSED`/`UNRESOLVED`/`BLOCKED` en `APPROVED`.
- No se ha fijado cooldown, rareza, caducidad ni precio.
- No se ha autorizado ninguna etapa de `PLAN-PG08G3-POR-ETAPAS.md`.

## 5. Regla de cierre

Solo D-01 bloquea la preparación completa del piloto y solo para G3-E. D-02…D-07 deben ratificarse antes de ejecutar sus etapas correspondientes, pero no impiden planificarlas. D-08…D-16 quedan explícitamente fuera del bloqueo del piloto.
