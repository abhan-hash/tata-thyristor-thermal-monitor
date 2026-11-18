# How to Update Dashboard Data

## Overview

The dashboard is designed so you **NEVER need to edit the dashboard files**. All data updates happen in **ONE file only**: `data/simulator.py`

---

## Current Data Flow

```
simulator.py (YOUR DATA HERE)
    ↓
get_latest() (automatic)
    ↓
Dashboard displays (automatic)
```

---

## Option 1: Update Mock Data (Quick Demo Changes)

### File to Edit: `data/simulator.py`

**Line ~85-95** - Change the baseline temperatures:

```python
# CHANGE THESE VALUES to set your mock data
def get_latest(self) -> DriveData:
    # ... existing code ...
    
    # MOCK DATA SECTION - EDIT HERE
    for i in range(6):
        thyristor = data.thyristors[i]
        
        # SET YOUR DESIRED JUNCTION TEMPERATURE HERE
        tj = 123.0  # ← CHANGE THIS (e.g., 110, 125, 80)
        
        # SET YOUR DESIRED HEATSINK TEMPERATURE HERE
        heatsink_temp = 80.0  # ← CHANGE THIS
        
        # ... rest of code ...
```

### Quick Changes You Can Make:

#### Make T3 Critical (Red):
Find line ~180 in `simulator.py`:
```python
# In the loop for thyristor index i=2 (T3)
if i == 2:  # T3
    tj = 126.0  # Critical threshold is 125°C
    heatsink_temp = 85.0
```

#### Make All Thyristors Warning (Amber):
```python
for i in range(6):
    tj = 115.0  # Between 110-125 = Warning
    heatsink_temp = 78.0
```

#### Make All Normal (Green):
```python
for i in range(6):
    tj = 95.0  # Below 110 = Normal
    heatsink_temp = 65.0
```

---

## Option 2: Use Real Sensor Data (Your Own CSV/Excel)

### Step 1: Prepare Your Data File

Create a CSV file: `data/sensor_readings.csv`

```csv
timestamp,thyristor_id,heatsink_temp,ambient_temp,current
2024-12-19 10:00:00,1,75.3,35.2,850
2024-12-19 10:00:00,2,76.1,35.2,850
2024-12-19 10:00:00,3,77.8,35.2,850
2024-12-19 10:00:00,4,75.9,35.2,850
2024-12-19 10:00:00,5,76.5,35.2,850
2024-12-19 10:00:00,6,74.8,35.2,850
```

### Step 2: Edit `data/data_source.py`

**Line ~85** - Add CSV backend:

```python
def __init__(self, source_type: str = "simulation"):
    self.source_type = source_type
    
    if source_type == "simulation":
        from .simulator import Simulator
        self.backend = Simulator()
        self.connected = True
    
    # ADD THIS NEW SECTION
    elif source_type == "csv":
        import pandas as pd
        self.csv_path = Path(__file__).parent / "sensor_readings.csv"
        self.df = pd.read_csv(self.csv_path)
        self.connected = True
    
    else:
        self.backend = None
        self.connected = False
```

**Line ~105** - Add CSV data reading:

```python
def get_latest(self) -> DriveData:
    if not self.connected:
        return DriveData()
    
    if self.source_type == "simulation":
        data = self.backend.get_latest()
        self.last_read_time = datetime.now()
        return data
    
    # ADD THIS NEW SECTION
    elif self.source_type == "csv":
        # Read latest row from CSV
        latest_data = self.df.tail(6)  # Last 6 rows (one per thyristor)
        
        data = DriveData()
        data.timestamp = datetime.now()
        data.ambient_temp = latest_data['ambient_temp'].iloc[0]
        data.armature_current = latest_data['current'].iloc[0]
        
        for i, row in latest_data.iterrows():
            thyristor = data.thyristors[row['thyristor_id'] - 1]
            thyristor.t_heatsink_measured = row['heatsink_temp']
            
            # Calculate Tj using your thermal model
            # (Add your model calculation here)
            thyristor.tj_estimated = row['heatsink_temp'] + 45  # Simplified
            
        return data
    
    return DriveData()
```

### Step 3: Switch to CSV Mode

**Edit `app.py`** - Line ~90:

```python
# Change from:
from data.data_source import get_latest

# To:
from data.data_source import get_data_source
data_source = get_data_source(source_type="csv")  # ← CHANGE THIS
```

---

## Option 3: Connect to Live PLC/SCADA (Production)

### Step 1: Install OPC UA Library

```bash
pip install opcua
```

### Step 2: Create `data/opc_client.py`

```python
from opcua import Client
from .data_source import DriveData

class OPCClient:
    def __init__(self, server_url="opc.tcp://192.168.1.100:4840"):
        self.client = Client(server_url)
        self.client.connect()
        
    def get_latest(self) -> DriveData:
        data = DriveData()
        
        # Read from OPC tags
        data.armature_current = self.client.get_node("ns=2;s=Drive.Current").get_value()
        data.ambient_temp = self.client.get_node("ns=2;s=Sensors.Ambient").get_value()
        
        for i in range(6):
            thyristor = data.thyristors[i]
            tag = f"ns=2;s=Thyristor.T{i+1}.Heatsink"
            thyristor.t_heatsink_measured = self.client.get_node(tag).get_value()
            
            # Calculate Tj (add your model here)
            thyristor.tj_estimated = thyristor.t_heatsink_measured + 45
        
        return data
```

### Step 3: Update `data_source.py`

```python
if source_type == "plc":
    from .opc_client import OPCClient
    self.backend = OPCClient(server_url="opc.tcp://YOUR_PLC_IP:4840")
    self.connected = True
```

### Step 4: Switch to PLC Mode

```python
data_source = get_data_source(source_type="plc")
```

---

## What Gets Updated Automatically

Once you change the data in **`simulator.py`** or switch to CSV/PLC:

✅ **All 4 metric cards** (Junction Temp, Heatsink, Residual, Wear)  
✅ **Motor diagram temperatures** (Bridge, Case, Air)  
✅ **All 4 mini charts** (Current Temp, Junction Temp, Heatsink, bar charts)  
✅ **Status badges** (Normal/Warning/Critical)  
✅ **Border colors** (Green/Amber/Red)  
✅ **Alert boxes** (if critical thresholds exceeded)  

**You never touch the dashboard UI files!**

---

## Quick Reference: Where is Each Value?

| Dashboard Display | Data Source Location |
|-------------------|---------------------|
| **Junction Temp (large)** | `thyristor.tj_estimated` |
| **Heatsink Temp** | `thyristor.t_heatsink_measured` |
| **Cooling Residual** | `thyristor.residual` |
| **Est. Wear** | `wear_multiplier` (line 210 in Overview.py - mock) |
| **Armature Current** | `data.armature_current` |
| **Ambient Temp** | `data.ambient_temp` |
| **Fan Status** | `data.fan_status` |

---

## For Your Presentation: Setting Demo Scenarios

### Scenario 1: Everything Normal (Green)
Edit `simulator.py`, line ~180:
```python
# All thyristors normal
for i in range(6):
    tj = 95.0
    heatsink_temp = 65.0
```

### Scenario 2: One Critical Thyristor (T3 Red)
```python
for i in range(6):
    if i == 2:  # T3
        tj = 128.0  # Critical
        heatsink_temp = 86.0
    else:
        tj = 105.0  # Normal
        heatsink_temp = 70.0
```

### Scenario 3: All Warning (Amber)
```python
for i in range(6):
    tj = 115.0  # Warning range
    heatsink_temp = 80.0
```

### Scenario 4: Gradual Heating (for demo animation)
Keep the current simulation running - it already has realistic load variation!

---

## Testing Your Changes

### Step 1: Edit Data
Make your changes in `simulator.py`

### Step 2: Restart Dashboard
```bash
Ctrl+C  (stop current dashboard)
streamlit run app.py  (restart)
```

### Step 3: Verify
- Check if temperatures changed
- Check if colors updated (green/amber/red)
- Check if alert box appears (if critical)

---

## Common Mistakes to Avoid

❌ **DON'T** edit `pages/1_🏠_Overview.py` to change data  
✅ **DO** edit `data/simulator.py`

❌ **DON'T** hardcode numbers in the dashboard  
✅ **DO** pull from `data.thyristors[i].tj_estimated`

❌ **DON'T** edit multiple files  
✅ **DO** change just ONE file: `simulator.py`

---

## Summary

### To Change Data Values:
1. Open `data/simulator.py`
2. Find the `get_latest()` function (~line 150)
3. Change the values for `tj`, `heatsink_temp`, etc.
4. Save and restart dashboard

### To Use Your Own CSV:
1. Create `data/sensor_readings.csv` with your data
2. Edit `data/data_source.py` to add CSV reader (see Option 2 above)
3. Change `source_type="csv"` in `app.py`
4. Restart dashboard

### To Connect Live PLC:
1. Install `opcua` library
2. Create `data/opc_client.py` (see Option 3 above)
3. Change `source_type="plc"` in `app.py`
4. Configure PLC IP address
5. Restart dashboard

---

## Need Help?

If you want to update specific values for your presentation, tell me:
- Which thyristors should be critical/warning/normal?
- What temperatures to display?
- Any specific scenario to demo?

I'll give you the exact lines to edit!

---

**Bottom Line**: You edit **ONE file** (`simulator.py`), and the **entire dashboard updates automatically**. No need to touch any UI code! 🎯
