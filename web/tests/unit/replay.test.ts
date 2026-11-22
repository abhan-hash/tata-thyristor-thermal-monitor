import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { REPLAY_DURATION_MS, REPLAY_STEPS, runReplay } from '../../src/data/mock/replay'
import type { Scenario } from '../../src/domain/types'

describe('runReplay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs bar entry, fan failure, then recovery within 20 s, with captions', () => {
    const calls: Scenario[] = []
    const captions: string[] = []
    const onDone = vi.fn()
    runReplay({ setScenario: (s) => calls.push(s), onStep: (st) => captions.push(st.caption), onDone })
    expect(calls).toEqual(['bar_entry'])
    vi.advanceTimersByTime(REPLAY_DURATION_MS - 1)
    expect(calls).toEqual(['bar_entry', 'fan_failure', 'clear'])
    expect(captions).toEqual(REPLAY_STEPS.map((s) => s.caption))
    expect(onDone).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onDone).toHaveBeenCalledOnce()
    expect(REPLAY_DURATION_MS).toBe(20_000)
  })

  it('cancel stops pending steps and skips onDone', () => {
    const calls: Scenario[] = []
    const onDone = vi.fn()
    const cancel = runReplay({ setScenario: (s) => calls.push(s), onDone })
    vi.advanceTimersByTime(7_000)
    cancel()
    vi.advanceTimersByTime(REPLAY_DURATION_MS)
    expect(calls).toEqual(['bar_entry', 'fan_failure'])
    expect(onDone).not.toHaveBeenCalled()
  })
})
