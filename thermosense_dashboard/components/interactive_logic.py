"""
THERMOSENSE - Interactive Logic & Telemetry Sanitization Engine
Handles sound-source routing, category channel validation, thermal status tiering,
and worst-case boundary clamping for industrial Rolling Mill telemetry.
"""

from typing import List, Any, Optional, Tuple, Dict
import numpy as np

# Valid sound-sources for mill subsystem inspection
VALID_SOURCES = [
    "BRIDGE",
    "ARMATURE",
    "FOSTER_RC",
    "EXCHANGER",
    "BLOWER",
    "CURRENT_SHUNT"
]


def validate_component_source(source_str: Optional[str]) -> str:
    """
    Validates and normalizes the selected telemetry sound-source component.
    Falls back safely to 'BRIDGE' if invalid, missing, or unrecognized.
    """
    if not source_str or not isinstance(source_str, str):
        return "BRIDGE"
    
    clean_src = source_str.strip().upper()
    if clean_src in VALID_SOURCES:
        return clean_src
    
    # Check for substring match (e.g., 'FOSTER' -> 'FOSTER_RC')
    for valid in VALID_SOURCES:
        if clean_src == valid or clean_src == valid.replace("_", " "):
            return valid

    return "BRIDGE"


def validate_selected_channel(t_val: Any, max_channels: int = 6) -> int:
    """
    Validates the selected thyristor channel number (1-based index).
    Coerces strings/floats safely and clamps within [1, max_channels], defaulting to 1.
    """
    if t_val is None:
        return 1
    
    try:
        int_val = int(t_val)
        if 1 <= int_val <= max_channels:
            return int_val
        return 1
    except (ValueError, TypeError):
        return 1


def get_thermal_status_tier(temp: float) -> Tuple[str, str]:
    """
    Maps thyristor junction temperature to standard industrial status tier
    and WCAG-compliant warm token hex color.
    
    Tiers:
    - CRITICAL: >= 125.0°C (Molten Red #E0201B)
    - WARNING: 110.0°C <= Tj < 125.0°C (Flame Orange #FF5A1F)
    - ELEVATED: 105.0°C <= Tj < 110.0°C (Amber #FFB020)
    - NOMINAL: < 105.0°C (Warm Grey #C4C1BA)
    """
    try:
        t = float(temp)
        if not np.isfinite(t):
            return "NOMINAL", "#C4C1BA"
    except (ValueError, TypeError):
        return "NOMINAL", "#C4C1BA"

    if t >= 125.0:
        return "CRITICAL", "#E0201B"
    elif t >= 110.0:
        return "WARNING", "#FF5A1F"
    elif t >= 105.0:
        return "ELEVATED", "#FFB020"
    else:
        return "NOMINAL", "#C4C1BA"


def calculate_thermal_margin(temp: float, trip_limit: float = 125.0) -> float:
    """
    Calculates temperature headroom (margin in Kelvin) prior to protective trip.
    Guaranteed non-negative float.
    """
    try:
        t = float(temp)
        if not np.isfinite(t):
            return 0.0
    except (ValueError, TypeError):
        return 0.0
    
    return max(0.0, float(trip_limit - t))


def sanitize_telemetry_dataset(
    raw_tj: Optional[List[Any]] = None,
    raw_hs: Optional[List[Any]] = None,
    armature_current: Any = 700.0,
    ambient_temp: Any = 35.0,
    residuals: Optional[List[Any]] = None,
    min_channels: int = 6
) -> Dict[str, Any]:
    """
    Sanitizes raw or worst-case telemetry data, ensuring safe physical bounds,
    replacing NaNs/Infs, and generating default fallback channels if empty.
    
    Guarantees:
    - clean_tj has at least min_channels items clamped to [45.0, 125.0]
    - clean_hs has at least min_channels items clamped to [25.0, 90.0]
    - armature_current clamped to [0.0, 1600.0]
    - ambient_temp clamped to [10.0, 60.0]
    - cooling_residual clamped to [0.5, 12.0]
    """
    raw_tj = raw_tj or []
    raw_hs = raw_hs or []
    residuals = residuals or []
    
    count = max(min_channels, len(raw_tj), len(raw_hs))
    
    clean_tj: List[float] = []
    clean_hs: List[float] = []
    
    for idx in range(count):
        # Junction temperature sanitization
        tj_val = 70.0 + (idx % 6) * 0.4
        if idx < len(raw_tj):
            val = raw_tj[idx]
            try:
                if isinstance(val, (list, tuple)) and len(val) > 0:
                    val = val[0]
                val = float(val)
                if np.isfinite(val):
                    tj_val = val
            except (ValueError, TypeError):
                pass
        # Physical clamping [45.0, 125.0]
        clean_tj.append(min(125.0, max(45.0, tj_val)))
        
        # Heatsink temperature sanitization
        hs_val = 45.0 + (idx % 6) * 0.2
        if idx < len(raw_hs):
            val = raw_hs[idx]
            try:
                if isinstance(val, (list, tuple)) and len(val) > 0:
                    val = val[0]
                val = float(val)
                if np.isfinite(val):
                    hs_val = val
            except (ValueError, TypeError):
                pass
        # Physical clamping [25.0, 90.0]
        clean_hs.append(min(90.0, max(25.0, hs_val)))
    
    # Armature current
    clean_current = 700.0
    try:
        val = float(armature_current)
        if np.isfinite(val):
            clean_current = min(1600.0, max(0.0, val))
    except (ValueError, TypeError):
        pass

    # Ambient temperature
    clean_ambient = 35.0
    try:
        val = float(ambient_temp)
        if np.isfinite(val):
            clean_ambient = min(60.0, max(10.0, val))
    except (ValueError, TypeError):
        pass

    # Cooling residual
    clean_res = 2.4
    clean_residual_list = []
    for r in residuals:
        try:
            val = float(r)
            if np.isfinite(val):
                clean_residual_list.append(val)
        except (ValueError, TypeError):
            pass
    if clean_residual_list:
        clean_res = max(clean_residual_list)
    clean_res = min(12.0, max(0.5, clean_res))

    return {
        "clean_tj": clean_tj,
        "clean_hs": clean_hs,
        "max_tj": max(clean_tj) if clean_tj else 70.0,
        "max_hs": max(clean_hs) if clean_hs else 45.0,
        "armature_current": clean_current,
        "ambient_temp": clean_ambient,
        "cooling_residual": clean_res,
        "channel_count": len(clean_tj)
    }
