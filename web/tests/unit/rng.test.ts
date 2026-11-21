import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { gaussian, mulberry32 } from '../../src/data/mock/rng'

const take = (rng: () => number, n: number) => Array.from({ length: n }, rng)

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    expect(take(mulberry32(1337), 50)).toEqual(take(mulberry32(1337), 50))
  })

  it('produces different sequences for different seeds', () => {
    expect(take(mulberry32(1), 10)).not.toEqual(take(mulberry32(2), 10))
  })

  it('matches the reference mulberry32 output for seed 0', () => {
    // Reference values from the canonical mulberry32 implementation.
    expect(take(mulberry32(0), 3)).toEqual([0.26642920868471265, 0.0003297457005828619, 0.2232720274478197])
  })

  it('returns values in [0, 1)', () => {
    for (const v of take(mulberry32(42), 10_000)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('gaussian', () => {
  it('is deterministic for a seeded rng', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    expect(take(() => gaussian(a), 20)).toEqual(take(() => gaussian(b), 20))
  })

  it('has roughly zero mean and unit variance', () => {
    const rng = mulberry32(2026)
    const xs = take(() => gaussian(rng), 20_000)
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length
    const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length
    expect(Math.abs(mean)).toBeLessThan(0.05)
    expect(Math.abs(variance - 1)).toBeLessThan(0.05)
    expect(xs.every(Number.isFinite)).toBe(true)
  })

  it('stays finite when the rng returns 0', () => {
    expect(Number.isFinite(gaussian(() => 0))).toBe(true)
  })
})

describe('rng.ts provenance', () => {
  it('starts with the MOCK header', () => {
    // Vitest runs from web/; jsdom's import.meta.url is not a file: URL.
    const path = resolve(process.cwd(), 'src/data/mock/rng.ts')
    expect(readFileSync(path, 'utf8').split('\n')[0]).toBe('// MOCK DATA – synthetic, not plant telemetry')
  })
})
