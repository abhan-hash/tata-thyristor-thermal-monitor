import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { SourceButton } from './SourceButton'

export interface SourceItem<T extends string> {
  value: T
  label: string
  icon: ReactNode
  disabled?: boolean
}

/** 2 columns gives the reference 2 × 3 layout for six items; 3 gives 3 × 2. */
export type SourceGridColumns = 2 | 3

export interface SourceGridProps<T extends string> {
  items: readonly SourceItem<T>[]
  /** Checked value, or `null` when nothing is selected yet. */
  value: T | null
  onChange: (value: T) => void
  /** Accessible name of the radiogroup, e.g. "Drive scenario". */
  label: string
  columns?: SourceGridColumns
  /** Disables every option. */
  disabled?: boolean
  className?: string
}

const COLUMNS: Readonly<Record<SourceGridColumns, string>> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
}

/** Keys that move the selection, and the direction they move it in. */
export const ARROW_STEP: Readonly<Record<string, 1 | -1>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
}

/**
 * Index of the next enabled item from `from` in `step` direction, wrapping
 * around the ends. Returns `from` when no other item is enabled.
 */
export function nextEnabledIndex(enabled: readonly boolean[], from: number, step: 1 | -1): number {
  const n = enabled.length
  for (let k = 1; k <= n; k++) {
    const i = (((from + k * step) % n) + n) % n
    if (enabled[i]) return i
  }
  return from
}

/** The one tab stop: the checked item if it is enabled, else the first enabled item, else -1. */
export function tabStopIndex(enabled: readonly boolean[], checked: number): number {
  if (checked >= 0 && enabled[checked]) return checked
  return enabled.indexOf(true)
}

/**
 * Grid of gold icon tiles that behaves as a single radio group
 * (Requirements 6.3, 38.2): one tab stop, arrow keys move focus and select
 * (wrapping and skipping disabled options), Home/End jump to the ends, and
 * Tab leaves the group.
 */
export function SourceGrid<T extends string>({
  items,
  value,
  onChange,
  label,
  columns = 2,
  disabled = false,
  className,
}: SourceGridProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const enabled = items.map((item) => !disabled && item.disabled !== true)
  const checked = items.findIndex((item) => item.value === value)
  const tabStop = tabStopIndex(enabled, checked)

  function select(index: number) {
    const item = items[index]
    if (!item) return
    refs.current[index]?.focus()
    if (item.value !== value) onChange(item.value)
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    const step = ARROW_STEP[event.key]
    let target: number | undefined
    if (step !== undefined) target = nextEnabledIndex(enabled, index, step)
    else if (event.key === 'Home') target = nextEnabledIndex(enabled, -1, 1)
    else if (event.key === 'End') target = nextEnabledIndex(enabled, items.length, -1)
    if (target === undefined) return
    event.preventDefault()
    if (enabled[target]) select(target)
  }

  const classes = ['grid gap-2', COLUMNS[columns], className].filter(Boolean).join(' ')

  return (
    <div
      role="radiogroup"
      aria-label={label}
      {...(disabled ? { 'aria-disabled': true as const } : {})}
      className={classes}
    >
      {items.map((item, index) => (
        <SourceButton
          key={item.value}
          ref={(el) => {
            refs.current[index] = el
          }}
          label={item.label}
          icon={item.icon}
          checked={index === checked}
          disabled={!enabled[index]}
          tabIndex={index === tabStop ? 0 : -1}
          onSelect={() => {
            select(index)
          }}
          onKeyDown={(event) => {
            handleKeyDown(index, event)
          }}
        />
      ))}
    </div>
  )
}
