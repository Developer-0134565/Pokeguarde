# PG-08G.2 — Legalidad y PKHeX

## 1. Cuatro capas que no son lo mismo

| Capa | Pregunta que responde | Quién decide | Estado hoy |
|---|---|---|---|
| **L1. Legalidad interna** | ¿El simulador aplicó sus propias reglas? | Pokeguarde (dominio) | Existe (PG-08D/E/F) |
| **L2. Legalidad generacional** | ¿La combinación es posible en ese juego y versión? | Pokeguarde + matriz Gen I–V | Documentada, no implementada |
| **L3. Legalidad PKHeX** | ¿PKHeX acepta este PKM concreto? | PKHeX.Core 26.10.18 | Existe para saves importados |
| **L4. Exportabilidad** | ¿Podemos producir un archivo válido y entregarlo por cadena oficial? | Pokeguarde + protocolo de escritura | Solo Gen 3/5 con ida y vuelta idéntica |

Un huevo puede pasar L1 (el ciclo fue correcto) y fallar L2 (regla inventada), o
pasar L2 y no poder evaluarse en L3 porque no existe PKM. Las capas no se
sustituyen entre sí.

## 2. L1 — Legalidad interna

Reglas ya implementadas: estados de huevo válidos, transiciones permitidas,
procedencia inmutable, DEMO bloqueado, capacidad respetada, idempotencia.
Ninguna de estas comprobaciones dice nada sobre el juego original: dicen que el
**simulador** se comportó como se especificó.

## 3. L2 — Legalidad generacional

Se evalúa con `GenerationRuleSet` (ver `CONTRATOS-GENERACIONALES.md`). Debe
devolver `UNKNOWN_RULES` cuando falte evidencia, nunca un valor por defecto
optimista. Huecos conocidos: inciensos, formas, prioridad de movimientos en
Gen II, Masuda en Gen IV.

## 4. L3 — Legalidad PKHeX: qué hace y qué no

**Lo que PKHeX.Core 26.10.18 sí ofrece** (auditado en PG-08G.1,
`PKHEX-AUDIT.md`):

- `LegalityAnalysis` con `Valid`, `Results`, `Info`, `HasResult(code)`,
  `IndexOfResult(code)`, `EncounterMatch`, `EncounterOriginal`.
- `LegalityFormatting.Report(...)`, `LegalityCheckResultCode`,
  `LegalityCheckLocalization`, `LegalitySettings`.
- Validadores de crianza: `Breeding.CanHatchAsEgg`, `MoveBreed*.Validate`,
  `ChainBreedLegality.IsValid`, `AbilityBreedLegality.IsHiddenPossible*`,
  `EggVerifier`, `EggStateLegality`.
- Plantillas de encuentro huevo: `EncounterEgg2..9.ConvertToPKM(ITrainerInfo,
  EncounterCriteria)`.

**Lo que PKHeX no ofrece:** un generador de huevos a partir de dos
progenitores. Sus plantillas usan entrenador + criterios, no herencia real de
padres. Cualquier afirmación de que «PKHeX genera el huevo» sería falsa.

**Consecuencia:** L3 solo puede ejecutarse sobre un PKM real. Un
`ResolvedGenetics` simulado **no** es candidato válido
(`INVALID_CANDIDATE_NOT_PKM`).

## 5. Problema detectado: veredicto por subcadenas

La implementación actual clasifica en `legal` / `unverified` / `illegal`
comparando texto en inglés del informe (`IsCosmetic` con
`Nickname does not match species name`, `In-game Trade Nickname has been
altered`, `Word Filter`).

| Problema | Consecuencia |
|---|---|
| Depende del idioma del informe | Un cambio de localización rompe la clasificación |
| Depende de la redacción exacta | Una actualización de PKHeX invalida las cadenas |
| Mezcla cosmético con estructural por texto | Un caso nuevo mal clasificado puede bloquear o permitir de más |
| No es una API | No hay contrato ni pruebas de la lista de cadenas |

**Propuesta:** clasificar por `LegalityCheckResultCode` cuando exista código
dedicado, y usar el texto solo como **respaldo documentado** cuando no lo haya.
Mientras no se demuestre la cobertura de códigos, se mantiene el
comportamiento actual, se declara frágil y se marca la migración como tarea
aparte (no autorizada aquí).

## 6. Política de `unverified`

`unverified` significa «no concluyente», no «legal». Se conserva porque:

1. Los saves hack y las traducciones generan falsos positivos cosméticos.
2. Un `illegal` mal clasificado bloquearía Pokémon legítimos del usuario.
3. Un `legal` mal clasificado sería peor: prometería legitimidad sin base.

Regla: `unverified` **permite** usar la mascota en la Guardería (decisión ya
vigente) y **no permite** afirmar legalidad histórica ni habilitar exportación
como si fuera `legal`.

## 7. L4 — Exportabilidad

Requisitos acumulativos, todos obligatorios:

1. PKM real con formato del destino (`PK1`…`PK5`).
2. L3 ejecutada y no `illegal`.
3. Cadena oficial existente entre origen y destino (Gen 1↔2 Time Capsule;
   Gen 3→4 Pal Park; Gen 4→5 Poké Transfer; Gen 5→6+ fuera de alcance).
4. Protocolo de escritura completo (SHA-256, clon, revalidación, archivo nuevo).
5. Procedencia no DEMO y no desconocida.

Hoy la app escribe **una copia nueva del save de origen**; la exportación a otro
save compatible no está implementada. Un huevo simulado no cumple ninguno de
los cinco puntos.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Confundir L1 con L2 («funciona en el simulador») | Etiquetar cada veredicto con su capa |
| Confundir L2 con L3 («debería ser legal») | Nunca afirmar legalidad sin `LegalityAnalysis` |
| Confundir L3 con L4 («PKHeX lo acepta, se puede exportar») | Cadena oficial + protocolo obligatorios |
| Subcadenas en inglés | Migración a códigos estructurados, pendiente |
| Prometer equivalencia con RNG de cartucho | Declarado fuera de alcance en `RNG-DETERMINISTA.md` |
| Met data inventada para «arreglar» legalidad | Prohibido en `AGENTS.md`; el motor no fabrica encuentros |

## 9. Decisiones pendientes

- Migrar `IsCosmetic` a códigos estructurados (requiere verificar cobertura).
- Definir si `unverified` podrá exportarse alguna vez (hoy: no).
- Definir la política de met data para futuros PKM de crianza (no decidida).
- Confirmar si `EffortExpLegality.GetRequiredEffortEXP` sustituye a
  `VitaminClamp` (spike pendiente, no autorizado aquí).
