# OC-STITCH-08 — Plan de implementación por lotes

Ejecución sin framework nuevo: Bun + TypeScript + DOM nativo + CSS propio.
Cada lote termina con build, pruebas, rutas accesibles y sin errores nuevos de consola.

| Lote | Dominio | Páginas | Componente | Resultado |
|---|---|---:|---|---|
| 1 | Núcleo y navegación | 10 | Home/Nursery/Library/Sheet + vistas de núcleo | PENDIENTE |
| 2 | Creator Suite | 16 | ThemeStudio/ShellStudio/HabitatStudio | PENDIENTE |
| 3 | Marketing Studio | 14 | MarketingStudio | PENDIENTE |
| 4 | Emulation Suite | 18 | EmulationSuite | PENDIENTE |
| 5 | Adicionales y cierre | — | Componentes compartidos, accesibilidad, comparativas | PENDIENTE |

## Componentes compartidos (Fase F)

- `PageFrame`: marco común con título, dominio, badge de estado y breadcrumb.
- `StudioWorkbench`: sidebar de módulos + panel de trabajo + vista previa.
- `InfoPanel`, `SpecTable`, `StatCard`, `MockToolbar`, `EmptyState`, `PrototypeNotice`.
- Primitivas existentes de `ui/primitives.ts` (badges, paneles, diálogos, campos).

## Punto de control

Antes de la implementación masiva se verifica: inventario completo, clasificación
cerrada, sin colisiones de rutas, sin tocar motores protegidos, dependencias disponibles,
plan por lotes registrado y estado inicial de Git/tests documentado.
