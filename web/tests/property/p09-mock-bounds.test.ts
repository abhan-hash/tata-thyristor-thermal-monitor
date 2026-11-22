import fc from 'fast-check'
import { describe } from 'vitest'
import { MODEL_PARAMS } from '../../src/domain/thresholds'
import type { DriveFrame, Scenario } from '../../src/domain/types'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { propertyTest } from './runner'

/**
 * Property 9: Mock physical bounds.
 * For any seed, scenario sequence and run length ≤ 3000 ticks, every frame satisfies:
 * ambient in [30, 40] °C; heatsink ≥ ambient − 0.5; tj_estimated ≥ t_heatsink_measured − 0.5
 * for healthy channels; tj ≤ 160 °C; power_loss ≥ 0; armature current in [0, 1.6 × rated];
 * timestamps strictly increasing by 100 ms ± 1 ms.
 *
 * **Validates: Requirements 10.1, 10.7**
 */

/** Fixed sim epoch so timestamps do not depend on the wall clock. */
const EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0)
const MAX_TICKS = 3000
const SCENARIOS: readonly Scenario[] = ['normal', 'bar_entry', 'fan_failure', 'clogging', 'overload', 'clear']
const RATED = MODEL_PARAMS.rated_current

interface ScriptStep {
  readonly tick: number
  readonly scenario: Scenario
  readonly severity: number | undefined
}

const scriptStep: fc.Arbitrary<ScriptStep> = fc.record({
  tick: fc.integer({ min: 0, max: MAX_TICKS }),
  scenario: fc.constantFrom(...SCENARIOS),
  severity: fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
})

const input = fc.record({
  seed: fc.integer(),
  length: fc.integer({ min: 1, max: MAX_TICKS }),
  script: fc.array(scriptStep, { maxLength: 8 }),
})

/** Runs `length` ticks, applying each script step just before its tick index. */
function runScript(seed: number, length: number, script: readonly ScriptStep[]): DriveFrame[] {
  const source = new MockTelemetrySource({ seed, epochMs: EPOCH_MS })
  const ordered = [...script].filter((s) => s.tick < length).sort((a, b) => a.tick - b.tick)
  const frames: DriveFrame[] = []
  let at = 0
  for (const s of ordered) {
    frames.push(...source.runTicks(s.tick - at))
    at = s.tick
    source.setScenario(s.scenario, s.severity)
  }
  frames.push(...source.runTicks(length - at))
  return frames
}

function checkFrame(f: DriveFrame, i: number): void {
  const where = `frame ${String(i)}`
  if (!(f.ambient_temp >= 30 && f.ambient_temp <= 40)) throw new Error(`${where}: ambient ${String(f.ambient_temp)}`)
  if (!(f.armature_current >= 0 && f.armature_current <= 1.6 * RATED)) {
    throw new Error(`${where}: armature current ${String(f.armature_current)}`)
  }
  for (const th of f.thyristors) {
    const ch = `${where} ch${String(th.id)}`
    if (!(th.t_heatsink_measured >= f.ambient_temp - 0.5)) {
      throw new Error(`${ch}: heatsink ${String(th.t_heatsink_measured)} < ambient ${String(f.ambient_temp)} − 0.5`)
    }
    if (th.sensor_healthy && !(th.tj_estimated >= th.t_heatsink_measured - 0.5)) {
      throw new Error(`${ch}: tj ${String(th.tj_estimated)} < heatsink ${String(th.t_heatsink_measured)} − 0.5`)
    }
    if (!(th.tj_estimated <= 160)) throw new Error(`${ch}: tj ${String(th.tj_estimated)} > 160`)
    if (!(th.power_loss >= 0)) throw new Error(`${ch}: power_loss ${String(th.power_loss)}`)
  }
}

describe('mock telemetry source', () => {
  propertyTest(
    9,
    'Mock physical bounds',
    fc.property(input, ({ seed, length, script }) => {
      const frames = runScript(seed, length, script)
      if (frames.length !== length) throw new Error(`expected ${String(length)} frames, got ${String(frames.length)}`)
      let prev: number | undefined
      frames.forEach((f, i) => {
        checkFrame(f, i)
        const t = Date.parse(f.timestamp)
        if (!Number.isFinite(t)) throw new Error(`frame ${String(i)}: bad timestamp ${f.timestamp}`)
        if (prev !== undefined && Math.abs(t - prev - 100) > 1) {
          throw new Error(`frame ${String(i)}: step ${String(t - prev)} ms`)
        }
        prev = t
      })
    }),
    120_000,
  )
})
