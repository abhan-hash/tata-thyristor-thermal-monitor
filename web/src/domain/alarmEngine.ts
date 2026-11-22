import { MODEL_PARAMS } from './thresholds'
import type { AlarmEvent, ChannelId, DriveFrame, Thresholds } from './types'

/**
 * Alarm_Engine. A pure function of (frame, previous state, thresholds, time).
 *
 * Each monitored signal has one tracker per level (warning, critical; `fault`
 * for the sensor kind). A tracker raises when the value has stayed at or above
 * the level for the band's debounce, and clears only after the value has stayed
 * below `level − hysteresis` for the debounce. Anything in between keeps the
 * current phase and resets the pending timer, so an alarm cannot chatter.
 *
 * Trackers are independent: a channel at critical has both its warning and its
 * critical alarm active.
 */

export type AlarmKind = AlarmEvent['kind']
export type AlarmSeverity = AlarmEvent['severity']
export type AlarmChannel = AlarmEvent['channel']

/** Debounce for the `sensor` kind, which has no band in thresholds.yaml. */
export const SENSOR_DEBOUNCE_S = 2
/** Window over which `residual_rate` (K/min) is measured. */
export const RESIDUAL_RATE_WINDOW_MS = 60_000
/** Shortest history span that yields a `residual_rate`; shorter spans give no reading. */
export const RESIDUAL_RATE_MIN_SPAN_MS = 10_000
/** Residual history is decimated to at most one sample per this interval. */
export const RESIDUAL_SAMPLE_INTERVAL_MS = 1_000

export interface LevelTracker {
  /** The raised alarm, or null while idle. `peak_value` tracks the worst value seen. */
  readonly active: AlarmEvent | null
  /** ms timestamp at which the pending raise (idle) or clear (active) condition began. */
  readonly pending_since: number | null
}

export interface ResidualSample {
  readonly t: number
  readonly residual: number
}

export interface AlarmState {
  /** Keyed by `trackerKey(channel, kind, severity)`. */
  readonly trackers: Readonly<Record<string, LevelTracker>>
  /** Decimated residual history per channel, oldest first, spanning ≤ RESIDUAL_RATE_WINDOW_MS. */
  readonly residual_history: Readonly<Partial<Record<ChannelId, readonly ResidualSample[]>>>
  /** Monotonic counter used to build unique event ids. */
  readonly seq: number
}

export interface AlarmEvaluation {
  readonly state: AlarmState
  /** Alarms raised or cleared by this frame. Cleared events carry `cleared_at`. */
  readonly events: readonly AlarmEvent[]
}

export interface AlarmEngineOptions {
  /** A, the 100 % reference for `rms_current`. Defaults to MODEL_PARAMS.rated_current. */
  readonly ratedCurrent?: number
}

export function createAlarmState(): AlarmState {
  return { trackers: {}, residual_history: {}, seq: 0 }
}

export function trackerKey(channel: AlarmChannel, kind: AlarmKind, severity: AlarmSeverity): string {
  return `${String(channel)}:${kind}:${severity}`
}

/** Currently raised alarms, in tracker insertion order. */
export function activeAlarms(state: AlarmState): AlarmEvent[] {
  const out: AlarmEvent[] = []
  for (const t of Object.values(state.trackers)) {
    if (t.active) out.push(t.active)
  }
  return out
}

/** K/min over the held residual history, or NaN when the span is too short to measure. */
export function residualRate(history: readonly ResidualSample[] | undefined): number {
  const first = history?.[0]
  const last = history?.[history.length - 1]
  if (!first || !last || first === last) return Number.NaN
  const span = last.t - first.t
  if (span < RESIDUAL_RATE_MIN_SPAN_MS) return Number.NaN
  return ((last.residual - first.residual) / span) * 60_000
}

interface Check {
  channel: AlarmChannel
  kind: AlarmKind
  severity: AlarmSeverity
  value: number
  level: number
  hysteresis: number
  debounceMs: number
  unit: AlarmEvent['unit']
}

function nextResidualHistory(
  prev: readonly ResidualSample[] | undefined,
  residual: number,
  nowMs: number,
): readonly ResidualSample[] {
  const base = prev ?? []
  if (!Number.isFinite(residual)) return base
  const last = base.length > 0 ? base[base.length - 1] : undefined
  if (last && nowMs - last.t < RESIDUAL_SAMPLE_INTERVAL_MS) return base
  const cutoff = nowMs - RESIDUAL_RATE_WINDOW_MS
  const kept = base.filter((s) => s.t >= cutoff && s.t < nowMs)
  kept.push({ t: nowMs, residual })
  return kept
}

function bandChecks(
  channel: AlarmChannel,
  kind: AlarmKind,
  value: number,
  band: Thresholds['junction_temp'],
  unit: AlarmEvent['unit'],
): Check[] {
  const common = { channel, kind, value, hysteresis: band.hysteresis, debounceMs: band.debounce_s * 1000, unit }
  return [
    { ...common, severity: 'warning', level: band.warning },
    { ...common, severity: 'critical', level: band.critical },
  ]
}

function step(
  prev: LevelTracker | undefined,
  c: Check,
  nowMs: number,
  nextId: () => string,
): { tracker: LevelTracker; event: AlarmEvent | null } {
  const active = prev?.active ?? null
  const pending = prev?.pending_since ?? null

  if (!active) {
    if (!(c.value >= c.level)) return { tracker: { active: null, pending_since: null }, event: null }
    const since = pending ?? nowMs
    if (nowMs - since < c.debounceMs) return { tracker: { active: null, pending_since: since }, event: null }
    const event: AlarmEvent = {
      id: nextId(),
      channel: c.channel,
      kind: c.kind,
      severity: c.severity,
      raised_at: new Date(nowMs).toISOString(),
      peak_value: c.value,
      unit: c.unit,
    }
    return { tracker: { active: event, pending_since: null }, event }
  }

  const peaked = c.value > active.peak_value ? { ...active, peak_value: c.value } : active
  if (!(c.value < c.level - c.hysteresis)) return { tracker: { active: peaked, pending_since: null }, event: null }
  const since = pending ?? nowMs
  if (nowMs - since < c.debounceMs) return { tracker: { active: peaked, pending_since: since }, event: null }
  const cleared: AlarmEvent = { ...peaked, cleared_at: new Date(nowMs).toISOString() }
  return { tracker: { active: null, pending_since: null }, event: cleared }
}

/**
 * Evaluates one frame. Never mutates `prevState`. `nowMs` must be non-decreasing
 * across calls for debounce timing to be meaningful.
 */
export function evaluate(
  frame: DriveFrame,
  prevState: AlarmState,
  thresholds: Thresholds,
  nowMs: number,
  options: AlarmEngineOptions = {},
): AlarmEvaluation {
  const ratedCurrent = options.ratedCurrent ?? MODEL_PARAMS.rated_current
  const residual_history: Partial<Record<ChannelId, readonly ResidualSample[]>> = {}
  const checks: Check[] = []

  for (const th of frame.thyristors) {
    const ch = th.id
    checks.push(...bandChecks(ch, 'junction_temp', th.tj_estimated, thresholds.junction_temp, '°C'))
    checks.push(...bandChecks(ch, 'heatsink_temp', th.t_heatsink_measured, thresholds.heatsink_temp, '°C'))
    checks.push(...bandChecks(ch, 'cooling_residual', th.residual, thresholds.cooling_residual, 'K'))

    const history = nextResidualHistory(prevState.residual_history[ch], th.residual, nowMs)
    residual_history[ch] = history
    checks.push({
      channel: ch,
      kind: 'residual_rate',
      severity: 'critical',
      value: residualRate(history),
      level: thresholds.residual_rate.critical,
      hysteresis: 0,
      debounceMs: thresholds.residual_rate.debounce_s * 1000,
      unit: 'K/min',
    })

    checks.push({
      channel: ch,
      kind: 'sensor',
      severity: 'fault',
      value: th.sensor_healthy ? 0 : 1,
      level: 1,
      hysteresis: 0,
      debounceMs: SENSOR_DEBOUNCE_S * 1000,
      unit: '°C',
    })
  }

  const currentPct = ratedCurrent > 0 ? (frame.armature_current / ratedCurrent) * 100 : Number.NaN
  checks.push(...bandChecks('drive', 'rms_current', currentPct, thresholds.rms_current, '%'))

  let seq = prevState.seq
  const nextId = () => {
    seq += 1
    return `alm-${String(seq)}-${new Date(nowMs).toISOString()}`
  }

  const trackers: Record<string, LevelTracker> = { ...prevState.trackers }
  const events: AlarmEvent[] = []
  for (const c of checks) {
    const key = trackerKey(c.channel, c.kind, c.severity)
    const { tracker, event } = step(prevState.trackers[key], c, nowMs, nextId)
    trackers[key] = tracker
    if (event) events.push(event)
  }

  return { state: { trackers, residual_history, seq }, events }
}
