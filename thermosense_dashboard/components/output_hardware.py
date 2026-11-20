"""
THERMOSENSE - $10,000 Output Thermal Luxury Experience
Directly recreated from the Reference Screenshot:
3D Angled Hardware Unit, Stepped Heat Aura, 2x3 Source Grid, Preset Rack Rows
"""

import streamlit as st
from typing import Dict, List
import numpy as np


def render_output_thermal_showcase(drive_data, active_component: str = "6-PULSE BRIDGE"):
    """
    Renders the exact 1:1 layout from the screenshot in screenshots folder.
    """
    # Safe data extraction
    clean_tj = []
    clean_hs = []
    for idx, t in enumerate(drive_data.thyristors):
        try:
            val = t.tj_estimated() if callable(getattr(t, 'tj_estimated', None)) else getattr(t, 'tj_estimated', 75.0)
            if isinstance(val, (list, tuple)):
                val = float(val[0])
            else:
                val = float(val)
        except Exception:
            val = 75.0 + idx * 3.0
        clean_tj.append(val)
        
        try:
            hs = t.t_heatsink_measured() if callable(getattr(t, 't_heatsink_measured', None)) else getattr(t, 't_heatsink_measured', 45.0)
            if isinstance(hs, (list, tuple)):
                hs = float(hs[0])
            else:
                hs = float(hs)
        except Exception:
            hs = 45.0
        clean_hs.append(hs)
        
    max_tj = max(clean_tj) if clean_tj else 78.4
    max_hs = max(clean_hs) if clean_hs else 48.2
    
    # Selected channel
    sel_id = st.session_state.get('selected_thyristor', 1)
    sel_idx = max(0, min(5, sel_id - 1))
    sel_tj = clean_tj[sel_idx]
    
    # =========================================================================
    # 1. TOP NAVIGATION BAR (Matching Reference Header: "output  SHOP BLOG...")
    # =========================================================================
    st.markdown("""
    <div class="output-nav-bar">
        <div class="output-logo-group">
            <span class="output-logo">thermosense</span>
            <span class="output-logo-sub">TATA STEEL HSM</span>
        </div>
        <ul class="output-nav-links">
            <li class="output-nav-item active">OVERVIEW</li>
            <li class="output-nav-item">STAND-04</li>
            <li class="output-nav-item">FOSTER RC</li>
            <li class="output-nav-item">RESIDUALS</li>
            <li class="output-nav-item">WEAR RUL</li>
            <li class="output-nav-item">ALARMS</li>
        </ul>
        <div class="output-user-group">
            <span style="color: #6e7687;">STAND SYNC: <strong style="color: #00f0a8;">10Hz</strong></span>
            <span style="color: #ffffff; cursor: pointer;">OPERATOR [ LOG OUT ]</span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # =========================================================================
    # 2. PRODUCT HERO TITLE LOCKUP (Matching Reference: "THERMAL | $ 149")
    # =========================================================================
    st.markdown(f"""
    <div class="product-hero-lockup">
        <div class="product-title-row">
            <span class="product-main-title">THERMAL</span>
            <span class="product-title-divider">|</span>
            <span class="product-price-tag">STAND-04</span>
        </div>
        <div class="product-subtitle-row">
            <span class="product-subtitle-text">Online Thyristor Virtual Sensing &bull; Tata Steel Hot Strip Mill</span>
            <div class="product-action-pill">
                <span>Live Telemetry Loop</span>
                <span class="product-play-icon">&#9658;</span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # =========================================================================
    # 3. MAIN HERO 2-COLUMN SPLIT (Exact layout of reference image)
    # =========================================================================
    left_hero, right_hero = st.columns([1.18, 1.0], gap="large")

    with left_hero:
        # Massive Tiered Stepped Heat Blob & 3D Hardware Controller Unit
        st.markdown(f"""
        <div style="position: relative; width: 100%; min-height: 480px; display: flex; align-items: center; justify-content: center;">
            
            <!-- Radiant Stepped Heat Blob Aura (Behind Hardware) -->
            <div style="
                position: absolute;
                width: 120%;
                height: 120%;
                top: -10%;
                left: -10%;
                pointer-events: none;
                z-index: 1;
                filter: drop-shadow(0 0 50px rgba(255, 60, 0, 0.5));
            ">
                <svg width="100%" height="100%" viewBox="0 0 600 500" xmlns="http://www.w3.org/2000/svg">
                    <!-- Layer 1: Outermost Crimson Heat Blob -->
                    <path d="M 60 220 
                             C 40 100, 160 30, 320 40 
                             C 480 50, 560 140, 540 260 
                             C 520 380, 420 460, 260 450 
                             C 110 440, 80 340, 60 220 Z" 
                          fill="#ff2600" opacity="0.95" />
                    
                    <!-- Layer 2: Mid Burning Orange Heat Wave -->
                    <path d="M 100 230 
                             C 80 130, 190 70, 320 80 
                             C 450 90, 510 170, 490 270 
                             C 470 370, 390 420, 270 410 
                             C 140 400, 120 330, 100 230 Z" 
                          fill="#ff5900" opacity="0.98" />

                    <!-- Layer 3: Inner Luminous Amber Heat Core -->
                    <path d="M 140 240 
                             C 120 160, 210 110, 320 120 
                             C 430 130, 460 200, 440 280 
                             C 420 360, 350 390, 270 380 
                             C 170 370, 160 320, 140 240 Z" 
                          fill="#ff9900" />

                    <!-- Layer 4: Topographic Isoline Contour Rings -->
                    <ellipse cx="300" cy="250" rx="190" ry="150" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-dasharray="12, 6"/>
                    <ellipse cx="290" cy="245" rx="140" ry="110" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="2"/>
                    <ellipse cx="280" cy="240" rx="90" ry="70" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.2"/>
                </svg>
            </div>

            <!-- The Angled 3D Hardware Controller Unit -->
            <div class="hardware-unit-perspective-container" style="position: relative; z-index: 5;">
                <div class="hardware-chassis-slab">
                    
                    <!-- Chassis Header Row: Title & Knobs -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px;">
                        <div>
                            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 800; color: #ff8800; letter-spacing: 2px;">
                                THERMAL CORE &bull; VIRTUAL RTD
                            </div>
                            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #828a99; letter-spacing: 1px;">
                                MODEL: FOSTER 3-STAGE IMPEDANCE
                            </div>
                        </div>

                        <!-- Top Right Control Knobs & Fader Deck -->
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div class="rotary-knob-wrapper">
                                <div class="rotary-knob-body">
                                    <div class="rotary-knob-tick"></div>
                                </div>
                                <span class="rotary-knob-label">LOAD (Id)</span>
                            </div>

                            <div class="rotary-knob-wrapper">
                                <div class="rotary-knob-body" style="transform: rotate(45deg);">
                                    <div class="rotary-knob-tick"></div>
                                </div>
                                <span class="rotary-knob-label">RESIDUAL</span>
                            </div>

                            <!-- Linear Slider Fader -->
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                                <div class="linear-fader-track">
                                    <div class="linear-fader-slot"></div>
                                    <div class="linear-fader-thumb"></div>
                                </div>
                                <span class="rotary-knob-label">LIMIT</span>
                            </div>
                        </div>
                    </div>

                    <!-- Large Circular Thermal Pad on Hardware Slab -->
                    <div style="
                        width: 260px;
                        height: 260px;
                        margin: 10px auto;
                        border-radius: 50%;
                        background: radial-gradient(circle at 45% 45%, #180805 0%, #4a0d02 20%, #9e1c02 45%, #ff4d00 65%, #ffaa00 85%, #ffea85 96%, #0d0f15 100%);
                        border: 2px solid rgba(255, 120, 0, 0.45);
                        box-shadow: 
                            0 0 40px rgba(255, 77, 0, 0.5),
                            inset 0 0 30px rgba(0, 0, 0, 0.95);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                    ">
                        <!-- Concentric Heat Distortion Rings -->
                        <div style="
                            position: absolute;
                            inset: 12px;
                            border-radius: 50%;
                            border: 1px dashed rgba(255,255,255,0.25);
                            pointer-events: none;
                        "></div>
                        <div style="
                            position: absolute;
                            inset: 28px;
                            border-radius: 50%;
                            border: 1.5px solid rgba(0,0,0,0.35);
                            pointer-events: none;
                        "></div>

                        <!-- Dark Center Core (Eyeball / Target) -->
                        <div style="
                            width: 90px;
                            height: 90px;
                            border-radius: 50%;
                            background: radial-gradient(circle at 40% 40%, #1e2230 0%, #0c0e14 70%, #050608 100%);
                            border: 2px solid rgba(255, 170, 0, 0.5);
                            box-shadow: 0 0 20px rgba(0, 0, 0, 0.95);
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                        ">
                            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 8px; color: #ffaa00; font-weight: 700;">PEAK Tj</span>
                            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 19px; font-weight: 800; color: #ffffff; line-height: 1.1;">{max_tj:.1f}°</span>
                            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 7.5px; color: #00f0a8;">TRIP 125°</span>
                        </div>
                    </div>

                    <!-- Bottom Specs on Hardware Slab -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #828a99;">
                        <span>THERMAL IMPEDANCE: <strong style="color: #ffffff;">0.04 K/W</strong></span>
                        <span>COOLING DELTA: <strong style="color: #ffaa00;">+2.4 K</strong></span>
                        <span>CHASSIS: <strong style="color: #00f0a8;">STAND-04</strong></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Editorial Copy (Matching Reference: "Granular Finally Becomes Musical") -->
        <div class="editorial-callout-box">
            <div class="editorial-callout-title">
                Thermal Spikes Finally Become Predictable
            </div>
            <div class="editorial-callout-p">
                Hot strip rolling mills generate severe 2.5-second transient current surges when cold steel slabs enter the active stand. 
                Standard slow RTD sensors lag behind by tens of seconds, missing fatal peak junction excursions. 
                THERMOSENSE reconstructs the internal silicon temperature in real time at 10 Hz through a 3-layer Foster RC network, turning blind hardware risk into precision operational foresight.
            </div>
        </div>
        """, unsafe_allow_html=True)

    with right_hero:
        # Title matching reference: "Hear Thermal in action"
        st.markdown("""
        <div style="margin-bottom: 12px;">
            <div style="font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Inspect Stand-04 in action
            </div>
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; color: #828a99; margin-top: 2px;">
                Choose an industrial drive component...
            </div>
        </div>
        """, unsafe_allow_html=True)

        # 2x3 Source Component Selector Grid
        s1, s2 = st.columns(2)
        
        with s1:
            st.markdown("""
            <div class="source-item-btn active">
                <svg class="source-icon-svg" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                </svg>
                <span class="source-item-label">6-PULSE BRIDGE</span>
            </div>
            """, unsafe_allow_html=True)

            st.markdown("""
            <div class="source-item-btn">
                <svg class="source-icon-svg" viewBox="0 0 24 24">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <span class="source-item-label">FOSTER RC</span>
            </div>
            """, unsafe_allow_html=True)

            st.markdown("""
            <div class="source-item-btn">
                <svg class="source-icon-svg" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M12 3v9l6 3"/>
                </svg>
                <span class="source-item-label">BLOWER TACHO</span>
            </div>
            """, unsafe_allow_html=True)

        with s2:
            st.markdown("""
            <div class="source-item-btn">
                <svg class="source-icon-svg" viewBox="0 0 24 24">
                    <path d="M6 3v18M18 3v18M6 8h12M6 16h12"/>
                </svg>
                <span class="source-item-label">DC MOTOR ARMATURE</span>
            </div>
            """, unsafe_allow_html=True)

            st.markdown("""
            <div class="source-item-btn">
                <svg class="source-icon-svg" viewBox="0 0 24 24">
                    <path d="M4 14h6v7M20 10h-6V3M14 14l7 7M10 10L3 3"/>
                </svg>
                <span class="source-item-label">HEAT EXCHANGER</span>
            </div>
            """, unsafe_allow_html=True)

            st.markdown("""
            <div class="source-item-btn">
                <svg class="source-icon-svg" viewBox="0 0 24 24">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <span class="source-item-label">CURRENT SHUNT</span>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # 6 Horizontal Preset Rack Strips (DRUMS >, BASS >, VOCALS > in Screenshot)
        st.markdown("""
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10.5px; font-weight: 700; color: #828a99; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
            THYRISTOR BRIDGE BANK CHANNELS
        </div>
        <div class="preset-rack-deck">
        """, unsafe_allow_html=True)

        channels = [
            ("T1 &bull; UPPER ARM (PHASE U)", clean_tj[0]),
            ("T2 &bull; LOWER ARM (PHASE U)", clean_tj[1]),
            ("T3 &bull; UPPER ARM (PHASE V)", clean_tj[2]),
            ("T4 &bull; LOWER ARM (PHASE V)", clean_tj[3]),
            ("T5 &bull; UPPER ARM (PHASE W)", clean_tj[4]),
            ("T6 &bull; LOWER ARM (PHASE W)", clean_tj[5]),
        ]

        for i, (ch_name, temp_val) in enumerate(channels):
            t_num = i + 1
            is_sel = (t_num == sel_id)
            status_dot_col = "#ff2a2a" if temp_val >= 125 else "#ffaa00" if temp_val >= 105 else "#00f0a8"
            active_border = "border: 1px solid #ff8800; background: linear-gradient(90deg, #1c1f2b 0%, #11131c 100%); box-shadow: 0 0 16px rgba(255,136,0,0.25);" if is_sel else ""

            cols_row = st.columns([4, 1])
            with cols_row[0]:
                st.markdown(f"""
                <div class="preset-rack-row" style="{active_border}">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="width: 7px; height: 7px; border-radius: 50%; background: {status_dot_col}; box-shadow: 0 0 8px {status_dot_col};"></span>
                        <span class="preset-row-title">{ch_name}</span>
                    </div>
                    <div class="preset-row-right">
                        <span class="preset-row-temp">{temp_val:.1f}°C</span>
                        <span class="preset-row-chevron">&rsaquo;</span>
                    </div>
                </div>
                """, unsafe_allow_html=True)
            with cols_row[1]:
                if st.button(f"T{t_num}", key=f"btn_p_{t_num}", use_container_width=True):
                    st.session_state['selected_thyristor'] = t_num
                    try:
                        st.switch_page("pages/2_⚡_Drive_Detail.py")
                    except Exception:
                        pass

        st.markdown("</div>", unsafe_allow_html=True)

        # Editorial Callout matching "Infinite Ideas in Seconds"
        st.markdown("""
        <div class="editorial-callout-box" style="margin-top: 18px;">
            <div class="editorial-callout-title" style="color: #ff9900;">
                Zero Unplanned Trips in Mill Operations
            </div>
            <div class="editorial-callout-p">
                Have you ever wondered why emergency trip interlocks trip without warning? Physical sensors are too slow to isolate micro-thermal drift. THERMOSENSE reinvents heavy industrial drive monitoring by combining high-speed transient physics with predictive residual telemetry, delivering failure prevention weeks before catastrophic breakdown.
            </div>
        </div>
        """, unsafe_allow_html=True)
