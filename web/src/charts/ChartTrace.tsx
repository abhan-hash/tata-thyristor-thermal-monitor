import { line } from 'd3-shape'
import { memo, type ReactNode } from 'react'
import { MINUS_SIGN } from '../domain/format'
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
}

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
  function ChartTrace({ points, x, y, className }: TraceProps) {
    const indices = Array.from({ length: points.x.length }, (_, i) => i)
    const d =
      line<number>()
        .defined((i) => Number.isFinite(points.y[i] ?? Number.NaN))
        .x((i) => x(points.x[i] ?? 0))
        .y((i) => y(points.y[i] ?? 0))(indices) ?? ''
    return <path d={d} className={className} data-points={points.x.length} />
  },
  (prev, next) =>
    prev.points === next.points &&
    prev.className === next.className &&
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
