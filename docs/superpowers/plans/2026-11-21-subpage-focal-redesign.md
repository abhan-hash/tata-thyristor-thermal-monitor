# Sub-Pages Focal Point Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all five sub-pages (Drive Detail, Alarms & History, Trends & Wear, Settings, About) with one distinct focal point, structured supporting detail, warm luxury palette ($R \ge B$, zero blue/teal/neon), and unified component kit using only existing codebase data.

**Architecture:** Each sub-page is organized around a primary visual anchor (schematic, timeline, arc gauges, grouped safety faders, or technical dossier hero), supported by secondary telemetry tiles and synchronized Plotly charts. The design system leverages `output_ui_kit.py` for headers, plates, and KPI tiles, `svg_schematics.py` for live vector diagrams, and `@st.fragment(run_every=...)` for flicker-free reactive updates.

**Tech Stack:** Python 3.10+, Streamlit 1.40+, Plotly 5.x, NumPy, CSS3 with IBM Plex Mono / Montserrat / Plus Jakarta Sans.

**Spec:** User prompt spec:
1. Drive Detail: Focal point = bridge schematic + selected channel big Tj readout and heat disc; below it = transient chart & current chart stacked with shared x-axis & crosshair + bar-bite spike annotation; diagnostic KPI tiles with sparklines.
2. Alarms & History: Timeline (vertical rail with severity markers), filter chips by severity/channel, expandable row showing temperature trace around event, acknowledge action, "active alarms" count in page header.
3. Trends & Wear: Remaining-life gauge per thyristor (arc gauge, warm gradient), thermal cycling count, heatmap of channel × day temperature, projected-wear line with confidence band.
4. Settings: Grouped panels with clear sections, restyled native inputs (sliders as fader-style tracks, toggles as hardware switches), inline validation, sticky save bar showing unsaved changes.
5. About: Hero banner, Foster RC ladder diagram explanation, 3-4 step virtual sensor visual flow.
Data constraint: Use only existing data from the codebase.

## Global Constraints
- **Color Discipline**: Warm palette strictly enforced ($R \ge B$ everywhere, zero blue/teal/neon/cold-purple).
- **Typography**: Headers in Montserrat (800), body in Plus Jakarta Sans (500/600), tabular numerals/readouts in IBM Plex Mono (700).
- **Rerun Isolation**: Live data polling wrapped inside `@st.fragment(run_every=...)` so the page does not reload or flicker.
- **Data Provenance**: Sourced directly from `data_source.py`, `simulator.py`, `thresholds.yaml`, and `users.yaml`. No invented APIs.

## Review Focus
- **Shared Crosshairs & Synchronized X-Axis**: The transient temperature and current profile charts on Drive Detail must align on the exact same time axis and show synchronized crosshair hover values.
- **Interactive Alarm State**: Acknowledging an alarm must immediately update the record, decrement the active count in the page header, and persist across sub-page visits.
- **Restyled Hardware Controls**: Settings sliders must render with fader-style groove tracks and tactile thumbs, with inline validation flagging setpoint inversions (e.g., warning threshold >= trip limit).
- **Sticky Save Bar**: Settings page must reveal a floating bottom save bar with "Unsaved Changes" whenever any input deviates from the baseline configuration.
- **Focal Point Visual Hierarchy**: Each page must possess one unambiguous primary visual element that draws the eye before the secondary data grid.

---

### Task 1: Drive Detail Focal Point & Stacked Chart Synchronization
**Files:**
- Modify: `thermosense_dashboard/pages/2_⚡_Drive_Detail.py`
- Modify: `thermosense_dashboard/components/output_ui_kit.py`
- Test: `tests/test_interactive_logic.py`

**Steps:**
- [ ] Align focal point row: 6-pulse bridge schematic left (with active gold highlight) + selected channel plate right (with 72px mini heat disc, large 34px mono Tj readout, margin-to-trip bar, and heatsink/loss/residual triplets).
- [ ] Connect channel card selection so clicking any of the 6 channel cards or SVG thyristors immediately locks focus on that channel.
- [ ] Stack transient temperature chart ($T_j$ and $T_{hs}$) and armature current chart ($I_d$) with `spikemode='across'` / `spikesnap='cursor'` and `hovermode='x unified'` for true shared crosshairs.
- [ ] Add prominent hot bar-bite impact spike annotation on the transient chart at $t=11.2\text{s}$ showing "+380A Bar Bite Surge".
- [ ] Verify diagnostic KPI tiles with sparklines render beneath focal row.
- [ ] Run test suite to verify channel selection logic and chart rendering.

### Task 2: Alarms & History Vertical Timeline Rail & Acknowledgment Flow
**Files:**
- Modify: `thermosense_dashboard/pages/3_🚨_Alarms_History.py`
- Modify: `thermosense_dashboard/assets/ui_kit.css`
- Test: `tests/test_break_scenarios.py`

**Steps:**
- [ ] Ensure page header displays an explicit `"ACTIVE ALARMS"` live count metric in white with matching status tier chip.
- [ ] Build vertical timeline rail (`.timeline-rail` with `.timeline-marker.critical` and `.timeline-marker.warning`).
- [ ] Implement filter chips for severity (`ALL`, `CRITICAL`, `WARNING`) and channel (`ALL`, `T1`–`T6`, `LOOP/BLOWER`).
- [ ] Implement expandable row (`st.expander`) per event showing event signature temperature trace chart ($T \pm 15\text{s}$).
- [ ] Implement interactive acknowledgment button that updates `acknowledged=True` and sets `ack_by` with the active operator role.
- [ ] Render crisp vector empty state when zero alarms match active filters.
- [ ] Retain diagnostic simulation controls in a collapsible drawer for live testing.

### Task 3: Trends & Wear Predictive Analytics & Thermal Fatigue Heatmap
**Files:**
- Modify: `thermosense_dashboard/pages/4_📊_Trends_Wear.py`
- Modify: `thermosense_dashboard/components/output_ui_kit.py`
- Test: `tests/test_ui_kit.py`

**Steps:**
- [ ] Focal point: 6 SVG Remaining-Life Arc Gauges ($220^\circ$ circular tracks with warm gradient fill, tabular % readout, and remaining months).
- [ ] Four diagnostic KPI tiles with 30s sparklines: Fatigue Acceleration Factor, Minimum RUL, Recorded Thermal Cycles, Fleet Average Health.
- [ ] Left analytics panel: 14-day Channel $\times$ Day Peak Junction Temperature Heatmap (T1–T6 vs D-14..D-0) in warm obsidian-to-red palette.
- [ ] Right analytics panel: 36-Month Cumulative Fatigue Wear Projection with shaded $\pm 1\sigma$ uncertainty confidence band and 100% end-of-life limit line.
- [ ] Coffin-Manson thermo-mechanical fatigue calculation formula and maintenance action plate.

### Task 4: Settings Grouped Panels, Fader Tracks & Sticky Save Bar
**Files:**
- Modify: `thermosense_dashboard/pages/5_⚙️_Settings.py`
- Modify: `thermosense_dashboard/assets/ui_kit.css`
- Test: `tests/test_ui_kit.py`

**Steps:**
- [ ] Add CSS in `ui_kit.css` for restyling native Streamlit sliders (`.stSlider`) into audio-console fader-style recessed tracks with machined metallic thumbs.
- [ ] Add CSS in `ui_kit.css` for restyling native toggles (`.stToggle`) into tactile hardware switches with amber indicator LEDs.
- [ ] Group settings into four structured plate panels:
  - Panel 1: Alarm & Trip Safety Thresholds with real-time inline validation (`tj_warn < tj_trip`).
  - Panel 2: Foster 3-Stage RC Physics Parameters (R1-R3, C1-C3, time constants loaded from `thresholds.yaml`).
  - Panel 3: Forced-Air Heat Exchanger & Blower System (vector schematic with live inlet/outlet temps & rotating blower fan).
  - Panel 4: Role-Based Access Control (RBAC) permissions matrix loaded from `users.yaml`.
- [ ] Implement a sticky bottom save bar (`.sticky-save-bar`) that detects any input modification, displays "UNSAVED SETPOINT CHANGES DETECTED", and provides "SAVE SETPOINTS" and "DISCARD" actions.

### Task 5: Technical Dossier Hero Banner, Foster RC Ladder & 4-Step Pipeline
**Files:**
- Modify: `thermosense_dashboard/pages/6_ℹ️_About.py`
- Test: `tests/test_svg_schematics.py`

**Steps:**
- [ ] Hero focal point: Wide WebP hero banner (`about_hero_banner.webp`, 1376×420 display, dark molten steel rolling mill entry).
- [ ] Virtual sensor 4-step visual flow pipeline (Stage 01 Acquisition $\to$ Stage 02 Loss $\to$ Stage 03 Foster RC $\to$ Stage 04 State & Early Warning).
- [ ] Foster RC 3-stage impedance ladder diagram explanation with live heat-flow particle animation.
- [ ] Stand-04 30° axonometric mill cutaway CAD illustration (`render_isometric_mill_cutaway_svg`).
- [ ] Sensor provenance & physical hardware specs table.

### Task 6: System Verification & Automated Visual Audit
**Files:**
- Test: `tests/test_ui_kit.py`
- Test: `tests/test_svg_schematics.py`
- Test: `tests/test_break_scenarios.py`
- Test: `tests/test_interactive_logic.py`

**Steps:**
- [ ] Run full unittest discovery suite across all test files.
- [ ] Capture verified full-page desktop screenshots of all 5 sub-pages.
- [ ] Verify zero console errors, zero traceback outputs, and 100% warm palette adherence.
- [ ] Commit all enhancements to branch `redesign/output-thermal`.
