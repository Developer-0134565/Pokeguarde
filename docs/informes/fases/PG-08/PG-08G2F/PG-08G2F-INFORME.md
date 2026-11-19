# PG-08G.2F — INFORME CONSOLIDADO — FINAL BREEDING CONTRACT & EVIDENCE RECOVERY

**Fecha:** 19-nov-2026. **Estado:** investigación, auditoría y documentación
finalizadas. **PG-08G.3 NO está autorizada.**

Esta misión solo ha escrito documentos nuevos en
`docs/informes/fases/PG-08/PG-08G2F/` y una entrada nueva en el índice. No se
ha implementado genética, no se ha modificado producción, frontend, sidecar,
base de datos, saves ni fixtures; no hay migraciones, commits ni pushes.

## 1. Decisiones incorporadas

| ID | Decisión incorporada | Estado |
|---|---|---|
| BR-01 | Inventario de 20 huevos **recogidos** por usuario; solo `claimed` ocupa inventario; los pendientes no cuentan. C2 histórico no se redefine. | `DECIDED` |
| BR-02 | Capacidad inicial de pendientes: **2 por usuario**; ampliable por mejoras de tienda, cuyos precios, niveles y máximo quedan para otra fase. Contadores separados. | `DECIDED` |
| BR-03 | Chequeo cada 60 minutos con identidad determinista; si se cumplen todas las condiciones, producción garantizada; sin probabilidad de rareza en este piloto. | `DECIDED` |
| BR-04 | Cada progenitor debe cumplir `HungryActual / HungryMax >= 0.70`, evaluado en cada chequeo; reconstrucción horaria offline sin usar el valor de desconexión para todas las horas. | `DECIDED` |
| BR-05 | Un huevo para cada propietario por evento exitoso; producción y asignación atómicas; compatibilidad Gen II; sin pérdidas ni duplicados. | `DECIDED` |
| BR-06 | Los huevos quedan pendientes; el propietario pulsa «Recoger»; recogida idempotente; cooldown desde la entrada al inventario. | `DECIDED` |
| BR-07 | Recuperar la duración aprobada; no inventarla; C4 sigue diferido; si no hay evidencia, `UNKNOWN_HATCH_COOLDOWN`. | `DECIDED` |
| BR-08 | Política `ALL`; conservar todo el tiempo pendiente; ventanas de hasta 24 h y hasta 24 chequeos por ventana; los fallidos no consumen presupuesto de éxitos; sin cola adicional; `maxEvents=5` queda sustituido documentalmente. | `DECIDED` |

La jerarquía aplicada es: decisiones expresas del propietario > contratos
PG-08A–F > contratos G1/G2/G2D/G2E > recomendaciones de esta misión. Las
recomendaciones nuevas no tienen valor de decisión.

## 2. Conflictos resueltos

| Conflicto | Resolución documental |
|---|---|
| C2=4 frente a inventario 20 | El inventario V4 es `claimed` y tiene límite 20. C2 pertenece al contrato histórico de capacidad (`produced`/`pending_assignment`/`stored`) y permanece intacto. |
| Pendientes 2 frente a entrega 1+1 | El límite 2 es **por usuario**. Un evento exitoso entrega un huevo a cada uno de los dos propietarios. El detalle de incapacidad queda abierto con recomendación de fallo atómico. |
| `single` frente a huevos pendientes | `single` describe el modo de backlog (`backlog=0`); no prohíbe el estado pendiente de recogida. BR-08 introduce `ALL` solo para reconciliación offline. |
| Rareza PG-08D frente a producción garantizada | En el piloto Gen II, un chequeo elegible produce; la tabla PROVISIONAL de intervalos no es compuerta. No se altera su vigencia para otros usos. |
| Semántica de Hungry | No existen `HungryActual`/`HungryMax`. `PetState.hunger` está acotado a 0–100 por `clamp`, por lo que `max=100` es un límite verificado y no un campo inventado. |
| `maxEvents=5` frente a 24 chequeos | Se documentan contadores separados: hasta 24 chequeos por ventana de 24 h; los fallidos y saltados no reducen el presupuesto de eventos exitosos. |
| `ALL` frente a `OfflinePolicy` actual | `ALL` es un nuevo valor **documental** de `OfflineReconciliation`. El código actual mantiene `single|bounded` y no se toca. |
| Estados `stored`, `pending`, `claimed` | `stored`/`available` son pendientes y no inventario; `claimed` entra al inventario y ancla el cooldown. No se crea `in_inventory`. |
| Recuperación tras interrupciones | Se reutilizan transacciones SQLite, claves de idempotencia, `replay`, `drainBacklog` y `retry` de PG-08B/F; sin transacción distribuida. |

## 3. Conflictos abiertos

- **Cooldown de incubación:** `BLOCKED`, sin duración aprobada demostrable.
- **Capacidad agotada al recoger:** abierto. Recomendación `PROPOSED`:
  `CAPACITY_EXHAUSTED(resource:"inventory")` sin consumir `claimKey`, con el
  huevo permaneciendo `stored`.
- **Pendiente lleno:** abierto. Recomendación `PROPOSED`: comprobar capacidad
  de ambos propietarios antes de confirmar; si falta, `CAPACITY_EXHAUSTED` sin
  producir ninguno de los dos huevos.
- **Hungry más allá de 7 días:** abierto. La Tamagotchi solo compensa
  7 días (`MAX_CATCHUP_MS`); no se inventa el valor previo. Para 24/48/72 h no
  afecta; para ausencias mayores requiere decisión.
- **Mejoras de tienda:** precios, niveles y máximo pendientes de fase posterior.
- **Implementación de `ALL`:** decisión documentada, pero su ejecución exige
  autorización independiente.
- **Migraciones:** ninguna autorizada; el diseño V4 no altera esquemas actuales.

## 4. Resultado de la recuperación del cooldown

**Veredicto: `UNKNOWN_HATCH_COOLDOWN` — `BLOCKED`.**

| Clase | Evidencia | Conclusión |
|---|---|---|
| Implementado | `breeding-engine.ts:32-34,41-51` | 1–12 h son intervalos de **producción**, no incubación. |
| Implementado | `pet-engine.ts:316-323` | 15 min y 8 min son cooldowns de acciones Tamagotchi, no huevos. |
| Implementado | `egg-domain.ts:6,67`; `scripts/pg08e-check.ts:726` | El huevo es un registro simulado sin eclosión. |
| Documentado | `docs/BREEDING_DESIGN_RFC.md:30,32-38` | Rango 15 min–3 h con «fórmula pendiente»; no es valor único. |
| Etiqueta documental | `docs/ROADMAP.md:12,51` | PG-09D dice `DECIDED`, pero sin valor concreto ni cita del propietario. |
| Propuesto | `STITCH_UPLOAD/LEEME_STITCH.md:60,63,84` | Marca la fórmula como pendiente. |
| Gate específico | `PG-08G2E/INCUBACION-Y-COOLDOWN.md`; `CONFLICTOS-Y-DECISIONES.md` | `UNRESOLVED`/`BLOCKED`; fallar cerrado. |

`git grep` sobre todos los commits locales encontró solo dos apariciones del
rango 15 min–3 h y ninguna de `UNKNOWN_HATCH_COOLDOWN`. No existe aprobación
propietaria con valor numérico. Por tanto no se fija duración, no se reutiliza
ningún otro temporizador y la incubación queda bloqueada hasta nueva decisión.

## 5. Contratos técnicos propuestos

Documentados en `CONTRATOS-TYPESCRIPT.md`, sin crear módulos de producción:

- `IdempotencyKey`: claves `check:`, `prod:`, `claim:` y `offline:`.
- `HungrySnapshot`: `actualE2`, `maxE2=10000`, `ratioMicro`, `source`,
  `meetsThreshold`.
- `CapacityPolicy`: custodia 2, pendientes 2, inventario 20, `backlog=0`,
  `backlogMode:"single"`, `inventoryStates:["claimed"]`.
- `BreedingEligibility`: `eligible`, `ineligible` o `unknown` con bloqueadores.
- `BreedingCheck`: `produced`, `skipped`, `failed` o `duplicate`; `eggIds` solo
  si produce.
- `EggProductionEvent`: par `host`/`guest` con identidades derivadas por rol.
- `PendingEgg`: estado previo a `claimed`, con legitimidad simulada.
- `EggInventory`: límite 20 sobre entradas `claimed`.
- `EggClaim`: recogida idempotente y ancla del temporizador.
- `IncubationTimer`: `startedAt === claimedAt`, `cooldownMs:null` y
  `UNKNOWN_HATCH_COOLDOWN`.
- `OfflineReconciliation`: `policy:"ALL"`, ventanas `(from,to]` y contadores
  separados.

Invariantes principales: 1+1 indivisible, propiedad por rol, capacidades
separadas, sin cola invisible, chequeo distinto de huevo, Hungry estricto, RNG
HMAC-SHA256, recogida atómica, cooldown anclado, offline sin pérdida, fallidos
que no consumen éxitos, cuatro capas de legalidad y atomicidad real solo dentro
de una SQLite.

## 6. Pruebas diseñadas

`MATRIZ-PRUEBAS.md` contiene 30 casos aislados:

- `HUN-01…06`: 69,99 %, 70 %, 100 %, un progenitor bajo, ambos bajos y snapshot
  desconocido.
- `CHECK-01…04`: producción garantizada, repetición, reuso de clave con
  contenido distinto y fallido que no consume éxito.
- `ATOM-01…04`: 1+1 todo o nada, recuperación sin duplicados, persistencia
  parcial y replay del outbox.
- `CAP-01…03`: pendiente lleno, backlog prohibido y reducción bajo uso.
- `INV-01…02`: inventario 19/20 y 20/20.
- `CLAIM-01…02`: doble recogida y caída entre preparación y confirmación.
- `COOL-01…02`: anclaje en `claimedAt` y ausencia de duración aprobada.
- `OFF-01…06`: 24/48/72 h, interrupción, fallidos y reloj que retrocede.
- `LEG-01`: cuatro capas y exportación negativa.
- `AIS-01`: rechazo de `data/pokegotchi.db` con
  `STORE_ISOLATION_VIOLATION`.

Ninguna prueba se integra en `scripts/check.sh` ni escribe en producción.

## 7. Riesgos

- No hubo auditoría independiente: el subagent `terra` agotó su cuota. El
  análisis lo realizó el agente principal sobre fuentes locales.
- La etiqueta `DECIDED` de `ROADMAP.md` podría interpretarse erróneamente como
  duración aprobada; no lo es.
- Implementar `ALL` sin separarlo de `backlogMode` mezclaría "procesar todo el
  tiempo" con "crear cola", lo que está prohibido.
- Usar el valor de desconexión de Hungry para todas las horas falsificaría la
  elegibilidad.
- Reutilizar intervalos de producción o cooldowns de acciones como duración de
  incubación sería inventar una regla.
- La atomicidad no cubre archivos, red ni bases de datos distintas.

## 8. Bloqueos reales para PG-08G.3

1. Ejecución no autorizada: requisito de autorización expresa e independiente.
2. Cooldown de incubación `BLOCKED` por falta de duración o fórmula aprobada.
3. Política de capacidad agotada pendiente de decisión.
4. Hungry más allá de 7 días pendiente de decisión.
5. Mejoras de tienda pendientes de fase posterior.
6. Implementación de `ALL` no autorizada.

## 9. Archivos creados

`docs/informes/fases/PG-08/PG-08G2F/`:

1. `SYNCGATE.md`
2. `DECISIONES-DEFINITIVAS.md`
3. `CONTRATO-CRIANZA-V4.md`
4. `INVENTARIO-Y-PENDIENTES.md`
5. `HUNGRY-Y-CHEQUEOS.md`
6. `OFFLINE-ALL.md`
7. `INCUBACION-COOLDOWN-AUDIT.md`
8. `CONFLICTOS-RESUELTOS-Y-ABIERTOS.md`
9. `CONTRATOS-TYPESCRIPT.md`
10. `MATRIZ-PRUEBAS.md`
11. `PLAN-PG08G3-DEFINITIVO.md`
12. `PG-08G2F-INFORME.md`

Además se actualizó `docs/informes/README.md` con un bloque nuevo, sin
reescribir informes históricos.

## 10. Estado final del repositorio

| Comprobación | Resultado |
|---|---|
| SyncGate final | PASS sin fallos críticos |
| Rama y HEAD | `main`; HEAD = `origin/main` = `7c9c326be0eb4dced4969c5b0f966413d3299dae`; divergencia `0 0` |
| `bun run check` | EXIT 0; PG-08A–F 473/473; PG-07H 101/101; sidecar 0 avisos / 0 errores |
| Hashes protegidos | 17/17 coincidentes |
| Base de datos | `PRAGMA integrity_check` → `ok`; 4 mascotas; SHA-256 `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` |
| Entradas locales | 50 (49 preexistentes + `PG-08G2F/`); staged 0; conflictos 0 |
| Producción | sin modificaciones |
| Commits y pushes | ninguno |

**Detenido aquí.** No se inicia PG-08G.3 sin autorización expresa e
independiente.
