import { AxisBottom, AxisLeft } from '@visx/axis'
import { localPoint } from '@visx/event'
import { Group } from '@visx/group'
import { scaleLinear } from '@visx/scale'
import { useId, useState, type PointerEvent, type ReactNode } from 'react'
import { cx } from '../kit/controlStyles'
import { chartTheme, clipBand, type ChartBand, type ChartMargin } from './chartTheme'

export type LinearScale = ReturnType<typeof scaleLinear<number>>

/** What a chart body receives to draw its traces inside the frame. */
export interface ChartScales {
  x: LinearScale
  y: LinearScale
  innerWidth: number
  innerHeight: number
}

export interface ChartFrameProps {
  /** Accessible name of the chart, e.g. "Junction temperature, last 60 s". */
  title: string
  width: number
  height: number
  xDomain: readonly [number, number]
  yDomain: readonly [number, number]
  /** Warning/trip bands, each drawn as a tint, an edge line and a text label. */
  bands?: readonly ChartBand[]
  margin?: Partial<ChartMargin>
  /** Tick and crosshair label for x values. Default: `String`. */
  formatX?: (value: number) => string
  /** Tick label for y values. Default: `String`. */
  formatY?: (value: number) => string
  /** Show a crosshair that follows the pointer. Default `true`. */
  crosshair?: boolean
  /** Controlled crosshair position (x domain value), for charts that share one crosshair. */
  crosshairX?: number | null
  /** Called with the x value under the pointer, or `null` when the pointer leaves. */
  onCrosshairChange?: (x: number | null) => void
  /** Draws the traces. Rendered inside a clip to the plot area. */
  children?: (scales: ChartScales) => ReactNode
  className?: string
}

const { className: C } = chartTheme

/** SVG ids must not contain the punctuation `useId` may emit. */
function svgId(raw: string, suffix: string): string {
  return `${raw.replace(/[^a-zA-Z0-9_-]/g, '')}-${suffix}`
}

/**
 * Chart scaffold shared by every trend chart: horizontal grid, left and
 * bottom axes, warning/trip bands with text labels, an optional crosshair
 * and a clipped plot area for the traces. Sized in px and scaled down to the
 * container width through its viewBox.
 */
export function ChartFrame({
  title,
  width,
  height,
  xDomain,
  yDomain,
  bands = [],
  margin: marginOverride,
  formatX = String,
  formatY = String,
  crosshair = true,
  crosshairX,
  onCrosshairChange,
  children,
  className,
}: ChartFrameProps) {
  const rawId = useId()
  const clipId = svgId(rawId, 'clip')
  const titleId = svgId(rawId, 'title')
  const descId = svgId(rawId, 'desc')
  const [hoverX, setHoverX] = useState<number | null>(null)

  const margin = { ...chartTheme.margin, ...marginOverride }
  const innerWidth = Math.max(0, width - margin.left - margin.right)
  const innerHeight = Math.max(0, height - margin.top - margin.bottom)
  const [xMin, xMax] = xDomain
  const [yMin, yMax] = yDomain
  const x = scaleLinear<number>({ domain: [xMin, xMax], range: [0, innerWidth] })
  const y = scaleLinear<number>({ domain: [yMin, yMax], range: [innerHeight, 0] })

  const activeX = crosshairX !== undefined ? crosshairX : hoverX
  const showCrosshair = crosshair && activeX !== null && activeX >= xMin && activeX <= xMax

  function updateCrosshair(next: number | null) {
    setHoverX(next)
    onCrosshairChange?.(next)
  }

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const point = localPoint(event)
    if (!point) return
    const value = x.invert(point.x - margin.left)
    updateCrosshair(Math.min(xMax, Math.max(xMin, value)))
  }

  const visibleBands = bands.flatMap((band) => {
    const clipped = clipBand(band, yMin, yMax)
    return clipped
      ? [{ ...band, ...clipped, threshold: band.from, tone: band.tone ?? 'warning' }]
      : []
  })
  const description =
    bands.length > 0 ? `Bands: ${bands.map((band) => band.label).join(', ')}` : undefined

  const crosshairText = activeX !== null ? formatX(activeX) : ''
  // Approximate box width for tabular 11 px figures; the halo absorbs small errors.
  const crosshairBoxWidth = crosshairText.length * 6.6 + 12

  return (
    <svg
      role="img"
      aria-labelledby={description ? `${titleId} ${descId}` : titleId}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cx('block h-auto max-w-full select-none overflow-visible', className)}
    >
      <title id={titleId}>{title}</title>
      {description && <desc id={descId}>{description}</desc>}
      <defs>
        <clipPath id={clipId}>
          <rect width={innerWidth} height={innerHeight} />
        </clipPath>
      </defs>
      <Group left={margin.left} top={margin.top}>
        {/* Band tints sit under the grid so grid lines stay continuous. */}
        {visibleBands.map((band) => (
          <rect
            key={`fill-${band.label}`}
            x={0}
            width={innerWidth}
            y={y(band.to)}
            height={Math.max(0, y(band.from) - y(band.to))}
            className={C.band[band.tone]}
            data-band-tone={band.tone}
          />
        ))}

        <g aria-hidden="true">
          {y.ticks(chartTheme.numTicksY).map((tick) => (
            <line key={tick} x1={0} x2={innerWidth} y1={y(tick)} y2={y(tick)} className={C.grid} />
          ))}
        </g>

        {children && (
          <g clipPath={`url(#${clipId})`}>{children({ x, y, innerWidth, innerHeight })}</g>
        )}

        {/* Edge line at each threshold plus its text label, above the traces. */}
        {visibleBands.map((band) => {
          const edge = y(band.from)
          // When the threshold lies below the domain the band is clipped: no edge line, label only.
          const edgeVisible = band.threshold >= yMin
          return (
            <g key={`edge-${band.label}`}>
              {edgeVisible && (
                <line x1={0} x2={innerWidth} y1={edge} y2={edge} className={C.bandLine[band.tone]} />
              )}
              <text
                x={innerWidth - 6}
                y={edge - 6}
                textAnchor="end"
                strokeWidth={chartTheme.labelHaloWidth}
                className={cx(C.bandLabelText, C.bandLabel[band.tone])}
              >
                {band.label}
              </text>
            </g>
          )
        })}

        <AxisLeft
          scale={y}
          numTicks={chartTheme.numTicksY}
          hideAxisLine
          hideTicks
          tickFormat={(value) => formatY(Number(value))}
          tickLabelProps={() => ({ className: C.tickLabel, textAnchor: 'end', dx: -8, dy: '0.33em' })}
        />
        <AxisBottom
          top={innerHeight}
          scale={x}
          numTicks={chartTheme.numTicksX}
          tickLength={chartTheme.tickLength}
          axisLineClassName={C.axisLine}
          tickLineProps={{ className: C.tickLine }}
          tickFormat={(value) => formatX(Number(value))}
          tickLabelProps={() => ({ className: C.tickLabel, textAnchor: 'middle', dy: '0.25em' })}
        />

        {showCrosshair && (
          <g aria-hidden="true" data-testid="chart-crosshair" pointerEvents="none">
            <line x1={x(activeX)} x2={x(activeX)} y1={0} y2={innerHeight} className={C.crosshair} />
            <rect
              x={x(activeX) - crosshairBoxWidth / 2}
              y={innerHeight + 4}
              width={crosshairBoxWidth}
              height={18}
              rx={2}
              className={C.crosshairLabelBox}
            />
            <text x={x(activeX)} y={innerHeight + 17} textAnchor="middle" className={C.crosshairLabel}>
              {crosshairText}
            </text>
          </g>
        )}

        {crosshair && (
          <rect
            width={innerWidth}
            height={innerHeight}
            className="[fill:transparent]"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => {
              updateCrosshair(null)
            }}
          />
        )}
      </Group>
    </svg>
  )
}
