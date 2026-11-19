# PG-08G.1 — Gen II: Gold/Silver/Crystal

**Estado:** investigación documentada. Ninguna regla implementada.

## 1. Contexto

Gen II introduce la crianza. No existen naturalezas, habilidades ni IVs 0–31;
el sistema usa **DVs** de 0–15 y el shiny depende de ellos. Cualquier diseño que
use IVs o habilidades de Gen III+ para un Pokémon de Gen II es incorrecto.

## 2. Compatibilidad

- Deben compartir al menos un **Egg Group** y ser de **sexos opuestos**.
- **Ditto** es compatible con casi cualquier Pokémon, incluidos los genderless;
  no puede criar con otro Ditto.
- **Genderless** solo cría con Ditto.
- **No Eggs Discovered** no cría nunca.
- Regla exclusiva de Gen II: si los **Defense DVs** son iguales y los **Special
  DVs** son iguales o difieren en 8, la pareja es incompatible (posible
  parentesco). No existe en Gen III+.

## 3. Especie resultante

- Primer estado de la cadena evolutiva de la **madre** (o del progenitor no
  Ditto).
- Nidoran♀/Nidoran♂: 50/50 (la familia Nidoran se trata como una cadena).
- Eclosión a **nivel 5**.
- No hay inciensos en Gen II; los bebés por incienso son Gen III+.

## 4. Sexo

- Se deriva del **Attack DV** comparado con el ratio de sexo de la especie:
  hembra si `AttackDV <= ratio`.
- En especies 7♂:1♀, una hembra tiene Attack DV máximo **1**.
- No se hereda: se calcula al generar el huevo.

## 5. Shiny

- Requisitos: Defense DV = Speed DV = Special DV = **10**; Attack DV ∈
  {2, 3, 6, 7, 10, 11, 14, 15}; HP DV resultante 0 u 8.
- Probabilidad base **1/8192**.
- Un progenitor shiny de **sexo opuesto** eleva hasta **1/64**.
- Dos progenitores shiny **no pueden criar**: ambos tendrían el mismo Defense DV
  y caen en la incompatibilidad de parentesco.

## 6. Herencia de DVs

- Del progenitor de **sexo opuesto** (o de Ditto si participa):
  - **Defense DV**: se copia.
  - **Special DV**: se copia o se le suma/resta 8 (50 % de quedar igual).
  - **Attack DV** y **Speed DV**: aleatorios.
  - **HP DV**: derivado de los otros cuatro.
- Probabilidad de DVs idénticos al progenitor: **1/512**.

## 7. Movimientos

- Por defecto, movimientos de nivel ≤5.
- Si **ambos** progenitores conocen un movimiento de nivel que el bebé aprende,
  se hereda.
- El **padre** transmite TM/HM; en **Crystal** también movimientos de tutor.
- El **padre** transmite egg moves.
- Prioridad si hay más de cuatro: Volt Tackle (no existe en Gen II), egg moves
  de la madre, egg moves del padre, TM/HM, movimientos de nivel, movimientos por
  defecto. **La prioridad exacta está PARTIALLY VERIFIED**; no codificarla sin
  una segunda fuente.

## 8. Objetos

- **Everstone**: en Gen II no hereda naturaleza (no hay naturalezas); solo evita
  la evolución por intercambio.
- **No hay Power Items** (Gen IV) ni **Destiny Knot** (Gen IV, sin efecto de
  crianza hasta Gen VI).

## 9. Consecuencias para Pokeguarde

- Un huevo de Gen II debe llevar DVs, no IVs; el shiny se deriva de DVs.
- No se puede reutilizar el resolvedor de Gen III+ sin una rama específica.
- No se puede criar un Pokémon de Gen I; Time Capsule solo intercambia, no cria.
- El motor PG-08D sigue decidiendo **cuándo** hay huevo; esta fase solo
  especifica **qué rasgos** tendría.

## 10. Evidencia

Bulbapedia *Pokémon breeding* (§How to breed, §Inheriting stats, §Passing moves
down, §Breeding for Shininess), *Individual values* y *Shiny Pokémon*.
Consultado el 19-nov-2026 vía `r.jina.ai`. Confianza global: **VERIFIED**,
salvo la prioridad exacta de movimientos (**PARTIALLY VERIFIED**).
