import { describe, expect, it, vi } from 'vitest'
import {
  decodeDriveFrame,
  type DecodeLogger,
  type DecodeResult,
  type MarginMismatch,
} from '../../src/domain/decode'
import type { DriveFrame } from '../../src/domain/types'

type RawChannel = Record<string, unknown>
type RawFrame = Record<string, unknown> & { thyristors: RawChannel[] }

/** A valid raw frame with consistent margins; each test mutates a fresh copy. */
function validRaw(): RawFrame {
  const tjs = [70, 72, 74, 76, 78, 80]
  return {
    timestamp: '2026-01-15T09:30:00.000Z',
    thyristors: tjs.map((tj, i) => ({
      id: i + 1,
      tj_estimated: tj,
      t_heatsink_measured: tj - 20,
      power_loss: 500,
      current: 800,
      residual: 0,
      r_sa: 0.15,
      margin_to_limit: 125 - tj,
      status: 'normal',
      sensor_healthy: true,
    })),
    armature_current: 2400,
    ambient_temp: 35,
    fan_status: true,
    overall_status: 'normal',
    active_alarms_count: 0,
  }
}

/** Channel `i` of a raw frame; throws rather than returning undefined. */
function ch(raw: RawFrame, i: number): RawChannel {
  const channel = raw.thyristors[i]
  if (channel === undefined) throw new Error(`no channel at index ${i}`)
  return channel
}

function silentLogger(): DecodeLogger & { calls: MarginMismatch[] } {
  const calls: MarginMismatch[] = []
  return { calls, marginMismatch: (d) => void calls.push(d) }
}

function decode(input: unknown, logger: DecodeLogger = silentLogger()): DecodeResult {
  return decodeDriveFrame(input, { logger })
}

function expectOk(result: DecodeResult): DriveFrame {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.path}: ${result.error.message}`)
  return result.frame
}

function expectError(result: DecodeResult, path: string): void {
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.error.path).toBe(path)
}

describe('decodeDriveFrame – accepts a valid frame', () => {
  it('returns ok and leaves no mismatch logged', () => {
    const logger = silentLogger()
    const frame = expectOk(decode(validRaw(), logger))
    expect(frame.thyristors.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(logger.calls).toEqual([])
  })
})

describe('decodeDriveFrame – rejection rules (Requirements 9.2, 9.3)', () => {
  it('rejects a missing top-level key', () => {
    const raw = validRaw()
    delete raw.ambient_temp
    expectError(decode(raw), 'ambient_temp')
  })

  it('rejects a missing channel key', () => {
    const raw = validRaw()
    delete ch(raw, 3)['tj_estimated']
    expectError(decode(raw), 'thyristors[3].tj_estimated')
  })

  it('rejects a wrong type', () => {
    const raw = validRaw()
    ch(raw, 0).current = '800'
    expectError(decode(raw), 'thyristors[0].current')
  })

  it('rejects a non-object input', () => {
    expectError(decode(null), '')
    expectError(decode([1, 2, 3]), '')
  })

  it.each([5, 7])('rejects a thyristor count of %i', (count) => {
    const raw = validRaw()
    const base = ch(raw, 0)
    raw.thyristors = Array.from({ length: count }, (_, i) => ({ ...base, id: i + 1 }))
    expectError(decode(raw), 'thyristors')
  })

  it('rejects ids out of order', () => {
    const raw = validRaw()
    ch(raw, 1).id = 3
    ch(raw, 2).id = 2
    expectError(decode(raw), 'thyristors[1].id')
  })

  it('rejects ids outside 1..6', () => {
    const raw = validRaw()
    ch(raw, 5).id = 7
    expectError(decode(raw), 'thyristors[5].id')
  })

  it.each([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects an infinite temperature (%s)',
    (value) => {
      const raw = validRaw()
      ch(raw, 2).tj_estimated = value
      expectError(decode(raw), 'thyristors[2].tj_estimated')
    },
  )

  it('rejects an infinite temperature even on an unhealthy channel', () => {
    const raw = validRaw()
    ch(raw, 2).sensor_healthy = false
    ch(raw, 2).t_heatsink_measured = Number.POSITIVE_INFINITY
    expectError(decode(raw), 'thyristors[2].t_heatsink_measured')
  })

  it('rejects a NaN temperature while sensor_healthy is true', () => {
    const raw = validRaw()
    ch(raw, 4).t_heatsink_measured = Number.NaN
    expectError(decode(raw), 'thyristors[4].t_heatsink_measured')
  })

  it('accepts a NaN temperature when sensor_healthy is false', () => {
    const raw = validRaw()
    ch(raw, 4).sensor_healthy = false
    ch(raw, 4).t_heatsink_measured = Number.NaN
    const frame = expectOk(decode(raw))
    expect(frame.thyristors[4].t_heatsink_measured).toBeNaN()
  })
})

describe('decodeDriveFrame – normalisation rules (Requirements 9.5–9.8)', () => {
  it('recomputes margin_to_limit as 125 − tj_estimated and logs the mismatch', () => {
    const raw = validRaw()
    ch(raw, 1).margin_to_limit = 10 // correct value is 125 − 72 = 53
    const logger = silentLogger()
    const frame = expectOk(decode(raw, logger))
    expect(frame.thyristors[1].margin_to_limit).toBe(53)
    expect(logger.calls).toEqual([{ channel: 2, input: 10, computed: 53 }])
  })

  it('does not log a mismatch within 0.01 K', () => {
    const raw = validRaw()
    ch(raw, 0).margin_to_limit = 55.005 // correct value is 55
    const logger = silentLogger()
    const frame = expectOk(decode(raw, logger))
    expect(frame.thyristors[0].margin_to_limit).toBe(55)
    expect(logger.calls).toEqual([])
  })

  it('uses console.warn as the default logger', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const raw = validRaw()
      ch(raw, 0).margin_to_limit = 0
      expectOk(decodeDriveFrame(raw))
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('channel 1'))
    } finally {
      warn.mockRestore()
    }
  })

  it('forces fault status on an unhealthy channel', () => {
    const raw = validRaw()
    ch(raw, 3).sensor_healthy = false
    ch(raw, 3).status = 'normal'
    const frame = expectOk(decode(raw))
    expect(frame.thyristors[3].status).toBe('fault')
  })

  it('recomputes overall_status as the worst channel status', () => {
    const raw = validRaw()
    ch(raw, 2).status = 'warning'
    ch(raw, 5).status = 'critical'
    raw.overall_status = 'normal'
    expect(expectOk(decode(raw)).overall_status).toBe('critical')
  })

  it('lowers a contradictory overall_status to the worst channel status', () => {
    const raw = validRaw()
    raw.overall_status = 'critical'
    expect(expectOk(decode(raw)).overall_status).toBe('normal')
  })

  it('drops unknown keys at frame and channel level', () => {
    const raw = validRaw()
    raw.extra = 'ignored'
    ch(raw, 0).debug = { nested: true }
    const frame = expectOk(decode(raw))
    expect(frame).not.toHaveProperty('extra')
    expect(frame.thyristors[0]).not.toHaveProperty('debug')
    expect(Object.keys(frame).sort()).toEqual(
      [
        'active_alarms_count',
        'ambient_temp',
        'armature_current',
        'fan_status',
        'overall_status',
        'thyristors',
        'timestamp',
      ].sort(),
    )
  })
})
