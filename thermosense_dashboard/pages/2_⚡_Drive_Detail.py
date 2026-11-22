"""
THERMOSENSE - Drive Detail & Bridge Topology Page
Deep dive into 6-pulse bridge thermal dynamics, Foster RC layers, and live waveforms
Output Thermal Hardware Design Language
"""

import streamlit as st
from pathlib import Path
import sys
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from data.data_source import get_latest
from components.output_nav import render_output_nav
from components.html_utils import render_html
from components.output_ui_kit import (
    render_page_header,
    render_channel_card_html,
    render_plate_open,
    render_plate_close,
    render_kpi_tile_html,
    apply_warm_plotly_layout,
    get_status_tier,
    get_thermal_color,
    render_status_chip_html,
    render_mini_heat_disc_svg
)
from components.svg_schematics import (
    render_bridge_schematic_svg,
    render_foster_ladder_svg
)

st.set_page_config(
    page_title="Drive Detail — THERMOSENSE",
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
render_output_nav("DRIVE DETAIL")

# Synchronize query parameters
if "t" in st.query_params:
    try:
        t_param = int(float(st.query_params.get("t", 1)))
        if 1 <= t_param <= 6:
            st.session_state['selected_thyristor'] = t_param
    except (ValueError, TypeError):
        pass

if 'selected_thyristor' not in st.session_state:
    st.session_state['selected_thyristor'] = 1

# Safe float extractor
def get_clean_float(obj, attr, default, min_val=0.0, max_val=250.0):
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

@st.fragment(run_every="2s")
def render_live_drive_detail():
    data = get_latest()
    sel_id = st.session_state.get('selected_thyristor', 1)

    clean_tj_list = []
    clean_hs_list = []
    clean_res_list = []
    clean_ploss_list = []

    for idx, t in enumerate(data.thyristors):
        fallback_tj = 81.0 + (idx * 3.2)
        tj = get_clean_float(t, 'tj_estimated', fallback_tj, 10.0, 180.0)
        hs = get_clean_float(t, 't_heatsink_measured', 46.0 + (idx * 0.4), 10.0, 130.0)
        res = get_clean_float(t, 'residual', 2.5 + (idx * 0.2), 0.0, 30.0)
        ploss = get_clean_float(t, 'power_loss', 420.0 + (idx * 15.0), 0.0, 3000.0)

        clean_tj_list.append(tj)
        clean_hs_list.append(hs)
        clean_res_list.append(res)
        clean_ploss_list.append(ploss)

    armature_current = get_clean_float(data, 'armature_current', 784.0, 0.0, 3000.0)
    ambient_temp = get_clean_float(data, 'ambient_temp', 35.0, 0.0, 70.0)
    max_tj = max(clean_tj_list)
    overall_tier = get_status_tier(max_tj)

    # 1. STANDARDIZED PAGE HEADER (Variant A: Compact Industrial Ribbon)
    render_page_header(
        title="DRIVE DETAIL • STAND-04",
        subtitle="6-PULSE GRAETZ BRIDGE TOPOLOGY & TRANSIENT IMPEDANCE PROFILE",
        live_metric_val=f"{max_tj:.1f}",
        live_metric_unit="°C",
        live_metric_label="BRIDGE PEAK Tj",
        status_tier=overall_tier,
        variant="ribbon"
    )

    # 2. THYRISTOR SELECTION CARDS (Variant A: Integrated Heat Disc Plate)
    render_html("""
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #88847E; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 10px;">
        SELECT THYRISTOR ARM FOR REAL-TIME TRANSIENT INSPECTION
    </div>
    """)

    card_cols = st.columns(6)
    for i in range(6):
        tid = i + 1
        is_sel = (tid == sel_id)
        card_markup = render_channel_card_html(
            t_id=tid,
            tj=clean_tj_list[i],
            ts=clean_hs_list[i],
            is_selected=is_sel,
            variant="plate"
        )
        with card_cols[i]:
            render_html(card_markup)

    render_html("<br>")

    # Selected Thyristor Attributes
    sel_idx = sel_id - 1
    sel_tj = clean_tj_list[sel_idx]
    sel_hs = clean_hs_list[sel_idx]
    sel_res = clean_res_list[sel_idx]
    sel_ploss = clean_ploss_list[sel_idx]
    sel_tier = get_status_tier(sel_tj)
    sel_color = get_thermal_color(sel_tj)
    margin_k = max(0.0, 125.0 - sel_tj)

    phase_map = {
        1: ("Phase U", "Upper Arm (+DC Bus)", "U"),
        2: ("Phase W", "Lower Arm (-DC Bus)", "W"),
        3: ("Phase V", "Upper Arm (+DC Bus)", "V"),
        4: ("Phase U", "Lower Arm (-DC Bus)", "U"),
        5: ("Phase W", "Upper Arm (+DC Bus)", "W"),
        6: ("Phase V", "Lower Arm (-DC Bus)", "V"),
    }
    ph_name, arm_desc, ph_letter = phase_map.get(sel_id, ("Phase U", "Upper Arm", "U"))

    # 3. FOCAL POINT ROW: BRIDGE SCHEMATIC + SELECTED CHANNEL READOUT
    col_bridge, col_channel = st.columns([1.3, 0.9], gap="medium")

    with col_bridge:
        render_plate_open("6-PULSE GRAETZ BRIDGE SCHEMATIC (INTERACTIVE)", "BRIDGE TOPOLOGY")
        bridge_svg = render_bridge_schematic_svg(
            thyristor_temps=clean_tj_list,
            selected_id=sel_id,
            current_a=armature_current,
            height=320
        )
        render_html(bridge_svg)
        render_html("""
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; color: #88847E; margin-top: 8px; display: flex; justify-content: space-between;">
            <span>Click any thyristor in the schematic to lock focus.</span>
            <span style="color: #FFB020;">Gold border = Active selection</span>
        </div>
        """)
        render_plate_close()

    with col_channel:
        render_plate_open(f"T{sel_id} DIAGNOSTIC STATE", f"PHASE {ph_letter}")
        chip_html = render_status_chip_html(sel_tier)
        disc_svg_large = render_mini_heat_disc_svg(sel_tj, diameter=72)

        readout_html = f"""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
                <div style="font-family: 'Montserrat', sans-serif; font-size: 17px; font-weight: 800; color: #FFFFFF;">
                    {ph_name} • {arm_desc}
                </div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #88847E; margin-top: 2px;">
                    100mm SILICON DISK • FORCED AIR
                </div>
            </div>
            {chip_html}
        </div>

        <div style="background: #141312; border: 1px solid #282624; border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: space-around; margin-bottom: 14px;">
            <div>{disc_svg_large}</div>
            <div style="text-align: right;">
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 34px; font-weight: 800; color: {sel_color}; font-variant-numeric: tabular-nums; line-height: 1;">
                    {sel_tj:.1f}<span style="font-size: 16px; opacity: 0.7;">°C</span>
                </div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #FFB020; font-weight: 700; letter-spacing: 0.1em; margin-top: 4px;">
                    ESTIMATED JUNCTION (Tj)
                </div>
            </div>
        </div>

        <!-- Margin to Trip Gauge Bar -->
        <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #88847E; margin-bottom: 4px;">
                <span>SAFETY MARGIN TO 125°C TRIP</span>
                <span style="color: {'#FFA59E' if margin_k < 20 else '#FFFFFF'}; font-weight: 700;">{margin_k:.1f} K DELTA</span>
            </div>
            <div style="width: 100%; height: 6px; background: #201F1D; border-radius: 3px; overflow: hidden;">
                <div style="width: {min(100.0, max(0.0, (margin_k / 60.0) * 100.0)):.1f}%; height: 100%; background: {'#E0201B' if margin_k < 15 else '#FFB020' if margin_k < 30 else '#C4C1BA'};"></div>
            </div>
        </div>

        <!-- Metric Triplets -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center;">
            <div style="background: #151413; border: 1px solid #282624; padding: 8px; border-radius: 6px;">
                <div style="font-size: 8.5px; color: #88847E; font-family: 'Plus Jakarta Sans'; font-weight: 700;">HEATSINK (Ts)</div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 14.5px; font-weight: 700; color: #FFFFFF; margin-top: 2px;">{sel_hs:.1f}°C</div>
            </div>
            <div style="background: #151413; border: 1px solid #282624; padding: 8px; border-radius: 6px;">
                <div style="font-size: 8.5px; color: #88847E; font-family: 'Plus Jakarta Sans'; font-weight: 700;">POWER LOSS</div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 14.5px; font-weight: 700; color: #FFB020; margin-top: 2px;">{sel_ploss:.0f} W</div>
            </div>
            <div style="background: #151413; border: 1px solid #282624; padding: 8px; border-radius: 6px;">
                <div style="font-size: 8.5px; color: #88847E; font-family: 'Plus Jakarta Sans'; font-weight: 700;">COOLING ΔT</div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 14.5px; font-weight: 700; color: #C4C1BA; margin-top: 2px;">+{sel_res:.1f} K</div>
            </div>
        </div>
        """
        render_html(readout_html)
        render_plate_close()

    render_html("<br>")

    # 4. DIAGNOSTIC TELEMETRY KPI TILES WITH SPARKLINES
    kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
    with kpi_col1:
        render_html(render_kpi_tile_html(
            label="ARMATURE CURRENT",
            value=f"{armature_current:.1f}",
            unit="A",
            delta="+12 A",
            delta_type="up-good",
            sparkline_values=[710, 725, 740, 780, 890, 820, 784],
            color="#F2B533"
        ))
    with kpi_col2:
        render_html(render_kpi_tile_html(
            label="DYNAMIC LOSS (Ploss)",
            value=f"{sel_ploss:.0f}",
            unit="W",
            delta="+18 W",
            delta_type="up-warn",
            sparkline_values=[380, 395, 410, 435, 490, 440, sel_ploss],
            color="#FF5A1F"
        ))
    with kpi_col3:
        render_html(render_kpi_tile_html(
            label="THERMAL RESISTANCE (Rsa)",
            value="0.082",
            unit="K/W",
            delta="NOMINAL",
            delta_type="up-good",
            sparkline_values=[0.081, 0.082, 0.081, 0.082, 0.082, 0.082, 0.082],
            color="#FFB020"
        ))
    with kpi_col4:
        render_html(render_kpi_tile_html(
            label="COOLING RESIDUAL (ΔT)",
            value=f"+{sel_res:.1f}",
            unit="K",
            delta="CLEAR",
            delta_type="up-good",
            sparkline_values=[2.1, 2.3, 2.4, 2.6, 2.5, 2.7, sel_res],
            color="#C4C1BA"
        ))

    render_html("<br>")

    # 5. STACKED CHARTS: TRANSIENT Tj & CURRENT PROFILE (SHARED X-AXIS & CROSSHAIR)
    t_sec = np.linspace(0, 30, 150)
    i_arm = 700 + 150 * np.sin(t_sec / 5)
    impact_mask = (t_sec >= 10.0) & (t_sec <= 12.5)
    i_arm[impact_mask] += 380.0

    tj_sim = sel_tj - 8 + (i_arm / 1000) * 14 + np.random.normal(0, 0.25, len(t_sec))
    tj_sim[impact_mask] += 14.0 * np.sin((t_sec[impact_mask] - 10) / 2.5 * np.pi)
    hs_sim = sel_hs - 3 + 4 * (1 - np.exp(-t_sec / 15))

    render_plate_open(f"T{sel_id} REAL-TIME TRANSIENT WAVEFORMS • SYNCHRONIZED MILL DYNAMICS", "TELEMETRY SCOPE")

    # Stacked Charts with Shared X-Axis & Shared Crosshair
    fig_stacked = make_subplots(
        rows=2, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.08,
        row_heights=[0.62, 0.38],
        subplot_titles=(
            f"TRANSIENT TEMPERATURE RESPONSE • T{sel_id} SILICON JUNCTION vs HEATSINK",
            "ARMATURE CURRENT PROFILE (Id • SYNCHRONIZED ROLLING LOAD)"
        )
    )

    # Row 1: Transient Temperature (Tj and Ts)
    fig_stacked.add_trace(go.Scatter(
        x=t_sec, y=tj_sim, mode='lines',
        name=f'T{sel_id} Estimated Tj',
        line=dict(color='#FF5A1F', width=2.4),
        fill='tozeroy', fillcolor='rgba(255, 90, 31, 0.08)',
        hovertemplate="Time: %{x:.1f}s<br>Tj: %{y:.1f}°C<extra></extra>"
    ), row=1, col=1)

    fig_stacked.add_trace(go.Scatter(
        x=t_sec, y=hs_sim, mode='lines',
        name=f'T{sel_id} Measured Heatsink (Ts)',
        line=dict(color='#FFB020', width=1.8, dash='dot'),
        hovertemplate="Time: %{x:.1f}s<br>Ts: %{y:.1f}°C<extra></extra>"
    ), row=1, col=1)

    # Hot bar bite annotation
    fig_stacked.add_annotation(
        x=11.2, y=max(tj_sim[impact_mask]),
        text="HOT BAR IMPACT SPIKE (+380A)",
        showarrow=True, arrowhead=2, arrowcolor="#FF5A1F", arrowsize=1,
        font=dict(family="IBM Plex Mono", size=9, color="#FFFFFF"),
        bgcolor="#1A1918", bordercolor="#FF5A1F", borderwidth=1, borderpad=4,
        row=1, col=1
    )

    # Shaded threshold bands on Row 1
    fig_stacked.add_hrect(
        y0=105.0, y1=125.0, fillcolor="rgba(255, 176, 32, 0.05)",
        line_width=0, layer="below", row=1, col=1
    )
    fig_stacked.add_hline(
        y=105.0, line_dash="dash", line_color="rgba(255, 176, 32, 0.6)",
        line_width=1, annotation_text="WARN 105°C", annotation_font_size=8.5,
        annotation_font_color="#FFB020", annotation_position="bottom right",
        row=1, col=1
    )
    fig_stacked.add_hrect(
        y0=125.0, y1=140.0, fillcolor="rgba(224, 32, 27, 0.08)",
        line_width=0, layer="below", row=1, col=1
    )
    fig_stacked.add_hline(
        y=125.0, line_dash="dot", line_color="#E0201B",
        line_width=1.2, annotation_text="TRIP 125°C", annotation_font_size=8.5,
        annotation_font_color="#E0201B", annotation_position="top right",
        row=1, col=1
    )

    # Row 2: Armature Current Profile (Id)
    fig_stacked.add_trace(go.Scatter(
        x=t_sec, y=i_arm, mode='lines',
        name='Armature Current (Id)',
        line=dict(color='#F2B533', width=2),
        fill='tozeroy', fillcolor='rgba(242, 181, 51, 0.07)',
        hovertemplate="Time: %{x:.1f}s<br>Id: %{y:.1f} A<extra></extra>"
    ), row=2, col=1)

    # Synchronized vertical guide line across both charts
    fig_stacked.add_vline(
        x=11.2, line_dash="dash", line_color="rgba(255, 90, 31, 0.35)",
        line_width=1.2
    )

    # Unified layout configuration with shared crosshair
    fig_stacked.update_layout(
        height=450,
        margin=dict(l=40, r=20, t=36, b=30),
        paper_bgcolor="#151413",
        plot_bgcolor="#0E0D0C",
        font=dict(size=9.5, family="IBM Plex Mono, monospace", color="#88847E"),
        hovermode="x unified",
        hoverlabel=dict(
            bgcolor="#1A1918",
            bordercolor="#F2B533",
            font=dict(family="IBM Plex Mono, monospace", size=10, color="#FFFFFF")
        ),
        showlegend=False
    )

    # Crosshair spike behavior across x axes
    fig_stacked.update_xaxes(
        showgrid=True, gridcolor="#282624", gridwidth=0.8, zeroline=False, color="#88847E",
        showspikes=True, spikemode="across", spikesnap="cursor", spikethickness=1, spikecolor="#F2B533"
    )
    fig_stacked.update_yaxes(
        showgrid=True, gridcolor="#282624", gridwidth=0.8, zeroline=False, color="#88847E",
        row=1, col=1, title="TEMP (°C)", range=[30, 138]
    )
    fig_stacked.update_yaxes(
        showgrid=True, gridcolor="#282624", gridwidth=0.8, zeroline=False, color="#88847E",
        row=2, col=1, title="CURRENT (A)", range=[500, 1300]
    )
    fig_stacked.update_xaxes(title="TIMELINE (SECONDS)", row=2, col=1)

    st.plotly_chart(fig_stacked, use_container_width=True, config={'displayModeBar': False})
    render_plate_close()

    render_html("<br>")

    # 6. FOSTER RC 3-STAGE IMPEDANCE LADDER WITH ANIMATED PARTICLES
    render_plate_open("3-STAGE FOSTER RC THERMAL LADDER & DYNAMIC HEAT FLOW", "THERMAL IMPEDANCE")
    foster_svg = render_foster_ladder_svg(
        p_loss=sel_ploss,
        tj=sel_tj,
        ths=sel_hs,
        tamb=ambient_temp,
        height=210
    )
    render_html(foster_svg)
    render_plate_close()

render_live_drive_detail()
