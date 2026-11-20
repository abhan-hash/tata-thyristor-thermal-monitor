# DESIGN SPECIFICATION: THERMOSENSE (OUTPUT THERMAL AESTHETIC)

**Document Version:** 1.0.0  
**Target Architecture:** Tata Steel Hot Strip Mill — Stand-04 Main DC Drive Online Thyristor Virtual Sensor  
**Visual Benchmark:** Output Thermal Distortion FX Plugin (Screenshots Reference)  
**Strict Directives:** Warm palette only (black, charcoal, grey, gold, orange, red). Zero purple, blue, teal, or neon. Zero emojis. Zero glassmorphism.

---

## 1. Visual Language of the Reference

### 1.1 Canvas & Background
- **Base Background:** Deep, warm near-black matte tone (`#0C0D10` to `#121316`), absorbing light without feeling cold or synthetic.
- **Topographic Isolines:** Continuous, faint, razor-thin vector contour curves (`stroke: rgba(255, 255, 255, 0.04)` to `rgba(255, 255, 255, 0.06)`, `stroke-width: 0.8px`) wandering across the canvas to mimic elevation cross-sections and acoustic resonance contours.
- **Surface Texture:** Very subtle film/matte noise grain, avoiding glossy reflection.

### 1.2 Layout & Panel Architecture
- **Panel Surfaces:** Solid dark matte plates (`#18191E` to `#1D1E24`). 
- **Corner Radii:** Strict small radii of `6px` to `8px` (no bubbly `rounded-2xl` or pill shapes).
- **Shadows:** Deep, soft, diffused ambient occlusion (`box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85)`).
- **Borders:** Crisp, razor-thin hairlines (`1px solid rgba(255, 255, 255, 0.08)`). No glowing border transitions, no translucent blur overlays, no glassmorphism.
- **Spatial Alignment:** Asymmetrical, showcase-oriented layout with overlapping elements (heat blobs blooming underneath hardware chassis).

### 1.3 Navigation
- **Wordmark Logo:** Tiny, all-lowercase, ultra-clean geometric sans wordmark (`output` in reference, `tatasteel` or `thermosense` for project), sized at 13–14px, weight 800, pure white.
- **Nav Links:** Centered cluster of widely tracked uppercase links (`SHOP`, `BLOG`, `ARTISTS`, `SUPPORT`, `COMPANY`), sized at 10px, `letter-spacing: 0.25em`, colored in quiet medium grey (`#8A8A8A`). No background pills, no active tab borders.
- **Utility Actions:** Quiet shopping cart icon and `LOG IN` text on the far right, matching the 10px tracked typography.

### 1.4 Hero Header Lockup
- **Main Title:** Massive geometric display font (800 weight, 38–44px), uppercase. Text is rendered with a warm horizontal heat gradient transitioning from pale orange (`#FF9A3C`) to pure orange (`#FF5A1F`) to deep red (`#E0201B`).
- **Motion Smear:** Horizontal motion/heat smear trailing off the left side of the title letters, resembling high-speed thermal dissipation.
- **Subtitle:** Crisp, bold medium grey label directly beneath the title (`#7A7A7A`, 12px, weight 700).
- **Separator & Metric:** A thin 1px vertical divider line (`#2A2A2A`), followed by a bold white value display (e.g. `$ 149` in reference, `STAND-04` in telemetry) at 22px weight 700.
- **Action Trigger:** Quiet grey text label (`Watch the Intro Video` / `Live Telemetry Loop`), accompanied by a circular button outlined in thin orange with a solid orange triangle icon.

### 1.5 Hero Artwork & 3D Hardware Object
- **Stacked Heat Blobs:** Multi-tiered organic, wavy vector contour shapes blooming directly from behind the hardware unit:
  - Top tier: Pale warm orange (`#FF9A3C`)
  - Mid tier: Vibrant electric heat orange (`#FF5A1F`)
  - Bottom tier: Deep molten red (`#E0201B`)
- **3D Hardware Unit:** Isometric perspective dark matte carbon/graphite chassis slab:
  - Anodized cylindrical rotary potentiometers with orange pointer ticks.
  - Linear fader slot with orange center trace.
  - Large circular heat-gradient disc: concentric orange→red radiant rings, an irregular organic black blob at the center, and a tiny central orange glowing pupil.
- **Left Editorial Block:** Short, bold headline in yellow-orange (`#FFB020`, 18px, weight 800) over a compact, disciplined 2-column grey paragraph (`#8A8A8A`, 12px).

### 1.6 Second Panel ("Hear it in action")
- **Square Artwork Card:** Black square hardware chassis with corner crop-bracket marks (`stroke: #555555`), tiny rotated 90° vertical technical labels, and the circular heat disc.
- **Selector Header:** Two-line yellow-orange bold heading (`#FFB020`, 22px, weight 800) with quiet grey helper label (`Choose a sound source...` / `Choose a telemetry source...`).
- **2×3 Button Grid:** Square outlined tiles:
  - 1px gold border (`#F2B533`).
  - Minimal gold line-art icon (1.5px stroke, no fills).
  - Tiny tracked uppercase label underneath (9px, `letter-spacing: 0.15em`).
  - Active button: Solid gold fill (`#F2B533`) with dark charcoal icon and dark text.

### 1.7 Preset Rack Rows (Category Deck)
- **Stacked Rows:** Horizontal rack strips with 1px border (`#222222`), dark satin surface with subtle noise.
- **Typography:** Light grey text (`#CCCCCC`), uppercase, wide letter-spacing (`0.25em` to `0.3em`).
- **Right Glyph:** Clean, sharp chevron (`>`).
- **Hover/Active State:** Subtle light lift with a thin highlight line along the left or top edge.

### 1.8 Feature Highlight Panel
- **Card Surface:** Dark gradient container (`#141414` to `#0F0F0F`).
- **Typography:** Yellow-orange headline (`#FFB020`, weight 800), clean grey paragraph (`#8A8A8A`).

---

## 2. Design Tokens Architecture

### 2.1 Layer 1: Primitive Tokens (Raw Values)

```css
/* --- Color Primitives: Warm & Monochromatic Spectrum --- */
--primitive-black-950:       #080809;
--primitive-black-900:       #0C0D10;
--primitive-black-850:       #111215;
--primitive-charcoal-800:    #16171B;
--primitive-charcoal-750:    #1A1B20;
--primitive-charcoal-700:    #222329;
--primitive-charcoal-600:    #2C2D35;

--primitive-grey-500:        #5A5D66;
--primitive-grey-400:        #7A7D87;
--primitive-grey-300:        #9A9DA8;
--primitive-grey-200:        #C4C7D0;
--primitive-grey-100:        #EDEDF0;
--primitive-white:           #FFFFFF;

/* Thermal Warm Accents */
--primitive-gold-300:        #FFD666;
--primitive-gold-400:        #FFC033;
--primitive-gold-500:        #F2B533;  /* Reference Grid Gold */
--primitive-yellow-orange:   #FFB020;  /* Reference Subheads */
--primitive-orange-300:      #FF9A3C;  /* Top Heat Layer */
--primitive-orange-500:      #FF5A1F;  /* Mid Heat Layer */
--primitive-red-600:         #E0201B;  /* Bottom Heat Layer */
--primitive-red-800:         #8F110E;  /* Core Heat Well */

/* --- Typography Primitives --- */
--primitive-font-family-display: 'Syne', 'Montserrat', -apple-system, sans-serif;
--primitive-font-family-sans:    'Plus Jakarta Sans', -apple-system, sans-serif;
--primitive-font-family-mono:    'IBM Plex Mono', monospace;

--primitive-weight-regular:  400;
--primitive-weight-medium:   500;
--primitive-weight-semibold: 600;
--primitive-weight-bold:     700;
--primitive-weight-heavy:    800;

--primitive-size-9:   9px;
--primitive-size-10:  10px;
--primitive-size-11:  11px;
--primitive-size-12:  12px;
--primitive-size-13:  13px;
--primitive-size-14:  14px;
--primitive-size-16:  16px;
--primitive-size-18:  18px;
--primitive-size-22:  22px;
--primitive-size-26:  26px;
--primitive-size-36:  36px;
--primitive-size-44:  44px;

--primitive-tracking-tight:  -0.02em;
--primitive-tracking-normal: 0em;
--primitive-tracking-wide:   0.15em;
--primitive-tracking-wider:  0.25em;
--primitive-tracking-widest: 0.35em;

/* --- Spacing & Geometry Primitives --- */
--primitive-space-2:   2px;
--primitive-space-4:   4px;
--primitive-space-6:   6px;
--primitive-space-8:   8px;
--primitive-space-12:  12px;
--primitive-space-16:  16px;
--primitive-space-20:  20px;
--primitive-space-24:  24px;
--primitive-space-32:  32px;
--primitive-space-48:  48px;

--primitive-radius-xs: 3px;
--primitive-radius-sm: 6px;
--primitive-radius-md: 8px;
--primitive-radius-lg: 10px;
--primitive-radius-full: 9999px;

--primitive-shadow-deep: 0 20px 48px rgba(0, 0, 0, 0.85);
--primitive-shadow-soft: 0 10px 24px rgba(0, 0, 0, 0.65);
```

### 2.2 Layer 2: Semantic Tokens (Purpose Aliases)

```css
/* Background Surfaces */
--color-bg-canvas:           var(--primitive-black-900);
--color-bg-panel:            var(--primitive-charcoal-750);
--color-bg-panel-secondary:  var(--primitive-charcoal-800);
--color-bg-card:             var(--primitive-charcoal-700);
--color-bg-subtle:           var(--primitive-charcoal-600);

/* Structural Borders */
--color-border-subtle:       rgba(255, 255, 255, 0.07);
--color-border-strong:       rgba(255, 255, 255, 0.14);
--color-border-active-gold:  var(--primitive-gold-500);
--color-border-divider:      var(--primitive-charcoal-600);

/* Typography Roles */
--color-text-headline:       var(--primitive-white);
--color-text-body:           var(--primitive-grey-300);
--color-text-label:          var(--primitive-grey-400);
--color-text-muted:          var(--primitive-grey-500);
--color-text-accent-gold:    var(--primitive-yellow-orange);
--color-text-accent-flame:   var(--primitive-orange-500);

/* Thermal Status Tiers (Strictly Warm) */
--color-status-nominal:      var(--primitive-grey-200);
--color-status-elevated:     var(--primitive-gold-400);
--color-status-warning:      var(--primitive-orange-500);
--color-status-critical:     var(--primitive-red-600);

/* Kinetic Values */
--motion-ease-spring:        cubic-bezier(0.16, 1, 0.3, 1);
--motion-duration-fast:      120ms;
--motion-duration-normal:    200ms;
--motion-duration-slow:      400ms;
```

### 2.3 Layer 3: Component Tokens

```css
/* Top Nav Wordmark & Links */
--nav-height:                56px;
--nav-logo-size:             var(--primitive-size-14);
--nav-link-size:             var(--primitive-size-10);
--nav-link-tracking:         var(--primitive-tracking-wider);
--nav-link-color:            var(--primitive-grey-400);

/* Hero Title Lockup */
--hero-title-font:           var(--primitive-font-family-display);
--hero-title-size:           var(--primitive-size-44);
--hero-title-weight:         var(--primitive-weight-heavy);
--hero-title-gradient:       linear-gradient(90deg, var(--primitive-orange-300) 0%, var(--primitive-orange-500) 50%, var(--primitive-red-600) 100%);
--hero-subtitle-color:       var(--primitive-grey-400);
--hero-price-size:           var(--primitive-size-22);
--hero-play-border:          var(--primitive-orange-500);

/* 2x3 Hardware Source Selector Buttons */
--btn-source-width:          100%;
--btn-source-border:         1px solid var(--primitive-gold-500);
--btn-source-radius:         var(--primitive-radius-sm);
--btn-source-bg-default:     transparent;
--btn-source-icon-default:   var(--primitive-gold-500);
--btn-source-label-default:  var(--primitive-gold-500);
--btn-source-bg-active:      var(--primitive-gold-500);
--btn-source-icon-active:    var(--primitive-black-900);
--btn-source-label-active:   var(--primitive-black-900);

/* Preset Rack Rows */
--rack-row-bg:               var(--primitive-charcoal-750);
--rack-row-border:           1px solid var(--primitive-charcoal-700);
--rack-row-radius:           var(--primitive-radius-sm);
--rack-row-title-size:       var(--primitive-size-12);
--rack-row-title-tracking:   var(--primitive-tracking-widest);
--rack-row-title-color:      var(--primitive-grey-200);
--rack-row-chevron-color:    var(--primitive-grey-500);
--rack-row-hover-bg:         var(--primitive-charcoal-700);
--rack-row-hover-border:     var(--primitive-grey-500);
--rack-row-active-highlight: var(--primitive-gold-500);

/* Circular Thermal Dial & Artwork Card */
--dial-bg:                   var(--primitive-black-950);
--dial-border:               1px solid var(--primitive-charcoal-600);
--dial-radius:               var(--primitive-radius-md);
--dial-crop-bracket:         var(--primitive-grey-500);
```

---

## 3. Product & Content Mapping (Tata Steel Thermal Monitor)

| Reference Element (Screenshot) | Reference Text / Function | THERMOSENSE Real Content Mapping | What Gets Removed |
| :--- | :--- | :--- | :--- |
| **Top-Left Logo** | `output` (lowercase, bold) | `tatasteel` or `thermosense` (lowercase, 13px bold, white) | Emojis (`⚡`), gradient brand capsules |
| **Centered Nav Links** | `SHOP  BLOG  ARTISTS  SUPPORT  COMPANY` | `STAND-04  FOSTER-RC  EXCHANGER  FATIGUE  ALARMS  LOGS` (10px, uppercase, 0.25em tracking) | Colored navigation badges, default Streamlit tabs |
| **Top-Right Meta** | Cart icon + `LOG IN` | `OPERATOR` + Mill Bus Status `SYNC: 10Hz` | Blue/green indicator pills |
| **Hero Title** | `THERMAL` (Huge, orange-to-red gradient with motion smear) | `THERMOSENSE` (Huge geometric sans, orange-to-red gradient with horizontal motion smear) | Generic text headers, blue/purple drop shadows |
| **Hero Subtitle** | `Distortion FX Plugin` | `Online Thyristor Virtual Sensor` | "PCB Thermal Matrix", marketing fluff |
| **Hero Divider & Metric** | `\|  $ 149` | `\|  STAND-04` (Bold white display, 22px) | Standard Streamlit metric widgets |
| **Hero Action Pill** | `Watch the Intro Video [ > ]` | `Live Telemetry Loop [ ► ]` (10px grey label with orange circular play button) | Generic buttons ("Launch Drive Detail") |
| **Left Editorial Block** | `Granular Finally Becomes Musical` + copy | `Silicon Junction Transients Finally Become Predictable`<br>Copy: Detailed technical explanation of how 10 Hz Foster RC modeling captures the 2.5s bar bite surge missed by slow RTDs. | Cluttered KPI cards, oversized numbers |
| **Hero Art: Stepped Blobs** | Stacked organic heat map blobs (#FF9A3C to #E0201B) | Exact replica of stacked organic heat blobs radiating behind the hardware controller | Flat container backgrounds |
| **Hero Art: 3D Controller** | Matte black unit with 2 knobs, fader, and heat disc | 3D angled matte black console with knobs (`LOAD CURRENT I_d`, `COOLING RESIDUAL \Delta T`), linear trip fader, and circular heat-gradient disc showing hottest thyristor junction | Generic 2D flat cards, cyan/purple accents |
| **Second Panel: Artwork Card**| Square card with heat disc, crop brackets, vertical text | Square dark card with live 6-thyristor circular heat disc, corner crop-brackets, and vertical rotated labels (`STAND-04`, `6-PULSE`, `TATA STEEL`) | Generic charts placed haphazardly |
| **Second Panel: Header** | `Hear Thermal in action` / `Choose a sound source...` | `Inspect Stand-04 in action`<br>`Choose a telemetry source...` | Blue titles, standard dropdowns |
| **2×3 Grid Buttons** | `DRUMS`, `GUITAR`, `VOCALS`, `SYNTH`, `BASS`, `KEYS` (1px gold border, gold icon, active filled gold) | 6 Core Drive Components (1px gold border `#F2B533`, gold line icon):<br>1. `BRIDGE` (6-pulse thyristor bridge)<br>2. `ARMATURE` (DC mill motor current)<br>3. `FOSTER RC` (thermal model layers)<br>4. `EXCHANGER` (air heat exchanger)<br>5. `BLOWER` (forced cooling fan)<br>6. `RTD SENSORS` (PT100 sensor bus) | Standard Streamlit toggle buttons, cyan outlines |
| **Preset Rack Rows** | `DRUMS >`, `BASS >`, `GUITAR & KEYS >`, `VOCALS >`, `FEEDBACK FX >`, `LOFI >` | The 6 Thyristor Bridge Channels:<br>`T1 · UPPER ARM (PHASE U)    >`<br>`T2 · LOWER ARM (PHASE U)    >`<br>`T3 · UPPER ARM (PHASE V)    >`<br>`T4 · LOWER ARM (PHASE V)    >`<br>`T5 · UPPER ARM (PHASE W)    >`<br>`T6 · LOWER ARM (PHASE W)    >`<br>(Letter-spacing: 0.28em, light grey, chevron, subtle noise) | 3-column feature cards, colorful status badges |
| **Feature Panel Callout** | `Infinite Ideas in Seconds` + copy | `Zero Unplanned Trips in Mill Operations`<br>Copy: Explains how advance residual warning (+4.0K) alerts operators days before thyristor puncture. | Generic advisory boxes, blue note boxes |
| **Sub-Pages Treatment** | N/A | Sub-pages (`Drive Detail`, `Alarms`, `Trends`, `Settings`, `About`) inherit the identical warm-only palette, small radius (6–8px), and gold/orange hierarchy. | All green/cyan/blue accents across all pages |

---

## 4. Anti-Patterns to Eliminate Across Codebase

1. **Eliminate All Non-Warm Colors:**
   - Purge `#20c7b5`, `#4285F4`, `#3b82f6`, `#a855f7`, `#00e5a3`, `#00d2ff`, `#10b981`, `#6ee7b7`, `#00f0a8`.
   - Replace with strict monochromatic scale (`#0C0D10` to `#FFFFFF`) and warm thermal accents (`#F2B533`, `#FFB020`, `#FF5A1F`, `#E0201B`).
2. **Eliminate All Emojis:**
   - Remove every emoji icon from titles, buttons, headers, and navigation: `⚡`, `🏠`, `🚨`, `📊`, `⚙️`, `ℹ️`, `💡`, `⚠️`, `🧑‍💼`, `🔴`, `✓`, `✕`, `⊘`.
3. **Eliminate Glassmorphism:**
   - Remove `backdrop-filter: blur()`, glowing border animations, and translucent white overlays in favor of solid matte charcoal surfaces.
4. **Eliminate Rounded-2xl:**
   - Replace large rounded corners with crisp `6px` to `8px` radii.
5. **Eliminate Generic SaaS 3-Card Trios:**
   - Replace identical "Feature Cards" with asymmetric audio-rack layouts, full-width preset rows, and precision 2x3 hardware grids.
