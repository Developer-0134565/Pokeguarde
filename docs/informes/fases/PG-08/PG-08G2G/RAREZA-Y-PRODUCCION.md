# PG-08G.2G — RAREZA Y PRODUCCIÓN GARANTIZADA

**Resultado:** RECONCILIADA para el piloto. No se modifica ni se inventa la regla TRD-42.

## 1. Contradicción planteada

- `G2G-BR-03`: producción garantizada cuando se cumplen todas las condiciones; sin probabilidad aleatoria de puesta.
- TRD-42: «rareza del huevo entregado» (corrección declarada por el propietario, sin texto de contrato recuperable en el repositorio).

`git log --all -S "TRD-42"` y `-S "rareza del huevo"` → **vacío**. El identificador no aparece en ningún archivo local (`grep` global: 0 coincidencias de TRD-*).

## 2. Cuatro conceptos distintos

| # | Concepto | Dueño | Estado en el piloto |
|---|---|---|---|
| 1 | Probabilidad de que se **produzca** un huevo | motor de chequeo | **Eliminada**: producción garantizada (`G2G-BR-03`) |
| 2 | Rareza / atributos del huevo **producido** | dominio genético Gen II | Diferido: RFC `BREEDING_DESIGN_RFC.md:19-20` dice que las características son aleatorias y se definirán en la fase de breeding |
| 3 | Probabilidad de especies o características especiales (shiny, DVs) | reglas Gen II | Documentada pero **no implementada** (`GEN-II.md §3-6`) |
| 4 | Reglas de legalidad genética Gen II | dominio Gen II | Documentadas; no compuerta de puesta (`GEN-II.md §1-9`) |

La hipótesis de trabajo de la directiva es correcta y **no añade una decisión nueva**: la puesta puede ser garantizada mientras los atributos siguen reglas independientes. Es exactamente la separación ya aprobada en `PG-08G2F/CONFLICTOS-RESUELTOS-Y-ABIERTOS.md §1.4`: *«Rareza PG-08D frente a producción garantizada — RESUELTO. BR-03: si se cumplen todas las condiciones, se produce. La tabla PROVISIONAL de PG-08D se conserva para otras aplicaciones; no es compuerta en este piloto»*. V4 §2 coincide: *«No se consulta la tabla PROVISIONAL de rareza de PG-08D para decidir la puesta en este piloto»*.

## 3. Por qué TRD-42 no bloquea el piloto

1. **Pertenencia al clúster comercial.** Las correcciones del propietario_TRD-40 rev2 (retención 24 h), TRD-42 (rareza del huevo entregado), TRD-43 (recompensas fraudulentas liberadas), TRD-44 (deudas comerciales), TRD-45 (comprar/intercambiar con deuda) y TRD-46 (artículos comprados) forman un único paquete de comercio/recompensas/economía. El piloto excluye expresamente marketplace, recompensas comerciales, economía y deudas (directiva §3). No hay entrega comercial en el piloto: la entrega es 1+1 entre propietarios por consenso (`BREEDING_DESIGN_RFC.md:18`), sin monedas ni precios.
2. **Sin dependencia técnica directa demostrable.** La rareza no interviene en ninguna de las ocho compuertas del chequeo (pareja, procedencia, permisos, `GameKey`, Hungry ×2, capacidad ×2). No es necesaria para producir, persistir ni reconciliar.
3. **El atributo no se genera en el piloto.** Los huevos son `SIMULATED_LOG_ONLY`, `realPkm:false`, `exportable:false`, `hatched:false` (`egg-domain.ts:63-67`); no hay generación genética implementada. No existe superficie sobre la que TRD-42 pudiera actuar.
4. **No se reescribe TRD-42.** Se excluye del bloqueo del piloto, no se deroga, no se redefine y no se convierte en regla de puesta.

## 4. Regla operativa resultante

- `rarity` **no** es entrada del `BreedingCheck` del piloto. No se introduce `CHECK_RARITY_NOT_DUE` (`HUNGRY-Y-CHEQUEOS.md §3`).
- La tabla `PROVISIONAL_INTERVALS_MS` de `breeding-engine.ts:42` permanece intacta para sus aplicaciones actuales; no se usa como compuerta ni como duración de incubación.
- Si en el futuro se implementa generación de atributos, debe hacerse con reglas Gen II verificadas (DVs 0–15, shiny 1/8192, herencia de Defense/Special DV) y **después** de la decisión humanasobre cooldown, sin reabrir `G2G-BR-03`.

## 5. Estados de la evidencia

| Elemento | Clasificación |
|---|---|
| Producción garantizada sin probabilidad | APPROVED (`G2G-BR-03`) |
| Rareza PROVISIONAL PG-08D conservada para otros usos | IMPLEMENTED / sin cambio |
| Características aleatorias definidas en fase futura | PROPOSED (RFC) |
| Reglas genéticas Gen II documentadas | IMPLEMENTED como documentación; no ejecutadas |
| TRD-42 texto y ámbito exacto | UNRESOLVED (sin evidencia local) |
| TRD-42 como bloqueo del piloto | **Excluido con justificación**; no derogado |
