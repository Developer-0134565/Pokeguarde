# POKEGUARDE — Informe final PG-08A

**Misión:** Arquitectura de Guarderías Compartidas, propiedad y seguridad.
**Agente:** Beam (OpenCode).
**Fecha:** 19-nov-2026.
**Estado:** **COMPLETADA Y ENTREGADA**.
**Criterio de verdad:** todo lo marcado VERIFICADO fue ejecutado y comprobado; todo lo marcado PENDIENTE DE COMPROBAR o PROPUESTA no se presenta como funcionalidad existente.

---

## 1. Resumen ejecutivo

PG-08A ha auditado la arquitectura actual de Pokeguarde, diseñado e implementado contratos tipados aislados para guarderías compartidas, y demostrado mediante 284 comprobaciones automáticas que el modelo respeta la propiedad permanente, los permisos revocables, el límite de dos Pokémon y la recuperación sin depender de que el anfitrión esté conectado.

**No se ha activado ningún servicio online, no se han modificado partidas ni la base de datos real, no se ha implementado crianza y no se han realizado commits ni pushes.**

| Criterio de aceptación | Resultado |
|---|---|
| Contratos definidos y validados | VERIFICADO |
| Propiedad original protegida por el modelo | VERIFICADO |
| Tres permisos independientes y revocables | VERIFICADO |
| Capacidad máxima dos | VERIFICADO |
| Recuperación offline técnicamente viable | VERIFICADO **en el modelo**; servidor real PENDIENTE |
| Amenazas principales documentadas | VERIFICADO (13 amenazas) |
| Decisiones pendientes identificadas | VERIFICADO (9 decisiones) |
| Pruebas satisfactorias | VERIFICADO (284/284, `bun run check` EXIT 0) |
| Sin cambios en producción | VERIFICADO (17/17 hashes, 0 commits) |
| Informe final entregado | VERIFICADO (este documento) |

---

## 2. Autorización y límites cumplidos

La misión autorizó expresamente: auditar, diseñar contratos, implementar tipos/interfaces/validadores aislados, crear pruebas, documentar decisiones, delegar auditorías y corregir defectos dentro del alcance. No requirió confirmaciones intermedias.

**Prohibiciones respetadas:** activar servicios online; modificar partidas; escribir en SQLite real; implementar crianza; tocar legalidad, exportaciones, `pet-engine.ts`, sprites o fondo canónico; instalar dependencias; commits y pushes.

**Únicos archivos del repositorio tocados:**

| Archivo | Acción | SHA-256 final |
|---|---|---|
| `packages/core/src/shared-nurseries.ts` | NUEVO (1165 líneas) | `bcc3309aecd816fda6648475bdd587a92a438884f4c6771973dce8e34055e513` |
| `scripts/pg08a-check.ts` | NUEVO (390 líneas) | `5268c930697593a2c631eb40fd5bfdba91e587ab8da638933c39b5752b093cfc` |
| `scripts/check.sh` | EDITADO (3 líneas) | `de0575d62530d6ff3161f0ff3aef30dde3ab73b31a7aac123716f42f703cc455` |

---

## 3. Auditoría de arquitectura

Se leyó el corpus obligatorio y se inspeccionó el código en modo READ-ONLY, con un subagente de auditoría independiente. Resultado completo en `PG-08A/01-AUDITORIA.md`.

**Clasificación de decisiones (no se asumió que los RFC son definitivos):**

| Documento | Estado real |
|---|---|
| `SHARED_NURSERIES_SPEC.md` | **DECIDED** (modelo y flujo); implementación pendiente |
| `ROADMAP.md` | PG-08A/B/G **PROPOSED**; PG-08C/D/E/F **DECIDED** |
| `BREEDING_DESIGN_RFC.md` | **DECIDED parcial**, fuera de alcance |
| `POKEMON_SECURITY_RFC.md` | **PROPUESTA** (sin cifrado implementado) |
| `MONETIZATION_DESIGN_RFC.md` | **PROPUESTA** (sin implementar) |

**Hallazgos críticos:**

1. No existen entidades `user`, `nursery`, `stay` ni `permission`: la propiedad no se puede representar hoy.
2. `pets` es una lista global con un único flag `active`; no hay límite de dos ni noción de visitante.
3. No hay autenticación ni autorización en ninguna ruta: cualquier cliente puede adoptar/exportar cualquier `sha256` conocido.
4. La tabla `pokemon` no tiene columna `pid` ni UNIQUE compuesto; en Gen 1, 5 de 5 Pokémon tienen `pid = 0`, por lo que la identidad estable es `location+box+slot`.
5. Los IDs existentes son `INTEGER PRIMARY KEY` sin `AUTOINCREMENT`; no hay UUID en código.
6. `sha256` tiene dedupe global; dos usuarios con el mismo save colisionarían en una fila.
7. No hay cifrado en reposo ni en tránsito.
8. Adopción, reparseo, exportación y borrado no son transaccionales; `GET /api/pets` muta la BD al poner al día.
9. `stored_path` apunta al directorio antiguo `Pokegotchi`; `POST /api/saves/import` acepta cualquier ruta local.
10. El filtro `GET /api/saves/:sha/pokemon?legal=true` usa la columna `legal=false` y oculta los `unverified`, aunque la adopción los permite.

**Conclusión de la auditoría:** la aplicación actual es de **tenencia única y local**. Los contratos PG-08A son un añadido aislado, no una mutación de ese modelo.

---

## 4. Modelo de propiedad

Detalle en `PG-08A/02-MODELO-PROPIEDAD.md`.

**Regla fundamental:** alojar un Pokémon **nunca** transfiere su propiedad.

- `OwnerId`, `NurseryId`, `StayId`, `PokemonInstanceId` son UUID v4 opacos con brand de TypeScript.
- La identidad **no** se deriva de especie, mote, ranura, PID ni hash de datos: todos esos valores pueden repetirse o cambiar.
- `PokemonOrigin` conserva `saveSha256`, generación, especie y PID o ranura; `dataSha256` solo detecta alteraciones.
- `Stay` registra al propietario, al anfitrión, la relación `own`/`visitor`, los permisos y la revisión.
- El anfitrión no dispone de operaciones para exportar, eliminar, transferir, cambiar el propietario ni modificar los datos originales. `exportEvents()` solo vuelca el log para auditoría.

**Invariantes verificadas:** el propietario es el único que recupera y concede/revoca; la cuidadora no altera `stay.pokemon`; la identidad sobrevive al replay; la superficie pública se limita a 19 operaciones.

**Riesgo residual:** las copias externas del archivo `.srm` no se pueden impedir con este modelo.

---

## 5. Modelo de permisos

Detalle en `PG-08A/03-MODELO-PERMISOS.md`.

Tres permisos, **independientes** y **desactivados por defecto** (`null`): `allow_ev_berries`, `allow_ev_minigames`, `allow_breeding`.

- Nacen `null` en cada estancia; requieren `consentKey` ASCII de 8-128 caracteres.
- Solo el propietario los concede y revoca; se asocian a la estancia concreta.
- `revokedAt != null` bloquea nuevas operaciones con `PERMISSION_REVOKED`.
- `permissionActive()` comprueba vigencia temporal; el cuidado normal (comer, jugar, limpiar, dormir, acariciar, reprender) no requiere permiso.
- `requestBreeding` valida el permiso, emite `breeding.requested` y devuelve **`BREEDING_NOT_IMPLEMENTED`**: no hay crianza.
- Compatibilidad PKHeX: topes Gen 3-5 de 255/510 EV y Gen 1-2 de 65535 stat exp; IV/DV bloqueados; `unverified` **no** equivale a `illegal`.

**Pendiente de producto:** qué ocurre con una operación ya iniciada cuando llega una revocación. Se documenta una recomendación (cancelar y registrar), **sin adoptarla como regla**.

---

## 6. Modelo de guardería

Detalle en `PG-08A/04-MODELO-GUARDERIA.md`.

- `NURSERY_CAPACITY = 2`, validado y comprobado de forma atómica en `acceptDeposit` → `NURSERY_FULL`.
- Tres dimensiones independientes: visibilidad (`private`/`invite_only`/`public`), admisión (`open`/`closed`) y conectividad, más banderas `unavailable`, `syncError` y `recoveryPending`.
- Una guardería **pública no acepta automáticamente** depósitos: `requestDeposit` siempre crea `request_pending` y exige `acceptDeposit` explícito.
- Siete estados derivados por prioridad: `available`, `partially_occupied`, `full`, `disconnected`, `unavailable`, `recovery_pending`, `sync_error`.
- Ocho estados de estancia, desde `request_pending` hasta `stay_finished`/`recoverable_error`.
- Revisión optimista con `STALE_REVISION`; la prueba 11 simula dos aceptaciones concurrentes y comprueba que solo una gana.
- `own` y `visitor` quedan separados; el módulo no importa `pet-engine`, SQLite, HTTP ni el sistema de archivos.

---

## 7. Recuperación offline

Detalle en `PG-08A/05-RECUPERACION-OFFLINE.md`.

**Separación de decisiones:** el registro autoritativo decide el estado; el propietario inicia la solicitud; un `RecoveryVoucher` autoriza; el registro ejecuta el canje.

- `requestRecovery` emite un vale con `nonce` UUID, caducidad de 7 días, `revision = stay.revision + 1` y `usedAt = null`.
- La conectividad del anfitrión es solo información (`hostOfflineNoted`); **nunca bloquea** la recuperación.
- `completeRecovery` es idempotente: repetir el canje devuelve éxito sin evento nuevo; un vale caducado da `VOUCHER_EXPIRED`.
- Si expira sin uso, la estancia permanece en `pickup_requested` y el propietario puede solicitar otro vale: no hay pérdida del Pokémon.
- Se evaluaron cinco alternativas; se eligió el vale del registro. La confirmación del anfitrión fue **rechazada** porque contradice el requisito.

**VERIFICADO:** las propiedades del modelo (tests 8, 9, 14).
**NO VERIFICABLE aún:** servidor caído, partición de red, firma del vale y persistencia real: requieren D2 y D7.

---

## 8. Seguridad y amenazas

Detalle en `PG-08A/06-AMENAZAS.md`. Se documentan las 13 amenazas exigidas con riesgo, impacto, mitigación, validación y riesgo residual: suplantación de propietario, manipulación de identificadores, duplicación, eliminación indebida, modificación de permisos, repetición, solicitudes simultáneas, desconexiones, restauración de estados antiguos, corrupción de mensajes, clientes modificados, alteración de legalidad y exposición de datos privados.

**Riesgos ALTO actuales por depender de componentes no implementados:** suplantación (sin autenticación), duplicación externa del `.srm` (no eliminable técnicamente) y exposición (sin cifrado).

La validación es estricta y ocurre en el modelo, nunca solo en el frontend. El cifrado AES-256-GCM/ChaCha20-Poly1305 del RFC es **PROPUESTA**, no implementado.

**Cuatro bloqueos antes de cualquier despliegue:** autenticación, servicio autoritativo, cifrado/control de acceso y anti-duplicación de archivos.

---

## 9. Contratos implementados e integridad PKHeX

Detalle en `PG-08A/07-CONTRATOS.md`.

Módulo `packages/core/src/shared-nurseries.ts`: 1165 líneas, TypeScript puro. Incluye versionado (`SCHEMA_ID = pg08a.shared-nurseries`, `CONTRACT_VERSION = 1.0.0`), generaciones I–V, 9 entidades, 14 tipos de evento, 8 validadores estrictos, 22 códigos de error y 19 operaciones con idempotencia.

`createNurserySystem(initialEvents)` mantiene un log con `sequence` monótono, `exportEvents()`, `snapshot()` y `restore(log)` para reconstruir el estado tras un reinicio. No hay conexión a endpoints reales ni a la BD de producción.

El módulo **no recalcula legalidad**: consume `verdict` de PKHeX.Core. Respeta Gen 1-5 y no crea cuarentena nueva.

---

## 10. Pruebas ejecutadas

Detalle en `PG-08A/08-PRUEBAS.md` y cobertura en `PG-08A/09-COBERTURA.md`.

```
$ bun run scripts/pg08a-check.ts
PG-08A: 284/284 comprobaciones correctas.

$ export PATH="$HOME/.dotnet:$PATH" && bun run check
...
== Guarderías compartidas (PG-08A) ==
PG-08A: 284/284 comprobaciones correctas.

Todo correcto.
```

**EXIT 0.** Sin regresiones: Motor, Día/noche, Traducciones, PG-07A (54), PG-07B/C/D/E, sidecar .NET (0 avisos/0 errores), PG-07F (132), PG-07G (69/69) y PG-07H (101/101) permanecen en verde.

Las 20 pruebas exigidas pasan: propietario válido e incorrecto, capacidad 2, tercer depósito, permisos off por defecto, consentimiento, revocación, recuperación por propietario, recuperación con anfitrión offline, duplicados, concurrencia simulada, identificadores inválidos, estados inconsistentes, repetición de mensajes/replay, guardería privada, pública sin autoaceptación, Pokémon sin legalidad verificada, compatibilidad generacional, separación local/compartida y ausencia de escritura en producción.

Durante la depuración se encontraron y corrigieron 9 defectos (regex en `acceptDeposit`, `envelope` que rechazaba claves propias, separación de `payloadOf`/`withoutAt`, sombreado de la función de idempotencia, replay que no consumía solicitudes, prefijos de idempotencia en `restore`, revisión del voucher, claves de prueba cortas/acentuadas y un falso positivo al filtrar `exportEvents`). Ninguno debilitó la validación.

---

## 11. Estado de integridad

Detalle en `PG-08A/10-INTEGRIDAD.md`.

- `sha256sum -c /tmp/opencode/pg08a-protected-before.sha256` → **17/17 «La suma coincide»**.
- `data/pokegotchi.db` = `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`, idéntico antes y después. La suite lo comprueba activamente.
- HEAD = `819b73b49a8aca76486173917d7abdb4518290ab`; `git rev-list --count 819b73b4...HEAD` = **0**; **0 pushes**.
- Hash porcelain: `6b76e9e7…` → `b44ed4bf…`, cambio esperado por los dos archivos nuevos y la edición de `check.sh`.
- Sin cambios en saves, legalidad, exportaciones, motor, sprites, fondo ni dependencias. Sin servidores iniciados.

---

## 12. Decisiones pendientes y propuesta PG-08B

Detalle en `PG-08A/11-DECISIONES-PENDIENTES.md` y `PG-08A/12-PROPUESTA-PG08B.md`.

**Nueve decisiones requieren aprobación humana:** D1 identidad/autenticación; D2 servicio autoritativo; D3 persistencia de alojamientos; D4 invitaciones y descubrimiento; D5 resolución de conflictos; D6 garantías offline; D7 modelo de sincronización; D8 retención de datos; D9 límites y anti-abusos. Cada una incluye alternativas, ventajas, inconvenientes y una recomendación técnica **no adoptada**.

Orden recomendado: D1+D2 → D3+D7 → D5+D6 → D4+D9 → D8.

**Propuesta concreta para PG-08B:** capa de persistencia local aislada que promueva el módulo a paquete, añada un `EventStore` append-only en un archivo **distinto** (`data/shared-pg08b.db`, nunca `pokegotchi.db`), transacciones reales, rehidratación desde eventos y una suite `pg08b-check.ts` integrada en `check.sh`. Sin UI, sin endpoints, sin cuentas, sin crianza y sin commits. Criterios: replay determinista, idempotencia tras reinicio, capacidad 2 bajo transacción, recuperación por vale con anfitrión desconectado y BD original intacta.

---

## 13. Conclusión

PG-08A cumple todos sus criterios de aceptación dentro del alcance autorizado. Entrega un modelo de propiedad demostrablemente coherente, contratos validados, 284 comprobaciones en verde y un conjunto de decisiones explícitas para que el humano dirija PG-08B.

**VERIFICADO:** auditoría, contratos, validadores, 20 pruebas, 284/284 comprobaciones, sin regresiones, 17/17 hashes protegidos, 0 commits.
**PENDIENTE DE COMPROBAR / NO IMPLEMENTADO:** autenticación real, servicio autoritativo, cifrado, persistencia compartida, concurrencia entre procesos, recuperación frente a servidor caído, endpoints públicos, UI y crianza. Estos puntos son decisiones o trabajo futuro, no defectos ocultos.

---

## 14. Índice de entregables

| Archivo | Contenido |
|---|---|
| `PG-08A/01-AUDITORIA.md` | Auditoría de arquitectura y clasificación de decisiones |
| `PG-08A/02-MODELO-PROPIEDAD.md` | Propiedad original, roles e invariantes |
| `PG-08A/03-MODELO-PERMISOS.md` | Tres permisos, consentimiento, revocación y PKHeX |
| `PG-08A/04-MODELO-GUARDERIA.md` | Capacidad, dimensiones, estados y depósito |
| `PG-08A/05-RECUPERACION-OFFLINE.md` | Vale de recuperación y alternativas evaluadas |
| `PG-08A/06-AMENAZAS.md` | 13 amenazas con riesgo/impacto/mitigación/validación/residual |
| `PG-08A/07-CONTRATOS.md` | Contratos implementados y versionado |
| `PG-08A/08-PRUEBAS.md` | 284/284 comprobaciones y defectos corregidos |
| `PG-08A/09-COBERTURA.md` | Cobertura real frente a simulada |
| `PG-08A/10-INTEGRIDAD.md` | Hashes, Git y ausencia de cambios en producción |
| `PG-08A/11-DECISIONES-PENDIENTES.md` | 9 decisiones con alternativas y recomendación |
| `PG-08A/12-PROPUESTA-PG08B.md` | Propuesta concreta para el siguiente hito |
| `PG-08A-INFORME.md` | Este informe final |
