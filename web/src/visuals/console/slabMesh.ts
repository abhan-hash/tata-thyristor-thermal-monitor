import { project, type SlabSpec, type Vec2 } from './iso'

/**
 * Side faces for a slab whose top face is a rounded rectangle (Requirement
 * 16.1). `iso.slabFaces` gives sharp quads; with an 18-unit corner radius on
 * the top face those quads stick out at the corners. Here the rounded outline
 * is extruded down to the ground plane and cut into one quad per outline
 * segment, so the front and right faces turn the corner smoothly.
 */

export type SideFace = 'front' | 'right'

export interface SideSegment {
  /** Which visible face the segment belongs to (front: normal mostly +v, right: mostly +u). */
  face: SideFace
  /** Screen polygon `points` attribute (top edge, then down to the ground). */
  points: string
  /** 0 = fully lit (facing +v, down-left) … 1 = fully shaded (facing +u, down-right). */
  shade: number
}

export interface SlabSides {
  /** Visible side segments in outline order (from the right-hand corner round to the left-hand one). */
  segments: SideSegment[]
  /** Screen path of the whole visible side region (for a base fill and overlays). */
  silhouette: string
  /** Screen polyline along the visible top edge, where the bevel highlight goes. */
  topEdge: string
  /** Screen polyline along the visible ground edge. */
  groundEdge: string
}

const r2 = (x: number): number => {
  const v = Math.round(x * 100) / 100
  return Object.is(v, -0) ? 0 : v
}

const pt = (p: Vec2): string => `${r2(p[0])},${r2(p[1])}`

/**
 * Clockwise outline (u right, v down) of a `width`×`depth` rectangle with
 * corner radius `radius`, starting at (radius, 0). Each corner is sampled with
 * `perCorner` + 1 points including both ends.
 */
export function roundedOutline(width: number, depth: number, radius: number, perCorner = 8): Vec2[] {
  const r = Math.max(0, Math.min(radius, width / 2, depth / 2))
  const n = Math.max(1, Math.floor(perCorner))
  const corners: readonly [number, number, number][] = [
    [width - r, r, -90],
    [width - r, depth - r, 0],
    [r, depth - r, 90],
    [r, r, 180],
  ]
  const out: Vec2[] = []
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = ((start + (90 * i) / n) * Math.PI) / 180
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
  }
  return out
}

/** Visible side segments of the extruded rounded slab, with per-segment shading. */
export function slabSides(slab: SlabSpec, cornerRadius: number, perCorner = 8): SlabSides {
  const outline = roundedOutline(slab.width, slab.depth, cornerRadius, perCorner)
  const top = (p: Vec2): Vec2 => project(p[0], p[1], slab.thickness, slab.origin)
  const ground = (p: Vec2): Vec2 => project(p[0], p[1], 0, slab.origin)
  const segments: SideSegment[] = []
  const chain: Vec2[] = []
  const count = outline.length
  for (let i = 0; i < count; i++) {
    const p = outline[i] as Vec2
    const q = outline[(i + 1) % count] as Vec2
    const ex = q[0] - p[0]
    const ey = q[1] - p[1]
    const len = Math.hypot(ex, ey)
    if (len < 1e-9) continue
    // Outward normal of a clockwise outline in y-down coordinates.
    const nu = ey / len
    const nv = -ex / len
    // Screen-space y of the projected normal is sin30·(nu + nv); > 0 faces the viewer.
    if (nu + nv <= 1e-6) continue
    const shade = Math.min(1, Math.max(0, (nu - nv + 1) / 2))
    segments.push({
      face: nv >= nu ? 'front' : 'right',
      points: [top(p), top(q), ground(q), ground(p)].map(pt).join(' '),
      shade: Math.round(shade * 1000) / 1000,
    })
    if (chain.length === 0) chain.push(p)
    chain.push(q)
  }
  const topChain = chain.map(top)
  const groundChain = chain.map(ground)
  const line = (pts: Vec2[]): string => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${pt(p).replace(',', ' ')}`).join('')
  const silhouette = `${line(topChain)}${[...groundChain]
    .reverse()
    .map((p) => `L${pt(p).replace(',', ' ')}`)
    .join('')}Z`
  return { segments, silhouette, topEdge: line(topChain), groundEdge: line(groundChain) }
}
