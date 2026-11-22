/**
 * Chart theme: the shared look of every visx chart (axes, grid, crosshair,
 * warning/trip bands) plus the band model built from alarm thresholds.
 *
 * Colours are applied as CSS classes that read component tokens, never as
 * presentation attributes, so a class always wins over visx's default
 * `stroke`/`fill` attributes and no colour literal reaches the DOM.
 */
import { MINUS_SIGN } from '../domain/format'
import type { StatusBand } from '../domain/status'
import { DEFAULT_THRESHOLDS } from '../domain/thresholds'

/** `warning` is the band between the warning and critical limits; `trip` is at or above critical. */
export type ChartBandTone = 'warning' | 'trip'

/** A horizontal value band. `label` is always drawn as text, so a band is never tint-only (Requirement 5.4). */
export interface ChartBand {
  from: number
  /** Upper edge; `Infinity` runs to the top of the plot. */
  to: number
  label: string
  /** Default `warning`. */
  tone?: ChartBandTone
}

export interface ChartMargin {
  top: number
  right: number
  bottom: number
  left: number
}

/** Prefix of each band's label. */
export const BAND_PREFIX: Readonly<Record<ChartBandTone, string>> = {
  warning: 'WARN',
  trip: 'TRIP',
}

/** Threshold in a band label: whole numbers stay whole ("110"), others keep one decimal. */
export function formatBandValue(value: number): string {
  const magnitude = Number.isInteger(value) ? String(Math.abs(value)) : Math.abs(value).toFixed(1)
  return value < 0 ? `${MINUS_SIGN}${magnitude}` : magnitude
}

/** Band label text, e.g. `bandLabel('warning', 110, '°C')` → "WARN 110 °C". */
export function bandLabel(tone: ChartBandTone, value: number, unit: string): string {
  const unitPart = unit ? ` ${unit}` : ''
  return `${BAND_PREFIX[tone]} ${formatBandValue(value)}${unitPart}`
}

/** Warning [warning, critical) and trip [critical, ∞) bands for a threshold set. */
export function thresholdBands(band: StatusBand, unit: string): readonly ChartBand[] {
  return [
    { from: band.warning, to: band.critical, label: bandLabel('warning', band.warning, unit), tone: 'warning' },
    { from: band.critical, to: Infinity, label: bandLabel('trip', band.critical, unit), tone: 'trip' },
  ]
}

/** Default junction-temperature bands: "WARN 110 °C" and "TRIP 125 °C". */
export const JUNCTION_BANDS: readonly ChartBand[] = thresholdBands(DEFAULT_THRESHOLDS.junction_temp, '°C')

/** A band clipped to `[min, max]`, or `null` when it lies outside the domain. */
export function clipBand(band: ChartBand, min: number, max: number): { from: number; to: number } | null {
  const from = Math.max(band.from, min)
  const to = Math.min(band.to, max)
  return to > from ? { from, to } : null
}

/** Finite `[min, max]` of a series, padded by `pad` of the span; `[0, 1]` when there is no finite value. */
export function seriesExtent(series: ArrayLike<number>, pad = 0.12): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < series.length; i++) {
    const v = series[i] ?? NaN
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min > max) return [0, 1]
  if (min === max) return [min - 1, max + 1]
  const span = (max - min) * pad
  return [min - span, max + span]
}

export const chartTheme = {
  margin: { top: 12, right: 16, bottom: 28, left: 44 } satisfies ChartMargin,
  numTicksX: 6,
  numTicksY: 5,
  tickLength: 4,
  /** Halo behind band and crosshair labels, so they read over the trace. */
  labelHaloWidth: 4,
  className: {
    grid: '[stroke:var(--chart-grid)] [stroke-opacity:var(--chart-grid-opacity)] [shape-rendering:crispEdges]',
    axisLine: '[stroke:var(--chart-axis-line)] [shape-rendering:crispEdges]',
    tickLine: '[stroke:var(--chart-axis-line)]',
    tickLabel:
      'num [fill:var(--chart-axis-text)] [font-family:var(--font-sans)] [font-size:var(--chart-tick-size)]',
    crosshair: '[stroke:var(--chart-crosshair)] [stroke-dasharray:2_3] [shape-rendering:crispEdges]',
    crosshairLabelBox:
      '[fill:var(--chart-crosshair-label-bg)] [stroke:var(--chart-crosshair-label-border)]',
    crosshairLabel:
      'num [fill:var(--chart-crosshair-label-fg)] [font-family:var(--font-sans)] [font-size:var(--chart-tick-size)]',
    band: {
      warning: '[fill:var(--chart-band-warning)]',
      trip: '[fill:var(--chart-band-trip)]',
    } satisfies Record<ChartBandTone, string>,
    bandLine: {
      warning: '[stroke:var(--chart-band-warning-line)] [stroke-dasharray:4_3] [shape-rendering:crispEdges]',
      trip: '[stroke:var(--chart-band-trip-line)] [shape-rendering:crispEdges]',
    } satisfies Record<ChartBandTone, string>,
    bandLabel: {
      warning: '[fill:var(--chart-band-warning-text)]',
      trip: '[fill:var(--chart-band-trip-text)]',
    } satisfies Record<ChartBandTone, string>,
    bandLabelText: [
      'num uppercase [font-family:var(--font-sans)] [font-size:var(--chart-band-label-size)]',
      '[font-weight:var(--font-label-weight)] [letter-spacing:var(--chart-band-label-tracking)]',
      '[stroke:var(--chart-label-halo)] [paint-order:stroke] [stroke-linejoin:round]',
    ].join(' '),
  },
} as const
