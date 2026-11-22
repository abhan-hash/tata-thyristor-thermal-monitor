import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AirflowDiagram } from '../../src/visuals/airflow/AirflowDiagram'
import {
  airflowLanes,
  bloomStops,
  exchangerFill,
  MAX_PARTICLES,
  particleCount,
  particleSpeed,
  pointAt,
} from '../../src/visuals/airflow/airflowGeometry'
const TJ = [92, 104, 112, 119, 127, Number.NaN]
describe('airflowGeometry', () => {
  it('keeps the particle budget and closes every lane', () => {
    const lanes = airflowLanes()
    expect(particleCount(lanes)).toBeLessThanOrEqual(MAX_PARTICLES)
    for (const lane of lanes) {
      const a = pointAt(lane, 0)
      const b = pointAt(lane, 1)
      expect(b.x).toBeCloseTo(a.x)
      expect(b.y).toBeCloseTo(a.y)
    }
  })
  it('sets speed and exchanger fill from fan state', () => {
    expect(particleSpeed(true)).toBeGreaterThan(0)
    expect(particleSpeed(false)).toBe(0)
    expect(particleSpeed(false, 1)).toBe(0)
    expect(exchangerFill(true)).not.toMatch(/--heat-/)
    expect(exchangerFill(false)).toBe('var(--heat-4)')
  })
  it('orders bloom bands with the hottest stop innermost', () => {
    expect(bloomStops(7)).toEqual([4, 5, 6, 7])
    expect(bloomStops(2)).toEqual([1, 2])
    expect(bloomStops(0)).toEqual([])
  })
})
describe('AirflowDiagram', () => {
  it('fills device chips from live Tj and marks faults', () => {
    const { container } = render(<AirflowDiagram fanStatus tj={TJ} />)
    const chips = [...container.querySelectorAll('[data-part="device"]')]
    expect(chips.map((c) => c.getAttribute('data-heat-stop'))).toEqual(['4', '5', '6', '7', '8', 'fault'])
    // Halo only on the stop 7–8 chips.
    expect(chips.filter((c) => c.querySelector('[data-part="halo"]')).length).toBe(2)
  })
  it('stops the blower and particles and warms the exchanger when the fan fails', () => {
    const { container, rerender } = render(<AirflowDiagram fanStatus tj={TJ} />)
    const svg = container.querySelector('svg[role="img"]')
    expect(svg).toHaveAttribute('data-fan', 'on')
    expect(container.querySelectorAll('[data-part="particle"]').length).toBeLessThanOrEqual(MAX_PARTICLES)
    expect(svg?.getAttribute('aria-label')).toMatch(/fan running/)
    rerender(<AirflowDiagram fanStatus={false} tj={TJ} />)
    expect(svg).toHaveAttribute('data-speed', '0')
    expect(svg).toHaveAttribute('data-moving', 'false')
    expect(container.querySelector('[data-part="blower"]')).toHaveAttribute('data-state', 'stopped')
    expect(container.querySelector('[data-part="exchanger"]')).toHaveAttribute('data-state', 'warm')
    expect(container.querySelector('[data-part="exchanger"] rect')?.getAttribute('style')).toMatch(/--heat-4/)
    expect(svg?.getAttribute('aria-label')).toMatch(/fan failed, blower stopped/)
  })
  it('renders the full particle budget in both fan states and swaps the exchanger fill', () => {
    const expected = particleCount(airflowLanes())
    const fill = (c: HTMLElement) => c.querySelector('[data-part="exchanger"] rect')?.getAttribute('style')
    const { container, rerender } = render(<AirflowDiagram fanStatus tj={TJ} />)
    expect(container.querySelectorAll('[data-part="particle"]')).toHaveLength(expected)
    expect(expected).toBeGreaterThan(0)
    expect(expected).toBeLessThanOrEqual(MAX_PARTICLES)
    const onFill = fill(container)
    expect(container.querySelector('[data-part="exchanger"]')).toHaveAttribute('data-state', 'cool')
    rerender(<AirflowDiagram fanStatus={false} tj={TJ} />)
    expect(container.querySelectorAll('[data-part="particle"]')).toHaveLength(expected)
    expect(fill(container)).not.toEqual(onFill)
  })
})
