import { create } from 'zustand'
import {
  canSave,
  cloneSettings,
  settingsFrom,
  type BandField,
  type BandKey,
  type DisplaySettings,
  type ScenarioDefaults,
  type Settings,
} from '../domain/settings'
import type { Thresholds } from '../domain/types'

/**
 * UI store (Zustand). Low-frequency UI state kept apart from telemetry:
 * saved settings (persisted to `localStorage`), the settings draft, the mock
 * session user, acknowledgement state and once-per-session entrance flags.
 */

/** `localStorage` key for saved settings. Bump the suffix on incompatible changes. */
export const SETTINGS_STORAGE_KEY = 'thermosense.settings.v1'

/** Mock session user. Real authentication belongs to the backend phase; no credentials are stored. */
export interface SessionUser {
  readonly id: string
  readonly name: string
  readonly role: 'operator' | 'engineer'
}

export const MOCK_SESSION_USER: SessionUser = Object.freeze({
  id: 'demo.engineer',
  name: 'Demo Engineer',
  role: 'engineer',
})

export interface Acknowledgement {
  readonly by: string
  /** ISO 8601 */
  readonly at: string
}

export interface UiState {
  /** Last saved settings. Thresholds here are what classification and alarms use. */
  readonly saved: Settings
  /** Settings being edited on the Settings page. */
  readonly draft: Settings
  readonly sessionUser: SessionUser
  /** Acknowledgements by alarm event id. */
  readonly acks: Readonly<Record<string, Acknowledgement>>
  /** Pages whose entrance has played this session. */
  readonly entrancePlayed: Readonly<Record<string, boolean>>

  /** Sets one band field in the draft. */
  setBandValue(key: BandKey, field: BandField, value: number): void
  /** Replaces the draft with a copy of `draft`. */
  setDraft(draft: Settings): void
  setDisplay(patch: Partial<DisplaySettings>): void
  setScenarioDefaults(patch: Partial<ScenarioDefaults>): void
  /** Persists and applies the draft when `canSave`. Returns whether it saved. */
  save(): boolean
  /** Restores the draft to the saved settings. */
  discard(): void
  acknowledge(eventId: string, ack?: Partial<Acknowledgement>): void
  markEntrancePlayed(pageKey: string): void
}

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    // Access can throw (e.g. disabled storage); run without persistence.
    return undefined
  }
}

/** Reads saved settings from `localStorage`; defaults when missing, corrupt or invalid. */
export function loadSettings(store: Storage | undefined = storage()): Settings {
  try {
    const raw = store?.getItem(SETTINGS_STORAGE_KEY)
    return settingsFrom(raw == null ? undefined : JSON.parse(raw))
  } catch {
    return settingsFrom(undefined)
  }
}

/** Writes settings to `localStorage`. Returns false when storage is unavailable or full. */
export function persistSettings(settings: Readonly<Settings>, store: Storage | undefined = storage()): boolean {
  if (!store) return false
  try {
    store.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}

function initialState(): Pick<UiState, 'saved' | 'draft' | 'sessionUser' | 'acks' | 'entrancePlayed'> {
  const saved = loadSettings()
  return { saved, draft: cloneSettings(saved), sessionUser: MOCK_SESSION_USER, acks: {}, entrancePlayed: {} }
}

export const useUiStore = create<UiState>()((set, get) => ({
  ...initialState(),

  setBandValue(key, field, value) {
    const draft = cloneSettings(get().draft)
    draft.thresholds[key][field] = value
    set({ draft })
  },

  setDraft(draft) {
    set({ draft: cloneSettings(draft) })
  },

  setDisplay(patch) {
    const draft = cloneSettings(get().draft)
    draft.display = { ...draft.display, ...patch }
    set({ draft })
  },

  setScenarioDefaults(patch) {
    const draft = cloneSettings(get().draft)
    draft.scenarioDefaults = { ...draft.scenarioDefaults, ...patch }
    set({ draft })
  },

  save() {
    const { draft, saved } = get()
    if (!canSave(draft, saved)) return false
    const next = cloneSettings(draft)
    persistSettings(next)
    set({ saved: next, draft: cloneSettings(next) })
    return true
  },

  discard() {
    set({ draft: cloneSettings(get().saved) })
  },

  acknowledge(eventId, ack = {}) {
    const entry: Acknowledgement = {
      by: ack.by ?? get().sessionUser.name,
      at: ack.at ?? new Date().toISOString(),
    }
    set({ acks: { ...get().acks, [eventId]: entry } })
  },

  markEntrancePlayed(pageKey) {
    if (get().entrancePlayed[pageKey]) return
    set({ entrancePlayed: { ...get().entrancePlayed, [pageKey]: true } })
  },
}))

/** Re-reads `localStorage` and clears session state. For tests. */
export function resetUiStore(): void {
  useUiStore.setState(initialState())
}

/** Saved thresholds, outside React. */
export function getThresholds(): Readonly<Thresholds> {
  return useUiStore.getState().saved.thresholds
}

/** Saved thresholds. Re-renders when settings are saved, so status classification follows immediately. */
export function useThresholds(): Readonly<Thresholds> {
  return useUiStore((s) => s.saved.thresholds)
}

/** Anything that accepts a threshold set, such as the Telemetry_Store's alarm engine. */
export interface ThresholdsSink {
  setThresholds(thresholds: Readonly<Thresholds>): void
}

/**
 * Applies the saved thresholds to `sink` now and after every save, so the
 * alarm engine uses new limits from the next frame. Returns an unsubscribe.
 */
export function bindThresholds(sink: ThresholdsSink): () => void {
  sink.setThresholds(getThresholds())
  return useUiStore.subscribe((state, prev) => {
    if (state.saved.thresholds !== prev.saved.thresholds) sink.setThresholds(state.saved.thresholds)
  })
}
