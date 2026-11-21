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
import numpy as np
import plotly.graph_objects as go

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from data.data_source import get_latest, get_data_source
from components.output_nav import render_output_nav
from components.html_utils import render_html
from components.output_ui_kit import (
    render_page_header,
    render_plate_open,
    render_plate_close,
    render_kpi_tile_html,
    render_status_chip_html,
    render_empty_state,
    apply_warm_plotly_layout
)

st.set_page_config(
    page_title="Alarms & Incidents — THERMOSENSE",
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
render_output_nav("ALARMS & HISTORY")

# Initialize mock session alarm records if not present
if 'alarm_history' not in st.session_state:
    now = datetime.now()
    st.session_state['alarm_history'] = [
        {
            "id": "ALM-8041",
            "timestamp": (now - timedelta(minutes=14)).strftime('%H:%M:%S'),
            "thyristor": "T1",
            "type": "Junction Over-Temp (Trip Risk)",
            "level": "critical",
            "value": "126.8°C",
            "action": "Stand-04 Load shedding applied (-20%)",
            "acknowledged": False,
            "ack_by": None
        },
        {
            "id": "ALM-8038",
            "timestamp": (now - timedelta(hours=1, minutes=45)).strftime('%H:%M:%S'),
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
            "timestamp": (now - timedelta(hours=3, minutes=10)).strftime('%H:%M:%S'),
            "thyristor": "T3",
            "type": "Transient Spike on Bar Entry",
            "level": "warning",
            "value": "114.2°C",
            "action": "Self-cleared within 3.0s",
            "acknowledged": True,
            "ack_by": "System Auto-Clear"
        },
        {
            "id": "ALM-8025",
            "timestamp": (now - timedelta(hours=6, minutes=20)).strftime('%H:%M:%S'),
            "thyristor": "T5",
            "type": "Elevated Heatsink Gradient",
            "level": "warning",
            "value": "89.4°C",
            "action": "Blower speed increased to 100%",
            "acknowledged": True,
            "ack_by": "Operator (Shift A)"
        }
    ]

# Session filters
if 'sev_filter' not in st.session_state:
    st.session_state['sev_filter'] = "ALL"
if 'chan_filter' not in st.session_state:
    st.session_state['chan_filter'] = "ALL"

@st.fragment(run_every="2s")
def render_live_alarms():
    data = get_latest()
    alarms = st.session_state['alarm_history']

    active_unack = [a for a in alarms if not a['acknowledged']]
    crit_unack = [a for a in active_unack if a['level'] == 'critical']
    warn_unack = [a for a in active_unack if a['level'] == 'warning']

    overall_tier = "critical" if crit_unack else "warning" if warn_unack else "nominal"

    # 1. PAGE HEADER (Variant A: Compact Industrial Ribbon)
    render_page_header(
        title="ALARMS & INCIDENT MANAGEMENT",
        subtitle="DISPATCH LOG • DEBOUNCE LOGIC • OPERATOR ACKNOWLEDGMENT AUDIT",
        live_metric_val=f"{len(active_unack)}",
        live_metric_unit="ACTIVE",
        live_metric_label="UNACK ALERTS",
        status_tier=overall_tier,
        variant="ribbon"
    )

    # 2. KPI METRICS ROW WITH SPARKLINES
    k1, k2, k3, k4 = st.columns(4)
    with k1:
        render_html(render_kpi_tile_html(
            label="ACTIVE TRIP ALERTS",
            value=f"{len(crit_unack)}",
            unit="",
            delta="CRITICAL" if crit_unack else "ALL CLEAR",
            delta_type="up-warn" if crit_unack else "up-good",
            sparkline_values=[1, 1, 0, 0, 1, 0, len(crit_unack)],
            color="#E0201B" if crit_unack else "#C4C1BA"
        ))
    with k2:
        render_html(render_kpi_tile_html(
            label="ACTIVE WARNINGS",
            value=f"{len(warn_unack)}",
            unit="",
            delta="RESIDUAL" if warn_unack else "NOMINAL",
            delta_type="up-warn" if warn_unack else "up-good",
            sparkline_values=[2, 3, 2, 1, 2, 1, len(warn_unack)],
            color="#FFB020"
        ))
    with k3:
        render_html(render_kpi_tile_html(
            label="MEAN TIME TO ACK (MTTA)",
            value="1.2",
            unit="MIN",
            delta="OPTIMAL (< 3m)",
            delta_type="up-good",
            sparkline_values=[2.1, 1.8, 1.6, 1.4, 1.3, 1.2, 1.2],
            color="#F2B533"
        ))
    with k4:
        render_html(render_kpi_tile_html(
            label="24H TOTAL INCIDENTS",
            value=f"{len(alarms)}",
            unit="LOGGED",
            delta="AUDIT READY",
            delta_type="up-good",
            sparkline_values=[1, 2, 2, 3, 3, 4, len(alarms)],
            color="#FF9A3C"
        ))

    render_html("<br>")

    # 3. DIAGNOSTIC SIMULATION CONTROLS EXPANDER
    with st.expander("Diagnostic Simulation Controls (Engine Staging)", expanded=False):
        render_html("""
        <div style="font-size: 11px; color: #88847E; margin-bottom: 12px; font-family: 'Plus Jakarta Sans';">
            Trigger simulated industrial fault conditions on Stand-04 to observe real-time alarm triggering, debouncing, and model adaptation.
        </div>
        """)
        fcol1, fcol2, fcol3, fcol4 = st.columns(4)
        source = get_data_source()
        sim = getattr(source, 'backend', None)

        with fcol1:
            if st.button("Trigger Fan Failure", key="f_fan", use_container_width=True):
                if sim and hasattr(sim, 'inject_fault'):
                    sim.inject_fault("fan_failure")
                    # Add dynamic alarm
                    st.session_state['alarm_history'].insert(0, {
                        "id": f"ALM-{len(st.session_state['alarm_history'])+8050}",
                        "timestamp": datetime.now().strftime('%H:%M:%S'),
                        "thyristor": "Blower",
                        "type": "Cooling Fan Interlock Loss",
                        "level": "critical",
                        "value": "0 RPM",
                        "action": "Immediate forced convection lost; heat capacity buffer 30s",
                        "acknowledged": False,
                        "ack_by": None
                    })
                    st.rerun()
        with fcol2:
            if st.button("Inject 50% Filter Clogging", key="f_clog", use_container_width=True):
                if sim and hasattr(sim, 'inject_fault'):
                    sim.inject_fault("clogging", 0.5)
                    st.session_state['alarm_history'].insert(0, {
                        "id": f"ALM-{len(st.session_state['alarm_history'])+8050}",
                        "timestamp": datetime.now().strftime('%H:%M:%S'),
                        "thyristor": "Loop A",
                        "type": "Exchanger Filter Restriction (Residual > 4K)",
                        "level": "warning",
                        "value": "+5.2 K",
                        "action": "Filter delta exceeds baseline; scheduled blowout",
                        "acknowledged": False,
                        "ack_by": None
                    })
                    st.rerun()
        with fcol3:
            if st.button("Inject Overload Surge (+30%)", key="f_overload", use_container_width=True):
                if sim and hasattr(sim, 'inject_fault'):
                    sim.inject_fault("overload")
                    st.session_state['alarm_history'].insert(0, {
                        "id": f"ALM-{len(st.session_state['alarm_history'])+8050}",
                        "timestamp": datetime.now().strftime('%H:%M:%S'),
                        "thyristor": "T1",
                        "type": "Overload Surge Current (> 1000A)",
                        "level": "warning",
                        "value": "1040 A",
                        "action": "Mill governor requested Stand-04 relief",
                        "acknowledged": False,
                        "ack_by": None
                    })
                    st.rerun()
        with fcol4:
            if st.button("Clear All Faults (Reset)", key="f_clear", use_container_width=True):
                if sim and hasattr(sim, 'inject_fault'):
                    sim.inject_fault("clear")
                    for a in st.session_state['alarm_history']:
                        a['acknowledged'] = True
                        if not a['ack_by']:
                            a['ack_by'] = "System Reset"
                    st.rerun()

    render_html("<br>")

    # 4. FILTER CHIPS ROW
    render_plate_open("INCIDENT DISPATCH & TIMELINE AUDIT RAIL", "CHRONICLE")

    filter_col1, filter_col2 = st.columns([1, 1])
    with filter_col1:
        st.write("**Filter by Severity:**")
        s_all, s_crit, s_warn = st.columns(3)
        if s_all.button("ALL SEVERITY", key="btn_s_all", use_container_width=True):
            st.session_state['sev_filter'] = "ALL"
            st.rerun()
        if s_crit.button("CRITICAL ONLY", key="btn_s_crit", use_container_width=True):
            st.session_state['sev_filter'] = "CRITICAL"
            st.rerun()
        if s_warn.button("WARNING ONLY", key="btn_s_warn", use_container_width=True):
            st.session_state['sev_filter'] = "WARNING"
            st.rerun()

    with filter_col2:
        st.write("**Filter by Source Channel:**")
        c_all, c_t1, c_t2, c_t3, c_other = st.columns(5)
        if c_all.button("ALL CHANNELS", key="btn_c_all", use_container_width=True):
            st.session_state['chan_filter'] = "ALL"
            st.rerun()
        if c_t1.button("T1", key="btn_c_t1", use_container_width=True):
            st.session_state['chan_filter'] = "T1"
            st.rerun()
        if c_t2.button("T2", key="btn_c_t2", use_container_width=True):
            st.session_state['chan_filter'] = "T2"
            st.rerun()
        if c_t3.button("T3", key="btn_c_t3", use_container_width=True):
            st.session_state['chan_filter'] = "T3"
            st.rerun()
        if c_other.button("LOOP/BLOWER", key="btn_c_other", use_container_width=True):
            st.session_state['chan_filter'] = "LOOP"
            st.rerun()

    render_html("<br>")

    # Filter evaluation
    filtered_alarms = []
    for item in alarms:
        # Severity check
        if st.session_state['sev_filter'] == "CRITICAL" and item['level'] != "critical":
            continue
        if st.session_state['sev_filter'] == "WARNING" and item['level'] != "warning":
            continue
        # Channel check
        if st.session_state['chan_filter'] != "ALL":
            if st.session_state['chan_filter'] == "LOOP" and ("Loop" not in item['thyristor'] and "Blower" not in item['thyristor']):
                continue
            if st.session_state['chan_filter'] != "LOOP" and item['thyristor'] != st.session_state['chan_filter']:
                continue
        filtered_alarms.append(item)

    # 5. VERTICAL RAIL TIMELINE
    if not filtered_alarms:
        render_empty_state(
            headline="NO INCIDENTS MATCHING ACTIVE FILTER",
            description="All monitored thyristor channels, heat exchangers, and cooling blowers are operating within safety envelopes for this criteria.",
            icon_type="alarms"
        )
    else:
        render_html('<div class="timeline-rail">')
        for idx, entry in enumerate(filtered_alarms):
            is_crit = (entry['level'] == 'critical')
            marker_cls = "critical" if is_crit else "warning"
            border_col = "#E0201B" if is_crit else "#FFB020"
            chip_markup = render_status_chip_html(entry['level'])

            render_html(f"""
            <div class="timeline-item">
                <div class="timeline-marker {marker_cls}"></div>
                <div class="timeline-content-card" style="border-left: 3px solid {border_col};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700; color: #FFFFFF; background: #201F1D; padding: 2px 7px; border-radius: 4px;">{entry['id']}</span>
                            <span style="font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF;">{entry['type']}</span>
                            <strong style="color: {border_col}; font-family: 'IBM Plex Mono'; font-size: 12px;">{entry['thyristor']}</strong>
                        </div>
                        <div>
                            {chip_markup}
                        </div>
                    </div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: #88847E; margin-bottom: 8px;">
                        DISPATCH TIMESTAMP: <span style="color: #FFFFFF;">{entry['timestamp']}</span> • RECORDED VALUE: <span style="color: #FFB020;">{entry['value']}</span>
                    </div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; color: #9A9894; margin-bottom: 12px; line-height: 1.5;">
                        AUTOMATED MITIGATION / OPERATING NOTE: {entry['action']}
                    </div>
            """)

            # Acknowledge button and inline temperature trace
            tcol1, tcol2 = st.columns([3, 1])
            with tcol1:
                with st.expander(f"View Temperature Trace around {entry['id']}", expanded=False):
                    trace_t = np.linspace(-15, 15, 60)
                    base_temp = 85.0 if not is_crit else 115.0
                    spike = 15.0 * np.exp(-(trace_t / 3.0)**2)
                    y_trace = base_temp + spike + np.random.normal(0, 0.4, len(trace_t))

                    fig_mini = go.Figure()
                    fig_mini.add_trace(go.Scatter(
                        x=trace_t, y=y_trace, mode='lines',
                        line=dict(color=border_col, width=2),
                        fill='tozeroy', fillcolor=f"rgba({224 if is_crit else 255}, {32 if is_crit else 176}, {27 if is_crit else 32}, 0.08)"
                    ))
                    apply_warm_plotly_layout(
                        fig=fig_mini,
                        title=f"{entry['id']} EVENT SIGNATURE (T ±15s)",
                        y_title="°C",
                        height=160,
                        show_thresholds=True,
                        warning_val=105.0,
                        trip_val=125.0
                    )
                    fig_mini.update_xaxes(title="TIMELINE RELATIVE TO TRIP (SECONDS)")
                    st.plotly_chart(fig_mini, use_container_width=True, config={'displayModeBar': False})

            with tcol2:
                if not entry['acknowledged']:
                    if st.button(f"ACKNOWLEDGE", key=f"ack_{entry['id']}", use_container_width=True):
                        entry['acknowledged'] = True
                        entry['ack_by'] = "Operator (Live Shift)"
                        st.rerun()
                else:
                    render_html(f"""
                    <div style="text-align: right; font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: #88847E; padding-top: 6px;">
                        ACKNOWLEDGED BY:<br><strong style="color: #C4C1BA;">{entry.get('ack_by', 'Operator')}</strong>
                    </div>
                    """)

            render_html("</div></div>")  # Close timeline-content-card and timeline-item

        render_html("</div>")  # Close timeline-rail

    render_plate_close()

    # Export capability
    render_html("<br>")
    df_history = pd.DataFrame(st.session_state['alarm_history'])
    csv_data = df_history.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="Export Incident Audit Log (CSV)",
        data=csv_data,
        file_name=f"thermosense_alarm_log_{datetime.now().strftime('%Y%m%d')}.csv",
        mime="text/csv"
    )

render_live_alarms()
