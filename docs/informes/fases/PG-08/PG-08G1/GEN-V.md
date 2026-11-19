# PG-08G.1 — Gen V: Black/White y Black 2/White 2

**Estado:** investigación documentada. Ninguna regla implementada.

## 1. Compatibilidad y especie

- Mismo **Egg Group** + sexos opuestos; Ditto; genderless solo con Ditto; No Eggs
  Discovered nunca; Ditto+Ditto imposible.
- Especie: primer estado de la cadena de la **madre** (o no-Ditto).
- **Nidoran♀/♂** y **Volbeat/Illumise**: 50/50.
- **Inciensos** para bebés; lista completa **PARTIALLY VERIFIED**.
- Eclosión a **nivel 1**.

## 2. Naturaleza

| Juego | Regla |
|---|---|
| Black/White | Como HGSS: cualquier progenitor con Everstone → 50 %, y **ya funciona con distinto idioma**. |
| Black 2/White 2 | **100 %** de heredar la naturaleza del portador. Si ambos llevan Everstone, se elige al azar cuál se hereda. |

## 3. IVs

- Igual que **HGSS**: **3 IVs de stats distintas**, cada uno de un progenitor
  aleatorio.
- **Power Items**: fuerzan el IV del stat correspondiente; los otros dos se
  eligen de stats distintas.
- **Destiny Knot**: sin efecto en crianza en Gen V.
- IVs 0–31; no hay DVs.

## 4. Habilidades

| Juego | Habilidad normal | Habilidad oculta |
|---|---|---|
| Black/White | **No se hereda**. | **60 %** si la **hembra** la tiene y cría con macho; **no** con Ditto. |
| Black 2/White 2 | **80 %** si la **hembra** cría con macho; **no** con Ditto. | **80 %** con las mismas condiciones. |

- Machos y genderless **no** transmiten habilidad.
- Si no se hereda la oculta, el bebé solo puede nacer con una habilidad no
  oculta.
- No existen Ability Patch/Capsule en Gen V; el slot relevante es el que tiene
  el progenitor.

## 5. Sexo y shiny

- Sexo y shiny se determinan por el **PID**; no se heredan.
- Shiny base **1/8192**.
- **Masuda**: 6 rolls, ≈ **1/1366**.
- **Shiny Charm** (solo B2/W2): 3 rolls, ≈ **1/2731**.
- **Masuda + Shiny Charm**: 8 rolls, ≈ **1/1024**.

## 6. Movimientos

- Por defecto, movimientos de nivel 1.
- Ambos progenitores transmiten movimientos de nivel que el bebé aprende.
- El **padre** transmite TM/HM y egg moves.
- **Light Ball** en cualquier progenitor → Pichu con **Volt Tackle**.

## 7. Objetos

- **Everstone**: naturaleza (50 % en B/W; 100 % en B2/W2).
- **Power Items**: herencia de IV.
- **Destiny Knot**: sin efecto en crianza.
- Huevos en **Poké Ball** estándar.

## 8. Versiones

| Regla | B/W | B2/W2 |
|---|---|---|
| Everstone | 50 %, funciona entre idiomas | 100 % |
| Habilidad normal | No heredable | 80 % (hembra con macho) |
| Habilidad oculta | 60 % (hembra con macho) | 80 % (hembra con macho) |
| Shiny Charm | No existe | Sí (3 rolls) |
| Masuda + Charm | No aplica | 8 rolls ≈ 1/1024 |

## 9. Consecuencias para Pokeguarde

- El `GameKey` debe distinguir **B/W** de **B2/W2**; Everstone y habilidades
  cambian.
- No aplicar la regla de habilidad normal de B2/W2 a B/W.
- No aplicar habilidades heredadas de Gen VI+ (Ditto sí transmite en Gen VI+,
  pero no en Gen V).
- La cadena oficial Gen V → Gen VI/VII (Bank) queda fuera del alcance.

## 10. Evidencia

Bulbapedia *Pokémon breeding* (§Generation V, §Inheriting Natures,
§Inheriting Abilities, §Breeding for Shininess), *Power item* y *Destiny Knot*.
Consultado el 19-nov-2026 vía `r.jina.ai`. Confianza global: **VERIFIED**,
salvo lista de inciensos y formas (**PARTIALLY VERIFIED**).
