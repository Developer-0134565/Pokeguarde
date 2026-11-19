# PG-08G.1 — Gen IV: Diamond/Pearl/Platinum/HeartGold/SoulSilver

**Estado:** investigación documentada. Ninguna regla implementada.

## 1. Compatibilidad y especie

- Mismo **Egg Group** + sexos opuestos; Ditto; genderless solo con Ditto; No Eggs
  Discovered nunca; Ditto+Ditto imposible.
- Especie: primer estado de la cadena de la **madre** (o no-Ditto).
- **Nidoran♀/♂** y **Volbeat/Illumise**: 50/50.
- **Inciensos** para bebés (Sea, Lax, Rose, Pure, Rock, Odd, Luck, Wave, Full).
  La lista completa está **PARTIALLY VERIFIED**.
- Eclosión a **nivel 1** (cambio respecto a Gen II/III).

## 2. Naturaleza

| Juego | Regla |
|---|---|
| Diamond/Pearl/Platinum | Como Emerald: **madre** (o Ditto) con Everstone → 50 %. **No funciona si los padres tienen distinto idioma original.** |
| HeartGold/SoulSilver | **Cualquier** progenitor con Everstone → 50 %, sin importar sexo ni si cría con Ditto. |

## 3. IVs

- **Diamond/Pearl/Platinum**: mismo mecanismo que Emerald (overrides; 3–5
  stats aleatorios).
- **HeartGold/SoulSilver**: **3 IVs de stats distintas**, cada uno de un
  progenitor aleatorio.
- **Power Items (solo HGSS)**: si un progenitor lleva un Power Item, el bebé
  hereda el IV de ese stat de ese progenitor; los otros dos se eligen de stats
  distintas. Si ambos llevan Power Item, se elige uno al azar.
- **Destiny Knot**: existe como objeto, pero **no afecta a la crianza** en Gen
  IV. No da 5 IVs.
- Los IVs son 0–31; no hay DVs.

## 4. Habilidades

- **No se heredan** en Gen IV. El huevo recibe al azar una habilidad posible.
- No hay habilidades ocultas (se introducen en Gen V).

## 5. Sexo y shiny

- Sexo y shiny se determinan por el **PID**; no se heredan.
- Shiny base **1/8192**.
- **Método Masuda** (padres de distinto idioma): 5 rolls, ≈ **1/1639** según
  Bulbapedia; Serebii indica **1/2048**. **CONFLICTING**: no fijar una
  probabilidad exacta en el motor hasta resolverlo.
- No hay Shiny Charm (B2/W2).

## 6. Movimientos

- Por defecto, movimientos de nivel 1.
- Ambos progenitores transmiten movimientos de nivel que el bebé aprende.
- El **padre** transmite TM/HM y egg moves.
- **Light Ball** en cualquier progenitor → Pichu con **Volt Tackle**.
- No se heredan movimientos de tutor en Gen IV.

## 7. Objetos

- **Everstone**: naturaleza (ver tabla).
- **Power Items**: solo HGSS.
- **Destiny Knot**: sin efecto en crianza.
- Huevos en **Poké Ball** estándar.

## 8. Versiones

| Regla | DP/Pt | HGSS |
|---|---|---|
| Herencia IVs | Como Emerald (overrides) | 3 stats distintas + Power Items |
| Power Items | No | Sí |
| Everstone | Madre/Ditto, 50 %, falla entre idiomas | Cualquier portador, 50 % |
| Eclosión | Nivel 1 | Nivel 1 |

## 9. Consecuencias para Pokeguarde

- El `GameKey` debe distinguir **DP/Pt** de **HGSS**; la herencia de IVs y los
  Power Items cambian.
- No aplicar Destiny Knot ni habilidades heredadas.
- La cifra de Masuda no debe usarse como probabilidad canónica mientras esté
  `CONFLICTING`.
- La cadena oficial es Gen IV → Gen V por Poké Transfer; no al revés.

## 10. Evidencia

Bulbapedia *Pokémon breeding* (§Generation IV, §Inheriting Natures, §Inheriting
Abilities, §Breeding for Shininess), *Power item*, *Destiny Knot*, y Serebii
`/games/breed.shtml`. Consultado el 19-nov-2026. Confianza global: **VERIFIED**,
con las excepciones marcadas.
