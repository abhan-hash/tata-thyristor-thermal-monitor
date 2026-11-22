/**
 * Domain types for THERMOSENSE.
 *
 * Keys are snake_case and match the Python model (`ThyristorData.to_dict()`,
 * `DriveData.to_dict()`, `config/thresholds.yaml`) so a future JSON payload
 * decodes without key mapping.
 */

export type ChannelId = 1 | 2 | 3 | 4 | 5 | 6

export type Status = 'normal' | 'warning' | 'critical' | 'fault'

/** Mirrors ThyristorData.to_dict() */
export interface ThyristorFrame {
  id: ChannelId
  /** °C */
  tj_estimated: number
  /** °C, NaN when the sensor is unhealthy */
  t_heatsink_measured: number
  /** W */
  power_loss: number
  /** A */
  current: number
  /** K */
  residual: number
  /** K/W */
  r_sa: number
  /** K, = 125 − tj_estimated */
  margin_to_limit: number
  status: Status
  sensor_healthy: boolean
}

/** Mirrors DriveData.to_dict() */
export interface DriveFrame {
  /** ISO 8601 */
  timestamp: string
  thyristors: readonly [
    ThyristorFrame,
    ThyristorFrame,
    ThyristorFrame,
    ThyristorFrame,
    ThyristorFrame,
    ThyristorFrame,
  ]
  /** A */
  armature_current: number
  /** °C */
  ambient_temp: number
  fan_status: boolean
  overall_status: Status
  active_alarms_count: number
}

/** One alarm band from config/thresholds.yaml. `debounce_s` is in seconds. */
export interface Band {
  warning: number
  critical: number
  hysteresis: number
  debounce_s: number
}

/** Mirrors the `alarms` section of config/thresholds.yaml */
export interface Thresholds {
  /** °C, defaults 110 / 125 */
  junction_temp: Band
  /** °C, defaults 80 / 85 */
  heatsink_temp: Band
  /** K, defaults 4 / 8 */
  cooling_residual: Band
  /** % of rated, defaults 100 / 120 */
  rms_current: Band
  /** K/min, default critical 2 */
  residual_rate: { critical: number; debounce_s: number }
}

/** Mirrors the `model` section of config/thresholds.yaml */
export interface ModelParams {
  /** K/W, junction to case */
  R_jc: number
  /** K/W, heatsink to ambient (healthy) */
  R_sa_baseline: number
  /** s, Foster network time constants [tau_1, tau_2, tau_3] */
  tau: readonly [number, number, number]
  /** V, forward voltage drop at zero current */
  V_f0: number
  /** Ω, dynamic resistance */
  r_d: number
  /** A */
  rated_current: number
}

export type Scenario = 'normal' | 'bar_entry' | 'fan_failure' | 'clogging' | 'overload' | 'clear'

export interface AlarmEvent {
  id: string
  channel: ChannelId | 'drive'
  kind:
    | 'junction_temp'
    | 'heatsink_temp'
    | 'cooling_residual'
    | 'rms_current'
    | 'residual_rate'
    | 'sensor'
  severity: Exclude<Status, 'normal'>
  raised_at: string
  cleared_at?: string
  peak_value: number
  unit: '°C' | 'K' | '%' | 'K/min'
  acknowledged_by?: string
  acknowledged_at?: string
}

export interface WearRecord {
  channel: ChannelId
  /** 0..100 */
  consumed_life_pct: number
  /** 1.0 = baseline, advisory above 2.0 */
  wear_rate_vs_baseline: number
  cycles_above_100C: number
  /** cycles with ΔT > 20 K */
  high_swing_cycles: number
  projection: { day: number; p10: number; p50: number; p90: number }[]
}

export type ConnectionStatus = 'connecting' | 'live' | 'stale' | 'reconnecting' | 'offline'
