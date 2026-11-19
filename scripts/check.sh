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
echo "== Sidecar PKHeX =="
command -v dotnet >/dev/null 2>&1 || { echo "error: falta el SDK de .NET 10" >&2; exit 1; }
dotnet build services/pkhex -c Release -v q --nologo

echo
echo "Todo correcto."
