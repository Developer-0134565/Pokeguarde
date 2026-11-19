# PG-08A — 3. Modelo de permisos

## Los tres permisos

| Permiso | Efecto que autoriza | Estado inicial |
|---|---|---|
| `allow_ev_berries` | Aplicar bayas reductoras de EV / stat exp | `null` (desactivado) |
| `allow_ev_minigames` | Aplicar EV ganados en minijuegos al Pokémon visitante | `null` |
| `allow_breeding` | Solicitar crianza (PG-08A **no** la implementa) | `null` |

Son independientes: conceder uno no altera los otros. Cada uno se representa
como `PermissionGrant | null` dentro de `Stay.permissions`, con `grantedBy`,
`grantedAt`, `revokedAt`, `consentKey` y una revisión propia.

## Reglas

1. **Desactivados por defecto.** Toda estancia nace con los tres a `null`. No
   existe permiso implícito por ser anfitrión ni por ser amigo.
2. **Consentimiento explícito.** `grantPermission` exige `ownerId` igual al
   propietario y una `consentKey` ASCII de 8-128 caracteres. Sin ella:
   `CONSENT_REQUIRED`.
3. **Específicos por estancia.** El permiso no es global al usuario: muere con
   la estancia. Un mismo visitante en otra guardería debe concederlo de nuevo.
4. **Revocables.** `revokePermission` marca `revokedAt` y aumenta la revisión.
   Las operaciones posteriores devuelven `PERMISSION_REVOKED`.
5. **Verificables.** `permissionActive()` comprueba existencia, no revocación y
   vigencia temporal (`at >= grantedAt`). El estado se consulta en
   `Stay.permissions` y queda en el registro de eventos.
6. **Sin implicaciones de cuidado normal.** `care()` (comer, jugar, limpiar,
   dormir, despertar, acariciar, reprender) no requiere ninguno de estos tres
   permisos y nunca modifica los datos del Pokémon.

## Operaciones iniciadas antes de una revocación

**PENDIENTE DE DECISIÓN DE PRODUCTO.** El contrato solo garantiza que la
revocación bloquea operaciones *nuevas*: la comprobación se hace en el momento
de ejecutar `applyEvBerries`, `applyEvMinigame` o `requestBreeding` contra el
estado vigente de la estancia. No se inventa una política de reversión ni de
"gracia" para operaciones ya aceptadas. Un servidor real deberá decidir si una
operación ya emitida pero no confirmada se cancela, se completa o se compensa;
la recomendación técnica es **cancelarla y dejar constancia**, pero no se ha
adoptado como regla del juego.

## Compatibilidad con PKHeX.Core

`applyEvBerries` y `applyEvMinigame` son comprobaciones de autorización en el
modelo aislado: emiten `care.applied` y devuelven la estancia, pero **no escriben
EV ni stats**. En la aplicación real, cualquier cambio de EV debe seguir el
protocolo existente: topes por generación (255/510 en Gen 3-5; 65535/stat exp
en Gen 1-2), recorte vitamínico con `withheld`, y revalidación de legalidad con
PKHeX.Core. IV/DV siguen bloqueados. `unverified` no equivale a `illegal`.

## Crianza

`requestBreeding` valida `allow_breeding`, emite `breeding.requested` para
auditoría y devuelve `BREEDING_NOT_IMPLEMENTED`. No hay huevos, reglas de
compatibilidad ni CPUs de crianza en PG-08A.
