"""
Critical alarm banner component
"""

import streamlit as st
from datetime import datetime
from typing import List, Dict


def render_alarm_banner(active_alarms: List[Dict]):
    """
    Render critical alarm banner at top of page
    
    Args:
        active_alarms: List of alarm dictionaries with keys:
            - thyristor_id: int
            - type: str (e.g., "junction_over_temp")
            - level: str ("warning" or "critical")
            - start_time: datetime
            - peak_value: float
            - recommended_action: str
            - acknowledged: bool
            - acknowledged_by: str (optional)
            - acknowledged_at: datetime (optional)
    """
    # Filter for critical alarms only (warnings shown elsewhere)
    critical_alarms = [a for a in active_alarms if a['level'] == 'critical' and not a.get('acknowledged', False)]
    
    if not critical_alarms:
        return  # No critical alarms, don't show banner
    
    # Show banner for each critical alarm (or just the first one to avoid clutter)
    alarm = critical_alarms[0]  # Show most recent/first critical
    
    # Calculate duration
    duration = datetime.now() - alarm['start_time']
    duration_str = f"{int(duration.total_seconds() // 60)}m {int(duration.total_seconds() % 60)}s"
    
    # Alarm type descriptions
    type_descriptions = {
        "junction_over_temp": "Junction Over-Temperature",
        "cooling_degradation": "Cooling System Degradation",
        "cooling_failure": "Possible Cooling Failure",
        "overload": "Drive Overload",
        "sensor_fault": "Sensor Fault"
    }
    
    alarm_desc = type_descriptions.get(alarm['type'], alarm['type'])
    
    # Build banner HTML
    banner_html = f"""
    <div style="
        background-color: #EA4335;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 18px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: pulse-opacity 1s infinite;
        box-shadow: 0 4px 12px rgba(234, 67, 53, 0.4);
    ">
        <div style="flex: 1;">
            <span style="font-size: 24px; margin-right: 12px;">🔴</span>
            <span>CRITICAL ALARM: T{alarm['thyristor_id']} - {alarm_desc}</span>
            <div style="font-size: 14px; font-weight: normal; margin-top: 8px; opacity: 0.9;">
                Value: {alarm['peak_value']:.1f} | Duration: {duration_str} | 
                Action: {alarm['recommended_action']}
            </div>
        </div>
    </div>
    
    <style>
        @keyframes pulse-opacity {{
            0%, 100% {{ opacity: 1; }}
            50% {{ opacity: 0.85; }}
        }}
    </style>
    """
    
    st.markdown(banner_html, unsafe_allow_html=True)
    
    # Acknowledge button
    col1, col2, col3 = st.columns([1, 1, 4])
    with col1:
        if st.button("🔔 Acknowledge", key=f"ack_banner_{alarm['thyristor_id']}_{alarm['type']}", 
                     use_container_width=True):
            # Set acknowledged in session state
            alarm['acknowledged'] = True
            alarm['acknowledged_by'] = st.session_state.get('current_user', 'Operator')
            alarm['acknowledged_at'] = datetime.now()
            st.rerun()
    
    with col2:
        if st.button("📊 View Details", key=f"view_details_{alarm['thyristor_id']}", 
                     use_container_width=True):
            st.session_state['selected_thyristor'] = alarm['thyristor_id']
            st.switch_page("pages/2_⚡_Drive_Detail.py")
    
    # Show additional critical alarms count if any
    if len(critical_alarms) > 1:
        st.warning(f"⚠️ {len(critical_alarms) - 1} additional critical alarm(s) active. View Alarms page for details.")


def render_acknowledged_banner(alarm: Dict):
    """Render a muted banner for acknowledged critical alarms"""
    
    ack_time = alarm.get('acknowledged_at', datetime.now())
    ack_by = alarm.get('acknowledged_by', 'Unknown')
    
    banner_html = f"""
    <div style="
        background-color: #5F6368;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    ">
        <div>
            <span style="margin-right: 8px;">✓</span>
            <span>Critical alarm acknowledged by {ack_by} at {ack_time.strftime('%H:%M:%S')}</span>
        </div>
        <div style="font-size: 12px; opacity: 0.8;">
            T{alarm['thyristor_id']} - {alarm['type']}
        </div>
    </div>
    """
    
    st.markdown(banner_html, unsafe_allow_html=True)


def render_warning_badge(warning_count: int):
    """
    Render a small warning badge (for sidebar or header)
    
    Args:
        warning_count: Number of active warnings
    """
    if warning_count == 0:
        return
    
    badge_html = f"""
    <div style="
        background-color: #FBBC04;
        color: black;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
        display: inline-block;
        margin-left: 8px;
    ">
        {warning_count} Warning{'s' if warning_count > 1 else ''}
    </div>
    """
    
    st.markdown(badge_html, unsafe_allow_html=True)
