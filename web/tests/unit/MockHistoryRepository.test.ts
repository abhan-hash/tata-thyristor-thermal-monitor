// MockHistoryRepository filtering, acknowledgement and latency (Requirements 10.8, 10.9).
// Fixture contents are covered by historyFixtures.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_LATENCY_MAX_MS,
  MOCK_LATENCY_MIN_MS,
  MockHistoryRepository,
} from '../../src/data/mock/MockHistoryRepository'
import { TRACE_SAMPLES } from '../../src/data/mock/fixtures/alarms'
import { MOCK_DAILY_PEAKS } from '../../src/data/mock/fixtures/history'
import type { AlarmEvent } from '../../src/domain/types'

const DAY = 86_400_000
const BASE = Date.parse('2026-11-01T00:00:00Z')

function event(id: string, dayOffset: number, channel: AlarmEvent['channel'], severity: AlarmEvent['severity']): AlarmEvent {
  return {
    id,
    channel,
    kind: 'junction_temp',
    severity,
    raised_at: new Date(BASE + dayOffset * DAY).toISOString(),
    peak_value: 120,
    unit: '°C',
  }
}

const ALARMS: AlarmEvent[] = [
  event('a', 0, 1, 'warning'),
  event('b', 1, 2, 'critical'),
  event('c', 2, 'drive', 'fault'),
  event('d', 3, 1, 'critical'),
  event('e', 10, 3, 'warning'),
]

/** Resolves a repository call by running the fake clock past the maximum latency. */
async function settle<T>(p: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MAX_MS)
  return p
}

const range = { from: new Date(BASE), to: new Date(BASE + 3 * DAY) }

describe('MockHistoryRepository', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('filters alarms by inclusive time range, newest first', async () => {
    const repo = new MockHistoryRepository({ alarms: ALARMS })
    const got = await settle(repo.alarms(range))
    expect(got.map((e) => e.id)).toEqual(['d', 'c', 'b', 'a'])
  })

  it('filters by channel (excluding drive-level events) and by severity', async () => {
    const repo = new MockHistoryRepository({ alarms: ALARMS })
    expect((await settle(repo.alarms({ ...range, channels: [1] }))).map((e) => e.id)).toEqual(['d', 'a'])
    expect((await settle(repo.alarms({ ...range, severities: ['critical'] }))).map((e) => e.id)).toEqual(['d', 'b'])
    expect(
      (await settle(repo.alarms({ ...range, channels: [1, 2], severities: ['critical'] }))).map((e) => e.id),
    ).toEqual(['d', 'b'])
    expect(await settle(repo.alarms({ ...range, channels: [] }))).toEqual([])
  })

  it('serves all 200 fixture alarms over a wide range', async () => {
    const repo = new MockHistoryRepository()
    const got = await settle(repo.alarms({ from: new Date(0), to: new Date(8.64e15) }))
    expect(got).toHaveLength(200)
  })

  it('acknowledge records user and time, persists, and rejects unknown ids', async () => {
    const now = BASE + 20 * DAY
    const repo = new MockHistoryRepository({ alarms: ALARMS, now: () => now })
    const acked = await settle(repo.acknowledge('b', 'op1'))
    expect(acked).toMatchObject({ id: 'b', acknowledged_by: 'op1', acknowledged_at: new Date(now).toISOString() })
    const [b] = await settle(repo.alarms({ ...range, severities: ['critical'], channels: [2] }))
    expect(b?.acknowledged_by).toBe('op1')
    const missing = repo.acknowledge('nope', 'op1')
    const assertion = expect(missing).rejects.toThrow(/Unknown alarm event/)
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MAX_MS)
    await assertion
  })

  it('returned events are copies of the stored ones', async () => {
    const repo = new MockHistoryRepository({ alarms: ALARMS })
    const [first] = await settle(repo.alarms(range))
    if (first) first.acknowledged_by = 'mutated'
    const [again] = await settle(repo.alarms(range))
    expect(again?.acknowledged_by).toBeUndefined()
  })

  it('dailyPeaks returns the last N days, clamped to 1–30', async () => {
    const repo = new MockHistoryRepository()
    const week = await settle(repo.dailyPeaks(7))
    expect(week).toHaveLength(42)
    const lastDays = [...new Set(MOCK_DAILY_PEAKS.map((p) => p.day))].sort().slice(-7)
    expect(new Set(week.map((p) => p.day))).toEqual(new Set(lastDays))
    expect(await settle(repo.dailyPeaks(0))).toHaveLength(6)
    expect(await settle(repo.dailyPeaks(99))).toHaveLength(180)
  })

  it('serves wear records and per-event traces', async () => {
    const repo = new MockHistoryRepository()
    expect(await settle(repo.wear())).toHaveLength(6)
    const [first] = await settle(repo.alarms({ from: new Date(0), to: new Date(8.64e15) }))
    if (!first) throw new Error('no fixture alarms')
    const trace = await settle(repo.trace(first.id))
    expect(trace.t).toHaveLength(TRACE_SAMPLES)
    expect(trace.tj).toHaveLength(TRACE_SAMPLES)
  })

  it('every call resolves no earlier than 80 ms and no later than 200 ms', async () => {
    const repo = new MockHistoryRepository({ alarms: ALARMS })
    for (let i = 0; i < 25; i++) {
      let done = false
      const p = repo.dailyPeaks(1).then(() => {
        done = true
      })
      await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MIN_MS - 1)
      expect(done).toBe(false)
      await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MAX_MS - MOCK_LATENCY_MIN_MS + 1)
      expect(done).toBe(true)
      await p
    }
  })

  it('latency draws stay in [80, 200] and repeat for the same seed', () => {
    const a = new MockHistoryRepository({ seed: 9 })
    const b = new MockHistoryRepository({ seed: 9 })
    const da = Array.from({ length: 500 }, () => a.nextLatencyMs())
    const db = Array.from({ length: 500 }, () => b.nextLatencyMs())
    expect(da).toEqual(db)
    for (const d of da) {
      expect(d).toBeGreaterThanOrEqual(MOCK_LATENCY_MIN_MS)
      expect(d).toBeLessThanOrEqual(MOCK_LATENCY_MAX_MS)
    }
    expect(new Set(da).size).toBeGreaterThan(1)
  })
})
