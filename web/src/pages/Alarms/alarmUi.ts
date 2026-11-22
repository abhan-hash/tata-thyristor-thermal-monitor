/**
 * Pure helpers for the Alarms page: labels, merging live and recorded events,
 * acknowledgement lookup and the live-alarm announcement text.
 */
import type { AlarmEvent } from '../../domain/types'
import { laneLabel } from '../../charts/severityTimelineModel'
import { STATUS_LABEL } from '../../kit/StatusChip'
import type { Acknowledgement } from '../../state/uiStore'

export const KIND_LABEL: Readonly<Record<AlarmEvent['kind'], string>> = {
  junction_temp: 'Junction temp',
  heatsink_temp: 'Heatsink temp',
  cooling_residual: 'Cooling residual',
  rms_current: 'RMS current',
  residual_rate: 'Residual rate',
  sensor: 'Sensor',
}

/** Events per page at 200 or more: the list switches to the virtualiser (Requirement 26.10). */
export const VIRTUALIZE_THRESHOLD = 200

/** `HH:MM:SS` in UTC, matching the timeline axis. Invalid input gives `— —`. */
export function formatEventTime(iso: string | undefined): string {
  if (iso === undefined) return '\u2014 \u2014'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return '\u2014 \u2014'
  return new Date(ms).toISOString().slice(11, 19)
}

/** `2026-01-15 09:30:00 UTC`. */
export function formatEventDateTime(iso: string | undefined): string {
  if (iso === undefined) return '\u2014 \u2014'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return '\u2014 \u2014'
  const s = new Date(ms).toISOString()
  return `${s.slice(0, 10)} ${s.slice(11, 19)} UTC`
}

/**
 * Live session events (oldest first, a raise and its clear share an id) merged
 * on top of recorded history. Each id appears once, with its latest version.
 * Live events come first, newest first; history follows, newest first.
 */
export function mergeEvents(
  live: readonly AlarmEvent[],
  history: readonly AlarmEvent[],
): AlarmEvent[] {
  const latestLive = new Map<string, AlarmEvent>()
  for (const e of live) latestLive.set(e.id, e)
  const liveList = [...latestLive.values()].sort(byRaisedDesc)
  const historyList = history.filter((e) => !latestLive.has(e.id)).sort(byRaisedDesc)
  return [...liveList, ...historyList]
}

function byRaisedDesc(a: AlarmEvent, b: AlarmEvent): number {
  return (Date.parse(b.raised_at) || 0) - (Date.parse(a.raised_at) || 0)
}

/** The acknowledgement for an event: the recorded one, else the session one. */
export function ackOf(
  event: AlarmEvent,
  acks: Readonly<Record<string, Acknowledgement>>,
): Acknowledgement | undefined {
  if (event.acknowledged_by !== undefined) {
    return { by: event.acknowledged_by, at: event.acknowledged_at ?? '' }
  }
  return acks[event.id]
}

/** Raised and not yet cleared. */
export function isActive(event: AlarmEvent): boolean {
  return event.cleared_at === undefined
}

/** One-line description used for row summaries and announcements. */
export function describeEvent(event: AlarmEvent): string {
  return `${laneLabel(event.channel)} ${STATUS_LABEL[event.severity]} · ${KIND_LABEL[event.kind]}`
}

/** Text for the polite live region when a new alarm is raised (Requirement 26.9). */
export function announcement(event: AlarmEvent): string {
  return `New alarm: ${describeEvent(event)}, raised ${formatEventTime(event.raised_at)}`
}
