// MOCK DATA – synthetic, not plant telemetry
// Demo scenarios for the mock drive (Requirement 10.6). Scenarios only change the
// scenario fields of the sim state (load_frac, r_sa_factor, fan_on, spike_t);
// fosterSim.step() reads those fields and is not aware of scenarios.

import type { Scenario } from '../../domain/types'
import { BASE_LOAD_FRAC, type FosterSimState } from './fosterSim'

/** Fan failure multiplies every channel's R_sa by this factor. */
export const FAN_FAILURE_R_SA_FACTOR = 2.2
/** Clogging raises R_sa by this fraction once the ramp completes. */
export const CLOGGING_R_SA_RISE = 0.6
/** Clogging ramps R_sa linearly over this many seconds. */
export const CLOGGING_RAMP_S = 60
/** Overload sets the base load to this fraction of rated current. */
export const OVERLOAD_LOAD_FRAC = 1.15

/** Which cooling fault, if any, is active. Cooling and load faults combine. */
export type CoolingMode = 'healthy' | 'fan_failure' | 'clogging'

/** Scenario bookkeeping that lives beside the sim state. */
export interface ScenarioState {
  readonly cooling: CoolingMode
  /** Severity of the active cooling fault, in [0, 1]. */
  readonly cooling_severity: number
  /** s since clogging started; drives the R_sa ramp. */
  readonly clog_elapsed_s: number
}

export interface ScenarioResult {
  readonly sim: FosterSimState
  readonly scenario: ScenarioState
}

export const INITIAL_SCENARIO_STATE: ScenarioState = Object.freeze({
  cooling: 'healthy',
  cooling_severity: 1,
  clog_elapsed_s: 0,
})

/** Severity scales a scenario's deviation from baseline. Unset means full effect (1); values are clamped to [0, 1]. */
export function normaliseSeverity(severity: number | undefined): number {
  if (severity === undefined || !Number.isFinite(severity)) return 1
  return Math.min(1, Math.max(0, severity))
}

/** R_sa multiplier for clogging after `elapsedS` seconds at the given severity. */
export function cloggingFactor(elapsedS: number, severity: number): number {
  const progress = Math.min(1, Math.max(0, elapsedS / CLOGGING_RAMP_S))
  return 1 + CLOGGING_R_SA_RISE * severity * progress
}

/**
 * Apply a scenario to the sim state. Pure.
 * - `fan_failure`: R_sa × 2.2 and fan off (replaces any clogging ramp).
 * - `clogging`: starts a +60% R_sa ramp over 60 s from baseline, fan on.
 * - `overload`: base load 115% rated; the cooling state is kept.
 * - `bar_entry`: a spike starts on the next step; nothing else changes.
 * - `clear` and `normal`: restore baseline load and cooling.
 */
export function applyScenario(
  sim: FosterSimState,
  scenario: ScenarioState,
  next: Scenario,
  severity?: number,
): ScenarioResult {
  const sev = normaliseSeverity(severity)
  switch (next) {
    case 'fan_failure':
      return {
        sim: { ...sim, r_sa_factor: 1 + (FAN_FAILURE_R_SA_FACTOR - 1) * sev, fan_on: false },
        scenario: { cooling: 'fan_failure', cooling_severity: sev, clog_elapsed_s: 0 },
      }
    case 'clogging':
      return {
        sim: { ...sim, r_sa_factor: cloggingFactor(0, sev), fan_on: true },
        scenario: { cooling: 'clogging', cooling_severity: sev, clog_elapsed_s: 0 },
      }
    case 'overload':
      return {
        sim: { ...sim, load_frac: BASE_LOAD_FRAC + (OVERLOAD_LOAD_FRAC - BASE_LOAD_FRAC) * sev },
        scenario,
      }
    case 'bar_entry':
      return { sim: { ...sim, spike_t: 0 }, scenario }
    case 'clear':
    case 'normal':
      return {
        sim: { ...sim, load_frac: BASE_LOAD_FRAC, r_sa_factor: 1, fan_on: true },
        scenario: INITIAL_SCENARIO_STATE,
      }
  }
}

/**
 * Advance time-dependent scenarios by `dt` seconds. Pure. Call before each
 * `step()` so the ramp value applies to that step.
 */
export function advanceScenario(sim: FosterSimState, scenario: ScenarioState, dt: number): ScenarioResult {
  if (scenario.cooling !== 'clogging') return { sim, scenario }
  const clog_elapsed_s = scenario.clog_elapsed_s + dt
  return {
    sim: { ...sim, r_sa_factor: cloggingFactor(clog_elapsed_s, scenario.cooling_severity) },
    scenario: { ...scenario, clog_elapsed_s },
  }
}
