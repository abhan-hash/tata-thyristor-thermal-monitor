"""
THERMOSENSE - Thyristor Status Tile Component
Sleek Output Thermal Hardware Tile Architecture
"""

import streamlit as st
try:
    from data.data_source import ThyristorData
except ImportError:
    from thermosense_dashboard.data.data_source import ThyristorData


def render_thyristor_tile(thyristor: ThyristorData, clickable: bool = True):
    """
    Render a single thyristor status tile in Output Thermal hardware style
    """
    status = getattr(thyristor, 'status', 'normal')
    
    # Extract Tj safely
    try:
        val = thyristor.tj_estimated() if callable(getattr(thyristor, 'tj_estimated', None)) else getattr(thyristor, 'tj_estimated', 75.0)
        if isinstance(val, (list, tuple)):
            tj_val = float(val[0])
        else:
            tj_val = float(val)
    except Exception:
        tj_val = 75.0
        
    try:
        hs_val = thyristor.t_heatsink_measured() if callable(getattr(thyristor, 't_heatsink_measured', None)) else getattr(thyristor, 't_heatsink_measured', 45.0)
        if isinstance(hs_val, (list, tuple)):
            hs_val = float(hs_val[0])
        else:
            hs_val = float(hs_val)
    except Exception:
        hs_val = 45.0
        
    margin = 125.0 - tj_val
    t_id = getattr(thyristor, 'id', 1)
    
    # Color classes
    if tj_val >= 125.0:
        status_color = "#ff2a2a"
        status_cls = "critical"
    elif tj_val >= 105.0:
        status_color = "#ffaa00"
        status_cls = "warning"
    else:
        status_color = "#00e5a3"
        status_cls = "normal"
        
    tile_html = f"""
    <div class="hardware-card" style="text-align: center; padding: 18px 12px; margin-bottom: 12px; border-top: 2px solid {status_color};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700; color: #ffffff; background: rgba(255,255,255,0.06); padding: 2px 7px; border-radius: 4px;">
                T{t_id}
            </span>
            <span class="thermal-pill {status_cls}" style="font-size: 8px; padding: 2px 6px;">
                {status.upper()}
            </span>
        </div>
        
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 28px; font-weight: 700; color: #ffffff; margin: 8px 0; text-shadow: 0 0 14px {status_color}40;">
            {tj_val:.1f}<span style="font-size: 14px; opacity: 0.7; margin-left: 2px;">°C</span>
        </div>
        
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 9px; font-weight: 600; color: #ff8800; letter-spacing: 1px; text-transform: uppercase;">
            JUNCTION (EST)
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #7f8796;">
            <span>HEATSINK: <strong style="color: #ffffff;">{hs_val:.1f}°C</strong></span>
            <span>MARGIN: <strong style="color: {status_color};">{margin:.1f}°C</strong></span>
        </div>
    </div>
    """
    
    st.markdown(tile_html, unsafe_allow_html=True)
    
    if clickable:
        if st.button(f"Analyze T{t_id}", key=f"btn_tile_{t_id}", use_container_width=True):
            st.session_state['selected_thyristor'] = t_id
            try:
                st.switch_page("pages/2_⚡_Drive_Detail.py")
            except Exception:
                pass


def render_thyristor_grid(drive_data, columns: int = 3):
    """
    Render a grid of thyristor tiles
    """
    rows = (len(drive_data.thyristors) + columns - 1) // columns
    
    for row in range(rows):
        cols = st.columns(columns)
        for col_idx in range(columns):
            thyristor_idx = row * columns + col_idx
            if thyristor_idx < len(drive_data.thyristors):
                with cols[col_idx]:
                    render_thyristor_tile(drive_data.thyristors[thyristor_idx])


def render_compact_tile(thyristor: ThyristorData):
    """
    Compact version for sidebars or tight panels
    """
    render_thyristor_tile(thyristor, clickable=False)
