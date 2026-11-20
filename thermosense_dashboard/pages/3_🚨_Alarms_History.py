"""
THERMOSENSE - Alarms & Incident Management Center
Real-time alarm dispatch, debounce logic, operator acknowledgment, and incident audit log
Output Thermal Hardware Design Language
"""

import streamlit as st
from pathlib import Path
import sys
from datetime import datetime, timedelta
import pandas as pd

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from data.data_source import get_latest, get_data_source

st.set_page_config(
    page_title="Alarms & Incidents — THERMOSENSE",
    page_icon="🚨",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Load global CSS
css_path = parent_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

data = get_latest()

# Initialize mock session alarm records if not present
if 'alarm_history' not in st.session_state:
    now = datetime.now()
    st.session_state['alarm_history'] = [
        {
            "id": "ALM-8041",
            "timestamp": (now - timedelta(minutes=42)).strftime('%H:%M:%S'),
            "thyristor": "T1",
            "type": "Junction Over-Temp (Trip Risk)",
            "level": "critical",
            "value": "126.8°C",
            "action": "Stand-04 Load shedding applied (-20%)",
            "acknowledged": True,
            "ack_by": "Operator (Shift A)"
        },
        {
            "id": "ALM-8038",
            "timestamp": (now - timedelta(hours=2, minutes=15)).strftime('%H:%M:%S'),
            "thyristor": "Loop A",
            "type": "Exchanger Filter Restriction (Residual > 4K)",
            "level": "warning",
            "value": "4.6 K",
            "action": "Scheduled air filter blowout on next mill pause",
            "acknowledged": True,
            "ack_by": "Engineer (Maintenance)"
        },
        {
            "id": "ALM-8032",
            "timestamp": (now - timedelta(hours=5, minutes=30)).strftime('%H:%M:%S'),
            "thyristor": "T3",
            "type": "Transient Spike on Bar Entry",
            "level": "warning",
            "value": "114.2°C",
            "action": "Self-cleared within 3.0s",
            "acknowledged": True,
            "ack_by": "System Auto-Clear"
        }
    ]

# Header Bar
st.markdown("""
<div class="thermal-header-bar">
    <div class="brand-badge">
        <div style="font-size: 22px; filter: drop-shadow(0 0 8px rgba(255, 77, 0, 0.6));">🚨</div>
        <div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
                <span class="brand-title" style="font-size: 18px;">THERMOSENSE</span>
                <span class="brand-divider">|</span>
                <span class="brand-subtitle">ALARM & INCIDENT RESPONSE</span>
            </div>
            <div style="font-size: 9px; color: #6e7687; font-family: 'IBM Plex Mono', monospace;">
                DEBOUNCE: 3.0s &bull; HYSTERESIS: 2.0K &bull; WCAG 2.1 AA COMPLIANT
            </div>
        </div>
    </div>
    <div class="header-status-group">
        <div class="thermal-pill warning">
            <span class="status-dot"></span> ADVISORY PILOT MODE
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# KPI Metrics Row
kpi1, kpi2, kpi3, kpi4 = st.columns(4)

with kpi1:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #ff4d00;">
        <div class="hardware-card-label">Active Trip Alerts</div>
        <div class="hardware-card-value" style="color: #ffffff;">0</div>
        <div class="hardware-card-subtext"><span>TRIP THRESHOLD: 125°C</span><span>ALL CLEAR</span></div>
    </div>
    """, unsafe_allow_html=True)

with kpi2:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #ffaa00;">
        <div class="hardware-card-label">Active Warnings</div>
        <div class="hardware-card-value" style="color: #ffaa00;">1</div>
        <div class="hardware-card-subtext"><span>FILTER RESIDUAL</span><span>4.2 K DELTA</span></div>
    </div>
    """, unsafe_allow_html=True)

with kpi3:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #00e5a3;">
        <div class="hardware-card-label">Mean Time To Ack (MTTA)</div>
        <div class="hardware-card-value" style="color: #00e5a3;">1.4 <span style="font-size: 14px; opacity: 0.7;">MIN</span></div>
        <div class="hardware-card-subtext"><span>SHIFT TARGET: &lt; 3.0m</span><span>OPTIMAL</span></div>
    </div>
    """, unsafe_allow_html=True)

with kpi4:
    st.markdown("""
    <div class="hardware-card" style="border-top: 2px solid #3b82f6;">
        <div class="hardware-card-label">Historical Incidents (24H)</div>
        <div class="hardware-card-value" style="color: #ffffff;">3</div>
        <div class="hardware-card-subtext"><span>STAND-04 LOGS</span><span>EXPORT READY</span></div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# Active Live Alarm Action Banner
st.markdown("""
<div class="hardware-card" style="border-left: 4px solid #ffaa00; margin-bottom: 20px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span class="thermal-pill warning" style="font-size: 9px;">ACTIVE WARNING</span>
                <span style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 700; color: #ffffff;">STAND-04 COOLING RESIDUAL: +4.2K</span>
            </div>
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; color: #828a99;">
                Heatsink actual temperature exceeds predicted thermal model by 4.2K. Indicates gradual intake filter clogging.
            </div>
        </div>
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #ffaa00;">
            DURATION: 14m 20s
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# Fault Injection Control Panel (For demonstration and testing)
with st.expander("🧪 Demo Simulation Fault Injection Controls (Testing Engine)", expanded=False):
    st.markdown("""
    <div style="font-size: 11px; color: #828a99; margin-bottom: 12px;">
        Trigger simulated industrial fault conditions on Stand-04 to observe real-time alarm triggering, debouncing, and model adaptation.
    </div>
    """, unsafe_allow_html=True)
    fcol1, fcol2, fcol3, fcol4 = st.columns(4)
    
    source = get_data_source()
    sim = getattr(source, 'backend', None)
    
    with fcol1:
        if st.button("Trigger Fan Failure", key="f_fan", use_container_width=True):
            if sim and hasattr(sim, 'inject_fault'):
                sim.inject_fault("fan_failure")
                st.warning("Fan failure injected!")
                st.rerun()
    with fcol2:
        if st.button("Inject 50% Filter Clogging", key="f_clog", use_container_width=True):
            if sim and hasattr(sim, 'inject_fault'):
                sim.inject_fault("clogging", 0.5)
                st.warning("Cooling clogging injected!")
                st.rerun()
    with fcol3:
        if st.button("Inject Overload Surge (+30%)", key="f_overload", use_container_width=True):
            if sim and hasattr(sim, 'inject_fault'):
                sim.inject_fault("overload")
                st.warning("Drive overload injected!")
                st.rerun()
    with fcol4:
        if st.button("Clear All Faults (Reset)", key="f_clear", use_container_width=True):
            if sim and hasattr(sim, 'inject_fault'):
                sim.inject_fault("clear")
                st.success("Faults cleared!")
                st.rerun()

st.markdown("<br>", unsafe_allow_html=True)

# Historical Incident Log Table
st.markdown("""
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; color: #828a99; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;">
    RECENT INCIDENT & TRIP EVENT AUDIT LOG
</div>
""", unsafe_allow_html=True)

for entry in st.session_state['alarm_history']:
    is_crit = (entry['level'] == 'critical')
    badge_cls = 'critical' if is_crit else 'warning'
    border_col = '#ff2a2a' if is_crit else '#ffaa00'
    
    st.markdown(f"""
    <div class="channel-row-item" style="border-left: 3px solid {border_col}; margin-bottom: 8px;">
        <div class="channel-title-group">
            <span class="channel-id-badge">{entry['id']}</span>
            <div>
                <div class="channel-name">{entry['type']} &bull; <strong style="color: {border_col};">{entry['thyristor']}</strong></div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #6b7382;">
                    TIME: {entry['timestamp']} &bull; VALUE: <span style="color: #ffffff;">{entry['value']}</span> &bull; {entry['action']}
                </div>
            </div>
        </div>
        <div class="channel-metrics-group">
            <div style="text-align: right;">
                <span class="thermal-pill {badge_cls}" style="font-size: 8px;">ACKNOWLEDGED</span>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #575e6d; margin-top: 2px;">
                    {entry['ack_by']}
                </div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

# Export capability
st.markdown("<br>", unsafe_allow_html=True)
df_history = pd.DataFrame(st.session_state['alarm_history'])
csv_data = df_history.to_csv(index=False).encode('utf-8')
st.download_button(
    label="Export Incident Log (CSV)",
    data=csv_data,
    file_name=f"thermosense_alarm_log_{datetime.now().strftime('%Y%m%d')}.csv",
    mime="text/csv"
)
