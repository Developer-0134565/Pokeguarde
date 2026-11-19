# PG-08G.3 — Propuesta de alcance (NO AUTORIZADA)

**Estado: PROPUESTA.** Este documento no autoriza trabajo alguno. PG-08G.2 terminó
en la especificación; hace falta autorización expresa para iniciar PG-08G.3.

## 1. Principio rector

No implementar «crianza Gen I–V» de una vez. Empezar por un **piloto vertical de
Gen II** con azar inyectado y sin PKM, y dejar fuera todo lo que dependa de
decisiones humanas o de fuente primaria pendiente.

Razones:

1. Gen II es la única generación con reglas íntegramente verificadas por
   desensamblado (`pret/pokecrystal`, ver `CONFLICTOS-Y-EVIDENCIAS.md` §11).
2. No depende de ninguno de los bloqueos R-B1…R-B12 (`RIESGOS-Y-BLOQUEOS.md`).
3. Ejerce las tres capas nuevas difíciles (compatibilidad con DVs, herencia,
   movimientos FIFO) sin arrastrar PID, habilidades ni inciensos.
4. Su resultado es auditable con las Matriz `MATRIZ-DE-PRUEBAS.md` T-COMP/T-DV/
   T-SHINY/T-MOVE/T-SPEC.

## 2. Puerta previa obligatoria (antes de escribir código)

| # | Acción | Por qué |
|---|---|---|
| G3-0.1 | Confirmar por escrito el alcance del piloto (`gen2-gs` y `gen2-crystal`) | Evita ampliación silenciosa |
| G3-0.2 | Decidir **R-B1** (C2) y **R-B2** (C3) como mínimo, aunque el piloto no los use | El piloto CreateEgg necesita una capacidad real |
| G3-0.3 | Decidir **R-B3** (existencia de C4) y **R-B4** (`maxEvents`/`maxWindowMs`) o confirmar que siguen diferidos | Evita inventar límites offline |
| G3-0.4 | Decidir si se **replica el bug de `InheritIVs`** en Gen III cuando se aborde esa generación (`CONFLICTOS…` §11.11.8) | Fidelidad vs. corrección; no se decide por defecto |
| G3-0.5 | Confirmar que el RNG de producción sigue fuera de alcance y que solo se usa el esquema de pruebas | R-B10 |

Si G3-0.2 no se decide, el piloto puede ejecutarse con un store **en memoria**
de prueba, nunca con `data/pokegotchi.db`; pero no se declara listo para uso.

## 3. Alcance propuesto (piloto Gen II)

### Incluido

1. `GenerationRulesProvider` con **solo** `gen2-gs` y `gen2-crystal`,
   `verified:true`, y fallo `UNKNOWN_RULES` para cualquier otra clave.
2. `CompatibilityResolver` con: grupo huevo, sexos opuestos, Ditto, genderless,
   No Eggs Discovered, y bloqueo de parentesco por DVs (Def igual + 3 bits
   bajos de Special iguales). Incluye el caso de dos shinies →
   `KINSHIP_DV_MATCH`.
3. `GeneticParent` con `Dv4` y prohibición de `Iv6` (`DV_MODEL_MISMATCH`).
4. Resolvedores de especie (madre/no-Ditto, Nidoran 50/50), sexo (umbrales
   1/3/7/11), DVs (Def del sexo opuesto o Ditto, Special ±8, Atk/Spe
   aleatorios, HP derivado, `SkipDVs` para bebé sin género), shiny por patrón
   de DVs y cría shiny parental 1/64.
5. `MoveResolver` con `strategy:'insertion_fifo_truncate'`, `levelCap:null`,
   dedupe, egg moves + MT/MO del padre, tutor de Crystal, y **sin herencia
   cuando el progenitor heritable es Ditto** (hembra + Ditto).
6. Incubación y eclosión simuladas con `hatchLevel:5`, sin PKM.
7. `RandomnessPort` con el esquema HMAC-SHA256 validado en el spike 12/12;
   semilla literal de prueba, solo `seedRef` persistido.
8. Pruebas T-COMP/T-DV/T-SHINY/T-MOVE/T-SPEC con reloj y azar inyectados.

### Expresamente excluido

- Gen I salvo el contrato negativo (`NO_BREEDING_IN_GENERATION`).
- Gen III, IV y V; en particular habilidades, inciensos, formas, Masuda,
  Shiny Charm, Power Items y Destiny Knot.
- `data/pokegotchi.db`, saves, fixtures, exportaciones, frontend, sidecar y
  formato PKM.
- Escritura de `.srm`/`.sav`/`.dsv` y veredicto PKHeX sobre genética simulada.
- Integración en `scripts/check.sh` (se decide al final del piloto).
- Cifrado, cuentas, red y guarderías públicas (PG-08H+).

## 4. Entregables propuestos para G3

| Archivo propuesto | Naturaleza | Ubicación |
|---|---|---|
| `gen2-rules.ts` | Tabla de reglas, sin lógica de azar | `packages/core/src/` (solo con autorización) |
| `gen2-genetics.ts` | Resolvedores puros + `InheritanceEngine` | `packages/core/src/` (solo con autorización) |
| `gen2-genetics.test.ts` | Casos de las familias T-* del piloto | `packages/core/src/` (solo con autorización) |
| `PG-08G3-INFORME.md` | Evidencia, hashes y resultados | `docs/informes/fases/PG-08/PG-08G3/` |
| `docs/informes/fases/PG-08/PG-08G3/SYNCGATE.md` | Estado antes/después | ídem |

La ruta de producción **solo** se usa si la autorización para G3 lo permite
expresamente; la alternativa por defecto es `experimentos/` bajo el informe.

## 5. Criterios de aceptación propuestos

1. Todas las pruebas Gen II de `MATRIZ-DE-PRUEBAS.md` en verde.
2. Cero `Math.random()` y cero `Date.now()` en los módulos nuevos (escaneo T-DET).
3. Misma semilla → misma genética tras reabrir el proceso.
4. `bun run check` sin regresiones (473/473 PG-08A–F, 101/101 PG-07H).
5. 17 hashes protegidos intactos y BD `3c6fb194…3001fb4a` sin cambios.
6. Ningún caso escribe en `data/`; ningún `.pkm`/`.srm` creado.
7. `realPkm:false` y `exportable:false` en todo resultado.
8. Sin commits ni pushes.

## 6. Fases posteriores sugeridas (solo como hoja de ruta)

| Fase | Contenido | Requiere |
|---|---|---|
| G4 | Gen III (R/S/FRLG y Emerald) | Decisión G3-0.4 sobre el bug de IVs; tabla de inciensos cerrada |
| G5 | Gen IV (DP/Pt vs HGSS) | Resolver Everstone+Masuda en HGSS (R-E2) con fuente primaria |
| G6 | Gen V (B/W vs B2/W2) | Nada crítico; habilidades y Charm ya documentados |
| G7 | Incubación/eclosión y persistencia completa | R-B1…R-B4 |
| G8 | Exportabilidad (fuera de alcance actual) | R-B9, R-B11 y protocolo de escritura |

## 7. Decisión final

**NO INICIAR.** Se recomienda aprobar primero los puntos G3-0.1…G3-0.5 y
después autorizar el piloto Gen II con los límites de este documento.
