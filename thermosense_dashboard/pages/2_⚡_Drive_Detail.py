"""
THERMOSENSE - Drive Detail Page
Deep dive into thermal behavior with live trends
"""

import streamlit as st
from pathlib import Path
import sys

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

st.set_page_config(
    page_title="Drive Detail - THERMOSENSE",
    page_icon="⚡",
    layout="wide"
)

# Load CSS
css_path = parent_dir / "assets" / "styles.css"
if css_path.exists():
    with open(css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

st.title("⚡ Drive Detail")

st.info("🚧 **Page Under Construction** - Phase 2")

st.markdown("""
### Planned Features

**Left Column:**
- Interactive bridge schematic (6-thyristor topology)
- Selected thyristor detail card
- Cooling health diagnostics

**Right Column:**
- Junction temperature timeline (all 6 thyristors)
- Heatsink measured vs predicted
- Armature current profile

---

Coming in Phase 2 implementation.
""")

# Placeholder: show selected thyristor from session state
if 'selected_thyristor' in st.session_state:
    st.success(f"Selected Thyristor: T{st.session_state['selected_thyristor']}")
