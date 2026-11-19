---
name: Pokéguarde Tactile Daycare
colors:
  surface: '#0b1611'
  surface-dim: '#0b1611'
  surface-bright: '#303c36'
  surface-container-lowest: '#06100c'
  surface-container-low: '#131e19'
  surface-container: '#17221d'
  surface-container-high: '#212c27'
  surface-container-highest: '#2c3732'
  on-surface: '#d9e6dd'
  on-surface-variant: '#c1cab4'
  inverse-surface: '#d9e6dd'
  inverse-on-surface: '#28332e'
  outline: '#8b9480'
  outline-variant: '#414939'
  surface-tint: '#8eda54'
  primary: '#a3f167'
  on-primary: '#183800'
  primary-container: '#88d44e'
  on-primary-container: '#2a5900'
  inverse-primary: '#346b00'
  secondary: '#b0ceb8'
  on-secondary: '#1c3626'
  secondary-container: '#354f3e'
  on-secondary-container: '#a2bfaa'
  tertiary: '#ffd77f'
  on-tertiary: '#3f2e00'
  tertiary-container: '#f0b814'
  on-tertiary-container: '#644b00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#a9f76d'
  primary-fixed-dim: '#8eda54'
  on-primary-fixed: '#0b2000'
  on-primary-fixed-variant: '#265100'
  secondary-fixed: '#ccead3'
  secondary-fixed-dim: '#b0ceb8'
  on-secondary-fixed: '#062012'
  on-secondary-fixed-variant: '#334c3c'
  tertiary-fixed: '#ffdf9a'
  tertiary-fixed-dim: '#f7be1d'
  on-tertiary-fixed: '#251a00'
  on-tertiary-fixed-variant: '#5a4300'
  background: '#0b1611'
  on-background: '#d9e6dd'
  surface-variant: '#2c3732'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.04em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 9px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.08em
  stat-display:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a tactile, physical console aesthetic engineered for archival fidelity and caretaking. Designed as a Spanish-first experience, it balances the nostalgic ergonomics of vintage cartridge hardware with the precision of a high-end botanical laboratory. The interface evokes a sense of permanence, responsibility, and mechanical delight—transforming digital inventory and creature nurturing into the feeling of inspecting high-grade physical specimens inside a backlit, matte-finished handheld chassis.

The audience consists of dedicated collectors, competitive breeders, and virtual pet caretakers who value deep data visibility without sensory overload. Rather than relying on juvenile cartoon styling, the interface employs a refined, tactile-industrial aesthetic: subtly recessed display windows, micro-grooved grip panels, precision-milled bezels, and tactile physical triggers. Surfaces feel heavy, cool to the touch, and meticulously fabricated.

## Colors

The palette operates in a dark chromatic space inspired by dense coniferous canopies and matte polymer housings. Surfaces are rooted in three tonal depths: `#131c17` serves as the canvas substrate, `#1b2621` creates elevated card modules and recessed bays, and `#23312b` defines active controls, floating overlays, and tactile rails. 

Typography is rendered in warm ivory tones (`#f5f4ed` for primary content and `#dedcd2` for secondary information) to replicate high-legibility retro-reflective displays under ambient light. Structural hierarchy and borders leverage desaturated sage (`#4d6856` and `#7e9a86`). Functional highlights are applied with surgical discipline: vibrant lime (`#88d44e` / `#a3e635`) is reserved exclusively for vital energy, active daycare progression, and primary physical confirmations. Warm amber (`#eab308` / `#f59e0b`) flags incubation cooldowns, egg readiness, and memory warnings. Coral (`#ef4444` / `#f87171`) designates save corruption alerts, critical fatigue, or irreversible transfer confirmations.

## Typography

The type system pairs ergonomic warmth with scientific instrumentation. Plus Jakarta Sans serves as the primary linguistic driver, providing open apertures, humanist clarity, and comfortable cadence across complex Spanish localized phrases (e.g., *Guardería de Crianza*, *Registro de Especímenes*). 

JetBrains Mono handles technical parameters, index IDs, step counters, stat attributes (IVs/EVs), and timestamp telemetry. All tabular data and hexadecimal memory offsets must remain strictly monospaced to prevent optical jitter during live real-time syncs. Letter-spacing on monospaced labels is expanded slightly to evoke debossed industrial chassis serials.

## Layout & Spacing

The layout is built upon an 8-point spatial rhythm framed inside an outer console perimeter. On handheld-dimension mobile screens, viewport margins remain tight (16px) to emulate the edge-to-edge LCD housing of dedicated gaming hardware. A strict 4-column layout governs mobile interfaces, shifting to an 8-column layout on tablets, and a 12-column layout on desktop hardware inspection dashboards.

Content grouping prioritizes functional containment bays. Panels behave like interlocking modular deck units: rather than open web expanses, elements are grouped into rigid, segmented grids mimicking memory-bank banks and inventory card racks.

## Elevation & Depth

Elevation is rendered physically rather than atmospherically. Drop shadows are tight, directional, and grounded, eschewing soft web blurs in favor of structural machine bevels.

Depth relies on a dual-edge lighting technique: a 1px inner highlight (`rgba(255, 255, 255, 0.08)`) on top and left borders simulates an overhead workbench lamp hitting molded polymer edges, while a 1px drop edge (`rgba(0, 0, 0, 0.6)`) grounds bottom surfaces. Recessed bays (such as pet holding slots and battery docks) invert this behavior, using inset top shadows (`inset 0 2px 4px rgba(0, 0, 0, 0.5)`) and dark green-charcoal wells (`#131c17`) to indicate a physically lowered display surface beneath the protective shell. Floating overlays and action trays use an ambient grounding occlusion shadow: `0 12px 24px -4px rgba(7, 12, 10, 0.85)`.

## Shapes

The form language uses controlled roundedness (`0.5rem` / 8px baseline) to mimic injection-molded ABS plastic casing. Micro-elements like cartridge indicator tags, stat pips, and toggles adopt precise 4px corners, whereas large container shields and holding screens utilize 16px corners (`rounded-lg`). Fully circular geometries are reserved exclusively for tactile hardware studs, directional control emulators, and creature egg incubation ports.

## Components

### Buttons & Hardware Triggers
Buttons have a pronounced physical stroke and layered feedback states. 
- **Primary (Acción / Confirmar):** Background `#88d44e`, typography `#131c17`, with a subtle 1px top highlight of `#a3e635` and a 2px bottom bevel of `#4d6856`. Active states translate the button downward by 1px with reduced shadow to emulate a mechanical micro-switch click.
- **Secondary (Ajustes / Archivo):** Background `#23312b`, typography `#dedcd2`, framed with a 1px border of `#4d6856`.
- **Tertiary/Ghost (Cancelar / Expulsar):** Transparent background with `#7e9a86` text, transitioning to `#1b2621` on hover.

### Status Badges & Chips
Micro-capsules displaying species types, natures (*Naturaleza Firme*), and egg groups. Rendered with a solid `#131c17` core, an exterior 1px border matching the type color, and uppercase `label-md` typography. Interactive filter chips show a debossed, depressed effect when toggled on.

### Input Fields & Steppers
Form fields present as sunken LCD readouts. Backgrounds sit at `#131c17` with an inset shadow, framed by a muted border of `#364a3e`. Active focus replaces the border with an electric `#88d44e` hairline stroke and subtle ambient glow (`0 0 0 1px #88d44e`). Step counters for breeding cycles incorporate physical plus/minus tactile keys flanking the readout.

### Creature Dossier Cards
Engineered like physical specimen cases. Top bar displays the local save slot and dex index in `label-sm` monospace. The central viewport houses the creature pixel or vector asset over an illuminated micro-grid matrix pattern (`rgba(126, 154, 134, 0.05)`). The lower bay highlights the dual stats (HP, Cooldown, or Daycare Level) using dual-color progress bars.

### Progress Gauges (Incubadora & Experiencia)
Horizontal segmented fuel meters. The track is etched into `#131c17` with physical divider notches spaced evenly every 10%. Active fill uses high-intensity `#88d44e` for XP, `#eab308` for hatching warmth, and `#f87171` for fatigue indicators.

### Checkboxes & Radios
Rendered as mechanical slide switches or squared physical toggles with center-recessed indicator lights that illuminate with `#88d44e` when active.