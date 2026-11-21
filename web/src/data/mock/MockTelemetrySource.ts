// MOCK DATA – synthetic, not plant telemetry
// TelemetrySource backed by the seeded Foster simulation (Requirements 10.1, 10.2, 10.6, 12.1).
// Frame timestamps come from the sim clock (+100 ms per tick), never from the
// wall clock, so timer jitter cannot affect them and runs replay exactly.

import { MODEL_PARAMS } from '../../domain/thresholds'
import type { ConnectionStatus, DriveFrame, ModelParams, Scenario } from '../../domain/types'
import type { TelemetrySource } from '../ports'
import { initialSimState, step, type FosterSimState } from './fosterSim'
import { mulberry32, type Rng } from './rng'
import { INITIAL_SCENARIO_STATE, advanceScenario, applyScenario, type ScenarioState } from './scenarios'

/** Tick interval, ms (10 Hz). */
export const MOCK_TICK_MS = 100

export interface MockTelemetryOptions {
  /** PRNG seed. Equal seeds and scenario scripts give equal frame sequences. */
  readonly seed: number
  /** Wall-clock instant of sim time 0, ms since the Unix epoch. Defaults to `Date.now()` at construction. */
  readonly epochMs?: number
  readonly params?: Readonly<ModelParams>
}

export class MockTelemetrySource implements TelemetrySource {
  readonly kind = 'mock' as const

  private readonly rng: Rng
  private readonly params: Readonly<ModelParams>
  private sim: FosterSimState
  private scenarioState: ScenarioState = INITIAL_SCENARIO_STATE
  private current: Scenario = 'normal'
  private status: ConnectionStatus = 'offline'
  private timer: ReturnType<typeof setInterval> | undefined
  private readonly frameListeners = new Set<(f: DriveFrame) => void>()
  private readonly statusListeners = new Set<(s: ConnectionStatus) => void>()

  constructor(options: MockTelemetryOptions) {
    this.rng = mulberry32(options.seed)
    this.params = options.params ?? MODEL_PARAMS
    this.sim = initialSimState(this.params, options.epochMs ?? Date.now())
  }

  /** The most recently applied scenario. */
  get scenario(): Scenario {
    return this.current
  }

  /** Begins emitting a frame every 100 ms. Status goes `connecting`, then `live` with the first frame. */
  start(): void {
    if (this.timer !== undefined) return
    this.setStatus('connecting')
    this.timer = setInterval(() => {
      this.tick()
    }, MOCK_TICK_MS)
  }

  /** Stops the interval and reports `offline`. The sim state is kept, so a restart continues the run. */
  stop(): void {
    if (this.timer === undefined) return
    clearInterval(this.timer)
    this.timer = undefined
    this.setStatus('offline')
  }

  subscribe(onFrame: (f: DriveFrame) => void): () => void {
    this.frameListeners.add(onFrame)
    return () => {
      this.frameListeners.delete(onFrame)
    }
  }

  /** Registers a status listener and immediately replays the current status to it. */
  onStatus(cb: (s: ConnectionStatus) => void): () => void {
    this.statusListeners.add(cb)
    cb(this.status)
    return () => {
      this.statusListeners.delete(cb)
    }
  }

  /** Applies a scenario from the next tick on. `severity` in [0, 1] scales the effect (default 1). */
  setScenario(s: Scenario, severity?: number): void {
    const result = applyScenario(this.sim, this.scenarioState, s, severity)
    this.sim = result.sim
    this.scenarioState = result.scenario
    this.current = s
  }

  /**
   * Synchronously advances `n` ticks, notifying subscribers of each frame, and
   * returns the frames. For tests; it does not touch the connection status.
   */
  runTicks(n: number): DriveFrame[] {
    if (!Number.isInteger(n) || n < 0) throw new RangeError(`n must be a non-negative integer, got ${String(n)}`)
    const frames: DriveFrame[] = []
    for (let i = 0; i < n; i++) frames.push(this.advance())
    return frames
  }

  private tick(): void {
    if (this.status !== 'live') this.setStatus('live')
    this.advance()
  }

  private advance(): DriveFrame {
    const dt = MOCK_TICK_MS / 1000
    const advanced = advanceScenario(this.sim, this.scenarioState, dt)
    const result = step(advanced.sim, dt, this.rng, this.params)
    this.sim = result.state
    this.scenarioState = advanced.scenario
    for (const listener of [...this.frameListeners]) listener(result.frame)
    return result.frame
  }

  private setStatus(next: ConnectionStatus): void {
    this.status = next
    for (const listener of [...this.statusListeners]) listener(next)
  }
}
