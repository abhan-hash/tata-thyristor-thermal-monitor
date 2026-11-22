import { useMemo } from 'react'
import { useSeries } from '../data/hooks'
import type { ChannelId } from '../domain/types'
import { MODEL_PARAMS } from '../domain/thresholds'
import { useUiStore } from '../state/uiStore'
import { ChartFrame, type LinearScale } from './ChartFrame'
import { ChartLegend, ChartTrace, formatSecondsAgo, traceClass } from './ChartTrace'
import { seriesExtent, thresholdBands } from './chartTheme'
import { downsample, spikeOnsetTimes } from './series'
import { useSharedCrosshair } from './sharedCrosshair'

export interface TransientChartProps {
  channel: ChannelId
  /** Visible window, s. Default 60. */
  windowS?: number
  width?: number
  height?: number
  /** Rated armature current for spike detection, A. Default `MODEL_PARAMS.rated_current`. */
  ratedA?: number
  className?: string
}

export const BAR_BITE_LABEL = 'BAR BITE'

/** Headroom above the trip threshold, °C, so both band labels always show. */
const TRIP_HEADROOM = 10
const STEP = 5

/** y domain covering both traces and the trip band, snapped to 5 °C so it does not jitter per frame. */
export function transientDomain(
  tj: ArrayLike<number>,
  heatsink: ArrayLike<number>,
  trip: number,
): [number, number] {
  const values = Float64Array.from([...Array.from(tj), ...Array.from(heatsink)])
  const hasData = values.some((v) => Number.isFinite(v))
  const [lo, hi] = hasData ? seriesExtent(values, 0.08) : [trip - 80, trip]
  const min = Math.floor(lo / STEP) * STEP
  const max = Math.max(Math.ceil(hi / STEP) * STEP, trip + TRIP_HEADROOM)
  return [min, max]
}

/** Width at the right edge of the plot taken by the WARN/TRIP band labels, px. */
const BAND_LABEL_ZONE = 100

interface BarBiteMarkersProps {
  times: readonly number[]
  x: LinearScale
  innerWidth: number
  innerHeight: number
  /** y of the warning edge, px. Labels in the band-label zone start below it. */
  warningY: number
}

function BarBiteMarkers({ times, x, innerWidth, innerHeight, warningY }: BarBiteMarkersProps) {
  return (
    <g data-testid="bar-bite-markers">
      {times.map((t) => {
        const px = x(t)
        // Keep clear of the band labels drawn at the plot's right edge.
        const top = px > innerWidth - BAND_LABEL_ZONE ? Math.min(innerHeight - 60, warningY + 6) : 6
        return (
          <g key={t} data-testid="bar-bite" data-t={t.toFixed(1)}>
            <line x1={px} x2={px} y1={0} y2={innerHeight} className={traceClass.marker} />
            {/* Upright label beside the marker, so markers 2 s apart in a 300 s window stay readable. */}
            <text
              x={px - 4}
              y={top}
              transform={`rotate(-90 ${px - 4} ${top})`}
              textAnchor="end"
              strokeWidth={4}
              className={traceClass.markerLabel}
            >
              {BAR_BITE_LABEL}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/**
 * Transient_Chart (Requirements 25.2, 25.4): Tj and heatsink for one channel
 * over the last `windowS` seconds, with labelled WARN/TRIP bands and a
 * labelled vertical bar-bite marker at each armature-current spike onset.
 * Shares its crosshair with the Current_Chart through `CrosshairProvider`.
 */
export function TransientChart({
  channel,
  windowS = 60,
  width = 720,
  height = 260,
  ratedA = MODEL_PARAMS.rated_current,
  className,
}: TransientChartProps) {
  const tj = useSeries(channel, 'tj', windowS)
  const heatsink = useSeries(channel, 'heatsink', windowS)
  const armature = useSeries('drive', 'armature', windowS)
  const junction = useUiStore((s) => s.saved.thresholds.junction_temp)
  const shared = useSharedCrosshair()

  const bands = useMemo(() => thresholdBands(junction, '°C'), [junction])
  const tjPoints = useMemo(() => downsample(tj.t, tj.v), [tj])
  const hsPoints = useMemo(() => downsample(heatsink.t, heatsink.v), [heatsink])
  const biteTimes = useMemo(() => spikeOnsetTimes(armature.t, armature.v, ratedA), [armature, ratedA])
  const yDomain = useMemo(() => transientDomain(tj.v, heatsink.v, junction.critical), [tj, heatsink, junction])

  return (
    <figure className={className} data-testid="transient-chart">
      <ChartLegend
        items={[
          { label: `Tj T${String(channel)}`, swatchClassName: traceClass.tj },
          { label: 'Heatsink', swatchClassName: traceClass.heatsink },
          { label: 'Bar bite', swatchClassName: traceClass.marker },
        ]}
      />
      <ChartFrame
        title={`T${String(channel)} junction and heatsink temperature, last ${String(windowS)} s, ${String(biteTimes.length)} bar-bite markers`}
        width={width}
        height={height}
        xDomain={[-windowS, 0]}
        yDomain={yDomain}
        bands={bands}
        formatX={formatSecondsAgo}
        formatY={String}
        {...(shared ? { crosshairX: shared.x, onCrosshairChange: shared.setX } : {})}
        className="mt-2 w-full"
      >
        {(s) => (
          <>
            <ChartTrace points={hsPoints} x={s.x} y={s.y} className={traceClass.heatsink} live />
            <ChartTrace points={tjPoints} x={s.x} y={s.y} className={traceClass.tj} live />
            <BarBiteMarkers
              times={biteTimes}
              x={s.x}
              innerWidth={s.innerWidth}
              innerHeight={s.innerHeight}
              warningY={s.y(junction.warning)}
            />
          </>
        )}
      </ChartFrame>
    </figure>
  )
}
