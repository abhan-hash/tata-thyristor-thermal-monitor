import type { AlarmEvent, Status } from './types'

/** Repeats of the same channel and kind closer than this merge into one row (Requirement 33.9). */
export const COALESCE_WINDOW_MS = 5000

/** An alarm row: the first event of a run of repeats, with the run's peak, latest clear and count. */
export type CoalescedAlarm = AlarmEvent & {
  /** Events merged into this row, 1 for a single alarm. */
  readonly repeats: number
}

const SEVERITY_RANK: Readonly<Record<Exclude<Status, 'normal'>, number>> = { warning: 0, critical: 1, fault: 2 }

const timeOf = (iso: string | undefined): number => (iso === undefined ? Number.NaN : Date.parse(iso))

/**
 * Merges repeats of the same channel + kind into one row. An event is a
 * repeat when it is raised at most 5 s after the previous event of the run
 * ended (its clear time, or its raise time while still active). The row keeps
 * the first event's id and raise time, so it is one row with one arrival; it
 * takes the highest severity and peak and the last event's clear state.
 *
 * Pure. Input order does not matter; events with the same id keep the last
 * copy (a raised event later updated by its clear). Output is oldest first.
 */
export function coalesceAlarms(events: readonly AlarmEvent[]): CoalescedAlarm[] {
  const latest = new Map<string, AlarmEvent>()
  for (const e of events) latest.set(e.id, e)
  const sorted = [...latest.values()].sort((a, b) => (timeOf(a.raised_at) || 0) - (timeOf(b.raised_at) || 0))
  const out: CoalescedAlarm[] = []
  const open = new Map<string, number>()
  for (const e of sorted) {
    const key = `${String(e.channel)}|${e.kind}`
    const at = open.get(key)
    const row = at === undefined ? undefined : out[at]
    if (row !== undefined) {
      const ended = timeOf(row.cleared_at ?? row.raised_at)
      const gap = timeOf(e.raised_at) - ended
      if (gap >= 0 && gap <= COALESCE_WINDOW_MS) {
        const merged: AlarmEvent & { repeats: number } = {
          ...row,
          severity: SEVERITY_RANK[e.severity] > SEVERITY_RANK[row.severity] ? e.severity : row.severity,
          peak_value: Math.max(row.peak_value, e.peak_value),
          repeats: row.repeats + 1,
        }
        if (e.cleared_at === undefined) delete merged.cleared_at
        else merged.cleared_at = e.cleared_at
        out[at as number] = merged
        continue
      }
    }
    open.set(key, out.length)
    out.push({ ...e, repeats: 1 })
  }
  return out
}
