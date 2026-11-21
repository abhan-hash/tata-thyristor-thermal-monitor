// Source_Factory (Requirement 8.3). Seed precedence itself is covered by config.test.ts.
import { describe, expect, it } from 'vitest'
import { createHistoryRepository, createTelemetrySource, resolveDataSourceKind } from '../../src/data/createSource'
import { MockHistoryRepository } from '../../src/data/mock/MockHistoryRepository'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'

describe('Source_Factory', () => {
  it.each([
    ['unset', {}],
    ['blank', { VITE_DATA_SOURCE: '  ' }],
    ['mock', { VITE_DATA_SOURCE: 'mock' }],
  ])('returns the mocks when VITE_DATA_SOURCE is %s', (_label, env) => {
    expect(resolveDataSourceKind(env)).toBe('mock')
    const source = createTelemetrySource(env, { search: '' })
    expect(source).toBeInstanceOf(MockTelemetrySource)
    expect(source.kind).toBe('mock')
    expect(createHistoryRepository(env, { search: '' })).toBeInstanceOf(MockHistoryRepository)
  })

  it('throws a not-implemented error for ws', () => {
    const env = { VITE_DATA_SOURCE: 'ws' }
    expect(resolveDataSourceKind(env)).toBe('ws')
    expect(() => createTelemetrySource(env)).toThrow(/not implemented in this phase/)
    expect(() => createHistoryRepository(env)).toThrow(/not implemented in this phase/)
  })

  it('rejects unknown values instead of falling back to the mock', () => {
    expect(() => createTelemetrySource({ VITE_DATA_SOURCE: 'mok' })).toThrow(/Unknown VITE_DATA_SOURCE "mok"/)
  })

  it('passes the resolved seed to the mocks', () => {
    const repo = createHistoryRepository({ VITE_MOCK_SEED: '5' }, { search: '?seed=77' })
    if (!(repo instanceof MockHistoryRepository)) throw new Error('expected the mock repository')
    const expected = new MockHistoryRepository({ seed: 77 })
    const draws = Array.from({ length: 20 }, () => repo.nextLatencyMs())
    expect(draws).toEqual(Array.from({ length: 20 }, () => expected.nextLatencyMs()))
  })
})
