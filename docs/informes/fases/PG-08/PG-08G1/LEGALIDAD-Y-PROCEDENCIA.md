# PG-08G.1 — Legalidad y procedencia (frontera estricta)

## Seis categorías que no deben mezclarse

| # | Categoría | Representación real hoy | Puede criar | Exportable |
|---|---|---|---|---|
| 1 | Pokémon DEMO (PLAY NOW) | `DEMO_INTERNAL_NON_EXPORTABLE` (PG-08E/F) | **No** | **No** |
| 2 | Pokémon importado | `SAVE_IMPORTED` con hash de save verificable | Según permisos y reglas de versión | Según legalidad destino |
| 3 | Huevo simulado | `EggRecord` + `SIMULATED_LOG_ONLY` | No aplica | **No** |
| 4 | Futuro Pokémon generado (PG-08G.2) | `ResolvedGenetics` propuesto, `realPkm:false` | No aplica | **No** |
| 5 | Pokémon validado | Resultado de `LegalityValidationPort` sobre una representación apropiada | Según contexto | Aún no implementado |
| 6 | Pokémon exportable | Requiere representación PKM real y validación destino | Fuera de alcance | Solo con protocolo PG-08D/exportación |

PG-08G.1 solo trabaja con las categorías 1–4. La 5 es un puerto futuro y la 6 no
existe en esta misión.

## Reglas de la frontera

1. `isBreedableProvenance()` de PG-08E es la **primera** comprobación. DEMO →
   `DEMO_PROVENANCE_BLOCKED`; ausencia de evidencia → `UNKNOWN_PROVENANCE_BLOCKED`.
2. `assertProvenanceUnchanged()` impide que un cambio de nombre, propietario o
   metadatos reclasifique un DEMO. La clasificación es permanente.
3. Los datos genéticos propuestos no son PKM: no tienen PID válido, ni OT/TID/
   SID, ni met data de encuentro, ni idioma de origen. No pueden alimentar
   `LegalityAnalysis` sin una representación real.
4. `LegalityValidationPort` solo es un contrato futuro. Invocarlo con datos
   simulados sería un error de categoría: PKHeX valida criaturas concretas, no
   intenciones de crianza.
5. La validación de PKHeX **no** equivale a legitimidad histórica: verifica
   coherencia de un PKM con las reglas del juego y la encounter data, no que el
   jugador haya obtenido el huevo oficialmente.
6. No se asigna procedencia a registros históricos ni se convierten huevos
   simulados en Pokémon importados.

## Riesgos identificados

| Dato | Riesgo | Mitigación propuesta |
|---|---|---|
| PID / shiny | En Gen II el shiny depende de DVs; en Gen III+ del PID. Fabricar uno sin semilla verificable crea evidencia falsa. | No generar PID; resolver shiny solo con regla documentada y semilla derivada. |
| IV / DV | Gen I–II usa DVs (0–15) y un solo DV especial; Gen III+ usa 6 IV (0–31). Mezclarlos produce datos imposibles. | `IVDVResolver` por `GameKey`, nunca una tabla única. |
| OT / TID / SID | Un huevo criado no hereda el OT del progenitor como si fuera un encuentro salvaje. | Mantener `null` en la estructura simulada; rellenar solo con política futura autorizada. |
| Idioma / versión de origen | Los movimientos huevo y nombres dependen de versión e idioma. | Reglas por `GameKey`; no asumir inglés. |
| Objeto de herencia | Everstone/Power Items/Destiny Knot no existen en todas las generaciones. Ver `MATRIZ-GENERACIONES.md`. | `GenerationRulesProvider` con estado NOT APPLICABLE. |
| Habilidad oculta | No existe en todas las versiones y depende de condiciones especiales. | `AbilityResolver` devuelve UNKNOWN si no hay regla VERIFIED. |
| Met location | Un huevo de crianza no tiene el encuentro de un Pokémon salvaje. | No inventar met data; bloquear exportación. |
| DEMO | Un future flujo HTTP podría olvidar consultar el dominio. | Contratos `assertDemoAllowed` / `assertBreedablePair` ya listos; auditoría de todo flujo nuevo. |

## Cierre

No se generó ni exportó ningún PKM. No se modificaron Pokémon importados,
saves, BD ni sidecar. Ninguna estructura de PG-08G.1 puede aparecer en un
inventario real sin pasar primero por PG-08G.2 y por una decisión humana.
