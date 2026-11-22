/**
 * Closed, wobbly contour rings for small decorative illustrations.
 * Pure and deterministic: the same arguments always give the same path.
 */
export interface ContourRing {
  cx: number
  cy: number
  /** Mean radius. */
  r: number
  /** Radial wobble as a fraction of `r` (0 gives a circle). */
  wobble: number
  /** Phase offset in radians, so rings in one set do not wobble in lockstep. */
  phase: number
}

const SAMPLES = 24

function round(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * SVG path for one ring: polar samples with a three-harmonic wobble, joined
 * by a closed Catmull-Rom spline written as cubic Béziers. The first sample
 * is at angle 0 (3 o'clock), so dashed rings in one set start their dash at
 * the same bearing.
 */
export function contourRingPath({ cx, cy, r, wobble, phase }: ContourRing): string {
  const pts: [number, number][] = []
  for (let i = 0; i < SAMPLES; i++) {
    const a = (i / SAMPLES) * Math.PI * 2
    const k =
      1 +
      wobble * (0.55 * Math.sin(2 * a + phase) + 0.3 * Math.sin(3 * a - 1.7 * phase) + 0.15 * Math.sin(5 * a + 0.6))
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k])
  }
  const at = (i: number): [number, number] => pts[(i + SAMPLES) % SAMPLES] as [number, number]
  const [x0, y0] = at(0)
  let d = `M${round(x0)} ${round(y0)}`
  for (let i = 0; i < SAMPLES; i++) {
    const [ax, ay] = at(i - 1)
    const [bx, by] = at(i)
    const [ccx, ccy] = at(i + 1)
    const [dx, dy] = at(i + 2)
    const c1x = bx + (ccx - ax) / 6
    const c1y = by + (ccy - ay) / 6
    const c2x = ccx - (dx - bx) / 6
    const c2y = ccy - (dy - by) / 6
    d += `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(ccx)} ${round(ccy)}`
  }
  return `${d}Z`
}
