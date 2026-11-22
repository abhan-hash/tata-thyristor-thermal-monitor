import type { Status } from '../domain/types'
import { StatusIcon } from './icons/StatusIcon'

/** Visible text per Status. Always rendered: status is never colour-only (Requirement 5.1). */
export const STATUS_LABEL: Readonly<Record<Status, string>> = {
  normal: 'NORMAL',
  warning: 'WARNING',
  critical: 'CRITICAL',
  fault: 'SENSOR FAULT',
}

export type StatusChipSize = 'sm' | 'md'

export interface StatusChipProps {
  status: Status
  /** `sm` for dense rows (rack list, tables), `md` for readouts. Default `md`. */
  size?: StatusChipSize
  className?: string
}

const SIZE: Readonly<Record<StatusChipSize, { box: string; icon: number }>> = {
  sm: { box: 'h-5 gap-1.5 pl-1.5 pr-2 text-11', icon: 12 },
  md: { box: 'h-6 gap-2 pl-2 pr-2.5 text-12', icon: 14 },
}

/*
 * Tone per Status. Warning and critical take a faint wash of their own colour
 * with a stronger hairline; normal stays quiet on the raised surface so the
 * eye goes to the chips that matter; fault drops hue entirely and sits on
 * the striped hatch.
 */
const TONE: Readonly<Record<Status, string>> = {
  normal: 'bg-surface-raised border-line-strong text-status-normal',
  warning: 'bg-status-warning/10 border-status-warning/45 text-status-warning',
  critical: 'bg-status-critical/15 border-status-critical/60 text-status-critical-text',
  fault: '[background-image:var(--status-chip-fault-bg)] border-line-strong text-status-fault',
}

const BASE = [
  'inline-flex shrink-0 select-none items-center whitespace-nowrap',
  'rounded-1 border leading-none uppercase',
  '[font-weight:var(--status-chip-weight)] [font-stretch:var(--status-chip-width)]',
  'tracking-[var(--status-chip-tracking)]',
  'shadow-[inset_0_1px_0_var(--status-chip-highlight)]',
].join(' ')

/**
 * Status as icon + text. The icon is decorative (`aria-hidden`); the visible
 * label is the accessible name, so screen readers and greyscale displays get
 * the same information as colour.
 */
export function StatusChip({ status, size = 'md', className }: StatusChipProps) {
  const { box, icon } = SIZE[size]
  const classes = [BASE, box, TONE[status], className].filter(Boolean).join(' ')
  return (
    <span className={classes} data-status={status}>
      <StatusIcon status={status} size={icon} className="shrink-0" />
      {/* Negative end margin cancels the trailing letter-spacing so the label centres optically. */}
      <span className="-me-[var(--status-chip-tracking)]">{STATUS_LABEL[status]}</span>
    </span>
  )
}
