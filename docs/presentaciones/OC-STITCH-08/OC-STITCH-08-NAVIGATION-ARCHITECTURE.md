# OC-STITCH-08 — Arquitectura de navegación

Mapa derivado del inventario completo de Stitch y del PRD v2.4.0-CANONICAL.
El router hash existente es la única fuente de verdad de ruta; el Command Bus
y la cabecera son vistas del mismo registro, no sistemas paralelos.

- Pantallas web/flux mapeadas: **64**
- Páginas lógicas y rutas canónicas: **58**
- Estados: {'OPERATIONAL': 5, 'UI_PROTOTYPE': 52, 'PARTIAL': 1}

## Principios

- `OPERATIONAL`: reutiliza datos reales y motores verificados (núcleo).
- `PARTIAL`: mezcla datos reales con paneles informativos (forense).
- `UI_PROTOTYPE`: interfaz fiel navegable; sin backend, sin acciones externas.
- Toda ruta registrada renderiza contenido real; no existe vista «Próximamente».
- Las variantes responsive se resuelven con CSS, no con rutas duplicadas.
- El Canvas 160x144 y el HUD externo de Guardería permanecen intactos.

## Navegación por dominio

### core (9)

- `/home` — Homepage Oficial y Shell · **OPERATIONAL** · HomeView
- `/guarderia` — Guardería Tamagotchi (2/2) · **OPERATIONAL** · NurseryView
- `/biblioteca` — Biblioteca — Cajas PC y Filtros · **OPERATIONAL** · LibraryView
- `/biblioteca/equipo` — Biblioteca — Equipo y Mochila · **OPERATIONAL** · LibraryView
- `/ficha` — Ficha y Datos del Pokémon · **OPERATIONAL** · SheetView
- `/crianza` — Crianza y Huevos · **UI_PROTOTYPE** · BreedingFlow
- `/perfil` — Perfil, Notificaciones y Privacidad · **UI_PROTOTYPE** · ProfileView
- `/jugadores` — Directorio de Jugadores y Guarderías · **UI_PROTOTYPE** · PlayersView
- `/tienda` — Tienda de Guardipuntos · **UI_PROTOTYPE** · ShopView

### creator_shell (3)

- `/studio/shell` — Shell Studio — Workspace · **UI_PROTOTYPE** · ShellStudio
- `/studio/shell/export` — Shell Studio — Export Center · **UI_PROTOTYPE** · ShellStudio
- `/studio/shell/preview` — Shell Studio — Vista multiángulo · **UI_PROTOTYPE** · ShellStudio

### emulation (18)

- `/emulation` — Emulation — Room Explorer · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/flows` — Emulation — Mapa de flujos · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/create` — Emulation — Crear sala · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/rooms/01` — Emulation — Sala 01 (1 jugador) · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/rooms/02` — Emulation — Sala 02 (2 jugadores) · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/rooms/03` — Emulation — Sala 03 (dual viewport) · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/rooms/04` — Emulation — Sala 04 (espectador) · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/rooms/05` — Emulation — Sala 05 (pantalla completa) · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/battle` — Emulation — Battle Room · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/trade` — Emulation — Trade Room · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/studio` — Emulation — Room Suite Studio · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/studio/manager` — Emulation — Room Manager · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/studio/monitor` — Emulation — Live Monitor · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/studio/link` — Emulation — Link Manager · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/studio/permissions` — Emulation — Permisos · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/studio/logs` — Emulation — Session Logs · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/studio/analytics` — Emulation — Analytics · **UI_PROTOTYPE** · EmulationSuite
- `/emulation/studio/adapters` — Emulation — Emulator Adapters · **UI_PROTOTYPE** · EmulationSuite

### forensics (1)

- `/forensics` — Inspección Forense PKHeX · **PARTIAL** · ForensicsView

### habitat (3)

- `/studio/habitat` — Habitat Studio — Editor · **UI_PROTOTYPE** · HabitatStudio
- `/studio/habitat/devices` — Habitat Studio — Dispositivo · **UI_PROTOTYPE** · HabitatStudio
- `/studio/habitat/library` — Habitat Studio — Biblioteca · **UI_PROTOTYPE** · HabitatStudio

### marketing (14)

- `/studio/marketing` — Marketing Studio — Overview · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/brand` — Marketing — Brand Kit · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/social` — Marketing — Social · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/creative` — Marketing — Banner & Canvas · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/press` — Marketing — Press Kit · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/roadmap` — Marketing — Roadmap · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/campaigns` — Marketing — Campaigns · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/copy` — Marketing — AI Copywriter · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/localization` — Marketing — Localización · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/assets` — Marketing — Media Library · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/calendar` — Marketing — Content Calendar · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/community` — Marketing — Community Hub · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/analytics` — Marketing — Analytics · **UI_PROTOTYPE** · MarketingStudio
- `/studio/marketing/export` — Marketing — Export Center · **UI_PROTOTYPE** · MarketingStudio

### theme (10)

- `/studio/theme` — Theme Studio — Galería · **UI_PROTOTYPE** · ThemeStudio
- `/studio/theme/colors` — Theme Studio — Color · **UI_PROTOTYPE** · ThemeStudio
- `/studio/theme/typography` — Theme Studio — Tipografía · **UI_PROTOTYPE** · ThemeStudio
- `/studio/theme/spacing` — Theme Studio — Espaciado · **UI_PROTOTYPE** · ThemeStudio
- `/studio/theme/components` — Theme Studio — Componentes · **UI_PROTOTYPE** · ThemeStudio
- `/studio/theme/layout` — Theme Studio — Layout · **UI_PROTOTYPE** · ThemeStudio
- `/studio/theme/preview` — Theme Studio — Vista previa · **UI_PROTOTYPE** · ThemeStudio
- `/studio/theme/tokens` — Theme Studio — Tokens · **UI_PROTOTYPE** · ThemeStudio
- `/studio/theme/designmd` — Theme Studio — DESIGN.md · **UI_PROTOTYPE** · ThemeStudio
- `/studio/theme/tripanel` — Theme Studio — Editor tri-panel · **UI_PROTOTYPE** · ThemeStudio

## Accesos

1. Cabecera Pocket Tech 1999: accesos al núcleo y a los Studios.
2. Registro lateral por dominio: acceso completo a todas las páginas lógicas.
3. Command Bus (Ctrl+K / Cmd+K): búsqueda por título, slug, dominio y palabras clave.
4. Navegación contextual dentro de cada Studio (pestañas del workspace).
5. Historial del navegador y enlaces directos por hash.
