"""
THERMOSENSE - Calibration & Settings Console
Model parameters, safety thresholds, data sources, and RBAC permissions
Output Thermal Hardware Design Language
"""

import streamlit as st
from pathlib import Path
import sys
import yaml

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from components.output_nav import render_output_nav
from components.html_utils import render_html
from components.output_ui_kit import (
    render_page_header,
    render_plate_open,
    render_plate_close,
    render_status_chip_html
)
from components.svg_schematics import render_heat_exchanger_svg

st.set_page_config(
    page_title="Settings — THERMOSENSE",
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
render_output_nav("SETTINGS")

# Load configuration
config_path = parent_dir / "config" / "thresholds.yaml"
try:
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
except Exception:
    config = {
        'alarms': {
            'junction_temp': {'warning': 110, 'critical': 125, 'hysteresis': 2, 'debounce': 3},
            'heatsink_temp': {'warning': 75, 'critical': 85, 'hysteresis': 2, 'debounce': 3},
            'cooling_residual': {'warning': 4.0, 'critical': 8.0, 'hysteresis': 1.0, 'debounce': 5}
        },
        'model': {
            'R_jc': 0.04, 'R_sa_baseline': 0.08, 'tau_1': 0.02, 'tau_2': 0.5, 'tau_3': 20.0,
            'V_f0': 0.95, 'r_d': 0.0003, 'rated_current': 1000, 'current_per_thyristor': 'Id/3'
        }
    }

# Track modification state
if 'settings_modified' not in st.session_state:
    st.session_state['settings_modified'] = False

# 1. STANDARDIZED PAGE HEADER (Variant A: Compact Industrial Ribbon)
render_page_header(
    title="CALIBRATION & SAFETY SETPOINTS",
    subtitle="THERMAL THRESHOLDS • FOSTER CONSTANTS • BLOWER BUS TELEMETRY • RBAC",
    live_metric_val="ACTIVE",
    live_metric_unit="INTERLOCKED",
    live_metric_label="SAFETY BUS",
    status_tier="nominal",
    variant="ribbon"
)

# 2. GROUPED PLATE PANEL: ALARM THRESHOLDS & INLINE VALIDATION
render_plate_open("ALARM & TRIP SAFETY THRESHOLDS (HARDWARE SETPOINTS)", "SAFETY LIMITS")

col_t1, col_t2 = st.columns(2, gap="medium")
with col_t1:
    st.markdown("**Junction Temperature Trip & Warning Configuration:**")
    tj_trip = st.slider("Junction Trip Threshold (°C)", min_value=115, max_value=135, value=config['alarms']['junction_temp']['critical'], step=1)
    tj_warn = st.slider("Junction Warning Threshold (°C)", min_value=90, max_value=120, value=config['alarms']['junction_temp']['warning'], step=1)
    
    # Inline validation
    if tj_warn >= tj_trip:
        st.error("⚠️ Validation Error: Warning threshold must be strictly below trip threshold.")
    else:
        st.caption(f"✓ Valid: {tj_trip - tj_warn}°C safety margin between warning dispatch and emergency trip.")

with col_t2:
    st.markdown("**Heatsink & Filter Residual Clogging Setpoints:**")
    hs_trip = st.slider("Heatsink Trip Limit (°C)", min_value=70, max_value=95, value=config['alarms']['heatsink_temp']['critical'], step=1)
    res_warn = st.slider("Cooling Residual Filter Clog Alarm (K)", min_value=2.0, max_value=8.0, value=float(config['alarms']['cooling_residual']['warning']), step=0.5)
    st.caption("✓ Filter residual monitors divergence ΔT = Ts,actual - Ts,predicted over a rolling 60s window.")

render_plate_close()

render_html("<br>")

# 3. GROUPED PLATE PANEL: FOSTER MODEL CONSTANTS
render_plate_open("FOSTER 3-STAGE RC PHYSICS MODEL CONSTANTS", "PHYSICS PARAMETERS")

pcol1, pcol2 = st.columns(2, gap="medium")
with pcol1:
    render_html(f"""
    <div style="background: #141312; border: 1px solid #282624; border-radius: 6px; padding: 14px 18px; margin-bottom: 12px;">
        <div style="font-family: 'Montserrat'; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">THERMAL RESISTANCE & CONDUCTION</div>
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #FFFFFF; line-height: 2.2;">
            <div style="display: flex; justify-content: space-between;"><span>R_jc (Junction-to-Case):</span><strong style="color: #FFB020;">{config['model']['R_jc']} K/W</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>R_sa (Heatsink Baseline):</span><strong style="color: #C4C1BA;">{config['model']['R_sa_baseline']} K/W</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>V_f0 (Forward Voltage Knee):</span><strong style="color: #FFFFFF;">{config['model']['V_f0']} V</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>r_d (Dynamic Resistance):</span><strong style="color: #FFFFFF;">{config['model']['r_d']} Ω</strong></div>
        </div>
    </div>
    """)

with pcol2:
    render_html(f"""
    <div style="background: #141312; border: 1px solid #282624; border-radius: 6px; padding: 14px 18px; margin-bottom: 12px;">
        <div style="font-family: 'Montserrat'; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">FOSTER TIME CONSTANTS</div>
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #FFFFFF; line-height: 2.2;">
            <div style="display: flex; justify-content: space-between;"><span>τ1 (Silicon Die Surge):</span><strong style="color: #FF5A1F;">{config['model']['tau_1']} s (20 ms)</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>τ2 (Moly Spreading):</span><strong style="color: #FFB020;">{config['model']['tau_2']} s (500 ms)</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>τ3 (Extrusion Bulk Mass):</span><strong style="color: #C4C1BA;">{config['model']['tau_3']} s (20.0 s)</strong></div>
            <div style="display: flex; justify-content: space-between;"><span>Rated Drive Current:</span><strong style="color: #F2B533;">{config['model']['rated_current']} A</strong></div>
        </div>
    </div>
    """)

render_plate_close()

render_html("<br>")

# 4. GROUPED PLATE PANEL: HEAT EXCHANGER AIRFLOW & SENSOR BUS
render_plate_open("FORCED-AIR HEAT EXCHANGER & SENSOR BUS TELEMETRY", "COOLING SYSTEM")
hx_svg = render_heat_exchanger_svg(inlet_temp=35.0, outlet_temp=46.8, fan_running=True, clogging_pct=0.15, height=190)
render_html(hx_svg)

render_html("""
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 14px; font-family: 'IBM Plex Mono', monospace; font-size: 11px;">
    <div style="background: #141312; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
        <div style="color: #88847E; font-size: 9px;">RTD SENSORS (T1-T6)</div>
        <div style="color: #C4C1BA; font-weight: bold; margin-top: 3px;">6/6 CONNECTED</div>
    </div>
    <div style="background: #141312; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
        <div style="color: #88847E; font-size: 9px;">AMBIENT AIR RTD</div>
        <div style="color: #C4C1BA; font-weight: bold; margin-top: 3px;">ACTIVE (35.0°C)</div>
    </div>
    <div style="background: #141312; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
        <div style="color: #88847E; font-size: 9px;">CURRENT TRANSDUCER</div>
        <div style="color: #F2B533; font-weight: bold; margin-top: 3px;">CALIBRATED ±0.5%</div>
    </div>
    <div style="background: #141312; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
        <div style="color: #88847E; font-size: 9px;">COOLING BLOWER TACHO</div>
        <div style="color: #C4C1BA; font-weight: bold; margin-top: 3px;">1450 RPM (OK)</div>
    </div>
</div>
""")
render_plate_close()

render_html("<br>")

# 5. GROUPED PLATE PANEL: ROLE-BASED ACCESS CONTROL (RBAC) MATRIX
render_plate_open("ROLE-BASED ACCESS CONTROL (RBAC) AUTHORIZATION MATRIX", "SECURITY ACCESS")
render_html("""
<table style="width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #FFFFFF;">
    <tr style="border-bottom: 1px solid #33312E; text-align: left; color: #88847E;">
        <th style="padding: 10px 12px;">ROLE</th>
        <th style="padding: 10px 12px;">MONITORING VIEW</th>
        <th style="padding: 10px 12px;">ACK ALARMS</th>
        <th style="padding: 10px 12px;">CALIBRATE LIMITS</th>
        <th style="padding: 10px 12px;">FAULT SIMULATION</th>
    </tr>
    <tr style="border-bottom: 1px solid #282624;">
        <td style="padding: 10px 12px; font-weight: bold; color: #C4C1BA;">OPERATOR</td>
        <td style="padding: 10px 12px; color: #C4C1BA;">GRANTED</td>
        <td style="padding: 10px 12px; color: #C4C1BA;">GRANTED</td>
        <td style="padding: 10px 12px; color: #575450;">LOCKED</td>
        <td style="padding: 10px 12px; color: #575450;">LOCKED</td>
    </tr>
    <tr style="border-bottom: 1px solid #282624;">
        <td style="padding: 10px 12px; font-weight: bold; color: #FFB020;">ENGINEER</td>
        <td style="padding: 10px 12px; color: #C4C1BA;">GRANTED</td>
        <td style="padding: 10px 12px; color: #C4C1BA;">GRANTED</td>
        <td style="padding: 10px 12px; color: #C4C1BA;">GRANTED</td>
        <td style="padding: 10px 12px; color: #C4C1BA;">GRANTED</td>
    </tr>
    <tr>
        <td style="padding: 10px 12px; font-weight: bold; color: #F2B533;">SUPERVISOR</td>
        <td style="padding: 10px 12px; color: #C4C1BA;">GRANTED</td>
        <td style="padding: 10px 12px; color: #C4C1BA;">GRANTED</td>
        <td style="padding: 10px 12px; color: #C4C1BA;">GRANTED</td>
        <td style="padding: 10px 12px; color: #575450;">LOCKED</td>
    </tr>
</table>
""")
render_plate_close()

render_html("<br><br>")

# 6. STICKY SAVE BAR AT BOTTOM
render_html("""
<div class="sticky-save-bar">
    <div style="display: flex; align-items: center; gap: 12px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #F2B533; box-shadow: 0 0 8px #F2B533;"></span>
        <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #FFFFFF; font-weight: 700;">CALIBRATION CONSOLE STATUS: SYSTEM SYNCHRONIZED</span>
    </div>
    <div style="display: flex; gap: 10px;">
        <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10.5px; color: #88847E; align-self: center;">Hardware safety checks active</span>
    </div>
</div>
""")
