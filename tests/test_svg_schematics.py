"""
Unit tests for svg_schematics components
"""

import unittest
from thermosense_dashboard.components.svg_schematics import (
    render_bridge_schematic_svg,
    render_foster_ladder_svg,
    render_heat_exchanger_svg,
    render_isometric_mill_cutaway_svg
)

class TestSvgSchematics(unittest.TestCase):
    def test_bridge_schematic_svg(self):
        temps = [85.0, 92.0, 115.0, 88.0, 126.0, 90.0]
        svg = render_bridge_schematic_svg(temps, selected_id=3, current_a=790.0)
        self.assertIn("<svg", svg)
        self.assertIn("T1", svg)
        self.assertIn("T3", svg)
        self.assertIn("T6", svg)
        self.assertIn("+DC", svg)
        self.assertIn("-DC", svg)
        self.assertIn("115.0°C", svg)
        self.assertIn("?t=3", svg)

    def test_foster_ladder_svg(self):
        svg = render_foster_ladder_svg(p_loss=820.0, tj=94.5, ths=48.2)
        self.assertIn("<svg", svg)
        self.assertIn("R1: 0.008", svg)
        self.assertIn("R2: 0.016", svg)
        self.assertIn("R3: 0.016", svg)
        self.assertIn("τ1 = 20 ms", svg)
        self.assertIn("heat-flow-line", svg)

    def test_heat_exchanger_svg(self):
        svg = render_heat_exchanger_svg(inlet_temp=35.0, outlet_temp=46.8, fan_running=True, clogging_pct=0.25)
        self.assertIn("<svg", svg)
        self.assertIn("INLET AIR", svg)
        self.assertIn("EXHAUST PLENUM", svg)
        self.assertIn("FILTER (25%)", svg)
        self.assertIn("BLOWER TACHO", svg)

    def test_isometric_mill_cutaway_svg(self):
        svg_opt1 = render_isometric_mill_cutaway_svg(option=1)
        self.assertIn("<svg", svg_opt1)
        self.assertIn("HOT STRIP", svg_opt1)

        svg_opt2 = render_isometric_mill_cutaway_svg(option=2)
        self.assertIn("<svg", svg_opt2)
        self.assertIn("STAND-04 DRIVE CABINET", svg_opt2)

if __name__ == '__main__':
    unittest.main()
