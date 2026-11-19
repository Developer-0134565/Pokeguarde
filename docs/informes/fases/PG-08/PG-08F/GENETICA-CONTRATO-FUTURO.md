# PG-08F — Contrato genético futuro (sin calcular)

## Principio

Los dos huevos del par tendrán características genéticas potencialmente
diferentes, pero **PG-08F no implementa genética**. `unresolvedGenetics(generation)`
devuelve `GeneticsAlgorithmRef` con `status: "unresolved"` y todos los campos
de resultado a `null`.

## Campos representables

| Campo | Valor en PG-08F |
|---|---|
| `species` | `null` |
| `nature` | `null` |
| `ivs` | `null` (reservado para IV/DV) |
| `dvs` | `null` |
| `ability` | `null` |
| `gender` | `null` |
| `shiny` | `null` |
| `inheritedMoves` | `[]` |
| `ruleset` | `null` |
| `algorithmId` | `null` |
| `seedRef` | `null` |
| `generation` | entero válido si se proporciona, si no `null` |
| `note` | «PG-08F: contrato futuro; sin genética calculada, sin PKM y sin azar» |

El esquema es `pg08f.genetics-contract`. La referencia futura a algoritmo y
semilla permite que una fase posterior registre **qué** reglas y **qué** fuente
verificable se usaron, sin inventar valores ahora.

## Prohibiciones respetadas

- No se generan valores aleatorios ficticios que puedan confundirse con datos
  Pokémon legítimos.
- No se generan PKM ni se modifica PKHeX.Core.
- No se calculan IV/DV (bloqueados en Gen 1–5 por decisión de AGENTS.md).
- No se escribe en saves ni en inventarios reales.
- No se toca el motor de crianza PG-08D: el intervalo sigue siendo único.

## Referencia a carga futura

Cada huevo lleva una referencia `genetics` pendiente de resolver. El contrato
está preparado para que una futura fase sustituya `unresolvedGenetics()` por
una implementación verificable con `algorithmId`/`seedRef`, sin cambiar la
identidad del huevo, la propiedad ni los estados de entrega.

Verificación: caso 33 de `scripts/pg08f-check.ts` comprueba que ningún campo
contiene un valor inventado.
