import { motion, useTransform } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { formatValueFlush, TEMP_C_SPEC } from '../../domain/format'
import { DEFAULT_THRESHOLDS } from '../../domain/thresholds'
import type { DriveFrame } from '../../domain/types'
import { useDisplayTick, useFrame, useIsStale, useLiveValue, useScenario, useTelemetryStore } from '../../data/hooks'
import { REPLAY_STEPS, runReplay, type ReplayStep } from '../../data/mock/replay'
import { cx } from '../../kit/controlStyles'
import { HeroLockup } from '../../kit/HeroLockup'
import { StaleChip } from '../../kit/StaleChip'
import { AnimatedNumber } from '../../motion/AnimatedNumber'
import type { Entrance } from '../../motion/useEntrance'
import { LiveIsometricConsole } from '../../visuals/console/IsometricConsole'
import { HeatBlobs } from '../../visuals/heat/HeatBlobs'

/** Junction trip level (Requirement 24.9). */
export const TRIP_C = DEFAULT_THRESHOLDS.junction_temp.critical

/** Title smear follows the hottest Tj: faint at a cool idle, full at the trip. */
const SMEAR_FROM_C = 40
export function smearIntensity(hottestC: number): number {
  if (!Number.isFinite(hottestC)) return 0.2
  return Math.min(1, Math.max(0.2, (hottestC - SMEAR_FROM_C) / (TRIP_C - SMEAR_FROM_C)))
}

/** True when every channel is at or above the trip (Requirement 24.9). */
export function isAllTripped(frame: DriveFrame | null): boolean {
  if (frame === null) return false
  return frame.thyristors.every((ch) => ch.tj_estimated >= TRIP_C)
}

/** Hottest Tj as text without the leading pad: "98.4", or "— —" before data. */
export function hottestText(c: number): string {
  return formatValueFlush(c, TEMP_C_SPEC)
}

/* ── Secondary block: live hottest Tj + replay button ─────────────────── */

function LiveHottest() {
  const hottest = useLiveValue('hottest')
  const tripped = useFrame(isAllTripped)
  const stale = useIsStale()
  if (tripped) {
    return (
      <p className="m-0 flex items-baseline gap-2 leading-none" data-part="hero-trip">
        <span className="text-[length:var(--hero-figure-size)] font-[800] tracking-[0.08em] text-status-critical-text">
          TRIP
        </span>
        <span className="text-12 text-text-secondary">every channel ≥ {TRIP_C} °C</span>
      </p>
    )
  }
  return (
    <p className="m-0 flex items-baseline gap-2 leading-none" aria-label="Hottest junction temperature">
      <AnimatedNumber
        value={hottest}
        format={hottestText}
        data-part="hero-hottest"
        {...(stale ? { 'data-stale': 'true' } : {})}
        className={cx(
          'text-[length:var(--hero-figure-size)] font-[800] tabular-nums [font-stretch:106%]',
          stale && 'text-text-muted',
        )}
      />
      <span className="text-[length:calc(var(--hero-figure-size)*0.55)] font-[700] text-text-secondary">°C</span>
      <span className="ms-1 self-center text-11 font-[600] tracking-[0.24em] text-text-muted uppercase [font-stretch:125%]">
        Peak Tj
      </span>
      {stale && <StaleChip size="sm" className="self-center" />}
    </p>
  )
}

function PlayGlyph({ playing }: { playing: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid size-9 shrink-0 place-items-center rounded-pill border-[1.5px] border-accent',
        'transition-[background-color] duration-2 ease-out',
        'group-hover:[box-shadow:0_0_0_4px_color-mix(in_srgb,var(--accent)_18%,transparent)]',
        playing && 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]',
      )}
    >
      <svg viewBox="0 0 16 16" className="size-3.5 fill-accent">
        {playing ? (
          <>
            <rect x="3.5" y="3" width="3" height="10" rx="0.5" />
            <rect x="9.5" y="3" width="3" height="10" rx="0.5" />
          </>
        ) : (
          <path d="M5 2.8v10.4a.6.6 0 0 0 .9.5l8-5.2a.6.6 0 0 0 0-1L5.9 2.3a.6.6 0 0 0-.9.5Z" />
        )}
      </svg>
    </span>
  )
}

interface ReplayState {
  readonly step: ReplayStep | null
  readonly index: number
  readonly startedAt: number
}

/** Runs the guided replay through `setScenario`; cancelling or unmounting restores a clear drive. */
function useGuidedReplay() {
  const { setScenario, supported } = useScenario()
  const [state, setState] = useState<ReplayState | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const stop = useCallback(() => {
    if (cancelRef.current === null) return
    cancelRef.current()
    cancelRef.current = null
    setScenario('clear')
    setState(null)
  }, [setScenario])

  const start = useCallback(() => {
    cancelRef.current?.()
    const startedAt = Date.now()
    cancelRef.current = runReplay({
      setScenario,
      onStep: (step, index) => {
        setState({ step, index, startedAt })
      },
      onDone: () => {
        cancelRef.current = null
        setState(null)
      },
    })
  }, [setScenario])

  useEffect(
    () => () => {
      if (cancelRef.current !== null) {
        cancelRef.current()
        cancelRef.current = null
        setScenario('clear')
      }
    },
    [setScenario],
  )

  return { state, playing: state !== null, start, stop, supported }
}

function ReplayCaption({ state }: { state: ReplayState | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-part="replay-caption"
      className={cx(
        'flex min-h-11 max-w-[34rem] items-center gap-3 text-14 leading-snug text-text-primary',
        'transition-opacity duration-2 ease-out',
        state === null ? 'opacity-0' : 'opacity-100',
      )}
    >
      {state?.step != null && (
        <>
          <span className="shrink-0 text-11 font-[600] tracking-[0.24em] text-accent tabular-nums [font-stretch:125%]">
            {String(state.index + 1)}/{String(REPLAY_STEPS.length)}
          </span>
          <span>{state.step.caption}</span>
        </>
      )}
    </div>
  )
}

/* ── Live heat stage: blobs behind the console ─────────────────────────── */

/** Last valid frame, re-read once per 1 Hz Display_Tick so the blobs morph at 1 Hz. */
function useTickFrame(): DriveFrame | null {
  const store = useTelemetryStore()
  const seq = useDisplayTick()?.seq ?? 0
  // Also refresh once when the first frame lands, so the blobs need not wait for the first tick.
  const hasFrame = useFrame(hasAnyFrame)
  return useMemo(
    () => (hasFrame ? store.getSnapshot().frame : null),
    // `seq` is the trigger: read the store once per tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, seq, hasFrame],
  )
}

const hasAnyFrame = (f: DriveFrame | null) => f !== null

function LiveBlobs({ className }: { className: string }) {
  const f = useTickFrame()
  if (f === null) return null
  return <HeatBlobs channels={f.thyristors} ambient={f.ambient_temp} seed={4} className={className} />
}

/* ── Hero ──────────────────────────────────────────────────────────────── */

/* Page-local layout knobs, scoped to the hero section. */
const HERO_VARS = {
  '--overview-hero-h': 'clamp(720px, 62vw, 940px)',
  '--overview-hero-pad-top': 'clamp(48px, 5vw, 80px)',
  '--overview-callout-size': 'clamp(20px, 0.9rem + 0.7vw, 26px)',
  '--hero-figure-size': 'clamp(24px, 1rem + 0.9vw, 32px)',
} as CSSProperties

/**
 * Overview hero (Requirements 24.1–24.4, 24.9), composed after the reference
 * landing panel: heat-smear "STAND-04" lockup with the live hottest Tj and a
 * replay button, huge live heat blobs bleeding behind a large isometric
 * console, and the gold editorial callout over the blob.
 */
export function Hero({ entrance }: { entrance?: Entrance }) {
  const hottest = useLiveValue('hottest')
  const intensity = useTransform(hottest, smearIntensity)
  const replay = useGuidedReplay()

  const secondary = (
    <>
      <LiveHottest />
      <button
        type="button"
        aria-pressed={replay.playing}
        disabled={!replay.supported}
        onClick={replay.playing ? replay.stop : replay.start}
        className={cx(
          'group -my-1 flex min-h-11 items-center gap-3 rounded-1 py-1 text-start text-14 font-[600]',
          'text-text-primary outline-none focus-visible:[box-shadow:var(--focus-ring)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <span className="whitespace-nowrap">Watch the virtual sensor work</span>
        <PlayGlyph playing={replay.playing} />
      </button>
    </>
  )

  return (
    <section
      aria-label="Stand-04 overview"
      data-part="overview-hero"
      style={HERO_VARS}
      className="relative isolate flex min-h-[var(--overview-hero-h)] flex-col overflow-hidden rounded-3 bg-surface-panel"
    >
      {/* Warm haze behind the lockup, as in the reference. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46%] [background:radial-gradient(60%_70%_at_50%_100%,color-mix(in_srgb,var(--heat-4)_26%,transparent),transparent_70%)]"
      />

      <motion.div
        {...entrance?.slot('hero')}
        className="relative z-10 flex flex-col items-center gap-2 px-8 pt-[var(--overview-hero-pad-top)]"
      >
        <HeroLockup
          title="STAND-04"
          subtitle="Mill Drive Thyristor Monitor"
          scale="full"
          intensity={intensity}
          secondary={secondary}
        />
        <ReplayCaption state={replay.state} />
      </motion.div>

      {/* Heat stage: blobs bleed off the edges, the console overlaps them bottom-right. */}
      <motion.div {...entrance?.slot('visual')} data-part="overview-stage" className="relative flex-1">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <LiveBlobs className="absolute top-0 -left-[14%] h-full w-[128%]" />
        </div>

        <div className="absolute -right-[8%] -bottom-[5%] w-[110%]">
          <LiveIsometricConsole driveLabel="STAND-04" />
        </div>

        <aside
          data-part="overview-callout"
          className={cx(
            'absolute top-[14%] left-[10%] z-10 max-w-[17.5rem]',
            // Dark frosted plate: the gold heading and white body sit on the pale outer isotherms,
            // where a soft radial scrim left them below text contrast.
            "before:absolute before:-inset-x-6 before:-inset-y-5 before:-z-10 before:rounded-2 before:content-['']",
            'before:[background-color:color-mix(in_srgb,var(--surface-sunken)_82%,transparent)] before:backdrop-blur-md',
          )}
        >
          <h2 className="m-0 text-[length:var(--overview-callout-size)] leading-[1.05] font-[800] text-accent [font-stretch:112%] [text-shadow:2px_2px_0_var(--surface-sunken)]">
            Junction Heat,
            <br />
            Finally Visible
          </h2>
          <p className="m-0 mt-2 text-12 leading-snug font-[600] text-text-primary [text-shadow:0_1px_2px_var(--surface-sunken)]">
            Tj can’t be measured directly, so STAND-04 estimates it from heatsink RTDs and current through a
            Foster thermal model, live for every thyristor.
          </p>
        </aside>
      </motion.div>
    </section>
  )
}
