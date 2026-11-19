# PG-07G — Procedimiento propuesto para actualización real

La actualización real **no se ejecutó**. Este procedimiento queda listo para una autorización independiente.

## Requisitos previos

1. Verificar que no haya escrituras pendientes en la aplicación: detener el servidor o garantizar que no hay solicitudes activas.
2. Crear un backup consistente nuevo con `Database.serialize()` desde una conexión de solo lectura; conservar `-wal` y `-shm` si existen.
3. Verificar `PRAGMA integrity_check = ok` en la copia.
4. Ejecutar el dry-run y confirmar que todas las filas son `REANALIZABLE` o `ACTUALIZADO`, con `unexpected=[]` y `legalChanged=[]`.

## Simulación obligatoria

```bash
cp /home/<usuario>/Descargas/PG-07G-BACKUP/20261119T094717Z/pokegotchi.db /tmp/opencode/pg07g-sim.db
bun run scripts/pg07g-reanalyze.ts --apply --target /tmp/opencode/pg07g-sim.db --report /tmp/opencode/pg07g-apply.json
bun run scripts/pg07g-reanalyze.ts --apply --target /tmp/opencode/pg07g-sim.db --report /tmp/opencode/pg07g-idempotent.json
```

Confirmar: segunda ejecución con `applied:0`, `writePerformed:false`, hash lógico idéntico y recuentos `saves/pokemon/pets/exports` intactos.

## Actualización real (solo con autorización explícita)

La herramienta no ofrece un atajo a la base de producción: `assertWritableTarget` rechaza la ruta real, rutas dentro de `data/` y enlaces simbólicos que resuelvan a ella. Por tanto, la actualización real requiere una decisión deliberada del operador, por ejemplo:

1. Copiar la base real a una ruta explícita fuera de `data/`, por ejemplo `/tmp/opencode/pg07g-real-target.db`.
2. Aplicar allí el reanálisis con `--apply --target <ruta>` y verificar el informe.
3. Sustituir la base real por esa copia verificada **solo después** de detener el servidor y con una copia de seguridad fechada.

Esta restricción es intencionada: evita que un comando rutinario o una confusión de rutas modifique registros de producción sin una autorización específica.

## Verificación posterior

- `data/pokegotchi.db`: nuevo hash registrado en el historial de cambios.
- `GET /api/saves/:sha256`: `inventory.storage` presente en cada partida reanalizada.
- Cajas de PC: 18 cajas para HeartGold, 12 para Blue USA; ranuras y nombres reales.
- Legalidad: `counts` idénticos a los del backup.
- `bun run check`: EXIT 0, PG-07A–G sin regresiones.
