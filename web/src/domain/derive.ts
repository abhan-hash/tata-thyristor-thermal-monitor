import { DEFAULT_THRESHOLDS } from './thresholds'
import type { ChannelId, DriveFrame, ThyristorFrame } from './types'

/**
 * Derived values computed from a DriveFrame. Pure functions, no allocation
 * beyond locals. A channel counts only when its sensor is healthy and its Tj
 * is finite, so one bad RTD never skews an aggregate (Requirement 21.2).
 */

/** Window used by `timeToWarning` for the linear fit, in seconds. */
export const TIME_TO_WARNING_WINDOW_S = 10

function usable(ch: ThyristorFrame): boolean {
  return ch.sensor_healthy && Number.isFinite(ch.tj_estimated)
}

function channel(frame: DriveFrame, id: ChannelId): ThyristorFrame | undefined {
  return frame.thyristors.find((ch) => ch.id === id)
}

/** Hottest_Tj: the maximum Tj over healthy channels, NaN when none is healthy. */
export function hottestTj(frame: DriveFrame): number {
  let hottest = Number.NaN
  for (const ch of frame.thyristors) {
    if (!usable(ch)) continue
    if (Number.isNaN(hottest) || ch.tj_estimated > hottest) hottest = ch.tj_estimated
  }
  return hottest
}

/** Mean Tj over healthy channels, NaN when none is healthy. */
export function channelMean(frame: DriveFrame): number {
  let sum = 0
  let count = 0
  for (const ch of frame.thyristors) {
    if (!usable(ch)) continue
    sum += ch.tj_estimated
    count += 1
  }
  return count === 0 ? Number.NaN : sum / count
}

/**
 * Signed difference (K) between channel `id`'s Tj and the healthy-channel mean.
 * NaN when that channel is unhealthy or no mean exists.
 */
export function deltaFromMean(frame: DriveFrame, id: ChannelId): number {
  const ch = channel(frame, id)
  if (ch === undefined || !usable(ch)) return Number.NaN
  return ch.tj_estimated - channelMean(frame)
}

/**
 * Margin (K) from channel `id`'s Tj to the trip limit (default 125 °C).
 * Negative once past the trip. NaN when the channel is unhealthy.
 */
export function marginToTrip(
  frame: DriveFrame,
  id: ChannelId,
  trip: number = DEFAULT_THRESHOLDS.junction_temp.critical,
): number {
  const ch = channel(frame, id)
  if (ch === undefined || !usable(ch)) return Number.NaN
  return trip - ch.tj_estimated
}

/** A time series as parallel arrays: `t` in epoch milliseconds (ascending), `v` the values. */
export interface TimeSeries {
  t: ArrayLike<number>
  v: ArrayLike<number>
}

/**
 * Seconds until the series reaches `warning`, by least-squares linear
 * extrapolation over the last 10 s ending at the newest sample.
 *
 * - `0` when the newest value is already at or above `warning`.
 * - `null` when the series is not rising (slope ≤ 0), has fewer than two
 *   finite samples in the window, or the newest sample is not finite.
 */
export function timeToWarning(series: TimeSeries, warning: number): number | null {
  const n = Math.min(series.t.length, series.v.length)
  if (n === 0) return null
  const tEnd = series.t[n - 1] ?? Number.NaN
  const vEnd = series.v[n - 1] ?? Number.NaN
  if (!Number.isFinite(tEnd) || !Number.isFinite(vEnd)) return null
  if (vEnd >= warning) return 0

  const tStart = tEnd - TIME_TO_WARNING_WINDOW_S * 1000
  // Fit in seconds relative to the newest sample to keep the sums well conditioned.
  let count = 0
  let sx = 0
  let sy = 0
  let sxx = 0
  let sxy = 0
  for (let i = n - 1; i >= 0; i -= 1) {
    const t = series.t[i] ?? Number.NaN
    if (t < tStart) break
    const v = series.v[i] ?? Number.NaN
    if (!Number.isFinite(t) || !Number.isFinite(v)) continue
    const x = (t - tEnd) / 1000
    count += 1
    sx += x
    sy += v
    sxx += x * x
    sxy += x * v
  }
  if (count < 2) return null
  const denom = count * sxx - sx * sx
  if (denom <= 0) return null
  const slope = (count * sxy - sx * sy) / denom // value units per second
  if (!(slope > 0)) return null
  return (warning - vEnd) / slope
}
