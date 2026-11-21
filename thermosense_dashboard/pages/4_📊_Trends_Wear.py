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
from components.html_utils import render_html
from components.output_ui_kit import (
    render_page_header,
    render_plate_open,
    render_plate_close,
    render_kpi_tile_html,
    render_status_chip_html,
    apply_warm_plotly_layout
)

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

def render_arc_gauge_svg(t_id: int, life_pct: float, rul_months: float) -> str:
    """Render 220° circular arc gauge showing remaining thyristor useful life."""
    radius = 36
    cx, cy = 52, 48
    circumference = 2 * np.pi * radius * (220.0 / 360.0)
    dash_val = circumference * (life_pct / 100.0)
    
    col = "#F2B533" if life_pct >= 80 else "#FFB020" if life_pct >= 60 else "#FF5A1F" if life_pct >= 40 else "#E0201B"

    svg = f"""
    <div style="background: #151413; border: 1px solid #282624; border-radius: 8px; padding: 12px 8px; text-align: center;">
        <svg width="104" height="88" viewBox="0 0 104 88" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="arcGrad_{t_id}" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#E0201B"/>
                    <stop offset="50%" stop-color="#FFB020"/>
                    <stop offset="100%" stop-color="#F2B533"/>
                </linearGradient>
            </defs>
            <!-- Background Arc Track -->
            <path d="M 22,74 A 36,36 0 1,1 82,74" fill="none" stroke="#201F1D" stroke-width="6" stroke-linecap="round"/>
            <!-- Active Life Gauge Arc -->
            <path d="M 22,74 A 36,36 0 1,1 82,74" fill="none" stroke="url(#arcGrad_{t_id})" stroke-width="6"
                  stroke-dasharray="{circumference:.1f}" stroke-dashoffset="{circumference - dash_val:.1f}" stroke-linecap="round"/>
            <!-- Center Readings -->
            <text x="{cx}" y="44" font-family="'IBM Plex Mono', monospace" font-size="14" font-weight="800" fill="#FFFFFF" text-anchor="middle">{life_pct:.1f}%</text>
            <text x="{cx}" y="56" font-family="'Plus Jakarta Sans', sans-serif" font-size="7.5" font-weight="700" fill="#88847E" text-anchor="middle">LIFE REMAINING</text>
        </svg>
        <div style="display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px; margin-top: 2px;">
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 800; color: #FFFFFF;">T{t_id}</span>
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; font-weight: 700; color: {col};">{rul_months:.1f} MOS</span>
        </div>
    </div>
    """
    return svg

@st.fragment(run_every="5s")
def render_live_trends():
    data = get_latest()

    # 1. STANDARDIZED PAGE HEADER (Variant A: Compact Industrial Ribbon)
    render_page_header(
        title="TRENDS & WEAR PREDICTIVE ANALYTICS",
        subtitle="COFFIN-MANSON THERMO-MECHANICAL FATIGUE & SOLDER JOINT HEALTH",
        live_metric_val="14.2",
        live_metric_unit="MOS",
        live_metric_label="FLEET RUL (MIN)",
        status_tier="nominal",
        variant="ribbon"
    )

    # 2. FOCAL POINT: REMAINING-LIFE ARC GAUGES PER THYRISTOR (T1–T6)
    render_plate_open("THYRISTOR HEALTH INDEX & REMAINING USEFUL LIFE (RUL)", "WEAR MATRIX")
    gauge_cols = st.columns(6)
    life_percentages = [86.4, 88.9, 81.2, 87.5, 79.8, 83.7]
    rul_projections = [15.1, 16.4, 13.8, 15.8, 12.9, 14.2]

    for i in range(6):
        with gauge_cols[i]:
            render_html(render_arc_gauge_svg(i + 1, life_percentages[i], rul_projections[i]))
    render_plate_close()

    render_html("<br>")

    # 3. KPI TILES WITH SPARKLINES (THERMAL CYCLING COUNT & FLEET HEALTH)
    k1, k2, k3, k4 = st.columns(4)
    with k1:
        render_html(render_kpi_tile_html(
            label="RECORDED THERMAL CYCLES",
            value="184.2",
            unit="k",
            delta="+1,240 TODAY",
            delta_type="up-good",
            sparkline_values=[179, 180, 181, 182, 183, 183.8, 184.2],
            color="#F2B533"
        ))
    with k2:
        render_html(render_kpi_tile_html(
            label="MINIMUM REMAINING LIFE (RUL)",
            value="14.2",
            unit="MOS",
            delta="SAFE (> 12m)",
            delta_type="up-good",
            sparkline_values=[16.0, 15.6, 15.2, 14.8, 14.5, 14.3, 14.2],
            color="#FFB020"
        ))
    with k3:
        render_html(render_kpi_tile_html(
            label="FATIGUE ACCELERATION FACTOR",
            value="2.2",
            unit="×",
            delta="ELEVATED CYCLES",
            delta_type="up-warn",
            sparkline_values=[1.0, 1.3, 1.6, 1.9, 2.1, 2.3, 2.2],
            color="#FF5A1F"
        ))
    with k4:
        render_html(render_kpi_tile_html(
            label="FLEET AVERAGE HEALTH INDEX",
            value="84.6",
            unit="%",
            delta="OPTIMAL (> 80%)",
            delta_type="up-good",
            sparkline_values=[87.2, 86.8, 86.1, 85.5, 85.0, 84.8, 84.6],
            color="#C4C1BA"
        ))

    render_html("<br>")

    # 4. TWO-COLUMN ANALYTICS: CHANNEL X DAY HEATMAP & PROJECTED WEAR LINE
    col_heat, col_proj = st.columns([1.1, 1.1], gap="medium")

    with col_heat:
        render_plate_open("14-DAY PEAK JUNCTION TEMPERATURE HEATMAP", "DAILY PROFILE")
        days = [f"D-{14-d}" for d in range(14)]
        channels = ["T6", "T5", "T4", "T3", "T2", "T1"]
        np.random.seed(42)
        # Thermal matrix showing hotter Stand-04 bar biting periods
        heat_matrix = [
            [88, 92, 90, 89, 94, 98, 102, 95, 91, 93, 97, 104, 96, 93], # T6
            [90, 94, 92, 91, 96, 101, 106, 98, 93, 95, 100, 108, 99, 95], # T5
            [85, 87, 86, 88, 90, 93, 96, 92, 88, 89, 92, 97, 91, 89],   # T4
            [86, 89, 88, 89, 92, 95, 99, 94, 89, 91, 94, 100, 93, 90],  # T3
            [83, 85, 84, 86, 88, 90, 93, 89, 85, 87, 90, 94, 88, 86],   # T2
            [84, 86, 85, 87, 89, 92, 95, 91, 87, 88, 91, 96, 89, 87],   # T1
        ]
        fig_heat = go.Figure(data=go.Heatmap(
            z=heat_matrix,
            x=days,
            y=channels,
            colorscale=[
                [0.0, "#151413"],
                [0.3, "#282624"],
                [0.6, "#FFB020"],
                [0.85, "#FF5A1F"],
                [1.0, "#E0201B"]
            ],
            colorbar=dict(
                title=dict(text="°C", font=dict(family="IBM Plex Mono", size=9, color="#FFFFFF")),
                tickfont=dict(family="IBM Plex Mono", size=8.5, color="#88847E"),
                len=0.85,
                thickness=12
            ),
            hovertemplate="Channel: %{y}<br>Timeline: %{x}<br>Peak Tj: %{z}°C<extra></extra>"
        ))
        apply_warm_plotly_layout(
            fig=fig_heat,
            title="CHANNEL × DAY THERMAL STRESS MATRIX (PAST 14 DAYS)",
            y_title="MODULE",
            height=260,
            show_thresholds=False
        )
        st.plotly_chart(fig_heat, use_container_width=True, config={'displayModeBar': False})
        render_plate_close()

    with col_proj:
        render_plate_open("PROJECTED WEAR & FATIGUE DAMAGE ACCUMULATION", "DAMAGE PREDICTION")
        months = np.linspace(0, 36, 100)
        # Exponential damage accumulation model
        damage_nom = 15.4 + (months / 36.0)**1.6 * 84.6
        damage_upper = 15.4 + (months / 30.0)**1.5 * 84.6
        damage_lower = 15.4 + (months / 42.0)**1.7 * 84.6

        fig_proj = go.Figure()
        # Upper confidence band
        fig_proj.add_trace(go.Scatter(
            x=months, y=np.minimum(100.0, damage_upper),
            mode='lines', line=dict(width=0), showlegend=False,
            hoverinfo='skip'
        ))
        # Lower confidence band with warm fill
        fig_proj.add_trace(go.Scatter(
            x=months, y=np.minimum(100.0, damage_lower),
            mode='lines', line=dict(width=0),
            fill='tonexty', fillcolor='rgba(255, 90, 31, 0.12)',
            name='±1σ Uncertainty Band',
            hoverinfo='skip'
        ))
        # Nominal projection curve
        fig_proj.add_trace(go.Scatter(
            x=months, y=np.minimum(100.0, damage_nom),
            mode='lines',
            name='Nominal Fatigue Damage',
            line=dict(color='#FF5A1F', width=2.4),
            hovertemplate="Month: %{x:.1f}<br>Fatigue: %{y:.1f}%<extra></extra>"
        ))

        # 100% End of life limit line
        fig_proj.add_hline(y=100.0, line_dash="dash", line_color="#E0201B", line_width=1.5,
                           annotation_text="Fatigue Threshold: 100%", annotation_font_size=9, annotation_font_color="#E0201B")

        apply_warm_plotly_layout(
            fig=fig_proj,
            title="36-MONTH CUMULATIVE WEAR PROJECTION WITH ±1σ CONFIDENCE",
            y_title="FATIGUE CONSUMED (%)",
            y_range=[0, 110],
            height=260,
            show_thresholds=False
        )
        fig_proj.update_xaxes(title="TIMELINE (MONTHS INTO FLEET SERVICE)")
        st.plotly_chart(fig_proj, use_container_width=True, config={'displayModeBar': False})
        render_plate_close()

    render_html("<br>")

    # 5. COFFIN-MANSON METHODOLOGY PLATE
    render_plate_open("COFFIN-MANSON FATIGUE CALCULATION METHODOLOGY", "PHYSICS OF FAILURE")
    render_html("""
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
    """)
    render_plate_close()

render_live_trends()
