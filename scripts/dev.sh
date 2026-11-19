#!/usr/bin/env bash
# Arranque único de desarrollo de Pokeguarde.
#
#   bun run dev          (o ./scripts/dev.sh)
#
# Comprueba Bun y .NET, compila el sidecar PKHeX si falta y arranca la API +
# frontend en http://127.0.0.1:8787. El sidecar no es un proceso permanente:
# se lanza por petición desde el servidor. `exec` hace que Ctrl+C (SIGINT) y
# SIGTERM lleguen directamente a Bun, sin dejar procesos huérfanos.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

fail() {
  echo "error: $*" >&2
  exit 1
}

case "${1:-}" in
  -h|--help)
    echo "uso: bun run dev | bash scripts/dev.sh"
    echo "  PORT=8787 (por defecto). Requiere Bun 1.3+ y .NET SDK 10 en ~/.dotnet."
    exit 0
    ;;
esac

command -v bun >/dev/null 2>&1 \
  || fail "no se encontró 'bun'. Instala Bun 1.3+ (https://bun.sh) y vuelve a intentarlo."

export PATH="$HOME/.dotnet:$PATH"
command -v dotnet >/dev/null 2>&1 \
  || fail "no se encontró el SDK de .NET 10. Instálalo en ~/.dotnet o exporta PATH=\"\$HOME/.dotnet:\$PATH\"."

port="${PORT:-8787}"
host="127.0.0.1"

# Puerto ocupado: mejor fallar con un mensaje claro que arrancar a medias.
if command -v ss >/dev/null 2>&1; then
  if ss -ltn 2>/dev/null | awk 'NR > 1 { print $4 }' | grep -qE "[:.]${port}$"; then
    fail "el puerto ${port} ya está en uso. Cierra el proceso anterior (ss -ltnp | grep :${port}) o usa PORT=otro."
  fi
fi

dll="$root/services/pkhex/bin/Release/net10.0/pkhex.dll"
if [ ! -f "$dll" ]; then
  echo "· compilando el sidecar PKHeX (solo la primera vez)…"
  dotnet build "$root/services/pkhex" -c Release -v q --nologo \
    || fail "no se pudo compilar el sidecar PKHeX."
fi

echo "· Pokeguarde en http://${host}:${port}"
echo "  (sidecar PKHeX bajo demanda · Ctrl+C para parar)"
exec env PORT="$port" bun run "$root/apps/server/src/index.ts"
