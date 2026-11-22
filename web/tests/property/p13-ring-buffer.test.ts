import fc from 'fast-check'
import { describe } from 'vitest'
import { RingBuffer, type NumericArrayConstructor } from '../../src/data/ringBuffer'
import { propertyTest } from './runner'

/**
 * Property 13: Ring buffer bounds.
 * For any push sequence, the buffer length is ≤ capacity, the elements are the
 * most recent ones in order, and memory does not grow after reaching capacity.
 *
 * **Validates: Requirements 11.2**
 */

const arrayTypes: readonly { name: string; Type: NumericArrayConstructor; store: (v: number) => number }[] = [
  { name: 'Float64Array', Type: Float64Array, store: (v) => v },
  { name: 'Float32Array', Type: Float32Array, store: (v) => Math.fround(v) },
]

/** Capacity plus a push sequence that is sometimes shorter and sometimes several times longer. */
const scenario = fc.integer({ min: 1, max: 64 }).chain((capacity) =>
  fc.record({
    capacity: fc.constant(capacity),
    values: fc.array(fc.double(), { maxLength: capacity * 4 }),
    windowN: fc.integer({ min: -2, max: capacity + 2 }),
  }),
)

function sameValues(actual: ArrayLike<number>, expected: readonly number[]): boolean {
  if (actual.length !== expected.length) return false
  for (let i = 0; i < expected.length; i += 1) {
    if (!Object.is(actual[i], expected[i])) return false
  }
  return true
}

describe('Ring buffer bounds', () => {
  for (const { name, Type, store } of arrayTypes) {
    propertyTest(
      13,
      `Ring buffer bounds (${name})`,
      fc.property(scenario, ({ capacity, values, windowN }) => {
        const buf = new RingBuffer(capacity, Type)
        const backingAtStart = buf.backing
        let backingAtCapacity: typeof backingAtStart | undefined

        values.forEach((v, i) => {
          buf.push(v)
          if (buf.length > capacity) throw new Error(`length ${String(buf.length)} > capacity ${String(capacity)}`)
          if (buf.length !== Math.min(i + 1, capacity)) throw new Error(`length ${String(buf.length)} after ${String(i + 1)} pushes`)
          if (buf.length === capacity && backingAtCapacity === undefined) backingAtCapacity = buf.backing
        })

        // Backing storage never reallocates or grows.
        if (buf.backing !== backingAtStart) return false
        if (backingAtCapacity !== undefined && backingAtCapacity !== backingAtStart) return false
        if (buf.backing.length !== capacity) return false

        // Contents are the last `capacity` pushes, oldest first.
        const expected = values.slice(-capacity).map(store)
        if (buf.length !== expected.length) return false
        if (!sameValues(buf.toArray(), expected)) return false
        if (buf.revision !== values.length) return false

        // window(n) returns the most recent min(max(n, 0), length) samples in order.
        const count = Math.max(0, Math.min(windowN, expected.length))
        const expectedWindow = count === 0 ? [] : expected.slice(-count)
        return sameValues(buf.window(windowN), expectedWindow)
      }),
    )
  }
})
