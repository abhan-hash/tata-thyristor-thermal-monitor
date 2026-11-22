import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DASH_SPEED_PER_W, dashSpeed, fosterNodeTemps, fosterStages } from '../../src/domain/fosterNodes'
import { heatStopIndex, heatToken } from '../../src/domain/heatScale'
import type { ThyristorFrame } from '../../src/domain/types'
import { FosterLadder, STAGE_NOTES } from '../../src/visuals/foster/FosterLadder'

type LadderFrame = Pick<
  ThyristorFrame,
  'id' | 'tj_estimated' | 't_heatsink_measured' | 'power_loss' | 'r_sa' | 'sensor_healthy'
>

const FRAME: LadderFrame = {
  id: 5,
  tj_estimated: 127.9,
  t_heatsink_measured: 84.6,
  power_loss: 1200,
  r_sa: 0.15,
  sensor_healthy: true,
}

describe('fosterNodeTemps', () => {
  it('reads junction → case → heatsink → air, case between Tj and Ths', () => {
    const n = fosterNodeTemps(FRAME, 38)
    expect(n.junction).toBe(127.9)
    expect(n.heatsink).toBe(84.6)
    expect(n.air).toBe(38)
    expect(n.case).toBeCloseTo((127.9 + 84.6) / 2, 6)
    expect(n.heatsinkEstimated).toBe(false)
  })

  it('estimates the heatsink from P · R_sa when the RTD is unhealthy', () => {
    const n = fosterNodeTemps({ ...FRAME, sensor_healthy: false, tj_estimated: 400 }, 38)
    expect(n.heatsinkEstimated).toBe(true)
    expect(n.heatsink).toBeCloseTo(38 + 1200 * 0.15, 6)
  })

  it('makes every node NaN when the junction estimate is missing', () => {
    const n = fosterNodeTemps({ ...FRAME, tj_estimated: Number.NaN }, 38)
    expect([n.junction, n.case, n.heatsink, n.air].every(Number.isNaN)).toBe(true)
  })

  it('derives stage R from R_jc and τ from model params', () => {
    const s = fosterStages()
    expect(s.map((x) => x.tau)).toEqual([0.02, 0.5, 20])
    expect(s.reduce((sum, x) => sum + x.r, 0)).toBeCloseTo(0.04, 9)
  })

  it('orders junction ≥ case ≥ heatsink ≥ air for positive power, including noisy RTD readings', () => {
    const cases: { frame: LadderFrame; ambient: number }[] = [
      { frame: FRAME, ambient: 38 },
      // RTD noise above Tj and below ambient is clamped onto the ladder.
      { frame: { ...FRAME, tj_estimated: 40.1, t_heatsink_measured: 40.3, power_loss: 5 }, ambient: 38 },
      { frame: { ...FRAME, tj_estimated: 39, t_heatsink_measured: 37.9, power_loss: 2 }, ambient: 38 },
      // Estimated heatsink above Tj (large R_sa) is clamped too.
      { frame: { ...FRAME, sensor_healthy: false, tj_estimated: 60, power_loss: 800, r_sa: 0.2 }, ambient: 35 },
      { frame: { ...FRAME, t_heatsink_measured: Number.NaN, power_loss: 300 }, ambient: 41 },
    ]
    for (const { frame, ambient } of cases) {
      const n = fosterNodeTemps(frame, ambient)
      expect(n.junction).toBeGreaterThanOrEqual(n.case)
      expect(n.case).toBeGreaterThanOrEqual(n.heatsink)
      expect(n.heatsink).toBeGreaterThanOrEqual(n.air)
    }
  })

  it('scales dash speed with power loss and stops at zero power', () => {
    for (const p of [1, 250, 1200, 4000]) expect(dashSpeed(p)).toBeCloseTo(p * DASH_SPEED_PER_W, 9)
    expect(dashSpeed(-50)).toBe(0)
    expect(dashSpeed(1000)).toBeCloseTo(2 * dashSpeed(500), 9)
    expect(dashSpeed(0)).toBe(0)
    expect(dashSpeed(Number.NaN)).toBe(0)
  })
})

describe('FosterLadder', () => {
  it('renders four heat-filled nodes, τ labels and R labels', () => {
    const { container } = render(<FosterLadder frame={FRAME} ambient={38} />)
    expect(screen.getByRole('img', { name: /^T5 Foster ladder: junction 127\.9 °C/ })).toBeInTheDocument()
    const fill = (k: string) =>
      (container.querySelector(`[data-node="${k}"] [data-part="node-fill"]`) as SVGElement | null)?.style.fill
    expect(fill('junction')).toBe(heatToken(heatStopIndex(127.9)))
    expect(fill('air')).toBe(heatToken(heatStopIndex(38)))
    for (const t of ['τ1 0.02 s', 'τ2 0.5 s', 'τ3 20 s']) expect(screen.getByText(t)).toBeInTheDocument()
    expect(container.querySelectorAll('[data-part="r-label"]')).toHaveLength(3)
    expect(container.querySelector('[data-node="junction"] [data-part="halo"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-part="note"]')).toHaveLength(0)
  })

  it('adds one note per stage in the annotated variant', () => {
    const { container } = render(<FosterLadder frame={FRAME} ambient={38} variant="annotated" />)
    expect(container.querySelectorAll('[data-part="note"]')).toHaveLength(3)
  })

  it('labels each stage with its R value and marks the flow line by power', () => {
    const { container } = render(<FosterLadder frame={FRAME} ambient={38} />)
    const rLabels = [...container.querySelectorAll('[data-part="r-label"]')].map((e) => e.textContent)
    expect(rLabels).toEqual(['R1 0.013 K/W', 'R2 0.013 K/W', 'R3 0.013 K/W'])
    const flow = (root: HTMLElement) => root.querySelector('[data-part="flow-line"]')?.getAttribute('data-flowing')
    expect(flow(container)).toBe('true')
    const idle = render(<FosterLadder frame={{ ...FRAME, power_loss: 0 }} ambient={38} />)
    expect(flow(idle.container)).toBe('false')
  })

  it('shows the stage heading and explanatory text for every stage in the annotated variant', () => {
    const { container } = render(<FosterLadder frame={FRAME} ambient={38} variant="annotated" />)
    expect(container.querySelector('svg')?.getAttribute('data-variant')).toBe('annotated')
    STAGE_NOTES.forEach(([lead, rest], i) => {
      const note = container.querySelector(`[data-part="note"][data-stage="${String(i + 1)}"]`)
      expect(note?.textContent).toContain(`Stage ${String(i + 1)}`)
      expect(note?.textContent).toContain(lead)
      expect(note?.textContent).toContain(rest)
    })
  })
})
