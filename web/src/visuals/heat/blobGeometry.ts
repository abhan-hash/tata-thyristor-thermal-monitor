import { contours } from 'd3-contour'
import { curveBasisClosed, line } from 'd3-shape'
import {
  BAND_COUNT,
  bandThresholds,
  buildField,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  type FieldChannel,
  type HeatBand,
} from '../../domain/heatField'
import type { HeatStop } from '../../domain/heatScale'

/**
 * Geometry for Heat_Blobs (Requirements 15.4, 15.5, 34.2). Pure: field →
 * six nested isotherm regions → rings resampled to a fixed point count →
 * smooth closed SVG paths. The fixed point count gives the 1 Hz morph a
 * fixed path topology.
 *
 * Each band k is the region where the field is ≥ its threshold, so the bands
 * nest (outermost largest) and painting them outermost-first gives the
 * reference's stepped look with the hottest band innermost.
 */

/** viewBox units per field cell. The viewBox is 480 × 320. */
export const BLOB_CELL = 10
export const BLOB_VIEW_WIDTH = FIELD_WIDTH * BLOB_CELL
export const BLOB_VIEW_HEIGHT = FIELD_HEIGHT * BLOB_CELL

/**
 * Domain warp (in field cells). A smooth, seeded displacement of the plane
 * that turns the Gaussian ring into irregular, reference-like lobes. Its
 * Jacobian stays close to the identity (|A·k| summed < 1), so the warp is a
 * homeomorphism: nested bands stay nested and never cross.
 */
const WARP = [
  { a: 1.6, kx: 0.17, ky: 0.09, phase: 0.7 },
  { a: 1.1, kx: -0.08, ky: 0.21, phase: 2.3 },
  { a: 0.55, kx: 0.31, ky: -0.27, phase: 4.1 },
] as const

/** Ring with fewer points than this is dropped (degenerate marching-squares speck). */
const MIN_RING_POINTS = 4

const ringLine = line()
  .x((p) => p[0])
  .y((p) => p[1])
  .curve(curveBasisClosed)

/** Points per resampled ring. Every ring has this many, so two frames with the same ring counts share a topology. */
export const RING_POINTS = 48

/** A closed ring resampled to `RING_POINTS` points, flat `[x0, y0, x1, y1, …]` in viewBox units. */
export type Ring = Float64Array

export interface BlobBand extends HeatBand {
  /** Band index, 0 = outermost (coolest), 5 = innermost (hottest). */
  index: number
  /** Outlines (exteriors and holes), each resampled to `RING_POINTS`, ordered by centroid x. */
  rings: readonly Ring[]
  /** SVG path in viewBox units, `ringsPath(rings)`; empty string when the band has no area. */
  d: string
}

/**
 * Resamples a closed polyline to `n` points evenly spaced by arc length,
 * starting at its topmost point (lowest y, then lowest x), so the same
 * outline always starts at the same place and frames can be interpolated
 * point by point.
 */
export function resampleRing(pts: readonly (readonly [number, number])[], n = RING_POINTS): Ring {
  const m = pts.length
  let start = 0
  for (let i = 1; i < m; i++) {
    const p = pts[i] as readonly [number, number]
    const s = pts[start] as readonly [number, number]
    if (p[1] < s[1] || (p[1] === s[1] && p[0] < s[0])) start = i
  }
  const ordered = Array.from({ length: m + 1 }, (_, i) => pts[(start + i) % m] as readonly [number, number])
  const cum = [0]
  for (let i = 1; i < ordered.length; i++) {
    const a = ordered[i - 1] as readonly [number, number]
    const b = ordered[i] as readonly [number, number]
    cum.push((cum[i - 1] as number) + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const total = cum[cum.length - 1] as number
  const out = new Float64Array(n * 2)
  let seg = 1
  for (let k = 0; k < n; k++) {
    const target = (total * k) / n
    while (seg < cum.length - 1 && (cum[seg] as number) < target) seg++
    const a = ordered[seg - 1] as readonly [number, number]
    const b = ordered[seg] as readonly [number, number]
    const c0 = cum[seg - 1] as number
    const span = (cum[seg] as number) - c0
    const f = span > 0 ? (target - c0) / span : 0
    out[k * 2] = a[0] + (b[0] - a[0]) * f
    out[k * 2 + 1] = a[1] + (b[1] - a[1]) * f
  }
  return out
}

function ringCentroidX(r: Ring): number {
  let sum = 0
  for (let i = 0; i < r.length; i += 2) sum += r[i] as number
  return sum / (r.length / 2)
}

/** Smooth closed path through every ring (use fill-rule evenodd). */
export function ringsPath(rings: readonly Ring[]): string {
  const parts: string[] = []
  for (const r of rings) {
    const pts: [number, number][] = []
    for (let i = 0; i < r.length; i += 2) pts.push([r[i] as number, r[i + 1] as number])
    const d = ringLine(pts)
    if (d) parts.push(d)
  }
  return parts.join('')
}

/** True when every band has the same ring count in both frames, so they can be morphed point by point. */
export function sameTopology(a: readonly BlobBand[], b: readonly BlobBand[]): boolean {
  return a.length === b.length && a.every((band, i) => band.rings.length === b[i]?.rings.length)
}

/** Point-wise interpolation of two ring sets with the same topology, `t` in [0, 1]. */
export function lerpRings(a: readonly Ring[], b: readonly Ring[], t: number): Ring[] {
  return b.map((rb, i) => {
    const ra = a[i]
    if (!ra || ra.length !== rb.length) return rb
    const out = new Float64Array(rb.length)
    for (let k = 0; k < rb.length; k++) out[k] = (ra[k] as number) + ((rb[k] as number) - (ra[k] as number)) * t
    return out
  })
}

/** Smooth seeded warp of a field-space point, returned in viewBox units. */
export function warpPoint(x: number, y: number, seed = 1): [number, number] {
  let dx = 0
  let dy = 0
  for (const w of WARP) {
    const s = seed * 1.37 + w.phase
    dx += w.a * Math.sin(w.kx * x + w.ky * y + s)
    dy += w.a * Math.cos(w.ky * x - w.kx * y + s * 0.61)
  }
  return [(x + dx) * BLOB_CELL, (y + dy) * BLOB_CELL]
}

/** Warped, resampled rings for one MultiPolygon (exteriors and holes), ordered by centroid x. */
function multiPolygonRings(coordinates: number[][][][], seed: number): Ring[] {
  const rings: Ring[] = []
  for (const polygon of coordinates) {
    for (const ring of polygon) {
      // d3-contour repeats the first point at the end; the closed curve does not need it.
      const pts = ring.slice(0, -1).map(([x, y]) => warpPoint(x as number, y as number, seed))
      if (pts.length < MIN_RING_POINTS) continue
      rings.push(resampleRing(pts))
    }
  }
  return rings.sort((a, b) => ringCentroidX(a) - ringCentroidX(b))
}

/** Six bands for a field: thresholds and fills from `bandThresholds`, outlines from `d3-contour`. */
export function blobBandsFromField(field: Float32Array, seed = 1): BlobBand[] {
  const bands = bandThresholds(field)
  const generator = contours().size([FIELD_WIDTH, FIELD_HEIGHT])
  const values = Array.from(field)
  return bands.map((band, index) => {
    const [geometry] = generator.thresholds([band.threshold])(values)
    const rings = geometry ? multiPolygonRings(geometry.coordinates, seed) : []
    return { ...band, index, rings, d: ringsPath(rings) }
  })
}

/** Six bands for the live channels (one call per Display_Tick). */
export function blobBands(channels: readonly FieldChannel[], ambient: number, seed = 1): BlobBand[] {
  return blobBandsFromField(buildField(channels, ambient), seed)
}

/** Heat stop of the innermost band (used for the core glow decision). */
export function coreHeat(bands: readonly BlobBand[]): HeatStop {
  return bands[BAND_COUNT - 1]?.heat ?? 0
}
