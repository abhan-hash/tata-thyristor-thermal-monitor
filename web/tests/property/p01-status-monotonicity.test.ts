import fc from 'fast-check'
import { describe } from 'vitest'
import { severityRank, statusFor, type StatusBand } from '../../src/domain/status'
import { propertyTest } from './runner'

/**
 * Property 1: Status monotonicity.
 * For all thresholds t and finite temperatures a ≤ b,
 * severityRank(statusFor(a, t)) ≤ severityRank(statusFor(b, t)).
 *
 * **Validates: Requirements 4.3**
 */

const finite = fc.double({ noNaN: true, noDefaultInfinity: true })

/** Valid band: two distinct finite values, the smaller one is `warning`. */
const band: fc.Arbitrary<StatusBand> = fc
  .tuple(finite, finite)
  .filter(([x, y]) => x !== y)
  .map(([x, y]) => ({ warning: Math.min(x, y), critical: Math.max(x, y) }))

/** A temperature biased toward the band edges, so pairs often straddle a boundary. */
function temperature(t: StatusBand): fc.Arbitrary<number> {
  const edges = [t.warning, t.critical]
  return fc.oneof(
    finite,
    fc.constantFrom(...edges),
    fc.constantFrom(...edges).map((e) => (Number.isFinite(e - 1e-9) ? e - 1e-9 : e)),
    fc.double({ min: t.warning, max: t.critical, noNaN: true }),
  )
}

/** Band plus an ordered pair a ≤ b of finite temperatures. */
const scenario = band.chain((t) =>
  fc.tuple(temperature(t), temperature(t)).map(([x, y]) => ({
    t,
    a: Math.min(x, y),
    b: Math.max(x, y),
  })),
)

describe('Status_Classifier', () => {
  propertyTest(
    1,
    'Status monotonicity',
    fc.property(scenario, ({ t, a, b }) => {
      return severityRank(statusFor(a, t)) <= severityRank(statusFor(b, t))
    }),
  )
})
