// MOCK DATA – synthetic, not plant telemetry
// 30 days of daily peak Tj per channel (Requirement 10.8). Values come from a
// fixed seed; the day labels are anchored to the module-load instant so the
// Trends page always shows the last 30 days.
import type { ChannelId } from '../../../domain/types'
import { gaussian, mulberry32 } from '../rng'

/** Seed shared by every history fixture. */
export const FIXTURE_SEED = 0x7a7a0404

/** Wall-clock anchor of the fixtures, ms since the Unix epoch, captured at module load. */
export const FIXTURE_NOW_MS = Date.now()

/** Number of days of daily peaks held per channel. */
export const HISTORY_DAYS = 30

export const CHANNELS: readonly ChannelId[] = [1, 2, 3, 4, 5, 6]

const DAY_MS = 86_400_000

export interface DailyPeak {
  channel: ChannelId
  /** UTC calendar day, `YYYY-MM-DD`. */
  day: string
  /** °C */
  peak_tj: number
}

/** UTC `YYYY-MM-DD` for an epoch-ms instant. */
export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Daily peaks for the `HISTORY_DAYS` days ending on the UTC day of `nowMs`,
 * ordered by day ascending, then channel ascending. Peaks sit between about
 * 90 °C and 125 °C: a per-channel offset, a slow drift, day noise and an
 * occasional hot day.
 */
export function generateDailyPeaks(seed: number, nowMs: number): DailyPeak[] {
  const rng = mulberry32(seed)
  const offsets = CHANNELS.map(() => (rng() - 0.5) * 6)
  const todayStart = Math.floor(nowMs / DAY_MS) * DAY_MS
  const out: DailyPeak[] = []
  for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
    const day = utcDay(todayStart - d * DAY_MS)
    const drift = 2.5 * Math.sin(((HISTORY_DAYS - d) / HISTORY_DAYS) * Math.PI * 2)
    CHANNELS.forEach((channel, i) => {
      const hot = rng() < 0.08 ? 8 + rng() * 6 : 0
      const raw = 100 + (offsets[i] ?? 0) + drift + gaussian(rng) * 2.5 + hot
      const peak_tj = Math.round(Math.min(125, Math.max(88, raw)) * 10) / 10
      out.push({ channel, day, peak_tj })
    })
  }
  return out
}

/** Daily peaks generated at module load from `FIXTURE_SEED`. */
export const MOCK_DAILY_PEAKS: readonly DailyPeak[] = Object.freeze(generateDailyPeaks(FIXTURE_SEED, FIXTURE_NOW_MS))
