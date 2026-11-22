"""
THERMOSENSE — Unified Output Thermal Component Kit (output_ui_kit.py)
Encapsulates all visual building blocks across sub-pages:
- Page Header (Variants A: Ribbon, B: HUD, C: Split)
- Plate Panel with Corner Crop-Bracket Marks
- KPI Tiles with 30s Inline Sparklines
- Status Chips (Icon + Text + Color, never color alone; CRITICAL gets slow pulse)
- Mini Concentric Heat Disc SVG
- Channel Cards (Variants A: Plate, B: Fader, C: Capsule)
- Shared Warm Plotly Layout Factory
- Industrial Empty State Visualizer
"""

import html
import textwrap
from typing import List, Optional, Tuple, Dict, Any
import plotly.graph_objects as go
try:
    from components.html_utils import render_html
except ImportError:
    from thermosense_dashboard.components.html_utils import render_html


# -----------------------------------------------------------------------------
# 1. COLOR MAPPING & THERMAL SPECTRUM UTILS (Strictly R >= B, Zero Blue/Teal)
# -----------------------------------------------------------------------------
def get_thermal_color(temp_c: float) -> str:
    """Return warm thermal color hex matching temperature."""
    if temp_c >= 125.0:
        return "#E0201B"  # Critical Trip (Crimson)
    elif temp_c >= 105.0:
        return "#FF5A1F"  # High Warning (Flame)
    elif temp_c >= 85.0:
        return "#FF9A3C"  # Elevated Warning (Warm Orange)
    elif temp_c >= 65.0:
        return "#FFB020"  # Elevated (Amber)
    elif temp_c >= 45.0:
        return "#F2B533"  # Moderate (Gold)
    else:
        return "#C4C1BA"  # Baseline Nominal (Warm Silver)


def get_status_tier(tj_or_res: float, is_residual: bool = False) -> str:
    """Determine status tier for thyristor or residual."""
    if is_residual:
        if tj_or_res >= 8.0:
            return "critical"
        elif tj_or_res >= 4.0:
            return "warning"
        elif tj_or_res >= 2.0:
            return "elevated"
        return "nominal"
    else:
        if tj_or_res >= 125.0:
            return "critical"
        elif tj_or_res >= 105.0:
            return "warning"
        elif tj_or_res >= 85.0:
            return "elevated"
        return "nominal"


# -----------------------------------------------------------------------------
# 2. STATUS CHIP (Icon + Text + Color, never color alone; CRITICAL slow pulse)
# -----------------------------------------------------------------------------
def render_status_chip_html(tier: str = "nominal", label: Optional[str] = None) -> str:
    """
    Generate accessible HTML status chip.
    Always includes an explicit SVG icon, uppercase label, and color.
    CRITICAL has slow pulsing glow.
    """
    tier_clean = tier.lower().strip()
    if tier_clean not in ["nominal", "elevated", "warning", "critical"]:
        tier_clean = "nominal"

    display_label = label or tier_clean.upper()

    # Accessible SVG icons
    if tier_clean == "nominal":
        icon_svg = """<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C4C1BA" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>"""
    elif tier_clean == "elevated":
        icon_svg = """<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFB020" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>"""
    elif tier_clean == "warning":
        icon_svg = """<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FF5A1F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>"""
    else:  # critical
        icon_svg = """<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFA59E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>"""

    return f"""<span class="status-chip {tier_clean}">{icon_svg}<span>{display_label}</span></span>"""


def render_status_chip(tier: str = "nominal", label: Optional[str] = None):
    """Directly render status chip to Streamlit."""
    render_html(render_status_chip_html(tier, label))


# -----------------------------------------------------------------------------
# 3. MINI CONCENTRIC HEAT DISC SVG
# -----------------------------------------------------------------------------
def render_mini_heat_disc_svg(temp_c: float, diameter: int = 48) -> str:
    """
    Render mini SVG heat disc with concentric machining rings and thermal core.
    Hottest element features slow idle shimmer with 4s period.
    """
    norm = min(1.0, max(0.0, (temp_c - 30.0) / 100.0))
    glow_color = get_thermal_color(temp_c)
    r = diameter / 2.0
    core_r = max(4.0, r * (0.25 + 0.5 * norm))
    glow_opacity = 0.25 + 0.45 * norm
    shimmer_style = "animation: hotCoreShimmer 4s ease-in-out infinite; transform-origin: center;" if temp_c >= 80.0 else ""

    svg = f"""
    <svg width="{diameter}" height="{diameter}" viewBox="0 0 {diameter} {diameter}" xmlns="http://www.w3.org/2000/svg" style="display: block; overflow: visible;">
        <defs>
            <style>
                @keyframes hotCoreShimmer {{
                    0%, 100% {{ opacity: {glow_opacity:.2f}; }}
                    50% {{ opacity: {min(1.0, glow_opacity + 0.3):.2f}; }}
                }}
            </style>
            <radialGradient id="miniCoreGrad_{int(temp_c)}_{diameter}" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
                <stop offset="35%" stop-color="{glow_color}" stop-opacity="0.9" />
                <stop offset="75%" stop-color="{glow_color}" stop-opacity="0.4" />
                <stop offset="100%" stop-color="#141312" stop-opacity="0" />
            </radialGradient>
            <filter id="miniHeatGlow_{int(temp_c)}_{diameter}" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        <!-- Outer machined chassis rim -->
        <circle cx="{r}" cy="{r}" r="{r - 2}" fill="#141312" stroke="#282624" stroke-width="1.5" />
        <!-- Inner concentric thermal tracks -->
        <circle cx="{r}" cy="{r}" r="{r * 0.78}" fill="none" stroke="#201F1D" stroke-width="1" />
        <circle cx="{r}" cy="{r}" r="{r * 0.58}" fill="none" stroke="#282624" stroke-width="0.8" stroke-dasharray="2,2" />
        <!-- Heat glow aura with transition -->
        <circle cx="{r}" cy="{r}" r="{core_r + 2}" fill="{glow_color}" opacity="{glow_opacity}" filter="url(#miniHeatGlow_{int(temp_c)}_{diameter})" style="{shimmer_style} transition: fill 350ms ease, opacity 350ms ease;" />
        <!-- Radiant core -->
        <circle cx="{r}" cy="{r}" r="{core_r}" fill="url(#miniCoreGrad_{int(temp_c)}_{diameter})" style="transition: fill 350ms ease;" />
        <!-- Center pivot brass dot -->
        <circle cx="{r}" cy="{r}" r="2" fill="#F2B533" opacity="0.9" />
    </svg>
    """
    return textwrap.dedent(svg).strip()


# -----------------------------------------------------------------------------
# 4. PAGE HEADER VARIANTS (Prototypes: A=Ribbon, B=HUD, C=Split)
# -----------------------------------------------------------------------------
def render_page_header(
    title: str,
    subtitle: str,
    live_metric_val: str,
    live_metric_unit: str = "°C",
    live_metric_label: str = "PEAK JUNCTION",
    status_tier: str = "nominal",
    variant: str = "ribbon"
):
    """
    Render standardized Page Header in the chosen prototype variant:
    - 'ribbon' (Variant A): Horizontal streamlined bar with heat-smear accent, gradient title, vertical divider, live metric & chip.
    - 'hud' (Variant B): Machined rack HUD with top status breadcrumb, Stand-04 sync pulse, and framed metrics.
    - 'split' (Variant C): Dual-flank card with heat-smear pill left and telemetry capsule right.
    Plays entrance animation ONCE per session; skips on reruns.
    """
    chip_html = render_status_chip_html(status_tier)

    # Session-scoped entrance animation flag
    page_slug = "".join([c for c in title if c.isalnum()]).lower()[:12]
    page_key = f"entrance_done_{page_slug}"
    is_first_load = False
    try:
        import streamlit as st_mod
        if hasattr(st_mod, "session_state"):
            if page_key not in st_mod.session_state:
                st_mod.session_state[page_key] = True
                is_first_load = True
    except Exception:
        pass

    entrance_cls = "entrance-play" if is_first_load else "no-entrance"

    if variant == "hud":
        # Variant B: Machined Rack HUD
        html_content = f"""
        <div class="page-header-hud {entrance_cls}">
            <div class="hud-top-meta">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #FFB020; box-shadow: 0 0 6px #FFB020; animation: syncPulseDot 2s infinite;"></span>
                    <span>TATA STEEL • HSM STAND-04 • MAIN DRIVE</span>
                </div>
                <div>SYS SYNC: 10 HZ • VIRTUAL SENSOR ACTIVE</div>
            </div>
            <div class="hud-main-row">
                <div>
                    <div style="font-family: 'Montserrat', sans-serif; font-size: 20px; font-weight: 800; background: linear-gradient(180deg, #FFFFFF 15%, #F2B533 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-transform: uppercase;">
                        {title}
                    </div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; color: #88847E; margin-top: 2px;">
                        {subtitle}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="text-align: right;">
                        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 9px; color: #88847E; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">{live_metric_label}</div>
                        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 22px; font-weight: 800; color: #FFFFFF; font-variant-numeric: tabular-nums;">
                            {live_metric_val} <span style="font-size: 13px; color: #FFB020;">{live_metric_unit}</span>
                        </div>
                    </div>
                    <div style="width: 1px; height: 32px; background: #282624;"></div>
                    {chip_html}
                </div>
            </div>
        </div>
        """
    elif variant == "split":
        # Variant C: Dual-Flank Split Bar
        html_content = f"""
        <div class="page-header-split {entrance_cls}">
            <div class="split-title-card">
                <div style="width: 5px; height: 36px; border-radius: 2.5px; background: linear-gradient(180deg, #FFB020 0%, #FF5A1F 100%); box-shadow: 0 0 8px rgba(255, 90, 31, 0.4);"></div>
                <div>
                    <div style="font-family: 'Montserrat', sans-serif; font-size: 19px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
                        {title}
                    </div>
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; color: #88847E; margin-top: 1px;">
                        {subtitle}
                    </div>
                </div>
            </div>
            <div class="split-telemetry-capsule">
                <div style="text-align: right;">
                    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 9px; color: #88847E; font-weight: 700; letter-spacing: 0.12em;">{live_metric_label}</div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 700; color: #FFFFFF; font-variant-numeric: tabular-nums;">
                        {live_metric_val} <span style="font-size: 12px; color: #88847E;">{live_metric_unit}</span>
                    </div>
                </div>
                <div style="width: 1px; height: 28px; background: #282624;"></div>
                {chip_html}
            </div>
        </div>
        """
    else:
        # Variant A: Compact Industrial Ribbon (Default)
        html_content = f"""
        <div class="page-header-ribbon {entrance_cls}">
            <div class="header-title-box">
                <div class="header-heat-accent"></div>
                <div>
                    <div class="header-title-text">{title}</div>
                    <div class="header-subtitle">{subtitle}</div>
                </div>
            </div>
            <div class="header-right-flank">
                <div class="header-metric-cluster">
                    <div class="header-metric-label">{live_metric_label}</div>
                    <div class="header-metric-value">{live_metric_val} <span style="font-size: 13px; color: #88847E;">{live_metric_unit}</span></div>
                </div>
                <div class="header-divider"></div>
                {chip_html}
            </div>
        </div>
        """

    render_html(html_content)


# -----------------------------------------------------------------------------
# 5. CHANNEL CARDS (Prototypes: A=Plate, B=Fader, C=Capsule)
# -----------------------------------------------------------------------------
def render_channel_card_html(
    t_id: int,
    tj: float,
    ts: float,
    status: str = "normal",
    is_selected: bool = False,
    variant: str = "plate"
) -> str:
    """Generate accessible channel card HTML button."""
    sel_class = "selected" if is_selected else ""
    tier = get_status_tier(tj)
    chip_mini = render_status_chip_html(tier, f"{tier.upper()}")
    disc_svg = render_mini_heat_disc_svg(tj, diameter=44 if variant != "capsule" else 36)

    margin = max(0.0, 125.0 - tj)
    tj_col = get_thermal_color(tj)

    if variant == "fader":
        # Variant B: Vertical Channel Fader/Bay
        card_html = f"""
        <a href="?t={t_id}" class="channel-card-fader {sel_class}" role="button" aria-pressed="{'true' if is_selected else 'false'}" style="text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 800; color: #FFFFFF;">T{t_id}</span>
                <span style="font-family: 'IBM Plex Mono', monospace; font-size: 8.5px; color: #88847E;">BAY {t_id}</span>
            </div>
            <div style="display: flex; justify-content: center; margin: 4px 0;">{disc_svg}</div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 800; color: {tj_col}; margin-top: 4px;">
                {tj:.1f}°C
            </div>
            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #88847E; margin-top: 1px;">
                Ts: {ts:.1f}°C
            </div>
            <div style="margin-top: 6px;">{chip_mini}</div>
        </a>
        """
    elif variant == "capsule":
        # Variant C: Horizontal Compact Capsule
        card_html = f"""
        <a href="?t={t_id}" class="channel-card-capsule {sel_class}" role="button" aria-pressed="{'true' if is_selected else 'false'}">
            <div>{disc_svg}</div>
            <div style="flex: 1; text-align: left;">
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 800; color: #FFFFFF;">T{t_id} ARM</div>
                <div style="font-family: 'IBM Plex Mono', monospace; font-size: 15px; font-weight: 800; color: {tj_col};">
                    {tj:.1f}°C <span style="font-size: 9px; color: #88847E; font-weight: normal;">(Ts {ts:.1f})</span>
                </div>
            </div>
            <div>{chip_mini}</div>
        </a>
        """
    else:
        # Variant A: Integrated Heat Disc Plate (Default Reference Match)
        card_html = f"""
        <a href="?t={t_id}" class="channel-card-plate {sel_class}" role="button" aria-pressed="{'true' if is_selected else 'false'}">
            <div class="channel-card-header">
                <span class="channel-id-badge">T{t_id}</span>
                {chip_mini}
            </div>
            <div class="channel-disc-wrap">
                {disc_svg}
            </div>
            <div class="channel-tj-readout" style="color: {tj_col};">
                {tj:.1f}°C
            </div>
            <div class="channel-ts-readout">
                HEATSINK: {ts:.1f}°C
            </div>
            <div style="margin-top: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 8.5px; color: #88847E;">
                MARGIN: <strong style="color: {'#FFA59E' if margin < 20 else '#C4C1BA'};">{margin:.1f} K</strong>
            </div>
        </a>
        """
    return textwrap.dedent(card_html).strip()


def render_channel_card(
    t_id: int,
    tj: float,
    ts: float,
    status: str = "normal",
    is_selected: bool = False,
    variant: str = "plate"
):
    """Directly render channel card."""
    render_html(render_channel_card_html(t_id, tj, ts, status, is_selected, variant))


# -----------------------------------------------------------------------------
# 6. MATTE PLATE PANEL WITH CORNER CROP-BRACKETS
# -----------------------------------------------------------------------------
def render_plate_open(title: str, vertical_label: str = "STAND-04", icon_svg: Optional[str] = None):
    """Open a styled matte plate panel with corner crop-bracket marks."""
    plate_slug = "".join([c for c in title if c.isalnum()]).lower()[:12]
    plate_key = f"plate_entered_{plate_slug}"
    is_first_load = False
    try:
        import streamlit as st_mod
        if hasattr(st_mod, "session_state"):
            if plate_key not in st_mod.session_state:
                st_mod.session_state[plate_key] = True
                is_first_load = True
    except Exception:
        pass

    entrance_cls = "entrance-play" if is_first_load else "no-entrance"
    icon_tag = f"""<span style="display: inline-flex; align-items: center;">{icon_svg}</span>""" if icon_svg else ""
    html_markup = f"""
    <div class="plate-panel {entrance_cls}">
        <div class="plate-vertical-badge">{vertical_label}</div>
        <div class="plate-panel-header">
            <div class="plate-panel-title">
                {icon_tag}
                <span>{title}</span>
            </div>
            <span style="font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #5A5752; letter-spacing: 0.15em;">HARDWARE SPEC v2.0</span>
        </div>
    """
    render_html(html_markup)


def render_plate_close():
    """Close the plate panel markup."""
    render_html("</div>")


# -----------------------------------------------------------------------------
# 7. KPI TILE WITH 30s INLINE SPARKLINE
# -----------------------------------------------------------------------------
def generate_sparkline_svg(values: List[float], color: str = "#FFB020", width: int = 120, height: int = 24) -> str:
    """Generate inline minimalist SVG sparkline."""
    if not values or len(values) < 2:
        return f"""<svg width="{width}" height="{height}"><line x1="0" y1="{height/2}" x2="{width}" y2="{height/2}" stroke="#282624" stroke-width="1.5"/></svg>"""

    min_v = min(values)
    max_v = max(values)
    rng = max_v - min_v if max_v != min_v else 1.0

    n = len(values)
    step = width / float(n - 1)
    pts = []
    for i, v in enumerate(values):
        x = i * step
        # SVG y coordinates 0 is top
        y = height - 3 - ((v - min_v) / rng) * (height - 6)
        pts.append(f"{x:.1f},{y:.1f}")

    path_d = "M " + " L ".join(pts)
    last_pt = pts[-1].split(",")

    svg = f"""
    <svg width="100%" height="{height}" viewBox="0 0 {width} {height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="{path_d}" fill="none" stroke="{color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="{last_pt[0]}" cy="{last_pt[1]}" r="2.5" fill="{color}"/>
    </svg>
    """
    return textwrap.dedent(svg).strip()


def render_kpi_tile_html(
    label: str,
    value: str,
    unit: str,
    delta: str = "",
    delta_type: str = "up-good",
    sparkline_values: Optional[List[float]] = None,
    color: str = "#FFB020"
) -> str:
    """Generate HTML for KPI tile with inline sparkline."""
    spark_vals = sparkline_values or [1.0, 1.2, 1.1, 1.4, 1.3, 1.5, 1.4]
    spark_svg = generate_sparkline_svg(spark_vals, color=color)

    delta_html = f"""<span class="kpi-tile-delta {delta_type}">{delta}</span>""" if delta else ""

    tile_html = f"""
    <div class="kpi-tile-wrap">
        <div class="kpi-tile-top">
            <span class="kpi-tile-label">{label} <span class="chevron-nudge" style="color: #575450; font-size: 9px; vertical-align: middle;">&rsaquo;</span></span>
            {delta_html}
        </div>
        <div class="kpi-tile-mid">
            <span class="kpi-tile-value tabular-nums">{value}</span>
            <span class="kpi-tile-unit">{unit}</span>
        </div>
        <div class="kpi-tile-sparkline-box">
            {spark_svg}
        </div>
    </div>
    """
    return textwrap.dedent(tile_html).strip()


def render_kpi_tile(
    label: str,
    value: str,
    unit: str,
    delta: str = "",
    delta_type: str = "up-good",
    sparkline_values: Optional[List[float]] = None,
    color: str = "#FFB020"
):
    """Directly render KPI tile."""
    render_html(render_kpi_tile_html(label, value, unit, delta, delta_type, sparkline_values, color))


# -----------------------------------------------------------------------------
# 8. SHARED PLOTLY TEMPLATE (Warm Palette, Gradient Fills, Shaded Thresholds)
# -----------------------------------------------------------------------------
def apply_warm_plotly_layout(
    fig: go.Figure,
    title: str,
    y_title: str,
    y_range: Optional[List[float]] = None,
    height: int = 260,
    show_thresholds: bool = True,
    warning_val: float = 105.0,
    trip_val: float = 125.0
) -> go.Figure:
    """
    Apply shared warm industrial design tokens to any Plotly chart.
    Includes Montserrat title, IBM Plex Mono tick fonts, faint #282624 grid,
    subtle amber warning band, and crimson trip region.
    """
    fig.update_layout(
        height=height,
        margin=dict(l=36, r=16, t=32, b=24),
        paper_bgcolor="#151413",
        plot_bgcolor="#0E0D0C",
        transition=dict(duration=350, easing="cubic-in-out"),
        font=dict(size=9.5, family="IBM Plex Mono, monospace", color="#88847E"),
        title=dict(
            text=title,
            font=dict(size=10.5, family="Montserrat, sans-serif", color="#FFB020"),
            x=0.03
        ),
        xaxis=dict(
            showgrid=True,
            gridcolor="#282624",
            gridwidth=0.8,
            zeroline=False,
            color="#88847E"
        ),
        yaxis=dict(
            title=y_title,
            showgrid=True,
            gridcolor="#282624",
            gridwidth=0.8,
            zeroline=False,
            color="#88847E",
            range=y_range
        ),
        hoverlabel=dict(
            bgcolor="#1A1918",
            bordercolor="#F2B533",
            font=dict(family="IBM Plex Mono, monospace", size=10, color="#FFFFFF")
        ),
        showlegend=False
    )

    if show_thresholds and y_range:
        # Shaded warning region
        if warning_val < trip_val and y_range[1] >= warning_val:
            fig.add_hrect(
                y0=warning_val,
                y1=trip_val,
                fillcolor="rgba(255, 176, 32, 0.05)",
                line_width=0,
                layer="below"
            )
            fig.add_hline(
                y=warning_val,
                line_dash="dash",
                line_color="rgba(255, 176, 32, 0.6)",
                line_width=1,
                annotation_text=f"WARN {warning_val}°C",
                annotation_font_size=8.5,
                annotation_font_color="#FFB020",
                annotation_position="bottom right"
            )

        # Shaded critical trip region
        if y_range[1] >= trip_val:
            fig.add_hrect(
                y0=trip_val,
                y1=y_range[1],
                fillcolor="rgba(224, 32, 27, 0.08)",
                line_width=0,
                layer="below"
            )
            fig.add_hline(
                y=trip_val,
                line_dash="dot",
                line_color="#E0201B",
                line_width=1.2,
                annotation_text=f"TRIP {trip_val}°C",
                annotation_font_size=8.5,
                annotation_font_color="#E0201B",
                annotation_position="top right"
            )

    return fig


# -----------------------------------------------------------------------------
# 9. INDUSTRIAL EMPTY STATE VISUALIZER
# -----------------------------------------------------------------------------
def render_empty_state(headline: str, description: str, icon_type: str = "alarms"):
    """Render crisp empty state with industrial line graphic and message."""
    if icon_type == "alarms":
        svg_graphic = """
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#575450" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            <path d="m2 2 20 20"/>
        </svg>
        """
    elif icon_type == "data":
        svg_graphic = """
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#575450" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
            <circle cx="12" cy="12" r="10" stroke-dasharray="3,3"/>
        </svg>
        """
    else:
        svg_graphic = """
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#575450" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        """

    html_box = f"""
    <div style="background: #141312; border: 1px dashed #282624; border-radius: 8px; padding: 36px 20px; text-align: center; margin: 16px 0;">
        <div style="display: flex; justify-content: center; margin-bottom: 12px;">
            {svg_graphic}
        </div>
        <div style="font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
            {headline}
        </div>
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11.5px; color: #88847E; max-width: 440px; margin: 0 auto; line-height: 1.5;">
            {description}
        </div>
    </div>
    """
    render_html(html_box)
