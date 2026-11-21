import fc from 'fast-check'
import { describe, expect } from 'vitest'
import type { DriveFrame, Scenario } from '../../src/domain/types'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { propertyTest } from './runner'

/**
 * Property 10: Mock determinism.
 * The same seed and scenario script produce identical frame sequences.
 *
 * **Validates: Requirements 10.2**
 */

const SCENARIOS: readonly Scenario[] = ['normal', 'bar_entry', 'fan_failure', 'clogging', 'overload', 'clear']

/** One script step: optionally switch scenario (with optional severity), then run some ticks. */
interface ScriptStep {
  readonly scenario?: { readonly s: Scenario; readonly severity?: number }
  readonly ticks: number
}

const stepArb: fc.Arbitrary<ScriptStep> = fc.record(
  {
    scenario: fc.record(
      {
        s: fc.constantFrom(...SCENARIOS),
        severity: fc.double({ min: 0, max: 1, noNaN: true }),
      },
      { requiredKeys: ['s'] },
    ),
    ticks: fc.integer({ min: 0, max: 40 }),
  },
  { requiredKeys: ['ticks'] },
)

const scriptArb = fc.array(stepArb, { minLength: 1, maxLength: 8 })

/** Fixed sim epoch so the two sources do not depend on `Date.now()`. */
const epochArb = fc.integer({ min: 0, max: 4_102_444_800_000 })

function run(seed: number, epochMs: number, script: readonly ScriptStep[]): DriveFrame[] {
  const source = new MockTelemetrySource({ seed, epochMs })
  const frames: DriveFrame[] = []
  for (const step of script) {
    if (step.scenario !== undefined) source.setScenario(step.scenario.s, step.scenario.severity)
    frames.push(...source.runTicks(step.ticks))
  }
  return frames
}

describe('MockTelemetrySource determinism', () => {
  propertyTest(
    10,
    'Mock determinism',
    fc.property(fc.integer(), epochArb, scriptArb, (seed, epochMs, script) => {
      const a = run(seed, epochMs, script)
      const b = run(seed, epochMs, script)
      expect(a.length).toBe(script.reduce((n, s) => n + s.ticks, 0))
      expect(b).toStrictEqual(a)
    }),
    60_000,
  )
})
