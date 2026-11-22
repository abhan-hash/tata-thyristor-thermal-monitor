// Scenario cases not covered by MockTelemetrySource.test.ts (Requirement 10.6).
import { describe, expect, it } from 'vitest'
import { BASE_LOAD_FRAC, initialSimState } from '../../src/data/mock/fosterSim'
import {
  advanceScenario,
  applyScenario,
  FAN_FAILURE_R_SA_FACTOR,
  INITIAL_SCENARIO_STATE,
  normaliseSeverity,
} from '../../src/data/mock/scenarios'
import { MODEL_PARAMS } from '../../src/domain/thresholds'

const sim = initialSimState(MODEL_PARAMS, Date.UTC(2026, 10, 21))

describe('applyScenario', () => {
  it('fan_failure changes only R_sa and the fan', () => {
    const r = applyScenario(sim, INITIAL_SCENARIO_STATE, 'fan_failure')
    expect(r.sim).toEqual({ ...sim, r_sa_factor: FAN_FAILURE_R_SA_FACTOR, fan_on: false })
    expect(r.scenario.cooling).toBe('fan_failure')
  })

  it('clogging starts from baseline with the fan on and replaces a fan failure', () => {
    const failed = applyScenario(sim, INITIAL_SCENARIO_STATE, 'fan_failure')
    const r = applyScenario(failed.sim, failed.scenario, 'clogging')
    expect(r.sim.fan_on).toBe(true)
    expect(r.sim.r_sa_factor).toBe(1)
    expect(r.scenario).toEqual({ cooling: 'clogging', cooling_severity: 1, clog_elapsed_s: 0 })
  })

  it('overload changes only the load and keeps the active cooling fault', () => {
    const failed = applyScenario(sim, INITIAL_SCENARIO_STATE, 'fan_failure')
    const r = applyScenario(failed.sim, failed.scenario, 'overload')
    expect(r.sim).toEqual({ ...failed.sim, load_frac: r.sim.load_frac })
    expect(r.sim.load_frac).toBeCloseTo(1.15, 9)
    expect(r.scenario).toBe(failed.scenario)
  })

  it('bar_entry only resets the spike clock', () => {
    const r = applyScenario({ ...sim, spike_t: 5 }, INITIAL_SCENARIO_STATE, 'bar_entry')
    expect(r.sim).toEqual({ ...sim, spike_t: 0 })
    expect(r.scenario).toBe(INITIAL_SCENARIO_STATE)
  })

  it.each(['clear', 'normal'] as const)('%s restores baseline load and cooling', (s) => {
    let r = applyScenario(sim, INITIAL_SCENARIO_STATE, 'overload')
    r = applyScenario(r.sim, r.scenario, 'clogging')
    r = advanceScenario(r.sim, r.scenario, 30)
    r = applyScenario(r.sim, r.scenario, s)
    expect(r.sim.load_frac).toBe(BASE_LOAD_FRAC)
    expect(r.sim.r_sa_factor).toBe(1)
    expect(r.sim.fan_on).toBe(true)
    expect(r.scenario).toEqual(INITIAL_SCENARIO_STATE)
  })

  it('severity scales the deviation from baseline and is clamped to [0, 1]', () => {
    expect(applyScenario(sim, INITIAL_SCENARIO_STATE, 'fan_failure', 0.5).sim.r_sa_factor).toBeCloseTo(1.6, 9)
    expect(applyScenario(sim, INITIAL_SCENARIO_STATE, 'overload', 0).sim.load_frac).toBe(BASE_LOAD_FRAC)
    expect(applyScenario(sim, INITIAL_SCENARIO_STATE, 'fan_failure', 7).sim.r_sa_factor).toBeCloseTo(2.2, 9)
    expect(normaliseSeverity(undefined)).toBe(1)
    expect(normaliseSeverity(Number.NaN)).toBe(1)
    expect(normaliseSeverity(-1)).toBe(0)
  })
})

describe('advanceScenario', () => {
  it('leaves non-clogging states unchanged', () => {
    const r = applyScenario(sim, INITIAL_SCENARIO_STATE, 'fan_failure')
    const next = advanceScenario(r.sim, r.scenario, 10)
    expect(next.sim).toBe(r.sim)
    expect(next.scenario).toBe(r.scenario)
  })

  it('a half-severity clog ramps to +30%', () => {
    let r = applyScenario(sim, INITIAL_SCENARIO_STATE, 'clogging', 0.5)
    r = advanceScenario(r.sim, r.scenario, 120)
    expect(r.sim.r_sa_factor).toBeCloseTo(1.3, 9)
  })
})
