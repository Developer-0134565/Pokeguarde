# PG-08G.2G — SYNCGATE

**Fecha:** 19-nov-2026. **Modo:** READ-ONLY sobre código, BD, saves, fixtures y contratos históricos. **Resultado:** PASS (para documentación). **Ejecución de PG-08G.3:** NO autorizada.

## 1. Identidad y baseline

| Comprobación | Valor medido | Esperado | Resultado |
|---|---|---|---|
| Raíz efectiva | `/home/missingn0/Proyectos/Pokeguarde` | igual | OK |
| Rama | `main` | `main` | OK |
| HEAD | `7c9c326be0eb4dced4969c5b0f966413d3299dae` | baseline | OK |
| `HEAD@{upstream}` | `7c9c326be0eb4dced4969c5b0f966413d3299dae` | HEAD | OK |
| `origin/main` | `7c9c326be0eb4dced4969c5b0f966413d3299dae` | HEAD | OK |
| Divergencia `HEAD...origin/main` | `0 0` | `0 0` | OK |
| Entradas `staged` | `0` | `0` | OK |
| Conflictos (`git ls-files -u`) | `0` | `0` | OK |
| `git status --porcelain` | **50** = 10 `M` + 40 `??` | 50 | OK |
| BD `data/pokegotchi.db` SHA-256 | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` | igual | OK |

No se asumió el estado reportado: se midió de nuevo y coincide exactamente. No se forzó restauración ni limpieza.

## 2. Hashes protegidos

`sha256sum -c /tmp/opencode/pg08a-protected-before.sha256` → **EXIT 0, 17/17 coincidentes**:

`data/pokegotchi.db`, `apps/server/src/db.ts`, `apps/server/src/index.ts`, `apps/web/src/pet-engine.ts`, `apps/web/src/sprite-runtime.ts`, `apps/web/src/sprite-render.ts`, `apps/web/assets/room/guarderia.png`, `services/pkhex/pkhex.csproj`, `services/pkhex/Program.cs`, `fixtures/FIXTURES.md`, `fixtures/gen1-blue-spain.srm`, `fixtures/gen1-blue-usa.srm`, `fixtures/gen2-crystalclear-hack.srm`, `fixtures/gen2-polished-hack.srm`, `fixtures/gen3-allin-hack.srm`, `fixtures/gen4-heartgold-spain.srm`, `fixtures/gen5-black-usa.srm`.

Histórico G2F (no re-medido aquí): `PRAGMA integrity_check=ok`, `pets=4`, `bun run check` EXIT 0, PG-08A–F 473/473, PG-07H 101/101.

## 3. Decisiones de ejecución

- **No se ejecutó `bun run check`.** Aunque el histórico es EXIT 0, `scripts/check.sh` incluye `dotnet build`, que escribe artefactos; no puede aislarse sin riesgo sobre el estado protegido. Se registra `NOT_RUN` y el resultado histórico NO se presenta como verificación actual.
- No se abrieron stores de prueba ni se crearon BD temporales: no era necesario para la auditoría documental.
- No se usaron `clean`, `stash`, `reset`, `checkout` destructivo, `fetch`, `pull`, `commit` ni `push`.
- Únicos cambios permitidos: este directorio nuevo y una adición al índice `docs/informes/README.md`. Ningún archivo de producción fue tocado.

## 4. Hallazgo de numeración (VERIFICADO)

La directiva de esta misión renumera las BR respecto a G2F:

| Designación G2F | Designación misión 2G | Contenido |
|---|---|---|
| `G2F-BR-05` | — | 1+1, atomicidad, compatibilidad Gen II |
| `G2F-BR-06` | `G2G-BR-05` | recogida manual idempotente |
| `G2F-BR-06` (parte cooldown) / `G2F-BR-07` | `G2G-BR-06` | inicio de incubación en `claimedAt` / recuperación de duración |
| — | `G2G-BR-07` | vigencia documental V4 (nueva) |

No se reescriben los contratos históricos. Se adopta el prefijo estable **`G2G-BR-nn`** para las ocho decisiones aprobadas en §4 de la directiva, y `G2F-BR-nn` para las históricas. Ver `CONTRATO-CRIANZA-V5.md` §1.

## 5. Cierre

Los valores de §1 y §2 se repiten al final de `PG-08G2G-INFORME.md` §10. El repositorio queda sin commits, sin pushes y con las 50 entradas preexistentes preservadas más los documentos nuevos de esta misión.
