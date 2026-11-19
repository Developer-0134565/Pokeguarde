# PG-08G.2D — Riesgos y dependencias

## 1. Auditoría

Se lanzaron tres subagentes en paralelo según la petición del usuario:

| Subagente | Objeto | Resultado |
|---|---|---|
| Auditoría R-B1…R-B4 y contratos PG-08A–F | extracción y compatibilidad | **Fallido**: `ChatGPT usage limit reached` |
| Contraste de evidencia genética | contradicciones y estados de evidencia | **Fallido**: `ChatGPT usage limit reached` |
| Plan de incrementos G3 | diez incrementos y riesgos | Completado; sus hallazgos se contrastaron contra los documentos locales antes de incorporarlos |

**Declaración:** las dos primeras auditorías no produjeron informe. El análisis
de esta misión lo realizó el agente principal leyendo directamente las fuentes.
No se afirma auditoría independiente; se conserva el riesgo R-E7 de PG-08G.2
(las revisiones comparten fuentes). El plan del tercer subagente se trata como
aportación útil, no como verificación cruzada.

## 2. Contradicciones documentales detectadas

| ID | Hallazgo | Evidencia | Tratamiento |
|---|---|---|---|
| D-1 | MOVE-08 espera `MOVE_PRIORITY_UNVERIFIED`, pero el desensamblado Gen II exige `MOVE_ORDER_FIFO` | `MATRIZ-DE-PRUEBAS.md:151` vs `CONFLICTOS-Y-EVIDENCIAS.md:11.1` y `:11.10` | Registrar `DOC_DRIFT`; no codificar lista de prioridad de Gen VI; corregir solo con autorización |
| D-2 | SHINY-06 espera `MASUDA_RATE_CONFLICTING`, pero el consolidado cierra 5/8192 por fuente secundaria | `MATRIZ-DE-PRUEBAS.md:134` vs `CONFLICTOS-Y-EVIDENCIAS.md` §1 y `PG-08G2-INFORME.md` §6 | Registrar `DOC_DRIFT`; conservar el estado `VERIFIED (secondary)` y no afirmar fuente primaria |
| D-3 | `MATRIZ-JUEGOS-Y-VERSIONES.md` §6 marca Masuda Gen IV como CONFLICTING y prioridad Gen II como PARTIALLY VERIFIED | `MATRIZ-JUEGOS-Y-VERSIONES.md:99-100` vs `CONFLICTOS-Y-EVIDENCIAS.md` §11 | La matriz quedó desactualizada tras la revisión con desensamblado; no reescribir informes históricos |
| D-4 | `CONTRATOS-TYPESCRIPT.md` conserva tipos antiguos para shiny/inciensos/movimientos | `CONTRATOS-TYPESCRIPT.md` vs `CONFLICTOS-Y-EVIDENCIAS.md` §10–§11 | Tratar en I1 como deriva, sin cambio de código en esta fase |
| D-5 | Etiquetas D4/D8/D9 con significados distintos en PG-08A y G2 | `PG-08A/11-DECISIONES-PENDIENTES.md` §D4/D8/D9 vs `PG-08G2/DECISIONES-D4-D8-D9.md` §0 | Uso obligatorio de sufijo `-A`/`-G2`; no renumerar |
| D-6 | `DEFAULT_*` podrían leerse como decisiones | `shared-egg-store.ts:49-50`, `shared-egg-pair-store.ts:56` | Declarar explícitamente valores de prueba; no promoverlos a producto |

## 3. Dependencias

### 3.1 Dependencias humanas (bloquean producto)

```
R-B1 (C2) ──> R-B2 (C3) ──> R-B4 (maxEvents/maxWindowMs)
     └──> R-B3 (C4) [independiente, diferible]
```

- R-B1 depende de D1-A (identidad) y D9-A (cuotas/abuso), ambos pendientes en
  PG-08A.
- R-B2 depende de D8-G2 (`bounded`) y D8-A para la caducidad (R-B5).
- R-B3 depende solo de una decisión de producto; no hay evidencia que la exija.
- R-B4 depende de D8-G2 y del reloj inyectado de PG-08D.

### 3.2 Dependencias técnicas

| Dependencia | Consumida por | Riesgo si se incumple |
|---|---|---|
| `GameKey` obligatorio | I1–I5, I9 | Reglas de una generación aplicadas a otra (R-A2) |
| `RandomnessPort` / `BreedingClock` | I2, I4, I7, I8 | `Math.random`/`Date.now`, no reproducibilidad (R-A3) |
| `assertBreedablePair` / procedencia | I3, I5 | DEMO o desconocido cría (R-A13) |
| Clave `cycleId`+`productionEventId`+`recipientRole` | I6, I7 | Duplicados por reintento (R-A15) |
| Drenaje antes de puesta al día | I7 | Eventos nuevos adelantados a la cola (R-A8) |
| `rulesetVersion`/`algorithmId` | I2, I4, I5, I9 | Genética recalculada con reglas distintas (R-A10) |
| `PkmCandidate` con bytes reales | I9 | `ResolvedGenetics` enviado a PKHeX (R-A11) |
| Cuatro capas L1–L4 | I9 | Mezclar legalidad interna con exportabilidad (R-A12) |
| C4 independiente de C2 | I8 | Capacidad incorrecta en ambos sentidos (R-A16) |

## 4. Riesgos operativos de esta misión

| Riesgo | Estado |
|---|---|
| Modificar producción, saves, BD, frontend o sidecar | **No ocurrió**; se revalidará al cierre |
| Commits o pushes | **No ocurrieron**; se revalidará al cierre |
| Sobrescribir informes históricos | **No ocurrió**; solo se añade `PG-08G2D/` y una entrada en el índice |
| Perder las 47 entradas locales | **No ocurrió**; sin operaciones destructivas |
| Integrar spike o suites en `check.sh` | **No ocurrió** |
| Promover `4`, `0` o `1` a decisión | **No ocurrió**; se marcan como valores de prueba |
| Declarar `DECIDED` una recomendación | **No ocurrió**; véase `DECISION-GATE.md` |

## 5. Límites de la evidencia

- R-E1: tasas Masuda sin fuente primaria; se conservan como secundaria.
- R-E2: Everstone+Masuda en HGSS `CONFLICTING`.
- R-E4: amistad inicial del huevo `UNKNOWN`.
- R-E5: tasas de aparición Gen V `PARTIALLY VERIFIED`; no se usan como
  temporizador.
- No existe tabla verificada de ciclos de eclosión por especie: I8 debe fallar
  cerrado con `UNKNOWN_HATCH_CYCLES`.
- No se afirma equivalencia con el RNG de cartucho; el spike 12/12 solo avala
  derivación determinista.
- PKHeX 26.10.18 analiza; **no genera huevos a partir de dos progenitores**.

## 6. Impacto en legalidad y exportabilidad

Ninguna recomendación de R-B1…R-B4 altera las cuatro capas. Todo resultado
genético simulado conserva `realPkm:false` y `exportable:false`. `unverified`
sigue permitiendo Guardería pero no exportación. La escritura de `.srm` sigue
siendo, cuando se autorice, una copia nueva del save de origen con informe de
hashes y diff, nunca una transacción atómica.
