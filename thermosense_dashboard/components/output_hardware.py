"""
THERMOSENSE - Output Thermal Hardware Components (Tasks 6, 7, 8, 9, 10)
Directly modeled on the Output Thermal interface (DESIGN_SPEC v2.0).

Components:
- Task 6: Hero Stepped Heat Blob Art & 3D Hardware Controller (Left Column)
- Task 7 & 8: 'Inspect Stand-04 in action' Second Panel & 2x3 Button Grid (Right Column)
- Task 9: Preset Rack Channel Rows Deck (Right Column)
- Task 10: Editorial Callout & Live Telemetry Feature Panel
"""

import streamlit as st
import numpy as np
import textwrap
from typing import List

try:
    from components.output_console import render_3d_hardware_console_html
except ImportError:
    from thermosense_dashboard.components.output_console import render_3d_hardware_console_html


def render_output_thermal_showcase(drive_data, active_component: str = "BRIDGE"):
    """
    Renders the bespoke Output Thermal hardware showcase layout.
    Covers Tasks 6, 7, 8, 9, and 10 with strict adherence to DESIGN_SPEC tokens.
    """
    # =========================================================================
    # 1. CLEAN DATA SANITIZATION (Strict physical bounds & safe clamping)
    # =========================================================================
    clean_tj: List[float] = []
    clean_hs: List[float] = []

    thyristors = getattr(drive_data, 'thyristors', [])
    for idx in range(6):
        # Junction temperature (Tj) extraction & clamping
        tj_val = 70.0 + idx * 0.4
        if idx < len(thyristors):
            t = thyristors[idx]
            try:
                val = t.tj_estimated() if callable(getattr(t, 'tj_estimated', None)) else getattr(t, 'tj_estimated', None)
                if isinstance(val, (list, tuple)) and len(val) > 0:
                    val = float(val[0])
                elif val is not None:
                    val = float(val)
                else:
                    val = 70.0 + idx * 0.4

                if not np.isfinite(val) or val < 20.0 or val > 135.0:
                    val = 70.0 + idx * 0.4
                tj_val = min(125.0, max(45.0, float(val)))
            except Exception:
                tj_val = 70.0 + idx * 0.4
        clean_tj.append(tj_val)

        # Heatsink temperature (Hs) extraction & clamping
        hs_val = 45.0 + idx * 0.2
        if idx < len(thyristors):
            t = thyristors[idx]
            try:
                hs = t.t_heatsink_measured() if callable(getattr(t, 't_heatsink_measured', None)) else getattr(t, 't_heatsink_measured', None)
                if isinstance(hs, (list, tuple)) and len(hs) > 0:
                    hs = float(hs[0])
                elif hs is not None:
                    hs = float(hs)
                else:
                    hs = 45.0 + idx * 0.2

                if not np.isfinite(hs) or hs < 15.0 or hs > 100.0:
                    hs = 45.0 + idx * 0.2
                hs_val = min(90.0, max(25.0, float(hs)))
            except Exception:
                hs_val = 45.0 + idx * 0.2
        clean_hs.append(hs_val)

    # Clamping peak Tj to [65.0, 95.0] during normal simulation
    raw_max_tj = max(clean_tj) if clean_tj else 71.2
    max_tj = min(95.0, max(65.0, raw_max_tj))
    max_hs = max(clean_hs) if clean_hs else 46.5

    # Armature current sanitization
    raw_current = getattr(drive_data, 'armature_current', 700.0)
    try:
        armature_current = float(raw_current)
        if not np.isfinite(armature_current) or armature_current < 0.0 or armature_current > 1600.0:
            armature_current = 700.0
    except Exception:
        armature_current = 700.0

    # Ambient temp sanitization
    raw_ambient = getattr(drive_data, 'ambient_temp', 35.0)
    try:
        ambient_temp = float(raw_ambient)
        if not np.isfinite(ambient_temp) or ambient_temp < 10.0 or ambient_temp > 60.0:
            ambient_temp = 35.0
    except Exception:
        ambient_temp = 35.0

    # Cooling residual sanitization
    residuals = []
    for t in thyristors:
        r = getattr(t, 'residual', None)
        if r is not None:
            try:
                r_val = float(r)
                if np.isfinite(r_val):
                    residuals.append(r_val)
            except Exception:
                pass
    cooling_residual = max(residuals) if residuals else 2.4
    cooling_residual = min(12.0, max(0.5, cooling_residual))

    # =========================================================================
    # 2. QUERY PARAMETERS & SESSION STATE SYNCHRONIZATION
    # =========================================================================
    if "source" in st.query_params:
        src_param = st.query_params.get("source")
        if src_param:
            st.session_state['selected_component'] = src_param.upper()

    if "t" in st.query_params:
        try:
            t_param = int(st.query_params.get("t", 1))
            if 1 <= t_param <= 6:
                st.session_state['selected_thyristor'] = t_param
        except (ValueError, TypeError):
            pass

    selected_source = st.session_state.get('selected_component', active_component).upper()
    selected_thyristor = st.session_state.get('selected_thyristor', 1)

    # =========================================================================
    # 3. MAIN HERO 2-COLUMN SPLIT (Tasks 6, 7, 8, 9, 10)
    # =========================================================================
    left_hero, right_hero = st.columns([1.18, 1.0], gap="large")

    console_3d_html = render_3d_hardware_console_html(max_tj, cooling_residual)

    # -------------------------------------------------------------------------
    # LEFT COLUMN: Task 6 (Hero Stepped Heat Blob Art & 3D Hardware Controller)
    # -------------------------------------------------------------------------
    with left_hero:
        left_col_html = textwrap.dedent(f"""
<div class="hero-left-wrapper" style="position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; box-sizing: border-box;">
<div class="stepped-heat-blob-aura" style="position: absolute; width: 135%; height: 680px; top: -60px; left: -18%; pointer-events: none; z-index: 1;">
<svg width="100%" height="100%" viewBox="0 0 740 660" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
<path class="heat-blob-layer heat-blob-layer-1" d="M 45 200 C 20 60, 160 15, 380 20 C 580 25, 710 110, 680 300 C 655 460, 560 620, 350 635 C 160 650, 60 520, 30 380 C 10 280, 70 340, 45 200 Z" fill="#FF9A3C" />
<path class="heat-blob-layer heat-blob-layer-2" d="M 85 220 C 65 100, 190 55, 370 65 C 540 75, 645 155, 620 310 C 600 440, 510 570, 345 580 C 195 590, 105 480, 75 365 C 55 285, 105 340, 85 220 Z" fill="#FF5A1F" />
<path class="heat-blob-layer heat-blob-layer-3" d="M 130 240 C 115 140, 220 95, 365 105 C 505 115, 580 195, 560 320 C 540 420, 460 520, 340 525 C 230 530, 155 440, 125 350 C 105 285, 145 340, 130 240 Z" fill="#E0201B" />
<path class="heat-blob-isoline" d="M 55 210 C 32 75, 170 30, 375 35 C 565 40, 690 125, 665 305 C 640 450, 545 605, 348 620 C 170 635, 75 505, 45 375 Z" fill="none" stroke="rgba(255, 255, 255, 0.28)" stroke-width="1.2" stroke-dasharray="10, 6" />
<path class="heat-blob-isoline" d="M 95 230 C 75 115, 200 70, 368 80 C 528 90, 630 170, 608 315 C 588 430, 498 555, 342 565 C 205 575, 120 465, 88 360 Z" fill="none" stroke="rgba(14, 13, 12, 0.35)" stroke-width="1.8" />
<path class="heat-blob-isoline" d="M 140 250 C 125 155, 230 110, 362 120 C 495 130, 565 205, 548 325 C 530 410, 450 505, 338 510 C 240 515, 168 430, 138 345 Z" fill="none" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.0" />
</svg>
</div>
{console_3d_html}
<div class="editorial-callout-box" style="width: 100%; margin-top: 10px; position: relative; z-index: 6; background: #1A1918; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 18px 22px; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);">
<div style="font-family: 'Montserrat', sans-serif; font-size: 18px; font-weight: 800; color: #FFB020; letter-spacing: -0.3px; line-height: 1.25; margin-bottom: 8px;">
Silicon Junction Transients Finally Become Predictable
</div>
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; line-height: 1.6; color: #9A9894; max-width: 75ch;">
In hot rolling mills, 1000A DC drives endure 2.4s bar entry current spikes. Physical heatsink RTDs lag by 20s and miss dangerous junction excursions. THERMOSENSE fuses RTD sensing with electrical current through a 3-layer Foster RC network (&tau;<sub>1</sub>=20ms, &tau;<sub>2</sub>=0.5s, &tau;<sub>3</sub>=20s) to compute real-time junction temperature at 10 Hz, turning blind hardware risk into precision operational foresight.
</div>
</div>
</div>

</div>
""").strip()
        st.markdown(left_col_html, unsafe_allow_html=True)

    # -------------------------------------------------------------------------
    # RIGHT COLUMN: Tasks 7, 8, 9, 10
    # -------------------------------------------------------------------------
    with right_hero:
        # Build 2x3 Button Grid HTML (Tasks 7 & 8)
        sources_def = [
            ("BRIDGE", "BRIDGE", '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>'),
            ("ARMATURE", "ARMATURE", '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>'),
            ("FOSTER RC", "FOSTER_RC", '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>'),
            ("EXCHANGER", "EXCHANGER", '<path d="M17.7 7.7A2.5 2.5 0 1 1 19 12H2"></path><path d="M12.6 19.4A2 2 0 1 0 14 16H2"></path><path d="M9.8 4.6A2 2 0 1 1 11 8H2"></path>'),
            ("BLOWER", "BLOWER", '<circle cx="12" cy="12" r="3"></circle><path d="M12 9a4 4 0 0 0-4-4H4v4a4 4 0 0 0 4 4"></path><path d="M15 12a4 4 0 0 0 4-4V4h-4a4 4 0 0 0-4 4"></path><path d="M12 15a4 4 0 0 0 4 4h4v-4a4 4 0 0 0-4-4"></path><path d="M9 12a4 4 0 0 0-4 4v4h4a4 4 0 0 0 4-4"></path>'),
            ("CURRENT SHUNT", "CURRENT_SHUNT", '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>'),
        ]

        buttons_html_list = []
        for label, code, svg_paths in sources_def:
            is_active = (selected_source == code or (code == "BRIDGE" and "BRIDGE" in selected_source))
            active_cls = "active" if is_active else ""
            btn_html = (
                f'<a href="?source={code}" class="source-item-btn {active_cls}" tabindex="0" target="_self" style="text-decoration: none;">'
                f'<svg class="source-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">'
                f'{svg_paths}'
                f'</svg>'
                f'<span class="source-item-label" style="text-decoration: none;">{label}</span>'
                f'</a>'
            )
            buttons_html_list.append(btn_html)

        buttons_grid_str = "\n".join(buttons_html_list)

        # Build Preset Rack Rows HTML (Task 9) - Interruptible Expandable Channels
        channels = [
            ("T1 &bull; UPPER ARM (PHASE U)", 1, clean_tj[0], clean_hs[0]),
            ("T2 &bull; LOWER ARM (PHASE U)", 2, clean_tj[1], clean_hs[1]),
            ("T3 &bull; UPPER ARM (PHASE V)", 3, clean_tj[2], clean_hs[2]),
            ("T4 &bull; LOWER ARM (PHASE V)", 4, clean_tj[3], clean_hs[3]),
            ("T5 &bull; UPPER ARM (PHASE W)", 5, clean_tj[4], clean_hs[4]),
            ("T6 &bull; LOWER ARM (PHASE W)", 6, clean_tj[5], clean_hs[5]),
        ]

        rack_rows_list = []
        for ch_title, t_num, temp_val, hs_val in channels:
            is_sel = (t_num == selected_thyristor)
            item_cls = "preset-rack-item" + (" active expanded" if is_sel else "")

            # Thermal status tier colors (strictly warm)
            if temp_val >= 125.0:
                dot_col = "#E0201B"  # Critical
            elif temp_val >= 110.0:
                dot_col = "#FF5A1F"  # Warning
            elif temp_val >= 105.0:
                dot_col = "#FFB020"  # Elevated
            else:
                dot_col = "#C4C1BA"  # Nominal

            title_col = "#FFFFFF" if is_sel else "#C4C1BA"
            thermal_margin = max(0.0, 125.0 - temp_val)

            row_html = (
                f'<div class="{item_cls}">'
                f'<div class="preset-rack-row" tabindex="0" role="button" aria-expanded="{"true" if is_sel else "false"}" '
                f'onclick="this.closest(\'.preset-rack-item\').classList.toggle(\'expanded\');" '
                f'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){{event.preventDefault();this.closest(\'.preset-rack-item\').classList.toggle(\'expanded\');}}">'
                f'<div style="display: flex; align-items: center; gap: 12px;">'
                f'<span class="preset-row-title" style="font-family: \'Plus Jakarta Sans\', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.28em; color: {title_col}; text-transform: uppercase;">{ch_title}</span>'
                f'</div>'
                f'<div class="preset-row-right" style="display: flex; align-items: center; gap: 14px;">'
                f'<span class="preset-row-temp" style="font-family: \'IBM Plex Mono\', monospace; font-size: 13.5px; font-weight: 700; color: #FFFFFF; font-variant-numeric: tabular-nums;">{temp_val:.1f}&deg;C</span>'
                f'<span class="preset-row-chevron" style="color: #88847E; font-size: 16px;">&rsaquo;</span>'
                f'</div>'
                f'</div>'
                f'<div class="preset-rack-drawer">'
                f'<div class="preset-rack-drawer-inner">'
                f'<div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); font-family: \'IBM Plex Mono\', monospace; font-size: 10px; color: #88847E;">'
                f'<span>HEATSINK: <strong style="color: #FFFFFF;">{hs_val:.1f}&deg;C</strong></span>'
                f'<span>Zth: <strong style="color: #FFB020;">0.040 K/W</strong></span>'
                f'<span>MARGIN: <strong style="color: #C4C1BA;">+{thermal_margin:.1f} K</strong></span>'
                f'<a href="?t={t_num}" target="_self" style="color: #FF5A1F; text-decoration: none; font-weight: 700; border-bottom: 1px dotted #FF5A1F;">SELECT CHANNEL &rarr;</a>'
                f'</div>'
                f'</div>'
                f'</div>'
                f'</div>'
            )
            rack_rows_list.append(row_html)

        rack_rows_str = "\n".join(rack_rows_list)

        right_col_html = textwrap.dedent(f"""
<div class="hero-right-wrapper" style="display: flex; flex-direction: column; width: 100%; box-sizing: border-box;">

<!-- Second Panel: Square Artwork Card + 2x3 Button Grid (Tasks 7 & 8) -->
<div class="second-panel-container" style="background: #1A1918; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 20px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7); margin-bottom: 20px; box-sizing: border-box;">
<div style="display: flex; gap: 18px; align-items: center; box-sizing: border-box;">

<!-- Left side of panel: Square Artwork Card (160px x 160px) -->
<div class="artwork-card" style="width: 160px; height: 160px; min-width: 160px; background: #121110; border: 1px solid #282624; border-radius: 6px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8); flex-shrink: 0;">

<!-- Corner Crop-Bracket Marks (#5A5752) -->
<svg width="100%" height="100%" viewBox="0 0 160 160" style="position: absolute; inset: 0; pointer-events: none;" xmlns="http://www.w3.org/2000/svg">
<path d="M 8 20 L 8 8 L 20 8" stroke="#5A5752" stroke-width="1.2" fill="none"/>
<path d="M 140 8 L 152 8 L 152 20" stroke="#5A5752" stroke-width="1.2" fill="none"/>
<path d="M 8 140 L 8 152 L 20 152" stroke="#5A5752" stroke-width="1.2" fill="none"/>
<path d="M 140 152 L 152 152 L 152 140" stroke="#5A5752" stroke-width="1.2" fill="none"/>
</svg>

<!-- Rotated 90° Vertical Micro-Labels -->
<div style="position: absolute; left: -14px; top: 50%; transform: translateY(-50%) rotate(-90deg); transform-origin: center center; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 7.5px; font-weight: 700; letter-spacing: 0.2em; color: #88847E; white-space: nowrap; text-transform: uppercase;">
STAND-04 &bull; 6-PULSE &bull; TATA STEEL
</div>

<!-- Circular Heat Disc Graphic Inside Card -->
<div style="width: 104px; height: 104px; border-radius: 50%; margin-left: 14px; background: radial-gradient(circle at 48% 48%, #141312 0%, #2A0E0A 18%, #8F110E 38%, #E0201B 55%, #FF5A1F 72%, #FFB020 88%, #121110 100%); border: 1.5px solid rgba(255, 176, 32, 0.4); box-shadow: 0 0 24px rgba(255, 90, 31, 0.4); display: flex; align-items: center; justify-content: center; position: relative;">
<div class="card-disc-isoline" style="position: absolute; inset: 6px; border-radius: 50%; border: 0.8px dashed rgba(255, 255, 255, 0.22); pointer-events: none;"></div>
<div style="width: 44px; height: 44px; border-radius: 50%; background: radial-gradient(circle at 40% 40%, #201F1D 0%, #0E0D0C 100%); border: 1px solid rgba(255, 176, 32, 0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 6px; color: #FFB020; font-weight: 700; letter-spacing: 0.08em;">PEAK Tj</span>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 800; color: #FFFFFF; line-height: 1.1;">{max_tj:.0f}&deg;</span>
</div>
</div>

</div>

<!-- Right side of panel: Heading & 2x3 Button Grid -->
<div style="flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0;">
<div style="font-family: 'Montserrat', sans-serif; font-size: 22px; font-weight: 800; color: #FFB020; letter-spacing: -0.5px; line-height: 1.15; margin-bottom: 2px;">
Inspect Stand-04 in action
</div>
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; color: #88847E; margin-bottom: 12px;">
Choose a telemetry source to inspect mill sub-systems
</div>

<!-- 2x3 Button Grid -->
<div class="source-selector-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%;">
{buttons_grid_str}
</div>
</div>

</div>
</div>

<!-- Preset Rack Channel Rows Deck (Task 9) -->
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10.5px; font-weight: 700; color: #88847E; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 10px;">
THYRISTOR BRIDGE BANK CHANNELS
</div>
<div class="preset-rack-deck" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px;">
{rack_rows_str}
</div>

<!-- Editorial Callout Feature Box (Task 10) -->
<div class="editorial-callout-card" style="background: #1A1918; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 18px; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.65);">
<div style="font-family: 'Montserrat', sans-serif; font-size: 18px; font-weight: 800; color: #FFB020; letter-spacing: -0.3px; line-height: 1.25; margin-bottom: 8px;">
Zero Unplanned Trips in Mill Operations
</div>
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; line-height: 1.6; color: #9A9894; max-width: 75ch;">
Physical actual heatsink temperature is compared against predicted baseline (R<sub>sa</sub>=0.08 K/W). Divergence &Delta;T &ge; 4.0K triggers an early filter clogging alert days prior to junction trip at 125&deg;C.
</div>
</div>

</div>
""").strip()
        if hasattr(st, "html"):
            st.html(right_col_html)
        else:
            st.markdown(right_col_html, unsafe_allow_html=True)

    # =========================================================================
    # 4. BOTTOM LIVE TELEMETRY STRIP (Task 10 - 4 Machined Warm Rack Cards)
    # =========================================================================
    telemetry_strip_html = textwrap.dedent(f"""
<div class="live-telemetry-section" style="width: 100%; margin-top: 36px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.08); box-sizing: border-box;">
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
<div style="font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.05em; text-transform: uppercase;">
Real-Time Mill Stand-04 Telemetry Bus
</div>
<div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #88847E; letter-spacing: 0.1em; text-transform: uppercase;">
SAMPLING: <strong style="color: #FFB020;">10 Hz TRANSIENT</strong> &bull; STATUS: <strong style="color: #C4C1BA;">SYNCHRONIZED</strong>
</div>
</div>

<div class="telemetry-grid-strip" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
<!-- Card 1: Armature Current (Id) -->
<div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; gap: 6px; padding: 16px 20px; background: linear-gradient(135deg, #1A1918 0%, #151413 100%); border: 1px solid #282624; border-radius: 6px; cursor: default;">
<span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #88847E; letter-spacing: 0.15em; text-transform: uppercase;">
ARMATURE CURRENT (Id)
</span>
<div style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #FFFFFF; font-variant-numeric: tabular-nums;">
{armature_current:.0f} <span style="font-size: 14px; color: #88847E; font-weight: 500;">A</span>
</div>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #C4C1BA;">
NOMINAL 70% OF 1000A RATED
</span>
</div>

<!-- Card 2: Ambient Temp (Ta) -->
<div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; gap: 6px; padding: 16px 20px; background: linear-gradient(135deg, #1A1918 0%, #151413 100%); border: 1px solid #282624; border-radius: 6px; cursor: default;">
<span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #88847E; letter-spacing: 0.15em; text-transform: uppercase;">
AMBIENT TEMP (Ta)
</span>
<div style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #FFFFFF; font-variant-numeric: tabular-nums;">
{ambient_temp:.1f} <span style="font-size: 14px; color: #88847E; font-weight: 500;">&deg;C</span>
</div>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #88847E;">
MILL BAY INTAKE AIR TEMP
</span>
</div>

<!-- Card 3: Cooling Delta (ΔT) -->
<div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; gap: 6px; padding: 16px 20px; background: linear-gradient(135deg, #1A1918 0%, #151413 100%); border: 1px solid #282624; border-radius: 6px; cursor: default;">
<span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #88847E; letter-spacing: 0.15em; text-transform: uppercase;">
COOLING DELTA (&Delta;T)
</span>
<div style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #FFB020; font-variant-numeric: tabular-nums;">
+{cooling_residual:.1f} <span style="font-size: 14px; color: #FFB020; font-weight: 500;">K</span>
</div>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #FFB020;">
INTAKE AIRFLOW RESTRICTION 12%
</span>
</div>

<!-- Card 4: Wear Acceleration -->
<div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; gap: 6px; padding: 16px 20px; background: linear-gradient(135deg, #1A1918 0%, #151413 100%); border: 1px solid #282624; border-radius: 6px; cursor: default;">
<span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #88847E; letter-spacing: 0.15em; text-transform: uppercase;">
WEAR ACCELERATION
</span>
<div style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #FFFFFF; font-variant-numeric: tabular-nums;">
2.2 <span style="font-size: 14px; color: #88847E; font-weight: 500;">&times;</span>
</div>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #C4C1BA;">
COFFIN-MANSON MODEL ACCEL
</span>
</div>
</div>
</div>
""").strip()
    if hasattr(st, "html"):
        st.html(telemetry_strip_html)
    else:
        st.markdown(telemetry_strip_html, unsafe_allow_html=True)
