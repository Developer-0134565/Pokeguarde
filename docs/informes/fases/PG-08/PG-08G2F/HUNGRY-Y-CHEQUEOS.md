# PG-08G.2F — HUNGRY Y CHEQUEOS HORARIOS

**Estado:** contrato documental BR-03/BR-04; sin implementación.

## 1. Decisión vigente

- BR-03: un chequeo cada **60 minutos**, con `checkId` determinista; si se
  cumplen todas las condiciones, la producción está **garantizada**.
- BR-04: cada progenitor debe cumplir
  `HungryActual / HungryMax >= 0.70`; se evalúan **ambos** en cada chequeo.
- Durante una ausencia se reconstruye el valor correspondiente **a cada hora**.
  Está prohibido reutilizar el valor de desconexión para todas las horas.

## 2. Semántica real auditada

No existen campos `HungryActual` ni `HungryMax` en el dominio de crianza. La
auditoría de `apps/web/src/pet-engine.ts` confirma:

| Hecho | Evidencia |
|---|---|
| `PetState.hunger` existe y está acotado por `clamp(v, 0, 100)` | `pet-engine.ts:68`, `:92` |
| Valor inicial 82 | `pet-engine.ts:174-193` |
| Bucle de simulación en bloques de 15 min | `pet-engine.ts:237-240` |
| Dormido: `hunger -= 1.7 * appetite * hours` | `pet-engine.ts:249` |
| Despierto: `hunger -= 3.6 * appetite * hours` | `pet-engine.ts:259` |
| `traits.appetite` y `nature.appetite` son deterministas | `pet-engine.ts:120`, `:133-154` |
| Puesta al día máxima de 7 días (`MAX_CATCHUP_MS`) | `pet-engine.ts:18`, `:218-304` |
| `PairMember` no expone hambre | `breeding-engine.ts:113-123` |

Por tanto `HungryMax = 100` es el límite **verificado** del modelo existente, no
un campo nuevo inventado. `HungrySnapshot` es una proyección determinista:

```text
actualE2 = round(PetState.hunger * 100)
maxE2 = 10000
ratioMicro = floor(actualE2 * 1_000_000 / maxE2)
meetsThreshold = ratioMicro >= 700_000
```

`source` distingue `observed` (estado presente) de `projected` (reconstrucción
por hora). Sin instantánea verificable, el resultado es `UNKNOWN_HUNGRY` y el
chequeo falla cerrado: no produce huevos.

## 3. Chequeo horario

`checkId = check:<nurseryId>:<pairRef>:<checkNumber>`, con
`pairRef = sha256(pairRevision).slice(0,16)` y `checkNumber` monótono por par y
revisión. El mismo `checkId` procesado dos veces devuelve el resultado
persistido (`CHECK_DUPLICATE`, `created:false`) y no avanza el RNG.

En cada hora:

1. Se valida pareja, procedencia, permisos, `GameKey` y reglas (`gen2-gs` o
   `gen2-crystal` en el piloto).
2. Se proyecta un `HungrySnapshot` por progenitor con el reloj inyectado.
3. Si cualquiera incumple el umbral: `HUNGRY_BELOW_THRESHOLD`, estado
   `skipped`, cero huevos y sin consumo del presupuesto de éxitos.
4. Si ambos cumplen y hay capacidad pendiente para los dos propietarios:
   producción garantizada de **1+1**, estado `produced`.
5. Si falta capacidad: `CAPACITY_EXHAUSTED`, sin huevos y sin consumir la clave
   de idempotencia; se reevalúa en el siguiente chequeo.

**La tabla PROVISIONAL de rareza de PG-08D no es compuerta en este piloto.**
Sigue vigente para las aplicaciones donde ya se usa; BR-03 elimina su efecto
sobre la puesta de este flujo. No se introduce `CHECK_RARITY_NOT_DUE` aquí.

## 4. Hungry durante la ausencia

La reconstrucción por hora reutiliza las mismas reglas de `advance()` con reloj
inyectado: bloques de 15 min, tasas dormido/despierto y multiplicadores
derivados del perfil. Cada chequeo consume la instantánea de su hora, no un
valor único calculado al desconectar.

Límite de evidencia: la Tamagotchi solo garantiza puesta al día de **7 días**.
Las ventanas de 24/48/72 h de BR-08 están dentro de ese límite. Para ausencias
superiores, el estado histórico de hambre no puede afirmarse con los contratos
actuales: se registra `HUNGRY_HISTORY_UNAVAILABLE` como **abierto**, sin
inventar un valor.

## 5. Invariantes y errores

- `meetsThreshold` se deriva; nunca se persiste como entrada del usuario.
- Un chequeo fallido o saltado cuenta como `skippedChecks`/`failedChecks`, no
  como `checksSucceeded` ni `productionEvents`.
- Ningún chequeo puede producir un solo huevo: la producción es 1+1 o nada.
- Errores: `UNKNOWN_HUNGRY`, `HUNGRY_BELOW_THRESHOLD`, `CHECK_DUPLICATE`,
  `CHECK_BUDGET_EXCEEDED`, `CLOCK_ROLLBACK`, `CAPACITY_EXHAUSTED`,
  `UNKNOWN_RULES`, `PERSISTENCE_FAILED`.
- Sin `Math.random()` ni `Date.now()` en el motor; reloj y azar inyectados.
