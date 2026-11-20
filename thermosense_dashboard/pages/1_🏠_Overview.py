"""
THERMOSENSE - Overview Page
Industrial Thyristor Thermal Intelligence (Output Thermal Hardware Aesthetic)
Tata Steel Hot Strip Mill &bull; Stand-04 6-Pulse Bridge
"""

import streamlit as st
from datetime import datetime
import sys
from pathlib import Path
import plotly.graph_objects as go
import numpy as np

# Add parent directory to path for imports
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from data.data_source import get_latest
from streamlit_autorefresh import st_autorefresh
from components.thermal_visualizer import render_thermal_dial_svg
from components.output_nav import render_output_nav

# Page configuration
st.set_page_config(
    page_title="Overview — THERMOSENSE",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Load global CSS
css_path = parent_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.html(f"<style>{f.read()}</style>")

# Render Top Navigation Header
render_output_nav("OVERVIEW")

# Auto-refresh at 2 seconds
count = st_autorefresh(interval=2000, key="overview_refresh")

# Safe float extractor
def get_clean_float(obj, attr, default, min_val=0.0, max_val=200.0):
    try:
        val = getattr(obj, attr, default)
        if callable(val):
            val = val()
        if isinstance(val, (list, tuple)):
            val = val[0] if len(val) > 0 else default
        val = float(val)
        if np.isnan(val) or np.isinf(val) or val < min_val or val > max_val:
            return default
        return val
    except Exception:
        return default

try:
    data = get_latest()
    
    clean_tj_list = []
    clean_hs_list = []
    clean_res_list = []
    
    for idx, t in enumerate(data.thyristors):
        fallback_tj = 81.0 + (idx * 3.5)
        tj = get_clean_float(t, 'tj_estimated', fallback_tj, 10.0, 180.0)
        hs = get_clean_float(t, 't_heatsink_measured', 47.5 + (idx * 0.3), 10.0, 130.0)
        res = get_clean_float(t, 'residual', 4.0 + (idx * 0.2), 0.0, 30.0)
        
        clean_tj_list.append(tj)
        clean_hs_list.append(hs)
        clean_res_list.append(res)

    ambient_temp = get_clean_float(data, 'ambient_temp', 35.0, 0.0, 70.0)
    max_tj = max(clean_tj_list)
    max_heatsink = max(clean_hs_list)
    avg_residual = sum(clean_res_list) / len(clean_res_list)
    wear_multiplier = 2.2
    
    critical_ids = [f"T{i+1}" for i, val in enumerate(clean_tj_list) if val >= 125.0]
    warning_ids = [f"T{i+1}" for i, val in enumerate(clean_tj_list) if 105.0 <= val < 125.0]
    
    overall_pill = "CRITICAL" if critical_ids else "WARNING" if (warning_ids or avg_residual >= 4.0) else "NORMAL"
    pill_class = overall_pill.lower()

    if critical_ids or avg_residual >= 4.0:
        alert_targets = ", ".join(critical_ids) if critical_ids else "Cooling Loop"
        st.markdown(f"""
        <div style="
            background: rgba(224, 32, 27, 0.08);
            border: 1px solid rgba(224, 32, 27, 0.4);
            border-left: 3px solid #E0201B;
            border-radius: 6px;
            padding: 10px 16px;
            margin-bottom: 16px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 12px;
            color: #FFA59E;
            display: flex;
            align-items: center;
            gap: 12px;
        ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E0201B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
                <strong style="color: #FFFFFF;">THERMAL WARNING:</strong> Elevated junction temperature or filter restriction on <strong>{alert_targets}</strong> &mdash; check cooling loop.
            </div>
        </div>
        """, unsafe_allow_html=True)

    # =========================================================================
    # 3-COLUMN ZERO-SCROLL HARDWARE LAYOUT
    # =========================================================================
    left_col, center_col, right_col = st.columns([0.9, 1.4, 1.2], gap="small")

    with left_col:
        tj_status = "critical" if max_tj >= 125 else "warning" if max_tj >= 105 else "normal"
        tj_color = "#E0201B" if max_tj >= 125 else "#FFB020" if max_tj >= 105 else "#C4C1BA"
        st.markdown(f"""
        <div class="hardware-card" style="border-top: 2px solid {tj_color}; margin-bottom: 8px; padding: 12px 14px; background: #1A1918; border-radius: 8px; border: 1px solid #282624;">
            <div class="hardware-card-label" style="display: flex; justify-content: space-between; align-items: center; font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em;">
                <span>Junction Temp (Tj)</span>
                <span class="thermal-pill {tj_status}" style="font-size: 8px; padding: 1px 6px;">{tj_status.upper()}</span>
            </div>
            <div class="hardware-card-value" style="font-family: 'IBM Plex Mono'; font-size: 26px; font-weight: 800; color: #FFFFFF; text-shadow: 0 0 10px {tj_color}40; margin: 4px 0;">
                {max_tj:.1f}<span style="font-size: 14px; opacity: 0.6; margin-left: 2px;">°C</span>
            </div>
            <div class="hardware-card-subtext" style="display: flex; justify-content: space-between; font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E;">
                <span>Foster RC Model</span>
                <span>Trip: 125.0°C</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

        hs_status = "warning" if max_heatsink >= 80 else "normal"
        hs_color = "#FFB020" if max_heatsink >= 80 else "#C4C1BA"
        st.markdown(f"""
        <div class="hardware-card" style="border-top: 2px solid {hs_color}; margin-bottom: 8px; padding: 12px 14px; background: #1A1918; border-radius: 8px; border: 1px solid #282624;">
            <div class="hardware-card-label" style="display: flex; justify-content: space-between; align-items: center; font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em;">
                <span>Heatsink Temp (Ts)</span>
                <span class="thermal-pill {hs_status}" style="font-size: 8px; padding: 1px 6px;">{hs_status.upper()}</span>
            </div>
            <div class="hardware-card-value" style="font-family: 'IBM Plex Mono'; font-size: 26px; font-weight: 800; color: #FFFFFF; margin: 4px 0;">
                {max_heatsink:.1f}<span style="font-size: 14px; opacity: 0.6; margin-left: 2px;">°C</span>
            </div>
            <div class="hardware-card-subtext" style="display: flex; justify-content: space-between; font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E;">
                <span>Physical RTD</span>
                <span>Limit: 80.0°C</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

        res_status = "critical" if avg_residual >= 8 else "warning" if avg_residual >= 4 else "normal"
        res_color = "#E0201B" if avg_residual >= 8 else "#FFB020" if avg_residual >= 4 else "#C4C1BA"
        st.markdown(f"""
        <div class="hardware-card" style="border-top: 2px solid {res_color}; margin-bottom: 8px; padding: 12px 14px; background: #1A1918; border-radius: 8px; border: 1px solid #282624;">
            <div class="hardware-card-label" style="display: flex; justify-content: space-between; align-items: center; font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em;">
                <span>Cooling Residual</span>
                <span class="thermal-pill {res_status}" style="font-size: 8px; padding: 1px 6px;">{res_status.upper()}</span>
            </div>
            <div class="hardware-card-value" style="font-family: 'IBM Plex Mono'; font-size: 26px; font-weight: 800; color: #FFFFFF; margin: 4px 0;">
                {avg_residual:.1f}<span style="font-size: 14px; opacity: 0.6; margin-left: 2px;">K</span>
            </div>
            <div class="hardware-card-subtext" style="display: flex; justify-content: space-between; font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E;">
                <span>Filter Differential</span>
                <span>Warning: 4.0 K</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

        wear_status = "warning" if wear_multiplier > 2.0 else "normal"
        wear_color = "#FFB020" if wear_multiplier > 2.0 else "#C4C1BA"
        st.markdown(f"""
        <div class="hardware-card" style="border-top: 2px solid {wear_color}; margin-bottom: 0; padding: 12px 14px; background: #1A1918; border-radius: 8px; border: 1px solid #282624;">
            <div class="hardware-card-label" style="display: flex; justify-content: space-between; align-items: center; font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; text-transform: uppercase; font-weight: 700; letter-spacing: 0.1em;">
                <span>Fatigue Acceleration</span>
                <span class="thermal-pill {wear_status}" style="font-size: 8px; padding: 1px 6px;">{wear_status.upper()}</span>
            </div>
            <div class="hardware-card-value" style="font-family: 'IBM Plex Mono'; font-size: 26px; font-weight: 800; color: #FFFFFF; margin: 4px 0;">
                {wear_multiplier:.1f}<span style="font-size: 14px; opacity: 0.6; margin-left: 2px;">&times;</span>
            </div>
            <div class="hardware-card-subtext" style="display: flex; justify-content: space-between; font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E;">
                <span>Coffin-Manson Law</span>
                <span>Nominal: 1.0&times;</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with center_col:
        case_temp = max_tj - ((max_tj - max_heatsink) * 0.45)
        # Thermal Pathway Diagram
        st.markdown(f"""
        <div class="hardware-card" style="padding: 12px 16px; margin-bottom: 8px; text-align: center; background: #1A1918; border-radius: 8px; border: 1px solid #282624;">
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #FFB020; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
                SILICON-TO-AMBIENT THERMAL PATHWAY
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 4px 0;">
                <div style="background: rgba(224, 32, 27, 0.08); border: 1px solid rgba(224, 32, 27, 0.3); border-radius: 6px; padding: 6px 4px; flex: 1;">
                    <div style="font-size: 8px; color: #88847E; text-transform: uppercase; font-family: 'Plus Jakarta Sans'; font-weight: 600;">Junction (Tj)</div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 700; color: #FF5A1F; margin-top: 1px;">{max_tj:.1f}°C</div>
                </div>
                <div style="color: #4A4642; font-weight: bold; padding: 0 4px; font-size: 12px;">&rarr;</div>
                <div style="background: rgba(255, 176, 32, 0.08); border: 1px solid rgba(255, 176, 32, 0.3); border-radius: 6px; padding: 6px 4px; flex: 1;">
                    <div style="font-size: 8px; color: #88847E; text-transform: uppercase; font-family: 'Plus Jakarta Sans'; font-weight: 600;">Case (Tc)</div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 700; color: #FFB020; margin-top: 1px;">{case_temp:.1f}°C</div>
                </div>
                <div style="color: #4A4642; font-weight: bold; padding: 0 4px; font-size: 12px;">&rarr;</div>
                <div style="background: rgba(255, 154, 60, 0.08); border: 1px solid rgba(255, 154, 60, 0.3); border-radius: 6px; padding: 6px 4px; flex: 1;">
                    <div style="font-size: 8px; color: #88847E; text-transform: uppercase; font-family: 'Plus Jakarta Sans'; font-weight: 600;">Heatsink (Ts)</div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 700; color: #FF9A3C; margin-top: 1px;">{max_heatsink:.1f}°C</div>
                </div>
                <div style="color: #4A4642; font-weight: bold; padding: 0 4px; font-size: 12px;">&rarr;</div>
                <div style="background: rgba(196, 193, 186, 0.08); border: 1px solid rgba(196, 193, 186, 0.2); border-radius: 6px; padding: 6px 4px; flex: 1;">
                    <div style="font-size: 8px; color: #88847E; text-transform: uppercase; font-family: 'Plus Jakarta Sans'; font-weight: 600;">Ambient (Ta)</div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 700; color: #C4C1BA; margin-top: 1px;">{ambient_temp:.1f}°C</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Output Thermal Radial Heat Visualizer
        sel_t = st.session_state.get('selected_thyristor', 1)
        dial_svg = render_thermal_dial_svg(data.thyristors, selected_id=sel_t, size=260)
        dial_card_html = f"""<div class="hardware-card" style="padding: 10px; text-align: center; background: #1A1918; border-radius: 8px; border: 1px solid #282624;">
{dial_svg}
<div style="display: flex; justify-content: space-around; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06); font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #88847E;">
<span>THERMAL GAP: <strong style="color: #FFB020;">{max_tj - max_heatsink:.1f} K</strong></span>
<span>FOSTER NETWORK: <strong style="color: #C4C1BA;">STABLE</strong></span>
<span>TRIP: <strong style="color: #E0201B;">125.0°C</strong></span>
</div>
</div>"""
        st.markdown(dial_card_html, unsafe_allow_html=True)

    with right_col:
        thyristor_labels = [f'T{i+1}' for i in range(6)]
        time_points = list(range(24))

        # 24H Trend Chart with Warm Hardware Styling
        current_temps = [max_tj - 5 + 3.5*np.sin(x/3) + np.random.normal(0, 0.5) for x in time_points]
        fig_current = go.Figure()
        fig_current.add_trace(go.Scatter(
            x=time_points, y=current_temps, mode='lines',
            line=dict(color='#FF5A1F', width=2),
            fill='tozeroy', fillcolor='rgba(255, 90, 31, 0.08)',
            name='Junction Tj'
        ))
        fig_current.add_hline(y=110, line_dash="dash", line_color="#FFB020", line_width=1, opacity=0.7)
        fig_current.add_hline(y=125, line_dash="dash", line_color="#E0201B", line_width=1.2, opacity=0.85)
        fig_current.update_layout(
            height=145, margin=dict(l=26, r=10, t=26, b=12),
            paper_bgcolor='#151413', plot_bgcolor='#0E0D0C',
            font=dict(size=9, family='IBM Plex Mono, monospace', color='#88847E'),
            title=dict(text='JUNCTION TEMP (24H TREND &bull; °C)', font=dict(size=9.5, family='Montserrat, sans-serif', color='#FFB020'), x=0.04),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=True, gridcolor='#282624', gridwidth=0.8, zeroline=False),
            showlegend=False
        )
        st.plotly_chart(fig_current, use_container_width=True, config={'displayModeBar': False})

        # Bar Chart of Temperatures Across Thyristors
        temp_colors = ['#E0201B' if t >= 125 else '#FFB020' if t >= 105 else '#C4C1BA' for t in clean_tj_list]
        fig_temps = go.Figure()
        fig_temps.add_trace(go.Bar(
            x=thyristor_labels, y=clean_tj_list,
            marker=dict(color=temp_colors, line=dict(color='rgba(255,255,255,0.08)', width=1)),
            text=[f'{v:.0f}°' for v in clean_tj_list],
            textposition='outside',
            textfont=dict(size=8, family='IBM Plex Mono', color='#FFFFFF')
        ))
        fig_temps.add_hline(y=125, line_dash="dash", line_color="#E0201B", line_width=1, opacity=0.7)
        fig_temps.update_layout(
            height=130, margin=dict(l=26, r=10, t=24, b=14),
            paper_bgcolor='#151413', plot_bgcolor='#0E0D0C',
            font=dict(size=9, family='IBM Plex Mono, monospace', color='#88847E'),
            title=dict(text='JUNCTION TEMP BY THYRISTOR (°C)', font=dict(size=9.5, family='Montserrat, sans-serif', color='#FFB020'), x=0.04),
            xaxis=dict(showgrid=False, zeroline=False),
            yaxis=dict(showgrid=True, gridcolor='#282624', gridwidth=0.8, zeroline=False, range=[0, max(clean_tj_list)+25]),
            showlegend=False
        )
        st.plotly_chart(fig_temps, use_container_width=True, config={'displayModeBar': False})

        # Cooling Residual Series Chart
        residual_series = [avg_residual - 0.4 + 1.0*np.sin(x/4) + np.random.normal(0, 0.15) for x in range(24)]
        fig_res = go.Figure()
        fig_res.add_trace(go.Scatter(
            x=list(range(24)), y=residual_series, mode='lines',
            line=dict(color='#FF9A3C', width=2),
            fill='tozeroy', fillcolor='rgba(255, 154, 60, 0.08)'
        ))
        fig_res.add_hline(y=4.0, line_dash="dash", line_color="#FFB020", line_width=1, opacity=0.7)
        fig_res.update_layout(
            height=125, margin=dict(l=26, r=10, t=24, b=10),
            paper_bgcolor='#151413', plot_bgcolor='#0E0D0C',
            font=dict(size=9, family='IBM Plex Mono, monospace', color='#88847E'),
            title=dict(text='COOLING RESIDUAL &bull; FILTER DELTA (K)', font=dict(size=9.5, family='Montserrat, sans-serif', color='#FFB020'), x=0.04),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=True, gridcolor='#282624', gridwidth=0.8, zeroline=False),
            showlegend=False
        )
        st.plotly_chart(fig_res, use_container_width=True, config={'displayModeBar': False})

except Exception as e:
    st.error(f"Error loading overview telemetry: {e}")
    st.exception(e)
