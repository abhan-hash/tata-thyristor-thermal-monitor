import { describe, expect, it } from 'vitest'
import { DEFAULT_MOCK_SEED, resolveMockSeed } from '../../src/config'

describe('resolveMockSeed', () => {
  it('prefers the ?seed= query param over the env value', () => {
    expect(resolveMockSeed('?seed=42', '7')).toBe(42)
  })

  it('falls back to VITE_MOCK_SEED when the query has no seed', () => {
    expect(resolveMockSeed('?ch=T3', '7')).toBe(7)
  })

  it('falls back to the default when neither is set', () => {
    expect(resolveMockSeed('', undefined)).toBe(DEFAULT_MOCK_SEED)
  })

  it('ignores invalid seeds', () => {
    expect(resolveMockSeed('?seed=abc', '-3')).toBe(DEFAULT_MOCK_SEED)
    expect(resolveMockSeed('?seed=1.5', '4294967296')).toBe(DEFAULT_MOCK_SEED)
    expect(resolveMockSeed('?seed=', ' 9 ')).toBe(9)
  })
})
