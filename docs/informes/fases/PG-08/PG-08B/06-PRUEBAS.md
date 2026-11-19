# PG-08B — Pruebas y resultados

**Estado:** 22/22 COMPROBACIONES CORRECTAS. Ejecutado con `bun run check`.

## 1. Suite

`scripts/pg08b-check.ts` integra 22 comprobaciones automáticas. Cada caso usa
una base SQLite temporal independiente bajo `/tmp/opencode/pg08b-*`, creada con
datos fijos (UUIDs deterministas, marca temporal `T0`, SHA-256 ficticio) y
eliminada al terminar. No se crea `data/shared-pg08b.db` durante las pruebas.

La suite calcula el SHA-256 de `data/pokegotchi.db` al inicio y al final y
falla si cambia (caso 21).

## 2. Casos cubiertos

| # | Caso | Resultado |
|---|---|---|
| 01 | Creación del EventStore | OK |
| 02 | Migración inicial (tablas, índices y meta) | OK |
| 03 | Cierre y reapertura | OK |
| 04 | Replay determinista / coincidencia de snapshots | OK |
| 05 | Integridad SQLite (`PRAGMA integrity_check`, hashes, ordinales) | OK |
| 06 | Secuencias globales y por agregado monótonas | OK |
| 07 | Idempotencia entre reinicios | OK |
| 08 | Rollback sin evento parcial | OK |
| 09 | Concurrencia | OK |
| 10 | `STALE_REVISION` | OK |
| 11 | Capacidad máxima de dos Pokémon | OK |
| 12 | Tercer depósito rechazado (`NURSERY_FULL`) | OK |
| 13 | Permisos desactivados por defecto (`null`; sin grant → `CONSENT_REQUIRED`) | OK |
| 14 | Revocación de permisos | OK |
| 15 | Recuperación por vale: emisión, canje, doble canje y anti-replay | OK |
| 16 | Caducidad y renovación del vale | OK |
| 17 | Protección de propiedad (el anfitrión carece de operaciones de dueño) | OK |
| 18 | Datos corruptos (payload alterado) | OK |
| 19 | Eventos desconocidos | OK |
| 20 | Versiones incompatibles en `meta` | OK |
| 21 | Ausencia de escrituras en producción | OK |
| 22 | Compatibilidad con PG-08A (mismo dominio y contrato) | OK |

## 3. Comando y salida

```sh
bun run scripts/pg08b-check.ts
# PG-08B: 22/22 comprobaciones correctas.
```

```sh
bun run check
# ...
# == Guarderías compartidas (PG-08A) ==
# PG-08A: 284/284 comprobaciones correctas.
# == Persistencia transaccional de guarderías (PG-08B) ==
# PG-08B: 22/22 comprobaciones correctas.
# Todo correcto.
```

Sin regresiones: Motor, Día/noche, Traducciones, PG-07A (54), PG-07B/C/D/E,
sidecar PKHeX, PG-07F (132), PG-07G (69/69) y PG-07H (101/101) siguen pasando.

## 4. Defectos encontrados y corregidos durante la implementación

1. **Persistencia incompleta (casos 05, 06, 10, 11, 12):** `execute` insertaba
   solo el evento principal devuelto en `OpResult.eventId`, pero
   `refreshNursery` emite un `nursery.flags` adicional. Se cambió a insertar
   todos los eventos nuevos (`fresh`). Sin esto, la revisión de la guardería no
   avanzaba en disco y aparecían `STALE_REVISION` falsos y huecos de secuencia.
2. **Expectativa de permiso (caso 13):** el dominio devuelve
   `CONSENT_REQUIRED` cuando no hay ningún grant, no `PERMISSION_REQUIRED`. Se
   corrigió la expectativa del test, no el dominio.
3. **Clave de idempotencia ausente (casos 15, 16):** los input de
   `completeRecovery` no incluían `idempotencyKey`, por lo que
   `validateSyncEvent` rechazaba el evento al persistir. Se añadió la clave a
   los comandos de prueba.
4. **`STALE_REVISION` en recuperación (caso 10):** el test usaba una solicitud
   ya aceptada y borrada (`NOT_FOUND`). Se cambió a una solicitud pendiente.
5. **Ordinal por agregado (caso 05):** `integrityCheck` comparaba cada fila
   contra el total de eventos del agregado. Se corrigió para comparar contra el
   ordinal acumulado dentro de ese agregado.

Todas las correcciones afectaron al store o a las pruebas; **el dominio PG-08A
no se modificó** (hash `bcc3309…` intacto).

## 5. Alcance de las pruebas

Estas pruebas verifican propiedades del store local y del dominio sobre el
mismo proceso. NO verifican redes, permisos entre usuarios, cifrado,
disponibilidad de un servicio remoto ni recuperación offline real. Ver
[05-autoridad-y-limites.md](05-AUTORIDAD-Y-LIMITES.md).
