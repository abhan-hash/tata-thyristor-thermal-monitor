import { act, render, screen } from '@testing-library/react'
import { MotionConfig, motionValue } from 'motion/react'
import { describe, expect, it } from 'vitest'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { TelemetryStore } from '../../src/data/store'
import { PLACEHOLDER, TEMP_C_SPEC } from '../../src/domain/format'
import type { FieldChannel } from '../../src/domain/heatField'
import type { DriveFrame } from '../../src/domain/types'
import { KpiTile } from '../../src/kit/KpiTile'
import { RackRow } from '../../src/kit/RackRow'
import { BridgeSchematic, type BridgeDevice } from '../../src/visuals/bridge/BridgeSchematic'
import { IsometricConsole } from '../../src/visuals/console/IsometricConsole'
import { FosterLadder } from '../../src/visuals/foster/FosterLadder'
import { HeatBlobs } from '../../src/visuals/heat/HeatBlobs'
import { HeatDisc } from '../../src/visuals/heat/HeatDisc'

/* Sensor-fault treatment across kit and visuals (Requirements 21.1, 21.2, 21.3, 21.4). */

/** Sets channel `index` to `tj` with the given sensor health. */
function withChannel(frame: DriveFrame, index: number, tj: number, healthy: boolean): DriveFrame {
  const thyristors = frame.thyristors.map((ch, i) =>
    i === index ? { ...ch, tj_estimated: tj, margin_to_limit: 125 - tj, sensor_healthy: healthy } : ch,
  ) as unknown as DriveFrame['thyristors']
  return { ...frame, thyristors }
}

describe('Hottest_Tj with a faulted channel', () => {
  it('excludes a faulted channel from the live hottest value and the bound HeatDisc, then restores', () => {
    const source = new MockTelemetrySource({ seed: 7, epochMs: Date.UTC(2026, 10, 21) })
    const store = new TelemetryStore(source, { decodeLogger: { marginMismatch: () => undefined } })
    const [base] = source.runTicks(1)
    if (base === undefined) throw new Error('no frame')
    const others = base.thyristors.filter((_, i) => i !== 1).map((ch) => ch.tj_estimated)
    const othersMax = Math.max(...others)

    // T2 reports a finite but implausible 140 °C from a failed RTD.
    store.ingest(withChannel(base, 1, 140, false))
    expect(store.live.hottest.get()).toBe(othersMax)

    // Every channel faulted: hottest is NaN and the disc shows the fault hatch.
    const allFaulted = base.thyristors.reduce((f, ch, i) => withChannel(f, i, ch.tj_estimated, false), base)
    act(() => store.ingest(allFaulted))
    expect(store.live.hottest.get()).toBeNaN()
    const { container } = render(<HeatDisc tj={store.live.hottest} />)
    const face = () => container.querySelector<SVGElement>('[data-part="face"]')
    expect(screen.getByRole('img')).toHaveAttribute('data-status', 'fault')
    expect(face()?.style.fill).toMatch(/fault-hatch/)
    expect(container.querySelectorAll('[data-part="band"]')).toHaveLength(0)

    // Healthy frames return: T2 counts again and the disc drops the hatch.
    act(() => store.ingest(withChannel(base, 1, 140, true)))
    expect(store.live.hottest.get()).toBe(140)
    expect(screen.getByRole('img')).not.toHaveAttribute('data-status', 'fault')
    expect(face()?.style.fill).not.toMatch(/fault-hatch/)
    expect(container.querySelectorAll('[data-part="band"]')).toHaveLength(3)
  })
})

describe('HeatBlobs with a faulted channel', () => {
  const channels = (tj3: number, healthy3: boolean): FieldChannel[] =>
    [80, 100, tj3, 90, 70, 110].map((tj, i) => ({
      id: (i + 1) as FieldChannel['id'],
      tj_estimated: tj,
      sensor_healthy: i === 2 ? healthy3 : true,
    }))
  const bandPaths = (root: HTMLElement) =>
    [...root.querySelectorAll('path[data-band]')].map((p) => p.getAttribute('d'))

  it('draws the faulted anchor from its neighbours, ignoring the bad reading', () => {
    // T3 sits between T2 (100) and T4 (90): interpolated to 95 °C.
    const faulted = render(<HeatBlobs channels={channels(400, false)} ambient={35} />).container
    const interpolated = render(<HeatBlobs channels={channels(95, true)} ambient={35} />).container
    const raw = render(<HeatBlobs channels={channels(400, true)} ambient={35} />).container
    expect(bandPaths(faulted)).toEqual(bandPaths(interpolated))
    expect(bandPaths(faulted)).not.toEqual(bandPaths(raw))
  })
})

describe('RackRow sensor fault', () => {
  it('shows hatch, SENSOR FAULT and the placeholder instead of the value, then restores', () => {
    const { rerender } = render(<RackRow label="T4" meta="101.0 °C" status="fault" />)
    const row = screen.getByRole('button')
    expect(row).toHaveAttribute('data-fault', 'true')
    expect(row.className).toContain('--rack-row-fault-texture')
    expect(row).toHaveTextContent('SENSOR FAULT')
    expect(row).toHaveTextContent(PLACEHOLDER)
    expect(row).not.toHaveTextContent('101.0')

    rerender(<RackRow label="T4" meta="101.0 °C" status="normal" />)
    expect(row).not.toHaveAttribute('data-fault')
    expect(row.className).not.toContain('--rack-row-fault-texture')
    expect(row).toHaveTextContent('101.0 °C')
    expect(row).not.toHaveTextContent('SENSOR FAULT')
  })
})

describe('KpiTile sensor fault', () => {
  it('masks the value, unit and delta while faulted, including later frames, then restores', () => {
    const value = motionValue(88.4)
    const { rerender } = render(
      <KpiTile label="T2 Tj" value={value} spec={TEMP_C_SPEC} delta={1.2} status="fault" />,
      // Text binding under test, so live values apply without the tween.
      { wrapper: ({ children }) => <MotionConfig reducedMotion="always">{children}</MotionConfig> },
    )
    const tile = screen.getByRole('group', { name: 'T2 Tj' })
    expect(tile).toHaveAttribute('data-fault', 'true')
    expect(tile.className).toContain('--kpi-fault-bg')
    expect(screen.getByTestId('kpi-value')).toHaveTextContent(PLACEHOLDER)
    expect(screen.getByTestId('kpi-delta')).toHaveTextContent(PLACEHOLDER)
    expect(screen.queryByText('°C')).toBeNull()
    expect(tile).toHaveTextContent('SENSOR FAULT')

    act(() => value.set(90.1))
    expect(screen.getByTestId('kpi-value')).toHaveTextContent(PLACEHOLDER)

    rerender(<KpiTile label="T2 Tj" value={value} spec={TEMP_C_SPEC} delta={1.2} status="normal" />)
    expect(tile).not.toHaveAttribute('data-fault')
    expect(screen.getByTestId('kpi-value')).toHaveTextContent('90.1')
    expect(screen.getByText('°C')).toBeInTheDocument()
    act(() => value.set(91.3))
    expect(screen.getByTestId('kpi-value')).toHaveTextContent('91.3')
  })
})

describe('BridgeSchematic sensor fault', () => {
  const devices = (healthy: boolean): BridgeDevice[] =>
    ([1, 2, 3, 4, 5, 6] as const).map((id) => ({
      id,
      tj_estimated: 95,
      status: 'normal' as const,
      sensor_healthy: id === 2 ? healthy : true,
    }))

  it('treats sensor_healthy false as a fault even with a finite Tj, then restores', () => {
    const { rerender } = render(<BridgeSchematic devices={devices(false)} />)
    const t2 = screen.getByRole('button', { name: 'T2, SENSOR FAULT' })
    const body = t2.querySelector('[data-part="body"]') as SVGElement
    expect(body.style.fill).toMatch(/fault-hatch/)
    const badge = t2.querySelector('[data-part="badge"]')
    expect(badge).toHaveTextContent(PLACEHOLDER)
    expect(badge).not.toHaveTextContent('95.0')

    rerender(<BridgeSchematic devices={devices(true)} />)
    const restored = screen.getByRole('button', { name: 'T2, 95.0 °C, NORMAL' })
    expect((restored.querySelector('[data-part="body"]') as SVGElement).style.fill).not.toMatch(/fault-hatch/)
  })

  it('shows the fault icon on the thumbnail for an unhealthy sensor', () => {
    const { container } = render(<BridgeSchematic devices={devices(false)} variant="thumbnail" />)
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toContain('T2 SENSOR FAULT')
    expect(container.querySelector('[data-status="fault"]')).not.toBeNull()
  })
})

describe('IsometricConsole sensor fault', () => {
  it('drops the unit beside the placeholder and brings it back when Tj returns', () => {
    const hottest = motionValue(Number.NaN)
    const { container } = render(<IsometricConsole hottest={hottest} armature={0} ambient={30} airflow={1} />)
    expect(container.querySelector('[data-part="readout-value"]')?.textContent).toContain(PLACEHOLDER)
    expect(container.querySelector('[data-part="readout-unit"]')).toBeNull()

    act(() => hottest.set(101.5))
    expect(container.querySelector('svg')?.getAttribute('data-status')).toBe('normal')
    expect(container.querySelector('[data-part="readout-unit"]')).not.toBeNull()
    expect(container.querySelector('[data-part="readout-status"]')?.textContent).toBe('NORMAL')
  })
})

describe('FosterLadder flow marker', () => {
  const frame = {
    id: 5 as const,
    tj_estimated: 120,
    t_heatsink_measured: 84,
    power_loss: 1200,
    r_sa: 0.15,
    sensor_healthy: true,
  }
  const flowing = (root: HTMLElement) =>
    root.querySelector('[data-part="flow-line"]')?.getAttribute('data-flowing')

  it('follows the incoming power prop when the same ladder rerenders 1200 → 0 W', () => {
    const { container, rerender } = render(<FosterLadder frame={frame} ambient={38} power={1200} />)
    expect(flowing(container)).toBe('true')
    rerender(<FosterLadder frame={frame} ambient={38} power={0} />)
    expect(flowing(container)).toBe('false')
    rerender(<FosterLadder frame={{ ...frame, power_loss: 0 }} ambient={38} />)
    expect(flowing(container)).toBe('false')
  })

  it('follows a live power MotionValue without re-rendering', () => {
    const power = motionValue(1200)
    const { container } = render(<FosterLadder frame={frame} ambient={38} power={power} />)
    expect(flowing(container)).toBe('true')
    act(() => power.set(0))
    expect(flowing(container)).toBe('false')
  })
})
