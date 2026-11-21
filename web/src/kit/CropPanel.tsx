import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from './controlStyles'

export type CropEdge = 'top' | 'right' | 'bottom' | 'left'
export type CropLabelAlign = 'start' | 'center' | 'end'
export type CropCorner = 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left'

export interface CropLabel {
  edge: CropEdge
  /** Tracked-caps micro-label, e.g. "CH 3" or "MARGIN". Side edges are set vertically. */
  text: ReactNode
  /** Position along the edge. Start is the top on side edges and the inline start on top/bottom. Default `center`. */
  align?: CropLabelAlign
}

/**
 * `panel`: dark panel fill. `raised`: the lifted artwork card from the reference.
 * `bare`: brackets and labels only, for framing a visual that brings its own surface.
 */
export type CropPanelTone = 'panel' | 'raised' | 'bare'

export interface CropPanelProps extends ComponentPropsWithoutRef<'div'> {
  labels?: readonly CropLabel[]
  tone?: CropPanelTone
  /** Draw the brackets in the gold accent instead of the neutral line colour. */
  accentBrackets?: boolean
  children?: ReactNode
}

export const CROP_CORNERS: readonly CropCorner[] = ['top-left', 'top-right', 'bottom-right', 'bottom-left']

/* Each corner reuses one top-left artwork, mirrored with a scale so the
   strokes land on the same half-pixel grid in every corner. */
const CORNER: Readonly<Record<CropCorner, string>> = {
  'top-left': 'top-[var(--crop-bracket-inset)] left-[var(--crop-bracket-inset)]',
  'top-right': 'top-[var(--crop-bracket-inset)] right-[var(--crop-bracket-inset)] -scale-x-100',
  'bottom-right': 'bottom-[var(--crop-bracket-inset)] right-[var(--crop-bracket-inset)] -scale-100',
  'bottom-left': 'bottom-[var(--crop-bracket-inset)] left-[var(--crop-bracket-inset)] -scale-y-100',
}

const TONE: Readonly<Record<CropPanelTone, string>> = {
  panel: [
    'rounded-[var(--crop-panel-radius)] border [border-color:var(--crop-panel-border)]',
    '[background-color:var(--crop-panel-bg)] shadow-[var(--crop-panel-shadow)]',
  ].join(' '),
  raised: [
    'rounded-[var(--crop-panel-radius)] border [border-color:var(--crop-panel-border)]',
    '[background-color:var(--crop-panel-bg-raised)] shadow-[var(--crop-panel-shadow)]',
  ].join(' '),
  bare: '',
}

const LABEL = [
  'pointer-events-none absolute flex whitespace-nowrap uppercase leading-none',
  'text-[length:var(--crop-label-size)] [color:var(--crop-label-color)]',
  '[font-weight:var(--crop-label-weight)] [font-stretch:var(--crop-label-width)]',
  'tracking-[var(--crop-label-tracking)]',
].join(' ')

/*
 * Labels sit on the bracket line, in the lane between the panel edge and
 * the content, and stop short of the bracket arms at either end.
 * The left edge reads bottom-to-top and the right edge top-to-bottom, the
 * way the reference card sets "DISTORTION" up its side.
 */
/* Physical offsets on purpose: Tailwind's `inset-x/y` are logical and would
   swap axes inside the vertical writing mode used by the side labels. */
const EDGE: Readonly<Record<CropEdge, string>> = {
  top:
    'top-[var(--crop-bracket-inset)] -translate-y-1/2 left-[var(--crop-label-lane)] right-[var(--crop-label-lane)]',
  bottom:
    'bottom-[var(--crop-bracket-inset)] translate-y-1/2 left-[var(--crop-label-lane)] right-[var(--crop-label-lane)]',
  left:
    'left-[var(--crop-bracket-inset)] -translate-x-1/2 top-[var(--crop-label-lane)] bottom-[var(--crop-label-lane)] [writing-mode:vertical-rl] rotate-180',
  right:
    'right-[var(--crop-bracket-inset)] translate-x-1/2 top-[var(--crop-label-lane)] bottom-[var(--crop-label-lane)] [writing-mode:vertical-rl]',
}

/* `justify-*` runs along the edge in both writing modes. The left label is
   rotated 180°, so its start and end swap to keep "start" at the top. */
const ALIGN: Readonly<Record<CropLabelAlign, string>> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
}
const ALIGN_FLIPPED: Readonly<Record<CropLabelAlign, string>> = {
  start: 'justify-end',
  center: 'justify-center',
  end: 'justify-start',
}

function Bracket({ corner, accent }: { corner: CropCorner; accent: boolean }) {
  return (
    <svg
      viewBox="0 0 14 14"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      data-corner={corner}
      className={cx(
        'pointer-events-none absolute size-[var(--crop-bracket-size)] overflow-visible',
        CORNER[corner],
      )}
    >
      <path
        d="M0.5 14V0.5H14"
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="square"
        className={cx(
          '[stroke-width:var(--crop-bracket-stroke-width)]',
          accent ? '[stroke:var(--crop-bracket-stroke-accent)]' : '[stroke:var(--crop-bracket-stroke)]',
        )}
      />
    </svg>
  )
}

/**
 * Panel framed by crop-bracket corner marks, with optional micro-labels set
 * along its edges. The brackets are decorative SVG; the labels are real
 * text. Content padding clears the bracket lane, so labels never overlap it.
 */
export function CropPanel({
  labels = [],
  tone = 'panel',
  accentBrackets = false,
  className,
  children,
  ...rest
}: CropPanelProps) {
  return (
    <div
      {...rest}
      data-tone={tone}
      className={cx('relative isolate p-[var(--crop-panel-pad)]', TONE[tone], className)}
    >
      {CROP_CORNERS.map((corner) => (
        <Bracket key={corner} corner={corner} accent={accentBrackets} />
      ))}
      {labels.map((label, i) => {
        const align = label.align ?? 'center'
        return (
          <span
            key={`${label.edge}-${i}`}
            data-edge={label.edge}
            className={cx(LABEL, EDGE[label.edge], (label.edge === 'left' ? ALIGN_FLIPPED : ALIGN)[align])}
          >
            {/* Start padding equal to the tracking centres the label on the edge optically. */}
            <span className="ps-[var(--crop-label-tracking)]">{label.text}</span>
          </span>
        )
      })}
      {children}
    </div>
  )
}
