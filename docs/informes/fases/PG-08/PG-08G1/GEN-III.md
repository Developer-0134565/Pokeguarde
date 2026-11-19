# PG-08G.1 — Gen III: Ruby/Sapphire/Emerald/FireRed/LeafGreen

**Estado:** investigación documentada. Ninguna regla implementada.

## 1. Cambio de sistema

Gen III sustituye los DVs por **IVs de 0–31** (seis stats independientes, con HP
y Sp.Def propios) y añade **naturalezas** y **habilidades**. El shiny pasa a
depender del **PID** y de los IDs del entrenador, no de los IVs.

## 2. Compatibilidad

- Mismo **Egg Group** + sexos opuestos.
- **Ditto** con casi todo; **genderless** solo con Ditto; **No Eggs Discovered**
  nunca; Ditto+Ditto imposible.
- Ya no existe la incompatibilidad por DVs de Gen II.

## 3. Especie resultante

- Primer estado de la cadena de la **madre** (o del no-Ditto).
- **Nidoran♀/♂** y **Volbeat/Illumise**: 50/50.
- **Inciensos**: ciertas parejas producen el bebé solo si un progenitor lleva el
  incienso correspondiente (p. ej. Marill/Azumarill + Sea Incense → Azurill;
  Wobbuffet + Lax Incense → Wynaut). La lista completa está **PARTIALLY
  VERIFIED**; no implementar sin cotejo objeto por objeto.
- Eclosión a **nivel 5**.

## 4. Sexo y shiny

- Ambos se determinan por el **PID**; no se heredan de forma directa.
- Shiny: `TID xor SID xor PID_hi xor PID_lo < 8` → **1/8192**.
- No hay Método Masuda en Gen III.

## 5. Naturaleza

- **Ruby/Sapphire/FireRed/LeafGreen**: aleatoria; el Everstone no influye.
- **Emerald**: si la **madre** (o Ditto) lleva **Everstone**, 50 % de heredar su
  naturaleza.

## 6. IVs

- **Ruby/Sapphire/FireRed/LeafGreen**: exactamente **3 IVs** heredados de los
  progenitores; los otros 3 aleatorios.
- **Emerald**: mecanismo con overrides:
  1. se hereda un IV aleatorio de un progenitor;
  2. se hereda otro IV de cualquier stat salvo HP, que puede sobrescribir el
     anterior;
  3. se hereda otro IV salvo HP y Defensa, que puede sobrescribir los anteriores.
  Quedan **3–5 stats aleatorios** (no necesariamente 3 heredados distintos).
- No se heredan DVs porque no existen.

## 7. Habilidades

- **No se heredan**. El huevo recibe al azar una de las habilidades posibles de
  la especie.
- No hay habilidades ocultas en Gen III.

## 8. Movimientos

- Por defecto, movimientos de nivel ≤5.
- Ambos progenitores transmiten movimientos de nivel que el bebé aprende.
- El **padre** transmite TM/HM y egg moves.
- **Emerald**: si cualquier progenitor lleva **Light Ball**, un Pichu nace con
  **Volt Tackle** (no es un egg move normal).
- Prioridad si hay más de cuatro: Volt Tackle, egg moves de la madre, egg moves
  del padre, TM/HM, nivel, por defecto.

## 9. Objetos

- **Everstone**: solo en Emerald, para naturaleza.
- **No hay Power Items** (Gen IV) ni **Destiny Knot** con efecto de crianza.
- Todos los huevos salen en **Poké Ball** estándar.

## 10. Versiones

| Regla | R/S | Emerald | FRLG |
|---|---|---|---|
| Everstone naturaleza | No | Sí (madre/Ditto, 50 %) | No |
| Herencia IVs | 3 exactos | Overrides (3–5 aleatorios) | 3 exactos |
| Volt Tackle | No | Sí (Light Ball) | No |
| Shiny | PID 1/8192 | Igual | Igual |

## 11. Consecuencias para Pokeguarde

- `GenerationRulesProvider` debe distinguir **Emerald** de R/S y FRLG; no basta
  con `generation: 3`.
- El resolvedor de IVs no puede ser el mismo que Gen IV/V.
- No se deben introducir habilidades heredadas ni Destiny Knot.
- La especie del bebé depende de la madre/no-Ditto y de inciensos; no del padre.

## 12. Evidencia

Bulbapedia *Pokémon breeding* (§Generation III, §Inheriting Natures,
§Inheriting Abilities, §Passing moves down), *Individual values* y *Shiny
Pokémon*. Consultado el 19-nov-2026 vía `r.jina.ai`. Confianza global:
**VERIFIED**, salvo lista de inciensos (**PARTIALLY VERIFIED**).
