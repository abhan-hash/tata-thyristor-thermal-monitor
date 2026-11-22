import { DEFAULT_THRESHOLDS } from './thresholds'
import type { Band, Scenario, Thresholds } from './types'

/**
 * Settings_Validator and settings model (Requirements 28.3, 28.6).
 *
 * Pure functions only. Persistence and the live draft live in `state/uiStore`.
 */

/** Threshold groups that have a warning/critical band. `residual_rate` has no warning level. */
export type BandKey = 'junction_temp' | 'heatsink_temp' | 'cooling_residual' | 'rms_current'
export const BAND_KEYS: readonly BandKey[] = ['junction_temp', 'heatsink_temp', 'cooling_residual', 'rms_current']

/** Band fields the validator checks. */
export type BandField = 'warning' | 'critical' | 'hysteresis'

export interface DisplaySettings {
  /** Default chart window in seconds. */
  chartWindowS: number
  /** Show the heat field behind the bridge schematic. */
  heatField: boolean
}

export interface ScenarioDefaults {
  /** Scenario the mock source starts in. */
  scenario: Scenario
  /** Start the mock source on load. */
  autoStart: boolean
}

export interface Settings {
  thresholds: Thresholds
  display: DisplaySettings
  scenarioDefaults: ScenarioDefaults
}

/** Per-field error messages, keyed by band then field. Empty when the draft is valid. */
export type SettingsErrors = Partial<Record<BandKey, Partial<Record<BandField, string>>>>

export interface ValidationResult {
  readonly valid: boolean
  readonly errors: SettingsErrors
}

export const DEFAULT_DISPLAY: Readonly<DisplaySettings> = Object.freeze({ chartWindowS: 60, heatField: true })
export const DEFAULT_SCENARIO_DEFAULTS: Readonly<ScenarioDefaults> = Object.freeze({
  scenario: 'normal',
  autoStart: true,
})

function cloneBand(b: Readonly<Band>): Band {
  return { warning: b.warning, critical: b.critical, hysteresis: b.hysteresis, debounce_s: b.debounce_s }
}

/** Deep copy of a threshold set. `DEFAULT_THRESHOLDS` is only shallowly frozen, so edits must go through a copy. */
export function cloneThresholds(t: Readonly<Thresholds>): Thresholds {
  return {
    junction_temp: cloneBand(t.junction_temp),
    heatsink_temp: cloneBand(t.heatsink_temp),
    cooling_residual: cloneBand(t.cooling_residual),
    rms_current: cloneBand(t.rms_current),
    residual_rate: { critical: t.residual_rate.critical, debounce_s: t.residual_rate.debounce_s },
  }
}

/** Deep copy of a settings object. */
export function cloneSettings(s: Readonly<Settings>): Settings {
  return {
    thresholds: cloneThresholds(s.thresholds),
    display: { ...s.display },
    scenarioDefaults: { ...s.scenarioDefaults },
  }
}

/** Fresh default settings (thresholds from `config/thresholds.yaml`). */
export function defaultSettings(): Settings {
  return cloneSettings({
    thresholds: DEFAULT_THRESHOLDS,
    display: DEFAULT_DISPLAY,
    scenarioDefaults: DEFAULT_SCENARIO_DEFAULTS,
  })
}

/** Errors for one band: warning < critical and 0 ≤ hysteresis < critical − warning. */
function validateBand(band: Readonly<Band>): Partial<Record<BandField, string>> | undefined {
  const { warning, critical, hysteresis } = band
  const errors: Partial<Record<BandField, string>> = {}
  if (!Number.isFinite(warning)) errors.warning = 'Enter a number'
  if (!Number.isFinite(critical)) errors.critical = 'Enter a number'
  if (errors.warning === undefined && errors.critical === undefined && !(warning < critical)) {
    errors.warning = 'Warning must be below critical'
    errors.critical = 'Critical must be above warning'
  }
  if (!Number.isFinite(hysteresis)) {
    errors.hysteresis = 'Enter a number'
  } else if (hysteresis < 0) {
    errors.hysteresis = 'Hysteresis cannot be negative'
  } else if (!(hysteresis < critical - warning)) {
    errors.hysteresis = 'Hysteresis must be less than critical − warning'
  }
  return Object.keys(errors).length > 0 ? errors : undefined
}

/**
 * Accepts the draft iff, for every band, warning < critical and
 * 0 ≤ hysteresis < critical − warning (Requirement 28.3).
 */
export function validate(draft: Readonly<Settings>): ValidationResult {
  const errors: SettingsErrors = {}
  for (const key of BAND_KEYS) {
    const bandErrors = validateBand(draft.thresholds[key])
    if (bandErrors) errors[key] = bandErrors
  }
  return { valid: Object.keys(errors).length === 0, errors }
}

function sameNumber(a: number, b: number): boolean {
  return Object.is(a, b) || a === b
}

function sameBand(a: Readonly<Band>, b: Readonly<Band>): boolean {
  return (
    sameNumber(a.warning, b.warning) &&
    sameNumber(a.critical, b.critical) &&
    sameNumber(a.hysteresis, b.hysteresis) &&
    sameNumber(a.debounce_s, b.debounce_s)
  )
}

/** True when the draft differs from the saved settings in any field. */
export function isDirty(draft: Readonly<Settings>, saved: Readonly<Settings>): boolean {
  const d = draft.thresholds
  const s = saved.thresholds
  const sameThresholds =
    BAND_KEYS.every((k) => sameBand(d[k], s[k])) &&
    sameNumber(d.residual_rate.critical, s.residual_rate.critical) &&
    sameNumber(d.residual_rate.debounce_s, s.residual_rate.debounce_s)
  const sameDisplay =
    sameNumber(draft.display.chartWindowS, saved.display.chartWindowS) &&
    draft.display.heatField === saved.display.heatField
  const sameScenario =
    draft.scenarioDefaults.scenario === saved.scenarioDefaults.scenario &&
    draft.scenarioDefaults.autoStart === saved.scenarioDefaults.autoStart
  return !(sameThresholds && sameDisplay && sameScenario)
}

/** Save is enabled iff the draft is valid and differs from the saved settings (Requirement 28.6). */
export function canSave(draft: Readonly<Settings>, saved: Readonly<Settings>): boolean {
  return isDirty(draft, saved) && validate(draft).valid
}

const SCENARIOS: readonly Scenario[] = ['normal', 'bar_entry', 'fan_failure', 'clogging', 'overload', 'clear']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function bandFrom(v: unknown, fallback: Readonly<Band>): Band {
  const r = isRecord(v) ? v : {}
  return {
    warning: num(r.warning, fallback.warning),
    critical: num(r.critical, fallback.critical),
    hysteresis: num(r.hysteresis, fallback.hysteresis),
    debounce_s: num(r.debounce_s, fallback.debounce_s),
  }
}

/**
 * Builds settings from untrusted input (e.g. parsed `localStorage`). Missing or
 * malformed fields take their defaults. Returns defaults when the result fails
 * validation, so a corrupt store can never install inconsistent thresholds.
 */
export function settingsFrom(input: unknown): Settings {
  const defaults = defaultSettings()
  if (!isRecord(input)) return defaults
  const t = isRecord(input.thresholds) ? input.thresholds : {}
  const rr = isRecord(t.residual_rate) ? t.residual_rate : {}
  const display = isRecord(input.display) ? input.display : {}
  const sd = isRecord(input.scenarioDefaults) ? input.scenarioDefaults : {}
  const scenario = SCENARIOS.find((s) => s === sd.scenario) ?? defaults.scenarioDefaults.scenario
  const result: Settings = {
    thresholds: {
      junction_temp: bandFrom(t.junction_temp, defaults.thresholds.junction_temp),
      heatsink_temp: bandFrom(t.heatsink_temp, defaults.thresholds.heatsink_temp),
      cooling_residual: bandFrom(t.cooling_residual, defaults.thresholds.cooling_residual),
      rms_current: bandFrom(t.rms_current, defaults.thresholds.rms_current),
      residual_rate: {
        critical: num(rr.critical, defaults.thresholds.residual_rate.critical),
        debounce_s: num(rr.debounce_s, defaults.thresholds.residual_rate.debounce_s),
      },
    },
    display: {
      chartWindowS: num(display.chartWindowS, defaults.display.chartWindowS),
      heatField: bool(display.heatField, defaults.display.heatField),
    },
    scenarioDefaults: { scenario, autoStart: bool(sd.autoStart, defaults.scenarioDefaults.autoStart) },
  }
  return validate(result).valid ? result : defaults
}
