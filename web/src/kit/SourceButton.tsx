import type { KeyboardEventHandler, ReactNode, Ref } from 'react'

export type SourceButtonState = 'idle' | 'checked'

export interface SourceButtonProps {
  /** Tracked-caps label under the icon, e.g. "BAR ENTRY". Wraps, never truncates. */
  label: string
  /** Decorative icon (an `aria-hidden` SVG drawn in `currentColor`). */
  icon: ReactNode
  checked: boolean
  disabled?: boolean
  /** Roving tabindex, managed by `SourceGrid`: 0 for the one tab stop, -1 for the rest. */
  tabIndex?: 0 | -1
  onSelect?: () => void
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>
  ref?: Ref<HTMLButtonElement>
  className?: string
}

const BASE = [
  'flex w-full flex-col items-center justify-center gap-2 px-2 py-3 text-center font-sans',
  'min-h-[var(--source-btn-min-height)] rounded-[var(--source-btn-radius)] border',
  'transition-[background-color,color,scale] duration-1 ease-out',
].join(' ')

/*
 * Outlined gold tile at rest, solid gold when checked (the reference
 * DRUMS tile). Press feedback is a small scale so the tile feels physical.
 */
const STATE: Readonly<Record<SourceButtonState, string>> = {
  idle: [
    '[border-color:var(--source-btn-border)] [background-color:var(--source-btn-bg)]',
    '[color:var(--source-btn-fg)]',
    'enabled:hover:[background-color:var(--source-btn-bg-hover)]',
  ].join(' '),
  checked: [
    '[border-color:var(--source-btn-border-active)] [background-color:var(--source-btn-bg-active)]',
    '[color:var(--source-btn-fg-active)]',
  ].join(' '),
}

const ENABLED = 'cursor-pointer active:scale-[var(--source-btn-press-scale)]'
const DISABLED = 'cursor-not-allowed opacity-40'

const LABEL = [
  'uppercase leading-tight',
  'text-[length:var(--source-btn-label-size)]',
  '[font-weight:var(--source-btn-label-weight)] [font-stretch:var(--source-btn-label-width)]',
  'tracking-[var(--source-btn-label-tracking)]',
  // Wrap on spaces first; break inside a word only if it cannot fit at all.
  // No `text-wrap: balance` here: combined with break-word it splits single
  // words ("NORMA / L") in Chromium even when the tile has room.
  '[overflow-wrap:break-word]',
].join(' ')

/**
 * One option of a `SourceGrid`: an icon tile exposed as `role="radio"`.
 * Use it through `SourceGrid`, which owns selection and keyboard behaviour.
 */
export function SourceButton({
  label,
  icon,
  checked,
  disabled = false,
  tabIndex = -1,
  onSelect,
  onKeyDown,
  ref,
  className,
}: SourceButtonProps) {
  const state: SourceButtonState = checked ? 'checked' : 'idle'
  const classes = [BASE, STATE[state], disabled ? DISABLED : ENABLED, className]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      tabIndex={tabIndex}
      data-state={state}
      className={classes}
      {...(onSelect ? { onClick: onSelect } : {})}
      {...(onKeyDown ? { onKeyDown } : {})}
    >
      <span className="flex size-[var(--source-btn-icon-size)] shrink-0 items-center justify-center [&>svg]:size-full">
        {icon}
      </span>
      {/*
        Start padding equal to the tracking balances the trailing letter-spacing
        so the label centres optically. A negative end margin would shrink the
        shrink-to-fit box below the text width and force break-word to split
        the last letter onto its own line.
      */}
      <span className={`${LABEL} ps-[var(--source-btn-label-tracking)]`}>{label}</span>
    </button>
  )
}
