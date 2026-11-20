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

tab1, tab2, tab3, tab4 = st.tabs(["Alarm Thresholds", "Foster Model Constants", "Telemetry Data Sources", "User Access & Roles"])

with tab1:
    st.markdown("""
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #88847E; letter-spacing: 1.5px; text-transform: uppercase; margin: 12px 0;">
        ACTIVE SAFETY & TRIP SETPOINTS
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns(3)
    with col1:
        st.markdown(f"""
        <div class="hardware-card" style="border-top: 2px solid #E0201B; background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 14px 16px;">
            <div class="hardware-card-label" style="font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; font-weight: 700; text-transform: uppercase;">Junction Temp (Tj)</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 8px 0;">
                TRIP: <span style="color: #E0201B;">{config['alarms']['junction_temp']['critical']}°C</span>
            </div>
            <div class="hardware-card-subtext" style="font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E; display: flex; justify-content: space-between;">
                <span>WARNING: {config['alarms']['junction_temp']['warning']}°C</span>
                <span>DEBOUNCE: {config['alarms']['junction_temp']['debounce']}s</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown(f"""
        <div class="hardware-card" style="border-top: 2px solid #FFB020; background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 14px 16px;">
            <div class="hardware-card-label" style="font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; font-weight: 700; text-transform: uppercase;">Heatsink Temp (Ts)</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 8px 0;">
                TRIP: <span style="color: #FFB020;">{config['alarms']['heatsink_temp']['critical']}°C</span>
            </div>
            <div class="hardware-card-subtext" style="font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E; display: flex; justify-content: space-between;">
                <span>WARNING: {config['alarms']['heatsink_temp']['warning']}°C</span>
                <span>DEBOUNCE: {config['alarms']['heatsink_temp']['debounce']}s</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        st.markdown(f"""
        <div class="hardware-card" style="border-top: 2px solid #C4C1BA; background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 14px 16px;">
            <div class="hardware-card-label" style="font-family: 'Plus Jakarta Sans'; font-size: 10px; color: #88847E; font-weight: 700; text-transform: uppercase;">Cooling Residual (&Delta;T)</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 8px 0;">
                FILTER CLOG: <span style="color: #FFB020;">{config['alarms']['cooling_residual']['warning']} K</span>
            </div>
            <div class="hardware-card-subtext" style="font-family: 'IBM Plex Mono'; font-size: 9.5px; color: #88847E; display: flex; justify-content: space-between;">
                <span>CRITICAL: {config['alarms']['cooling_residual']['critical']} K</span>
                <span>DEBOUNCE: {config['alarms']['cooling_residual']['debounce']}s</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

with tab2:
    st.markdown("""
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #88847E; letter-spacing: 1.5px; text-transform: uppercase; margin: 12px 0;">
        PHYSICS MODEL CALIBRATION VALUES
    </div>
    """, unsafe_allow_html=True)

    pcol1, pcol2 = st.columns(2)
    with pcol1:
        st.markdown(f"""
        <div class="hardware-card" style="background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 16px 20px;">
            <div class="hardware-card-label" style="font-family: 'Montserrat'; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">THERMAL RESISTANCE & CONDUCTION</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #FFFFFF; line-height: 2;">
                <div>R_jc (Junction-to-Case): <strong style="color: #FFB020;">{config['model']['R_jc']} K/W</strong></div>
                <div>R_sa (Heatsink Baseline): <strong style="color: #C4C1BA;">{config['model']['R_sa_baseline']} K/W</strong></div>
                <div>V_f0 (Forward Voltage Knee): <strong style="color: #FFFFFF;">{config['model']['V_f0']} V</strong></div>
                <div>r_d (Dynamic Resistance): <strong style="color: #FFFFFF;">{config['model']['r_d']} &Omega;</strong></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with pcol2:
        st.markdown(f"""
        <div class="hardware-card" style="background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 16px 20px;">
            <div class="hardware-card-label" style="font-family: 'Montserrat'; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">FOSTER TIME CONSTANTS</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #FFFFFF; line-height: 2;">
                <div>&tau;1 (Silicon Micro-Layer): <strong style="color: #FF5A1F;">{config['model']['tau_1']} s (20 ms)</strong></div>
                <div>&tau;2 (Moly Spreading Layer): <strong style="color: #FFB020;">{config['model']['tau_2']} s (500 ms)</strong></div>
                <div>&tau;3 (Bulk Heatsink Mass): <strong style="color: #C4C1BA;">{config['model']['tau_3']} s (20 s)</strong></div>
                <div>Rated Armature Current: <strong style="color: #F2B533;">{config['model']['rated_current']} A</strong></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

with tab3:
    st.markdown("""
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #88847E; letter-spacing: 1.5px; text-transform: uppercase; margin: 12px 0;">
        SENSOR BUS & TELEMETRY HEALTH
    </div>
    """, unsafe_allow_html=True)

    from data.data_source import get_data_source
    source = get_data_source()

    st.markdown(f"""
    <div class="hardware-card" style="background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 16px 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
                PLANT SENSOR NETWORK &bull; STAND-04
            </div>
            <span class="thermal-pill normal" style="font-size: 8px; padding: 2px 7px;">ALL SENSORS NOMINAL</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-family: 'IBM Plex Mono', monospace; font-size: 11px;">
            <div style="background: #151413; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
                <div style="color: #88847E; font-size: 9px;">RTD SENSORS (T1-T6)</div>
                <div style="color: #C4C1BA; font-weight: bold; margin-top: 3px;">6/6 CONNECTED</div>
            </div>
            <div style="background: #151413; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
                <div style="color: #88847E; font-size: 9px;">AMBIENT AIR RTD</div>
                <div style="color: #C4C1BA; font-weight: bold; margin-top: 3px;">ACTIVE (35.0°C)</div>
            </div>
            <div style="background: #151413; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
                <div style="color: #88847E; font-size: 9px;">CURRENT TRANSDUCER</div>
                <div style="color: #F2B533; font-weight: bold; margin-top: 3px;">CALIBRATED &plusmn;0.5%</div>
            </div>
            <div style="background: #151413; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
                <div style="color: #88847E; font-size: 9px;">COOLING BLOWER TACHO</div>
                <div style="color: #C4C1BA; font-weight: bold; margin-top: 3px;">INTERLOCKED OK</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

with tab4:
    st.markdown("""
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #88847E; letter-spacing: 1.5px; text-transform: uppercase; margin: 12px 0;">
        ROLE-BASED ACCESS CONTROL (RBAC) MATRIX
    </div>
    """, unsafe_allow_html=True)

    st.markdown("""
    <div class="hardware-card" style="background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 16px 20px;">
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
    </div>
    """, unsafe_allow_html=True)
