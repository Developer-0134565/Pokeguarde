# POKEGUARDE — Informe final PG-08C

**Estado: COMPLETADA Y VERIFICADA.**
**Fecha:** 19-nov-2026. **Modalidad:** implementación local aislada + estudio técnico.

## 1. Resumen ejecutivo

PG-08C añadió una **autoridad local simulada**, **concurrencia optimista**, una
**cola duradera transaccional (outbox)** y **réplicas locales sincronizadas** a la
persistencia de Guarderías Compartidas de PG-08B. Todo funciona sobre una base
SQLite aislada; no se abrió ningún servidor, puerto ni API HTTP.

| Elemento | Estado |
|---|---|
| D5 — registro autoritativo y revisión optimista | APROBADA, IMPLEMENTADA y VERIFICADA |
| D7 — eventos secuenciados, cola y sync al abrir | APROBADA, IMPLEMENTADA y VERIFICADA |
| D6 — política de recuperación | **ESTUDIADA, NO DECIDIDA, NO IMPLEMENTADA** |
| `bun run check` | EXIT 0 — PG-08A 284/284, PG-08B 22/22, **PG-08C 33/33** |
| BD real `data/pokegotchi.db` | Intacta, SHA-256 sin cambios |
| Git | HEAD == origin/main, sin commits ni pushes |

Invariante D6 respetado: **el derecho del propietario a recuperar su Pokémon no
caduca**. El prototipo de vales de PG-08A/B permanece intacto.

## 2. Autorización y límites cumplidos

Se ejecutó la misión con D5 y D7 aprobadas y D6 pendiente. **No** se
implementaron servidor público, API HTTP, WebSocket, SSE, cuentas, registro de
usuarios, autenticación real, directorio, depósitos remotos, recuperación
remota real, crianza, huevos, Guardipuntos ni monetización. **No** se
modificaron saves, sprites, motor Tamagotchi, PKHeX.Core, legalidad ni la base
de datos de producción. **No** se hicieron commits ni pushes.

La FASE 0 (SYNCGATE) se completó antes de tocar código: lectura de AGENTS.md,
README.md, especificaciones PG-08A/B, informes y decisiones D1-D9; inspección
Git sin locks ni operaciones concurrentes; `bun run check` EXIT 0 y registro de
17 hashes protegidos (todos coincidentes).

## 3. Archivos creados y modificados

| Archivo | SHA-256 | Cambio |
|---|---|---|
| `apps/server/src/shared-store.ts` | `625c62c1de6eb60426d706d1aba72cfe697df6964c992e715b5c291c22f58861` | Gancho aditivo `StoreSideEffect`; `execute(cmd, sideEffect?)` con efecto dentro de la transacción |
| `apps/server/src/shared-authority.ts` | `0ee083d81ccd33a266de5764421e5a4b10afbd610cad5c01026726b5008016d8` | **Nuevo**. Autoridad simulada, identidad de prueba, revisión optimista y recibos |
| `apps/server/src/shared-event-queue.ts` | `b24f30c3787b436b12c3cbb1e70a1ae4636975c492d6dd20bbf2e6dc7523539a` | **Nuevo**. Outbox atómico, cola duradera y réplicas |
| `scripts/pg08c-check.ts` | `81b35c2301f85d8f8a706098e46441eb3ae149816bf6f189f19b61c02033537a` | **Nuevo**. 33 casos aislados |
| `scripts/check.sh` | `4c98abfc73986b0b01b7e780e68c4c5f5ced6e672e2a8d2769dcd0fd5e1da5ed` | Sección PG-08C antes de «Todo correcto.» |
| `.gitignore` | `1072f4ee0208bdce7d76da0f57cf1f0904d2a7b9cd3640a0ae4c4c5a89fb2599` | Excluye `data/shared-pg08c.db`, `-wal`, `-shm` |

Archivos protegidos **sin cambios**:

- `packages/core/src/shared-nurseries.ts` —
  `bcc3309aecd816fda6648475bdd587a92a438884f4c6771973dce8e34055e513`.
- `data/pokegotchi.db` —
  `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`.
- Los 17 hashes de `fixtures/`, saves y archivos base verificados con
  `sha256sum -c /tmp/opencode/pg08a-protected-before.sha256` → 17/17 coinciden.

## 4. Arquitectura implementada

### 4.1 Autoridad simulada (D5)

`SharedAuthority` envuelve el EventStore de PG-08B y es el **único** punto que
acepta comandos. `TestIdentityProvider` emite tokens HMAC-SHA256 con secreto en
memoria; un `ownerId` suelto nunca se acepta como identidad. Esto es
explícitamente **no apto para producción**.

Cada agregado tiene una revisión lógica en `authority_revisions`. Un comando con
`expectedRevision` distinto se rechaza con `STALE_REVISION` **dentro de la
misma transacción**, sin eventos ni mensajes. La idempotencia por `commandId`
devuelve el recibo original con `duplicate:true`. Nunca gana el último escritor.

Las reglas del dominio PG-08A **no se duplican**: la autoridad solo valida
identidad, revisión, idempotencia y persistencia; el comportamiento sigue en
`shared-nurseries.ts`.

### 4.2 Outbox atómico y cola duradera (D7)

El gancho `StoreSideEffect` se invoca antes del COMMIT del EventStore. En esa
misma transacción se escriben el recibo, la revisión y un mensaje por cada
evento nuevo. Si falla cualquier efecto, el `ROLLBACK` revierte eventos y
mensajes a la vez: **no existe un evento confirmado sin su mensaje**.

La cola usa `outbox_messages` con estados `pending → delivered → acked` y
`failed`, contador de intentos y `last_error`. `ack` es idempotente, `nack`
permite reintentos y `reconcile()` repara mensajes ausentes. El ID del mensaje
deriva del `eventId`, de modo que un reintento no duplica entrega.

### 4.3 Réplicas

Tres réplicas simuladas: `authority`, `owner-device` y `host-device`. Cada una
tiene cursor y eventos propios. **`syncReplica` solo lee mensajes confirmados**
y reconstruye el estado con `createNurserySystem(events)`: las réplicas **no
tienen `execute`** y no pueden convertirse en autoridades alternativas.

La sincronización avanza en orden estricto de secuencia global. Duplicados y
eventos retrasados se ignoran; un hueco **bloquea** el avance y se registra.
No se guarda ningún archivo de save en las réplicas.

## 5. Resultados de pruebas

`bun run check` → EXIT 0:

```
Motor, Día/noche y Traducciones …………… OK
PG-07A 54, PG-07B/C/D/E, sidecar ………… OK
PG-07F 132, PG-07G 69/69, PG-07H 101/101 … OK
PG-08A 284/284 ……………………………………… OK
PG-08B 22/22 …………………………………………… OK
PG-08C 33/33 …………………………………………… OK
Todo correcto.
```

Cobertura de los 33 casos: autoridad y rechazo de identidad suelta;
`STALE_REVISION` sin efectos; confirmación tras commit; idempotencia por
pérdida de confirmación; atomicidad del outbox; persistencia tras reinicio;
claim/ack; error y reintento; sincronización inicial e incremental;
desconexión y reconexión de anfitrión y propietario; reinicio a mitad de sync;
duplicados; eventos retrasados y reconciliación; detección de huecos;
capacidad máxima de dos; tercer depósito; dos depósitos simultáneos;
propiedad permanente; permisos por defecto; concesión y revocación;
revocación durante operación; recuperación frente a cuidado; dos solicitudes
de recuperación; doble canje; vale caducado; ausencia de duplicación de
alojamientos; réplicas no autoridad; integridad conjunta; estabilidad de
`commandIdOf`; protección de la BD de producción; y hashes de la BD real y del
dominio.

Todas las pruebas usaron bases temporales `/tmp/opencode/pg08c-*` con limpieza
al terminar. El hash de `data/pokegotchi.db` antes y después es idéntico.

### Hallazgos durante las pruebas

1. El dominio valida claves de idempotencia con `[A-Za-z0-9._:-]{8,128}`; los
   `commandId` cortos se normalizan con prefijo `cmd:` en el arnés.
2. `requestRecovery` rechaza `DUPLICATE_REQUEST` solo cuando se repite el mismo
   `request.id`; con otro ID permite renovar el vale, y el vale anterior queda
   obsoleto con `STALE_REVISION`.
3. Un vale caducado produce `VOUCHER_EXPIRED`, pero el derecho del propietario
   sigue vivo y puede emitir otra solicitud.
4. `refreshNursery` emite eventos adicionales; el store persiste **todos** los
   eventos nuevos, no solo el `eventId` devuelto por la operación.

## 6. Estado de Git

```
HEAD = origin/main = 7c9c326be0eb4dced4969c5b0f966413d3299dae
## main...origin/main
```

Sin locks, sin commits y sin pushes. Cambios locales: 10 modificados y 20
archivos sin seguimiento (tres nuevos respecto a PG-08B:
`shared-authority.ts`, `shared-event-queue.ts` y `pg08c-check.ts`). El índice
`docs/informes/MANIFEST.json` **no** se alteró.

## 7. Diferencias entre simulación y producción

| Aspecto | Simulación PG-08C | Producción futura |
|---|---|---|
| Autoridad | Proceso local en memoria sobre SQLite | Requiere servicio autoritativo desplegado y decisión D2 |
| Identidad | HMAC con secreto aleatorio en memoria, TTL 1 h | Autenticación real, fuera de alcance |
| Cola | Misma BD SQLite del EventStore | Transporte persistente independiente, no autorizado aquí |
| Entrega | `claim`/`ack` manuales en pruebas | Requiere protocolo y decisiones D7 de despliegue |
| Réplicas | Objetos en BD temporal | Dispositivos reales con sincronización al abrir |
| Recuperación | Prototipo de vales PG-08A/B intacto | D6 pendiente de decisión |
| Datos | BD aislada `/tmp/opencode/pg08c-*` | Nunca `pokegotchi.db` |

**No** se ha desplegado nada de lo anterior.

## 8. Decisiones pendientes

- **D6 — política de recuperación:** estudiada en cuatro alternativas; sin
  decidir. Recomendación técnica **no vinculante**: D híbrido, con vía directa
  solo online y vía desconectada que nunca fabrica confirmaciones.
- **D4 invitaciones, D8 retención y D9 anti-abusos/cuotas:** siguen pendientes.
- **Revocación durante una operación en curso:** comportamiento conservador
  (no concede permisos nuevos); la decisión de producto sigue abierta.
- **Autenticación:** el proveedor de prueba no es apto para producción.

## 9. Riesgos residuales

1. La autoridad simulada no sobrevive a un despliegue real; es una herramienta
   de desarrollo.
2. `TestIdentityProvider` carece de revocación y de autoridad de emisión real.
3. La cola usa la misma BD local: simula atomicidad, no un transporte distribuido.
4. `syncReplica` bloquea ante huecos, pero no reordena mensajes: exige
   reprocesamiento.
5. El prototipo de vales fecha instrumentos, no derechos; una UX futura debe
   explicarlo.
6. No hay métricas ni observabilidad de producción.
7. No se probaron fallos combinados de energia, red y servicio simultáneos.

Detalle en `PG-08C/06-RIESGOS.md`.

## 10. Entregables

Documentación en `docs/informes/fases/PG-08/PG-08C/`:

1. `01-ARQUITECTURA-AUTORIDAD.md`
2. `02-CONTRATO-SINCRONIZACION.md`
3. `03-COLA-DURADERA.md`
4. `04-MATRIZ-CONFLICTOS.md`
5. `05-RESULTADOS-PRUEBAS.md`
6. `06-RIESGOS.md`
7. `07-ESTUDIO-D6.md`
8. `08-RECOMENDACION-NO-VINCULANTE.md`
9. `09-PROPUESTA-PG08D.md`

Informe local: `/home/missingn0/Descargas/PG-08C-INFORME.md`.

## 11. Cierre

PG-08C cumple todos sus criterios de aceptación salvo D6, que por instrucción
expresa **debió quedar estudiada y no decidida**. La base de datos original y
los saves están intactos; `bun run check` termina correctamente; no se
realizaron commits ni pushes. La próxima fase requiere autorización explícita y
una decisión humana sobre D6.
