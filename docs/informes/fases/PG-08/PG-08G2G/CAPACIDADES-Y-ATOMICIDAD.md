# PG-08G.2G — CAPACIDADES Y ATOMICIDAD 1+1

**Resultado:** capacidades RECONCILIADAS; interacciones propuestas, no aprobadas. Invariante 1+1 preservado.

## 1. Los cuatro contadores, separados

| Contador | Capacidad | Naturaleza | Autoridad sobre el piloto |
|---|---|---|---|
| Pendientes por usuario | **2** iniciales | APPROVED (`G2G-BR-02`) | Sí |
| Inventario de huevos recogidos | **20** `claimed` por usuario | APPROVED (`G2G-BR-01`) | Sí |
| Store de prueba C2 | **4** (`DEFAULT_PAIR_CAPACITY`, `shared-egg-pair-store.ts:56`) | dato de prueba | **Ninguna**: no reutilizar como límite de producción |
| Backlog de prueba | **0** (`DEFAULT_BACKLOG_CAPACITY`, `shared-egg-store.ts:50`) | dato de prueba | Ninguna; `single` |
| C4 incubación simultánea | no existe | DEFERRED | Ninguna; no crear |
| PC Boxes | capacidad propia de saves | subsistema independiente (`main.ts:368-392`) | Ninguna; no confundir con inventario de huevos |
| Custodia de Pokémon | 2 por guardería | DECIDED (`AGENTS.md`) | No es capacidad de huevos |

El error a evitar es un único número «capacidad». `CAPACITY_STATES = ['produced','pending_assignment','stored']` (`egg-domain.ts:428-429`) mide el C2 histórico, **no** el inventario de `claimed` de BR-01. V4 §1 y `INVENTARIO-Y-PENDIENTES.md §2` lo resolvieron documentalmente sin redefinir C2.

## 2. Interacción entre ambos usuarios (invariante)

Un evento exitoso = exactamente **un huevo para el propietario A y uno para el B**, en la misma transacción SQLite. La comprobación de capacidad se hace para **ambos antes de confirmar**. Si cualquiera no cabe, no se confirma ninguno: prohibida entrega parcial y reasignación al otro propietario (PG-08F; V4 §7.1).

Verificado en el store de prueba: `usageFor(recipientId)` cuenta `produced`/`pending_assignment`/`stored` (`shared-egg-pair-store.ts:348-352`); `produceTx()` se envuelve en `atomic()` (`:358-360`); `cycle_id` duplicado se trata como reproceso (`:366-369`); `UNIQUE(cycle_id, recipient_role)` e `idempotency_key UNIQUE` (`:169,155,183`). Estos mecanismos son base reutilizable, no implementación del piloto.

## 3. Propuestas para los seis casos exigidos

Todas son **PROPUESTAS** (`PROPOSED`), no decisiones aprobadas, salvo donde se cita contrato vigente.

| Caso | Propuesta | Fundamento | Estado |
|---|---|---|---|
| **Pendiente lleno de uno** | Fallo atómico del par: `PENDING_FULL`/`CAPACITY_EXHAUSTED`, cero huevos, **sin consumir** la clave de idempotencia; se reevalúa en el siguiente chequeo | `shared-egg-store.ts:506` ya no consume idempotencia con capacidad agotada; V4 §2; G2E C-3 | PROPOSED (conducta exacta abierta en V4 §9) |
| **Pendiente lleno de ambos** | Igual: ningún huevo; se registran ambos destinatarios en el motivo; no se elige prioridad ni se reparte | Invariante 1+1; prohibida entrega parcial | PROPOSED |
| **Recogida con inventario lleno** | `INVENTORY_FULL`/`CAPACITY_EXHAUSTED` sobre `claimed`; la clave de recogida **no** se consume; el huevo permanece pendiente; `pending ≤ 2` sigue vigente | G2E §5.5; G2F conflictos A-2 | PROPOSED |
| **Liberación de una posición pendiente** | Solo por transición legítima a `claimed` (recogida confirmada) o `cancelled`; `claimed` libera pendiente pero ocupa inventario. Nunca borrar un huevo para liberar capacidad; `setCapacity(n < usage())` → `CAPACITY_BELOW_USAGE` sin destruir | `CAPACIDAD-Y-ATOMICIDAD.md §2,5,6`; `shared-egg-store.ts:375-381` | Base IMPLEMENTED en store de prueba; regla vigente |
| **Reconexión y reintento** | `cursor` persistido; `checkId` y resultado persistidos antes de producir; `replay`/`retry`/`drainBacklog` reproducen el mismo resultado; `created:false` en reintentos | V4 §6, `OFFLINE-ALL.md §5`, G2E §6 | Base IMPLEMENTED en store de prueba; conexión futura |
| **Atomicidad 1+1** | `BEGIN IMMEDIATE`: verificar no reproceso → capacidad para ambos → crear dos huevos por rol → transición de ambos → eventos → marca de progreso → `COMMIT`; cualquier fallo → `ROLLBACK` | `PRODUCCION-Y-RECOGIDA.md §3`; V4 §6 | PROPOSED para el piloto; patrón IMPLEMENTED en stores |

## 4. Resolución técnica sin nueva decisión de producto

La única duda abierta en V4 §9 era «¿se cancela el par o se retiene de otra forma?» ante pendiente lleno. Con `backlogMode = single` y una clave de idempotencia **no consumida**, laconducta determinista es: no producir, persistir el resultado del chequeo como fallido/saltado y reevaluar en el siguiente `checkId`. No se crea cola, no se cancela nada, no se pierde el huevo (nunca existió) y no se inventa caducidad. Esto es una consecuencia de contratos ya aprobados (PG-08B/F + `G2G-BR-02/03/08`), no una decisión nueva; queda no obstante registrada como propuesta para ratificación en `DECISIONES-HUMANAS-PENDIENTES.md`.

## 5. Caducidad y reglas no inventadas

**No se inventan** caducidad de pendientes, eliminación automática, descarte ni reasignación. La caducidad de huevos en cola depende de D8-A (retención) y está `UNRESOLVED` (`CAPACIDAD-Y-ATOMICIDAD.md §8`; `DECISIONES-D4-D8-D9.md:179`). Se eleva como decisión pendiente. Tampoco se fijan precios, niveles ni máximo de mejoras de la tienda (`G2G-BR-02`: fuera de alcance).

## 6. Errores y límites

`PENDING_FULL`, `INVENTORY_FULL`, `CAPACITY_EXHAUSTED`, `CAPACITY_BELOW_USAGE`, `CLAIM_DUPLICATE`, `PAIR_PARTIAL_DELIVERY`, `SINGLE_BACKLOG_FORBIDDEN`, `STORE_ISOLATION_VIOLATION` (rechazo explícito de `data/pokegotchi.db` en `shared-egg-store.ts:242-243` y `shared-egg-pair-store.ts:219-220`). Atomicidad real únicamente intra-SQLite; entre BD de eventos, BD de pares, frontend y red se usa reconciliación, no transacción distribuida.
