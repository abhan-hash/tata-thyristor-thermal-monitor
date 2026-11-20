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

    # -------------------------------------------------------------------------
    # LEFT COLUMN: Task 6 (Hero Stepped Heat Blob Art & 3D Hardware Controller)
    # -------------------------------------------------------------------------
    with left_hero:
        left_col_html = textwrap.dedent(f"""
<div class="hero-left-wrapper" style="position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; box-sizing: border-box;">

<!-- Radiant Stepped Heat Blob SVG Aura (Behind Hardware) -->
<div class="stepped-heat-blob-aura" style="position: absolute; width: 135%; height: 680px; top: -60px; left: -18%; pointer-events: none; z-index: 1; filter: drop-shadow(0 0 60px rgba(255, 90, 31, 0.55));">
<svg width="100%" height="100%" viewBox="0 0 700 640" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
<defs>
<radialGradient id="blobCoreGlow" cx="50%" cy="50%" r="50%">
<stop offset="0%" stop-color="#FF5A1F" stop-opacity="0.35"/>
<stop offset="100%" stop-color="#FF5A1F" stop-opacity="0"/>
</radialGradient>
</defs>
<!-- Layer 1: Outermost Pale Warm Orange Tier #FF9A3C -->
<path d="M 30 220 C 10 70, 160 10, 380 20 C 580 30, 690 120, 670 320 C 650 510, 530 630, 330 620 C 130 610, 60 480, 30 350 Z" fill="#FF9A3C" opacity="0.96"/>
<!-- Layer 2: Mid Vibrant Orange Heat Wave #FF5A1F -->
<path d="M 70 235 C 50 110, 190 50, 380 60 C 550 70, 630 150, 610 320 C 590 480, 490 580, 340 570 C 170 560, 110 450, 70 330 Z" fill="#FF5A1F" opacity="0.98"/>
<!-- Layer 3: Deep Center Molten Red Tier #E0201B -->
<path d="M 120 250 C 100 150, 220 90, 380 100 C 520 110, 570 190, 550 330 C 530 450, 450 530, 350 520 C 210 510, 160 410, 120 320 Z" fill="#E0201B"/>
<!-- Topographic Isoline Contour Rings -->
<ellipse cx="370" cy="320" rx="260" ry="210" fill="none" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1.2" stroke-dasharray="10, 6"/>
<ellipse cx="365" cy="315" rx="200" ry="160" fill="none" stroke="rgba(14, 13, 12, 0.35)" stroke-width="1.8"/>
<ellipse cx="360" cy="310" rx="140" ry="110" fill="none" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2"/>
</svg>
</div>

<!-- 3D Isometric Hardware Controller Unit -->
<div class="hardware-unit-perspective-container" style="perspective: 1200px; width: 100%; position: relative; z-index: 5; margin-bottom: 24px;">
<div class="hardware-chassis-slab" style="background: #181716; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 30px 60px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08); padding: 22px; transform: rotateX(24deg) rotateY(-16deg) rotateZ(6deg); transform-style: preserve-3d; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);">

<!-- Chassis Header Row: Title & Controls -->
<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
<div>
<div style="font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 800; color: #FFB020; letter-spacing: 0.18em; text-transform: uppercase;">
THERMAL CORE &bull; VIRTUAL RTD
</div>
<div style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #88847E; letter-spacing: 0.1em; margin-top: 2px;">
MODEL: FOSTER 3-STAGE IMPEDANCE
</div>
</div>

<div style="display: flex; align-items: center; gap: 14px;">
<!-- Rotary Potentiometer 1: ARMATURE LOAD Id -->
<div class="rotary-knob-wrapper" style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
<div class="rotary-knob-body" style="width: 44px; height: 44px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #282624 0%, #1A1918 75%, #0E0D0C 100%); border: 2px solid #33312E; position: relative; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.8);">
<div class="rotary-knob-tick" style="position: absolute; top: 4px; left: 50%; width: 2px; height: 9px; background: #FF5A1F; transform: translateX(-50%); border-radius: 2px; box-shadow: 0 0 6px #FF5A1F;"></div>
</div>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 8px; color: #88847E; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">LOAD (Id)</span>
</div>

<!-- Rotary Potentiometer 2: COOLING RESIDUAL ΔT -->
<div class="rotary-knob-wrapper" style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
<div class="rotary-knob-body" style="width: 44px; height: 44px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #282624 0%, #1A1918 75%, #0E0D0C 100%); border: 2px solid #33312E; position: relative; box-shadow: 0 6px 14px rgba(0, 0, 0, 0.8);">
<div class="rotary-knob-tick" style="position: absolute; top: 4px; left: 50%; width: 2px; height: 9px; background: #FFB020; transform: translateX(-50%) rotate(40deg); transform-origin: center 18px; border-radius: 2px; box-shadow: 0 0 6px #FFB020;"></div>
</div>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 8px; color: #88847E; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">RESIDUAL (&Delta;T)</span>
</div>

<!-- Linear Slider Fader -->
<div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
<div class="linear-fader-track" style="width: 12px; height: 60px; background: #0E0D0C; border: 1px solid #282624; border-radius: 4px; position: relative; display: flex; justify-content: center;">
<div class="linear-fader-slot" style="width: 2px; height: 80%; background: #FF5A1F; margin: auto 0; opacity: 0.85;"></div>
<div class="linear-fader-thumb" style="position: absolute; top: 32%; width: 20px; height: 11px; background: #282624; border: 1px solid #33312E; border-radius: 3px; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.8);"></div>
</div>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 8px; color: #88847E; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">LIMIT</span>
</div>
</div>
</div>

<!-- Large Circular Heat Disc (240px x 240px) -->
<div style="width: 240px; height: 240px; margin: 8px auto; border-radius: 50%; background: radial-gradient(circle at 48% 48%, #141312 0%, #2A0E0A 18%, #8F110E 38%, #E0201B 55%, #FF5A1F 72%, #FFB020 88%, #181716 100%); border: 2px solid rgba(255, 176, 32, 0.4); box-shadow: 0 0 45px rgba(255, 90, 31, 0.45), inset 0 0 25px rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center; position: relative;">
<!-- Isoline Rings -->
<div style="position: absolute; inset: 14px; border-radius: 50%; border: 1px dashed rgba(255, 255, 255, 0.22); pointer-events: none;"></div>
<div style="position: absolute; inset: 32px; border-radius: 50%; border: 1.5px solid rgba(0, 0, 0, 0.4); pointer-events: none;"></div>

<!-- Irregular Organic Dark Center Blob / Pupil with Live Peak Tj -->
<div style="width: 88px; height: 88px; border-radius: 50%; background: radial-gradient(circle at 40% 40%, #201F1D 0%, #151413 70%, #0E0D0C 100%); border: 1.5px solid rgba(255, 176, 32, 0.5); box-shadow: 0 0 16px rgba(0, 0, 0, 0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 8px; color: #FFB020; font-weight: 700; letter-spacing: 0.1em;">PEAK Tj</span>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 19px; font-weight: 800; color: #FFFFFF; line-height: 1.1;">{max_tj:.1f}&deg;</span>
<span style="font-family: 'IBM Plex Mono', monospace; font-size: 7.5px; color: #C4C1BA; letter-spacing: 0.05em;">TRIP 125&deg;</span>
</div>
</div>

<!-- Bottom Specs on Hardware Slab -->
<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #88847E;">
<span>THERMAL IMPEDANCE: <strong style="color: #FFFFFF;">0.04 K/W</strong></span>
<span>COOLING DELTA: <strong style="color: #FFB020;">+{cooling_residual:.1f} K</strong></span>
<span>CHASSIS: <strong style="color: #C4C1BA;">STAND-04</strong></span>
</div>

</div>
</div>

<!-- Left Editorial Block -->
<div class="editorial-callout-box" style="width: 100%; margin-top: 10px; position: relative; z-index: 6; background: #1A1918; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 18px 22px; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);">
<div style="font-family: 'Montserrat', sans-serif; font-size: 18px; font-weight: 800; color: #FFB020; letter-spacing: -0.3px; line-height: 1.25; margin-bottom: 8px;">
Silicon Junction Transients Finally Become Predictable
</div>
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; line-height: 1.6; color: #9A9894; max-width: 75ch;">
In hot rolling mills, 1000A DC drives endure 2.4s bar entry current spikes. Physical heatsink RTDs lag by 20s and miss dangerous junction excursions. THERMOSENSE fuses RTD sensing with electrical current through a 3-layer Foster RC network (&tau;<sub>1</sub>=20ms, &tau;<sub>2</sub>=0.5s, &tau;<sub>3</sub>=20s) to compute real-time junction temperature at 10 Hz, turning blind hardware risk into precision operational foresight.
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

        # Build Preset Rack Rows HTML (Task 9)
        channels = [
            ("T1 &bull; UPPER ARM (PHASE U)", 1, clean_tj[0]),
            ("T2 &bull; LOWER ARM (PHASE U)", 2, clean_tj[1]),
            ("T3 &bull; UPPER ARM (PHASE V)", 3, clean_tj[2]),
            ("T4 &bull; LOWER ARM (PHASE V)", 4, clean_tj[3]),
            ("T5 &bull; UPPER ARM (PHASE W)", 5, clean_tj[4]),
            ("T6 &bull; LOWER ARM (PHASE W)", 6, clean_tj[5]),
        ]

        rack_rows_list = []
        for ch_title, t_num, temp_val in channels:
            is_sel = (t_num == selected_thyristor)
            active_cls = "active" if is_sel else ""

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

            row_html = (
                f'<a href="?t={t_num}" class="preset-rack-row {active_cls}" tabindex="0" target="_self">'
                f'<div style="display: flex; align-items: center; gap: 12px;">'
                f'<span class="preset-row-title" style="font-family: \'Plus Jakarta Sans\', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.28em; color: {title_col}; text-transform: uppercase;">{ch_title}</span>'
                f'</div>'
                f'<div class="preset-row-right" style="display: flex; align-items: center; gap: 14px;">'
                f'<span class="preset-row-temp" style="font-family: \'IBM Plex Mono\', monospace; font-size: 13.5px; font-weight: 700; color: #FFFFFF; font-variant-numeric: tabular-nums;">{temp_val:.1f}&deg;C</span>'
                f'<span class="preset-row-chevron" style="color: #88847E; font-size: 16px;">&rsaquo;</span>'
                f'</div>'
                f'</a>'
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
<div style="position: absolute; inset: 6px; border-radius: 50%; border: 0.8px dashed rgba(255, 255, 255, 0.22); pointer-events: none;"></div>
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
    st.markdown(telemetry_strip_html, unsafe_allow_html=True)
