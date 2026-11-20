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

st.set_page_config(
    page_title="Settings — THERMOSENSE",
    page_icon="⚙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Load global CSS
css_path = parent_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# Header Bar
st.markdown("""
<div class="thermal-header-bar">
    <div class="brand-badge">
        <div style="font-size: 22px; filter: drop-shadow(0 0 8px rgba(255, 77, 0, 0.6));">⚙️</div>
        <div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
                <span class="brand-title" style="font-size: 18px;">THERMOSENSE</span>
                <span class="brand-divider">|</span>
                <span class="brand-subtitle">SYSTEM CALIBRATION & PARAMETERS</span>
            </div>
            <div style="font-size: 9px; color: #6e7687; font-family: 'IBM Plex Mono', monospace;">
                STAND-04 THRESHOLDS &bull; FOSTER CONSTANTS &bull; READ-ONLY SUPERVISOR ACCESS
            </div>
        </div>
    </div>
    <div class="header-status-group">
        <div class="thermal-pill warning">
            <span class="status-dot"></span> READ-ONLY MODE
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

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

tab1, tab2, tab3, tab4 = st.tabs(["Alarm Thresholds", "Foster Model Constants", "Telemetry Data Sources", "User Access & Roles"])

with tab1:
    st.markdown("""
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #828a99; letter-spacing: 1.5px; text-transform: uppercase; margin: 12px 0;">
        ACTIVE SAFETY & TRIP SETPOINTS
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(f"""
        <div class="hardware-card" style="border-top: 2px solid #ff4d00;">
            <div class="hardware-card-label">Junction Temp (Tj)</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 700; color: #ffffff; margin: 8px 0;">
                TRIP: <span style="color: #ff2a2a;">{config['alarms']['junction_temp']['critical']}°C</span>
            </div>
            <div class="hardware-card-subtext">
                <span>WARNING: {config['alarms']['junction_temp']['warning']}°C</span>
                <span>DEBOUNCE: {config['alarms']['junction_temp']['debounce']}s</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown(f"""
        <div class="hardware-card" style="border-top: 2px solid #ffaa00;">
            <div class="hardware-card-label">Heatsink Temp (Ts)</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 700; color: #ffffff; margin: 8px 0;">
                TRIP: <span style="color: #ffaa00;">{config['alarms']['heatsink_temp']['critical']}°C</span>
            </div>
            <div class="hardware-card-subtext">
                <span>WARNING: {config['alarms']['heatsink_temp']['warning']}°C</span>
                <span>DEBOUNCE: {config['alarms']['heatsink_temp']['debounce']}s</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        st.markdown(f"""
        <div class="hardware-card" style="border-top: 2px solid #00e5a3;">
            <div class="hardware-card-label">Cooling Residual (&Delta;T)</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 700; color: #ffffff; margin: 8px 0;">
                FILTER CLOG: <span style="color: #ffaa00;">{config['alarms']['cooling_residual']['warning']} K</span>
            </div>
            <div class="hardware-card-subtext">
                <span>CRITICAL: {config['alarms']['cooling_residual']['critical']} K</span>
                <span>DEBOUNCE: {config['alarms']['cooling_residual']['debounce']}s</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

with tab2:
    st.markdown("""
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #828a99; letter-spacing: 1.5px; text-transform: uppercase; margin: 12px 0;">
        PHYSICS MODEL CALIBRATION VALUES
    </div>
    """, unsafe_allow_html=True)

    pcol1, pcol2 = st.columns(2)
    with pcol1:
        st.markdown(f"""
        <div class="hardware-card">
            <div class="hardware-card-label">THERMAL RESISTANCE & CONDUCTION</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #ffffff; line-height: 2;">
                <div>R_jc (Junction-to-Case): <strong style="color: #ffaa00;">{config['model']['R_jc']} K/W</strong></div>
                <div>R_sa (Heatsink Baseline): <strong style="color: #00e5a3;">{config['model']['R_sa_baseline']} K/W</strong></div>
                <div>V_f0 (Forward Voltage Knee): <strong style="color: #ffffff;">{config['model']['V_f0']} V</strong></div>
                <div>r_d (Dynamic Resistance): <strong style="color: #ffffff;">{config['model']['r_d']} &Omega;</strong></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with pcol2:
        st.markdown(f"""
        <div class="hardware-card">
            <div class="hardware-card-label">FOSTER TIME CONSTANTS</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #ffffff; line-height: 2;">
                <div>&tau;1 (Silicon Micro-Layer): <strong style="color: #ff4d00;">{config['model']['tau_1']} s (20 ms)</strong></div>
                <div>&tau;2 (Moly Spreading Layer): <strong style="color: #ffaa00;">{config['model']['tau_2']} s (500 ms)</strong></div>
                <div>&tau;3 (Bulk Heatsink Mass): <strong style="color: #00e5a3;">{config['model']['tau_3']} s (20 s)</strong></div>
                <div>Rated Armature Current: <strong style="color: #3b82f6;">{config['model']['rated_current']} A</strong></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

with tab3:
    st.markdown("""
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #828a99; letter-spacing: 1.5px; text-transform: uppercase; margin: 12px 0;">
        SENSOR BUS & TELEMETRY HEALTH
    </div>
    """, unsafe_allow_html=True)

    from data.data_source import get_data_source
    source = get_data_source()
    status = source.get_connection_status()

    st.markdown(f"""
    <div class="hardware-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; color: #ffffff;">
                PLANT SENSOR NETWORK &bull; STAND-04
            </div>
            <span class="thermal-pill normal">ALL SENSORS NOMINAL</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-family: 'IBM Plex Mono', monospace; font-size: 11px;">
            <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 4px;">
                <div style="color: #828a99; font-size: 9px;">RTD SENSORS (T1-T6)</div>
                <div style="color: #00e5a3; font-weight: bold; margin-top: 2px;">6/6 CONNECTED</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 4px;">
                <div style="color: #828a99; font-size: 9px;">AMBIENT AIR RTD</div>
                <div style="color: #00e5a3; font-weight: bold; margin-top: 2px;">ACTIVE (35.0°C)</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 4px;">
                <div style="color: #828a99; font-size: 9px;">CURRENT TRANSDUCER</div>
                <div style="color: #00e5a3; font-weight: bold; margin-top: 2px;">CALIBRATED &plusmn;0.5%</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 4px;">
                <div style="color: #828a99; font-size: 9px;">COOLING BLOWER TACHO</div>
                <div style="color: #00e5a3; font-weight: bold; margin-top: 2px;">INTERLOCKED OK</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

with tab4:
    st.markdown("""
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #828a99; letter-spacing: 1.5px; text-transform: uppercase; margin: 12px 0;">
        ROLE-BASED ACCESS CONTROL (RBAC) MATRIX
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="hardware-card">
        <table style="width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #ffffff;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left; color: #828a99;">
                <th style="padding: 8px;">ROLE</th>
                <th style="padding: 8px;">MONITORING VIEW</th>
                <th style="padding: 8px;">ACK ALARMS</th>
                <th style="padding: 8px;">CALIBRATE LIMITS</th>
                <th style="padding: 8px;">FAULT SIMULATION</th>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                <td style="padding: 8px; font-weight: bold; color: #00e5a3;">OPERATOR</td>
                <td style="padding: 8px; color: #00e5a3;">GRANTED</td>
                <td style="padding: 8px; color: #00e5a3;">GRANTED</td>
                <td style="padding: 8px; color: #575e6d;">LOCKED</td>
                <td style="padding: 8px; color: #575e6d;">LOCKED</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                <td style="padding: 8px; font-weight: bold; color: #ffaa00;">ENGINEER</td>
                <td style="padding: 8px; color: #00e5a3;">GRANTED</td>
                <td style="padding: 8px; color: #00e5a3;">GRANTED</td>
                <td style="padding: 8px; color: #00e5a3;">GRANTED</td>
                <td style="padding: 8px; color: #00e5a3;">GRANTED</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold; color: #3b82f6;">SUPERVISOR</td>
                <td style="padding: 8px; color: #00e5a3;">GRANTED</td>
                <td style="padding: 8px; color: #00e5a3;">GRANTED</td>
                <td style="padding: 8px; color: #00e5a3;">GRANTED</td>
                <td style="padding: 8px; color: #575e6d;">LOCKED</td>
            </tr>
        </table>
    </div>
    """, unsafe_allow_html=True)
