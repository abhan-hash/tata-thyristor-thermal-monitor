"""
THERMOSENSE Dashboard - Main Entry Point
Tata Steel Hot Strip Mill &bull; DC Rolling Mill Thyristor Thermal Intelligence
Output Thermal $10,000 Bespoke Hardware Design Experience
"""

import streamlit as st
from pathlib import Path
from datetime import datetime
import sys

# Add parent directory to path
current_dir = Path(__file__).parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from data.data_source import get_latest
from components.output_hardware import render_output_thermal_showcase

# Page configuration
st.set_page_config(
    page_title="THERMAL | THERMOSENSE — Tata Steel HSM",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Load global luxury CSS
css_path = current_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# Session state initialization
if 'selected_thyristor' not in st.session_state:
    st.session_state['selected_thyristor'] = 1

if 'current_user' not in st.session_state:
    st.session_state['current_user'] = 'Operator'

if 'user_role' not in st.session_state:
    st.session_state['user_role'] = 'operator'

try:
    data = get_latest()
except Exception as e:
    st.error(f"Error connecting to telemetry source: {e}")
    st.stop()

# =============================================================================
# OUTPUT THERMAL 1:1 HERO SHOWCASE (Matching reference screenshot exactly)
# =============================================================================
render_output_thermal_showcase(data)

st.markdown("<br><br>", unsafe_allow_html=True)

# =============================================================================
# LIVE DRIVE TELEMETRY & HARDWARE STRIP (Machined Carbon Cards)
# =============================================================================
st.markdown("""
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 24px;">
    <div style="font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
        Real-Time Mill Stand-04 Telemetry Bus
    </div>
    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #828a99;">
        SAMPLING: <strong style="color: #ffaa00;">10 Hz TRANSIENT</strong> &bull; STATUS: <strong style="color: #00f0a8;">SYNCHRONIZED</strong>
    </div>
</div>
""", unsafe_allow_html=True)

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown(f"""
    <div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; gap: 4px; padding: 14px 18px;">
        <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #828a99; letter-spacing: 1px; text-transform: uppercase;">
            ARMATURE CURRENT (Id)
        </span>
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #ffffff;">
            {data.armature_current:.0f} <span style="font-size: 14px; opacity: 0.6;">A</span>
        </div>
        <span style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #00f0a8;">
            NOMINAL 70% OF 1000A RATED
        </span>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown(f"""
    <div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; gap: 4px; padding: 14px 18px;">
        <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #828a99; letter-spacing: 1px; text-transform: uppercase;">
            AMBIENT RTD SENSOR
        </span>
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #ffffff;">
            {data.ambient_temp:.1f} <span style="font-size: 14px; opacity: 0.6;">°C</span>
        </div>
        <span style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #828a99;">
            MILL BAY INTAKE AIR TEMP
        </span>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; gap: 4px; padding: 14px 18px;">
        <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #828a99; letter-spacing: 1px; text-transform: uppercase;">
            COOLING RESIDUAL (DELTA)
        </span>
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #ffaa00;">
            +2.4 <span style="font-size: 14px; opacity: 0.6;">K</span>
        </div>
        <span style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #ffaa00;">
            INTAKE AIRFLOW RESTRICTION 12%
        </span>
    </div>
    """, unsafe_allow_html=True)

with col4:
    st.markdown("""
    <div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; gap: 4px; padding: 14px 18px;">
        <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #828a99; letter-spacing: 1px; text-transform: uppercase;">
            FATIGUE WEAR RATE
        </span>
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 24px; font-weight: 700; color: #ffffff;">
            2.2 <span style="font-size: 14px; opacity: 0.6;">&times;</span>
        </div>
        <span style="font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #00f0a8;">
            COFFIN-MANSON MODEL ACCEL
        </span>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br><br>", unsafe_allow_html=True)

# =============================================================================
# OPERATIONAL MODULE NAVIGATION DECK
# =============================================================================
st.markdown("""
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #828a99; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
    EXPLORE INDUSTRIAL DIAGNOSTIC SUITE
</div>
""", unsafe_allow_html=True)

nav_col1, nav_col2, nav_col3 = st.columns(3)

with nav_col1:
    st.markdown("""
    <div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; padding: 18px; height: 100%;">
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">
            ⚡ Drive Detail & Bridge Topology
        </div>
        <div style="font-size: 11px; color: #828a99; line-height: 1.5; margin-bottom: 14px;">
            6-pulse bridge schematic analysis, Foster RC time constants (&tau;1, &tau;2, &tau;3), and live 2.5s bar bite surge profiles.
        </div>
    </div>
    """, unsafe_allow_html=True)
    if st.button("Launch Drive Detail", key="btn_nav_drive", use_container_width=True):
        st.switch_page("pages/2_⚡_Drive_Detail.py")

with nav_col2:
    st.markdown("""
    <div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; padding: 18px; height: 100%;">
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">
            🚨 Alarms & Incident Management
        </div>
        <div style="font-size: 11px; color: #828a99; line-height: 1.5; margin-bottom: 14px;">
            Active trip alerts, cooling filter clogging early warning, debounce controls, and operator acknowledgment log.
        </div>
    </div>
    """, unsafe_allow_html=True)
    if st.button("Open Alarm Center", key="btn_nav_alarms", use_container_width=True):
        st.switch_page("pages/3_🚨_Alarms_History.py")

with nav_col3:
    st.markdown("""
    <div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; padding: 18px; height: 100%;">
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">
            📊 Wear & Predictive Life Analytics
        </div>
        <div style="font-size: 11px; color: #828a99; line-height: 1.5; margin-bottom: 14px;">
            Thermo-mechanical fatigue damage accumulation, bond wire solder stress velocity, and Remaining Useful Life (RUL).
        </div>
    </div>
    """, unsafe_allow_html=True)
    if st.button("Inspect Wear Analytics", key="btn_nav_wear", use_container_width=True):
        st.switch_page("pages/4_📊_Trends_Wear.py")

st.markdown("<br><br>", unsafe_allow_html=True)
