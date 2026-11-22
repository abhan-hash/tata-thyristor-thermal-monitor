import { curveCatmullRomClosed, line } from 'd3-shape'
import { HEAT_STOP_MAX } from '../../domain/heatScale'
import { clampHeatPosition, heatMix } from './heatRamp'

/**
 * Pure geometry for HeatDisc (Requirement 15.2). Everything is in unit space
 * (disc face radius = 1) so the component can scale paths with a transform
 * and only rewrite attributes, never path data, while Tj changes.
 */

/** Small deterministic PRNG (mulberry32) so a seed always yields the same blob. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const closedCurve = line<readonly [number, number]>()
  .x((p) => p[0])
  .y((p) => p[1])
  .curve(curveCatmullRomClosed.alpha(0.5))

/**
 * Closed organic blob around the origin with mean radius 1. `irregularity`
 * (0..0.5) is the largest relative radial deviation; `points` control points
 * are spaced evenly in angle with a little seeded jitter, then joined with a
 * closed Catmull-Rom curve. The same (seed, irregularity, points) always gives
 * the same path string.
 */
export function blobPath(seed: number, irregularity: number, points = 11): string {
  const rand = seededRandom(seed)
  const amp = Math.min(0.5, Math.max(0, irregularity))
  const n = Math.max(3, Math.floor(points))
  const step = (2 * Math.PI) / n
  const pts: (readonly [number, number])[] = []
  for (let i = 0; i < n; i++) {
    const angle = i * step + (rand() - 0.5) * step * 0.5
    const r = 1 + (rand() * 2 - 1) * amp
    pts.push([round3(r * Math.cos(angle)), round3(r * Math.sin(angle))])
  }
  // The closed Catmull-Rom curve returns to its start but does not emit Z.
  const d = closedCurve(pts)
  return d ? `${d}Z` : ''
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000
}

/** One stepped band, outermost first. `radius` is relative to the face radius. */
export interface DiscBand {
  radius: number
  color: string
}

export interface DiscModel {
  /** Face gradient: colour at the rim edge and at the start of the first band. */
  faceEdge: string
  faceInner: string
  /** Three stepped bands inside the face, outermost first, radii strictly decreasing. */
  bands: readonly [DiscBand, DiscBand, DiscBand]
  /** Mean radius of the dark irregular core. */
  coreRadius: number
  /** Glow halo strength, 0 at ambient → 1 at the trip limit. */
  glow: number
}

/* Heat offsets of each layer from the disc's heat position. The face edge is
 * the palest and each band steps one-plus stops hotter toward the core, like
 * the reference's orange → red → crimson rings. */
const EDGE_OFFSET = -2.2
const FACE_OFFSET = -1.4
const BAND_OFFSETS = [-0.4, 0.8, 2] as const
/* Layer colours never drop below stop 1: stop 0 is the dark ambient brown,
 * which would read as a hole in the disc rather than as "cool". */
const COLOUR_FLOOR = 1
const layerColour = (pos: number) => heatMix(Math.max(COLOUR_FLOOR, pos))

/* [base, growth]: radius = base + growth · t, t = position / 8. Ranges do not
 * overlap, so the order (face > band 0 > band 1 > band 2 > core) holds for
 * every temperature. Hotter discs push the crimson rings outward. */
const BAND_RADII = [
  [0.74, 0.1],
  [0.56, 0.12],
  [0.4, 0.12],
] as const
const CORE_RADIUS: readonly [number, number] = [0.26, 0.06]

/** Disc layout for a heat position (see `heatPosition`). */
export function discModel(position: number): DiscModel {
  const p = clampHeatPosition(position)
  const t = p / HEAT_STOP_MAX
  const band = (i: 0 | 1 | 2): DiscBand => ({
    radius: BAND_RADII[i][0] + BAND_RADII[i][1] * t,
    color: layerColour(p + BAND_OFFSETS[i]),
  })
  return {
    faceEdge: layerColour(p + EDGE_OFFSET),
    faceInner: layerColour(p + FACE_OFFSET),
    bands: [band(0), band(1), band(2)],
    coreRadius: CORE_RADIUS[0] + CORE_RADIUS[1] * t,
    glow: t,
  }
}
