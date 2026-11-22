import type { ReactNode } from 'react'
import { Link, type To } from 'react-router'
import { contourRingPath } from './contourPath'
import { cx } from './controlStyles'

export type EmptyStateKind = 'no-data' | 'disconnected' | 'no-alarms' | 'error'

interface ActionBase {
  /** Says what happens, e.g. "Retry", "Reload panel", "Go to overview". */
  label: string
  disabled?: boolean
}
export interface EmptyStateButtonAction extends ActionBase {
  onAction: () => void
  to?: never
}
export interface EmptyStateLinkAction extends ActionBase {
  to: To
  onAction?: never
}
export type EmptyStateAction = EmptyStateButtonAction | EmptyStateLinkAction

export interface EmptyStateProps {
  kind: EmptyStateKind
  /** Overrides the default heading for the kind. */
  heading?: string
  /** Overrides the default one-line explanation for the kind. */
  message?: ReactNode
  action?: EmptyStateAction
  /** Heading level for the document outline. Default 2. */
  headingLevel?: 2 | 3 | 4
  className?: string
}

/** Default copy: what happened and what to expect next. */
export const EMPTY_STATE_COPY: Readonly<Record<EmptyStateKind, { heading: string; message: string }>> = {
  'no-data': {
    heading: 'No readings yet',
    message: 'Nothing has been recorded for this view. Values appear as soon as the drive sends a frame.',
  },
  disconnected: {
    heading: 'Data source disconnected',
    message: 'No frames are arriving. The monitor keeps retrying and resumes when the link returns.',
  },
  'no-alarms': {
    heading: 'No alarms',
    message: 'Every channel is below its warning limit.',
  },
  error: {
    heading: 'This panel stopped working',
    message: 'The rest of the monitor is still running. Reload the panel to try again.',
  },
}

/* ---------------------------------------------------------------------------
 * Contour illustrations: a small topographic map per kind, drawn on a
 * 120 × 120 grid with the same ring generator as the page texture.
 * ------------------------------------------------------------------------- */

type RingTone = 'line' | 'strong' | 'accent'
interface Ring {
  d: string
  tone: RingTone
  /** Dash pattern on a pathLength of 100. Offset 91 centres a 18-unit gap on 3 o'clock. */
  dash?: string
  offset?: number
}

function rings(
  count: number,
  opts: { cx: (i: number) => number; cy: (i: number) => number; r0: number; step: number; wobble: number },
): string[] {
  return Array.from({ length: count }, (_, i) =>
    contourRingPath({
      cx: opts.cx(i),
      cy: opts.cy(i),
      r: opts.r0 + i * opts.step,
      wobble: opts.wobble,
      phase: 0.9 + i * 0.35,
    }),
  )
}

function toneFor(i: number, count: number): RingTone {
  return i >= count - 2 ? 'line' : 'strong'
}

const ART: Readonly<Record<EmptyStateKind, { rings: readonly Ring[]; marks?: ReactNode }>> = {
  // A summit with no reading at its centre: the innermost ring is dotted.
  'no-data': {
    rings: rings(5, { cx: () => 60, cy: () => 60, r0: 12, step: 10, wobble: 0.12 }).map((d, i) => ({
      d,
      tone: i === 0 ? 'accent' : toneFor(i, 5),
      ...(i === 0 ? { dash: '2 4' } : {}),
    })),
  },
  // Every ring is cut on the same bearing: the line is broken.
  disconnected: {
    rings: rings(5, { cx: () => 60, cy: () => 60, r0: 12, step: 10, wobble: 0.12 }).map((d, i) => ({
      d,
      tone: i === 0 ? 'accent' : toneFor(i, 5),
      dash: '82 18',
      offset: 91,
    })),
  },
  // Wide, even spacing: flat, quiet ground with a marked summit.
  'no-alarms': {
    rings: rings(4, { cx: () => 60, cy: () => 60, r0: 14, step: 12, wobble: 0.06 }).map((d, i) => ({
      d,
      tone: toneFor(i, 4),
    })),
    marks: <circle cx="60" cy="60" r="3" className="[fill:var(--empty-art-accent)]" />,
  },
  // Rings bunch towards one side: a steep, local fault.
  error: {
    rings: rings(5, { cx: (i) => 74 - i * 3.5, cy: (i) => 52 + i * 2, r0: 8, step: 9.5, wobble: 0.2 }).map(
      (d, i) => ({ d, tone: i === 0 ? 'accent' : toneFor(i, 5) }),
    ),
    marks: <path d="M71 49l6 6M77 49l-6 6" className="[stroke:var(--empty-art-accent)]" strokeLinecap="round" />,
  },
}

const RING_TONE: Readonly<Record<RingTone, string>> = {
  line: '[stroke:var(--empty-art-stroke)]',
  strong: '[stroke:var(--empty-art-stroke-strong)]',
  accent: '[stroke:var(--empty-art-accent)]',
}

function ContourArt({ kind }: { kind: EmptyStateKind }) {
  const art = ART[kind]
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      data-art={kind}
      className="size-[var(--empty-art-size)] shrink-0 overflow-visible"
      fill="none"
      strokeWidth={1.25}
    >
      {art.rings.map((ring, i) => (
        <path
          key={i}
          d={ring.d}
          pathLength={100}
          vectorEffect="non-scaling-stroke"
          className={RING_TONE[ring.tone]}
          {...(ring.dash ? { strokeDasharray: ring.dash } : {})}
          {...(ring.offset !== undefined ? { strokeDashoffset: ring.offset } : {})}
          strokeLinecap="round"
        />
      ))}
      {art.marks}
    </svg>
  )
}

const ACTION = [
  'inline-flex min-h-[var(--control-min-height)] items-center justify-center rounded-1 border px-5',
  '[border-color:var(--empty-action-border)] [color:var(--empty-action-fg)]',
  'text-12 uppercase [font-weight:var(--font-label-weight)] [font-stretch:var(--control-label-width)]',
  'tracking-[var(--control-label-tracking)]',
  'transition-[background-color,scale] duration-1 ease-out',
].join(' ')
const ACTION_ENABLED =
  'cursor-pointer hover:[background-color:var(--empty-action-bg-hover)] active:scale-[var(--empty-action-press-scale)]'
const ACTION_DISABLED = 'cursor-not-allowed opacity-[var(--control-disabled-opacity)]'

function Action({ action }: { action: EmptyStateAction }) {
  const disabled = action.disabled ?? false
  const classes = cx(ACTION, disabled ? ACTION_DISABLED : ACTION_ENABLED)
  // Start padding equal to the tracking balances the trailing letter-spacing.
  const label = <span className="ps-[var(--control-label-tracking)]">{action.label}</span>
  if (action.to !== undefined) {
    if (disabled) {
      return (
        <a className={classes} role="link" aria-disabled="true">
          {label}
        </a>
      )
    }
    return (
      <Link className={classes} to={action.to}>
        {label}
      </Link>
    )
  }
  return (
    <button type="button" className={classes} disabled={disabled} onClick={action.onAction}>
      {label}
    </button>
  )
}

/**
 * What a region shows when it has nothing to show: a contour illustration,
 * a gold heading, one line saying what happened, and an optional action.
 */
export function EmptyState({ kind, heading, message, action, headingLevel = 2, className }: EmptyStateProps) {
  const copy = EMPTY_STATE_COPY[kind]
  const Heading = `h${headingLevel}` as const
  return (
    <div
      data-kind={kind}
      className={cx('flex flex-col items-center gap-4 px-6 py-8 text-center', className)}
    >
      <ContourArt kind={kind} />
      <div className="flex max-w-[44ch] flex-col items-center gap-2">
        <Heading
          className={cx(
            'text-[length:var(--empty-heading-size)] leading-tight [color:var(--empty-heading-color)]',
            '[font-weight:var(--font-display-weight)] [font-stretch:var(--font-display-width)]',
            '[text-wrap:balance]',
          )}
        >
          {heading ?? copy.heading}
        </Heading>
        <p className="text-[length:var(--empty-body-size)] leading-normal [color:var(--empty-body-color)] [text-wrap:pretty]">
          {message ?? copy.message}
        </p>
      </div>
      {action && <Action action={action} />}
    </div>
  )
}
