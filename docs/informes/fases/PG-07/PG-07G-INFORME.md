# PG-07G — Reanálisis seguro de inventarios y preparación de migración al contrato PG-07F

**Estado: TERMINADO Y VERIFICADO. La base de datos real NO fue modificada.**

Fecha: 19-nov-2026. Repositorio: `/home/<usuario>/Proyectos/Pokeguarde`. Rama `main`, HEAD `819b73b49a8aca76486173917d7abdb4518290ab`. Sin commits ni pushes.

---

## 1. Resumen ejecutivo

Se auditaron los inventarios almacenados en modo exclusivamente lectura, se creó un backup consistente con `Database.serialize()`, se implementó una herramienta de reanálisis segura, se ejecutó un dry-run sobre la base real y una simulación transaccional sobre una copia aislada, se comprobaron idempotencia y rollback, se añadió una suite automatizada y se validó la interfaz resultante en navegador sobre una base de pruebas.

Resultado: las dos partidas registradas son **REANALIZABLES** y pueden actualizarse al contrato PG-07F sin pérdida de información ni cambios de legalidad. No se aplicó la actualización a `data/pokegotchi.db`, porque PG-07G no autoriza esa escritura.

**Conclusión:** la actualización real puede autorizarse con seguridad mediante un procedimiento independiente; el procedimiento propuesto está en `/home/<usuario>/Descargas/PG-07G/procedimiento.md`.

---

## 2. Estado inicial y final del repositorio

- HEAD inicial y final: `819b73b49a8aca76486173917d7abdb4518290ab`.
- Hash inicial de `git status --porcelain=v1 --untracked-files=all`: `b8428291fad2c16d179b3a92ec007b0c71fa8b02a8242d3d3c97a370e10e4b28`.
- Hash final: `09fe353705b2d5770412e55793b4f03d2c93a3f516a2c0e5fb64ec5a50e74643`.
- Modificados rastreados: `apps/server/src/index.ts`, `apps/web/index.html`, `apps/web/src/i18n.ts`, `apps/web/src/main.ts`, `apps/web/src/nursery.ts`, `apps/web/src/style.css`, `scripts/check.sh`, `services/pkhex/Program.cs`.
- Nuevos: `scripts/pg07g-check.ts`, `scripts/pg07g-reanalyze.ts`.
- Untracked heredados de PG-07B/C/D/E/F, Stitch y ZIP conservados.

`apps/server/src/index.ts` y `services/pkhex/Program.cs` ya estaban modificados por PG-07F con hashes autorizados; PG-07G no los cambió.

---

## 3. Auditoría de inventarios existentes

Base real examinada con `readonly: true`.

| Concepto | Resultado |
|---|---|
| Partidas registradas | 2 |
| Inventarios almacenados | 2 |
| Inventarios con contrato PG-07F | 0 |
| Inventarios con contrato anterior | 2 |
| Inventarios incompletos | 0 |
| Duplicados | 0 |
| Relaciones pokemon/save | coherentes (105 + 5 = 110 filas) |
| `PRAGMA integrity_check` | `ok` |
| `journal_mode` | `wal` |

Hallazgo relevante: `data/` contiene `-wal` y `-shm`; copiar solo el archivo principal habría sido inconsistente. Las filas conservan `stored_path` con el directorio antiguo `Pokegotchi`, ya inexistente tras el renombre, pero las copias hash-named sí existen en `data/saves/`. La herramienta resuelve primero `stored_path` y después la copia hash-named, verificando siempre el SHA-256.

Clasificación final:

| Partida | Clasificación | Acción | Evidencia |
|---|---|---|---|
| `gen4-heartgold-spain.srm` (Gen 4) | REANALIZABLE | would-update | Fuente hash-named verificada; sidecar detecta 18 cajas × 30; 99 ocupados; legalidad intacta. |
| `gen1-blue-usa.srm` (Gen 1) | REANALIZABLE | would-update | Fuente hash-named verificada; sidecar detecta 12 cajas × 20; 0 ocupados; legalidad intacta. |

`gen2-polished-hack.srm` no está registrado en la base real y sigue sin detectarse; no se usa como evidencia.

El informe legible está en `/home/<usuario>/Descargas/PG-07G/inventarios-candidatos.md`; el registro completo en `dry-run-real-db.json`.

---

## 4. Contrato anterior y contrato PG-07F

Contrato anterior: `boxes[] = [{index,name,slots}]`, sin cajas vacías ni ranuras vacías, sin capacidad declarada. El frontend PG-07E derivaba la capacidad del mayor `slot` observado.

Contrato PG-07F: añade `inventory.storage` con `availability`, `boxCount`, `slotCount`, `boxDataSlots`, `namesAvailable`, `emptySlotsKnown` y `error`; cada caja incorpora `nameAvailable`, `capacity`, `occupied`, `empty`, `positions[]` y conserva `slots[]` como lista de ocupados. Las posiciones incluyen `ref:{location:"box",box,slot}` derivado de índices reales. Los desconocidos son `null` o estado explícito, nunca cero.

El reanálisis conserva `inventory.slots` y todos los campos anteriores; solo añade metadatos y recalcula `path`/`roundTrip` con la misma salida canónica.

---

## 5. Backup verificado

Directorio: `/home/<usuario>/Descargas/PG-07G-BACKUP/20261119T094717Z/`

- Fecha UTC: `2026-11-19T09:47:17.293Z`.
- Método: `Database.serialize()` desde conexión readonly; incluye estado WAL. Se conservaron `-wal` y `-shm`.
- `pokegotchi.db`: 274432 bytes, SHA-256 `42d8a3a105420c2edde14b000d24116c8f1be7675bc4d02e65f0ad7a7fa45d58`.
- `integrity_check`: `ok` en origen y copia.
- Contenido: 2 saves, 110 Pokémon, 4 mascotas, 8 exports.
- Estado: `VERIFIED`.

Manifiesto: `manifest.json`; suma: `pokegotchi.db.sha256`.

---

## 6. Herramienta implementada

`scripts/pg07g-reanalyze.ts`:

- Modo por defecto: **solo lectura**; `--dry` explícito equivalente.
- `--apply --target <ruta>` exige destino explícito; rechaza base de producción, rutas dentro de `data/` y symlinks que resuelvan a producción.
- Resuelve fuentes por `stored_path` o copia hash-named, verificando SHA-256 antes de analizar.
- Llama al comando real `inventory` del sidecar; no reimplementa PKHeX.
- Compara contrato antiguo y nuevo separando cambios esperados, inesperados, incompletos y de legalidad.
- Aplica solo `box_count` e `inventory_json`, en `BEGIN IMMEDIATE`, con verificación de recuentos e integridad antes de `COMMIT`; `ROLLBACK` ante cualquier error.
- Idempotente: las filas con `storage` se clasifican `ACTUALIZADO` y se omiten.
- Detiene cualquier actualización si hay cambios inesperados o de legalidad.

`scripts/pg07g-check.ts`: 69 comprobaciones headless; integrado en `scripts/check.sh`.

---

## 7. Dry-run sobre la base real

Archivo: `/home/<usuario>/Descargas/PG-07G/dry-run-real-db.json`. Resultado `ok:true`, `wouldUpdate:2`, sin cambios inesperados ni de legalidad.

| Partida | Antes | Después propuesto | Legalidad |
|---|---|---|---|
| HeartGold Gen 4 | 6 cajas, 99 slots | 18 cajas × 30, 540 posiciones, 441 vacías, 12 cajas vacías; `box_count=18` | 105 = 68/17/20 intactos |
| Blue USA Gen 1 | 0 cajas, 0 slots | 12 cajas × 20, 240 posiciones vacías; `box_count=12` | 5 = 0/0/5 intactos |

Hashes propuestos de inventario: HeartGold `5ee712b6456696ca9d83200767885c6d84cfb5f6f2e35c62450b36dd9fc1f3b7`; Blue USA `2552c2c4eb57de99c1a7249fa236785b40d13a98e5685c074f1bc8483a3acfdc`.

Cambios esperados detectados: `storage`, `boxCount`/`slotCount`, cajas y ranuras vacías, posiciones, `path`, `roundTrip` recalculado con igual salida canónica y campo `box` nuevo en los Pokémon.

---

## 8. Simulación aislada

Copia: `/tmp/opencode/pg07g-sim-final.db`, derivada del backup verificado.

Primera aplicación (`apply-isolated.json`): `ok:true`, 2 filas aplicadas. Antes y después: 2 saves, 110 Pokémon, 4 mascotas, 8 exports, `integrity_check=ok`. Hash lógico final: `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`.

Segunda aplicación (`apply-isolated-idempotent.json`): 2 filas `ACTUALIZADO`, `applied:0`, `writePerformed:false`, hash lógico idéntico.

Comparación detallada: `comparison-isolated.json`. Prueba de rollback: trigger forced en una DB sintética; la herramienta devolvió `rolledBack:true`, `applied:[]` y conservó `box_count` anterior.

---

## 9. Pruebas ejecutadas

`export PATH="$HOME/.dotnet:$PATH" && bun run check` → **EXIT 0**, `Todo correcto.`

Incluye: motor, día/noche, i18n, PG-07A 54 comprobaciones, PG-07B, PG-07C, PG-07D, PG-07E, sidecar .NET con **0 avisos / 0 errores**, PG-07F 132 comprobaciones y **PG-07G 69/69**.

Cobertura PG-07G: inventario antiguo, ya actualizado, incompleto, sin fuente, incompatible, error de análisis, idempotencia, identificadores, relaciones, legalidad, `inventory.slots`, `inventory.storage`, ranuras y cajas vacías, integridad, rollback, rechazo de producción, rechazo de symlink e integridad de fixtures.

---

## 10. Validación funcional en navegador

Servidor aislado en `http://127.0.0.1:8792/` con copia de `apps/`, `services/` y la DB ya reanalizada. La base de producción no se conectó.

**Escritorio 1280×900:** HeartGold mostró `Almacenamiento real disponible · 18 cajas en la partida · 30 ranuras por caja` y `Capacidad real: 30 ranuras · Ocupadas: 29 · Vacías: 1`, con posiciones 1..30 y ranura 30 vacía. Caja 4: 30 ranuras vacías. Selección de ranura 1, FICHA/DATOS y `← Volver` restauraron caja 1/ranura 1. Filtro `Ilegales`: 30 posiciones conservadas, 2 coincidencias. Búsqueda `MAGNEMITE`: 30 posiciones conservadas, 1 coincidencia. Cambio a Gen 1: 12 cajas × 20, todas vacías. Sin desplazamiento horizontal.

**Móvil 390×844:** cuadrícula `162px 162px`, 20 posiciones en Gen 1, `scrollWidth=innerWidth=390`, navegación a caja 2 correcta.

Servidor y navegador cerrados al terminar. No se generaron capturas porque no eran un entregable obligatorio de PG-07G.

---

## 11. Integridad de datos protegidos

| Archivo | SHA-256 final |
|---|---|
| `data/pokegotchi.db` | `2fb9e76bc8b8bb820a77e21342abe7b079f687749503315e13c0cf95106675e0` |
| `apps/server/src/db.ts` | `fcd95b0c63c059c57228bd7c06b1121247c23f6f18178388d43148f9193fed7b` |
| `services/pkhex/pkhex.csproj` | `b9abdb854c71bcddde1e72dad6342709aa1370e27f62a8c1d4a605ccd693a03d` |
| `apps/web/src/pet-engine.ts` | `26955014098ea15f36b21a8a0e714fcccf4183a8e0988cbea801abf9cfd096bb` |
| `apps/web/src/sprite-runtime.ts` | `9e25e9ecb8f9383294265706bedaefc3dda8dcc9c40fd4f2a08248fd9e8e9ac8` |
| `apps/web/src/sprite-render.ts` | `92f43df3284153b4be0a75755f9e7984a78e1aad40064ff6fd8d94a675185f30` |
| `apps/web/assets/room/guarderia.png` | `bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095` |

Los ocho archivos de `fixtures/` conservan sus hashes iniciales (detalle en `hashes.json`). No se modificaron saves, exports ni registros de producción. No se usaron servicios externos con partidas reales.

---

## 12. Limitaciones y riesgos

- No se aplicó la migración real; sigue requiriendo autorización independiente.
- No se verificó tacto físico en dispositivo real.
- No se usó un fixture de partida oficial de Gen 2 o Gen 3; los disponibles son hacks. La cobertura real de reanálisis se limita a Gen 1 y Gen 4; Gen 2/3/5 quedan cubiertas por las pruebas headless del contrato PG-07F, no por inventarios persistidos.
- El backup conserva `-wal` y `-shm`; deben restaurarse juntos si se usa para reversión.
- Riesgo mitigado: sustituir la base real sin detener el servidor. El procedimiento propuesto exige detenerlo y verificar el backup.

---

## 13. Entregables

Directorio `/home/<usuario>/Descargas/PG-07G/`:

- `dry-run-real-db.json`
- `inventarios-candidatos.md`
- `apply-isolated.json`
- `apply-isolated-idempotent.json`
- `comparison-isolated.json`
- `hashes.json`
- `bloqueos.md`
- `procedimiento.md`

Backup: `/home/<usuario>/Descargas/PG-07G-BACKUP/20261119T094717Z/`.

Informe: `/home/<usuario>/Descargas/PG-07G-INFORME.md`.

---

## 14. Recomendación del siguiente hito

Autorizar de forma independiente la **PG-07H — Aplicación supervisada del reanálisis**, exclusivamente para ejecutar el procedimiento de `/home/<usuario>/Descargas/PG-07G/procedimiento.md` sobre una copia controlada y sustituir la base real tras verificación, con registro del nuevo hash. No debe combinarse con cambios de legalidad, exportación ni modificaciones de partidas.
