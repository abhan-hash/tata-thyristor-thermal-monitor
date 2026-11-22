import type { MotionValue } from 'motion/react'
import type { ChartBand } from '../charts/chartTheme'
import { formatValue, formatValueFlush, MINUS_SIGN, valueLength, type FormatSpec } from '../domain/format'
import type { Status } from '../domain/types'
import { AnimatedNumber } from '../motion/AnimatedNumber'
import { cx } from './controlStyles'
import { Sparkline } from './Sparkline'
import { StaleChip } from './StaleChip'
import { StatusChip } from './StatusChip'

export interface KpiTileProps {
  /** Tracked-caps label, e.g. "HEATSINK". */
  label: string
  /** Live value. Bound to the DOM directly, so updates do not re-render React. */
  value: MotionValue<number>
  /** Formatter spec: precision, width and the unit shown beside the value. */
  spec: FormatSpec
  /** Unit override; defaults to `spec.unit`. */
  unit?: string
  /** Trend samples for the sparkline, oldest first. */
  series?: Float32Array | readonly number[]
  /** Fixed sparkline y domain. */
  seriesDomain?: readonly [number, number]
  /** Tints behind the sparkline. */
  bands?: readonly ChartBand[]
  /** Change over the sparkline window, in the value's unit. */
  delta?: number
  /** Caption after the delta, e.g. "60 S". */
  deltaLabel?: string
  /**
   * When set, a `StatusChip` (icon + text) and a matching top edge are shown.
   * `fault` (sensor fault) also lays the fault hatch over the tile and shows
   * "— —" for the value and delta, whatever `value` holds (Requirement 21.1).
   */
  status?: Status
  /** The value is from a frame older than 1 s: dims it to `--text-muted` and adds a STALE chip (Requirement 12.4). */
  stale?: boolean
  className?: string
}

/** Width reserved for the value in `ch`: the formatter's fixed length (Requirement 6.9). */
export function kpiValueWidthCh(spec: FormatSpec): number {
  return valueLength(spec)
}

/**
 * Readout text: the Formatter's fixed-width number with the minus sign moved
 * next to the first digit (padding goes before the sign) and the leading
 * figure-space padding removed, so the number sits flush with the label:
 * −0.4 → "−0.4", never "−  0.4". The width stays reserved by the readout box.
 */
export function kpiValueText(value: number, spec: FormatSpec): string {
  return formatValueFlush(value, spec)
}

/** Signed delta text, e.g. "+1.2", "−0.4", "±0.0"; "— —" when non-finite. */
export function formatDelta(delta: number, spec: FormatSpec): string {
  if (!Number.isFinite(delta)) return '\u2014 \u2014'
  const magnitude = formatValue(Math.abs(delta), spec).trim()
  if (/^[0.]+$/.test(magnitude)) return `\u00B1${magnitude}`
  return `${delta < 0 ? MINUS_SIGN : '+'}${magnitude}`
}

const TILE = [
  'relative isolate flex min-w-0 flex-col gap-3 overflow-hidden',
  'rounded-[var(--kpi-radius)] border p-[var(--kpi-pad)]',
  '[background-color:var(--kpi-bg)] [border-color:var(--kpi-border)]',
  'shadow-[var(--kpi-shadow)]',
].join(' ')
const SHEEN = '[background-image:var(--kpi-sheen)]'

/** Fault hatch over the sheen; hue-free so it never reads as a heat colour. */
const FAULT_BG = '[background-image:var(--kpi-fault-bg),var(--kpi-sheen)]'

const LABEL = [
  'max-w-full uppercase leading-tight [color:var(--kpi-label-color)] [overflow-wrap:break-word]',
  'text-[length:var(--kpi-label-size)] tracking-[var(--kpi-label-tracking)]',
  '[font-weight:var(--kpi-label-weight)] [font-stretch:var(--kpi-label-width)]',
].join(' ')

/* The readout box sets the value font size so `ch` resolves to one tabular digit. */
const READOUT = [
  'flex max-w-full items-baseline gap-1.5 overflow-hidden',
  'text-[length:var(--kpi-value-size)]',
].join(' ')

const VALUE = [
  'num whitespace-pre leading-none',
  '[font-weight:var(--kpi-value-weight)] [font-stretch:var(--kpi-value-width)]',
  'tracking-[var(--kpi-value-tracking)]',
].join(' ')

const EDGE: Readonly<Record<Status, string>> = {
  normal: '[background:var(--kpi-edge-normal)]',
  warning: '[background:var(--kpi-edge-warning)]',
  critical: '[background:var(--kpi-edge-critical)]',
  fault: '[background:var(--kpi-edge-fault)]',
}

function DeltaArrow({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  const d = { up: 'M4 1 7.5 7h-7z', down: 'M4 7 .5 1h7z', flat: 'M1 3.25h6v1.5H1z' }[direction]
  return (
    <svg aria-hidden="true" width={8} height={8} viewBox="0 0 8 8" className="shrink-0 fill-current">
      <path d={d} />
    </svg>
  )
}

/**
 * KPI readout: tracked-caps label, a large tabular value in a fixed `ch`
 * width, the unit set small beside it, a sparkline and the window delta.
 * The value tweens through `AnimatedNumber`, which writes straight to the DOM.
 */
export function KpiTile({
  label,
  value,
  spec,
  unit = spec.unit,
  series,
  seriesDomain,
  bands,
  delta,
  deltaLabel,
  status,
  stale = false,
  className,
}: KpiTileProps) {
  const widthCh = kpiValueWidthCh(spec)
  const fault = status === 'fault'

  const shownDelta = fault && delta !== undefined ? Number.NaN : delta
  const hasFooter = series !== undefined || delta !== undefined
  const direction =
    shownDelta === undefined || !Number.isFinite(shownDelta) || formatDelta(shownDelta, spec).startsWith('\u00B1')
      ? 'flat'
      : shownDelta > 0
        ? 'up'
        : 'down'

  return (
    <div
      role="group"
      aria-label={label}
      className={cx(TILE, fault ? FAULT_BG : SHEEN, className)}
      {...(status ? { 'data-status': status } : {})}
      {...(fault ? { 'data-fault': 'true' } : {})}
      {...(stale ? { 'data-stale': 'true' } : {})}
    >
      {status && (
        <span aria-hidden="true" className={cx('absolute inset-x-0 top-0 h-0.5', EDGE[status])} />
      )}
      {/* Wraps the chip under the label when both do not fit, so the label is never covered. */}
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {/* The negative end margin trims the trailing tracking. It sits on the flex item, not an inner inline,
            so the label keeps its full max-content width and never wraps mid-word. */}
        <span className={cx(LABEL, '-me-[var(--kpi-label-tracking)]')}>
          <span>{label}</span>
        </span>
        {(status !== undefined || stale) && (
          <span className="flex items-center gap-2">
            {stale && <StaleChip size="sm" />}
            {status && <StatusChip status={status} size="sm" />}
          </span>
        )}
      </div>

      {/* Fixed width: N digit cells plus the unit reserve, so value changes never move the tile's layout. */}
      <div
        className={READOUT}
        style={{ width: `calc(${widthCh}ch + var(--kpi-unit-reserve))` }}
        data-width-ch={widthCh}
        data-testid="kpi-readout"
      >
        <AnimatedNumber
          value={value}
          format={(v) => kpiValueText(fault ? Number.NaN : v, spec)}
          className={cx(VALUE, stale ? '[color:var(--text-muted)]' : '[color:var(--kpi-value-color)]')}
          data-testid="kpi-value"
        />
        {unit && !fault && (
          <span className="shrink-0 text-[length:var(--kpi-unit-size)] [color:var(--kpi-unit-color)] [font-weight:var(--font-label-weight)]">
            {unit}
          </span>
        )}
      </div>

      {hasFooter && (
        <div className="flex items-end gap-3 border-t pt-3 [border-color:var(--kpi-divider)]">
          {series !== undefined && (
            <Sparkline
              series={series}
              width={168}
              height={32}
              className="min-w-0 flex-1"
              {...(seriesDomain ? { domain: seriesDomain } : {})}
              {...(bands ? { bands } : {})}
            />
          )}
          {shownDelta !== undefined && (
            <span
              className="num ms-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[length:var(--kpi-delta-size)] [color:var(--kpi-delta-color)]"
              data-testid="kpi-delta"
            >
              {Number.isFinite(shownDelta) && <DeltaArrow direction={direction} />}
              <span>
                {formatDelta(shownDelta, spec)}
                {unit && !fault ? ` ${unit}` : ''}
              </span>
              {deltaLabel && (
                <span className="uppercase tracking-[0.16em] [color:var(--kpi-delta-caption-color)]">
                  {deltaLabel}
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
