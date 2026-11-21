/**
 * Deterministic sample traces for the kit gallery's chart specimens.
 * Illustrative shapes only, not plant telemetry and not the mock simulator.
 */

/**
 * A Tj-like trace: a slow rise toward `base + rise`, a ripple and periodic
 * bar-entry bumps. `n` samples, oldest first.
 */
export function sampleTrace(n: number, base: number, rise: number, phase = 0): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1)
    const settle = rise * (1 - Math.exp(-3 * t))
    const ripple = 0.6 * Math.sin(i * 0.45 + phase)
    const d = ((i + phase * 7) % 40) - 20
    const bump = 3.2 * Math.exp(-(d * d) / 18)
    out[i] = base + settle + ripple + bump
  }
  return out
}

/** Copy of `series` with a gap of non-finite samples in `[from, to)`. */
export function withGap(series: Float32Array, from: number, to: number): Float32Array {
  const out = series.slice()
  for (let i = from; i < Math.min(to, out.length); i++) out[i] = Number.NaN
  return out
}
