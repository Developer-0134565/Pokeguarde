# PG-08C — Resultados de pruebas

**Comando:** `bun run scripts/pg08c-check.ts` → **33/33 comprobaciones correctas**.
**Integración:** sección PG-08C en `scripts/check.sh`, antes de «Todo correcto.».

## 1. Cobertura

| Bloque | Casos | Aspectos verificados |
|---|---|---|
| Autoridad e identidad | 01-04 | Token HMAC inválido rechazado; `ownerId` suelto detectado; idempotencia por `commandId`; recibo persistido |
| D5 (revisión optimista) | 02, 03, 19 | `STALE_REVISION`, revisión correcta, dos depósitos simultáneos |
| Outbox | 05, 07, 08, 30 | Atomicidad, un mensaje por evento, `claim`/`ack`, `nack`/`retryFailed`, integridad conjunta |
| D7 (durabilidad) | 06, 09-16 | Tres réplicas, sync inicial e incremental, desconexiones, reconexión, reinicio, duplicados, retrasos, huecos, `reconcile` |
| Capacidad y propiedad | 17, 18, 20, 28 | Máximo dos, tercer depósito sin efectos, titularidad inalterada, sin duplicados |
| Permisos y recuperación | 21-27 | Consentimiento, concesión/revocación, revocación durante operación, recuperación vs cuidado, doble solicitud, doble canje, caducidad |
| Aislamiento | 29, 31-33 | Réplicas sin `execute`, `commandIdOf`, rechazo de `pokegotchi.db`, hashes inalterados |

## 2. Resultado global de `bun run check` (EXIT 0)

Motor, Día/noche, Traducciones, PG-07A 54, PG-07B/C/D/E, sidecar PKHeX,
PG-07F 132, PG-07G 69/69, PG-07H 101/101, PG-08A 284/284, PG-08B 22/22,
**PG-08C 33/33**. La frase final es «Todo correcto.».

## 3. Aislamiento

Cada caso usa un directorio temporal `mkdtempSync('/tmp/opencode/pg08c-…')`,
eliminado al terminar. No se abren sockets ni servicios. Ninguna prueba escribe
en `data/pokegotchi.db`; el caso 33 compara su SHA-256 antes y después. El caso
32 confirma que `openSharedStore` rechaza explícitamente esa ruta.

## 4. Hallazgos durante la implementación

1. El dominio valida `idempotencyKey` con `[A-Za-z0-9._:-]{8,128}`; los
   `commandId` cortos (`c-mon-1`) causaban 27 fallos. `cmd()` normaliza ahora
   a `cmd:<id>`.
2. `refreshNursery` emite eventos adicionales: se persiste **todo** el log
   nuevo, no solo `OpResult.eventId`.
3. Tres bugs en `shared-event-queue.ts` por usar nombres camelCase sobre filas
   SQL (`row.eventId` vs `row.event_id`): corregidos en `integrityCheck` y
   `syncReplica`.
4. El dominio permite renovar una recuperación con otro `request.id`; el vale
   anterior queda obsoleto (`STALE_REVISION`). Esto es comportamiento del
   prototipo PG-08A, **no** una decisión D6 aprobada.

## 5. No cubierto

No se prueban transportes reales, relojes ni concurrencia entre procesos del
sistema operativo: la autoridad es una sola instancia en memoria dentro del
mismo proceso. No hay pruebas de estrés ni de recuperación ante fallo de disco.
