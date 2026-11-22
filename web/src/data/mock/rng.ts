// MOCK DATA – synthetic, not plant telemetry
// Seeded PRNG for the mock layer, so runs are reproducible from a seed.

/** A pseudo-random source returning floats in [0, 1). */
export type Rng = () => number

/**
 * mulberry32: a small, fast 32-bit PRNG. The same seed always yields the same
 * sequence. The seed is coerced to an unsigned 32-bit integer.
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Standard normal sample (mean 0, standard deviation 1) via Box–Muller.
 * Consumes exactly two draws from rng, so call sequences stay deterministic.
 */
export function gaussian(rng: Rng): number {
  const u1 = 1 - rng() // (0, 1], keeps log finite
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}
