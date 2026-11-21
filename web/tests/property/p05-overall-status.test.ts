import fc from 'fast-check'
import { describe } from 'vitest'
import { decodeDriveFrame, type DecodeLogger } from '../../src/domain/decode'
import type { Status } from '../../src/domain/types'
import { propertyTest } from './runner'

/**
 * Property 5: Overall status is the worst channel.
 * For any decoded frame, overall_status = max_severity(thyristors[i].status),
 * and any channel with sensor_healthy = false has status `fault`.
 *
 * **Validates: Requirements 9.6, 9.7**
 */

/** Severity order written out independently of the code under test. */
const ORDER: readonly Status[] = ['normal', 'warning', 'critical', 'fault']
const status = fc.constantFrom<Status>(...ORDER)

/** Logger that ignores margin mismatches; this property does not look at margins. */
const silent: DecodeLogger = { marginMismatch: () => undefined }

const reading = fc.double({ min: -50, max: 250, noNaN: true })

/** A valid raw channel. Unhealthy channels may carry NaN readings. */
function channel(id: number) {
  return fc.boolean().chain((healthy) => {
    const value = healthy ? reading : fc.oneof(reading, fc.constant(Number.NaN))
    return fc.record({
      id: fc.constant(id),
      tj_estimated: value,
      t_heatsink_measured: value,
      power_loss: value,
      current: value,
      residual: value,
      r_sa: value,
      margin_to_limit: reading,
      status,
      sensor_healthy: fc.constant(healthy),
    })
  })
}

/** A valid raw frame whose input overall_status is random, so it often contradicts the channels. */
const rawFrame = fc.record({
  timestamp: fc
    .date({ min: new Date('2000-01-01T00:00:00Z'), max: new Date('2100-01-01T00:00:00Z'), noInvalidDate: true })
    .map((d) => d.toISOString()),
  thyristors: fc.tuple(channel(1), channel(2), channel(3), channel(4), channel(5), channel(6)),
  armature_current: fc.double({ min: 0, max: 5000, noNaN: true }),
  ambient_temp: fc.double({ min: -20, max: 60, noNaN: true }),
  fan_status: fc.boolean(),
  overall_status: status,
  active_alarms_count: fc.nat({ max: 100 }),
})

describe('Frame_Decoder', () => {
  propertyTest(
    5,
    'Overall status is the worst channel',
    fc.property(rawFrame, (raw) => {
      const result = decodeDriveFrame(raw, { logger: silent })
      if (!result.ok) throw new Error(`valid frame rejected: ${result.error.path} ${result.error.message}`)
      const { frame } = result

      // Unhealthy channels are forced to fault; healthy ones keep their input status.
      frame.thyristors.forEach((ch, i) => {
        const input = raw.thyristors[i]
        if (input === undefined) throw new Error(`missing input channel ${String(i + 1)}`)
        const expected: Status = input.sensor_healthy ? input.status : 'fault'
        if (ch.status !== expected) {
          throw new Error(`channel ${String(ch.id)}: expected ${expected}, got ${ch.status}`)
        }
      })

      // Overall status is the highest-ranked decoded channel status, whatever the input said.
      const worst = ORDER[Math.max(...frame.thyristors.map((ch) => ORDER.indexOf(ch.status)))]
      if (frame.overall_status !== worst) {
        throw new Error(`overall_status: expected ${String(worst)}, got ${frame.overall_status}`)
      }
    }),
  )
})
