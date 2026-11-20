"""
THERMOSENSE - Drive Detail & Bridge Topology Page
Deep dive into 6-pulse bridge thermal dynamics, Foster RC layers, and live waveforms
Output Thermal Hardware Design Language
"""

import streamlit as st
from pathlib import Path
import sys
import numpy as np
import plotly.graph_objects as go
from datetime import datetime

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from data.data_source import get_latest

st.set_page_config(
    page_title="Drive Detail — THERMOSENSE",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Load global CSS
css_path = parent_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# Selected thyristor handling
if 'selected_thyristor' not in st.session_state:
    st.session_state['selected_thyristor'] = 1

data = get_latest()
sel_id = st.session_state['selected_thyristor']
sel_t = data.get_thyristor(sel_id) if hasattr(data, 'get_thyristor') else data.thyristors[sel_id - 1]

# Header Bar
st.markdown(f"""
<div class="thermal-header-bar">
    <div class="brand-badge">
        <div style="font-size: 22px; filter: drop-shadow(0 0 8px rgba(255, 77, 0, 0.6));">⚡</div>
        <div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
                <span class="brand-title" style="font-size: 18px;">THERMOSENSE</span>
                <span class="brand-divider">|</span>
                <span class="brand-subtitle">DRIVE DETAIL &bull; 6-PULSE BRIDGE</span>
            </div>
            <div style="font-size: 9px; color: #6e7687; font-family: 'IBM Plex Mono', monospace;">
                STAND-04 DC MOTOR DRIVE &bull; FOSTER 3-LAYER RC NETWORK
            </div>
        </div>
    </div>
    <div class="header-status-group">
        <div class="thermal-pill normal">
            <span class="status-dot"></span> SELECTED: THYRISTOR T{sel_id}
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# =============================================================================
# THYRISTOR CHANNEL SELECTOR (Reference: Sound Source selector in Output Thermal)
# =============================================================================
st.markdown("""
<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10.5px; font-weight: 700; color: #828a99; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
    SELECT THYRISTOR CHANNEL FOR TRANSIENT ANALYSIS
</div>
""", unsafe_allow_html=True)

selector_cols = st.columns(6)
for i in range(6):
    tid = i + 1
    t_obj = data.thyristors[i]
    try:
        t_val = t_obj.tj_estimated() if callable(getattr(t_obj, 'tj_estimated', None)) else getattr(t_obj, 'tj_estimated', 75.0)
        if isinstance(t_val, (list, tuple)):
            t_val = float(t_val[0])
        else:
            t_val = float(t_val)
    except Exception:
        t_val = 75.0
        
    is_active = (tid == sel_id)
    border_style = "border: 1px solid #ff7700; background: linear-gradient(160deg, #1f2330 0%, #13151f 100%);" if is_active else "border: 1px solid rgba(255,255,255,0.08); background: #0e1017;"
    glow_style = "box-shadow: 0 0 16px rgba(255, 119, 0, 0.35);" if is_active else ""
    
    with selector_cols[i]:
        st.markdown(f"""
        <div style="{border_style} {glow_style} border-radius: 6px; padding: 8px 6px; text-align: center; margin-bottom: 4px;">
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: {'#ff8800' if is_active else '#828a99'}; font-weight: 700;">T{tid}</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 700; color: #ffffff;">{t_val:.1f}°C</div>
        </div>
        """, unsafe_allow_html=True)
        if st.button(f"Select T{tid}", key=f"sel_btn_{tid}", use_container_width=True):
            st.session_state['selected_thyristor'] = tid
            st.rerun()

st.markdown("<br>", unsafe_allow_html=True)

# Safe extract for selected
try:
    sel_tj = sel_t.tj_estimated() if callable(getattr(sel_t, 'tj_estimated', None)) else getattr(sel_t, 'tj_estimated', 75.0)
    if isinstance(sel_tj, (list, tuple)):
        sel_tj = float(sel_tj[0])
    else:
        sel_tj = float(sel_tj)
except Exception:
    sel_tj = 75.0

try:
    sel_hs = sel_t.t_heatsink_measured() if callable(getattr(sel_t, 't_heatsink_measured', None)) else getattr(sel_t, 't_heatsink_measured', 45.0)
    if isinstance(sel_hs, (list, tuple)):
        sel_hs = float(sel_hs[0])
    else:
        sel_hs = float(sel_hs)
except Exception:
    sel_hs = 45.0

try:
    sel_ploss = getattr(sel_t, 'power_loss', 420.0)
    if callable(sel_ploss):
        sel_ploss = sel_ploss()
    sel_ploss = float(sel_ploss)
except Exception:
    sel_ploss = 420.0

try:
    sel_res = getattr(sel_t, 'residual', 2.5)
    if callable(sel_res):
        sel_res = sel_res()
    sel_res = float(sel_res)
except Exception:
    sel_res = 2.5

phase_map = {
    1: ("Phase U", "Upper Arm (Cathode Bus)"),
    2: ("Phase U", "Lower Arm (Anode Bus)"),
    3: ("Phase V", "Upper Arm (Cathode Bus)"),
    4: ("Phase V", "Lower Arm (Anode Bus)"),
    5: ("Phase W", "Upper Arm (Cathode Bus)"),
    6: ("Phase W", "Lower Arm (Anode Bus)"),
}
ph_name, arm_desc = phase_map.get(sel_id, ("Phase U", "Upper Arm"))

# =============================================================================
# DETAIL LAYOUT: 2 COLUMNS
# =============================================================================
col_left, col_right = st.columns([1.1, 1.3], gap="medium")

with col_left:
    # Selected Thyristor Diagnostic Card
    st.markdown(f"""
    <div class="hardware-card" style="border-top: 2px solid #ff7700; margin-bottom: 16px;">
        <div class="hardware-card-label">
            <span>DIAGNOSTIC TELEMETRY &bull; T{sel_id}</span>
            <span class="thermal-pill {'critical' if sel_tj>=125 else 'warning' if sel_tj>=105 else 'normal'}" style="font-size: 8px;">
                {getattr(sel_t, 'status', 'normal').upper()}
            </span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin: 8px 0 14px 0;">
            <div>
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; color: #ffffff;">
                    {ph_name} &bull; {arm_desc}
                </div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #828a99;">
                    DISC TYPE: 100mm SILICON THYRISTOR &bull; DOUBLE-SIDE FORCED AIR
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 32px; font-weight: 700; color: #ffffff; text-shadow: 0 0 14px rgba(255,119,0,0.5);">
                    {sel_tj:.1f}<span style="font-size: 16px; opacity: 0.7;">°C</span>
                </div>
                <div style="font-size: 10px; color: #ff8800; font-family: 'IBM Plex Mono'; font-weight: 600;">JUNCTION TEMP (Tj)</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 4px;">
                <div style="font-size: 9px; color: #828a99; font-family: 'Plus Jakarta Sans'; font-weight: 600;">HEATSINK (Ts)</div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 2px;">{sel_hs:.1f}°C</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 4px;">
                <div style="font-size: 9px; color: #828a99; font-family: 'Plus Jakarta Sans'; font-weight: 600;">POWER LOSS</div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 700; color: #ffaa00; margin-top: 2px;">{sel_ploss:.0f} W</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 4px;">
                <div style="font-size: 9px; color: #828a99; font-family: 'Plus Jakarta Sans'; font-weight: 600;">COOLING &Delta;T</div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 700; color: #00e5a3; margin-top: 2px;">{sel_res:.1f} K</div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Foster RC Network Layer Breakdown
    st.markdown("""
    <div class="hardware-card" style="margin-bottom: 16px;">
        <div class="hardware-card-label">
            <span>3-LAYER FOSTER RC THERMAL NETWORK</span>
            <span style="color: #ffaa00;">IMPEDANCE MODEL</span>
        </div>
        <div style="font-size: 11px; color: #828a99; line-height: 1.5; margin-bottom: 12px;">
            Transient heat propagation decomposes into 3 physical time constants capturing mill bar bite dynamics:
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="background: rgba(255, 77, 0, 0.08); border-left: 3px solid #ff4d00; padding: 8px 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #ffffff; font-size: 12px;">&tau;1 = 0.02s (Silicon Die Layer)</strong>
                    <div style="font-size: 9px; color: #828a99;">Fastest transient &bull; Captures 2.5s hot bar bite current surge</div>
                </div>
                <span class="thermal-pill warning" style="font-size: 8px;">FAST TRANSIENT</span>
            </div>

            <div style="background: rgba(255, 170, 0, 0.08); border-left: 3px solid #ffaa00; padding: 8px 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #ffffff; font-size: 12px;">&tau;2 = 0.50s (Moly/Copper Baseplate)</strong>
                    <div style="font-size: 9px; color: #828a99;">Intermediate spreading resistance through puck envelope</div>
                </div>
                <span class="thermal-pill normal" style="font-size: 8px;">SPREADING</span>
            </div>

            <div style="background: rgba(0, 229, 163, 0.08); border-left: 3px solid #00e5a3; padding: 8px 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #ffffff; font-size: 12px;">&tau;3 = 20.0s (Aluminum Extrusion Mass)</strong>
                    <div style="font-size: 9px; color: #828a99;">Slow bulk thermal storage tracked by physical RTD sensor</div>
                </div>
                <span class="thermal-pill normal" style="font-size: 8px;">BULK STORAGE</span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

with col_right:
    # Plotly Real-Time Transient Simulation Chart
    t_sec = np.linspace(0, 30, 150)
    # Simulated current profile with 2.5s bar impact surge
    i_arm = 700 + 150 * np.sin(t_sec / 5)
    # Inject bar impact at t = 10s to 12.5s
    impact_mask = (t_sec >= 10.0) & (t_sec <= 12.5)
    i_arm[impact_mask] += 380.0
    
    # Fast silicon layer responds immediately
    tj_sim = sel_tj - 8 + (i_arm / 1000) * 14 + np.random.normal(0, 0.3, len(t_sec))
    tj_sim[impact_mask] += 12.0 * np.sin((t_sec[impact_mask] - 10) / 2.5 * np.pi)
    
    # Slow heatsink layer has high thermal inertia
    hs_sim = sel_hs - 3 + 4 * (1 - np.exp(-t_sec / 15))

    fig_drive = go.Figure()
    
    # Junction trace
    fig_drive.add_trace(go.Scatter(
        x=t_sec, y=tj_sim, mode='lines',
        name=f'T{sel_id} Estimated Tj',
        line=dict(color='#ff4d00', width=2.5),
        fill='tozeroy', fillcolor='rgba(255, 77, 0, 0.08)'
    ))
    
    # Heatsink trace
    fig_drive.add_trace(go.Scatter(
        x=t_sec, y=hs_sim, mode='lines',
        name=f'T{sel_id} Measured Heatsink',
        line=dict(color='#00e5a3', width=2, dash='dot')
    ))

    fig_drive.add_hline(y=125, line_dash="dash", line_color="#ff2a2a", line_width=1.5,
                       annotation_text="Trip Limit: 125°C", annotation_font_color="#ff2a2a", annotation_font_size=9)
    fig_drive.add_hline(y=105, line_dash="dash", line_color="#ffaa00", line_width=1,
                       annotation_text="Warning: 105°C", annotation_font_color="#ffaa00", annotation_font_size=9)

    fig_drive.update_layout(
        height=260, margin=dict(l=30, r=16, t=32, b=20),
        paper_bgcolor='#0e1017', plot_bgcolor='#090a0e',
        font=dict(size=9.5, family='IBM Plex Mono, monospace', color='#828a99'),
        title=dict(text=f'TRANSIENT TEMPERATURE RESPONSE &bull; T{sel_id} BAR IMPACT SPIKE', font=dict(size=10, family='Plus Jakarta Sans', color='#ff8800'), x=0.04),
        xaxis=dict(title='TIME (SECONDS)', showgrid=True, gridcolor='#171b24', zeroline=False),
        yaxis=dict(title='TEMPERATURE (°C)', showgrid=True, gridcolor='#171b24', zeroline=False),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1, font=dict(size=9))
    )
    st.plotly_chart(fig_drive, use_container_width=True, config={'displayModeBar': False})

    # Armature current profile chart
    fig_current = go.Figure()
    fig_current.add_trace(go.Scatter(
        x=t_sec, y=i_arm, mode='lines',
        name='Armature Current (A)',
        line=dict(color='#3b82f6', width=2),
        fill='tozeroy', fillcolor='rgba(59, 130, 246, 0.08)'
    ))
    fig_current.update_layout(
        height=180, margin=dict(l=30, r=16, t=28, b=20),
        paper_bgcolor='#0e1017', plot_bgcolor='#090a0e',
        font=dict(size=9.5, family='IBM Plex Mono, monospace', color='#828a99'),
        title=dict(text='ARMATURE CURRENT PROFILE (Id &bull; ROLLING LOAD IMPACT)', font=dict(size=10, family='Plus Jakarta Sans', color='#3b82f6'), x=0.04),
        xaxis=dict(title='TIME (SECONDS)', showgrid=True, gridcolor='#171b24', zeroline=False),
        yaxis=dict(title='CURRENT (A)', showgrid=True, gridcolor='#171b24', zeroline=False),
        showlegend=False
    )
    st.plotly_chart(fig_current, use_container_width=True, config={'displayModeBar': False})
