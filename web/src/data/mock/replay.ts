// MOCK DATA – synthetic, not plant telemetry
// Guided replay for the Overview play button (Requirement 24.2): a 20 s script
// that drives the mock source through bar entry, fan failure and recovery via
// `setScenario`, with a caption per step. Timing uses injectable timers so
// tests can run it with fake timers.
import type { Scenario } from '../../domain/types'

export interface ReplayStep {
  /** Offset from the start of the replay, ms. */
  readonly atMs: number
  readonly scenario: Scenario
  readonly caption: string
}

/** Total replay length, ms. */
export const REPLAY_DURATION_MS = 20_000

export const REPLAY_STEPS: readonly ReplayStep[] = Object.freeze([
  {
    atMs: 0,
    scenario: 'bar_entry',
    caption: 'Bar entry: the armature current spikes and junction heat jumps within a second.',
  },
  {
    atMs: 6_000,
    scenario: 'fan_failure',
    caption: 'Fan failure: heatsink cooling drops, so Tj keeps climbing toward the trip.',
  },
  {
    atMs: 13_000,
    scenario: 'clear',
    caption: 'Recovery: cooling is restored and Tj settles back to its normal band.',
  },
])

export interface ReplayHandlers {
  readonly setScenario: (s: Scenario) => void
  /** Called with each step as it starts. */
  readonly onStep?: (step: ReplayStep, index: number) => void
  /** Called once when the replay reaches its end (not when cancelled). */
  readonly onDone?: () => void
}

export interface ReplayTimers {
  readonly setTimeout: (fn: () => void, ms: number) => unknown
  readonly clearTimeout: (handle: unknown) => void
}

const DEFAULT_TIMERS: ReplayTimers = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (h) => {
    globalThis.clearTimeout(h as ReturnType<typeof globalThis.setTimeout>)
  },
}

/**
 * Starts the replay. Step 0 runs synchronously. Returns a cancel function
 * that stops pending steps without calling `onDone`.
 */
export function runReplay(
  handlers: ReplayHandlers,
  steps: readonly ReplayStep[] = REPLAY_STEPS,
  durationMs: number = REPLAY_DURATION_MS,
  timers: ReplayTimers = DEFAULT_TIMERS,
): () => void {
  const pending: unknown[] = []
  let cancelled = false
  const fire = (step: ReplayStep, index: number) => {
    if (cancelled) return
    handlers.setScenario(step.scenario)
    handlers.onStep?.(step, index)
  }
  steps.forEach((step, index) => {
    if (step.atMs <= 0) fire(step, index)
    else
      pending.push(
        timers.setTimeout(() => {
          fire(step, index)
        }, step.atMs),
      )
  })
  pending.push(
    timers.setTimeout(() => {
      if (!cancelled) handlers.onDone?.()
    }, durationMs),
  )
  return () => {
    cancelled = true
    for (const h of pending) timers.clearTimeout(h)
  }
}
