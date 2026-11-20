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
from components.output_nav import render_output_nav

st.set_page_config(
    page_title="Trends & Wear — THERMOSENSE",
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
render_output_nav("TRENDS & WEAR")

data = get_latest()

# KPI Row (Warm Hardware Tokens)
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #FF5A1F; background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 14px 16px;">
        <div class="hardware-card-label" style="font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; font-weight: 700; text-transform: uppercase;">Fatigue Acceleration</div>
        <div class="hardware-card-value" style="font-family: 'IBM Plex Mono'; font-size: 26px; font-weight: 800; color: #FFFFFF; margin: 4px 0;">2.2 <span style="font-size: 16px; opacity: 0.7;">&times;</span></div>
        <div class="hardware-card-subtext" style="font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E; display: flex; justify-content: space-between;"><span>BASELINE: 1.0&times;</span><span style="color: #FFB020;">ELEVATED CYCLES</span></div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #F2B533; background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 14px 16px;">
        <div class="hardware-card-label" style="font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; font-weight: 700; text-transform: uppercase;">Remaining Useful Life (RUL)</div>
        <div class="hardware-card-value" style="font-family: 'IBM Plex Mono'; font-size: 26px; font-weight: 800; color: #F2B533; margin: 4px 0;">14.2 <span style="font-size: 16px; opacity: 0.7;">MOS</span></div>
        <div class="hardware-card-subtext" style="font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E; display: flex; justify-content: space-between;"><span>TARGET: &gt; 12 MOS</span><span style="color: #C4C1BA;">MAINTENANCE SAFE</span></div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #FFB020; background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 14px 16px;">
        <div class="hardware-card-label" style="font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; font-weight: 700; text-transform: uppercase;">Total Thermal Cycles</div>
        <div class="hardware-card-value" style="font-family: 'IBM Plex Mono'; font-size: 26px; font-weight: 800; color: #FFFFFF; margin: 4px 0;">184.2 <span style="font-size: 14px; opacity: 0.7;">k</span></div>
        <div class="hardware-card-subtext" style="font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E; display: flex; justify-content: space-between;"><span>HOT BAR IMPACTS</span><span style="color: #C4C1BA;">RECORDED</span></div>
    </div>
    """, unsafe_allow_html=True)

with col4:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #FF9A3C; background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 14px 16px;">
        <div class="hardware-card-label" style="font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; font-weight: 700; text-transform: uppercase;">Cumulative Life Consumed</div>
        <div class="hardware-card-value" style="font-family: 'IBM Plex Mono'; font-size: 26px; font-weight: 800; color: #FFFFFF; margin: 4px 0;">15.4 <span style="font-size: 16px; opacity: 0.7;">%</span></div>
        <div class="hardware-card-subtext" style="font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E; display: flex; justify-content: space-between;"><span>DESIGN: 100%</span><span style="color: #C4C1BA;">HEALTH INDEX 84.6%</span></div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# 2-Column Analytic Visuals (Warm Plotly Charts)
chart_col1, chart_col2 = st.columns(2, gap="medium")

with chart_col1:
    # Thermal Cycle Amplitude Distribution Histogram (Warm Spectrum)
    delta_t_bins = ["10-20 K", "20-30 K", "30-40 K", "40-50 K", ">50 K"]
    cycle_counts = [84200, 52100, 31400, 14200, 2300]
    bar_colors = ["#C4C1BA", "#FFB020", "#FF9A3C", "#FF5A1F", "#E0201B"]

    fig_hist = go.Figure()
    fig_hist.add_trace(go.Bar(
        x=delta_t_bins, y=cycle_counts,
        marker=dict(color=bar_colors, line=dict(color='rgba(255,255,255,0.08)', width=1)),
        text=[f"{c/1000:.1f}k" for c in cycle_counts],
        textposition='outside',
        textfont=dict(size=9, family='IBM Plex Mono', color='#FFFFFF')
    ))
    fig_hist.update_layout(
        height=260, margin=dict(l=32, r=16, t=32, b=24),
        paper_bgcolor='#151413', plot_bgcolor='#0E0D0C',
        font=dict(size=9.5, family='IBM Plex Mono, monospace', color='#88847E'),
        title=dict(text='THERMAL CYCLE AMPLITUDE DISTRIBUTION (&Delta;Tj BINS)', font=dict(size=10.5, family='Montserrat, sans-serif', color='#FFB020'), x=0.04),
        xaxis=dict(title='THERMAL SWING MAGNITUDE (&Delta;Tj)', showgrid=False, zeroline=False),
        yaxis=dict(title='CUMULATIVE CYCLES', showgrid=True, gridcolor='#282624', gridwidth=0.8, zeroline=False),
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
        line=dict(color='#FF5A1F', width=2.2),
        marker=dict(size=4, color='#FFB020'),
        fill='tozeroy', fillcolor='rgba(255, 90, 31, 0.08)'
    ))
    fig_wear.add_hline(y=1.0, line_dash="dash", line_color="#C4C1BA", line_width=1.2,
                       annotation_text="Nominal Baseline (1.0x)", annotation_font_size=9, annotation_font_color="#C4C1BA")
    fig_wear.add_hline(y=2.5, line_dash="dash", line_color="#E0201B", line_width=1.2,
                       annotation_text="Maintenance Action Threshold (2.5x)", annotation_font_size=9, annotation_font_color="#E0201B")

    fig_wear.update_layout(
        height=260, margin=dict(l=32, r=16, t=32, b=24),
        paper_bgcolor='#151413', plot_bgcolor='#0E0D0C',
        font=dict(size=9.5, family='IBM Plex Mono, monospace', color='#88847E'),
        title=dict(text='30-DAY FATIGUE ACCELERATION FACTOR (ROLLING MILL CYCLES)', font=dict(size=10.5, family='Montserrat, sans-serif', color='#FFB020'), x=0.04),
        xaxis=dict(title='TIMELINE (PAST 30 DAYS)', showgrid=True, gridcolor='#282624', gridwidth=0.8, zeroline=False),
        yaxis=dict(title='ACCELERATION (× BASELINE)', showgrid=True, gridcolor='#282624', gridwidth=0.8, zeroline=False, range=[0.5, 3.0]),
        showlegend=False
    )
    st.plotly_chart(fig_wear, use_container_width=True, config={'displayModeBar': False})

st.markdown("<br>", unsafe_allow_html=True)

# Methodology Card
st.markdown("""
<div class="hardware-card" style="background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 18px 20px;">
    <div class="hardware-card-label" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-family: 'Montserrat'; font-size: 12px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.1em; text-transform: uppercase;">COFFIN-MANSON FATIGUE CALCULATION METHODOLOGY</span>
        <span style="font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #FFB020; font-weight: 700;">PHYSICS OF FAILURE</span>
    </div>
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; font-size: 11.5px; color: #9A9894; line-height: 1.6; font-family: 'Plus Jakarta Sans';">
        <div>
            Silicon thyristor modules in hot rolling mills suffer cyclic thermal stress due to mismatched coefficients of thermal expansion (CTE) between silicon (2.6 &times; 10⁻⁶/K) and copper/moly baseplates (16.5 &times; 10⁻⁶/K).
            Each bar bite induces a temperature swing &Delta;Tj, driving plastic shear strain in the solder joint and bond wire heel.
            <div style="font-family: 'IBM Plex Mono', monospace; color: #FFFFFF; background: #151413; padding: 10px 14px; border-radius: 6px; margin-top: 10px; border-left: 3px solid #FF5A1F; border: 1px solid #282624;">
                N_f = A &times; (&Delta;T_j)^(-&alpha;) &times; exp(E_a / (k_B &times; T_j,mean)) &emsp; (&alpha; &approx; 4.5, E_a = 0.5 eV)
            </div>
        </div>
        <div style="background: #151413; padding: 14px; border-radius: 6px; border: 1px solid #282624;">
            <div style="font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 700; color: #FFFFFF; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.08em;">RECOMMENDED ACTION</div>
            <div style="color: #C4C1BA; font-weight: 600; font-family: 'Plus Jakarta Sans'; font-size: 11px;">Status: Healthy (No immediate replacement required)</div>
            <div style="margin-top: 8px; font-size: 10px; color: #88847E; line-height: 1.45;">Next scheduled physical ultrasonic wire bond inspection: Annual Turnaround (Nov 2026).</div>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)
