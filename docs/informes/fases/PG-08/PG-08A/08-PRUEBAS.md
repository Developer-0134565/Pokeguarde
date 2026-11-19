# PG-08A — Pruebas ejecutadas

**Comando:** `bun run scripts/pg08a-check.ts`
**Resultado:** `PG-08A: 284/284 comprobaciones correctas.` — EXIT 0.
**Integración:** `scripts/check.sh` incluye la sección
`== Guarderías compartidas (PG-08A) ==` justo antes del `Todo correcto.` final.
**Regresiones:** `export PATH="$HOME/.dotnet:$PATH" && bun run check` → EXIT 0 con
Motor, Día/noche, Traducciones, PG-07A (54), B, C, D, E, sidecar .NET (0 avisos /
0 errores), PG-07F (132), PG-07G (69/69), PG-07H (101/101) y PG-08A (284/284).

---

## Cobertura de las 20 pruebas exigidas

| # | Prueba | Resultado | Mecanismo comprobado |
|---|---|---|---|
| 1 | Propietario válido | ✅ | `validateOwner`, registro y conservación del nombre acentuado |
| 2 | Propietario incorrecto | ✅ | `OWNER_MISMATCH` en recuperación, concesión y revocación |
| 3 | Capacidad máxima de dos | ✅ | `hosted=2`, estado `full`, `validateNursery` válida |
| 4 | Intento de tercer depósito | ✅ | `NURSERY_FULL`, sin nuevo alojamiento |
| 5 | Permisos desactivados por defecto | ✅ | 3 grants `null`; EV/breeding dan `CONSENT_REQUIRED` |
| 6 | Consentimiento explícito | ✅ | `consentKey` inválida rechazada; concesión y uso correctos; independencia de permisos |
| 7 | Revocación | ✅ | `PERMISSION_REVOKED` en nuevas operaciones; doble revocación rechazada; cuidado normal intacto |
| 8 | Recuperación por propietario | ✅ | vale válido, `stay_finished`, alojamiento liberado, guardería disponible |
| 9 | Recuperación con anfitrión offline | ✅ | `disconnected` + `hostConnected=false` → `hostOfflineNoted=true` y retirada completada |
| 10 | Solicitudes duplicadas | ✅ | misma clave → mismo `eventId`; otra clave con mismo ID → `DUPLICATE_REQUEST` |
| 11 | Operaciones concurrentes simuladas | ✅ | dos accepts con la misma revisión → uno gana, otro `STALE_REVISION`; nunca 2 alojamientos |
| 12 | Identificadores inválidos | ✅ | UUID/ruta/referencia rechazados en validadores y operaciones (incluido `requestId` de `acceptDeposit`) |
| 13 | Estados inconsistentes | ✅ | `unavailable`, `disconnected`, `syncError`, ocupación 3 → estados derivados y rechazo de depósito |
| 14 | Repetición de mensajes | ✅ | replay de 9 eventos reconstruye estancia y permisos; idempotencia sobrevive al reinicio |
| 15 | Guardería privada | ✅ | visitante `UNAUTHORIZED`; anfitrión OK con relación `own` |
| 16 | Pública sin aceptación automática | ✅ | solicitud queda pendiente; admisión cerrada rechaza; aceptación explícita crea relación `visitor` |
| 17 | Pokémon sin legalidad verificada | ✅ | `unverified` admisible, `illegal` rechazado en registro |
| 18 | Compatibilidad generacional | ✅ | Gen 1–5 registradas, depositadas y válidas; Gen 6 y ranura 0 rechazadas |
| 19 | Separación local/compartida | ✅ | cuidado no altera `pokemon`; superficie pública sin operaciones de propiedad; módulo sin dependencias de producción |
| 20 | Ausencia de escritura en producción | ✅ | hash de BD idéntico antes/después; suite integrada; motor intacto; sin script `apply` |

---

## Defectos encontrados y corregidos durante la ejecución

1. `acceptDeposit` comprobaba `!uuid(...).length === false`, que nunca rechazaba
   IDs inválidos. Corregido a `uuid(...).length > 0`.
2. `envelope()` rechazaba todas las claves de cada entidad por usar `keys()` con
   solo `schema`/`version`. Corregido: comprueba únicamente el envelope.
3. Los comandos `registerOwner`/`registerNursery`/`registerPokemon` mezclaban
   `idempotencyKey`/`at` con el payload validado. Añadidos `payloadOf` y `withoutAt`.
4. La función validadora `idempotency` quedaba sombreada por el `Map` local del
   sistema. Renombrada a `validIdempotencyKey`.
5. El replay no consumía `deposit.requested`; añadida la eliminación de la
   solicitud al aplicar `deposit.accepted`.
6. `restore()` reconstruía la idempotencia con un prefijo inútil; ahora mapea el
   tipo de evento al prefijo del comando original.
7. El voucher de recuperación se emitía con la revisión anterior y fallaba con
   `STALE_REVISION`; ahora usa `stay.revision + 1`.
8. En la suite, semillas con clave < 8 caracteres (`dep-dup`) y con acento
   (`owner-Anfitrión`) rompían la validación. Corregido en la suite: `dupok` y
   claves ASCII `owner-{i}-reg`. El validador NO se debilitó.
9. Test 19 daba falso positivo con `exportEvents` por búsqueda substring; ahora
   compara nombres exactos y afirma explícitamente que `exportEvents` es solo
   auditoría del registro.

---

## Alcance de la verificación

- **VERIFICADO:** todas las propiedades de la tabla anterior, ejecutadas contra
  el módulo real en memoria.
- **NO VERIFICABLE:** cifrado, autenticación, base de datos multijugador,
  concurrencia entre procesos, recuperación real con servidor caído, crianza.
  No existen en esta fase y ninguna prueba finge que existen.
