# PG-08B — Transaccionalidad e idempotencia

**Estado:** IMPLEMENTADO Y VERIFICADO.

## 1. Secuencia de un comando

`SharedNurseryStore.execute(command)` sigue estrictamente el orden exigido:

1. **Autenticación (D1).** `command.auth` debe ser un `AuthenticatedOwner` válido
   (`ownerId` UUID v4, `verifiedAt` ISO). No se acepta un `ownerId` suelto.
2. **Bloqueo.** `BEGIN IMMEDIATE`: se serializan los escritores antes de leer.
3. **Validación y reconstrucción.** Se construye un *candidate* con
   `createNurserySystem(this.readEvents())`. El dominio valida esquema, claves,
   revisión y precondiciones; el store **no duplica esas reglas**.
4. **Autoría.** Se comprueba que la identidad autenticada corresponde al
   propietario/actor/host derivado del comando. Para `registerPokemon` no hay
   campo de propietario en el contrato: la propiedad se establece después en
   `requestDeposit`.
5. **Ejecución.** Se despacha al método correspondiente del dominio.
6. **Persistencia atómica.** Se capturan los `eventId` existentes *antes* de
   ejecutar (`before`) y se insertan **todos** los eventos nuevos del candidate
   (`fresh = exportEvents().filter(e => !before.has(e.eventId))`).
7. **Commit.** `COMMIT` y reconstrucción del sistema observable desde la BD.
8. **Fallo.** Cualquier excepción produce `ROLLBACK` y una nueva materialización
   desde la BD, de modo que nunca queda un evento parcial ni un estado en
   memoria que contradiga lo persistido.

## 2. Por qué hay que insertar todos los eventos nuevos

`OpResult.eventId` identifica el evento **principal**, pero un comando puede
emitir varios. En particular, `refreshNursery` (PG-08A L684-694) emite un
`nursery.flags` adicional **antes** del evento principal en `acceptDeposit`,
`requestRecovery` y `completeRecovery` cuando cambia el estado derivado de la
guardería.

Un `acceptDeposit`correcto produce, por ejemplo:

| sequence | tipo |
|---|---|
| 6 | `nursery.flags` (revisión de la guardería 1 → 2) |
| 7 | `deposit.accepted` |

Persistir solo el evento principal perdería la secuencia 6: la revisión no
avanzaría en disco y un segundo depósito con `expectedNurseryRevision: 1`
obtendría incorrectamente `STALE_REVISION`. Este defecto se detectó con las
pruebas 05/06/10/11/12 y se corrigió insertando `fresh` completo.

## 3. Idempotencia

El dominio ya deduplica por clave compuesta `${prefijo}:${idempotencyKey}` y,
al rehidratar con todos los eventos, reconstruye ese mapa. Por tanto:

- Repetir un comando con la misma clave devuelve el **`eventId` original** y
  `inserted: false`: no se emite ni se inserta nada.
- El store additionally comprueba `dedupe_key UNIQUE` y `event_id PK` en SQL como
  segunda barrera.
- Un vale ya canjeado con una clave distinta no se «reintenta»: el dominio
  devuelve `STALE_REVISION` (protección anti-replay) y el store no inserta.
- `completeRecovery` sobre una estancia ya finalizada sin dedupe devuelve
  `OK(stay, null)`: operación legítima sin evento.

La comprobación `result.eventId !== null && !before.has(result.eventId)` evita
confundir un rejudo con un evento desaparecido: en un rejudo el `eventId` ya
está en `before` y no exige persistencia.

## 4. Garantías observables

| Garantía | Mecanismo | Prueba |
|---|---|---|
| Un evento, una inserción | `event_id` PK + `dedupe_key` UNIQUE + `fresh` | 07, 15 |
| Secuencia global sin huecos | `sequence UNIQUE` + `integrityCheck()` | 05, 06 |
| Ordinal por agregado correcto | `UNIQUE(aggregate_id, aggregate_sequence)` + `integrityCheck()` | 05 |
| Revisión obsoleta rechazada | dominio `STALE_REVISION` | 10 |
| Capacidad máxima 2 | dominio `NURSERY_FULL` | 11, 12 |
| Sin evento parcial | `BEGIN IMMEDIATE` / `ROLLBACK` | 08 |
| Concurrencia | bloqueo de escritura + reconstrucción dentro de la transacción | 09 |
| Replay determinista | `createNurserySystem(readEvents())` | 04, 07 |

## 5. Concurrencia

Bun SQLite es síncrono en un mismo proceso, pero `BEGIN IMMEDIATE` garantiza
que, incluso con otra conexión a la misma BD, las transacciones de escritura se
serializan. La reconstrucción del *candidate* ocurre **dentro** de la
transacción, de modo que la secuencia y la revisión se calculan sobre el estado
más reciente confirmado, nunca sobre una copia obsoleta en memoria.
