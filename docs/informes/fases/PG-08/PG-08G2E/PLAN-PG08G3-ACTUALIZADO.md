# PG-08G.2E — PLAN PG-08G.3 ACTUALIZADO

**Estado:** propuesta de implementación. **No ejecutado ni autorizado.**

Este documento actualiza `PG-08G2D/PLAN-PG08G3.md` con BR-01…BR-07. No
reescribe el plan histórico; cuando ambas fuentes difieran, manda el contrato
aprobado por el propietario y se registra la discrepancia.

## 0. Puertas previas

| Puerta | Contenido | Estado |
|---|---|---|
| G3-0.1 | Piloto `gen2-gs` / `gen2-crystal` | Aprobada |
| G3-0.2 | R-B1 y R-B2 | Aprobadas |
| G3-0.3 | R-B3 y R-B4 | Aprobadas con matices documentados |
| G3-0.4 | Bug `InheritIVs` de Gen III | Diferido |
| G3-0.5 | Semilla maestra fuera de alcance | Aprobada |
| E-0.1 | Definición de inventario y `PENDING_CAPACITY` | Pendiente |
| E-0.2 | Chequeo horario frente a tabla de rareza | Pendiente |
| E-0.3 | Mapeo de Hungry | Pendiente |
| E-0.4 | Presupuesto de eventos y windows de 72 h | Pendiente |
| E-0.5 | Duración del cooldown de incubación | Bloqueada |

**Prohibición de inicio:** no se abre ningún incremento sin autorización
posterior, expresa e independiente.

## 1. Incrementos

### I1 — Contratos y tipos

- **Cambios V3:** añadir `BRCheckId`, `CheckOutcome`, `InventoryCapacity` y
  política `ALL` como propuesta; no sustituir `OfflinePolicy` histórico.
- **Pruebas:** 12 `GameKey`, `realPkm:false`, `exportable:false`, sin
  `Math.random`/`Date.now`, DOC_DRIFT de MOVE-08 y tipos antiguos.
- **Riesgo:** confundir chequeo con huevo.
- **Criterio:** `checkId` no aparece en tipos de huevo; 473/473 sin regresión.
- **Reversibilidad:** borrar directorio aislado.

### I2 — RNG determinista

- **Cambios V3:** ninguno en el algoritmo; los vectores del spike siguen siendo
  la referencia. El contexto incluye `checkNumber` como `purpose`, nunca como
  semilla nueva.
- **Pruebas:** DET-01…DET-10; reproducibilidad de `checkId`.
- **Criterio:** mismos vectores, sin semilla maestra persistida.

### I3 — Compatibilidad reproductiva

- **Cambios V3:** la compatibilidad es necesaria pero no suficiente; BR-03 se
  evalúa en I7/I9, no aquí.
- **Pruebas:** COMP-01…COMP-15; procedencia DEMO rechazada antes de azar.
- **Criterio:** sin nuevos permisos de crianza.

### I4 — Herencia por generación y juego

- **Cambios V3:** ninguno; Gen II con DV4, sexo, DVs, shiny y FIFO.
- **Pruebas:** DV, SHINY, MOVE y SPEC del piloto; DOC_DRIFT sin corregir
  informes históricos.
- **Criterio:** sin naturalezas, habilidades ni IVs en Gen II.

### I5 — Generación de huevos simulados

- **Cambios V3:** el borrador no decide inventario ni cooldown; solo produce la
  pareja lógica de dos huevos.
- **Pruebas:** EXP-01/02/05, LEG-01/02; `realPkm:false`.
- **Criterio:** cero `.pkm`, `.srm` o met data fabricado.

### I6 — Capacidad y entrega atómica

- **Cambios V3:** valor de inventario 20 (BR-01) solo tras E-0.1; C3 sigue sin
  decidir; rechazo atómico si falta hueco para cualquiera de los dos.
- **Pruebas:** CAP-01…CAP-11, ATOM-01…ATOM-10; `ATOM-08` con centinela en
  `/tmp`, nunca la BD real.
- **Riesgo:** romper 1+1 por llenar solo un inventario.
- **Criterio:** los dos huevos o ninguno; reintentos sin duplicar.
- **Reversibilidad:** borrar directorio y stores temporales.

### I7 — Chequeos horarios, Hungry y progreso offline

- **Cambios V3:** chequeo cada hora; `ALL` progresivo; ventana 24 h; 72 h en
  tres ventanas; Hungry evaluado por chequeo; `maxEvents` propuesto 24, sin
  aplicar hasta aprobación.
- **Pruebas:** OFF-01…OFF-13; CHECK-01…CHECK-08 (nuevos); HUN-01…HUN-06.
- **Riesgo:**`WINDOW_EXCEEDED` descarta tiempo; prohibido por BR-07.
- **Criterio:** `CLOCK_ROLLBACK` sin generar; reintentos con `created:false`;
  marcas persistidas; cero huevos por tiempo sin chequeo.
- **Reversibilidad:** reloj y store solo de prueba.

### I8 — Incubación y cooldown

- **Cambios V3:** inicio en entrada al inventario; duración bloqueada hasta
  aportar referencia; C4 no creado.
- **Pruebas:** SPEC-09/10, DET-05, EXP-05; `UNKNOWN_HATCH_COOLDOWN` si no hay
  duración.
- **Criterio:** progreso persistido y reanudable; sin contador concurrente.
- **Reversibilidad:** borrar directorio.

### I9 — Validación interna y generacional

- **Cambios V3:** verificar por separado que un chequeo omitido no se informa
  como huevo, y que BR-03 no se mezcla con legalidad PKHeX.
- **Pruebas:** LEG-01…LEG-10, EXP-01…EXP-05 y nuevas aserciones de capa.
- **Criterio:** L3 con doble; L4 bloqueado; `INVALID_CANDIDATE_NOT_PKM`.
- **Reversibilidad:** sidecar intacto.

### I10 — Integración controlada y regresión

- **Cambios V3:** ejecutar un script propio; no integrar en `scripts/check.sh`.
- **Pruebas:** rerun determinista, 473/473, 101/101, 17 hashes, BD, Git.
- **Criterio:** 49 entradas locales (48 previas + `PG-08G2E/`), HEAD y origin
  inalterados, sin commits ni pushes.
- **Reversibilidad:** borrar directorio del incremento; sin hooks.

## 2. Matriz rápida de impacto

| BR | Incrementos afectados | Efecto principal |
|---|---|---|
| BR-01 | I6 | Inventario 20, pendiente de E-0.1 |
| BR-02 | I1, I7 | `checkId` y chequeo horario |
| BR-03 | I7, I9 | Ratio Hungry por chequeo |
| BR-04 | I6 | Atomicidad 1+1 |
| BR-05 | I6, I8 | Recogida idempotente e inicio de inventario |
| BR-06 | I8 | Cooldown desde entrada al inventario; duración bloqueada |
| BR-07 | I7, I10 | `ALL`, 24 h, 72 h, revisión de `maxEvents` |

## 3. Límites de ejecución

No se crean migraciones, no se abre `data/pokegotchi.db`, no se escriben
saves ni PKM, no se toca frontend ni sidecar, no se integra en `check.sh`, no
se hace commit ni push. La aprobación de este plan no autoriza su ejecución.
