import fc from 'fast-check'
import { describe } from 'vitest'
import { formatTempC } from '../../src/domain/format'
import { propertyTest } from './runner'

/**
 * Property 8: Precision reveals differences.
 * For any two channel values a, b in the display range [−50, 250] with
 * |a − b| ≥ 0.1 °C, `formatTempC(a) !== formatTempC(b)` at the readout precision.
 *
 * **Validates: Requirements 3.5**
 */

const MIN = -50
const MAX = 250
const STEP = 0.1

const inRange = fc.double({ min: MIN, max: MAX, noNaN: true, noDefaultInfinity: true })

/** Two independent values anywhere in the display range. */
const widePair = fc.tuple(inRange, inRange)

/**
 * Two values just one step apart (plus a small extra gap), which is where
 * rounding to 0.1 °C is most likely to collapse distinct readings.
 */
const closePair = fc
  .record({
    a: inRange,
    extra: fc.double({ min: 0, max: 0.05, noNaN: true }),
    up: fc.boolean(),
  })
  .map(({ a, extra, up }) => [a, up ? a + STEP + extra : a - STEP - extra] as [number, number])

/** Values on and around rounding boundaries (x.x5), where half-step rounding decides the digit. */
const boundaryPair = fc
  .record({
    tenths: fc.integer({ min: MIN * 10, max: MAX * 10 - 1 }),
    offset: fc.constantFrom(-1e-9, 0, 1e-9, 0.05, 0.04999999),
    up: fc.boolean(),
  })
  .map(({ tenths, offset, up }) => {
    const a = tenths / 10 + offset
    return [a, up ? a + STEP : a - STEP] as [number, number]
  })

const pair = fc
  .oneof(widePair, closePair, boundaryPair)
  .filter(([a, b]) => a >= MIN && a <= MAX && b >= MIN && b <= MAX && Math.abs(a - b) >= STEP)

describe('Precision reveals differences', () => {
  propertyTest(
    8,
    'Precision reveals differences',
    fc.property(pair, ([a, b]) => formatTempC(a) !== formatTempC(b)),
  )
})
