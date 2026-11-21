import { HEAT_BREAKPOINTS_C, HEAT_STOP_MAX, heatStopIndex, heatToken } from '../../domain/heatScale'

/**
 * Continuous companions to the stepped Heat_Scale, for visuals that tween
 * between stops (Design: "fills interpolate in heat-scale space over 300 ms").
 * Every colour is still a mix of two `--heat-N` tokens, so the ramp stays
 * defined in one place.
 */

/** Temperature (°C) at heat position 0: ambient, one step below the first breakpoint. */
export const HEAT_POSITION_FLOOR_C = 35

const ANCHORS_C: readonly number[] = [HEAT_POSITION_FLOOR_C, ...HEAT_BREAKPOINTS_C]

/**
 * Position on the heat ramp in [0, 8], piecewise linear between breakpoints.
 * Non-decreasing in `tempC`, and `floor(heatPosition(t)) === heatStopIndex(t)`
 * for finite t, so the continuous and stepped scales never disagree.
 * NaN maps to 0; callers check `heatTreatment` for the fault case first.
 */
export function heatPosition(tempC: number): number {
  if (Number.isNaN(tempC)) return 0
  const index = heatStopIndex(tempC)
  if (index >= HEAT_STOP_MAX) return HEAT_STOP_MAX
  const lo = ANCHORS_C[index] as number
  const hi = ANCHORS_C[index + 1] as number
  // Below the floor (index 0, tempC < 35) clamps to 0.
  const frac = Math.min(1, Math.max(0, (tempC - lo) / (hi - lo)))
  return index + frac
}

/** Clamp a heat position into [0, 8]; NaN → 0. */
export function clampHeatPosition(pos: number): number {
  if (Number.isNaN(pos)) return 0
  return Math.min(HEAT_STOP_MAX, Math.max(0, pos))
}

/**
 * CSS colour for a continuous heat position: a `color-mix` of the two
 * neighbouring heat tokens, or a single token on an exact stop.
 */
export function heatMix(pos: number): string {
  const p = clampHeatPosition(pos)
  const lo = Math.floor(p)
  const frac = p - lo
  if (frac < 0.005) return heatToken(lo)
  if (frac > 0.995) return heatToken(lo + 1)
  const pct = Math.round((1 - frac) * 100)
  return `color-mix(in srgb, ${heatToken(lo)} ${pct}%, ${heatToken(lo + 1)})`
}
