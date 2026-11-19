# PG-07H — Actualización supervisada de inventarios derivados

**Fecha:** 19-nov-2026  
**Resultado:** ✅ COMPLETADO Y VERIFICADO  
**Alcance autorizado:** actualizar únicamente los inventarios derivados de los IDs `1` y `2` en `data/pokegotchi.db`.

---

## 1. Autorización y límites

El usuario autorizó expresamente ejecutar PG-07H, incluyendo la escritura real en
`/home/<usuario>/Proyectos/Pokeguarde/data/pokegotchi.db`, limitada a los dos
inventarios identificados y verificados en PG-07G. Se respetaron todas las
prohibiciones: no se tocaron saves, legalidad, datos de Pokémon, relaciones,
identificadores, esquema SQLite, motor Tamagotchi, sprites, fondo, dependencias;
no se implementaron crianza, multijugador ni Guardipuntos; no hubo commits ni
pushes; no se pidieron confirmaciones intermedias porque se cumplieron las
condiciones. Los datos de PG-07G se trataron como referencia histórica y se
recompobaron antes de escribir.

## 2. Estado previo (FASE 0)

| Concepto | Valor |
|---|---|
| Rama / HEAD | `main` · `819b73b49a8aca76486173917d7abdb4518290ab` |
| Hash `git status --porcelain=v1 --untracked-files=all` | `09fe353705b2d5770412e55793b4f03d2c93a3f516a2c0e5fb64ec5a50e74643` |
| Hash de `data/pokegotchi.db` | `2fb9e76bc8b8bb820a77e21342abe7b079f687749503315e13c0cf95106675e0` |
| `PRAGMA integrity_check` / journal | `ok` / `wal` |
| Recuentos | 2 partidas · 2 inventarios · 110 Pokémon · 4 mascotas · 8 exportaciones |

Estado idéntico al cierre de PG-07G. Había un servidor API (PID `1672645`)
con descriptores abiertos sobre `db`, `-wal` y `-shm`; se detuvo con SIGTERM
antes de cualquier escritura. Tras detenerlo el hash no cambió y no quedaron
descriptores ni puerto 8787 en uso. `bun run check` pasó antes de empezar.

## 3. Backup consistente

- Directorio: `/home/<usuario>/Descargas/PG-07H-BACKUP/20261119T102213Z/`
- Método: `Database.serialize()` sobre conexión `readonly`, incluyendo el estado WAL.
- `pokegotchi.db`: 274 432 B · SHA-256 `42d8a3a105420c2edde14b000d24116c8f1be7675bc4d02e65f0ad7a7fa45d58`
- Manifiesto: `status=VERIFIED`, `authorizedIds=[1,2]`, `idsVerified=true`,
  `sourceIntegrity=ok`, `backupIntegrity=ok`, 2 partidas / 2 inventarios / 110 Pokémon.
- Se verificó el hash del archivo y el `.sha256` contra el manifiesto antes de seguir.
- El backup de PG-07G no se sobrescribió.

## 4. Dry-run actual

`bun run scripts/pg07g-reanalyze.ts --report /home/<usuario>/Descargas/PG-07H/dry-run-real-db.json`
→ EXIT 0, `ok:true`, exactamente 2 filas `REANALIZABLE` (`wouldUpdate:2`),
`unexpected=[]`, `legalChanged=[]`, `incomplete=[]`, fuente `hash_named_copy`.
No se relajaron las protecciones de PG-07G.

| ID | Partida | Inventario antiguo | Inventario nuevo | box_count | Legalidad (intacta) |
|---|---|---|---|---|---|
| 1 | HeartGold España (`1c5e78d9…`) | `66b756bf…e65` | `5ee712b6…3b7` | 6 → 18 | 105 = 68 / 17 / 20 |
| 2 | Blue USA (`e361b6ea…e2`) | `7adb5535…bc` | `2552c2c4…fdc` | 0 → 12 | 5 = 0 / 0 / 5 |

## 5. Mecanismo real explícito

Se creó `scripts/pg07h-apply.ts`, un ejecutor separado que **no modifica**
`scripts/pg07g-reanalyze.ts` ni su rechazo deliberado a escribir en producción.
Por defecto solo verifica; para escribir exige simultáneamente `--execute`, la
ruta exacta de producción, el directorio de backup verificado y el dry-run
previo. Valida ruta y `realpath`, manifiesto del backup, hashes, IDs cerrados
`{1,2}`, recuentos, legalidad no nula y storage completo. La escritura usa
`BEGIN IMMEDIATE` y un `UPDATE` que toca **solo** `box_count` e `inventory_json`
con `WHERE id=? AND sha256=? AND inventory_json=?`, comprobando `changes=1` y los
hashes dentro de la transacción, con `COMMIT`/`ROLLBACK`.

La comprobación en modo seguro (`verify-only.json`) dio `pending:2`,
`applied:0`, `writePerformed:false`.

## 6. Aplicación real

`apply-real.json` → `ok:true`, `mode:execute`, `startedAt 2026-11-19T10:24:23.021Z`,
`applied:2`, `writePerformed:true`, `rolledBack:false`.

- ID 1: `box_count` 6 → 18; inventario `66b756bf…` → `5ee712b6…`.
- ID 2: `box_count` 0 → 12; inventario `7adb5535…` → `2552c2c4…`.
- Antes = después: 2 partidas · 2 inventarios · 110 Pokémon · 4 mascotas · 8 exportaciones · `integrity=ok`.
- Hash lógico: `42d8a3a1…d58` → `3c6fb194…fb4a`, **idéntico** al hash de la
  simulación aislada de PG-07G: prueba de que se aplicó exactamente el cambio previsto.

## 7. Idempotencia

Segunda ejecución con `--execute` → `apply-idempotent.json`:
`ok:true`, `mode:execute-noop`, `pending:0`, `alreadyUpdated:2`,
`applied:0`, `writePerformed:false`; clasificaciones en vivo `ACTUALIZADO` para
ambos IDs. El archivo queda byte a byte idéntico.

## 8. Comparación antes / después

`comparison-before-after.json` (backup vs. producción):
- ID 1: storage real 18×30, 540 posiciones, 441 vacías, 12 cajas vacías;
  `counts` y columnas de legalidad idénticos (68/17/20).
- ID 2: storage real 12×20, 240 posiciones vacías; `counts` y columnas
  idénticos (0/0/5).
- Sin cambios en identificadores, SHA-256 de partida ni nombres de archivo.

## 9. Verificación automática

- `bun run scripts/pg07h-check.ts` → **101/101** comprobaciones, sin escribir en producción.
  Cubre: rechazo sin `--execute`, ruta incorrecta y enlaces, IDs no autorizados,
  backup obligatorio y verificado, dry-run previo, transacción y rollback,
  conservación de registros / legalidad / identificadores, idempotencia,
  integridad, compatibilidad PG-07F, saves intactos y ausencia de regresiones A–G.
- `bun run check` → **EXIT 0**: motor, día/noche, i18n, PG-07A (54), PG-07B/C/D/E,
  sidecar .NET (0 avisos / 0 errores), PG-07F (132), PG-07G (69/69), PG-07H (101/101),
  «Todo correcto.».
- La suite PG-07H se integró en `scripts/check.sh`.

## 10. Validación en navegador

Sobre una **copia posterior a la actualización** (`/tmp/opencode/pg07h-browser/`,
mismo hash `3c6fb194…`), servidor aislado en `http://127.0.0.1:8793/`,
`/api/health` correcto (pokeguarde · PKHeX.Core · .NET 10.0.404).

- **Escritorio 1280×900:** HeartGold → Cajas muestra «Almacenamiento real
  disponible · 18 cajas · 30 ranuras», 30 posiciones, caja 4 con 30 vacías;
  seleccionar ranura 1 → FICHA/DATOS → «Volver» restaura caja 1 / ranura 1;
  filtro «Ilegales 2» y búsqueda «MAGNEMITE» conservan 30 posiciones;
  Blue USA muestra 12 cajas × 20 ranuras, 20 vacías. Sin desplazamiento
  horizontal (`scrollWidth=innerWidth=1280`).
- **Móvil 390×844:** cuadrícula `162px 162px`, 20 posiciones, navegación a
  caja 2 correcta, `scrollWidth=innerWidth=390`.
- Consola del navegador y log del servidor: sin errores.
- Capturas: `browser-desktop.png`, `browser-mobile.png`.
- Servidor detenido y navegador cerrado al terminar.

## 11. Estado final

| Concepto | Valor |
|---|---|
| Hash de `data/pokegotchi.db` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` |
| `PRAGMA integrity_check` / journal | `ok` / `wal` |
| Recuentos | 2 partidas · 2 inventarios · 110 Pokémon · 4 mascotas · 8 exportaciones |
| HEAD | `819b73b49a8aca76486173917d7abdb4518290ab` |
| Hash `git status --porcelain` final | `6b76e9e7cc883070d20c8f978928aae663793168e0057d844e0e94ba8dc1ebc9` |
| Commits / pushes | 0 / 0 |

Los saves y copias bajo `data/saves/` y `fixtures/` conservan sus hashes. El
cambio de hash de la base es esperado y queda documentado.

## 12. Incidencias y resolución

1. **Fallo de idempotencia del ejecutor (corregido).** La primera comprobación
   de idempotencia falló con «cambios inesperados en vivo para el ID 1» porque
   `verifyLiveAnalysis` exigía el objeto `comparison` incluso en filas ya
   `ACTUALIZADO`, para las que el analizador de PG-07G no lo calcula. El fallo
   ocurrió **antes** de abrir la BD para escribir, por lo que no hubo escritura.
   Se corrigió la validación (exigir `comparison` solo en `REANALIZABLE` y
   verificar `box_count`/hash del inventario contra la fila real en
   `ACTUALIZADO`) y la idempotencia pasó.
2. **Hashes heredados actualizados.** Tras el cambio esperado del hash de la
   base, se actualizó ese valor en `scripts/pg07c-check.ts`, `pg07d-check.ts`,
   `pg07e-check.ts`, `pg07g-check.ts` y en la instantánea
   `/tmp/opencode/pg07b-protected-before.sha256` (de `2fb9e76b…` a
   `3c6fb194…`). Sin esto, PG-07B fallaba por «archivos protegidos intactos».

## 13. Limitaciones

- Solo se actualizaron los dos inventarios autorizados; ningún otro registro.
- No se modificaron saves, legalidad, Pokémon, esquema, motor, sprites ni fondo.
- La validación en navegador se hizo sobre copia, no sobre producción.
- Los mockups de Stitch siguen siendo demostrativos y no autoridad de datos.

## 14. Recomendación

Cerrar PG-07H y archivar el checkpoint actual. La siguiente misión natural sería
PG-08 (guarderías compartidas y seguridad: cifrado en tránsito/almacenamiento,
autenticación, transaccionalidad e idempotencia de depósito/recuperación),
siempre con autorización explícita previa.

---

## Evidencias

Directorio: `/home/<usuario>/Descargas/PG-07H/`

| Archivo | SHA-256 |
|---|---|
| `dry-run-real-db.json` | `f35d660a8f06566ab7dc7bd7d1053c0d3c8df4d42e41d2a613d24b68fd4e2c1f` |
| `verify-only.json` | `a068ae0e0af00474b95afe4436aa7385467365801e009e5551c42e1150287d23` |
| `apply-real.json` | `5a4f43b5a62f1930ca7bfe162f71319c732a5e747dd189d72af18bcb04ee8e40` |
| `apply-idempotent.json` | `4e1593fff80aed6a29247de5b62983b80d4e67387ab711dfcc12f3e25208e05d` |
| `comparison-before-after.json` | `112846010725c3d45e22c1cab67c717ad1143ce55ceb2d5c6ff628b31d1ea763` |
| `browser-desktop.png` | `b696be434a264e773a8524cf321c20a7c16a5377fe4437fc7615b2ac3aab9b7e` |
| `browser-mobile.png` | `78abfa5e3b554cb92b1668946d1b4a4f7c895f688f198b3f31536d74c5067131` |
| `hashes.json` | índice de hashes |
| Backup `20261119T102213Z/pokegotchi.db` | `42d8a3a105420c2edde14b000d24116c8f1be7675bc4d02e65f0ad7a7fa45d58` |
