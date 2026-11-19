# PG-08B — Decisiones pendientes (D4-D9)

**Estado:** PROPUESTAS NO ADOPTADAS. Ninguna se ha implementado ni se ha
ejecutado silenciosamente como parte de PG-08B.

## Resumen de estado

| Decisión | Estado en PG-08B |
|---|---|
| D1 — Identidad | ✅ Aprobada e implementada **solo como interfaz** (`OwnerAuthenticator`). Sin cuentas ni login. |
| D2 — Autoridad | ✅ Aprobada y diseñada. EventStore local de desarrollo; NO servidor desplegado. |
| D3 — Persistencia | ✅ Aprobada e implementada (`data/shared-pg08b.db`, aislado de producción). |
| D4 — Invitaciones / descubrimiento | ⏳ PENDIENTE |
| D5 — Conflictos | ⏳ PENDIENTE |
| D6 — Recuperación offline | ⏳ PENDIENTE |
| D7 — Sincronización | ⏳ PENDIENTE |
| D8 — Retención | ⏳ PENDIENTE |
| D9 — Abusos | ⏳ PENDIENTE |

## D4 — Invitaciones y descubrimiento

Sin decidir. La recomendación técnica de PG-08A sigue siendo **solo
invitación + amigos mutuos**, sin directorio público activo. No se ha creado
ningún directorio ni flujo de invitación.

## D5 — Conflictos y autoridad

Sin decidir para despliegue. El dominio ya aplica revisión optimista
(`STALE_REVISION`) y PG-08B la preserva en cada transacción, pero **no se ha
definido** el comportamiento del registro central cuando dos clientes
convergen. Queda prohibido adoptar *last-write-wins* sin decisión humana.

## D6 — Recuperación con anfitrión desconectado

Sin decidir para uso real. PG-08B conserva el modelo de vale de siete días y
renovación, y lo verifica localmente. No se ha demostrado recuperación offline
entre usuarios ni se ha definido quién firma el vale en el registro central.
Un vale caduca; la propiedad y el derecho de recuperación no.

## D7 — Sincronización

Sin decidir. No hay endpoints de sondeo, ni versión de vector de relojes, ni
política de resolución entre caché y autoridad. El log local es append-only y
está listo para exportarse, pero no se sincroniza con nada.

## D8 — Retención y privacidad

Sin decidir. No hay plazos de borrado, anonimización de cuidado a 30 días ni
política de retención de snapshots. Ningún `.srm` se guarda en este store.

## D9 — Abusos y cuotas

Sin decidir. No hay rate limiting, cuotas por propietario ni verificación de
duplicación externa de saves. La capacidad 2 y la idempotencia del store son
defensas parciales, no una política anti-abusos completa.

## Orden recomendado (NO autorizado automáticamente)

`D1+D2` → `D3+D7` → `D5+D6` → `D4+D9` → `D8`.

D1, D2 y D3 ya están cerradas en esta fase. El siguiente paso lógico es
**PG-08C**, que debe partir de una decisión humana explícita sobre D5, D6 y D7
antes de cualquier servicio compartido.
