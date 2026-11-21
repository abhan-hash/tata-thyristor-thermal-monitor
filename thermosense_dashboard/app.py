"""
THERMOSENSE Dashboard - Main Entry Point
Tata Steel Hot Strip Mill — DC Rolling Mill Thyristor Thermal Intelligence
Output Thermal Bespoke Hardware Design Experience (DESIGN_SPEC v2.0)
"""

import streamlit as st
from pathlib import Path
import sys
import importlib
import textwrap

# Add parent directory to path
current_dir = Path(__file__).parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

import data.data_source
import components.output_hardware
import components.output_hero
import components.output_nav
import components.output_console

importlib.reload(data.data_source)
importlib.reload(components.output_console)
importlib.reload(components.output_hardware)
importlib.reload(components.output_hero)
importlib.reload(components.output_nav)

from data.data_source import get_latest
from components.output_nav import render_output_nav
from components.output_hero import render_output_hero
from components.output_hardware import render_output_thermal_showcase

# Page configuration
st.set_page_config(
    page_title="THERMAL | THERMOSENSE — Tata Steel HSM",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Load global warm luxury CSS
css_path = current_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.html(f"<style>{f.read()}</style>")

# Session state initialization
if 'selected_thyristor' not in st.session_state:
    st.session_state['selected_thyristor'] = 1

if 'selected_component' not in st.session_state:
    st.session_state['selected_component'] = 'BRIDGE'

if 'current_user' not in st.session_state:
    st.session_state['current_user'] = 'Operator'

if 'user_role' not in st.session_state:
    st.session_state['user_role'] = 'operator'

# Synchronize query parameters
if "source" in st.query_params:
    src_param = st.query_params.get("source")
    if src_param:
        st.session_state['selected_component'] = src_param.upper()

if "t" in st.query_params:
    try:
        t_param = int(st.query_params.get("t", 1))
        if 1 <= t_param <= 6:
            st.session_state['selected_thyristor'] = t_param
    except (ValueError, TypeError):
        pass

# Telemetry data retrieval
try:
    data = get_latest()
except Exception as e:
    st.error(f"Error connecting to telemetry source: {e}")
    st.stop()

# =============================================================================
# 1. OUTPUT THERMAL TOP NAVIGATION BAR (Task 4)
# =============================================================================
render_output_nav("OVERVIEW")

# =============================================================================
# 2. OUTPUT THERMAL HERO TITLE LOCKUP & HEAT SMEAR (Task 5)
# =============================================================================
render_output_hero("STAND-04")

# =============================================================================
# 3. OUTPUT THERMAL HARDWARE SHOWCASE & LIVE TELEMETRY STRIP (Tasks 6, 7, 8, 9, 10)
# =============================================================================
render_output_thermal_showcase(data)

st.html("<br><br>")

# =============================================================================
# 4. OPERATIONAL MODULE NAVIGATION DECK (Pure Warm Tokens, No Emojis, No Syne)
# =============================================================================
suite_header_html = textwrap.dedent("""
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #88847E; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 14px;">
EXPLORE INDUSTRIAL DIAGNOSTIC SUITE
</div>
""").strip()
st.html(suite_header_html)

nav_col1, nav_col2, nav_col3 = st.columns(3)

with nav_col1:
    card1_html = textwrap.dedent("""
<div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; padding: 18px; height: 100%; border: 1px solid #282624; border-radius: 8px; background: #1A1918; cursor: default;">
<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2B533" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
</svg>
<span style="font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF;">
Drive Detail &amp; Bridge Topology
</span>
</div>
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; color: #9A9894; line-height: 1.5; margin-bottom: 14px;">
6-pulse bridge schematic analysis, Foster RC time constants (&tau;1, &tau;2, &tau;3), and live 2.4s bar entry surge profiles.
</div>
</div>
""").strip()
    st.html(card1_html)
    if st.button("Launch Drive Detail", key="btn_nav_drive", use_container_width=True):
        st.switch_page("pages/2_⚡_Drive_Detail.py")

with nav_col2:
    card2_html = textwrap.dedent("""
<div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; padding: 18px; height: 100%; border: 1px solid #282624; border-radius: 8px; background: #1A1918; cursor: default;">
<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5A1F" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
<line x1="12" y1="8" x2="12" y2="12"></line>
<line x1="12" y1="16" x2="12.01" y2="16"></line>
</svg>
<span style="font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF;">
Alarms &amp; Incident Management
</span>
</div>
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; color: #9A9894; line-height: 1.5; margin-bottom: 14px;">
Active trip alerts, cooling filter clogging early warning, debounce controls, and operator acknowledgment log.
</div>
</div>
""").strip()
    st.html(card2_html)
    if st.button("Open Alarm Center", key="btn_nav_alarms", use_container_width=True):
        st.switch_page("pages/3_🚨_Alarms_History.py")

with nav_col3:
    card3_html = textwrap.dedent("""
<div class="preset-rack-row" style="flex-direction: column; align-items: flex-start; padding: 18px; height: 100%; border: 1px solid #282624; border-radius: 8px; background: #1A1918; cursor: default;">
<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2B533" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
</svg>
<span style="font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF;">
Wear &amp; Predictive Life Analytics
</span>
</div>
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; color: #9A9894; line-height: 1.5; margin-bottom: 14px;">
Thermo-mechanical fatigue damage accumulation, bond wire solder stress velocity, and Remaining Useful Life (RUL).
</div>
</div>
""").strip()
    st.html(card3_html)
    if st.button("Inspect Wear Analytics", key="btn_nav_wear", use_container_width=True):
        st.switch_page("pages/4_📊_Trends_Wear.py")

st.html("<br><br>")
