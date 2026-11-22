# Output Thermal Aesthetic Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct the THERMOSENSE website into a bespoke, high-precision industrial hardware monitoring experience modeled directly on the Output Thermal interface in `screenshot/Screenshot from 2026-11-20 20-43-12.png`.

**Architecture:** A Streamlit front-end styled via a dedicated warm CSS token architecture, SVG topographic contour layers, and modular custom HTML/SVG components that interface seamlessly with the existing real-time simulation and Foster RC telemetry backend (`data_source.py`, `simulator.py`, `thresholds.yaml`).

**Tech Stack:** 
- Python 3.10+ / Streamlit 1.30+
- Plotly 5.18+ (custom warm theme)
- NumPy, Pandas, PyYAML
- Lucide Vector Line Icons (SVG)
- Google Fonts (`Montserrat`, `Plus Jakarta Sans`, `IBM Plex Mono`)

**Spec:** [DESIGN_SPEC.md](file:///home/abhan/falakrepo/tata-thyristor-thermal-monitor/DESIGN_SPEC.md)

---

## Library Selection & Justification (emilkowalski:pick-ui-library)

In accordance with `emilkowalski:pick-ui-library` and project guidelines, libraries are chosen strictly when necessary and justified by the requirements, prioritizing what the repository already uses:

| Task / Domain | Selected Tool / Library | Justification |
| :--- | :--- | :--- |
| **Component Layout & Routing** | `Streamlit` (Built-in) | Already the core web runtime. All layout enhancements will be driven via structured CSS and semantic markdown containers without adding foreign runtime dependencies. |
| **Data Visualization & Charts** | `Plotly` (Built-in) | Already installed and heavily utilized. Plotly allows complete styling customization (`paper_bgcolor`, `plot_bgcolor`, grid color, warm line traces, threshold lines) matching our warm design tokens. |
| **Vector Icons** | `Lucide Icons` (Inline SVG) | Replaces all emojis with stroke-based line icons (stroke: 1.5–1.75px, fill: none). Inlined directly as clean, lightweight SVGs to avoid node/npm build complexity in Python. |
| **Real-time Loop** | `streamlit-autorefresh` (Built-in) | Provides stable 1–2 second client-side polling interval for mill telemetry. |
| **Typography** | Google Fonts (`Montserrat`, `Plus Jakarta Sans`, `IBM Plex Mono`) | Loaded via CSS `@import`. `Montserrat` provides the bold geometric title cuts matching the Output reference; `Plus Jakarta Sans` delivers open counters and maximum legibility for dense technical copy; `IBM Plex Mono` guarantees tabular number alignment. |
| **Spring & Micro-Interactions** | Pure CSS Transitions & `@keyframes` | Fast, hardware-accelerated GPU transforms (`transform`, `opacity`) using Emil Kowalski cubic bezier curve (`cubic-bezier(0.16, 1, 0.3, 1)`). Bypasses heavy JS animation libraries for maximum performance in Streamlit. |

---

## Global Constraints

1. **Color Rule:** Strictly warm palette only (black, charcoal, grey, gold, orange, red). Neutral/warm primitives only ($R \ge B$). Zero blue, purple, teal, cyan, or neon tints anywhere.
2. **Typography Rule:** `Montserrat` (700/800) for display headers, `Plus Jakarta Sans` (400/500/600) for body/labels, `IBM Plex Mono` (500/600/700) for tabular telemetry readouts.
3. **No-Emoji Rule:** Zero emojis in code, titles, filenames, or labels. All icons must be clean Lucide SVGs.
4. **No-Glassmorphism Rule:** No `backdrop-filter: blur()`, no translucent white overlays, no glowing borders. Solid dark matte charcoal plates with deep diffused ambient shadows only.
5. **Radius Rule:** Strict small corner radii of `6px` to `8px`. Bubbly `rounded-2xl` is strictly prohibited.
6. **Backend Sanctity:** Zero modifications to backend simulation math, formulas, `model.py`, `stage*.py`, or calculation schemas.
7. **Accessibility Rule:** All foreground text on background must exceed WCAG AA (4.5:1 ratio). `--primitive-grey-500` is reserved for non-text decorative borders only.

---

## Review Focus

1. **Focus Trap & Keyboard Usability:** Tab navigation must show a 2px solid `#F2B533` outline with 2px offset on all interactive buttons, rack rows, and links without shifting layout.
2. **Tabular Jitter on 10 Hz Telemetry:** Live temperature readouts in the 3D console and channel rack rows must not jump horizontally when numbers fluctuate (enforced via `IBM Plex Mono` and fixed minimum width).
3. **Mobile Layout Clipping:** The 3D perspective transform on the hardware unit must gracefully flatten to 2D on screens $< 768\text{px}$ to prevent horizontal scrollbars and container clipping.
4. **Contrast Under Low Brightness:** Grey subtitles (`#88847E`) and body text (`#9A9894`) must remain clearly legible on `#0E0D0C` and `#1A1918` without appearing washed out.
5. **Autorefresh Stability:** Streamlit autorefresh (2s key `overview_refresh`) must update data seamlessly without resetting channel selector state (`st.session_state['selected_thyristor']`).

---

## Ordered Implementation Tasks

### Task 1: Tokens & Global CSS Architecture

**Files:**
- Modify: `thermosense_dashboard/assets/styles.css`
- Reference: `DESIGN_SPEC.md#L68-L236`

**What Done Looks Like:**
All CSS variables in `styles.css` strictly reflect the three-layer warm token system:
- Canvas: `--color-bg-canvas: #0E0D0C`
- Panels: `--color-bg-panel: #1A1918`, `--color-bg-card: #201F1D`
- Accents: `--color-border-active-gold: #F2B533`, `--primitive-orange-500: #FF5A1F`, `--primitive-red-600: #E0201B`
- All blue, purple, and teal color tokens purged.
- Streamlit chrome reset applied (`#MainMenu`, `footer`, `header`, `.block-container` top padding reduced to `1rem`).

**Visual Verification:**
Open `http://localhost:8501`. Inspect element in browser DevTools: body background color is `#0E0D0C`, no default Streamlit top margin, zero blue/purple styles in computed CSS variables.

- [ ] Step 1: Replace all existing root color variables in `thermosense_dashboard/assets/styles.css` with the verified warm primitives ($R \ge B$) from `DESIGN_SPEC.md`.
- [ ] Step 2: Implement the Streamlit chrome reset rules (`#MainMenu`, `footer`, `header`, `[data-testid="stToolbar"]`, `.block-container`).
- [ ] Step 3: Implement base panel and card utility classes (`.output-panel`, `.output-card`, `.hardware-chassis-slab`) with `6px` to `8px` border radius and deep diffused shadow.
- [ ] Step 4: Verify in browser that the page background is deep warm black (`#0E0D0C`) with no console syntax warnings.

---

### Task 2: Typography & Google Fonts Loading

**Files:**
- Modify: `thermosense_dashboard/assets/styles.css`
- Reference: `DESIGN_SPEC.md#L100-L130`

**What Done Looks Like:**
- Google Font `@import` loads `Montserrat:wght@700;800`, `Plus Jakarta Sans:wght@400;500;600`, and `IBM Plex Mono:wght@500;600;700`.
- Display headers use `Montserrat`, body and micro-labels use `Plus Jakarta Sans`, all numerical telemetry values use `IBM Plex Mono`.
- Line lengths for body text capped at $\le 75$ characters.

**Visual Verification:**
Inspect typography in DevTools: headers show `font-family: Montserrat`, telemetry displays show `font-family: 'IBM Plex Mono'`, body paragraphs show `font-family: 'Plus Jakarta Sans'`.

- [ ] Step 1: Add Google Fonts `@import` link for `Montserrat`, `Plus Jakarta Sans`, and `IBM Plex Mono` to the top of `styles.css`.
- [ ] Step 2: Set `--font-display: 'Montserrat', sans-serif`, `--font-body: 'Plus Jakarta Sans', sans-serif`, and `--font-mono: 'IBM Plex Mono', monospace`.
- [ ] Step 3: Apply `--font-display` to `.output-main-title`, `.editorial-headline`, and section headers.
- [ ] Step 4: Apply `--font-mono` to all numeric temperature readouts and stand status timecodes.
- [ ] Step 5: Verify font rendering and weight fidelity across modern desktop browsers.

---

### Task 3: Background Contour & Topographic Vector Layer

**Files:**
- Modify: `thermosense_dashboard/assets/styles.css`
- Reference: `DESIGN_SPEC.md#L12-L16`

**What Done Looks Like:**
- The whole page canvas features faint, razor-thin vector contour curves (`stroke: rgba(255, 255, 255, 0.045)`, `stroke-width: 0.8px`) rendered via a seamless SVG data URI pattern.
- The isolines replicate physical elevation and acoustic resonance contours without causing layout shifts or scrollbar issues.

**Visual Verification:**
Background exhibits a faint topographic elevation map contour pattern visible on high-contrast monitors, completely static under scroll.

- [ ] Step 1: Craft an optimized, seamless vector SVG contour line pattern with organic wavy elevation curves in warm charcoal/white hairlines.
- [ ] Step 2: Inject the pattern as a fixed `background-image` in `.stApp` alongside subtle radial warm lighting.
- [ ] Step 3: Test and verify that background stays fixed during page scrolling and does not degrade frame rates.

---

### Task 4: Minimalist Wordmark & Navigation Header

**Files:**
- Create: `thermosense_dashboard/components/output_nav.py`
- Modify: `thermosense_dashboard/app.py`
- Reference: `DESIGN_SPEC.md#L24-L28`, `DESIGN_SPEC.md#L240-L245`

**What Done Looks Like:**
- Top navigation bar matching the reference:
  - Left: Tiny lowercase wordmark `tatasteel` (13px, weight 800, `#FFFFFF`).
  - Center: 6 uppercase widely tracked links matching repo pages (`OVERVIEW`, `DRIVE DETAIL`, `ALARMS & HISTORY`, `TRENDS & WEAR`, `SETTINGS`, `ABOUT`) at 10px, `letter-spacing: 0.25em`, `#88847E`.
  - Right: Stand status `10Hz SYNC` and `OPERATOR` logout trigger.
- Zero emojis, zero colored active pill backgrounds.

**Visual Verification:**
Top header bar renders cleanly at 56px height, links are small, quiet, and spaced across the center, wordmark sits at the top-left in bold lowercase white.

- [ ] Step 1: Build `render_output_nav(current_page)` in `components/output_nav.py`.
- [ ] Step 2: Implement CSS rules for `.output-nav-bar`, `.output-logo-wordmark`, and `.output-nav-link`.
- [ ] Step 3: Wire navigation links to trigger page switching or anchor highlights.
- [ ] Step 4: Embed `render_output_nav` at the top of `app.py`.
- [ ] Step 5: Check visual alignment and spacing against the reference screenshot.

---

### Task 5: Hero Title Lockup & Heat Smear Header

**Files:**
- Create: `thermosense_dashboard/components/output_hero.py`
- Modify: `thermosense_dashboard/app.py`
- Reference: `DESIGN_SPEC.md#L29-L35`

**What Done Looks Like:**
- Massive title `THERMOSENSE` in `Montserrat` 800 weight with horizontal gradient (`#FF9A3C` $\to$ `#FF5A1F` $\to$ `#E0201B`).
- A subtle horizontal heat/motion smear trailing off the left side of the title.
- Directly beneath: Bold grey subtitle `Online Thyristor Virtual Sensor` (`#88847E`, 12px, weight 700).
- Thin 1px vertical divider (`#33312E`), bold white metric (`STAND-04`, 22px), grey label (`Live Telemetry Loop`), and circular orange-outlined play button with solid orange triangle.

**Visual Verification:**
The hero lockup renders with high visual weight, the heat gradient matches the reference title, and the divider and metric align horizontally.

- [ ] Step 1: Create `.output-hero-title-lockup` HTML/CSS component in `components/output_hero.py`.
- [ ] Step 2: Implement the orange-to-red text gradient with `-webkit-background-clip: text` and left-side heat smear pseudo-element (`::before`).
- [ ] Step 3: Add the vertical divider (`#33312E`), `STAND-04` bold display, and circular orange play trigger.
- [ ] Step 4: Verify visual accuracy against the `THERMAL | $ 149` title block in the reference screenshot.

---

### Task 6: Hero Stepped Heat Blob Art & 3D Hardware Controller

**Files:**
- Modify: `thermosense_dashboard/components/output_hardware.py`
- Reference: `DESIGN_SPEC.md#L36-L46`

**What Done Looks Like:**
- Multi-tiered organic wavy heat blobs blooming behind the hardware unit:
  - Top tier: Pale warm orange (`#FF9A3C`)
  - Mid tier: Vibrant heat orange (`#FF5A1F`)
  - Bottom tier: Deep molten red (`#E0201B`)
- 3D angled matte black hardware console:
  - CSS 3D perspective chassis slab (`rotateX(12deg) rotateY(-8deg) rotateZ(1.5deg)`).
  - Two rotary potentiometers (`ARMATURE LOAD I_d`, `COOLING RESIDUAL \Delta T`) with orange indicator needles.
  - Linear fader slider with orange center slot.
  - Large circular heat disc: concentric orange→red radiant rings, irregular black center blob, and glowing orange central pupil displaying live peak $T_j$.
- Left editorial block: Headline `Silicon Junction Transients Finally Become Predictable` (`#FFB020`, 18px, weight 800) over technical paragraph (`#9A9894`, 12px).

**Visual Verification:**
Left hero displays the vibrant tiered heat blob aura radiating outward, with the angled 3D hardware slab resting on top, showing live peak junction temperature in the central disc.

- [ ] Step 1: Update SVG stepped heat blob vectors in `components/output_hardware.py` to match the exact wavy organic tiers in the screenshot.
- [ ] Step 2: Refine the 3D isometric perspective chassis styling in `styles.css` with small `8px` corner radius and soft ambient occlusion.
- [ ] Step 3: Implement tactile rotary knobs and linear slider with orange indicator marks.
- [ ] Step 4: Wire live peak junction temperature ($T_j$) from `data_source.py` into the center core of the circular heat disc.
- [ ] Step 5: Add the left editorial headline and verified technical copy.

---

### Task 7: "Inspect Stand-04 in Action" Second Panel & Artwork Card

**Files:**
- Modify: `thermosense_dashboard/components/output_hardware.py`
- Reference: `DESIGN_SPEC.md#L47-L50`

**What Done Looks Like:**
- A dark matte panel (`#1A1918`, 8px radius) positioned in the right column.
- Left side of panel: Square artwork card displaying the circular thermal heat disc with corner crop-bracket marks (`#5A5D66`), tiny rotated 90° vertical technical labels (`STAND-04`, `6-PULSE`, `TATA STEEL`).
- Right side of panel: Two-line yellow-orange bold heading `Inspect Stand-04 in action` (`#FFB020`, 22px, weight 800) with small label `Choose a telemetry source...` (`#88847E`, 11px).

**Visual Verification:**
Right column opens with the square framed artwork card and yellow-orange headline, matching the "Hear Thermal in action" panel from the reference.

- [ ] Step 1: Build the square artwork card container with corner crop brackets and rotated vertical text in `components/output_hardware.py`.
- [ ] Step 2: Render the circular thermal heat disc inside the square card.
- [ ] Step 3: Implement the two-line headline `Inspect Stand-04 in action` in `Montserrat` 800 with yellow-orange color (`#FFB020`).
- [ ] Step 4: Verify alignment and proportions relative to the left hero.

---

### Task 8: 2×3 Hardware Telemetry Source Button Grid

**Files:**
- Modify: `thermosense_dashboard/components/output_hardware.py`
- Reference: `DESIGN_SPEC.md#L50-L55`

**What Done Looks Like:**
- 2×3 grid of square outlined buttons:
  - 1px gold border (`#F2B533`).
  - Minimal gold line-art icon (Lucide 1.5px stroke).
  - Tiny tracked uppercase label underneath (9px, `letter-spacing: 0.15em`).
  - Active button: Solid gold fill (`#F2B533`) with dark charcoal icon and dark text (`#0E0D0C`).
- Mapped to the 6 core mill drive components:
  1. `BRIDGE` (`lucide-zap`)
  2. `ARMATURE` (`lucide-activity`)
  3. `FOSTER RC` (`lucide-layers`)
  4. `EXCHANGER` (`lucide-wind`)
  5. `BLOWER` (`lucide-fan`)
  6. `RTD SENSORS` (`lucide-thermometer`)

**Visual Verification:**
Buttons render in a clean 2×3 grid with thin gold borders and gold icons. The active button is filled with solid gold and displays dark black icon and text.

- [ ] Step 1: Construct the 2×3 grid container (`.source-selector-grid`) in `styles.css`.
- [ ] Step 2: Implement `.source-item-btn` with 1px `#F2B533` border and gold Lucide SVG icons.
- [ ] Step 3: Implement `.source-item-btn.active` with solid `#F2B533` background and `#0E0D0C` text/icon.
- [ ] Step 4: Add hover state with `transform: translateY(-2px)` and active state with `scale(0.97)`.
- [ ] Step 5: Test interactive clicking and state persistence in Streamlit.

---

### Task 9: Preset Rack Channel Rows Deck

**Files:**
- Modify: `thermosense_dashboard/components/output_hardware.py`
- Reference: `DESIGN_SPEC.md#L56-L61`

**What Done Looks Like:**
- Full-width stacked horizontal rows for the 6 thyristor channels:
  `T1 · UPPER ARM (PHASE U)    >`
  `T2 · LOWER ARM (PHASE U)    >`
  `T3 · UPPER ARM (PHASE V)    >`
  `T4 · LOWER ARM (PHASE V)    >`
  `T5 · UPPER ARM (PHASE W)    >`
  `T6 · LOWER ARM (PHASE W)    >`
- Sized at 12px, uppercase, wide letter-spacing (`0.28em`), light grey (`#C4C1BA`), dark satin background (`#1A1918`), 1px divider (`#282624`), and right chevron (`>`).
- Live temperature readout in `IBM Plex Mono` on the right.
- Active/hovered row displays a thin gold highlight line (`#F2B533`) on the left edge.

**Visual Verification:**
Channel rows stack cleanly beneath the 2×3 grid with wide letter-spacing and dark satin texture; hovering highlights the row with a crisp gold left accent and moves the chevron slightly to the right.

- [ ] Step 1: Build the `.preset-rack-deck` and `.preset-rack-row` HTML/CSS structure.
- [ ] Step 2: Format channel phase titles with uppercase `letter-spacing: 0.28em` and color `#C4C1BA`.
- [ ] Step 3: Bind live junction temperatures from `data.thyristors` with `IBM Plex Mono` tabular numerals.
- [ ] Step 4: Add hover interaction (`transform: translateX(3px)`, left gold highlight line).
- [ ] Step 5: Wire row click to select thyristor in `st.session_state['selected_thyristor']`.

---

### Task 10: Editorial Callout & Live Telemetry Feature Panel

**Files:**
- Modify: `thermosense_dashboard/components/output_hardware.py`
- Modify: `thermosense_dashboard/app.py`
- Reference: `DESIGN_SPEC.md#L62-L65`, `DESIGN_SPEC.md#L257`

**What Done Looks Like:**
- Dark gradient card (`#1A1918` to `#151413`, 8px radius) situated beneath the preset rows.
- Two-line yellow-orange bold heading `Zero Unplanned Trips in Mill Operations` (`#FFB020`, weight 800, 22px).
- Small grey paragraph (`#9A9894`, 12px) explaining how cooling residual divergence ($\Delta T \ge 4.0\text{K}$) provides advance notice before thyristor puncture.
- Live telemetry strip at the bottom of the page displaying 4 rack cards ($I_d$, $T_a$, $\Delta T$, Wear Acceleration) with warm styling.

**Visual Verification:**
Feature panel displays the distinctive yellow-orange heading and clean editorial copy, followed by the 4 live telemetry cards with monospace values.

- [ ] Step 1: Implement `.editorial-callout-box` with `#FFB020` header and `#9A9894` paragraph.
- [ ] Step 2: Add the verified copy from `DESIGN_SPEC.md` citing `thresholds.yaml` and `About.py`.
- [ ] Step 3: Implement the 4-card live telemetry strip using `.preset-rack-row` dark satin styling.
- [ ] Step 4: Verify contrast and spacing against the reference feature panel ("Infinite Ideas in Seconds").

---

### Task 11: Multi-Viewport Responsive Pass (Desktop / Tablet / Mobile)

**Files:**
- Modify: `thermosense_dashboard/assets/styles.css`
- Reference: `DESIGN_SPEC.md#L280-L300`

**What Done Looks Like:**
- **Desktop ($\ge 1024\text{px}$):** Asymmetrical 2-column showcase layout, full 3D perspective enabled.
- **Tablet ($768\text{px} - 1023\text{px}$):** Stacked hero layout, reduced 3D tilt, 2×3 grid maintained, telemetry strip becomes 2×2.
- **Mobile ($< 768\text{px}$):** Single-column flow, 3D perspective flattened to 2D (`transform: none`) to eliminate horizontal scroll, nav links scroll horizontally (`overflow-x: auto`), 2×3 grid becomes compact 2-column tiles.

**Visual Verification:**
Resize browser window from 1440px down to 375px: no horizontal scrollbar at any breakpoint, text wraps cleanly, 3D unit flattens on mobile without clipping.

- [ ] Step 1: Add media query `@media (max-width: 1023px)` for tablet breakpoints.
- [ ] Step 2: Add media query `@media (max-width: 767px)` for mobile breakpoints.
- [ ] Step 3: Set `transform: none` on `.hardware-chassis-slab` under mobile media query.
- [ ] Step 4: Ensure `.output-nav-links` scroll horizontally with hidden scrollbar on mobile.
- [ ] Step 5: Test on 375px, 768px, and 1440px viewports in browser DevTools.

---

### Task 12: Tactile Motion & Focus-Visible Pass

**Files:**
- Modify: `thermosense_dashboard/assets/styles.css`
- Reference: `DESIGN_SPEC.md#L302-L315`

**What Done Looks Like:**
- Active states on buttons, rack rows, and selectors use tactile compression (`transform: scale(0.97)` on `:active` with 120ms response).
- Emil Kowalski spring easing curve applied: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Keyboard navigation displays an unmistakable 2px solid `#F2B533` outline with 2px offset (`*:focus-visible`) and subtle gold glow.
- `prefers-reduced-motion: reduce` turns off transitions and transforms for accessibility.

**Visual Verification:**
Pressing any button visibly compresses it; pressing Tab navigates through all interactive controls with a crisp gold outline ring; mouse clicks do not leave persistent focus rings.

- [ ] Step 1: Add `:active { transform: scale(0.97); transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1); }` to all button and row classes.
- [ ] Step 2: Implement `*:focus-visible { outline: 2px solid #F2B533 !important; outline-offset: 2px !important; }`.
- [ ] Step 3: Suppress default outline on `*:focus:not(:focus-visible)`.
- [ ] Step 4: Add `@media (prefers-reduced-motion: reduce)` block resetting animations to `none`.
- [ ] Step 5: Verify keyboard-only navigation across the entire page using Tab and Shift+Tab.

---

### Task 13: Operational Pages Integration & End-to-End QA

**Files:**
- Modify: `thermosense_dashboard/pages/1_🏠_Overview.py`
- Modify: `thermosense_dashboard/pages/2_⚡_Drive_Detail.py`
- Modify: `thermosense_dashboard/pages/3_🚨_Alarms_History.py`
- Modify: `thermosense_dashboard/pages/4_📊_Trends_Wear.py`
- Modify: `thermosense_dashboard/pages/5_⚙️_Settings.py`
- Modify: `thermosense_dashboard/pages/6_ℹ️_About.py`
- Reference: `DESIGN_SPEC.md#L215-L278`

**What Done Looks Like:**
- All 6 pages share the identical warm token palette, dark matte panels, and Lucide vector icons.
- All Plotly charts on `Overview`, `Drive Detail`, and `Trends & Wear` utilize the warm chart theme (`paper_bgcolor: #151413`, `plot_bgcolor: #0E0D0C`, `#FF5A1F` junction lines, `#FFB020` heatsink lines, `#F2B533` current lines).
- Backend unit test `test_basic.py` passes with zero regressions.
- All Python files compile with zero syntax errors.

**Visual Verification:**
Navigate through all pages via sidebar or top nav links: each page renders with consistent dark matte panels, warm gold/orange accents, and zero blue/teal elements.

- [ ] Step 1: Update Plotly charts across `pages/1_🏠_Overview.py`, `2_⚡_Drive_Detail.py`, and `4_📊_Trends_Wear.py` with the warm Plotly theme from `DESIGN_SPEC.md#L145-L175`.
- [ ] Step 2: Replace remaining status pills with Lucide SVG icons and labels on `Alarms & History` and `Settings`.
- [ ] Step 3: Compile all python files via `python -m py_compile thermosense_dashboard/**/*.py`.
- [ ] Step 4: Run backend verification test `python thermosense_dashboard/test_basic.py`.
- [ ] Step 5: Perform full visual inspection of the running Streamlit app on `http://localhost:8501`.
