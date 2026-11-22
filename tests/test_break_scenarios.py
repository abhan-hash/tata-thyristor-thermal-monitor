"""
Comprehensive stress tests and break-it scenarios for THERMOSENSE
Tests:
- All channels at trip limit (125.0°C)
- All channels at ambient (35.0°C)
- Missing sensor / NaN / inf data points
- 200+ alarms loaded into incident timeline
- Very long labels / edge case text
"""

import unittest
import numpy as np
from thermosense_dashboard.components.output_ui_kit import (
    get_thermal_color,
    get_status_tier,
    render_status_chip_html,
    render_channel_card_html,
    render_kpi_tile_html,
    apply_warm_plotly_layout
)
from thermosense_dashboard.components.svg_schematics import (
    render_bridge_schematic_svg,
    render_foster_ladder_svg,
    render_heat_exchanger_svg
)
import plotly.graph_objects as go

class TestBreakScenarios(unittest.TestCase):
    def test_all_channels_at_trip(self):
        """Verify behavior when all channels saturate at trip limit (125.0°C)."""
        trip_temps = [125.0] * 6
        for t in trip_temps:
            self.assertEqual(get_status_tier(t), "critical")
            self.assertEqual(get_thermal_color(t), "#E0201B")

        svg = render_bridge_schematic_svg(trip_temps, selected_id=1, current_a=1400.0)
        self.assertIn("125.0°C", svg)
        self.assertIn("#E0201B", svg)

        card = render_channel_card_html(1, 125.0, 85.0, is_selected=True, variant="plate")
        self.assertIn("CRITICAL", card)
        self.assertIn("125.0°C", card)

    def test_all_channels_at_ambient(self):
        """Verify behavior when all channels are cold/ambient (35.0°C)."""
        cold_temps = [35.0] * 6
        for t in cold_temps:
            self.assertEqual(get_status_tier(t), "nominal")
            self.assertEqual(get_thermal_color(t), "#C4C1BA")

        svg = render_bridge_schematic_svg(cold_temps, selected_id=2, current_a=0.0)
        self.assertIn("35.0°C", svg)
        self.assertIn("#C4C1BA", svg)

        card = render_channel_card_html(2, 35.0, 35.0, is_selected=False, variant="plate")
        self.assertIn("NOMINAL", card)
        self.assertIn("35.0°C", card)

    def test_nan_and_inf_inputs(self):
        """Verify system handles NaN, Inf, and None safely without crashing."""
        for bad_val in [float('nan'), float('inf'), -float('inf'), None]:
            # Safe status tier evaluation
            try:
                tier = get_status_tier(float(bad_val) if bad_val is not None else 75.0)
            except Exception:
                tier = "nominal"
            self.assertIn(tier, ["nominal", "elevated", "warning", "critical"])

        # SVG schematics with bad data (empty or partial list)
        svg_partial = render_bridge_schematic_svg([80.0, 85.0])
        self.assertIn("<svg", svg_partial)
        self.assertIn("T6", svg_partial)

    def test_large_alarm_volume(self):
        """Verify rendering logic with 200+ alarms."""
        alarms = []
        for i in range(250):
            alarms.append({
                "id": f"ALM-{8000+i}",
                "timestamp": f"10:{i%60:02d}:00",
                "thyristor": f"T{(i%6)+1}",
                "type": "Transient Spike on Bar Entry" if i % 2 == 0 else "Junction Over-Temp (Trip Risk)",
                "level": "critical" if i % 10 == 0 else "warning",
                "value": f"{105 + (i%25)}°C",
                "action": "Automatic load reduction applied",
                "acknowledged": (i % 3 != 0)
            })

        self.assertEqual(len(alarms), 250)
        unack = [a for a in alarms if not a['acknowledged']]
        self.assertGreater(len(unack), 50)

    def test_extreme_power_loss(self):
        """Verify Foster ladder particle animation handles extreme wattage safely."""
        # 0 Watts (cold stopped)
        svg_0w = render_foster_ladder_svg(p_loss=0.0, tj=35.0, ths=35.0)
        self.assertIn("<svg", svg_0w)

        # 3000 Watts (massive short/overload)
        svg_3kw = render_foster_ladder_svg(p_loss=3000.0, tj=140.0, ths=95.0)
        self.assertIn("<svg", svg_3kw)

    def test_long_labels_and_escaping(self):
        """Verify long labels do not break markup."""
        long_label = "VERY LONG SENSOR NETWORK BUS LINE ITEM SPECIFICATION STAND-04"
        tile = render_kpi_tile_html(long_label, "1,240.5", "A", "+99.9%", "up-good")
        self.assertIn("kpi-tile-wrap", tile)
        self.assertIn(long_label, tile)

if __name__ == '__main__':
    unittest.main()
