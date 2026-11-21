// React bindings for the TelemetryStore (Requirements 8.1, 11.3, 11.4).
//
// - Components read live telemetry only through these hooks, which read only
//   through the store, which reads only through the TelemetrySource port.
// - Slice hooks use `useSyncExternalStore` over the store's slice
//   subscriptions, so a component re-renders only when its selected value
//   changes under the given equality.
// - `useLiveValue` returns a MotionValue and never re-renders: bind it to SVG
//   attributes or text with `motion` so 10 Hz updates skip React.
import type { MotionValue } from 'motion'
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { AlarmEvent, ChannelId, ConnectionStatus, DriveFrame, Scenario, ThyristorFrame } from '../domain/types'
import type {
  ChannelField,
  DisplayTick,
  DriveField,
  Equality,
  Selector,
  TelemetrySnapshot,
  TelemetryStore,
} from './store'

const TelemetryContext = createContext<TelemetryStore | null>(null)

export interface TelemetryProviderProps {
  readonly store: TelemetryStore
  /** Start the store on mount and stop it on unmount. Default true. */
  readonly autoStart?: boolean
  readonly children?: ReactNode
}

/** Provides the store to the tree and, by default, owns its start/stop lifecycle. */
export function TelemetryProvider({ store, autoStart = true, children }: TelemetryProviderProps) {
  useEffect(() => {
    if (!autoStart) return
    store.start()
    return () => {
      store.stop()
    }
  }, [store, autoStart])
  return createElement(TelemetryContext.Provider, { value: store }, children)
}

/** The store from context. Throws outside a TelemetryProvider. */
export function useTelemetryStore(): TelemetryStore {
  const store = useContext(TelemetryContext)
  if (store === null) throw new Error('useTelemetryStore must be used inside <TelemetryProvider>')
  return store
}

/** Shallow equality for plain objects and arrays (one level, `Object.is` per entry). */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false
  }
  return true
}

interface SelectionCache<T> {
  has: boolean
  snap: TelemetrySnapshot | null
  selector: Selector<T> | null
  value: T | undefined
}

/**
 * Selects a slice of the store snapshot. Re-renders only when the slice changes
 * under `isEqual` (default `Object.is`). Selectors may be inline: the previous
 * value is kept while it stays equal, so object-returning selectors are safe
 * with an equality such as `shallowEqual`.
 */
export function useTelemetry<T>(selector: Selector<T>, isEqual: Equality<T> = Object.is): T {
  const store = useTelemetryStore()
  const cacheRef = useRef<SelectionCache<T>>({ has: false, snap: null, selector: null, value: undefined })

  const subscribe = useCallback(
    (onChange: () => void) =>
      store.subscribe(
        selector,
        () => {
          onChange()
        },
        isEqual,
      ),
    [store, selector, isEqual],
  )

  const getSnapshot = useCallback((): T => {
    const cache = cacheRef.current
    const snap = store.getSnapshot()
    if (cache.has && cache.snap === snap && cache.selector === selector) return cache.value as T
    const next = selector(snap)
    cache.snap = snap
    cache.selector = selector
    if (cache.has && isEqual(cache.value as T, next)) return cache.value as T
    cache.has = true
    cache.value = next
    return next
  }, [store, selector, isEqual])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

const identity = <T>(x: T): T => x

/** Selects from the last valid frame (null before the first one). Without a selector, returns the frame. */
export function useFrame(): DriveFrame | null
export function useFrame<T>(selector: (f: DriveFrame | null) => T, isEqual?: Equality<T>): T
export function useFrame<T>(
  selector: (f: DriveFrame | null) => T = identity as (f: DriveFrame | null) => T,
  isEqual: Equality<T> = Object.is,
): T {
  const select = useCallback((s: TelemetrySnapshot) => selector(s.frame), [selector])
  return useTelemetry(select, isEqual)
}

/**
 * Selects from one channel of the last valid frame (null before the first
 * frame). Without a selector, returns the channel frame, which changes identity
 * on every frame.
 */
export function useChannel(id: ChannelId): ThyristorFrame | null
export function useChannel<T>(id: ChannelId, selector: (ch: ThyristorFrame | null) => T, isEqual?: Equality<T>): T
export function useChannel<T>(
  id: ChannelId,
  selector: (ch: ThyristorFrame | null) => T = identity as (ch: ThyristorFrame | null) => T,
  isEqual: Equality<T> = Object.is,
): T {
  const select = useCallback(
    (s: TelemetrySnapshot) => selector(s.frame?.thyristors[id - 1] ?? null),
    [id, selector],
  )
  return useTelemetry(select, isEqual)
}

/** A windowed copy of one ring-buffer series, aligned with its timestamps. */
export interface SeriesWindow {
  /** Frame timestamps (epoch ms), oldest first. */
  readonly t: Float64Array
  /** Values, index-aligned with `t`. */
  readonly v: Float32Array
  /** Store `seriesRevision` the window was read at. */
  readonly revision: number
}

/** Number of trailing samples whose timestamp lies within `windowMs` of the newest one. */
function samplesWithin(time: ReturnType<TelemetryStore['timeSeries']>, windowMs: number): number {
  const n = time.length
  if (n === 0) return 0
  if (!Number.isFinite(windowMs)) return n
  const newest = time.at(n - 1) ?? 0
  const cutoff = newest - windowMs
  let count = 0
  for (let i = n - 1; i >= 0; i--) {
    const t = time.at(i)
    if (t === undefined || t < cutoff) break
    count++
  }
  return count
}

/**
 * The last `windowS` seconds of a series (by frame timestamp). Pass a channel
 * id with a ChannelField, or `'drive'` with a DriveField. Re-renders on every
 * valid frame; the arrays are fresh copies per revision.
 */
export function useSeries(id: ChannelId, field: ChannelField, windowS: number): SeriesWindow
export function useSeries(id: 'drive', field: DriveField, windowS: number): SeriesWindow
export function useSeries(id: ChannelId | 'drive', field: ChannelField | DriveField, windowS: number): SeriesWindow {
  const store = useTelemetryStore()
  const revision = useTelemetry(selectSeriesRevision)
  return useMemo(() => {
    const buffer =
      id === 'drive' ? store.driveSeries(field as DriveField) : store.channelSeries(id, field as ChannelField)
    const time = store.timeSeries()
    const count = samplesWithin(time, windowS * 1000)
    return { t: time.window(count), v: buffer.window(count), revision }
  }, [store, id, field, windowS, revision])
}

const selectSeriesRevision = (s: TelemetrySnapshot) => s.seriesRevision
const selectActiveAlarms = (s: TelemetrySnapshot) => s.activeAlarms
const selectAlarmLog = (s: TelemetrySnapshot) => s.alarmLog
const selectDisplayTick = (s: TelemetrySnapshot) => s.displayTick
const selectScenario = (s: TelemetrySnapshot) => s.scenario

/** Currently raised alarms. Identity is kept while the set and peaks are unchanged. */
export function useAlarms(): readonly AlarmEvent[] {
  return useTelemetry(selectActiveAlarms)
}

/** Raised and cleared alarm events from this session, oldest first. */
export function useAlarmLog(): readonly AlarmEvent[] {
  return useTelemetry(selectAlarmLog)
}

export interface ConnectionInfo {
  readonly status: ConnectionStatus
  /** Wall-clock ms of the last valid frame, or null before the first one. */
  readonly lastFrameAt: number | null
  /** Frames rejected by the decoder. */
  readonly droppedFrames: number
}

const selectConnection = (s: TelemetrySnapshot): ConnectionInfo => ({
  status: s.connection,
  lastFrameAt: s.lastFrameAt,
  droppedFrames: s.droppedFrames,
})

/** Connection status, last valid frame time and dropped-frame count. */
export function useConnection(): ConnectionInfo {
  return useTelemetry(selectConnection, shallowEqual)
}

/** The latest 1 Hz Display_Tick (peak-hold readouts), or null before the first tick. */
export function useDisplayTick(): DisplayTick | null {
  return useTelemetry(selectDisplayTick)
}

/** Keys into the store's live MotionValues. Channel keys are 1-based (`tj.1` = T1). */
export type LiveKey =
  | 'hottest'
  | 'armature'
  | 'ambient'
  | 'airflow'
  | `tj.${ChannelId}`
  | `heatsink.${ChannelId}`

/** Resolves a LiveKey against a store's live values. */
export function liveValue(store: TelemetryStore, key: LiveKey): MotionValue<number> {
  const live = store.live
  switch (key) {
    case 'hottest':
    case 'armature':
    case 'ambient':
    case 'airflow':
      return live[key]
  }
  const [group, ch] = key.split('.') as ['tj' | 'heatsink', string]
  const mv = live[group][Number(ch) - 1]
  if (mv === undefined) throw new RangeError(`unknown live key ${key}`)
  return mv
}

/** The MotionValue for `key`. Stable for the store's lifetime; never causes a re-render. */
export function useLiveValue(key: LiveKey): MotionValue<number> {
  const store = useTelemetryStore()
  return liveValue(store, key)
}

/** `mock` or `ws`, for the MOCK badge (Requirement 8.4). */
export function useSourceKind(): TelemetryStore['kind'] {
  return useTelemetryStore().kind
}

export interface ScenarioControl {
  readonly scenario: Scenario
  /** False when the source does not support scenario control; `setScenario` is then a no-op. */
  readonly supported: boolean
  readonly setScenario: (s: Scenario, severity?: number) => void
}

/** The current demo scenario and a setter that forwards to the source. */
export function useScenario(): ScenarioControl {
  const store = useTelemetryStore()
  const scenario = useTelemetry(selectScenario)
  const setScenario = useCallback(
    (s: Scenario, severity?: number) => {
      store.setScenario(s, severity)
    },
    [store],
  )
  const supported = store.source.setScenario !== undefined
  return useMemo(() => ({ scenario, supported, setScenario }), [scenario, supported, setScenario])
}
