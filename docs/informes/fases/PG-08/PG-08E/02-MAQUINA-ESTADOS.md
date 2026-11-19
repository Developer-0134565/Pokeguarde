# PG-08E · 02 — Máquina de estados

Estados: `produced`, `pending_assignment`, `stored`, `claimed`, `cancelled`.

| Desde | Hacia | Condición |
|---|---|---|
| `produced` | `pending_assignment` | destinatario aún no confirmado |
| `produced` | `stored` | propietario explícito y capacidad disponible |
| `produced` | `cancelled` | motivo válido, antes de la confirmación definitiva |
| `pending_assignment` | `stored` | asignación confirmada por la autoridad |
| `pending_assignment` | `cancelled` | motivo válido |
| `stored` | `claimed`| el propietario reclama |

`claimed` y `cancelled` son terminales. `EGG_TRANSITIONS` es la única tabla
permitida: no hay saltos, ni regresiones, ni `stored → cancelled`. Un huevo
confirmado (`stored`) NO desaparece por una retirada o expulsión posterior: D6
cancela el **ciclo**, nunca el huevo.

## Motivos de cancelación

Solo `cycle_invalidated`, `duplicate_superseded`, `recipient_rejected` y
`authority_rejected`. La falta de capacidad **nunca** cancela un huevo: el
evento se conserva en espera (`egg_backlog`) o se rechaza sin consumir su clave
de idempotencia.

## Diferenciación de conceptos

- `produced` = evento de producción confirmado; la operación de almacenamiento
  todavía está pendiente.
- `pending_assignment` = el evento existe, pero no hay propietario confirmado.
- `stored` = confirmación definitiva en el almacén lógico.
- `claimed` = el destinatario ha ejercido la recuperación.

`withTransition` rechaza además relojes hacia atrás (`TIME_REGRESSION`) y
cualquier cambio de `ownerId` una vez fijado (`OWNER_IMMUTABLE`). Cada transición
queda registrada en `egg_state_history` con actor, motivo y marca de tiempo.
