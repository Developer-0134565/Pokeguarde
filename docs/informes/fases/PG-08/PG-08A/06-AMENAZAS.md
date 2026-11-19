# PG-08A — Modelo de amenazas

**Alcance:** contratos aislados. Las mitigaciones marcadas «simulada» existen en
`packages/core/src/shared-nurseries.ts`; las marcadas «requiere servicio» son
diseño para PG-08B y NO están implementadas.

| # | Amenaza | Riesgo | Impacto | Mitigación en el modelo | Validación | Riesgo residual |
|---|---|---|---|---|---|---|
| 1 | Suplantación de propietario | Atacante envía `requestRecovery` o `grantPermission` como otro | Robo del Pokémon, permisos falsos | Comprobación `ownerId === stay.ownerId` en recuperación, concesión y revocación | Tests 2, 8 | **ALTO en producción**: `OwnerId` es solo un UUID sin autenticación; requiere autenticación real (pendiente) |
| 2 | Manipulación de identificadores | IDs falsos, rutas traversal, UUID inválidos | Colisiones, acceso a otra entidad, corrupción | IDs branded UUID v4 + validadores estrictos con regex en todas las entidades | Tests 12, 18 | Medio: la validación sintáctica no demuestra titularidad |
| 3 | Duplicación de Pokémon | Mismo Pokémon alojado en dos guarderías | Copias competitivas, pérdida de unicidad | `Map<PokemonInstanceId,StayId>` global `hosted`; rechazo `POKEMON_ALREADY_HOSTED` | Tests 3, 4, 11 | **ALTO**: el usuario conserva su `.srm`; no se puede impedir una copia externa del archivo (RFC §Anti-duplicación) |
| 4 | Eliminación indebida | Anfitrión retira o borra un Pokémon ajeno | Pérdida para el propietario | No existe operación `delete`/`remove` en `publicOperations`; solo el propietario puede completar recuperación | Test 19 | Medio: requiere que el servicio real no exponga otras rutas |
| 5 | Modificación de permisos | Anfitrión concede/revoca por su cuenta | EV o crianza no autorizados | `grantPermission`/`revokePermission` exigen `ownerId === stay.ownerId` | Tests 2, 6, 7 | Medio: dependerá de la autenticación futura |
| 6 | Repetición de solicitudes | Reenvío de un mensaje por fallo de red | Doble depósito, doble gasto, doble retirada | `dedupe()` por clave de idempotencia devuelve el mismo `OpResult` y `eventId`; `RecoveryVoucher.usedAt` | Tests 10, 14 | Bajo en el modelo; requiere persistencia de la tabla de idempotencia en producción |
| 7 | Solicitudes simultáneas | Dos `acceptDeposit` sobre la misma plaza | Superar capacidad 2 | Revisión optimista `expectedNurseryRevision` → `STALE_REVISION`; comprobación de capacidad en la misma sección crítica simulada | Test 11 | Medio: en un servidor real exige transacción atómica / bloqueo de fila |
| 8 | Desconexiones | Anfitrión offline durante la retirada | Pokémon retenido indefinidamente | Vale emitido por el registro, no por el anfitrión; `hostOfflineNoted` informativo | Test 9 | **requiere servicio**: sin registro duradero no hay garantía real |
| 9 | Restauración de estados antiguos | Replay de un log viejo o rollback | Resurrección de estancias cerradas, duplicados | `SyncEvent.sequence` monótono + `restore()` + idempotencia reconstruida por prefijo | Test 14 | Medio: sin firma ni hash encadenado, un atacante con acceso al log puede reescribirlo |
| 10 | Corrupción de mensajes | Payload inválido o modificado | Estados inconsistentes | Validación estricta de los 14 tipos de evento, claves desconocidas rechazadas, `validateSyncEvent` en `restore()` | Tests 12, 14 | Medio: no hay MAC/firma; requiere TLS + firma en tránsito (RFC PROPUESTA) |
| 11 | Cliente modificado | Frontend alterado que salta comprobaciones | Operaciones no autorizadas | Todas las reglas viven en el módulo de dominio, no en la UI; la superficie pública carece de exportar/eliminar/transferir | Test 19 | Medio: el módulo se ejecuta donde lo invoque el servidor; hay que no confiar nunca en el cliente real |
| 12 | Alteración de legalidad | Modificar especie, IV, met data, EV fuera de tope | Pokémon ilegal, manipulación competitiva | `verdict === 'illegal'` rechazado; `isAdmittable` distingue `unverified`; cuidado no toca `stay.pokemon`; permisos EV separados | Tests 5, 17, 19 | Medio: el módulo no revalida con PKHeX; la autoridad sigue siendo el sidecar en producción |
| 13 | Exposición de datos privados | Filtrar rutas, saves, IV o identidad | Violación de privacidad | Entidades sin `stored_path`, credenciales ni rutas; visibilidad separada de admisión/connectivity; `snapshot()` solo expone estado del modelo | Tests 15, 16, 19 | **ALTO en producción**: cifrado en reposo/tránsito y control de acceso son PROPUESTA no implementada |

---

## Notas transversales

- **No confiar en el frontend:** la app actual valida en `apps/server/src/index.ts`;
  el módulo PG-08A traslada la autoridad al dominio, pero NO está conectado a
  endpoints. Ninguna comprobación de esta tabla depende de la UI.
- **Cifrado:** `docs/POKEMON_SECURITY_RFC.md` propone AES-256-GCM/ChaCha20-Poly1305,
  KMS/HSM y TLS 1.2+. Es PROPUESTA. No se implementó ni se activó nada.
- **Transaccionalidad:** el registro simulado es单线程 y secuencial. La_version real
  debe envolver depósito/aceptación/recuperación en transacciones e idempotencia
  persistente (AGENTS.md PG-08, seguridad).
- **Prioridad de riesgo residual:** autenticación (1), servicio autoritativo (8),
  cifrado/control de acceso (13) y anti-duplicación de archivos (3) son los cuatro
  bloqueos antes de cualquier despliegue.
