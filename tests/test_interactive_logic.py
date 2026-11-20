"""
Unit tests for interactive logic: Sound-source selection, category channels, and telemetry edge cases.
Test-Driven Development (TDD) verification suite.
"""

import unittest
import numpy as np
import sys
from pathlib import Path

# Add project root and thermosense_dashboard to sys.path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "thermosense_dashboard"))

from thermosense_dashboard.components.interactive_logic import (
    validate_component_source,
    validate_selected_channel,
    get_thermal_status_tier,
    calculate_thermal_margin,
    sanitize_telemetry_dataset,
    VALID_SOURCES
)


class TestInteractiveLogic(unittest.TestCase):
    
    # -------------------------------------------------------------------------
    # 1. Sound-Source Selection Tests
    # -------------------------------------------------------------------------
    def test_sound_source_default_fallback(self):
        """None or empty string falls back to BRIDGE default."""
        self.assertEqual(validate_component_source(None), "BRIDGE")
        self.assertEqual(validate_component_source(""), "BRIDGE")

    def test_sound_source_valid_codes(self):
        """All 6 recognized sound-sources normalize properly regardless of case."""
        expected = ["BRIDGE", "ARMATURE", "FOSTER_RC", "EXCHANGER", "BLOWER", "CURRENT_SHUNT"]
        for src in expected:
            self.assertEqual(validate_component_source(src), src)
            self.assertEqual(validate_component_source(src.lower()), src)

    def test_sound_source_invalid_fallback(self):
        """Unrecognized components fall back safely to BRIDGE."""
        self.assertEqual(validate_component_source("INVALID_CODE"), "BRIDGE")
        self.assertEqual(validate_component_source("TURBINE"), "BRIDGE")
        self.assertEqual(validate_component_source("12345"), "BRIDGE")

    # -------------------------------------------------------------------------
    # 2. Channel Selection & Bounds Tests
    # -------------------------------------------------------------------------
    def test_channel_selection_valid_integers(self):
        """Valid channels 1..6 return matching integer."""
        for ch in range(1, 7):
            self.assertEqual(validate_selected_channel(ch, max_channels=6), ch)

    def test_channel_selection_string_coercion(self):
        """String numbers from query params convert cleanly to int."""
        self.assertEqual(validate_selected_channel("4", max_channels=6), 4)
        self.assertEqual(validate_selected_channel("1", max_channels=6), 1)

    def test_channel_selection_out_of_bounds(self):
        """Channels < 1 or > max_channels clamp or fallback to 1."""
        self.assertEqual(validate_selected_channel(0, max_channels=6), 1)
        self.assertEqual(validate_selected_channel(-5, max_channels=6), 1)
        self.assertEqual(validate_selected_channel(7, max_channels=6), 1)
        self.assertEqual(validate_selected_channel(99, max_channels=6), 1)

    def test_channel_selection_non_numeric(self):
        """Non-numeric values safely default to channel 1."""
        self.assertEqual(validate_selected_channel("invalid", max_channels=6), 1)
        self.assertEqual(validate_selected_channel(None, max_channels=6), 1)
        self.assertEqual(validate_selected_channel([], max_channels=6), 1)

    # -------------------------------------------------------------------------
    # 3. Thermal Status Tiers & Margin Tests
    # -------------------------------------------------------------------------
    def test_thermal_status_tier_mapping(self):
        """Temperature values map to correct industrial status and warm token hex colors."""
        # Critical tier >= 125.0°C
        status, color = get_thermal_status_tier(125.0)
        self.assertEqual(status, "CRITICAL")
        self.assertEqual(color, "#E0201B")

        status, color = get_thermal_status_tier(128.5)
        self.assertEqual(status, "CRITICAL")
        self.assertEqual(color, "#E0201B")

        # Warning tier 110.0°C <= Tj < 125.0°C
        status, color = get_thermal_status_tier(110.0)
        self.assertEqual(status, "WARNING")
        self.assertEqual(color, "#FF5A1F")

        status, color = get_thermal_status_tier(124.9)
        self.assertEqual(status, "WARNING")
        self.assertEqual(color, "#FF5A1F")

        # Elevated tier 105.0°C <= Tj < 110.0°C
        status, color = get_thermal_status_tier(105.0)
        self.assertEqual(status, "ELEVATED")
        self.assertEqual(color, "#FFB020")

        # Nominal tier < 105.0°C
        status, color = get_thermal_status_tier(72.4)
        self.assertEqual(status, "NOMINAL")
        self.assertEqual(color, "#C4C1BA")

    def test_thermal_margin_calculation(self):
        """Calculates margin to 125°C trip threshold, non-negative."""
        self.assertAlmostEqual(calculate_thermal_margin(70.0, trip_limit=125.0), 55.0)
        self.assertAlmostEqual(calculate_thermal_margin(125.0, trip_limit=125.0), 0.0)
        self.assertAlmostEqual(calculate_thermal_margin(130.0, trip_limit=125.0), 0.0)

    # -------------------------------------------------------------------------
    # 4. Worst-Case Content & Boundary Sanitization Tests (Break-UI)
    # -------------------------------------------------------------------------
    def test_sanitization_empty_dataset(self):
        """Zero items / empty dataset generates safe defaults without crashing."""
        res = sanitize_telemetry_dataset(
            raw_tj=[],
            raw_hs=[],
            armature_current=None,
            ambient_temp=None,
            residuals=[],
            min_channels=6
        )
        self.assertEqual(len(res['clean_tj']), 6)
        self.assertEqual(len(res['clean_hs']), 6)
        self.assertEqual(res['armature_current'], 700.0)
        self.assertEqual(res['ambient_temp'], 35.0)
        self.assertTrue(45.0 <= res['max_tj'] <= 125.0)

    def test_sanitization_nan_and_infinite_values(self):
        """NaN and infinite values are caught and replaced with bounded physical numbers."""
        res = sanitize_telemetry_dataset(
            raw_tj=[float('nan'), float('inf'), -float('inf'), "bad_string"],
            raw_hs=[None, float('nan')],
            armature_current=float('nan'),
            ambient_temp=float('inf'),
            residuals=[float('nan'), 3.2],
            min_channels=4
        )
        for val in res['clean_tj']:
            self.assertTrue(np.isfinite(val))
            self.assertTrue(45.0 <= val <= 125.0)
        for val in res['clean_hs']:
            self.assertTrue(np.isfinite(val))
            self.assertTrue(25.0 <= val <= 90.0)
        self.assertTrue(np.isfinite(res['armature_current']))
        self.assertTrue(np.isfinite(res['ambient_temp']))
        self.assertEqual(res['cooling_residual'], 3.2)

    def test_sanitization_extreme_bounds_clamping(self):
        """Excessive or negative values are clamped within physical safety boundaries."""
        res = sanitize_telemetry_dataset(
            raw_tj=[10.0, 300.0],
            raw_hs=[-20.0, 150.0],
            armature_current=5000.0,
            ambient_temp=-10.0,
            residuals=[50.0],
            min_channels=2
        )
        self.assertEqual(res['clean_tj'][0], 45.0)  # Min clamp
        self.assertEqual(res['clean_tj'][1], 125.0) # Max clamp
        self.assertEqual(res['clean_hs'][0], 25.0)  # Min clamp
        self.assertEqual(res['clean_hs'][1], 90.0)  # Max clamp
        self.assertEqual(res['armature_current'], 1600.0) # Max current clamp
        self.assertEqual(res['ambient_temp'], 10.0) # Min ambient clamp
        self.assertEqual(res['cooling_residual'], 12.0) # Max residual clamp

    def test_sanitization_large_list_20_channels(self):
        """Supports 20 channels without truncation or indexing errors."""
        raw_tj = [70.0 + i * 0.5 for i in range(20)]
        raw_hs = [45.0 + i * 0.3 for i in range(20)]
        res = sanitize_telemetry_dataset(
            raw_tj=raw_tj,
            raw_hs=raw_hs,
            armature_current=850.0,
            ambient_temp=36.0,
            residuals=[2.0],
            min_channels=20
        )
        self.assertEqual(len(res['clean_tj']), 20)
        self.assertEqual(len(res['clean_hs']), 20)


if __name__ == '__main__':
    unittest.main()
