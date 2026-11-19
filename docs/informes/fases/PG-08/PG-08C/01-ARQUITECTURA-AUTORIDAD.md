# PG-08C — Arquitectura de la autoridad simulada

**Estado: IMPLEMENTADA Y VERIFICADA** (33/33 comprobaciones, `bun run check` EXIT 0).
**No es un servicio desplegado.** No escucha puertos, no expone HTTP, WebSocket ni SSE.

## 1. Capas

```
Dominio PG-08A (packages/core/src/shared-nurseries.ts)
  └─ reglas puras, 19 operaciones, eventos inmutables. NO MODIFICADO.
       └─ EventStore PG-08B (apps/server/src/shared-store.ts)
            └─ log append-only, SQLite aislado, transacciones. Gancho aditivo.
                 └─ Autoridad simulada (apps/server/src/shared-authority.ts)
                      ├─ identidad de prueba (D1, HMAC en memoria)
                      ├─ idempotencia por commandId
                      ├─ revisión lógica por agregado (D5)
                      └─ outbox atómico (shared-event-queue.ts)
                           └─ réplicas locales: authority, owner-device, host-device
```

La separación es estricta: la autoridad **no duplica reglas del dominio**. Solo
controla quién envía el comando, si ya fue ejecutado, si la revisión es la
esperada y si todo se persistió antes de confirmar.

## 2. Cambio aditivo en el EventStore

`apps/server/src/shared-store.ts` gana un parámetro opcional (los 22 casos de
PG-08B siguen pasando sin cambios):

```ts
export type StoreSideEffect = (context: {
  readonly db: Database;          // conexión DENTRO de la transacción
  readonly events: readonly SyncEvent[];  // eventos nuevos del comando
  readonly outcome: StoreOutcome;
}) => void;

execute(command: StoreCommand, sideEffect?: StoreSideEffect): StoreOutcome
```

El efecto se invoca justo antes del `COMMIT`. Si lanza, el `catch` hace
`ROLLBACK`: no quedan ni eventos de dominio ni mensajes de salida. Los tres
puntos de `COMMIT` del `try` (identidad inválida, error de dominio y éxito) usan
la misma función `commit()`. El hash de este archivo pasó de
`69900571b3cf5440890042830fa94818f84f1a408f6f6e16660ce39964dfb08a` a
`625c62c1de6eb60426d706d1aba72cfe697df6964c992e715b5c291c22f58861`.

## 3. Identidad de prueba (D1)

`TestIdentityProvider` usa HMAC-SHA256 con un secreto aleatorio en memoria.
El token tiene tres componentes `ownerId.epochMs.firma`; el ISO se firma como
epoch para evitar puntos extra. `verify()` comprueba la firma con
`timingSafeEqual` y una edad de 0 a 3.600.000 ms.

**Explícitamente NO apto para producción:** no hay cuentas, no hay claves
privadas persistentes, no hay revocación real de credenciales. Un `ownerId`
suelto nunca se acepta: el store exige un `AuthenticatedOwner` verificado.

## 4. D5 — Una única autoridad

| Mecanismo | Implementación |
|---|---|
| Decisión | Solo `SharedAuthority.submit()` acepta comandos; las réplicas no tienen `execute`. |
| Revisión | `authority_revisions(aggregate_id, revision)`. Sube +1 solo si el comando fue aceptado. |
| Obsoleta | `expectedRevision` distinto de la revisión actual → `STALE_REVISION`, sin eventos ni mensajes. |
| Idempotencia | `authority_commands(command_id, receipt_json, created_at)`. Un reintento devuelve el mismo recibo con `duplicate: true`. |
| Reenvío al dominio | `acceptDeposit` → `expectedNurseryRevision`; `grantPermission` → `expectedRevision`. Otras operaciones no aceptan revisión en el dominio. |
| Último escritor gana | Prohibido: la revisión se comprueba **dentro** de la transacción, no antes. |
| Efectos parciales | Ninguno: recibo, revisión y outbox se escriben en la misma transacción que los eventos. |

La revisión lógica de la autoridad es complementaria —no sustituto— de la
revisión que el dominio PG-08A lleva en cada `Nursery` y `Stay`. Esto permite
resolver conflictos sobre agregados cuyo dominio no incrementa revisión (p. ej.
`care`), sin tocar el código del dominio.

### Mapeo de agregados

- `acceptDeposit` / `rejectDeposit`: `nursery:<nurseryId>` leído de la solicitud.
- Operaciones con `nurseryId` o `stayId`: `nursery:<id>` / `stay:<id>`.
- Registro de propietario: `owner:<id>`.
- Resto: `op:<operación>:<sha256(commandId)[0:12]>` (determinista).

`registerNursery` conserva el fallback `owner:<id>` para no alterar la revisión
de la guardería antes de su primera aceptación.

## 5. Flujo de un comando

1. `submit()` verifica el token. Sin token válido → `UNAUTHORIZED`, sin persistir.
2. Si el `commandId` ya tiene recibo → se devuelve el recibo (`duplicate: true`).
3. Se deriva el `aggregateId` y se reenvía `expectedRevision` solo donde el
   dominio lo acepta.
4. `store.execute(command, sideEffect)` abre `BEGIN IMMEDIATE`, reconstruye el
   sistema desde el log, autoriza (D1), ejecuta la operación de dominio y
   recoge **todos** los eventos nuevos (un comando puede emitir varios:
   `refreshNursery` añade `nursery.flags`).
5. El `sideEffect` vuelve a comprobar recibo y revisión **dentro** de la
   transacción, escribe el recibo, incrementa la revisión y encola los mensajes.
6. `COMMIT`. Solo entonces se devuelve el resultado al cliente simulado.
7. Si algo lanza, `ROLLBACK` + `materialize()`: ni eventos, ni recibo, ni cola.

## 6. Límites

- No hay API pública ni puertos.
- No se almacenan saves en la autoridad ni en las réplicas.
- No se implementan cuentas, directorio, depósitos remotos ni crianza.
- D6 queda **sin decidir**: el prototipo de vales de siete días de PG-08A/B se
  conserva y se estudia, pero no se adopta como política.
