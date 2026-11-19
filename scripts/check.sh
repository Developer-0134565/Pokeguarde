#!/usr/bin/env bash
# Verificación completa sin arrancar el servidor: motor, día/noche, i18n y
# compilación del sidecar PKHeX.
#
#   bun run check
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

export PATH="$HOME/.dotnet:$PATH"

echo "== Motor de la Guardería =="
bun run scripts/pet-check.ts

echo
echo "== Ciclo día/noche =="
bun run scripts/night-check.ts

echo
echo "== Traducciones =="
bun run scripts/i18n-check.ts

echo
echo "== Integración de sprites overworld (PG-07A) =="
bun run scripts/pg07a-integration-check.ts

echo
echo "== Carcasa y botonera (PG-07B) =="
bun run scripts/pg07b-check.ts

echo
echo "== Ficha / Datos (PG-07C) =="
bun run scripts/pg07c-check.ts

echo
echo "== Equipo activo (PG-07D) =="
bun run scripts/pg07d-check.ts

echo
echo "== Cajas de PC (PG-07E) =="
bun run scripts/pg07e-check.ts

echo
echo "== Sidecar PKHeX =="
command -v dotnet >/dev/null 2>&1 || { echo "error: falta el SDK de .NET 10" >&2; exit 1; }
dotnet build services/pkhex -c Release -v q --nologo

echo
echo "== Contrato completo de Cajas de PC (PG-07F) =="
bun run scripts/pg07f-check.ts

echo
echo "== Reanálisis seguro de inventarios (PG-07G) =="
bun run scripts/pg07g-check.ts

echo
echo "== Actualización supervisada de inventarios (PG-07H) =="
bun run scripts/pg07h-check.ts

echo
echo "== Guarderías compartidas (PG-08A) =="
bun run scripts/pg08a-check.ts

echo
echo "== Persistencia transaccional de guarderías (PG-08B) =="
bun run scripts/pg08b-check.ts

echo
echo "== Sincronización autoritativa simulada (PG-08C) =="
bun run scripts/pg08c-check.ts

echo
echo "== Crianza experimental (PG-08D) =="
bun run scripts/pg08d-check.ts

echo
echo "== Huevos simulados: propiedad y ciclo de vida (PG-08E) =="
bun run scripts/pg08e-check.ts

echo
echo "== Distribución 1+1 y Pokémon DEMO (PG-08F) =="
bun run scripts/pg08f-check.ts

echo
echo "Todo correcto."
