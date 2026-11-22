import { heatToken } from '../../domain/heatScale'
/**
 * Pure geometry and bindings for the Airflow_Diagram (Requirement 20), kept
 * out of the component so they can be tested without a browser.
 * Coordinates are on the diagram's 420 × 480 viewBox (sketch `airflow-b`).
 */
/** Hard cap from Requirement 20.2. */
export const MAX_PARTICLES = 40
/** Particle speed along the streamlines at full airflow, viewBox units per second. */
export const PARTICLE_SPEED_FULL = 120
/** Blower revolutions per second at full airflow. */
export const BLADE_RPS_FULL = 1.6
/** Heat stop the exchanger takes when the fan has failed (Requirement 20.3). */
export const EXCHANGER_WARM_STOP = 4
export interface Point {
  x: number
  y: number
}
export interface Lane {
  /** Closed polyline: first point repeated at the end. */
  points: readonly Point[]
  /** Cumulative length at each point; last entry is the loop length. */
  lengths: readonly number[]
  /** Particles carried on this lane. */
  particles: number
}
/** Air loop: up through the heatsink, across the blower and exchanger, down the return channel. */
interface LoopSpec {
  x0: number
  y0: number
  x1: number
  y1: number
  r: number
  particles: number
}
const LOOPS: readonly LoopSpec[] = [
  { x0: 196, y0: 107, x1: 298, y1: 393, r: 22, particles: 10 },
  { x0: 160, y0: 95, x1: 310, y1: 405, r: 26, particles: 12 },
  { x0: 124, y0: 83, x1: 322, y1: 417, r: 30, particles: 14 },
]
const ARC_STEPS = 6
/**
 * Rounded-rectangle loop starting at the bottom of the left (rising) side and
 * running clockwise on screen: up, right across the top, down, back left.
 */
export function roundedLoop(x0: number, y0: number, x1: number, y1: number, r: number): Point[] {
  const pts: Point[] = []
  // Corner centres, visited clockwise from top-left; each arc starts at `from` rad.
  const corners: readonly [number, number, number][] = [
    [x0 + r, y0 + r, Math.PI],
    [x1 - r, y0 + r, -Math.PI / 2],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, Math.PI / 2],
  ]
  pts.push({ x: x0, y: y1 - r })
  for (const [cx, cy, from] of corners) {
    for (let s = 0; s <= ARC_STEPS; s++) {
      const a = from + (s / ARC_STEPS) * (Math.PI / 2)
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
    }
  }
  pts.push({ x: x0, y: y1 - r })
  return pts
}
function cumulative(points: readonly Point[]): number[] {
  const out = [0]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point
    const b = points[i] as Point
    out.push((out[i - 1] as number) + Math.hypot(b.x - a.x, b.y - a.y))
  }
  return out
}
/** The three streamline lanes. Their particle counts sum to at most MAX_PARTICLES. */
export function airflowLanes(): Lane[] {
  return LOOPS.map((l) => {
    const points = roundedLoop(l.x0, l.y0, l.x1, l.y1, l.r)
    return { points, lengths: cumulative(points), particles: l.particles }
  })
}
/** Total particle count across lanes. */
export function particleCount(lanes: readonly Lane[]): number {
  return lanes.reduce((n, l) => n + l.particles, 0)
}
/** Point at fraction `t` (wrapped into [0, 1)) of a lane's length. */
export function pointAt(lane: Lane, t: number): Point {
  const total = lane.lengths[lane.lengths.length - 1] as number
  const frac = ((t % 1) + 1) % 1
  const target = frac * total
  for (let i = 1; i < lane.points.length; i++) {
    const l1 = lane.lengths[i] as number
    if (l1 >= target) {
      const l0 = lane.lengths[i - 1] as number
      const a = lane.points[i - 1] as Point
      const b = lane.points[i] as Point
      const k = l1 === l0 ? 0 : (target - l0) / (l1 - l0)
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
    }
  }
  return lane.points[0] as Point
}
/** CSS translate for a point; particles are moved by transform only. */
export function translateCss(p: Point): string {
  return `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px)`
}
/** WAAPI keyframes that carry a particle once around a lane at constant speed. */
export function laneKeyframes(lane: Lane): Keyframe[] {
  const total = lane.lengths[lane.lengths.length - 1] as number
  return lane.points.map((p, i) => ({
    transform: translateCss(p),
    offset: (lane.lengths[i] as number) / total,
  }))
}
/** Airflow fraction in [0, 1]: the explicit value when given, else 1 with the fan on and 0 with it off. */
export function airflowFraction(fanStatus: boolean, airflow?: number): number {
  if (!fanStatus) return 0
  if (airflow === undefined || Number.isNaN(airflow)) return 1
  return Math.min(1, Math.max(0, airflow))
}
/** Particle speed (viewBox units / s) from fan state. Zero when the fan has failed. */
export function particleSpeed(fanStatus: boolean, airflow?: number): number {
  return PARTICLE_SPEED_FULL * airflowFraction(fanStatus, airflow)
}
/** Exchanger fill: a cool neutral while the fan runs, a warm heat stop when it has failed. */
export function exchangerFill(fanStatus: boolean): string {
  return fanStatus ? 'var(--surface-raised)' : heatToken(EXCHANGER_WARM_STOP)
}
/**
 * Bloom band stops, outermost first, so the hottest band is innermost
 * (the HeatBlobs ordering). Empty for ambient or no finite reading.
 */
export function bloomStops(hottestStop: number, bands = 4): number[] {
  if (!Number.isFinite(hottestStop) || hottestStop < 1) return []
  const top = Math.min(8, Math.trunc(hottestStop))
  const n = Math.min(bands, top)
  return Array.from({ length: n }, (_, i) => top - (n - 1) + i)
}
