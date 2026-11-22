import { describe, expect, it } from 'vitest'
import {
  filterEvents,
  parseAlarmParams,
  parseChannelToken,
  serializeAlarmParams,
  toggleValue,
  updateAlarmParams,
  type AlarmUrlState,
} from '../../src/domain/alarmFilters'
import type { AlarmEvent } from '../../src/domain/types'

function evt(id: string, over: Partial<AlarmEvent> = {}): AlarmEvent {
  return {
    id,
    channel: 1,
    kind: 'junction_temp',
    severity: 'warning',
    raised_at: '2026-01-15T09:00:00.000Z',
    peak_value: 112,
    unit: '°C',
    ...over,
  }
}

const events: AlarmEvent[] = [
  evt('a', { channel: 1, severity: 'warning', raised_at: '2026-01-15T08:00:00.000Z' }),
  evt('b', { channel: 3, severity: 'critical', kind: 'heatsink_temp', raised_at: '2026-01-15T09:00:00.000Z' }),
  evt('c', { channel: 'drive', severity: 'critical', kind: 'rms_current', unit: '%', raised_at: '2026-01-15T10:00:00.000Z' }),
  evt('d', { channel: 6, severity: 'fault', kind: 'sensor', raised_at: '2026-01-15T11:00:00.000Z' }),
]

const ids = (list: AlarmEvent[]) => list.map((e) => e.id)

describe('filterEvents', () => {
  it('returns every event, in order, for an empty filter', () => {
    expect(ids(filterEvents(events, {}))).toEqual(['a', 'b', 'c', 'd'])
    expect(ids(filterEvents(events, { severities: [], channels: [], kinds: [] }))).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  it('filters by severity, channel and kind', () => {
    expect(ids(filterEvents(events, { severities: ['critical'] }))).toEqual(['b', 'c'])
    expect(ids(filterEvents(events, { channels: [6, 'drive'] }))).toEqual(['c', 'd'])
    expect(ids(filterEvents(events, { kinds: ['sensor', 'junction_temp'] }))).toEqual(['a', 'd'])
  })

  it('combines dimensions with AND', () => {
    expect(ids(filterEvents(events, { severities: ['critical'], channels: [3] }))).toEqual(['b'])
    expect(filterEvents(events, { severities: ['fault'], kinds: ['heatsink_temp'] })).toEqual([])
  })

  it('applies inclusive from/to bounds on raised_at', () => {
    const from = new Date('2026-01-15T09:00:00.000Z')
    const to = new Date('2026-01-15T10:00:00.000Z')
    expect(ids(filterEvents(events, { from, to }))).toEqual(['b', 'c'])
    expect(ids(filterEvents(events, { from }))).toEqual(['b', 'c', 'd'])
    expect(ids(filterEvents(events, { to }))).toEqual(['a', 'b', 'c'])
  })

  it('ignores an invalid Date bound and excludes unparseable raised_at only when timed', () => {
    const bad = evt('x', { raised_at: 'not a date' })
    expect(ids(filterEvents([bad], { from: new Date('nope') }))).toEqual(['x'])
    expect(filterEvents([bad], { from: new Date('2026-01-01T00:00:00Z') })).toEqual([])
  })
})

describe('parseAlarmParams', () => {
  it('reads every param', () => {
    const p = new URLSearchParams(
      'sev=fault,critical&ch=T4,drive,T1&kind=sensor&from=2026-01-15T08:00:00.000Z&to=2026-01-15T09:00:00.000Z&event=evt-7',
    )
    expect(parseAlarmParams(p)).toEqual({
      severities: ['critical', 'fault'],
      channels: [1, 4, 'drive'],
      kinds: ['sensor'],
      from: new Date('2026-01-15T08:00:00.000Z'),
      to: new Date('2026-01-15T09:00:00.000Z'),
      event: 'evt-7',
    })
  })

  it('drops unknown tokens, duplicates and invalid instants without throwing', () => {
    const p = new URLSearchParams('sev=bogus,WARNING,warning&ch=T7,t2,,0&kind=x&from=yesterday&to=&event=')
    expect(parseAlarmParams(p)).toEqual({ severities: ['warning'], channels: [2] })
  })

  it('returns an empty state for no params', () => {
    expect(parseAlarmParams(new URLSearchParams())).toEqual({})
  })

  it('parses channel tokens', () => {
    expect(parseChannelToken('T3')).toBe(3)
    expect(parseChannelToken(' drive ')).toBe('drive')
    expect(parseChannelToken('3')).toBeUndefined()
    expect(parseChannelToken('T0')).toBeUndefined()
  })
})

describe('serializeAlarmParams', () => {
  it('writes canonical, deduplicated lists and ISO instants', () => {
    const out = serializeAlarmParams({
      severities: ['fault', 'warning', 'fault'],
      channels: ['drive', 5, 2],
      kinds: ['sensor', 'junction_temp'],
      from: new Date('2026-01-15T08:00:00Z'),
      event: 'evt-1',
    })
    expect(out.get('sev')).toBe('warning,fault')
    expect(out.get('ch')).toBe('T2,T5,drive')
    expect(out.get('kind')).toBe('junction_temp,sensor')
    expect(out.get('from')).toBe('2026-01-15T08:00:00.000Z')
    expect(out.has('to')).toBe(false)
    expect(out.get('event')).toBe('evt-1')
  })

  it('omits empty lists, invalid dates and empty ids, and preserves unrelated params', () => {
    const base = new URLSearchParams('dev=1&sev=critical&mock=stress-200-alarms')
    const out = serializeAlarmParams(
      { severities: [], channels: [], from: new Date('nope'), event: '  ' },
      base,
    )
    expect(out.toString()).toBe('dev=1&mock=stress-200-alarms')
    expect(base.get('sev')).toBe('critical')
  })

  it('round-trips state through the URL', () => {
    const states: AlarmUrlState[] = [
      {},
      { severities: ['critical'] },
      { channels: [1, 2, 3, 4, 5, 6, 'drive'] },
      {
        severities: ['warning', 'critical', 'fault'],
        channels: [3, 'drive'],
        kinds: ['cooling_residual', 'residual_rate'],
        from: new Date('2026-01-14T09:30:00.000Z'),
        to: new Date('2026-01-15T09:30:00.000Z'),
        event: 'evt-0042',
      },
    ]
    for (const s of states) {
      const url = serializeAlarmParams(s).toString()
      expect(parseAlarmParams(new URLSearchParams(url))).toEqual(s)
    }
  })

  it('round-trips canonical query strings', () => {
    const qs = 'sev=warning%2Cfault&ch=T1%2Cdrive&from=2026-01-15T08%3A00%3A00.000Z&event=e1'
    expect(serializeAlarmParams(parseAlarmParams(new URLSearchParams(qs))).toString()).toBe(qs)
  })
})

describe('updateAlarmParams and toggleValue', () => {
  it('patches one dimension and keeps the rest', () => {
    const params = new URLSearchParams('sev=critical&ch=T2&dev=1')
    const next = updateAlarmParams(params, {
      from: new Date('2026-01-15T08:00:00Z'),
      to: new Date('2026-01-15T09:00:00Z'),
    })
    expect(next.get('sev')).toBe('critical')
    expect(next.get('ch')).toBe('T2')
    expect(next.get('dev')).toBe('1')
    expect(next.get('from')).toBe('2026-01-15T08:00:00.000Z')
    expect(params.has('from')).toBe(false)
  })

  it('clears a dimension when the patch value is undefined', () => {
    const next = updateAlarmParams(new URLSearchParams('event=e1&sev=fault'), { event: undefined })
    expect(next.toString()).toBe('sev=fault')
  })

  it('toggles chip values', () => {
    expect(toggleValue(undefined, 'fault')).toEqual(['fault'])
    expect(toggleValue(['warning', 'fault'], 'fault')).toEqual(['warning'])
    expect(toggleValue<number | 'drive'>([1], 'drive')).toEqual([1, 'drive'])
  })
})
