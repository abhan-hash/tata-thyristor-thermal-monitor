"""
THERMOSENSE - Critical Alarm Banner Component
Output Thermal Dark Hardware Aesthetic
"""

import streamlit as st
from datetime import datetime
from typing import List, Dict


def render_alarm_banner(active_alarms: List[Dict]):
    """
    Render high-contrast critical alarm banner at top of page
    """
    critical_alarms = [a for a in active_alarms if a.get('level') == 'critical' and not a.get('acknowledged', False)]
    
    if not critical_alarms:
        return
    
    alarm = critical_alarms[0]
    
    start_time = alarm.get('start_time', datetime.now())
    duration = datetime.now() - start_time
    duration_str = f"{int(duration.total_seconds() // 60)}m {int(duration.total_seconds() % 60)}s"
    
    type_descriptions = {
        "junction_over_temp": "Junction Over-Temperature Trip Risk",
        "cooling_degradation": "Exchanger Airflow / Cooling Degradation",
        "cooling_failure": "Critical Cooling Loop Failure",
        "overload": "Armature Current Overload Buildup",
        "sensor_fault": "Telemetry Hardware Sensor Fault"
    }
    
    alarm_desc = type_descriptions.get(alarm.get('type', ''), alarm.get('type', 'Thermal Trip Alarm'))
    peak_val = alarm.get('peak_value', 125.0)
    action = alarm.get('recommended_action', 'Reduce stand load immediately and check cooling intake.')
    t_id = alarm.get('thyristor_id', 1)
    
    banner_html = f"""
    <div style="
        background: linear-gradient(90deg, rgba(255, 42, 42, 0.16) 0%, #161822 100%);
        border: 1px solid rgba(255, 42, 42, 0.45);
        border-left: 4px solid #ff2a2a;
        box-shadow: 0 4px 20px rgba(255, 42, 42, 0.25);
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
    ">
        <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <span class="thermal-pill critical" style="font-size: 9px; padding: 3px 8px;">
                    <span class="status-dot"></span> CRITICAL ALARM
                </span>
                <span style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 700; color: #ffffff;">
                    STAND-04 &bull; THYRISTOR T{t_id}
                </span>
                <span style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 600; color: #ff5555;">
                    &mdash; {alarm_desc}
                </span>
            </div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #a1a9b8; margin-top: 4px;">
                PEAK VALUE: <strong style="color: #ffffff;">{peak_val:.1f}°C</strong> &nbsp;|&nbsp; 
                ELAPSED: <strong style="color: #ffaa00;">{duration_str}</strong> &nbsp;|&nbsp; 
                PROTOCOL: <strong style="color: #ffffff;">{action}</strong>
            </div>
        </div>
    </div>
    """
    
    st.markdown(banner_html, unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 1, 4])
    with col1:
        if st.button("Acknowledge", key=f"ack_banner_{t_id}_{alarm.get('type')}", use_container_width=True):
            alarm['acknowledged'] = True
            alarm['acknowledged_by'] = st.session_state.get('current_user', 'Operator')
            alarm['acknowledged_at'] = datetime.now()
            st.rerun()
            
    with col2:
        if st.button("Inspect T{t_id}", key=f"inspect_btn_{t_id}", use_container_width=True):
            st.session_state['selected_thyristor'] = t_id
            try:
                st.switch_page("pages/2_⚡_Drive_Detail.py")
            except Exception:
                pass
