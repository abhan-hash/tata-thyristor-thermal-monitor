import { motion } from 'motion/react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useDisplayTick, useTelemetryStore } from '../../data/hooks'
import type { DriveFrame } from '../../domain/types'
import { cx } from '../../kit/controlStyles'
import { CropPanel } from '../../kit/CropPanel'
import { HeroLockup } from '../../kit/HeroLockup'
import { useEntrance } from '../../motion/useEntrance'
import { AirflowDiagram } from '../../visuals/airflow/AirflowDiagram'
import { hottestChannelOf } from '../../visuals/console/IsometricConsole'
import { FosterLadder } from '../../visuals/foster/FosterLadder'
import { MillCutaway } from '../../visuals/mill/MillCutaway'

/** Banner copied from `thermosense_dashboard/assets/` into `web/public/` (Requirement 29.1). */
export const ABOUT_BANNER_SRC = `${import.meta.env.BASE_URL}about_hero_banner.webp`
export const ABOUT_BANNER_ALT =
  'Stand 04 of the hot strip mill: a glowing steel bar runs between the work rolls, with the thyristor drive cabinet on the left.'

export interface VirtualSensorStep {
  readonly key: 'measure' | 'model' | 'estimate' | 'validate'
  readonly title: string
  readonly inputs: string
  readonly body: string
}

/** The 4-step flow (Requirement 29.3). */
export const VIRTUAL_SENSOR_STEPS: readonly VirtualSensorStep[] = [
  {
    key: 'measure',
    title: 'Measure',
    inputs: 'RTD · current',
    body: 'An RTD on each heatsink and the armature current transducer are sampled at 10 Hz.',
  },
  {
    key: 'model',
    title: 'Model',
    inputs: 'Power loss',
    body: 'Current, threshold voltage and on-state slope give the conduction loss of every thyristor in watts.',
  },
  {
    key: 'estimate',
    title: 'Estimate',
    inputs: 'Foster network',
    body: 'The loss drives a 3-stage Foster RC network from the measured heatsink up to the junction, giving Tj.',
  },
  {
    key: 'validate',
    title: 'Validate',
    inputs: 'Cooling residual',
    body: 'The model also predicts the heatsink. The gap to the RTD flags clogged filters, fan faults and bad sensors.',
  },
]

/* Page-local layout knobs. */
const PAGE_VARS = {
  '--about-banner-h': 'clamp(320px, 38vw, 560px)',
  '--about-callout-size': 'clamp(24px, 1rem + 1.4vw, 40px)',
  '--about-step-num-size': 'clamp(40px, 1.6rem + 1.6vw, 64px)',
} as CSSProperties

const EYEBROW = 'm-0 text-11 font-[600] uppercase tracking-[0.32em] text-text-muted [font-stretch:125%]'
const SECTION_H2 = 'm-0 text-[length:clamp(22px,1rem+0.8vw,28px)] leading-[1.05] font-[800] text-accent [font-stretch:112%]'
const BODY = 'm-0 text-14 leading-relaxed text-text-secondary'

/* ── Live binding ──────────────────────────────────────────────────────── */

/** Last frame and live airflow, re-read once per 1 Hz Display_Tick. */
function useTickFrame(): { frame: DriveFrame | null; airflow: number } {
  const store = useTelemetryStore()
  const seq = useDisplayTick()?.seq ?? 0
  return useMemo(
    () => ({ frame: store.getSnapshot().frame, airflow: store.live.airflow.get() }),
    // `seq` is the trigger: read the store once per tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, seq],
  )
}

/** The last 30 display-tick armature values, oldest first. */
function useTickArmature(): readonly number[] {
  const tick = useDisplayTick()
  const [hist, setHist] = useState<{ seq: number; values: readonly number[] }>({ seq: -1, values: [] })
  if (tick !== null && tick.seq !== hist.seq) {
    setHist({ seq: tick.seq, values: [...hist.values, tick.armature].slice(-30) })
  }
  return hist.values
}

function Waiting() {
  return (
    <p role="status" className="m-0 grid min-h-48 place-items-center text-12 text-text-muted">
      Waiting for the first frame…
    </p>
  )
}

function LiveFoster() {
  const { frame } = useTickFrame()
  if (frame === null) return <Waiting />
  const id = hottestChannelOf(frame) ?? 1
  const ch = frame.thyristors.find((c) => c.id === id) ?? frame.thyristors[0]
  return <FosterLadder frame={ch} ambient={frame.ambient_temp} variant="annotated" className="block h-auto w-full" />
}

function LiveMill() {
  const { frame } = useTickFrame()
  const series = useTickArmature()
  if (frame === null) return <Waiting />
  return <MillCutaway devices={frame.thyristors} currentSeries={series} className="block h-auto w-full" />
}

function LiveAirflow() {
  const { frame, airflow } = useTickFrame()
  if (frame === null) return <Waiting />
  return (
    <AirflowDiagram
      fanStatus={frame.fan_status}
      tj={frame.thyristors.map((c) => (c.sensor_healthy ? c.tj_estimated : Number.NaN))}
      airflow={Number.isFinite(airflow) ? airflow : 1}
      className="mx-auto block h-auto w-full max-w-[420px]"
    />
  )
}

/* ── Sections ──────────────────────────────────────────────────────────── */

function Banner() {
  return (
    <figure
      data-part="about-banner"
      className="relative isolate m-0 flex flex-col overflow-hidden rounded-3 bg-surface-panel sm:block sm:h-[var(--about-banner-h)]"
    >
      <img
        src={ABOUT_BANNER_SRC}
        alt={ABOUT_BANNER_ALT}
        width={1376}
        height={768}
        decoding="async"
        className="relative -z-10 aspect-[16/9] w-full object-cover object-[60%_center] sm:absolute sm:inset-0 sm:aspect-auto sm:size-full"
      />
      {/* Scrim: dark from the bottom-left so the callout reads over the hot bar. Phones stack the caption below the image instead. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 hidden sm:block [background:linear-gradient(to_top,var(--surface-page)_0%,color-mix(in_srgb,var(--surface-page)_70%,transparent)_32%,transparent_68%),linear-gradient(to_right,color-mix(in_srgb,var(--surface-page)_75%,transparent),transparent_55%)]"
      />
      <figcaption className="flex flex-col gap-3 p-5 sm:absolute sm:inset-x-0 sm:bottom-0 sm:max-w-[36rem] sm:p-10">
        <p className={EYEBROW}>Stand-04 · Hot strip mill</p>
        <h2 className="m-0 text-[length:var(--about-callout-size)] leading-[1.02] font-[800] text-accent [font-stretch:112%] [text-shadow:2px_2px_0_var(--surface-sunken)]">
          A Sensor Where
          <br />
          No Sensor Fits
        </h2>
        <p className="m-0 max-w-[30rem] text-14 leading-snug font-[600] text-text-primary [text-shadow:0_1px_2px_var(--surface-sunken)]">
          The junction of a press-pack thyristor sits sealed inside ceramic and copper. THERMOSENSE estimates its
          temperature, Tj, from the heatsink RTDs and the armature current through a thermal model, live for all six
          devices.
        </p>
      </figcaption>
    </figure>
  )
}

function StepCard({ step, index }: { step: VirtualSensorStep; index: number }) {
  const last = index === VIRTUAL_SENSOR_STEPS.length - 1
  return (
    <li data-step={step.key} className="relative flex min-w-0 flex-col gap-3 border-t border-line-strong pt-5">
      {/* Gold tick on the rule marks the flow position; the arrow leads to the next step. */}
      <span aria-hidden="true" className="absolute -top-px left-0 h-0.5 w-10 bg-accent" />
      {!last && (
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="absolute -top-[6.5px] -right-[calc(var(--layout-gutter)/2+6px)] hidden size-3 fill-accent lg:block"
        >
          <path d="M2 1l8 5-8 5z" />
        </svg>
      )}
      <div className="flex items-baseline gap-4">
        <span
          aria-hidden="true"
          data-a11y-decorative=""
          className="text-[length:var(--about-step-num-size)] leading-none font-[800] tabular-nums text-surface-raised [font-stretch:112%] [-webkit-text-stroke:1px_var(--line-strong)]"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="m-0 text-20 leading-tight font-[800] text-text-primary [font-stretch:112%]">{step.title}</h3>
          <p className="m-0 text-11 font-[600] uppercase tracking-[0.28em] text-accent [font-stretch:125%]">
            {step.inputs}
          </p>
        </div>
      </div>
      <p className={BODY}>{step.body}</p>
    </li>
  )
}

function StepsSection() {
  return (
    <section aria-labelledby="about-steps" className="flex flex-col gap-8">
      <header className="flex max-w-[40rem] flex-col gap-2">
        <p className={EYEBROW}>The method</p>
        <h2 id="about-steps" className={SECTION_H2}>
          How the virtual sensor works
        </h2>
      </header>
      <ol className="m-0 grid list-none grid-cols-1 gap-x-[var(--layout-gutter)] gap-y-8 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {VIRTUAL_SENSOR_STEPS.map((s, i) => (
          <StepCard key={s.key} step={s} index={i} />
        ))}
      </ol>
    </section>
  )
}

function Explainer({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string
  eyebrow: string
  title: ReactNode
  children: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3">
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 id={id} className={SECTION_H2}>
        {title}
      </h2>
      {children}
    </header>
  )
}

function FosterSection() {
  return (
    <section aria-labelledby="about-foster" className="layout-grid items-center">
      <div className="col-span-full flex flex-col gap-4 lg:col-span-3 wide:col-span-4">
        <Explainer id="about-foster" eyebrow="The model" title="Three RC Stages, Junction to Air">
          <p className={BODY}>
            Heat leaves the silicon through the die, the case and the heatsink. Each layer stores heat (C) and resists
            its flow (R), so each responds on its own time constant τ = R·C.
          </p>
          <p className={BODY}>
            Power loss enters at the junction. Adding the temperature rise across each stage to the measured heatsink
            gives Tj, fast enough to follow a bar bite.
          </p>
        </Explainer>
        <p className="m-0 text-12 text-text-muted">Live: the hottest channel on Stand-04.</p>
      </div>
      <CropPanel
        tone="raised"
        className="col-span-full lg:col-span-5 wide:col-span-8"
        labels={[
          { edge: 'top', text: 'Foster network', align: 'start' },
          { edge: 'bottom', text: 'Junction → air', align: 'end' },
        ]}
      >
        {/* Below 640 px the ladder keeps a legible size and scrolls sideways. */}
        <div
          role="region"
          aria-label="Foster network diagram"
          tabIndex={0}
          className="-mx-2 overflow-x-auto px-2 outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <div className="min-w-[600px] sm:min-w-0">
            <LiveFoster />
          </div>
        </div>
      </CropPanel>
    </section>
  )
}

function PlantSection() {
  return (
    <section aria-labelledby="about-plant" className="flex flex-col gap-8">
      <Explainer id="about-plant" eyebrow="The plant" title="From Roll Gap to Cooling Air">
        <p className={cx(BODY, 'max-w-[44rem]')}>
          The thyristor bridge feeds the Stand-04 main motor. Each bar entering the roll gap steps the armature current
          and heats the junctions within seconds. Forced air carries that heat out of the cabinet, so the fan and filters
          decide how much margin is left.
        </p>
      </Explainer>
      <div className="layout-grid items-stretch">
        <figure className="col-span-full m-0 flex flex-col gap-3 lg:col-span-5 wide:col-span-7">
          <CropPanel
            tone="panel"
            className="flex flex-1 items-center !p-2"
            labels={[{ edge: 'top', text: 'Mill cutaway', align: 'start' }]}
          >
            <LiveMill />
          </CropPanel>
          <figcaption className="text-12 leading-snug text-text-muted">
            Bar bite: the strip glow pulses when an armature current step is detected.
          </figcaption>
        </figure>
        <figure className="col-span-full m-0 flex flex-col gap-3 lg:col-span-3 wide:col-span-5">
          <CropPanel
            tone="panel"
            className="flex flex-1 items-center"
            labels={[{ edge: 'top', text: 'Cabinet airflow', align: 'start' }]}
          >
            <LiveAirflow />
          </CropPanel>
          <figcaption className="text-12 leading-snug text-text-muted">
            Cooling path: intake, six heatsinks, exhaust. Arrows slow as airflow drops.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

/**
 * About at `/about` (Requirement 29): an editorial explainer of the virtual
 * sensor. Compact lockup, the mill banner with a gold callout, the 4-step
 * flow, the annotated Foster ladder, then the mill cutaway and airflow
 * diagram. All visuals are bound to the live store.
 */
export function AboutPage() {
  const entrance = useEntrance('about')
  return (
    <div className="layout-page flex flex-col gap-16 py-8 pb-24" style={PAGE_VARS}>
      <motion.div {...entrance.slot('hero')}>
        <HeroLockup
          title="ABOUT"
          subtitle="How the virtual sensor works"
          secondary={
            <p className="m-0 max-w-[26rem] text-14 leading-snug text-text-secondary">
              Junction temperature, estimated every 100 ms from signals the drive already has.
            </p>
          }
        />
      </motion.div>
      <motion.div {...entrance.slot('visual')}>
        <Banner />
      </motion.div>
      <motion.div {...entrance.slot('secondary')} className="flex flex-col gap-16">
        <StepsSection />
        <FosterSection />
        <PlantSection />
      </motion.div>
    </div>
  )
}
