import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TelemetryProvider } from '../../src/data/hooks'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { TelemetryStore } from '../../src/data/store'
import { formatValue, TEMP_C_SPEC } from '../../src/domain/format'
import { AppShell } from '../../src/kit/AppShell'
import { DriveDetailPage } from '../../src/pages/DriveDetail/DriveDetailPage'
import {
  marginSeries,
  parseWindowParam,
  seriesDelta,
  tripFill,
} from '../../src/pages/DriveDetail/driveDetailModel'

const EPOCH = Date.UTC(2026, 10, 21)
const quiet = { marginMismatch: () => undefined }

function renderDrive(path: string) {
  const source = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
  const store = new TelemetryStore(source, { decodeLogger: quiet })
  const mounts = { shell: 0 }
  function CountedShell() {
    useEffect(() => {
      mounts.shell++
    }, [])
    return <AppShell />
  }
  const router = createMemoryRouter(
    [{ path: '/', element: <CountedShell />, children: [{ path: 'drive', element: <DriveDetailPage /> }] }],
    { initialEntries: [path] },
  )
  render(
    <TelemetryProvider store={store} autoStart={false}>
      <RouterProvider router={router} />
    </TelemetryProvider>,
  )
  act(() => {
    for (const f of source.runTicks(120)) store.ingest(f)
  })
  return { router, store, mounts }
}

const chartTitle = (testId: string) =>
  within(screen.getByTestId(testId)).getByRole('img').querySelector('title')?.textContent ?? ''

describe('Drive Detail helpers', () => {
  it('accepts only 60 and 300 for ?window=, defaulting to 60', () => {
    expect(parseWindowParam('300')).toBe(300)
    expect(parseWindowParam('60')).toBe(60)
    for (const bad of [null, undefined, '', '45', '300s', 'abc']) expect(parseWindowParam(bad)).toBe(60)
  })

  it('computes the window delta, trip margin series and bar fill', () => {
    expect(seriesDelta([Number.NaN, 2, 3, Number.NaN, 5])).toBe(3)
    expect(seriesDelta([1])).toBe(0)
    expect(Number.isNaN(seriesDelta([]))).toBe(true)
    expect(Array.from(marginSeries(Float32Array.from([100, Number.NaN]), 125))).toEqual([25, Number.NaN])
    expect(tripFill(75, 125, 25)).toBe(0.5)
    expect(tripFill(140, 125, 25)).toBe(1)
    expect(tripFill(Number.NaN, 125, 25)).toBe(0)
  })
})

describe('DriveDetailPage', () => {
  it('defaults the charts to a 60 s window', () => {
    renderDrive('/drive?ch=T2')
    expect(chartTitle('transient-chart')).toContain('last 60 s')
    expect(chartTitle('current-chart')).toContain('last 60 s')
    expect(screen.getByRole('button', { name: '60 S' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reads ?window=300 and switches back to 60 through the window chip', () => {
    const { router } = renderDrive('/drive?ch=T2&window=300')
    expect(chartTitle('transient-chart')).toContain('last 300 s')
    expect(chartTitle('current-chart')).toContain('last 300 s')
    fireEvent.click(screen.getByRole('button', { name: '60 S' }))
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('window')).toBe('60')
    expect(params.get('ch')).toBe('T2')
    expect(chartTitle('transient-chart')).toContain('last 60 s')
  })

  it('re-binds the readout and charts when ?ch= changes without remounting the shell', async () => {
    const { router, store, mounts } = renderDrive('/drive?ch=T1')
    expect(mounts.shell).toBe(1)
    expect(screen.getByRole('region', { name: 'T1 junction temperature' })).toBeInTheDocument()
    expect(chartTitle('transient-chart')).toMatch(/^T1 /)

    await act(async () => {
      await router.navigate('/drive?ch=T5')
    })
    expect(screen.getByRole('region', { name: 'T5 junction temperature' })).toBeInTheDocument()
    expect(chartTitle('transient-chart')).toMatch(/^T5 /)
    const tj = store.getSnapshot().frame?.thyristors[4].tj_estimated ?? Number.NaN
    expect(screen.getByTestId('drive-tj')).toHaveTextContent(formatValue(tj, TEMP_C_SPEC).trim())

    // Selecting a device on the bridge writes ?ch= and re-binds too.
    fireEvent.click(screen.getByRole('button', { name: /^T3,/ }))
    expect(new URLSearchParams(router.state.location.search).get('ch')).toBe('T3')
    expect(screen.getByRole('region', { name: 'T3 junction temperature' })).toBeInTheDocument()
    expect(mounts.shell).toBe(1)
  })
})
