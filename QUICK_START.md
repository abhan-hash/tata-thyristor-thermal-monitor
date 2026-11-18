# THERMOSENSE - Quick Start Guide 🚀

## Launch in 3 Steps

### 1️⃣ Install (First Time Only)
```bash
pip install streamlit plotly pandas numpy pyyaml pillow streamlit-autorefresh
```
⏱️ Takes 2-3 minutes

---

### 2️⃣ Navigate to Dashboard
```bash
cd "c:\Users\falak\OneDrive\Desktop\Tata track 7\thermosense_dashboard"
```

---

### 3️⃣ Launch
**Option A - Double-click:**
```
launch.bat
```

**Option B - Command line:**
```bash
streamlit run app.py
```

**Option C - PowerShell:**
```powershell
streamlit run app.py
```

---

## Dashboard Will Open Automatically

**URL**: http://localhost:8501

---

## Navigation

**Sidebar (left side)** has 6 pages:

| Page | Status | Description |
|------|--------|-------------|
| 🏠 **Overview** | ✅ Complete | Main status page - start here! |
| ⚡ **Drive Detail** | 🚧 Phase 2 | Charts and diagnostics (coming soon) |
| 🚨 **Alarms** | 🚧 Phase 2 | Alarm management (coming soon) |
| 📊 **Trends** | 📅 Phase 3 | Historical analysis (planned) |
| ⚙️ **Settings** | ✅ Complete | View model parameters |
| ℹ️ **About** | ✅ Complete | Project info and methodology |

---

## What to Look For

### On Overview Page:

1. **Left Column**: Drive status, current, environment
2. **Center**: **6 Thyristor Tiles** (the main feature!)
   - 🟢 Green = Normal (Tj < 110°C)
   - 🟠 Amber = Warning (110-125°C)
   - 🔴 Red = Critical (>125°C)
3. **Right Column**: KPIs, cooling health, mill layout

### Features:
- ✅ **Live updates** every second
- ✅ **Realistic simulation** with load spikes
- ✅ **Dark theme** (control room optimized)
- ✅ **"EST" labels** on junction temps (transparency)
- ✅ **Prototype badge** (honest about simulation)

---

## Stop the Dashboard

Press **Ctrl+C** in the terminal

---

## Troubleshooting

### "Module not found" error
→ Run: `pip install streamlit plotly pandas numpy pyyaml pillow streamlit-autorefresh`

### "Address already in use"
→ Another instance is running. Close it (Ctrl+C) or use different port:
```bash
streamlit run app.py --server.port 8502
```

### Dashboard is slow
→ Close other browser tabs, use Chrome/Edge

---

## Next: Phase 2

**Coming soon:**
- Drive Detail page with live charts
- Alarm system with history
- Fault injection demo controls

---

## Files & Documentation

- 📖 **README.md** - Full documentation
- 📖 **INSTALL.md** - Detailed installation guide  
- 📖 **PHASE_1_COMPLETE.md** - What's built and what's next
- 🧪 **test_basic.py** - Run to verify installation

---

## Contact

**Team**: Women of Mettle - Project 7  
**For**: Tata Steel Rolling Mill Thermal Monitoring

---

**Status**: Phase 1 Complete ✅  
**Last Updated**: December 19, 2024  
**Version**: 1.0.0-alpha

---

# Happy Monitoring! ⚡🔥
