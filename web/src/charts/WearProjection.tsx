import { Area, LinePath } from '@visx/shape'
import { useState, type ReactNode } from 'react'
import type { WearRecord } from '../domain/types'
import { CONTROL_CAPS, cx } from '../kit/controlStyles'
import { StatusIcon } from '../kit/icons/StatusIcon'
import { ChartFrame } from './ChartFrame'
import { chartTheme } from './chartTheme'

export interface WearProjectionProps {
  record: WearRecord
  /** Wear rate (× baseline) at which the advisory line is drawn. Default 2. */
  advisoryFactor?: number
  /** Drawing size in px; scales down to the container through its viewBox. Default 720 × 280. */
  width?: number
  height?: number
  className?: string
}

type Point = WearRecord['projection'][number]

/** Baseline consumed-life rate used when the record cannot provide one, % per day. */
export const FALLBACK_BASELINE_PCT_PER_DAY = 0.02

/**
 * Consumed life per day at a wear rate of 1.0, % per day, derived from the
 * record's median projection: slope of p50 up to its last unclamped point,
 * divided by the record's wear rate. Falls back to
 * `FALLBACK_BASELINE_PCT_PER_DAY` when the record has no usable slope.
 */
export function baselinePctPerDay(record: WearRecord): number {
  const [start] = record.projection
  const step = record.projection.findLast((p) => p.day > 0 && p.p50 < 100)
  const rate = record.wear_rate_vs_baseline
  if (!start || !step || !(rate > 0)) return FALLBACK_BASELINE_PCT_PER_DAY
  const slope = (step.p50 - start.p50) / (step.day - start.day)
  const base = slope / rate
  return Number.isFinite(base) && base > 0 ? base : FALLBACK_BASELINE_PCT_PER_DAY
}

/** Consumed life on the advisory line (`factor` × baseline wear from today's consumed life), % at `day`. */
export function advisoryLinePct(record: WearRecord, day: number, factor = 2): number {
  const start = record.projection[0]?.p50 ?? record.consumed_life_pct
  return start + factor * baselinePctPerDay(record) * day
}

/** Projection point nearest to `day`. */
function nearestPoint(projection: readonly Point[], day: number): Point | undefined {
  let best: Point | undefined
  for (const p of projection) {
    if (!best || Math.abs(p.day - day) < Math.abs(best.day - day)) best = p
  }
  return best
}

const pct = (v: number) => `${v.toFixed(1)} %`
const formatDay = (d: number) => (d === 0 ? 'NOW' : `+${String(Math.round(d))} D`)

const C = {
  band: '[fill:color-mix(in_srgb,var(--accent)_18%,transparent)] [stroke:none]',
  bandEdge: '[fill:none] [stroke:color-mix(in_srgb,var(--accent)_45%,transparent)] [stroke-width:1]',
  median: '[fill:none] [stroke:var(--accent)] [stroke-width:2] [stroke-linecap:round] [stroke-linejoin:round]',
  advisory: '[fill:none] [stroke:var(--status-warning)] [stroke-width:1.5] [stroke-dasharray:6_4]',
  now: '[fill:var(--accent)] [stroke:var(--surface-panel)] [stroke-width:2]',
  label: [
    'num uppercase [font-family:var(--font-sans)] [font-size:var(--chart-band-label-size)]',
    '[font-weight:var(--font-label-weight)] [letter-spacing:var(--chart-band-label-tracking)]',
    '[stroke:var(--chart-label-halo)] [paint-order:stroke] [stroke-linejoin:round]',
  ].join(' '),
}

/**
 * Consumed-life projection for one channel (Requirement 27.5): the median
 * (p50) consumed-life line from today's value, a p10–p90 confidence band and
 * a dashed advisory line at `advisoryFactor` × baseline wear rate. Every
 * series is named in text on the chart and in the legend, and the lines
 * differ in dash pattern as well as colour.
 */
export function WearProjection({
  record,
  advisoryFactor = 2,
  width = 720,
  height = 280,
  className,
}: WearProjectionProps) {
  const [hoverDay, setHoverDay] = useState<number | null>(null)
  const projection = record.projection
  const lastDay = projection.at(-1)?.day ?? 1
  const factorText = `${String(advisoryFactor)}×`
  const advisoryAt = (day: number) => advisoryLinePct(record, day, advisoryFactor)
  // Where the advisory line leaves the 0..100 % plot, for its end label.
  const advisoryEndDay = Math.min(
    lastDay,
    Math.max(0, (100 - advisoryAt(0)) / Math.max(1e-9, advisoryAt(1) - advisoryAt(0))),
  )
  const medianEnd = projection.at(-1)?.p50 ?? 0
  // The upper of the two lines takes its end label above, the lower one below, so labels never swap.
  const advisoryOnTop = advisoryEndDay < lastDay || advisoryAt(lastDay) >= medianEnd
  const hovered = hoverDay !== null ? nearestPoint(projection, hoverDay) : undefined
  const channel = String(record.channel)

  return (
    <figure className={cx('flex flex-col gap-3 font-sans', className)} data-channel={record.channel}>
      <ChartFrame
        title={`CH ${channel} consumed life, projected ${String(lastDay)} days`}
        width={width}
        height={height}
        xDomain={[0, lastDay]}
        yDomain={[0, 100]}
        formatX={formatDay}
        formatY={(v) => `${String(v)}%`}
        margin={{ left: 48, right: 20 }}
        onCrosshairChange={setHoverDay}
      >
        {({ x, y }) => (
          <>
            <Area
              data={projection}
              x={(p) => x(p.day)}
              y0={(p) => y(p.p10)}
              y1={(p) => y(p.p90)}
              className={C.band}
              data-testid="wear-band"
            />
            <LinePath data={projection} x={(p) => x(p.day)} y={(p) => y(p.p90)} className={C.bandEdge} />
            <LinePath data={projection} x={(p) => x(p.day)} y={(p) => y(p.p10)} className={C.bandEdge} />
            <LinePath
              data={[0, lastDay]}
              x={(d) => x(d)}
              y={(d) => y(advisoryAt(d))}
              className={C.advisory}
              data-testid="wear-advisory-line"
            />
            <LinePath
              data={projection}
              x={(p) => x(p.day)}
              y={(p) => y(p.p50)}
              className={C.median}
              data-testid="wear-median-line"
            />
            <circle cx={x(0)} cy={y(advisoryAt(0))} r={4} className={C.now} />
            <text
              x={x(advisoryEndDay) - 6}
              y={y(Math.min(100, advisoryAt(advisoryEndDay))) + (advisoryEndDay < lastDay || !advisoryOnTop ? 14 : -8)}
              textAnchor="end"
              strokeWidth={chartTheme.labelHaloWidth}
              className={cx(C.label, '[fill:var(--status-warning)]')}
            >
              {factorText} baseline
            </text>
            <text
              x={x(lastDay) - 6}
              y={y(medianEnd) + (advisoryOnTop ? 16 : -8)}
              textAnchor="end"
              strokeWidth={chartTheme.labelHaloWidth}
              className={cx(C.label, '[fill:var(--accent-strong)]')}
            >
              P50
            </text>
          </>
        )}
      </ChartFrame>
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <LegendItem swatch={<line x1={0} x2={24} y1={6} y2={6} className={C.median} />}>
          Consumed life P50 · now {pct(record.consumed_life_pct)}
        </LegendItem>
        <LegendItem swatch={<rect x={0} y={1} width={24} height={10} className={C.band} />}>
          P10–P90 band
        </LegendItem>
        <LegendItem swatch={<line x1={0} x2={24} y1={6} y2={6} className={C.advisory} />}>
          Advisory {factorText} baseline wear
        </LegendItem>
        <span
          data-testid="wear-rate"
          className={cx(
            CONTROL_CAPS,
            'inline-flex items-center gap-1',
            record.wear_rate_vs_baseline > advisoryFactor
              ? 'text-[color:var(--status-warning)]'
              : 'text-[color:var(--text-secondary)]',
          )}
        >
          {record.wear_rate_vs_baseline > advisoryFactor && <StatusIcon status="warning" size={12} />}
          Wear rate {record.wear_rate_vs_baseline.toFixed(2)}× baseline
          {record.wear_rate_vs_baseline > advisoryFactor && ' · advisory'}
        </span>
        <span
          aria-live="polite"
          data-testid="wear-readout"
          className="num ms-auto min-h-[1.5em] text-[length:var(--text-12)] text-[color:var(--text-primary)]"
        >
          {hovered &&
            `${formatDay(hovered.day)} · P10 ${pct(hovered.p10)} · P50 ${pct(hovered.p50)} · P90 ${pct(hovered.p90)}`}
        </span>
      </figcaption>
    </figure>
  )
}

function LegendItem({ swatch, children }: { swatch: ReactNode; children: ReactNode }) {
  return (
    <span className={cx(CONTROL_CAPS, 'inline-flex items-center gap-2 text-[color:var(--text-secondary)]')}>
      <svg aria-hidden="true" width={24} height={12} viewBox="0 0 24 12">
        {swatch}
      </svg>
      {children}
    </span>
  )
}
