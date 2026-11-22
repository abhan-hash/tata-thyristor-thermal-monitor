"""
Unit tests for output_ui_kit components
"""

import unittest
from thermosense_dashboard.components.output_ui_kit import (
    get_thermal_color,
    get_status_tier,
    render_status_chip_html,
    render_mini_heat_disc_svg,
    render_channel_card_html,
    generate_sparkline_svg,
    render_kpi_tile_html,
    apply_warm_plotly_layout
)
import plotly.graph_objects as go

class TestUIKit(unittest.TestCase):
    def test_thermal_color_mapping(self):
        self.assertEqual(get_thermal_color(130.0), "#E0201B")  # Critical
        self.assertEqual(get_thermal_color(115.0), "#FF5A1F")  # High Warning
        self.assertEqual(get_thermal_color(90.0), "#FF9A3C")   # Elevated Warning
        self.assertEqual(get_thermal_color(70.0), "#FFB020")   # Elevated
        self.assertEqual(get_thermal_color(50.0), "#F2B533")   # Moderate
        self.assertEqual(get_thermal_color(35.0), "#C4C1BA")   # Nominal

    def test_status_tier(self):
        self.assertEqual(get_status_tier(126.0), "critical")
        self.assertEqual(get_status_tier(110.0), "warning")
        self.assertEqual(get_status_tier(90.0), "elevated")
        self.assertEqual(get_status_tier(60.0), "nominal")
        # Residual mode
        self.assertEqual(get_status_tier(8.5, is_residual=True), "critical")
        self.assertEqual(get_status_tier(4.5, is_residual=True), "warning")
        self.assertEqual(get_status_tier(2.5, is_residual=True), "elevated")
        self.assertEqual(get_status_tier(1.0, is_residual=True), "nominal")

    def test_status_chip_generation(self):
        chip_crit = render_status_chip_html("critical")
        self.assertIn("status-chip critical", chip_crit)
        self.assertIn("<svg", chip_crit)
        self.assertIn("CRITICAL", chip_crit)

        chip_nom = render_status_chip_html("nominal")
        self.assertIn("status-chip nominal", chip_nom)
        self.assertIn("NOMINAL", chip_nom)

    def test_mini_heat_disc_svg(self):
        svg = render_mini_heat_disc_svg(85.0, diameter=48)
        self.assertIn("<svg", svg)
        self.assertIn("width=\"48\"", svg)
        self.assertIn("circle", svg)

    def test_channel_card_variants(self):
        # Variant A: Plate
        card_a = render_channel_card_html(1, 85.0, 48.0, is_selected=True, variant="plate")
        self.assertIn("channel-card-plate selected", card_a)
        self.assertIn("T1", card_a)
        self.assertIn("85.0°C", card_a)

        # Variant B: Fader
        card_b = render_channel_card_html(2, 65.0, 42.0, is_selected=False, variant="fader")
        self.assertIn("channel-card-fader", card_b)
        self.assertIn("T2", card_b)

        # Variant C: Capsule
        card_c = render_channel_card_html(3, 110.0, 52.0, is_selected=False, variant="capsule")
        self.assertIn("channel-card-capsule", card_c)
        self.assertIn("T3", card_c)

    def test_sparkline_svg(self):
        spark = generate_sparkline_svg([10.0, 15.0, 12.0, 20.0, 18.0])
        self.assertIn("<svg", spark)
        self.assertIn("<path", spark)
        self.assertIn("<circle", spark)

    def test_kpi_tile_html(self):
        tile = render_kpi_tile_html("ARMATURE CURRENT", "780.2", "A", "+12 A", "up-good")
        self.assertIn("kpi-tile-wrap", tile)
        self.assertIn("ARMATURE CURRENT", tile)
        self.assertIn("780.2", tile)

    def test_shared_plotly_layout(self):
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=[1, 2, 3], y=[70, 80, 90]))
        apply_warm_plotly_layout(fig, "TEST TITLE", "TEMPERATURE (°C)", y_range=[0, 140])
        self.assertEqual(fig.layout.paper_bgcolor, "#151413")
        self.assertEqual(fig.layout.plot_bgcolor, "#0E0D0C")
        self.assertEqual(fig.layout.font.family, "IBM Plex Mono, monospace")

if __name__ == '__main__':
    unittest.main()
