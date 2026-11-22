import type { ReactNode } from 'react'
import { cx } from '../../kit/controlStyles'
import { CropPanel, type CropLabel } from '../../kit/CropPanel'
import { sectionDomId, spacedName, type KitChapterMeta, type KitSectionMeta } from './sections'

/** Interaction states the gallery can force on a specimen (see `@custom-variant` in tailwind.theme.css). */
export type ForcedState = 'hover' | 'active' | 'focus'

/** Tracked-caps micro type used by the gallery chrome. */
export const CAPS = [
  'uppercase leading-tight',
  '[font-weight:var(--font-label-weight)] [font-stretch:var(--font-label-width)]',
  'tracking-[var(--font-label-tracking)]',
].join(' ')

const DISPLAY = '[font-weight:var(--font-display-weight)] [font-stretch:var(--font-display-width)]'

/** Two-digit chapter number, e.g. 1 → "01". */
export function chapterNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

/**
 * One state of a component: the component on a recessed stage and a
 * tracked-caps caption naming the state. `force` applies a forced hover,
 * pressed or focus state to everything inside the stage.
 */
export function Specimen({
  label,
  force,
  children,
  className,
  stageClassName,
  align = 'center',
}: {
  label: string
  force?: ForcedState
  children: ReactNode
  className?: string
  stageClassName?: string
  /** `center` for compact parts, `stretch` for full-width ones (rows, fields, charts). */
  align?: 'center' | 'stretch'
}) {
  return (
    <figure className={cx('m-0 flex min-w-0 flex-col gap-3', className)} data-specimen={label}>
      <div
        {...(force ? { 'data-force-state': force } : {})}
        className={cx(
          'relative flex min-h-24 min-w-0 flex-1 rounded-[var(--kit-stage-radius)] border p-4 sm:p-5',
          '[background-color:var(--kit-stage-bg)] [border-color:var(--kit-stage-border)]',
          align === 'center' ? 'items-center justify-center' : 'flex-col justify-center',
          stageClassName,
        )}
      >
        {children}
      </div>
      <figcaption className={cx(CAPS, 'flex items-center gap-2 text-[10px] [color:var(--kit-caption-color)]')}>
        <span aria-hidden="true" className="size-1 shrink-0 rounded-pill [background-color:var(--kit-caption-mark)]" />
        {label}
      </figcaption>
    </figure>
  )
}

/** Responsive grid of specimens. `min` is the smallest specimen width before the grid drops a column. */
export function SpecimenGrid({
  children,
  min = '11rem',
  className,
}: {
  children: ReactNode
  min?: string
  className?: string
}) {
  return (
    <div
      className={cx('grid gap-x-4 gap-y-6', className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${min}), 1fr))` }}
    >
      {children}
    </div>
  )
}

/** Component name with line-break opportunities at camelCase joins ("Contour|Background"). */
function BreakableName({ name }: { name: string }) {
  const parts = name.split(/(?<=[a-z])(?=[A-Z])/)
  return (
    <>
      {parts.map((p, i) => (
        <span key={`${p}-${String(i)}`}>
          {i > 0 && <wbr />}
          {p}
        </span>
      ))}
    </>
  )
}

/** Small tracked-caps subheading inside a section's panel. */
export function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className={cx(CAPS, 'm-0 flex items-center gap-3 text-[10px] text-text-secondary')}>
      <span>{children}</span>
      <span aria-hidden="true" className="h-px flex-1 [background-color:var(--kit-rule)]" />
    </h4>
  )
}

/** Vertical rhythm between groups inside one panel. */
export function Groups({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-8">{children}</div>
}

/**
 * One gallery section: a numbered editorial header on the left (stacked
 * above on narrow screens) and the specimens in a crop-bracket panel.
 */
export function KitSection({
  meta,
  number,
  states,
  labels,
  children,
}: {
  meta: KitSectionMeta
  /** e.g. "02.3" */
  number: string
  /** States shown, listed under the heading. */
  states?: readonly string[]
  /** Edge micro-labels for the panel. Defaults to the component name and section number. */
  labels?: readonly CropLabel[]
  children: ReactNode
}) {
  const domId = sectionDomId(meta.id)
  const headingId = `${domId}-heading`
  const panelLabels: readonly CropLabel[] = labels ?? [
    { edge: 'top', text: spacedName(meta.name), align: 'start' },
    { edge: 'bottom', text: number, align: 'end' },
  ]
  return (
    <section
      id={domId}
      aria-labelledby={headingId}
      data-section={meta.id}
      className={cx(
        'grid scroll-mt-[var(--kit-scroll-offset)] gap-6 border-t pt-10',
        '[border-color:var(--kit-rule)]',
        'lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-12',
      )}
    >
      <header className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-[var(--kit-scroll-offset)] lg:self-start">
        <p className={cx(CAPS, 'num m-0 text-11 [color:var(--kit-eyebrow-color)]')}>{number}</p>
        <h3 id={headingId} className={cx(DISPLAY, 'm-0 text-28 leading-none text-text-primary [overflow-wrap:anywhere]')}>
          <BreakableName name={meta.name} />
        </h3>
        <p className="m-0 max-w-[40ch] text-14 leading-relaxed text-text-secondary [text-wrap:pretty]">{meta.summary}</p>
        {states && states.length > 0 && (
          <ul aria-label="States shown" className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
            {states.map((s) => (
              <li
                key={s}
                className={cx(
                  CAPS,
                  'rounded-1 border px-1.5 py-1 text-[9px] text-text-secondary [border-color:var(--kit-stage-border)]',
                )}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </header>
      <CropPanel labels={panelLabels} className="min-w-0 !p-5 !py-10 sm:!p-8 sm:!py-12">
        {children}
      </CropPanel>
    </section>
  )
}

/** Chapter opener: outlined chapter number, gold display title and a one-line summary. */
export function KitChapter({
  meta,
  index,
  children,
}: {
  meta: KitChapterMeta
  index: number
  children: ReactNode
}) {
  const no = chapterNumber(index)
  const headingId = `kit-chapter-${meta.id}`
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-14">
      <header className="grid items-end gap-x-8 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)]">
        <span
          aria-hidden="true"
          className={cx(
            DISPLAY,
            'num select-none text-[length:clamp(64px,10vw,128px)] leading-[0.78] text-transparent',
            '[-webkit-text-stroke:1px_var(--kit-chapter-number-stroke)]',
          )}
        >
          {no}
        </span>
        <div className="flex min-w-0 flex-col gap-3 pb-1">
          <p className={cx(CAPS, 'm-0 text-11 [color:var(--kit-eyebrow-color)]')}>Chapter {no}</p>
          <h2
            id={headingId}
            className={cx(DISPLAY, 'm-0 text-[length:clamp(32px,1.4rem+2vw,48px)] leading-[0.95] [color:var(--kit-heading-color)]')}
          >
            {meta.title}
          </h2>
          <p className="m-0 max-w-[60ch] text-16 leading-relaxed text-text-secondary [text-wrap:pretty]">
            {meta.summary}
          </p>
        </div>
      </header>
      <div className="flex flex-col gap-16">{children}</div>
    </section>
  )
}
