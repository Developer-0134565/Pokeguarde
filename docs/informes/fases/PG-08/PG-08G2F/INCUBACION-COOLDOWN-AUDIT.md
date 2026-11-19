# PG-08G.2F — AUDITORÍA DE RECUPERACIÓN DEL COOLDOWN

**Veredicto:** `UNKNOWN_HATCH_COOLDOWN` — **BLOCKED**.  
**Auditoría:** READ-ONLY, realizada por agente independiente; no se escribió
código ni se modificaron documentos históricos.

## 1. Pregunta

BR-07 exige recuperar la duración previamente aprobada del cooldown de
incubación. Solo puede aceptarse como definitivo un valor cuya aprobación
propietaria pueda demostrarse.

## 2. Resultado por clases de evidencia

| Clase | Fuente | Hallazgo | Conclusión |
|---|---|---|---|
| Implementado | `packages/core/src/breeding-engine.ts:32-34,41-51` | Intervalos de **producción** 1–12 h, tabla PROVISIONAL | No es incubación; no reutilizar |
| Implementado | `apps/web/src/pet-engine.ts:316-323` | Cooldowns de acciones Tamagotchi: comer 15 min, jugar 8 min | No aplica a huevos |
| Implementado | `packages/core/src/egg-domain.ts:6,67`; `scripts/pg08e-check.ts:726` | Huevo simulado, `hatched:false`, «sin eclosión» | No hay lógica de incubación implementada |
| Documentado | `docs/BREEDING_DESIGN_RFC.md:3,30,32-38` | «Rango confirmado: 15 minutos a 3 horas»; «Fórmula de cálculo todavía pendiente» | Rango dependiente de rareza y suma de IV; no valor único |
| Documentado | `docs/ROADMAP.md:12,51` (commit `819b73b49…`) | PG-09D etiquetado `DECIDED`, «Fórmula pendiente» | Etiqueta documental sin cita del propietario ni duración concreta |
| Propuesto | `STITCH_UPLOAD/LEEME_STITCH.md:60,63,84` | RFC marcada PROPOSED; fórmula «pendiente de definir» | Contradice tratar el rango como definitivo |
| Documentado | `PG-08G2E/INCUBACION-Y-COOLDOWN.md:5-13,62,73-74` | «No se ha localizado … duración previamente aprobada»; fallo cerrado | Última regla específica: bloquea |
| Documentado | `PG-08G2E/CONFLICTOS-Y-DECISIONES.md:28,53,58-60` | C-14 `BLOCKED`; «Aportar la referencia de la duración» | Refuerza el bloqueo |
| Aprobación expresa | `AGENTS.md` y búsqueda en los 13 commits locales | Sin cooldown ni duración; ninguna cita propietaria con valor | No hay aprobación demostrable |

## 3. Búsquedas negativas

Se buscaron `incub`, `incubación`, `cooldown`, `cooldown de huevo`,
`tiempo de incubación`, `hatch`, `eclosión`, `duración`, `15 min`,
`15 minutos a 3 horas`, `180 min`, `incubationStartedAt`, `hatchProgress`,
`UNKNOWN_HATCH_COOLDOWN`, `aprobad*`, `DECIDED` e `InheritIVs`.

- `git grep` sobre todos los commits locales (`git rev-list --all`): solo dos
  coincidencias de «15 minutos a 3 horas», ambas en
  `docs/BREEDING_DESIGN_RFC.md:30` (`819b73b…`, `7c9c326…`).
- `git log -S "15 minutos a 3 horas" --all` → esos dos commits.
- `git log -S "UNKNOWN_HATCH_COOLDOWN" --all` → vacío; G2E está sin seguimiento.
- Sin coincidencias en `README.md`, `apps/server/src`,
  `docs/SHARED_NURSERIES_SPEC.md` ni `scripts/` fuera de los cooldowns de
  acciones y mensajes i18n.
- `InheritIVs` aparece solo como bug diferido de Gen III, nunca como cooldown.

## 4. Por qué el rango no cierra la decisión

1. Es un rango dependiente de rareza y suma de IV con fórmula pendiente: no
   determina la duración de un huevo concreto.
2. La etiqueta `DECIDED` del roadmap coexiste con documentos posteriores que
   declaran `UNRESOLVED`/`BLOCKED` y exigen una referencia aprobada.
3. Cronología verificada: RFC/roadmap en `819b73b49…` (06:19:55);
   `INCUBACION-Y-COOLDOWN.md` es posterior (mtime 18:51:12) y no deroga la
   regla de fallo cerrado.
4. BR-07 prohíbe expresamente inventar o sustituir la duración.

## 5. Regla operativa

- El inicio del cooldown sí está decidido: `startedAt === claimedAt`, nunca
  `producedAt` ni `preparedAt`.
- La duración permanece `cooldownMs: null`, `status:"blocked"`,
  `blockedReason:"UNKNOWN_HATCH_COOLDOWN"`, `readyAt:null`.
- No se crea contador C4 ni incubación concurrente.
- No se eclosiona automáticamente.
- No reutilizar 60 min de chequeo, 1–12 h de producción ni 15 min de `feed`.

## 6. Alternativas sin elegir

1. Que el propietario aporte una duración o fórmula cerrada con cita
   verificable.
2. Completar la fórmula documental «rareza + suma de IV» y aprobarla
   explícitamente.
3. Fijar un valor provisional de prueba, siempre rotulado `TEST_ONLY` y sin
   declararlo aprobado.

Ninguna de estas alternativas se ha convertido en decisión.
