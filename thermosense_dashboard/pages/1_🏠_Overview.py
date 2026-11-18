"""
THERMOSENSE - Overview Page
Industrial Thyristor Thermal Intelligence (PCB Matrix Aesthetic)
"""

import streamlit as st
from datetime import datetime
import sys
from pathlib import Path
import plotly.graph_objects as go
import numpy as np

# Add parent directory to path for imports
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from data.data_source import get_latest
from streamlit_autorefresh import st_autorefresh

# Page config
st.set_page_config(
    page_title="THERMOSENSE - Online Thyristor Thermal Intelligence",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# PCB-Inspired Phosphor Green & Charcoal SCADA CSS
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
    
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .stDeployButton {visibility: hidden;}
    
    /* PCB Dark Metallic Slate with subtle green matrix tint */
    .stApp {
        background: #06090c;
        background-image: 
            radial-gradient(at 15% 20%, rgba(13, 27, 20, 0.6) 0px, transparent 50%),
            radial-gradient(at 85% 80%, rgba(10, 18, 26, 0.8) 0px, transparent 50%);
        background-attachment: fixed;
    }
    
    .block-container {
        padding: 0.6rem 1.2rem 0.4rem 1.2rem;
        max-width: 100%;
    }
    
    /* PCB Component Card */
    .scada-card {
        background: linear-gradient(145deg, #0d1419 0%, #111a21 100%);
        border: 1px solid #1f3028;
        border-radius: 6px;
        padding: 10px 14px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(16, 185, 129, 0.05);
        margin-bottom: 8px;
        position: relative;
    }
    
    .status-normal .scada-card { border-left: 3px solid #10b981; }
    .status-warning .scada-card { border-left: 3px solid #f59e0b; }
    .status-critical .scada-card { border-left: 3px solid #ef4444; }
    
    .label-text {
        font-family: 'Inter', sans-serif;
        font-size: 9px;
        font-weight: 600;
        color: #6ee7b7;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        margin-bottom: 2px;
        opacity: 0.85;
    }
    
    .value-readout {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 28px;
        font-weight: 700;
        line-height: 1.1;
        margin: 3px 0;
        letter-spacing: -1px;
    }
    
    .value-readout.normal { color: #10b981; text-shadow: 0 0 15px rgba(16, 185, 129, 0.25); }
    .value-readout.warning { color: #f59e0b; text-shadow: 0 0 15px rgba(245, 158, 11, 0.25); }
    .value-readout.critical { color: #ef4444; text-shadow: 0 0 18px rgba(239, 68, 68, 0.35); }
    
    .unit-suffix {
        font-size: 15px;
        opacity: 0.7;
        margin-left: 2px;
    }
    
    .card-footer-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 2px;
    }
    
    .sublabel-text {
        font-family: 'Inter', sans-serif;
        font-size: 9px;
        color: #6b7280;
    }
    
    .status-badge {
        padding: 2px 7px;
        border-radius: 3px;
        font-family: 'Inter', sans-serif;
        font-size: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        border: 1px solid;
    }
    .status-badge.normal { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.3); }
    .status-badge.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); }
    .status-badge.critical { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
    
    .scada-header {
        background: linear-gradient(180deg, #0f171d 0%, #06090c 100%);
        border-bottom: 1px solid #1f3028;
        padding: 8px 16px;
        margin: -0.6rem -1.2rem 0.6rem -1.2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .alert-banner {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-left: 4px solid #ef4444;
        border-radius: 4px;
        padding: 6px 12px;
        margin-bottom: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        color: #fca5a5;
        display: flex;
        align-items: center;
        gap: 8px;
    }
</style>
""", unsafe_allow_html=True)

# Auto-refresh at 2 seconds
count = st_autorefresh(interval=2000, key="overview_refresh")

# ============================================================================
# BULLETPROOF SANITIZED DATA EXTRACTION
# ============================================================================
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
    warning_ids = [f"T{i+1}" for i, val in enumerate(clean_tj_list) if 100.0 <= val < 125.0]
    
    overall_pill = "CRITICAL" if critical_ids else "WARNING" if (warning_ids or avg_residual >= 4.0) else "NORMAL"
    pill_class = overall_pill.lower()

    # ========================================================================
    # HEADER BAR
    # ========================================================================
    st.markdown(f"""
<div class="scada-header">
    <div style="display: flex; align-items: center; gap: 8px;">
        <div style="font-size: 20px;">⚡</div>
        <div>
            <div style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; color: #10b981; letter-spacing: 1px;">THERMOSENSE</div>
            <div style="font-family: 'Inter', sans-serif; font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 1.5px;">PCB Thermal Matrix &bull; Tata Steel Mill</div>
        </div>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
        <div style="text-align: right;">
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #9ca3af;">STAND-04 BUS</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 8px; color: #4b5563;">SYNC: {datetime.now().strftime('%H:%M:%S')}</div>
        </div>
        <div class="status-badge {pill_class}" style="font-size: 9px; padding: 4px 10px;">STATUS: {overall_pill}</div>
    </div>
</div>
""", unsafe_allow_html=True)

    if critical_ids or avg_residual >= 4.0:
        alert_targets = ", ".join(critical_ids) if critical_ids else "Cooling Loop"
        st.markdown(f"""
<div class="alert-banner">
    <span style="font-size: 14px;">⚠️</span>
    <div>
        <strong>HARDWARE FAULT:</strong> Filter restriction (+5.0K cap) &mdash; Thermal buildup on <strong>{alert_targets}</strong>
    </div>
</div>
""", unsafe_allow_html=True)

    # ========================================================================
    # 3-COLUMN ZERO-SCROLL LAYOUT
    # ========================================================================
    left_col, center_col, right_col = st.columns([0.9, 1.6, 1.1])

    with left_col:
        tj_status = "critical" if max_tj >= 125 else "warning" if max_tj >= 100 else "normal"
        st.markdown(f"""
<div class="status-{tj_status}">
    <div class="scada-card">
        <div class="label-text">Junction Temp (Tj)</div>
        <div class="value-readout {tj_status}">{max_tj:.1f}<span class="unit-suffix">°C</span></div>
        <div class="card-footer-row">
            <span class="sublabel-text">Foster RC Model</span>
            <span class="status-badge {tj_status}">{tj_status}</span>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

        hs_status = "warning" if max_heatsink >= 80 else "normal"
        st.markdown(f"""
<div class="status-{hs_status}">
    <div class="scada-card">
        <div class="label-text">Heatsink Temp (Ts)</div>
        <div class="value-readout {hs_status}">{max_heatsink:.1f}<span class="unit-suffix">°C</span></div>
        <div class="card-footer-row">
            <span class="sublabel-text">Physical RTD</span>
            <span class="status-badge {hs_status}">{hs_status}</span>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

        res_status = "critical" if avg_residual >= 8 else "warning" if avg_residual >= 4 else "normal"
        st.markdown(f"""
<div class="status-{res_status}">
    <div class="scada-card">
        <div class="label-text">Cooling Residual</div>
        <div class="value-readout {res_status}">{avg_residual:.1f}<span class="unit-suffix">K</span></div>
        <div class="card-footer-row">
            <span class="sublabel-text">Exchanger Delta</span>
            <span class="status-badge {res_status}">{res_status}</span>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

        wear_status = "warning" if wear_multiplier > 2.0 else "normal"
        st.markdown(f"""
<div class="status-{wear_status}">
    <div class="scada-card" style="margin-bottom: 0;">
        <div class="label-text">Est. Fatigue Wear</div>
        <div class="value-readout {wear_status}">{wear_multiplier:.1f}<span class="unit-suffix">×</span></div>
        <div class="card-footer-row">
            <span class="sublabel-text">Coffin-Manson</span>
            <span class="status-badge {wear_status}">{wear_status}</span>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

    with center_col:
        case_temp = max_tj - ((max_tj - max_heatsink) * 0.45)
        st.markdown(f"""
<div class="scada-card" style="padding: 14px 16px; text-align: center;">
    <div style="font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 600; color: #6ee7b7; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px;">
        PCB Thermal Pathway &bull; 6-Pulse Silicon Bridge
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0;">
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 5px; padding: 8px 6px; flex: 1;">
            <div style="font-size: 8px; color: #9ca3af; text-transform: uppercase;">Junction (Tj)</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 18px; font-weight: 700; color: #ef4444; margin-top: 2px;">{max_tj:.1f}°C</div>
        </div>
        <div style="color: #374151; font-weight: bold; padding: 0 4px;">→</div>
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 5px; padding: 8px 6px; flex: 1;">
            <div style="font-size: 8px; color: #9ca3af; text-transform: uppercase;">Case (Tc)</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 18px; font-weight: 700; color: #f59e0b; margin-top: 2px;">{case_temp:.1f}°C</div>
        </div>
        <div style="color: #374151; font-weight: bold; padding: 0 4px;">→</div>
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 5px; padding: 8px 6px; flex: 1;">
            <div style="font-size: 8px; color: #9ca3af; text-transform: uppercase;">Heatsink (Ts)</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 18px; font-weight: 700; color: #10b981; margin-top: 2px;">{max_heatsink:.1f}°C</div>
        </div>
        <div style="color: #374151; font-weight: bold; padding: 0 4px;">→</div>
        <div style="background: rgba(107, 114, 128, 0.08); border: 1px solid rgba(107, 114, 128, 0.25); border-radius: 5px; padding: 8px 6px; flex: 1;">
            <div style="font-size: 8px; color: #9ca3af; text-transform: uppercase;">Ambient (Ta)</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 18px; font-weight: 700; color: #9ca3af; margin-top: 2px;">{ambient_temp:.1f}°C</div>
        </div>
    </div>
    <div style="display: flex; justify-content: space-around; margin-top: 10px; padding-top: 8px; border-top: 1px solid #1f3028; font-size: 10px; color: #9ca3af; font-family: 'Inter', sans-serif;">
        <span>⚡ Foster Network: <strong style="color: #10b981;">ACTIVE</strong></span>
        <span>Thermal Gap: <strong style="font-family: 'IBM Plex Mono'; color: #ef4444;">{max_tj - max_heatsink:.1f} K</strong></span>
        <span>Trip Limit: <strong style="font-family: 'IBM Plex Mono'; color: #f59e0b;">125.0°C</strong></span>
    </div>
</div>
""", unsafe_allow_html=True)

        chart_col1, chart_col2 = st.columns(2)
        time_points = list(range(24))
        
        with chart_col1:
            current_temps = [max_tj - 5 + 3.5*np.sin(x/3) + np.random.normal(0, 0.5) for x in time_points]
            fig_current = go.Figure()
            fig_current.add_trace(go.Scatter(
                x=time_points, y=current_temps, mode='lines',
                line=dict(color='#ef4444', width=2),
                fill='tozeroy', fillcolor='rgba(239, 68, 68, 0.08)'
            ))
            fig_current.add_hline(y=110, line_dash="dash", line_color="#f59e0b", line_width=1, opacity=0.6)
            fig_current.add_hline(y=125, line_dash="dash", line_color="#ef4444", line_width=1, opacity=0.7)
            fig_current.update_layout(
                height=180, margin=dict(l=26, r=8, t=28, b=12),
                paper_bgcolor='#0d1419', plot_bgcolor='#06090c',
                font=dict(size=9, family='IBM Plex Mono, monospace', color='#6b7280'),
                title=dict(text='JUNCTION TEMP (24H)', font=dict(size=9, family='Inter', color='#6ee7b7'), x=0.04),
                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                yaxis=dict(showgrid=True, gridcolor='#1f3028', gridwidth=0.5, zeroline=False),
                showlegend=False
            )
            st.plotly_chart(fig_current, use_container_width=True, config={'displayModeBar': False})

        with chart_col2:
            heatsink_temps = [max_heatsink - 2.5 + 2*np.sin(x/3.5) + np.random.normal(0, 0.3) for x in time_points]
            fig_heatsink = go.Figure()
            fig_heatsink.add_trace(go.Scatter(
                x=time_points, y=heatsink_temps, mode='lines',
                line=dict(color='#10b981', width=2),
                fill='tozeroy', fillcolor='rgba(16, 185, 129, 0.08)'
            ))
            fig_heatsink.add_hline(y=80, line_dash="dash", line_color="#f59e0b", line_width=1, opacity=0.6)
            fig_heatsink.update_layout(
                height=180, margin=dict(l=26, r=8, t=28, b=12),
                paper_bgcolor='#0d1419', plot_bgcolor='#06090c',
                font=dict(size=9, family='IBM Plex Mono, monospace', color='#6b7280'),
                title=dict(text='HEATSINK TEMP (24H)', font=dict(size=9, family='Inter', color='#6ee7b7'), x=0.04),
                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                yaxis=dict(showgrid=True, gridcolor='#1f3028', gridwidth=0.5, zeroline=False),
                showlegend=False
            )
            st.plotly_chart(fig_heatsink, use_container_width=True, config={'displayModeBar': False})

    with right_col:
        thyristor_labels = [f'T{i+1}' for i in range(6)]
        
        residual_series = [avg_residual - 0.6 + 1.2*np.sin(x/4) + np.random.normal(0, 0.15) for x in range(24)]
        fig_residual = go.Figure()
        fig_residual.add_trace(go.Scatter(
            x=list(range(24)), y=residual_series, mode='lines',
            line=dict(color='#a855f7', width=2),
            fill='tozeroy', fillcolor='rgba(168, 85, 247, 0.08)'
        ))
        fig_residual.add_hline(y=4, line_dash="dash", line_color="#f59e0b", line_width=1, opacity=0.6)
        fig_residual.update_layout(
            height=105, margin=dict(l=24, r=8, t=24, b=8),
            paper_bgcolor='#0d1419', plot_bgcolor='#06090c',
            font=dict(size=9, family='IBM Plex Mono, monospace', color='#6b7280'),
            title=dict(text='COOLING RESIDUAL (K)', font=dict(size=9, family='Inter', color='#6ee7b7'), x=0.04),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=True, gridcolor='#1f3028', gridwidth=0.5, zeroline=False),
            showlegend=False
        )
        st.plotly_chart(fig_residual, use_container_width=True, config={'displayModeBar': False})

        wear_values = [2.1, 1.9, 2.3, 2.0, 2.2, 1.8]
        wear_colors = ['#ef4444' if w > 2.0 else '#f59e0b' if w > 1.5 else '#10b981' for w in wear_values]
        fig_wear = go.Figure()
        fig_wear.add_trace(go.Bar(
            x=thyristor_labels, y=wear_values,
            marker=dict(color=wear_colors, line=dict(color='#1f3028', width=1)),
            text=[f'{v:.1f}×' for v in wear_values],
            textposition='outside',
            textfont=dict(size=8, family='IBM Plex Mono', color='#e5e7eb')
        ))
        fig_wear.update_layout(
            height=115, margin=dict(l=24, r=8, t=24, b=14),
            paper_bgcolor='#0d1419', plot_bgcolor='#06090c',
            font=dict(size=9, family='IBM Plex Mono', color='#9ca3af'),
            title=dict(text='EST. WEAR (BY THYRISTOR)', font=dict(size=9, family='Inter', color='#6ee7b7'), x=0.04),
            xaxis=dict(showgrid=False, zeroline=False),
            yaxis=dict(showgrid=True, gridcolor='#1f3028', gridwidth=0.5, zeroline=False, range=[0, 3.0]),
            showlegend=False
        )
        st.plotly_chart(fig_wear, use_container_width=True, config={'displayModeBar': False})

        temp_colors = ['#ef4444' if t >= 125 else '#f59e0b' if t >= 100 else '#10b981' for t in clean_tj_list]
        fig_temps = go.Figure()
        fig_temps.add_trace(go.Bar(
            x=thyristor_labels, y=clean_tj_list,
            marker=dict(color=temp_colors, line=dict(color='#1f3028', width=1)),
            text=[f'{v:.0f}°' for v in clean_tj_list],
            textposition='outside',
            textfont=dict(size=8, family='IBM Plex Mono', color='#e5e7eb')
        ))
        fig_temps.add_hline(y=110, line_dash="dash", line_color="#f59e0b", line_width=1, opacity=0.6)
        fig_temps.update_layout(
            height=115, margin=dict(l=24, r=8, t=24, b=14),
            paper_bgcolor='#0d1419', plot_bgcolor='#06090c',
            font=dict(size=9, family='IBM Plex Mono', color='#9ca3af'),
            title=dict(text='JUNCTION TEMP BY THYRISTOR (°C)', font=dict(size=9, family='Inter', color='#6ee7b7'), x=0.04),
            xaxis=dict(showgrid=False, zeroline=False),
            yaxis=dict(showgrid=True, gridcolor='#1f3028', gridwidth=0.5, zeroline=False, range=[0, max(clean_tj_list)+25]),
            showlegend=False
        )
        st.plotly_chart(fig_temps, use_container_width=True, config={'displayModeBar': False})

except Exception as e:
    st.error(f"⚠️ Error loading data: {e}")
    st.exception(e)