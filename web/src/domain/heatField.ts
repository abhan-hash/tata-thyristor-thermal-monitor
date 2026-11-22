import { heatStopIndex, heatToken, type HeatStop } from './heatScale'
import type { ChannelId, ThyristorFrame } from './types'

/**
 * Heat field for Heat_Blobs (Requirements 15.4, 15.5, 15.6, 21.3).
 *
 * A 48 × 32 scalar field in °C, seeded with the six channel Tj values at fixed
 * anchor points and blended with a Gaussian kernel. `bandThresholds` then
 * picks exactly six isoband levels with a heat stop each, ready for
 * `d3-contour`. Pure functions with no DOM access.
 *
 * Layout: row-major, `field[x + y * FIELD_WIDTH]`, which is the layout
 * `d3-contour` expects with `.size([FIELD_WIDTH, FIELD_HEIGHT])`.
 */

export const FIELD_WIDTH = 48
export const FIELD_HEIGHT = 32
export const BAND_COUNT = 6

/** Ambient fallback (°C) when the frame's ambient reading is not finite. */
export const DEFAULT_AMBIENT_C = 35

/** Gaussian kernel width in grid cells. Wide enough for neighbouring anchors to merge. */
export const KERNEL_SIGMA = 6

/**
 * Minimum temperature span (K) used to place thresholds. A flat field (all
 * channels at ambient) then puts every threshold above the field maximum and
 * all six bands render as empty paths instead of covering the whole grid.
 */
export const MIN_BAND_SPAN_K = 6

export interface FieldAnchor {
  channel: ChannelId
  /** Grid column, integer so the anchor value is sampled exactly. */
  x: number
  /** Grid row, integer. */
  y: number
}

/**
 * Anchors on a hexagonal ring in channel order T1..T6 (the bridge firing
 * order), so ring neighbours are the channels that conduct next to each other.
 * Integer grid points keep the anchor value on a sample.
 */
export const FIELD_ANCHORS: readonly FieldAnchor[] = Object.freeze([
  { channel: 1, x: 24, y: 7 },
  { channel: 2, x: 36, y: 11 },
  { channel: 3, x: 36, y: 21 },
  { channel: 4, x: 24, y: 25 },
  { channel: 5, x: 12, y: 21 },
  { channel: 6, x: 12, y: 11 },
])

/** Fraction of the floor→peak span at which each band threshold sits (outermost first). */
const BAND_FRACTIONS: readonly number[] = Object.freeze(
  Array.from({ length: BAND_COUNT }, (_, k) => (k + 0.5) / BAND_COUNT),
)

export type FieldChannel = Pick<ThyristorFrame, 'id' | 'tj_estimated' | 'sensor_healthy'>

export interface HeatBand {
  /** Lower bound (°C) of the band; the band covers field values ≥ `threshold`. */
  threshold: number
  /** Heat stop of the band fill. */
  heat: HeatStop
  /** `var(--heat-N)` for the fill. */
  token: string
}

function usableTj(ch: FieldChannel | undefined): number | undefined {
  if (ch === undefined || !ch.sensor_healthy || !Number.isFinite(ch.tj_estimated)) return undefined
  return ch.tj_estimated
}

function resolveAmbient(ambient: number): number {
  return Number.isFinite(ambient) ? ambient : DEFAULT_AMBIENT_C
}

/**
 * Anchor values (°C) in `FIELD_ANCHORS` order.
 *
 * A healthy channel contributes its Tj. An unhealthy channel (sensor fault,
 * non-finite Tj or missing) is interpolated linearly along the anchor ring
 * between the nearest healthy channel on each side; with immediate neighbours
 * healthy this is their mean. With no healthy channel every anchor is ambient.
 */
export function anchorValues(channels: readonly FieldChannel[], ambient: number): number[] {
  const amb = resolveAmbient(ambient)
  const n = FIELD_ANCHORS.length
  const raw = FIELD_ANCHORS.map((a) => usableTj(channels.find((ch) => ch.id === a.channel)))
  if (raw.every((v) => v === undefined)) return raw.map(() => amb)

  return raw.map((value, i) => {
    if (value !== undefined) return value
    let left: number | undefined
    let dl = 0
    for (let d = 1; d < n; d++) {
      const v = raw[(i - d + n) % n]
      if (v !== undefined) {
        left = v
        dl = d
        break
      }
    }
    let right: number | undefined
    let dr = 0
    for (let d = 1; d < n; d++) {
      const v = raw[(i + d) % n]
      if (v !== undefined) {
        right = v
        dr = d
        break
      }
    }
    // At least one healthy channel exists, so both walks find one (possibly the same).
    if (left === undefined || right === undefined) return amb
    return (left * dr + right * dl) / (dl + dr)
  })
}

/**
 * Build the 48 × 32 field (°C). Each cell is ambient plus the Gaussian-weighted
 * excess of the anchors, normalised by the total weight once that exceeds 1.
 * The field therefore stays within [min(ambient, anchors), max(ambient, anchors)],
 * and at an anchor it is a weighted mean of anchor values, so when every
 * anchor is ≥ 125 °C the field peak is too.
 */
export function buildField(channels: readonly FieldChannel[], ambient: number): Float32Array {
  const amb = resolveAmbient(ambient)
  const values = anchorValues(channels, amb)
  const excess = values.map((v) => v - amb)
  const field = new Float32Array(FIELD_WIDTH * FIELD_HEIGHT)
  const twoSigmaSq = 2 * KERNEL_SIGMA * KERNEL_SIGMA

  for (let y = 0; y < FIELD_HEIGHT; y++) {
    for (let x = 0; x < FIELD_WIDTH; x++) {
      let weightSum = 0
      let weighted = 0
      for (let i = 0; i < FIELD_ANCHORS.length; i++) {
        const a = FIELD_ANCHORS[i] as FieldAnchor
        const dx = x - a.x
        const dy = y - a.y
        const w = Math.exp(-(dx * dx + dy * dy) / twoSigmaSq)
        weightSum += w
        weighted += w * (excess[i] as number)
      }
      field[x + y * FIELD_WIDTH] = amb + weighted / Math.max(1, weightSum)
    }
  }
  return field
}

/**
 * Exactly six band levels, outermost first, with strictly increasing
 * thresholds between the field floor (minimum) and peak (maximum).
 *
 * Each band is coloured by the heat stop of its upper bound: the next
 * threshold, or the field peak for the innermost band. When every Tj is
 * ≥ 125 °C the peak is ≥ 125 °C and the innermost band is `--heat-8`.
 * Non-finite samples are ignored; an empty or all-NaN field is treated as
 * flat at the default ambient.
 */
export function bandThresholds(field: ArrayLike<number>): HeatBand[] {
  let floor = Number.POSITIVE_INFINITY
  let peak = Number.NEGATIVE_INFINITY
  for (let i = 0; i < field.length; i++) {
    const v = field[i] as number
    if (!Number.isFinite(v)) continue
    if (v < floor) floor = v
    if (v > peak) peak = v
  }
  if (floor > peak) {
    floor = DEFAULT_AMBIENT_C
    peak = DEFAULT_AMBIENT_C
  }

  const span = Math.max(peak - floor, MIN_BAND_SPAN_K)
  const thresholds = BAND_FRACTIONS.map((f) => floor + span * f)

  return thresholds.map((threshold, k) => {
    const upper = k < BAND_COUNT - 1 ? (thresholds[k + 1] as number) : Math.max(peak, threshold)
    const heat = heatStopIndex(upper)
    return { threshold, heat, token: heatToken(heat) }
  })
}
