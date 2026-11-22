/**
 * Pure isometric geometry for IsometricConsole (Requirement 16.1).
 *
 * Coordinates:
 * - Local plane (u, v): u runs along the slab width (screen down-right),
 *   v along the slab depth (screen down-left). h is height above the ground
 *   plane, in screen units (straight up).
 * - The projection is the fixed 30° isometric matrix used by `console-a.svg`:
 *   `matrix(cos30 sin30 -cos30 sin30 ox oy)`.
 *
 * The slab stands on the ground plane (h = 0) with its top face at
 * h = thickness. The visible side faces are the front face (v = depth, facing
 * down-left) and the right face (u = width, facing down-right).
 */

export const ISO_ANGLE_DEG = 30
export const COS30 = Math.cos((ISO_ANGLE_DEG * Math.PI) / 180)
export const SIN30 = Math.sin((ISO_ANGLE_DEG * Math.PI) / 180)

/** A projected circle of radius r becomes an axis-aligned ellipse with these ratios. */
export const ISO_RX_PER_R = Math.SQRT2 * COS30
export const ISO_RY_PER_R = Math.SQRT2 * SIN30

export type Vec2 = readonly [number, number]

/** 2D affine matrix in SVG order: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export interface Matrix {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

/** The 30° projection of the local plane, with local (0, 0) at screen `origin`. */
export function isoMatrix(origin: Vec2 = [0, 0]): Matrix {
  return { a: COS30, b: SIN30, c: -COS30, d: SIN30, e: origin[0], f: origin[1] }
}

/** m1 · m2 (apply m2 first, then m1). */
export function multiply(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  }
}

export function translate(x: number, y: number): Matrix {
  return { ...IDENTITY, e: x, f: y }
}

export function scale(k: number): Matrix {
  return { ...IDENTITY, a: k, d: k }
}

export function applyMatrix(m: Matrix, p: Vec2): Vec2 {
  return [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f]
}

const r3 = (x: number): number => {
  const v = Math.round(x * 1000) / 1000
  return Object.is(v, -0) ? 0 : v
}

/** SVG `transform` attribute value for a matrix, rounded to 3 decimals. */
export function matrixAttr(m: Matrix): string {
  return `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map(r3).join(' ')})`
}

/** Project local (u, v) at height h to screen, with the ground origin at `origin`. */
export function project(u: number, v: number, h = 0, origin: Vec2 = [0, 0]): Vec2 {
  return [origin[0] + COS30 * (u - v), origin[1] + SIN30 * (u + v) - h]
}

/** Inverse of `project` for a known height h. */
export function unproject(x: number, y: number, h = 0, origin: Vec2 = [0, 0]): Vec2 {
  const diff = (x - origin[0]) / COS30 // u - v
  const sum = (y - origin[1] + h) / SIN30 // u + v
  return [(sum + diff) / 2, (sum - diff) / 2]
}

/** SVG `points` attribute value for a polygon. */
export function pointsAttr(poly: readonly Vec2[]): string {
  return poly.map((p) => `${r3(p[0])},${r3(p[1])}`).join(' ')
}

// ---------------------------------------------------------------------------
// Slab

export interface SlabSpec {
  /** Extent along u. */
  width: number
  /** Extent along v. */
  depth: number
  /** Height of the top face above the ground plane. */
  thickness: number
  /** Screen position of the ground-plane local origin. */
  origin: Vec2
}

export type Quad = readonly [Vec2, Vec2, Vec2, Vec2]

export interface SlabFaces {
  /** Top face, clockwise from the back corner (local 0,0). */
  top: Quad
  /** Front face (v = depth), facing down-left. */
  front: Quad
  /** Right face (u = width), facing down-right. */
  right: Quad
}

/** Matrix that maps local top-face coordinates (u, v) to screen. */
export function topFaceMatrix(slab: SlabSpec): Matrix {
  return isoMatrix([slab.origin[0], slab.origin[1] - slab.thickness])
}

export function slabFaces(slab: SlabSpec): SlabFaces {
  const { width: w, depth: d, thickness: t, origin: o } = slab
  const p = (u: number, v: number, h: number): Vec2 => project(u, v, h, o)
  return {
    top: [p(0, 0, t), p(w, 0, t), p(w, d, t), p(0, d, t)],
    front: [p(0, d, t), p(w, d, t), p(w, d, 0), p(0, d, 0)],
    right: [p(w, 0, t), p(w, d, t), p(w, d, 0), p(w, 0, 0)],
  }
}

/** Screen bounding box of the whole slab. */
export function slabBounds(slab: SlabSpec): { x: number; y: number; width: number; height: number } {
  const f = slabFaces(slab)
  const pts = [...f.top, ...f.front, ...f.right]
  const xs = pts.map((q) => q[0])
  const ys = pts.map((q) => q[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

export interface Ellipse {
  cx: number
  cy: number
  rx: number
  ry: number
}

/**
 * Contact shadow under the slab: an ellipse centred on the ground footprint,
 * sized to `spread` of the footprint's screen bounding box and nudged down.
 */
export function contactShadow(slab: SlabSpec, spread = 0.92, drop = 0.04): Ellipse {
  const { width: w, depth: d, origin: o } = slab
  const [cx, cy] = project(w / 2, d / 2, 0, o)
  const rx = (COS30 * (w + d) * spread) / 2
  const ry = (SIN30 * (w + d) * spread) / 2
  return { cx, cy: cy + drop * SIN30 * (w + d), rx, ry }
}

// ---------------------------------------------------------------------------
// Knobs

export interface KnobSpec {
  /** Centre on the top face, local coordinates. */
  u: number
  v: number
  /** Cap radius in local units. */
  radius: number
  /** Cap height above the top face. */
  height: number
}

export interface KnobStack {
  /** Blurred drop shadow on the top face. */
  shadow: Ellipse
  /** Dark base skirt, slightly wider than the cap. */
  base: Ellipse
  /** Cylinder side as an SVG path (top edge line, down, lower arc, up). */
  side: string
  /** Lower edge arc only (for a dark rim stroke). */
  sideEdge: string
  /** Cap top face. */
  top: Ellipse
  /** Inner ring on the cap top. */
  inner: Ellipse
}

export const KNOB_SWEEP_DEG = 270
/** Start angle (local, SVG clockwise from +u) of the knob sweep, as in the sketch. */
export const KNOB_START_DEG = 135

const SKIRT = 1.1
const INNER = 0.62

function isoEllipse(u: number, v: number, h: number, r: number, origin: Vec2): Ellipse {
  const [cx, cy] = project(u, v, h, origin)
  return { cx, cy, rx: r * ISO_RX_PER_R, ry: r * ISO_RY_PER_R }
}

/** Stacked ellipses for one knob standing on the slab's top face. */
export function knobStack(slab: SlabSpec, knob: KnobSpec): KnobStack {
  const o = slab.origin
  const baseH = slab.thickness
  const topH = baseH + knob.height
  const shadowOffset = knob.radius * 0.5
  // The light comes from the back-left, so the shadow falls along +u.
  const shadow = isoEllipse(knob.u + shadowOffset, knob.v, baseH, knob.radius * SKIRT, o)
  const base = isoEllipse(knob.u, knob.v, baseH, knob.radius * SKIRT, o)
  const top = isoEllipse(knob.u, knob.v, topH, knob.radius, o)
  const inner = isoEllipse(knob.u, knob.v, topH, knob.radius * INNER, o)
  const left = r3(top.cx - top.rx)
  const right = r3(top.cx + top.rx)
  const yTop = r3(top.cy)
  const yBase = r3(top.cy + knob.height)
  const rx = r3(top.rx)
  const ry = r3(top.ry)
  const arc = `A${rx} ${ry} 0 0 0 ${right} ${yBase}`
  return {
    shadow,
    base,
    side: `M${left} ${yTop}V${yBase}${arc}V${yTop}Z`,
    sideEdge: `M${left} ${yBase}${arc}`,
    top,
    inner,
  }
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0
}

/** Local angle (degrees, SVG clockwise from +u) for a knob value fraction 0..1. */
export function knobAngleDeg(fraction: number): number {
  return KNOB_START_DEG + KNOB_SWEEP_DEG * clamp01(fraction)
}

/**
 * Ring arc on a circle drawn in top-face local coordinates with
 * `pathLength="100"` and `transform="rotate(rotateDeg cx cy)"`:
 * `track` is the full sweep, `value` the filled part.
 */
export function ringArc(fraction: number): { track: string; value: string; rotateDeg: number } {
  const full = (KNOB_SWEEP_DEG / 360) * 100
  const filled = full * clamp01(fraction)
  return { track: `${r3(full)} 100`, value: `${r3(filled)} 100`, rotateDeg: KNOB_START_DEG }
}

/** Pointer line on the knob cap, from `from`·r to `to`·r along the value angle, projected. */
export function knobPointer(
  slab: SlabSpec,
  knob: KnobSpec,
  fraction: number,
  from = 0.25,
  to = 0.85,
): { x1: number; y1: number; x2: number; y2: number } {
  const a = (knobAngleDeg(fraction) * Math.PI) / 180
  const h = slab.thickness + knob.height
  const at = (k: number): Vec2 =>
    project(knob.u + k * knob.radius * Math.cos(a), knob.v + k * knob.radius * Math.sin(a), h, slab.origin)
  const [x1, y1] = at(from)
  const [x2, y2] = at(to)
  return { x1, y1, x2, y2 }
}

// ---------------------------------------------------------------------------
// Fader

export interface FaderSpec {
  /** Well rectangle on the top face, local coordinates (runs along u). */
  x: number
  y: number
  length: number
  width: number
  /** Inner-shadow offset of the recess, local units. */
  recess: number
  /** Cap footprint (square, local units) and height above the top face. */
  capSize: number
  capHeight: number
}

export interface FaderGeometry {
  /** Well rectangle in top-face local coordinates (draw inside `topFaceMatrix`). */
  well: { x: number; y: number; width: number; height: number }
  /** Inner-shadow rectangle, offset by `recess` and clipped to the well. */
  innerShadow: { x: number; y: number; width: number; height: number }
  /** Lit lower and right lip of the well, as a local path. */
  lip: string
  /** Cap centre in local coordinates. */
  capCenter: Vec2
  /** Projected cap box faces. */
  cap: { top: Quad; front: Quad; right: Quad }
}

/**
 * Fader well and cap. `fraction` 0..1 places the cap from the well's u-start
 * (0, no airflow) to its u-end (1, full airflow); out-of-range is clamped.
 */
export function faderGeometry(slab: SlabSpec, fader: FaderSpec, fraction: number): FaderGeometry {
  const { x, y, length, width, recess, capSize, capHeight } = fader
  const half = capSize / 2
  const travel = Math.max(0, length - capSize)
  const cu = x + half + travel * clamp01(fraction)
  const cv = y + width / 2
  const h0 = slab.thickness
  const h1 = h0 + capHeight
  const p = (u: number, v: number, h: number): Vec2 => project(u, v, h, slab.origin)
  const u0 = cu - half
  const u1 = cu + half
  const v0 = cv - half
  const v1 = cv + half
  return {
    well: { x, y, width: length, height: width },
    innerShadow: { x: x + recess, y: y + recess, width: length, height: width },
    lip: `M${r3(x)} ${r3(y + width)}H${r3(x + length)}V${r3(y)}`,
    capCenter: [cu, cv],
    cap: {
      top: [p(u0, v0, h1), p(u1, v0, h1), p(u1, v1, h1), p(u0, v1, h1)],
      front: [p(u0, v1, h1), p(u1, v1, h1), p(u1, v1, h0), p(u0, v1, h0)],
      right: [p(u1, v0, h1), p(u1, v1, h1), p(u1, v1, h0), p(u1, v0, h0)],
    },
  }
}

// ---------------------------------------------------------------------------
// Heat disc

/**
 * Transform that lays a square `size`×`size` element (HeatDisc's SVG) flat on
 * the top face, centred at local (cx, cy) with face radius `radius`.
 */
export function discMatrix(slab: SlabSpec, cx: number, cy: number, radius: number, size: number): Matrix {
  const k = (2 * radius) / size
  return multiply(topFaceMatrix(slab), multiply(translate(cx - radius, cy - radius), scale(k)))
}

export function discTransform(slab: SlabSpec, cx: number, cy: number, radius: number, size: number): string {
  return matrixAttr(discMatrix(slab, cx, cy, radius, size))
}

/** Crop-bracket corner paths (local) around a square of half-size `half` + `gap`, arm length `arm`. */
export function cropBrackets(cx: number, cy: number, half: number, gap: number, arm: number): string[] {
  const l = r3(cx - half - gap)
  const r = r3(cx + half + gap)
  const t = r3(cy - half - gap)
  const b = r3(cy + half + gap)
  return [
    `M${l} ${r3(t + arm)}V${t}H${r3(l + arm)}`,
    `M${r3(r - arm)} ${t}H${r}V${r3(t + arm)}`,
    `M${r} ${r3(b - arm)}V${b}H${r3(r - arm)}`,
    `M${r3(l + arm)} ${b}H${l}V${r3(b - arm)}`,
  ]
}

// ---------------------------------------------------------------------------
// Layout from console-a.svg (the chosen sketch, docs/art-direction/SELECTION.md)

export const CONSOLE_SLAB: SlabSpec = { width: 560, depth: 420, thickness: 30, origin: [470, 230] }

export const CONSOLE_LAYOUT = {
  slab: CONSOLE_SLAB,
  cornerRadius: 18,
  backStrip: { x: 22, y: 22, width: 516, height: 92, rx: 10 },
  readout: { x: 38, y: 38, width: 118, height: 60, rx: 4 },
  ringRadius: 35,
  knobA: { u: 218, v: 66, radius: 24, height: 20 } satisfies KnobSpec,
  knobB: { u: 330, v: 66, radius: 24, height: 20 } satisfies KnobSpec,
  fader: { x: 398, y: 57, length: 130, width: 18, recess: 5, capSize: 22, capHeight: 16 } satisfies FaderSpec,
  disc: { cx: 292, cy: 274, radius: 112, rim: 116, bezel: 123, glow: 158 },
  brackets: { half: 116, gap: 12, arm: 18 },
} as const
