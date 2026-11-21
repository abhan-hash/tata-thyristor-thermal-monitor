# Sub-Page Redesign & Unified Output Thermal Component System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform all sub-pages (Drive Detail, Alarms & History, Trends & Wear, Calibration & Settings, About) into a unified, high-polish industrial hardware interface using an encapsulated Output Thermal component kit, crisp SVGs, purposeful motion, and comprehensive stress verification.

**Architecture:** Create an encapsulated component library (`output_ui_kit.py` + `ui_kit.css`) providing standardized page headers, matte crop-bracket panels, KPI sparkline tiles, multi-state status chips, mini heat discs, and shared Plotly templates. Complement with vector schematic engines (`svg_schematics.py`) for live-glowing 6-pulse bridge, Foster RC heat-flow ladders, and isometric illustrations, plugged seamlessly into modular Streamlit fragments.

**Tech Stack:** Python 3.12, Streamlit 1.67, Plotly 6.x, SVG/CSS Keyframes, NumPy, PyYAML.

**Spec:** Direct continuation of `DESIGN_SPEC.md` and user requirements for Sub-Page Redesign, Motion Framework, and Component Kit.

## Global Constraints
- Strictly warm luxury palette: $R \ge B$ everywhere. No blue, no purple, no cyan, no default Tailwind slate.
- Typography: Plus Jakarta Sans for UI labels, Montserrat for headings, IBM Plex Mono for values and data.
- Streamlit rerun isolation: Entrance animations play once per session (`st.session_state` guard); live telemetry updates must execute inside `@st.fragment(run_every=...)` without page-level reload or CSS flicker.
- Motion guidelines: Animate only `transform`, `opacity`, `filter`. Tabular numerals (`font-variant-numeric: tabular-nums`) to prevent layout jump. Respect `prefers-reduced-motion`.
- Accessibility: Real button/link targets with 2px gold focus-visible outline, screen-reader friendly status text (never color alone).

## Review Focus
1. **Numerical/Data Boundary Conditions:** All channels at 125.0°C trip, all at ambient (35°C), sensor missing/NaN values, 0 active alarms, and 200+ historical alarms without UI crash or memory leaks.
2. **Animation Stability:** Sustained 10 Hz / 2s fragment execution must not restart CSS entrance keyframes, leak DOM nodes, or jank browser thread.
3. **Responsive Breakpoints:** 1440px desktop down to 390px mobile — bridge schematic, charts, and channel cards must wrap cleanly without text clipping or mid-word breaks.
4. **Interactive Fidelity:** Bridge thyristor click updates selection, query parameter syncs, and re-renders selected channel stats without jumping page position.
5. **No Hallucinated Data:** Only use verified data attributes from `data/data_source.py` and `data/simulator.py`.

---

## Tasks

### Task 1: Reusable Component Module & CSS Architecture
**Files:**
- Create: `thermosense_dashboard/components/output_ui_kit.py`
- Create: `thermosense_dashboard/assets/ui_kit.css`
- Test: `tests/test_ui_kit.py`

- [ ] Write unit test in `tests/test_ui_kit.py` testing HTML generation for Page Header, Panel with crop marks, KPI Sparkline tile, Status Chip, and Mini Heat Disc.
- [ ] Implement `output_ui_kit.py`:
  - `render_page_header(title, subtitle, live_metric_val, live_metric_unit, live_metric_label, status_tier, variant="ribbon")`
  - `render_panel_open(title, vertical_label, corner_brackets=True)` & `render_panel_close()`
  - `render_kpi_tile(label, value_mono, unit, delta_arrow, sparkline_data, status_class)`
  - `render_status_chip(tier, show_pulse=True)`
  - `render_mini_heat_disc_svg(temp_c, diameter=48)`
  - `render_channel_card(t_id, tj, ts, status, is_selected, variant="plate")`
  - `create_shared_plotly_layout(title, y_title, y_range, height=260, show_thresholds=True)`
  - `render_empty_state(headline, description, icon_type="alarms")`
- [ ] Implement `ui_kit.css`:
  - Corner crop-bracket pseudo-elements (`.plate-panel::before`, `.plate-panel::after`)
  - Rotated vertical badge (`.plate-vertical-label`)
  - Status chip animations (`.chip-critical-pulse`, `.sync-pulse-dot`)
  - Tabular numerals and fader/switch styles
- [ ] Verify test suite passes with zero errors.

### Task 2: Crisp Technical SVG Schematic Engine
**Files:**
- Create: `thermosense_dashboard/components/svg_schematics.py`
- Test: `tests/test_svg_schematics.py`

- [ ] Write unit tests verifying SVG string validity, phase assignment (U, V, W for T1-T6), and temperature color mapping.
- [ ] Implement `render_bridge_schematic_svg(thyristor_temps, selected_id, current_a)`:
  - 3 AC line inputs (U, V, W) with sine glyphs, DC bus bars (+ and -)
  - 6 thyristor symbols (T1, T3, T5 positive rail; T4, T6, T2 negative rail)
  - Dynamic heat color fill and glow filter on each thyristor based on its actual $T_j$
  - Gold highlight border + selection indicator for active channel
  - Clickable anchor tags linking to `?t=N`
- [ ] Implement `render_foster_ladder_svg(p_loss, r_values, tau_values, temps)`:
  - 3-stage $R-C$ ladder schematic ($R_1 C_1, R_2 C_2, R_3 C_3$)
  - Animated CSS heat flow particles traveling from Junction $\to$ Case $\to$ Heatsink $\to$ Ambient air
  - Particle animation duration inversely proportional to power dissipation
- [ ] Implement `render_heat_exchanger_svg(inlet_temp, outlet_temp, fan_speed_rpm, clogging_pct)`:
  - Air duct with fan blades, intake filter mesh, thyristor heat sink fins, and thermal gradient arrow
- [ ] Implement `render_isometric_mill_cutaway_svg(chosen_art_direction)`:
  - Detailed isometric cutaway of Stand-04 4-high mill stand, glowing red-hot steel strip, work rolls, backup rolls, and adjacent DC drive enclosure.
- [ ] Verify SVG generation in tests and check in headless Chrome.

### Task 3: Redesign Drive Detail Page (`2_⚡_Drive_Detail.py`)
**Files:**
- Modify: `thermosense_dashboard/pages/2_⚡_Drive_Detail.py`
- Test: Manual browser capture & unit tests

- [ ] Wrap live dashboard in `@st.fragment(run_every="1s")`.
- [ ] Integrate standardized Page Header with Stand-04 live peak junction temperature and active bridge status chip.
- [ ] Hero focal point: 6-Pulse Bridge schematic (interactive) on left (or top), selected channel prominent $T_j$ readout with large concentric heat disc and thermal margin bar on right.
- [ ] 6 Channel selector cards powered by the approved Channel Card design with instant query param updates.
- [ ] Middle row: Diagnostic telemetry KPI tiles with 30s sparklines ($I_d$, $V_{f0}$, $P_{loss}$, $R_{sa}$, $Z_{th}$, $\Delta T_{hs}$).
- [ ] Bottom section: Stacked Plotly charts (Transient $T_j$ response and Armature current $I_d$ profile) sharing synchronized x-axis range and crosshairs, with visible "BAR ENTRY IMPACT SPIKE" annotation.
- [ ] Below charts: Foster RC 3-stage ladder diagram with dynamic heat-flow particle stream.

### Task 4: Redesign Alarms & History Page (`3_🚨_Alarms_History.py`)
**Files:**
- Modify: `thermosense_dashboard/pages/3_🚨_Alarms_History.py`
- Test: Manual browser capture & unit tests

- [ ] Wrap in `@st.fragment(run_every="2s")`.
- [ ] Page Header: "ALARMS & INCIDENTS", subtitle, active alarm count counter in header, overall status chip.
- [ ] KPI row with sparklines for MTTA, Trip Alerts, Warnings, 24H Incidents.
- [ ] Active alarm banner with pulsating critical alert if active.
- [ ] Diagnostic simulation control panel (fan failure, filter clogging, overload) in styled plate panel.
- [ ] Replace flat table with Vertical Rail Timeline:
  - Vertical rail with severity markers (crimson dot for critical, amber dot for warning, grey dot for cleared)
  - Expandable event cards with inline mini temperature trace chart around incident timestamp
  - Interactive "ACKNOWLEDGE" button that updates state in session without full page refresh
  - Filter chips for severity (`ALL`, `CRITICAL`, `WARNING`) and channel (`ALL`, `T1`–`T6`)
- [ ] Empty state fallback when no alarms match filters.

### Task 5: Redesign Trends & Wear Analysis Page (`4_📊_Trends_Wear.py`)
**Files:**
- Modify: `thermosense_dashboard/pages/4_📊_Trends_Wear.py`
- Test: Manual browser capture & unit tests

- [ ] Wrap in `@st.fragment(run_every="5s")`.
- [ ] Page Header: "TRENDS & WEAR", subtitle, key metric RUL (Remaining Useful Life in months), status chip.
- [ ] Focal Point: Remaining-Life Arc Gauges for each thyristor (T1–T6) using warm radial gradient tracks showing percentage life remaining ($100\% \to 0\%$).
- [ ] Thermal Cycling Analytics:
  - Cumulative cycle count card with breakdown by $\Delta T$ swing bins
  - Channel $\times$ Day temperature heatmap (6 rows $\times$ past 14 days) using warm copper-to-ember color scale
  - Projected wear rate curve with shaded $\pm 1\sigma$ confidence band to end-of-life threshold.
- [ ] Physics-of-failure Coffin-Manson formulation card in styled plate panel with crop marks.

### Task 6: Redesign Calibration & Settings Page (`5_⚙️_Settings.py`)
**Files:**
- Modify: `thermosense_dashboard/pages/5_⚙️_Settings.py`
- Test: Manual browser capture & unit tests

- [ ] Page Header: "CALIBRATION & SETTINGS", subtitle, system interlock status chip, active profile readout.
- [ ] Grouped plate panels with corner crop marks:
  - Panel 1: Alarm & Trip Thresholds (Junction trip, heatsink trip, cooling residual filter threshold)
  - Panel 2: Foster Model & Physics Constants ($R_{jc}, R_{sa}, \tau_1, \tau_2, \tau_3$)
  - Panel 3: Sensor Bus & Heat Exchanger Telemetry (featuring live Blower & Heat Exchanger airflow SVG schematic)
  - Panel 4: Role-Based Access Control (RBAC) matrix
- [ ] Custom CSS restyling for Streamlit sliders (machined fader track) and toggles (hardware toggle switches).
- [ ] Inline validation checks (e.g., warning must be strictly less than trip threshold; resistances must be $> 0$).
- [ ] Sticky save bar at bottom indicating unsaved parameter changes with "Save Configuration" and "Reset to Defaults".

### Task 7: Redesign Technical About & Dossier Page (`6_ℹ️_About.py`)
**Files:**
- Modify: `thermosense_dashboard/pages/6_ℹ️_About.py`
- Test: Manual browser capture & unit tests

- [ ] Page Header: "TECHNICAL DOSSIER", subtitle, Tata Steel Stand-04 metadata.
- [ ] Hero Banner: Optimized WebP image generated/styled according to approved art direction, with dark steelworks lighting and explicit aspect ratio.
- [ ] 3-4 Step Virtual Sensor Workflow Visual:
  - Step 1: Physical Telemetry Acquisition (PT100 RTDs + Hall Effect CT)
  - Step 2: Conduction & Dynamic Loss Calculation ($P_{loss}$)
  - Step 3: Foster 3-Stage RC Transient Heat Spreading Model ($Z_{th}(t)$)
  - Step 4: Virtual Junction State Estimation & Early Residual Diagnostic
- [ ] Foster RC ladder schematic integration with live thermal time constants breakdown.
- [ ] Sensor provenance & confidence classification table inside styled plate panel.

### Task 8: Purposeful Motion, Performance & 10 Hz Session Stability
**Files:**
- Modify: `thermosense_dashboard/assets/ui_kit.css`
- Modify: `thermosense_dashboard/assets/styles.css`
- Test: Automated 10 Hz stress runner script

- [ ] Implement session-scoped animation trigger (`session_state['has_entered'] = True`) so page entrance animations play strictly once per session.
- [ ] Header heat-smear and title sweep keyframe animation (`@keyframes smearSweep`, under 500ms).
- [ ] Staggered panel reveal (`animation-delay: 80ms, 160ms, 240ms...`).
- [ ] Tabular numerals applied to all live data values (`font-variant-numeric: tabular-nums`).
- [ ] Subtle thermal pulse on hottest elements.
- [ ] Live telemetry indicator: STAND SYNC 10HZ pulse dot synced to update tick.
- [ ] All animations obey `@media (prefers-reduced-motion: reduce)`.

### Task 9: Stress Testing, Break-It Scenarios, Responsive Mobile Verification & Final Review
**Files:**
- Create: `tests/test_break_scenarios.py`
- Modify: `take_screenshot.py`
- Test: Full test suite + multi-viewport screenshot verification

- [ ] Test extreme data conditions:
  - All channels at trip (125°C)
  - All channels at ambient (35°C)
  - Missing sensor data / NaN values
  - 200+ alarms loaded
  - Long labels and 200% browser zoom
- [ ] Capture desktop (1440px), tablet (1024px), and mobile (390px) screenshots of all 6 pages.
- [ ] Verify zero mid-word text wrapping, zero horizontal scrollbar overflow, crisp readability.
- [ ] Run full test suite, verify clean exit code.
- [ ] Conduct final code review, summarize changes, and commit.
