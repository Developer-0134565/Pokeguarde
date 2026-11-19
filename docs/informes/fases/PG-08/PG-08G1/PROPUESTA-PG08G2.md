# PG-08G.1 — Propuesta para PG-08G.2 (NO AUTORIZADA)

**Estado: propuesta.** PG-08G.2 requiere autorización explícita y no se ha
iniciado. Esta misión solo investiga, especifica y prueba de forma aislada.

## Objetivo propuesto

Implementar, en un módulo nuevo y aislado, el motor de genética simulada del
par 1+1 descrito en `ARQUITECTURA-GENETICA.md`, sin generar PKM ni modificar
saves, BD, frontend ni sidecar.

## Prerrequisitos

1. Aprobar la matriz de reglas de `MATRIZ-GENERACIONES.md` y resolver las
   reglas marcadas `UNKNOWN` o `CONFLICTING`.
2. Confirmar el alcance de versión inicial: se recomienda empezar por **Gen II**
   porque es la primera con crianza y sus reglas son verificables en la
   documentación histórica; Gen III–V se añaden por `GameKey`.
3. Decidir si se usa una semilla maestra inyectada por prueba o una futura
   autoridad. La propuesta de `RNG-Y-DETERMINISMO.md` admite ambas.
4. No reabrir 1+1, DEMO ni propiedad: son decisiones cerradas de PG-08F.

## Entregables propuestos

- `packages/core/src/egg-genetics.ts` (nuevo; núcleo puro, sin PKM).
- Resolvedores A–L de `ARQUITECTURA-GENETICA.md`, con `DomainResult<T>`.
- Adaptación de `unresolvedGenetics()` a un estado `resolved` con el mismo
  esquema base, manteniendo `realPkm:false` y `exportable:false`.
- Suite aislada `scripts/pg08g2-check.ts` integrada en `check.sh` solo si se
  autoriza expresamente.
- Documentación de reglas por versión y de resultados de validación.

## Límites propuestos

- Sin aleatoriedad global; sin `Math.random()`.
- Sin PID, OT, TID, SID, met data ni PKM.
- Sin eclosión, intercambio, exportación ni entrega real.
- Sin llamadas a PKHeX.Core para generar; como máximo un
  `LegalityValidationPort` con implementación `unavailable` hasta que exista
  una representación válida.
- Sin cambiar capacidad, acumulación ni asignación: siguen pendientes (D4/D8/D9
  y decisiones de PG-08E/F).

## Criterios de aceptación propuestos

- Dos huevos del mismo ciclo tienen resultados reproducibles y distintos.
- Reintentos y replay no cambian los resultados.
- DEMO y procedencia desconocida se rechazan antes de cualquier cálculo.
- Reglas sin evidencia devuelven `UNKNOWN` y no valores inventados.
- `bun run check` sigue en EXIT 0 y las 17 hashes protegidas intactas.
- Sin commits, pushes, despliegues ni cambios en frontend/saves.
