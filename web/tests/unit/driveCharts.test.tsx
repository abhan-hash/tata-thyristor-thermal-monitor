import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { CurrentChart, currentDomain, ratedLabel } from '../../src/charts/CurrentChart'
import { formatSecondsAgo } from '../../src/charts/ChartTrace'
import { downsample, MAX_CHART_POINTS, spikeOnsetTimes, windowSeries } from '../../src/charts/series'
import { CrosshairProvider } from '../../src/charts/sharedCrosshair'
import { BAR_BITE_LABEL, TransientChart, transientDomain } from '../../src/charts/TransientChart'
import { TelemetryProvider } from '../../src/data/hooks'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { RingBuffer } from '../../src/data/ringBuffer'
import { TelemetryStore } from '../../src/data/store'

const EPOCH = Date.UTC(2026, 10, 21)
const quiet = { marginMismatch: () => undefined }

function telemetry() {
  const source = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
  const store = new TelemetryStore(source, { decodeLogger: quiet })
  const feed = (n: number) => {
    act(() => {
      for (const f of source.runTicks(n)) store.ingest(f)
    })
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TelemetryProvider store={store} autoStart={false}>
      <CrosshairProvider>{children}</CrosshairProvider>
    </TelemetryProvider>
  )
  return { source, store, feed, wrapper }
}

function pointCounts(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll('path[data-points]')).map((p) => Number(p.getAttribute('data-points')))
}

describe('series preparation', () => {
  it('windows by timestamp and memoises on buffer revision', () => {
    const time = new RingBuffer(100)
    const values = new RingBuffer(100)
    for (let i = 0; i < 100; i++) {
      time.push(i * 100)
      values.push(i)
    }
    const a = windowSeries({ time, values }, 2)
    expect(Array.from(a.v)).toEqual(Array.from({ length: 21 }, (_, i) => 79 + i))
    expect(windowSeries({ time, values }, 2)).toBe(a)
    time.push(10_000)
    values.push(100)
    expect(windowSeries({ time, values }, 2)).not.toBe(a)
  })

  it('downsamples to at most 600 points and keeps the extremes', () => {
    const n = 3000
    const t = Array.from({ length: n }, (_, i) => i * 100)
    const v = Array.from({ length: n }, (_, i) => (i === 1234 ? 999 : i === 2222 ? -999 : Math.sin(i / 50)))
    const { x, y } = downsample(t, v)
    expect(x.length).toBeLessThanOrEqual(MAX_CHART_POINTS)
    expect(Math.max(...y)).toBe(999)
    expect(Math.min(...y)).toBe(-999)
    expect(x[x.length - 1]).toBeCloseTo(0)
    expect(x[0]).toBeCloseTo(-299.9)
    for (let i = 1; i < x.length; i++) expect(x[i]).toBeGreaterThanOrEqual(x[i - 1] ?? -Infinity)
  })

  it('passes short series through and keeps sensor gaps as NaN', () => {
    expect(Array.from(downsample([0, 100, 200], [1, Number.NaN, 3]).y)).toEqual([1, Number.NaN, 3])
    const n = 2000
    const t = Array.from({ length: n }, (_, i) => i * 100)
    const v = Array.from({ length: n }, (_, i) => (i >= 1000 && i < 1100 ? Number.NaN : 50))
    expect(downsample(t, v).y.some((value) => Number.isNaN(value))).toBe(true)
  })

  it('finds one bar-bite onset per mock spike at 10 Hz', () => {
    const source = new MockTelemetrySource({ seed: 3, epochMs: EPOCH })
    const frames = source.runTicks(600)
    const t = frames.map((f) => Date.parse(f.timestamp))
    const current = frames.map((f) => f.armature_current)
    const times = spikeOnsetTimes(t, current, 1000)
    // 60 s at an 8 s bar-entry period.
    expect(times.length).toBeGreaterThanOrEqual(6)
    expect(times.length).toBeLessThanOrEqual(8)
    for (let i = 1; i < times.length; i++) {
      expect((times[i] ?? 0) - (times[i - 1] ?? 0)).toBeCloseTo(8, 0)
    }
  })

  it('formats axis labels and domains', () => {
    expect(formatSecondsAgo(0)).toBe('NOW')
    expect(formatSecondsAgo(-12)).toBe('\u221212 S')
    expect(ratedLabel(1000)).toBe('RATED 1000 A')
    expect(currentDomain([500, 1500], 1000)).toEqual([0, 1700])
    expect(currentDomain([], 1000)).toEqual([0, 1300])
    expect(transientDomain([70, 80], [50, 60], 125)).toEqual([45, 135])
  })
})

describe('TransientChart and CurrentChart', () => {
  it('render real store data with bands, bar-bite markers and a rated line, never over 600 points', () => {
    const { feed, wrapper } = telemetry()
    feed(3000)
    const { container } = render(
      <>
        <TransientChart channel={2} windowS={300} />
        <CurrentChart windowS={300} />
      </>,
      { wrapper },
    )
    const counts = pointCounts(container)
    expect(counts).toHaveLength(3)
    for (const c of counts) {
      expect(c).toBeGreaterThan(100)
      expect(c).toBeLessThanOrEqual(MAX_CHART_POINTS)
    }
    expect(screen.getByText('WARN 110 °C')).toBeInTheDocument()
    expect(screen.getByText('TRIP 125 °C')).toBeInTheDocument()
    expect(screen.getAllByText(BAR_BITE_LABEL).length).toBeGreaterThan(20)
    expect(screen.getByText('RATED 1000 A')).toBeInTheDocument()
  })

  it('shares one crosshair between the stacked charts', () => {
    const { feed, wrapper } = telemetry()
    feed(600)
    const { container } = render(
      <>
        <TransientChart channel={1} />
        <CurrentChart />
      </>,
      { wrapper },
    )
    expect(screen.queryAllByTestId('chart-crosshair')).toHaveLength(0)
    const overlay = container.querySelector('[data-testid="transient-chart"] rect[class*="fill:transparent"]')
    expect(overlay).not.toBeNull()
    fireEvent.pointerMove(overlay as Element, { clientX: 200, clientY: 50 })
    expect(screen.getAllByTestId('chart-crosshair')).toHaveLength(2)
    fireEvent.pointerLeave(overlay as Element)
    expect(screen.queryAllByTestId('chart-crosshair')).toHaveLength(0)
  })
})
