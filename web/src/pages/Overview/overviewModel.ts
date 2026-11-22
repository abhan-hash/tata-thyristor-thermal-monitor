import { channelMean, marginToTrip } from '../../domain/derive'
import { formatValue, MINUS_SIGN, PLACEHOLDER, TEMP_C_SPEC } from '../../domain/format'
import type { ChannelId, DriveFrame, Status } from '../../domain/types'

/**
 * Pure view models for the Overview second panel (Requirements 24.7, 24.8).
 * Values are pre-formatted, so the equality check re-renders the rack list
 * only when a visible figure or status changes.
 */

export const CHANNEL_IDS: readonly ChannelId[] = [1, 2, 3, 4, 5, 6]

/** Delta at which the signed bar reaches the end of its half-track, K. */
export const DELTA_FULL_SCALE_K = 10

export interface RackRowModel {
  readonly id: ChannelId
  /** Tj at 0.1 °C without the unit, e.g. "98.4"; "— —" before data or on a sensor fault. */
  readonly tj: string
  /** Signed delta from the healthy-channel mean at 0.1 K, e.g. "+2.3", "−0.8"; "— —" when unknown. */
  readonly delta: string
  /** Bar fill as a fraction of the half-track, −1 … 1 (0 when unknown). */
  readonly deltaFrac: number
  readonly status: Status
}

/** "+2.3" / "−0.8" / "0.0"; the sign is dropped when the value rounds to zero. */
export function signedDelta(delta: number): string {
  if (!Number.isFinite(delta)) return PLACEHOLDER
  const text = Math.abs(delta).toFixed(1)
  if (/^[0.]+$/.test(text)) return '0.0'
  return `${delta < 0 ? MINUS_SIGN : '+'}${text}`
}

/** Bar fill for `delta`, clamped to ±1 of `DELTA_FULL_SCALE_K`. */
export function deltaFraction(delta: number): number {
  if (!Number.isFinite(delta)) return 0
  return Math.max(-1, Math.min(1, delta / DELTA_FULL_SCALE_K))
}

const EMPTY_ROWS: readonly RackRowModel[] = CHANNEL_IDS.map((id) => ({
  id,
  tj: PLACEHOLDER,
  delta: PLACEHOLDER,
  deltaFrac: 0,
  status: 'normal' as const,
}))

/** One row per channel T1–T6, in id order. */
export function rackRows(frame: DriveFrame | null): readonly RackRowModel[] {
  if (frame === null) return EMPTY_ROWS
  const mean = channelMean(frame)
  return CHANNEL_IDS.map((id) => {
    const ch = frame.thyristors.find((c) => c.id === id)
    if (ch === undefined) return EMPTY_ROWS[id - 1] as RackRowModel
    const healthy = ch.sensor_healthy && Number.isFinite(ch.tj_estimated)
    const delta = healthy ? ch.tj_estimated - mean : Number.NaN
    return {
      id,
      tj: healthy ? formatValue(ch.tj_estimated, TEMP_C_SPEC).trimStart() : PLACEHOLDER,
      delta: signedDelta(delta),
      // Round the bar to the shown precision so it moves with the text.
      deltaFrac: deltaFraction(Math.round(delta * 10) / 10),
      status: healthy ? ch.status : 'fault',
    }
  })
}

export function rowsEqual(a: readonly RackRowModel[], b: readonly RackRowModel[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  return a.every((r, i) => {
    const o = b[i]
    return o !== undefined && r.tj === o.tj && r.delta === o.delta && r.status === o.status
  })
}

/** Margin to the trip for `id` at 0.1 K, as number text without the unit; "— —" when unknown. */
export function marginText(frame: DriveFrame | null, id: ChannelId): string {
  if (frame === null) return PLACEHOLDER
  const m = marginToTrip(frame, id)
  return Number.isFinite(m) ? formatValue(m, TEMP_C_SPEC).trimStart() : PLACEHOLDER
}

/** Plain-language time-to-warning line for the trip panel. */
export function timeToWarningText(seconds: number | null, warningC: number): string {
  if (seconds === null) return `Not rising toward the ${String(warningC)} °C warning.`
  if (seconds <= 0) return `Already at or above the ${String(warningC)} °C warning.`
  if (seconds < 60) return `Reaches the ${String(warningC)} °C warning in about ${String(Math.ceil(seconds))} s at the current rate.`
  const minutes = Math.ceil(seconds / 60)
  return `Reaches the ${String(warningC)} °C warning in about ${String(minutes)} min at the current rate.`
}
