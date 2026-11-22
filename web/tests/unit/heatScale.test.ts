import { describe, expect, it } from 'vitest'
import {
  HEAT_BREAKPOINTS_C,
  heatStopIndex,
  heatToken,
  heatTreatment,
} from '../../src/domain/heatScale'

describe('heatStopIndex', () => {
  it('maps ambient to stop 0 and the Tj limit and above to stop 8', () => {
    expect(heatStopIndex(35)).toBe(0)
    expect(heatStopIndex(-50)).toBe(0)
    expect(heatStopIndex(125)).toBe(8)
    expect(heatStopIndex(250)).toBe(8)
  })

  it('starts each stop at its breakpoint (inclusive)', () => {
    HEAT_BREAKPOINTS_C.forEach((bp, i) => {
      expect(heatStopIndex(bp)).toBe(i + 1)
      expect(heatStopIndex(bp - 0.01)).toBe(i)
    })
  })

  it('places the warning threshold (110 °C) at stop 6', () => {
    expect(heatStopIndex(109.9)).toBe(5)
    expect(heatStopIndex(110)).toBe(6)
  })

  it('stays in range for infinities and NaN', () => {
    expect(heatStopIndex(-Infinity)).toBe(0)
    expect(heatStopIndex(Infinity)).toBe(8)
    expect(heatStopIndex(NaN)).toBe(0)
  })

  it('uses strictly increasing breakpoints', () => {
    for (let i = 1; i < HEAT_BREAKPOINTS_C.length; i++) {
      expect(HEAT_BREAKPOINTS_C[i]).toBeGreaterThan(HEAT_BREAKPOINTS_C[i - 1] as number)
    }
  })
})

describe('heatToken', () => {
  it('returns the heat custom property for each stop', () => {
    for (let i = 0; i <= 8; i++) expect(heatToken(i)).toBe(`var(--heat-${i})`)
  })

  it('clamps out-of-range and non-finite indices', () => {
    expect(heatToken(-3)).toBe('var(--heat-0)')
    expect(heatToken(12)).toBe('var(--heat-8)')
    expect(heatToken(NaN)).toBe('var(--heat-0)')
  })
})

describe('heatTreatment', () => {
  it('returns a heat stop for finite temperatures', () => {
    expect(heatTreatment(35)).toEqual({ kind: 'heat', index: 0 })
    expect(heatTreatment(120)).toEqual({ kind: 'heat', index: 7 })
  })

  it('returns the fault treatment for non-finite input', () => {
    expect(heatTreatment(NaN)).toEqual({ kind: 'fault' })
    expect(heatTreatment(Infinity)).toEqual({ kind: 'fault' })
    expect(heatTreatment(-Infinity)).toEqual({ kind: 'fault' })
  })
})
