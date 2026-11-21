// MOCK DATA – synthetic, not plant telemetry
// 200 historical alarm events and a per-event Tj trace generator (Requirement 10.8).
// Event shapes follow the alarm engine: drive-level `rms_current` events use
// channel 'drive', `residual_rate` is critical only, and `sensor` is a fault
// with peak value 1.
import type { AlarmEvent, ChannelId } from '../../../domain/types'
import { gaussian, mulberry32, type Rng } from '../rng'
import { CHANNELS, FIXTURE_NOW_MS, FIXTURE_SEED, HISTORY_DAYS } from './history'

/** Number of alarm events in the default fixture. */
export const ALARM_COUNT = 200

/** Trace half-width around the event, ms (±60 s). */
export const TRACE_HALF_WIDTH_MS = 60_000
/** Trace sample interval, ms (10 Hz). */
export const TRACE_STEP_MS = 100
/** Samples per trace: 60 s either side plus the event instant. */
export const TRACE_SAMPLES = (2 * TRACE_HALF_WIDTH_MS) / TRACE_STEP_MS + 1

/** Mock operator recorded on pre-acknowledged fixture events. */
export const FIXTURE_ACK_USER = 'operator.mock'

const DAY_MS = 86_400_000

type Kind = AlarmEvent['kind']
type Severity = AlarmEvent['severity']

interface Combo {
  kind: Kind
  severity: Severity
  unit: AlarmEvent['unit']
  /** Peak value range [min, max). */
  peak: readonly [number, number]
}

/** Every (kind, severity) pair the alarm engine can raise. */
export const ALARM_COMBOS: readonly Combo[] = [
  { kind: 'junction_temp', severity: 'warning', unit: '°C', peak: [110, 125] },
  { kind: 'junction_temp', severity: 'critical', unit: '°C', peak: [125, 138] },
  { kind: 'heatsink_temp', severity: 'warning', unit: '°C', peak: [80, 85] },
  { kind: 'heatsink_temp', severity: 'critical', unit: '°C', peak: [85, 92] },
  { kind: 'cooling_residual', severity: 'warning', unit: 'K', peak: [4, 8] },
  { kind: 'cooling_residual', severity: 'critical', unit: 'K', peak: [8, 13] },
  { kind: 'rms_current', severity: 'warning', unit: '%', peak: [100, 120] },
  { kind: 'rms_current', severity: 'critical', unit: '%', peak: [120, 140] },
  { kind: 'residual_rate', severity: 'critical', unit: 'K/min', peak: [2, 4.5] },
  { kind: 'sensor', severity: 'fault', unit: '°C', peak: [1, 1] },
]

function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)]
  if (item === undefined) throw new Error('pick from empty list')
  return item
}

/**
 * `count` alarm events over the `HISTORY_DAYS` days before `nowMs`, newest
 * first. The first `ALARM_COMBOS.length` events cover every kind and severity;
 * the rest are drawn at random. About 5 % are still active (no `cleared_at`,
 * all within the last hour), and roughly a third of the cleared ones are
 * already acknowledged.
 */
export function generateAlarms(seed: number, nowMs: number, count = ALARM_COUNT): AlarmEvent[] {
  const rng = mulberry32(seed ^ 0x5eed_0002)
  const events: AlarmEvent[] = []
  for (let i = 0; i < count; i++) {
    const combo = i < ALARM_COMBOS.length ? (ALARM_COMBOS[i] as Combo) : pick(rng, ALARM_COMBOS)
    const active = rng() < 0.05
    const ageMs = active ? 60_000 + rng() * 3_540_000 : 3_600_000 + rng() * (HISTORY_DAYS * DAY_MS - 3_600_000)
    const raisedMs = Math.round(nowMs - ageMs)
    const channel: AlarmEvent['channel'] = combo.kind === 'rms_current' ? 'drive' : pick<ChannelId>(rng, CHANNELS)
    const [lo, hi] = combo.peak
    const peak_value = combo.kind === 'sensor' ? 1 : Math.round((lo + rng() * (hi - lo)) * 10) / 10
    const event: AlarmEvent = {
      id: `mock-alm-${String(i + 1).padStart(3, '0')}`,
      channel,
      kind: combo.kind,
      severity: combo.severity,
      raised_at: new Date(raisedMs).toISOString(),
      peak_value,
      unit: combo.unit,
    }
    if (!active) {
      const clearedMs = Math.min(nowMs, raisedMs + Math.round(20_000 + rng() * 1_800_000))
      event.cleared_at = new Date(clearedMs).toISOString()
      if (rng() < 0.35) {
        event.acknowledged_by = FIXTURE_ACK_USER
        event.acknowledged_at = new Date(Math.min(nowMs, clearedMs + Math.round(rng() * 600_000))).toISOString()
      }
    }
    events.push(event)
  }
  return events.sort((a, b) => Date.parse(b.raised_at) - Date.parse(a.raised_at))
}

/** FNV-1a hash of a string, unsigned 32-bit. */
function hash32(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Tj trace from 60 s before to 60 s after `raised_at`, at 10 Hz.
 * `t` holds epoch ms; `tj` holds °C. The same event and seed always give the
 * same trace. For `junction_temp` events the trace peaks at the event's peak
 * value; other kinds get a plausible Tj excursion around 95–120 °C.
 */
export function generateTrace(event: AlarmEvent, seed: number = FIXTURE_SEED): { t: Float64Array; tj: Float32Array } {
  const rng = mulberry32((seed ^ hash32(event.id)) >>> 0)
  const raisedMs = Date.parse(event.raised_at)
  const peak = event.kind === 'junction_temp' ? event.peak_value : 95 + rng() * 25
  const rise = 12 + rng() * 10
  const base = peak - rise
  const riseTau = 6 + rng() * 6 // s, approach to the event
  const peakAt = 3 + rng() * 5 // s after raised_at
  const decayTau = 15 + rng() * 20 // s
  const t = new Float64Array(TRACE_SAMPLES)
  const tj = new Float32Array(TRACE_SAMPLES)
  for (let i = 0; i < TRACE_SAMPLES; i++) {
    const offsetMs = i * TRACE_STEP_MS - TRACE_HALF_WIDTH_MS
    const s = offsetMs / 1000
    const shape = s <= peakAt ? Math.exp((s - peakAt) / riseTau) : Math.exp(-(s - peakAt) / decayTau)
    t[i] = raisedMs + offsetMs
    tj[i] = base + rise * shape + gaussian(rng) * 0.15
  }
  return { t, tj }
}

/** Alarm events generated at module load from `FIXTURE_SEED`. */
export const MOCK_ALARMS: readonly AlarmEvent[] = Object.freeze(generateAlarms(FIXTURE_SEED, FIXTURE_NOW_MS))
