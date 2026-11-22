import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NUM_RUNS,
  propertyTest,
  propertyTestName,
  resolveNumRuns,
  resolveSeed,
} from '../property/runner.ts'

describe('property runner', () => {
  it('defaults to 200 runs', () => {
    expect(DEFAULT_NUM_RUNS).toBe(200)
    expect(resolveNumRuns({})).toBe(200)
    expect(resolveNumRuns({ FC_NUM_RUNS: '' })).toBe(200)
  })

  it('reads FC_NUM_RUNS', () => {
    expect(resolveNumRuns({ FC_NUM_RUNS: '2000' })).toBe(2000)
  })

  it('rejects invalid FC_NUM_RUNS', () => {
    expect(() => resolveNumRuns({ FC_NUM_RUNS: '0' })).toThrow()
    expect(() => resolveNumRuns({ FC_NUM_RUNS: 'abc' })).toThrow()
    expect(() => resolveNumRuns({ FC_NUM_RUNS: '1.5' })).toThrow()
  })

  it('replays FC_SEED and otherwise yields a 32-bit integer', () => {
    expect(resolveSeed({ FC_SEED: '-12345' })).toBe(-12345)
    const s = resolveSeed({})
    expect(Number.isInteger(s)).toBe(true)
    expect(s | 0).toBe(s)
    expect(() => resolveSeed({ FC_SEED: 'x' })).toThrow()
  })

  it('formats the property test name', () => {
    expect(propertyTestName(3, 'Status is monotone')).toBe(
      'Feature: thermosense-frontend-redesign, Property 3: Status is monotone',
    )
  })

  it('exposes jest-dom matchers in jsdom', () => {
    document.body.innerHTML = '<p>hello</p>'
    expect(document.querySelector('p')).toBeInTheDocument()
  })
})

// Runner smoke test: registers and executes a trivial property through the shared runner.
propertyTest(0, 'runner smoke test', fc.property(fc.integer(), (x) => x + 0 === x))
