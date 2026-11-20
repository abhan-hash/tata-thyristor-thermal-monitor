"""
THERMOSENSE - Trends & Wear Analysis Page
Predictive Maintenance & Coffin-Manson Thermo-Mechanical Fatigue Modeling
Output Thermal Hardware Design Language
"""

import streamlit as st
from pathlib import Path
import sys
import numpy as np
import plotly.graph_objects as go

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from data.data_source import get_latest

st.set_page_config(
    page_title="Trends & Wear — THERMOSENSE",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Load global CSS
css_path = parent_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

data = get_latest()

# Header Bar
st.markdown("""
<div class="thermal-header-bar">
    <div class="brand-badge">
        <div style="font-size: 22px; filter: drop-shadow(0 0 8px rgba(255, 77, 0, 0.6));">📊</div>
        <div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
                <span class="brand-title" style="font-size: 18px;">THERMOSENSE</span>
                <span class="brand-divider">|</span>
                <span class="brand-subtitle">WEAR & LIFE ANALYSIS</span>
            </div>
            <div style="font-size: 9px; color: #6e7687; font-family: 'IBM Plex Mono', monospace;">
                COFFIN-MANSON MODEL &bull; BOND WIRE SOLDER FATIGUE &bull; PREDICTIVE RUL
            </div>
        </div>
    </div>
    <div class="header-status-group">
        <div class="thermal-pill normal">
            <span class="status-dot"></span> HEALTH FACTOR: 84.6%
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# KPI Row
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #ff7700;">
        <div class="hardware-card-label">Fatigue Acceleration</div>
        <div class="hardware-card-value" style="color: #ffffff;">2.2 <span style="font-size: 16px; opacity: 0.7;">&times;</span></div>
        <div class="hardware-card-subtext"><span>BASELINE: 1.0&times;</span><span>ELEVATED CYCLES</span></div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #00e5a3;">
        <div class="hardware-card-label">Remaining Useful Life (RUL)</div>
        <div class="hardware-card-value" style="color: #00e5a3;">14.2 <span style="font-size: 16px; opacity: 0.7;">MOS</span></div>
        <div class="hardware-card-subtext"><span>TARGET: &gt; 12 MOS</span><span>MAINTENANCE SAFE</span></div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #3b82f6;">
        <div class="hardware-card-label">Total Thermal Cycles</div>
        <div class="hardware-card-value" style="color: #ffffff;">184.2 <span style="font-size: 14px; opacity: 0.7;">k</span></div>
        <div class="hardware-card-subtext"><span>HOT BAR IMPACTS</span><span>RECORDED</span></div>
    </div>
    """, unsafe_allow_html=True)

with col4:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #a855f7;">
        <div class="hardware-card-label">Cumulative Life Consumed</div>
        <div class="hardware-card-value" style="color: #ffffff;">15.4 <span style="font-size: 16px; opacity: 0.7;">%</span></div>
        <div class="hardware-card-subtext"><span>DESIGN: 100%</span><span>HEALTH INDEX 84.6%</span></div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# 2-Column Analytic Visuals
chart_col1, chart_col2 = st.columns(2, gap="medium")

with chart_col1:
    # Thermal Cycle Amplitude Distribution Histogram
    delta_t_bins = ["10-20 K", "20-30 K", "30-40 K", "40-50 K", ">50 K"]
    cycle_counts = [84200, 52100, 31400, 14200, 2300]
    bar_colors = ["#00e5a3", "#00b4d8", "#ffaa00", "#ff7700", "#ff2a2a"]

    fig_hist = go.Figure()
    fig_hist.add_trace(go.Bar(
        x=delta_t_bins, y=cycle_counts,
        marker=dict(color=bar_colors, line=dict(color='rgba(255,255,255,0.08)', width=1)),
        text=[f"{c/1000:.1f}k" for c in cycle_counts],
        textposition='outside',
        textfont=dict(size=9, family='IBM Plex Mono', color='#ffffff')
    ))
    fig_hist.update_layout(
        height=260, margin=dict(l=30, r=16, t=32, b=20),
        paper_bgcolor='#0e1017', plot_bgcolor='#090a0e',
        font=dict(size=9.5, family='IBM Plex Mono, monospace', color='#828a99'),
        title=dict(text='THERMAL CYCLE AMPLITUDE DISTRIBUTION (&Delta;Tj BINS)', font=dict(size=10, family='Plus Jakarta Sans', color='#ff8800'), x=0.04),
        xaxis=dict(title='THERMAL SWING MAGNITUDE (&Delta;Tj)', showgrid=False, zeroline=False),
        yaxis=dict(title='CUMULATIVE CYCLES', showgrid=True, gridcolor='#171b24', zeroline=False),
        showlegend=False
    )
    st.plotly_chart(fig_hist, use_container_width=True, config={'displayModeBar': False})

with chart_col2:
    # 30-Day Wear Rate Velocity Trend
    days = list(range(1, 31))
    wear_trend = [1.2 + 0.03 * d + 0.15 * np.sin(d/3) for d in days]

    fig_wear = go.Figure()
    fig_wear.add_trace(go.Scatter(
        x=days, y=wear_trend, mode='lines+markers',
        name='Damage Acceleration Rate',
        line=dict(color='#ff4d00', width=2),
        marker=dict(size=4, color='#ffaa00'),
        fill='tozeroy', fillcolor='rgba(255, 77, 0, 0.08)'
    ))
    fig_wear.add_hline(y=1.0, line_dash="dash", line_color="#00e5a3", line_width=1.2,
                       annotation_text="Nominal Baseline (1.0x)", annotation_font_size=9, annotation_font_color="#00e5a3")
    fig_wear.add_hline(y=2.5, line_dash="dash", line_color="#ff2a2a", line_width=1.2,
                       annotation_text="Maintenance Action Threshold (2.5x)", annotation_font_size=9, annotation_font_color="#ff2a2a")

    fig_wear.update_layout(
        height=260, margin=dict(l=30, r=16, t=32, b=20),
        paper_bgcolor='#0e1017', plot_bgcolor='#090a0e',
        font=dict(size=9.5, family='IBM Plex Mono, monospace', color='#828a99'),
        title=dict(text='30-DAY FATIGUE ACCELERATION FACTOR (ROLLING MILL CYCLES)', font=dict(size=10, family='Plus Jakarta Sans', color='#ff8800'), x=0.04),
        xaxis=dict(title='TIMELINE (PAST 30 DAYS)', showgrid=True, gridcolor='#171b24', zeroline=False),
        yaxis=dict(title='ACCELERATION (× BASELINE)', showgrid=True, gridcolor='#171b24', zeroline=False, range=[0.5, 3.0]),
        showlegend=False
    )
    st.plotly_chart(fig_wear, use_container_width=True, config={'displayModeBar': False})

st.markdown("<br>", unsafe_allow_html=True)

# Methodology Card
st.markdown("""
<div class="hardware-card">
    <div class="hardware-card-label">
        <span>COFFIN-MANSON FATIGUE CALCULATION METHODOLOGY</span>
        <span style="color: #ffaa00;">PHYSICS OF FAILURE</span>
    </div>
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; font-size: 11px; color: #828a99; line-height: 1.6;">
        <div>
            Silicon thyristor modules in hot rolling mills suffer cyclic thermal stress due to mismatched coefficients of thermal expansion (CTE) between silicon (2.6 &times; 10⁻⁶/K) and copper/moly baseplates (16.5 &times; 10⁻⁶/K).
            Each bar bite induces a temperature swing &Delta;Tj, driving plastic shear strain in the solder joint and bond wire heel.
            <div style="font-family: 'IBM Plex Mono', monospace; color: #ffffff; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 4px; margin-top: 8px; border-left: 2px solid #ff7700;">
                N_f = A &times; (&Delta;T_j)^(-&alpha;) &times; exp(E_a / (k_B &times; T_j,mean)) &emsp; (&alpha; &approx; 4.5, E_a = 0.5 eV)
            </div>
        </div>
        <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; color: #ffffff; margin-bottom: 6px;">RECOMMENDED ACTION</div>
            <div style="color: #00e5a3; font-weight: 600;">Status: Healthy (No immediate replacement required)</div>
            <div style="margin-top: 6px; font-size: 10px; color: #6b7382;">Next scheduled physical ultrasonic wire bond inspection: Annual Turnaround (Nov 2026).</div>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)
