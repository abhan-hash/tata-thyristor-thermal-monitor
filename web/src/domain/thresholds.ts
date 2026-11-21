import type { ModelParams, Thresholds } from './types'

/**
 * Default alarm thresholds. Mirrors the `alarms` section of
 * `thermosense_dashboard/config/thresholds.yaml` (YAML `debounce` → `debounce_s`, seconds).
 * A unit test keeps these values in sync with the YAML.
 */
export const DEFAULT_THRESHOLDS: Readonly<Thresholds> = Object.freeze({
  junction_temp: { warning: 110, critical: 125, hysteresis: 2, debounce_s: 2 },
  heatsink_temp: { warning: 80, critical: 85, hysteresis: 2, debounce_s: 2 },
  cooling_residual: { warning: 4, critical: 8, hysteresis: 1, debounce_s: 5 },
  rms_current: { warning: 100, critical: 120, hysteresis: 5, debounce_s: 600 },
  residual_rate: { critical: 2, debounce_s: 10 },
})

/**
 * Thermal model parameters. Mirrors the `model` section of
 * `thermosense_dashboard/config/thresholds.yaml` (`tau_1..3` → `tau`).
 */
export const MODEL_PARAMS: Readonly<ModelParams> = Object.freeze({
  R_jc: 0.04,
  R_sa_baseline: 0.15,
  tau: [0.02, 0.5, 20] as const,
  V_f0: 1.2,
  r_d: 0.001,
  rated_current: 1000,
})
