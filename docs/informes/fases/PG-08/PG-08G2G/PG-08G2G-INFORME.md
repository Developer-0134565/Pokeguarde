# PG-08G.2G — INFORME CONSOLIDADO: GEN II BREEDING PILOT UNBLOCK

**Fecha:** 19-nov-2026. **Modo:** READ-ONLY sobre código, BD, saves, fixtures y contratos históricos. Únicos cambios permitidos: este directorio y una adición al índice documental.

> Nota de auditoría: no hubo auditoría independiente. Los subagentes disponibles agotaron cuota en fases previas; en esta misión no se usaron. El análisis es de fuente única y debe considerarse con esa limitación.

## 1. Estado SyncGate

PASS para documentación. Medido en vivo, no asumido: raíz `/home/missingn0/Proyectos/Pokeguarde`; rama `main`; HEAD = upstream = `origin/main` = `7c9c326be0eb4dced4969c5b0f966413d3299dae` (baseline confirmado); divergencia `0 0`; staged 0; conflictos 0; `git status --porcelain` 50 (10 M + 40 ??), preexistentes y preservados. BD `data/pokegotchi.db` SHA-256 `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`, íntegra. `sha256sum -c` de los 17 hashes protegidos → EXIT 0, 17/17. Sin commits, pushes, migraciones, instalaciones ni `clean`/`reset`/`pull`. Detalle en `SYNCGATE.md`.

`bun run check`: **NOT_RUN**. `scripts/check.sh` incluye `dotnet build`, que escribe artefactos; no pudo aislarse sin riesgo. El resultado histórico de G2F (EXIT 0, PG-08A–F 473/473, PG-07H 101/101, PRAGMA ok, 4 mascotas) **no se presenta como verificación actual**.

## 2. Decisiones aprobadas incorporadas

Las ocho decisiones aprobadas de la directiva §4 se consolidan con identificadores estables `G2G-BR-nn` (`CONTRATO-CRIANZA-V5.md §1`), sin reescribir contratos históricos. Se detectó y resolvió una **colisión de numeración**: en G2E `BR-07` significaba offline `ALL`; en G2F `BR-07` era incubación y `BR-06` recogida; la directiva reasigna esos números. V4 prevalece y se usa prefijo nuevo para evitar ambigüedad.

| ID | Decisión | Estado |
|---|---|---|
| `G2G-BR-01` | Inventario 20 huevos `claimed`; pendientes no consumen | APPROVED |
| `G2G-BR-02` | 2 pendientes por usuario; ampliable por tienda (fuera de alcance) | APPROVED |
| `G2G-BR-03` | Chequeo 60 min; 1+1 garantizado; sin probabilidad | APPROVED |
| `G2G-BR-04` | Hungry ≥70 % por progenitor, independiente, reconstrucción horaria | APPROVED |
| `G2G-BR-05` | Recogida manual idempotente con capacidad | APPROVED |
| `G2G-BR-06` | Incubación desde `claimedAt`; duración pendiente | APPROVED / duración BLOCKED |
| `G2G-BR-07` | Vigencia V4; no reescribir históricos; IDs estables | APPROVED |
| `G2G-BR-08` | Offline `ALL`; 24 h/24 chequeos; fallidos no consumen exitosos | APPROVED |

Clasificación aplicada al resto: `PROPOSED` (RFC, conducta ante capacidad llena, clave de recogida), `IMPLEMENTED` (stores de prueba, dominios puros, PC Boxes), `SUPERSEDED` (numeración BR antigua), `UNRESOLVED` (BR-09…11, MED, INC, TRD, caducidad, >7 días), `BLOCKED` (cooldown). Ninguna propuesta se elevó a aprobada.

## 3. Cooldown: bloqueo confirmado (caso B)

**No se encontró duración ni fórmula aprobada.** `UNKNOWN_HATCH_COOLDOWN` / `BLOCKED`. `BREEDING_DESIGN_RFC.md:28-38` da un rango 15 min–3 h dependiente de rareza y suma de IV con «fórmula pendiente»; `ROADMAP.md:51` etiqueta PG-09D `DECIDED` sin cita; G2E C-14 es `BLOCKED`; G2F lo confirma. Historial Git: `git log --all -S "15 minutos a 3 horas"` → único commit `819b73b`; búsquedas de `UNKNOWN_HATCH_COOLDOWN`, `incubationStartedAt`, `TRD-42` y `rareza del huevo` → vacío. Se separaron cinco tiempos distintos (chequeo 60 min, espera de guardería, puesta 1–12 h, incubación desconocida, eclosión nivel 5) más los cooldowns de acciones. No se reutilizó ninguno como incubación.

Decidido (sin duración): `IncubationTimer.startedAt = claimedAt`, nunca `producedAt`; reintento no reinicia; `cooldownMs=null`, `status="blocked"`, `blockedReason="UNKNOWN_HATCH_COOLDOWN"`, `readyAt=null`, sin eclosión automática ni C4. Opciones humanas **sin elegir**: A valor con cita, B fórmula rareza+DVs, C `TEST_ONLY` aislado. Afecta **solo a G3-E**. Detalle en `COOLDOWN-RECUPERACION.md`.

## 4. Rareza: reconciliada

No hay incompatibilidad real entre `G2G-BR-03` y TRD-42 si se separan cuatro conceptos: probabilidad de puesta (eliminada por BR-03), atributos del huevo (RFC los define en fase futura), especies/shiny (reglas Gen II documentadas, no implementadas) y legalidad genética (no compuerta). `G2F/CONFLICTOS-RESUELTOS-Y-ABIERTOS.md §1.4` ya resolvió que la tabla PROVISIONAL de rareza no es compuerta; V4 §2 coincide. TRD-42 no tiene texto local (`git log -S` vacío) y pertenece al clúster comercial (TRD-40 rev2, 43–46), excluido por directiva §3. Se excluye del bloqueo del piloto **sin derogarlo**, por falta de dependencia técnica directa y porque los huevos son `SIMULATED_LOG_ONLY`. No se introduce `CHECK_RARITY_NOT_DUE`; se conserva `PROVISIONAL_INTERVALS_MS` intacta. Detalle en `RAREZA-Y-PRODUCCION.md`.

## 5. Capacidades reconciliadas

| Contador | Capacidad | Autoridad |
|---|---|---|
| Pendientes por usuario | 2 | APPROVED `G2G-BR-02` |
| Inventario `claimed` | 20 | APPROVED `G2G-BR-01` |
| `DEFAULT_PAIR_CAPACITY` | 4 | dato de prueba, **sin autoridad** |
| `DEFAULT_BACKLOG_CAPACITY` | 0 | dato de prueba |
| PC Boxes | subsistema propio | independiente |

Propuestas para las seis interacciones exigidas (pendiente lleno de uno/ambos, recogida con inventario lleno, liberación, reconexión, atomicidad 1+1): fallo atómico del par sin consumir idempotencia y reevaluación en el siguiente chequeo; `INVENTORY_FULL` sin consumir clave; liberación solo por `claimed`/`cancelled`, nunca borrando; `CAPACITY_BELOW_USAGE`; `BEGIN IMMEDIATE` + `UNIQUE(cycle_id,recipient_role)` para el par. Invariante: un evento exitoso entrega exactamente un huevo por propietario; prohibida entrega parcial. No se inventaron caducidad, eliminación ni descarte (D8-A `UNRESOLVED`). Detalle en `CAPACIDADES-Y-ATOMICIDAD.md`.

## 6. Contrato Hungry/offline

No existen `HungryActual`/`HungryMax`: se usa `PetState.hunger` (0–100, inicial 82, `clamp`, tasas 1.7/3.6 por hora, bloques de 15 min, `MAX_CATCHUP_MS=7*DAY`). `HungrySnapshot = {actual: hunger, max: 100, ratio: hunger/100, at, source}` con `meetsThreshold = ratioMicro >= 700000`. Casos: 69,99 % falla; 70 % exacto **cumple**; 100 % cumple; un progenitor solo no produce; ambos → 1+1; caída offline se evalúa por hora; 24/48/72 h → 1/2/3 ventanas; >7 días → `HUNGRY_HISTORY_UNAVAILABLE` sin extender el límite. Sin instantánea → `UNKNOWN_HUNGRY` fallo cerrado. Algoritmo `ALL`: ventanas `(from,to]` ≤24 h, ≤24 chequeos, persistir antes del cursor, fallidos no consumen exitosos, `checkId` repetido devuelve persistido. `breeding-engine.ts` solo expone `single|bounded`; `ALL` requiere G3-F. Detalle en `HUNGRY-OFFLINE.md`.

## 7. Dependencias excluidas

Marketplace, subastas, Cable Link/GTS, Centro Pokémon, economía/Guardipuntos/deudas, antifraude comercial, recompensas, misiones, prestigio y Gen III–V intervienen en **ninguna** de las ocho compuertas del chequeo ni en la persistencia. La única dependencia cruzada (`PG-09D/E → PG-10A`, aceleración con GP) desaparece al diferir la incubación: es dependencia de aceleración, no de existencia. Aislamiento demostrado por stores con rechazo explícito de `data/pokegotchi.db`, dominios puros y reloj/RNG inyectados. Detalle en `DEPENDENCIAS-EXCLUIDAS.md`.

## 8. Bloqueos específicos del piloto

1. **P0 — G3-E:** cooldown `UNKNOWN_HATCH_COOLDOWN` (D-01). Único bloqueo de la preparación completa y afecta solo a incubación.
2. **P1:** ratificación de prefijo `G2G-BR-nn` (D-02), conducta ante capacidad llena (D-03), caducidad de pendientes (D-04), Hungry >7 días (D-05), proyección desde `PairMember` (D-06), clave de recogida (D-07).
3. **Fuera de alcance:** TRD-40 rev2, TRD-42…46, TRD-47 retirada, BR-09…11, MED, INC y mejoras de tienda. No bloquean.
4. Código real sin endpoints ni tablas de crianza: el piloto es trabajo futuro (`setCapacity`, `produceTx`, `EggDeliveryPort` son base, no implementación).

Modelo de estados contrastado: `eligible`→`produced`→`pending`→`claimed` ya existen en el dominio; `incubating`/`hatchable`/`hatched` no se activan sin duración. `realPkm:false`, `exportable:false`, `hatched:false` se conservan. Detalle en `ESTADOS-E-IDEMPOTENCIA.md`.

## 9. Plan de implementación por etapas

`PLAN-PG08G3-POR-ETAPAS.md` propone G3-A (contratos TS), G3-B (chequeos y Hungry), G3-C (producción y pendientes), G3-D (inventario y recogida), **G3-E (incubación — BLOQUEADA)**, G3-F (offline ALL), G3-G (persistencia y API), G3-H (UI), G3-I (integración y regresión). Cada etapa registra dependencias, archivos previstos, riesgos, pruebas, criterios de aceptación y decisiones pendientes. Las etapas independientes de incubación (A…D, F…I) pueden planificarse ahora. **Ninguna etapa queda autorizada**; la ejecución exige autorización expresa. Matriz de 20 pruebas diseñadas en `MATRIZ-PRUEBAS-PILOTO.md`, ninguna ejecutada, todas contra BD aislada.

## 10. Estado final del repositorio

Sin cambios en código de producción, BD, saves, fixtures ni contratos históricos. Sin commits, pushes, migraciones ni instalaciones. Creados 13 documentos nuevos en `docs/informes/fases/PG-08/PG-08G2G/` y una adición al índice `docs/informes/README.md`. Copia consolidada en `/home/missingn0/Descargas/PG-08G2G-INFORME.md`. Hashes y cierre SYNCGATE repetido al final de la ejecución. `bun run check` NOT_RUN por riesgo de artefactos; histórico G2F no presentado como actual.

## Veredicto

**PILOT READY WITH DEFERRED INCUBATION**

Las etapas independientes de incubación pueden planificarse. G3-E permanece bloqueada por `UNKNOWN_HATCH_COOLDOWN`. El veredicto **no autoriza implementar ni simular una duración desconocida**, y ninguna etapa del plan queda autorizada sin autorización expresa del propietario.
