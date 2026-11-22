// Source_Factory (Requirement 8.3). Selects the TelemetrySource and
// HistoryRepository implementations from `VITE_DATA_SOURCE`. `mock` or unset
// returns the seeded mocks; `ws` is reserved for the backend adapter and is not
// implemented in this phase.
import { resolveMockSeed } from '../config'
import { MockHistoryRepository } from './mock/MockHistoryRepository'
import { MockTelemetrySource } from './mock/MockTelemetrySource'
import type { HistoryRepository, TelemetrySource } from './ports'

/** The subset of `import.meta.env` the factory reads. */
export interface SourceEnv {
  readonly VITE_DATA_SOURCE?: string
  readonly VITE_MOCK_SEED?: string
}

export interface SourceFactoryOptions {
  /** URL query string used for `?seed=`. Defaults to `window.location.search` in a browser, else `''`. */
  readonly search?: string
}

export type DataSourceKind = TelemetrySource['kind']

/**
 * Resolves the data-source kind. Unset or blank means `mock`. Any value other
 * than `mock` or `ws` throws, so a typo cannot silently fall back to synthetic data.
 */
export function resolveDataSourceKind(env: SourceEnv): DataSourceKind {
  const raw = env.VITE_DATA_SOURCE?.trim() ?? ''
  if (raw === '' || raw === 'mock') return 'mock'
  if (raw === 'ws') return 'ws'
  throw new Error(`Unknown VITE_DATA_SOURCE "${raw}". Expected "mock" or "ws".`)
}

function notImplemented(what: string): Error {
  return new Error(`VITE_DATA_SOURCE "ws": the WebSocket ${what} is not implemented in this phase. Use "mock" or leave it unset.`)
}

function seedFor(env: SourceEnv, options: SourceFactoryOptions): number {
  const search = options.search ?? (typeof window === 'undefined' ? '' : window.location.search)
  return resolveMockSeed(search, env.VITE_MOCK_SEED)
}

/** Returns the live telemetry source selected by `env`. */
export function createTelemetrySource(env: SourceEnv, options: SourceFactoryOptions = {}): TelemetrySource {
  if (resolveDataSourceKind(env) === 'ws') throw notImplemented('telemetry source')
  return new MockTelemetrySource({ seed: seedFor(env, options) })
}

/** Returns the history repository selected by `env`. */
export function createHistoryRepository(env: SourceEnv, options: SourceFactoryOptions = {}): HistoryRepository {
  if (resolveDataSourceKind(env) === 'ws') throw notImplemented('history repository')
  return new MockHistoryRepository({ seed: seedFor(env, options) })
}
