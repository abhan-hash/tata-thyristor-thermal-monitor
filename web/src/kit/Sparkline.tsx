import { scaleLinear } from '@visx/scale'
import { AreaClosed, LinePath } from '@visx/shape'
import { useId } from 'react'
import { chartTheme, clipBand, seriesExtent, type ChartBand } from '../charts/chartTheme'
import { cx } from './controlStyles'

export interface SparklineProps {
  /** Samples, oldest first. Non-finite samples leave a gap in the trace. */
  series: Float32Array | readonly number[]
  /** Fixed y domain. Default: the finite extent of `series`, padded. */
  domain?: readonly [number, number]
  /** Optional warning/trip tints behind the trace (clipped to the domain). */
  bands?: readonly ChartBand[]
  /** Drawing size in px; the SVG scales down to its container through its viewBox. Default 160 × 36. */
  width?: number
  height?: number
  /** Accessible name. Without it the sparkline is decorative (`aria-hidden`). */
  label?: string
  className?: string
}

const PAD = 3

/**
 * 60 s mini trend: a gold trace over a fading wash, with the live sample
 * marked. No axes; the readout next to it carries the number.
 */
export function Sparkline({
  series,
  domain,
  bands = [],
  width = 160,
  height = 36,
  label,
  className,
}: SparklineProps) {
  const gradientId = `${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-spark`
  const count = series.length
  const [yMin, yMax] = domain ?? seriesExtent(series)

  const x = scaleLinear<number>({ domain: [0, Math.max(1, count - 1)], range: [PAD, width - PAD] })
  const y = scaleLinear<number>({ domain: [yMin, yMax], range: [height - PAD, PAD], clamp: true })

  const indices = Array.from({ length: count }, (_, i) => i)
  const valueAt = (i: number) => series[i] ?? NaN
  const defined = (i: number) => Number.isFinite(valueAt(i))
  const xAt = (i: number) => x(i)
  const yAt = (i: number) => y(valueAt(i))

  let last = count - 1
  while (last >= 0 && !defined(last)) last--

  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const }

  return (
    <svg
      {...a11y}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cx('block h-auto max-w-full overflow-visible', className)}
      data-samples={count}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--sparkline-fill-top)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--sparkline-fill-bottom)' }} />
        </linearGradient>
      </defs>
      {bands.map((band) => {
        const clipped = clipBand(band, yMin, yMax)
        if (!clipped) return null
        const tone = band.tone ?? 'warning'
        return (
          <rect
            key={band.label}
            x={0}
            width={width}
            y={y(clipped.to)}
            height={Math.max(0, y(clipped.from) - y(clipped.to))}
            className={chartTheme.className.band[tone]}
            data-band-tone={tone}
          />
        )
      })}
      {count > 1 && (
        <>
          <AreaClosed
            data={indices}
            x={xAt}
            y={yAt}
            y0={height - PAD}
            yScale={y}
            defined={defined}
            fill={`url(#${gradientId})`}
          />
          <LinePath
            data={indices}
            x={xAt}
            y={yAt}
            defined={defined}
            className="[fill:none] [stroke:var(--sparkline-stroke)] [stroke-width:var(--sparkline-stroke-width)] [stroke-linecap:round] [stroke-linejoin:round]"
          />
        </>
      )}
      {last >= 0 && (
        <g data-testid="sparkline-head">
          <circle cx={xAt(last)} cy={yAt(last)} r={4.5} className="[fill:var(--sparkline-dot-halo)]" />
          <circle cx={xAt(last)} cy={yAt(last)} r={2} className="[fill:var(--sparkline-dot)]" />
        </g>
      )}
    </svg>
  )
}
