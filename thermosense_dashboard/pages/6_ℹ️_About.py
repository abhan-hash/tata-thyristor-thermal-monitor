"""
THERMOSENSE - Technical Methodology & Engineering Dossier
Tata Steel Hot Strip Mill Stand-04 Thyristor Thermal Monitor
Output Thermal Hardware Design Language
"""

import streamlit as st
from pathlib import Path
import sys
import base64

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from components.output_nav import render_output_nav
from components.html_utils import render_html
from components.output_ui_kit import (
    render_page_header,
    render_plate_open,
    render_plate_close
)
from components.svg_schematics import (
    render_foster_ladder_svg,
    render_isometric_mill_cutaway_svg,
    render_heat_exchanger_svg
)

st.set_page_config(
    page_title="Technical Dossier — THERMOSENSE",
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

# 1. STANDARDIZED PAGE HEADER (Variant A: Compact Industrial Ribbon)
render_page_header(
    title="TECHNICAL DOSSIER & SYSTEM ARCHITECTURE",
    subtitle="TATA STEEL HSM STAND-04 • VIRTUAL THERMAL IMPEDANCE SPECIFICATION",
    live_metric_val="QUALIFIED",
    live_metric_unit="PILOT",
    live_metric_label="SYSTEM STATUS",
    status_tier="nominal",
    variant="ribbon"
)

# 2. HERO BANNER IMAGE (Optimized WebP, Dark Luxury Hot Rolling Atmosphere)
banner_path = parent_dir / "assets" / "about_hero_banner.webp"
if banner_path.exists():
    with open(banner_path, "rb") as bf:
        banner_b64 = base64.b64encode(bf.read()).decode("utf-8")
    render_html(f"""
    <div style="margin-bottom: 22px; position: relative; border-radius: 8px; overflow: hidden; border: 1px solid #282624; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);">
        <img src="data:image/webp;base64,{banner_b64}" width="1376" height="420" alt="Tata Steel Stand-04 Hot Strip Mill Rolling Operation"
             style="width: 100%; height: 320px; object-fit: cover; display: block; filter: contrast(1.05) brightness(0.95);" />
        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(180deg, transparent 0%, rgba(14, 13, 12, 0.95) 100%); padding: 24px 28px 16px 28px;">
            <div style="font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.1em;">
                TATA STEEL HOT STRIP MILL (HSM) • FINISHING STAND-04
            </div>
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; color: #C4C1BA; margin-top: 4px;">
                Main DC Drive 6-Pulse Graetz Bridge • 1000A Continuous / 1400A Bar Entry Peak Conduction
            </div>
        </div>
    </div>
    """)

# Advisory Safety Banner
render_html("""
<div style="background: rgba(255, 176, 32, 0.08); border: 1px solid rgba(255, 176, 32, 0.3); border-left: 3px solid #FFB020; border-radius: 6px; padding: 12px 18px; margin-bottom: 22px; font-size: 11px; color: #C4C1BA; line-height: 1.6;">
    <strong style="color: #FFB020; text-transform: uppercase;">Advisory Operating Notice:</strong>
    THERMOSENSE outputs are advisory during pilot qualification. Junction temperature is an online estimated state variable computed via Foster RC transfer functions. Field validation against optical and calibrated fiber-optic test fixtures is mandatory prior to safety interlock commissioning.
</div>
""")

# 3. VIRTUAL SENSOR 4-STEP VISUAL PIPELINE
render_plate_open("VIRTUAL SENSOR METHODOLOGY: 4-STEP IMPEDANCE PIPELINE", "ALGORITHM FLOW")
render_html("""
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 12px;">
    <!-- Step 1 -->
    <div style="background: #141312; border: 1px solid #282624; border-top: 2px solid #C4C1BA; border-radius: 6px; padding: 14px;">
        <div style="font-family: 'IBM Plex Mono'; font-size: 9px; color: #88847E; font-weight: 700;">STAGE 01 // TELEMETRY</div>
        <div style="font-family: 'Montserrat'; font-size: 13px; font-weight: 700; color: #FFFFFF; margin: 6px 0 8px 0;">Sensing Acquisition</div>
        <div style="font-size: 11px; color: #88847E; line-height: 1.5;">
            Physical PT100 RTDs sample bulk heatsink temperature Ts at 1 Hz. Armature CT transducer captures DC current Id at 10 Hz Modbus.
        </div>
    </div>

    <!-- Step 2 -->
    <div style="background: #141312; border: 1px solid #282624; border-top: 2px solid #F2B533; border-radius: 6px; padding: 14px;">
        <div style="font-family: 'IBM Plex Mono'; font-size: 9px; color: #88847E; font-weight: 700;">STAGE 02 // DYNAMICS</div>
        <div style="font-family: 'Montserrat'; font-size: 13px; font-weight: 700; color: #FFFFFF; margin: 6px 0 8px 0;">Loss Calculation</div>
        <div style="font-size: 11px; color: #88847E; line-height: 1.5;">
            Computes instantaneous power loss per thyristor arm: <span style="font-family: 'IBM Plex Mono'; color: #F2B533;">P_loss = V_f0(Id/3) + r_d(Id/3)²</span> at 10 Hz.
        </div>
    </div>

    <!-- Step 3 -->
    <div style="background: #141312; border: 1px solid #282624; border-top: 2px solid #FF9A3C; border-radius: 6px; padding: 14px;">
        <div style="font-family: 'IBM Plex Mono'; font-size: 9px; color: #88847E; font-weight: 700;">STAGE 03 // FOSTER RC</div>
        <div style="font-family: 'Montserrat'; font-size: 13px; font-weight: 700; color: #FFFFFF; margin: 6px 0 8px 0;">Thermal Spreading</div>
        <div style="font-size: 11px; color: #88847E; line-height: 1.5;">
            Transient impedance Z_th decomposed across 3 time constants: Die surge (20ms), Baseplate (500ms), and Bulk extrusion (20s).
        </div>
    </div>

    <!-- Step 4 -->
    <div style="background: #141312; border: 1px solid #282624; border-top: 2px solid #FF5A1F; border-radius: 6px; padding: 14px;">
        <div style="font-family: 'IBM Plex Mono'; font-size: 9px; color: #88847E; font-weight: 700;">STAGE 04 // ESTIMATION</div>
        <div style="font-family: 'Montserrat'; font-size: 13px; font-weight: 700; color: #FFFFFF; margin: 6px 0 8px 0;">Virtual State & Alert</div>
        <div style="font-size: 11px; color: #88847E; line-height: 1.5;">
            Calculates true junction temperature Tj(t) and cooling residual ΔT. Dispatches early warnings days prior to physical hardware trip.
        </div>
    </div>
</div>
""")
render_plate_close()

render_html("<br>")

# 4. FOSTER RC 3-STAGE IMPEDANCE LADDER SCHEMATIC
render_plate_open("3-STAGE FOSTER RC EQUIVALENT NETWORK & TRANSFER FUNCTION", "THERMAL LADDER")
foster_svg = render_foster_ladder_svg(p_loss=840.0, tj=94.5, ths=46.8, height=210)
render_html(foster_svg)
render_html("""
<div style="font-size: 11.5px; color: #88847E; line-height: 1.6; margin-top: 12px;">
    In high-power rolling mill converters, silicon thermal capacity is tiny compared to heatsink mass.
    The virtual sensor models heat flow through decoupled exponential filters:
    <span style="font-family: 'IBM Plex Mono'; color: #FFFFFF;">dx_i/dt = (P_loss · R_i - x_i) / τ_i</span>, ensuring zero lag during rapid 2.4s steel slab entry.
</div>
""")
render_plate_close()

render_html("<br>")

# 5. STAND-04 PHYSICAL DEPLOYMENT ISOMETRIC CUTAWAY
render_plate_open("STAND-04 4-HIGH MILL STAND & DC DRIVE ENCLOSURE CUTAWAY", "PLANT INTEGRATION")
mill_svg = render_isometric_mill_cutaway_svg(option=1, height=330)
render_html(mill_svg)
render_plate_close()

render_html("<br>")

# 6. FORCED-AIR HEAT EXCHANGER & COOLING DUCT SCHEMATIC
render_plate_open("FORCED-AIR HEAT EXCHANGER & COOLING DUCT DYNAMICS", "COOLING SYSTEM")
hx_svg = render_heat_exchanger_svg(inlet_temp=35.0, outlet_temp=46.8, fan_running=True, clogging_pct=0.15, height=190)
render_html(hx_svg)
render_plate_close()

render_html("<br>")

# 7. SENSOR PROVENANCE & CONFIDENCE CLASSIFICATION
render_plate_open("SENSOR PROVENANCE & CALIBRATION CONFIDENCE MATRIX", "AUDIT TRAIL")
render_html("""
<table style="width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #FFFFFF;">
    <tr style="border-bottom: 1px solid #282624; text-align: left; color: #88847E;">
        <th style="padding: 10px;">VARIABLE</th>
        <th style="padding: 10px;">SOURCE SENSOR</th>
        <th style="padding: 10px;">SAMPLING RATE</th>
        <th style="padding: 10px;">CONFIDENCE CLASS</th>
        <th style="padding: 10px;">FAILURE MODE MITIGATION</th>
    </tr>
    <tr style="border-bottom: 1px solid #282624;">
        <td style="padding: 10px; font-weight: bold;">Heatsink Temp (Ts)</td>
        <td style="padding: 10px;">PT100 4-Wire RTD</td>
        <td style="padding: 10px;">1 Hz PLC Analog Input</td>
        <td style="padding: 10px;"><span class="status-chip nominal"><span>HIGH (MEASURED)</span></span></td>
        <td style="padding: 10px; color: #88847E;">Out-of-range sensor clamp + open circuit trip</td>
    </tr>
    <tr style="border-bottom: 1px solid #282624;">
        <td style="padding: 10px; font-weight: bold;">Armature Current (Id)</td>
        <td style="padding: 10px;">Hall Effect Transducer</td>
        <td style="padding: 10px;">10 Hz Fast Modbus</td>
        <td style="padding: 10px;"><span class="status-chip nominal"><span>HIGH (MEASURED)</span></span></td>
        <td style="padding: 10px; color: #88847E;">Shared bus current split 1/3 per thyristor arm</td>
    </tr>
    <tr style="border-bottom: 1px solid #282624;">
        <td style="padding: 10px; font-weight: bold;">Junction Temp (Tj)</td>
        <td style="padding: 10px;">Foster 3-Layer Virtual Sensor</td>
        <td style="padding: 10px;">10 Hz Model / 1 Hz Peak-Hold</td>
        <td style="padding: 10px;"><span class="status-chip warning"><span>ESTIMATED (MODEL)</span></span></td>
        <td style="padding: 10px; color: #88847E;">Conservative R_jc worst-case safety margin (+15%)</td>
    </tr>
    <tr>
        <td style="padding: 10px; font-weight: bold;">Cooling Residual (ΔT)</td>
        <td style="padding: 10px;">Delta Ts - Ts,pred</td>
        <td style="padding: 10px;">Rolling 60s Window</td>
        <td style="padding: 10px;"><span class="status-chip nominal"><span>HIGH (DIAGNOSTIC)</span></span></td>
        <td style="padding: 10px; color: #88847E;">Debounced 5s to eliminate transient false trips</td>
    </tr>
</table>
""")
render_plate_close()
