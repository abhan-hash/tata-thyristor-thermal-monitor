import { describe, expect, it } from 'vitest'
import {
  activeAlarms,
  createAlarmState,
  evaluate,
  type AlarmState,
} from '../../src/domain/alarmEngine'
import { DEFAULT_THRESHOLDS } from '../../src/domain/thresholds'
import type { AlarmEvent, ChannelId, DriveFrame, ThyristorFrame } from '../../src/domain/types'

function frame(tj1: number, overrides: Partial<ThyristorFrame> = {}): DriveFrame {
  const th = [1, 2, 3, 4, 5, 6].map(
    (id): ThyristorFrame => ({
      id: id as ChannelId,
      tj_estimated: id === 1 ? tj1 : 70,
      t_heatsink_measured: 50,
      power_loss: 500,
      current: 300,
      residual: 0,
      r_sa: 0.15,
      margin_to_limit: 125 - (id === 1 ? tj1 : 70),
      status: 'normal',
      sensor_healthy: true,
      ...(id === 1 ? overrides : {}),
    }),
  )
  return {
    timestamp: '2026-01-15T09:30:00.000Z',
    thyristors: th as unknown as DriveFrame['thyristors'],
    armature_current: 700,
    ambient_temp: 35,
    fan_status: true,
    overall_status: 'normal',
    active_alarms_count: 0,
  }
}

/** Feeds `values` for channel 1 Tj at `dtMs` spacing; returns all events and the final state. */
function run(values: number[], dtMs = 500) {
  let state: AlarmState = createAlarmState()
  const events: { t: number; e: AlarmEvent }[] = []
  values.forEach((v, i) => {
    const t = i * dtMs
    const r = evaluate(frame(v), state, DEFAULT_THRESHOLDS, t)
    state = r.state
    for (const e of r.events) events.push({ t, e })
  })
  return { state, events }
}

describe('evaluate', () => {
  it('does not raise before the debounce has elapsed', () => {
    // 2 s debounce: samples at 0, 0.5, 1.0, 1.5 s are not enough.
    const { events } = run([112, 112, 112, 112])
    expect(events).toHaveLength(0)
  })

  it('raises a warning once the value has held at the level for the debounce', () => {
    const { events, state } = run([112, 112, 112, 112, 112])
    expect(events).toHaveLength(1)
    expect(events[0]?.t).toBe(2000)
    expect(events[0]?.e).toMatchObject({ channel: 1, kind: 'junction_temp', severity: 'warning', unit: '°C' })
    expect(activeAlarms(state)).toHaveLength(1)
  })

  it('keeps the alarm active inside the hysteresis band and clears after the debounce below it', () => {
    const raise = Array<number>(5).fill(115)
    const inBand = Array<number>(10).fill(109) // ≥ 110 − 2: stays active
    const below = Array<number>(5).fill(107) // < 108 for 2 s: clears
    const { events, state } = run([...raise, ...inBand, ...below])
    expect(events.map((x) => x.e.cleared_at === undefined)).toEqual([true, false])
    const cleared = events[1]
    expect(cleared?.t).toBe((5 + 10 + 4) * 500)
    expect(cleared?.e.peak_value).toBe(115)
    expect(activeAlarms(state)).toHaveLength(0)
  })

  it('does not mutate the previous state', () => {
    const prev = createAlarmState()
    const snapshot = JSON.stringify(prev)
    evaluate(frame(130), prev, DEFAULT_THRESHOLDS, 0)
    expect(JSON.stringify(prev)).toBe(snapshot)
  })

  it('raises a sensor fault for an unhealthy channel', () => {
    let state = createAlarmState()
    const bad = frame(70, { sensor_healthy: false, t_heatsink_measured: Number.NaN, status: 'fault' })
    const kinds: string[] = []
    for (let t = 0; t <= 2000; t += 500) {
      const r = evaluate(bad, state, DEFAULT_THRESHOLDS, t)
      state = r.state
      kinds.push(...r.events.map((e) => `${e.kind}:${e.severity}`))
    }
    expect(kinds).toEqual(['sensor:fault'])
  })

  it('raises rms_current on the drive from armature current as % of rated', () => {
    let state = createAlarmState()
    const f = { ...frame(70), armature_current: 1300 } // 130 % of 1000 A
    const raised: AlarmEvent[] = []
    for (let t = 0; t <= 600_000; t += 60_000) {
      const r = evaluate(f, state, DEFAULT_THRESHOLDS, t)
      state = r.state
      raised.push(...r.events)
    }
    expect(raised.map((e) => [e.channel, e.kind, e.severity, e.unit])).toEqual([
      ['drive', 'rms_current', 'warning', '%'],
      ['drive', 'rms_current', 'critical', '%'],
    ])
  })

  it('raises residual_rate when the residual climbs faster than the critical K/min', () => {
    let state = createAlarmState()
    const raised: AlarmEvent[] = []
    // 0.1 K/s = 6 K/min, sampled at 1 Hz for 30 s.
    for (let s = 0; s <= 30; s += 1) {
      const r = evaluate(frame(70, { residual: 0.1 * s }), state, DEFAULT_THRESHOLDS, s * 1000)
      state = r.state
      raised.push(...r.events.filter((e) => e.kind === 'residual_rate'))
    }
    expect(raised).toHaveLength(1)
    expect(raised[0]).toMatchObject({ channel: 1, severity: 'critical', unit: 'K/min' })
    expect(raised[0]?.peak_value).toBeCloseTo(6, 5)
  })
})

interface Phase {
  /** Last sample time (inclusive, ms) at which this frame is fed. */
  readonly until: number
  readonly frame: (tMs: number) => DriveFrame
}

/**
 * Feeds frames at `dtMs` spacing from t = 0, switching frame per phase, and
 * returns every event of `kind` as `[t, severity, 'raise' | 'clear']`.
 */
function simulate(kind: AlarmEvent['kind'], phases: Phase[], dtMs: number) {
  let state: AlarmState = createAlarmState()
  const out: [number, AlarmEvent['severity'], 'raise' | 'clear'][] = []
  const events: AlarmEvent[] = []
  const end = phases[phases.length - 1]?.until ?? 0
  for (let t = 0; t <= end; t += dtMs) {
    const phase = phases.find((p) => t <= p.until)
    if (!phase) break
    const r = evaluate(phase.frame(t), state, DEFAULT_THRESHOLDS, t)
    state = r.state
    for (const e of r.events) {
      if (e.kind !== kind) continue
      events.push(e)
      out.push([t, e.severity, e.cleared_at === undefined ? 'raise' : 'clear'])
    }
  }
  return { timeline: out, events, state }
}

describe('evaluate: raise and clear per alarm kind', () => {
  it('junction_temp raises warning and critical after 2 s at ≥ 125 °C and clears 2 s after dropping below level − 2', () => {
    const { timeline, events, state } = simulate(
      'junction_temp',
      [
        { until: 2000, frame: () => frame(130) },
        { until: 6000, frame: () => frame(100) },
      ],
      500,
    )
    expect(timeline).toEqual([
      [2000, 'warning', 'raise'],
      [2000, 'critical', 'raise'],
      [4500, 'warning', 'clear'],
      [4500, 'critical', 'clear'],
    ])
    const clear = events[2]
    expect(clear?.cleared_at).toBe(new Date(4500).toISOString())
    expect(clear?.raised_at).toBe(new Date(2000).toISOString())
    expect(clear?.peak_value).toBe(130)
    expect(activeAlarms(state)).toHaveLength(0)
  })

  it('heatsink_temp raises at ≥ 85 °C and clears below 83 °C, each after the 2 s debounce', () => {
    const { timeline, events } = simulate(
      'heatsink_temp',
      [
        { until: 2000, frame: () => frame(70, { t_heatsink_measured: 86 }) },
        { until: 6000, frame: () => frame(70, { t_heatsink_measured: 70 }) },
      ],
      500,
    )
    expect(timeline).toEqual([
      [2000, 'warning', 'raise'],
      [2000, 'critical', 'raise'],
      [4500, 'warning', 'clear'],
      [4500, 'critical', 'clear'],
    ])
    expect(events[0]).toMatchObject({ channel: 1, unit: '°C', peak_value: 86 })
  })

  it('cooling_residual raises after 5 s at ≥ 8 K and clears after 5 s below level − 1', () => {
    const { timeline, events } = simulate(
      'cooling_residual',
      [
        { until: 5000, frame: () => frame(70, { residual: 9 }) },
        { until: 12_000, frame: () => frame(70, { residual: 2 }) },
      ],
      500,
    )
    expect(timeline).toEqual([
      [5000, 'warning', 'raise'],
      [5000, 'critical', 'raise'],
      [10_500, 'warning', 'clear'],
      [10_500, 'critical', 'clear'],
    ])
    expect(events[0]).toMatchObject({ channel: 1, unit: 'K', peak_value: 9 })
  })

  it('cooling_residual keeps the warning active while the residual sits inside the hysteresis band', () => {
    const { timeline } = simulate(
      'cooling_residual',
      [
        { until: 5000, frame: () => frame(70, { residual: 5 }) },
        { until: 20_000, frame: () => frame(70, { residual: 3.5 }) }, // ≥ 4 − 1: stays active
      ],
      500,
    )
    expect(timeline).toEqual([[5000, 'warning', 'raise']])
  })

  it('rms_current raises after 600 s above rated and clears after 600 s below level − 5 %', () => {
    const at = (amps: number) => () => ({ ...frame(70), armature_current: amps })
    const { timeline, events } = simulate(
      'rms_current',
      [
        { until: 600_000, frame: at(1300) }, // 130 %
        { until: 1_400_000, frame: at(900) }, // 90 % < 95 % and < 115 %
      ],
      60_000,
    )
    expect(timeline).toEqual([
      [600_000, 'warning', 'raise'],
      [600_000, 'critical', 'raise'],
      [1_260_000, 'warning', 'clear'],
      [1_260_000, 'critical', 'clear'],
    ])
    expect(events[0]).toMatchObject({ channel: 'drive', unit: '%', peak_value: 130 })
  })

  it('residual_rate raises after 10 s above 2 K/min and clears once the 60 s rate has stayed below it for 10 s', () => {
    // Ramp at 0.1 K/s (6 K/min) for 30 s, then hold flat at 3 K.
    const residualAt = (t: number) => Math.min(0.1 * (t / 1000), 3)
    const { timeline, events, state } = simulate(
      'residual_rate',
      [{ until: 120_000, frame: (t) => frame(70, { residual: residualAt(t) }) }],
      1000,
    )
    // First measurable rate at 10 s (min span), raised after the 10 s debounce.
    expect(timeline[0]).toEqual([20_000, 'critical', 'raise'])
    expect(timeline).toHaveLength(2)
    const [clearT, clearSev, clearKind] = timeline[1] ?? []
    expect([clearSev, clearKind]).toEqual(['critical', 'clear'])
    // The 60 s rate falls below 2 K/min around t = 70 s, so the clear lands 10 s later.
    expect(clearT).toBeGreaterThanOrEqual(80_000)
    expect(clearT).toBeLessThanOrEqual(81_000)
    expect(events[1]?.cleared_at).toBe(new Date(clearT ?? 0).toISOString())
    expect(events[1]).toMatchObject({ channel: 1, unit: 'K/min' })
    expect(activeAlarms(state)).toHaveLength(0)
  })

  it('sensor raises a fault after 2 s unhealthy and clears after 2 s healthy', () => {
    const { timeline, events } = simulate(
      'sensor',
      [
        { until: 2000, frame: () => frame(70, { sensor_healthy: false, t_heatsink_measured: Number.NaN, status: 'fault' }) },
        { until: 6000, frame: () => frame(70) },
      ],
      500,
    )
    expect(timeline).toEqual([
      [2000, 'fault', 'raise'],
      [4500, 'fault', 'clear'],
    ])
    expect(events[1]).toMatchObject({ channel: 1, cleared_at: new Date(4500).toISOString() })
  })

  it('sensor does not raise for an unhealthy blip shorter than the debounce', () => {
    const bad = frame(70, { sensor_healthy: false, status: 'fault' })
    const { timeline } = simulate(
      'sensor',
      [
        { until: 1500, frame: () => bad },
        { until: 2000, frame: () => frame(70) },
        { until: 3500, frame: () => bad },
      ],
      500,
    )
    expect(timeline).toEqual([])
  })
})
