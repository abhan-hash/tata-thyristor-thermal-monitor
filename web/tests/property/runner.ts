import fc from 'fast-check'
import { test } from 'vitest'

export const FEATURE = 'thermosense-frontend-redesign'
export const DEFAULT_NUM_RUNS = 200

type Env = Readonly<Record<string, string | undefined>>

/** Positive integer from `FC_NUM_RUNS`, else 200. */
export function resolveNumRuns(env: Env = process.env): number {
  const raw = env['FC_NUM_RUNS']
  if (raw === undefined || raw.trim() === '') return DEFAULT_NUM_RUNS
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`FC_NUM_RUNS must be a positive integer, got "${raw}"`)
  }
  return n
}

/** Seed from `FC_SEED` (to replay a counterexample), else a fresh random 32-bit seed. */
export function resolveSeed(env: Env = process.env): number {
  const raw = env['FC_SEED']
  if (raw === undefined || raw.trim() === '') return (Math.random() * 0x100000000) | 0
  const n = Number(raw)
  if (!Number.isInteger(n)) throw new Error(`FC_SEED must be an integer, got "${raw}"`)
  return n | 0
}

export function propertyTestName(n: number, title: string): string {
  return `Feature: ${FEATURE}, Property ${String(n)}: ${title}`
}

/**
 * Registers one Vitest test for design property `n`. Runs `FC_NUM_RUNS`
 * iterations (default 200) and logs the seed so failures can be replayed
 * with `FC_SEED=<seed>`.
 */
export function propertyTest<Ts extends [unknown, ...unknown[]]>(
  n: number,
  title: string,
  property: fc.IProperty<Ts> | fc.IAsyncProperty<Ts>,
  timeoutMs?: number,
): void {
  const name = propertyTestName(n, title)
  test(
    name,
    async () => {
      const numRuns = resolveNumRuns()
      const seed = resolveSeed()
      console.info(`[fast-check] ${name} | seed=${String(seed)} numRuns=${String(numRuns)}`)
      await fc.assert(property, { numRuns, seed })
    },
    timeoutMs,
  )
}
