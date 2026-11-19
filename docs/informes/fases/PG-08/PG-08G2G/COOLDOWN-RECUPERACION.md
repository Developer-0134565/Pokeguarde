# PG-08G.2G — RECUPERACIÓN DEL COOLDOWN DE INCUBACIÓN

**Resultado obligatorio: B — no encontrada.** `UNKNOWN_HATCH_COOLDOWN` / `BLOCKED`. No se elige ninguna opción automáticamente.

## 1. Pregunta y criterio

Recuperar la duración o fórmula de incubación previamente aprobada. Solo se acepta como definitivo un valor cuya aprobación propietaria pueda demostrarse con fuente exacta.

## 2. Búsqueda realizada

| # | Fuente | Hallazgo | Clasificación |
|---|---|---|---|
| 1 | `PG-08G2F/INCUBACION-COOLDOWN-AUDIT.md:3,55-74` | `UNKNOWN_HATCH_COOLDOWN` — BLOCKED; inicio decidido, duración no | BLOCKED (autoridad previa) |
| 2 | `PG-08G2E/INCUBACION-Y-COOLDOWN.md:12-13,62,73-74` | «No se ha localizado … duración previamente aprobada»; fallo cerrado | UNRESOLVED |
| 3 | `PG-08G2E/CONFLICTOS-Y-DECISIONES.md:28` | C-14 `BLOCKED` | BLOCKED |
| 4 | `docs/BREEDING_DESIGN_RFC.md:28-38` | Rango 15 min–3 h; depende de rareza y suma de IV; «Fórmula de cálculo todavía pendiente» | PROPOSED (no valor único) |
| 5 | `docs/ROADMAP.md:51` | PG-09D `DECIDED`, «Fórmula pendiente» | PROPOSED (etiqueta sin cita ni duración) |
| 6 | `STITCH_UPLOAD/LEEME_STITCH.md:60,63,84` | RFC marcada `PROPOSED`; fórmula pendiente | PROPOSED |
| 7 | `packages/core/src/breeding-engine.ts:32-34,42,55` | Intervalos de **producción** 1–12 h (`MIN/MAX_INTERVAL_MS`), tabla PROVISIONAL | IMPLEMENTED, otro concepto |
| 8 | `apps/web/src/pet-engine.ts:316-323` | Cooldowns de acciones Tamagotchi: `feed` 15 min, `play` 8 min, etc. | IMPLEMENTED, otro concepto |
| 9 | `packages/core/src/egg-domain.ts:6,63-67`; `scripts/pg08e-check.ts:726` | Huevo simulado, `hatched:false`, «sin eclosión» | IMPLEMENTED, sin incubación |
| 10 | `AGENTS.md`, commits locales | Sin cooldown de huevo ni cita propietaria con valor | sin evidencia |

**Historial Git ejecutado en esta misión (READ-ONLY):**

- `git log --all --oneline -S "15 minutos a 3 horas"` → **un único commit**, `819b73b` (`docs: checkpoint shared nurseries breeding security and monetization decisions`).
- `git log --all -S "UNKNOWN_HATCH_COOLDOWN"` → vacío (G2E/G2F sin seguimiento).
- `git log --all -S "incubationStartedAt"` → vacío.
- `git log --all -S "TRD-42"` y `-S "rareza del huevo"` → vacío.
- `git grep` sobre todos los commits: todas las apariciones de incubación son de la auditoría PG-STITCH-01 (`01_INVENTARIO_STITCH.md`, `03_MATRIZ_PANTALLAS_VS_CODIGO.md`, `04_CONTRADICCIONES_Y_DECISIONES.md`, `05_PLAN_IMPLEMENTACION.md`) y repiten «fórmula pendiente»; `PG-STITCH-01/03` registra «No hay huevos, cooldown 15 min–3 h, costes GP …; fórmula pendiente».

Cronología verificada en G2F: RFC/roadmap en `819b73b` (06:19:55); `INCUBACION-Y-COOLDOWN.md` es posterior (mtime 18:51:12) y no deroga el fallo cerrado.

## 3. Separation obligatoria de conceptos

| Concepto | Valor / estado | No confundir con |
|---|---|---|
| Chequeo de producción | 60 min, determinista (`G2G-BR-03`) | incubación |
| Espera de guardería / pendiente de recogida | hasta 2 por usuario (`G2G-BR-02`) | incubación |
| Intervalo de puesta PROVISIONAL | 1–12 h por rareza (`breeding-engine.ts:32-42`) | incubación |
| **Incubación / cooldown de huevo** | **DESCONOCIDO — BLOCKED** | ninguno de los anteriores |
| Eclosión | nivel 5 en Gen II (`GEN-II.md:27`); ciclos por especie `UNKNOWN_HATCH_CYCLES` | duración de incubación |
| Cooldowns de acciones | `feed` 15 min, `play` 8 min, `clean` 20 min, `pet` 90 s, `scold` 4 min | incubación |

Reutilizar 60 min, 1–12 h o 15 min sería fabricar una decisión. El rango 15 min–3 h **no se acepta como definitivo**: es dependiente de rareza y suma de IV con fórmula pendiente, no determina un huevo concreto.

## 4. Lo que SÍ está decidido

- `IncubationTimer.startedAt = claimedAt`, nunca `producedAt`, `preparedAt` ni `storedAt`.
- Recogida tardía: se inicia con el `at` real de la recogida confirmada, no con el tiempo pendiente (`G2E/INCUBACION-Y-COOLDOWN.md §4`).
- Un reintento de recogida no reinicia la marca.
- Registro separado: `producedAt`, `collectedAt`, `incubationStartedAt`, `hatchProgress`.
- `cooldownMs = null`, `status = "blocked"`, `blockedReason = "UNKNOWN_HATCH_COOLDOWN"`, `readyAt = null`.
- Sin C4, sin eclosión automática, sin avance de progreso.

## 5. Propuesta de decisión humana (sin elegir)

| Opción | Descripción | Consecuencia | Evaluación |
|---|---|---|---|
| **A** | Aportar duración o fórmula cerrada con cita verificable | Desbloquea G3-E | Recomendada; requiere referencia propietaria |
| **B** | Completar la fórmula documental «rareza + suma de IV» y aprobarla explícitamente | Desbloquea G3-E con dependencia de atributos | Viable; exige definir rareza y suma en Gen II (DVs 0–15, no IVs 0–31) |
| **C** | Fijar valor provisional de prueba rotulado `TEST_ONLY` | No habilita producción real | Solo para banco de pruebas aislado; nunca declararlo aprobado |

Ninguna se ha convertido en decisión. Hasta que se elija, G3-E no se implementa ni se simula duración. Las etapas G3-A…D y G3-F…I no dependen de este valor y pueden planificarse por separado.
