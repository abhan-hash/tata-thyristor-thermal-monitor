"""
Simulation engine for THERMOSENSE
Generates realistic thyristor thermal data with fault injection capability
"""

import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Optional
import yaml
from pathlib import Path

from .data_source import DriveData, ThyristorData


class Simulator:
    """Simulates thyristor thermal behavior with fault injection"""
    
    def __init__(self):
        # Load configuration
        config_path = Path(__file__).parent.parent / "config" / "thresholds.yaml"
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Simulation state
        self.start_time = datetime.now()
        self.current_time = 0.0  # Simulation time in seconds
        self.dt = 0.1  # 10 Hz simulation
        
        # Model parameters
        self.R_jc = self.config['model']['R_jc']
        self.R_sa_baseline = self.config['model']['R_sa_baseline']
        self.tau_1 = self.config['model']['tau_1']
        self.tau_2 = self.config['model']['tau_2']
        self.tau_3 = self.config['model']['tau_3']
        self.V_f0 = self.config['model']['V_f0']
        self.r_d = self.config['model']['r_d']
        self.rated_current = self.config['model']['rated_current']
        
        # State variables for each thyristor
        self.tj_states = np.zeros((6, 3))  # 3 RC layers per thyristor
        self.heatsink_temps = np.ones(6) * 45.0  # Initial heatsink temp
        self.peak_hold = np.zeros(6)  # Peak Tj in last second
        self.peak_hold_timer = 0.0
        
        # Ambient and drive conditions
        self.ambient_temp = 35.0
        self.armature_current = 0.0
        
        # Fault injection
        self.fan_failed = False
        self.clogging_level = 0.0  # 0 = clean, 1 = fully clogged
        self.overload_active = False
        
        # History for residual calculation
        self.heatsink_history = []
        self.power_history = []
        
    def inject_fault(self, fault_type: str, severity: float = 1.0):
        """
        Inject a fault into the simulation
        
        Args:
            fault_type: "fan_failure", "clogging", "overload", "clear"
            severity: 0.0 to 1.0 (for clogging)
        """
        if fault_type == "fan_failure":
            self.fan_failed = True
        elif fault_type == "clogging":
            self.clogging_level = min(1.0, max(0.0, severity))
        elif fault_type == "overload":
            self.overload_active = True
        elif fault_type == "clear":
            self.fan_failed = False
            self.clogging_level = 0.0
            self.overload_active = False
    
    def _generate_current(self) -> float:
        """Generate realistic armature current profile"""
        # Base load: ~70% of rated with slow variation
        base = 0.7 * self.rated_current * (1 + 0.1 * np.sin(self.current_time / 30))
        
        # Add bar entry spikes every ~8 seconds
        spike_freq = 0.125  # Hz
        spike_phase = (self.current_time * spike_freq) % 1.0
        if spike_phase < 0.3:  # Spike lasts 2.4 seconds
            spike = 0.4 * self.rated_current * np.exp(-((spike_phase - 0.15) / 0.08) ** 2)
        else:
            spike = 0.0
        
        # Overload injection
        if self.overload_active:
            base *= 1.3
        
        # Add noise
        noise = np.random.normal(0, 0.02 * self.rated_current)
        
        current = base + spike + noise
        return max(0, current)
    
    def _calculate_power_loss(self, current: float) -> float:
        """Calculate power loss in one thyristor (Id/3 assumption)"""
        i_thyristor = current / 3.0
        if i_thyristor < 0:
            return 0.0
        
        # Conduction loss: V_f0 * I + r_d * I^2
        p_loss = self.V_f0 * i_thyristor + self.r_d * i_thyristor ** 2
        return p_loss
    
    def _update_thermal_model(self, thyristor_idx: int, power_loss: float, 
                              heatsink_temp: float, dt: float):
        """Update 3-layer Foster RC network for junction temperature"""
        # Simplified Foster network: 3 RC stages in series
        # Each layer has capacitance and responds at different speeds
        
        # Layer 1 (fast): responds to power changes quickly
        self.tj_states[thyristor_idx, 0] += dt / self.tau_1 * (
            power_loss * self.R_jc / 3 - self.tj_states[thyristor_idx, 0]
        )
        
        # Layer 2 (medium)
        self.tj_states[thyristor_idx, 1] += dt / self.tau_2 * (
            power_loss * self.R_jc / 3 - self.tj_states[thyristor_idx, 1]
        )
        
        # Layer 3 (slow)
        self.tj_states[thyristor_idx, 2] += dt / self.tau_3 * (
            power_loss * self.R_jc / 3 - self.tj_states[thyristor_idx, 2]
        )
        
        # Total junction temperature
        tj = heatsink_temp + np.sum(self.tj_states[thyristor_idx, :])
        
        return tj
    
    def _update_heatsink_temp(self, thyristor_idx: int, power_loss: float, dt: float):
        """Update heatsink temperature with thermal mass"""
        # Effective R_sa depends on cooling health
        r_sa = self.R_sa_baseline * (1 + 2 * self.clogging_level)
        
        # If fan failed, R_sa increases dramatically
        if self.fan_failed:
            r_sa *= 3.0
        
        # Heatsink temperature rise above ambient
        target_rise = power_loss * r_sa
        target_temp = self.ambient_temp + target_rise
        
        # Thermal time constant for heatsink (~30 seconds)
        tau_heatsink = 30.0
        self.heatsink_temps[thyristor_idx] += dt / tau_heatsink * (
            target_temp - self.heatsink_temps[thyristor_idx]
        )
        
        # Add measurement noise (RTD)
        noise = np.random.normal(0, 0.1)
        return self.heatsink_temps[thyristor_idx] + noise, r_sa
    
    def _calculate_residual(self, thyristor_idx: int, heatsink_temp: float, 
                           power_loss: float) -> float:
        """Calculate cooling health residual"""
        # Predicted heatsink temp based on baseline R_sa
        predicted = self.ambient_temp + power_loss * self.R_sa_baseline
        
        # Residual is actual minus predicted
        residual = heatsink_temp - predicted
        
        # Apply smoothing (moving average)
        # In real implementation, use proper filtering
        return max(0, residual)
    
    def step(self):
        """Advance simulation by one timestep"""
        self.current_time += self.dt
        
        # Generate current
        self.armature_current = self._generate_current()
        
        # Update each thyristor
        for i in range(6):
            # Power loss
            power_loss = self._calculate_power_loss(self.armature_current)
            
            # Update heatsink temperature
            heatsink_temp, r_sa = self._update_heatsink_temp(i, power_loss, self.dt)
            
            # Update junction temperature
            tj = self._update_thermal_model(i, power_loss, heatsink_temp, self.dt)
            
            # Peak hold (keep max in last second)
            if self.peak_hold_timer >= 1.0:
                self.peak_hold[i] = tj
            else:
                self.peak_hold[i] = max(self.peak_hold[i], tj)
        
        # Reset peak hold timer
        self.peak_hold_timer += self.dt
        if self.peak_hold_timer >= 1.0:
            self.peak_hold_timer = 0.0
        
        # Vary ambient slowly
        self.ambient_temp = 35.0 + 3.0 * np.sin(self.current_time / 120)
    
    def get_latest(self) -> DriveData:
        """Get current simulation state as DriveData"""
        # Run simulation forward
        self.step()
        
        # Build DriveData object
        data = DriveData()
        data.timestamp = self.start_time + timedelta(seconds=self.current_time)
        data.armature_current = self.armature_current
        data.ambient_temp = self.ambient_temp
        data.fan_status = not self.fan_failed
        
        # Populate thyristor data
        for i in range(6):
            thyristor = data.thyristors[i]
            
            # Power loss
            power_loss = self._calculate_power_loss(self.armature_current)
            
            # Temperatures
            tj = self.peak_hold[i]
            heatsink_temp = self.heatsink_temps[i]
            
            # R_sa
            r_sa = self.R_sa_baseline * (1 + 2 * self.clogging_level)
            if self.fan_failed:
                r_sa *= 3.0
            
            # Residual
            residual = self._calculate_residual(i, heatsink_temp, power_loss)
            
            # Populate
            thyristor.tj_estimated = tj
            thyristor.t_heatsink_measured = heatsink_temp
            thyristor.power_loss = power_loss
            thyristor.current = self.armature_current / 3.0
            thyristor.residual = residual
            thyristor.r_sa = r_sa
            thyristor.margin_to_limit = 125.0 - tj
            
            # Determine status (simplified - proper alarm logic in alarm_logic.py)
            if tj >= 125:
                thyristor.status = "critical"
            elif tj >= 110:
                thyristor.status = "warning"
            else:
                thyristor.status = "normal"
            
            thyristor.sensor_healthy = True
        
        # Overall drive status is worst thyristor status
        statuses = [t.status for t in data.thyristors]
        if "critical" in statuses:
            data.overall_status = "critical"
        elif "warning" in statuses:
            data.overall_status = "warning"
        else:
            data.overall_status = "normal"
        
        return data
    
    def reset(self):
        """Reset simulation to initial state"""
        self.current_time = 0.0
        self.tj_states = np.zeros((6, 3))
        self.heatsink_temps = np.ones(6) * 45.0
        self.peak_hold = np.zeros(6)
        self.fan_failed = False
        self.clogging_level = 0.0
        self.overload_active = False
        self.start_time = datetime.now()
