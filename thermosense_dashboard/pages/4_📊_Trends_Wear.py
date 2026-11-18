"""
THERMOSENSE - Trends & Wear Analysis Page
Historical patterns and predictive maintenance
"""

import streamlit as st
from pathlib import Path
import sys

parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

st.set_page_config(
    page_title="Trends & Wear - THERMOSENSE",
    page_icon="📊",
    layout="wide"
)

css_path = parent_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

st.title("📊 Trends & Wear Analysis")

st.info("🚧 **Page Under Construction** - Phase 3")

st.markdown("""
### Planned Features

**Time-Range Analysis:**
- Date/time range selector
- Multi-metric trend charts
- Box plots for distribution analysis

**Wear & Life Analysis:**
- Wear rate vs baseline
- Cumulative life consumed gauge
- Thermal cycling histogram

---

Coming in Phase 3 implementation.
""")
