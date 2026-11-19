# PG-08E — Propiedad, almacenamiento y ciclo de vida de huevos

**Estado: COMPLETADA Y VERIFICADA.** Implementación local aislada. Sin commits,
sin pushes, sin servidor público, sin cuentas reales y sin monetización.
Fecha: 19-nov-2026.

## 1. FASE 0 — auditoría (antes de tocar código)

- `AGENTS.md` leído; informes PG-08A–D revisados.
- Contratos revisados: `breeding-engine.ts`, `shared-nurseries.ts`,
  `shared-store.ts`, `shared-authority.ts`, `shared-event-queue.ts` y
  `pg08d-check.ts`. No se modificó ninguno de ellos.
- `git status --short`: solo los cambios locales preexistentes del checkpoint.
  `HEAD == origin/main == 7c9c326be0eb4dced4969c5b0f966413d3299dae`.
- `sha256sum -c /tmp/opencode/pg08a-protected-before.sha256`: **17/17 coinciden**
  (incluye `data/pokegotchi.db`, los siete `.srm` de `fixtures/` y el código
  protegido).
- `bun run check` baseline: EXIT 0 (PG-07H 101/101, PG-08A 284/284, PG-08B
  22/22, PG-08C 33/33, PG-08D 36/36).
- No se encontró en el código ningún modelo de procedencia PLAY NOW/DEMO: se
  creó un contrato aislado y se documentó su futura conexión.
- No existía bloqueo de contratos que impidiera la integración; no hizo falta
  modificar los contratos existentes.

## 2. Entregables

| Archivo | SHA-256 |
|---|---|
| `packages/core/src/egg-domain.ts` | `a30ccdb3756d264c71df5fe8a95e8cd366890bb727f44bd4f907560d46430125` |
| `apps/server/src/shared-egg-store.ts` | `0a4be0f812eed13ef79d6b199d710ddf4b8002c76037906ece15947de5a7feda` |
| `scripts/pg08e-check.ts` | `f206f103a4daf8c8ed9f5c44a61c94f6ab5de1c8dca556808503b5ca15bcfe07` |
| `scripts/check.sh` | `fbb1279b1ea80d7aa73a2e92e58e5cc51ee3170634bc7c63056a1fa956b1be52` |
| `data/pokegotchi.db` (intacta) | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` |

Documentos en `docs/informes/fases/PG-08/PG-08E/`: contrato del huevo, máquina
de estados, propiedad, procedencia, almacenamiento, capacidad, acumulación
offline, integración transaccional, conflictos, resultados de pruebas y
decisiones pendientes/propuesta PG-08F.

## 3. Resultado funcional

1. **Identidad persistente:** `eggIdFor(cycleId, productionEventId)`; no depende
   de nombre, especie ni PID. Unicidad por ID y por ciclo.
2. **Procedencia:** tres clases, `DEMO_INTERNAL_NON_EXPORTABLE` permanente para
   PLAY NOW, fallo cerrado para evidencia insuficiente; bloqueo en dominio y en
   la autoridad del almacén. `unverified` NO se equipara a `illegal`/DEMO.
3. **Propiedad:** independiente de los progenitores; política configurable sin
   adoptar ninguna; `OWNER_IMMUTABLE` tras la confirmación; `canClaim` impide
   que un segundo destinatario gane por llegar tarde.
4. **Almacenamiento:** SQLite aislado con transacciones, integridad referencial,
   idempotencia, consultas por propietario/guardería/ciclo, replay y detección
   de corrupción. Rechazo explícito de `pokegotchi.db`.
5. **Capacidad:** configurable, rechazo seguro sin consumir idempotencia, espera
   `bounded` con drenaje revalidado y liberación por transición a `claimed`.
6. **Estados:** cinco estados, transiciones explícitas, sin regresiones;
   retirada/expulsión (D6) no destruyen un huevo confirmado.
7. **Acumulación:** `single` por defecto; `bounded` preparado; reloj solo
   autoritativo; sin huevos ilimitados tras reinicio.
8. **Integración:** `egg.production.recorded` + huevo + eventos + outbox en la
   misma transacción cuando el `BreedingCycleStore` es transaccional; si no lo
   es, se documenta la recuperación por replay, no atomicidad falsa.

No se generaron Pokémon reales, IV/DV, naturalezas, habilidades, movimientos,
shiny ni eclosión. No se insertó nada en cajas ni saves.

## 4. Verificación

```
PG-08E — 48 casos correctos, 0 fallidos.
```

`bun run check` → **EXIT 0**. Todas las suites previas siguen pasando:
PG-08A 284/284, PG-08B 22/22, PG-08C 33/33 y PG-08D 36/36.

Comprobación final de hashes protegidos: **17/17 coincidentes**. Git:
`HEAD == origin/main == 7c9c326...`, sin commits ni pushes. No quedaron bases
temporales en `data/`; la suite limpia `/tmp/opencode/pg08e-*`.

## 5. Discrepancia documentada

`PG-08D/09-PROPUESTA-PG08E.md` proponía otro PG-08E (catálogo oficial Gen 1-5,
proveedor real, spike PKHeX) y figuraba como no autorizado. La autorización
vigente redefine PG-08E con el alcance de esta misión. El documento histórico
se conserva sin reescribir; el índice de informes se actualiza para reflejar el
estado real.

## 6. Pendiente y no autorizado

No se adoptó ninguna política definitiva de asignación, capacidad ni
acumulación; D4, D8 y D9 siguen pendientes; la autoridad es solo simulada y
local. PG-08F queda como propuesta no autorizada. No se desplegó nada ni se
publicó en GitHub.
