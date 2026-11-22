import fc from 'fast-check'
import { afterEach, describe } from 'vitest'
import {
  BAND_KEYS,
  canSave,
  cloneSettings,
  defaultSettings,
  isDirty,
  validate,
  type Settings,
} from '../../src/domain/settings'
import { SETTINGS_STORAGE_KEY, useUiStore } from '../../src/state/uiStore'
import type { Band, Scenario } from '../../src/domain/types'
import { propertyTest } from './runner'

/**
 * Property 15: Settings validation.
 * For any settings draft, `validate(draft)` accepts it iff warning < critical
 * and 0 ≤ hysteresis < critical − warning for every band, and Save is enabled
 * iff the draft is valid and dirty.
 *
 * Bands are generated around the rule's edges (warning = critical,
 * hysteresis = 0, hysteresis = critical − warning, negative hysteresis, NaN)
 * so both valid and invalid drafts appear often. Saved settings are either
 * the draft itself, a copy of it, a copy with a few fields changed, or an
 * independent arbitrary settings object, so clean and dirty pairs both occur.
 *
 * **Validates: Requirements 28.3, 28.6**
 */

const SCENARIOS: readonly Scenario[] = ['normal', 'bar_entry', 'fan_failure', 'clogging', 'overload', 'clear']

const finite = fc.double({ min: -500, max: 500, noNaN: true, noDefaultInfinity: true })
const maybeNaN = (arb: fc.Arbitrary<number>): fc.Arbitrary<number> =>
  fc.oneof({ weight: 19, arbitrary: arb }, { weight: 1, arbitrary: fc.constant(Number.NaN) })

/** A band clustered around the validation edges. */
const bandArb: fc.Arbitrary<Band> = fc
  .record({
    warning: fc.oneof(fc.integer({ min: -50, max: 200 }), finite),
    gap: fc.oneof(fc.integer({ min: -10, max: 40 }), fc.constant(0), finite),
    hKind: fc.constantFrom('zero', 'edge', 'below', 'above', 'negative', 'free'),
    hFree: fc.oneof(fc.integer({ min: -5, max: 40 }), finite),
    debounce_s: fc.integer({ min: 0, max: 30 }),
  })
  .chain(({ warning, gap, hKind, hFree, debounce_s }) => {
    const critical = warning + gap
    const span = critical - warning
    const hysteresis =
      hKind === 'zero'
        ? 0
        : hKind === 'edge'
          ? span
          : hKind === 'below'
            ? span / 2
            : hKind === 'above'
              ? span + 1
              : hKind === 'negative'
                ? -Math.abs(hFree) - 0.5
                : hFree
    return fc.record({
      warning: maybeNaN(fc.constant(warning)),
      critical: maybeNaN(fc.constant(critical)),
      hysteresis: maybeNaN(fc.constant(hysteresis)),
      debounce_s: fc.constant(debounce_s),
    })
  })

const settingsArb: fc.Arbitrary<Settings> = fc.record({
  thresholds: fc.record({
    junction_temp: bandArb,
    heatsink_temp: bandArb,
    cooling_residual: bandArb,
    rms_current: bandArb,
    residual_rate: fc.record({ critical: fc.integer({ min: 0, max: 10 }), debounce_s: fc.integer({ min: 0, max: 30 }) }),
  }),
  display: fc.record({ chartWindowS: fc.constantFrom(10, 30, 60, 300), heatField: fc.boolean() }),
  scenarioDefaults: fc.record({ scenario: fc.constantFrom(...SCENARIOS), autoStart: fc.boolean() }),
})

/** Every comparable field of a settings object, in a fixed order. */
function flatten(s: Readonly<Settings>): unknown[] {
  const t = s.thresholds
  return [
    ...BAND_KEYS.flatMap((k) => [t[k].warning, t[k].critical, t[k].hysteresis, t[k].debounce_s]),
    t.residual_rate.critical,
    t.residual_rate.debounce_s,
    s.display.chartWindowS,
    s.display.heatField,
    s.scenarioDefaults.scenario,
    s.scenarioDefaults.autoStart,
  ]
}

function sameValue(a: unknown, b: unknown): boolean {
  return a === b || (Number.isNaN(a) && Number.isNaN(b))
}

/** Independent oracle for dirtiness. */
function expectedDirty(draft: Readonly<Settings>, saved: Readonly<Settings>): boolean {
  const d = flatten(draft)
  const s = flatten(saved)
  return d.some((v, i) => !sameValue(v, s[i]))
}

/** Independent oracle for the band rule, straight from Requirement 28.3. */
function expectedValid(draft: Readonly<Settings>): boolean {
  return BAND_KEYS.every((k) => {
    const { warning, critical, hysteresis } = draft.thresholds[k]
    return warning < critical && hysteresis >= 0 && hysteresis < critical - warning
  })
}

/** Copy of `base` with a few top-level fields changed. */
function mutated(base: Readonly<Settings>, other: Readonly<Settings>, picks: readonly number[]): Settings {
  const next = cloneSettings(base)
  for (const p of picks) {
    const key = BAND_KEYS[p]
    if (key !== undefined) next.thresholds[key] = { ...other.thresholds[key] }
    else if (p === BAND_KEYS.length) next.display = { ...other.display }
    else if (p === BAND_KEYS.length + 1) next.scenarioDefaults = { ...other.scenarioDefaults }
    else next.thresholds.residual_rate = { ...other.thresholds.residual_rate }
  }
  return next
}

/** Pairs of (draft, saved) covering clean and dirty cases. */
const pairArb: fc.Arbitrary<{ draft: Settings; saved: Settings }> = fc
  .record({
    draft: settingsArb,
    other: settingsArb,
    mode: fc.constantFrom('same', 'copy', 'mutated', 'independent'),
    picks: fc.uniqueArray(fc.integer({ min: 0, max: BAND_KEYS.length + 2 }), { minLength: 1, maxLength: 3 }),
  })
  .map(({ draft, other, mode, picks }) => {
    if (mode === 'same') return { draft, saved: draft }
    if (mode === 'copy') return { draft, saved: cloneSettings(draft) }
    if (mode === 'mutated') return { draft, saved: mutated(draft, other, picks) }
    return { draft, saved: other }
  })

describe('Property 15: Settings validation', () => {
  afterEach(() => {
    localStorage.removeItem(SETTINGS_STORAGE_KEY)
    const d = defaultSettings()
    useUiStore.setState({ saved: d, draft: cloneSettings(d) })
  })

  propertyTest(
    15,
    'Settings validation',
    fc.property(pairArb, ({ draft, saved }) => {
      const valid = expectedValid(draft)
      const dirty = expectedDirty(draft, saved)
      const result = validate(draft)

      // validate accepts iff the band rule holds for every band; errors appear iff invalid.
      if (result.valid !== valid) return false
      if ((Object.keys(result.errors).length === 0) !== valid) return false
      // Errors are reported only for bands that break the rule.
      for (const k of BAND_KEYS) {
        const { warning, critical, hysteresis } = draft.thresholds[k]
        const bandOk = warning < critical && hysteresis >= 0 && hysteresis < critical - warning
        if ((result.errors[k] === undefined) !== bandOk) return false
      }

      if (isDirty(draft, saved) !== dirty) return false
      if (canSave(draft, saved) !== (valid && dirty)) return false

      // The store saves only when canSave, and leaves saved settings untouched otherwise.
      const savedCopy = cloneSettings(saved)
      useUiStore.setState({ saved: savedCopy, draft: cloneSettings(draft) })
      const didSave = useUiStore.getState().save()
      if (didSave !== (valid && dirty)) return false
      const after = useUiStore.getState().saved
      const expectedSaved = didSave ? draft : saved
      if (expectedDirty(after, expectedSaved)) return false
      if (!didSave && after !== savedCopy) return false
      return true
    }),
  )
})
