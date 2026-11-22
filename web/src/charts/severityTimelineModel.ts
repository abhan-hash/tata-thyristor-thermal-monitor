/**
 * Pure layout model for the `SeverityTimeline` (Requirements 26.3, 26.4, 26.10).
 *
 * The timeline shows a fixed window (24 h by default) with one lane per
 * channel plus a drive lane. Below `BIN_THRESHOLD` events each event is drawn
 * as its own mark; at or above it events are counted into time buckets per
 * lane, and each bucket shows its worst severity and its count.
 */
import {
  ALARM_CHANNELS,
  channelToken,
  type AlarmChannel,
  type AlarmSeverity,
} from '../domain/alarmFilters'
import { severityRank } from '../domain/status'
import type { AlarmEvent } from '../domain/types'

export const TIMELINE_WINDOW_MS = 24 * 60 * 60 * 1000
/** At this many events (or more) the timeline bins instead of drawing one mark per event. */
export const BIN_THRESHOLD = 200

/** Candidate bucket sizes, smallest first. */
export const BIN_SIZES_MS: readonly number[] = [5, 10, 15, 30, 60, 120, 240].map((m) => m * 60_000)

export interface TimelineMark {
  event: AlarmEvent
  /** `raised_at` in ms. */
  t: number
}

export interface TimelineBin {
  lane: AlarmChannel
  /** Inclusive start, exclusive end (the last bin also includes the window end). */
  start: number
  end: number
  count: number
  /** Worst severity among the bin's events. */
  severity: AlarmSeverity
  bySeverity: Readonly<Record<AlarmSeverity, number>>
}

export interface TimelineWindow {
  start: number
  end: number
}

/** `[end − duration, end]` in ms. */
export function timelineWindow(end: Date | number, durationMs = TIMELINE_WINDOW_MS): TimelineWindow {
  const endMs = typeof end === 'number' ? end : end.getTime()
  return { start: endMs - durationMs, end: endMs }
}

/** Lane label: `T1`..`T6`, `DRIVE`. */
export function laneLabel(lane: AlarmChannel): string {
  return channelToken(lane).toUpperCase()
}

/** Lanes in canonical order, restricted to `channels` when that list is non-empty. */
export function timelineLanes(channels?: readonly AlarmChannel[]): AlarmChannel[] {
  if (!channels || channels.length === 0) return [...ALARM_CHANNELS]
  const set = new Set(channels)
  return ALARM_CHANNELS.filter((c) => set.has(c))
}

/** Whether `events` should be binned (Requirement 26.10). */
export function shouldBin(eventCount: number, threshold = BIN_THRESHOLD): boolean {
  return eventCount >= threshold
}

/** Events inside the window with a parseable `raised_at`, oldest first. */
export function timelineMarks(events: readonly AlarmEvent[], win: TimelineWindow): TimelineMark[] {
  const out: TimelineMark[] = []
  for (const event of events) {
    const t = Date.parse(event.raised_at)
    if (Number.isFinite(t) && t >= win.start && t <= win.end) out.push({ event, t })
  }
  return out.sort((a, b) => a.t - b.t)
}

/**
 * Smallest bucket size from `BIN_SIZES_MS` whose on-screen width is at least
 * `minBinPx`, so a bucket always has room for its icon and count.
 */
export function chooseBinSize(win: TimelineWindow, innerWidth: number, minBinPx = 28): number {
  const span = win.end - win.start
  const fallback = BIN_SIZES_MS[BIN_SIZES_MS.length - 1] ?? span
  if (span <= 0 || innerWidth <= 0) return fallback
  for (const size of BIN_SIZES_MS) {
    if ((size / span) * innerWidth >= minBinPx) return size
  }
  return fallback
}

/**
 * Non-empty buckets per lane. Each mark lands in exactly one bucket, so the
 * counts sum to the number of in-window events on the listed lanes.
 */
export function binEvents(
  marks: readonly TimelineMark[],
  win: TimelineWindow,
  binSizeMs: number,
  lanes: readonly AlarmChannel[] = ALARM_CHANNELS,
): TimelineBin[] {
  const span = win.end - win.start
  if (span <= 0 || binSizeMs <= 0) return []
  const binCount = Math.max(1, Math.ceil(span / binSizeMs))
  const laneSet = new Set(lanes)
  const bins = new Map<string, TimelineBin & { bySeverity: Record<AlarmSeverity, number> }>()
  for (const { event, t } of marks) {
    if (!laneSet.has(event.channel)) continue
    const index = Math.min(binCount - 1, Math.floor((t - win.start) / binSizeMs))
    const key = `${String(event.channel)}:${index}`
    let bin = bins.get(key)
    if (!bin) {
      const start = win.start + index * binSizeMs
      bin = {
        lane: event.channel,
        start,
        end: Math.min(win.end, start + binSizeMs),
        count: 0,
        severity: event.severity,
        bySeverity: { warning: 0, critical: 0, fault: 0 },
      }
      bins.set(key, bin)
    }
    bin.count += 1
    bin.bySeverity[event.severity] += 1
    if (severityRank(event.severity) > severityRank(bin.severity)) bin.severity = event.severity
  }
  const laneOrder = new Map(lanes.map((lane, i) => [lane, i]))
  return [...bins.values()].sort(
    (a, b) => (laneOrder.get(a.lane) ?? 0) - (laneOrder.get(b.lane) ?? 0) || a.start - b.start,
  )
}

/** Brush range from two pixel positions, clamped to the window and ordered. */
export function brushRange(
  aMs: number,
  bMs: number,
  win: TimelineWindow,
): { from: number; to: number } {
  const clamp = (v: number) => Math.min(win.end, Math.max(win.start, v))
  const a = clamp(aMs)
  const b = clamp(bMs)
  return a <= b ? { from: a, to: b } : { from: b, to: a }
}
