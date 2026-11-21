import { describe, expect, it } from 'vitest'
import {
  channelMean,
  deltaFromMean,
  hottestTj,
  marginToTrip,
  timeToWarning,
} from '../../src/domain/derive'
import type { ChannelId, DriveFrame, ThyristorFrame } from '../../src/domain/types'

type Ch = { tj: number; healthy?: boolean }

function makeFrame(channels: readonly [Ch, Ch, Ch, Ch, Ch, Ch]): DriveFrame {
  const th = channels.map(({ tj, healthy = true }, i): ThyristorFrame => ({
    id: (i + 1) as ChannelId,
    tj_estimated: tj,
    t_heatsink_measured: healthy ? tj - 20 : Number.NaN,
    power_loss: 500,
    current: 800,
    residual: 0,
    r_sa: 0.15,
    margin_to_limit: 125 - tj,
    status: healthy ? 'normal' : 'fault',
    sensor_healthy: healthy,
  }))
  return {
    timestamp: '2026-01-15T09:30:00.000Z',
    thyristors: th as unknown as DriveFrame['thyristors'],
    armature_current: 2400,
    ambient_temp: 35,
    fan_status: true,
    overall_status: 'normal',
    active_alarms_count: 0,
  }
}

const healthy = makeFrame([{ tj: 90 }, { tj: 95 }, { tj: 100 }, { tj: 85 }, { tj: 92 }, { tj: 98 }])
const faultedHottest = makeFrame([
  { tj: 90 },
  { tj: 140, healthy: false },
  { tj: 100 },
  { tj: 85 },
  { tj: 92 },
  { tj: 98 },
])
const allFaulted = makeFrame([
  { tj: 90, healthy: false },
  { tj: 95, healthy: false },
  { tj: 100, healthy: false },
  { tj: 85, healthy: false },
  { tj: 92, healthy: false },
  { tj: 98, healthy: false },
])

describe('hottestTj', () => {
  it('returns the maximum Tj', () => {
    expect(hottestTj(healthy)).toBe(100)
  })
  it('excludes a faulted hottest channel', () => {
    expect(hottestTj(faultedHottest)).toBe(100)
  })
  it('is NaN when no channel is healthy', () => {
    expect(hottestTj(allFaulted)).toBeNaN()
  })
})

describe('channelMean and deltaFromMean', () => {
  it('averages healthy channels', () => {
    expect(channelMean(healthy)).toBeCloseTo(560 / 6, 10)
  })
  it('excludes faulted channels from the mean', () => {
    expect(channelMean(faultedHottest)).toBeCloseTo(465 / 5, 10)
    expect(deltaFromMean(faultedHottest, 3)).toBeCloseTo(100 - 93, 10)
  })
  it('is NaN for a faulted channel or when none is healthy', () => {
    expect(deltaFromMean(faultedHottest, 2)).toBeNaN()
    expect(channelMean(allFaulted)).toBeNaN()
    expect(deltaFromMean(allFaulted, 1)).toBeNaN()
  })
  it('is signed', () => {
    expect(deltaFromMean(healthy, 4)).toBeLessThan(0)
    expect(deltaFromMean(healthy, 3)).toBeGreaterThan(0)
  })
})

describe('marginToTrip', () => {
  it('is 125 − Tj by default and negative past the trip', () => {
    expect(marginToTrip(healthy, 3)).toBe(25)
    expect(marginToTrip(makeFrame([{ tj: 130 }, { tj: 1 }, { tj: 1 }, { tj: 1 }, { tj: 1 }, { tj: 1 }]), 1)).toBe(-5)
  })
  it('accepts a custom trip and is NaN for a faulted channel', () => {
    expect(marginToTrip(healthy, 3, 110)).toBe(10)
    expect(marginToTrip(faultedHottest, 2)).toBeNaN()
  })
})

function series(values: number[], dtMs = 1000, t0 = 1_000_000): { t: number[]; v: number[] } {
  return { t: values.map((_, i) => t0 + i * dtMs), v: values }
}

describe('timeToWarning', () => {
  it('extrapolates a linear rise', () => {
    // 1 K/s, newest 100 → 10 s to reach 110
    expect(timeToWarning(series([90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100]), 110)).toBeCloseTo(10, 9)
  })
  it('uses only the last 10 s', () => {
    // Falling long ago, then rising at 0.5 K/s over the last 10 s
    const v = [120, 115, 110, 105, 100, 95, 90, 90.5, 91, 91.5, 92, 92.5, 93, 93.5, 94, 94.5, 95]
    expect(timeToWarning(series(v), 110)).toBeCloseTo(30, 9)
  })
  it('is null when flat or falling', () => {
    expect(timeToWarning(series([100, 100, 100, 100]), 110)).toBeNull()
    expect(timeToWarning(series([100, 99, 98, 97]), 110)).toBeNull()
  })
  it('is null with fewer than two samples', () => {
    expect(timeToWarning(series([]), 110)).toBeNull()
    expect(timeToWarning(series([100]), 110)).toBeNull()
  })
  it('is 0 when already at or above the warning', () => {
    expect(timeToWarning(series([100, 105, 110]), 110)).toBe(0)
  })
  it('skips non-finite samples and is null when the newest is not finite', () => {
    expect(timeToWarning(series([96, Number.NaN, 98, 99, 100]), 110)).toBeCloseTo(10, 9)
    expect(timeToWarning(series([96, 97, Number.NaN]), 110)).toBeNull()
  })
  it('accepts typed arrays', () => {
    const s = series([100, 101, 102])
    expect(timeToWarning({ t: Float64Array.from(s.t), v: Float32Array.from(s.v) }, 110)).toBeCloseTo(8, 5)
  })
})
