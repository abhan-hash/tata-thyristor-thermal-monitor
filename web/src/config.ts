/** Seed used by the mock layer when neither `?seed=` nor `VITE_MOCK_SEED` is set. */
export const DEFAULT_MOCK_SEED = 20261121

/** Parses a seed string as a non-negative 32-bit integer; returns undefined when invalid. */
function parseSeed(raw: string | null | undefined): number | undefined {
  if (raw == null) return undefined
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return undefined
  const value = Number(trimmed)
  return Number.isSafeInteger(value) && value <= 0xffffffff ? value : undefined
}

/**
 * Resolves the mock PRNG seed. Precedence: `?seed=` query param, then
 * `VITE_MOCK_SEED`, then DEFAULT_MOCK_SEED. Invalid values are ignored.
 */
export function resolveMockSeed(search: string, envSeed: string | undefined): number {
  return (
    parseSeed(new URLSearchParams(search).get('seed')) ??
    parseSeed(envSeed) ??
    DEFAULT_MOCK_SEED
  )
}

/** The seed for this page load. */
export const mockSeed: number = resolveMockSeed(
  typeof window === 'undefined' ? '' : window.location.search,
  import.meta.env.VITE_MOCK_SEED,
)
