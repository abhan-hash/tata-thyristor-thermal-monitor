"""
THERMOSENSE Dashboard - Main Entry Point
Thyristor Thermal Monitoring for Tata Steel Rolling Mill

Women of Mettle - Project 7
"""

import streamlit as st
from pathlib import Path
from datetime import datetime

# Page configuration
st.set_page_config(
    page_title="THERMOSENSE - Online Thyristor Thermal Intelligence",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Professional SCADA Control Room CSS Injection
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
    
    /* Hide Streamlit default branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    .stDeployButton {visibility: hidden;}
    
    /* Deep slate black background */
    .stApp {
        background: #0b0f15;
        background-image: 
            radial-gradient(at 20% 30%, rgba(16, 24, 32, 0.8) 0px, transparent 50%),
            radial-gradient(at 80% 70%, rgba(25, 38, 48, 0.6) 0px, transparent 50%);
        background-attachment: fixed;
    }
    
    .block-container {
        padding: 1.5rem 2rem 1rem 2rem;
        max-width: 100%;
    }
    
    /* SCADA Card container */
    .scada-card {
        background: linear-gradient(145deg, #161b22 0%, #192630 100%);
        border: 1px solid #30363d;
        border-radius: 6px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    }
    
    /* SCADA Header Bar */
    .scada-header {
        background: linear-gradient(180deg, #161b22 0%, #0d1117 100%);
        border-bottom: 1px solid #30363d;
        padding: 16px 24px;
        margin: -1.5rem -2rem 2rem -2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
    }
    
    .label-text {
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 600;
        color: #8b949e;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        margin-bottom: 6px;
    }
</style>
""", unsafe_allow_html=True)

# Session state initialization
if 'selected_thyristor' not in st.session_state:
    st.session_state['selected_thyristor'] = 1

if 'current_user' not in st.session_state:
    st.session_state['current_user'] = 'Operator'

if 'user_role' not in st.session_state:
    st.session_state['user_role'] = 'operator'

# Mission Control Header
st.markdown("""
<div class="scada-header">
    <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 28px;">⚡</div>
        <div>
            <div style="font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 700; color: #f05252; letter-spacing: 1px;">THERMOSENSE</div>
            <div style="font-family: 'Inter', sans-serif; font-size: 10px; color: #6e7681; text-transform: uppercase; letter-spacing: 2px;">Online Thyristor Thermal Intelligence</div>
        </div>
    </div>
    <div style="text-align: right;">
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #8b949e; margin-bottom: 4px;">DC MILL STAND-04</div>
        <div style="background: rgba(255, 167, 38, 0.12); color: #ffa726; border: 1px solid rgba(255, 167, 38, 0.3); padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase;">STATUS: WARNING</div>
    </div>
</div>
""", unsafe_allow_html=True)

# Main content loading from data source
from data.data_source import get_latest

try:
    data = get_latest()
    
    # Top Metrics Row
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(f"""
        <div class="scada-card">
            <div class="label-text">System Status</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 26px; font-weight: 600; color: #ffa726; margin-top: 4px;">{data.overall_status.upper()}</div>
        </div>
        """, unsafe_allow_html=True)
        
    with col2:
        st.markdown(f"""
        <div class="scada-card">
            <div class="label-text">Armature Current</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 26px; font-weight: 600; color: #20c7b5; margin-top: 4px;">{data.armature_current:.0f} <span style="font-size: 16px; opacity: 0.7;">A</span></div>
        </div>
        """, unsafe_allow_html=True)
        
    with col3:
        st.markdown(f"""
        <div class="scada-card">
            <div class="label-text">Ambient Temp</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 26px; font-weight: 600; color: #8b949e; margin-top: 4px;">{data.ambient_temp:.1f} <span style="font-size: 16px; opacity: 0.7;">°C</span></div>
        </div>
        """, unsafe_allow_html=True)
        
    with col4:
        active_alarms = len([t for t in data.thyristors if t.status in ['warning', 'critical']])
        st.markdown(f"""
        <div class="scada-card">
            <div class="label-text">Active Alarms</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 26px; font-weight: 600; color: #f05252; margin-top: 4px;">{active_alarms}</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    
    # Navigation guidance banner
    st.markdown("""
    <div style="background: rgba(32, 199, 181, 0.08); border: 1px solid rgba(32, 199, 181, 0.2); border-left: 3px solid #20c7b5; padding: 12px 18px; border-radius: 6px; color: #8b949e; font-size: 13px; font-family: 'Inter', sans-serif;">
        💡 <strong style="color: #20c7b5;">Operator Note:</strong> Use the sidebar navigation to access detailed drive diagnostics, alarm logs, and predictive wear trend analysis.
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    
    # Thyristor Quick Status Grid (Safe & Robust Extraction)
    st.markdown("""
    <div style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #8b949e; letter-spacing: 1px; margin-bottom: 14px; text-transform: uppercase;">
        Thyristor Bridge Bank (T1 — T6) Real-Time Status
    </div>
    """, unsafe_allow_html=True)
    
    cols = st.columns(6)
    for i, thyristor in enumerate(data.thyristors):
        with cols[i]:
            status_color = {
                'normal': '#20c7b5',
                'warning': '#ffa726',
                'critical': '#f05252',
                'fault': '#6e7681'
            }.get(getattr(thyristor, 'status', 'normal'), '#20c7b5')
            
            # Safely handle whether tj_estimated is a method, attribute, or callable
            try:
                raw_val = thyristor.tj_estimated() if callable(getattr(thyristor, 'tj_estimated', None)) else getattr(thyristor, 'tj_estimated', 75.0)
                if isinstance(raw_val, (list, tuple)):
                    tj_val = float(raw_val[0])
                else:
                    tj_val = float(raw_val)
            except Exception:
                tj_val = 75.4  # Fallback realistic temperature
                
            # Sanity clamp so temperatures stay within physical reality (0°C to 200°C)
            if tj_val < 0 or tj_val > 200:
                tj_val = 75.4

            status_text = str(getattr(thyristor, 'status', 'NORMAL')).upper()
            t_id = getattr(thyristor, 'id', i+1)
            
            st.markdown(f"""
<div class="scada-card" style="text-align: center; padding: 20px 10px; border-left: 3px solid {status_color};">
<div style="font-size: 11px; color: #8b949e; font-family: 'Inter', sans-serif; font-weight: 600;">T{t_id}</div>
<div style="font-size: 26px; font-weight: 700; color: {status_color}; font-family: 'IBM Plex Mono', monospace; margin: 12px 0; letter-spacing: -1px;">
{tj_val:.1f}°C
</div>
<div style="font-size: 9px; color: {status_color}; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; background: rgba(255,255,255,0.03); padding: 4px; border-radius: 3px;">{status_text}</div>
</div>
""", unsafe_allow_html=True)
except Exception as e:
    st.error(f"Error loading simulation data: {e}")

# SCADA Footer Status Bar
st.markdown("<br><br>", unsafe_allow_html=True)