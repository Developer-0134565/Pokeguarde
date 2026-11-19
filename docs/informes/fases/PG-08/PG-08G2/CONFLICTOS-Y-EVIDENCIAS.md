# PG-08G.2 — Conflictos de investigación y evidencias

Este documento resuelve, cuando hay evidencia suficiente, los conflictos
abiertos en PG-08G.1, y **conserva como `CONFLICTING` o `UNKNOWN` lo que no se
puede cerrar**. Nada de lo aquí escrito se ha implementado.

## 0. Método y límites

- `websearch` devuelve HTTP 402 en este entorno y Bulbapedia responde 403 a
  peticiones directas; la lectura se hizo vía
  `https://r.jina.ai/https://bulbapedia.bulbagarden.net/wiki/<Página>`,
  contrastando con Serebii.
- **No se consultó ninguna fuente primaria** (desensamblado, decompilación,
  volcado de ROM). Las resoluciones se apoyan en consistencia de fuentes
  secundarias y en aritmética verificable, y se declaran como tales.
- Criterio de cierre: una regla pasa a `VERIFIED` cuando hay cita explícita y
  coherente en al menos una fuente y ninguna fuente de peso la contradice sin
  explicación; si hay contradicción entre páginas, se documenta y se adopta la
  **lectura conservadora** (la que no promete más de lo demostrado).

## 1. Masuda en Gen IV — resuelto: 5/8192

| Aspecto | Resultado |
|---|---|
| Regla | 4 *rerolls* + 1 tirada base = **5 tiradas** |
| Probabilidad | `1 − (8191/8192)^5` = **1/1638,80** ≈ 1/1639 |
| Diferencia DP/Pt vs HGSS | **Ninguna** en número de rerolls |
| Fuente del conflicto | Serebii publica **1/2048** |

Citas:

- *Masuda method*: «Because the rerolls are in addition to the standard roll,
  the total number of rolls is one higher than the number of rerolls.»
- *Pokémon breeding*: «…generating **up to four additional personality
  values** … approximately **five times** as likely to be Shiny (approximately
  5/8192 or 1/1639).»

**Por qué Serebii dice 1/2048:** 1/2048 corresponde a **4 tiradas**, es decir
cuenta solo los *rerolls* y omite la base. Sus propias cifras de Gen V
(1/1366 = 6 tiradas) y de Gen VI sí incluyen la tirada base, lo que delata que
la inconsistencia es solo en su fila de Gen IV.

**Estado:** `VERIFIED` (fuente secundaria consistente). Serebii queda
documentado como *outlier* de modelo, no como regla alternativa.

## 2. Masuda en Gen V y Shiny Charm — resuelto, con corrección de supuesto

| Caso | Rerolls | Tiradas | Probabilidad |
|---|---:|---:|---|
| Gen V, Masuda solo | 5 | 6 | 6/8192 = **1/1365,75** |
| Gen V, Shiny Charm solo | 2 | 3 | 3/8192 ≈ **1/2731** |
| Gen V, Masuda + Charm | 7 | 8 | 8/8192 ≈ **1/1024** |

- **El Shiny Charm no existe en Black/White.** Fue «introduced in Pokémon Black 2
  and White 2»; añade dos *personality values* y funciona tanto en salvaje como
  criando.
- Los efectos **se apilan**: *breeding* lo dice explícitamente («their rerolls
  stack, resulting in seven additional personality values … approximately
  8/8192 or 1/1024»).

**Corrección de supuesto:** el Charm es un **modificador por juego**
(`gen5-b2w2`), no una propiedad de la generación V. Modelarlo por
`generation: 5` produciría un B/W con Charm, que es imposible.

**Estado:** `VERIFIED`.

## 3. Lista de inciensos — resuelto: nueve objetos

| Incienso | Debut | Pareja | Bebé |
|---|---|---|---|
| Sea Incense | **III** | Marill / Azumarill | Azurill |
| Lax Incense | **III** | Wobbuffet | Wynaut |
| Rose Incense | IV | Roselia / Roserade | Budew |
| Pure Incense | IV | Chimecho | Chingling |
| Rock Incense | IV | Sudowoodo | Bonsly |
| Odd Incense | IV | Mr. Mime | Mime Jr. |
| Luck Incense | IV | Chansey / Blissey | Happiny |
| Wave Incense | IV | Mantine | Mantyke |
| Full Incense | IV | Snorlax | Munchlax |

- **Lo puede llevar cualquiera de los dos progenitores**, no solo la madre
  («If held by **either parent** of a pairing of Marill or Azumarill…»).
- Disponibilidad en Gen III: **Sea** y **Lax** (Lost Cave en FR/LG, Mt. Pyre en
  R/S/E). Los demás bebés no existen en Gen III.

**Consecuencia legal:** un Azurill o Wynaut con origen Gen III exige el incienso
en el huevo; un Budew, Chingling, Bonsly, Mime Jr., Happiny, Mantyke o Munchlax
**no puede** tener origen Gen III en ningún caso.

**Estado:** `VERIFIED` (lista cerrada).

## 4. Herencia de forma en Gen III–V — resuelto, pero no es una sola regla

| Especie | Regla | Confianza |
|---|---|---|
| Burmy | Cloak de la **madre**; con Ditto, el del progenitor no-Ditto; **Mothim + Ditto → Plant Cloak** | VERIFIED |
| Shellos / Gastrodon | Forma de la **madre**; con Ditto, la del padre no-Ditto | VERIFIED |
| Basculin | Forma de la **madre**; con Ditto, la del no-Ditto (solo Red/Blue-Striped en Gen V) | VERIFIED |
| Deerling / Sawsbuck | **No hereda**: nace con la estación actual y cambia de forma al cambiar estación | VERIFIED |
| Rotom | Siempre forma normal | VERIFIED |

**Matiz de diseño:** «forma heredada» (Burmy, Shellos, Basculin) y «forma fijada
por el entorno» (Deerling) son mecanismos distintos y **no deben compartir
implementación**. La primera lee un campo del progenitor; la segunda se resuelve
con el reloj/estación en el momento de la eclosión.

La regla moderna de formas regionales con Everstone **no aplica** en Gen I–V.
White-Striped Basculin es Gen VIII y queda fuera de alcance.

**Estado:** `VERIFIED`.

## 5. Everstone y naturaleza — resuelto con una contradicción declarada

| Juego | Regla |
|---|---|
| R/S/FRLG | Sin efecto |
| Emerald | Madre (o Ditto) con Everstone → **50 %** |
| DP/Pt | Igual que Emerald, pero **no funciona si los padres tienen distinto idioma original** |
| HGSS | **Cualquier** portador → 50 %, sin importar sexo ni Ditto |
| B/W | Como HGSS y **ya funciona entre idiomas** |
| B2/W2 | **100 %** del portador; si ambos lo llevan, se elige al azar |

**Contradicción detectada entre dos páginas de la misma fuente:**

- *Masuda method*: «In Generation IV only, if the Masuda method applies, the
  Everstone will fail to increase the chance of passing on a Nature. This is due
  to Nature and Shininess both being determined by the personality value.»
- *Pokémon breeding*: atribuye la única restricción de Gen IV a DP/Pt con
  distinto idioma y describe HGSS sin limitación alguna.

Las dos no pueden ser ciertas para HGSS.

**Lectura conservadora adoptada:** en **todo Gen IV**, si aplica Masuda
(idiomas distintos), **no hay bonus de naturaleza por Everstone**. Razón: la
explicación técnica (naturaleza y brillo derivan del mismo PID) es estructural y
no depende de la versión; la otra redacción parece incremental. Además esta
lectura **no sobreestima** lo que el motor puede prometer.

**Estado:** `VERIFIED` para R/S/FRLG, Emerald, DP/Pt, B/W y B2/W2;
**`CONFLICTING`** para la interacción Everstone + Masuda en HGSS.

## 6. Destiny Knot — resuelto: sin efecto en crianza hasta Gen VI

- «**From Generation VI onward**, if held by a Pokémon in a Day Care … inherit 5
  of their IVs from their parents.»
- En Gen IV/V su único efecto es de batalla (si el portador se enamora, el rival
  también). Las descripciones del objeto en DP/Pt/HGSS y B/W/B2W2 solo mencionan
  el enamoramiento.
- Adquisición: DP/Pt Route 224, HGSS Route 27, B/W Opelucid City, B2W2 Castelia
  City.

**Consecuencia:** en Gen IV/V, Destiny Knot + Power Items **no** producen 5–6
IVs. Cualquier diseño que lo asuma importa una mecánica de Gen VI.

**Estado:** `VERIFIED`.

## 7. Aritmética consolidada del shiny

`P = 1 − (8191/8192)^n`, donde `n` = tiradas totales = rerolls + 1.

| n | Exacto | Lineal 8192/n | Caso |
|---:|---|---|---|
| 1 | 1/8192 | 1/8192 | base Gen II–V |
| 3 | **1/2731,00** | 1/2730,67 | Shiny Charm (solo B2/W2) |
| 4 | 1/2048,38 | 1/2048 | **modelo erróneo de Serebii para Gen IV** |
| 5 | **1/1638,80** | 1/1638,40 | **Masuda Gen IV** |
| 6 | **1/1365,75** | 1/1365,33 | **Masuda Gen V** |
| 8 | **1/1024,44** | 1/1024 | **Masuda + Charm (B2/W2)** |

Recomendación de presentación: mostrar la fracción (`8/8192`) y no un decimal
con cuatro cifras, porque el valor exacto no es un entero de tiradas.

## 8. Conflictos que siguen abiertos

| Punto | Estado | Por qué no se cierra |
|---|---|---|
| Número de rerolls de Masuda con **fuente primaria** | `UNKNOWN` | No se consultó desensamblado de Gen IV/V; ver §11 para Gen II/III |
| Everstone + Masuda en **HGSS** | `CONFLICTING` | Contradicción interna de Bulbapedia |
| Prioridad exacta de movimientos en **Gen II** | `VERIFIED POR CÓDIGO` (§11.1), **en conflicto con la prosa** | El desensamblado resuelve el algoritmo; la «lista de prioridad» de Bulbapedia es de Gen VI+ |
| Detalle del algoritmo de IVs en **Emerald** | `VERIFIED POR CÓDIGO` (§11.5), **en conflicto con la prosa** | `InheritIVs` tiene un bug documentado en el propio código que la prosa no describe |
| Caso «hembra con habilidad oculta en un juego donde la especie no tiene slot oculto» | `PARCIAL` (§11.7) | Inferencia razonable (0 %), sin cita explícita |
| Herencia de **amistad** en huevos | `UNKNOWN` | No cubierta por las fuentes consultadas |
| **Tasas de aparición** de huevo en Gen V | `PARTIALLY VERIFIED` | Sección marcada como incompleta; no se usará como temporizador de PG-08D |
| Naturaleza Gen IV/V más allá de Emerald; formas alternativas; Poké Balls; movimientos de evento | `UNKNOWN` | Fuera del alcance de las dos revisiones |

## 9. Cambios propuestos a `MATRIZ-GENERACIONES.md` (NO aplicados)

La matriz de PG-08G.1 se deja **intacta** para no reescribir un informe
histórico. Las correcciones viven en este documento y en
`MATRIZ-JUEGOS-Y-VERSIONES.md`, que es la referencia vigente para el diseño.

| Fila de PG-08G.1 | Antes | Ahora |
|---|---|---|
| Masuda Gen IV | CONFLICTING | **VERIFIED 5/8192**; Serebii como outlier |
| Lista de inciensos | PARTIALLY VERIFIED | **VERIFIED**: 9 objetos; Sea/Lax en Gen III |
| Herencia de forma Gen III–V | PARTIALLY / UNKNOWN | **VERIFIED** con tabla por especie y distinción heredada/estacional |
| Formas Gen IV | «no está clara» | tabla de §4 |
| Formas Gen V | PARTIALLY | **VERIFIED** (Deerling estacional, Basculin materno) |
| Shiny Gen V | «Charm solo B2/W2» | se añade: el Charm es **modificador por juego**, no por generación |
| Naturaleza Gen IV/V | sin nota de interacción | «Masuda + Everstone en Gen IV: sin bonus» (lectura conservadora) |
| Resumen fila 9 | «Masuda (cifra en conflicto)» | cifras de §7 |

## 10. Efecto sobre el diseño de PG-08G.2

1. `ShinyRules.masudaRate` puede dejar de ser `'CONFLICTING'` y pasar a
   `{ rerolls: 4, rolls: 5 }` para Gen IV y `{ rerolls: 5, rolls: 6 }` para Gen V.
2. `ShinyRules.shinyCharm` deja de ser un booleano de generación y pasa a ser un
   **modificador por `GameKey`** (`gen5-b2w2` únicamente).
3. `SpeciesRules.incenseBabies` deja de ser `'UNVERIFIED'` y pasa a una tabla de
   nueve entradas con su generación de debut y su condición «cualquier
   progenitor».
4. `SpeciesRules` gana un campo de forma: `formSource: 'none' | 'mother' |
   'season'`, porque Deerling no se resuelve igual que Burmy.
5. `NatureRules` gana la restricción `masudaBlocksEverstone: true` para Gen IV.
6. `ItemRules.destinyKnotBreedingEffect` se mantiene `false` con evidencia
   explícita.

Ninguno de estos cambios se ha aplicado al código: siguen siendo especificación.

## 11. Revisión con fuente primaria: desensamblados Gen II y Gen III

Segunda revisión independiente (subagente `ses_e0b3b6f03ffeiSQMqtnxeh2t2m`),
READ-ONLY. Aquí **sí** se consultó código ejecutable como autoridad algorítmica:

- `https://raw.githubusercontent.com/pret/pokecrystal/master/engine/pokemon/breeding.asm`
- `https://raw.githubusercontent.com/pret/pokecrystal/master/engine/events/daycare.asm`
- `https://raw.githubusercontent.com/pret/pokecrystal/master/engine/pokemon/mon_stats.asm`
- `https://raw.githubusercontent.com/pret/pokecrystal/master/constants/pokemon_data_constants.asm`
- `https://raw.githubusercontent.com/pret/pokeemerald/master/src/daycare.c`

Contrastado con Bulbapedia (*Pokémon breeding*, *Egg Move*, *Shiny Pokémon*,
*Gender*, *Phione (Pokémon)*) y Serebii. Donde código y prosa discrepan, manda el
código y la prosa queda marcada como simplificación de generación posterior.

### 11.1 Gen II — movimientos heredados: no hay «lista de prioridad»

**VERIFICADO por código; EN CONFLICTO con la prosa.**

1. `FillMoves` (nivel ≤ 5) llena `wEggMonMoves` con hasta 4 movimientos por
   defecto.
2. `InitEggMoves` recorre **en orden los 4 slots del progenitor heritable**
   (el padre; ver 11.3), descarta duplicados contra la lista actual y hereda si:
   - (a) está en la lista de *egg moves* de la cría; **o**
   - (b) **ambos** progenitores lo conocen **y** está en la lista de nivel de la
     cría — **sin tope de nivel** (un movimiento de nivel 50 se hereda); **o**
   - (c) es MT/MO que la cría puede aprender (`CanLearnTMHMMove`).
3. `LoadEggMove` escribe en el primer hueco libre; si está lleno, **desplaza a la
   izquierda, descarta el slot 1 (FIFO)** y añade al final; recalcula PP.

Orden final = `[defecto nivel ≤ 5 ++ heredados en orden de slot del padre]`,
**truncado a los 4 últimos**. La supuesta prioridad «Volt Tackle → egg moves de
la madre → del padre → MT/MO → nivel → defecto» pertenece a **Gen VI+**, no a
Gen II–V. Efecto en el diseño: `MoveRules.priorityVerified` pasa a `true` con
`strategy: 'insertion_fifo_truncate'`; la prueba MOVE-08 cambia de
`MOVE_PRIORITY_UNVERIFIED` a `MOVE_ORDER_FIFO`.

### 11.2 Gen II — incompatibilidad por DVs (confirma §0 anterior, con precisión)

**VERIFICADO.** Se rechaza (compatibilidad `255` = nunca hay huevo) si el DV de
**Defensa coincide** *y* **los 3 bits bajos del DV Especial coinciden**
(`and %1111` / `and %111` en `CheckBreedmonCompatibility/.CheckDVs`). Aplica a
toda pareja válida, **incluida la que lleva Ditto**. Dos Ditto se rechazan antes
(compatibilidad `0`). Misma especie y mismo ID solo cambian la probabilidad, no
bloquean. Dos Pokémon shiny nunca crían: consecuencia directa de esta regla.

### 11.3 Gen II — herencia de DVs y progenitor elegido (matiz nuevo)

**VERIFICADO.** Se generan 4 DVs aleatorios 0–15; después: Atk y Spe quedan
aleatorios; Def = Def del progenitor elegido; Especial =
`(bit_aleatorio << 3) | (Especial_progenitor & 0b111)` → 50 % idéntico, 50 % ±8;
HP derivado.

Progenitor elegido: el de **sexo opuesto al bebé**; **si hay Ditto, siempre el
Ditto**; **si el bebé es sin género, no hereda nada** (`SkipDVs`).

**Hallazgo nuevo no documentado en Bulbapedia:** con **hembra + Ditto**, el
progenitor heritable es el Ditto, cuyo conjunto de movimientos heritables está
vacío → **no se hereda ningún movimiento** (ni egg moves ni MT/MO). VERIFICADO
por código.

### 11.4 Gen II — sexo y shiny (confirma §0 anterior)

**VERIFICADO.** Hembra si `DV_Ataque ≤ umbral`, con umbrales 1 (7:1), 3 (3:1),
7 (1:1), 11 (1:3). El juego compara `(Atk << 4) | Spe` contra 31/63/127/191,
equivalente a esos umbrales. Especies 100 % macho/hembra/sin género ignoran el
cálculo. Shiny: `Def = Spe = Esp = 10` y `Atk ∈ {2,3,6,7,10,11,14,15}` →
8/65536 = 1/8192; progenitor shiny de sexo opuesto → 1/64 (exclusivo Gen II).

### 11.5 Gen III — bug real en la herencia de IVs

**VERIFICADO por código; EN CONFLICTO con la prosa.**

`InheritIVs` elige **3 índices de stat** de `[0..5]` y sortea el progenitor para
cada uno (50/50, Ditto incluido); el resto son aleatorios 0–31. El propio código
lleva un comentario `BUG:`: al elegir, elimina de la lista la **posición `i`**
(0, 1, 2) en lugar del **índice elegido**. Efectos: HP y Defensa quedan
**infrarrepresentados** y un stat **puede repetirse** (a veces solo 2 stats
distintos). R/S/FRLG tienen un bug análogo:
`RemoveIVIndexFromList(availableIVs, selectedIvs[i])` pasa un índice de stat
donde se espera una posición.

La descripción de Bulbapedia («paso 1 cualquier IV, paso 2 cualquiera menos HP,
paso 3 cualquiera menos HP/Defensa») es una **simplificación**, no el código.
Efecto en el diseño: `InheritanceRules.mode = 'emerald_overrides'` debe
documentar el bug y la prueba IV-03 debe comprobar la distribución con el bug,
no los «3 pasos decrecientes».

### 11.6 Volt Tackle (confirma §0 anterior con detalle de orden)

**VERIFICADO.** Solo si la cría es **Pichu** y **cualquiera** de los dos
progenitores lleva **Light Ball**. Se aplica **después** del resto del set: si ya
hay 4 movimientos, se descarta el **primero**. Desde **Emerald** (no en
R/S/FRLG); sí en Gen IV/V. No es un *egg move* normal.

### 11.7 Gen V — habilidades (confirma §0 anterior)

**VERIFICADO salvo un caso PARCIAL.** B/W: hembra + macho con habilidad no
oculta → no se hereda (50/50 entre slots); hembra con oculta + macho → 60 %
oculta. B2/W2: hembra + macho no oculta → 80 % del **mismo slot** que la madre;
oculta → 80 %. Con **Ditto** nunca se hereda habilidad en ninguno de los dos
juegos; machos y genderless nunca transmiten. Si no se hereda la oculta, solo
entran en juego las no ocultas; si la especie tiene un solo slot, el sorteo es
irrelevante. Caso **PARCIAL**: hembra con oculta en un juego donde la especie aún
no tiene slot oculto → 0 % por inferencia, sin cita explícita.

### 11.8 Gen V — movimientos huevo (confirma §0 anterior)

**VERIFICADO, sin cambios respecto a Gen IV.** El **padre** transmite egg moves
y MT/MO; la **madre no transmite egg moves** (empieza en Gen VI); tutores **solo
en Crystal**, nunca en Gen IV/V; si ambos conocen un movimiento de la lista de
nivel de la cría, se hereda; por defecto nivel 1 en Gen IV+ (≤ 5 en Gen II/III).
Gen V no añadió ningún mecanismo nuevo de movimientos, a diferencia de las
habilidades.

### 11.9 Especies especiales (confirma y amplía §0 anterior)

**VERIFICADO.** Nidoran♀ → 50 % Nidoran♀ / 50 % Nidoran♂ (Gen II `Random() < 50`;
Gen III bit `EGG_GENDER_MALE` del PID; el padre no influye). Illumise → 50 %
Volbeat (Gen III+). Ditto + Ditto prohibido. Genderless solo con Ditto. Manaphy +
Ditto → Phione; Phione + Ditto → Phione; **nunca Manaphy** (Gen IV+). Bebés =
primera etapa de la línea de la madre (Gen II aplica `GetPreEvolution` **dos
veces**). Inciensos Gen III+: sin incienso nace la forma evolucionada (Azurill
Sea, Wynaut Lax, Mime Jr. Odd, Bonsly Rock, Mantyke Wave, Happiny Luck, Budew
Rose, Chingling Pure); basta cualquiera de los dos progenitores. Fuentes de
código: `daycare.asm`, `daycare.c → DetermineEggSpeciesAndParentSlots` y
`AlterEggSpeciesWithIncenseItem`.

### 11.10 Desviaciones que el futuro motor debe codificar

1. Orden de movimientos = inserción + FIFO truncado, **no** lista de prioridad.
2. Gen II **sin tope de nivel** para herencia de movimientos compartidos.
3. Gen II hembra + Ditto → **no hereda movimientos** (progenitor heritable =
   Ditto, conjunto vacío).
4. Gen II bebé sin género → **no hereda DVs** (`SkipDVs`).
5. Gen III: 3 índices sorteados con el **bug de eliminación**, no 3 pasos
   decrecientes.
6. Dos Pokémon shiny nunca crían (consecuencia de la regla de Def DV).

### 11.11 Efecto agregado sobre el diseño

Además de los seis cambios de §10:

7. `MoveRules` gana `strategy: 'insertion_fifo_truncate'` y `levelCap: null` en
   Gen II, `priorityVerified: true` con fuente primaria.
8. `StatResolver` (Gen III) debe reproducir el bug de `InheritIVs` o declarar
   explícitamente que se modela la intención, no el bug; esto es una decisión de
   fidelidad pendiente.
9. `SpeciesRules` gana `genderlessInheritsDvs: false` para Gen II.
10. `CompatibilityVerdict` conserva `KINSHIP_DV_MATCH` y añade documentación de
    que dos shinies caen necesariamente en ella.

**Nada de esto se ha aplicado al código de producción.**
