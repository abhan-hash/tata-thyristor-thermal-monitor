import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { formatTempC, PLACEHOLDER } from '../domain/format'
import { HEAT_BREAKPOINTS_C, heatStopIndex, heatToken } from '../domain/heatScale'
import { statusFor, type StatusBand } from '../domain/status'
import { DEFAULT_THRESHOLDS } from '../domain/thresholds'
import type { ChannelId } from '../domain/types'
import { CONTROL_CAPS, cx } from '../kit/controlStyles'
import { StatusIcon } from '../kit/icons/StatusIcon'
import { STATUS_LABEL } from '../kit/StatusChip'

export interface DailyPeakCell {
  channel: ChannelId
  /** UTC calendar day, `YYYY-MM-DD`. */
  day: string
  /** °C */
  peak_tj: number
}

export interface ChannelDayHeatmapProps {
  /** Daily peaks; one row per channel and one column per distinct day, in ascending order. */
  peaks: readonly DailyPeakCell[]
  /** Rows to draw, top to bottom. Default: channels 1–6. */
  channels?: readonly ChannelId[]
  /** Tj warning/critical limits; cells at or above warning carry a status icon. */
  band?: StatusBand
  /** Accessible name of the grid. */
  label?: string
  className?: string
}

const DEFAULT_CHANNELS: readonly ChannelId[] = [1, 2, 3, 4, 5, 6]

interface Cell {
  row: number
  col: number
  channel: ChannelId
  day: string
  /** NaN when the day has no reading for the channel. */
  peak: number
}

/** Distinct days in ascending order, and a `channel|day → peak` lookup. */
export function heatmapGrid(peaks: readonly DailyPeakCell[]): { days: string[]; peakAt: Map<string, number> } {
  const peakAt = new Map<string, number>()
  const days = new Set<string>()
  for (const p of peaks) {
    days.add(p.day)
    peakAt.set(`${String(p.channel)}|${p.day}`, p.peak_tj)
  }
  return { days: [...days].sort(), peakAt }
}

/**
 * Readout for a cell, e.g. "CH 3 · 2026-11-12 · PEAK 112.4 °C · WARNING".
 * The status word is added at or above the warning limit, and "NO DATA" for a
 * missing reading, so the status never depends on the cell colour.
 */
export function cellReadout(cell: Pick<Cell, 'channel' | 'day' | 'peak'>, band: StatusBand): string {
  const head = `CH ${String(cell.channel)} · ${cell.day} · PEAK`
  if (!Number.isFinite(cell.peak)) return `${head} ${PLACEHOLDER} · NO DATA`
  const status = statusFor(cell.peak, band)
  const value = formatTempC(cell.peak).trim()
  return status === 'normal' ? `${head} ${value}` : `${head} ${value} · ${STATUS_LABEL[status]}`
}

/** Short column label: day of month, e.g. "12". */
function dayOfMonth(day: string): string {
  return String(Number(day.slice(8, 10)))
}

/**
 * Channel × day grid of daily peak Tj (Requirements 27.2, 27.3). Cells are
 * coloured with the heat tokens; cells at or above the warning limit also
 * carry the status icon, so the grid never relies on colour alone. The grid
 * has one tab stop and arrow-key navigation; the hovered or focused cell's
 * peak Tj and date are shown in a readout and in the cell's accessible name.
 */
export function ChannelDayHeatmap({
  peaks,
  channels = DEFAULT_CHANNELS,
  band = DEFAULT_THRESHOLDS.junction_temp,
  label = 'Daily peak junction temperature by channel',
  className,
}: ChannelDayHeatmapProps) {
  const { days, peakAt } = useMemo(() => heatmapGrid(peaks), [peaks])
  const rows: Cell[][] = channels.map((channel, row) =>
    days.map((day, col) => ({
      row,
      col,
      channel,
      day,
      peak: peakAt.get(`${String(channel)}|${day}`) ?? NaN,
    })),
  )

  const [focusPos, setFocusPos] = useState<{ row: number; col: number }>({ row: 0, col: 0 })
  const [hoverPos, setHoverPos] = useState<{ row: number; col: number } | null>(null)
  const [focused, setFocused] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const maxRow = rows.length - 1
  const maxCol = days.length - 1
  const clamp = (pos: { row: number; col: number }) => ({
    row: Math.min(Math.max(0, pos.row), Math.max(0, maxRow)),
    col: Math.min(Math.max(0, pos.col), Math.max(0, maxCol)),
  })
  const tabPos = clamp(focusPos)
  const activePos = hoverPos ?? (focused ? tabPos : null)
  const active = activePos ? rows[activePos.row]?.[activePos.col] : undefined

  function moveTo(next: { row: number; col: number }) {
    const pos = clamp(next)
    setFocusPos(pos)
    gridRef.current?.querySelector<HTMLElement>(`[data-row="${String(pos.row)}"][data-col="${String(pos.col)}"]`)?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const { row, col } = tabPos
    const moves: Record<string, { row: number; col: number }> = {
      ArrowRight: { row, col: col + 1 },
      ArrowLeft: { row, col: col - 1 },
      ArrowDown: { row: row + 1, col },
      ArrowUp: { row: row - 1, col },
      Home: { row, col: 0 },
      End: { row, col: maxCol },
    }
    const next = moves[event.key]
    if (!next) return
    event.preventDefault()
    moveTo(next)
  }

  return (
    <div className={cx('flex flex-col gap-3 font-sans', className)}>
      <div
        ref={gridRef}
        role="grid"
        aria-label={label}
        aria-rowcount={rows.length + 1}
        aria-colcount={days.length + 1}
        data-days={days.length}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setFocused(true)
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
        }}
        onPointerLeave={() => {
          setHoverPos(null)
        }}
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `max-content repeat(${String(days.length)}, minmax(0, 1fr))` }}
      >
        <div role="row" className="contents">
          {/* Kept in the grid flow (sr-only would take it out and shift every column). */}
          <span role="columnheader">
            <span className="sr-only">Channel</span>
          </span>
          {days.map((day, col) => (
            <span
              key={day}
              role="columnheader"
              aria-label={day}
              className={cx(
                'num text-center text-[length:var(--text-11)] text-[color:var(--text-muted)]',
                // Label every 5th day and the last one; the full date is the accessible name.
                col % 5 !== 0 && col !== maxCol && 'invisible',
              )}
            >
              {dayOfMonth(day)}
            </span>
          ))}
        </div>
        {rows.map((cells, row) => (
          <div key={channels[row]} role="row" className="contents">
            <span
              role="rowheader"
              className={cx(CONTROL_CAPS, 'flex items-center pe-2 text-[color:var(--text-secondary)]')}
            >
              CH {channels[row]}
            </span>
            {cells.map((cell) => {
              const finite = Number.isFinite(cell.peak)
              const status = statusFor(cell.peak, band)
              const isTab = cell.row === tabPos.row && cell.col === tabPos.col
              return (
                <div
                  key={cell.day}
                  role="gridcell"
                  tabIndex={isTab ? 0 : -1}
                  aria-label={cellReadout(cell, band)}
                  aria-selected={activePos?.row === cell.row && activePos.col === cell.col}
                  data-row={cell.row}
                  data-col={cell.col}
                  data-heat={finite ? heatStopIndex(cell.peak) : undefined}
                  data-status={status}
                  onPointerEnter={() => {
                    setHoverPos({ row: cell.row, col: cell.col })
                  }}
                  onFocus={() => {
                    setFocusPos({ row: cell.row, col: cell.col })
                  }}
                  className={cx(
                    'relative flex aspect-square min-h-3 items-center justify-center rounded-[2px] outline-none',
                    'focus-visible:z-10 hover:[outline:1px_solid_var(--text-primary)]',
                    'text-[color:var(--surface-page)]',
                  )}
                  style={
                    finite
                      ? { backgroundColor: heatToken(heatStopIndex(cell.peak)) }
                      : { backgroundImage: 'var(--status-fault-hatch)' }
                  }
                >
                  {(status === 'warning' || status === 'critical') && (
                    <StatusIcon status={status} size={10} className="max-w-full" />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          data-testid="heatmap-readout"
          className="num min-h-[1.5em] text-[length:var(--text-12)] text-[color:var(--text-primary)]"
        >
          {active ? cellReadout(active, band) : (
            <span className="text-[color:var(--text-muted)]">Hover or focus a cell for its peak Tj and date</span>
          )}
        </p>
        <HeatLegend />
      </div>
    </div>
  )
}

/** Heat stop swatches with the lower bound of each stop as text. */
function HeatLegend() {
  const stops = [0, ...HEAT_BREAKPOINTS_C.map((_, i) => i + 1)]
  return (
    <div aria-label="Heat scale, °C" role="group" className="flex items-end gap-[2px]">
      {stops.map((stop) => (
        <span key={stop} className="flex flex-col items-center gap-1">
          <span className="block h-2 w-6 rounded-[1px]" style={{ backgroundColor: heatToken(stop) }} />
          <span className="num text-[length:var(--text-11)] text-[color:var(--text-muted)]">
            {stop === 0 ? `<${String(HEAT_BREAKPOINTS_C[0])}` : String(HEAT_BREAKPOINTS_C[stop - 1])}
          </span>
        </span>
      ))}
    </div>
  )
}
