import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ALARM_COMBOS,
  MOCK_ALARMS,
  TRACE_SAMPLES,
  generateAlarms,
  generateTrace,
} from '../../src/data/mock/fixtures/alarms'
import { FIXTURE_SEED, MOCK_DAILY_PEAKS, generateDailyPeaks } from '../../src/data/mock/fixtures/history'
import { MOCK_WEAR, generateWear } from '../../src/data/mock/fixtures/wear'

const NOW = Date.parse('2026-11-21T12:00:00Z')

describe('mock history fixtures', () => {
  it('every fixture file starts with the MOCK header', () => {
    for (const f of ['alarms', 'history', 'wear']) {
      const src = readFileSync(resolve(import.meta.dirname, `../../src/data/mock/fixtures/${f}.ts`), 'utf8')
      expect(src.startsWith('// MOCK DATA – synthetic, not plant telemetry')).toBe(true)
    }
  })

  it('daily peaks cover 30 days for all six channels', () => {
    expect(MOCK_DAILY_PEAKS).toHaveLength(180)
    const peaks = generateDailyPeaks(FIXTURE_SEED, NOW)
    expect(new Set(peaks.map((p) => p.day)).size).toBe(30)
    expect(peaks.at(-1)?.day).toBe('2026-11-21')
    expect(peaks[0]?.day).toBe('2026-10-23')
    for (const p of peaks) expect(p.peak_tj).toBeGreaterThan(80)
  })

  it('has 200 alarms over every kind and severity, newest first', () => {
    expect(MOCK_ALARMS).toHaveLength(200)
    const alarms = generateAlarms(FIXTURE_SEED, NOW)
    const combos = new Set(alarms.map((a) => `${a.kind}:${a.severity}`))
    for (const c of ALARM_COMBOS) expect(combos.has(`${c.kind}:${c.severity}`)).toBe(true)
    expect(new Set(alarms.map((a) => a.id)).size).toBe(200)
    const times = alarms.map((a) => Date.parse(a.raised_at))
    expect(times).toEqual([...times].sort((a, b) => b - a))
    for (const a of alarms) {
      expect(Date.parse(a.raised_at)).toBeLessThanOrEqual(NOW)
      expect(Date.parse(a.raised_at)).toBeGreaterThanOrEqual(NOW - 30 * 86_400_000)
    }
  })

  it('is deterministic for a seed', () => {
    expect(generateAlarms(FIXTURE_SEED, NOW)).toEqual(generateAlarms(FIXTURE_SEED, NOW))
    expect(generateWear(FIXTURE_SEED)).toEqual(generateWear(FIXTURE_SEED))
  })

  it('wear projections are ordered p10 ≤ p50 ≤ p90 within 0–100', () => {
    expect(MOCK_WEAR).toHaveLength(6)
    for (const w of MOCK_WEAR) {
      for (const p of w.projection) {
        expect(p.p10).toBeLessThanOrEqual(p.p50)
        expect(p.p50).toBeLessThanOrEqual(p.p90)
        expect(p.p10).toBeGreaterThanOrEqual(0)
        expect(p.p90).toBeLessThanOrEqual(100)
      }
    }
    expect(MOCK_WEAR.some((w) => w.wear_rate_vs_baseline > 2)).toBe(true)
  })

  it('traces span ±60 s at 10 Hz and peak at a junction_temp event peak', () => {
    const event = MOCK_ALARMS.find((a) => a.kind === 'junction_temp')
    if (!event) throw new Error('fixture has no junction_temp event')
    const { t, tj } = generateTrace(event)
    expect(t).toHaveLength(TRACE_SAMPLES)
    expect(tj).toHaveLength(1201)
    const raised = Date.parse(event.raised_at)
    expect(t[0]).toBe(raised - 60_000)
    expect(t[1200]).toBe(raised + 60_000)
    expect((t[1] ?? 0) - (t[0] ?? 0)).toBe(100)
    expect(Math.abs(Math.max(...tj) - event.peak_value)).toBeLessThan(1)
    expect(generateTrace(event).tj).toEqual(tj)
  })
})
