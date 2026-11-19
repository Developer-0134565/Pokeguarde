# PG-08G.2F — DECISIONES DEFINITIVAS

**Estado:** todas las decisiones BR-01…BR-08 son `DECIDED` por el propietario. Su ejecución sigue **NO autorizada**.

## 1. Decisiones

| ID | Decisión definitiva | Estado | Consecuencia directa |
|---|---|---|---|
| BR-01 | Máximo **20 huevos recogidos** por usuario. Solo `claimed` ocupa inventario; los pendientes no consumen capacidad. | `DECIDED` | Nuevo `EggInventory` con `capacity = 20`; no se redefine C2 histórico. |
| BR-02 | Capacidad inicial de **2 huevos pendientes** por usuario. Ampliable con mejoras de tienda; precios, niveles y máximo pendientes. | `DECIDED` | `PendingEggCapacity`: valor inicial 2; mejoras futuras fuera de este piloto. |
| BR-03 | Un chequeo cada **60 minutos**, con identidad determinista. Si se cumplen condiciones, producción garantizada. Sin probabilidades de rareza en este piloto. | `DECIDED` | `BreedingCheck` con `checkId` derivado; rareza PG-08D queda vigente para otros usos, no para la puesta del piloto. |
| BR-04 | Ambos progenitores deben cumplir `HungryActual / HungryMax >= 0.70`. Reconstruir hambre por hora offline; no usar el valor de desconexión para todas las horas. | `DECIDED` | `HungrySnapshot` por chequeo; `PetState.hunger` auditado, rango 0–100. |
| BR-05 | Un huevo para cada propietario por evento exitoso; dos en total. Producción y asignación atómicas. Compatibilidad Gen II. | `DECIDED` | `EggProductionEvent` con dos `PendingEgg`; misma transacción. |
| BR-06 | Recogida manual; el usuario pulsa «Recoger». Recogida idempotente; al recoger pasa al inventario. Cooldown comienza al entrar al inventario. | `DECIDED` | `EggClaim` con clave de idempotencia; `IncubationTimer.startedAt = claimedAt`. |
| BR-07 | Recuperar duración previamente aprobada; no inventar; C4 diferido; si falta evidencia, `UNKNOWN_HATCH_COOLDOWN`. | `DECIDED` + bloqueo de evidencia | Veredicto de auditoría: `UNKNOWN_HATCH_COOLDOWN` / `BLOCKED`. |
| BR-08 | Política `ALL`; conservar todo el tiempo pendiente; ventanas consecutivas de hasta 24 h; hasta 24 chequeos/ventana; los chequeos fallidos no consumen presupuesto de eventos exitosos; sin cola adicional de huevos; `maxEvents=5` queda sustituido documentalmente. | `DECIDED` | `OfflineReconciliation` con contadores separados: `checks` y `successfulEvents`. |

## 2. Jerarquía documental

1. `AGENTS.md` y decisiones expresas del propietario (BR-01…BR-08, contrato PG-08G.3).
2. Contratos PG-08A–F: autoridad, huevo, 1+1, entrega, atomicidad.
3. PG-08G1/G2/G2D/G2E: investigación y contratos genéticos/breeding previos.
4. V4 (`CONTRATO-CRIANZA-V4.md`): consolidación vigente de esta fase.

V4 **no modifica** contratos históricos: `maxEvents=5`, C2=4, `single` y la tabla de rareza permanecen en sus documentos originales con su contexto.

## 3. Alcance

- Juegos: `gen2-gs` y `gen2-crystal` únicamente.
- Fuera: Gen III–V, bug `InheritIVs`, semilla maestra de producción, implementación, BD, saves, PKM, migraciones, frontend, sidecar, commits y pushes.

## 4. Lo que NO queda decidido por BR-01…BR-08

- Duración/fórmula del cooldown de incubación (`BLOCKED`).
- Conducta exacta cuando la capacidad de pendientes está agotada (recomendación propuesta).
- Precios/niveles/máximo de mejoras de la tienda.
- Reconstrucción de hambre más allá de la ventana verificada de 7 días de la Tamagotchi.
- Implementación de `ALL`: hoy el código solo expone `single | bounded`.
