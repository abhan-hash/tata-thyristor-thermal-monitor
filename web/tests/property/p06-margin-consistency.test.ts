import fc from 'fast-check'
import { describe } from 'vitest'
import {
  decodeDriveFrame,
  MARGIN_TOLERANCE_K,
  type MarginMismatch,
} from '../../src/domain/decode'
import { propertyTest } from './runner'

/**
 * Property 6: Margin consistency.
 * For any decoded frame and channel, `|margin_to_limit − (125 − tj_estimated)| ≤ 0.01`.
 * An unhealthy channel with NaN `tj_estimated` decodes to a NaN margin; both
 * sides being NaN counts as consistent. Input mismatches above 0.01 K are
 * reported through the injected logger, and only those.
 *
 * **Validates: Requirements 9.5**
 */

const TJ_LIMIT = 125
const STATUSES = ['normal', 'warning', 'critical', 'fault'] as const

const finite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true })

/** Healthy channels get a finite Tj; unhealthy ones get a finite Tj or NaN. */
const channelCore = fc.boolean().chain((sensor_healthy) =>
  fc.record({
    sensor_healthy: fc.constant(sensor_healthy),
    tj_estimated: sensor_healthy
      ? finite(-50, 250)
      : fc.oneof(finite(-50, 250), fc.constant(Number.NaN)),
  }),
)

/**
 * Input margin: exact, within tolerance, just outside tolerance, or any
 * double at all (including NaN and ±∞), so both the silent and the logged
 * paths are exercised.
 */
const channel = channelCore.chain(({ sensor_healthy, tj_estimated }) => {
  const exact = TJ_LIMIT - tj_estimated
  return fc.record({
    sensor_healthy: fc.constant(sensor_healthy),
    tj_estimated: fc.constant(tj_estimated),
    margin_to_limit: fc.oneof(
      fc.constant(exact),
      finite(-0.009, 0.009).map((d) => exact + d),
      finite(0.02, 50).chain((d) => fc.constantFrom(exact + d, exact - d)),
      fc.double(),
    ),
    status: fc.constantFrom(...STATUSES),
    t_heatsink_measured: finite(20, 100),
    power_loss: finite(0, 2000),
    current: finite(0, 3000),
    residual: finite(-10, 10),
    r_sa: finite(0.001, 1),
  })
})

const frameInput = fc
  .tuple(channel, channel, channel, channel, channel, channel)
  .chain((channels) =>
    fc.record({
      timestamp: fc
        .integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2030, 0, 1) })
        .map((ms) => new Date(ms).toISOString()),
      thyristors: fc.constant(channels.map((ch, i) => ({ id: i + 1, ...ch }))),
      armature_current: finite(0, 5000),
      ambient_temp: finite(30, 40),
      fan_status: fc.boolean(),
      overall_status: fc.constantFrom(...STATUSES),
      active_alarms_count: fc.nat({ max: 50 }),
    }),
  )

function consistent(margin: number, tj: number): boolean {
  const expected = TJ_LIMIT - tj
  if (Number.isNaN(margin) && Number.isNaN(expected)) return true
  return Math.abs(margin - expected) <= MARGIN_TOLERANCE_K
}

describe('Margin consistency', () => {
  propertyTest(
    6,
    'Margin consistency',
    fc.property(frameInput, (input) => {
      const logged: MarginMismatch[] = []
      const result = decodeDriveFrame(input, {
        logger: { marginMismatch: (d) => logged.push(d) },
      })
      if (!result.ok) {
        throw new Error(`valid frame rejected: ${result.error.path}: ${result.error.message}`)
      }

      // Every decoded channel satisfies the margin invariant.
      for (const ch of result.frame.thyristors) {
        if (!consistent(ch.margin_to_limit, ch.tj_estimated)) return false
      }

      // Exactly the channels whose input margin was inconsistent are logged.
      const expectedLogged = input.thyristors
        .filter((ch) => !consistent(ch.margin_to_limit, ch.tj_estimated))
        .map((ch) => ch.id)
      const actualLogged = logged.map((d) => d.channel)
      return (
        actualLogged.length === expectedLogged.length &&
        actualLogged.every((id, i) => id === expectedLogged[i])
      )
    }),
  )
})
