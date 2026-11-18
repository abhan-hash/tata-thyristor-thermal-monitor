"""
THERMOSENSE - About Page
Project information and methodology
"""

import streamlit as st
from pathlib import Path
import sys

parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

st.set_page_config(
    page_title="About - THERMOSENSE",
    page_icon="ℹ️",
    layout="wide"
)

css_path = parent_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

st.title("ℹ️ About THERMOSENSE")

# Project Info
st.markdown("""
## Project Information

**THERMOSENSE** – Virtual Thermal Sensor for Rolling Mill Thyristors

### Team
- **Project**: Women of Mettle - Project 7
- **Institution**: [Your Institution]
- **Industry Partner**: Tata Steel
- **Application**: Hot Strip Mill DC Drive Thermal Monitoring

### Competition Context
This dashboard was developed as part of the Women of Mettle competition, focusing on solving 
real industrial challenges in the steel manufacturing sector.

---
""")

# Disclaimer
st.error("""
### ⚠️ IMPORTANT DISCLAIMER

This is a **PROTOTYPE** using **SIMULATED DATA** for demonstration purposes.

**Safety Notice:**
- Alarm outputs are **ADVISORY ONLY** during the pilot phase
- This system does **NOT** control the drive or safety systems
- **Not safety-certified** for automatic trip or protection functions
- Requires **field validation** against actual sensor data before production deployment
- Junction temperature is an **ESTIMATE** based on a thermal model

**Validation Required:**
- Compare estimated Tj with direct measurements (if available)
- Validate alarm thresholds with plant engineers
- Conduct extended pilot testing under various operating conditions
- Obtain necessary safety certifications before integration with critical systems

**Use this dashboard for:**
- Early warning and trend monitoring ✓
- Predictive maintenance planning ✓
- Operator situational awareness ✓

**Do not use for:**
- Direct thyristor protection (use hardware protection) ✗
- Safety-critical automatic shutdowns ✗
- Replacing existing protection systems ✗
""")

# Methodology
st.markdown("""
---

## Technical Methodology

### How It Works

THERMOSENSE estimates junction temperature (Tj) using a physics-based thermal model combined 
with real sensor measurements.

#### Measured Inputs (from sensors)
1. **Heatsink Temperature**: RTD sensor on each thyristor heatsink
2. **Ambient Temperature**: RTD sensor measuring air temperature
3. **Armature Current**: From the drive's current sensor (shared by all 6 thyristors)

#### Estimated Outputs (from model)
1. **Junction Temperature (Tj)**: The temperature inside the silicon chip
2. **Power Loss**: Heat dissipation in each thyristor
3. **Cooling Residual**: Indicates filter clogging or fan issues

---

### The Thermal Model

We use a **3-layer Foster RC network** to model heat flow from junction to heatsink:

```
[Junction] → [Fast RC] → [Medium RC] → [Slow RC] → [Heatsink]
              τ1=0.02s    τ2=0.5s     τ3=20s
```

**Why 3 layers?**
- Junction responds to load changes at different speeds
- Fast layer (20ms): captures quick current spikes during bar entry
- Slow layer (20s): tracks long-term heating trends

**Heat flow equation:**
```
Tj = T_heatsink + P_loss × R_jc
```

Where:
- `P_loss = V_f0 × I + r_d × I²` (conduction loss formula)
- `R_jc = 0.04 K/W` (junction-to-case thermal resistance)
- `I = Id/3` (current sharing assumption for 6-thyristor bridge)

---

### Why Peak-Hold Matters

Rolling mills create **fast load spikes** (2.5 seconds) when hot bars enter the stand:
- 10 Hz computation captures these spikes
- 1 Hz display shows the **peak value** in each second
- Without peak-hold, operators would miss dangerous temperature excursions

---

### Cooling Health Monitoring

The **residual** is our early-warning signal for cooling problems:

```
Residual = T_heatsink_measured - T_heatsink_predicted
```

- **Predicted** assumes clean filters and working fan (baseline R_sa)
- If **actual > predicted**, cooling is degraded
- Gradual residual increase → filter clogging (days to weeks)
- Rapid residual increase → fan failure (minutes)

**Alarm thresholds:**
- Warning: Residual ≥ 4K
- Critical: Residual ≥ 8K

This gives **days of advance notice** before a critical over-temperature event.

---

### Data Provenance

Clear labeling of data sources builds operator trust:

| Parameter | Source | Confidence |
|-----------|--------|------------|
| Heatsink Temp | RTD sensor | High (measured) |
| Ambient Temp | RTD sensor | High (measured) |
| Armature Current | Drive sensor | High (measured) |
| **Junction Temp** | **Thermal model** | **Medium (estimated)** |
| Power Loss | Calculation | Medium (derived) |
| Residual | Calculation | Medium (derived) |
| Wear Rate | Statistical model | Low (estimated) |

**Key principle**: Never present an estimate as a measurement. Always label "EST" on Tj displays.

---

## Technical Architecture

### Software Stack
- **Frontend**: Streamlit (Python web framework)
- **Visualization**: Plotly (interactive charts)
- **Backend**: Python 3.9+
- **Data source**: Simulation (pilot), OPC UA (future production)

### Alarm Philosophy (ISA-18.2)
- Every alarm requires operator action
- Debouncing prevents nuisance alarms
- Hysteresis prevents alarm chatter
- Acknowledge required for critical alarms

### Update Rates
- **Model calculation**: 10 Hz (every 100ms)
- **Display refresh**: 1 Hz (every second)
- **History storage**: 1-second averages + 10-second min/max

---

## References

### Standards & Guidelines
- **IEC 60747-2**: Thyristor datasheet standards
- **ISA-18.2**: Alarm management philosophy
- **WCAG 2.1 AA**: Web accessibility guidelines

### Thermal Modeling
- Foster RC network thermal models
- Coffin-Manson equation for wear prediction
- Heat transfer fundamentals (Incropera & DeWitt)

### Industry Inspiration
- Honeywell Forge (plant overview design)
- Splunk industrial dashboards (data visualization)
- Control room HMI best practices

---

## Future Enhancements

### Phase 2 (In Progress)
- Complete Drive Detail page with live charts
- Full alarm management and history logging
- Fault injection UI for demo

### Phase 3 (Planned)
- Historical trend analysis with date ranges
- Wear tracking and life prediction
- CSV export and shift reports

### Phase 4 (Production Deployment)
- OPC UA integration with plant PLC
- TimescaleDB for persistent history
- User authentication and role management
- Integration with plant SCADA/DCS
- Hardware redundancy and failover

---

## Contact & Support

**Development Team**: Women of Mettle - Project 7  
**Mentor**: [Tata Steel Mentor Name]  
**Questions**: [Your Email]

**Source Code**: [Repository Link]  
**Documentation**: [Link to full technical doc]

---

## Version History

- **v1.0.0-alpha** (2024-12-19): Phase 1 complete
  - Project structure
  - Simulation engine
  - Overview page
  - Dark theme

- **v0.1.0** (2024-12-01): Initial concept and planning

---

## Acknowledgments

Special thanks to:
- **Tata Steel** for providing domain expertise and real-world problem context
- **Women of Mettle Program** for organizing the competition
- **Dribbble industrial UI designers** for visual inspiration
- **Streamlit community** for excellent documentation and examples

---
""")

st.success("📖 For detailed methodology, see the full technical documentation (link above)")

st.markdown("---")
st.caption("© 2024 Women of Mettle - Project 7 | Last updated: 2024-12-19")
