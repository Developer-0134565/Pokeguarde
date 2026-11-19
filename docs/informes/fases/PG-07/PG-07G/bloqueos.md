# PG-07G — Bloqueos y condiciones de seguridad

## Bloqueos respetados

1. **Base de datos real no modificada.** Todas las escrituras se hicieron en copias sintéticas o aisladas bajo `/tmp/opencode`. `data/pokegotchi.db` conserva el SHA-256 inicial `2fb9e76bc8b8bb820a77e21342abe7b079f687749503315e13c0cf95106675e0`.
2. **Sin reparseo de producción.** No se invocaron `POST /api/saves/:sha/reparse` ni `POST /api/saves/reparse`.
3. **Sin escrituras en partidas.** Los ocho archivos de `fixtures/` conservan sus hashes iniciales. El sidecar solo se ejecutó en modo `inventory` (lectura).
4. **Sin exportación, legalidad ni esquema nuevos.** No se llamó al comando `export`; no se alteraron columnas de legalidad; no se crearon tablas ni columnas.
5. **Sin commits ni pushes.** HEAD sigue en `819b73b49a8aca76486173917d7abdb4518290ab`.
6. **Sin grupos de generación inventados.** `gen2-polished-hack.srm` sigue sin detectarse y no se presents como evidencia de cobertura.

## Condiciones que impedirían autorizar la actualización real

- Cualquier candidato con `classification=REQUIERE REVISIÓN`, `comparison.unexpected` no vacío o `comparison.legalChanged` no vacío.
- Falta de una copia del save con SHA-256 coincidente respecto al registro.
- Metadatos `storage.availability != "available"`, nombres no disponibles o ranuras vacías desconocidas.
- Cambio en recuentos de `saves`, `pokemon`, `pets` o `exports` dentro de la transacción.
- `PRAGMA integrity_check` distinto de `ok` antes de confirmar.
- Destino que resuelva a la base de producción, directamente o mediante enlace simbólico.

En el dry-run real ninguna de estas condiciones se cumplió para las dos partidas registradas; por eso la actualización real **puede autorizarse con seguridad** previa autorización independiente.
