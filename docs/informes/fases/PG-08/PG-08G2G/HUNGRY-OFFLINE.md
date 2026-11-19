# PG-08G.2G — HUNGRY Y PROCESAMIENTO OFFLINE

**Resultado:** contrato de evaluación definido dentro de la ventana verificada de 7 días; más allá, `UNRESOLVED`.

## 1. Semántica real auditada (VERIFICADO)

| Hecho | Evidencia en `apps/web/src/pet-engine.ts` |
|---|---|
| `PetState.hunger: number` | `:68` |
| Rango 0–100 por `clamp(v,0,100)` | `:92` (y todos los updates) |
| Valor inicial 82 | `:180` |
| Puesta al día en bloques de 15 min | `:238` |
| Dormido: `hunger -= 1.7 * traits.appetite * nature.appetite * hours` | `:249` |
| Despierto: `hunger -= 3.6 * traits.appetite * nature.appetite * hours` | `:259` |
| Moduladores deterministas por rasgo/naturaleza | `:120,133-154` |
| `MAX_CATCHUP_MS = 7 * DAY`; recorte registrado | `:18,222,299-301` |
| Cooldowns de acciones (no aplicables a huevos) | `:316-323` |
| `PairMember` no expone hambre | `breeding-engine.ts:113-123` |

No existen `HungryActual` ni `HungryMax`. `HungryMax = 100` es el límite **verificado** del modelo, no un campo inventado (`V4 §3`). La proyección es:

```text
HungrySnapshot = { actual: hunger, max: 100, ratio: hunger / 100, at, source }
source = observed (estado presente) | projected (reconstruido por hora)
meetsThreshold = ratio >= 0.70   // equivalente a hunger >= 70
```

V4 §3 fija `actualE2 = round(hunger * 100)`, `maxE2 = 10000`, `ratioMicro = floor(actualE2*1e6/maxE2)`, `meetsThreshold = ratioMicro >= 700000`. `meetsThreshold` se deriva; nunca se persiste como entrada del usuario. Sin instantánea verificable → `UNKNOWN_HUNGRY` y fallo cerrado (cero huevos).

## 2. Evaluación en cada chequeo horario

1. Validar pareja Gen II, procedencia, permisos, `GameKey` y revisión vigente.
2. Proyectar un `HungrySnapshot` **por progenitor** con el reloj inyectado, reconstruyendo las horas transcurridas desde la última marca con las mismas reglas de `advance()` (bloques de 15 min, tasas dormido/despierto, moduladores). **Prohibido** reutilizar el valor de desconexión para todas las horas (`G2G-BR-04`).
3. Evaluar **cada** snapshot contra 0.70. Si cualquiera incumple → `HUNGRY_BELOW_THRESHOLD`, cero huevos, no consume presupuesto de éxitos.
4. Si ambos cumplen y hay capacidad pendiente libre para los dos → producción 1+1 garantizada.
5. Persistir `checkId` y resultado antes de avanzar `cursor`.

## 3. Casos límite obligatorios

| Caso | Resultado esperado | Fundamento |
|---|---|---|
| 69,99 % (`ratio = 0.6999`) | `HUNGRY_BELOW_THRESHOLD`. Con aritmética micro: `699000 < 700000` | V4 §3 |
| 70 % exacto (`hunger = 70`) | **Cumple** (`>=`, no `>`). `700000 >= 700000` | `G2G-BR-04` |
| 100 % (`hunger = 100`) | Cumple; `clamp` garantiza que no se exceda | `pet-engine.ts:92` |
| Solo un progenitor cumple | No produce; se evalúan independientemente | `G2G-BR-04` |
| Ambos cumplen | Produce 1+1 si hay capacidad | `G2G-BR-03` |
| Hungry cae por debajo durante offline | Cada hora ve **su** instantánea; el chequeo afectado se salta; un chequeo posterior podría producir si se registró una alimentación real | `G2E/HUNGRY-Y-OFFLINE.md §5` |
| Reconexión 24 h | 1 ventana, 24 chequeos, todos dentro de la ventana de 7 días | BR-08 |
| Reconexión 48 h | 2 ventanas consecutivas de 24 h | BR-08 |
| Reconexión 72 h | 3 ventanas consecutivas; sin descartar las últimas 48 h | BR-08; `OFFLINE-ALL.md §3` |
| Reconexión >7 días | `HUNGRY_HISTORY_UNAVAILABLE`; **no inferir** hambre; no extender `MAX_CATCHUP_MS` sin analizar el motor de mascotas | V4 §7; G2F conflictos A-3 |

## 4. Ventanas y límites

| Ventana | Origen | Uso |
|---|---|---|
| 7 días | `pet-engine.ts:18` `MAX_CATCHUP_MS` | Puesta al día del Tamagotchi local; límite de evidencia para reconstrucción |
| 24 h | `G2G-BR-08`, `maxWindowMs = 86400000` | Reconciliación de crianza por ventana |
| 72 h | caso límite de la misión | Tres ventanas de 24 h |

No copiar el valor de 7 días al motor de crianza ni usar `WINDOW_EXCEEDED` como descarte (`OFFLINE-ALL.md §3,5`). `backlogMode = single` es independiente de `policy = ALL`.

## 5.offs Algoritmo `ALL` (documental)

1. Leer `lastAt` y `cursor` persistentes.
2. `now = clock.now()`; si `now < cursor` → `CLOCK_ROLLBACK`, sin mutación.
3. Dividir `(lastAt, now]` en ventanas `(from, to]` de ≤24 h.
4. Planificar un chequeo por hora, máximo 24 por ventana, con `checkId` y `idempotencyKey` canónicos.
5. Persistir resultado de cada chequeo antes de avanzar `cursor`.
6. Si produce, crear evento + dos huevos en la misma transacción.
7. Si se salta o falla, aumentar `checksSkipped`/`checksFailed`; **no** `checksSucceeded` ni `productionEvents`.
8. Repetir `checkId` devuelve el resultado persistido; no avanza RNG ni crea otro huevo.

Código actual: `OfflinePolicy = "single" | "bounded"` (`breeding-engine.ts:55`), `initialState(..., "single", 1)` (`:184`). `ALL` requiere etapa G3-F.

## 6. Información adicional necesaria para reconstrucción fiel

- Perfil completo de **cada** progenitor en cada hora: `traits.appetite`, `nature.appetite`, estado `sleeping`, niveles y marca de tiempo persistida.
- Historial de acciones de alimentación durante la ausencia (hoy no se simulan en el motor de crianza).
- Identidad estable del progenitor depositado: `PairMember` no expone hambre; hace falta una proyección determinista desde el perfil de la mascota sin persistir un campo inventado.
- Si falta perfil o marca → `UNKNOWN_HUNGRY`, fallo cerrado. No se fabrica valor pasado.

## 7. Decisiones humanas asociadas

Confirmar el mapeo `HungryActual/HungryMax` → `PetState.hunger/100` (V4 ya lo usa como contrato y la directiva `G2G-BR-04` exige respetar la semántica real, por lo que se incorpora en V5), la proyección desde `PairMember`/perfil y la conducta más allá de 7 días. Ver `DECISIONES-HUMANAS-PENDIENTES.md`.
