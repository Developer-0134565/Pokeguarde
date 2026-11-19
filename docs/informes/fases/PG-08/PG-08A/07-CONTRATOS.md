# PG-08A — Contratos implementados

**Archivo:** `packages/core/src/shared-nurseries.ts` (1165 líneas, SHA-256
`bcc3309aecd816fda6648475bdd587a92a438884f4c6771973dce8e34055e513`).
**Naturaleza:** TypeScript puro. Sin Bun, SQLite, HTTP, fs, reloj propio,
`pet-engine.ts` ni PKHeX. No modifica producción.

---

## 1. Versionado

```
SCHEMA_ID        = "pg08a.shared-nurseries"
CONTRACT_VERSION = "1.0.0"
NURSERY_CAPACITY = 2
SUPPORTED_GENERATIONS = [1,2,3,4,5]
```

Todo `SyncEvent` lleva `schema` y `version`. `envelope()` exige ambos; una
versión futura puede añadir campos siempre que mantenga el envelope y pase los
validadores. Las claves desconocidas se rechazan (`UNKNOWN_KEY`) para evitar
interpretaciones ambiguas de contratos futuros.

---

## 2. Identificadores

Branded types: `OwnerId`, `NurseryId`, `StayId`, `PokemonInstanceId`, `EventId`,
`DepositRequestId`, `RecoveryRequestId`. Todos UUID v4 en minúsculas
(`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`).
Nunca se derivan de especie, mote, ranura, PID ni hash de datos.

**Idempotencia:** clave ASCII de 8–128 caracteres
(`/^[A-Za-z0-9._:-]{8,128}$/`). Aplica a comandos, eventos y `consentKey`.
Este detalle provocó dos defectos durante las pruebas (clave corta `dep-dup` y
clave acentuada `owner-Anfitrión`); ambos se resolvieron en la suite sin
debilitar el validador, porque los nombres de usuario SÍ pueden llevar acentos.

---

## 3. Entidades

| Entidad | Campos esenciales |
|---|---|
| `Owner` | `id`, `displayName`, `createdAt` — sin credenciales ni rutas |
| `Nursery` | `id`, `hostId`, visibilidad, admisión, conectividad, 3 banderas, `capacity=2`, `revision` |
| `PokemonRef` | `instanceId`, `origin` (gen1_2 por ranura / gen3_5 por PID + saveSha256), `dataSha256`, `verdict`, `capturedAt` |
| `Stay` | `id`, guardería, dueño, anfitrión, `ownershipRelation` (own/visitor), estado, 3 permisos, `revision`, marcas |
| `PermissionGrant` | `permission`, `grantedBy`, `stayId`, `grantedAt`, `revokedAt`, `consentKey`, `revision` |
| `DepositRequest` | `id`, guardería, dueño, Pokémon, `requestedAt`, `idempotencyKey` |
| `RecoveryRequest` | `id`, estancia, dueño, `hostConnected`, `reason`, idempotencia |
| `RecoveryVoucher` | `stayId`, `ownerId`, `nonce`, `issuedAt`, `expiresAt` (7 d), `revision`, `usedAt` |
| `SyncEvent` | `eventId`, `sequence`, `type`, `aggregateId`, `occurredAt`, `idempotencyKey`, `payload` |

14 tipos de evento: `owner.registered`, `nursery.registered`,
`nursery.connectivity`, `nursery.flags`, `pokemon.registered`,
`deposit.requested`, `deposit.accepted`, `deposit.rejected`, `permission.granted`,
`permission.revoked`, `recovery.requested`, `recovery.completed`, `care.applied`,
`breeding.requested`.

---

## 4. Validadores exportados

`validateOwner`, `validateNursery`, `validatePokemonRef`, `validateStay`,
`validateDepositRequest`, `validateRecoveryRequest`, `validateRecoveryVoucher`,
`validateSyncEvent`. Devuelven `Result<T> = {ok:true,value} | {ok:false,issues}`.

Comprobaciones: envelope de schema/versión, claves exactas, tipos, enumeraciones,
rangos numéricos, formato UUID/SHA-256/ISO-8601, `capacity === 2`,
`revokedAt === null | ISO`, etc.

Derivadores: `deriveNurseryState(nursery, activeCount)`, `isAdmittable`,
`isGenerationSupported`, `permissionActive`.

---

## 5. Operaciones (`createNurserySystem`)

| Operación | Autoridad | Resultado |
|---|---|---|
| `registerOwner` | cualquiera (simulación) | `owner.registered` |
| `registerNursery` | anfitrión registrado | estado derivado + `nursery.registered` |
| `registerPokemon` | registro | rechaza `illegal` y generación ∉ 1–5 |
| `requestDeposit` | propietario del Pokémon | siempre `request_pending` |
| `acceptDeposit` | anfitrión | capacidad atómica + revisión optimista |
| `rejectDeposit` | anfitrión | elimina solicitud |
| `grantPermission` | **solo propietario** | grants por estancia |
| `revokePermission` | **solo propietario** | `revokedAt` ya no es null |
| `care` | anfitrión | 7 acciones, sin tocar datos del Pokémon |
| `applyEvBerries` / `applyEvMinigame` | anfitrión + permiso vigente | `care.applied` |
| `requestBreeding` | anfitrión + permiso vigente | `BREEDING_NOT_IMPLEMENTED` |
| `setConnectivity` / `setNurseryFlag` | registro | recalcula estado derivado |
| `requestRecovery` / `completeRecovery` | **solo propietario** | vale de 7 días / retirada |
| `snapshot` / `exportEvents` / `restore` | auditoría | log inmutable y reconstrucción |

`publicOperations` enumera 19 operaciones. **No incluye** exportar, eliminar,
transferir ni cambiar propietario. `exportEvents()` vuelca el registro en memoria
para auditoría: no es una exportación de Pokémon ni escribe archivos.

---

## 6. Resultados y errores

```
OpResult<T> = {ok:true, value:T, eventId:EventId|null}
            | {ok:false, error:{code:ErrorCode, message, details?}}
```

22 códigos: `INVALID_INPUT`, `SCHEMA_VERSION_MISMATCH`, `NOT_FOUND`,
`UNAUTHORIZED`, `OWNER_MISMATCH`, `NURSERY_FULL`, `DUPLICATE_STAY`,
`POKEMON_ALREADY_HOSTED`, `NURSERY_NOT_AVAILABLE`, `CONSENT_REQUIRED`,
`PERMISSION_REQUIRED`, `PERMISSION_REVOKED`, `ILLEGAL_POKEMON`,
`UNSUPPORTED_GENERATION`, `STALE_REVISION`, `DUPLICATE_REQUEST`,
`INVALID_VOUCHER`, `VOUCHER_EXPIRED`, `STAY_NOT_ACTIVE`,
`BREEDING_NOT_IMPLEMENTED`, `INTERNAL_INCONSISTENCY` (y el `Issue` interno de
validación con `BAD_*`).

---

## 7. Compatibilidad futura

- `restore(log)` ordena por `sequence`, valida cada evento y reconstruye tanto el
  estado como la tabla de idempotencia (prefijo por tipo de comando).
- `initialEvents` permite arrancar el sistema desde un log previo.
- El envelope `schema`/`version` permite rechazar contratos futuros incompatibles
  sin confundirlos con datos corruptos.
- **NO se ha conectado a endpoints reales ni a la BD de producción.** El
  acoplamiento a SQLite/HTTP queda para PG-08B previa decisión humana.
