import { describe, expect, it } from 'vitest'
import { RingBuffer } from '../../src/data/ringBuffer'

const list = (a: ArrayLike<number>): number[] => Array.from(a)

describe('RingBuffer', () => {
  it('rejects non-positive or fractional capacity', () => {
    expect(() => new RingBuffer(0)).toThrow(RangeError)
    expect(() => new RingBuffer(-1)).toThrow(RangeError)
    expect(() => new RingBuffer(2.5)).toThrow(RangeError)
  })

  it('starts empty', () => {
    const rb = new RingBuffer(3)
    expect(rb.length).toBe(0)
    expect(rb.revision).toBe(0)
    expect(list(rb.toArray())).toEqual([])
    expect(rb.last()).toBeUndefined()
    expect(rb.at(0)).toBeUndefined()
  })

  it('keeps push order before reaching capacity', () => {
    const rb = new RingBuffer(4)
    rb.push(1)
    rb.push(2)
    expect(rb.length).toBe(2)
    expect(list(rb.toArray())).toEqual([1, 2])
    expect(rb.at(0)).toBe(1)
    expect(rb.last()).toBe(2)
  })

  it('holds only the last `capacity` pushes after wrapping', () => {
    const rb = new RingBuffer(3)
    for (const v of [1, 2, 3, 4, 5]) rb.push(v)
    expect(rb.length).toBe(3)
    expect(list(rb.toArray())).toEqual([3, 4, 5])
    expect(rb.at(0)).toBe(3)
    expect(rb.at(2)).toBe(5)
    expect(rb.at(3)).toBeUndefined()
    expect(rb.last()).toBe(5)
  })

  it('returns the most recent n samples from window(n), clamped', () => {
    const rb = new RingBuffer(5)
    for (const v of [1, 2, 3, 4, 5, 6, 7]) rb.push(v)
    expect(list(rb.window(2))).toEqual([6, 7])
    expect(list(rb.window(0))).toEqual([])
    expect(list(rb.window(-3))).toEqual([])
    expect(list(rb.window(99))).toEqual([3, 4, 5, 6, 7])
    expect(list(rb.window(Number.POSITIVE_INFINITY))).toEqual([3, 4, 5, 6, 7])
  })

  it('increments revision on every push and clear', () => {
    const rb = new RingBuffer(2)
    rb.push(1)
    rb.push(2)
    rb.push(3)
    expect(rb.revision).toBe(3)
    rb.clear()
    expect(rb.revision).toBe(4)
    expect(rb.length).toBe(0)
    rb.push(9)
    expect(list(rb.toArray())).toEqual([9])
  })

  it('never replaces the backing array', () => {
    const rb = new RingBuffer(3, Float32Array)
    const backing = rb.backing
    expect(backing).toBeInstanceOf(Float32Array)
    for (let i = 0; i < 10; i += 1) rb.push(i)
    rb.clear()
    expect(rb.backing).toBe(backing)
  })

  it('copies with the same typed-array type and does not alias the backing array', () => {
    const rb = new RingBuffer(3, Float32Array)
    rb.push(1.5)
    const copy = rb.toArray()
    expect(copy).toBeInstanceOf(Float32Array)
    expect(copy.buffer).not.toBe(rb.backing.buffer)
    expect(new RingBuffer(2).toArray()).toBeInstanceOf(Float64Array)
  })

  it('writes into a caller-provided out array without allocating storage', () => {
    const rb = new RingBuffer(4)
    for (const v of [1, 2, 3, 4, 5]) rb.push(v)
    const out = new Float64Array(4)
    const view = rb.window(3, out)
    expect(view.buffer).toBe(out.buffer)
    expect(list(view)).toEqual([3, 4, 5])
    expect(() => rb.toArray(new Float64Array(2))).toThrow(RangeError)
  })
})
