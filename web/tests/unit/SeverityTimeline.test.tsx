import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { SeverityTimeline, type TimelineRange } from '../../src/charts/SeverityTimeline'
import {
  binEvents,
  brushRange,
  chooseBinSize,
  shouldBin,
  timelineLanes,
  timelineMarks,
  timelineWindow,
} from '../../src/charts/severityTimelineModel'
import type { AlarmEvent } from '../../src/domain/types'
import { STATUS_ICON_SHAPE } from '../../src/kit/icons/StatusIcon'
import { useTimelineBrush } from '../../src/pages/Alarms/useTimelineBrush'

const END = new Date('2026-01-15T09:30:00.000Z')
const HOUR = 3_600_000
const WIN = timelineWindow(END)

function event(id: string, partial: Partial<AlarmEvent> & { hoursAgo: number }): AlarmEvent {
  const { hoursAgo, ...rest } = partial
  return {
    id,
    channel: 1,
    kind: 'junction_temp',
    severity: 'warning',
    raised_at: new Date(END.getTime() - hoursAgo * HOUR).toISOString(),
    peak_value: 112,
    unit: '°C',
    ...rest,
  }
}

const SAMPLE: AlarmEvent[] = [
  event('a', { hoursAgo: 1, channel: 1, severity: 'warning' }),
  event('b', { hoursAgo: 2, channel: 3, severity: 'critical' }),
  event('c', { hoursAgo: 3, channel: 'drive', severity: 'fault', kind: 'sensor' }),
  event('old', { hoursAgo: 30, channel: 2, severity: 'critical' }),
]

function many(n: number): AlarmEvent[] {
  const severities = ['warning', 'critical', 'fault'] as const
  return Array.from({ length: n }, (_, i) =>
    event(`e${i}`, {
      hoursAgo: (i % 96) / 4,
      channel: ((i % 6) + 1) as AlarmEvent['channel'],
      severity: severities[i % 3] ?? 'warning',
    }),
  )
}

describe('severityTimelineModel', () => {
  it('spans 24 h and lists one lane per channel plus drive', () => {
    expect(WIN.end - WIN.start).toBe(24 * HOUR)
    expect(timelineLanes()).toEqual([1, 2, 3, 4, 5, 6, 'drive'])
    expect(timelineLanes(['drive', 2])).toEqual([2, 'drive'])
  })

  it('keeps in-window events oldest first and drops the rest', () => {
    expect(timelineMarks(SAMPLE, WIN).map((m) => m.event.id)).toEqual(['c', 'b', 'a'])
  })

  it('bins at 200 events or more', () => {
    expect(shouldBin(199)).toBe(false)
    expect(shouldBin(200)).toBe(true)
  })

  it('bins every in-window event exactly once with the worst severity per bucket', () => {
    const marks = timelineMarks(many(300), WIN)
    const size = chooseBinSize(WIN, 888)
    const bins = binEvents(marks, WIN, size)
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(marks.length)
    for (const b of bins) {
      expect(b.end - b.start).toBeLessThanOrEqual(size)
      const worst = b.bySeverity.fault ? 'fault' : b.bySeverity.critical ? 'critical' : 'warning'
      expect(b.severity).toBe(worst)
    }
  })

  it('chooses a bucket wide enough for its mark', () => {
    const size = chooseBinSize(WIN, 888)
    expect((size / (24 * HOUR)) * 888).toBeGreaterThanOrEqual(28)
  })

  it('orders and clamps a brush range to the window', () => {
    expect(brushRange(WIN.end + HOUR, WIN.end - HOUR, WIN)).toEqual({ from: WIN.end - HOUR, to: WIN.end })
  })
})

describe('SeverityTimeline', () => {
  it('draws one lane per channel and a severity icon per event, named in text', () => {
    const { container } = render(<SeverityTimeline events={SAMPLE} end={END} onBrushChange={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'Alarm timeline, last 24 h' })).toBeInTheDocument()
    const lanes = [...container.querySelectorAll('[data-lane]')].map((el) => el.getAttribute('data-lane'))
    expect(lanes).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'DRIVE'])

    const marks = container.querySelectorAll('[data-event-id]')
    expect([...marks].map((m) => m.getAttribute('data-event-id'))).toEqual(['c', 'b', 'a'])
    for (const mark of marks) {
      const severity = mark.getAttribute('data-severity') as 'warning' | 'critical' | 'fault'
      expect(mark.querySelector('[data-shape]')?.getAttribute('data-shape')).toBe(STATUS_ICON_SHAPE[severity])
    }
    // Severity is also given as text: legend and per-lane summary.
    expect(screen.getByRole('list', { name: 'Severity legend' })).toHaveTextContent(/WARNING.*CRITICAL.*SENSOR FAULT/)
    expect(screen.getByText('T3: 1 critical')).toBeInTheDocument()
    expect(screen.getByText('DRIVE: 1 sensor fault')).toBeInTheDocument()
    expect(container.querySelector('figure')).toHaveAttribute('data-binned', 'false')
  })

  it('bins 200 events into buckets with counts', () => {
    const events = many(200)
    const { container } = render(<SeverityTimeline events={events} end={END} onBrushChange={vi.fn()} />)
    expect(container.querySelector('figure')).toHaveAttribute('data-binned', 'true')
    expect(container.querySelectorAll('[data-event-id]')).toHaveLength(0)
    const bins = [...container.querySelectorAll('[data-bin]')]
    expect(bins.length).toBeGreaterThan(0)
    const total = bins.reduce((sum, b) => sum + Number(b.getAttribute('data-count')), 0)
    expect(total).toBe(timelineMarks(events, WIN).length)
    expect(bins[0]?.querySelector('[data-shape]')).not.toBeNull()
  })

  it('reports a dragged range and clears on click', () => {
    const onBrushChange = vi.fn<(r: TimelineRange | null) => void>()
    render(<SeverityTimeline events={SAMPLE} end={END} width={960} onBrushChange={onBrushChange} />)
    const brush = screen.getByRole('slider', { name: 'Time range brush' })
    // jsdom has a zero-size layout, so clientX maps 1:1 to SVG px; plot starts at 56 px and is 888 px wide.
    fireEvent.pointerDown(brush, { clientX: 56 + 444, button: 0, pointerId: 1 })
    fireEvent.pointerMove(brush, { clientX: 56 + 888, pointerId: 1 })
    fireEvent.pointerUp(brush, { clientX: 56 + 888, pointerId: 1 })
    expect(onBrushChange).toHaveBeenLastCalledWith({
      from: new Date(WIN.start + 12 * HOUR),
      to: new Date(WIN.end),
    })
    fireEvent.pointerDown(brush, { clientX: 100, button: 0, pointerId: 1 })
    fireEvent.pointerUp(brush, { clientX: 101, pointerId: 1 })
    expect(onBrushChange).toHaveBeenLastCalledWith(null)
  })

  it('operates the brush from the keyboard', () => {
    function Harness() {
      const [range, setRange] = useState<TimelineRange | null>(null)
      return (
        <SeverityTimeline
          events={SAMPLE}
          end={END}
          from={range?.from}
          to={range?.to}
          onBrushChange={setRange}
        />
      )
    }
    render(<Harness />)
    const brush = screen.getByRole('slider', { name: 'Time range brush' })
    expect(brush).toHaveAttribute('aria-valuetext', 'Full 24 hours, no range selected')
    fireEvent.keyDown(brush, { key: 'ArrowLeft' })
    // First arrow selects the last hour.
    expect(brush).toHaveAttribute('aria-valuenow', String(WIN.end - HOUR))
    fireEvent.keyDown(brush, { key: 'ArrowLeft' })
    expect(brush).toHaveAttribute('aria-valuenow', String(WIN.end - HOUR - 15 * 60_000))
    fireEvent.keyDown(brush, { key: 'Home' })
    expect(brush).toHaveAttribute('aria-valuenow', String(WIN.start))
    expect(screen.getByTestId('timeline-brush-selection')).toBeInTheDocument()
    fireEvent.keyDown(brush, { key: 'Escape' })
    expect(screen.queryByTestId('timeline-brush-selection')).toBeNull()
  })
})

describe('useTimelineBrush', () => {
  it('writes ?from= and ?to= and keeps other params', () => {
    let search = ''
    function Page() {
      const brush = useTimelineBrush()
      search = useLocation().search
      return <SeverityTimeline events={SAMPLE} end={END} {...brush} />
    }
    render(
      <MemoryRouter initialEntries={['/alarms?sev=critical&dev=1']}>
        <Page />
      </MemoryRouter>,
    )
    const brush = screen.getByRole('slider', { name: 'Time range brush' })
    act(() => {
      fireEvent.keyDown(brush, { key: 'ArrowRight' })
    })
    const params = new URLSearchParams(search)
    expect(params.get('from')).toBe(new Date(WIN.end - HOUR).toISOString())
    expect(params.get('to')).toBe(END.toISOString())
    expect(params.get('sev')).toBe('critical')
    expect(params.get('dev')).toBe('1')
    expect(screen.getByRole('button', { name: 'Clear range' })).toBeInTheDocument()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Clear range' }))
    })
    expect(new URLSearchParams(search).has('from')).toBe(false)
    expect(new URLSearchParams(search).has('to')).toBe(false)
  })
})
