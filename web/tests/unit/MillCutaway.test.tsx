import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BASE_LOAD_FRAC, spikeEnvelope, SPIKE_PERIOD_S } from '../../src/data/mock/fosterSim'
import { detectSpikeOnsets, samplesSinceOnset } from '../../src/domain/spikes'
import type { BridgeDevice } from '../../src/visuals/bridge/BridgeSchematic'
import { isStripPulsing, MILL_BAND_CAP, MILL_PULSE_CLASS, MillCutaway } from '../../src/visuals/mill/MillCutaway'

const RATED = 1000

/** Mock-shaped current: base load + bar-entry spike every 8 s + bounded pseudo-noise. */
function series(hz: number, seconds: number, startT = 2.4): number[] {
  return Array.from({ length: Math.round(hz * seconds) }, (_, i) => {
    const t = startT + i / hz
    const noise = 0.02 * Math.sin(i * 12.9898) * RATED
    return (BASE_LOAD_FRAC + spikeEnvelope(t % SPIKE_PERIOD_S)) * RATED + noise
  })
}

const DEVICES: BridgeDevice[] = [1, 2, 3, 4, 5, 6].map((id) => ({
  id: id as BridgeDevice['id'],
  tj_estimated: 80 + id * 8,
  status: 'normal',
}))

describe('detectSpikeOnsets', () => {
  it('finds one onset per bar entry at 10 Hz and 1 Hz', () => {
    // Spikes start at t = 8, 16, 24 s; the series starts at t = 2.4 s.
    for (const hz of [10, 1]) {
      const onsets = detectSpikeOnsets(series(hz, 28), RATED)
      expect(onsets).toHaveLength(3)
      onsets.forEach((idx, k) => {
        const t = 2.4 + idx / hz
        expect(t).toBeGreaterThanOrEqual(8 * (k + 1))
        expect(t).toBeLessThan(8 * (k + 1) + 2.4)
      })
    }
  })

  it('ignores flat noisy load, NaN gaps and an invalid rating', () => {
    const flat = Array.from({ length: 50 }, (_, i) => 550 + 20 * Math.sin(i * 7.1))
    expect(detectSpikeOnsets(flat, RATED)).toEqual([])
    expect(detectSpikeOnsets([500, Number.NaN, 900], RATED)).toEqual([2])
    expect(detectSpikeOnsets([500, 900], 0)).toEqual([])
  })

  it('counts a sustained step once and re-arms afterwards', () => {
    const step = [...Array(10).fill(550), ...Array(20).fill(1150), ...Array(3).fill(1550)] as number[]
    expect(detectSpikeOnsets(step, RATED)).toEqual([10, 30])
  })

  it('reports samples since the latest onset', () => {
    expect(samplesSinceOnset([500, 500, 900, 900], RATED)).toBe(1)
    expect(samplesSinceOnset([500, 500], RATED)).toBe(Infinity)
  })
})

describe('MillCutaway', () => {
  it('pulses the strip only right after an onset', () => {
    const { container, rerender } = render(<MillCutaway devices={DEVICES} currentSeries={[550, 552, 549]} ratedA={RATED} />)
    const glow = () => container.querySelector('[data-part="strip-glow"]')
    expect(glow()?.classList.contains(MILL_PULSE_CLASS)).toBe(false)

    rerender(<MillCutaway devices={DEVICES} currentSeries={[550, 552, 549, 950]} ratedA={RATED} />)
    expect(glow()?.classList.contains(MILL_PULSE_CLASS)).toBe(true)
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toMatch(/bar entry/)

    rerender(<MillCutaway devices={DEVICES} currentSeries={[550, 552, 549, 950, 900, 700, 560]} ratedA={RATED} />)
    expect(glow()?.classList.contains(MILL_PULSE_CLASS)).toBe(false)
  })

  it('keeps pulsing for exactly pulseSamples samples after the onset', () => {
    const onset = [550, 552, 549, 950]
    const after = (n: number) => [...onset, ...Array(n).fill(940)] as number[]
    // Default window of 3: onset sample plus two more.
    expect([0, 1, 2, 3].map((n) => isStripPulsing(after(n), RATED))).toEqual([true, true, true, false])
    const { container, rerender } = render(
      <MillCutaway devices={DEVICES} currentSeries={after(4)} ratedA={RATED} pulseSamples={5} />,
    )
    const glow = () => container.querySelector('[data-part="strip-glow"]')
    expect(glow()?.classList.contains(MILL_PULSE_CLASS)).toBe(true)
    rerender(<MillCutaway devices={DEVICES} currentSeries={after(5)} ratedA={RATED} pulseSamples={5} />)
    expect(glow()?.classList.contains(MILL_PULSE_CLASS)).toBe(false)
  })
  it('caps the isotherm bands at the mill cap, hottest innermost', () => {
    const { container } = render(<MillCutaway devices={DEVICES} currentSeries={[]} />)
    const stops = [...container.querySelectorAll('[data-part="band"]')].map((b) => Number(b.getAttribute('data-heat-stop')))
    expect(stops).toEqual([1, 2, 3, 4, 5, MILL_BAND_CAP])
    expect(MILL_BAND_CAP).toBe(6)
  })

  it('puts the bridge thumbnail on the cabinet door with live fills', () => {
    const { container } = render(<MillCutaway devices={DEVICES} currentSeries={[612.3]} />)
    const thumb = container.querySelector('[data-part="door-bridge"] svg[data-variant="thumbnail"]')
    expect(thumb).not.toBeNull()
    expect(thumb?.getAttribute('aria-label')).toMatch(/T1 .*T6/)
    expect(container.querySelector('[data-part="armature-cable"]')).not.toBeNull()
    expect(container.querySelector('[data-part="armature-readout"]')?.textContent).toMatch(/^612\.3\sA$/)
  })
})
