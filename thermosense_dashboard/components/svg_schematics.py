"""
THERMOSENSE — Technical SVG Schematics Engine (svg_schematics.py)
High-precision industrial vector schematics:
1. 6-Pulse Graetz Thyristor Bridge (Phases U, V, W; T1-T6 live temperature glow & interactive click selection)
2. Foster RC 3-Stage Ladder Network (R1C1, R2C2, R3C3, tau values, animated heat-flow particles)
3. Airflow & Heat Exchanger System Schematic (Inlet, Blower, Filter, Heatsink, Outlet)
4. Cutaway Isometric Stand-04 Hot Strip Mill & Drive Cabinet (Art Direction Options 1 & 2)
"""

import textwrap
from typing import List, Dict, Optional
try:
    from components.output_ui_kit import get_thermal_color, get_status_tier
except ImportError:
    from thermosense_dashboard.components.output_ui_kit import get_thermal_color, get_status_tier


# -----------------------------------------------------------------------------
# 1. 6-PULSE THYRISTOR BRIDGE SCHEMATIC
# -----------------------------------------------------------------------------
def render_bridge_schematic_svg(
    thyristor_temps: List[float],
    selected_id: int = 1,
    current_a: float = 780.0,
    width: int = 760,
    height: int = 340
) -> str:
    """
    Render 6-pulse Graetz bridge schematic in SVG.
    Phases: U, V, W
    Upper Thyristors: T1 (Phase U), T3 (Phase V), T5 (Phase W) -> Connected to +DC Bus
    Lower Thyristors: T4 (Phase U), T6 (Phase V), T2 (Phase W) -> Connected to -DC Bus
    Each thyristor glows dynamically by its junction temperature.
    Clickable anchor wrapping each thyristor with gold focus on selected_id.
    """
    # Ensure 6 temperatures
    temps = list(thyristor_temps) if thyristor_temps else [80.0] * 6
    while len(temps) < 6:
        temps.append(80.0)

    # Coordinates
    x_phases = [170, 370, 570]  # U, V, W branch centers
    y_dc_pos = 45               # +DC Bus
    y_upper = 120               # Upper thyristor center
    y_ac_mid = 185              # AC line connection
    y_lower = 250               # Lower thyristor center
    y_dc_neg = 310              # -DC Bus

    upper_ids = [1, 3, 5]
    lower_ids = [4, 6, 2]

    thyristor_nodes = []

    # Helper to render a thyristor symbol
    def render_thyristor(t_id: int, cx: float, cy: float, orientation_down: bool = True):
        idx = t_id - 1
        t_temp = temps[idx]
        col = get_thermal_color(t_temp)
        is_sel = (t_id == selected_id)
        border_w = "2.5" if is_sel else "1.2"
        box_stroke = "#F2B533" if is_sel else "#282624"
        sel_glow = """<circle cx="0" cy="0" r="32" fill="none" stroke="#F2B533" stroke-width="1.8" stroke-dasharray="4,3" opacity="0.9"/>""" if is_sel else ""

        # Triangle vertices (pointing down for forward conduction to +DC / from AC)
        if orientation_down:
            tri_pts = "-14,-14 14,-14 0,10"
            cath_line = '<line x1="-15" y1="10" x2="15" y2="10" stroke="#FFFFFF" stroke-width="2"/>'
            gate_line = '<path d="M 0,10 L 8,18 L 18,18" fill="none" stroke="#FFB020" stroke-width="1.5"/>'
        else:
            tri_pts = "-14,14 14,14 0,-10"
            cath_line = '<line x1="-15" y1="-10" x2="15" y2="-10" stroke="#FFFFFF" stroke-width="2"/>'
            gate_line = '<path d="M 0,-10 L 8,-18 L 18,-18" fill="none" stroke="#FFB020" stroke-width="1.5"/>'

        # Identify if this is the hottest thyristor
        is_hottest = (t_temp == max(temps))
        hottest_cls = 'class="bridge-hottest-shimmer"' if is_hottest else ""

        node_svg = f"""
        <!-- Thyristor T{t_id} -->
        <g transform="translate({cx}, {cy})" style="cursor: pointer;">
            <a href="?t={t_id}" target="_self" style="text-decoration: none;" aria-label="Select Thyristor T{t_id} ({t_temp:.1f}°C)">
                <!-- Hit area & background plate -->
                <rect x="-42" y="-36" width="84" height="72" rx="6" fill="#151413" stroke="{box_stroke}" stroke-width="{border_w}" style="transition: stroke 200ms ease;" />
                {sel_glow}
                <!-- Heat glow filter (transitions smoothly; slow idle shimmer on hottest) -->
                <circle cx="0" cy="0" r="22" fill="{col}" opacity="0.28" filter="url(#bridgeHeatBlur)" {hottest_cls} style="transition: fill 350ms ease, opacity 350ms ease;" />
                <!-- Thyristor Symbol -->
                <polygon points="{tri_pts}" fill="{col}" stroke="#FFFFFF" stroke-width="1.5" style="transition: fill 350ms ease;" />
                {cath_line}
                {gate_line}
                <!-- Text Readout -->
                <text x="0" y="-22" font-family="'IBM Plex Mono', monospace" font-size="11" font-weight="700" fill="#FFFFFF" text-anchor="middle">T{t_id}</text>
                <text x="0" y="30" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="700" fill="{col}" text-anchor="middle" style="transition: fill 350ms ease;">{t_temp:.1f}°C</text>
            </a>
        </g>
        """
        return node_svg

    # Build upper thyristors (T1, T3, T5)
    for i, t_id in enumerate(upper_ids):
        thyristor_nodes.append(render_thyristor(t_id, x_phases[i], y_upper, orientation_down=True))

    # Build lower thyristors (T4, T6, T2)
    for i, t_id in enumerate(lower_ids):
        thyristor_nodes.append(render_thyristor(t_id, x_phases[i], y_lower, orientation_down=True))

    svg = f"""
    <svg width="100%" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="display: block; background: #0E0D0C; border-radius: 8px;">
        <defs>
            <style>
                @keyframes bridgeHottestShimmer {{
                    0%, 100% {{ opacity: 0.28; }}
                    50% {{ opacity: 0.65; }}
                }}
                .bridge-hottest-shimmer {{
                    animation: bridgeHottestShimmer 4s ease-in-out infinite;
                }}
            </style>
            <filter id="bridgeHeatBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6"/>
            </filter>
            <linearGradient id="dcPosGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FF5A1F"/>
                <stop offset="100%" stop-color="#F2B533"/>
            </linearGradient>
            <linearGradient id="dcNegGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#5A5752"/>
                <stop offset="100%" stop-color="#88847E"/>
            </linearGradient>
        </defs>

        <!-- TOP: +DC BUS BAR -->
        <line x1="80" y1="{y_dc_pos}" x2="{width - 60}" y2="{y_dc_pos}" stroke="url(#dcPosGrad)" stroke-width="3" stroke-linecap="round"/>
        <rect x="{width - 55}" y="{y_dc_pos - 12}" width="50" height="24" rx="4" fill="#201F1D" stroke="#F2B533" stroke-width="1.2"/>
        <text x="{width - 30}" y="{y_dc_pos + 4}" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="800" fill="#F2B533" text-anchor="middle">+DC</text>

        <!-- BOTTOM: -DC BUS BAR -->
        <line x1="80" y1="{y_dc_neg}" x2="{width - 60}" y2="{y_dc_neg}" stroke="url(#dcNegGrad)" stroke-width="3" stroke-linecap="round"/>
        <rect x="{width - 55}" y="{y_dc_neg - 12}" width="50" height="24" rx="4" fill="#201F1D" stroke="#88847E" stroke-width="1.2"/>
        <text x="{width - 30}" y="{y_dc_neg + 4}" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="800" fill="#88847E" text-anchor="middle">-DC</text>

        <!-- 3-PHASE AC INPUTS (U, V, W) ON LEFT -->
        <!-- Phase U -->
        <path d="M 30,135 L 110,135 L 110,{y_ac_mid} L {x_phases[0]},{y_ac_mid}" fill="none" stroke="#FFB020" stroke-width="2" stroke-dasharray="4,2"/>
        <rect x="15" y="123" width="36" height="22" rx="3" fill="#201F1D" stroke="#FFB020" stroke-width="1"/>
        <text x="33" y="138" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="700" fill="#FFB020" text-anchor="middle">U</text>

        <!-- Phase V -->
        <path d="M 30,185 L {x_phases[1]},{y_ac_mid}" fill="none" stroke="#FF9A3C" stroke-width="2" stroke-dasharray="4,2"/>
        <rect x="15" y="174" width="36" height="22" rx="3" fill="#201F1D" stroke="#FF9A3C" stroke-width="1"/>
        <text x="33" y="189" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="700" fill="#FF9A3C" text-anchor="middle">V</text>

        <!-- Phase W -->
        <path d="M 30,235 L 110,235 L 110,{y_ac_mid} L {x_phases[2]},{y_ac_mid}" fill="none" stroke="#FF5A1F" stroke-width="2" stroke-dasharray="4,2"/>
        <rect x="15" y="224" width="36" height="22" rx="3" fill="#201F1D" stroke="#FF5A1F" stroke-width="1"/>
        <text x="33" y="239" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="700" fill="#FF5A1F" text-anchor="middle">W</text>

        <!-- Vertical Branch Connections -->
        <!-- Branch U -->
        <line x1="{x_phases[0]}" y1="{y_dc_pos}" x2="{x_phases[0]}" y2="{y_upper - 36}" stroke="#F2B533" stroke-width="2"/>
        <line x1="{x_phases[0]}" y1="{y_upper + 36}" x2="{x_phases[0]}" y2="{y_lower - 36}" stroke="#C4C1BA" stroke-width="2"/>
        <line x1="{x_phases[0]}" y1="{y_lower + 36}" x2="{x_phases[0]}" y2="{y_dc_neg}" stroke="#88847E" stroke-width="2"/>
        <circle cx="{x_phases[0]}" cy="{y_ac_mid}" r="3.5" fill="#FFB020"/>

        <!-- Branch V -->
        <line x1="{x_phases[1]}" y1="{y_dc_pos}" x2="{x_phases[1]}" y2="{y_upper - 36}" stroke="#F2B533" stroke-width="2"/>
        <line x1="{x_phases[1]}" y1="{y_upper + 36}" x2="{x_phases[1]}" y2="{y_lower - 36}" stroke="#C4C1BA" stroke-width="2"/>
        <line x1="{x_phases[1]}" y1="{y_lower + 36}" x2="{x_phases[1]}" y2="{y_dc_neg}" stroke="#88847E" stroke-width="2"/>
        <circle cx="{x_phases[1]}" cy="{y_ac_mid}" r="3.5" fill="#FF9A3C"/>

        <!-- Branch W -->
        <line x1="{x_phases[2]}" y1="{y_dc_pos}" x2="{x_phases[2]}" y2="{y_upper - 36}" stroke="#F2B533" stroke-width="2"/>
        <line x1="{x_phases[2]}" y1="{y_upper + 36}" x2="{x_phases[2]}" y2="{y_lower - 36}" stroke="#C4C1BA" stroke-width="2"/>
        <line x1="{x_phases[2]}" y1="{y_lower + 36}" x2="{x_phases[2]}" y2="{y_dc_neg}" stroke="#88847E" stroke-width="2"/>
        <circle cx="{x_phases[2]}" cy="{y_ac_mid}" r="3.5" fill="#FF5A1F"/>

        <!-- Live Current Badge -->
        <rect x="{width/2 - 80}" y="12" width="160" height="20" rx="4" fill="#1A1918" stroke="#282624" stroke-width="1"/>
        <text x="{width/2}" y="25" font-family="'IBM Plex Mono', monospace" font-size="9" font-weight="700" fill="#FFB020" text-anchor="middle">ARMATURE LOAD: {current_a:.1f} A</text>

        <!-- All 6 Thyristor Elements -->
        {''.join(thyristor_nodes)}
    </svg>
    """
    return textwrap.dedent(svg).strip()


# -----------------------------------------------------------------------------
# 2. FOSTER RC 3-STAGE LADDER DIAGRAM WITH HEAT-FLOW PARTICLES
# -----------------------------------------------------------------------------
def render_foster_ladder_svg(
    p_loss: float = 850.0,
    tj: float = 92.4,
    ths: float = 46.8,
    tamb: float = 35.0,
    width: int = 760,
    height: int = 220
) -> str:
    """
    Render Foster 3-stage thermal impedance ladder RC network:
    Stage 1: Silicon Micro-Layer (R1=0.008 K/W, tau1=0.02s)
    Stage 2: Moly Spreading Layer (R2=0.016 K/W, tau2=0.50s)
    Stage 3: Bulk Heatsink Mass (R3=0.016 K/W, tau3=20.0s)
    Heat-flow particles animate from Silicon Junction -> Heatsink -> Air.
    Speed scales with power loss.
    """
    # Particle animation speed: 800W ~ 2.0s, 1500W ~ 1.0s
    particle_speed = max(0.8, min(3.5, 2000.0 / max(100.0, p_loss)))

    svg = f"""
    <svg width="100%" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="display: block; background: #0E0D0C; border-radius: 8px;">
        <defs>
            <style>
                @keyframes particleFlow {{
                    from {{ stroke-dashoffset: 42; }}
                    to {{ stroke-dashoffset: 0; }}
                }}
                .heat-flow-line {{
                    stroke-dasharray: 6, 8;
                    animation: particleFlow {particle_speed:.2f}s linear infinite;
                }}
            </style>
            <linearGradient id="heatFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FF5A1F"/>
                <stop offset="45%" stop-color="#FFB020"/>
                <stop offset="100%" stop-color="#C4C1BA"/>
            </linearGradient>
            <filter id="fosterNodeGlow">
                <feGaussianBlur stdDeviation="4"/>
            </filter>
        </defs>

        <!-- Top Title Banner -->
        <text x="30" y="24" font-family="'Montserrat', sans-serif" font-size="11" font-weight="700" fill="#FFFFFF" letter-spacing="0.1em">3-LAYER FOSTER RC THERMAL IMPEDANCE MODEL</text>
        <text x="{width - 30}" y="24" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="600" fill="#FFB020" text-anchor="end">P_LOSS: {p_loss:.0f} W</text>

        <!-- MAIN HEAT CONDUCTION BUS WITH ANIMATED PARTICLES -->
        <line x1="110" y1="80" x2="650" y2="80" stroke="#282624" stroke-width="4"/>
        <line x1="110" y1="80" x2="650" y2="80" stroke="url(#heatFlowGrad)" stroke-width="3" class="heat-flow-line"/>

        <!-- LEFT NODE: SILICON JUNCTION (Tj) -->
        <g transform="translate(80, 80)">
            <circle cx="0" cy="0" r="28" fill="#1A1918" stroke="#E0201B" stroke-width="2"/>
            <circle cx="0" cy="0" r="14" fill="#E0201B" opacity="0.3" filter="url(#fosterNodeGlow)"/>
            <text x="0" y="-3" font-family="'IBM Plex Mono', monospace" font-size="12" font-weight="800" fill="#FFFFFF" text-anchor="middle">Tj</text>
            <text x="0" y="10" font-family="'IBM Plex Mono', monospace" font-size="9" font-weight="700" fill="#FF5A1F" text-anchor="middle">{tj:.1f}°C</text>
            <text x="0" y="44" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#88847E" text-anchor="middle">JUNCTION</text>
        </g>

        <!-- STAGE 1 (R1 // C1) -->
        <!-- Resistor R1 -->
        <g transform="translate(200, 80)">
            <rect x="-32" y="-14" width="64" height="28" rx="4" fill="#151413" stroke="#F2B533" stroke-width="1.5"/>
            <text x="0" y="0" font-family="'IBM Plex Mono', monospace" font-size="9.5" font-weight="700" fill="#FFFFFF" text-anchor="middle">R1: 0.008</text>
            <text x="0" y="9" font-family="'IBM Plex Mono', monospace" font-size="7.5" fill="#88847E" text-anchor="middle">K/W</text>
            <!-- Shunt Capacitor C1 down to thermal ground -->
            <line x1="50" y1="0" x2="50" y2="50" stroke="#88847E" stroke-width="1.5"/>
            <line x1="40" y1="50" x2="60" y2="50" stroke="#F2B533" stroke-width="2"/>
            <line x1="40" y1="56" x2="60" y2="56" stroke="#F2B533" stroke-width="2"/>
            <line x1="50" y1="56" x2="50" y2="80" stroke="#88847E" stroke-width="1.5"/>
            <!-- Ground plate -->
            <line x1="42" y1="80" x2="58" y2="80" stroke="#575450" stroke-width="2"/>
            <text x="75" y="55" font-family="'IBM Plex Mono', monospace" font-size="8.5" fill="#88847E">C1</text>
            <text x="0" y="-22" font-family="'IBM Plex Mono', monospace" font-size="8.5" font-weight="700" fill="#FF5A1F" text-anchor="middle">τ1 = 20 ms</text>
        </g>

        <!-- STAGE 2 (R2 // C2) -->
        <g transform="translate(370, 80)">
            <rect x="-32" y="-14" width="64" height="28" rx="4" fill="#151413" stroke="#FF9A3C" stroke-width="1.5"/>
            <text x="0" y="0" font-family="'IBM Plex Mono', monospace" font-size="9.5" font-weight="700" fill="#FFFFFF" text-anchor="middle">R2: 0.016</text>
            <text x="0" y="9" font-family="'IBM Plex Mono', monospace" font-size="7.5" fill="#88847E" text-anchor="middle">K/W</text>
            <!-- Shunt Capacitor C2 -->
            <line x1="50" y1="0" x2="50" y2="50" stroke="#88847E" stroke-width="1.5"/>
            <line x1="40" y1="50" x2="60" y2="50" stroke="#FF9A3C" stroke-width="2"/>
            <line x1="40" y1="56" x2="60" y2="56" stroke="#FF9A3C" stroke-width="2"/>
            <line x1="50" y1="56" x2="50" y2="80" stroke="#88847E" stroke-width="1.5"/>
            <line x1="42" y1="80" x2="58" y2="80" stroke="#575450" stroke-width="2"/>
            <text x="75" y="55" font-family="'IBM Plex Mono', monospace" font-size="8.5" fill="#88847E">C2</text>
            <text x="0" y="-22" font-family="'IBM Plex Mono', monospace" font-size="8.5" font-weight="700" fill="#FF9A3C" text-anchor="middle">τ2 = 500 ms</text>
        </g>

        <!-- STAGE 3 (R3 // C3) -->
        <g transform="translate(540, 80)">
            <rect x="-32" y="-14" width="64" height="28" rx="4" fill="#151413" stroke="#C4C1BA" stroke-width="1.5"/>
            <text x="0" y="0" font-family="'IBM Plex Mono', monospace" font-size="9.5" font-weight="700" fill="#FFFFFF" text-anchor="middle">R3: 0.016</text>
            <text x="0" y="9" font-family="'IBM Plex Mono', monospace" font-size="7.5" fill="#88847E" text-anchor="middle">K/W</text>
            <!-- Shunt Capacitor C3 -->
            <line x1="50" y1="0" x2="50" y2="50" stroke="#88847E" stroke-width="1.5"/>
            <line x1="40" y1="50" x2="60" y2="50" stroke="#C4C1BA" stroke-width="2"/>
            <line x1="40" y1="56" x2="60" y2="56" stroke="#C4C1BA" stroke-width="2"/>
            <line x1="50" y1="56" x2="50" y2="80" stroke="#88847E" stroke-width="1.5"/>
            <line x1="42" y1="80" x2="58" y2="80" stroke="#575450" stroke-width="2"/>
            <text x="75" y="55" font-family="'IBM Plex Mono', monospace" font-size="8.5" fill="#88847E">C3</text>
            <text x="0" y="-22" font-family="'IBM Plex Mono', monospace" font-size="8.5" font-weight="700" fill="#C4C1BA" text-anchor="middle">τ3 = 20.0 s</text>
        </g>

        <!-- RIGHT NODE: HEATSINK & AMBIENT AIR -->
        <g transform="translate(680, 80)">
            <circle cx="0" cy="0" r="26" fill="#1A1918" stroke="#FFB020" stroke-width="2"/>
            <text x="0" y="-3" font-family="'IBM Plex Mono', monospace" font-size="11" font-weight="800" fill="#FFFFFF" text-anchor="middle">Ts</text>
            <text x="0" y="10" font-family="'IBM Plex Mono', monospace" font-size="9" font-weight="700" fill="#FFB020" text-anchor="middle">{ths:.1f}°C</text>
            <text x="0" y="44" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#88847E" text-anchor="middle">HEATSINK RTD</text>
        </g>

        <!-- Bottom Legend -->
        <text x="80" y="200" font-family="'Plus Jakarta Sans', sans-serif" font-size="9.5" fill="#575450">Fast Silicon Die Surge (20ms)</text>
        <text x="320" y="200" font-family="'Plus Jakarta Sans', sans-serif" font-size="9.5" fill="#575450">Intermediate Moly Heat Spread (500ms)</text>
        <text x="560" y="200" font-family="'Plus Jakarta Sans', sans-serif" font-size="9.5" fill="#575450">Bulk Extrusion Capacity (20s)</text>
    </svg>
    """
    return textwrap.dedent(svg).strip()


# -----------------------------------------------------------------------------
# 3. HEAT EXCHANGER + BLOWER AIRFLOW SYSTEM SCHEMATIC
# -----------------------------------------------------------------------------
def render_heat_exchanger_svg(
    inlet_temp: float = 35.0,
    outlet_temp: float = 46.5,
    fan_running: bool = True,
    clogging_pct: float = 0.0,
    width: int = 760,
    height: int = 200
) -> str:
    """
    Render industrial forced-air heat exchanger and cooling duct diagram.
    Shows inlet air temp, filter restriction, thyristor heat sink fins,
    blower impeller, and outlet air exhaust temp.
    """
    delta_t = outlet_temp - inlet_temp
    fan_col = "#FFB020" if fan_running else "#E0201B"
    fan_text = "NOMINAL (1450 RPM)" if fan_running else "INTERLOCKED TRIP"
    filter_col = "#E0201B" if clogging_pct > 0.4 else "#FFB020" if clogging_pct > 0.15 else "#C4C1BA"

    svg = f"""
    <svg width="100%" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="display: block; background: #0E0D0C; border-radius: 8px;">
        <defs>
            <style>
                @keyframes fanSpin {{
                    from {{ transform: rotate(0deg); }}
                    to {{ transform: rotate(360deg); }}
                }}
                @keyframes airflowDrift {{
                    from {{ stroke-dashoffset: 40; }}
                    to {{ stroke-dashoffset: 0; }}
                }}
                .fan-blades-spin {{
                    animation: fanSpin 1.4s linear infinite;
                    transform-origin: 560px 95px;
                }}
                .airflow-stream-line {{
                    stroke-dasharray: 6, 8;
                    animation: airflowDrift 1.2s linear infinite;
                }}
            </style>
            <linearGradient id="airGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#C4C1BA" stop-opacity="0.3"/>
                <stop offset="50%" stop-color="#FFB020" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#FF5A1F" stop-opacity="0.6"/>
            </linearGradient>
        </defs>

        <!-- DUCT CHAMBER -->
        <rect x="60" y="45" width="{width - 120}" height="100" rx="8" fill="#141312" stroke="#282624" stroke-width="1.8"/>

        <!-- AIR FLOW STREAM -->
        <rect x="70" y="55" width="{width - 140}" height="80" rx="4" fill="url(#airGrad)"/>

        <!-- INLET AIR FILTER MESH -->
        <g transform="translate(130, 45)">
            <rect x="0" y="0" width="16" height="100" fill="#1A1918" stroke="{filter_col}" stroke-width="1.5"/>
            <!-- Mesh pattern -->
            <line x1="4" y1="10" x2="12" y2="90" stroke="{filter_col}" stroke-width="1"/>
            <line x1="12" y1="10" x2="4" y2="90" stroke="{filter_col}" stroke-width="1"/>
            <text x="8" y="125" font-family="'IBM Plex Mono', monospace" font-size="8.5" font-weight="700" fill="{filter_col}" text-anchor="middle">FILTER ({int(clogging_pct*100)}%)</text>
        </g>

        <!-- THYRISTOR HEATSINK EXTRUSION FINS -->
        <g transform="translate(280, 55)">
            <rect x="0" y="0" width="180" height="80" rx="4" fill="#1C1A18" stroke="#33312E" stroke-width="1"/>
            <!-- Vertical cooling fins -->
            {''.join([f'<line x1="{x}" y1="8" x2="{x}" y2="72" stroke="#FF9A3C" stroke-width="2.5"/>' for x in range(16, 170, 16)])}
            <text x="90" y="44" font-family="'Montserrat', sans-serif" font-size="10" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.1em">T1-T6 HEATSINK FINS</text>
            <text x="90" y="105" font-family="'IBM Plex Mono', monospace" font-size="8.5" font-weight="700" fill="#FFB020" text-anchor="middle">FORCED CONVECTION</text>
        </g>

        <!-- ANIMATED AIRFLOW STREAM LINES -->
        <line x1="75" y1="75" x2="520" y2="75" stroke="#F2B533" stroke-width="1.8" class="airflow-stream-line" opacity="0.6"/>
        <line x1="75" y1="95" x2="520" y2="95" stroke="#FFB020" stroke-width="2" class="airflow-stream-line" opacity="0.7"/>
        <line x1="75" y1="115" x2="520" y2="115" stroke="#FF5A1F" stroke-width="1.8" class="airflow-stream-line" opacity="0.6"/>

        <!-- COOLING BLOWER FAN -->
        <g transform="translate(560, 95)">
            <circle cx="0" cy="0" r="32" fill="#1A1918" stroke="{fan_col}" stroke-width="2"/>
            <!-- Rotating Impeller Blades Group -->
            <g class="{'fan-blades-spin' if fan_running else ''}">
                <path d="M 0,0 L 0,-24 A 12,12 0 0,1 18,-16 Z" fill="{fan_col}" opacity="0.85"/>
                <path d="M 0,0 L 24,0 A 12,12 0 0,1 16,18 Z" fill="{fan_col}" opacity="0.85"/>
                <path d="M 0,0 L 0,24 A 12,12 0 0,1 -18,16 Z" fill="{fan_col}" opacity="0.85"/>
                <path d="M 0,0 L -24,0 A 12,12 0 0,1 -16,-18 Z" fill="{fan_col}" opacity="0.85"/>
                <circle cx="0" cy="0" r="6" fill="#FFFFFF"/>
            </g>
            <text x="0" y="48" font-family="'IBM Plex Mono', monospace" font-size="8.5" font-weight="700" fill="{fan_col}" text-anchor="middle">BLOWER TACHO</text>
            <text x="0" y="58" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" fill="#88847E" text-anchor="middle">{fan_text}</text>
        </g>

        <!-- INLET TEMP READOUT -->
        <g transform="translate(85, 30)">
            <text x="0" y="0" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#88847E">INLET AIR (AMBIENT)</text>
            <text x="0" y="12" font-family="'IBM Plex Mono', monospace" font-size="12" font-weight="700" fill="#C4C1BA">{inlet_temp:.1f}°C</text>
        </g>

        <!-- OUTLET TEMP READOUT -->
        <g transform="translate({width - 160}, 30)">
            <text x="0" y="0" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#88847E">EXHAUST PLENUM</text>
            <text x="0" y="12" font-family="'IBM Plex Mono', monospace" font-size="12" font-weight="700" fill="#FF5A1F">{outlet_temp:.1f}°C <span style="font-size: 9px; color: #FFB020;">(&Delta;T +{delta_t:.1f}K)</span></text>
        </g>
    </svg>
    """
    return textwrap.dedent(svg).strip()


# -----------------------------------------------------------------------------
# 4. CUTAWAY ISOMETRIC ILLUSTRATION OF HOT STRIP MILL STAND & DRIVE CABINET
# -----------------------------------------------------------------------------
def render_isometric_mill_cutaway_svg(option: int = 1, width: int = 760, height: int = 340) -> str:
    """
    Render 30° cutaway isometric illustration of Stand-04 hot strip mill.
    Option 1: Technical Blueprint Line & Wireframe with Glowing Thermal Core
    Option 2: Heavy Industrial Volumetric Matte (Hardware Blockout)
    """
    if option == 2:
        # Option 2: Heavy Industrial Volumetric Matte
        svg = f"""
        <svg width="100%" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="display: block; background: #0A0908; border-radius: 8px;">
            <defs>
                <linearGradient id="slabGlowOpt2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FFE600"/>
                    <stop offset="30%" stop-color="#FF5A1F"/>
                    <stop offset="100%" stop-color="#8F110E"/>
                </linearGradient>
                <filter id="opt2Blur" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="16"/>
                </filter>
            </defs>

            <!-- Atmospheric floor shadow & ambient mill glow -->
            <ellipse cx="{width/2}" cy="240" rx="320" ry="80" fill="#FF5A1F" opacity="0.12" filter="url(#opt2Blur)"/>

            <!-- MASSIVE STAND-04 HOUSING (Matte Cast Iron) -->
            <!-- Left Mill Housing Column -->
            <polygon points="120,80 170,50 200,68 150,98" fill="#201F1D" stroke="#33312E" stroke-width="1.5"/>
            <polygon points="120,80 150,98 150,280 120,260" fill="#141312" stroke="#282624" stroke-width="1.5"/>
            <polygon points="150,98 200,68 200,248 150,280" fill="#1A1918" stroke="#33312E" stroke-width="1.5"/>

            <!-- Right Mill Housing Column -->
            <polygon points="360,80 410,50 440,68 390,98" fill="#201F1D" stroke="#33312E" stroke-width="1.5"/>
            <polygon points="360,80 390,98 390,280 360,260" fill="#141312" stroke="#282624" stroke-width="1.5"/>
            <polygon points="390,98 440,68 440,248 390,280" fill="#1A1918" stroke="#33312E" stroke-width="1.5"/>

            <!-- TOP CROSS BEAM -->
            <polygon points="170,50 410,50 440,68 200,68" fill="#282624" stroke="#3D3935" stroke-width="1.5"/>

            <!-- 4-HIGH ROLLING MILL CYLINDERS (Backup Rolls & Work Rolls) -->
            <!-- Top Backup Roll -->
            <ellipse cx="270" cy="110" rx="55" ry="18" fill="#33312E" stroke="#575450" stroke-width="1.5"/>
            <!-- Top Work Roll -->
            <ellipse cx="270" cy="148" rx="42" ry="14" fill="#575450" stroke="#88847E" stroke-width="1.5"/>

            <!-- GLOWING RED-HOT STEEL SLAB (HOT STRIP ENTRY) -->
            <polygon points="30,205 520,205 550,220 60,220" fill="url(#slabGlowOpt2)"/>
            <line x1="30" y1="205" x2="520" y2="205" stroke="#FFFFFF" stroke-width="2.5" opacity="0.9"/>
            <text x="180" y="240" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="800" fill="#FFB020">980°C HOT STRIP BAR BITE</text>

            <!-- Bottom Work Roll & Backup Roll -->
            <ellipse cx="270" cy="216" rx="42" ry="14" fill="#3D3935" stroke="#575450" stroke-width="1.5"/>
            <ellipse cx="270" cy="254" rx="55" ry="18" fill="#201F1D" stroke="#33312E" stroke-width="1.5"/>

            <!-- ADJACENT DC DRIVE & THYRISTOR CABINET (CUTAWAY VIEW) -->
            <polygon points="520,100 580,70 680,128 620,158" fill="#201F1D" stroke="#F2B533" stroke-width="1.5"/>
            <polygon points="520,100 620,158 620,300 520,240" fill="#151413" stroke="#282624" stroke-width="1.5"/>
            <polygon points="620,158 680,128 680,270 620,300" fill="#1A1918" stroke="#33312E" stroke-width="1.5"/>

            <!-- Inner Thyristor Graetz Disc Stack -->
            <g transform="translate(565, 170)">
                <rect x="-24" y="-35" width="48" height="70" rx="3" fill="#0E0D0C" stroke="#FF5A1F" stroke-width="1.2"/>
                <!-- 6 Glowing Thyristor Module Discs -->
                <circle cx="-10" cy="-20" r="7" fill="#FF5A1F" filter="url(#opt2Blur)"/>
                <circle cx="-10" cy="-20" r="5" fill="#FFB020"/>
                <circle cx="10" cy="-20" r="5" fill="#FF5A1F"/>
                <circle cx="-10" cy="0" r="5" fill="#FF9A3C"/>
                <circle cx="10" cy="0" r="5" fill="#FFB020"/>
                <circle cx="-10" cy="20" r="5" fill="#E0201B"/>
                <circle cx="10" cy="20" r="5" fill="#FF9A3C"/>
            </g>
            <text x="570" y="275" font-family="'Montserrat', sans-serif" font-size="9" font-weight="700" fill="#F2B533" text-anchor="middle">STAND-04 DRIVE CABINET</text>
        </svg>
        """
    else:
        # Option 1: Technical Blueprint Line & Wireframe with Glowing Thermal Core (Default)
        svg = f"""
        <svg width="100%" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" style="display: block; background: #0E0D0C; border-radius: 8px;">
            <defs>
                <linearGradient id="slabGlowOpt1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#FFE600"/>
                    <stop offset="40%" stop-color="#FF5A1F"/>
                    <stop offset="100%" stop-color="#E0201B"/>
                </linearGradient>
                <filter id="opt1Blur">
                    <feGaussianBlur stdDeviation="8"/>
                </filter>
            </defs>

            <!-- Coordinate Grid Floor -->
            <g stroke="#282624" stroke-width="0.8" opacity="0.6">
                {''.join([f'<line x1="{x}" y1="240" x2="{x + 200}" y2="330"/>' for x in range(40, 560, 40)])}
                {''.join([f'<line x1="{40 + y*1.5}" y1="{240 + y}" x2="{500 + y*1.5}" y2="{240 + y}"/>' for y in range(0, 95, 18)])}
            </g>

            <!-- STAND-04 BLUEPRINT WIREFRAME -->
            <!-- Left Frame -->
            <path d="M 140,80 L 180,56 L 180,260 L 140,280 Z" fill="rgba(242, 181, 51, 0.04)" stroke="#88847E" stroke-width="1.4"/>
            <!-- Right Frame -->
            <path d="M 360,80 L 400,56 L 400,260 L 360,280 Z" fill="rgba(242, 181, 51, 0.04)" stroke="#88847E" stroke-width="1.4"/>
            <!-- Top Architrave -->
            <path d="M 140,80 L 360,80 L 400,56 L 180,56 Z" fill="rgba(255, 255, 255, 0.02)" stroke="#C4C1BA" stroke-width="1.4"/>

            <!-- 4-High Roll Stack (Work Rolls & Backup Rolls) -->
            <ellipse cx="270" cy="115" rx="52" ry="16" fill="none" stroke="#C4C1BA" stroke-width="1.5"/>
            <ellipse cx="270" cy="150" rx="38" ry="12" fill="none" stroke="#F2B533" stroke-width="1.5"/>

            <!-- GLOWING INCANDESCENT HOT STEEL SLAB -->
            <polygon points="50,195 500,195 530,210 80,210" fill="url(#slabGlowOpt1)" filter="url(#opt1Blur)" opacity="0.6"/>
            <polygon points="50,195 500,195 530,210 80,210" fill="url(#slabGlowOpt1)"/>
            <line x1="50" y1="195" x2="500" y2="195" stroke="#FFFFFF" stroke-width="2"/>

            <ellipse cx="270" cy="210" rx="38" ry="12" fill="none" stroke="#F2B533" stroke-width="1.5"/>
            <ellipse cx="270" cy="245" rx="52" ry="16" fill="none" stroke="#C4C1BA" stroke-width="1.5"/>

            <!-- DRIVE CABINET ISOMETRIC CUBE (RIGHT) -->
            <g transform="translate(520, 90)">
                <!-- Front Face -->
                <polygon points="0,30 80,75 80,200 0,155" fill="#151413" stroke="#F2B533" stroke-width="1.5"/>
                <!-- Top Face -->
                <polygon points="0,30 60,-5 140,40 80,75" fill="#1C1A18" stroke="#F2B533" stroke-width="1.5"/>
                <!-- Side Face -->
                <polygon points="80,75 140,40 140,165 80,200" fill="#1A1918" stroke="#33312E" stroke-width="1.5"/>
                <!-- Inner Thyristor Bridge Rack -->
                <rect x="15" y="65" width="50" height="75" rx="3" fill="#0E0D0C" stroke="#FF5A1F" stroke-width="1"/>
                <circle cx="28" cy="82" r="5" fill="#FF5A1F"/>
                <circle cx="52" cy="82" r="5" fill="#FFB020"/>
                <circle cx="28" cy="102" r="5" fill="#FF9A3C"/>
                <circle cx="52" cy="102" r="5" fill="#FFB020"/>
                <circle cx="28" cy="122" r="5" fill="#E0201B"/>
                <circle cx="52" cy="122" r="5" fill="#FF5A1F"/>
                <text x="40" y="160" font-family="'IBM Plex Mono', monospace" font-size="8.5" font-weight="700" fill="#F2B533" text-anchor="middle">DRIVE 6-PULSE</text>
            </g>

            <!-- Technical Callout Labels -->
            <line x1="270" y1="100" x2="270" y2="40" stroke="#88847E" stroke-width="1"/>
            <text x="270" y="32" font-family="'IBM Plex Mono', monospace" font-size="9" fill="#C4C1BA" text-anchor="middle">BACKUP ROLL (1400mm Ø)</text>

            <line x1="80" y1="210" x2="80" y2="280" stroke="#FF5A1F" stroke-width="1"/>
            <text x="80" y="295" font-family="'IBM Plex Mono', monospace" font-size="9" font-weight="700" fill="#FF5A1F">HOT STRIP (980°C)</text>
        </svg>
        """
    return textwrap.dedent(svg).strip()
