"""
Basic test of data source and simulator
"""

import sys
from pathlib import Path

# Test imports
print("Testing imports...")
try:
    import numpy as np
    print("✓ NumPy imported")
except ImportError as e:
    print(f"✗ NumPy import failed: {e}")

try:
    import yaml
    print("✓ PyYAML imported")
except ImportError as e:
    print(f"✗ PyYAML import failed: {e}")

# Test data source
print("\nTesting data source...")
try:
    from data.data_source import get_latest
    print("✓ Data source imported")
    
    data = get_latest()
    print(f"✓ Got data: {len(data.thyristors)} thyristors")
    print(f"  Armature current: {data.armature_current:.1f} A")
    print(f"  Ambient temp: {data.ambient_temp:.1f} °C")
    
    for i, t in enumerate(data.thyristors):
        print(f"  T{t.id}: Tj={t.tj_estimated:.1f}°C, Status={t.status}")
    
    print("\n✅ All basic tests passed!")
    
except Exception as e:
    print(f"✗ Test failed: {e}")
    import traceback
    traceback.print_exc()
