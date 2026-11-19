# Entregables Stitch (referencia, no producción)

Las versiones revisadas del 19-nov-2026 son:
- **5 — Guardería desktop**: Tamagotchi ovalado rojo/blanco, tres botones, menú CUIDADOS GBC, diálogo.
- **6 — Ficha / Datos móvil**: necesidades, EVs y herramientas informativas.
- **7 — Ficha / Datos desktop**: ficha en columnas, entrenamiento y exportación.

Cada original incluye `code.html`, `screen.png` y `DESIGN.md`. Solo son referencias visuales. **No instalar Tailwind ni sustituir la app directamente**.

Los ZIP **no están todavía versionados**. En el ordenador del desarrollador, desde raíz del repo:

```bash
bash scripts/import-stitch-references.sh \
 "$HOME/Descargas/stitch_pokeguarde_daycare_ui_design(5).zip" \
 "$HOME/Descargas/stitch_pokeguarde_daycare_ui_design(6).zip" \
 "$HOME/Descargas/stitch_pokeguarde_daycare_ui_design(7).zip"
git status --short
```

El script verifica los SHA-256, copia cada `original.zip` y extrae los tres archivos sin sobrescribir nada. Revisar imágenes de terceros/enlaces antes de hacer commit. Los ZIP originales también pueden estar en `~/Downloads` según configuración de Fedora.

Ver `docs/STITCH_IMPLEMENTATION_PLAN.md` para análisis de compatibilidad y riesgos. Fondo real ya presente: `apps/web/assets/room/guarderia.png`, no reemplazar sin comparar los bytes.
