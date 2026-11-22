/**
 * Bar-entry spike detection on an armature current series (Requirement 19.2).
 * Shared by the Mill_Cutaway strip pulse and the bar-bite markers on the
 * Drive Detail transient chart, so both mark the same samples.
 *
 * A spike onset is the first sample that rises at least `rise × ratedA` above
 * the running baseline (the minimum of the preceding `lookback` valid
 * samples). After an onset the detector disarms until the current falls back
 * within `reset × ratedA` of either the baseline at onset or the running
 * baseline. The second condition re-arms after a sustained step (e.g. the
 * overload scenario), so a step counts once and the detector never sticks.
 *
 * Measured in fractions of rated current, so the same defaults work for any
 * drive rating. They separate the mock's +40 % bar-entry spike from its 2 %
 * noise at both the 10 Hz sample rate and the 1 Hz display rate.
 */

export interface SpikeOptions {
  /** Rise above baseline that marks an onset, fraction of rated. Default 0.2. */
  rise?: number
  /** Re-arm when within this of the baseline, fraction of rated. Default 0.1. */
  reset?: number
  /** Samples in the running baseline window. Default 10. */
  lookback?: number
}

export const SPIKE_RISE_FRAC = 0.2
export const SPIKE_RESET_FRAC = 0.1
export const SPIKE_LOOKBACK = 10

/**
 * Indices of spike onsets in `currentSeries` (A, oldest first), ascending.
 * Non-finite samples are skipped: never an onset, never part of the baseline.
 * The first valid sample has no baseline and is never an onset.
 */
export function detectSpikeOnsets(
  currentSeries: readonly number[],
  ratedA: number,
  options: SpikeOptions = {},
): number[] {
  if (!Number.isFinite(ratedA) || ratedA <= 0) return []
  const rise = (options.rise ?? SPIKE_RISE_FRAC) * ratedA
  const reset = (options.reset ?? SPIKE_RESET_FRAC) * ratedA
  const lookback = Math.max(1, Math.floor(options.lookback ?? SPIKE_LOOKBACK))

  const onsets: number[] = []
  const window: number[] = []
  let armed = true
  let onsetBase = 0

  for (let i = 0; i < currentSeries.length; i++) {
    const x = currentSeries[i] as number
    if (!Number.isFinite(x)) continue
    if (window.length > 0) {
      const base = Math.min(...window)
      if (armed) {
        if (x - base >= rise) {
          onsets.push(i)
          armed = false
          onsetBase = base
        }
      } else if (x - onsetBase < reset || x - base < reset) {
        armed = true
      }
    }
    window.push(x)
    if (window.length > lookback) window.shift()
  }
  return onsets
}

/**
 * Samples since the most recent onset (0 = the newest sample is an onset),
 * or `Infinity` when the series has no onset.
 */
export function samplesSinceOnset(
  currentSeries: readonly number[],
  ratedA: number,
  options?: SpikeOptions,
): number {
  const onsets = detectSpikeOnsets(currentSeries, ratedA, options)
  const last = onsets[onsets.length - 1]
  return last === undefined ? Infinity : currentSeries.length - 1 - last
}
