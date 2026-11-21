import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOCK_TICK_MS, MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { BASE_LOAD_FRAC, initialSimState } from '../../src/data/mock/fosterSim'
import { advanceScenario, applyScenario, INITIAL_SCENARIO_STATE } from '../../src/data/mock/scenarios'
import { MODEL_PARAMS } from '../../src/domain/thresholds'
import type { ConnectionStatus, DriveFrame } from '../../src/domain/types'

const EPOCH = Date.UTC(2026, 10, 21)

describe('MockTelemetrySource', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is a mock source with sim-clock timestamps 100 ms apart', () => {
    const src = new MockTelemetrySource({ seed: 1, epochMs: EPOCH })
    expect(src.kind).toBe('mock')
    const frames = src.runTicks(5)
    expect(frames.map((f) => Date.parse(f.timestamp) - EPOCH)).toEqual([100, 200, 300, 400, 500])
  })

  it('notifies subscribers and stops after unsubscribe', () => {
    const src = new MockTelemetrySource({ seed: 1, epochMs: EPOCH })
    const seen: DriveFrame[] = []
    const off = src.subscribe((f) => seen.push(f))
    src.runTicks(2)
    off()
    src.runTicks(2)
    expect(seen).toHaveLength(2)
  })

  it('reports connecting then live, emits every 100 ms, and goes offline on stop', () => {
    vi.useFakeTimers()
    const src = new MockTelemetrySource({ seed: 1, epochMs: EPOCH })
    const statuses: ConnectionStatus[] = []
    src.onStatus((s) => statuses.push(s))
    let count = 0
    src.subscribe(() => count++)
    src.start()
    expect(statuses).toEqual(['offline', 'connecting'])
    vi.advanceTimersByTime(MOCK_TICK_MS * 10)
    expect(count).toBe(10)
    expect(statuses).toEqual(['offline', 'connecting', 'live'])
    src.stop()
    vi.advanceTimersByTime(MOCK_TICK_MS * 10)
    expect(count).toBe(10)
    expect(statuses.at(-1)).toBe('offline')
  })

  it('replays identically for the same seed and scenario script', () => {
    const run = (): DriveFrame[] => {
      const src = new MockTelemetrySource({ seed: 42, epochMs: EPOCH })
      const a = src.runTicks(30)
      src.setScenario('fan_failure')
      return [...a, ...src.runTicks(30)]
    }
    expect(run()).toEqual(run())
  })

  it('fan_failure turns the fan off and raises R_sa by 2.2x; clear restores it', () => {
    const src = new MockTelemetrySource({ seed: 3, epochMs: EPOCH })
    const before = src.runTicks(1)[0]
    src.setScenario('fan_failure')
    const during = src.runTicks(1)[0]
    expect(during?.fan_status).toBe(false)
    expect(during?.thyristors[0].r_sa).toBeCloseTo((before?.thyristors[0].r_sa ?? 0) * 2.2, 9)
    src.setScenario('clear')
    const after = src.runTicks(1)[0]
    expect(after?.fan_status).toBe(true)
    expect(after?.thyristors[0].r_sa).toBeCloseTo(before?.thyristors[0].r_sa ?? 0, 9)
  })
})

describe('scenarios', () => {
  const sim = initialSimState(MODEL_PARAMS, EPOCH)

  it('clogging ramps R_sa to +60% over 60 s', () => {
    let r = applyScenario(sim, INITIAL_SCENARIO_STATE, 'clogging')
    expect(r.sim.r_sa_factor).toBe(1)
    for (let i = 0; i < 300; i++) r = advanceScenario(r.sim, r.scenario, 0.1)
    expect(r.sim.r_sa_factor).toBeCloseTo(1.3, 9)
    for (let i = 0; i < 400; i++) r = advanceScenario(r.sim, r.scenario, 0.1)
    expect(r.sim.r_sa_factor).toBeCloseTo(1.6, 9)
  })

  it('overload sets base load to 115% and bar_entry restarts the spike', () => {
    expect(applyScenario(sim, INITIAL_SCENARIO_STATE, 'overload').sim.load_frac).toBeCloseTo(1.15, 9)
    expect(applyScenario(sim, INITIAL_SCENARIO_STATE, 'bar_entry').sim.spike_t).toBe(0)
    const cleared = applyScenario(applyScenario(sim, INITIAL_SCENARIO_STATE, 'overload').sim, INITIAL_SCENARIO_STATE, 'clear')
    expect(cleared.sim.load_frac).toBe(BASE_LOAD_FRAC)
  })
})
