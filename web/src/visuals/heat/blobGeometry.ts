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
 * six nested isotherm regions → smooth closed SVG paths.
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

export interface BlobBand extends HeatBand {
  /** Band index, 0 = outermost (coolest), 5 = innermost (hottest). */
  index: number
  /** SVG path in viewBox units; empty string when the band has no area. */
  d: string
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

/** Closed-curve path for one MultiPolygon (exteriors and holes; use fill-rule evenodd). */
function multiPolygonPath(coordinates: number[][][][], seed: number): string {
  const parts: string[] = []
  for (const polygon of coordinates) {
    for (const ring of polygon) {
      // d3-contour repeats the first point at the end; the closed curve does not need it.
      const pts = ring.slice(0, -1).map(([x, y]) => warpPoint(x as number, y as number, seed))
      if (pts.length < MIN_RING_POINTS) continue
      const d = ringLine(pts)
      if (d) parts.push(d)
    }
  }
  return parts.join('')
}

/** Six bands for a field: thresholds and fills from `bandThresholds`, outlines from `d3-contour`. */
export function blobBandsFromField(field: Float32Array, seed = 1): BlobBand[] {
  const bands = bandThresholds(field)
  const generator = contours().size([FIELD_WIDTH, FIELD_HEIGHT])
  const values = Array.from(field)
  return bands.map((band, index) => {
    const [geometry] = generator.thresholds([band.threshold])(values)
    const d = geometry ? multiPolygonPath(geometry.coordinates, seed) : ''
    return { ...band, index, d }
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
