# PG-08D · Matriz de condiciones de carrera

| Caso | Secuencia autoritativa | Resultado observado | Prueba |
|---|---|---|---|
| A · Retirada 1 s antes del vencimiento | `withdraw` primero; reloj avanza después | No se produce huevo; ciclo `stopped` | 22 |
| B · Huevo confirmado antes de la retirada | `tick` en `dueAt`, luego `withdraw` | El huevo se conserva; no comienza otro ciclo válido | 21 |
| C · Retirada y vencimiento simultáneos | Orden de comandos sobre el mismo reloj | Una única secuencia; sin resultados contradictorios | 23 |
| D · Expulsión durante el ciclo | `expel` del anfitrión | Custodia devuelta y temporizador detenido | 15 |
| E · Nuevo depósito del mismo Pokémon | `withdraw` → `requestDeposit` → `acceptDeposit` | `cycleId` distinto; progreso desde cero | 17, 18 |
| F · Aplicación cerrada varias horas | `single` por defecto; `bounded` configurable | Política explícita, sin acumulación silenciosa | 31, 32, 35 |

## Mecanismos

- **Revisión de pareja**: `pairRevisionOf` incluye `stayId@revision`; un `tick`
  con revisión obsoleta cancela el ciclo (`STALE_PAIR`).
- **Idempotencia**: claves `command:start|tick|cancel|withdraw|expel:<key>` en
  `BreedingState.processed`, persistidas; el `eggId` deriva del `cycleId`.
- **Horas no confiables**: `tick` solo usa `clock.now()`; un `at` inyectado por
  el cliente se ignora.
- **Autoridad única**: los comandos de custodia pasan por `SharedAuthority` con
  recibos, revisiones y outbox; un fallo de autoridad no confirma nada.

## Nota

No se han probado hilos reales ni concurrencia de red: la simulación serializa
comandos y verifica que el **orden** determine el resultado. No se afirma
tolerancia a fallos distribuidos reales.
