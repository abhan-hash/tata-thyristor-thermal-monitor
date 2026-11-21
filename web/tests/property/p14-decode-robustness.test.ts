import fc from 'fast-check'
import { describe } from 'vitest'
import { decodeDriveFrame, type DecodeLogger, type DecodeResult } from '../../src/domain/decode'
import type { Status } from '../../src/domain/types'
import { propertyTest } from './runner'

/**
 * Property 14: Decode robustness.
 * For any arbitrary JSON value, `decodeDriveFrame` either returns a frame that
 * satisfies Properties 5–6 or returns an error. It never throws.
 *
 * Inputs mix `fc.jsonValue()`, `fc.anything()` and mutated valid frames
 * (removed keys, extra keys, wrong counts, ±∞, NaN). For mutated frames the
 * expected outcome of each mutation is also checked.
 *
 * **Validates: Requirements 9.2, 9.3, 9.4, 9.8**
 */

const TJ_LIMIT = 125
const MARGIN_TOLERANCE = 0.01
const ORDER: readonly Status[] = ['normal', 'warning', 'critical', 'fault']
const silent: DecodeLogger = { marginMismatch: () => undefined }

const FRAME_KEYS = [
  'timestamp',
  'thyristors',
  'armature_current',
  'ambient_temp',
  'fan_status',
  'overall_status',
  'active_alarms_count',
] as const
const CHANNEL_KEYS = [
  'id',
  'tj_estimated',
  't_heatsink_measured',
  'power_loss',
  'current',
  'residual',
  'r_sa',
  'margin_to_limit',
  'status',
  'sensor_healthy',
] as const
/** Numeric channel fields where ±∞ must be rejected (margin is recomputed, so it is excluded). */
const CHANNEL_NUMBERS = [
  'tj_estimated',
  't_heatsink_measured',
  'power_loss',
  'current',
  'residual',
  'r_sa',
] as const
const FRAME_NUMBERS = ['armature_current', 'ambient_temp'] as const

type Raw = Record<string, unknown>
type Expect = 'ok' | 'error' | 'any'
interface Case {
  input: unknown
  expect: Expect
  label: string
}

const finite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true })

function channel(id: number): fc.Arbitrary<Raw> {
  return fc.boolean().chain((healthy) => {
    const value = healthy
      ? finite(-50, 250)
      : fc.oneof(finite(-50, 250), fc.constant(Number.NaN))
    return fc.record({
      id: fc.constant(id),
      tj_estimated: value,
      t_heatsink_measured: value,
      power_loss: value,
      current: value,
      residual: value,
      r_sa: value,
      margin_to_limit: fc.double(),
      status: fc.constantFrom(...ORDER),
      sensor_healthy: fc.constant(healthy),
    })
  })
}

const validFrame: fc.Arbitrary<Raw> = fc.record({
  timestamp: fc
    .integer({ min: Date.UTC(2020, 0, 1), max: Date.UTC(2030, 0, 1) })
    .map((ms) => new Date(ms).toISOString()),
  thyristors: fc.tuple(channel(1), channel(2), channel(3), channel(4), channel(5), channel(6)),
  armature_current: finite(0, 5000),
  ambient_temp: finite(-20, 60),
  fan_status: fc.boolean(),
  overall_status: fc.constantFrom(...ORDER),
  active_alarms_count: fc.nat({ max: 100 }),
})

function channels(frame: Raw): Raw[] {
  return frame['thyristors'] as Raw[]
}

/** Deep-ish copy so mutations never alias the generated value. */
function clone(frame: Raw): Raw {
  return { ...frame, thyristors: channels(frame).map((ch) => ({ ...ch })) }
}

/** Channel `i` of a cloned frame; throws rather than using a non-null assertion. */
function channelAt(frame: Raw, i: number): Raw {
  const ch = channels(frame)[i]
  if (ch === undefined) throw new Error(`no channel at index ${String(i)}`)
  return ch
}

/** Copy of `obj` without `key`. */
function omit(obj: Raw, key: string): Raw {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key))
}

const channelIndex = fc.nat({ max: 5 })
const extraKey = fc.string({ minLength: 1, maxLength: 8 }).map((s) => `x_${s}`)

const removeFrameKey = fc
  .tuple(validFrame, fc.constantFrom(...FRAME_KEYS))
  .map(([f, key]): Case => {
    const m = omit(clone(f), key)
    return { input: m, expect: 'error', label: `remove ${key}` }
  })

const removeChannelKey = fc
  .tuple(validFrame, channelIndex, fc.constantFrom(...CHANNEL_KEYS))
  .map(([f, i, key]): Case => {
    const m = clone(f)
    channels(m)[i] = omit(channelAt(m, i), key)
    return { input: m, expect: 'error', label: `remove thyristors[${i}].${key}` }
  })

const extraKeys = fc
  .tuple(validFrame, extraKey, fc.jsonValue(), channelIndex, extraKey, fc.jsonValue())
  .map(([f, k1, v1, i, k2, v2]): Case => {
    const m = clone(f)
    m[k1] = v1
    channelAt(m, i)[k2] = v2
    return { input: m, expect: 'ok', label: `extra keys ${k1}, thyristors[${i}].${k2}` }
  })

const wrongCount = fc
  .tuple(validFrame, fc.integer({ min: 0, max: 12 }).filter((n) => n !== 6))
  .map(([f, n]): Case => {
    const m = clone(f)
    m['thyristors'] = Array.from({ length: n }, (_, k) => ({ ...channelAt(m, k % 6), id: k + 1 }))
    return { input: m, expect: 'error', label: `${n} thyristors` }
  })

const wrongIds = fc
  .tuple(validFrame, fc.shuffledSubarray([0, 1, 2, 3, 4, 5], { minLength: 6, maxLength: 6 }))
  .filter(([, order]) => order.some((v, k) => v !== k))
  .map(([f, order]): Case => {
    const m = clone(f)
    const list = channels(m)
    m['thyristors'] = order.map((k) => list[k])
    return { input: m, expect: 'error', label: `ids out of order ${order.join(',')}` }
  })

const infinity = fc.constantFrom(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)

const channelInfinity = fc
  .tuple(validFrame, channelIndex, fc.constantFrom(...CHANNEL_NUMBERS), infinity)
  .map(([f, i, key, v]): Case => {
    const m = clone(f)
    channelAt(m, i)[key] = v
    return { input: m, expect: 'error', label: `thyristors[${i}].${key} = ${v}` }
  })

const frameInfinity = fc
  .tuple(validFrame, fc.constantFrom(...FRAME_NUMBERS), infinity)
  .map(([f, key, v]): Case => {
    const m = clone(f)
    m[key] = v
    return { input: m, expect: 'error', label: `${key} = ${v}` }
  })

/** NaN on a channel reading: rejected when healthy, accepted when unhealthy. */
const channelNaN = fc
  .tuple(validFrame, channelIndex, fc.constantFrom(...CHANNEL_NUMBERS))
  .map(([f, i, key]): Case => {
    const m = clone(f)
    const ch = channelAt(m, i)
    ch[key] = Number.NaN
    const healthy = ch['sensor_healthy'] === true
    return {
      input: m,
      expect: healthy ? 'error' : 'ok',
      label: `thyristors[${i}].${key} = NaN (healthy=${String(healthy)})`,
    }
  })

const mutated: fc.Arbitrary<Case> = fc.oneof(
  validFrame.map((f): Case => ({ input: f, expect: 'ok', label: 'unmutated' })),
  removeFrameKey,
  removeChannelKey,
  extraKeys,
  wrongCount,
  wrongIds,
  channelInfinity,
  frameInfinity,
  channelNaN,
)

const anyInput: fc.Arbitrary<Case> = fc.oneof(
  fc.jsonValue().map((v): Case => ({ input: v, expect: 'any', label: 'jsonValue' })),
  fc.anything().map((v): Case => ({ input: v, expect: 'any', label: 'anything' })),
  mutated,
)

function marginConsistent(margin: number, tj: number): boolean {
  const expected = TJ_LIMIT - tj
  if (Number.isNaN(margin) && Number.isNaN(expected)) return true
  return Math.abs(margin - expected) <= MARGIN_TOLERANCE
}

function sameKeys(obj: object, keys: readonly string[]): boolean {
  const actual = Object.keys(obj).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((k, i) => k === expected[i])
}

/** Checks Properties 5 and 6 plus "only known keys" (Requirement 9.8) on an ok result. */
function checkFrame(result: Extract<DecodeResult, { ok: true }>, label: string): void {
  const { frame } = result
  if (!sameKeys(frame, FRAME_KEYS)) throw new Error(`${label}: frame has unexpected keys`)
  if (frame.thyristors.length !== 6) throw new Error(`${label}: expected 6 thyristors`)
  frame.thyristors.forEach((ch, i) => {
    if (!sameKeys(ch, CHANNEL_KEYS)) throw new Error(`${label}: thyristors[${i}] has unexpected keys`)
    if (ch.id !== i + 1) throw new Error(`${label}: thyristors[${i}].id = ${String(ch.id)}`)
    if (!ch.sensor_healthy && ch.status !== 'fault') {
      throw new Error(`${label}: unhealthy thyristors[${i}] has status ${ch.status}`)
    }
    if (!marginConsistent(ch.margin_to_limit, ch.tj_estimated)) {
      throw new Error(`${label}: thyristors[${i}] margin ${ch.margin_to_limit} vs tj ${ch.tj_estimated}`)
    }
  })
  const worst = ORDER[Math.max(...frame.thyristors.map((ch) => ORDER.indexOf(ch.status)))]
  if (frame.overall_status !== worst) {
    throw new Error(`${label}: overall_status ${frame.overall_status}, expected ${String(worst)}`)
  }
}

describe('Frame_Decoder robustness', () => {
  propertyTest(
    14,
    'Decode robustness',
    fc.property(anyInput, ({ input, expect, label }) => {
      // A throw here fails the property with the input as counterexample.
      const result = decodeDriveFrame(input, { logger: silent })
      if (result.ok) {
        if (expect === 'error') throw new Error(`${label}: expected an error result, got ok`)
        checkFrame(result, label)
      } else {
        if (expect === 'ok') {
          throw new Error(`${label}: rejected at ${result.error.path}: ${result.error.message}`)
        }
        if (typeof result.error.path !== 'string' || typeof result.error.message !== 'string') {
          throw new Error(`${label}: malformed error result`)
        }
      }
    }),
  )
})
