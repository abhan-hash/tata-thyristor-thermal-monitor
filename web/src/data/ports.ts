// Data-source ports (Requirements 8.1, 8.2). Components read live telemetry
// only through TelemetrySource and historical data only through
// HistoryRepository, so a backend adapter can replace the mock without
// touching any component.
import type {
  AlarmEvent,
  ChannelId,
  ConnectionStatus,
  DriveFrame,
  Scenario,
  Status,
  WearRecord,
} from '../domain/types'

/** Push stream of live drive frames. */
export interface TelemetrySource {
  readonly kind: 'mock' | 'ws'
  start(): void
  stop(): void
  /** Registers a frame listener; returns an unsubscribe function. */
  subscribe(onFrame: (f: DriveFrame) => void): () => void
  /** Registers a connection-status listener; returns an unsubscribe function. */
  onStatus(cb: (s: ConnectionStatus) => void): () => void
  /** Demo control. Mock implements it; the WS adapter will POST to the backend or no-op. */
  setScenario?(s: Scenario, severity?: number): void
}

/** Request/response access to alarms, traces, daily peaks and wear. */
export interface HistoryRepository {
  alarms(q: { from: Date; to: Date; channels?: ChannelId[]; severities?: Status[] }): Promise<AlarmEvent[]>
  trace(eventId: string): Promise<{ t: Float64Array; tj: Float32Array }>
  dailyPeaks(days: number): Promise<{ channel: ChannelId; day: string; peak_tj: number }[]>
  wear(): Promise<WearRecord[]>
  acknowledge(eventId: string, user: string): Promise<AlarmEvent>
}
