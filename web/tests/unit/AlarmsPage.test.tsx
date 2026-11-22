import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EVENT_TRACE_HALF_S, formatSecondsFromRaise, tracePoints } from '../../src/charts/EventTrace'
import { HistoryProvider } from '../../src/data/historyHooks'
import { TelemetryProvider } from '../../src/data/hooks'
import { MockHistoryRepository } from '../../src/data/mock/MockHistoryRepository'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { TelemetryStore } from '../../src/data/store'
import type { AlarmEvent, DriveFrame } from '../../src/domain/types'
import { AlarmsPage } from '../../src/pages/Alarms/AlarmsPage'
import { mergeEvents } from '../../src/pages/Alarms/alarmUi'
import { resetUiStore } from '../../src/state/uiStore'

const MIN = 60_000

/** `open: true` leaves the event active (no `cleared_at`). */
function event(id: string, minutesAgo: number, { open = false, ...partial }: Partial<AlarmEvent> & { open?: boolean } = {}): AlarmEvent {
  const e: AlarmEvent = {
    id,
    channel: 1,
    kind: 'junction_temp',
    severity: 'warning',
    raised_at: new Date(Date.now() - minutesAgo * MIN).toISOString(),
    cleared_at: new Date(Date.now() - (minutesAgo - 2) * MIN).toISOString(),
    peak_value: 112.4,
    unit: '°C',
    ...partial,
  }
  if (open) delete e.cleared_at
  return e
}

const SAMPLE: AlarmEvent[] = [
  event('h-warn', 10, { channel: 1, severity: 'warning' }),
  event('h-crit', 30, { channel: 3, severity: 'critical', peak_value: 126.1 }),
  event('h-fault', 50, { channel: 'drive', severity: 'fault', kind: 'sensor', unit: 'K' }),
]

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="search">{location.search}</output>
}

function setup({ alarms = SAMPLE, url = '/alarms' }: { alarms?: AlarmEvent[]; url?: string } = {}) {
  const repo = new MockHistoryRepository({ alarms, seed: 3 })
  const source = new MockTelemetrySource({ seed: 7, epochMs: Date.now() })
  const store = new TelemetryStore(source, { decodeLogger: { marginMismatch: () => undefined } })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>
      <QueryClientProvider client={client}>
        <HistoryProvider repository={repo}>
          <TelemetryProvider store={store} autoStart={false}>
            {children}
            <LocationProbe />
          </TelemetryProvider>
        </HistoryProvider>
      </QueryClientProvider>
    </MemoryRouter>
  )
  const view = render(<AlarmsPage />, { wrapper })
  const search = () => screen.getByTestId('search').textContent ?? ''
  return { repo, source, store, view, search, user: userEvent.setup() }
}

const ROW = 'ul[aria-label="Alarm events"] article[data-event-id]'
const list = () => screen.getByRole('list', { name: 'Alarm events' })
const row = (id: string) => document.querySelector(`ul[aria-label="Alarm events"] article[data-event-id="${id}"]`) as HTMLElement

function rowIds(): string[] {
  return Array.from(document.querySelectorAll(ROW)).map((el) => el.getAttribute('data-event-id') ?? '')
}

function withTj(frame: DriveFrame, index: number, tj: number): DriveFrame {
  const thyristors = frame.thyristors.map((ch, i) =>
    i === index ? { ...ch, tj_estimated: tj, margin_to_limit: 125 - tj } : ch,
  ) as unknown as DriveFrame['thyristors']
  return { ...frame, thyristors }
}

afterEach(() => {
  resetUiStore()
})

describe('AlarmsPage', () => {
  it('shows the active count and filters the list by chip, writing ?sev= and ?ch=', async () => {
    const { user, search } = setup({ alarms: [...SAMPLE, event('h-open', 5, { open: true })] })
    await waitFor(() => {
      expect(rowIds()).toHaveLength(4)
    })
    expect(screen.getByTestId('active-count')).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /acknowledge all visible/i })).toBeEnabled()

    await user.click(within(screen.getByRole('group', { name: 'Severity filter' })).getByRole('button', { name: /critical/i }))
    expect(search()).toContain('sev=critical')
    expect(rowIds()).toEqual(['h-crit'])

    await user.click(within(screen.getByRole('group', { name: 'Channel filter' })).getByRole('button', { name: /T1/ }))
    expect(search()).toContain('ch=T1')
    expect(screen.getByText('No matching alarms')).toBeInTheDocument()
  })

  it('applies ?from=/?to= from the URL to the list', async () => {
    const from = new Date(Date.now() - 40 * MIN).toISOString()
    const to = new Date(Date.now() - 20 * MIN).toISOString()
    setup({ url: `/alarms?from=${from}&to=${to}` })
    await waitFor(() => {
      expect(rowIds()).toEqual(['h-crit'])
    })
  })

  it('expands an event in place, writes ?event= and shows the trace', async () => {
    const { user, search } = setup()
    const toggle = await within(await screen.findByRole('list', { name: 'Alarm events' })).findByRole('button', { name: /^T3 CRITICAL/ })
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(search()).toContain('event=h-crit')
    expect(await screen.findByTestId('event-trace')).toBeInTheDocument()
    await user.click(toggle)
    expect(search()).not.toContain('event=')
  })

  it('asks for inline confirmation, then acknowledges with the session user and shows user and time', async () => {
    const { user, repo } = setup()
    const spy = vi.spyOn(repo, 'acknowledge')
    await screen.findByRole('list', { name: 'Alarm events' })
    const warn = row('h-warn')
    await user.click(within(warn).getByRole('button', { name: /^acknowledge/i }))
    const confirm = within(warn).getByRole('group', { name: 'Confirm acknowledgement' })
    expect(confirm).toHaveTextContent('Acknowledge as Demo Engineer?')
    expect(spy).not.toHaveBeenCalled()

    await user.click(within(confirm).getByRole('button', { name: 'Confirm' }))
    expect(spy).toHaveBeenCalledWith('h-warn', 'Demo Engineer')
    const record = await within(warn).findByTestId('ack-record')
    expect(record).toHaveTextContent(/Demo Engineer · \d\d:\d\d:\d\d/)
  })

  it('acknowledges with the keyboard alone; Escape cancels and restores focus', async () => {
    const { user, repo } = setup()
    const spy = vi.spyOn(repo, 'acknowledge')
    await screen.findByRole('list', { name: 'Alarm events' })
    const warn = row('h-warn')
    const ack = within(warn).getByRole('button', { name: /^acknowledge/i })
    while (document.activeElement !== ack) await user.tab()

    await user.keyboard('{Enter}')
    const confirmBtn = within(warn).getByRole('button', { name: 'Confirm' })
    expect(confirmBtn).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(within(warn).queryByRole('group', { name: 'Confirm acknowledgement' })).toBeNull()
    expect(within(warn).getByRole('button', { name: /^acknowledge/i })).toHaveFocus()

    await user.keyboard(' ')
    expect(within(warn).getByRole('button', { name: 'Confirm' })).toHaveFocus()
    await user.keyboard(' ')
    await within(warn).findByTestId('ack-record')
    expect(spy).toHaveBeenCalledWith('h-warn', 'Demo Engineer')
  })

  it('inserts a new live alarm at the top and announces it politely', async () => {
    const { source, store } = setup()
    await waitFor(() => {
      expect(rowIds()).toHaveLength(3)
    })
    const announcer = screen.getByTestId('alarm-announcer')
    expect(announcer).toHaveAttribute('aria-live', 'polite')
    expect(announcer).toHaveTextContent('')

    act(() => {
      for (const f of source.runTicks(40)) store.ingest(withTj(f, 2, 118))
    })
    const first = rowIds()[0] ?? ''
    expect(first).toMatch(/^alm-/)
    expect(row(first)).toHaveTextContent(/T3 WARNING · Junction temp/)
    expect(announcer).toHaveTextContent(/New alarm: T3 WARNING/)
  })

  it('shows a no-trace message for a live event instead of querying the trace', async () => {
    const { source, store, repo, user } = setup()
    const trace = vi.spyOn(repo, 'trace')
    await waitFor(() => {
      expect(rowIds()).toHaveLength(3)
    })
    act(() => {
      for (const f of source.runTicks(40)) store.ingest(withTj(f, 2, 118))
    })
    await user.click(within(list()).getAllByRole('button', { name: /^T3 WARNING/ })[0] as HTMLElement)
    expect(screen.getByText('Trace not recorded yet')).toBeInTheDocument()
    expect(trace).not.toHaveBeenCalled()
  })

  it('virtualises the list and bins the timeline at 200 events', async () => {
    const severities = ['warning', 'critical', 'fault'] as const
    const many = Array.from({ length: 240 }, (_, i) =>
      event(`m-${String(i)}`, 5 + i * 5, {
        channel: ((i % 6) + 1) as AlarmEvent['channel'],
        severity: severities[i % 3] ?? 'warning',
      }),
    )
    // jsdom has no layout: give the scroll viewport a height so the virtualiser renders a window.
    const rect = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600)
    setup({ alarms: many })
    const events = await screen.findByRole('list', { name: 'Alarm events' })
    expect(events).toHaveAttribute('data-virtualized', 'true')
    const rendered = within(events).queryAllByRole('listitem')
    expect(rendered.length).toBeGreaterThan(0)
    expect(rendered.length).toBeLessThan(240)
    expect(rendered[0]).toHaveAttribute('aria-setsize', '240')
    expect(document.querySelector('figure[data-binned]')).toHaveAttribute('data-binned', 'true')
    rect.mockRestore()
  })
})

describe('alarm page helpers', () => {
  it('merges live events (latest version per id) above history, newest first', () => {
    const raise = event('alm-1', 1, { open: true })
    const clear = { ...raise, cleared_at: new Date().toISOString() }
    const merged = mergeEvents([raise, clear], SAMPLE)
    expect(merged.map((e) => e.id)).toEqual(['alm-1', 'h-warn', 'h-crit', 'h-fault'])
    expect(merged[0]?.cleared_at).toBe(clear.cleared_at)
  })

  it('places the trace on seconds from the raise', () => {
    const raised = Date.UTC(2026, 0, 15, 9, 0, 0)
    const t = Array.from({ length: 1201 }, (_, i) => raised - 60_000 + i * 100)
    const tj = t.map(() => 100)
    const pts = tracePoints({ t, tj }, new Date(raised).toISOString())
    expect(pts.x[0]).toBeCloseTo(-EVENT_TRACE_HALF_S)
    const last = pts.x[pts.x.length - 1] ?? 0
    expect(last).toBeGreaterThan(EVENT_TRACE_HALF_S - 1)
    expect(last).toBeLessThanOrEqual(EVENT_TRACE_HALF_S)
    expect(formatSecondsFromRaise(0)).toBe('RAISE')
    expect(formatSecondsFromRaise(-12)).toBe('\u221212 S')
    expect(formatSecondsFromRaise(30)).toBe('+30 S')
  })
})
