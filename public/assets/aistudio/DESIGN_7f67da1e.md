---
name: International Typographic Rational
colors:
  surface: '#fdf9f0'
  surface-dim: '#dddad1'
  surface-bright: '#fdf9f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ea'
  surface-container: '#f1eee5'
  surface-container-high: '#ece8df'
  surface-container-highest: '#e6e2d9'
  on-surface: '#1c1c16'
  on-surface-variant: '#434845'
  inverse-surface: '#31302b'
  inverse-on-surface: '#f4f0e7'
  outline: '#737875'
  outline-variant: '#c3c8c4'
  surface-tint: '#56615c'
  primary: '#040c08'
  on-primary: '#ffffff'
  primary-container: '#19231f'
  on-primary-container: '#808b85'
  inverse-primary: '#bec9c3'
  secondary: '#ab341f'
  on-secondary: '#ffffff'
  secondary-container: '#fd6f54'
  on-secondary-container: '#6a0b00'
  tertiary: '#030d07'
  on-tertiary: '#ffffff'
  tertiary-container: '#17241d'
  on-tertiary-container: '#7e8c83'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae5df'
  primary-fixed-dim: '#bec9c3'
  on-primary-fixed: '#141e1a'
  on-primary-fixed-variant: '#3f4944'
  secondary-fixed: '#ffdad3'
  secondary-fixed-dim: '#ffb4a5'
  on-secondary-fixed: '#3f0400'
  on-secondary-fixed-variant: '#8a1c09'
  tertiary-fixed: '#d7e6db'
  tertiary-fixed-dim: '#bbcac0'
  on-tertiary-fixed: '#121e18'
  on-tertiary-fixed-variant: '#3c4a42'
  background: '#fdf9f0'
  on-background: '#1c1c16'
  surface-variant: '#e6e2d9'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 76px
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-md:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-md-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.08em
  index-marker:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 2rem
  margin-mobile: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is anchored in the precision, restraint, and calculated geometry of mid-century Swiss International Style and archival technical editorial prints. It rejects ornamental excess in favor of structural clarity, typographic hierarchy, and mathematical balance. 

The aesthetic is objective, scholarly, and uncompromisingly functional. Layouts behave like structural architectural plates or avant-garde design journals—every module is anchored to explicit grid axes. Space is not passive background; it is functional syntax, guiding reading tempo and relational hierarchy.

Key style pillars:
- **Structural Rationalism:** Visible grid infrastructure, explicit coordinate lines, and strict baseline discipline.
- **Asymmetric Tension:** Dynamic tension between massive, confident display typography and micro-scaled technical metadata.
- **Monochromatic Discipline with Chromatic Signaling:** Surfaces are defined by organic paper stock and deep carbon ink, reserving intense Vermilion strictly for targeted points of cognitive friction or focus.
- **Epistemic Honesty:** UI components acknowledge their structural origins through raw 1px delineation, numerical indices (e.g., `[01]`, `§4.2`), and mathematical notations.

## Colors

The palette operates on the physical metaphor of archival warm rag paper and dense printer’s carbon ink, punctuated by vermilion proofreader markings.

### Palette Architecture
- **Paper (`#F5F1E8`):** The primary canvas substrate. Never clinical white; carries the tactile warmth of uncoated lithographic paper stock.
- **Ink (`#19231F`):** Deep carbon black with a micro-green undertone. Used for maximum-contrast typographic statements, primary content, and high-impact structural panels.
- **Vermilion (`#B83D27`):** Chromatic alert signal. Used strictly for focus states, high-priority status indicators, section callouts, and critical interactions. It must never coat expansive surfaces.
- **Grid Rule (`#D7D0C2`):** Low-contrast structural grey-beige. Used exclusively for 1px hairline boundaries, column borders, coordinate dividers, and axis markers.
- **Muted (`#68766D`):** Mid-tone editorial grey. Applied to column coordinates, running headers, captions, table metadata, and index markers.

### Application Rules
- Disallow smooth multi-hue linear gradients. Surfaces remain flat and unadorned.
- Color cannot be used decoratively. If Vermilion is introduced on a page, it must denote a direct hierarchy shift, active link, or functional alert.
- Hover states favor binary inversion (Paper to Ink) or hairline highlight rather than soft color shifts.

## Typography

The typographic hierarchy orchestrates a high-tension balance between the geometric brutalism of **Space Grotesk**, the pure objective clarity of **Inter**, and the systematic precision of **JetBrains Mono**.

### Typographic Discipline
- **Display & Headings:** Always set flush-left, tight leading, and negative tracking. Headings avoid sentence terminal punctuation but can integrate mathematical delimiters (`//`, `—`, `::`).
- **Body:** Scaled for optimal line lengths between 45–70 characters. Strict vertical rhythm; paragraph margins align strictly with line-height multiples.
- **Monospace Metadata & Accents:** All tabular data, timestamps, coordinates, tags, indices, and UI control labels must use the monospace scale. Text is typically uppercase or lowercase-delimited with bracket enclosures (`[01]`, `SYS_OK`, `FIG. 12`).
- **Mathematical Operators:** Glyphs such as `∑`, `∫`, `∆`, `∏`, `√`, `∡`, and `⊞` serve as structured visual dividers, bullet primitives, or section headers. They are never arbitrary decorations; they denote data aggregation, state derivation, or geometric zones.

## Layout & Spacing

The layout is governed by a strict, visible 12-column Swiss modular system with hairline column rules (`1px solid #D7D0C2`).

### Grid Mechanics
- **Desktop (≥ 1280px):** 12-column asymmetric system. Outer margins set to `margin-desktop`. Gutters define the interstitial space, bounded optionally by vertical hairlines. Typical layouts balance a 3-column metadata/index sidebar with an 8-column primary content field and 1-column margin rule.
- **Tablet (768px – 1279px):** 6-column reflow. Secondary metadata docks horizontally above modules separated by 1px rules.
- **Mobile (< 768px):** 2 or 4-column single-stack flow. Gutters reduce to `gutter-sm`, outer margin to `margin-mobile`. Modular panels compress vertically, keeping all internal borders explicit.

### Spacing Syntax
- Layout distance conforms strictly to the modular 8px scale represented by `space-*` tokens.
- Modules nest inside hairline boxes. Element separation within cards or containers relies primarily on padding (`space-md`, `space-lg`) paired with interior horizontal rules rather than floating empty whitespace.
- Asymmetry is mandated: primary content must not be artificially centered. Major sections anchor to the left grid line, permitting the rightmost columns to act as technical gutters or annotation tracks.

## Elevation & Depth

This design system completely eliminates drop shadows, blurs, and pseudo-3D skeuomorphism. It operates in pure structural planarity.

### Principles of Depth
- **Zero Elevation / Flat Planarity:** `box-shadow` values are universally `none`. Elevation is communicated strictly through surface fill alteration and edge demarcation.
- **Hairline Demarcation:** All containers, dialogs, drawers, and segmented units are established via `1px solid #D7D0C2`.
- **Tonal Inversion:** Higher-priority surfaces (e.g., active focus bars, floating toast banners, primary controls) achieve distinction via absolute contrast: `#19231F` background with `#F5F1E8` typography.
- **Segmented Canvas Tiers:** Secondary contextual sidebars or utility drawers use micro-tinted backgrounds (`#EDE8DE`) separated by unbroken 1px borders to establish plane separation.

## Shapes

The shape system is strictly non-rounded (`roundedness: 0`). 

Every element—including buttons, input fields, badges, modals, tooltips, and segment blocks—features clean, razor-sharp 90-degree corners (`border-radius: 0px`).

### Shape Directives
- **Zero Radius:** No rounded buttons, pills, or circular chips. Every container is a true rectangle.
- **Linear Dividers:** Dividers are exact 1px vector lines with no feathering or anti-aliased fading.
- **Notched or Crosshair Accents:** Key structural containers may feature small 4px exterior corner tick marks (`+`, `L`-brackets) rendered in `#19231F` or `#D7D0C2` to heighten technical diagrammatic authority.

## Components

### Buttons & Interactive Triggers
- **Primary:** Background `#19231F`, text `#F5F1E8`, `border: 1px solid #19231F`, 0px border radius. Padding: `0.75rem 1.5rem`. Typography: `label-md`. Hover: Background `#B83D27`, border-color `#B83D27`.
- **Secondary / Outline:** Background transparent, text `#19231F`, `border: 1px solid #19231F`. Hover: Background `#19231F`, text `#F5F1E8`.
- **Minimal / Ghost:** No border, monospace uppercase text with a prefixed arrow or bracket (`[→ VIEW SPEC]`). Hover: text `#B83D27`.
- **Active / Pressed:** Downward shift of 1px or inversion of border state.

### Input Fields & Controls
- **Inputs:** Background `#F5F1E8`, border `1px solid #D7D0C2`, text `#19231F`, placeholder `#68766D`. Typography: `body-md`. Focus: Border `1px solid #19231F` with an immediate monospace field counter or indicator changing to `#B83D27`.
- **Checkboxes & Radios:** Unchecked: 14x14px square, `border: 1px solid #19231F`, transparent background. Checked Checkbox: Solid `#19231F` fill with an interior `#F5F1E8` square or cross mark (`✕`). Checked Radio: Solid `#19231F` outer square with a centered 6x6px `#19231F` fill block (maintaining pure rectilinear geometry).

### Chips, Tags & Badges
- **Index Badges:** Formatted as monospace indices (`01`, `INDEX // A`, `STATUS::ACTIVE`). Border `1px solid #D7D0C2`, background transparent, padding `0.2rem 0.5rem`.
- **Alert Chips:** Border `1px solid #B83D27`, text `#B83D27`, optional leading square block `■`.

### Cards & Panels
- Constructed using continuous `1px solid #D7D0C2` outlines with flush exterior borders (nested cards share borders using negative margins to avoid double-thickness lines).
- Card headers always feature an index annotation (e.g., `[ 04 / MODULE ]`) set in `label-sm` across from the container title, demarcated from the card body with a horizontal 1px rule.

### Data Tables & Lists
- Table headers: Uppercase `label-sm` in `#68766D`, bordered at the bottom by `1px solid #19231F`.
- Table rows: Alternating or uniform transparent rows separated by `1px solid #D7D0C2`. Hover row: Background `#EDE8DE`.
- Numbers within tables align strictly to the right using `JetBrains Mono` tabular figures.

### Technical Indices & Crosshairs (Specialized)
- Visual break modules include structural coordinate stamps (e.g., `REF. 47°22'N // 08°32'E`) and crosshair icons (`+`) placed directly at grid intersections.