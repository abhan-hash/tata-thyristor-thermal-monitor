import { describe, expect, it } from 'vitest'
import { maxSeverity, severityRank, statusFor } from '../../src/domain/status'
import { DEFAULT_THRESHOLDS } from '../../src/domain/thresholds'
import type { Status } from '../../src/domain/types'

describe('statusFor', () => {
  it('classifies Tj with boundaries at 110 and 125 °C', () => {
    const band = DEFAULT_THRESHOLDS.junction_temp
    expect(statusFor(109.9, band)).toBe('normal')
    expect(statusFor(110, band)).toBe('warning')
    expect(statusFor(124.9, band)).toBe('warning')
    expect(statusFor(125, band)).toBe('critical')
    expect(statusFor(180, band)).toBe('critical')
  })

  it('classifies heatsink with boundaries at 80 and 85 °C', () => {
    const band = DEFAULT_THRESHOLDS.heatsink_temp
    expect(statusFor(79.99, band)).toBe('normal')
    expect(statusFor(80, band)).toBe('warning')
    expect(statusFor(85, band)).toBe('critical')
  })

  it('classifies cooling residual with boundaries at 4 and 8 K', () => {
    const band = DEFAULT_THRESHOLDS.cooling_residual
    expect(statusFor(-2, band)).toBe('normal')
    expect(statusFor(3.99, band)).toBe('normal')
    expect(statusFor(4, band)).toBe('warning')
    expect(statusFor(8, band)).toBe('critical')
  })

  it('accepts a band with only warning and critical', () => {
    expect(statusFor(5, { warning: 5, critical: 10 })).toBe('warning')
  })

  it('returns fault for NaN and follows comparisons for ±∞', () => {
    const band = DEFAULT_THRESHOLDS.junction_temp
    expect(statusFor(Number.NaN, band)).toBe('fault')
    expect(statusFor(Number.NEGATIVE_INFINITY, band)).toBe('normal')
    expect(statusFor(Number.POSITIVE_INFINITY, band)).toBe('critical')
  })
})

describe('severityRank', () => {
  it('orders normal < warning < critical < fault', () => {
    expect(severityRank('normal')).toBe(0)
    expect(severityRank('warning')).toBe(1)
    expect(severityRank('critical')).toBe(2)
    expect(severityRank('fault')).toBe(3)
  })
})

describe('maxSeverity', () => {
  it('returns normal for an empty list', () => {
    expect(maxSeverity([])).toBe('normal')
  })

  it('returns the highest-ranked status', () => {
    expect(maxSeverity(['normal', 'warning', 'normal'])).toBe('warning')
    expect(maxSeverity(['critical', 'warning', 'normal'])).toBe('critical')
    expect(maxSeverity(['critical', 'fault', 'warning'])).toBe('fault')
  })

  it('accepts any iterable', () => {
    const set = new Set<Status>(['normal', 'critical'])
    expect(maxSeverity(set)).toBe('critical')
  })
})
