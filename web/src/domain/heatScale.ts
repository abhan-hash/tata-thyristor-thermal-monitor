/**
 * Heat_Scale: maps a temperature (°C) to one of nine heat stops (0..8), each
 * backed by a `--heat-N` primitive token. Non-finite input gets the fault
 * treatment instead of a heat colour (Requirements 4.5, 4.6).
 */

export type HeatStop = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type HeatTreatment = { kind: 'heat'; index: HeatStop } | { kind: 'fault' }

export const HEAT_STOP_MIN: HeatStop = 0
export const HEAT_STOP_MAX: HeatStop = 8

/**
 * Lower bound (°C, inclusive) of heat stops 1..8. Anything below the first
 * breakpoint (ambient ≈ 35 °C) is stop 0. Stop 6 starts at the Tj warning
 * threshold (110 °C) and stop 8 at the Tj critical limit (125 °C).
 * Strictly increasing, which makes the mapping monotone.
 */
export const HEAT_BREAKPOINTS_C: readonly number[] = Object.freeze([
  45, 60, 75, 90, 100, 110, 118, 125,
])

/**
 * Heat stop index for a temperature. Always in [0, 8] and non-decreasing in
 * `tempC`: −∞ → 0, +∞ → 8. NaN → 0 (callers should use `heatTreatment`, which
 * maps NaN to the fault treatment).
 */
export function heatStopIndex(tempC: number): HeatStop {
  let index = 0
  for (const bp of HEAT_BREAKPOINTS_C) {
    if (tempC >= bp) index++
    else break
  }
  return index as HeatStop
}

/** CSS custom-property reference for a heat stop; out-of-range input is clamped. */
export function heatToken(index: number): string {
  const n = Number.isFinite(index)
    ? Math.min(HEAT_STOP_MAX, Math.max(HEAT_STOP_MIN, Math.trunc(index)))
    : HEAT_STOP_MIN
  return `var(--heat-${n})`
}

/** Heat stop for finite temperatures; fault treatment for NaN and ±∞. */
export function heatTreatment(tempC: number): HeatTreatment {
  if (!Number.isFinite(tempC)) return { kind: 'fault' }
  return { kind: 'heat', index: heatStopIndex(tempC) }
}
