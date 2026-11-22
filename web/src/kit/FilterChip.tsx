import type { Ref } from 'react'
import { CONTROL_CAPS, CONTROL_DISABLED, cx } from './controlStyles'

export interface FilterChipProps {
  /** Tracked-caps label. Wraps onto a second line, never truncates (Requirement 6.8). */
  label: string
  /** Optional item count, shown in a recessed counter. */
  count?: number | undefined
  selected: boolean
  onToggle: () => void
  disabled?: boolean
  ref?: Ref<HTMLButtonElement>
  className?: string
}

const BASE = [
  'inline-flex min-w-0 max-w-full items-center gap-2 rounded-1 border px-3 py-2 text-start font-sans',
  'min-h-[var(--control-min-height)]',
  'transition-[background-color,border-color,color,scale] duration-1 ease-out',
].join(' ')

const TONE = {
  idle: [
    '[background-color:var(--filter-chip-bg)] [border-color:var(--filter-chip-border)]',
    'text-[color:var(--filter-chip-fg)]',
    'enabled:hover:[background-color:var(--filter-chip-bg-hover)]',
  ].join(' '),
  selected: [
    '[background-color:var(--filter-chip-bg-selected)] [border-color:var(--filter-chip-border-selected)]',
    'text-[color:var(--filter-chip-fg-selected)]',
  ].join(' '),
} as const

/* Wraps on spaces, breaking inside a word only as a last resort. No
   `text-wrap: balance`: with break-word, Chromium splits single words
   ("WAR / NING") even when the chip has room. */
const LABEL = cx(CONTROL_CAPS, 'min-w-0 [overflow-wrap:break-word]')

/**
 * Toggleable filter exposed as a button with `aria-pressed`. A small square
 * mark fills gold when selected, so the state also reads by shape, not only
 * the border colour.
 */
export function FilterChip({
  label,
  count,
  selected,
  onToggle,
  disabled = false,
  ref,
  className,
}: FilterChipProps) {
  const tone = selected ? 'selected' : 'idle'
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      data-state={tone}
      onClick={onToggle}
      className={cx(
        BASE,
        TONE[tone],
        disabled ? CONTROL_DISABLED : 'cursor-pointer active:scale-[var(--filter-chip-press-scale)]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'size-2 shrink-0 rounded-[1px] border',
          selected
            ? '[background-color:var(--filter-chip-mark-selected)] [border-color:var(--filter-chip-mark-selected)]'
            : '[border-color:currentColor]',
        )}
      />
      <span className={LABEL}>{label}</span>
      {/* Whitespace between flex items is not rendered, but keeps "LABEL 4" apart in the accessible name. */}
      {count === undefined ? null : ' '}
      {count === undefined ? null : (
        <span className="num shrink-0 rounded-1 px-1.5 py-0.5 text-11 leading-none [background-color:var(--filter-chip-count-bg)] text-[color:var(--filter-chip-count-fg)]">
          {count}
        </span>
      )}
    </button>
  )
}
