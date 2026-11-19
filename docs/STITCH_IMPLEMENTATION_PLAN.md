# Revisión de compatibilidad Stitch → Pokeguarde (2026-11-19)

**Estado: documentación y preparación, NO implementación de UI.** Checkpoint: `checkpoint/pre-stitch-2026-11-19` (SHA `52b8dd7161a9559023617d8f7e868066d470852e`).

## Entregables examinados
- `stitch_pokeguarde_daycare_ui_design(5).zip`: GUARDERÍA desktop, `screen.png` **1396×1421**, ZIP SHA-256 `219b158787d2571e8469fa8582c5ab7d3b8c2473cf59b07a5ff6b42a6b492a2c`.
- `stitch_pokeguarde_daycare_ui_design(6).zip`: FICHA / DATOS móvil, **302×1600**, ZIP SHA-256 `2adf1a5cc15ff41bfd3eae524b21cec6c100ebd4a0604eea9c58985be1e1b88d`.
- `stitch_pokeguarde_daycare_ui_design(7).zip`: FICHA / DATOS escritorio, **1600×1566**, ZIP SHA-256 `4ebe38c9917b909b88aaa8d8fed270cf2f660d1b06c5fa3fbd874f5812a98d86`.

Cada ZIP contiene `code.html`, `screen.png` y el mismo `DESIGN.md`. Las maquetas usan Tailwind, fuentes/iconos y enlaces externos, **ninguna contiene Canvas ni referencia real a guarderia.png**. Los HTML no se incorporan como código de producción. El paquete (5) contiene carcasa Tamagotchi ovalada, menú cuidados y diálogo; (6) ficha estrecha móvil; (7) ficha escritorio con necesidades/EV/entrenamiento/exportación.

**Límite de sincronización:** originales binarios aún no se han subido a GitHub desde el chat; importarlos mediante `scripts/import-stitch-references.sh` en el sistema local y revisar antes del commit. El repositorio sí incluye su manifest, este análisis y el importador.

## Compatibilidad con el código real

| Parte | Código actual | Propuesta / implicación |
| --- | --- | --- |
| Navegación | `apps/web/index.html`, `apps/web/src/main.ts`: Biblioteca y Guardería | Añadir ficha y equipo activo, preservar pestañas Biblioteca Equipo/Cajas/Mochila/Legalidad. |
| Shell | `nursery.ts:paintShell()`: `.nursery-main`, `.nursery-side` | Guardería casi solo dispositivo, trasladar `#pg-hud` y `#pg-sheet` a ficha. |
| Fondo y LCD | `#pg-canvas` interno 160×144, `/assets/room/guarderia.png` | Conservar Canvas/fondo y orden lógico; carcasa en CSS, menús GBC independientes. |
| Botones | `paintControls()`, `doAction()`, `startGame()` | Navegador cíclico + A/aceptar + B/volver; no alterar endpoints ni enfriamientos. |
| Exportación | `exportBlock()`, dry-run y escritura con confirmación | Reubicar interfaz, mantener seguridad y legalidad existentes. |
| Repintado | `updateSheet()` se llama cada ~700ms | Mantener listeners/selección/foco al separar Ficha. |
| Escala | `applyScale()` entera 2x-7x, basada en panel lateral | Recalcular el espacio para una carcasa ovalada, probar móvil 390×844. |
| Idioma | `i18n.ts`: ES y fallback EN | Añadir claves nuevas, no poner texto duro en los controles. |
| Datos | `pet-engine.ts` y PKHeX.Core | Maquetas solo ilustrativas: Gen II con 510 EV/252 stat es **incorrecto**; Gen 1/2 tiene stat exp de cinco valores hasta 65535 con Especial compartido. |

## Orden de integración recomendado (sin ejecutar)

1. Inspección de cambios locales, checkpoint de Git y copia segura separada de datos antes de intervenir en UI. **El checkpoint remoto solo conserva archivos versionados.**
2. Importar tres ZIP y archivos descomprimidos bajo `docs/stitch/reference/`; no copiar `code.html` directamente a `apps/web`. Comparar cualquier guarderia.png de Descargas con el fondo versionado antes de reemplazar.
3. Separar `Ficha / Datos` y `Equipo Activo` de Guardería con la misma fuente de datos y API; conservar la Biblioteca.
4. Dibujar carcasa ovalada rojo/blanco en CSS alrededor del Canvas; controles físicos accesibles y equivalentes por teclado/táctil.
5. Implementar menús y diálogos GBC con iconos nítidos sin cifras. Tamaños mayores, con paginación cuando las seis acciones no quepan; no cubrir siempre al Pokémon.
6. **Spike de render pendiente de aprobación:** comparar Canvas2D por capas (fondo → objetos/cacas → mascota → FX) con Canvas+HTML/CSS (menús), sprites PNG individuales/spritesheets o pixel procedural; medir escalado, transparencias, animación e interacciones. No asignar comportamiento nuevo a cacas ni imponer emojis como assets finales.
7. Pruebas `bun run check` y manuales desktop/móvil: sin blur ni crop, acceso A/B/selector, reglas de Gen correctas, exportaciones dry-run/confirmación, persistencia y 4 mascotas locales intactas.

## Decisiones aún abiertas

Fuente/licencias y escala de sprites Pokémon, PNG vs spritesheet vs dibujo Canvas; tratamiento de emojis; orden exacto de composición/oclusiones; algoritmo de spawn y persistencia de cacas; fuente y técnica del menú GBC; detalle de navegación entre Ficha y Equipo Activo. **No inferirlas de las capturas de Stitch.**
