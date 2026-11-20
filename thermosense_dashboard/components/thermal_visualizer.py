"""
THERMOSENSE - Thermal Visualizer Component
Directly inspired by Output Thermal: Concentric Heat Blobs, Topographic Isolines,
Precision Hardware Dial with Real-Time Thyristor Thermal Mapping
"""

import streamlit as st
from typing import List, Optional
import numpy as np


def render_thermal_dial_svg(thyristors, selected_id: int = 1, size: int = 340) -> str:
    """
    Generate clean, bespoke SVG for the Output Thermal inspired circular thermal dial.
    Shows the 6 thyristors mapped to a 6-pulse bridge ring with live heat contour gradients.
    """
    # Extract temperatures safely
    temps = []
    for t in thyristors:
        try:
            val = t.tj_estimated() if callable(getattr(t, 'tj_estimated', None)) else getattr(t, 'tj_estimated', 75.0)
            if isinstance(val, (list, tuple)):
                val = float(val[0])
            else:
                val = float(val)
        except Exception:
            val = 75.0
        temps.append(val)
    
    max_tj = max(temps) if temps else 75.0
    selected_idx = max(0, min(5, selected_id - 1))
    sel_temp = temps[selected_idx] if temps else 75.0
    
    # Color mapping based on temperature
    if max_tj >= 125.0:
        core_glow = "#ff1e00"
        outer_aura = "rgba(255, 30, 0, 0.45)"
        status_text = "CRITICAL OVERHEAT"
        status_color = "#ff3b30"
    elif max_tj >= 105.0:
        core_glow = "#ff7700"
        outer_aura = "rgba(255, 119, 0, 0.35)"
        status_text = "ELEVATED THERMAL"
        status_color = "#ff9500"
    else:
        core_glow = "#ffaa00"
        outer_aura = "rgba(255, 170, 0, 0.25)"
        status_text = "THERMAL NOMINAL"
        status_color = "#00e5a3"

    center = size / 2
    r_disc = size * 0.44
    r_core = size * 0.22
    
    # 6 thyristor angular positions (0, 60, 120, 180, 240, 300 deg)
    angles_deg = [30, 90, 150, 210, 270, 330]
    labels = ["T1", "T2", "T3", "T4", "T5", "T6"]
    
    # Build thyristor node markers around perimeter
    nodes_svg = []
    for i, (ang, lbl, temp) in enumerate(zip(angles_deg, labels, temps)):
        rad = np.radians(ang - 90)
        nx = center + (r_disc - 18) * np.cos(rad)
        ny = center + (r_disc - 18) * np.sin(rad)
        
        # Color based on temp
        if temp >= 125.0:
            ncol = "#ff2a2a"
        elif temp >= 105.0:
            ncol = "#ff9900"
        else:
            ncol = "#00e5a3"
            
        is_sel = (i + 1 == selected_id)
        ring_stroke = "#ffffff" if is_sel else "rgba(255,255,255,0.2)"
        r_node = 11 if is_sel else 8
        
        nodes_svg.append(f"""
        <!-- Node {lbl} -->
        <circle cx="{nx:.1f}" cy="{ny:.1f}" r="{r_node+4}" fill="{ncol}" opacity="0.25" filter="url(#glow)"/>
        <circle cx="{nx:.1f}" cy="{ny:.1f}" r="{r_node}" fill="#0e1017" stroke="{ring_stroke}" stroke-width="{2 if is_sel else 1}"/>
        <circle cx="{nx:.1f}" cy="{ny:.1f}" r="{r_node-3}" fill="{ncol}"/>
        <text x="{nx:.1f}" y="{ny - 12:.1f}" fill="{ncol}" font-family="'IBM Plex Mono', monospace" font-size="8" font-weight="700" text-anchor="middle">{lbl}</text>
        <text x="{nx:.1f}" y="{ny + 19:.1f}" fill="#9aa2b1" font-family="'IBM Plex Mono', monospace" font-size="7" font-weight="600" text-anchor="middle">{temp:.0f}°</text>
        """)
    
    nodes_markup = "\n".join(nodes_svg)

    svg = f"""
    <svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; filter: drop-shadow(0 14px 28px rgba(0,0,0,0.8));">
      <defs>
        <!-- Thermal bloom glow filter -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Stepped thermal heat gradient -->
        <radialGradient id="heatGradient" cx="50%" cy="48%" r="50%">
          <stop offset="0%" stop-color="#140705" />
          <stop offset="22%" stop-color="#3d0a02" />
          <stop offset="42%" stop-color="#801200" />
          <stop offset="65%" stop-color="#ff3e00" />
          <stop offset="85%" stop-color="#ff8800" />
          <stop offset="97%" stop-color="#ffc83b" />
          <stop offset="100%" stop-color="#ffe8a3" />
        </radialGradient>

        <!-- Core dark plate gradient -->
        <radialGradient id="coreGradient" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#1c1f2b" />
          <stop offset="70%" stop-color="#0b0d12" />
          <stop offset="100%" stop-color="#050608" />
        </radialGradient>
      </defs>

      <!-- Ambient Organic Heat Aura (Stepped Output Thermal Contour) -->
      <path d="M {center-150} {center-40} 
               C {center-160} {center-120}, {center-70} {center-155}, {center+20} {center-145}
               C {center+110} {center-135}, {center+155} {center-70}, {center+145} {center+30}
               C {center+135} {center+125}, {center+60} {center+155}, {center-30} {center+145}
               C {center-115} {center+135}, {center-140} {center+40}, {center-150} {center-40} Z"
            fill="url(#heatGradient)" opacity="0.35" filter="url(#glow)"/>

      <!-- Outer Hardware Bezel -->
      <circle cx="{center}" cy="{center}" r="{r_disc + 16}" fill="#0a0c11" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />
      <circle cx="{center}" cy="{center}" r="{r_disc + 14}" fill="none" stroke="rgba(255, 100, 0, 0.15)" stroke-width="1" stroke-dasharray="3, 5" />

      <!-- Concentric Heat Rings (Contour Isolines) -->
      <circle cx="{center}" cy="{center}" r="{r_disc}" fill="url(#heatGradient)" />
      
      <!-- Topographic Contour Lines across Heat Pad -->
      <ellipse cx="{center+8}" cy="{center-5}" rx="{r_disc*0.82}" ry="{r_disc*0.78}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.2" stroke-dasharray="8, 4" />
      <ellipse cx="{center-5}" cy="{center+6}" rx="{r_disc*0.65}" ry="{r_disc*0.62}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.5" />
      <ellipse cx="{center+12}" cy="{center+10}" rx="{r_disc*0.48}" ry="{r_disc*0.44}" fill="none" stroke="rgba(255, 180, 0, 0.4)" stroke-width="1.2" />

      <!-- Center Metallic Core (Machined Obsidian Knob/Dial) -->
      <circle cx="{center}" cy="{center}" r="{r_core + 4}" fill="#07080b" stroke="rgba(255, 120, 0, 0.4)" stroke-width="2" />
      <circle cx="{center}" cy="{center}" r="{r_core}" fill="url(#coreGradient)" stroke="rgba(255,255,255,0.1)" stroke-width="1" />

      <!-- Crosshair / Precision Center Marks -->
      <line x1="{center-14}" y1="{center}" x2="{center-6}" y2="{center}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <line x1="{center+6}" y1="{center}" x2="{center+14}" y2="{center}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <line x1="{center}" y1="{center-14}" x2="{center}" y2="{center-6}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <line x1="{center}" y1="{center+6}" x2="{center}" y2="{center+14}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />

      <!-- Center Core Text Readouts -->
      <text x="{center}" y="{center-20}" fill="#ff8800" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" font-weight="800" letter-spacing="1.5" text-anchor="middle">PEAK TJ</text>
      <text x="{center}" y="{center+4}" fill="#ffffff" font-family="'IBM Plex Mono', monospace" font-size="20" font-weight="700" letter-spacing="-0.5" text-anchor="middle">{max_tj:.1f}°C</text>
      <text x="{center}" y="{center+18}" fill="{status_color}" font-family="'IBM Plex Mono', monospace" font-size="7.5" font-weight="600" letter-spacing="1" text-anchor="middle">{status_text}</text>

      <!-- Thyristor Bridge Nodes around the Perimeter -->
      {nodes_markup}
    </svg>
    """
    return svg


def render_thermal_hero_section(drive_data, selected_thyristor_id: int = 1):
    """
    Renders the complete luxury Output Thermal hero section.
    Left: Animated Thermal Pad & Concentric Rings.
    Right: Stand-04 Telemetry Deck & Thyristor Channel Selectors.
    """
    col_left, col_right = st.columns([1.1, 1.3], gap="medium")
    
    with col_left:
        # Thermal Dial Card
        st.markdown("""
        <div class="hardware-card" style="text-align: center; padding: 18px 12px; background: linear-gradient(165deg, #11131a 0%, #0a0c10 100%);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 8px;">
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #ff8800; letter-spacing: 1.5px; text-transform: uppercase;">
                    THERMAL FIELD CONTROLLER
                </div>
                <div class="thermal-pill normal" style="font-size: 9px; padding: 2px 8px;">
                    <span class="status-dot"></span> 6-PULSE BRIDGE
                </div>
            </div>
        """, unsafe_allow_html=True)
        
        # Render the custom SVG
        svg_code = render_thermal_dial_svg(drive_data.thyristors, selected_id=selected_thyristor_id, size=320)
        st.markdown(svg_code, unsafe_allow_html=True)
        
        st.markdown("""
            <div style="display: flex; justify-content: space-around; margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #828a99;">
                <span>MODEL: <strong style="color: #ffaa00;">FOSTER RC</strong></span>
                <span>STAND: <strong style="color: #ffffff;">MILL-04</strong></span>
                <span>RATE: <strong style="color: #00e5a3;">10 Hz</strong></span>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
    with col_right:
        # Telemetry & Channels Deck
        st.markdown("""
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #9aa2b1; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; display: flex; justify-content: space-between;">
            <span>BRIDGE BANK CHANNELS (T1 — T6)</span>
            <span style="color: #5e6676;">CLICK CHANNEL FOR DEEP DIVE</span>
        </div>
        """, unsafe_allow_html=True)
        
        phase_names = [
            "Upper Arm (Phase U)",
            "Lower Arm (Phase U)",
            "Upper Arm (Phase V)",
            "Lower Arm (Phase V)",
            "Upper Arm (Phase W)",
            "Lower Arm (Phase W)"
        ]
        
        for i, t in enumerate(drive_data.thyristors):
            phase = phase_names[i]
            status = getattr(t, 'status', 'normal')
            
            # Safe temperature extraction
            try:
                val = t.tj_estimated() if callable(getattr(t, 'tj_estimated', None)) else getattr(t, 'tj_estimated', 75.0)
                if isinstance(val, (list, tuple)):
                    val = float(val[0])
                else:
                    val = float(val)
            except Exception:
                val = 75.0
                
            try:
                hs_val = t.t_heatsink_measured() if callable(getattr(t, 't_heatsink_measured', None)) else getattr(t, 't_heatsink_measured', 45.0)
                if isinstance(hs_val, (list, tuple)):
                    hs_val = float(hs_val[0])
                else:
                    hs_val = float(hs_val)
            except Exception:
                hs_val = 45.0
                
            margin = 125.0 - val
            status_cls = "critical" if val >= 125 else "warning" if val >= 105 else "normal"
            margin_text = f"+{abs(margin):.1f}°C OVER" if margin < 0 else f"{margin:.1f}°C MARGIN"
            
            # Channel button / row
            cols_btn = st.columns([4, 1])
            with cols_btn[0]:
                st.markdown(f"""
                <div class="channel-row-item status-{status_cls}">
                    <div class="channel-title-group">
                        <span class="channel-id-badge">T{i+1}</span>
                        <div>
                            <div class="channel-name">{phase}</div>
                            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #6b7382;">
                                Ts: {hs_val:.1f}°C &bull; {margin_text}
                            </div>
                        </div>
                    </div>
                    <div class="channel-metrics-group">
                        <div class="channel-temp-readout">{val:.1f}°C</div>
                        <span class="channel-chevron">&rsaquo;</span>
                    </div>
                </div>
                """, unsafe_allow_html=True)
            with cols_btn[1]:
                if st.button(f"T{i+1}", key=f"hero_t_{i+1}", use_container_width=True):
                    st.session_state['selected_thyristor'] = i + 1
                    try:
                        st.switch_page("pages/2_⚡_Drive_Detail.py")
                    except Exception:
                        pass
