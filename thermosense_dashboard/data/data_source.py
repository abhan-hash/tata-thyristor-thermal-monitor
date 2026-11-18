"""
Data source abstraction layer for THERMOSENSE
Provides get_latest() function that returns data from simulation, CSV, or live PLC
"""

from datetime import datetime
from typing import Dict, List, Optional
import numpy as np

class ThyristorData:
    """Data structure for a single thyristor"""
    def __init__(self, thyristor_id: int):
        self.id = thyristor_id
        self.tj_estimated = 0.0  # Junction temperature (°C)
        self.t_heatsink_measured = 0.0  # Heatsink temperature (°C)
        self.power_loss = 0.0  # Power dissipation (W)
        self.current = 0.0  # Current through thyristor (A)
        self.residual = 0.0  # Cooling residual (K)
        self.r_sa = 0.0  # Thermal resistance heatsink-to-ambient (K/W)
        self.margin_to_limit = 0.0  # 125°C - Tj
        self.status = "normal"  # normal, warning, critical, fault
        self.sensor_healthy = True
        
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'tj_estimated': self.tj_estimated,
            't_heatsink_measured': self.t_heatsink_measured,
            'power_loss': self.power_loss,
            'current': self.current,
            'residual': self.residual,
            'r_sa': self.r_sa,
            'margin_to_limit': self.margin_to_limit,
            'status': self.status,
            'sensor_healthy': self.sensor_healthy
        }


class DriveData:
    """Data structure for the entire drive"""
    def __init__(self):
        self.timestamp = datetime.now()
        self.thyristors: List[ThyristorData] = [ThyristorData(i+1) for i in range(6)]
        self.armature_current = 0.0  # Drive armature current (A)
        self.ambient_temp = 25.0  # Ambient temperature (°C)
        self.fan_status = True  # Fan running
        self.overall_status = "normal"  # Worst status among all thyristors
        self.active_alarms_count = 0
        
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'timestamp': self.timestamp.isoformat(),
            'thyristors': [t.to_dict() for t in self.thyristors],
            'armature_current': self.armature_current,
            'ambient_temp': self.ambient_temp,
            'fan_status': self.fan_status,
            'overall_status': self.overall_status,
            'active_alarms_count': self.active_alarms_count
        }
    
    def get_thyristor(self, thyristor_id: int) -> Optional[ThyristorData]:
        """Get a specific thyristor by ID (1-6)"""
        if 1 <= thyristor_id <= 6:
            return self.thyristors[thyristor_id - 1]
        return None


class DataSource:
    """Abstract data source - can be simulation, CSV, or live PLC"""
    
    def __init__(self, source_type: str = "simulation"):
        """
        Initialize data source
        
        Args:
            source_type: "simulation", "csv", or "plc"
        """
        self.source_type = source_type
        self.connected = False
        self.last_read_time = None
        
        # Import the appropriate backend
        if source_type == "simulation":
            from .simulator import Simulator
            self.backend = Simulator()
            self.connected = True
        else:
            # Placeholder for future implementations
            self.backend = None
            self.connected = False
    
    def get_latest(self) -> DriveData:
        """
        Get the latest data snapshot
        
        Returns:
            DriveData object with current values
        """
        if not self.connected:
            # Return safe default data if not connected
            return DriveData()
        
        if self.source_type == "simulation":
            data = self.backend.get_latest()
            self.last_read_time = datetime.now()
            return data
        
        # Placeholder for other sources
        return DriveData()
    
    def get_connection_status(self) -> Dict:
        """Get status of all data connections"""
        if self.source_type == "simulation":
            return {
                'heatsink_rtds': ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
                'ambient_rtd': True,
                'armature_current': True,
                'fan_status': True,
                'all_healthy': True,
                'last_read': self.last_read_time.isoformat() if self.last_read_time else None
            }
        
        return {
            'heatsink_rtds': [],
            'ambient_rtd': False,
            'armature_current': False,
            'fan_status': False,
            'all_healthy': False,
            'last_read': None
        }


# Singleton instance
_data_source = None

def get_data_source(source_type: str = "simulation") -> DataSource:
    """Get or create the global data source instance"""
    global _data_source
    if _data_source is None:
        _data_source = DataSource(source_type)
    return _data_source


def get_latest() -> DriveData:
    """Convenience function to get latest data from default source"""
    source = get_data_source()
    return source.get_latest()
