import fc from 'fast-check'
import { describe } from 'vitest'
import { activeAlarms, createAlarmState, evaluate, trackerKey, type AlarmState } from '../../src/domain/alarmEngine'
import { DEFAULT_THRESHOLDS } from '../../src/domain/thresholds'
import type { AlarmEvent, Band, ChannelId, DriveFrame, Thresholds, ThyristorFrame } from '../../src/domain/types'
import { propertyTest } from './runner'

/**
 * Property 11: Alarm hysteresis.
 * For any signal sequence, an alarm raised at level L clears only after the
 * value has stayed below L − hysteresis for the debounce duration. No alarm
 * raises and clears within the same debounce window (no chatter).
 *
 * The test drives one signal (Tj or heatsink) on one channel with a value
 * sequence clustered around the band edges and random frame spacing. Every
 * other signal stays benign. For each level it checks, frame by frame:
 *  - a raise happens exactly when the value has stayed ≥ L for the debounce (13.3);
 *  - a clear happens exactly when the value has stayed < L − H for the debounce (13.4);
 *  - while the value stays ≥ L − H the alarm stays active (13.5);
 *  - consecutive raise/clear transitions are at least one debounce apart.
 *
 * **Validates: Requirements 13.3, 13.4, 13.5**
 */

type Signal = 'junction_temp' | 'heatsink_temp'
type Level = 'warning' | 'critical'
const LEVELS: readonly Level[] = ['warning', 'critical']

const T0 = Date.UTC(2026, 0, 15, 9, 30)

function thyristor(id: ChannelId, tj: number, heatsink: number): ThyristorFrame {
  return {
    id,
    tj_estimated: tj,
    t_heatsink_measured: heatsink,
    power_loss: 500,
    current: 500,
    residual: 0,
    r_sa: 0.15,
    margin_to_limit: 125 - tj,
    status: 'normal',
    sensor_healthy: true,
  }
}

function frameFor(signal: Signal, channel: ChannelId, value: number, nowMs: number): DriveFrame {
  const ids: readonly ChannelId[] = [1, 2, 3, 4, 5, 6]
  const [a, b, c, d, e, f] = ids.map((id) => {
    if (id !== channel) return thyristor(id, 60, 40)
    return signal === 'junction_temp' ? thyristor(id, value, 40) : thyristor(id, 60, value)
  }) as [ThyristorFrame, ThyristorFrame, ThyristorFrame, ThyristorFrame, ThyristorFrame, ThyristorFrame]
  return {
    timestamp: new Date(nowMs).toISOString(),
    thyristors: [a, b, c, d, e, f],
    armature_current: 500,
    ambient_temp: 35,
    fan_status: true,
    overall_status: 'normal',
    active_alarms_count: 0,
  }
}

/** A band whose levels, hysteresis and debounce vary, with warning < critical. */
const bandArb = (base: Band): fc.Arbitrary<Band> =>
  fc.record({
    warning: fc.constant(base.warning),
    critical: fc.constant(base.critical),
    hysteresis: fc.constantFrom(0, 0.5, base.hysteresis, 4),
    debounce_s: fc.constantFrom(0, 1, base.debounce_s, 3),
  })

/** Values on, just either side of, and between each level and its clear point. */
function valueArb(band: Band): fc.Arbitrary<number> {
  const eps = 0.01
  const edges = LEVELS.flatMap((lvl) => {
    const L = band[lvl]
    const clear = L - band.hysteresis
    return [clear - eps, clear, clear + eps, L - eps, L, L + eps]
  })
  return fc.oneof(
    { weight: 3, arbitrary: fc.constantFrom(...edges) },
    {
      weight: 2,
      arbitrary: fc.double({
        min: band.warning - band.hysteresis - 5,
        max: band.critical + 5,
        noNaN: true,
      }),
    },
  )
}

/** Frame spacing in ms, biased toward debounce boundaries. */
const dtArb = fc.oneof(
  fc.constantFrom(0, 1, 500, 999, 1000, 1001, 1999, 2000, 2001, 3000),
  fc.integer({ min: 0, max: 2500 }),
)

const scenarioArb = fc
  .record({
    signal: fc.constantFrom<Signal>('junction_temp', 'heatsink_temp'),
    channel: fc.constantFrom<ChannelId>(1, 2, 3, 4, 5, 6),
  })
  .chain(({ signal, channel }) =>
    bandArb(DEFAULT_THRESHOLDS[signal]).chain((band) =>
      fc.record({
        signal: fc.constant(signal),
        channel: fc.constant(channel),
        band: fc.constant(band),
        steps: fc.array(fc.tuple(valueArb(band), dtArb), { minLength: 1, maxLength: 80 }),
      }),
    ),
  )

interface Sample {
  readonly t: number
  readonly value: number
}

/** Earliest index s ≤ i such that pred holds for every sample in s..i, else null. */
function runStart(samples: readonly Sample[], i: number, pred: (v: number) => boolean): number | null {
  let s: number | null = null
  for (let k = i; k >= 0; k -= 1) {
    const sample = samples[k]
    if (!sample || !pred(sample.value)) break
    s = k
  }
  return s
}

describe('Alarm hysteresis', () => {
  propertyTest(
    11,
    'Alarm hysteresis',
    fc.property(scenarioArb, ({ signal, channel, band, steps }) => {
      const thresholds: Thresholds = { ...DEFAULT_THRESHOLDS, [signal]: band }
      const debounceMs = band.debounce_s * 1000
      const samples: Sample[] = []
      let state: AlarmState = createAlarmState()
      let t = T0

      // Per level: expected phase, index at which the current phase began,
      // and the time of the last transition.
      const model = Object.fromEntries(
        LEVELS.map((lvl) => [lvl, { active: false, phaseStart: 0, lastTransitionAt: null as number | null }]),
      ) as Record<Level, { active: boolean; phaseStart: number; lastTransitionAt: number | null }>

      steps.forEach(([value, dt], i) => {
        t += i === 0 ? 0 : dt
        samples.push({ t, value })
        const result = evaluate(frameFor(signal, channel, value, t), state, thresholds, t)
        state = result.state

        for (const lvl of LEVELS) {
          const L = band[lvl]
          const clearBelow = L - band.hysteresis
          const key = trackerKey(channel, signal, lvl)
          const m = model[lvl]
          const evs: AlarmEvent[] = result.events.filter((e) => trackerKey(e.channel, e.kind, e.severity) === key)
          if (evs.length > 1) throw new Error(`${key}: ${String(evs.length)} events in one frame at i=${String(i)}`)
          const ev = evs[0]

          let expectTransition = false
          if (!m.active) {
            // Raise only once the value has stayed ≥ L for the debounce, counted
            // from no earlier than the frame that began the idle phase.
            const s = runStart(samples, i, (v) => v >= L)
            const start = s === null ? null : Math.max(s, m.phaseStart)
            expectTransition = start !== null && (samples[start]?.t ?? Infinity) <= t - debounceMs
            if (expectTransition !== (ev !== undefined && ev.cleared_at === undefined)) {
              throw new Error(`${key}: raise expected=${String(expectTransition)} got=${JSON.stringify(ev)} at i=${String(i)}`)
            }
            if (ev?.cleared_at !== undefined) throw new Error(`${key}: clear while idle at i=${String(i)}`)
          } else {
            // Clear only once the value has stayed < L − H for the debounce,
            // counted from no earlier than the raise frame.
            const s = runStart(samples, i, (v) => v < clearBelow)
            const start = s === null ? null : Math.max(s, m.phaseStart)
            expectTransition = start !== null && (samples[start]?.t ?? Infinity) <= t - debounceMs
            const cleared = ev?.cleared_at !== undefined
            if (expectTransition !== cleared) {
              throw new Error(`${key}: clear expected=${String(expectTransition)} got=${JSON.stringify(ev)} at i=${String(i)}`)
            }
            if (ev && !cleared) throw new Error(`${key}: second raise while active at i=${String(i)}`)
          }

          if (expectTransition) {
            // No chatter: a transition never follows the previous one within a debounce window.
            if (m.lastTransitionAt !== null && t - m.lastTransitionAt < debounceMs) {
              throw new Error(`${key}: transitions ${String(t - m.lastTransitionAt)} ms apart < ${String(debounceMs)} ms`)
            }
            m.active = !m.active
            m.phaseStart = i
            m.lastTransitionAt = t
          }

          const isActive = activeAlarms(state).some((a) => trackerKey(a.channel, a.kind, a.severity) === key)
          if (isActive !== m.active) {
            throw new Error(`${key}: active=${String(isActive)} expected=${String(m.active)} at i=${String(i)}`)
          }
        }

        // Every other tracker sees benign values and must stay silent.
        const stray = result.events.filter((e) => !(e.channel === channel && e.kind === signal))
        if (stray.length > 0) throw new Error(`unexpected events ${JSON.stringify(stray)}`)
      })
      return true
    }),
  )
})
