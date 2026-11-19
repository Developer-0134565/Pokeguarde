#!/usr/bin/env bash
set -euo pipefail
# Importación conservadora: SOLO docs/stitch/reference, nunca código ni datos.
if [[ $# -ne 3 ]]; then echo 'Uso: bash scripts/import-stitch-references.sh <zip5> <zip6> <zip7>' >&2; exit 2; fi
command -v unzip >/dev/null || { echo "Falta unzip" >&2; exit 2; }
command -v sha256sum >/dev/null || { echo "Falta sha256sum" >&2; exit 2; }
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
base="$root/docs/stitch/reference"
inputs=("$1" "$2" "$3")
folders=(guarderia-desktop ficha-mobile ficha-desktop)
expected=(219b158787d2571e8469fa8582c5ab7d3b8c2473cf59b07a5ff6b42a6b492a2c 2adf1a5cc15ff41bfd3eae524b21cec6c100ebd4a0604eea9c58985be1e1b88d 4ebe38c9917b909b88aaa8d8fed270cf2f660d1b06c5fa3fbd874f5812a98d86)
for i in 0 1 2; do
  [[ -f "${inputs[$i]}" ]] || { echo "No existe: ${inputs[$i]}" >&2; exit 2; }
  actual="$(sha256sum "${inputs[$i]}" | cut -d " " -f1)"
  [[ "$actual" == "${expected[$i]}" ]] || { echo "SHA-256 distinto del revisado: ${inputs[$i]}" >&2; exit 3; }
  [[ ! -e "$base/${folders[$i]}" ]] || { echo "No sobrescribiré: $base/${folders[$i]}" >&2; exit 4; }
  for name in code.html screen.png DESIGN.md; do
    unzip -Z1 "${inputs[$i]}" | grep -Fxq "$name" || { echo "Falta $name" >&2; exit 5; }
  done
done
mkdir -p "$base"
for i in 0 1 2; do
  dest="$base/${folders[$i]}"
  mkdir "$dest"
  cp -- "${inputs[$i]}" "$dest/original.zip"
  for name in code.html screen.png DESIGN.md; do unzip -p "${inputs[$i]}" "$name" > "$dest/$name"; done
  echo "Importado $dest"
done
echo "Importación terminada: sin cambios en apps/, data/ ni fixtures/."
