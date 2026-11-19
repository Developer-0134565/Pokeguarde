#!/usr/bin/env bash
# PG-06: extrae una copia temporal del archivo de sprites SIN modificar el original.
# Uso: scripts/pg06-extract.sh
set -euo pipefail

ARCHIVE="/home/missingn0/Descargas/Gen 1-7 OV SPrites.7z"
EXPECTED="525ee41f6f6667f6d3ff9c1cb96d0eb4ba57a25e0f5f19b73d1c4ee9598d6d7c"
TARGET="/tmp/opencode/pg06/extracted"

if [ ! -f "$ARCHIVE" ]; then
  echo "PG-06: no existe $ARCHIVE" >&2
  exit 1
fi
ACTUAL="$(sha256sum "$ARCHIVE" | cut -d' ' -f1)"
if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "PG-06: el SHA-256 del archivo ha cambiado; no se extrae." >&2
  exit 1
fi
if [ -d "$TARGET/Gen 1-7 OV SPrites" ] && [ "$(find "$TARGET/Gen 1-7 OV SPrites" -maxdepth 1 -name '*.png' | wc -l)" -eq 2937 ]; then
  echo "PG-06: copia temporal ya presente (2937 PNG): $TARGET"
  exit 0
fi

mkdir -p "$TARGET"
7z x -y -o"$TARGET" "$ARCHIVE" >/dev/null
COUNT="$(find "$TARGET/Gen 1-7 OV SPrites" -maxdepth 1 -name '*.png' | wc -l)"
echo "PG-06: extraídos $COUNT PNG en $TARGET (original intacto: $ACTUAL)"
