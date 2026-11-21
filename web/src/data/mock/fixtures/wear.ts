// MOCK DATA – synthetic, not plant telemetry
// Per-channel wear records with p10/p50/p90 consumed-life projections (Requirement 10.8).
import type { WearRecord } from '../../../domain/types'
import { gaussian, mulberry32 } from '../rng'
import { CHANNELS, FIXTURE_SEED } from './history'

/** Projection horizon, days from today. */
export const PROJECTION_DAYS = 365
/** Spacing of projection points, days. */
export const PROJECTION_STEP_DAYS = 30

/** Consumed life per day at a wear rate of 1.0 (baseline), percentage points. */
const BASELINE_PCT_PER_DAY = 0.02

/**
 * One wear record per channel. Channel 4 always runs above the 2× baseline
 * advisory line so the advisory state is visible in the demo. Projections start
 * at day 0 with p10 = p50 = p90 = consumed life, then widen with √day, and are
 * clamped to 100 % with p10 ≤ p50 ≤ p90 at every point.
 */
export function generateWear(seed: number): WearRecord[] {
  const rng = mulberry32(seed ^ 0x5eed_0003)
  return CHANNELS.map((channel) => {
    const consumed = Math.round((18 + rng() * 22) * 10) / 10
    const rate = channel === 4 ? 2.2 + rng() * 0.3 : 0.8 + rng() * 0.9
    const wear_rate_vs_baseline = Math.round(rate * 100) / 100
    const projection: WearRecord['projection'] = []
    for (let day = 0; day <= PROJECTION_DAYS; day += PROJECTION_STEP_DAYS) {
      const p50 = consumed + rate * BASELINE_PCT_PER_DAY * day
      const spread = 0.35 * Math.sqrt(day) * (1 + Math.abs(gaussian(rng)) * 0.1)
      const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 100) / 100
      projection.push({ day, p10: clamp(p50 - spread), p50: clamp(p50), p90: clamp(p50 + spread) })
    }
    return {
      channel,
      consumed_life_pct: consumed,
      wear_rate_vs_baseline,
      cycles_above_100C: Math.round(800 + rate * 600 + rng() * 400),
      high_swing_cycles: Math.round(150 + rate * 120 + rng() * 80),
      projection,
    }
  })
}

/** Wear records generated at module load from `FIXTURE_SEED`. */
export const MOCK_WEAR: readonly WearRecord[] = Object.freeze(generateWear(FIXTURE_SEED))
