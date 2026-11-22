import { act, render } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { describe, expect, it } from 'vitest'
import { TelemetryProvider } from '../../src/data/hooks'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { TelemetryStore } from '../../src/data/store'
import { hottestTj } from '../../src/domain/derive'
import type { DriveFrame } from '../../src/domain/types'
import { ambientFraction, armatureFraction, discScaleAngle } from '../../src/visuals/console/bindings'
import { CONSOLE_LAYOUT, CONSOLE_SLAB, faderGeometry, pointsAttr, ringArc } from '../../src/visuals/console/iso'
import { discEdgeColor, IsometricConsole, LiveIsometricConsole } from '../../src/visuals/console/IsometricConsole'
import { roundedOutline, slabSides } from '../../src/visuals/console/slabMesh'

describe('slabMesh', () => {
  it('samples a closed rounded outline inside the slab footprint', () => {
    const pts = roundedOutline(560, 420, 18, 8)
    expect(pts).toHaveLength(4 * 9)
    for (const [u, v] of pts) {
      expect(u).toBeGreaterThanOrEqual(-1e-9)
      expect(u).toBeLessThanOrEqual(560 + 1e-9)
      expect(v).toBeGreaterThanOrEqual(-1e-9)
      expect(v).toBeLessThanOrEqual(420 + 1e-9)
    }
  })

  it('keeps only viewer-facing side segments, lit front and shaded right', () => {
    const sides = slabSides(CONSOLE_SLAB, 18)
    const front = sides.segments.filter((s) => s.face === 'front')
    const right = sides.segments.filter((s) => s.face === 'right')
    expect(front.length).toBeGreaterThan(0)
    expect(right.length).toBeGreaterThan(0)
    expect(Math.min(...front.map((s) => s.shade))).toBe(0)
    expect(Math.max(...right.map((s) => s.shade))).toBe(1)
    expect(sides.silhouette.endsWith('Z')).toBe(true)
  })
})

describe('discEdgeColor', () => {
  it('never falls below heat-4 and reaches heat-5 by the warning band', () => {
    expect(discEdgeColor(0)).toBe('var(--heat-4)')
    expect(discEdgeColor(3)).toBe('var(--heat-4)')
    expect(discEdgeColor(6)).toBe('var(--heat-5)')
    expect(discEdgeColor(8)).toBe('var(--heat-5)')
  })
})

describe('IsometricConsole', () => {
  it('renders the slab faces, controls, disc and an accessible summary from plain props', () => {
    const { container } = render(
      <IsometricConsole hottest={112.4} armature={820} ambient={38} airflow={0.8} hottestChannel={5} />,
    )
    const root = container.querySelector('svg')
    expect(root?.getAttribute('aria-label')).toBe(
      'Drive console. Hottest junction (T5) 112.4 °C, WARNING. Armature 82% of rated. Ambient 38.0 °C. Airflow 80%.',
    )
    for (const face of ['top', 'front', 'right']) {
      expect(container.querySelector(`[data-face="${face}"]`)).not.toBeNull()
    }
    expect(container.querySelectorAll('[data-part="knob"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-part="ring-arc"]')).toHaveLength(2)
    expect(container.querySelector('[data-part="fader-cap"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-part="crop-brackets"] path')).toHaveLength(4)
    expect(container.querySelector('[data-tick="warn"]')?.textContent).toBe('WARN 110')
    expect(container.querySelector('[data-tick="trip"]')?.textContent).toBe('TRIP 125')
    expect(container.querySelector('[data-part="readout-status"]')?.textContent).toBe('WARNING')
  })

  it('follows MotionValues without re-rendering the readout, fader or label', () => {
    const hottest = motionValue(90)
    const airflow = motionValue(1)
    const { container } = render(
      <IsometricConsole hottest={hottest} armature={500} ambient={30} airflow={airflow} />,
    )
    const cap = () => container.querySelector('[data-part="fader-cap"] polygon')?.getAttribute('points')
    const before = cap()
    act(() => {
      hottest.set(126)
      airflow.set(0)
    })
    expect(container.querySelector('[data-part="readout-value"]')?.textContent?.trim()).toBe('126.0')
    expect(container.querySelector('[data-part="readout-status"]')?.textContent).toBe('CRITICAL')
    expect(container.querySelector('[data-part="airflow-value"]')?.textContent).toBe('AIRFLOW 0%')
    expect(cap()).not.toBe(before)
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toContain('Airflow 0%')
  })

  it('shows the fault treatment when no healthy Tj is available', () => {
    const { container } = render(<IsometricConsole hottest={Number.NaN} armature={0} ambient={30} airflow={1} />)
    expect(container.querySelector('svg')?.getAttribute('data-status')).toBe('fault')
    expect(container.querySelector('[data-part="readout-status"]')?.textContent).toBe('SENSOR FAULT')
    expect(container.querySelector('[data-part="rim-index"]')?.getAttribute('opacity')).toBe('0')
  })
})

// Console bindings against the live store (Requirements 16.2, 16.3, 16.4).
describe('LiveIsometricConsole bindings', () => {
  const EPOCH = Date.UTC(2026, 10, 21)
  const quiet = { marginMismatch: () => undefined }
  const F = CONSOLE_LAYOUT.fader

  function mount() {
    const source = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
    const store = new TelemetryStore(source, { decodeLogger: quiet })
    const view = render(
      <TelemetryProvider store={store} autoStart={false}>
        <LiveIsometricConsole />
      </TelemetryProvider>,
    )
    const { container } = view
    const ingest = (frames: readonly DriveFrame[]) => {
      act(() => {
        for (const f of frames) store.ingest(f)
      })
    }
    const run = (n: number) => {
      ingest(source.runTicks(n))
    }
    /** Fader fraction read back from the rendered cap shadow's position in the well. */
    const faderShown = () => {
      const shadow = [...container.querySelectorAll('[data-part="fader-well"] rect')].find(
        (r) => r.getAttribute('width') === String(F.capSize + 8),
      )
      const x = Number(shadow?.getAttribute('x'))
      return (x - 3 - F.x) / (F.length - F.capSize)
    }
    const capPoints = () => container.querySelector('[data-part="fader-cap"] polygon:last-of-type')?.getAttribute('points')
    const arcs = () => [...container.querySelectorAll('[data-part="ring-arc"]')].map((el) => el.getAttribute('stroke-dasharray'))
    const rimAngle = () => {
      const m = /rotate\(([-\d.]+)/.exec(container.querySelector('[data-part="rim-index"]')?.getAttribute('transform') ?? '')
      return Number(m?.[1])
    }
    const readout = () => container.querySelector('[data-part="readout-value"]')?.textContent?.trim()
    return { source, store, container, ingest, run, faderShown, capPoints, arcs, rimAngle, readout }
  }

  it.each(['fan_failure', 'clogging'] as const)('moves the fader down under %s, following store airflow', (scenario) => {
    const c = mount()
    c.run(20)
    const healthy = c.store.live.airflow.get()
    expect(healthy).toBeCloseTo(1, 2)
    expect(c.faderShown()).toBeCloseTo(healthy, 2)

    act(() => {
      c.source.setScenario(scenario)
    })
    c.run(300) // 30 s: fan off, or halfway through the clogging ramp
    const mid = c.store.live.airflow.get()
    expect(mid).toBeLessThan(healthy - 0.05)
    expect(c.faderShown()).toBeCloseTo(mid, 2)
    expect(c.capPoints()).toBe(pointsAttr(faderGeometry(CONSOLE_SLAB, F, mid).cap.top))
    if (scenario === 'fan_failure') expect(c.faderShown()).toBeCloseTo(0, 5)

    c.run(300)
    const late = c.store.live.airflow.get()
    expect(late).toBeLessThanOrEqual(mid)
    expect(c.faderShown()).toBeCloseTo(late, 2)
    if (scenario === 'clogging') expect(late).toBeLessThan(mid)
  })

  it('drives knob A from armature % of rated and knob B from ambient', () => {
    const c = mount()
    c.run(10)
    const at = () => [
      ringArc(armatureFraction(c.store.live.armature.get())).value,
      ringArc(ambientFraction(c.store.live.ambient.get())).value,
    ]
    expect(c.arcs()).toEqual(at())

    const [frame] = c.source.runTicks(1)
    if (!frame) throw new Error('no frame')
    const before = c.arcs()
    c.ingest([{ ...frame, armature_current: frame.armature_current * 1.4, ambient_temp: frame.ambient_temp + 15 }])
    const after = c.arcs()
    expect(after).toEqual(at())
    const filled = (d: string | null | undefined) => Number(d?.split(' ')[0])
    expect(filled(after[0])).toBeGreaterThan(filled(before[0]))
    expect(filled(after[1])).toBeGreaterThan(filled(before[1]))
  })

  it('points the disc at the hottest healthy Tj and ignores faulted channels', () => {
    const c = mount()
    c.run(10)
    const [frame] = c.source.runTicks(1)
    if (!frame) throw new Error('no frame')
    // Channel 2 reports an implausibly hot Tj but its sensor is unhealthy.
    const faulted: DriveFrame = {
      ...frame,
      thyristors: frame.thyristors.map((ch) => (ch.id === 2 ? { ...ch, sensor_healthy: false, tj_estimated: 180 } : ch)) as unknown as DriveFrame['thyristors'],
    }
    c.ingest([faulted])
    const expected = hottestTj(faulted)
    expect(expected).toBeLessThan(180)
    expect(c.store.live.hottest.get()).toBe(expected)
    expect(c.readout()).toBe(expected.toFixed(1))
    expect(c.rimAngle()).toBeCloseTo(discScaleAngle(expected), 2)
    const hotId = faulted.thyristors.find((ch) => ch.sensor_healthy && ch.tj_estimated === expected)?.id
    expect(c.container.querySelector('svg')?.getAttribute('aria-label')).toContain(`(T${String(hotId)})`)

    // Push the hottest healthy channel up; the disc follows it.
    const [next] = c.source.runTicks(1)
    if (!next) throw new Error('no frame')
    const hotter: DriveFrame = {
      ...next,
      thyristors: next.thyristors.map((ch) => (ch.id === 4 ? { ...ch, tj_estimated: 121.3 } : ch)) as unknown as DriveFrame['thyristors'],
    }
    c.ingest([hotter])
    expect(c.readout()).toBe('121.3')
    expect(c.rimAngle()).toBeCloseTo(discScaleAngle(121.3), 2)
    expect(c.container.querySelector('svg')?.getAttribute('data-status')).toBe('warning')
  })
})
