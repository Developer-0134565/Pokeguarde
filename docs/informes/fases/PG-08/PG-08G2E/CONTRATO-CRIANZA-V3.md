# PG-08G.2E — CONTRATO DE CRIANZA V3

**Estado:** documentación de decisiones aprobadas. **Ejecución:** NO autorizada.

## 1. Decisiones aprobadas por el propietario

| ID | Decisión | Estado |
|---|---|---|
| BR-01 | Inventario de huevos: máximo **20 por usuario**. Sustituye C2 = 4 solo en el ámbito de inventario de huevos. | `DECIDED` como objetivo de producto; la equivalencia exacta con C2 queda pendiente de verificación documental. |
| BR-02 | Chequeo de condiciones de crianza cada **60 minutos**, con identidad determinista. El chequeo no es un huevo. | `DECIDED` |
| BR-03 | Ambos Pokémon deben cumplir `HungryActual / HungryMax >= 0.70`; si cualquiera no cumple, no se producen huevos. | `DECIDED`; el mapeo del ratio a campos reales queda por confirmar. |
| BR-04 | Cada evento exitoso produce 1 huevo para A y 1 para B; producción y asignación atómicas. | `DECIDED` |
| BR-05 | Los huevos quedan pendientes de recogida; al recogerse pasan al inventario del propietario. Recogida idempotente, sin pérdidas ni duplicados. | `DECIDED`; el estado exacto que representa «inventario» está en conflicto. |
| BR-06 | El cooldown de incubación empieza al entrar el huevo en el inventario; se usa solo la duración previamente aprobada; C4 sigue diferido. | `DECIDED` el inicio; la duración no se ha localizado en las fuentes. |
| BR-07 | Progreso offline con política `ALL`, procesamiento progresivo, ventanas de hasta 24 h y sin descartar tiempo. Reevaluar `maxEvents = 5`. | `DECIDED` la política; `maxEvents` queda bajo propuesta, no modificado unilateralmente. |

## 2. Contrato PG-08G.3 que permanece vigente

- `gen2-gs` y `gen2-crystal` son los únicos `GameKey` del piloto.
- Generaciones III–V fuera de alcance; bug `InheritIVs` diferido; sin semilla
  maestra de producción.
- Distribución 1+1, RNG HMAC-SHA256, reanudación reproducible,
  anti-duplicados y persistencia atómica.
- Cuatro capas de legalidad separadas: interna, generacional, PKHeX y
  exportabilidad.
- `realPkm:false` y `exportable:false`; sin afirmación de equivalencia con el
  RNG de cartucho.

## 3. Compatibilidad con contratos históricos

- **PG-08A:** no se alteran D4-A (invitaciones), D8-A (retención) ni D9-A
  (límites/abuso). Se mantiene la custodia de dos Pokémon por guardería.
- **PG-08D:** se conserva el reloj inyectado, `cycleIdOf`,
  `pairRevisionOf`, `PROVISIONAL_INTERVALS_MS` y la tabla de intervalos como
  simulación explícita. BR-02 añade una oportunidad de chequeo horaria; no
  demuestra que sustituya a la tabla de rareza.
- **PG-08E:** se conservan `EGG_TRANSITIONS`, `CAPACITY_STATES`, cola opcional
  C3, idempotencia y `CAPACITY_EXHAUSTED` sin consumir idempotencia.
- **PG-08F:** se conservan 1+1, propiedad por rol, procedencia DEMO y entrega
  simulada en dos fases `prepareDelivery`/`confirmDelivery`.
- **PG-08G.2/G.2D:** se conserva la arquitectura de diez capas, la matriz por
  `GameKey`, el RNG determinista y el aislamiento del piloto. Los sufijos
  `-A` y `-G2` siguen siendo obligatorios para D4/D8/D9.

## 4. Elementos que NO cambian por esta documentación

- No se fija C3.
- No se crea C4.
- No se modifica `maxEvents = 5`.
- No se crea una cola incompatible con `single` de R-B2.
- No se inventa la duración del cooldown de incubación.
- No se toca `data/pokegotchi.db`, saves, fixtures, frontend ni sidecar.

## 5. Estado de preparación

Los contratos de producto están documentados, pero quedan abiertos los puntos
de la tabla de `CONFLICTOS-Y-DECISIONES.md`. Por tanto, el estado es:

**DECISIONS DOCUMENTED — EXECUTION NOT AUTHORIZED.**
