// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  canSave,
  cloneSettings,
  defaultSettings,
  isDirty,
  settingsFrom,
  validate,
} from '../../src/domain/settings'
import { DEFAULT_THRESHOLDS } from '../../src/domain/thresholds'

describe('validate', () => {
  it('accepts the default settings', () => {
    expect(validate(defaultSettings())).toEqual({ valid: true, errors: {} })
  })

  it('flags warning and critical when warning is not below critical', () => {
    const s = defaultSettings()
    s.thresholds.junction_temp.warning = 125
    const r = validate(s)
    expect(r.valid).toBe(false)
    expect(r.errors.junction_temp?.warning).toMatch(/below critical/)
    expect(r.errors.junction_temp?.critical).toMatch(/above warning/)
    expect(r.errors.heatsink_temp).toBeUndefined()
  })

  it('requires 0 ≤ hysteresis < critical − warning', () => {
    const s = defaultSettings()
    s.thresholds.heatsink_temp.hysteresis = 5 // 85 − 80 = 5, not strictly less
    s.thresholds.cooling_residual.hysteresis = -0.1
    const r = validate(s)
    expect(r.valid).toBe(false)
    expect(Object.keys(r.errors.heatsink_temp ?? {})).toEqual(['hysteresis'])
    expect(r.errors.cooling_residual?.hysteresis).toMatch(/negative/)

    s.thresholds.heatsink_temp.hysteresis = 4.9
    s.thresholds.cooling_residual.hysteresis = 0
    expect(validate(s).valid).toBe(true)
  })

  it('rejects non-finite values', () => {
    const s = defaultSettings()
    s.thresholds.rms_current.critical = Number.NaN
    expect(validate(s).errors.rms_current?.critical).toBe('Enter a number')
  })
})

describe('isDirty / canSave', () => {
  it('is clean for an identical copy and dirty after any edit', () => {
    const saved = defaultSettings()
    const draft = cloneSettings(saved)
    expect(isDirty(draft, saved)).toBe(false)
    expect(canSave(draft, saved)).toBe(false)

    draft.display.heatField = !draft.display.heatField
    expect(isDirty(draft, saved)).toBe(true)
    expect(canSave(draft, saved)).toBe(true)
  })

  it('cannot save a dirty but invalid draft', () => {
    const saved = defaultSettings()
    const draft = cloneSettings(saved)
    draft.thresholds.junction_temp.critical = 100
    expect(isDirty(draft, saved)).toBe(true)
    expect(canSave(draft, saved)).toBe(false)
  })
})

describe('cloneSettings', () => {
  it('copies deeply, leaving DEFAULT_THRESHOLDS untouched', () => {
    const s = defaultSettings()
    s.thresholds.junction_temp.warning = 1
    s.thresholds.residual_rate.critical = 9
    expect(DEFAULT_THRESHOLDS.junction_temp.warning).toBe(110)
    expect(DEFAULT_THRESHOLDS.residual_rate.critical).toBe(2)
  })
})

describe('settingsFrom', () => {
  it('fills missing and malformed fields from defaults', () => {
    const s = settingsFrom({
      thresholds: { junction_temp: { warning: 100, critical: 'x' } },
      display: { chartWindowS: 300 },
      scenarioDefaults: { scenario: 'nope', autoStart: false },
    })
    expect(s.thresholds.junction_temp).toEqual({ warning: 100, critical: 125, hysteresis: 2, debounce_s: 2 })
    expect(s.display).toEqual({ chartWindowS: 300, heatField: true })
    expect(s.scenarioDefaults).toEqual({ scenario: 'normal', autoStart: false })
  })

  it('falls back to defaults when the stored settings are invalid', () => {
    expect(settingsFrom({ thresholds: { heatsink_temp: { warning: 90, critical: 85 } } })).toEqual(defaultSettings())
    expect(settingsFrom(null)).toEqual(defaultSettings())
  })
})
