"""
THERMOSENSE - Settings Page
Model parameters and threshold configuration
"""

import streamlit as st
from pathlib import Path
import sys
import yaml

parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

st.set_page_config(
    page_title="Settings - THERMOSENSE",
    page_icon="⚙️",
    layout="wide"
)

css_path = parent_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

st.title("⚙️ Settings")

st.warning("🔒 **Read-Only Mode** - Contact Engineer for threshold changes")

# Load configuration
config_path = parent_dir / "config" / "thresholds.yaml"
with open(config_path, 'r') as f:
    config = yaml.safe_load(f)

# Tabs
tab1, tab2, tab3, tab4 = st.tabs(["Alarm Thresholds", "Model Parameters", "Data Sources", "User Roles"])

with tab1:
    st.subheader("Alarm Thresholds")
    
    st.markdown("### Junction Temperature")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Warning", f"{config['alarms']['junction_temp']['warning']}°C")
    with col2:
        st.metric("Critical", f"{config['alarms']['junction_temp']['critical']}°C")
    with col3:
        st.metric("Hysteresis", f"{config['alarms']['junction_temp']['hysteresis']}°C")
    with col4:
        st.metric("Debounce", f"{config['alarms']['junction_temp']['debounce']}s")
    
    st.markdown("### Heatsink Temperature")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Warning", f"{config['alarms']['heatsink_temp']['warning']}°C")
    with col2:
        st.metric("Critical", f"{config['alarms']['heatsink_temp']['critical']}°C")
    with col3:
        st.metric("Hysteresis", f"{config['alarms']['heatsink_temp']['hysteresis']}°C")
    with col4:
        st.metric("Debounce", f"{config['alarms']['heatsink_temp']['debounce']}s")
    
    st.markdown("### Cooling Residual")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Warning", f"{config['alarms']['cooling_residual']['warning']}K")
    with col2:
        st.metric("Critical", f"{config['alarms']['cooling_residual']['critical']}K")
    with col3:
        st.metric("Hysteresis", f"{config['alarms']['cooling_residual']['hysteresis']}K")
    with col4:
        st.metric("Debounce", f"{config['alarms']['cooling_residual']['debounce']}s")

with tab2:
    st.subheader("Thermal Model Parameters")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Thermal Resistances")
        st.code(f"""
R_jc (Junction-Case):     {config['model']['R_jc']} K/W
R_sa (Heatsink-Ambient):  {config['model']['R_sa_baseline']} K/W (baseline)
        """)
        
        st.markdown("#### Power Loss Model")
        st.code(f"""
V_f0 (Forward voltage):   {config['model']['V_f0']} V
r_d (Dynamic resistance): {config['model']['r_d']} Ω
        """)
    
    with col2:
        st.markdown("#### Foster Network Time Constants")
        st.code(f"""
τ1 (Fast layer):    {config['model']['tau_1']} s
τ2 (Medium layer):  {config['model']['tau_2']} s
τ3 (Slow layer):    {config['model']['tau_3']} s
        """)
        
        st.markdown("#### Drive Parameters")
        st.code(f"""
Rated current:            {config['model']['rated_current']} A
Current per thyristor:    {config['model']['current_per_thyristor']} (Id/3)
        """)
    
    st.info("📖 These parameters define the thermal model. See About page for methodology.")

with tab3:
    st.subheader("Data Source Configuration")
    
    from data.data_source import get_data_source
    source = get_data_source()
    status = source.get_connection_status()
    
    st.success("✅ All sensors connected and healthy")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Heatsink RTDs")
        for sensor in status['heatsink_rtds']:
            st.markdown(f"- ✓ {sensor}")
    
    with col2:
        st.markdown("#### Other Sensors")
        st.markdown(f"- {'✓' if status['ambient_rtd'] else '✗'} Ambient RTD")
        st.markdown(f"- {'✓' if status['armature_current'] else '✗'} Armature Current")
        st.markdown(f"- {'✓' if status['fan_status'] else '✗'} Fan Status")
    
    if status['last_read']:
        st.caption(f"Last successful read: {status['last_read']}")
    
    st.info("🔌 Data source: **Simulation** (for demo)")

with tab4:
    st.subheader("User Roles & Permissions")
    
    st.markdown("""
    | Role | View | Acknowledge Alarms | Edit Thresholds | Export Data | Fault Injection |
    |------|------|-------------------|-----------------|-------------|-----------------|
    | **Operator** | ✓ | ✓ | ✗ | ✗ | ✗ |
    | **Engineer** | ✓ | ✓ | ✓ | ✓ | ✓ |
    | **Supervisor** | ✓ | ✓ | ✓ | ✓ | ✗ |
    """)
    
    current_role = st.session_state.get('user_role', 'operator')
    st.info(f"🧑‍💼 Current role: **{current_role.title()}**")
    
    st.caption("Note: Authentication is simulated for demo purposes only")

st.markdown("---")
st.caption("Configuration loaded from: config/thresholds.yaml")
