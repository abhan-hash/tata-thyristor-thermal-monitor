import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { TelemetryProvider } from '../../src/data/hooks'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { REPLAY_STEPS } from '../../src/data/mock/replay'
import { TelemetryStore } from '../../src/data/store'
import type { DriveFrame } from '../../src/domain/types'
import { OverviewPage } from '../../src/pages/Overview/OverviewPage'
import {
  deltaFraction,
  rackRows,
  signedDelta,
  timeToWarningText,
} from '../../src/pages/Overview/overviewModel'

const EPOCH = Date.UTC(2026, 10, 21)
const quiet = { marginMismatch: () => undefined }

let store: TelemetryStore | undefined

afterEach(() => {
  store?.stop()
  store = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function setup(entry = '/?ch=T1') {
  const source = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
  const s = new TelemetryStore(source, { decodeLogger: quiet })
  store = s
  const router = createMemoryRouter([{ path: '/', Component: OverviewPage }, { path: '/drive', element: null }], {
    initialEntries: [entry],
  })
  render(
    <TelemetryProvider store={s} autoStart={false}>
      <RouterProvider router={router} />
    </TelemetryProvider>,
  )
  const feed = (n: number) => {
    act(() => {
      for (const f of source.runTicks(n)) s.ingest(f)
    })
  }
  const ingest = (f: DriveFrame) => {
    act(() => {
      s.ingest(f)
    })
  }
  return { store: s, source, router, feed, ingest }
}

function withAllTj(frame: DriveFrame, tj: number): DriveFrame {
  const thyristors = frame.thyristors.map((ch) => ({
    ...ch,
    tj_estimated: tj,
    margin_to_limit: 125 - tj,
  })) as unknown as DriveFrame['thyristors']
  return { ...frame, thyristors }
}

describe('Overview second panel', () => {
  it('renders the scenario heading, prompt and a six-option source grid', () => {
    setup()
    expect(screen.getByRole('heading', { name: /Inspect Stand-04\s*in action/ })).toBeInTheDocument()
    expect(screen.getByText('Choose a drive scenario…')).toBeInTheDocument()
    const group = screen.getByRole('radiogroup', { name: 'Drive scenario' })
    const labels = within(group)
      .getAllByRole('radio')
      .map((r) => r.textContent)
    expect(labels).toEqual(['NORMAL', 'BAR ENTRY', 'FAN FAIL', 'CLOGGING', 'OVERLOAD', 'CLEAR'])
  })

  it('selecting a scenario calls setScenario with the matching scenario', () => {
    const { store: s } = setup()
    const spy = vi.spyOn(s, 'setScenario')
    const group = screen.getByRole('radiogroup', { name: 'Drive scenario' })
    fireEvent.click(within(group).getByRole('radio', { name: /FAN FAIL/ }))
    expect(spy).toHaveBeenLastCalledWith('fan_failure', undefined)
    fireEvent.click(within(group).getByRole('radio', { name: /OVERLOAD/ }))
    expect(spy).toHaveBeenLastCalledWith('overload', undefined)
    expect(within(group).getByRole('radio', { name: /OVERLOAD/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('shows six rack rows with Tj at 0.1 °C and the selected row active', () => {
    const { feed } = setup('/?ch=T3')
    feed(5)
    const list = screen.getByRole('navigation', { name: 'Thyristor channels' })
    const rows = within(list).getAllByRole('button')
    expect(rows.map((r) => r.textContent?.slice(0, 2))).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6'])
    for (const row of rows) expect(row.textContent).toMatch(/\d+\.\d °C/)
    expect(rows[2]).toHaveAttribute('aria-current', 'true')
    expect(rows[0]).not.toHaveAttribute('aria-current')
  })

  it('clicking a rack row writes ?ch= and re-binds the trip panel link', () => {
    const { router, feed } = setup('/?ch=T1')
    feed(5)
    const list = screen.getByRole('navigation', { name: 'Thyristor channels' })
    fireEvent.click(within(list).getAllByRole('button')[4] as HTMLElement)
    expect(new URLSearchParams(router.state.location.search).get('ch')).toBe('T5')
    expect(screen.getByRole('link', { name: /Open T5 in Drive Detail/ })).toHaveAttribute('href', '/drive?ch=T5')
  })

  it('shows the trip panel with the margin to 125 °C for the selected channel', () => {
    const { feed, store: s } = setup('/?ch=T2')
    feed(5)
    expect(screen.getByRole('heading', { name: /Know Before\s*It Trips/ })).toBeInTheDocument()
    const tj = s.getSnapshot().frame?.thyristors[1].tj_estimated ?? Number.NaN
    expect(screen.getByLabelText('T2 margin to trip').textContent).toContain((125 - tj).toFixed(1))
  })
})

describe('Overview hero states', () => {
  it('shows TRIP when every channel Tj is at or above 125 °C', () => {
    const { source, ingest } = setup()
    const [frame] = source.runTicks(1)
    expect(screen.queryByText('TRIP')).toBeNull()
    ingest(withAllTj(frame as DriveFrame, 125))
    expect(screen.getByText('TRIP')).toBeInTheDocument()
  })

  it('the replay runs bar entry, fan failure, then recovery with captions', () => {
    vi.useFakeTimers()
    const { store: s } = setup()
    const spy = vi.spyOn(s, 'setScenario')
    fireEvent.click(screen.getByRole('button', { name: /Watch the virtual sensor work/ }))
    const caption = () => document.querySelector('[data-part="replay-caption"]')?.textContent ?? ''
    for (const [i, step] of REPLAY_STEPS.entries()) {
      const prev = REPLAY_STEPS[i - 1]
      act(() => {
        vi.advanceTimersByTime(step.atMs - (prev?.atMs ?? 0))
      })
      expect(spy).toHaveBeenLastCalledWith(step.scenario, undefined)
      expect(caption()).toContain(step.caption)
    }
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['bar_entry', 'fan_failure', 'clear'])
  })
})

describe('overview view model', () => {
  it('formats signed deltas and clamps the bar', () => {
    expect(signedDelta(2.34)).toBe('+2.3')
    expect(signedDelta(-0.84)).toBe('\u22120.8')
    expect(signedDelta(-0.04)).toBe('0.0')
    expect(signedDelta(Number.NaN)).toBe('\u2014 \u2014')
    expect(deltaFraction(5)).toBe(0.5)
    expect(deltaFraction(-40)).toBe(-1)
    expect(deltaFraction(Number.NaN)).toBe(0)
  })

  it('returns placeholders before data and a fault row for an unhealthy sensor', () => {
    expect(rackRows(null).map((r) => r.tj)).toEqual(Array(6).fill('\u2014 \u2014'))
    const [frame] = new MockTelemetrySource({ seed: 7, epochMs: EPOCH }).runTicks(1)
    const f = frame as DriveFrame
    const broken = {
      ...f,
      thyristors: f.thyristors.map((ch, i) => (i === 0 ? { ...ch, sensor_healthy: false } : ch)),
    } as unknown as DriveFrame
    const rows = rackRows(broken)
    expect(rows[0]?.status).toBe('fault')
    expect(rows[0]?.delta).toBe('\u2014 \u2014')
    expect(rows[1]?.tj).toMatch(/^\d+\.\d$/)
  })

  it('words the time-to-warning estimate', () => {
    expect(timeToWarningText(null, 110)).toMatch(/Not rising/)
    expect(timeToWarningText(0, 110)).toMatch(/Already/)
    expect(timeToWarningText(41.2, 110)).toMatch(/42 s/)
    expect(timeToWarningText(130, 110)).toMatch(/3 min/)
  })
})
