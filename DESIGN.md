---
name: EcoPulse AI
colors:
  surface: '#0e1322'
  surface-dim: '#0e1322'
  surface-bright: '#343949'
  surface-container-lowest: '#090e1c'
  surface-container-low: '#161b2b'
  surface-container: '#1a1f2f'
  surface-container-high: '#25293a'
  surface-container-highest: '#2f3445'
  on-surface: '#dee1f7'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#dee1f7'
  inverse-on-surface: '#2b3040'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#b3c5ff'
  on-secondary: '#002b75'
  secondary-container: '#0266ff'
  on-secondary-container: '#f9f7ff'
  tertiary: '#e4ffd6'
  on-tertiary: '#053900'
  tertiary-container: '#34fc0d'
  on-tertiary-container: '#106f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#dae1ff'
  secondary-fixed-dim: '#b3c5ff'
  on-secondary-fixed: '#001849'
  on-secondary-fixed-variant: '#003fa4'
  tertiary-fixed: '#79ff5b'
  tertiary-fixed-dim: '#2ae500'
  on-tertiary-fixed: '#022100'
  on-tertiary-fixed-variant: '#095300'
  background: '#0e1322'
  on-background: '#dee1f7'
  surface-variant: '#2f3445'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 32px
  gutter: 24px
  stack-sm: 4px
  stack-md: 16px
  stack-lg: 40px
---

## Brand & Style
The design system embodies a **Sci-fi Professional** aesthetic, positioning the user as the commander of a high-stakes, sustainable AI infrastructure. It merges the clinical precision of a developer tool with the cinematic immersion of a futuristic operating system. 

The visual narrative is built on **Glassmorphism** and **High-Contrast Neon**, emphasizing real-time intelligence and environmental impact. The interface must feel alive, using subtle glows and "active" states to signal that the data center is a breathing, monitored ecosystem. This is a platform for decision-makers who require both deep technical telemetry and a premium, executive-level experience.

## Colors
The palette is rooted in a "Deep Space" foundation to minimize eye strain during long-term monitoring.
- **Base Layers:** The canvas uses `#050505` for deep contrast, while surface containers use `#0A0F1E` to establish structural depth.
- **The Glow (Accents):** Electric Cyan (`#00F2FF`) is the primary interactive color, representing the "pulse" of the AI. Neon Blue (`#0066FF`) is used for secondary data streams and structural accents.
- **Semantic States:** Vivid Green (`#39FF14`) is reserved exclusively for "Optimal Sustainability" and healthy server states. Amber and Red handle warnings and critical failures respectively, popping aggressively against the dark background.

## Typography
The typography system uses a tri-font approach to balance futurism with legibility.
- **Sora** provides a geometric, tech-forward feel for headlines and key metrics.
- **Inter** ensures that dense data tables and descriptions remain highly readable and professional.
- **JetBrains Mono** is utilized for telemetry, timestamps, and technical metadata, reinforcing the "Command Center" atmosphere. All monospace labels should be treated with slight tracking (letter-spacing) to enhance the technical "read-out" aesthetic.

## Layout & Spacing
This design system utilizes a **12-column Fluid Grid** for the main dashboard, allowing data widgets to expand and contract based on priority. 
- **Margins:** High-density data environments require breathing room; a 32px outer margin is standard for desktop.
- **Responsive Behavior:** On mobile, the grid collapses to a single column, with the primary "Sustainability Pulse" (a key metric visualization) pinned to the top. 
- **Z-Axis Spacing:** Spacing isn't just horizontal/vertical; use padding within glassmorphic containers (24px) to ensure content doesn't feel cramped against the "glowing" borders.

## Elevation & Depth
Depth is achieved through **Tonal Layering** and **Glassmorphism** rather than traditional drop shadows.
- **Surface 0:** Deepest black (`#050505`) - The background.
- **Surface 1:** Navy (`#0A0F1E`) - Secondary sections and sidebars.
- **Surface 2 (Glass):** Semi-transparent layers (10-20% opacity) with a 20px backdrop blur. 
- **Glow Borders:** Instead of shadows, use 1px inner borders with a 0.1 to 0.3 opacity of the Primary Cyan. For "Active" or "Critical" states, add an outer box-shadow with a 15px blur using the same color to simulate a neon emission.

## Shapes
The shape language is **Soft** but precise. A `0.25rem` (4px) base radius is used for small elements like tags and checkboxes, while larger cards and dashboard widgets use `0.75rem` (12px). This creates a sophisticated, engineered look that avoids the "playfulness" of high-radius circles, maintaining a serious, professional tone.

## Components
- **Buttons:** Primary buttons use a solid Electric Cyan fill with black text. Secondary buttons use a "Ghost" style with a cyan border and a subtle hover glow.
- **Data Cards:** Glassmorphic containers with a 1px top-edge highlight. Metrics inside should use the `data-mono` type style.
- **Status Chips:** Small, pill-shaped elements. When a state is "Healthy," the chip should have a subtle pulsing glow using the Vivid Green.
- **Input Fields:** Dark, recessed backgrounds with an Electric Cyan bottom-border that illuminates further on focus.
- **Thin-line Icons:** All icons must be 1.5px stroke weight. Active icons should use a "Neon" filter (color-coordinated with the state).
- **Sustainability Gauges:** Circular or linear progress indicators using gradients from Neon Blue to Electric Cyan.