import fc from 'fast-check'
import { describe } from 'vitest'
import {
  HEAT_BREAKPOINTS_C,
  HEAT_STOP_MAX,
  HEAT_STOP_MIN,
  heatStopIndex,
  heatTreatment,
} from '../../src/domain/heatScale'
import { propertyTest } from './runner'
/**
 * Property 3: Heat scale monotonicity and range.
 * For all a ≤ b, heatStopIndex(a) ≤ heatStopIndex(b). For all x (including ±∞)
 * the index lies in [0, 8]. Non-finite input maps to the fault treatment and
 * never to a heat colour.
 *
 * **Validates: Requirements 4.5, 4.6**
 */

/** Values at, just below and just above each breakpoint, where off-by-one bugs live. */
const nearBreakpoint = fc
  .tuple(fc.constantFrom(...HEAT_BREAKPOINTS_C), fc.double({ min: -1, max: 1, noNaN: true }))
  .map(([bp, d]) => bp + d)

/** Ordered temperatures: plant range, breakpoint neighbourhoods, any double, and ±∞. */
const orderedTemp = fc.oneof(
  fc.double({ min: -50, max: 250, noNaN: true }),
  nearBreakpoint,
  fc.constantFrom(...HEAT_BREAKPOINTS_C),
  fc.double({ noNaN: true }),
  fc.constantFrom(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY),
)

/** Any temperature, including NaN and ±∞. */
const anyTemp = fc.oneof(
  orderedTemp,
  fc.double(),
  fc.constantFrom(Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY),
)

describe('Property 3: Heat scale monotonicity and range', () => {
  propertyTest(
    3,
    'Heat scale monotonicity and range',
    fc.property(orderedTemp, orderedTemp, anyTemp, (x, y, z) => {
      // Monotone: a ≤ b ⇒ index(a) ≤ index(b)
      const [a, b] = x <= y ? [x, y] : [y, x]
      if (heatStopIndex(a) > heatStopIndex(b)) return false

      // Range: integer index in [0, 8] for every input, including ±∞ and NaN
      for (const t of [x, y, z]) {
        const i = heatStopIndex(t)
        if (!Number.isInteger(i) || i < HEAT_STOP_MIN || i > HEAT_STOP_MAX) return false
      }

      // Treatment: non-finite ⇒ fault (never a heat colour); finite ⇒ heat stop matching the index
      for (const t of [x, y, z]) {
        const tr = heatTreatment(t)
        if (!Number.isFinite(t)) {
          if (tr.kind !== 'fault' || 'index' in tr) return false
        } else if (tr.kind !== 'heat' || tr.index !== heatStopIndex(t)) {
          return false
        }
      }
      return true
    }),
  )
})
