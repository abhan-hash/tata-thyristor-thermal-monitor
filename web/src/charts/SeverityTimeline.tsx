import { AxisBottom } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleLinear } from '@visx/scale'
import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { ALARM_SEVERITIES, type AlarmChannel, type AlarmSeverity } from '../domain/alarmFilters'
import type { AlarmEvent } from '../domain/types'
import { StatusIcon } from '../kit/icons/StatusIcon'
import { STATUS_LABEL } from '../kit/StatusChip'
import { cx } from '../kit/controlStyles'
import { chartTheme } from './chartTheme'
import {
  BIN_THRESHOLD,
  TIMELINE_WINDOW_MS,
  binEvents,
  brushRange,
  chooseBinSize,
  laneLabel,
  shouldBin,
  timelineLanes,
  timelineMarks,
  timelineWindow,
  type TimelineWindow,
} from './severityTimelineModel'

export interface TimelineRange {
  from: Date
  to: Date
}

export interface SeverityTimelineProps {
  /** Events to plot, already filtered by severity, channel and kind. Out-of-window events are ignored. */
  events: readonly AlarmEvent[]
  /** Right edge of the window, usually "now". */
  end: Date
  /** Window length. Default 24 h. */
  durationMs?: number
  /** Lanes to draw; empty or absent draws T1..T6 plus the drive lane. */
  channels?: readonly AlarmChannel[] | undefined
  /** Current brush, typically read from `?from=`/`?to=`. */
  from?: Date | undefined
  to?: Date | undefined
  /** Called with the brushed range, or `null` when the brush is cleared. */
  onBrushChange: (range: TimelineRange | null) => void
  /** Force binning on or off. Default: bin at `BIN_THRESHOLD` events or more. */
  binned?: boolean | undefined
  width?: number
  title?: string
  className?: string
}

const LANE_HEIGHT = 28
const ICON = 12
const MARGIN = { top: 8, right: 16, bottom: 28, left: 56 }
/** Below this drag distance a pointer gesture is a click, which clears the brush. */
const CLICK_SLOP_PX = 3
const KEY_STEP_MS = 15 * 60_000
const KEY_DEFAULT_SPAN_MS = 60 * 60_000

/** Icon tone per severity; the icon shape and text label carry the meaning, colour only reinforces it. */
const TONE: Readonly<Record<AlarmSeverity, string>> = {
  warning: 'text-status-warning',
  critical: 'text-status-critical',
  fault: 'text-status-fault',
}

const BIN_FILL: Readonly<Record<AlarmSeverity, string>> = {
  warning: '[fill:var(--status-warning)] [fill-opacity:0.14]',
  critical: '[fill:var(--status-critical)] [fill-opacity:0.18]',
  fault: '[fill:var(--status-fault)] [fill-opacity:0.1]',
}

const KIND_LABEL: Readonly<Record<AlarmEvent['kind'], string>> = {
  junction_temp: 'Junction temperature',
  heatsink_temp: 'Heatsink temperature',
  cooling_residual: 'Cooling residual',
  rms_current: 'RMS current',
  residual_rate: 'Residual rate',
  sensor: 'Sensor',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local `HH:MM`. */
export function formatClock(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Hour-aligned ticks, about six across the window. */
function hourTicks(win: TimelineWindow): number[] {
  const hour = 3_600_000
  const span = win.end - win.start
  const step = ([1, 2, 3, 4, 6, 12].find((h) => span / (h * hour) <= 8) ?? 24) * hour
  const first = new Date(win.start)
  first.setMinutes(0, 0, 0)
  let t = first.getTime()
  while (t < win.start) t += hour
  // Align to the step on the local clock so ticks read 00:00, 04:00, …
  while (new Date(t).getHours() % (step / hour) !== 0 && t < win.end) t += hour
  const ticks: number[] = []
  for (; t <= win.end; t += step) ticks.push(t)
  return ticks
}

function severityCounts(events: readonly { severity: AlarmSeverity }[]): Record<AlarmSeverity, number> {
  const counts: Record<AlarmSeverity, number> = { warning: 0, critical: 0, fault: 0 }
  for (const e of events) counts[e.severity] += 1
  return counts
}

function countsText(counts: Readonly<Record<AlarmSeverity, number>>): string {
  const parts = ALARM_SEVERITIES.filter((s) => counts[s] > 0).map(
    (s) => `${counts[s]} ${STATUS_LABEL[s].toLowerCase()}`,
  )
  return parts.length > 0 ? parts.join(', ') : 'no events'
}

/**
 * 24 h alarm timeline: one lane per channel plus the drive lane, a severity
 * mark per event (icon shape + colour, with the severity named in the legend
 * and the text summary), and a time brush. At 200 or more events marks are
 * binned into time buckets showing the worst severity and the count.
 *
 * The brush works with a pointer (drag to select, click to clear) and with
 * the keyboard on the focused brush: arrows move the range, Shift + arrows
 * resize it, Home/End jump to the window edges, Escape clears.
 */
export function SeverityTimeline({
  events,
  end,
  durationMs = TIMELINE_WINDOW_MS,
  channels,
  from,
  to,
  onBrushChange,
  binned,
  width = 960,
  title = 'Alarm timeline, last 24 h',
  className,
}: SeverityTimelineProps) {
  const rawId = useId()
  const summaryId = `${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}-summary`
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ anchor: number; current: number; anchorPx: number } | null>(null)

  const endMs = end.getTime()
  const win = useMemo(() => timelineWindow(endMs, durationMs), [endMs, durationMs])
  const lanes = useMemo(() => timelineLanes(channels), [channels])
  const marks = useMemo(() => {
    const laneSet = new Set(lanes)
    return timelineMarks(events, win).filter((m) => laneSet.has(m.event.channel))
  }, [events, win, lanes])

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerHeight = lanes.length * LANE_HEIGHT
  const height = innerHeight + MARGIN.top + MARGIN.bottom
  const x = scaleLinear<number>({ domain: [win.start, win.end], range: [0, innerWidth] })
  const laneY = (lane: AlarmChannel) => lanes.indexOf(lane) * LANE_HEIGHT
  const isBinned = binned ?? shouldBin(marks.length, BIN_THRESHOLD)
  const binSize = chooseBinSize(win, innerWidth)
  const bins = useMemo(
    () => (isBinned ? binEvents(marks, win, binSize, lanes) : []),
    [isBinned, marks, win, binSize, lanes],
  )

  const fromMs = from?.getTime()
  const toMs = to?.getTime()
  const committed =
    fromMs !== undefined && toMs !== undefined && Number.isFinite(fromMs) && Number.isFinite(toMs)
      ? brushRange(fromMs, toMs, win)
      : null
  const shown = drag ? brushRange(drag.anchor, drag.current, win) : committed

  function pointerPx(event: PointerEvent<SVGElement>): number {
    const svg = svgRef.current
    const rect = svg?.getBoundingClientRect()
    const scale = rect && rect.width > 0 ? width / rect.width : 1
    return (event.clientX - (rect?.left ?? 0)) * scale - MARGIN.left
  }

  function commit(range: { from: number; to: number } | null) {
    onBrushChange(range ? { from: new Date(range.from), to: new Date(range.to) } : null)
  }

  function handlePointerDown(event: PointerEvent<SVGRectElement>) {
    if (event.button !== 0) return
    const px = pointerPx(event)
    const t = x.invert(px)
    // jsdom and some older engines lack pointer capture.
    if ('setPointerCapture' in event.currentTarget) event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ anchor: t, current: t, anchorPx: px })
  }

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    if (!drag) return
    setDrag({ ...drag, current: x.invert(pointerPx(event)) })
  }

  function handlePointerUp(event: PointerEvent<SVGRectElement>) {
    if (!drag) return
    const px = pointerPx(event)
    setDrag(null)
    if (Math.abs(px - drag.anchorPx) < CLICK_SLOP_PX) commit(null)
    else commit(brushRange(drag.anchor, x.invert(px), win))
  }

  function handleKeyDown(event: KeyboardEvent<SVGRectElement>) {
    const span = win.end - win.start
    const current = committed ?? { from: Math.max(win.start, win.end - KEY_DEFAULT_SPAN_MS), to: win.end }
    const rangeMs = current.to - current.from
    let next: { from: number; to: number } | null | undefined
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        const dir = event.key === 'ArrowLeft' ? -1 : 1
        if (!committed) next = current
        else if (event.shiftKey) {
          const to = Math.min(win.end, Math.max(current.from + KEY_STEP_MS, current.to + dir * KEY_STEP_MS))
          next = { from: current.from, to }
        } else {
          const shift = Math.min(win.end - current.to, Math.max(win.start - current.from, dir * KEY_STEP_MS))
          next = { from: current.from + shift, to: current.to + shift }
        }
        break
      }
      case 'Home':
        next = { from: win.start, to: win.start + Math.min(rangeMs, span) }
        break
      case 'End':
        next = { from: win.end - Math.min(rangeMs, span), to: win.end }
        break
      case 'Escape':
      case 'Delete':
      case 'Backspace':
        if (!committed) return
        next = null
        break
      default:
        return
    }
    event.preventDefault()
    commit(next)
  }

  const laneSummaries = lanes.map((lane) => ({
    lane,
    counts: severityCounts(marks.filter((m) => m.event.channel === lane).map((m) => m.event)),
  }))
  const rangeText = committed ? `${formatClock(committed.from)} to ${formatClock(committed.to)}` : null

  return (
    <figure
      className={cx('m-0 flex flex-col gap-2', className)}
      data-binned={isBinned ? 'true' : 'false'}
    >
      <svg
        ref={svgRef}
        role="group"
        aria-label={title}
        aria-describedby={summaryId}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto max-w-full select-none overflow-visible touch-none"
      >
        <Group left={MARGIN.left} top={MARGIN.top}>
          <g aria-hidden="true">
            {lanes.map((lane) => (
              <g key={String(lane)} data-lane={laneLabel(lane)}>
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={laneY(lane) + LANE_HEIGHT}
                  y2={laneY(lane) + LANE_HEIGHT}
                  className={chartTheme.className.grid}
                />
                <text
                  x={-10}
                  y={laneY(lane) + LANE_HEIGHT / 2}
                  dy="0.33em"
                  textAnchor="end"
                  className={chartTheme.className.tickLabel}
                >
                  {laneLabel(lane)}
                </text>
              </g>
            ))}
          </g>

          {shown && (
            <rect
              data-testid="timeline-brush-selection"
              aria-hidden="true"
              x={x(shown.from)}
              width={Math.max(1, x(shown.to) - x(shown.from))}
              y={0}
              height={innerHeight}
              className="[fill:var(--chart-crosshair)] [fill-opacity:0.12] [stroke:var(--chart-crosshair)] [shape-rendering:crispEdges]"
            />
          )}

          <g aria-hidden="true" pointerEvents="none">
            {isBinned
              ? bins.map((bin) => {
                  const bx = x(bin.start)
                  const bw = Math.max(1, x(bin.end) - bx)
                  const top = laneY(bin.lane)
                  return (
                    <g
                      key={`${String(bin.lane)}-${bin.start}`}
                      data-bin
                      data-severity={bin.severity}
                      data-count={bin.count}
                    >
                      <title>
                        {`${laneLabel(bin.lane)} ${formatClock(bin.start)}–${formatClock(bin.end)}: ${countsText(bin.bySeverity)}`}
                      </title>
                      <rect
                        x={bx + 1}
                        width={Math.max(1, bw - 2)}
                        y={top + 3}
                        height={LANE_HEIGHT - 6}
                        rx={2}
                        className={BIN_FILL[bin.severity]}
                      />
                      <g transform={`translate(${bx + 3}, ${top + (LANE_HEIGHT - ICON) / 2})`}>
                        <StatusIcon status={bin.severity} size={ICON} className={TONE[bin.severity]} />
                      </g>
                      <text
                        x={bx + ICON + 5}
                        y={top + LANE_HEIGHT / 2}
                        dy="0.33em"
                        className={chartTheme.className.crosshairLabel}
                      >
                        {bin.count}
                      </text>
                    </g>
                  )
                })
              : marks.map(({ event, t }) => (
                  <g
                    key={event.id}
                    data-event-id={event.id}
                    data-severity={event.severity}
                    transform={`translate(${x(t) - ICON / 2}, ${laneY(event.channel) + (LANE_HEIGHT - ICON) / 2})`}
                  >
                    <title>
                      {`${laneLabel(event.channel)} ${STATUS_LABEL[event.severity]} · ${KIND_LABEL[event.kind]} · ${formatClock(t)}`}
                    </title>
                    <StatusIcon status={event.severity} size={ICON} className={TONE[event.severity]} />
                  </g>
                ))}
          </g>

          <AxisBottom
            top={innerHeight}
            scale={x}
            tickValues={hourTicks(win)}
            tickLength={chartTheme.tickLength}
            axisLineClassName={chartTheme.className.axisLine}
            tickLineProps={{ className: chartTheme.className.tickLine }}
            tickFormat={(value) => formatClock(Number(value))}
            tickLabelProps={() => ({
              className: chartTheme.className.tickLabel,
              textAnchor: 'middle',
              dy: '0.25em',
            })}
          />

          <rect
            data-testid="timeline-brush"
            role="slider"
            tabIndex={0}
            aria-label="Time range brush"
            aria-valuemin={win.start}
            aria-valuemax={win.end}
            aria-valuenow={committed?.from ?? win.start}
            aria-valuetext={rangeText ?? 'Full 24 hours, no range selected'}
            width={innerWidth}
            height={innerHeight}
            className="cursor-crosshair [fill:transparent] outline-none focus-visible:[stroke:var(--chart-crosshair)] focus-visible:[stroke-width:2]"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              setDrag(null)
            }}
            onKeyDown={handleKeyDown}
          />
        </Group>
      </svg>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-12 text-text-muted">
        <ul className="m-0 flex list-none flex-wrap gap-x-3 p-0" aria-label="Severity legend">
          {ALARM_SEVERITIES.map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5">
              <StatusIcon status={s} size={ICON} className={TONE[s]} />
              <span>{STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ul>
        {isBinned && <span>{`Grouped in ${binSize / 60_000} min buckets`}</span>}
        <span className="num">{rangeText ? `Range ${rangeText}` : 'Drag across the lanes to select a range'}</span>
        {committed && (
          <button
            type="button"
            className="rounded-1 border border-line-strong px-2 py-0.5 text-text-primary"
            onClick={() => {
              commit(null)
            }}
          >
            Clear range
          </button>
        )}
      </figcaption>

      <ul id={summaryId} className="sr-only">
        {laneSummaries.map(({ lane, counts }) => (
          <li key={String(lane)}>{`${laneLabel(lane)}: ${countsText(counts)}`}</li>
        ))}
      </ul>
    </figure>
  )
}
