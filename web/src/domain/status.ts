import type { Band, Status } from './types'

/** The part of a Band the classifier needs. Any `Band` satisfies it. */
export type StatusBand = Pick<Band, 'warning' | 'critical'>

const SEVERITY_RANK: Readonly<Record<Status, number>> = Object.freeze({
  normal: 0,
  warning: 1,
  critical: 2,
  fault: 3,
})

/**
 * Status_Classifier. Maps a value to a Status for one band:
 * normal below `warning`, warning in [warning, critical), critical at or above `critical`.
 * NaN has no meaningful reading and returns `fault`. ±∞ follow the comparisons
 * (−∞ → normal, +∞ → critical).
 */
export function statusFor(value: number, band: StatusBand): Status {
  if (Number.isNaN(value)) return 'fault'
  if (value >= band.critical) return 'critical'
  if (value >= band.warning) return 'warning'
  return 'normal'
}

/** Severity_Rank: normal (0) < warning (1) < critical (2) < fault (3). */
export function severityRank(status: Status): number {
  return SEVERITY_RANK[status]
}

/** The Status with the highest Severity_Rank. An empty list is `normal`. */
export function maxSeverity(statuses: Iterable<Status>): Status {
  let worst: Status = 'normal'
  for (const s of statuses) {
    if (SEVERITY_RANK[s] > SEVERITY_RANK[worst]) worst = s
  }
  return worst
}
