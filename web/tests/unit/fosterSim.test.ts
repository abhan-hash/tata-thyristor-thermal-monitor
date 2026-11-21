import { describe, expect, it } from 'vitest'
import {
  BOUNDS,
  CURRENT_SHARE_OFFSETS,
  R_SA_OFFSETS,
  SPIKE_DURATION_S,
  ambientAt,
  initialSimState,
  powerLoss,
  spikeEnvelope,
  step,
  type FosterSimState,
} from '../../src/data/mock/fosterSim'
import { mulberry32, type Rng } from '../../src/data/mock/rng'
import { MODEL_PARAMS } from '../../src/domain/thresholds'
import type { DriveFrame } from '../../src/domain/types'

const DT = 0.1

/** RNG whose Box–Muller output is ~0 (u2 = 0.25 → cos(π/2)), so physics can be checked exactly. */
function silentRng(): Rng {
  let k = 0
  return () => (k++ % 2 === 0 ? 0.5 : 0.25)
}

function run(state: FosterSimState, ticks: number, rng: Rng): { state: FosterSimState; frames: DriveFrame[] } {
  const frames: DriveFrame[] = []
  let s = state
  for (let i = 0; i < ticks; i++) {
    const r = step(s, DT, rng, MODEL_PARAMS)
    s = r.state
    frames.push(r.frame)
  }
  return { state: s, frames }
}

describe('fosterSim helpers', () => {
  it('computes power loss as V_f0·I + r_d·I²', () => {
    expect(powerLoss(200, MODEL_PARAMS)).toBeCloseTo(1.2 * 200 + 0.001 * 200 * 200, 10)
    expect(powerLoss(-5, MODEL_PARAMS)).toBe(0)
  })

  it('follows 35 + 3·sin(t/120) for ambient', () => {
    expect(ambientAt(0)).toBe(35)
    expect(ambientAt(60 * Math.PI)).toBeCloseTo(38, 10)
  })

  it('shapes the bar-entry spike as a Gaussian peaking at +40% rated mid-window', () => {
    expect(spikeEnvelope(SPIKE_DURATION_S / 2)).toBeCloseTo(0.4, 10)
    expect(spikeEnvelope(0.6)).toBeLessThan(spikeEnvelope(1.2))
    expect(spikeEnvelope(SPIKE_DURATION_S)).toBe(0)
    expect(spikeEnvelope(5)).toBe(0)
  })

  it('keeps per-channel offsets within ±4% R_sa and ±2% current share', () => {
    for (const r of R_SA_OFFSETS) expect(Math.abs(r)).toBeLessThanOrEqual(0.04)
    for (const s of CURRENT_SHARE_OFFSETS) expect(Math.abs(s)).toBeLessThanOrEqual(0.02)
  })
})

describe('step', () => {
  it('is pure and deterministic for a given seed', () => {
    const s0 = initialSimState(MODEL_PARAMS, Date.UTC(2026, 0, 1))
    const snapshot = structuredClone(s0)
    const a = run(s0, 200, mulberry32(42)).frames
    const b = run(s0, 200, mulberry32(42)).frames
    expect(a).toEqual(b)
    expect(s0).toEqual(snapshot)
  })

  it('advances timestamps by exactly 100 ms per tick', () => {
    const epoch = Date.UTC(2026, 0, 1)
    const { frames } = run(initialSimState(MODEL_PARAMS, epoch), 50, mulberry32(1))
    frames.forEach((f, i) => {
      expect(Date.parse(f.timestamp)).toBe(epoch + (i + 1) * 100)
    })
  })

  it('derives device current as armature/3 × share and power from it', () => {
    const { frame } = step(initialSimState(MODEL_PARAMS), DT, mulberry32(7), MODEL_PARAMS)
    frame.thyristors.forEach((th, idx) => {
      const expected = (frame.armature_current / 3) * (1 + (CURRENT_SHARE_OFFSETS[idx] ?? 0))
      expect(th.current).toBeCloseTo(expected, 10)
      expect(th.power_loss).toBeCloseTo(powerLoss(expected, MODEL_PARAMS), 10)
      expect(th.margin_to_limit).toBeCloseTo(125 - th.tj_estimated, 10)
    })
  })

  it('updates each Foster stage with the exact exponential discretisation', () => {
    const s0 = initialSimState(MODEL_PARAMS)
    const zeroed: FosterSimState = {
      ...s0,
      channels: s0.channels.map((c) => ({ ...c, foster: [0, 0, 0] as const })) as unknown as FosterSimState['channels'],
    }
    const { state, frame } = step(zeroed, DT, silentRng(), MODEL_PARAMS)
    const p = frame.thyristors[0].power_loss
    const stages = state.channels[0].foster
    MODEL_PARAMS.tau.forEach((tau, k) => {
      const target = (p * MODEL_PARAMS.R_jc) / 3
      expect(stages[k]).toBeCloseTo(target * (1 - Math.exp(-DT / tau)), 12)
    })
    // Tj is the heatsink state plus the sum of stage rises.
    const rise = stages[0] + stages[1] + stages[2]
    expect(frame.thyristors[0].tj_estimated).toBeCloseTo(state.channels[0].heatsink + rise, 12)
  })

  it('emits the instantaneous Tj, which falls again after a spike (no stuck peak-hold)', () => {
    const { frames } = run(initialSimState(MODEL_PARAMS), 160, silentRng())
    const tj = frames.map((f) => f.thyristors[0].tj_estimated)
    const peak = Math.max(...tj)
    const peakIdx = tj.indexOf(peak)
    expect(peakIdx).toBeLessThan(tj.length - 1)
    expect(Math.min(...tj.slice(peakIdx))).toBeLessThan(peak - 1)
  })

  it('separates T1–T6 by 1–4 K in steady state', () => {
    const { frames } = run(initialSimState(MODEL_PARAMS), 3000, mulberry32(1337))
    const window = frames.slice(-80) // one full 8 s bar-entry cycle
    const means = [0, 1, 2, 3, 4, 5].map(
      (idx) => window.reduce((sum, f) => sum + (f.thyristors[idx]?.tj_estimated ?? 0), 0) / window.length,
    )
    const spread = Math.max(...means) - Math.min(...means)
    expect(spread).toBeGreaterThanOrEqual(1)
    expect(spread).toBeLessThanOrEqual(4)
  })

  it('stays within physical bounds under combined fan failure and overload', () => {
    const extreme: FosterSimState = { ...initialSimState(MODEL_PARAMS), load_frac: 1.15, r_sa_factor: 2.2, fan_on: false }
    const { frames } = run(extreme, 3000, mulberry32(99))
    expect(frames.at(-1)?.fan_status).toBe(false)
    for (const f of frames) {
      expect(f.ambient_temp).toBeGreaterThanOrEqual(BOUNDS.ambient_min)
      expect(f.ambient_temp).toBeLessThanOrEqual(BOUNDS.ambient_max)
      expect(f.armature_current).toBeGreaterThanOrEqual(0)
      expect(f.armature_current).toBeLessThanOrEqual(1.6 * MODEL_PARAMS.rated_current)
      for (const th of f.thyristors) {
        expect(th.t_heatsink_measured).toBeGreaterThanOrEqual(f.ambient_temp - 0.5)
        expect(th.tj_estimated).toBeGreaterThanOrEqual(th.t_heatsink_measured - 0.5)
        expect(th.tj_estimated).toBeLessThanOrEqual(BOUNDS.tj_max)
        expect(th.power_loss).toBeGreaterThanOrEqual(0)
      }
    }
    expect(frames.at(-1)?.overall_status).toBe('critical')
  })

  it('rejects a non-positive dt', () => {
    expect(() => step(initialSimState(MODEL_PARAMS), 0, mulberry32(1), MODEL_PARAMS)).toThrow(RangeError)
  })
})
