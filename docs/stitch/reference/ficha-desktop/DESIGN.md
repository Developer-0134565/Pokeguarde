---
name: Pocket Tech 1999
colors:
  surface: '#fef8f7'
  surface-dim: '#ded9d8'
  surface-bright: '#fef8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f2f2'
  surface-container: '#f3ecec'
  surface-container-high: '#ede7e6'
  surface-container-highest: '#e7e1e1'
  on-surface: '#1d1b1b'
  on-surface-variant: '#5b403e'
  inverse-surface: '#323030'
  inverse-on-surface: '#f6efef'
  outline: '#8f706d'
  outline-variant: '#e3beba'
  surface-tint: '#b91d23'
  primary: '#b51a21'
  on-primary: '#ffffff'
  primary-container: '#d93636'
  on-primary-container: '#fffcff'
  inverse-primary: '#ffb3ad'
  secondary: '#0055c7'
  on-secondary: '#ffffff'
  secondary-container: '#146df4'
  on-secondary-container: '#fefcff'
  tertiary: '#765700'
  on-tertiary: '#ffffff'
  tertiary-container: '#956e00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb3ad'
  on-primary-fixed: '#410003'
  on-primary-fixed-variant: '#930011'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b0c6ff'
  on-secondary-fixed: '#001945'
  on-secondary-fixed-variant: '#00419c'
  tertiary-fixed: '#ffdfa0'
  tertiary-fixed-dim: '#f8bd2a'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#fef8f7'
  on-background: '#1d1b1b'
  surface-variant: '#e7e1e1'
typography:
  headline-xl:
    fontFamily: Space Mono
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Mono
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0em
  headline-md:
    fontFamily: Space Mono
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.08em
  label-md:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.1em
  label-sm:
    fontFamily: Space Mono
    fontSize: 9px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.12em
spacing:
  gutter: 1rem
  gutter-sm: 0.5rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
This design system captures the tactile industrial charm and screen-glow nostalgia of late-90s handheld gaming hardware, specifically referencing the Generation II / Crystal era Pokédex and Game Boy Color aesthetics. It marries physical chassis details—molded primary-red shell plastics, matte rubber tactile actuators, mechanical rocker switches, recessed speaker perforation grids—with crisp, authentic 8-bit/16-bit segmented user interface windows.

The design movement is **Tactile Retro-Digital**:
- **Physical Chassis Meta:** High-contrast casing panels, molded bezels, dropped countersunk viewports, and deep-cast chamfered structural rims.
- **In-Game Window Paradigm:** Double-lined high-contrast dialogue panes, corner bracket filigree, tiled pixel-aligned panels, high-density data matrices, and animated indicator glyphs (e.g., `▶` indicators, blinking battery markers).
- **Emotional Impact:** Utilitarian, adventure-ready, durable, immersive, and tactilely responsive.

## Colors
The palette balances the high-impact molded resin of hardware housing with authentic retro dot-matrix LCD backplates.

- **Primary (`#D93636`) & Crimson Shadow (`#B82525` / `#541111`):** Form the layered physical device shell, main app headers, and critical framing tiers. The deep burgundy tone handles etched seams, bottom-edge bezel bevels, and recessed groove tracks.
- **Secondary Classic Cyan/Blue (`#2575FC` / `#4FC3F7`):** Represents secondary interactors, active system statuses, Water/Ice/Data classification tags, and backlit elemental toggles.
- **Tertiary Electric Golden Yellow (`#FBC02D`):** Applied exclusively to Level/EXP gauges, critical notification badges, selected item stars, and battery/charge indicators.
- **Chassis Screen Tint & Warm Neutrals (`#FFF9F0` / `#D8D2C2`):** Act as the matte screen housing frame and primary interior dialogue window fill, providing higher contrast than raw green dot-matrix while preserving classic GBC clarity.
- **Retro LCD Backlit Tints (`#E0E8D0` / `#9BBC0F`):** Used inside dedicated data matrices, retro stat boxes, and active digital screen canvases.
- **Pure Black/Deep Charcoal (`#1C1A1A`):** Pixel-perfect typography, hard 2px/3px structural borders, and speaker vent perforations.

## Typography
Typography is structured around monospaced data delivery combined with high-legibility geometric sans-serif for comfortable long-form readout:

- **Space Mono (Display & System Labels):** Renders all headings, index numbers (`No. 249`), stat readout blocks, dialogue-prompt banners, and hardware tags. Always rendered in uppercase for micro-labels to emulate fixed-width cartridge ROM text strings.
- **Space Grotesk (Body & Lore Copy):** Balances nostalgic character geometry with effortless readability for multi-line Pokédex bio descriptions, system logs, and inventory guides.
- **Glyph Conventions:** Terminal arrow prompts (`▶`), solid triangular bullets, and numeric padding (`001`, `002`) are system requirements across list items and navigational cues.

## Layout & Spacing
The layout simulates a dedicated dual-stage handheld console:
- **Outer Canvas:** Acts as the outer casing envelope (`#D93636`) with recessed borders, hardware status indicators, and bezel framing.
- **Inner Viewport:** Follows a strict 12-column grid on desktop/tablet, collapsing to a single-column framed screen on mobile.
- **Rhythm & Increments:** Built on a rigorous 4px / 8px baseline rhythm. Padding and margins enforce sharp, uniform spatial divisions without soft transitions.
- **Breakpoints:**
  - `Mobile (< 640px)`: Single handheld vertical viewport. Margin is fixed to 16px (`1rem`) to keep the shell bezel tight around the screen.
  - `Tablet (641px - 1024px)`: Fold-out Pokédex interface split horizontally: viewport display on top, data tray below.
  - `Desktop (> 1024px)`: Side-by-side dual-screen hardware casing: left chassis panel displays visual entity feed; right chassis holds index matrices, item pouches, and numeric specs.

## Elevation & Depth
Elevation is achieved through hard-edged industrial extrusion and pixel-step borders rather than soft blur shadows:

1. **Bevel Extrusion (Chassis & Outer Rim):** Solid drop offset of `4px 4px 0px 0px #541111` paired with a top-left highlight border of `2px solid #FFF9F0` to produce the stamped plastic feel.
2. **Inner Sunken Screens (Viewports):** Reverse bevel with an inset box shadow `inset 3px 3px 0px #1C1A1A` and `inset -3px -3px 0px #FFF9F0`, dropping the LCD screen below the casing plate.
3. **Dialogue Panes & Modals:** Crisp double line framing using `3px solid #1C1A1A`, an inner gap of `2px solid #FFF9F0`, and an interior frame of `1px solid #1C1A1A` with authentic 90-degree corner notches.
4. **Tactile Actuators (Buttons & D-Pads):** Dual-layer hard shadows: idle state has a `0px 4px 0px #1C1A1A` lip; active state translates `translateY(4px)` with shadow depth dropping to `0px 0px 0px`.

## Shapes
Sharp, angular precision dominates this system (`roundedness: 0`). 
- **Corners:** Corners avoid fluid radial rounding in favor of crisp 90-degree squared corners or 45-degree chamfered facet notches on select tabs and hardware casings.
- **Speaker Perforations:** Arrays of uniform 4px circular or square punch-outs configured in 3x3 or 4x4 coordinate matrices.
- **Tactile Actuator Silhouettes:** Circular A/B buttons retain pure geometric roundness (`border-radius: 9999px`), while directional pads, cartridge eject notches, and display frames are strictly orthogonal and hard-edged.

## Components

### Buttons & Actuators
- **Primary Hardware Buttons (A/B Actions):** Chunky rubber pills or disks tinted in `#1C1A1A` or `#2575FC`. Outer border: `2px solid #1C1A1A`. Offset underside extrusion: `3px solid #541111`. Text is bold, uppercase Space Mono. Hover triggers border color shifts; active state eliminates the offset extrusion with a 2px downward displacement.
- **Directional Pad (D-Pad Navigation):** Matte charcoal cross with indented directional arrows (`▲`, `▼`, `◀`, `▶`) and a central circular pivot depression.
- **Select / Start Switches:** Narrow oval rubber strips angled at 45 degrees, colored `#541111` or `#1C1A1A`.

### Window Frames & Dialogue Boxes
- **GBC RPG Dialogue Frame:** Background fill of `#FFF9F0` enveloped by a multi-tier border: 2px exterior solid `#1C1A1A`, 2px spacer gutter, and 1px inner solid `#1C1A1A`. 
- **Corner Notches:** Decorated with inverted 4px square pixel brackets at all four extremities.
- **Scroll Indicator:** Flashing prompt `▼` anchored at bottom-right during active text reveal.

### Data Chips & Badges
- **Elemental & Type Chips:** Flat rectangular tags with 1px black outline. High-saturation background fills (Water: `#2575FC`, Electric: `#FBC02D`, Fire: `#D93636`). Text is Space Mono `label-sm` in pure white or pure black for extreme contrast.
- **Hardware Status Tags:** Pill-shaped capsules with miniature LED dots that switch between unlit `#541111` and illuminated neon green `#76FF03` or warning red `#FF1744`.

### Lists & Pokédex Indices
- **Index Rows:** Alternating data strips bordered by dashed 1px lines. Unselected entries display a blank spacer; the selected item is marked by an active cursor icon (`▶`) and a reverse color inversion block (`#1C1A1A` background with `#FFF9F0` text).
- **Stat Gauges (HP / EXP Bars):** Tiered segmented bars with a recessed border. Green for high reserves (`#00E676`), yellow for caution (`#FBC02D`), red for critical alert (`#D93636`).

### Input Fields & Controls
- **Data Terminal Inputs:** Framed within sunken LCD panels (`#E0E8D0`), text entered in dark charcoal monospaced font with a solid flashing rectangular block caret (`█`).
- **Checkboxes & Radios:** Pixel-style square toggles with a distinct `✖` or solid square `■` fill when enabled; circular physical depression toggles for radio settings.

### Speaker Grilles & Chassis Accents
- **Acoustic Grille:** Matrix of 12 to 16 recessed punch holes (`#541111`) situated at the bottom chassis corner.
- **Optical Sensor Glass:** Circular glossy lens accent at top-left with dual-stage cyan/white specular light glint.