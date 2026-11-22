import { useMemo } from 'react'
import { MINUS_SIGN } from '../domain/format'
import type { AlarmEvent } from '../domain/types'
import { useUiStore } from '../state/uiStore'
import { ChartFrame } from './ChartFrame'
import { ChartLegend, ChartTrace, traceClass } from './ChartTrace'
import { seriesExtent, thresholdBands } from './chartTheme'
import { downsample, type ChartPoints } from './series'

export interface EventTraceData {
  /** Sample times, epoch ms. */
  readonly t: ArrayLike<number>
  /** Junction temperature, °C. */
  readonly tj: ArrayLike<number>
}

export interface EventTraceProps {
  event: AlarmEvent
  trace: EventTraceData
  width?: number
  height?: number
  className?: string
}

/** Half width of the trace window, s (Tj ±60 s around the raise). */
export const EVENT_TRACE_HALF_S = 60

/** x tick: "RAISE" at 0, else "−12 S" / "+12 S". */
export function formatSecondsFromRaise(value: number): string {
  const rounded = Math.round(value)
  if (rounded === 0) return 'RAISE'
  return `${rounded < 0 ? MINUS_SIGN : '+'}${String(Math.abs(rounded))} S`
}

/** Trace points as seconds relative to the event's `raised_at`, downsampled to the chart budget. */
export function tracePoints(trace: EventTraceData, raisedAt: string): ChartPoints {
  const raisedMs = Date.parse(raisedAt)
  const pts = downsample(trace.t, trace.tj)
  const n = trace.t.length
  const newest = n > 0 ? (trace.t[n - 1] ?? 0) : 0
  const shift = Number.isFinite(raisedMs) ? (newest - raisedMs) / 1000 : 0
  const x = new Float64Array(pts.x.length)
  for (let i = 0; i < x.length; i++) x[i] = (pts.x[i] ?? 0) + shift
  return { x, y: pts.y }
}

/**
 * Event_Trace (Requirement 26.5): Tj ±60 s around an alarm raise, inside a
 * ChartFrame with the saved junction warning/trip bands and a raise marker.
 */
export function EventTrace({ event, trace, width = 640, height = 200, className }: EventTraceProps) {
  const junction = useUiStore((s) => s.saved.thresholds.junction_temp)
  const bands = useMemo(() => thresholdBands(junction, '°C'), [junction])
  const points = useMemo(() => tracePoints(trace, event.raised_at), [trace, event.raised_at])
  const yDomain = useMemo((): [number, number] => {
    const [lo, hi] = seriesExtent(trace.tj)
    // Keep the warning edge in view so the band context always shows.
    return [Math.min(lo, junction.warning - 5), Math.max(hi, junction.warning + 2)]
  }, [trace.tj, junction.warning])
  return (
    <figure className={className} data-testid="event-trace">
      <ChartLegend
        items={[
          { label: 'Tj', swatchClassName: traceClass.tj },
          { label: 'Raise', swatchClassName: traceClass.marker },
        ]}
      />
      <ChartFrame
        title={`Junction temperature ${String(EVENT_TRACE_HALF_S)} s either side of the alarm raise`}
        width={width}
        height={height}
        xDomain={[-EVENT_TRACE_HALF_S, EVENT_TRACE_HALF_S]}
        yDomain={yDomain}
        bands={bands}
        formatX={formatSecondsFromRaise}
        formatY={String}
        className="mt-2 w-full"
      >
        {(s) => (
          <>
            <line
              x1={s.x(0)}
              x2={s.x(0)}
              y1={0}
              y2={s.innerHeight}
              className={traceClass.marker}
              data-testid="event-trace-raise"
            />
            <ChartTrace points={points} x={s.x} y={s.y} className={traceClass.tj} />
          </>
        )}
      </ChartFrame>
    </figure>
  )
}
