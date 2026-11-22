import { line } from 'd3-shape'
import { animate, motion, useMotionValue } from 'motion/react'
import { memo, useLayoutEffect, useRef, type ReactNode } from 'react'
import { MINUS_SIGN } from '../domain/format'
import { EASE_OUT } from '../motion/tokens'
import { useReducedMotion } from '../motion/useReducedMotion'
import type { LinearScale } from './ChartFrame'
import type { ChartPoints } from './series'

/** Trace and marker classes. Colours come from semantic tokens only. */
export const traceClass = {
  tj: '[fill:none] [stroke:var(--accent)] [stroke-width:2px] [stroke-linejoin:round]',
  heatsink: '[fill:none] [stroke:var(--text-secondary)] [stroke-width:1.25px] [stroke-dasharray:3_3]',
  current: '[fill:none] [stroke:var(--text-primary)] [stroke-width:1.5px] [stroke-linejoin:round]',
  reference: '[stroke:var(--line-strong)] [stroke-width:1px] [stroke-dasharray:6_4] [shape-rendering:crispEdges]',
  marker: '[stroke:var(--text-muted)] [stroke-width:1px] [stroke-dasharray:2_2] [shape-rendering:crispEdges]',
  markerLabel: [
    'uppercase [fill:var(--text-secondary)] [font-family:var(--font-sans)] [font-size:var(--chart-band-label-size)]',
    '[font-weight:var(--font-label-weight)] [letter-spacing:var(--chart-band-label-tracking)]',
    '[stroke:var(--chart-label-halo)] [paint-order:stroke] [stroke-linejoin:round]',
  ].join(' '),
} as const

/** x tick and crosshair label: "NOW" at 0, else "−12 S". */
export function formatSecondsAgo(value: number): string {
  const rounded = Math.round(value)
  if (rounded === 0) return 'NOW'
  return `${rounded < 0 ? MINUS_SIGN : ''}${String(Math.abs(rounded))} S`
}

interface TraceProps {
  points: ChartPoints
  x: LinearScale
  y: LinearScale
  className: string
  /** Live trace: each new sample slides the path left by one sample step (Requirement 33.6). */
  live?: boolean
}

/** First-data draw-in (Requirement 33.5). */
export const DRAW_IN_MS = 600
const DRAW_IN = { duration: DRAW_IN_MS / 1000, ease: EASE_OUT } as const

/**
 * Pixel offset and duration for the slide that follows a new sample: the
 * path starts one sample step to the right and settles at 0 over the sample
 * period (clamped to 50–500 ms), linear, so consecutive slides join up.
 * Null with fewer than two points or a non-positive step.
 */
export function sampleSlide(points: ChartPoints, x: LinearScale): { dx: number; durationS: number } | null {
  const n = points.x.length
  if (n < 2) return null
  const last = points.x[n - 1] as number
  const prev = points.x[n - 2] as number
  const dx = x(last) - x(prev)
  const periodS = last - prev
  if (!(dx > 0) || !(periodS > 0)) return null
  return { dx, durationS: Math.min(0.5, Math.max(0.05, periodS)) }
}

/** Dashed traces keep their dash pattern, so they fade in instead of drawing in. */
const isDashed = (className: string) => className.includes('dasharray')

function sameScale(a: LinearScale, b: LinearScale): boolean {
  const [ad0, ad1] = a.domain()
  const [bd0, bd1] = b.domain()
  const [ar0, ar1] = a.range()
  const [br0, br1] = b.range()
  return ad0 === bd0 && ad1 === bd1 && ar0 === br0 && ar1 === br1
}

/**
 * One line path. Memoised on the points and the scales' domain and range, so
 * a crosshair move does not rebuild the path string.
 */
export const ChartTrace = memo(
  function ChartTrace({ points, x, y, className, live = false }: TraceProps) {
    const indices = Array.from({ length: points.x.length }, (_, i) => i)
    const d =
      line<number>()
        .defined((i) => Number.isFinite(points.y[i] ?? Number.NaN))
        .x((i) => x(points.x[i] ?? 0))
        .y((i) => y(points.y[i] ?? 0))(indices) ?? ''
    const reduced = useReducedMotion()
    const hasData = points.x.length >= 2
    const dashed = isDashed(className)
    // Draw-in plays once per mount, when the first data arrives; never under reduced motion.
    const drawn = useRef(false)
    const reveal = useMotionValue(1)
    const shift = useMotionValue(0)
    useLayoutEffect(() => {
      if (!hasData) return
      if (!drawn.current) {
        drawn.current = true
        if (reduced) return
        reveal.jump(0)
        void animate(reveal, 1, DRAW_IN)
        return
      }
      if (!live || reduced) return
      const slide = sampleSlide(points, x)
      if (!slide) return
      shift.jump(slide.dx)
      void animate(shift, 0, { duration: slide.durationS, ease: 'linear' })
    }, [points, hasData, live, reduced, x, reveal, shift])
    return (
      <motion.path
        d={d}
        className={className}
        data-points={points.x.length}
        style={dashed ? { x: shift, opacity: reveal } : { x: shift, pathLength: reveal }}
      />
    )
  },
  (prev, next) =>
    prev.points === next.points &&
    prev.className === next.className &&
    prev.live === next.live &&
    sameScale(prev.x, next.x) &&
    sameScale(prev.y, next.y),
)

export interface LegendItem {
  label: string
  /** Swatch: a solid or dashed line in the trace's class. */
  swatchClassName: string
}

/** Text legend above a chart, so traces are never told apart by colour alone. */
export function ChartLegend({ items, children }: { items: readonly LegendItem[]; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[length:var(--text-11)] uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <svg width={20} height={8} aria-hidden="true" className="overflow-visible">
            <line x1={0} x2={20} y1={4} y2={4} className={item.swatchClassName} />
          </svg>
          {item.label}
        </span>
      ))}
      {children}
    </div>
  )
}
