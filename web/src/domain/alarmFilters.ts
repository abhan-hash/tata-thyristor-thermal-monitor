/**
 * Alarm filtering and Alarms page URL state (Requirements 26.2, 26.4, 26.5).
 *
 * Pure functions only. The Alarms page keeps its filter in the URL:
 *
 * | Param     | Format                                      | Example                 |
 * |-----------|---------------------------------------------|-------------------------|
 * | `?sev=`   | comma list of `warning`, `critical`, `fault`| `sev=critical,fault`    |
 * | `?ch=`    | comma list of `T1`..`T6` and `drive`        | `ch=T1,T4,drive`        |
 * | `?kind=`  | comma list of AlarmEvent kinds              | `kind=junction_temp`    |
 * | `?from=`  | ISO 8601 instant                            | `from=2026-01-15T08:00:00.000Z` |
 * | `?to=`    | ISO 8601 instant                            | `to=2026-01-15T09:00:00.000Z`   |
 * | `?event=` | alarm event id (the expanded row)           | `event=evt-0042`        |
 *
 * An absent or empty list means "no restriction" on that dimension. Unknown
 * list tokens and unparseable instants are dropped, so a hand-edited URL never
 * throws. Serialisation is canonical (fixed order, no duplicates) and leaves
 * unrelated params such as `?dev=` or `?mock=` untouched.
 */
import type { AlarmEvent, ChannelId } from './types'

export type AlarmSeverity = AlarmEvent['severity']
export type AlarmKind = AlarmEvent['kind']
export type AlarmChannel = AlarmEvent['channel']

/** Canonical orders, also used for chip rows. */
export const ALARM_SEVERITIES: readonly AlarmSeverity[] = ['warning', 'critical', 'fault']
export const ALARM_CHANNELS: readonly AlarmChannel[] = [1, 2, 3, 4, 5, 6, 'drive']
export const ALARM_KINDS: readonly AlarmKind[] = [
  'junction_temp',
  'heatsink_temp',
  'cooling_residual',
  'rms_current',
  'residual_rate',
  'sensor',
]

export interface AlarmFilter {
  /** Empty or absent: every severity. */
  severities?: readonly AlarmSeverity[]
  /** Empty or absent: every channel, including drive-level events. */
  channels?: readonly AlarmChannel[]
  /** Empty or absent: every kind. */
  kinds?: readonly AlarmKind[]
  /** Inclusive lower bound on `raised_at`. */
  from?: Date
  /** Inclusive upper bound on `raised_at`. */
  to?: Date
}

/** Full Alarms page URL state: the filter plus the expanded event id. */
export interface AlarmUrlState extends AlarmFilter {
  event?: string
}

export const ALARM_PARAM_KEYS = ['sev', 'ch', 'kind', 'from', 'to', 'event'] as const

/**
 * Events matching every active dimension of `filter`, in input order.
 * Time bounds compare against `raised_at`; an event with an unparseable
 * `raised_at` is excluded only when a time bound is set.
 */
export function filterEvents(
  events: readonly AlarmEvent[],
  filter: AlarmFilter,
): AlarmEvent[] {
  const sev = nonEmptySet(filter.severities)
  const ch = nonEmptySet(filter.channels)
  const kinds = nonEmptySet(filter.kinds)
  const fromMs = validMs(filter.from)
  const toMs = validMs(filter.to)
  const timed = fromMs !== undefined || toMs !== undefined

  return events.filter((e) => {
    if (sev && !sev.has(e.severity)) return false
    if (ch && !ch.has(e.channel)) return false
    if (kinds && !kinds.has(e.kind)) return false
    if (timed) {
      const t = Date.parse(e.raised_at)
      if (!Number.isFinite(t)) return false
      if (fromMs !== undefined && t < fromMs) return false
      if (toMs !== undefined && t > toMs) return false
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// Token codecs
// ---------------------------------------------------------------------------

/** `1` → `T1`, `'drive'` → `drive`. */
export function channelToken(ch: AlarmChannel): string {
  return ch === 'drive' ? 'drive' : `T${ch}`
}

/** `T1`/`t1` → 1, `drive` → 'drive', anything else → undefined. */
export function parseChannelToken(token: string): AlarmChannel | undefined {
  const t = token.trim().toLowerCase()
  if (t === 'drive') return 'drive'
  const m = /^t([1-6])$/.exec(t)
  return m ? (Number(m[1]) as ChannelId) : undefined
}

function parseList<T>(
  raw: string | null,
  parse: (token: string) => T | undefined,
  order: readonly T[],
): T[] | undefined {
  if (raw === null) return undefined
  const found = new Set<T>()
  for (const token of raw.split(',')) {
    const v = parse(token)
    if (v !== undefined) found.add(v)
  }
  const out = order.filter((v) => found.has(v))
  return out.length > 0 ? out : undefined
}

function memberOf<T extends string>(values: readonly T[]) {
  return (token: string): T | undefined => {
    const t = token.trim().toLowerCase()
    return values.find((v) => v === t)
  }
}

function parseInstant(raw: string | null): Date | undefined {
  if (raw === null || raw.trim() === '') return undefined
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? new Date(ms) : undefined
}

// ---------------------------------------------------------------------------
// URL state
// ---------------------------------------------------------------------------

/** Reads the Alarms page state from search params. Never throws. */
export function parseAlarmParams(params: URLSearchParams): AlarmUrlState {
  const state: AlarmUrlState = {}
  const severities = parseList(params.get('sev'), memberOf(ALARM_SEVERITIES), ALARM_SEVERITIES)
  const channels = parseList(params.get('ch'), parseChannelToken, ALARM_CHANNELS)
  const kinds = parseList(params.get('kind'), memberOf(ALARM_KINDS), ALARM_KINDS)
  const from = parseInstant(params.get('from'))
  const to = parseInstant(params.get('to'))
  const event = params.get('event')?.trim()
  if (severities) state.severities = severities
  if (channels) state.channels = channels
  if (kinds) state.kinds = kinds
  if (from) state.from = from
  if (to) state.to = to
  if (event) state.event = event
  return state
}

/**
 * Writes `state` into a copy of `base`, preserving params the Alarms page does
 * not own. Empty lists, invalid dates and empty ids remove their param.
 */
export function serializeAlarmParams(
  state: AlarmUrlState,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const out = new URLSearchParams(base)
  for (const key of ALARM_PARAM_KEYS) out.delete(key)

  setList(out, 'sev', canonical(state.severities, ALARM_SEVERITIES))
  setList(out, 'ch', canonical(state.channels, ALARM_CHANNELS).map(channelToken))
  setList(out, 'kind', canonical(state.kinds, ALARM_KINDS))
  const fromMs = validMs(state.from)
  const toMs = validMs(state.to)
  if (fromMs !== undefined) out.set('from', new Date(fromMs).toISOString())
  if (toMs !== undefined) out.set('to', new Date(toMs).toISOString())
  const event = state.event?.trim()
  if (event) out.set('event', event)
  return out
}

/** Partial Alarms state; an explicit `undefined` clears that key. */
export type AlarmParamsPatch = { [K in keyof AlarmUrlState]?: AlarmUrlState[K] | undefined }

/**
 * Applies a partial update to the current params, e.g. a chip toggle
 * (`{ severities }`), a brush (`{ from, to }`) or an expansion (`{ event }`).
 * Keys present in `patch` with value `undefined` clear that part of the state
 * (the serialiser treats `undefined` and absent alike).
 */
export function updateAlarmParams(
  params: URLSearchParams,
  patch: AlarmParamsPatch,
): URLSearchParams {
  const merged = { ...parseAlarmParams(params), ...patch } as AlarmUrlState
  return serializeAlarmParams(merged, params)
}

/** Adds `value` to `list` if absent, removes it if present (chip toggle). */
export function toggleValue<T>(list: readonly T[] | undefined, value: T): T[] {
  const current = list ?? []
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nonEmptySet<T>(values: readonly T[] | undefined): Set<T> | undefined {
  return values && values.length > 0 ? new Set(values) : undefined
}

function validMs(d: Date | undefined): number | undefined {
  if (!d) return undefined
  const ms = d.getTime()
  return Number.isFinite(ms) ? ms : undefined
}

function canonical<T>(values: readonly T[] | undefined, order: readonly T[]): T[] {
  if (!values || values.length === 0) return []
  const set = new Set(values)
  return order.filter((v) => set.has(v))
}

function setList(params: URLSearchParams, key: string, tokens: readonly string[]): void {
  if (tokens.length > 0) params.set(key, tokens.join(','))
}
