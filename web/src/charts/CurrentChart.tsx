import { useMemo } from 'react'
import { useSeries } from '../data/hooks'
import { MODEL_PARAMS } from '../domain/thresholds'
import { ChartFrame } from './ChartFrame'
import { ChartLegend, ChartTrace, formatSecondsAgo, traceClass } from './ChartTrace'
import { formatBandValue } from './chartTheme'
import { downsample } from './series'
import { useSharedCrosshair } from './sharedCrosshair'

export interface CurrentChartProps {
  /** Visible window, s. Default 60. */
  windowS?: number
  width?: number
  height?: number
  /** Rated armature current, A. Default `MODEL_PARAMS.rated_current`. */
  ratedA?: number
  className?: string
}

/** Reference line label, e.g. "RATED 1000 A". */
export function ratedLabel(ratedA: number): string {
  return `RATED ${formatBandValue(ratedA)} A`
}

/** y domain from 0 to at least 130% of rated, rounded up to 100 A, so the reference line always shows. */
export function currentDomain(current: ArrayLike<number>, ratedA: number): [number, number] {
  let max = 0
  for (let i = 0; i < current.length; i++) {
    const v = current[i] ?? Number.NaN
    if (Number.isFinite(v) && v > max) max = v
  }
  return [0, Math.max(Math.ceil((ratedA * 1.3) / 100) * 100, Math.ceil((max * 1.08) / 100) * 100)]
}

/**
 * Current_Chart (Requirements 25.2, 25.5): armature current over the last
 * `windowS` seconds with a labelled rated-current reference line. Shares its
 * crosshair with the Transient_Chart through `CrosshairProvider`.
 */
export function CurrentChart({
  windowS = 60,
  width = 720,
  height = 180,
  ratedA = MODEL_PARAMS.rated_current,
  className,
}: CurrentChartProps) {
  const armature = useSeries('drive', 'armature', windowS)
  const shared = useSharedCrosshair()
  const points = useMemo(() => downsample(armature.t, armature.v), [armature])
  const yDomain = useMemo(() => currentDomain(armature.v, ratedA), [armature, ratedA])
  const label = ratedLabel(ratedA)

  return (
    <figure className={className} data-testid="current-chart">
      <ChartLegend
        items={[
          { label: 'Armature current', swatchClassName: traceClass.current },
          { label: 'Rated', swatchClassName: traceClass.reference },
        ]}
      />
      <ChartFrame
        title={`Armature current, last ${String(windowS)} s, ${label.toLowerCase()} reference`}
        width={width}
        height={height}
        xDomain={[-windowS, 0]}
        yDomain={yDomain}
        formatX={formatSecondsAgo}
        formatY={String}
        {...(shared ? { crosshairX: shared.x, onCrosshairChange: shared.setX } : {})}
        className="mt-2 w-full"
      >
        {(s) => {
          const ry = s.y(ratedA)
          return (
            <>
              <g data-testid="rated-reference">
                <line x1={0} x2={s.innerWidth} y1={ry} y2={ry} className={traceClass.reference} />
                <text x={6} y={ry - 6} strokeWidth={4} className={traceClass.markerLabel}>
                  {label}
                </text>
              </g>
              <ChartTrace points={points} x={s.x} y={s.y} className={traceClass.current} live />
            </>
          )
        }}
      </ChartFrame>
    </figure>
  )
}
