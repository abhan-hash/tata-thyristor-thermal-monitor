# THERMOSENSE Dashboard

**Virtual Thermal Sensor for Rolling Mill Thyristor Monitoring**

Women of Mettle - Project 7  
Tata Steel Hot Strip Mill

---

## Overview

THERMOSENSE is a real-time monitoring dashboard for thyristor thermal management in rolling mill DC drives. It provides:

- **Real-time junction temperature estimation** using a thermal model
- **Predictive cooling fault detection** via residual analysis
- **Alarm management** with debouncing and hysteresis
- **Wear tracking** for predictive maintenance
- **Multi-page interactive dashboard** built with Streamlit

---

## Features

### Pages

1. **🏠 Overview**: One-glance health status of all 6 thyristors
2. **⚡ Drive Detail**: Deep dive into thermal behavior with live charts
3. **🚨 Alarms & History**: Active alarm management and historical log
4. **📊 Trends & Wear**: Historical analysis and predictive maintenance metrics
5. **⚙️ Settings**: Model parameters and threshold configuration
6. **ℹ️ About**: Project information and methodology

### Key Capabilities

- **1 Hz display refresh** with 10 Hz internal computation
- **Peak-hold visualization** to capture fast thermal spikes (2.5s bar impacts)
- **Fault injection** for demo (fan failure, clogging, overload)
- **Dark theme** optimized for control room monitors
- **Accessibility compliant** (WCAG 2.1 AA) with color + icon status indicators

---

## Installation

### Prerequisites

- Python 3.9 or higher
- pip package manager

### Setup

1. **Clone or navigate to the project directory**:
   ```bash
   cd thermosense_dashboard
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the dashboard**:
   ```bash
   streamlit run app.py
   ```

4. **Access in browser**:
   - The dashboard will open automatically at `http://localhost:8501`
   - If not, navigate to the URL shown in the terminal

---

## Configuration

### Files

- `config/thresholds.yaml`: Alarm thresholds and model parameters
- `config/users.yaml`: User roles (demo only, no real auth)
- `config/plant_layout.yaml`: Mill stand configuration

### Adjusting Thresholds

Edit `config/thresholds.yaml`:

```yaml
alarms:
  junction_temp:
    warning: 110  # °C
    critical: 125  # °C
    hysteresis: 2  # °C
    debounce: 2  # seconds
```

---

## Project Structure

```
thermosense_dashboard/
│
├── app.py                      # Main entry point
├── requirements.txt
├── README.md
│
├── pages/                      # Multi-page structure
│   ├── 1_🏠_Overview.py
│   ├── 2_⚡_Drive_Detail.py
│   ├── 3_🚨_Alarms_History.py
│   ├── 4_📊_Trends_Wear.py
│   ├── 5_⚙️_Settings.py
│   └── 6_ℹ️_About.py
│
├── components/                 # Reusable UI components
│   ├── thyristor_tile.py
│   ├── alarm_banner.py
│   ├── gauge_charts.py
│   └── ...
│
├── data/                       # Data layer
│   ├── data_source.py         # Abstraction layer
│   ├── simulator.py           # Thermal simulation
│   ├── models.py              # Thermal calculations
│   └── alarm_logic.py         # Alarm management
│
├── config/                     # Configuration files
│   ├── thresholds.yaml
│   ├── users.yaml
│   └── plant_layout.yaml
│
└── assets/                     # Static files
    ├── styles.css             # Dark theme
    └── logo.png
```

---

## Usage

### Normal Operation

1. Launch dashboard: `streamlit run app.py`
2. Navigate to **Overview** page to see all thyristors
3. Click any thyristor tile to view detailed diagnostics
4. Monitor alarms in the top banner (critical) or Alarms page (all)

### Demo Mode - Fault Injection

(To be implemented in Phase 2)

Trigger faults to demonstrate alarm system:

- **Fan Failure**: Heatsink temps rise rapidly, Tj exceeds 125°C
- **Clogging**: Gradual residual increase, early warning at 4K
- **Overload**: Current >120% rated for >10 minutes

---

## Technical Details

### Thermal Model

- **3-layer Foster RC network** for junction temperature
- **Measured inputs**: Heatsink RTD, ambient RTD, armature current
- **Estimated output**: Junction temperature (Tj)
- **Calculation rate**: 10 Hz with peak-hold for 1 Hz display
- **Residual**: `T_heatsink_measured - T_heatsink_predicted` indicates cooling health

### Alarm Logic

- **Thresholds**: Configurable warning/critical levels
- **Debouncing**: Prevents nuisance alarms (2-10s depending on parameter)
- **Hysteresis**: Alarm clears at lower level than set point
- **Acknowledge**: Operator acknowledgment required for critical alarms

### Data Flow

```
Simulation → get_latest() → Thermal Model → Alarm Logic → UI Components
```

---

## Limitations & Disclaimers

⚠️ **PROTOTYPE STATUS**

- This dashboard uses **simulated data** for demonstration
- Alarms are **advisory only** during pilot phase
- **Not safety-certified** for automatic drive trip
- Requires field validation before production deployment

### Known Issues

- Historical data limited to current session (no persistent database yet)
- Wear calculations are simplified (full Coffin-Manson in progress)
- Mobile layout not optimized (tablet minimum)

---

## Roadmap

### Phase 1 ✅ (Current)
- [x] Project structure
- [x] Simulation engine
- [x] Overview page
- [x] Dark theme CSS
- [x] Thyristor tile component

### Phase 2 (In Progress)
- [ ] Drive Detail page with charts
- [ ] Alarms page with history log
- [ ] Fault injection UI controls
- [ ] Alarm logic implementation

### Phase 3 (Planned)
- [ ] Trends & Wear page
- [ ] Settings and About pages
- [ ] CSV export functionality
- [ ] Responsive tablet layout

### Phase 4 (Future)
- [ ] Live PLC integration (OPC UA)
- [ ] Persistent database (TimescaleDB)
- [ ] User authentication
- [ ] Shift reports generation

---

## Contributing

This is a competition project for Women of Mettle. For questions or collaboration:

- Contact: [Your Contact Info]
- Mentor: [Tata Steel Mentor Name]

---

## License

© 2024 Women of Mettle - Project 7  
Developed for Tata Steel Rolling Mill Thermal Monitoring

---

## Acknowledgments

- Tata Steel for project support and domain expertise
- Honeywell, Splunk UI references for industrial design inspiration
- Streamlit community for excellent documentation

---

**Status**: Phase 1 Complete ✅  
**Last Updated**: 2024-12-19  
**Version**: 1.0.0-alpha
