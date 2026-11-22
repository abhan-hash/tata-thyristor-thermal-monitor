// MOCK DATA – synthetic, not plant telemetry
// Pure TypeScript port of the thermal simulator in thermosense_dashboard/data/simulator.py.
// It emits the instantaneous junction estimate on every step. Peak-hold over the
// 1 s display window is the store's job (design: State Management, display tick),
// so this module keeps no peak-hold state.

import { DEFAULT_THRESHOLDS } from '../../domain/thresholds'
import { maxSeverity, statusFor } from '../../domain/status'
import type { ChannelId, DriveFrame, ModelParams, ThyristorFrame } from '../../domain/types'
import { gaussian, type Rng } from './rng'

/** A fixed-length tuple of six, one entry per thyristor T1–T6. */
export type Six<T> = readonly [T, T, T, T, T, T]

/** Base load as a fraction of rated current (Requirement 10.4). */
export const BASE_LOAD_FRAC = 0.55
/** Bar-entry spike amplitude as a fraction of rated current. */
export const SPIKE_AMPLITUDE_FRAC = 0.4
/** A bar enters the mill every 8 s. */
export const SPIKE_PERIOD_S = 8
/** Each bar-entry spike lasts 2.4 s (30% of the period). */
export const SPIKE_DURATION_S = 2.4
/** Current noise standard deviation as a fraction of rated current. */
export const CURRENT_NOISE_FRAC = 0.02
/** RTD measurement noise standard deviation, °C. */
export const RTD_NOISE_SD = 0.08
/** RTD noise is clipped to ±5σ so the heatsink reading can never leave the physical bounds. */
export const RTD_NOISE_CLIP = 0.4
/** Heatsink thermal mass time constant, s (same as the Python simulator). */
export const TAU_HEATSINK_S = 30
/** Share of R_jc carried by each Foster stage. Equal split, as in the Python simulator. */
export const FOSTER_R_FRACTIONS = [1 / 3, 1 / 3, 1 / 3] as const

/**
 * Fixed per-channel R_sa offsets (within ±4%), following the duct airflow gradient
 * from inlet (T1) to outlet (T6).
 */
export const R_SA_OFFSETS: Six<number> = [-0.04, -0.02, -0.01, 0.01, 0.02, 0.04]
/** Fixed per-channel current-share offsets (within ±2%). */
export const CURRENT_SHARE_OFFSETS: Six<number> = [0.02, 0.01, -0.02, 0.01, -0.01, -0.02]

/** Physical bounds every frame must respect (Requirement 10.7). */
export const BOUNDS = Object.freeze({
  ambient_min: 30,
  ambient_max: 40,
  /** Heatsink state ceiling, kept below `tj_max` so Tj ≥ heatsink − 0.5 still holds when Tj clamps. */
  heatsink_max: 155,
  tj_max: 160,
  /** Armature current ceiling as a multiple of rated current. */
  current_max_frac: 1.6,
})

const CHANNEL_IDS: Six<ChannelId> = [1, 2, 3, 4, 5, 6]

export interface ChannelSimState {
  /** K, temperature rise across each Foster stage (junction above heatsink). */
  readonly foster: readonly [number, number, number]
  /** °C, noise-free heatsink temperature. */
  readonly heatsink: number
  /** °C, heatsink temperature the healthy-cooling model predicts (baseline R_sa, no offsets). */
  readonly predicted_heatsink: number
}

export interface FosterSimState {
  /** Wall-clock instant of sim time 0, ms since the Unix epoch. */
  readonly epoch_ms: number
  /** Sim time since start, whole milliseconds (integer, so timestamps never drift). */
  readonly t_ms: number
  /** s into the current bar-entry cycle, in [0, SPIKE_PERIOD_S). Set to 0 to force a spike now. */
  readonly spike_t: number
  /** Base load as a fraction of rated current. Scenarios change it (overload → 1.15). */
  readonly load_frac: number
  /** Multiplier on every channel's R_sa. Scenarios change it (fan failure, clogging). */
  readonly r_sa_factor: number
  /** Reported fan status. */
  readonly fan_on: boolean
  readonly channels: Six<ChannelSimState>
}

export interface StepResult {
  readonly state: FosterSimState
  readonly frame: DriveFrame
}

function toSix<T>(items: readonly T[]): Six<T> {
  if (items.length !== 6) throw new RangeError(`expected 6 channels, got ${String(items.length)}`)
  return items as unknown as Six<T>
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

/** Exact discretisation of dx/dt = (u − x)/τ for input u held constant over dt. */
function lag(x: number, target: number, dt: number, tau: number): number {
  return x + (1 - Math.exp(-dt / tau)) * (target - x)
}

/** Ambient temperature at sim time t (s): 35 + 3·sin(t/120). */
export function ambientAt(tSeconds: number): number {
  return clamp(35 + 3 * Math.sin(tSeconds / 120), BOUNDS.ambient_min, BOUNDS.ambient_max)
}

/** Gaussian bar-entry envelope as a fraction of rated current, for time s into the cycle. */
export function spikeEnvelope(spikeT: number): number {
  if (spikeT < 0 || spikeT >= SPIKE_DURATION_S) return 0
  const phase = spikeT / SPIKE_PERIOD_S
  const centre = SPIKE_DURATION_S / SPIKE_PERIOD_S / 2 // 0.15
  return SPIKE_AMPLITUDE_FRAC * Math.exp(-(((phase - centre) / 0.08) ** 2))
}

/** Per-device conduction loss, W: V_f0·I + r_d·I². */
export function powerLoss(current: number, params: ModelParams): number {
  const i = Math.max(0, current)
  return params.V_f0 * i + params.r_d * i * i
}

/** Device current for channel index `idx` (0-based) given armature current. */
export function deviceCurrent(armature: number, idx: number): number {
  return (armature / 3) * (1 + (CURRENT_SHARE_OFFSETS[idx] ?? 0))
}

/** Effective R_sa for channel index `idx` (0-based). */
export function channelRsa(idx: number, rSaFactor: number, params: ModelParams): number {
  return params.R_sa_baseline * (1 + (R_SA_OFFSETS[idx] ?? 0)) * rSaFactor
}

function fosterTargets(power: number, params: ModelParams): readonly [number, number, number] {
  return [
    power * params.R_jc * FOSTER_R_FRACTIONS[0],
    power * params.R_jc * FOSTER_R_FRACTIONS[1],
    power * params.R_jc * FOSTER_R_FRACTIONS[2],
  ]
}

/**
 * Initial state: every channel settled at the steady state of the base load with
 * healthy cooling, so per-channel differences are visible from the first frame.
 */
export function initialSimState(params: ModelParams, epochMs = 0): FosterSimState {
  const ambient = ambientAt(0)
  const armature = BASE_LOAD_FRAC * params.rated_current
  const channels = CHANNEL_IDS.map((_, idx): ChannelSimState => {
    const p = powerLoss(deviceCurrent(armature, idx), params)
    return {
      foster: fosterTargets(p, params),
      heatsink: ambient + p * channelRsa(idx, 1, params),
      predicted_heatsink: ambient + p * params.R_sa_baseline,
    }
  })
  return {
    epoch_ms: epochMs,
    t_ms: 0,
    // Start just after a spike so the first bar entry arrives a few seconds in.
    spike_t: SPIKE_DURATION_S,
    load_frac: BASE_LOAD_FRAC,
    r_sa_factor: 1,
    fan_on: true,
    channels: toSix(channels),
  }
}

/**
 * Advance the simulation by `dt` seconds. Pure: `state` is not mutated, and the
 * RNG is consumed in a fixed order (2 draws for current noise, then 2 per channel
 * for RTD noise), so identical seeds and inputs give identical outputs.
 */
export function step(state: FosterSimState, dt: number, rng: Rng, params: ModelParams): StepResult {
  if (!Number.isFinite(dt) || dt <= 0) throw new RangeError(`dt must be a positive finite number, got ${String(dt)}`)

  const t_ms = state.t_ms + Math.round(dt * 1000)
  const t = t_ms / 1000
  const ambient = ambientAt(t)

  // Armature current: base load + bar-entry spike + 2% noise, clamped to [0, 1.6 × rated].
  const spike_t = (state.spike_t + dt) % SPIKE_PERIOD_S
  const rated = params.rated_current
  const noise = gaussian(rng) * CURRENT_NOISE_FRAC * rated
  const armature = clamp(
    (state.load_frac + spikeEnvelope(spike_t)) * rated + noise,
    0,
    BOUNDS.current_max_frac * rated,
  )

  const nextChannels: ChannelSimState[] = []
  const thyristors: ThyristorFrame[] = []

  state.channels.forEach((ch, idx) => {
    const current = deviceCurrent(armature, idx)
    const power = powerLoss(current, params)
    const rSa = channelRsa(idx, state.r_sa_factor, params)

    const heatsink = clamp(lag(ch.heatsink, ambient + power * rSa, dt, TAU_HEATSINK_S), ambient, BOUNDS.heatsink_max)
    const predicted = lag(ch.predicted_heatsink, ambient + power * params.R_sa_baseline, dt, TAU_HEATSINK_S)

    const targets = fosterTargets(power, params)
    const foster: [number, number, number] = [
      lag(ch.foster[0], targets[0], dt, params.tau[0]),
      lag(ch.foster[1], targets[1], dt, params.tau[1]),
      lag(ch.foster[2], targets[2], dt, params.tau[2]),
    ]
    const rise = foster[0] + foster[1] + foster[2]
    const tj = Math.min(BOUNDS.tj_max, heatsink + rise)

    const rtdNoise = clamp(gaussian(rng) * RTD_NOISE_SD, -RTD_NOISE_CLIP, RTD_NOISE_CLIP)
    const measured = clamp(heatsink + rtdNoise, ambient - 0.5, tj + 0.5)

    nextChannels.push({ foster, heatsink, predicted_heatsink: predicted })
    thyristors.push({
      id: CHANNEL_IDS[idx] ?? 1,
      tj_estimated: tj,
      t_heatsink_measured: measured,
      power_loss: power,
      current,
      residual: measured - predicted,
      r_sa: rSa,
      margin_to_limit: DEFAULT_THRESHOLDS.junction_temp.critical - tj,
      status: statusFor(tj, DEFAULT_THRESHOLDS.junction_temp),
      sensor_healthy: true,
    })
  })

  const frame: DriveFrame = {
    timestamp: new Date(state.epoch_ms + t_ms).toISOString(),
    thyristors: toSix(thyristors),
    armature_current: armature,
    ambient_temp: ambient,
    fan_status: state.fan_on,
    overall_status: maxSeverity(thyristors.map((th) => th.status)),
    active_alarms_count: 0,
  }

  return {
    state: { ...state, t_ms, spike_t, channels: toSix(nextChannels) },
    frame,
  }
}
