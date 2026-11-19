# PG-08G.1 — Matriz de reglas de crianza Gen I–V

**Alcance:** reglas originales de los juegos cubiertos por Pokeguarde (Gen I–V).
No se aplican mecánicas de Gen VI+ (Destiny Knot con 5 IVs, Pokémon Nursery,
etc.). Cada fila indica evidencia y confianza; **ninguna regla se implementó**
en esta fase.

Fuentes principales consultadas (19-nov-2026):

- Bulbapedia, *Pokémon breeding*:
  `https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_breeding`
  (acceso vía `r.jina.ai` por bloqueo 403 directo).
- Bulbapedia, *Time Capsule*, *Individual values*, *Shiny Pokémon*,
  *Power item*, *Destiny Knot*.
- Serebii, `https://www.serebii.net/games/breed.shtml` y páginas de IV/DV,
  habilidades ocultas y shiny.
- PKHeX.Core 26.10.18 (auditoría propia en `PKHEX-AUDIT.md`).

Convenciones de confianza: **VERIFIED** (fuente explícita y coherente),
**PARTIALLY VERIFIED** (fuente incompleta o única), **CONFLICTING** (fuentes
discrepantes), **UNKNOWN**, **NOT APPLICABLE**.

## 0. Reglas que NO existen (evitar crianza retroactiva)

| Creencia | Realidad | Confianza |
|---|---|---|
| Crianza en Gen I (RB/Y) | No existe Day Care, huevo, sexo, naturaleza ni shiny. La crianza empieza en Gen II. | VERIFIED |
| Time Capsule en HGSS | Solo existe en G/S/C. | VERIFIED |
| Crianza Gen I/II → Gen III+ | No hay mecanismo oficial. Time Capsule es solo I↔II; después solo migración hacia delante (Pal Park, Poké Transfer). | VERIFIED |
| Destiny Knot da 5 IVs en Gen IV/V | Debuta en Gen IV, pero su efecto de crianza (5 IVs) empieza en Gen VI. En IV/V solo afecta a la atracción en batalla. | VERIFIED |
| Power Items en Gen III | Debutan en Gen IV; su efecto de crianza empieza en HGSS. | VERIFIED |
| Herencia de habilidades en Gen III/IV | No existe: el huevo recibe al azar una habilidad posible. | VERIFIED |
| Habilidad normal heredable en B/W | Solo se hereda la **oculta** (60 %); las normales no. | VERIFIED |
| Poké Ball especial heredada en Gen III–V | Siempre Poké Ball estándar. | VERIFIED |
| Power Item + Destiny Knot para 6 IVs | En Gen IV/V el Destiny Knot no interviene en crianza. | VERIFIED |

## 1. Matriz por generación

### Gen I — Red/Blue/Yellow

| Mecánica | Regla | Condiciones / excepciones | Evidencia | Confianza | Implementación |
|---|---|---|---|---|---|
| Compatibilidad | No aplica: no hay crianza. | Ninguna pareja produce huevo. | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| Grupos huevo | No aplica. | — | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| Especie del huevo | No aplica. | Cualquier huevo con met Gen I es imposible. | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| Sexo | No existe el atributo sexo en Gen I. | — | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| Naturaleza | No existe. | — | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| IVs | No existen IVs 0–31. | — | Bulbapedia Individual values | VERIFIED | NOT APPLICABLE |
| DVs | 4 DVs (Ataque, Defensa, Velocidad, Especial) de 0–15; HP se deriva de los bits bajos de los otros cuatro. | No hay DV de HP ni de Sp.Atk/Sp.Def separados. | Bulbapedia Individual values | VERIFIED | NO IMPLEMENTADO (solo lectura de saves existente) |
| Habilidades | No existen. | — | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| Shiny | No existe el concepto. | — | Bulbapedia Shiny | VERIFIED | NOT APPLICABLE |
| Movimientos huevo | No aplica. | — | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| Objetos de herencia | No aplica. | — | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| Ditto | No aplica a crianza. | — | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| Especies sin crianza | Todas, por ausencia de sistema. | — | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| Formas / excepciones | No aplica. | — | — | VERIFIED | NOT APPLICABLE |
| Compatibilidad entre generaciones | Time Capsule G/S/C ↔ RB/Y: sin Pokémon de Gen II ni huevos, sin Correo, sin movimientos de Gen II; cambio de tipo cancela salvo Magnemite/Magneton; objeto al llegar se deriva de la tasa de captura. Gen I → Gen III+ no existe. | No se puede criar un Pokémon de Gen I «retroactivamente». | Bulbapedia Time Capsule | VERIFIED | NO IMPLEMENTADO (bloqueo ya vigente en exportTargets) |

**Consecuencia legal:** un Pokémon de Gen I no puede criar ni producir huevos en
Pokeguarde. No se convierte su DV en IV ni se inventa un origen de crianza.

### Gen II — Gold/Silver/Crystal

| Mecánica | Regla | Condiciones / excepciones | Evidencia | Confianza | Implementación |
|---|---|---|---|---|---|
| Compatibilidad | Mismo Egg Group + sexos opuestos. | Ditto compatible con casi todo salvo Ditto; genderless solo con Ditto; No Eggs Discovered nunca cría. | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Grupos huevo | Datos por especie (15 grupos). | Se necesita la tabla por especie. | Bulbapedia Egg Group | VERIFIED | NO IMPLEMENTADO |
| Especie del huevo | Primer estado de la cadena de la madre (o del no-Ditto). | Nidoran♀/♂ y Volbeat/Illumise no aplican en Gen II (Volbeat/Illumise son Gen III). | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Sexo | Determinado por el **Attack DV** frente al ratio de la especie (♀ si DV ≤ ratio). | En ratio 7♂:1♀ una hembra tiene DV de ataque máximo 1. | Bulbapedia Individual values | VERIFIED | NO IMPLEMENTADO |
| Naturaleza | No existe en Gen II. | — | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| IVs | No aplica: se usan DVs. | — | Bulbapedia Individual values | VERIFIED | NOT APPLICABLE |
| DVs | Defensa se copia del progenitor de sexo opuesto (o Ditto); Especial se copia o ±8 (50 % igual); Ataque y Velocidad aleatorios; HP derivado. | Probabilidad de DVs idénticos al progenitor: 1/512. | Bulbapedia Breeding §Inheriting stats | VERIFIED | NO IMPLEMENTADO |
| Habilidades | No existen. | — | Bulbapedia Breeding | VERIFIED | NOT APPLICABLE |
| Shiny | Def=Vel=Esp=10 y Atk ∈ {2,3,6,7,10,11,14,15}; HP 0 u 8; 1/8192. | Progenitor shiny de sexo opuesto: hasta 1/64. Dos shinies no pueden criar (mismo Defense DV). | Bulbapedia Shiny | VERIFIED | NO IMPLEMENTADO |
| Movimientos huevo | Padre transmite egg moves; padre transmite TM/HM (y tutor en Crystal); ambos transmiten movimientos de nivel que el bebé aprende; por defecto, movimientos de nivel ≤5. | Prioridad si >4: Volt Tackle (no en Gen II), egg moves de la madre, egg moves del padre, TM/HM, nivel, por defecto. | Bulbapedia Breeding §Passing moves down | VERIFIED (prioridad exacta: PARTIALLY VERIFIED) | NO IMPLEMENTADO |
| Objetos de herencia | Everstone no hereda nada en Gen II; no hay Power Items ni Destiny Knot. | Everstone solo impide evolución por intercambio. | Bulbapedia Time Capsule / Breeding | VERIFIED | NOT APPLICABLE |
| Ditto | Compatible con casi todo; genderless solo con Ditto; Ditto+Ditto imposible. | El bebé es la especie del no-Ditto. | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Especies sin crianza | No Eggs Discovered (legendarios, bebés, etc.) y Ditto+Ditto. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Formas / excepciones | Nidoran♀/♂ 50/50; no hay incensarios (introducidos en Gen III). | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Compatibilidad entre generaciones | Time Capsule solo I↔II; no hay Gen II → III oficial. | Reglas de crianza de Gen II no se aplican a Gen III+. | Bulbapedia Time Capsule | VERIFIED | NO IMPLEMENTADO |

### Gen III — Ruby/Sapphire/Emerald/FireRed/LeafGreen

| Mecánica | Regla | Condiciones / excepciones | Evidencia | Confianza | Implementación |
|---|---|---|---|---|---|
| Compatibilidad | Mismo Egg Group + sexos opuestos; Ditto; genderless solo con Ditto; No Eggs Discovered nunca. | Sin la regla de DVs de Gen II. | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Grupos huevo | Tabla por especie; se usa el grupo, no el tipo. | — | Bulbapedia Egg Group | VERIFIED | NO IMPLEMENTADO |
| Especie del huevo | Primer estado de la cadena de la madre (o no-Ditto). | Nidoran♀/♂ y Volbeat/Illumise 50/50; bebés por incienso (p. ej. Marill + Sea Incense → Azurill). | Bulbapedia Breeding | VERIFIED (lista completa de inciensos: PARTIALLY VERIFIED) | NO IMPLEMENTADO |
| Sexo | Determinado por el PID, no por DVs. | No se hereda. | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Naturaleza | Aleatoria en R/S/FRLG. | En **Emerald**, si la madre (o Ditto) lleva Everstone, 50 % de heredar su naturaleza. | Bulbapedia Breeding §Inheriting Natures | VERIFIED | NO IMPLEMENTADO |
| IVs | 0–31, seis independientes. | — | Bulbapedia Individual values | VERIFIED | NO IMPLEMENTADO |
| DVs | No aplica. | — | — | NOT APPLICABLE | NOT APPLICABLE |
| Herencia de IVs | R/S/FRLG: exactamente **3 IVs** heredados, 3 aleatorios. Emerald: overrides; quedan **3–5 aleatorios**. | El mecanismo de Emerald puede sobrescribir un IV ya heredado. | Bulbapedia Breeding §Generation III | VERIFIED | NO IMPLEMENTADO |
| Habilidades | **No heredables**; se elige al azar entre las posibles. | — | Bulbapedia Breeding §Inheriting Abilities | VERIFIED | NO IMPLEMENTADO |
| Shiny | Determinado por PID e IDs; 1/8192. | No hay Masuda en Gen III. | Bulbapedia Shiny | VERIFIED | NO IMPLEMENTADO |
| Movimientos huevo | Padre transmite egg moves y TM/HM; ambos transmiten movimientos de nivel compartidos; por defecto nivel ≤5. | Emerald: Light Ball en cualquier progenitor → Pichu con Volt Tackle. | Bulbapedia Breeding §Passing moves down | VERIFIED | NO IMPLEMENTADO |
| Objetos de herencia | Solo Everstone en Emerald (naturaleza). No Power Items ni Destiny Knot. | En R/S/FRLG el Everstone no afecta a la crianza. | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Ditto | Igual que Gen II: casi todo, genderless, no con Ditto. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Especies sin crianza | No Eggs Discovered; Ditto+Ditto. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Formas / excepciones | Inciensos para bebés; formas regionales no existen aún. | Lista completa de inciensos pendiente de cotejo. | Bulbapedia Breeding | PARTIALLY VERIFIED | NO IMPLEMENTADO |
| Compatibilidad entre generaciones | Gen III → Gen IV por Pal Park; no hay Gen III → Gen II. | Las reglas de crianza no se heredan entre juegos. | AGENTS.md / Bulbapedia | VERIFIED | NO IMPLEMENTADO |

### Gen IV — Diamond/Pearl/Platinum/HeartGold/SoulSilver

| Mecánica | Regla | Condiciones / excepciones | Evidencia | Confianza | Implementación |
|---|---|---|---|---|---|
| Compatibilidad | Mismo Egg Group + sexos opuestos; Ditto; genderless solo con Ditto; No Eggs Discovered nunca. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Grupos huevo | Tabla por especie. | — | Bulbapedia Egg Group | VERIFIED | NO IMPLEMENTADO |
| Especie del huevo | Primer estado de la cadena de la madre (o no-Ditto); eclosión a nivel 1. | Nidoran♀/♂ y Volbeat/Illumise 50/50; bebés por incienso. | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Sexo | Determinado por el PID; no se hereda. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Naturaleza | DP/Pt: como Emerald (madre o Ditto con Everstone, 50 %), pero **falla si los padres tienen distinto idioma**. HGSS: cualquier portador, 50 %, sin restricción de sexo/Ditto. | — | Bulbapedia Breeding §Inheriting Natures | VERIFIED | NO IMPLEMENTADO |
| IVs | 0–31. | — | Bulbapedia Individual values | VERIFIED | NO IMPLEMENTADO |
| DVs | No aplica. | — | — | NOT APPLICABLE | NOT APPLICABLE |
| Herencia de IVs | DP/Pt: igual que Emerald (overrides, 3–5 aleatorios). HGSS: **3 IVs de stats distintas**, cada uno de un progenitor aleatorio; Power Items fuerzan el IV de su stat y los otros dos se eligen de stats distintas. | Si ambos llevan Power Item, se elige uno al azar. | Bulbapedia Breeding §Generation IV | VERIFIED | NO IMPLEMENTADO |
| Habilidades | **No heredables**; se elige al azar entre las posibles. | — | Bulbapedia Breeding §Inheriting Abilities | VERIFIED | NO IMPLEMENTADO |
| Shiny | PID + IDs; 1/8192. Masuda: 5 rolls ≈ 1/1639 (Bulbapedia) frente a 1/2048 (Serebii). | **CONFLICTING** en la cifra exacta; no fijar probabilidad sin nueva fuente. | Bulbapedia Shiny / Serebii | CONFLICTING (cifra) | NO IMPLEMENTADO |
| Movimientos huevo | Padre transmite egg moves, TM/HM y movimientos de nivel compartidos; Light Ball → Volt Tackle. | No se heredan movimientos de tutor en Gen IV. | Bulbapedia Breeding §Passing moves down | VERIFIED | NO IMPLEMENTADO |
| Objetos de herencia | Everstone (naturaleza) y Power Items (solo HGSS). **Destiny Knot no afecta a la crianza.** | Power Items no funcionan en DP/Pt. | Bulbapedia Power item / Destiny Knot | VERIFIED | NO IMPLEMENTADO |
| Ditto | Igual que Gen II/III. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Especies sin crianza | No Eggs Discovered; Ditto+Ditto. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Formas / excepciones | Inciensos; formas regionales no existen aún. Herencia de forma no está clara en las fuentes para Gen IV. | — | Bulbapedia Breeding | PARTIALLY VERIFIED / UNKNOWN | NO IMPLEMENTADO |
| Compatibilidad entre generaciones | Gen IV → Gen V por Poké Transfer; no hay Gen IV → Gen III. | — | AGENTS.md | VERIFIED | NO IMPLEMENTADO |

### Gen V — Black/White / Black 2/White 2

| Mecánica | Regla | Condiciones / excepciones | Evidencia | Confianza | Implementación |
|---|---|---|---|---|---|
| Compatibilidad | Mismo Egg Group + sexos opuestos; Ditto; genderless solo con Ditto; No Eggs Discovered nunca. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Grupos huevo | Tabla por especie. | — | Bulbapedia Egg Group | VERIFIED | NO IMPLEMENTADO |
| Especie del huevo | Primer estado de la cadena de la madre (o no-Ditto); eclosión a nivel 1. | Nidoran♀/♂ y Volbeat/Illumise 50/50; bebés por incienso. | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Sexo | Determinado por el PID; no se hereda. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Naturaleza | B/W: como HGSS (cualquier portador, 50 %), y ya funciona con distinto idioma. B2/W2: **100 %** del portador; si ambos llevan Everstone, se elige al azar. | — | Bulbapedia Breeding §Inheriting Natures | VERIFIED | NO IMPLEMENTADO |
| IVs | 0–31. | — | Bulbapedia Individual values | VERIFIED | NO IMPLEMENTADO |
| DVs | No aplica. | — | — | NOT APPLICABLE | NOT APPLICABLE |
| Herencia de IVs | Igual que HGSS: 3 IVs de stats distintas + Power Items. | Destiny Knot no interviene. | Bulbapedia Breeding §Generation V | VERIFIED | NO IMPLEMENTADO |
| Habilidades | B/W: habilidad normal **no** se hereda; oculta 60 % si la hembra la tiene y cría con macho (no con Ditto). B2/W2: normal 80 % si la hembra cría con macho (no con Ditto); oculta 80 %. Machos y genderless no transmiten. | Si no se hereda oculta, solo puede nacer con habilidad no oculta. | Bulbapedia Breeding §Inheriting Abilities | VERIFIED | NO IMPLEMENTADO |
| Shiny | PID + IDs; 1/8192. Masuda: 6 rolls ≈ 1/1366. Shiny Charm solo B2/W2: 3 rolls ≈ 1/2731; Masuda + Charm: 8 rolls ≈ 1/1024. | — | Bulbapedia Shiny | VERIFIED | NO IMPLEMENTADO |
| Movimientos huevo | Padre transmite egg moves, TM/HM y movimientos de nivel compartidos; Light Ball → Volt Tackle. | — | Bulbapedia Breeding §Passing moves down | VERIFIED | NO IMPLEMENTADO |
| Objetos de herencia | Everstone (naturaleza) y Power Items. **Destiny Knot no afecta a la crianza.** | — | Bulbapedia Power item / Destiny Knot | VERIFIED | NO IMPLEMENTADO |
| Ditto | Igual que Gen II–IV. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Especies sin crianza | No Eggs Discovered; Ditto+Ditto. | — | Bulbapedia Breeding | VERIFIED | NO IMPLEMENTADO |
| Formas / excepciones | Inciensos; formas regionales no existen aún. Herencia de forma en Gen V: PARTIALLY VERIFIED. | — | Bulbapedia Breeding | PARTIALLY VERIFIED | NO IMPLEMENTADO |
| Compatibilidad entre generaciones | Gen V → Gen VI/VII por Bank (fuera de alcance); no hay Gen V → Gen IV. | — | AGENTS.md | VERIFIED | NO IMPLEMENTADO |

## 2. Resumen de mecánicas obligatorias

| # | Mecánica | Gen I | Gen II | Gen III | Gen IV | Gen V |
|---|---|---|---|---|---|---|
| 1 | Compatibilidad | N/A | Egg Group + sexo opuesto; Ditto; genderless solo Ditto | Igual | Igual | Igual |
| 2 | Grupos huevo | N/A | Tabla por especie | Igual | Igual | Igual |
| 3 | Especie del huevo | N/A | Madre/no-Ditto, primer estado | Igual + inciensos | Igual | Igual |
| 4 | Sexo | N/A | Attack DV vs ratio | PID | PID | PID |
| 5 | Naturaleza | N/A | No existe | Aleatoria; Emerald Everstone 50 % | DP/Pt como Emerald; HGSS cualquiera 50 % | B/W 50 %; B2/W2 100 % |
| 6 | IVs | N/A | No aplica | 3 heredados (RS/FRLG); overrides (E) | DP/Pt overrides; HGSS 3 distintos + Power Items | Igual HGSS |
| 7 | DVs | 4 DVs, HP derivado | Def copia; Esp ±8; Atk/Vel aleatorios | N/A | N/A | N/A |
| 8 | Habilidades | N/A | N/A | No heredables | No heredables | B/W oculta 60 %; B2/W2 normal 80 %, oculta 80 % |
| 9 | Shiny | N/A | DVs; 1/8192; padre shiny hasta 1/64 | PID; 1/8192 | PID; 1/8192; Masuda (cifra en conflicto) | PID; Masuda/Charm |
| 10 | Movimientos huevo | N/A | Padre egg/TM/HM/nivel; Crystal tutor | Padre egg/TM/HM/nivel; Emerald Volt Tackle | Igual | Igual |
| 11 | Objetos de herencia | N/A | Everstone sin efecto | Everstone solo Emerald | Everstone + Power Items solo HGSS | Everstone + Power Items |
| 12 | Ditto | N/A | Casi todo; no con Ditto | Igual | Igual | Igual |
| 13 | Sin crianza | Todas | No Eggs Discovered; Ditto+Ditto | Igual | Igual | Igual |
| 14 | Formas / excepciones | N/A | Nidoran 50/50 | + Volbeat/Illumise; inciensos | + inciensos | + inciensos |
| 15 | Entre generaciones | Time Capsule I↔II | Sin Gen II→III | Pal Park III→IV | Poké Transfer IV→V | Bank V→VI (fuera) |

## 3. Reglas que quedan CONFLICTING o UNKNOWN

| Punto | Estado | Acción |
|---|---|---|
| Cifra exacta de Masuda en Gen IV (1/1639 vs 1/2048) | **CONFLICTING** | No fijar probabilidad; usar solo «más probable» o pedir fuente adicional. |
| Lista completa de inciensos y su generación exacta | **PARTIALLY VERIFIED** | Cotejar objeto por objeto antes de implementar. |
| Herencia de forma en Gen III–V (Burmy, Shellos, etc.) | **PARTIALLY VERIFIED / UNKNOWN** | No implementar sin tabla verificada. |
| Prioridad exacta de movimientos en Gen II | **PARTIALLY VERIFIED** | Verificar con fuente adicional antes de codificar. |
| Herencia de amistad en huevos | **UNKNOWN** | No asumir; no afecta a PG-08G.2 inicial. |
| Tasas de aparición de huevo en Gen V | **PARTIALLY VERIFIED** (sección incompleta) | No usar como temporizador de PG-08D; el intervalo sigue siendo provisional. |

## 4. Conclusión

La crianza no es una regla única: cambia por generación y, dentro de Gen III–V,
por versión. Cualquier motor genético debe recibir un `GameKey` explícito y
devolver `UNKNOWN_RULES` si la combinación no está verificada. **No se ha
implementado ninguna de estas reglas en PG-08G.1.**
