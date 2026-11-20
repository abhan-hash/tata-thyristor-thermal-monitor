"""
THERMOSENSE - Output Thermal Hero Title Lockup & Heat Smear Header
Directly modeled on the Output Thermal interface (DESIGN_SPEC v2.0).

Layout:
- Left: Massive title 'THERMOSENSE' in Montserrat 800 with warm gradient (#FF9A3C -> #FF5A1F -> #E0201B)
        and horizontal heat/motion smear trailing ~60px to the left.
        Directly beneath: Bold grey subtitle 'Online Thyristor Virtual Sensor' (#88847E, 12px, 700).
- Divider: Thin 1px vertical divider line (#33312E, height 40px).
- Right: Bold white metric 'STAND-04' (Montserrat 800, 26px, #FFFFFF).
         Directly beneath: 'Live Telemetry Loop' (#88847E, 11px) paired with circular orange play button
         (24px diameter, 1.5px solid border #FF5A1F, orange triangle play icon #FF5A1F).
"""

import streamlit as st
import textwrap


def render_output_hero(
    stand_label: str = "STAND-04",
    subtitle: str = "Online Thyristor Virtual Sensor"
):
    """
    Renders the Output Thermal hero title lockup with heat smear effect.

    Args:
        stand_label: Identifier for the stand (default: "STAND-04").
        subtitle: Secondary descriptive text (default: "Online Thyristor Virtual Sensor").
    """
    # SVG play triangle icon
    play_icon_svg = (
        '<svg width="8" height="9" viewBox="0 0 8 9" fill="#FF5A1F" '
        'style="margin-left: 1.5px; display: block;" xmlns="http://www.w3.org/2000/svg">'
        '<path d="M0 0 L8 4.5 L0 9 Z"/>'
        '</svg>'
    )

    html = textwrap.dedent(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Plus+Jakarta+Sans:wght@600;700&display=swap');

.output-hero-lockup {{
    display: flex;
    align-items: center;
    gap: 0;
    margin: 8px 0 28px 0;
    padding: 6px 0 6px 36px;
    position: relative;
    box-sizing: border-box;
}}

.output-hero-brand-col {{
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    position: relative;
}}

.output-hero-title-wrap {{
    position: relative;
    display: inline-flex;
    align-items: center;
}}

@keyframes heat-smear-sweep {{
    0% {{
        opacity: 0;
        transform: translateY(-50%) translateX(-30px) scaleX(0.65);
    }}
    100% {{
        opacity: 1;
        transform: translateY(-50%) translateX(0) scaleX(1);
    }}
}}

@keyframes hero-title-enter {{
    0% {{
        opacity: 0;
        transform: translateX(-12px);
    }}
    100% {{
        opacity: 1;
        transform: translateX(0);
    }}
}}

.output-hero-heat-smear {{
    position: absolute;
    left: -78px;
    top: 50%;
    transform: translateY(-50%);
    width: 95px;
    height: 75%;
    background: linear-gradient(90deg, rgba(255, 90, 31, 0) 0%, rgba(255, 154, 60, 0.4) 30%, rgba(255, 90, 31, 0.8) 75%, rgba(224, 32, 27, 0.95) 100%);
    border-radius: 40px 0 0 40px;
    pointer-events: none;
    z-index: 0;
    filter: blur(8px);
    animation: heat-smear-sweep 520ms cubic-bezier(0.23, 1, 0.32, 1) 0ms both;
    will-change: transform, opacity;
}}

.output-hero-heat-smear::before {{
    content: '';
    position: absolute;
    top: 25%;
    left: 8px;
    width: 72px;
    height: 2.5px;
    background: linear-gradient(90deg, transparent, #FF9A3C 40%, #FF5A1F 100%);
    border-radius: 2px;
    opacity: 0.9;
}}

.output-hero-heat-smear::after {{
    content: '';
    position: absolute;
    top: 70%;
    left: 4px;
    width: 78px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #FF9A3C 35%, #E0201B 100%);
    border-radius: 2px;
    opacity: 0.85;
}}

.output-hero-title {{
    font-family: 'Montserrat', -apple-system, sans-serif;
    font-size: 52px;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1;
    margin: 0;
    padding: 0;
    background: linear-gradient(90deg, #FF9A3C 0%, #FF5A1F 55%, #E0201B 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-transform: uppercase;
    display: inline-block;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 0 24px rgba(255, 90, 31, 0.35));
    animation: hero-title-enter 500ms cubic-bezier(0.23, 1, 0.32, 1) 60ms both;
    will-change: transform, opacity;
}}

.output-hero-subtitle {{
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: #88847E;
    letter-spacing: 0.5px;
    margin-top: 6px;
    line-height: 1.2;
}}

.output-hero-divider {{
    width: 1px;
    height: 40px;
    background-color: #33312E;
    margin: 0 28px;
    align-self: center;
    flex-shrink: 0;
}}

.output-hero-stand-col {{
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
}}

.output-hero-stand-metric {{
    font-family: 'Montserrat', -apple-system, sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #FFFFFF;
    letter-spacing: -0.5px;
    line-height: 1;
    margin: 0;
    padding: 0;
}}

.output-hero-telemetry-pill {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
}}

.output-hero-telemetry-text {{
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
    font-size: 11px;
    font-weight: 600;
    color: #88847E;
    letter-spacing: 0.05em;
    line-height: 1;
    white-space: nowrap;
}}

.output-hero-play-btn {{
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1.5px solid #FF5A1F;
    background: rgba(255, 90, 31, 0.08);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-sizing: border-box;
    transition: background-color 140ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 140ms cubic-bezier(0.23, 1, 0.32, 1), transform 100ms cubic-bezier(0.23, 1, 0.32, 1);
}}

@media (hover: hover) and (pointer: fine) {{
    .output-hero-play-btn:hover {{
        background: rgba(255, 90, 31, 0.22);
        box-shadow: 0 0 12px rgba(255, 90, 31, 0.4);
    }}
}}

.output-hero-play-btn:active {{
    transform: scale(0.92);
}}

@media (prefers-reduced-motion: reduce) {{
    .output-hero-heat-smear,
    .output-hero-title,
    .output-hero-play-btn {{
        animation: none !important;
        transition: none !important;
        opacity: 1 !important;
        transform: none !important;
    }}
    .output-hero-heat-smear {{
        transform: translateY(-50%) !important;
    }}
}}

@media (max-width: 768px) {{
    .output-hero-lockup {{
        flex-wrap: wrap;
        gap: 16px;
    }}
    .output-hero-divider {{
        display: none;
    }}
    .output-hero-title {{
        font-size: 38px;
    }}
    .output-hero-heat-smear {{
        left: -30px;
        width: 45px;
    }}
}}
</style>

<div class="output-hero-lockup">
<div class="output-hero-brand-col">
<div class="output-hero-title-wrap">
<span class="output-hero-heat-smear" aria-hidden="true"></span>
<span class="output-hero-title">THERMOSENSE</span>
</div>
<div class="output-hero-subtitle">{subtitle}</div>
</div>
<div class="output-hero-divider" aria-hidden="true"></div>
<div class="output-hero-stand-col">
<div class="output-hero-stand-metric">{stand_label}</div>
<div class="output-hero-telemetry-pill">
<span class="output-hero-telemetry-text">Live Telemetry Loop</span>
<div class="output-hero-play-btn" title="Live Telemetry Loop" aria-label="Play Telemetry">
{play_icon_svg}
</div>
</div>
</div>
</div>
""").strip()

    if hasattr(st, "html"):
        st.html(html)
    else:
        st.markdown(html, unsafe_allow_html=True)
