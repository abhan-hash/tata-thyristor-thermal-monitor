"""
Thyristor status tile component
"""

import streamlit as st
from data.data_source import ThyristorData


def render_thyristor_tile(thyristor: ThyristorData, clickable: bool = True):
    """
    Render a single thyristor status tile
    
    Args:
        thyristor: ThyristorData object
        clickable: If True, show as a button that navigates to Drive Detail
    """
    # Status icon mapping
    status_icons = {
        "normal": "✓",
        "warning": "⚠",
        "critical": "✕",
        "fault": "⊘"
    }
    
    # Status colors
    status_colors = {
        "normal": "#34A853",
        "warning": "#FBBC04",
        "critical": "#EA4335",
        "fault": "#5F6368"
    }
    
    icon = status_icons.get(thyristor.status, "?")
    color = status_colors.get(thyristor.status, "#5F6368")
    
    # Build tile HTML
    tile_html = f"""
    <div class="thyristor-tile {thyristor.status}" style="
        background-color: #242B33;
        border: 3px solid {color};
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        margin: 8px;
        {'cursor: pointer;' if clickable else ''}
        transition: transform 0.2s;
    ">
        <div style="font-size: 14px; color: #9AA0A6; margin-bottom: 8px;">
            <span style="color: {color}; font-size: 18px;">{icon}</span> 
            Thyristor T{thyristor.id}
        </div>
        
        <div style="font-family: 'Roboto Mono', monospace; font-size: 42px; 
                    font-weight: bold; color: {color}; margin: 12px 0;">
            {thyristor.tj_estimated:.1f}°C
        </div>
        
        <div style="font-size: 11px; color: #FBBC04; margin-bottom: 4px;">
            EST
        </div>
        
        <div style="font-size: 14px; color: #E8EAED; margin: 8px 0;">
            Margin: {thyristor.margin_to_limit:.1f}°C
        </div>
        
        <div style="font-size: 12px; color: #9AA0A6;">
            Heatsink: {thyristor.t_heatsink_measured:.1f}°C
        </div>
        
        <div style="font-size: 10px; color: #9AA0A6; margin-top: 8px;">
            {thyristor.status.upper()}
        </div>
    </div>
    """
    
    # If clickable, wrap in a column with button
    if clickable:
        if st.button(f"View T{thyristor.id}", key=f"tile_btn_{thyristor.id}", 
                     help=f"Click to view details for Thyristor {thyristor.id}", 
                     use_container_width=True):
            st.session_state['selected_thyristor'] = thyristor.id
            st.switch_page("pages/2_⚡_Drive_Detail.py")
    
    # Render the tile
    st.markdown(tile_html, unsafe_allow_html=True)


def render_thyristor_grid(drive_data, columns: int = 3):
    """
    Render a grid of thyristor tiles
    
    Args:
        drive_data: DriveData object
        columns: Number of columns in the grid
    """
    # Create grid (2 rows × 3 columns for 6 thyristors)
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
    Render a compact version of the thyristor tile (for sidebar or small spaces)
    """
    status_colors = {
        "normal": "#34A853",
        "warning": "#FBBC04",
        "critical": "#EA4335",
        "fault": "#5F6368"
    }
    
    status_icons = {
        "normal": "✓",
        "warning": "⚠",
        "critical": "✕",
        "fault": "⊘"
    }
    
    color = status_colors.get(thyristor.status, "#5F6368")
    icon = status_icons.get(thyristor.status, "?")
    
    compact_html = f"""
    <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background-color: #1A1F26;
        border-left: 4px solid {color};
        margin-bottom: 4px;
        border-radius: 4px;
    ">
        <span style="color: #E8EAED; font-size: 14px;">
            <span style="color: {color};">{icon}</span> T{thyristor.id}
        </span>
        <span style="
            font-family: 'Roboto Mono', monospace;
            font-size: 16px;
            font-weight: bold;
            color: {color};
        ">
            {thyristor.tj_estimated:.1f}°C
        </span>
    </div>
    """
    
    st.markdown(compact_html, unsafe_allow_html=True)
