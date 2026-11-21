import { motionValue, type MotionValue } from 'motion'
import { activeAlarms, createAlarmState, evaluate, type AlarmState } from '../domain/alarmEngine'
import { decodeDriveFrame, type DecodeError, type DecodeLogger } from '../domain/decode'
import { hottestTj } from '../domain/derive'
import { DEFAULT_THRESHOLDS, MODEL_PARAMS } from '../domain/thresholds'
import type {
  AlarmEvent,
  ChannelId,
  ConnectionStatus,
  DriveFrame,
  Scenario,
  Thresholds,
} from '../domain/types'
import type { TelemetrySource } from './ports'
import { RingBuffer } from './ringBuffer'

/**
 * Telemetry_Store (Requirements 9.9, 11, 12). A plain TS external store for
 * `useSyncExternalStore`.
 *
 * - Every frame from the source is decoded. Invalid frames are dropped, the
 *   last good frame is kept and `droppedFrames` is incremented.
 * - Valid frames are pushed into per-channel ring buffers (3000 samples), run
 *   through the alarm engine and written to the MotionValue map.
 * - Connection status follows the source, except that the store enters
 *   `stale` when no valid frame has arrived for more than 1 s and returns to
 *   `live` on the next valid frame.
 * - A 1 Hz Display_Tick carries the per-channel peak over the preceding 1 s.
 *
 * State is an immutable snapshot replaced on every change. Slice subscribers
 * are notified only when their selected value changes under their equality.
 */

/** Samples held per series: 5 min at 10 Hz. */
export const SERIES_CAPACITY = 3000
/** No valid frame for longer than this (ms) means `stale`. */
export const STALE_AFTER_MS = 1000
/** How often the stale condition is checked (ms). */
export const STALE_CHECK_MS = 100
/** Display_Tick period (ms), `display_frequency: 1`. */
export const DISPLAY_TICK_MS = 1000
/** Raised/cleared alarm events kept in `snapshot.alarmLog`. */
export const ALARM_LOG_LIMIT = 200

export const CHANNEL_IDS: readonly ChannelId[] = [1, 2, 3, 4, 5, 6]

/** Per-channel series held in ring buffers. */
export type ChannelField = 'tj' | 'heatsink' | 'residual' | 'power' | 'current'
/** Drive-level series held in ring buffers. */
export type DriveField = 'hottest' | 'armature' | 'ambient' | 'airflow'

export const CHANNEL_FIELDS: readonly ChannelField[] = ['tj', 'heatsink', 'residual', 'power', 'current']
export const DRIVE_FIELDS: readonly DriveField[] = ['hottest', 'armature', 'ambient', 'airflow']

export type ChannelTuple<T> = readonly [T, T, T, T, T, T]

/** Peak-hold readout values for the 1 s window ending at `at`. */
export interface DisplayTick {
  /** Increments on every tick, starting at 1. */
  readonly seq: number
  /** Wall-clock ms at which the tick fired. */
  readonly at: number
  /** Valid frames received in the window. 0 means the values are carried over from the previous tick. */
  readonly frames: number
  /** Peak Tj per channel (index 0 = T1). NaN when the channel had no finite sample. */
  readonly tj: ChannelTuple<number>
  /** Peak heatsink temperature per channel (index 0 = T1). */
  readonly heatsink: ChannelTuple<number>
  readonly hottest: number
  readonly armature: number
  readonly ambient: number
}

export interface TelemetrySnapshot {
  /** Last valid decoded frame, or null before the first one. */
  readonly frame: DriveFrame | null
  readonly connection: ConnectionStatus
  /** Wall-clock ms of the last valid frame, or null before the first one. */
  readonly lastFrameAt: number | null
  /** Frames rejected by the decoder since construction. */
  readonly droppedFrames: number
  /** Most recent decoder error, for the dev overlay. */
  readonly lastDecodeError: DecodeError | null
  readonly alarmState: AlarmState
  /** Currently raised alarms. Identity is kept while the set and peaks are unchanged. */
  readonly activeAlarms: readonly AlarmEvent[]
  /** Raised and cleared events in arrival order (oldest first), capped at ALARM_LOG_LIMIT. */
  readonly alarmLog: readonly AlarmEvent[]
  readonly displayTick: DisplayTick | null
  /** Increments with every push into the ring buffers, for memoising series reads. */
  readonly seriesRevision: number
  readonly scenario: Scenario
}

/** Live values written on every valid frame. Bind these to SVG attributes and text. */
export interface LiveValues {
  /** Tj per channel, index 0 = T1. */
  readonly tj: ChannelTuple<MotionValue<number>>
  /** Heatsink temperature per channel, index 0 = T1. */
  readonly heatsink: ChannelTuple<MotionValue<number>>
  readonly hottest: MotionValue<number>
  readonly armature: MotionValue<number>
  readonly ambient: MotionValue<number>
  /** 0..1 fraction of healthy airflow: 0 with the fan off, otherwise R_sa baseline / mean R_sa. */
  readonly airflow: MotionValue<number>
}

export type Selector<T> = (s: TelemetrySnapshot) => T
export type Equality<T> = (a: T, b: T) => boolean
export type SliceListener<T> = (next: T, prev: T) => void

export interface TelemetryStoreOptions {
  readonly thresholds?: Readonly<Thresholds>
  /** Wall clock in ms. Defaults to `Date.now`. */
  readonly now?: () => number
  readonly decodeLogger?: DecodeLogger
  /** Rated armature current (A) for the `rms_current` alarm. */
  readonly ratedCurrent?: number
  /** R_sa (K/W) that counts as full airflow. */
  readonly rSaBaseline?: number
}

interface Subscription {
  readonly selector: Selector<unknown>
  readonly listener: SliceListener<unknown>
  readonly isEqual: Equality<unknown>
  value: unknown
}

interface PeakWindow {
  frames: number
  readonly tj: number[]
  readonly heatsink: number[]
  hottest: number
  armature: number
  ambient: number
}

function sixOf<T>(make: () => T): ChannelTuple<T> {
  return [make(), make(), make(), make(), make(), make()]
}

/** max that ignores NaN: NaN only when both are NaN. */
function peak(a: number, b: number): number {
  if (Number.isNaN(a)) return b
  if (Number.isNaN(b)) return a
  return a > b ? a : b
}

function emptyWindow(): PeakWindow {
  return {
    frames: 0,
    tj: [NaN, NaN, NaN, NaN, NaN, NaN],
    heatsink: [NaN, NaN, NaN, NaN, NaN, NaN],
    hottest: NaN,
    armature: NaN,
    ambient: NaN,
  }
}

function sameElements<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export class TelemetryStore {
  readonly source: TelemetrySource
  readonly live: LiveValues

  readonly #thresholds: Readonly<Thresholds>
  readonly #now: () => number
  readonly #decodeLogger: DecodeLogger | undefined
  readonly #ratedCurrent: number
  readonly #rSaBaseline: number

  readonly #time = new RingBuffer(SERIES_CAPACITY, Float64Array)
  readonly #channelSeries: ReadonlyMap<ChannelId, Readonly<Record<ChannelField, RingBuffer<Float32Array>>>>
  readonly #driveSeries: Readonly<Record<DriveField, RingBuffer<Float32Array>>>

  readonly #subs = new Set<Subscription>()
  #snapshot: TelemetrySnapshot
  #sourceStatus: ConnectionStatus = 'offline'
  /** Wall ms at which the source last reported `live`; starts the stale clock before any frame. */
  #liveSince: number | null = null
  #alarmNowMs = -Infinity
  #window: PeakWindow = emptyWindow()
  #unsubs: (() => void)[] = []
  #staleTimer: ReturnType<typeof setInterval> | undefined
  #tickTimer: ReturnType<typeof setInterval> | undefined

  constructor(source: TelemetrySource, options: TelemetryStoreOptions = {}) {
    this.source = source
    this.#thresholds = options.thresholds ?? DEFAULT_THRESHOLDS
    this.#now = options.now ?? Date.now
    this.#decodeLogger = options.decodeLogger
    this.#ratedCurrent = options.ratedCurrent ?? MODEL_PARAMS.rated_current
    this.#rSaBaseline = options.rSaBaseline ?? MODEL_PARAMS.R_sa_baseline

    const float32 = () => new RingBuffer<Float32Array>(SERIES_CAPACITY, Float32Array)
    this.#channelSeries = new Map(
      CHANNEL_IDS.map((id) => [
        id,
        { tj: float32(), heatsink: float32(), residual: float32(), power: float32(), current: float32() },
      ]),
    )
    this.#driveSeries = { hottest: float32(), armature: float32(), ambient: float32(), airflow: float32() }

    this.live = {
      tj: sixOf(() => motionValue(NaN)),
      heatsink: sixOf(() => motionValue(NaN)),
      hottest: motionValue(NaN),
      armature: motionValue(NaN),
      ambient: motionValue(NaN),
      airflow: motionValue(NaN),
    }

    this.#snapshot = {
      frame: null,
      connection: 'offline',
      lastFrameAt: null,
      droppedFrames: 0,
      lastDecodeError: null,
      alarmState: createAlarmState(),
      activeAlarms: [],
      alarmLog: [],
      displayTick: null,
      seriesRevision: 0,
      scenario: 'normal',
    }
  }

  get kind(): TelemetrySource['kind'] {
    return this.source.kind
  }

  /** True between `start()` and `stop()`. */
  get running(): boolean {
    return this.#tickTimer !== undefined
  }

  /** Subscribes to the source, starts the stale and Display_Tick timers, then starts the source. */
  start(): void {
    if (this.running) return
    this.#unsubs = [
      this.source.onStatus((s) => {
        this.#onSourceStatus(s)
      }),
      this.source.subscribe((f) => {
        this.ingest(f)
      }),
    ]
    this.#staleTimer = setInterval(() => {
      this.checkStale()
    }, STALE_CHECK_MS)
    this.#tickTimer = setInterval(() => {
      this.emitDisplayTick()
    }, DISPLAY_TICK_MS)
    this.source.start()
  }

  /** Stops the source and timers and detaches from the source. State is kept. */
  stop(): void {
    if (!this.running) return
    clearInterval(this.#staleTimer)
    clearInterval(this.#tickTimer)
    this.#staleTimer = undefined
    this.#tickTimer = undefined
    for (const off of this.#unsubs) off()
    this.#unsubs = []
    this.source.stop()
  }

  getSnapshot = (): TelemetrySnapshot => this.#snapshot

  /**
   * Notifies `listener` when `selector(snapshot)` changes under `isEqual`
   * (default `Object.is`). Returns an unsubscribe function.
   */
  subscribe<T>(selector: Selector<T>, listener: SliceListener<T>, isEqual: Equality<T> = Object.is): () => void {
    const sub: Subscription = {
      selector,
      listener: listener as SliceListener<unknown>,
      isEqual: isEqual as Equality<unknown>,
      value: selector(this.#snapshot),
    }
    this.#subs.add(sub)
    return () => {
      this.#subs.delete(sub)
    }
  }

  /** Ring buffer for one channel field. Identity is stable for the store's lifetime. */
  channelSeries(id: ChannelId, field: ChannelField): RingBuffer<Float32Array> {
    const series = this.#channelSeries.get(id)
    if (series === undefined) throw new RangeError(`unknown channel ${String(id)}`)
    return series[field]
  }

  driveSeries(field: DriveField): RingBuffer<Float32Array> {
    return this.#driveSeries[field]
  }

  /** Frame timestamps (epoch ms), aligned index-for-index with every series. */
  timeSeries(): RingBuffer {
    return this.#time
  }

  /** Forwards to the source when it supports scenarios, and records the scenario. */
  setScenario(s: Scenario, severity?: number): void {
    if (this.source.setScenario === undefined) return
    this.source.setScenario(s, severity)
    this.#set({ ...this.#snapshot, scenario: s })
  }

  /** Decodes and applies one frame. Called by the source subscription; public for tests. */
  ingest(input: unknown): void {
    const result = decodeDriveFrame(input, this.#decodeLogger ? { logger: this.#decodeLogger } : {})
    if (!result.ok) {
      this.#set({
        ...this.#snapshot,
        droppedFrames: this.#snapshot.droppedFrames + 1,
        lastDecodeError: result.error,
      })
      return
    }
    const frame = result.frame
    const nowWall = this.#now()
    const parsed = Date.parse(frame.timestamp)
    const t = parsed > this.#alarmNowMs ? parsed : this.#alarmNowMs
    this.#alarmNowMs = t

    const hottest = hottestTj(frame)
    const airflow = this.#airflow(frame)
    this.#push(frame, t, hottest, airflow)
    this.#accumulate(frame, hottest)
    this.#writeLive(frame, hottest, airflow)

    const prev = this.#snapshot
    const evaluation = evaluate(frame, prev.alarmState, this.#thresholds, t, { ratedCurrent: this.#ratedCurrent })
    const active = activeAlarms(evaluation.state)
    const alarmLog =
      evaluation.events.length === 0
        ? prev.alarmLog
        : [...prev.alarmLog, ...evaluation.events].slice(-ALARM_LOG_LIMIT)

    this.#set({
      ...prev,
      frame,
      connection: 'live',
      lastFrameAt: nowWall,
      alarmState: evaluation.state,
      activeAlarms: sameElements(active, prev.activeAlarms) ? prev.activeAlarms : active,
      alarmLog,
      seriesRevision: prev.seriesRevision + 1,
    })
  }

  /** Enters `stale` when live and no valid frame for more than STALE_AFTER_MS. Called by the timer. */
  checkStale(): void {
    const s = this.#snapshot
    if (s.connection !== 'live') return
    const since = s.lastFrameAt ?? this.#liveSince
    if (since === null) return
    if (this.#now() - since > STALE_AFTER_MS) this.#set({ ...s, connection: 'stale' })
  }

  /** Emits a Display_Tick with the peaks since the previous tick. Called by the 1 Hz timer. */
  emitDisplayTick(): void {
    const w = this.#window
    const prevTick = this.#snapshot.displayTick
    this.#window = emptyWindow()
    const carry = w.frames === 0 && prevTick !== null
    const tick: DisplayTick = {
      seq: (prevTick?.seq ?? 0) + 1,
      at: this.#now(),
      frames: w.frames,
      tj: carry ? prevTick.tj : (w.tj.slice() as unknown as ChannelTuple<number>),
      heatsink: carry ? prevTick.heatsink : (w.heatsink.slice() as unknown as ChannelTuple<number>),
      hottest: carry ? prevTick.hottest : w.hottest,
      armature: carry ? prevTick.armature : w.armature,
      ambient: carry ? prevTick.ambient : w.ambient,
    }
    this.#set({ ...this.#snapshot, displayTick: tick })
  }

  #onSourceStatus(s: ConnectionStatus): void {
    this.#sourceStatus = s
    const current = this.#snapshot.connection
    if (s === 'live') {
      this.#liveSince = this.#now()
      // Keep `stale` until a valid frame proves the stream is flowing again.
      if (current !== 'stale') this.#set({ ...this.#snapshot, connection: 'live' })
      return
    }
    this.#liveSince = null
    if (current !== s) this.#set({ ...this.#snapshot, connection: s })
  }

  /** Last status reported by the source (before the store's stale override). */
  get sourceStatus(): ConnectionStatus {
    return this.#sourceStatus
  }

  #airflow(frame: DriveFrame): number {
    if (!frame.fan_status) return 0
    let sum = 0
    let n = 0
    for (const ch of frame.thyristors) {
      if (ch.sensor_healthy && Number.isFinite(ch.r_sa) && ch.r_sa > 0) {
        sum += ch.r_sa
        n++
      }
    }
    if (n === 0) return NaN
    const ratio = this.#rSaBaseline / (sum / n)
    return ratio > 1 ? 1 : ratio
  }

  #push(frame: DriveFrame, t: number, hottest: number, airflow: number): void {
    this.#time.push(t)
    for (const ch of frame.thyristors) {
      this.channelSeries(ch.id, 'tj').push(ch.tj_estimated)
      this.channelSeries(ch.id, 'heatsink').push(ch.t_heatsink_measured)
      this.channelSeries(ch.id, 'residual').push(ch.residual)
      this.channelSeries(ch.id, 'power').push(ch.power_loss)
      this.channelSeries(ch.id, 'current').push(ch.current)
    }
    this.#driveSeries.hottest.push(hottest)
    this.#driveSeries.armature.push(frame.armature_current)
    this.#driveSeries.ambient.push(frame.ambient_temp)
    this.#driveSeries.airflow.push(airflow)
  }

  #accumulate(frame: DriveFrame, hottest: number): void {
    const w = this.#window
    w.frames++
    frame.thyristors.forEach((ch, i) => {
      w.tj[i] = peak(w.tj[i] ?? NaN, ch.sensor_healthy ? ch.tj_estimated : NaN)
      w.heatsink[i] = peak(w.heatsink[i] ?? NaN, ch.sensor_healthy ? ch.t_heatsink_measured : NaN)
    })
    w.hottest = peak(w.hottest, hottest)
    w.armature = peak(w.armature, frame.armature_current)
    w.ambient = peak(w.ambient, frame.ambient_temp)
  }

  #writeLive(frame: DriveFrame, hottest: number, airflow: number): void {
    const live = this.live
    frame.thyristors.forEach((ch, i) => {
      live.tj[i]?.set(ch.tj_estimated)
      live.heatsink[i]?.set(ch.t_heatsink_measured)
    })
    live.hottest.set(hottest)
    live.armature.set(frame.armature_current)
    live.ambient.set(frame.ambient_temp)
    live.airflow.set(airflow)
  }

  #set(next: TelemetrySnapshot): void {
    this.#snapshot = next
    for (const sub of [...this.#subs]) {
      if (!this.#subs.has(sub)) continue
      const value = sub.selector(next)
      if (sub.isEqual(sub.value, value)) continue
      const prev = sub.value
      sub.value = value
      sub.listener(value, prev)
    }
  }
}
