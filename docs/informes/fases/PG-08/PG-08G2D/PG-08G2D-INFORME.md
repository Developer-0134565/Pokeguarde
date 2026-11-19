# PG-08G.2D — INFORME CONSOLIDADO — GENETIC DECISION GATE

**Fecha:** 19-nov-2026. **Estado:** cierre de diseño; **PG-08G.3 NO autorizado**.
Solo se han escrito documentos nuevos en `docs/informes/fases/PG-08/PG-08G2D/`
y una entrada nueva en el índice. No se ha implementado genética, no se han
modificado producción, BD, saves, fixtures, frontend ni sidecar; no hay commits
ni pushes.

## 1. Objetivo y alcance

Cerrar la fase de diseño genético mediante un proceso de decisiones
fundamentadas, trazables y compatibles con PG-08A…F. Se han extraído
literalmente R-B1…R-B4, se han analizado todas sus alternativas documentadas,
se han preparado fichas de Decision Gate y un plan de diez incrementos para un
futuro PG-08G.3. **Ninguna recomendación se ha convertido en decisión.**

## 2. SyncGate

- Rama `main`; HEAD local y `origin/main` = `7c9c326be0eb4dced4969c5b0f966413d3299dae`;
  divergencia `0 0`; índice vacío; sin conflictos.
- Entradas locales iniciales: **47**, conservadas. Tras crear `PG-08G2D/` el
  recuento final es **48**. Sin operaciones destructivas.
- `bun run check` EXIT 0: PG-07A 54, B correcto, C correcto, D correcto, E
  correcto, F 132, G 69/69, H 101/101; PG-08A 284, B 22, C 33, D 36, E 48,
  F 50 → **PG-08A–F 473/473**; sidecar 0 avisos / 0 errores.
- 17 hashes protegidos: **17/17** coincidentes.
- BD `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`;
  `PRAGMA integrity_check` → `ok`; 4 mascotas. WAL 0 bytes y SHM 32768 bytes
  preexistentes, intactos.
- Hash del consolidado de PG-08G.2 verificado:
  `77a6daa564b0681c5977509139f0234750f2a652af4f1446883af35a6aa491d1`.
- Resultado: **PASS WITH WARNINGS**. Advertencias: trabajo local sin commitear,
  WAL/SHM preexistentes, colisión D4/D8/D9 entre PG-08A y G2, y ausencia de
  auditoría independiente por límite de cuota de dos subagentes.

## 3. Fuentes y trazabilidad

Se leyeron íntegramente los quince `.md` de `PG-08G2/` y el spike
`experimentos/rng-v2-spike.ts`. Se contrastaron con PG-08A
(`11-DECISIONES-PENDIENTES.md`), PG-08E (idem), PG-08F
(`RIESGOS-Y-DECISIONES.md`) y con el código real de `shared-egg-store.ts`,
`shared-egg-pair-store.ts` y `breeding-engine.ts`.

Los identificadores D4/D8/D9 significan cosas distintas en PG-08A y en G2:
invitaciones/retención/límites frente a capacidad/acumulación/asignación. Se
usa sufijo `-A` o `-G2` y no se renumeran informes históricos.

## 4. Bloqueos extraídos literalmente

| ID | Descripción original | Estado | Dependencias |
|---|---|---|---|
| R-B1 | **C2** capacidad de almacenamiento de huevos (por propietario); hoy `4` de prueba | `UNRESOLVED`, reservado al usuario | D4-G2 §4.2; D1-A, D9-A |
| R-B2 | **C3** capacidad de la cola de espera; hoy `0` | `UNRESOLVED`, reservado al usuario | D4-G2 §4.3; D8-G2; D8-A |
| R-B3 | **C4** límite de incubación simultánea; contador inexistente | `UNRESOLVED`, sin precedente aprobado | D4-G2 §4.4; R-A16 |
| R-B4 | `maxEvents` y `maxWindowMs` de acumulación `bounded` | `UNRESOLVED`, reservado al usuario | D8-G2; reloj inyectado PG-08D |

La trazabilidad completa con D4-G2, D8-G2, D9-G2 y los contratos PG-08A–F está
en `MATRIZ-RB1-RB4.md`. Ya están resueltos por contrato, y no deben reabrirse:
custodia de 2 Pokémon, distribución 1+1, propiedad por rol, `claimed` libera
capacidad, atomicidad solo intra-SQLite y `realPkm:false` / `exportable:false`.

## 5. Análisis de alternativas

- **R-B1:** A por propietario + cola opcional (recomendada, no aprobada); B por
  guardería; C ilimitada; D cuota 24 h. C contradice D9-A; B puede crear un
  huésped dependiente del cupo del anfitrión; D exige reloj y ventana temporal.
- **R-B2:** `single` con C3=0 (recomendado para el piloto); `bounded` con C3>0
  y drenaje previo; cola ilimitada; reasignación al otro propietario. Las dos
  últimas contradicen D9-A o la propiedad por rol.
- **R-B3:** no crear el contador (recomendado); crear uno independiente;
  reutilizar C2 (descartado por R-A16). Cualquier límite sería ajeno al cartucho
  y debe presentarse como simulación.
- **R-B4:** `single` (recomendado para v1); `bounded` con topes; proporcional al
  tiempo y replay total (descartados en D8-G2). Sin topes: `UNRESOLVED_POLICY`
  y cero ciclos.

Ninguna de estas políticas es una regla de cartucho; la fidelidad generacional
se reserva a reglas por `GameKey`. Se mantienen `UNKNOWN`, `CONFLICTING` y
`PARTIALLY VERIFIED` donde la evidencia no cierra.

## 6. Decision Gate

| Bloqueo | Recomendación | Estado | Requiere decisión |
|---|---|---|---|
| R-B1 | Política A de D4-G2: capacidad por propietario, contadores C2/C3/C4 desacoplados, valor numérico pendiente | `PROPOSED` | **Sí** |
| R-B2 | `single` sin cola para el piloto; `bounded` diferido con C3 acotado y drenaje previo | `PROPOSED` | **Sí** |
| R-B3 | No crear C4 en el piloto; si se crea, contador independiente y valor humano | `PROPOSED` | **Sí** (puede diferirse) |
| R-B4 | `single` para v1; `bounded` solo con `maxEvents` y `maxWindowMs` decididos | `PROPOSED` | **Sí** |

Ninguno es `DECIDED`: los contratos técnicos fijan comportamientos y límites de
seguridad, pero no eligen entre alternativas de producto. Ninguno es `BLOCKED`:
hay evidencia suficiente para recomendar. Fichas individuales en
`DECISION-GATE.md`.

## 7. Plan propuesto para PG-08G.3

Diez incrementos: I1 contratos y tipos; I2 RNG determinista; I3 compatibilidad;
I4 herencia por juego; I5 huevos simulados; I6 capacidad y entrega atómica; I7
progreso offline; I8 incubación/eclosión; I9 validación interna y generacional;
I10 integración controlada y regresión. Cada uno incluye archivos previstos,
dependencias, pruebas, riesgos, criterios de aceptación y reversibilidad en
`PLAN-PG08G3.md`. Puerta previa G3-0.1…G3-0.5 documentada; sigue sin
autorización.

Ejecutables íntegramente con store en memoria: I1, I2, I3, I4, I5, I9.
Parciales: I6, I7 (`single`), I8 (sin C4), I10 (aislado, sin `check.sh`).
**Ninguno puede declararse producto listo sin R-B1…R-B4.**

## 8. Riesgos y contradicciones

- Dos subagentes agotaron la cuota: **no hay auditoría independiente**; el
  análisis lo realizó el agente principal sobre fuentes locales.
- Deriva detectada: MOVE-08 espera `MOVE_PRIORITY_UNVERIFIED` frente a
  `MOVE_ORDER_FIFO` del desensamblado; SHINY-06 espera
  `MASUDA_RATE_CONFLICTING` frente a 5/8192 documentada como secundaria;
  `MATRIZ-JUEGOS-Y-VERSIONES.md` y `CONTRATOS-TYPESCRIPT.md` quedaron
  desactualizados tras la revisión con desensamblado. Se registran como
  `DOC_DRIFT`; no se corrigen informes históricos.
- No existe tabla verificada de ciclos de eclosión por especie: fallo cerrado
  con `UNKNOWN_HATCH_CYCLES`.
- No se afirma equivalencia con el RNG de cartucho; PKHeX no genera huevos desde
  dos progenitores; `unverified` permite Guardería pero no exportación.
- Las cuatro capas L1–L4 y `realPkm:false` / `exportable:false` se conservan.

## 9. Verificación final

Repetido el SyncGate al cierre:

| Comprobación | Resultado |
|---|---|
| `bun run check` | EXIT 0; PG-08A–F 473/473; PG-07H 101/101 |
| Hashes protegidos | 17/17 coincidentes |
| Integridad SQLite | `ok`; 4 mascotas |
| Hash de `data/pokegotchi.db` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` |
| HEAD / `origin/main` | `7c9c326…`, divergencia `0 0` |
| `git status --short` | 48 entradas (47 preexistentes + `PG-08G2D/`) |
| Commits y pushes | ninguno |
| Producción, saves, fixtures, frontend, sidecar | sin modificaciones |
| Entregables nuevos | 8 `.md` en `PG-08G2D/` |

## 10. Preguntas para desbloquear PG-08G.3

1. **R-B1:** ¿se adopta la política por propietario (A) y qué valor definitivo
   tiene C2? Si se prefiere diferir, confirmar que `4` sigue siendo solo valor
   de prueba en memoria.
2. **R-B2:** ¿se mantiene `single` sin cola, o se autoriza `bounded` y con qué
   C3? La opción recomendada es `single` para el piloto, con cola acotada en una
   fase posterior.
3. **R-B3:** ¿existe el contador C4 de incubación simultánea? Si existe, ¿qué
   límite? Puede diferirse sin bloquear el piloto Gen II.
4. **R-B4:** ¿se adopta `single` para v1 (recomendado) o `bounded`? Si es
   `bounded`, ¿qué `maxEvents` y `maxWindowMs` se autorizan? Sin ellos, OFF-04
   debe devolver `UNRESOLVED_POLICY`.
5. Confirmar G3-0.1 (`gen2-gs`/`gen2-crystal`), G3-0.4 (diferir el bug
   `InheritIVs` de Gen III) y G3-0.5 (semilla maestra de producción fuera de
   alcance).

## 11. Restricción final

Esta misión únicamente prepara el cierre de decisiones. No autoriza PG-08G.3,
no implementa genética y no modifica el comportamiento del juego. **Detenido
aquí, esperando las decisiones del usuario.**
