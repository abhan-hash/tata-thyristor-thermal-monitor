import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../../../kit/controlStyles'
import { CropPanel } from '../../../kit/CropPanel'
import { HeroLockup } from '../../../kit/HeroLockup'
import { StatusChip } from '../../../kit/StatusChip'
import { NAV_SHEET_QUERY, TopNav } from '../../../kit/TopNav'
import { CONTOUR_TEXTURE_URL } from '../../../visuals/heat/ContourBackground'
import { CAPS, GroupLabel, Groups, Specimen, SpecimenGrid } from '../gallery'

/** One labelled layer in the AppShell anatomy diagram. */
function Layer({ name, note, className, children }: { name: string; note: string; className?: string; children?: ReactNode }) {
  return (
    <div className={cx('relative flex min-w-0 flex-col gap-1 rounded-1 border px-3 py-2.5 [border-color:var(--kit-stage-border)]', className)}>
      <span className={cx(CAPS, 'text-[10px] text-accent')}>{name}</span>
      <span className="text-12 leading-snug text-text-secondary">{note}</span>
      {children}
    </div>
  )
}

export function AppShellSpecimen() {
  return (
    <Groups>
      <p className="m-0 max-w-[62ch] text-14 leading-relaxed text-text-secondary">
        The shell is the live layout of this page: it stays mounted across routes, so the nav, its clock and the
        telemetry store never remount. Its layers, top to bottom:
      </p>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
        <div
          aria-hidden="true"
          className="relative isolate flex min-h-80 flex-col gap-2 overflow-hidden rounded-2 border p-3 [background-color:var(--surface-page)] [border-color:var(--kit-stage-border)]"
        >
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-40"
            style={{
              backgroundColor: 'var(--contour-stroke)',
              maskImage: `url(${CONTOUR_TEXTURE_URL})`,
              WebkitMaskImage: `url(${CONTOUR_TEXTURE_URL})`,
              maskSize: 'cover',
              WebkitMaskSize: 'cover',
            }}
          />
          <Layer name="TopNav · sticky" note="Wordmark, links, utilities" className="[background-color:var(--surface-panel)]" />
          <Layer
            name="ConnectionBanner"
            note="Only while stale or reconnecting"
            className="border-dashed [background-color:var(--kit-stage-bg)]"
          />
          <Layer name="main · Outlet" note="The routed page, e.g. this gallery" className="flex-1 [background-color:var(--kit-stage-bg)]" />
        </div>
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {[
            ['Skip link', 'First tab stop; jumps to main.'],
            ['Contour texture', 'Fixed behind everything, 6%.'],
            ['TopNav + banner', 'Sticky together at the top.'],
            ['main#main', 'Focus target, flex-1.'],
          ].map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
              <span className="num text-12 text-accent">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex flex-col gap-0.5">
                <span className={cx(CAPS, 'text-[10px] text-text-primary')}>{t}</span>
                <span className="text-12 text-text-secondary">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Groups>
  )
}

/**
 * Renders `children` at `designWidth` px and scales it down to fit the
 * container, so a full-width bar can be previewed inside a panel without
 * clipping. Below the nav breakpoint it renders at the container width,
 * because the nav then shows its compact (sheet) layout anyway.
 */
function ScaledPreview({ designWidth, children }: { designWidth: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ width: number; scale: number; height: number } | null>(null)
  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const available = o.clientWidth
      const wide = window.matchMedia(NAV_SHEET_QUERY).matches
      const width = wide ? Math.max(available, designWidth) : available
      const scale = Math.min(1, available / width)
      setBox({ width, scale, height: i.offsetHeight * scale })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(o)
    ro.observe(i)
    return () => {
      ro.disconnect()
    }
  }, [designWidth])
  return (
    <div ref={outer} className="w-full overflow-hidden" style={box ? { height: box.height } : undefined}>
      <div
        ref={inner}
        className="origin-top-left"
        style={box ? { width: box.width, transform: `scale(${String(box.scale)})` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

export function TopNavSpecimen() {
  return (
    <Groups>
      <p className="m-0 max-w-[62ch] text-14 leading-relaxed text-text-secondary">
        Live instance, made inert so it does not add a second navigation landmark. Links collapse into a sheet below
        1024 px viewports; the live nav above this page shows the current breakpoint.
      </p>
      <Specimen label="Default · live data · MOCK badge" align="stretch" stageClassName="!min-h-0 !p-0 overflow-hidden">
        <ScaledPreview designWidth={1280}>
          <div inert>
            <TopNav />
          </div>
        </ScaledPreview>
      </Specimen>
    </Groups>
  )
}

export function HeroLockupSpecimen() {
  const secondary = (
    <>
      <span className="num text-28 leading-none [font-weight:var(--font-display-weight)]">112.4 °C</span>
      <span className="flex flex-wrap items-center gap-2 text-12 text-text-secondary">
        Hottest Tj · T3 <StatusChip status="warning" size="sm" />
      </span>
    </>
  )
  return (
    <Groups>
      <p className="m-0 max-w-[62ch] text-14 leading-relaxed text-text-secondary">
        Previews are inert because the lockup renders the page’s h1.
      </p>
      <div className="flex flex-col gap-4">
        <GroupLabel>Full · Overview</GroupLabel>
        <Specimen label="Full scale · intensity 0.8" align="stretch" stageClassName="py-10 ps-8 sm:ps-12">
          <div inert>
            <HeroLockup scale="full" title="STAND-04" subtitle="Mill Drive Thyristor Monitor" secondary={secondary} intensity={0.8} />
          </div>
        </Specimen>
      </div>
      <div className="flex flex-col gap-4">
        <GroupLabel>Compact · every other page</GroupLabel>
        <SpecimenGrid min="18rem">
          <Specimen label="Compact · with secondary" align="stretch">
            <div inert>
              <HeroLockup
                title="ALARMS"
                subtitle="Events and acknowledgements"
                secondary={<span className="num text-14 text-text-secondary">3 active · 12 today</span>}
              />
            </div>
          </Specimen>
          <Specimen label="Compact · title only · intensity 0" align="stretch">
            <div inert>
              <HeroLockup title="TRENDS" intensity={0} />
            </div>
          </Specimen>
        </SpecimenGrid>
      </div>
    </Groups>
  )
}

function PanelBody({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-28 flex-col justify-end gap-1.5">
      <span className="text-20 leading-tight text-accent [font-weight:var(--font-display-weight)] [font-stretch:var(--font-display-width)]">
        {title}
      </span>
      <span className="text-12 leading-snug text-text-secondary">{children}</span>
    </div>
  )
}

export function CropPanelSpecimen() {
  return (
    <SpecimenGrid min="15rem">
      <Specimen label="Tone panel" align="stretch" stageClassName="!p-3 sm:!p-4">
        <CropPanel>
          <PanelBody title="Panel">Default dark fill, neutral brackets.</PanelBody>
        </CropPanel>
      </Specimen>
      <Specimen label="Tone raised · accent brackets" align="stretch" stageClassName="!p-3 sm:!p-4">
        <CropPanel tone="raised" accentBrackets>
          <PanelBody title="Raised">The lifted artwork card.</PanelBody>
        </CropPanel>
      </Specimen>
      <Specimen label="Tone bare · edge labels" align="stretch" stageClassName="!p-3 sm:!p-4">
        <CropPanel
          tone="bare"
          labels={[
            { edge: 'top', text: 'CH 3', align: 'start' },
            { edge: 'left', text: 'Margin' },
            { edge: 'right', text: 'Grind' },
            { edge: 'bottom', text: '12.6 K', align: 'end' },
          ]}
        >
          <PanelBody title="Bare">Brackets and labels only.</PanelBody>
        </CropPanel>
      </Specimen>
    </SpecimenGrid>
  )
}

export function ContourBackgroundSpecimen() {
  const mask = `url(${CONTOUR_TEXTURE_URL})`
  const layer = (opacity: string) => (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        opacity,
        backgroundColor: 'var(--contour-stroke)',
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: 'cover',
        WebkitMaskSize: 'cover',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
  return (
    <Groups>
      <p className="m-0 max-w-[62ch] text-14 leading-relaxed text-text-secondary">
        The live layer sits behind this whole page. The same texture is shown here in a box, at its real opacity and
        boosted for inspection.
      </p>
      <SpecimenGrid min="15rem">
        <Specimen label="Live · 6% · pointer-events none" align="stretch" stageClassName="relative h-48 overflow-hidden">
          {layer('var(--line-contour-opacity)')}
        </Specimen>
        <Specimen label="Inspection · 45%" align="stretch" stageClassName="relative h-48 overflow-hidden">
          {layer('0.45')}
        </Specimen>
      </SpecimenGrid>
    </Groups>
  )
}
