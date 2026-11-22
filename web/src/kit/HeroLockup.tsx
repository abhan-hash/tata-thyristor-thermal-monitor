import type { ReactNode } from 'react'
import { HeatSmearTitle } from '../visuals/heat/HeatSmearTitle'
import type { NumberSource } from '../visuals/heat/useMotionSource'
import { cx } from './controlStyles'

export type HeroLockupScale = 'full' | 'compact'

export interface HeroLockupProps {
  /** Wordmark set as the heat-smear title, e.g. "STAND-04". The page's h1. */
  title: string
  /** Line under the title, e.g. "Mill Drive Thyristor Monitor". */
  subtitle?: string
  /** Block right of the divider: a live readout, a play button, page actions. */
  secondary?: ReactNode
  /** Smear strength 0..1, e.g. following the hottest Tj. Default 0.6. */
  intensity?: NumberSource
  /** `full` on the Overview, `compact` on every other page (Requirement 22.7). Default `compact`. */
  scale?: HeroLockupScale
  className?: string
}

/*
 * The title SVG is drawn at a fixed design size and scaled by CSS height, so
 * the smear offsets and blur stay proportional to the glyphs at every width.
 * 1.2 matches the title's line box (its viewBox height / font size).
 */
export const HERO_TITLE_DRAW_SIZE: Readonly<Record<HeroLockupScale, number>> = { full: 72, compact: 40 }

const SCALE: Readonly<
  Record<HeroLockupScale, { root: string; title: string; subtitle: string; divider: string }>
> = {
  full: {
    root: 'justify-center gap-[var(--hero-gap-full)]',
    title: 'h-[calc(var(--hero-title-size-full)*1.2)]',
    subtitle: 'text-[length:var(--hero-subtitle-size-full)]',
    divider: 'sm:h-[calc(var(--hero-title-size-full)*1.6)]',
  },
  compact: {
    root: 'justify-start gap-[var(--hero-gap-compact)]',
    title: 'h-[calc(var(--hero-title-size-compact)*1.2)]',
    subtitle: 'text-[length:var(--hero-subtitle-size-compact)]',
    divider: 'sm:h-[calc(var(--hero-title-size-compact)*1.5)]',
  },
}

/**
 * Page header from the reference: heat-smear wordmark over a subtitle, a
 * thin vertical divider, then a secondary block. The title column is
 * end-aligned against the divider, as in the reference "THERMAL" lockup.
 * Below 640 px it stacks and the divider turns into a short horizontal rule.
 */
export function HeroLockup({
  title,
  subtitle,
  secondary,
  intensity = 0.6,
  scale = 'compact',
  className,
}: HeroLockupProps) {
  const s = SCALE[scale]
  return (
    <div
      data-scale={scale}
      className={cx('flex flex-col items-start sm:flex-row sm:items-center', s.root, className)}
    >
      <div className="flex min-w-0 flex-col items-start sm:items-end">
        <h1 className="m-0 flex leading-none">
          <HeatSmearTitle
            text={title}
            intensity={intensity}
            fontSize={HERO_TITLE_DRAW_SIZE[scale]}
            className={cx('block w-auto max-w-full', s.title)}
          />
        </h1>
        {subtitle !== undefined && (
          <p
            className={cx(
              'm-0 leading-tight [color:var(--hero-subtitle-color)]',
              '[font-weight:var(--hero-subtitle-weight)] [font-stretch:var(--hero-subtitle-width)]',
              '[text-wrap:balance] sm:text-end',
              s.subtitle,
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {secondary !== undefined && (
        <>
          <span
            aria-hidden="true"
            data-part="divider"
            className={cx(
              'block h-[var(--hero-divider-width)] w-12 shrink-0 [background-color:var(--hero-divider)]',
              'sm:w-[var(--hero-divider-width)]',
              s.divider,
            )}
          />
          <div className="flex min-w-0 flex-col items-start gap-2 [color:var(--hero-secondary-color)]">
            {secondary}
          </div>
        </>
      )}
    </div>
  )
}
