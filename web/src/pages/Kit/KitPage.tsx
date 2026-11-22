import { useReducedMotion } from 'motion/react'
import { useEffect, type ComponentType, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { cx } from '../../kit/controlStyles'
import { CropPanel } from '../../kit/CropPanel'
import { CAPS, chapterNumber, KitChapter, KitSection } from './gallery'
import { KIT_CHAPTERS, KIT_SECTIONS, resolveSection, sectionDomId, type KitSectionId } from './sections'
import { AppShellSpecimen, ContourBackgroundSpecimen, CropPanelSpecimen, HeroLockupSpecimen, TopNavSpecimen } from './specimens/Layout'
import { FaderSpecimen, FieldSpecimen, HardwareToggleSpecimen, NumberFieldSpecimen, SelectSpecimen } from './specimens/Controls'
import { ConnectionBannerSpecimen, EmptyStateSpecimen } from './specimens/Feedback'
import { IconsSpecimen, TokensSpecimen, TypeScaleSpecimen } from './specimens/Foundations'
import { HeatDefsSpecimen, HeatDiscSpecimen, HeatSmearTitleSpecimen } from './specimens/Heat'
import { ChartFrameSpecimen, KpiTileSpecimen, SparklineSpecimen, StaleChipSpecimen, StatusChipSpecimen } from './specimens/Readouts'
import { AirflowDiagramSpecimen, BridgeSchematicSpecimen, FosterLadderSpecimen, HeatBlobsSpecimen, IsometricConsoleSpecimen, MillCutawaySpecimen } from './specimens/Visuals'
import { FilterChipSpecimen, RackRowSpecimen, SourceButtonSpecimen, SourceGridSpecimen } from './specimens/Selection'

const SPECIMENS: Readonly<Record<KitSectionId, { body: ComponentType; states: readonly string[] }>> = {
  tokens: { body: TokensSpecimen, states: ['Surfaces', 'Text', 'Accent', 'Status', 'Heat'] },
  'type-scale': { body: TypeScaleSpecimen, states: ['Display', 'Label', 'Body', 'Numerals'] },
  icons: { body: IconsSpecimen, states: ['Each status'] },
  'app-shell': { body: AppShellSpecimen, states: ['Live layout'] },
  'top-nav': { body: TopNavSpecimen, states: ['Default', 'Mock badge'] },
  'hero-lockup': { body: HeroLockupSpecimen, states: ['Full', 'Compact', 'Title only'] },
  'crop-panel': { body: CropPanelSpecimen, states: ['Panel', 'Raised', 'Bare', 'Edge labels'] },
  'contour-background': { body: ContourBackgroundSpecimen, states: ['Live', 'Inspection'] },
  'heat-smear-title': { body: HeatSmearTitleSpecimen, states: ['Intensity 0–1'] },
  'heat-disc': { body: HeatDiscSpecimen, states: ['Normal', 'Warning', 'Critical', 'Fault'] },
  'heat-defs': { body: HeatDefsSpecimen, states: ['Gradient', 'Filters', 'Hatch'] },
  'heat-blobs': { body: HeatBlobsSpecimen, states: ['Normal', 'Warning', 'Critical', 'All ambient', 'Sensor fault', 'Fan failure', 'Live'] },
  'isometric-console': { body: IsometricConsoleSpecimen, states: ['Normal', 'Warning', 'Critical', 'All ambient', 'Sensor fault', 'Fan failure', 'Live'] },
  'bridge-schematic': { body: BridgeSchematicSpecimen, states: ['Full', 'Thumbnail', 'Each status', 'All ambient', 'Sensor fault', 'Selected', 'Live'] },
  'foster-ladder': { body: FosterLadderSpecimen, states: ['Compact', 'Annotated', 'Each status', 'All ambient', 'Sensor fault', 'Live'] },
  'mill-cutaway': { body: MillCutawaySpecimen, states: ['Steady', 'Bar bite', 'Critical', 'Idle', 'Sensor fault', 'Live'] },
  'airflow-diagram': { body: AirflowDiagramSpecimen, states: ['Normal', 'Clogging', 'Critical', 'All ambient', 'Sensor fault', 'Fan off', 'Live'] },
  'status-chip': { body: StatusChipSpecimen, states: ['Each status', 'Two sizes'] },
  'stale-chip': { body: StaleChipSpecimen, states: ['Two sizes'] },
  'kpi-tile': { body: KpiTileSpecimen, states: ['Each status', 'Default', 'Loading'] },
  sparkline: { body: SparklineSpecimen, states: ['Default', 'Bands', 'Gap', 'Empty'] },
  'chart-frame': { body: ChartFrameSpecimen, states: ['Default', 'Crosshair', 'Empty'] },
  'rack-row': { body: RackRowSpecimen, states: ['Default', 'Hover', 'Pressed', 'Focus', 'Selected', 'Disabled', 'Each status'] },
  'source-button': { body: SourceButtonSpecimen, states: ['Default', 'Hover', 'Pressed', 'Focus', 'Checked', 'Disabled'] },
  'source-grid': { body: SourceGridSpecimen, states: ['2 × 3', '3 × 2', 'Unset', 'Disabled'] },
  'filter-chip': { body: FilterChipSpecimen, states: ['Default', 'Hover', 'Pressed', 'Focus', 'Selected', 'Disabled'] },
  fader: { body: FaderSpecimen, states: ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled'] },
  'hardware-toggle': { body: HardwareToggleSpecimen, states: ['Off', 'On', 'Hover', 'Pressed', 'Focus', 'Disabled'] },
  field: { body: FieldSpecimen, states: ['Empty', 'Filled', 'Hover', 'Focus', 'Error', 'Disabled'] },
  'number-field': { body: NumberFieldSpecimen, states: ['Default', 'Hover', 'Focus', 'Error', 'Disabled', 'Empty'] },
  select: { body: SelectSpecimen, states: ['Default', 'Hover', 'Focus', 'Error', 'Disabled'] },
  'empty-state': { body: EmptyStateSpecimen, states: ['No data', 'Disconnected', 'No alarms', 'Error'] },
  'connection-banner': { body: ConnectionBannerSpecimen, states: ['Stale', 'Reconnecting', 'Live'] },
}

/**
 * Scrolls the section named by `?section=` into view on load and whenever
 * the param changes (Requirement 7.3). Re-runs on every navigation, so
 * picking the same contents link twice still scrolls back to it.
 */
function useSectionScroll() {
  const [params] = useSearchParams()
  const { key } = useLocation()
  const reduceMotion = useReducedMotion() === true
  const param = params.get('section')
  useEffect(() => {
    const target = resolveSection(param)
    if (!target) return
    document.getElementById(sectionDomId(target.id))?.scrollIntoView({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }, [param, key, reduceMotion])
}

/** Link that sets `?section=` and keeps the other params (e.g. `seed`). */
function SectionLink({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const [params] = useSearchParams()
  const next = new URLSearchParams(params)
  next.set('section', id)
  return (
    <Link to={{ search: `?${next.toString()}` }} replace preventScrollReset className={className}>
      {children}
    </Link>
  )
}

function Contents() {
  return (
    <nav aria-label="Kit sections">
      <CropPanel
        tone="raised"
        accentBrackets
        labels={[
          { edge: 'top', text: 'Contents', align: 'start' },
          { edge: 'bottom', text: `${String(KIT_SECTIONS.length)} sections`, align: 'end' },
        ]}
        className="!p-6 !py-10 sm:!p-8 sm:!py-12"
      >
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-x-8 gap-y-8 p-0">
          {KIT_CHAPTERS.map((chapter, ci) => (
            <li key={chapter.id} className="flex min-w-0 flex-col gap-3">
              <p className={cx(CAPS, 'm-0 flex items-baseline gap-2 text-[10px] text-accent')}>
                <span className="num">{chapterNumber(ci)}</span>
                <span>{chapter.title}</span>
              </p>
              <ol className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-0.5 border-l p-0 ps-3 [border-color:var(--kit-rule)] sm:flex sm:flex-col">
                {chapter.sections.map((s) => (
                  <li key={s.id}>
                    <SectionLink
                      id={s.id}
                      className={cx(
                        'block rounded-1 py-1 text-14 leading-snug no-underline transition-colors duration-1 ease-out',
                        '[color:var(--kit-index-link)] hover:[color:var(--kit-index-link-hover)]',
                      )}
                    >
                      {s.name}
                    </SectionLink>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </CropPanel>
    </nav>
  )
}

const LEGEND = ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled', 'Loading / empty', 'Each status'] as const

/**
 * Kit_Gallery (Requirement 7): every kit, chart and heat component in each
 * applicable state, plus the semantic swatches and type scale. Hover,
 * pressed and focus are forced with `data-force-state` wrappers.
 */
export function KitPage() {
  useSectionScroll()
  return (
    <div className="relative isolate [&_code]:font-sans">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] [background:var(--kit-glow)]" />
      <div className="mx-auto flex max-w-[var(--kit-page-max)] flex-col gap-24 px-5 pb-32 pt-12 sm:px-8 sm:pt-16 lg:px-12">
        <header className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <div className="flex min-w-0 flex-col gap-5">
            <p className={cx(CAPS, 'm-0 text-11 text-accent')}>Thermosense · Design system · Phase 1</p>
            <h1 className="m-0 text-[length:clamp(44px,1.5rem+5vw,96px)] leading-[0.9] text-text-primary [font-weight:var(--font-display-weight)] [font-stretch:var(--font-display-width)]">
              Component kit
            </h1>
            <p className="m-0 max-w-[56ch] text-16 leading-relaxed text-text-secondary [text-wrap:pretty] sm:text-20">
              Every primitive the mill-drive pages are built from, in every state: default, hover, pressed, focus,
              disabled, loading and each status. Link to a section with{' '}
              <code className="num text-[0.9em] text-text-primary">?section=rack-row</code>.
            </p>
          </div>
          <CropPanel labels={[{ edge: 'top', text: 'States', align: 'start' }]} className="!p-6 !py-10">
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {LEGEND.map((s) => (
                <li key={s} className={cx(CAPS, 'rounded-1 border px-2 py-1.5 text-[10px] text-text-primary [border-color:var(--kit-stage-border)]')}>
                  {s}
                </li>
              ))}
            </ul>
            <p className="m-0 mt-5 text-12 leading-relaxed text-text-secondary">
              Forced states are previews. Every specimen stays live: hover, click and tab through them.
            </p>
          </CropPanel>
        </header>

        <Contents />

        {KIT_CHAPTERS.map((chapter, ci) => (
          <KitChapter key={chapter.id} meta={chapter} index={ci}>
            {chapter.sections.map((section, si) => {
              const { body: Body, states } = SPECIMENS[section.id]
              return (
                <KitSection key={section.id} meta={section} number={`${chapterNumber(ci)}.${String(si + 1)}`} states={states}>
                  <Body />
                </KitSection>
              )
            })}
          </KitChapter>
        ))}
      </div>
    </div>
  )
}
