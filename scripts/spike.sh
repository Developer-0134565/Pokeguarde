#!/usr/bin/env bash
# Ejecuta la inspección del sidecar sobre todos los fixtures y resume el resultado.
# Uso: ./scripts/spike.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.dotnet:$PATH"
export DOTNET_NOLOGO=1

if ! command -v dotnet >/dev/null 2>&1; then
  echo "falta el SDK de .NET: export PATH=\"\$HOME/.dotnet:\$PATH\"" >&2
  exit 1
fi

fallos=0
for f in fixtures/*.srm; do
  out="$(dotnet run --project services/pkhex -- inspect "$f" 2>/dev/null)"
  if [ $? -ne 0 ]; then
    echo "SIN DETECTAR  $(basename "$f")"
    continue
  fi
  echo "$out" | python3 -c '
import json, sys
d = json.load(sys.stdin)
rt = (d.get("roundTrip") or {}).get("identical")
print("%-26s %-10s gen=%s OT=%-8s pokemon=%-4s legal=%s/%s rt=%s" % (
    d["file"], d.get("saveType"), d.get("generation"), str(d.get("trainer"))[:8],
    d.get("pokemonTotal"), d.get("legal"), d.get("illegal"), rt))
if rt is False:
    print("  AVISO: ida y vuelta distinta -> solo lectura")
    sys.exit(3)
' || fallos=$((fallos + 1))
done

if [ "$fallos" -ne 0 ]; then
  echo "fixtures con ida y vuelta distinta: $fallos" >&2
  exit 3
fi
echo "OK: todos los fixtures detectados mantienen ida y vuelta idéntica"
