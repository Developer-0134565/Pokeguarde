# POKEGUARDE — Informe final PG-08B

**Misión:** Persistencia transaccional de Guarderías Compartidas.
**Agente:** Beam (OpenCode).
**Fecha:** 19-nov-2026.
**Estado:** **COMPLETADA Y VERIFICADA**.
**Criterio de verdad:** todo lo marcado VERIFICADO fue ejecutado y comprobado;
lo marcado PENDIENTE DE COMPROBAR no se presenta como funcionalidad existente.

---

## 1. Resumen ejecutivo

PG-08B ha implementado un EventStore SQLite local, transaccional y aislado para
los contratos de Guarderías Compartidas de PG-08A. Los estados y eventos
sobreviven a cierres y reaperturas, la idempotencia se conserva entre
reinicios y la reconstrucción es determinista.

**No se ha activado ningún servicio online, no se han tocado partidas ni la
base de datos real, no se han implementado cuentas, crianza ni monetización, y
no se han realizado commits ni pushes.**

| Criterio de aceptación | Resultado |
|---|---|
| D1 — interfaz `OwnerAuthenticator` sin cuentas/login | VERIFICADO |
| D2 — límite autoridad/caché diseñado; store local NO autoridad desplegada | VERIFICADO |
| D3 — EventStore separado en `data/shared-pg08b.db` | VERIFICADO |
| Eventos y estados persistentes entre reinicios | VERIFICADO |
| Idempotencia entre reinicios | VERIFICADO |
| Reconstrucción determinista y coincidencia de snapshots | VERIFICADO |
| Rollback sin eventos parciales | VERIFICADO |
| Concurrencia, `STALE_REVISION` y capacidad 2 | VERIFICADO |
| Recuperación por vale (simulación local) | VERIFICADO |
| Aislamiento de producción (17/17 hashes) | VERIFICADO |
| 22/22 pruebas + `bun run check` sin regresiones | VERIFICADO |
| D4-D9 no adoptadas | VERIFICADO |

## 2. Arquitectura implementada

```
packages/core/src/shared-nurseries.ts  (PG-08A, INMODIFICADO)
        │  SyncEvent[] + createNurserySystem(events)
        ▼
apps/server/src/shared-store.ts        (PG-08B, NUEVO)
        │  BEGIN IMMEDIATE / COMMIT / ROLLBACK
        ▼
data/shared-pg08b.db                   (NUEVA, fuera de Git, NUNCA pokegotchi.db)
   ├── meta         versión de esquema y contrato
   ├── events       log append-only, payload versionado y con SHA-256
   └── snapshots    caché derivable de system.snapshot()
```

La persistencia **no duplica reglas de dominio**: guarda exactamente los
`SyncEvent` que emite PG-08A y reconstruye el sistema alimentando
`createNurserySystem(events)`. Ver
[01-arquitectura.md](PG-08B/01-ARQUITECTURA.md).

## 3. Archivos creados y modificados

| Archivo | Acción | SHA-256 |
|---|---|---|
| `packages/core/package.json` | NUEVO | `c9a254bd0439b7778ce0a063d3b32170dfcd8e557ac6f39902ed114dd19a0e7d` |
| `packages/core/tsconfig.json` | NUEVO | `f0caef17dc5bb6cfc5b731d20e548ba89b568bbadf366bf2d560cdf923dbc575` |
| `apps/server/src/shared-store.ts` | NUEVO | `69900571b3cf5440890042830fa94818f84f1a408f6f6e16660ce39964dfb08a` |
| `scripts/pg08b-check.ts` | NUEVO | `b2466f409627bba94a96bf8499fed36d5eddd9641ace44934627820ecb05c57a` |
| `scripts/check.sh` | EDITADO | `6ec812be882d4ad53dc481ff9cc04b5e8136c3c43ea391a7f896b426a71ce787` |
| `.gitignore` | EDITADO | `53716128e48e10db7b81f3075691cb3afba983735c34df3108960ca29d154ba8` |
| `docs/informes/fases/PG-08/PG-08B/*.md` | NUEVOS | documentación de la fase |

`scripts/check.sh` pasó de `de0575d62530d6ff3161f0ff3aef30dde3ab73b31a7aac123716f42f703cc455`
a `6ec812be…` por la sección autorizada de PG-08B. No está en la lista
protegida de 17 archivos.

## 4. Esquema SQLite

Tres tablas (`meta`, `events`, `snapshots`) y dos índices
(`events_aggregate_idx`, `events_type_idx`). PRAGMA `journal_mode=WAL`,
`busy_timeout=5000`, `foreign_keys=ON`.

`events`: `event_id` PK, `sequence UNIQUE CHECK>0`, `aggregate_id`,
`aggregate_sequence CHECK>0` con `UNIQUE(aggregate_id, aggregate_sequence)`,
`dedupe_key UNIQUE`, `idempotency_key`, `event_type`, `schema_id`,
`contract_version`, `occurred_at`, `payload_json`, `payload_sha256`.

Detalle completo en [02-esquema-sqlite.md](PG-08B/02-ESQUEMA-SQLITE.md),
[03-transacciones-y-idempotencia.md](PG-08B/03-TRANSACCIONES-Y-IDEMPOTENCIA.md) y
[04-migraciones-snapshots-corrupcion.md](PG-08B/04-MIGRACIONES-SNAPSHOTS-CORRUPCION.md).

## 5. Resultados de pruebas

- `bun run scripts/pg08b-check.ts` → **PG-08B: 22/22 comprobaciones correctas**, EXIT 0.
- `bun run check` → **EXIT 0, «Todo correcto.»** Sin regresiones: Motor,
  Día/noche, Traducciones, PG-07A 54, PG-07B/C/D/E, sidecar PKHeX, PG-07F 132,
  PG-07G 69/69, PG-07H 101/101, PG-08A 284/284, PG-08B 22/22.
- 17/17 hashes protegidos coinciden. `data/pokegotchi.db` =
  `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`.
- Dominio PG-08A intacto: `shared-nurseries.ts` = `bcc3309aecd816fda6648475bdd587a92a438884f4c6771973dce8e34055e513`;
  `pg08a-check.ts` = `5268c930697593a2c631eb40fd5bfdba91e587ab8da638933c39b5752b093cfc`.

Detalle de casos y correcciones en [06-pruebas.md](PG-08B/06-PRUEBAS.md).

### Hallazgo relevante durante la implementación

`refreshNursery` (PG-08A) emite un evento `nursery.flags` adicional antes del
evento principal en `acceptDeposit`, `requestRecovery` y `completeRecovery`.
Persistir únicamente el `eventId` devuelto por `OpResult` producía huecos de
secuencia y `STALE_REVISION` falsos. El store persiste ahora **todos** los
eventos nuevos emitidos dentro de la misma transacción. El dominio no se modificó.

## 6. Comparación antes / después

| Aspecto | Antes de PG-08B | Después de PG-08B |
|---|---|---|
| Persistencia de guarderías compartidas | Solo memoria (PG-08A) | SQLite append-only con replay |
| Idempotencia | Solo dentro de un proceso | Sobrevive a cierre y reapertura |
| Reconstrucción | Manual en pruebas | Automática al abrir, determinista y verificada |
| Autoría | No modelada en la capa de persistencia | `AuthenticatedOwner` exigido (D1, interfaz) |
| Base de datos | Solo `pokegotchi.db` | BD propia + guarda explícita contra la real |
| Pruebas | PG-08A 284/284 | + PG-08B 22/22 |

## 7. Estado de Git

Sin commits ni pushes. HEAD == origin/main ==
`7c9c326be0eb4dced4969c5b0f966413d3299dae`.

Respecto a la línea base, solo se añadieron: `.gitignore` (M),
`apps/server/src/shared-store.ts` (??), `scripts/pg08b-check.ts` (??) y la
documentación nueva de `docs/informes/fases/PG-08/PG-08B/`. El resto de cambios
locales preexistentes (Stitch, PG-07B…H, PG-08A) se conservaron intactos.
`data/shared-pg08b.db` no aparece en Git.

## 8. Limitaciones y riesgos pendientes

- **No hay multijugador real.** Sin endpoints, servidor público, cuentas ni
  directorio (prohibido en esta misión).
- **D1 solo es interfaz.** No hay implementación de autenticación; las pruebas
  usan identidades simuladas localmente.
- **D2 es diseño.** El EventStore local no equivale a un registro central
  autoritativo desplegado.
- **Sin cifrado** en almacenamiento ni tránsito para datos compartidos.
- **Recuperación simulada.** No se ha demostrado offline real entre usuarios.
- **D4-D9 siguen pendientes**: invitaciones, conflictos, recuperación,
  sincronización, retención y anti-abusos. No se han adoptado. Ver
  [07-decisiones-pendientes.md](PG-08B/07-DECISIONES-PENDIENTES.md) y
  [05-autoridad-y-limites.md](PG-08B/05-AUTORIDAD-Y-LIMITES.md).
- Riesgo residual conocido de PG-08A: copias externas del `.srm` no pueden
  impedirse con este store local.

## 9. Propuesta PG-08C

Antes de cualquier despliegue compartido, PG-08C debe resolver con decisión
humana **D5 (conflictos), D6 (recuperación) y D7 (sincronización)**, y definir
el contrato entre el registro central autoritativo y la caché local.

Trabajo técnico propuesto (sin ejecutar):

1. Diseñar el protocolo `STALE_REVISION` frente a autoridad, sin LWW.
2. Definir quién emite y firma los vales de recuperación y su renovación.
3. Especificar el formato de exportación/importación de eventos y el sondeo al
   abrir, con idempotencia por `eventId` y secuencia por agregado.
4. Definir el límite exacto de confianza de la caché local de solo lectura.
5. Solo después: D4 (invitaciones), D9 (cuotas) y D8 (retención).

**PG-08C no se ha iniciado.** Requiere autorización explícita.
