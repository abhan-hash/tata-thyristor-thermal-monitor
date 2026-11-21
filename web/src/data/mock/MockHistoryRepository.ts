// MOCK DATA – synthetic, not plant telemetry
// HistoryRepository backed by the seeded in-memory fixtures (Requirements 10.8, 10.9).
// Every call resolves after a seeded 80–200 ms delay so loading states are exercised.
import type { AlarmEvent, ChannelId, Status, WearRecord } from '../../domain/types'
import type { HistoryRepository } from '../ports'
import { MOCK_ALARMS, generateTrace } from './fixtures/alarms'
import { FIXTURE_SEED, HISTORY_DAYS, MOCK_DAILY_PEAKS, type DailyPeak } from './fixtures/history'
import { MOCK_WEAR } from './fixtures/wear'
import { mulberry32, type Rng } from './rng'

/** Simulated latency bounds, ms. */
export const MOCK_LATENCY_MIN_MS = 80
export const MOCK_LATENCY_MAX_MS = 200

export interface MockHistoryOptions {
  /** Seed for the latency sequence and traces. Defaults to `FIXTURE_SEED`. */
  readonly seed?: number
  /** Fixture overrides, e.g. for stress cases. Default to the module-load fixtures. */
  readonly alarms?: readonly AlarmEvent[]
  readonly dailyPeaks?: readonly DailyPeak[]
  readonly wear?: readonly WearRecord[]
  /** Clock for `acknowledged_at`. Defaults to `Date.now`. */
  readonly now?: () => number
}

function cloneWear(w: WearRecord): WearRecord {
  return { ...w, projection: w.projection.map((p) => ({ ...p })) }
}

export class MockHistoryRepository implements HistoryRepository {
  private readonly rng: Rng
  private readonly seed: number
  private readonly now: () => number
  private events: AlarmEvent[]
  private readonly peaks: readonly DailyPeak[]
  private readonly wearRecords: readonly WearRecord[]

  constructor(options: MockHistoryOptions = {}) {
    this.seed = options.seed ?? FIXTURE_SEED
    this.rng = mulberry32(this.seed ^ 0x5eed_0001)
    this.now = options.now ?? Date.now
    this.events = (options.alarms ?? MOCK_ALARMS).map((e) => ({ ...e }))
    this.peaks = options.dailyPeaks ?? MOCK_DAILY_PEAKS
    this.wearRecords = options.wear ?? MOCK_WEAR
  }

  /** Draws the next simulated latency, ms, in [80, 200]. */
  nextLatencyMs(): number {
    return MOCK_LATENCY_MIN_MS + Math.round(this.rng() * (MOCK_LATENCY_MAX_MS - MOCK_LATENCY_MIN_MS))
  }

  /** Runs `fn` after the simulated latency; a thrown error becomes a rejection. */
  private respond<T>(fn: () => T): Promise<T> {
    const delay = this.nextLatencyMs()
    return new Promise<T>((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(fn())
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      }, delay)
    })
  }

  /**
   * Events raised within [from, to], newest first. When `channels` is given,
   * drive-level events (channel 'drive') are excluded. Empty filter arrays
   * match nothing.
   */
  alarms(q: { from: Date; to: Date; channels?: ChannelId[]; severities?: Status[] }): Promise<AlarmEvent[]> {
    const fromMs = q.from.getTime()
    const toMs = q.to.getTime()
    const channels = q.channels ? new Set<AlarmEvent['channel']>(q.channels) : null
    const severities = q.severities ? new Set<Status>(q.severities) : null
    return this.respond(() =>
      this.events
        .filter((e) => {
          const t = Date.parse(e.raised_at)
          if (!(t >= fromMs && t <= toMs)) return false
          if (channels && !channels.has(e.channel)) return false
          if (severities && !severities.has(e.severity)) return false
          return true
        })
        .sort((a, b) => Date.parse(b.raised_at) - Date.parse(a.raised_at))
        .map((e) => ({ ...e })),
    )
  }

  /** Tj trace ±60 s around the event at 10 Hz. Rejects for an unknown id. */
  trace(eventId: string): Promise<{ t: Float64Array; tj: Float32Array }> {
    return this.respond(() => generateTrace(this.find(eventId), this.seed))
  }

  /** The last `days` days (clamped to 1–30) of peaks per channel, day ascending. */
  dailyPeaks(days: number): Promise<{ channel: ChannelId; day: string; peak_tj: number }[]> {
    const n = Number.isFinite(days) ? Math.min(HISTORY_DAYS, Math.max(1, Math.floor(days))) : HISTORY_DAYS
    return this.respond(() => {
      const allDays = [...new Set(this.peaks.map((p) => p.day))].sort()
      const keep = new Set(allDays.slice(-n))
      return this.peaks.filter((p) => keep.has(p.day)).map((p) => ({ ...p }))
    })
  }

  wear(): Promise<WearRecord[]> {
    return this.respond(() => this.wearRecords.map(cloneWear))
  }

  /** Records `user` and the current time on the event. Rejects for an unknown id. */
  acknowledge(eventId: string, user: string): Promise<AlarmEvent> {
    return this.respond(() => {
      const prev = this.find(eventId)
      const next: AlarmEvent = { ...prev, acknowledged_by: user, acknowledged_at: new Date(this.now()).toISOString() }
      this.events = this.events.map((e) => (e.id === eventId ? next : e))
      return { ...next }
    })
  }

  private find(eventId: string): AlarmEvent {
    const event = this.events.find((e) => e.id === eventId)
    if (!event) throw new Error(`Unknown alarm event: ${eventId}`)
    return event
  }
}
