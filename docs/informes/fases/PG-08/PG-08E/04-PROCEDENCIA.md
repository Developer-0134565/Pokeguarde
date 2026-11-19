# PG-08E · 04 — Procedencia y exclusión de Pokémon DEMO

Esquema aislado `pg08e.provenance`, versión `1.0.0`. El veredicto de legalidad
de PG-08A (`legal` / `unverified` / `illegal`) NO se usa como procedencia: un
Pokémon «no verificable» no es por ello DEMO ni ilegal, y PKHeX no se modifica.

## Clases

- `SAVE_IMPORTED` — importado de un save, con SHA-256 de 64 hexadecimales.
- `DEMO_INTERNAL_NON_EXPORTABLE` — creado internamente por PLAY NOW.
- `UNKNOWN_UNVERIFIED` — procedencia desconocida o evidencia insuficiente.

`classifyProvenance` **falla cerrada**: `save_import` sin SHA válido pasa a
`UNKNOWN_UNVERIFIED`. `play_now_demo` siempre se clasifica como DEMO, aunque
se le aporte un SHA; `demoProvenance` es la fábrica permanente.

`isBreedableProvenance` devuelve `DEMO_PROVENANCE_BLOCKED` o
`UNKNOWN_PROVENANCE_BLOCKED`, y el almacén rechaza la producción antes de
crear cualquier registro. `assertProvenanceUnchanged` detecta intentos de
`PROVENANCE_MUTATED`: cambiar metadatos no convierte un DEMO en importado.

## Restricciones permanentes del DEMO

No criar, no producir huevos, no intercambiar, no exportar, no transferir a
partidas y no volverse legítimo por cambios de metadatos. Se comprueba en el
dominio (`egg-domain.ts`) **y** en la autoridad del almacén
(`shared-egg-store.ts`), no solo en la interfaz.

## Conexión futura

No existe hoy un modelo de procedencia PLAY NOW en `shared-nurseries.ts` ni en
la BD real. Este contrato es aislado: cuando se conecte con la importación
real, cada `PokemonRef` deberá aportar explícitamente su procedencia. A los
registros existentes **no** se les asigna una procedencia inventada.
