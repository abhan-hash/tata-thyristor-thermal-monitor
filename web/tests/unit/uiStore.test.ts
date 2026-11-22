import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { statusFor } from '../../src/domain/status'
import type { Thresholds } from '../../src/domain/types'
import {
  bindThresholds,
  getThresholds,
  loadSettings,
  MOCK_SESSION_USER,
  resetUiStore,
  SETTINGS_STORAGE_KEY,
  useThresholds,
  useUiStore,
} from '../../src/state/uiStore'

beforeEach(() => {
  localStorage.clear()
  resetUiStore()
})

describe('uiStore settings', () => {
  it('starts from defaults with a clean draft', () => {
    const { saved, draft } = useUiStore.getState()
    expect(saved.thresholds.junction_temp.critical).toBe(125)
    expect(draft).toEqual(saved)
    expect(draft).not.toBe(saved)
  })

  it('save persists to localStorage and applies thresholds; refuses invalid drafts', () => {
    const ui = useUiStore.getState()
    ui.setBandValue('junction_temp', 'warning', 130)
    expect(useUiStore.getState().save()).toBe(false)
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull()

    ui.setBandValue('junction_temp', 'warning', 100)
    expect(useUiStore.getState().save()).toBe(true)
    expect(getThresholds().junction_temp.warning).toBe(100)
    expect(statusFor(105, getThresholds().junction_temp)).toBe('warning')
    expect(loadSettings().thresholds.junction_temp.warning).toBe(100)

    // A fresh load reads the persisted settings.
    resetUiStore()
    expect(useUiStore.getState().saved.thresholds.junction_temp.warning).toBe(100)
  })

  it('discard restores the draft to the saved settings', () => {
    useUiStore.getState().setDisplay({ chartWindowS: 300 })
    useUiStore.getState().setScenarioDefaults({ scenario: 'overload' })
    useUiStore.getState().discard()
    const { draft, saved } = useUiStore.getState()
    expect(draft).toEqual(saved)
  })

  it('ignores corrupt localStorage', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json')
    resetUiStore()
    expect(getThresholds().junction_temp.warning).toBe(110)
  })

  it('useThresholds re-renders on save and bindThresholds pushes to the sink', () => {
    const received: Readonly<Thresholds>[] = []
    const unbind = bindThresholds({ setThresholds: (t) => received.push(t) })
    const { result } = renderHook(() => useThresholds())
    expect(result.current.heatsink_temp.warning).toBe(80)

    act(() => {
      useUiStore.getState().setBandValue('heatsink_temp', 'warning', 78)
    })
    expect(received).toHaveLength(1) // draft edits do not apply
    act(() => {
      useUiStore.getState().save()
    })
    expect(result.current.heatsink_temp.warning).toBe(78)
    expect(received.at(-1)?.heatsink_temp.warning).toBe(78)
    unbind()
  })
})

describe('uiStore session state', () => {
  it('records acknowledgements with the mock session user', () => {
    useUiStore.getState().acknowledge('evt-1', { at: '2026-11-21T10:00:00.000Z' })
    expect(useUiStore.getState().acks['evt-1']).toEqual({
      by: MOCK_SESSION_USER.name,
      at: '2026-11-21T10:00:00.000Z',
    })
  })

  it('marks entrances as played', () => {
    expect(useUiStore.getState().entrancePlayed.overview).toBeUndefined()
    useUiStore.getState().markEntrancePlayed('overview')
    expect(useUiStore.getState().entrancePlayed.overview).toBe(true)
  })
})
