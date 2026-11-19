# PG-08G.2D — SyncGate (19-nov-2026)

**Resultado: PASS WITH WARNINGS.** Auditoría previa a cualquier escritura de
esta misión. Solo se escriben documentos nuevos en `PG-08G2D/`; no se toca
producción, BD, saves, fixtures, frontend ni sidecar.

No se ejecutaron `fetch`, `pull`, `merge`, `rebase`, `reset`, `clean`, `stash`,
`commit` ni `push`.

## 1. Estado Git

| Comprobación | Resultado |
|---|---|
| Rama | `main` |
| HEAD local | `7c9c326be0eb4dced4969c5b0f966413d3299dae` |
| `origin/main` | `7c9c326be0eb4dced4969c5b0f966413d3299dae` |
| Divergencia `HEAD...origin/main` | `0 0` |
| Upstream | `origin/main` |
| Conflictos (`git ls-files -u`) | vacío |
| Índice (`git diff --cached --stat`) | vacío |
| Entradas de `git status --short` | **47** (10 M + 37 ??) |

Las 47 entradas se conservan íntegras: 46 preexistentes registradas al cierre
de PG-08G.2 más el directorio `PG-08G2/` creado en esa fase. No se limpia ni se
commitea nada. El baseline histórico no se restaura artificialmente: el estado
actual coincide con él legítimamente.

## 2. Baseline de pruebas

`bun run check` → **EXIT 0**.

| Suite | Resultado |
|---|---:|
| PG-07G | 69/69 |
| PG-07H | 101/101 |
| PG-08A | 284/284 |
| PG-08B | 22/22 |
| PG-08C | 33/33 |
| PG-08D | 36/36 |
| PG-08E | 48/48 |
| PG-08F | 50/50 |
| **Total PG-08 (A–F)** | **473/473** |

También pasaron el motor de la guardería, día/noche, i18n, PG-07A…F y la
compilación del sidecar con 0 avisos / 0 errores.

## 3. Integridad

- 17 hashes protegidos (`/tmp/opencode/pg08a-protected-before.sha256`):
  **17/17 coincidentes**, sin discrepancias. Incluye `db.ts`, `index.ts`,
  `pet-engine.ts`, `sprite-runtime.ts`, `sprite-render.ts`, `guarderia.png`,
  `pkhex.csproj`, `Program.cs`, `FIXTURES.md` y los siete `.srm`.
- No existe el CLI `sqlite3`; la integridad se comprobó con `bun:sqlite`:
  `PRAGMA integrity_check` → `ok`, `SELECT count(*) FROM pets` → 4.
- `data/pokegotchi.db`:
  `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`,
  idéntico a la referencia. WAL 0 bytes y SHM 32768 bytes preexistentes: no se
  borran.
- Hash del informe consolidado de PG-08G.2 verificado:
  `77a6daa564b0681c5977509139f0234750f2a652af4f1446883af35a6aa491d1`.
- `data/saves/` y `data/exports/` sin cambios atribuibles a esta misión.

## 4. Fuentes leídas

Se leyeron íntegramente los quince `.md` de PG-08G2 y el spike
`experimentos/rng-v2-spike.ts`. Se consultaron además los contratos vigentes de
PG-08A (`11-DECISIONES-PENDIENTES.md`), PG-08E
(`11-DECISIONES-PENDIENTES.md`), PG-08F (`RIESGOS-Y-DECISIONES.md`) y el código
real de `shared-egg-store.ts`, `shared-egg-pair-store.ts` y `breeding-engine.ts`
para comprobar que las citas de PG-08G.2 siguen siendo exactas.

## 5. Advertencias

1. Trabajo local sin commitear: 47 entradas; esta misión no las toca.
2. WAL/SHM preexistentes junto a la base de datos protegida.
3. Colisión documental preexistente: D4/D8/D9 significan cosas distintas en
   PG-08A y en PG-08G.2. Se usa siempre el sufijo `-A` o `-G2`.
4. Dos subagentes lanzados para auditoría paralela agotaron la cuota de ChatGPT
   (`usage limit`) y no devolvieron informe. Por tanto, la contrastación la
   realizó el agente principal sobre las fuentes locales; **no se declara
   auditoría independiente**. Ver `RIESGOS-Y-DEPENDENCIAS.md`.
5. El tercer subagente, dedicado al plan de incrementos, completó su trabajo;
   sus propuestas se contrastaron contra los documentos locales antes de
   incorporarse y no se declaran auditoría independiente.

## 6. Decisión

**PASS WITH WARNINGS.** Sin fallos críticos: pruebas en verde, hashes intactos,
BD íntegra, sin conflictos ni divergencia remota. Se autoriza continuar con la
preparación del Decision Gate, manteniendo carácter READ-ONLY sobre producción.

## 7. Verificación final

Completada al cierre de la misión con una repetición de SyncGate; véase
`PG-08G2D-INFORME.md` §9.
