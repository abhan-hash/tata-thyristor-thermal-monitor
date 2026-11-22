import { act, render, screen } from '@testing-library/react'
import { scaleLinear } from '@visx/scale'
import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ChartTrace, DRAW_IN_MS, sampleSlide } from '../../src/charts/ChartTrace'
import { TelemetryProvider } from '../../src/data/hooks'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { TelemetryStore } from '../../src/data/store'
import { COALESCE_WINDOW_MS, coalesceAlarms } from '../../src/domain/coalesceAlarms'
import type { AlarmEvent } from '../../src/domain/types'
import { SYNC_LIVE_LABEL, SyncPulse, syncPulseFlashes } from '../../src/kit/SyncPulse'
import { AirflowDiagram } from '../../src/visuals/airflow/AirflowDiagram'
import { BridgeSchematic, type BridgeDevice } from '../../src/visuals/bridge/BridgeSchematic'
import { FosterLadder } from '../../src/visuals/foster/FosterLadder'
import { HeatDisc } from '../../src/visuals/heat/HeatDisc'

/* Live-value and event motion (Requirements 12.4, 33.3–33.9, 35.1, 35.3). */

function Reduced({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="always">{children}</MotionConfig>
}

const wait = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

const T0 = Date.UTC(2026, 0, 15, 9, 30)
const iso = (ms: number) => new Date(T0 + ms).toISOString()
const alarm = (id: string, raisedMs: number, over: Partial<AlarmEvent> = {}, active = false): AlarmEvent => {
  const e: AlarmEvent = {
    id,
    channel: 3,
    kind: 'junction_temp',
    severity: 'warning',
    raised_at: iso(raisedMs),
    cleared_at: iso(raisedMs + 1000),
    peak_value: 112,
    unit: '°C',
    ...over,
  }
  if (active) delete e.cleared_at
  return e
}

describe('coalesceAlarms', () => {
  it('merges a repeat of the same channel and kind within 5 s into one row', () => {
    const rows = coalesceAlarms([
      alarm('a', 0),
      alarm('b', 1000 + COALESCE_WINDOW_MS, { severity: 'critical', peak_value: 126 }, true),
    ])
    expect(rows).toHaveLength(1)
    const [row] = rows
    expect(row?.id).toBe('a')
    expect(row?.repeats).toBe(2)
    expect(row?.severity).toBe('critical')
    expect(row?.peak_value).toBe(126)
    expect(row?.cleared_at).toBeUndefined()
  })

  it('keeps repeats more than 5 s apart, and other channels or kinds, as separate rows', () => {
    const rows = coalesceAlarms([
      alarm('a', 0),
      alarm('b', 1001 + COALESCE_WINDOW_MS),
      alarm('c', 2000, { channel: 4 }),
      alarm('d', 2000, { kind: 'heatsink_temp' }),
    ])
    expect(rows.map((r) => r.id)).toEqual(['a', 'c', 'd', 'b'])
    expect(rows.every((r) => r.repeats === 1)).toBe(true)
  })

  it('keeps the latest copy of an event id (a raise later updated by its clear)', () => {
    const raised = alarm('a', 0, {}, true)
    const rows = coalesceAlarms([raised, alarm('a', 0)])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.cleared_at).toBe(iso(1000))
  })
})

describe('critical glow pulse', () => {
  const devices: BridgeDevice[] = [
    { id: 1, tj_estimated: 119, status: 'warning' }, // heat stop 7: halo, but not critical
    { id: 2, tj_estimated: 130, status: 'critical' },
    { id: 3, tj_estimated: 90, status: 'normal' },
  ]

  it('pulses only the critical bridge device', () => {
    const { container } = render(<BridgeSchematic devices={devices} />)
    const pulsing = [...container.querySelectorAll('.motion-critical-pulse')]
    expect(pulsing).toHaveLength(1)
    expect(pulsing[0]?.closest('[data-channel]')?.getAttribute('data-channel')).toBe('2')
  })

  it('pulses the heat disc glow only while critical', () => {
    const { container, rerender } = render(<HeatDisc tj={118} />)
    expect(container.querySelector('[data-part="glow"]')).not.toHaveClass('motion-critical-pulse')
    rerender(<HeatDisc tj={95} />)
    expect(container.querySelector('[data-part="glow"]')).not.toHaveClass('motion-critical-pulse')
    rerender(<HeatDisc tj={130} />)
    expect(container.querySelector('[data-part="glow"]')).toHaveClass('motion-critical-pulse')
  })

  it('still renders the critical status under reduced motion', () => {
    const { container } = render(<HeatDisc tj={130} />, { wrapper: Reduced })
    expect(container.querySelector('svg')).toHaveAttribute('data-status', 'critical')
  })
})

describe('chart motion', () => {
  const points = { x: Float64Array.from([-2, -1, 0]), y: Float64Array.from([1, 2, 3]) }
  const x = scaleLinear<number>({ domain: [-10, 0], range: [0, 100] })
  const y = scaleLinear<number>({ domain: [0, 5], range: [50, 0] })
  const trace = <ChartTrace points={points} x={x} y={y} className="trace" live />
  const drawn = (path: Element | null) => Number(path?.getAttribute('stroke-dasharray')?.split(' ')[0] ?? '1')

  it('draws the line in on first data', async () => {
    const { container } = render(<svg>{trace}</svg>)
    await wait(DRAW_IN_MS / 6)
    expect(drawn(container.querySelector('path'))).toBeLessThan(1)
  })

  it('skips the draw-in under reduced motion', async () => {
    const { container } = render(<svg>{trace}</svg>, { wrapper: Reduced })
    await wait(DRAW_IN_MS / 6)
    expect(drawn(container.querySelector('path'))).toBe(1)
  })

  it('slides one sample step over one sample period', () => {
    expect(sampleSlide(points, x)).toEqual({ dx: 10, durationS: 0.5 })
    expect(sampleSlide({ x: Float64Array.from([0]), y: Float64Array.from([1]) }, x)).toBeNull()
  })
})

describe('reduced-motion substitutions', () => {
  it('stops the Foster dash flow', async () => {
    const frame = { id: 5, tj_estimated: 127.9, t_heatsink_measured: 84.6, power_loss: 1200, r_sa: 0.15, sensor_healthy: true } as const
    const moving = render(<FosterLadder frame={frame} ambient={38} />)
    const still = render(<FosterLadder frame={frame} ambient={38} />, { wrapper: Reduced })
    await wait(80)
    const offset = (c: HTMLElement) => c.querySelector('[data-part="flow"] [stroke-dashoffset]')
    expect(offset(moving.container)).not.toBeNull()
    expect(offset(still.container)).toBeNull()
  })

  it('stops the airflow particles', () => {
    const { container } = render(<AirflowDiagram fanStatus tj={[92, 104, 112, 119, 127, 98]} />, { wrapper: Reduced })
    expect(container.querySelector('svg')).toHaveAttribute('data-moving', 'false')
  })
})

describe('SyncPulse', () => {
  const renderPulse = (wrapper?: (p: { children: ReactNode }) => ReactNode) => {
    const store = new TelemetryStore(new MockTelemetrySource({ seed: 7, epochMs: T0 }), {
      decodeLogger: { marginMismatch: () => undefined },
    })
    const ui = (
      <TelemetryProvider store={store} autoStart={false}>
        <SyncPulse />
      </TelemetryProvider>
    )
    return render(wrapper ? wrapper({ children: ui }) : ui)
  }

  it('flashes only on a live tick that carries new frames, so it stops while stale', () => {
    expect(syncPulseFlashes('live', 10)).toBe(true)
    expect(syncPulseFlashes('live', 0)).toBe(false)
    expect(syncPulseFlashes('stale', 10)).toBe(false)
    expect(syncPulseFlashes('reconnecting', 10)).toBe(false)
    expect(syncPulseFlashes('live', null)).toBe(false)
  })

  it('is a 1 px tick without text normally, and stopped before data', () => {
    const { container } = renderPulse()
    const tick = container.querySelector('[data-part="sync-pulse"]')
    expect(tick).toHaveAttribute('data-state', 'stopped')
    expect(tick).not.toHaveClass('motion-sync-flash')
    expect(tick?.textContent).toBe('')
  })

  it('is replaced by a static LIVE label under reduced motion', () => {
    renderPulse(Reduced)
    expect(screen.getByText(SYNC_LIVE_LABEL)).toHaveAttribute('data-part', 'sync-pulse')
  })
})
