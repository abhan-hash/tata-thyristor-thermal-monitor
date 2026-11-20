"""
THERMOSENSE - Technical Methodology & Engineering Dossier
Tata Steel Hot Strip Mill &bull; Women of Mettle Project 7
Output Thermal Hardware Design Language
"""

import streamlit as st
from pathlib import Path
import sys

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

st.set_page_config(
    page_title="About — THERMOSENSE",
    page_icon="ℹ️",
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
        <div style="font-size: 22px; filter: drop-shadow(0 0 8px rgba(255, 77, 0, 0.6));">ℹ️</div>
        <div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
                <span class="brand-title" style="font-size: 18px;">THERMOSENSE</span>
                <span class="brand-divider">|</span>
                <span class="brand-subtitle">ENGINEERING DOSSIER & METHODOLOGY</span>
            </div>
            <div style="font-size: 9px; color: #6e7687; font-family: 'IBM Plex Mono', monospace;">
                WOMEN OF METTLE &bull; TATA STEEL HOT STRIP MILL &bull; STAND-04
            </div>
        </div>
    </div>
    <div class="header-status-group">
        <div class="thermal-pill normal">
            <span class="status-dot"></span> PROJECT 7 SPECIFICATION
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# Safety Notice Banner
st.markdown("""
<div style="
    background: linear-gradient(90deg, rgba(255, 170, 0, 0.12) 0%, #151821 100%);
    border: 1px solid rgba(255, 170, 0, 0.35);
    border-left: 3px solid #ffaa00;
    border-radius: 6px;
    padding: 12px 18px;
    margin-bottom: 20px;
    font-size: 11px;
    color: #e2e8f0;
    line-height: 1.6;
">
    <strong style="color: #ffaa00; text-transform: uppercase;">Advisory Operating Notice:</strong>
    THERMOSENSE outputs are advisory during pilot qualification. Junction temperature is an online estimated state variable calculated by an impedance model. Field validation against optical / fiber-optic test fixtures is mandatory prior to safety interlock commissioning.
</div>
""", unsafe_allow_html=True)

# Executive Overview Grid
col1, col2 = st.columns(2, gap="medium")

with col1:
    st.markdown("""
    <div class="hardware-card" style="height: 100%;">
        <div class="hardware-card-label">PROJECT SPECIFICATION</div>
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">
            Virtual Junction Temperature Sensor for Rolling Mill Thyristors
        </div>
        <div style="font-size: 11.5px; color: #828a99; line-height: 1.6;">
            In steel rolling mills, high-power DC drives endure sudden, massive cyclic loads when red-hot steel slabs enter the mill stand (bar bite impacts).
            Traditional heatsink RTDs have high thermal mass and lag behind true silicon junction temperature by tens of seconds, blind to 2.5s peak over-temperature spikes that cause premature thyristor degradation.
            <br><br>
            <strong>THERMOSENSE</strong> bridges this gap by fusing physical heatsink RTD measurements with electrical current telemetry through a dynamic 3-layer Foster RC thermal model at 10 Hz.
        </div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="hardware-card" style="height: 100%;">
        <div class="hardware-card-label">COLLABORATION & METADATA</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; margin-top: 8px;">
            <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 4px;">
                <div style="color: #6e7687; font-size: 9px;">INITIATIVE</div>
                <div style="color: #ffffff; font-weight: 700; margin-top: 2px;">Women of Mettle</div>
                <div style="color: #ff8800; font-size: 9.5px;">Project 7 Challenge</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 4px;">
                <div style="color: #6e7687; font-size: 9px;">INDUSTRY PARTNER</div>
                <div style="color: #ffffff; font-weight: 700; margin-top: 2px;">Tata Steel</div>
                <div style="color: #00e5a3; font-size: 9.5px;">Hot Strip Mill (HSM)</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 4px;">
                <div style="color: #6e7687; font-size: 9px;">APPLICATION</div>
                <div style="color: #ffffff; font-weight: 700; margin-top: 2px;">Stand-04 Main Drive</div>
                <div style="color: #828a99; font-size: 9.5px;">6-Pulse Graetz Bridge</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 4px;">
                <div style="color: #6e7687; font-size: 9px;">COMPUTATION RATE</div>
                <div style="color: #ffffff; font-weight: 700; margin-top: 2px;">10 Hz Model / 1 Hz GUI</div>
                <div style="color: #3b82f6; font-size: 9.5px;">Peak-Hold Retention</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# Technical Foster RC Architecture Section
st.markdown("""
<div class="hardware-card">
    <div class="hardware-card-label">FOSTER 3-LAYER RC IMPEDANCE FORMULATION</div>
    <div style="font-size: 11.5px; color: #828a99; line-height: 1.6; margin-bottom: 14px;">
        Heat generation follows silicon forward voltage conduction and dynamic resistance loss:
        <span style="font-family: 'IBM Plex Mono', monospace; color: #ffffff;">P_loss = V_f0 &times; (Id/3) + r_d &times; (Id/3)&sup2;</span>.
        The transient thermal impedance <span style="font-family: 'IBM Plex Mono', monospace; color: #ff8800;">Z_th(t)</span> is governed by three decoupled RC cells:
    </div>

    <div style="background: #090b10; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 14px 18px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #cbd5e1; line-height: 1.8;">
        [Silicon Junction] &rarr; (R1 = 0.008 K/W, &tau;1 = 0.02s) &rarr; Fast Die Surge Layer<br>
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&rarr; (R2 = 0.016 K/W, &tau;2 = 0.50s) &rarr; Intermediate Spreading Layer<br>
        &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&rarr; (R3 = 0.016 K/W, &tau;3 = 20.0s) &rarr; Extrusion Heat Capacity &rarr; [Heatsink RTD]
    </div>

    <div style="margin-top: 14px; font-size: 11px; color: #828a99; line-height: 1.6;">
        <strong style="color: #ffffff;">Cooling Residual & Early Warning:</strong> The physical heatsink temperature is simultaneously predicted using known clean-filter resistance <span style="font-family: 'IBM Plex Mono'; color: #00e5a3;">R_sa</span>.
        Any divergence <span style="font-family: 'IBM Plex Mono'; color: #ffaa00;">&Delta;T = Ts_measured - Ts_predicted &gt; 4.0K</span> provides operators with days of advance notice regarding intake air filter clogging prior to junction trip.
    </div>
</div>
""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# Data Provenance Table
st.markdown("""
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #828a99; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;">
    DATA PROVENANCE & SENSOR CONFIDENCE MAPPING
</div>
""", unsafe_allow_html=True)

st.markdown("""
<div class="hardware-card">
    <table style="width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #ffffff;">
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left; color: #828a99;">
            <th style="padding: 8px;">VARIABLE</th>
            <th style="padding: 8px;">SOURCE SENSOR</th>
            <th style="padding: 8px;">SAMPLING RATE</th>
            <th style="padding: 8px;">CONFIDENCE CLASS</th>
            <th style="padding: 8px;">FAILURE MODE MITIGATION</th>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
            <td style="padding: 8px; font-weight: bold;">Heatsink Temp (Ts)</td>
            <td style="padding: 8px;">PT100 4-Wire RTD</td>
            <td style="padding: 8px;">1 Hz PLC Analog Input</td>
            <td style="padding: 8px;"><span class="thermal-pill normal" style="font-size: 8px;">HIGH (MEASURED)</span></td>
            <td style="padding: 8px; color: #828a99;">Out-of-range sensor clamp + open circuit trip</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
            <td style="padding: 8px; font-weight: bold;">Armature Current (Id)</td>
            <td style="padding: 8px;">Hall Effect Transducer</td>
            <td style="padding: 8px;">10 Hz Fast Modbus</td>
            <td style="padding: 8px;"><span class="thermal-pill normal" style="font-size: 8px;">HIGH (MEASURED)</span></td>
            <td style="padding: 8px; color: #828a99;">Shared bus current split 1/3 per thyristor arm</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
            <td style="padding: 8px; font-weight: bold;">Junction Temp (Tj)</td>
            <td style="padding: 8px;">Foster 3-Layer Virtual Sensor</td>
            <td style="padding: 8px;">10 Hz Model / 1 Hz Peak-Hold</td>
            <td style="padding: 8px;"><span class="thermal-pill warning" style="font-size: 8px;">ESTIMATED (MODEL)</span></td>
            <td style="padding: 8px; color: #828a99;">Conservative R_jc worst-case safety margin (+15%)</td>
        </tr>
        <tr>
            <td style="padding: 8px; font-weight: bold;">Cooling Residual</td>
            <td style="padding: 8px;">Delta Ts - Ts,pred</td>
            <td style="padding: 8px;">Rolling 60s Window</td>
            <td style="padding: 8px;"><span class="thermal-pill normal" style="font-size: 8px;">HIGH (DIAGNOSTIC)</span></td>
            <td style="padding: 8px; color: #828a99;">Debounced 5s to eliminate transient false trips</td>
        </tr>
    </table>
</div>
""", unsafe_allow_html=True)
