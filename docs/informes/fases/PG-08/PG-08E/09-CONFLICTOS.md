# PG-08E · 09 — Matriz de conflictos

La autoridad inyectada decide el orden. Nunca se aplica «último escritor gana».

| Conflicto | Resolución |
|---|---|
| Producción y retirada simultáneas | El huevo confirmado sigue `stored`; D6 cancela el ciclo, no el huevo. |
| Producción y expulsión simultáneas | Igual que la retirada; se verifica `hostId` en la autoridad PG-08A. |
| Dos eventos del mismo ciclo | `CYCLE_DUPLICATE`; se conserva el primero. |
| Reintento del mismo evento | `created: false`; no hay segundo huevo ni segundo evento. |
| Mensajes duplicados/outbox | Clave canónica `production:<idempotencyKey>`; `replay` cuenta duplicados. |
| Reinicio entre producción y almacenamiento | El evento en `egg_backlog` persiste y se drena tras reabrir. |
| Capacidad agotada | Rechazo seguro sin consumir idempotencia; el huevo confirmado no se reasigna. |
| Dos destinatarios reclamando | `canClaim` exige `actorId === ownerId`; el otro recibe `CLAIM_NOT_AUTHORIZED`. |
| Cambio de propietario no autorizado | `ASSIGN_NOT_AUTHORIZED` o `OWNER_IMMUTABLE`. |
| Progenitor DEMO | `DEMO_PROVENANCE_BLOCKED`, en dominio y almacén. |
| Procedencia desconocida | `UNKNOWN_PROVENANCE_BLOCKED` (fail closed). |
| Permiso revocado | `PERMISSION_REVOKED`; si estaba en espera, el drenaje lo bloquea y conserva el evento. |
| Pareja incompleta | `PAIR_INCOMPLETE` antes de crear el huevo. |
| Reloj hacia atrás | `TIME_REGRESSION` en `withTransition`. |

Los estados terminales (`claimed`, `cancelled`) no aceptan nuevas transiciones.
La propiedad jamás se resuelve por orden de llegada de mensajes.
