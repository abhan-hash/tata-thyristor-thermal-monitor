"""
THERMOSENSE - Bespoke 3D Isometric Hardware Console Component
Directly modeled on Output Thermal (Screenshots Reference):
- True isometric 3D perspective with extruded chassis edge faces
- Bevel highlights on top edges and soft contact occlusion shadow underneath
- CNC knurled rotary knobs with directional shading and orange pointer needles
- Recessed fader channel with inner shadow and glowing orange slit
- Circular radiant thermal disc with organic irregular dark center blob and pupil
- In-place client-side 10 Hz telemetry update via JS / CSS variables (CLS: 0, zero page reloads)
- Full prefers-reduced-motion compliance
"""


def render_3d_hardware_console_html(initial_tj: float = 72.4, cooling_residual: float = 2.4) -> str:
    """
    Returns the complete, self-contained HTML/SVG markup and 10 Hz client script
    for the 3D isometric hardware controller unit.
    All styling is provided by assets/styles.css (Section 18).
    Every line has ZERO leading spaces to prevent CommonMark code block parsing.
    """
    initial_tj = min(125.0, max(45.0, float(initial_tj)))
    cooling_residual = min(12.0, max(0.5, float(cooling_residual)))

    return f"""<div class="hardware-console-root" style="width: 100%; max-width: 580px; margin: 0 auto; position: relative; z-index: 5; box-sizing: border-box;">
<div class="hardware-stage">
<div class="chassis-3d-slab" id="hardware-chassis-slab">
<div class="chassis-front-extrusion"></div>
<div class="chassis-right-extrusion"></div>
<div class="chassis-top-face">
<div class="chassis-noise-overlay"></div>
<div class="chassis-header-row">
<div>
<div class="chassis-title-label">THERMAL CORE &bull; VIRTUAL RTD</div>
<div class="chassis-subtitle-label">MODEL: FOSTER 3-STAGE IMPEDANCE</div>
</div>
<div class="controls-deck">
<div class="knob-container">
<div class="knob-dial" id="knob-load">
<div class="knob-indicator-tick" style="background: #FF5A1F; box-shadow: 0 0 6px #FF5A1F;"></div>
</div>
<span class="knob-sub-label">LOAD (Id)</span>
</div>
<div class="knob-container">
<div class="knob-dial" id="knob-residual" style="transform: rotate(45deg);">
<div class="knob-indicator-tick" style="background: #FFB020; box-shadow: 0 0 6px #FFB020;"></div>
</div>
<span class="knob-sub-label">RESIDUAL (&Delta;T)</span>
</div>
<div class="fader-container">
<div class="fader-recessed-slot">
<div class="fader-guide-slit"></div>
<div class="fader-thumb-knob" id="fader-thumb"></div>
</div>
<span class="knob-sub-label">LIMIT</span>
</div>
</div>
</div>
<div class="thermal-disc-housing" id="thermal-disc-housing">
<div class="disc-isoline-outer"></div>
<div class="disc-isoline-inner"></div>
<div class="dark-center-blob" id="dark-center-blob"></div>
<div class="pupil-core-ring" id="pupil-core-ring">
<span class="pupil-label">PEAK Tj</span>
<span class="pupil-temp-value" id="pupil-peak-tj-val">{initial_tj:.1f}&deg;</span>
<span class="pupil-trip-sub">TRIP 125&deg;</span>
</div>
</div>
<div class="chassis-bottom-row">
<span>THERMAL IMPEDANCE: <strong style="color: #FFFFFF;">0.04 K/W</strong></span>
<span>COOLING DELTA: <strong style="color: #FFB020;" id="spec-cooling-delta">+{cooling_residual:.1f} K</strong></span>
<span>CHASSIS: <strong style="color: #C4C1BA;">STAND-04</strong></span>
</div>
</div>
</div>
</div>
<script>
(function() {{
const minTj = 50.0;
const maxTj = 125.0;
let baseTj = {initial_tj:.2f};
let currentTj = baseTj;
let time = 0;
const tjDisplay = document.getElementById('pupil-peak-tj-val');
const discHousing = document.getElementById('thermal-disc-housing');
const centerBlob = document.getElementById('dark-center-blob');
const knobLoad = document.getElementById('knob-load');
const faderThumb = document.getElementById('fader-thumb');
const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function updateTelemetry10Hz() {{
time += 0.1;
const spikePhase = (time * 0.125) % 1.0;
let spike = 0;
if (spikePhase < 0.25) {{
spike = 6.5 * Math.sin((spikePhase / 0.25) * Math.PI);
}}
const noise = (Math.random() - 0.5) * 0.35;
const targetTj = baseTj + Math.sin(time / 6) * 1.5 + spike + noise;
currentTj += (targetTj - currentTj) * 0.25;
const clampedTj = Math.min(maxTj, Math.max(minTj, currentTj));
if (tjDisplay) {{
tjDisplay.textContent = clampedTj.toFixed(1) + '°';
}}
const ratio = Math.max(0, Math.min(1, (clampedTj - minTj) / (maxTj - minTj)));
if (!reducedMotion) {{
if (knobLoad) {{
const knobAngle = -30 + ratio * 80;
knobLoad.style.transform = `rotate(${{knobAngle}}deg)`;
}}
if (discHousing) {{
const glowSpread = 40 + ratio * 35;
const glowAlpha = 0.4 + ratio * 0.3;
discHousing.style.boxShadow = `0 0 ${{glowSpread}}px rgba(255, 90, 31, ${{glowAlpha}}), inset 0 0 30px rgba(0, 0, 0, 0.92)`;
}}
if (centerBlob) {{
const blobScale = 1.0 + Math.sin(time * 3) * 0.04 + ratio * 0.12;
centerBlob.style.transform = `scale(${{blobScale}})`;
}}
}}
}}
const timerId = setInterval(updateTelemetry10Hz, 100);
window.addEventListener('beforeunload', function() {{
clearInterval(timerId);
}});
}})();
</script>
</div>"""
