import { StaleIcon } from './icons/StaleIcon'
import { cx } from './controlStyles'

export type StaleChipSize = 'sm' | 'md'

export interface StaleChipProps {
  /** Same sizes as `StatusChip`, so the two sit on one baseline. Default `sm`. */
  size?: StaleChipSize
  className?: string
}

/** Visible chip text (Requirement 12.4). */
export const STALE_LABEL = 'STALE'

const SIZE: Readonly<Record<StaleChipSize, { box: string; icon: number }>> = {
  sm: { box: 'h-5 gap-1.5 pl-1.5 pr-2 text-11', icon: 12 },
  md: { box: 'h-6 gap-2 pl-2 pr-2.5 text-12', icon: 14 },
}

/*
 * Shares the StatusChip silhouette and type so it reads as part of the same
 * family, but drops to the muted tone with a dashed edge: the value next to
 * it is old, not alarming.
 */
const BASE = [
  'inline-flex shrink-0 select-none items-center whitespace-nowrap',
  'rounded-1 border border-dashed leading-none uppercase',
  '[border-color:var(--stale-chip-border)] [background-color:var(--stale-chip-bg)] [color:var(--stale-chip-fg)]',
  '[font-weight:var(--status-chip-weight)] [font-stretch:var(--status-chip-width)]',
  'tracking-[var(--status-chip-tracking)]',
].join(' ')

/** Marks a readout whose value is from a frame older than 1 s (Requirement 12.4). */
export function StaleChip({ size = 'sm', className }: StaleChipProps) {
  const { box, icon } = SIZE[size]
  return (
    <span className={cx(BASE, box, className)} data-stale="true">
      <StaleIcon size={icon} className="shrink-0" />
      <span className="-me-[var(--status-chip-tracking)]">{STALE_LABEL}</span>
    </span>
  )
}
