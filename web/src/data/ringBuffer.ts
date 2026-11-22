/**
 * Fixed-capacity numeric ring buffer backed by a typed array.
 *
 * The backing array is allocated once in the constructor. `push` never
 * allocates. `toArray` and `window` return a fresh copy unless the caller
 * passes an `out` array, in which case they write into it and return a
 * subarray view of it (no allocation of element storage).
 *
 * `revision` increases by one on every mutation so consumers (chart path
 * builders, selectors) can memoise on it.
 */
export type NumericArray = Float32Array | Float64Array

export type NumericArrayConstructor = Float32ArrayConstructor | Float64ArrayConstructor

export class RingBuffer<A extends NumericArray = Float64Array> {
  readonly capacity: number
  readonly #data: A
  /** Index where the next push is written. */
  #head = 0
  #length = 0
  #revision = 0

  constructor(capacity: number, ArrayType: NumericArrayConstructor = Float64Array) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError(`RingBuffer capacity must be a positive integer, got ${String(capacity)}`)
    }
    this.capacity = capacity
    this.#data = new ArrayType(capacity) as A
  }

  /** Number of stored samples, always ≤ capacity. */
  get length(): number {
    return this.#length
  }

  /** Mutation counter, incremented on every push and clear. */
  get revision(): number {
    return this.#revision
  }

  /** The backing typed array. Its identity never changes. Read-only by convention. */
  get backing(): A {
    return this.#data
  }

  /** Appends a value, overwriting the oldest one once full. */
  push(value: number): void {
    this.#data[this.#head] = value
    this.#head = this.#head + 1 === this.capacity ? 0 : this.#head + 1
    if (this.#length < this.capacity) this.#length += 1
    this.#revision += 1
  }

  /** Element `i` in push order (0 = oldest), or undefined when out of range. */
  at(i: number): number | undefined {
    if (!Number.isInteger(i) || i < 0 || i >= this.#length) return undefined
    return this.#data[(this.#start() + i) % this.capacity]
  }

  /** Most recently pushed value, or undefined when empty. */
  last(): number | undefined {
    return this.at(this.#length - 1)
  }

  /** All samples in push order (oldest first). */
  toArray(out?: A): A {
    return this.window(this.#length, out)
  }

  /** The most recent `n` samples in push order (oldest first). `n` is clamped to [0, length]. */
  window(n: number, out?: A): A {
    const count = Math.max(0, Math.min(this.#length, Math.floor(Number.isFinite(n) ? n : this.#length)))
    const target = this.#target(count, out)
    // Newest sample sits just before head; the window starts `count` back from it.
    let src = (this.#head - count + this.capacity) % this.capacity
    for (let i = 0; i < count; i += 1) {
      target[i] = this.#data[src] ?? 0
      src = src + 1 === this.capacity ? 0 : src + 1
    }
    return target
  }

  /** Empties the buffer without releasing the backing array. */
  clear(): void {
    this.#head = 0
    this.#length = 0
    this.#revision += 1
  }

  #start(): number {
    return (this.#head - this.#length + this.capacity) % this.capacity
  }

  #target(count: number, out: A | undefined): A {
    if (out === undefined) {
      return new (this.#data.constructor as NumericArrayConstructor)(count) as A
    }
    if (out.length < count) {
      throw new RangeError(`RingBuffer out array too small: need ${String(count)}, got ${String(out.length)}`)
    }
    return out.subarray(0, count) as A
  }
}
