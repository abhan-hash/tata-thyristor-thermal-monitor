/**
 * Chart series preparation (Requirement 40.5): cut a ring buffer to the
 * visible window, then reduce it to at most `MAX_CHART_POINTS` points with a
 * min/max downsample, so a chart path never holds more than 600 points.
 *
 * Everything here is pure. `windowSeries` memoises on the buffers' revisions,
 * so repeated reads of an unchanged buffer return the same object.
 */
import type { NumericArray, RingBuffer } from '../data/ringBuffer'
import { detectSpikeOnsets, SPIKE_LOOKBACK, type SpikeOptions } from '../domain/spikes'

/** Upper bound on points in any chart path. */
export const MAX_CHART_POINTS = 600

/** A value series with its frame timestamps (epoch ms), index-aligned, oldest first. */
export interface SeriesBuffer {
  readonly time: RingBuffer<NumericArray>
  readonly values: RingBuffer<NumericArray>
}

/** The trailing `windowS` seconds of a series. */
export interface WindowedSeries {
  /** Epoch ms, oldest first. */
  readonly t: Float64Array
  readonly v: Float64Array
  /** Sum of the time and value buffer revisions the window was cut at. */
  readonly revision: number
}

/** Chart points: `x` in seconds relative to the newest sample (≤ 0), `y` in series units. NaN `y` is a gap. */
export interface ChartPoints {
  readonly x: Float64Array
  readonly y: Float64Array
}

interface WindowCacheEntry {
  timeRevision: number
  valueRevision: number
  windowS: number
  result: WindowedSeries
}

const windowCache = new WeakMap<RingBuffer<NumericArray>, WindowCacheEntry>()

/** Number of trailing timestamps within `windowMs` of the newest one. */
function trailingCount(time: RingBuffer<NumericArray>, windowMs: number): number {
  const n = time.length
  if (n === 0) return 0
  if (!Number.isFinite(windowMs)) return n
  const cutoff = (time.at(n - 1) ?? 0) - windowMs
  let count = 0
  for (let i = n - 1; i >= 0; i--) {
    const t = time.at(i)
    if (t === undefined || t < cutoff) break
    count++
  }
  return count
}

/**
 * The samples of `buffer` whose timestamps lie within `windowS` seconds of
 * the newest one. Memoised per value buffer on both revisions and `windowS`.
 */
export function windowSeries(buffer: SeriesBuffer, windowS: number): WindowedSeries {
  const { time, values } = buffer
  const cached = windowCache.get(values)
  if (
    cached?.timeRevision === time.revision &&
    cached.valueRevision === values.revision &&
    cached.windowS === windowS
  ) {
    return cached.result
  }
  const count = Math.min(trailingCount(time, windowS * 1000), values.length)
  const result: WindowedSeries = {
    t: Float64Array.from(time.window(count)),
    v: Float64Array.from(values.window(count)),
    revision: time.revision + values.revision,
  }
  windowCache.set(values, { timeRevision: time.revision, valueRevision: values.revision, windowS, result })
  return result
}

/**
 * Min/max downsample of `(t, v)` to at most `maxPoints` points, as seconds
 * relative to `t`'s newest sample. Each of `⌊maxPoints / 2⌋` equal-count
 * buckets keeps its minimum and maximum in time order, so spikes survive.
 * A bucket with a non-finite sample also emits a NaN point, so sensor gaps
 * stay visible. Series at or under the budget pass through unchanged.
 */
export function downsample(
  t: ArrayLike<number>,
  v: ArrayLike<number>,
  maxPoints: number = MAX_CHART_POINTS,
): ChartPoints {
  const n = Math.min(t.length, v.length)
  const budget = Math.max(2, Math.floor(maxPoints))
  const newest = n > 0 ? (t[n - 1] ?? 0) : 0
  const sec = (i: number) => ((t[i] ?? newest) - newest) / 1000

  if (n <= budget) {
    const x = new Float64Array(n)
    const y = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      x[i] = sec(i)
      y[i] = v[i] ?? Number.NaN
    }
    return { x, y }
  }

  const buckets = Math.floor(budget / 2)
  const x = new Float64Array(buckets * 2)
  const y = new Float64Array(buckets * 2)
  let out = 0
  const emit = (i: number, value: number) => {
    x[out] = sec(i)
    y[out] = value
    out++
  }

  for (let b = 0; b < buckets; b++) {
    const start = Math.floor((b * n) / buckets)
    const end = Math.floor(((b + 1) * n) / buckets)
    let minI = -1
    let maxI = -1
    let gapI = -1
    for (let i = start; i < end; i++) {
      const value = v[i] ?? Number.NaN
      if (!Number.isFinite(value)) {
        if (gapI < 0) gapI = i
        continue
      }
      if (minI < 0 || value < (v[minI] ?? 0)) minI = i
      if (maxI < 0 || value > (v[maxI] ?? 0)) maxI = i
    }
    if (minI < 0) {
      emit(start, Number.NaN)
      continue
    }
    const first = Math.min(minI, maxI)
    const second = Math.max(minI, maxI)
    emit(first, v[first] ?? Number.NaN)
    if (gapI >= 0) emit(gapI, Number.NaN)
    else if (second !== first) emit(second, v[second] ?? Number.NaN)
  }
  return { x: x.subarray(0, out), y: y.subarray(0, out) }
}

/** Baseline window for the spike detector: about 1 s of samples at the series' own rate. */
export function spikeLookback(t: ArrayLike<number>): number {
  const n = t.length
  if (n < 2) return SPIKE_LOOKBACK
  const spanMs = (t[n - 1] ?? 0) - (t[0] ?? 0)
  const dtMs = spanMs / (n - 1)
  if (!(dtMs > 0)) return SPIKE_LOOKBACK
  return Math.min(50, Math.max(1, Math.round(1000 / dtMs)))
}

/**
 * Bar-bite times: spike onsets in an armature current window, as seconds
 * relative to the newest sample. Detection runs on the raw window (not the
 * downsampled path), with a 1 s baseline sized from the sample rate, so at
 * 10 Hz each 2.4 s bar-entry spike yields one onset.
 */
export function spikeOnsetTimes(
  t: ArrayLike<number>,
  current: ArrayLike<number>,
  ratedA: number,
  options: SpikeOptions = {},
): number[] {
  const n = Math.min(t.length, current.length)
  if (n === 0) return []
  const newest = t[n - 1] ?? 0
  const series = Array.from({ length: n }, (_, i) => current[i] ?? Number.NaN)
  const onsets = detectSpikeOnsets(series, ratedA, { lookback: spikeLookback(t), ...options })
  return onsets.map((i) => ((t[i] ?? newest) - newest) / 1000)
}
