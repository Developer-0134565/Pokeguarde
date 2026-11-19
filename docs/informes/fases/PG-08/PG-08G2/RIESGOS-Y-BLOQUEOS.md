# PG-08G.2 — Riesgos y bloqueos

**Estado:** inventario de riesgos para la futura implementación. Nada de lo aquí
descrito está implementado. Un «bloqueo» impide una decisión o una fase; un
«riesgo» solo condiciona el diseño.

## 1. Riesgos de evidencia

| ID | Riesgo | Impacto | Mitigación propuesta | Estado |
|---|---|---|---|---|
| R-E1 | **Sin fuente primaria** para el número de *rerolls* de Masuda (todo viene de fuentes secundarias). | Las probabilidades son consistentes pero no verificadas por desensamblado. | Mantener la cita secundaria y marcar `sourceKind:'secondary'`; no afirmar equivalencia con cartucho. | ABIERTO (UNKNOWN) |
| R-E2 | **Everstone + Masuda en HGSS**: contradicción interna entre dos páginas de Bulbapedia. | Sobreestimar la herencia de naturaleza en un juego concreto. | Lectura conservadora: en todo Gen IV con Masuda, sin bonus (`NatureRules.masudaBlocksEverstone: true`). | CONFLICTING |
| R-E3 | Prioridad exacta de movimientos en Gen II: resuelta por desensamblado (inserción + FIFO truncado), **en conflicto con la prosa de Bulbapedia**, que describe la lista de Gen VI+. | Seguir la prosa moderna e implementar una lista de prioridad inexistente en Gen II. | Codificar `strategy:'insertion_fifo_truncate'` y `levelCap:null` según `CONFLICTOS-Y-EVIDENCIAS.md` §11.1/§11.10; prueba MOVE-08 pasa a `MOVE_ORDER_FIFO`. | VERIFICADO POR CÓDIGO |
| R-E4 | Herencia de amistad en huevos sin documentar. | Inventar un valor de amistad inicial. | Mantener el campo fuera del contrato; `UNKNOWN` hasta nueva evidencia. | UNKNOWN |
| R-E5 | Tasas de aparición de huevo en Gen V incompletas en la fuente. | Usarlas como temporizador de PG-08D. | No usar: `PROVISIONAL_INTERVALS_MS` sigue siendo simulación explícita. | PARTIALLY VERIFIED |
| R-E6 | Platinum agrupado con DP sin fuente de diferencia propia. | Aplicar una regla distinta a la real si Platinum difiriera. | Agrupar con nota; si aparece evidencia, crear `GameKey` separado. | ACEPTABLE CON NOTA |
| R-E7 | Las revisiones por subagente comparten las mismas fuentes web; **no son auditorías independientes**. | Falso sentido de verificación cruzada. | Declarar el origen; para blindar, requerir fuente primaria o revisión humana. | DECLARADO |

## 2. Riesgos de decisiones humanas pendientes (bloqueos)

| ID | Bloqueo | Qué impide | Por qué no se resuelve aquí |
|---|---|---|---|
| R-B1 | **C2** capacidad de almacenamiento de huevos (por propietario) | Fijar el valor definitivo; hoy `4` es de prueba | Reservado al usuario; D4-G2 |
| R-B2 | **C3** capacidad de la cola de espera | Fijar `backlogCapacity`; hoy `0` | Reservado al usuario; D4-G2 |
| R-B3 | **C4** límite de incubación simultánea | Definir siquiera la existencia del contador | Concepto nuevo, sin precedente aprobado |
| R-B4 | `maxEvents` y `maxWindowMs` de acumulación `bounded` | Activar compensación offline con límites | Reservado al usuario; D8-G2 |
| R-B5 | Caducidad de huevos en espera | Política de expiración en cola | Depende de D8-A (retención de datos), pendiente |
| R-B6 | Pérdida de identidad (D1-A) con huevos almacenados | Recuperación de cuentas/dispositivos | D1-A sigue pendiente en PG-08A |
| R-B7 | `prearranged` / `pending` en asignación | Destinos alternativos a 1+1 | D9-G2; la distribución 1+1 ya está decidida y no se reabre |
| R-B8 | Migración `IsCosmetic` → `LegalityCheckResultCode` | Quitar la dependencia de subcadenas inglesas | No autorizada; modificaría `services/pkhex/Program.cs` de producción |
| R-B9 | ¿`unverified` podrá exportar algún día? | Definir la frontera L3→L4 | Decisión de política; hoy no habilita exportación |
| R-B10 | Custodia de la semilla maestra en producción | Animar el RNG fuera de pruebas | Requiere autoridad, secreto y entropía; fuera de alcance |
| R-B11 | Política de met data de un futuro PKM nacido de huevo | Materializar el resultado en PKM | Requiere decidir OT/TID/SID/origen sin fabricar evidencia |
| R-B12 | Equivalencia de `EffortExpLegality.GetRequiredEffortEXP` frente a `VitaminClamp` | Consolidar la regla de vitaminas | No verificada; spike separado |

## 3. Riesgos de arquitectura e implementación futura

| ID | Riesgo | Mitigación | Estado |
|---|---|---|---|
| R-A1 | Duplicación entre `CompatibilityResolver` (nuevo) y `BreedingCompatibilityProvider` (existente). | El primero decide **si pueden criar**; el segundo decide **cuándo** (rareza/intervalo). No sustituirlo. | DISEÑADO |
| R-A2 | Confundir `generation: number` con reglas por juego. | `GameKey` obligatorio de 12 valores; `rulesFor(key).verified` o `UNKNOWN_RULES`. | DISEÑADO |
| R-A3 | Usar `Math.random()` o `Date.now()` en el motor. | `RandomnessPort` y `BreedingClock` inyectados; prueba de escaneo estático (T-DET). | DISEÑADO |
| R-A4 | Repetir la semilla para ambos huevos del par. | `eggId` + `recipientRole` + `purpose` en `DerivationContext`; spike 12/12. | VERIFICADO EN SPIKE |
| R-A5 | Persistir la semilla maestra y exponerla. | Solo `seedRef` (hash opaco) y cursor; `masterSeed` nunca en SQLite. | DISEÑADO |
| R-A6 | Reanudar RNG con un `seedRef` ajeno. | `Stream.resume` lanza `SEED_MISMATCH`; ver T-DET. | VERIFICADO EN SPIKE |
| R-A7 | Atomicidad asumida entre SQLite y sistema de archivos. | Atomicidad real solo intra-SQLite; entre recursos, replay/backlog; escribir `.srm` se declara no atómico. | DISEÑADO |
| R-A8 | Iniciar la puesta al día con la cola sin drenar. | `integrityCheck` → drenar → puesta al día → métricas; si falla integridad, no se actualiza. | DISEÑADO |
| R-A9 | Reloj retrocede o dos instancias escriben a la vez. | `CLOCK_ROLLBACK` sin generar; una sola BD serializa; multi-nodo fuera de alcance. | DISEÑADO |
| R-A10 | Cambio de reglas entre ciclos y repetición de genética. | `rulesetVersion` y `algorithmId` se conservan con cada huevo; el recálculo usa la versión original. | DISEÑADO |
| R-A11 | Pasar `ResolvedGenetics` a `LegalityAnalysis`. | `PkmCandidate` exige bytes PKM reales; `INVALID_CANDIDATE_NOT_PKM`. | DISEÑADO |
| R-A12 | Confundir las cuatro capas de legalidad. | L1 interna / L2 generacional / L3 PKHeX / L4 exportabilidad, documentadas y separadas. | DISEÑADO |
| R-A13 | DEMO o procedencia desconocida cría por un flujo HTTP futuro. | `isBreedableProvenance` + `assertBreedablePair` + `assertDemoAllowed` como primera comprobación. | DISEÑADO |
| R-A14 | Capacidad reducida por debajo de la ocupación real. | `CAPACITY_BELOW_USAGE` sin destruir ni reasignar. | YA IMPLEMENTADO EN PG-08E/F |
| R-A15 | Reintento que duplica un huevo. | Clave `cycleId`+`productionEventId`+`recipientRole`; reintento devuelve `created:false`. | YA IMPLEMENTADO EN PG-08E/F |
| R-A16 | Incubación modelada con la misma capacidad que almacenamiento. | Contador C4 independiente; incorrecto en ambos sentidos; hoy no existe. | DISEÑADO |

## 4. Riesgos operativos de esta misión

| Riesgo | Estado real |
|---|---|
| Modificar accidentalmente producción, saves, BD, frontend o sidecar | **No ocurrió**: `bun run check` y hashes intactos al inicio; verificación final pendiente. |
| Commits o pushes | **No ocurrieron**; se verificará de nuevo al cerrar. |
| Sobrescribir informes históricos | **No ocurrió**: G1 y PG-08E no se tocaron; la corrección de conflictos se documenta en G2. |
| Perder las 46 entradas locales | **No ocurrió**: se conservan; no se ejecutaron `clean`, `stash`, `reset` ni `checkout` destructivo. |
| Mezclar etiquetas D4/D8/D9 de PG-08A con las de G2 | Mitigado con el sufijo `-G2` en `DECISIONES-D4-D8-D9.md`. |
| Integrar el spike en `scripts/check.sh` | **No se integró**; permanece en `experimentos/`. |

## 5. Lo que NO bloquea

- Diseñar e incluso implementar más adelante un **piloto de Gen II** siguiendo
  `gen2-gs`/`gen2-crystal`: no depende de ninguno de los bloqueos R-B1…R-B12.
- Usar el RNG determinista propuesto para pruebas: el spike 12/12 ya lo avala
  como mecanismo de derivación, no como réplica de cartucho.
- Seguir usando `unverified` en la Guardería: es política existente y no
  habilita exportación.

## 6. Conclusión

No hay bloqueo crítico para la **especificación**. Sí hay doce decisiones
reservadas al usuario y tres evidencias incompletas que impiden declarar una
implementación Gen I–V completa o una exportación legal de un huevo simulado.
PG-08G.3 debe empezar por los bloqueos R-B1…R-B4 y por la definición de alcance
del piloto, no por código de producción.
