"""
THERMOSENSE - Technical Methodology & Engineering Dossier
Tata Steel Hot Strip Mill Stand-04 Thyristor Thermal Monitor
Output Thermal Hardware Design Language
"""

import streamlit as st
from pathlib import Path
import sys

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from components.output_nav import render_output_nav

st.set_page_config(
    page_title="About — THERMOSENSE",
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
render_output_nav("ABOUT")

# Safety Notice Banner
st.markdown("""
<div style="
    background: rgba(255, 176, 32, 0.08);
    border: 1px solid rgba(255, 176, 32, 0.3);
    border-left: 3px solid #FFB020;
    border-radius: 6px;
    padding: 12px 18px;
    margin-bottom: 20px;
    font-size: 11px;
    color: #C4C1BA;
    line-height: 1.6;
">
    <strong style="color: #FFB020; text-transform: uppercase;">Advisory Operating Notice:</strong>
    THERMOSENSE outputs are advisory during pilot qualification. Junction temperature is an online estimated state variable calculated by an impedance model. Field validation against optical / fiber-optic test fixtures is mandatory prior to safety interlock commissioning.
</div>
""", unsafe_allow_html=True)

# Executive Overview Grid
col1, col2 = st.columns(2, gap="medium")

with col1:
    st.markdown("""
<div class="hardware-card" style="height: 100%; background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 16px;">
    <div class="hardware-card-label" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #88847E; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">PROJECT SPECIFICATION</div>
    <div style="font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">
        Virtual Junction Temperature Sensor for Rolling Mill Thyristors
    </div>
    <div style="font-size: 11.5px; color: #88847E; line-height: 1.6;">
        In steel rolling mills, high-power DC drives endure sudden, massive cyclic loads when red-hot steel slabs enter the mill stand (bar bite impacts).
        Traditional heatsink RTDs have high thermal mass and lag behind true silicon junction temperature by tens of seconds, blind to 2.5s peak over-temperature spikes that cause premature thyristor degradation.
        <br><br>
        <strong style="color: #FFFFFF;">THERMOSENSE</strong> bridges this gap by fusing physical heatsink RTD measurements with electrical current telemetry through a dynamic 3-layer Foster RC thermal model at 10 Hz.
    </div>
</div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
<div class="hardware-card" style="height: 100%; background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 16px;">
    <div class="hardware-card-label" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #88847E; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">COLLABORATION & METADATA</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; margin-top: 8px;">
        <div style="background: #151413; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
            <div style="color: #88847E; font-size: 9px; text-transform: uppercase;">INITIATIVE</div>
            <div style="color: #FFFFFF; font-weight: 700; margin-top: 2px;">Women of Mettle</div>
            <div style="color: #FF5A1F; font-size: 9.5px;">Project 7 Challenge</div>
        </div>
        <div style="background: #151413; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
            <div style="color: #88847E; font-size: 9px; text-transform: uppercase;">INDUSTRY PARTNER</div>
            <div style="color: #FFFFFF; font-weight: 700; margin-top: 2px;">Tata Steel</div>
            <div style="color: #FFB020; font-size: 9.5px;">Hot Strip Mill (HSM)</div>
        </div>
        <div style="background: #151413; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
            <div style="color: #88847E; font-size: 9px; text-transform: uppercase;">APPLICATION</div>
            <div style="color: #FFFFFF; font-weight: 700; margin-top: 2px;">Stand-04 Main Drive</div>
            <div style="color: #88847E; font-size: 9.5px;">6-Pulse Graetz Bridge</div>
        </div>
        <div style="background: #151413; border: 1px solid #282624; padding: 10px; border-radius: 6px;">
            <div style="color: #88847E; font-size: 9px; text-transform: uppercase;">COMPUTATION RATE</div>
            <div style="color: #FFFFFF; font-weight: 700; margin-top: 2px;">10 Hz Model / 1 Hz GUI</div>
            <div style="color: #F2B533; font-size: 9.5px;">Peak-Hold Retention</div>
        </div>
    </div>
</div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# Technical Foster RC Architecture Section
st.markdown("""
<div class="hardware-card" style="background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 16px;">
    <div class="hardware-card-label" style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #88847E; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">FOSTER 3-LAYER RC IMPEDANCE FORMULATION</div>
    <div style="font-size: 11.5px; color: #88847E; line-height: 1.6; margin-bottom: 14px;">
        Heat generation follows silicon forward voltage conduction and dynamic resistance loss:
        <span style="font-family: 'IBM Plex Mono', monospace; color: #FFFFFF;">P_loss = V_f0 &times; (Id/3) + r_d &times; (Id/3)&sup2;</span>.
        The transient thermal impedance <span style="font-family: 'IBM Plex Mono', monospace; color: #FF5A1F;">Z_th(t)</span> is governed by three decoupled RC cells:
    </div>

    <div style="background: #0E0D0C; border: 1px solid #282624; border-radius: 6px; padding: 14px 18px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #C4C1BA; line-height: 1.8;">
        [Silicon Junction] &rarr; (R1 = 0.008 K/W, &tau;1 = 0.02s) &rarr; Fast Die Surge Layer<br>
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&rarr; (R2 = 0.016 K/W, &tau;2 = 0.50s) &rarr; Intermediate Spreading Layer<br>
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&rarr; (R3 = 0.016 K/W, &tau;3 = 20.0s) &rarr; Extrusion Heat Capacity &rarr; [Heatsink RTD]
    </div>

    <div style="margin-top: 14px; font-size: 11px; color: #88847E; line-height: 1.6;">
        <strong style="color: #FFFFFF;">Cooling Residual & Early Warning:</strong> The physical heatsink temperature is simultaneously predicted using known clean-filter resistance <span style="font-family: 'IBM Plex Mono'; color: #FFB020;">R_sa</span>.
        Any divergence <span style="font-family: 'IBM Plex Mono'; color: #FFB020;">&Delta;T = Ts_measured - Ts_predicted &gt; 4.0K</span> provides operators with days of advance notice regarding intake air filter clogging prior to junction trip.
    </div>
</div>
""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# Data Provenance Table
st.markdown("""
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 700; color: #88847E; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px;">
    DATA PROVENANCE & SENSOR CONFIDENCE MAPPING
</div>
<div class="hardware-card" style="background: #1A1918; border: 1px solid #282624; border-radius: 8px; padding: 16px;">
    <table style="width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #FFFFFF;">
        <tr style="border-bottom: 1px solid #282624; text-align: left; color: #88847E;">
            <th style="padding: 8px;">VARIABLE</th>
            <th style="padding: 8px;">SOURCE SENSOR</th>
            <th style="padding: 8px;">SAMPLING RATE</th>
            <th style="padding: 8px;">CONFIDENCE CLASS</th>
            <th style="padding: 8px;">FAILURE MODE MITIGATION</th>
        </tr>
        <tr style="border-bottom: 1px solid #282624;">
            <td style="padding: 8px; font-weight: bold;">Heatsink Temp (Ts)</td>
            <td style="padding: 8px;">PT100 4-Wire RTD</td>
            <td style="padding: 8px;">1 Hz PLC Analog Input</td>
            <td style="padding: 8px;"><span class="thermal-pill normal" style="font-size: 8px;">HIGH (MEASURED)</span></td>
            <td style="padding: 8px; color: #88847E;">Out-of-range sensor clamp + open circuit trip</td>
        </tr>
        <tr style="border-bottom: 1px solid #282624;">
            <td style="padding: 8px; font-weight: bold;">Armature Current (Id)</td>
            <td style="padding: 8px;">Hall Effect Transducer</td>
            <td style="padding: 8px;">10 Hz Fast Modbus</td>
            <td style="padding: 8px;"><span class="thermal-pill normal" style="font-size: 8px;">HIGH (MEASURED)</span></td>
            <td style="padding: 8px; color: #88847E;">Shared bus current split 1/3 per thyristor arm</td>
        </tr>
        <tr style="border-bottom: 1px solid #282624;">
            <td style="padding: 8px; font-weight: bold;">Junction Temp (Tj)</td>
            <td style="padding: 8px;">Foster 3-Layer Virtual Sensor</td>
            <td style="padding: 8px;">10 Hz Model / 1 Hz Peak-Hold</td>
            <td style="padding: 8px;"><span class="thermal-pill warning" style="font-size: 8px;">ESTIMATED (MODEL)</span></td>
            <td style="padding: 8px; color: #88847E;">Conservative R_jc worst-case safety margin (+15%)</td>
        </tr>
        <tr>
            <td style="padding: 8px; font-weight: bold;">Cooling Residual</td>
            <td style="padding: 8px;">Delta Ts - Ts,pred</td>
            <td style="padding: 8px;">Rolling 60s Window</td>
            <td style="padding: 8px;"><span class="thermal-pill normal" style="font-size: 8px;">HIGH (DIAGNOSTIC)</span></td>
            <td style="padding: 8px; color: #88847E;">Debounced 5s to eliminate transient false trips</td>
        </tr>
    </table>
</div>
""", unsafe_allow_html=True)
