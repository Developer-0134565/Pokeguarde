# PG-08G.2G — DEPENDENCIAS EXCLUIDAS

**Resultado:** ningún sistema excluido es requisito bloqueante del piloto. No se ha demostrado dependencia técnica directa.

## 1. Principio aplicado

La directiva §3 faculta excluir `MED-*`, `TRD-*` y sistemas externos salvo dependencia técnica directa demostrable. No basta con que un sistema exista en el ROADMAP: debe ser **necesario para producir, asignar, recoger o reconciliar un huevo del piloto**.

## 2. Evaluación sistema por sistema

| Sistema excluido | ¿Interviene en alguna de las 8 compuertas del chequeo? | ¿Necesario para persistir/reconciliar? | Evidencia | Veredicto |
|---|---|---|---|---|
| Marketplace / subastas | No | No | `TRD-*` sin texto local; sin código; huevos `SIMULATED_LOG_ONLY` | EXCLUIDO |
| Cable Link / GTS | No | No | `DemoRestriction trade` en `egg-pair-domain.ts:161` es solo restricción de dominio; sin flujo HTTP | EXCLUIDO |
| Centro Pokémon | No | No | Sin tablas ni endpoints; `MED-01…08` sin contrato | EXCLUIDO |
| Economía / Guardipuntos / deudas | No | No | Solo `MONETIZATION_DESIGN_RFC.md:21-30` y `ROADMAP.md:58-66` (`PROPOSED`); sin código | EXCLUIDO |
| Antifraude comercial | No | No | `BREEDING_DESIGN_RFC.md:62-73` y `ROADMAP.md:52-54` `PROPUESTO`; sin código | EXCLUIDO |
| Recompensas comerciales | No | No | Entrega del piloto es 1+1 por consenso (`BREEDING_DESIGN_RFC.md:18`), sin premio ni moneda | EXCLUIDO |
| Misiones / prestigio | No | No | Sin contrato ni código | EXCLUIDO |
| Crianza Gen III–V | No | No | `gen2-gs`/`gen2-crystal` únicos (V4 §3) | EXCLUIDO |
| Simulación offline pública / online | No | No | `PG-08G → PG-09F` (`ROADMAP.md:71-78`), fuera del modo local | EXCLUIDO |

Las ocho compuertas del `BreedingCheck` son: pareja Gen II válida, procedencia, permisos vigentes, `GameKey`, Hungry de A, Hungry de B, capacidad pendiente de A y de B. Ninguna lee monedas, deudas, rareza, reputación ni estado médico.

## 3. La única dependencia cruzada real (y por qué no bloquea)

`BREEDING_DESIGN_RFC.md` y `ROADMAP.md:71-78` registran la cadena `PG-09D/E → PG-10A`: la incubación podía acelerarse con Guardipuntos. Es una **dependencia de aceleración**, no de existencia: solo aparece si se implementa incubación con duración.

Como la incubación queda **diferida** (`UNKNOWN_HATCH_COOLDOWN`), la dependencia con economía desaparece del piloto. No se necesita ninguna moneda, precio ni compra para producir, asignar, recoger o persistir huevos. Si en el futuro se resuelve el cooldown y se quiere aceleración con GP, eso será un cambio posterior con su propia decisión; no reactiva este bloqueo.

## 4. Aislamiento técnico demostrado

- Stores de prueba usan SQLite **aislada** y rechazan `data/pokegotchi.db` explícitamente (`shared-egg-store.ts:242-243`, `shared-egg-pair-store.ts:219-220`).
- No hay endpoints HTTP de crianza en `apps/server/src/index.ts` (`Bun.serve` :428); el piloto no depende de la API actual.
- No se escriben saves, PKM ni fixtures; no se toca inventario de objetos ni PC Boxes (`main.ts:368-392`).
- RNG HMAC y reloj inyectados: sin servicios externos, sin reloj de pared, sin red.
- Los dominios `egg-domain.ts`, `egg-pair-domain.ts`, `breeding-engine.ts` son puros y compilables sin economía ni comercio.

## 5. Consecuencia para la-planeación

El plan `PLAN-PG08G3-POR-ETAPAS.md` no incluye etapas de economía, comercio ni centro Pokémon. Las etapas G3-A…D y G3-F…I son independientes de incubación y de sistemas excluidos. G3-E (incubación) está bloqueada por decisión humana, **no** por dependencia comercial.
