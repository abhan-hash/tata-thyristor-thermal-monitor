# THERMOSENSE Installation Guide

## Quick Start (5 minutes)

### Step 1: Verify Python Installation

Open PowerShell or Command Prompt and check:

```bash
python --version
```

You should see **Python 3.9** or higher. If not, download from [python.org](https://www.python.org/downloads/).

---

### Step 2: Install Required Packages

```bash
pip install streamlit plotly pandas numpy pyyaml pillow streamlit-autorefresh
```

This installs:
- **streamlit**: Web dashboard framework
- **plotly**: Interactive charts
- **pandas**: Data handling
- **numpy**: Numerical computations
- **pyyaml**: Configuration file parsing
- **pillow**: Image handling
- **streamlit-autorefresh**: Auto-refresh component

⏱️ Installation takes 2-3 minutes depending on your internet speed.

---

### Step 3: Navigate to Dashboard Directory

```bash
cd "c:\Users\falak\OneDrive\Desktop\Tata track 7\thermosense_dashboard"
```

---

### Step 4: Test the Installation

Run the basic test:

```bash
python test_basic.py
```

You should see:
```
Testing imports...
✓ NumPy imported
✓ PyYAML imported

Testing data source...
✓ Data source imported
✓ Got data: 6 thyristors
  Armature current: 698.1 A
  Ambient temp: 35.0 °C
  T1: Tj=68.2°C, Status=normal
  ...
✅ All basic tests passed!
```

---

### Step 5: Launch the Dashboard

```bash
streamlit run app.py
```

The dashboard will automatically open in your default browser at:
```
http://localhost:8501
```

If it doesn't open automatically, copy the URL from the terminal and paste it into your browser.

---

## Using the Dashboard

### Navigation

Use the **sidebar** (left side) to navigate between pages:

1. **🏠 Overview** - Main status page with all 6 thyristors
2. **⚡ Drive Detail** - Detailed diagnostics (Phase 2 - coming soon)
3. **🚨 Alarms & History** - Alarm management (Phase 2)
4. **📊 Trends & Wear** - Historical analysis (Phase 3)
5. **⚙️ Settings** - View model parameters and thresholds
6. **ℹ️ About** - Project information and methodology

### Overview Page Features

- **Live data**: Updates every second (1 Hz)
- **Thyristor tiles**: Click any tile to view details (when Phase 2 is complete)
- **Status colors**:
  - 🟢 **Green**: Normal (Tj < 110°C)
  - 🟠 **Amber**: Warning (110°C ≤ Tj < 125°C)
  - 🔴 **Red**: Critical (Tj ≥ 125°C)
  - ⚫ **Grey**: Sensor fault

---

## Stopping the Dashboard

Press **Ctrl+C** in the terminal where Streamlit is running.

---

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'streamlit'"

**Solution**: Install packages again:
```bash
pip install streamlit plotly pandas numpy pyyaml pillow streamlit-autorefresh
```

---

### Issue: "Address already in use" when launching

**Solution**: Another Streamlit instance is running. Either:
1. Stop the other instance (Ctrl+C in its terminal)
2. Or use a different port:
   ```bash
   streamlit run app.py --server.port 8502
   ```

---

### Issue: Dashboard is very slow or laggy

**Possible causes:**
1. **Low RAM**: Streamlit needs at least 2GB free RAM
2. **Old browser**: Use Chrome, Firefox, or Edge (latest version)
3. **Multiple tabs**: Close unnecessary browser tabs

---

### Issue: Charts not displaying

**Solution**: 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check browser console for errors (F12 → Console tab)

---

## Configuration

### Changing Alarm Thresholds

Edit `config/thresholds.yaml`:

```yaml
alarms:
  junction_temp:
    warning: 110  # Change this value
    critical: 125  # Change this value
```

After editing, restart the dashboard (Ctrl+C, then `streamlit run app.py` again).

---

## Development Mode

### File Structure

```
thermosense_dashboard/
├── app.py                  ← Main entry point
├── pages/                  ← Multi-page app
│   ├── 1_🏠_Overview.py
│   ├── 2_⚡_Drive_Detail.py
│   └── ...
├── data/                   ← Data layer
│   ├── data_source.py
│   └── simulator.py
├── components/             ← Reusable UI
│   ├── thyristor_tile.py
│   └── alarm_banner.py
├── config/                 ← Configuration
│   └── thresholds.yaml
└── assets/                 ← CSS and images
    └── styles.css
```

### Making Changes

Streamlit automatically **reloads** when you save a file. Just edit any `.py` file and save — the browser will refresh.

---

## Next Steps (Phase 2)

The following features are planned:

- ✅ **Phase 1 Complete** (Current): Overview page with live simulation
- 🚧 **Phase 2 In Progress**: Drive Detail page with charts, alarm management
- 📅 **Phase 3 Planned**: Trends & Wear analysis, historical data
- 📅 **Phase 4 Future**: Live PLC integration via OPC UA

---

## Getting Help

### Check the Logs

Streamlit shows errors in the terminal. If something breaks:
1. Look at the terminal output
2. Read the error message
3. Check the line number mentioned

### Common Errors

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| `KeyError: 'selected_thyristor'` | Session state not initialized | Restart dashboard |
| `FileNotFoundError: thresholds.yaml` | Config file missing | Check `config/` folder exists |
| `ImportError: data.simulator` | Module path issue | Run from dashboard root directory |

---

## Performance Tips

### For Best Performance:

1. **Close unnecessary tabs**: Keep only the dashboard open
2. **Use Chrome or Edge**: Best Streamlit compatibility
3. **Disable browser extensions**: Ad blockers can interfere
4. **Increase Python priority** (Windows):
   - Task Manager → Details → python.exe → Right-click → Set Priority → Above Normal

### Reduce Refresh Rate (if laggy):

Edit `pages/1_🏠_Overview.py`, line with `st_autorefresh`:

```python
# Change from 1000ms (1 Hz) to 2000ms (0.5 Hz)
count = st_autorefresh(interval=2000, key="overview_refresh")
```

---

## Uninstalling

To remove the dashboard completely:

1. Delete the `thermosense_dashboard` folder
2. (Optional) Uninstall packages:
   ```bash
   pip uninstall streamlit plotly pandas numpy pyyaml pillow streamlit-autorefresh -y
   ```

---

## Contact & Support

**Team**: Women of Mettle - Project 7  
**Email**: [Your Email]  
**Documentation**: See README.md for full details

---

**Enjoy using THERMOSENSE!** 🚀⚡
