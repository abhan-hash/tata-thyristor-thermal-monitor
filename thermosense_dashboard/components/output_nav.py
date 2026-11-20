"""
THERMOSENSE - Output Thermal Minimalist Wordmark & Navigation Header
Directly modeled on the Output Thermal interface (DESIGN_SPEC v2.0).

Layout:
- Left:   Tiny lowercase wordmark 'tatasteel' (13px, Montserrat weight 800, #FFFFFF, letter-spacing -0.3px).
- Center: 6 uppercase widely tracked links matching repo pages (10px, Plus Jakarta Sans, #88847E / #FFFFFF).
- Right:  Stand telemetry status ('STAND SYNC: 10Hz' with gold #F2B533, 'OPERATOR [ LOG OUT ]' in #88847E).
"""

import streamlit as st
import textwrap


def render_output_nav(active_page: str = "OVERVIEW"):
    """
    Renders the Output Thermal minimalist top navigation header.

    Args:
        active_page: Name of the current active page (e.g. "OVERVIEW", "DRIVE DETAIL",
                     "ALARMS & HISTORY", "TRENDS & WEAR", "SETTINGS", "ABOUT").
    """
    pages = [
        ("OVERVIEW", "/"),
        ("DRIVE DETAIL", "/Drive_Detail"),
        ("ALARMS & HISTORY", "/Alarms_History"),
        ("TRENDS & WEAR", "/Trends_Wear"),
        ("SETTINGS", "/Settings"),
        ("ABOUT", "/About"),
    ]

    def _is_active(page_name: str, current: str) -> bool:
        p = page_name.strip().upper()
        c = current.strip().upper()
        if p == c:
            return True
        if "OVERVIEW" in c and p == "OVERVIEW":
            return True
        if "DRIVE" in c and p == "DRIVE DETAIL":
            return True
        if "ALARM" in c and p == "ALARMS & HISTORY":
            return True
        if ("TREND" in c or "WEAR" in c) and p == "TRENDS & WEAR":
            return True
        if "SETTING" in c and p == "SETTINGS":
            return True
        if "ABOUT" in c and p == "ABOUT":
            return True
        return False

    links_html = []
    for label, route in pages:
        active = _is_active(label, active_page)
        active_cls = "active" if active else ""
        links_html.append(
            f'<a href="{route}" target="_self" class="output-nav-link {active_cls}">{label}</a>'
        )

    links_str = "\n".join(links_html)

    html = textwrap.dedent(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=Montserrat:wght@800&family=Plus+Jakarta+Sans:wght@600;700&display=swap');

.output-nav-container {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 16px 0;
    margin-bottom: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background-color: transparent;
    box-sizing: border-box;
}}

.output-nav-left {{
    display: flex;
    align-items: center;
    flex: 1;
}}

.output-nav-wordmark {{
    font-family: 'Montserrat', -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 800;
    color: #FFFFFF;
    letter-spacing: -0.3px;
    text-transform: lowercase;
    text-decoration: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    transition: opacity 120ms cubic-bezier(0.16, 1, 0.3, 1);
}}

.output-nav-wordmark:hover {{
    opacity: 0.85;
}}

.output-nav-center {{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 28px;
    flex: 2;
}}

.output-nav-link {{
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.25em;
    color: #88847E;
    text-transform: uppercase;
    text-decoration: none;
    white-space: nowrap;
    transition: color 120ms cubic-bezier(0.16, 1, 0.3, 1);
}}

.output-nav-link:hover {{
    color: #F5F3EF;
}}

.output-nav-link.active {{
    color: #FFFFFF;
    font-weight: 700;
}}

.output-nav-right {{
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 20px;
    flex: 1;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
}}

.output-nav-sync {{
    color: #88847E;
}}

.output-nav-sync-hz {{
    color: #F2B533;
    font-weight: 700;
}}

.output-nav-operator {{
    color: #88847E;
    cursor: pointer;
    text-decoration: none;
    transition: color 120ms cubic-bezier(0.16, 1, 0.3, 1);
}}

.output-nav-operator:hover {{
    color: #FFFFFF;
}}

@media (max-width: 1024px) {{
    .output-nav-center {{
        gap: 16px;
    }}
}}

@media (max-width: 768px) {{
    .output-nav-container {{
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }}
    .output-nav-center {{
        flex-wrap: wrap;
        justify-content: flex-start;
        gap: 14px;
        width: 100%;
    }}
    .output-nav-right {{
        justify-content: flex-start;
        width: 100%;
    }}
}}
</style>

<div class="output-nav-container">
<div class="output-nav-left">
<a href="/" target="_self" class="output-nav-wordmark">tatasteel</a>
</div>
<div class="output-nav-center">
{links_str}
</div>
<div class="output-nav-right">
<span class="output-nav-sync">STAND SYNC: <strong class="output-nav-sync-hz">10Hz</strong></span>
<span class="output-nav-operator">OPERATOR [ LOG OUT ]</span>
</div>
</div>
""").strip()

    st.markdown(html, unsafe_allow_html=True)
