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
    Every line has ZERO leading spaces to prevent CommonMark code block parsing.
    """
    # Extract temperatures safely & clamp
    temps = []
    for t in thyristors:
        try:
            val = t.tj_estimated() if callable(getattr(t, 'tj_estimated', None)) else getattr(t, 'tj_estimated', 75.0)
            if isinstance(val, (list, tuple)):
                val = float(val[0])
            else:
                val = float(val)
            if not np.isfinite(val) or val < 20.0 or val > 135.0:
                val = 75.0
        except Exception:
            val = 75.0
        temps.append(min(125.0, max(45.0, val)))
    
    max_tj = max(temps) if temps else 75.0
    selected_idx = max(0, min(5, selected_id - 1))
    sel_temp = temps[selected_idx] if temps else 75.0
    
    # Color mapping based on temperature (Warm Hardware Tokens)
    if max_tj >= 125.0:
        core_glow = "#E0201B"
        outer_aura = "rgba(224, 32, 27, 0.45)"
        status_text = "CRITICAL OVERHEAT"
        status_color = "#E0201B"
    elif max_tj >= 105.0:
        core_glow = "#FF5A1F"
        outer_aura = "rgba(255, 90, 31, 0.35)"
        status_text = "ELEVATED THERMAL"
        status_color = "#FFB020"
    else:
        core_glow = "#FFB020"
        outer_aura = "rgba(255, 176, 32, 0.25)"
        status_text = "THERMAL NOMINAL"
        status_color = "#C4C1BA"

    center = size / 2
    r_disc = size * 0.44
    r_core = size * 0.22
    
    # 6 thyristor angular positions (0, 60, 120, 180, 240, 300 deg)
    angles_deg = [30, 90, 150, 210, 270, 330]
    labels = ["T1", "T2", "T3", "T4", "T5", "T6"]
    
    # Build thyristor node markers around perimeter (0 leading spaces)
    nodes_svg = []
    for i, (ang, lbl, temp) in enumerate(zip(angles_deg, labels, temps)):
        rad = np.radians(ang - 90)
        nx = center + (r_disc - 18) * np.cos(rad)
        ny = center + (r_disc - 18) * np.sin(rad)
        
        # Color based on temp (Strictly Warm Tokens)
        if temp >= 125.0:
            ncol = "#E0201B"
        elif temp >= 105.0:
            ncol = "#FFB020"
        else:
            ncol = "#C4C1BA"
            
        is_sel = (i + 1 == selected_id)
        ring_stroke = "#FFFFFF" if is_sel else "rgba(255,255,255,0.2)"
        r_node = 11 if is_sel else 8
        
        nodes_svg.append(f"""<circle cx="{nx:.1f}" cy="{ny:.1f}" r="{r_node+4}" fill="{ncol}" opacity="0.25" filter="url(#glow)"/>
<circle cx="{nx:.1f}" cy="{ny:.1f}" r="{r_node}" fill="#151413" stroke="{ring_stroke}" stroke-width="{2 if is_sel else 1}"/>
<circle cx="{nx:.1f}" cy="{ny:.1f}" r="{r_node-3}" fill="{ncol}"/>
<text x="{nx:.1f}" y="{ny - 12:.1f}" fill="{ncol}" font-family="'IBM Plex Mono', monospace" font-size="8" font-weight="700" text-anchor="middle">{lbl}</text>
<text x="{nx:.1f}" y="{ny + 19:.1f}" fill="#9A9894" font-family="'IBM Plex Mono', monospace" font-size="7" font-weight="600" text-anchor="middle">{temp:.0f}°</text>""")
    
    nodes_markup = "\n".join(nodes_svg)

    svg = f"""<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; filter: drop-shadow(0 14px 28px rgba(0,0,0,0.8));">
<defs>
<filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
<feGaussianBlur stdDeviation="8" result="blur" />
<feMerge>
<feMergeNode in="blur" />
<feMergeNode in="SourceGraphic" />
</feMerge>
</filter>
<radialGradient id="heatGradient" cx="50%" cy="48%" r="50%">
<stop offset="0%" stop-color="#140705" />
<stop offset="22%" stop-color="#3d0a02" />
<stop offset="42%" stop-color="#801200" />
<stop offset="65%" stop-color="#ff3e00" />
<stop offset="85%" stop-color="#ff8800" />
<stop offset="97%" stop-color="#ffc83b" />
<stop offset="100%" stop-color="#ffe8a3" />
</radialGradient>
<radialGradient id="coreGradient" cx="45%" cy="40%" r="60%">
<stop offset="0%" stop-color="#201F1D" />
<stop offset="70%" stop-color="#151413" />
<stop offset="100%" stop-color="#0E0D0C" />
</radialGradient>
</defs>
<path d="M {center-150} {center-40} C {center-160} {center-120}, {center-70} {center-155}, {center+20} {center-145} C {center+110} {center-135}, {center+155} {center-70}, {center+145} {center+30} C {center+135} {center+125}, {center+60} {center+155}, {center-30} {center+145} C {center-115} {center+135}, {center-140} {center+40}, {center-150} {center-40} Z" fill="url(#heatGradient)" opacity="0.35" filter="url(#glow)"/>
<circle cx="{center}" cy="{center}" r="{r_disc + 16}" fill="#0E0D0C" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />
<circle cx="{center}" cy="{center}" r="{r_disc + 14}" fill="none" stroke="rgba(255, 90, 31, 0.15)" stroke-width="1" stroke-dasharray="3, 5" />
<circle cx="{center}" cy="{center}" r="{r_disc}" fill="url(#heatGradient)" />
<ellipse cx="{center+8}" cy="{center-5}" rx="{r_disc*0.82}" ry="{r_disc*0.78}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.2" stroke-dasharray="8, 4" />
<ellipse cx="{center-5}" cy="{center+6}" rx="{r_disc*0.65}" ry="{r_disc*0.62}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.5" />
<ellipse cx="{center+12}" cy="{center+10}" rx="{r_disc*0.48}" ry="{r_disc*0.44}" fill="none" stroke="rgba(255, 176, 32, 0.4)" stroke-width="1.2" />
<circle cx="{center}" cy="{center}" r="{r_core + 4}" fill="#0E0D0C" stroke="rgba(255, 90, 31, 0.4)" stroke-width="2" />
<circle cx="{center}" cy="{center}" r="{r_core}" fill="url(#coreGradient)" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
<line x1="{center-14}" y1="{center}" x2="{center-6}" y2="{center}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
<line x1="{center+6}" y1="{center}" x2="{center+14}" y2="{center}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
<line x1="{center}" y1="{center-14}" x2="{center}" y2="{center-6}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
<line x1="{center}" y1="{center+6}" x2="{center}" y2="{center+14}" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
<text x="{center}" y="{center-20}" fill="#FFB020" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" font-weight="800" letter-spacing="1.5" text-anchor="middle">PEAK TJ</text>
<text x="{center}" y="{center+4}" fill="#FFFFFF" font-family="'IBM Plex Mono', monospace" font-size="20" font-weight="700" letter-spacing="-0.5" text-anchor="middle">{max_tj:.1f}°C</text>
<text x="{center}" y="{center+18}" fill="{status_color}" font-family="'IBM Plex Mono', monospace" font-size="7.5" font-weight="600" letter-spacing="1" text-anchor="middle">{status_text}</text>
{nodes_markup}
</svg>"""
    return svg
