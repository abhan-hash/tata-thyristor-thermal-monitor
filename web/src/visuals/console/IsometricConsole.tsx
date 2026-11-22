import { animate, useMotionValue, useMotionValueEvent, useReducedMotion, type MotionValue } from 'motion/react'
import { useId, useMemo, useRef, useState, type SVGProps } from 'react'
import { hottestTj } from '../../domain/derive'
import { formatTempC, formatValue, TEMP_C_SPEC } from '../../domain/format'
import { MODEL_PARAMS } from '../../domain/thresholds'
import type { ChannelId, DriveFrame, Status } from '../../domain/types'
import { useFrame, useLiveValue } from '../../data/hooks'
import { StatusIcon } from '../../kit/icons/StatusIcon'
import { STATUS_LABEL } from '../../kit/StatusChip'
import { contourRingPath } from '../../kit/contourPath'
import { discStatus, HeatDisc } from '../heat/HeatDisc'
import { HeatDefs, heatDefIds, svgUrl } from '../heat/HeatDefs'
import { clampHeatPosition, heatMix, heatPosition } from '../heat/heatRamp'
import { useMotionSource, type NumberSource } from '../heat/useMotionSource'
import {
  ambientFraction,
  armatureFraction,
  armaturePct,
  consoleLabel,
  DISC_TICKS,
  discScaleAngle,
  faderFraction,
  pctText,
} from './bindings'
import {
  CONSOLE_LAYOUT,
  contactShadow,
  cropBrackets,
  discTransform,
  faderGeometry,
  isoMatrix,
  knobPointer,
  knobStack,
  matrixAttr,
  pointsAttr,
  ringArc,
  topFaceMatrix,
  type FaderGeometry,
  type KnobSpec,
} from './iso'
import { slabSides } from './slabMesh'

/**
 * Isometric_Console (Requirement 16), built from sketch `console-a`
 * (docs/art-direction/SELECTION.md): a matte slab in the fixed 30° projection
 * with a live HeatDisc on its top face, two knobs and an airflow fader on the
 * back strip, and a readout plate with the hottest channel.
 *
 * - Disc ← hottest Tj (16.2). Knob A ring ← armature % of rated, knob B ring
 *   ← ambient (16.3). Fader ← airflow fraction (16.4).
 * - Every live value is a NumberSource: MotionValues from the store are
 *   written straight to SVG attributes, so 10 Hz frames never re-render React.
 *   Plain numbers work too (kit gallery, tests).
 * - Turbulence and blur sit only on static layers (Requirement 40.7).
 * - The status word and icon on the readout plate carry the severity, never
 *   colour alone; the root has a live accessible name.
 */
export interface IsometricConsoleProps {
  /** Hottest healthy Tj, °C. NaN shows the fault treatment. */
  hottest: NumberSource
  /** Armature current, A. */
  armature: NumberSource
  /** Ambient temperature, °C. */
  ambient: NumberSource
  /** Airflow fraction 0..1 (store `live.airflow`). */
  airflow: NumberSource
  /** Channel that holds the hottest Tj, shown on the readout plate. */
  hottestChannel?: ChannelId | null
  /** Rated armature current (A), the 100 % reference for knob A. */
  ratedCurrent?: number
  /** Small caps label at the front edge of the slab. Default "DC DRIVE". */
  driveLabel?: string
  /** Seed for the disc core outline. Default 5. */
  seed?: number
  /** Rendered width; height follows the aspect. Default "100%". */
  width?: number | string
  className?: string
}

const L = CONSOLE_LAYOUT
const SLAB = L.slab
const TOP = matrixAttr(topFaceMatrix(SLAB))
const GROUND = matrixAttr(isoMatrix(SLAB.origin))
const SIDES = slabSides(SLAB, L.cornerRadius)
const SHADOW = contactShadow(SLAB)

/** Screen-space viewBox: slab, knobs and contact shadow with a small margin. */
export const CONSOLE_VIEWBOX = { x: 70, y: 168, width: 960, height: 612 } as const

/* HeatDisc draws its face at r = 94 on a 240-unit viewBox; scale that face to
 * the layout's disc radius on the top face. */
const DISC_VIEW = 240
const DISC_FACE_R = 94
const DISC_C = DISC_VIEW / 2
const DISC_HALF = (L.disc.radius * DISC_C) / DISC_FACE_R
const DISC_T = discTransform(SLAB, L.disc.cx, L.disc.cy, DISC_HALF, DISC_VIEW)

const TWEEN = { duration: 0.3, ease: [0.23, 1, 0.32, 1] } as const

/* Matte material, from semantic tokens only. */
const MAT = {
  top: 'var(--surface-raised)',
  topLit: 'color-mix(in srgb, var(--surface-raised) 95%, var(--text-primary))',
  topShade: 'color-mix(in srgb, var(--surface-raised) 88%, black)',
  strip: 'color-mix(in srgb, var(--surface-panel) 82%, black)',
  well: 'color-mix(in srgb, var(--surface-sunken) 70%, black)',
  sideLit: 'color-mix(in srgb, var(--surface-raised) 94%, var(--text-primary))',
  sideDark: 'color-mix(in srgb, var(--surface-sunken) 88%, black)',
  hi: 'var(--text-primary)',
} as const

const sideFill = (shade: number): string =>
  `color-mix(in srgb, ${MAT.sideDark} ${String(Math.round(shade * 100))}%, ${MAT.sideLit})`

const LABEL = {
  fontFamily: 'var(--font-family-base)',
  fontWeight: 'var(--font-label-weight)',
  fontStretch: 'var(--font-label-width)',
  letterSpacing: '0.32em',
  textTransform: 'uppercase',
} as const
const NUM = {
  fontFamily: 'var(--font-family-base)',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
} as const
const DISPLAY = {
  fontFamily: 'var(--font-family-base)',
  fontWeight: 'var(--font-display-weight)',
  fontStretch: 'var(--font-display-width)',
  letterSpacing: '0.04em',
} as const

const STATUS_COLOR: Readonly<Record<Status, string>> = {
  normal: 'var(--status-normal)',
  warning: 'var(--status-warning)',
  critical: 'var(--status-critical-text)',
  fault: 'var(--status-fault)',
}

/**
 * Colour at the disc's outer edge (SELECTION.md carry-forward): never pale.
 * heat-4 up to 90 °C (position 4), rising to heat-5 by the warning limit.
 */
export function discEdgeColor(position: number): string {
  const p = clampHeatPosition(position)
  return heatMix(4 + Math.min(1, Math.max(0, (p - 4) / 2)))
}

/** Colour of the bright mid-radius band: about two stops cooler than the disc position. */
export function discMidColor(position: number): string {
  return heatMix(Math.max(1, clampHeatPosition(position) - 2.4))
}

/** Knob B ring colour: ambient is a temperature, so it follows the heat scale (floor at stop 1). */
function ambientRingColor(ambientC: number): string {
  return heatMix(Math.max(1, heatPosition(ambientC)))
}

const KNOB_A_COLOR = 'var(--accent)'

/**
 * Overlay on the HeatDisc face (fractions of the face radius): a soft bright
 * band at mid-radius and a darkening outer edge, so the brightest band sits
 * mid-disc like the reference rather than at the rim.
 */
const DISC_PROFILE: readonly { offset: number; opacity: number; color: (p: number) => string }[] = [
  { offset: 0.44, opacity: 0, color: discMidColor },
  { offset: 0.64, opacity: 0.55, color: discMidColor },
  { offset: 0.8, opacity: 0.4, color: discMidColor },
  { offset: 0.89, opacity: 0, color: discEdgeColor },
  { offset: 0.95, opacity: 0.85, color: discEdgeColor },
  { offset: 1, opacity: 1, color: (p) => discEdgeColor(p + 1) },
]

function useIds() {
  const raw = useId()
  return useMemo(() => {
    const defs = heatDefIds(raw)
    const b = defs.linear.replace(/-linear$/, '')
    return {
      defs,
      topGrad: `${b}-top`,
      sideSheen: `${b}-side-sheen`,
      bevel: `${b}-bevel`,
      topClip: `${b}-top-clip`,
      wellClip: `${b}-well-clip`,
      knobSide: `${b}-knob-side`,
      knobTop: `${b}-knob-top`,
      edge: `${b}-disc-edge`,
      shadowWide: `${b}-shadow-wide`,
      shadowTight: `${b}-shadow-tight`,
      blur6: `${b}-blur6`,
      mottle: `${b}-mottle`,
    }
  }, [raw])
}
type Ids = ReturnType<typeof useIds>

function ConsoleDefs({ ids }: { ids: Ids }) {
  const w = SLAB.width
  const d = SLAB.depth
  return (
    <defs>
      <linearGradient id={ids.topGrad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2={d}>
        <stop offset="0" style={{ stopColor: MAT.topShade }} />
        <stop offset="0.55" style={{ stopColor: MAT.top }} />
        <stop offset="1" style={{ stopColor: MAT.topLit }} />
      </linearGradient>
      {/* Light falls off from the left end of the slab toward the right corner. */}
      <linearGradient id={ids.sideSheen} gradientUnits="userSpaceOnUse" x1="100" y1="0" x2="960" y2="0">
        <stop offset="0" style={{ stopColor: MAT.hi }} stopOpacity={0.05} />
        <stop offset="0.45" style={{ stopColor: MAT.hi }} stopOpacity={0} />
        <stop offset="1" style={{ stopColor: 'black' }} stopOpacity={0.3} />
      </linearGradient>
      <linearGradient id={ids.bevel} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2={d}>
        <stop offset="0" style={{ stopColor: MAT.hi }} stopOpacity={0.05} />
        <stop offset="0.55" style={{ stopColor: MAT.hi }} stopOpacity={0.1} />
        <stop offset="1" style={{ stopColor: MAT.hi }} stopOpacity={0.34} />
      </linearGradient>
      <linearGradient id={ids.knobSide} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--surface-raised) 80%, black)' }} />
        <stop offset="0.28" style={{ stopColor: 'color-mix(in srgb, var(--surface-raised) 82%, var(--text-primary))' }} />
        <stop offset="0.5" style={{ stopColor: 'color-mix(in srgb, var(--surface-raised) 92%, var(--text-primary))' }} />
        <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--surface-sunken) 70%, black)' }} />
      </linearGradient>
      <radialGradient id={ids.knobTop} cx="0.4" cy="0.32" r="0.78">
        <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--surface-raised) 74%, var(--text-primary))' }} />
        <stop offset="0.55" style={{ stopColor: 'color-mix(in srgb, var(--surface-raised) 90%, var(--text-primary))' }} />
        <stop offset="1" style={{ stopColor: 'color-mix(in srgb, var(--surface-raised) 80%, black)' }} />
      </radialGradient>
      <clipPath id={ids.topClip}>
        <rect width={w} height={d} rx={L.cornerRadius} />
      </clipPath>
      <clipPath id={ids.wellClip}>
        <rect x={L.fader.x} y={L.fader.y} width={L.fader.length} height={L.fader.width} rx={2} />
      </clipPath>
      <filter id={ids.shadowWide} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="26" />
      </filter>
      <filter id={ids.shadowTight} x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter id={ids.blur6} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      {/* Low-frequency unevenness under the fine grain: the matte, cast look. */}
      <filter id={ids.mottle} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={3} seed={11} />
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.7" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
    </defs>
  )
}

/** Contact shadow and the extruded rounded sides (static). */
function SlabBody({ ids }: { ids: Ids }) {
  const w = SLAB.width
  const d = SLAB.depth
  return (
    <g data-part="slab-body">
      <ellipse
        data-part="contact-shadow"
        cx={SHADOW.cx}
        cy={SHADOW.cy}
        rx={SHADOW.rx}
        ry={SHADOW.ry}
        opacity={0.45}
        filter={svgUrl(ids.shadowWide)}
        style={{ fill: 'black' }}
      />
      <g transform={GROUND}>
        <rect x={34} y={18} width={w + 10} height={d + 14} rx={30} opacity={0.8} filter={svgUrl(ids.shadowWide)} style={{ fill: 'black' }} />
        <rect x={4} y={4} width={w} height={d} rx={L.cornerRadius} opacity={0.9} filter={svgUrl(ids.shadowTight)} style={{ fill: 'black' }} />
      </g>
      <path d={SIDES.silhouette} style={{ fill: MAT.sideDark }} />
      {(['front', 'right'] as const).map((face) => (
        <g key={face} data-face={face}>
          {SIDES.segments
            .filter((s) => s.face === face)
            .map((s, i) => {
              const fill = sideFill(s.shade)
              return <polygon key={i} points={s.points} strokeWidth={0.6} strokeLinejoin="round" style={{ fill, stroke: fill }} />
            })}
        </g>
      ))}
      <path d={SIDES.silhouette} style={{ fill: svgUrl(ids.sideSheen) }} />
      {/* Ground line: the darkest seam where the slab meets its shadow. */}
      <path d={SIDES.groundEdge} fill="none" strokeWidth={1.2} strokeOpacity={0.8} style={{ stroke: 'black' }} />
    </g>
  )
}

/** Faint topographic rings on the top face, echoing the reference slab. */
const TOP_CONTOURS = [0, 1, 2, 3, 4, 5].map((i) =>
  contourRingPath({ cx: L.disc.cx + 6, cy: L.disc.cy - 4, r: 150 + i * 26, wobble: 0.07 + i * 0.012, phase: i * 0.9 }),
)

function KnobRing({ knob, source, fraction, color }: {
  knob: KnobSpec
  source: MotionValue<number>
  fraction: (v: number) => number
  color: (v: number) => string
}) {
  const value = useRef<SVGCircleElement>(null)
  const halo = useRef<SVGCircleElement>(null)
  const apply = (v: number) => {
    const arc = ringArc(fraction(v))
    const c = color(v)
    for (const el of [value.current, halo.current]) {
      el?.setAttribute('stroke-dasharray', arc.value)
      el?.style.setProperty('stroke', c)
    }
  }
  useMotionValueEvent(source, 'change', apply)
  const v0 = source.get()
  const arc = ringArc(fraction(v0))
  const rot = `rotate(${String(arc.rotateDeg)} ${String(knob.u)} ${String(knob.v)})`
  const common = { cx: knob.u, cy: knob.v, r: L.ringRadius, pathLength: 100, fill: 'none', transform: rot }
  return (
    <g data-part="knob-ring">
      <circle {...common} strokeWidth={2.4} strokeDasharray={ringArc(1).track} strokeLinecap="round" style={{ stroke: 'color-mix(in srgb, var(--surface-sunken) 60%, black)' }} />
      <circle {...common} r={L.ringRadius + 3.2} strokeWidth={0.6} strokeOpacity={0.12} style={{ stroke: MAT.hi }} />
      <circle
        ref={halo}
        {...common}
        data-part="ring-halo"
        strokeWidth={7}
        strokeOpacity={0.28}
        strokeDasharray={arc.value}
        style={{ stroke: color(v0) }}
      />
      <circle
        ref={value}
        {...common}
        data-part="ring-arc"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeDasharray={arc.value}
        style={{ stroke: color(v0) }}
      />
    </g>
  )
}

function KnobBody({ knob, source, fraction, ids }: {
  knob: KnobSpec
  source: MotionValue<number>
  fraction: (v: number) => number
  ids: Ids
}) {
  const s = useMemo(() => knobStack(SLAB, knob), [knob])
  const pointer = useRef<SVGLineElement>(null)
  useMotionValueEvent(source, 'change', (v) => {
    const p = knobPointer(SLAB, knob, fraction(v))
    const el = pointer.current
    if (!el) return
    el.setAttribute('x1', p.x1.toFixed(2))
    el.setAttribute('y1', p.y1.toFixed(2))
    el.setAttribute('x2', p.x2.toFixed(2))
    el.setAttribute('y2', p.y2.toFixed(2))
  })
  const p = knobPointer(SLAB, knob, fraction(source.get()))
  return (
    <g data-part="knob">
      <ellipse cx={s.shadow.cx} cy={s.shadow.cy + 4} rx={s.shadow.rx * 1.08} ry={s.shadow.ry * 1.1} opacity={0.75} filter={svgUrl(ids.blur6)} style={{ fill: 'black' }} />
      <ellipse cx={s.base.cx} cy={s.base.cy} rx={s.base.rx} ry={s.base.ry} style={{ fill: MAT.well }} />
      <path d={s.side} style={{ fill: svgUrl(ids.knobSide) }} />
      <path d={s.sideEdge} fill="none" strokeOpacity={0.6} style={{ stroke: 'black' }} />
      <ellipse cx={s.top.cx} cy={s.top.cy} rx={s.top.rx} ry={s.top.ry} style={{ fill: svgUrl(ids.knobTop) }} />
      <ellipse cx={s.top.cx} cy={s.top.cy} rx={s.top.rx - 0.6} ry={s.top.ry - 0.6} fill="none" strokeOpacity={0.18} style={{ stroke: MAT.hi }} />
      <ellipse cx={s.inner.cx} cy={s.inner.cy} rx={s.inner.rx} ry={s.inner.ry} fill="none" strokeOpacity={0.35} style={{ stroke: 'black' }} />
      <ellipse cx={s.inner.cx} cy={s.inner.cy + 0.8} rx={s.inner.rx} ry={s.inner.ry} fill="none" strokeOpacity={0.06} style={{ stroke: MAT.hi }} />
      <line
        ref={pointer}
        data-part="knob-pointer"
        x1={p.x1}
        y1={p.y1}
        x2={p.x2}
        y2={p.y2}
        strokeWidth={2}
        strokeLinecap="round"
        style={{ stroke: 'var(--text-primary)' }}
      />
    </g>
  )
}

function capAttrs(g: FaderGeometry) {
  const t = g.cap.top
  const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const
  const i0 = mid(t[0], t[3])
  const i1 = mid(t[1], t[2])
  const c0 = mid(i0, i1)
  return {
    top: pointsAttr(t),
    front: pointsAttr(g.cap.front),
    right: pointsAttr(g.cap.right),
    // Index line across the cap (along v), through its centre.
    index: { x1: mid(t[0], t[1])[0] * 0.5 + c0[0] * 0.5, y1: mid(t[0], t[1])[1] * 0.5 + c0[1] * 0.5, x2: mid(t[3], t[2])[0] * 0.5 + c0[0] * 0.5, y2: mid(t[3], t[2])[1] * 0.5 + c0[1] * 0.5 },
    shadowX: g.capCenter[0] - L.fader.capSize / 2 + 3,
  }
}

function FaderCap({ source }: { source: MotionValue<number> }) {
  const refs = useRef<{ top: SVGPolygonElement | null; front: SVGPolygonElement | null; right: SVGPolygonElement | null; index: SVGLineElement | null }>({
    top: null,
    front: null,
    right: null,
    index: null,
  })
  useMotionValueEvent(source, 'change', (v) => {
    const a = capAttrs(faderGeometry(SLAB, L.fader, faderFraction(v)))
    const r = refs.current
    r.top?.setAttribute('points', a.top)
    r.front?.setAttribute('points', a.front)
    r.right?.setAttribute('points', a.right)
    if (r.index) {
      r.index.setAttribute('x1', a.index.x1.toFixed(2))
      r.index.setAttribute('y1', a.index.y1.toFixed(2))
      r.index.setAttribute('x2', a.index.x2.toFixed(2))
      r.index.setAttribute('y2', a.index.y2.toFixed(2))
    }
  })
  const a = capAttrs(faderGeometry(SLAB, L.fader, faderFraction(source.get())))
  return (
    <g data-part="fader-cap">
      <polygon ref={(el) => { refs.current.front = el }} points={a.front} style={{ fill: 'color-mix(in srgb, var(--surface-raised) 86%, var(--text-primary))' }} />
      <polygon ref={(el) => { refs.current.right = el }} points={a.right} style={{ fill: 'color-mix(in srgb, var(--surface-sunken) 80%, black)' }} />
      <polygon
        ref={(el) => { refs.current.top = el }}
        points={a.top}
        strokeOpacity={0.22}
        strokeWidth={0.8}
        style={{ fill: 'color-mix(in srgb, var(--surface-raised) 72%, var(--text-primary))', stroke: MAT.hi }}
      />
      <line
        ref={(el) => { refs.current.index = el }}
        {...a.index}
        strokeWidth={1.6}
        strokeLinecap="round"
        style={{ stroke: 'var(--fader-cap-index)' }}
      />
    </g>
  )
}

/** Cap shadow in the well (top-face local coordinates). */
function FaderShadow({ source }: { source: MotionValue<number> }) {
  const ref = useRef<SVGRectElement>(null)
  useMotionValueEvent(source, 'change', (v) => {
    ref.current?.setAttribute('x', capAttrs(faderGeometry(SLAB, L.fader, faderFraction(v))).shadowX.toFixed(2))
  })
  const x = capAttrs(faderGeometry(SLAB, L.fader, faderFraction(source.get()))).shadowX
  return (
    <rect
      ref={ref}
      x={x}
      y={L.fader.y + 1}
      width={L.fader.capSize + 8}
      height={L.fader.width + 6}
      rx={3}
      opacity={0.7}
      style={{ fill: 'black' }}
    />
  )
}

/** Live text node: textContent follows `source` through `format`. */
function LiveText({ source, formatter, ...rest }: { source: MotionValue<number>; formatter: (v: number) => string } & SVGProps<SVGTextElement>) {
  const ref = useRef<SVGTextElement>(null)
  useMotionValueEvent(source, 'change', (v) => {
    const el = ref.current
    if (el) el.textContent = formatter(v)
  })
  return (
    <text ref={ref} {...rest}>
      {formatter(source.get())}
    </text>
  )
}

function RimScale({ source }: { source: MotionValue<number> }) {
  const { cx, cy } = L.disc
  const index = useRef<SVGGElement>(null)
  useMotionValueEvent(source, 'change', (v) => {
    const el = index.current
    if (!el) return
    el.setAttribute('transform', `rotate(${discScaleAngle(v).toFixed(2)} ${String(cx)} ${String(cy)})`)
    el.setAttribute('opacity', Number.isFinite(v) ? '1' : '0')
  })
  const v0 = source.get()
  const tick = (deg: number, r0: number, r1: number) => {
    const a = (deg * Math.PI) / 180
    return { x1: cx + r0 * Math.cos(a), y1: cy + r0 * Math.sin(a), x2: cx + r1 * Math.cos(a), y2: cy + r1 * Math.sin(a) }
  }
  const rimOuter = L.disc.bezel
  return (
    <g data-part="rim-scale">
      {DISC_TICKS.map((t) => {
        const deg = discScaleAngle(t.tempC)
        const a = (deg * Math.PI) / 180
        const lr = rimOuter + 7
        return (
          <g key={t.id} data-tick={t.id}>
            <line {...tick(deg, L.disc.rim + 1.5, rimOuter + 1)} strokeWidth={1.2} strokeOpacity={0.75} style={{ stroke: 'var(--disc-rim)' }} />
            <text
              x={cx + lr * Math.cos(a)}
              y={cy + lr * Math.sin(a) + 2}
              fontSize={5}
              opacity={0.85}
              style={{ ...LABEL, letterSpacing: '0.24em', fill: 'var(--disc-rim)' }}
            >
              {`${t.label} ${String(t.tempC)}`}
            </text>
          </g>
        )
      })}
      <g
        ref={index}
        data-part="rim-index"
        transform={`rotate(${discScaleAngle(v0).toFixed(2)} ${String(cx)} ${String(cy)})`}
        opacity={Number.isFinite(v0) ? 1 : 0}
      >
        <path
          d={`M${String(cx + L.disc.rim + 1)} ${String(cy)}l6.5 -3.2v6.4Z`}
          style={{ fill: 'var(--disc-marker)' }}
        />
      </g>
    </g>
  )
}

export function IsometricConsole({
  hottest,
  armature,
  ambient,
  airflow,
  hottestChannel = null,
  ratedCurrent = MODEL_PARAMS.rated_current,
  driveLabel = 'DC DRIVE',
  seed = 5,
  width = '100%',
  className,
}: IsometricConsoleProps) {
  const ids = useIds()
  const hot = useMotionSource(hottest)
  const arm = useMotionSource(armature)
  const amb = useMotionSource(ambient)
  const air = useMotionSource(airflow)
  const reduceMotion = useReducedMotion() === true
  const position = useMotionValue(heatPosition(hot.get()))
  const [status, setStatus] = useState<Status>(() => discStatus(hot.get()))
  const svgRef = useRef<SVGSVGElement>(null)
  const edgeStops = useRef<(SVGStopElement | null)[]>([])

  const label = () =>
    consoleLabel({
      hottest: hot.get(),
      channel: hottestChannel,
      status: discStatus(hot.get()),
      armatureA: arm.get(),
      ratedA: ratedCurrent,
      ambientC: amb.get(),
      airflow: air.get(),
    })
  const relabel = () => svgRef.current?.setAttribute('aria-label', label())

  useMotionValueEvent(hot, 'change', (v) => {
    setStatus(discStatus(v))
    relabel()
    const target = heatPosition(v)
    if (reduceMotion || !Number.isFinite(v)) position.jump(target)
    else void animate(position, target, TWEEN)
  })
  useMotionValueEvent(position, 'change', (p) => {
    edgeStops.current.forEach((el, i) => {
      const st = DISC_PROFILE[i]
      if (el && st) el.style.setProperty('stop-color', st.color(p))
    })
  })
  useMotionValueEvent(arm, 'change', relabel)
  useMotionValueEvent(amb, 'change', relabel)
  useMotionValueEvent(air, 'change', relabel)

  const armFraction = (v: number) => armatureFraction(v, ratedCurrent)
  const p0 = position.get()
  const fault = status === 'fault'
  const { cx, cy } = L.disc
  const f = L.fader
  const vb = CONSOLE_VIEWBOX

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={label()}
      viewBox={`${String(vb.x)} ${String(vb.y)} ${String(vb.width)} ${String(vb.height)}`}
      width={width}
      data-status={status}
      className={className}
      style={{ display: 'block', height: 'auto', maxWidth: '100%' }}
    >
      <HeatDefs ids={ids.defs} />
      <ConsoleDefs ids={ids} />
      <SlabBody ids={ids} />

      {/* Top face, laid out in local (u, v) coordinates. */}
      <g data-face="top" transform={TOP}>
        <rect width={SLAB.width} height={SLAB.depth} rx={L.cornerRadius} style={{ fill: svgUrl(ids.topGrad) }} />
        <g clipPath={svgUrl(ids.topClip)}>
          {/* Static matte texture: broad mottle plus fine grain. */}
          <rect width={SLAB.width} height={SLAB.depth} opacity={0.035} filter={svgUrl(ids.mottle)} style={{ fill: MAT.hi }} />
          <rect data-part="grain" width={SLAB.width} height={SLAB.depth} opacity={0.075} filter={svgUrl(ids.defs.grain)} style={{ fill: MAT.hi }} />
          <g fill="none" strokeWidth={0.7} strokeOpacity={0.05} style={{ stroke: MAT.hi }}>
            {TOP_CONTOURS.map((d, i) => (
              <path key={i} d={d} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          {/* Disc bezel: a recessed well with a faint lit lip. */}
          <circle cx={cx} cy={cy} r={L.disc.bezel + 4} opacity={0.6} filter={svgUrl(ids.blur6)} style={{ fill: 'black' }} />
          <circle cx={cx} cy={cy} r={L.disc.bezel} style={{ fill: MAT.well }} />
          <circle cx={cx + 0.8} cy={cy + 0.8} r={L.disc.bezel} fill="none" strokeOpacity={0.1} style={{ stroke: MAT.hi }} />
          <RimScale source={hot} />
        </g>

        {/* Back strip: recessed control bay. */}
        <rect x={L.backStrip.x} y={L.backStrip.y} width={L.backStrip.width} height={L.backStrip.height} rx={L.backStrip.rx} style={{ fill: MAT.strip }} />
        <path d="M22 112V32a10 10 0 0 1 10-10H528" fill="none" strokeWidth={2} strokeOpacity={0.7} style={{ stroke: 'black' }} />
        <path d="M32 114H528a10 10 0 0 0 10-10V32" fill="none" strokeOpacity={0.1} vectorEffect="non-scaling-stroke" style={{ stroke: MAT.hi }} />

        {/* Readout plate: hottest channel, tabular °C and the status word. */}
        <g data-part="readout">
          <rect x={L.readout.x} y={L.readout.y} width={L.readout.width} height={L.readout.height} rx={L.readout.rx} strokeOpacity={0.07} style={{ fill: MAT.well, stroke: MAT.hi }} />
          <text x={46} y={50} fontSize={6} style={{ ...LABEL, fill: 'var(--text-muted)' }}>
            {hottestChannel === null ? 'HOTTEST TJ' : `HOTTEST · T${String(hottestChannel)}`}
          </text>
          <LiveText
            data-part="readout-value"
            source={hot}
            formatter={(v) => formatValue(v, TEMP_C_SPEC)}
            x={124}
            y={76}
            fontSize={21}
            textAnchor="end"
            style={{ ...NUM, fill: fault ? 'var(--status-fault)' : 'var(--accent-strong)' }}
          />
          {/* The placeholder carries no unit (Requirement 21.1). */}
          {!fault && (
            <text data-part="readout-unit" x={127} y={76} fontSize={8.5} style={{ ...NUM, fill: 'var(--text-secondary)' }}>
              °C
            </text>
          )}
          <g transform="translate(46 85)" style={{ color: STATUS_COLOR[status] }}>
            <g transform="scale(0.5)">
              <StatusIcon status={status} size={16} />
            </g>
            <text data-part="readout-status" x={11} y={6.6} fontSize={7} style={{ ...LABEL, letterSpacing: '0.2em', fill: STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]}
            </text>
          </g>
        </g>

        <KnobRing knob={L.knobA} source={arm} fraction={armFraction} color={() => KNOB_A_COLOR} />
        <KnobRing knob={L.knobB} source={amb} fraction={ambientFraction} color={ambientRingColor} />
        <LiveText
          source={arm}
          formatter={(v) => `ARMATURE ${pctText(armaturePct(v, ratedCurrent))}`}
          x={L.knobA.u}
          y={110}
          fontSize={5.5}
          textAnchor="middle"
          style={{ ...LABEL, fill: 'var(--text-muted)' }}
        />
        <LiveText
          source={amb}
          formatter={(v) => `AMBIENT ${formatTempC(v).trim()}`}
          x={L.knobB.u}
          y={110}
          fontSize={5.5}
          textAnchor="middle"
          style={{ ...LABEL, fill: 'var(--text-muted)' }}
        />

        {/* Fader well: recess, inner shadow and lit lip. */}
        <g data-part="fader-well">
          <rect x={f.x} y={f.y} width={f.length} height={f.width} rx={2} style={{ fill: 'color-mix(in srgb, var(--surface-sunken) 40%, black)' }} />
          <g clipPath={svgUrl(ids.wellClip)}>
            <rect x={f.x + f.recess} y={f.y + f.recess} width={f.length} height={f.width} style={{ fill: 'color-mix(in srgb, var(--surface-sunken) 85%, var(--text-primary))' }} />
            <line x1={f.x + 6} y1={f.y + f.width / 2 + 1} x2={f.x + f.length - 6} y2={f.y + f.width / 2 + 1} strokeWidth={2} style={{ stroke: 'black' }} />
            <FaderShadow source={air} />
          </g>
          <path d={`M${String(f.x)} ${String(f.y + f.width)}H${String(f.x + f.length)}V${String(f.y)}`} fill="none" strokeOpacity={0.16} vectorEffect="non-scaling-stroke" style={{ stroke: MAT.hi }} />
          <g strokeWidth={0.6} strokeOpacity={0.5} style={{ stroke: 'var(--text-muted)' }}>
            {Array.from({ length: 11 }, (_, i) => {
              const x = f.x + f.capSize / 2 + ((f.length - f.capSize) * i) / 10
              return <line key={i} x1={x} y1={f.y + f.width + 4} x2={x} y2={f.y + f.width + (i % 5 === 0 ? 9 : 6.5)} />
            })}
          </g>
          {/* Labels sit in front of the well, where the standing cap never covers them. */}
          <text x={f.x + f.capSize / 2} y={f.y + f.width + 17} fontSize={5} textAnchor="middle" style={{ ...NUM, fill: 'var(--text-muted)' }}>
            0
          </text>
          <LiveText
            data-part="airflow-value"
            source={air}
            formatter={(v) => `AIRFLOW ${pctText(Number.isFinite(v) ? v * 100 : Number.NaN)}`}
            x={f.x + f.length / 2}
            y={f.y + f.width + 17}
            fontSize={5.5}
            textAnchor="middle"
            style={{ ...LABEL, fill: 'var(--text-secondary)' }}
          />
          <text x={f.x + f.length - f.capSize / 2} y={f.y + f.width + 17} fontSize={5} textAnchor="middle" style={{ ...NUM, fill: 'var(--text-muted)' }}>
            100
          </text>
        </g>

        {/* Micro-labels and the wordmark. */}
        <text transform="translate(50 356) rotate(-90)" fontSize={23} opacity={0.9} style={{ ...DISPLAY, fill: 'var(--accent)' }}>
          THERMOSENSE
        </text>
        <text x={cx} y={412} fontSize={6} textAnchor="middle" style={{ ...LABEL, fill: 'var(--text-secondary)' }}>
          JUNCTION · HOTTEST TJ
        </text>
        <text x={436} y={412} fontSize={6} textAnchor="end" style={{ ...LABEL, fill: 'var(--text-muted)' }}>
          {driveLabel}
        </text>
        <g data-part="crop-brackets" fill="none" strokeWidth={0.9} vectorEffect="non-scaling-stroke" style={{ stroke: 'var(--text-muted)' }}>
          {cropBrackets(cx, cy, L.brackets.half, L.brackets.gap, L.brackets.arm).map((d, i) => (
            <path key={i} d={d} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        {/* 1 px bevel on the top edge, brightest toward the lit front edges. */}
        <rect data-part="bevel" width={SLAB.width} height={SLAB.depth} rx={L.cornerRadius} fill="none" vectorEffect="non-scaling-stroke" style={{ stroke: svgUrl(ids.bevel) }} />
      </g>
      <path d={SIDES.topEdge} fill="none" strokeWidth={1} strokeOpacity={0.2} style={{ stroke: MAT.hi }} />

      {/* Projected HeatDisc on the top face, with the console's edge darkening. */}
      <g data-part="disc" transform={DISC_T}>
        <HeatDisc tj={hot} seed={seed} size={DISC_VIEW} brackets={false} label="Hottest junction temperature" />
        {!fault && (
          <circle cx={DISC_C} cy={DISC_C} r={DISC_FACE_R} data-part="disc-edge" style={{ fill: svgUrl(ids.edge) }} pointerEvents="none" />
        )}
      </g>
      {/* Mid band and edge stops are written from the tweened heat position. */}
      <defs>
        <radialGradient id={ids.edge} cx="0.5" cy="0.5" r="0.5">
          {DISC_PROFILE.map((st, i) => (
            <stop
              key={i}
              ref={(el) => {
                edgeStops.current[i] = el
              }}
              offset={st.offset}
              stopOpacity={st.opacity}
              style={{ stopColor: st.color(p0) }}
            />
          ))}
        </radialGradient>
      </defs>

      <KnobBody knob={L.knobA} source={arm} fraction={armFraction} ids={ids} />
      <KnobBody knob={L.knobB} source={amb} fraction={ambientFraction} ids={ids} />
      <FaderCap source={air} />
    </svg>
  )
}

/** Channel id holding the hottest healthy Tj, or null. */
export function hottestChannelOf(frame: DriveFrame | null): ChannelId | null {
  if (frame === null) return null
  const t = hottestTj(frame)
  if (!Number.isFinite(t)) return null
  return frame.thyristors.find((ch) => ch.sensor_healthy && ch.tj_estimated === t)?.id ?? null
}

export type LiveIsometricConsoleProps = Omit<IsometricConsoleProps, 'hottest' | 'armature' | 'ambient' | 'airflow' | 'hottestChannel'>

/** IsometricConsole bound to the TelemetryStore's live values (inside a TelemetryProvider). */
export function LiveIsometricConsole(props: LiveIsometricConsoleProps) {
  const hottest = useLiveValue('hottest')
  const armature = useLiveValue('armature')
  const ambient = useLiveValue('ambient')
  const airflow = useLiveValue('airflow')
  const channel = useFrame(hottestChannelOf)
  return (
    <IsometricConsole
      {...props}
      hottest={hottest}
      armature={armature}
      ambient={ambient}
      airflow={airflow}
      hottestChannel={channel}
    />
  )
}
