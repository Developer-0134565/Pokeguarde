# PG-08G.2E — HUNGRY Y OFFLINE

## 1. Decisión BR-03

Ambos Pokémon deben cumplir:

`HungryActual / HungryMax >= 0.70`

Si cualquiera no cumple, el chequeo no produce huevos.

## 2. Evidencia verificada en el repositorio

- No existen literales `HungryActual`, `HungryMax` ni un campo `hunger` en los
  tipos de crianza de `packages/core/src`.
- El motor Tamagotchi usa `PetState.hunger`, con valores 0..100:
  - `apps/web/src/pet-engine.ts:68` declara `hunger: number`.
  - `apps/web/src/pet-engine.ts:180` inicializa `hunger: 82`.
  - `apps/web/src/pet-engine.ts:218-303` implementa `advance(state, profile, now)`.
- Decaimiento offline verificado en `advance`:
  - dormido: `hunger -= 1.7 * traits.appetite * nature.appetite * hours`
    (`pet-engine.ts:249`);
  - despierto: `hunger -= 3.6 * traits.appetite * nature.appetite * hours`
    (`pet-engine.ts:259`);
  - el salto se divide en bloques de 15 minutos (`pet-engine.ts:238`);
  - la puesta al día se acota a `MAX_CATCHUP_MS` (7 días en el motor actual);
    si el tiempo total excede esa ventana, se registra la nota de recorte
    (`pet-engine.ts:222,299-301`).
- `packages/core/src/breeding-engine.ts:114-123` define `PairMember` con
  `stayId`, `pokemonId`, `species`, `generation`, `ownerId`, `hostId`,
  `permissions` y `revision`; **no** expone hambre.

Consecuencia: el umbral 0.70 es una decisión de producto válida, pero hoy no
existe una proyección de Hungry en el dominio de crianza. Debe crearse en el
futuro piloto; no se inventa aquí ningún valor histórico.

## 3. Mapeo del ratio

**Propuesta (PROPOSED):** `HungryActual = PetState.hunger` y
`HungryMax = 100`, de modo que el umbral 0.70 equivale a `hunger >= 70`.

No se ha marcado como decidido porque los nombres BR-03 no aparecen en el
código y porque un Pokémon depositado podría tener una representación de
hambre distinta de la mascota local. Requiere confirmación humana.

## 4. Evaluación durante una ausencia

Regla recomendada (PROPOSED):

1. Reconstituir el hambre de cada progenitor en el instante de **cada chequeo**
   horario mediante la misma función determinista `advance`, con el perfil y
   la marca de tiempo persistidos.
2. Evaluar el ratio en ese instante, no solo al final de la ausencia.
3. Si cualquiera de los dos está por debajo de 0.70, registrar
   `CHECK_HUNGRY_BELOW_THRESHOLD` con el ratio calculado y no producir.
4. No fabricar valores pasados: si no hay perfil o marca suficiente, el chequeo
   termina en `CHECK_UNKNOWN_HUNGRY` y falla cerrado.

## 5. Qué ocurre si Hungry cambia durante la ausencia

El hambre puede caer por debajo del umbral a mitad de una ausencia y, en
teoría, volver a subir si la mascota come durante el periodo (acción que hoy
requiere intervención y no se simula en el motor de crianza). Con la regla
anterior, cada chequeo ve su propia instantánea; un chequeo posterior podría
volver a producir si el hambre se recuperó y se registró esa acción.

No se adopta la alternativa de «usar el hambre final», porque perdería los
chequeos intermedios y contradice BR-02. Tampoco se adopta «usar el hambre
inicial», porque ignoraría el decaimiento verificado.

## 6. Conflicto de ventanas

Existen tres ventanas distintas:

| Ventana | Origen | Uso |
|---|---|---|
| 7 días | `pet-engine.ts` `MAX_CATCHUP_MS` | Puesta al día del Tamagotchi local. |
| 24 horas | BR-07 / R-B4 `maxWindowMs = 86400000` | Reconciliación de crianza por ventana. |
| 72 horas | caso límite de la misión | Debe procesarse sin perder chequeos. |

No se debe copiar el valor de 7 días al motor de crianza ni descartar las
últimas 48 horas de una ausencia de 72 horas. La resolución propuesta es
procesar tres ventanas consecutivas de 24 horas con `checkId` determinista y
marcas persistidas; ver `CONFLICTOS-Y-DECISIONES.md`.

## 7. Decisión humana pendiente

Confirmar el mapeo `HungryActual/HungryMax` y la proyección desde `PairMember`
o desde `PetState`. Sin esa decisión, la comprobación BR-03 no puede
implementarse de forma verificable.
