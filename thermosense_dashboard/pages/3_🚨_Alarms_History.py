"""
THERMOSENSE - Alarms & History Page
Alarm management and incident review
"""

import streamlit as st
from pathlib import Path
import sys

parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

st.set_page_config(
    page_title="Alarms - THERMOSENSE",
    page_icon="🚨",
    layout="wide"
)

css_path = parent_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

st.title("🚨 Alarms & History")

st.info("🚧 **Page Under Construction** - Phase 2")

st.markdown("""
### Planned Features

**Active Alarms:**
- Real-time alarm table with acknowledge buttons
- Critical/Warning filtering
- Recommended actions

**Alarm Statistics:**
- KPI cards (total alarms today, MTTA, etc.)
- Top thyristor by alarm count

**History Log:**
- Paginated table with date filtering
- CSV export functionality

---

Coming in Phase 2 implementation.
""")
