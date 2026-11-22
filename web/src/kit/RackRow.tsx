import type { ReactNode } from 'react'
import { Link, type To } from 'react-router'
import { PLACEHOLDER } from '../domain/format'
import type { Status } from '../domain/types'
import { StatusChip } from './StatusChip'
import { ChevronIcon } from './icons/ChevronIcon'

interface RackRowBaseProps {
  /** Tracked-caps row label, e.g. "THY A+". Never truncated: wraps instead. */
  label: string
  /** Inline value slot (Tj readout, delta bar, …) placed before the status chip. */
  meta?: ReactNode
  /**
   * When set, a small `StatusChip` (icon + text) is rendered after `meta`.
   * `fault` (sensor fault) also lays the fault hatch over the row and shows
   * the "— —" placeholder in place of `meta` (Requirement 21.1).
   */
  status?: Status
  /** Active row, styled like the reference VOCALS row. Exposed as `aria-current`. */
  selected?: boolean
  disabled?: boolean
  /** Called on activation (click, Enter or Space). For links, runs before navigation. */
  onSelect?: () => void
  className?: string
}

export interface RackRowButtonProps extends RackRowBaseProps {
  as?: 'button'
  to?: never
}

export interface RackRowLinkProps extends RackRowBaseProps {
  /** Render as a router link to `to` instead of a button (Requirement 6.4). */
  as: 'link'
  to: To
}

export type RackRowProps = RackRowButtonProps | RackRowLinkProps

export type RackRowState = 'idle' | 'selected' | 'disabled'

const BASE = [
  'group relative flex w-full items-center gap-3 text-start font-sans',
  'min-h-[var(--rack-row-height)] px-[var(--rack-row-pad-x)] py-2',
  'border-b [border-color:var(--rack-row-border)]',
  'transition-[background-color,scale] duration-1 ease-out',
  // Lift the focused row so its ring is not painted over by the next row.
  'focus-visible:z-10',
  // Gold edge on the inline-start side; only visible when selected.
  'before:pointer-events-none before:absolute before:inset-y-0 before:start-0',
  'before:w-[var(--rack-row-indicator-width)] before:[background-color:var(--rack-row-indicator)]',
  'before:opacity-0 before:transition-opacity before:duration-1 before:ease-out',
].join(' ')

const INTERACTIVE = [
  'cursor-pointer',
  'hover:[background-color:var(--rack-row-bg-hover)]',
  'active:[background-color:var(--rack-row-bg-pressed)]',
].join(' ')

const STATE: Readonly<Record<RackRowState, { row: string; label: string; chevron: string }>> = {
  idle: {
    row: `${INTERACTIVE} [background-color:var(--rack-row-bg)]`,
    label: '[color:var(--rack-row-label-color)] group-hover:[color:var(--rack-row-label-color-active)]',
    chevron: '[color:var(--rack-row-chevron-color)] group-hover:translate-x-0.5',
  },
  selected: {
    row: `${INTERACTIVE} [background-color:var(--rack-row-bg-active)] before:opacity-100`,
    label: '[color:var(--rack-row-label-color-active)]',
    chevron: '[color:var(--rack-row-chevron-color-active)]',
  },
  disabled: {
    row: 'cursor-not-allowed opacity-40 [background-color:var(--rack-row-bg)]',
    label: '[color:var(--rack-row-label-color)]',
    chevron: '[color:var(--rack-row-chevron-color)]',
  },
}

const TEXTURE = '[background-image:var(--rack-row-texture)] [background-size:var(--rack-row-texture-size)]'
/** Fault hatch over the row's dot grain; hue-free so it never reads as a heat colour. */
const FAULT_TEXTURE = [
  '[background-image:var(--rack-row-fault-texture),var(--rack-row-texture)]',
  '[background-size:var(--rack-row-fault-texture-size),var(--rack-row-texture-size)]',
].join(' ')

const LABEL = [
  'min-w-0 flex-[1_1_9rem] uppercase leading-tight',
  'text-[length:var(--rack-row-label-size)]',
  '[font-weight:var(--rack-row-label-weight)] [font-stretch:var(--rack-row-label-width)]',
  'tracking-[var(--rack-row-label-tracking)]',
  // Ellipsis-free: long labels wrap on spaces, and only break inside a word as a last resort.
  '[overflow-wrap:break-word] [text-wrap:balance]',
  'transition-colors duration-1 ease-out',
].join(' ')

export function rackRowState(selected: boolean, disabled: boolean): RackRowState {
  if (disabled) return 'disabled'
  return selected ? 'selected' : 'idle'
}

/**
 * One row of the rack list: label, optional inline value, optional status
 * chip and a chevron. Renders a native `<button>` by default or a router
 * link with `as="link"`, so it is keyboard operable without extra wiring.
 * At narrow widths the value and chip wrap under the label instead of
 * squeezing it.
 */
export function RackRow(props: RackRowProps) {
  const { label, meta, status, selected = false, disabled = false, onSelect, className } = props
  const state = rackRowState(selected, disabled)
  const styles = STATE[state]
  const fault = status === 'fault'
  const classes = [BASE, styles.row, fault ? FAULT_TEXTURE : TEXTURE, className].filter(Boolean).join(' ')
  // A faulted sensor has no trustworthy value: the placeholder replaces whatever `meta` holds.
  const shownMeta = fault ? PLACEHOLDER : meta
  const hasTrailing = shownMeta !== undefined || status !== undefined

  const content = (
    <>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className={`${LABEL} ${styles.label}`}>
          {/* Negative end margin cancels the trailing letter-spacing. */}
          <span className="-me-[var(--rack-row-label-tracking)]">{label}</span>
        </span>
        {hasTrailing && (
          <span className="ms-auto flex shrink-0 items-center gap-3">
            {shownMeta !== undefined && (
              <span
                className="num whitespace-nowrap text-12 [color:var(--rack-row-meta-color)]"
                {...(fault ? { 'data-part': 'placeholder' } : {})}
              >
                {shownMeta}
              </span>
            )}
            {status !== undefined && <StatusChip status={status} size="sm" />}
          </span>
        )}
      </span>
      <ChevronIcon
        className={`shrink-0 transition-[transform,color] duration-1 ease-out ${styles.chevron}`}
      />
    </>
  )

  const common = {
    className: classes,
    'data-state': state,
    ...(fault ? { 'data-fault': 'true' } : {}),
    ...(selected ? { 'aria-current': true as const } : {}),
  }

  if (props.as === 'link') {
    if (disabled) {
      // A link cannot be natively disabled: drop the href so it is not focusable or followable.
      return (
        <a {...common} role="link" aria-disabled="true">
          {content}
        </a>
      )
    }
    return (
      <Link {...common} to={props.to} {...(onSelect ? { onClick: onSelect } : {})}>
        {content}
      </Link>
    )
  }

  return (
    <button
      {...common}
      type="button"
      disabled={disabled}
      {...(onSelect ? { onClick: onSelect } : {})}
    >
      {content}
    </button>
  )
}
