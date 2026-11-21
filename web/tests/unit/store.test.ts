import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import type { TelemetrySource } from '../../src/data/ports'
import { SERIES_CAPACITY, TelemetryStore } from '../../src/data/store'
import type { DriveFrame } from '../../src/domain/types'

const EPOCH = Date.UTC(2026, 10, 21)
const quiet = { marginMismatch: () => undefined }

function setup() {
  const source = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
  const store = new TelemetryStore(source, { decodeLogger: quiet })
  return { source, store }
}

function withTj(frame: DriveFrame, index: number, tj: number): DriveFrame {
  const thyristors = frame.thyristors.map((ch, i) =>
    i === index ? { ...ch, tj_estimated: tj, margin_to_limit: 125 - tj } : ch,
  ) as unknown as DriveFrame['thyristors']
  return { ...frame, thyristors }
}

/** A source that reports `live` on subscribe and emits only when the test calls `emit`. */
function manualSource() {
  let emit: (f: unknown) => void = () => undefined
  const source: TelemetrySource = {
    kind: 'mock',
    start: () => undefined,
    stop: () => undefined,
    subscribe: (cb) => {
      emit = cb as (f: unknown) => void
      return () => undefined
    },
    onStatus: (cb) => {
      cb('live')
      return () => undefined
    },
  }
  return {
    source,
    emit: (f: unknown) => {
      emit(f)
    },
  }
}

/** Marks channel `index` as sensor-faulted with NaN temperatures. */
function withFault(frame: DriveFrame, index: number): DriveFrame {
  const thyristors = frame.thyristors.map((ch, i) =>
    i === index
      ? { ...ch, sensor_healthy: false, tj_estimated: NaN, t_heatsink_measured: NaN, margin_to_limit: NaN }
      : ch,
  ) as unknown as DriveFrame['thyristors']
  return { ...frame, thyristors }
}

describe('TelemetryStore', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('pushes valid frames into ring buffers, live values and the snapshot', () => {
    const { source, store } = setup()
    source.subscribe((f) => {
      store.ingest(f)
    })
    const frames = source.runTicks(3)
    const last = frames[2]
    if (last === undefined) throw new Error('no frame')
    const snap = store.getSnapshot()
    expect(snap.frame?.timestamp).toBe(last.timestamp)
    expect(snap.connection).toBe('live')
    expect(store.channelSeries(1, 'tj').capacity).toBe(SERIES_CAPACITY)
    expect(store.channelSeries(3, 'tj').length).toBe(3)
    expect(store.channelSeries(3, 'tj').last()).toBeCloseTo(last.thyristors[2].tj_estimated, 3)
    expect(store.timeSeries().last()).toBe(Date.parse(last.timestamp))
    expect(store.live.tj[2].get()).toBe(last.thyristors[2].tj_estimated)
    expect(store.live.ambient.get()).toBe(last.ambient_temp)
    expect(store.live.airflow.get()).toBeGreaterThan(0.9)
  })

  it('drops an invalid frame, keeps the last good one and counts it', () => {
    const { source, store } = setup()
    const [good] = source.runTicks(1)
    store.ingest(good)
    store.ingest({ ...good, thyristors: [] })
    const snap = store.getSnapshot()
    expect(snap.droppedFrames).toBe(1)
    expect(snap.lastDecodeError?.path).toBe('thyristors')
    expect(snap.frame?.timestamp).toBe(good?.timestamp)
    expect(store.channelSeries(1, 'tj').length).toBe(1)
  })

  it('notifies a slice subscriber only when its slice changes', () => {
    const { source, store } = setup()
    const dropped = vi.fn()
    store.subscribe((s) => s.droppedFrames, dropped)
    const [good] = source.runTicks(1)
    store.ingest(good)
    store.ingest(good)
    expect(dropped).not.toHaveBeenCalled()
    store.ingest(null)
    expect(dropped).toHaveBeenCalledWith(1, 0)
  })

  it('goes stale after 1 s without a valid frame and live again on the next one', () => {
    vi.useFakeTimers({ now: EPOCH })
    const sim = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
    // A source that reports `live` but only emits when the test says so.
    let emit: (f: DriveFrame) => void = () => undefined
    const source: TelemetrySource = {
      kind: 'mock',
      start: () => undefined,
      stop: () => undefined,
      subscribe: (cb) => {
        emit = cb
        return () => undefined
      },
      onStatus: (cb) => {
        cb('live')
        return () => undefined
      },
    }
    const store = new TelemetryStore(source, { decodeLogger: quiet })
    store.start()
    for (const f of sim.runTicks(5)) emit(f)
    vi.advanceTimersByTime(1000)
    expect(store.getSnapshot().connection).toBe('live')
    vi.advanceTimersByTime(100)
    expect(store.getSnapshot().connection).toBe('stale')
    for (const f of sim.runTicks(1)) emit(f)
    expect(store.getSnapshot().connection).toBe('live')
    store.stop()
  })

  it('emits a 1 Hz Display_Tick holding the peak over the window', () => {
    const { source, store } = setup()
    const [a, b, c] = source.runTicks(3)
    if (a === undefined || b === undefined || c === undefined) throw new Error('no frames')
    store.ingest(withTj(a, 0, 90))
    store.ingest(withTj(b, 0, 97))
    store.ingest(withTj(c, 0, 92))
    store.emitDisplayTick()
    const tick = store.getSnapshot().displayTick
    expect(tick?.seq).toBe(1)
    expect(tick?.frames).toBe(3)
    expect(tick?.tj[0]).toBe(97)
    store.emitDisplayTick()
    const carried = store.getSnapshot().displayTick
    expect(carried?.seq).toBe(2)
    expect(carried?.frames).toBe(0)
    expect(carried?.tj[0]).toBe(97)
  })

  describe.each([
    ['a missing required key', (f: DriveFrame) => ({ ...f, ambient_temp: undefined })],
    ['five thyristors', (f: DriveFrame) => ({ ...f, thyristors: f.thyristors.slice(0, 5) })],
    [
      'thyristor ids out of order',
      (f: DriveFrame) => ({ ...f, thyristors: [f.thyristors[1], f.thyristors[0], ...f.thyristors.slice(2)] }),
    ],
    ['an infinite temperature', (f: DriveFrame) => withTj(f, 3, Infinity)],
    ['NaN Tj on a healthy channel', (f: DriveFrame) => withTj(f, 0, NaN)],
    ['a non-object', () => 'garbage'],
  ])('a frame with %s', (_name, corrupt) => {
    it('is dropped and counted, and nothing downstream changes', () => {
      const { source, store } = setup()
      const [good, next] = source.runTicks(2)
      if (good === undefined || next === undefined) throw new Error('no frames')
      store.ingest(good)
      const before = store.getSnapshot()
      const tjBefore = store.live.tj[0].get()
      const frameListener = vi.fn()
      store.subscribe((s) => s.frame, frameListener)

      store.ingest(corrupt(next))

      const snap = store.getSnapshot()
      expect(snap.droppedFrames).toBe(1)
      expect(snap.lastDecodeError).not.toBeNull()
      expect(snap.frame).toBe(before.frame)
      expect(snap.lastFrameAt).toBe(before.lastFrameAt)
      expect(snap.seriesRevision).toBe(before.seriesRevision)
      expect(store.timeSeries().length).toBe(1)
      expect(store.live.tj[0].get()).toBe(tjBefore)
      expect(frameListener).not.toHaveBeenCalled()
    })
  })

  it('counts every dropped frame and does not reset the count on a valid one', () => {
    const { source, store } = setup()
    const [a, b] = source.runTicks(2)
    store.ingest(null)
    store.ingest({})
    store.ingest(a)
    store.ingest(42)
    store.ingest(b)
    expect(store.getSnapshot().droppedFrames).toBe(3)
    expect(store.getSnapshot().frame?.timestamp).toBe(b?.timestamp)
  })

  it('notifies each slice subscriber only for its own slice', () => {
    const { source, store } = setup()
    const onFrame = vi.fn()
    const onDropped = vi.fn()
    const onTick = vi.fn()
    store.subscribe((s) => s.frame, onFrame)
    store.subscribe((s) => s.droppedFrames, onDropped)
    store.subscribe((s) => s.displayTick, onTick)

    store.ingest(source.runTicks(1)[0])
    expect([onFrame.mock.calls.length, onDropped.mock.calls.length, onTick.mock.calls.length]).toEqual([1, 0, 0])
    store.ingest(undefined)
    expect([onFrame.mock.calls.length, onDropped.mock.calls.length, onTick.mock.calls.length]).toEqual([1, 1, 0])
    store.emitDisplayTick()
    expect([onFrame.mock.calls.length, onDropped.mock.calls.length, onTick.mock.calls.length]).toEqual([1, 1, 1])
  })

  it('uses the supplied equality and stops notifying after unsubscribe', () => {
    const { source, store } = setup()
    const listener = vi.fn()
    // Rounded hottest Tj: equal while the integer part is unchanged.
    const off = store.subscribe(
      (s) => s.frame?.thyristors[0].tj_estimated ?? null,
      listener,
      (a, b) => a !== null && b !== null && Math.floor(a) === Math.floor(b),
    )
    const [a, b, c] = source.runTicks(3)
    if (a === undefined || b === undefined || c === undefined) throw new Error('no frames')
    store.ingest(withTj(a, 0, 80.1))
    store.ingest(withTj(b, 0, 80.7))
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    store.ingest(withTj(c, 0, 95))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('goes stale when the source is live but no frame has ever arrived', () => {
    vi.useFakeTimers({ now: EPOCH })
    const { source } = manualSource()
    const store = new TelemetryStore(source, { decodeLogger: quiet })
    store.start()
    expect(store.getSnapshot().connection).toBe('live')
    vi.advanceTimersByTime(1100)
    expect(store.getSnapshot().connection).toBe('stale')
    expect(store.getSnapshot().lastFrameAt).toBeNull()
    store.stop()
  })

  it('stays stale while only invalid frames arrive', () => {
    vi.useFakeTimers({ now: EPOCH })
    const sim = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
    const { source, emit } = manualSource()
    const store = new TelemetryStore(source, { decodeLogger: quiet })
    store.start()
    const [good] = sim.runTicks(1)
    emit(good)
    const lastFrameAt = store.getSnapshot().lastFrameAt
    vi.advanceTimersByTime(1500)
    expect(store.getSnapshot().connection).toBe('stale')
    emit({ broken: true })
    vi.advanceTimersByTime(500)
    const snap = store.getSnapshot()
    expect(snap.connection).toBe('stale')
    expect(snap.lastFrameAt).toBe(lastFrameAt)
    expect(snap.droppedFrames).toBe(1)
    store.stop()
  })

  it('fires the Display_Tick from the 1 Hz timer with the window peak', () => {
    vi.useFakeTimers({ now: EPOCH })
    const sim = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
    const { source, emit } = manualSource()
    const store = new TelemetryStore(source, { decodeLogger: quiet })
    store.start()
    const frames = sim.runTicks(20)
    // First second: peak 101 on T2. Second second: peak 88.
    frames.slice(0, 10).forEach((f, i) => {
      emit(withTj(f, 1, i === 4 ? 101 : 70 + i))
      vi.advanceTimersByTime(100)
    })
    const first = store.getSnapshot().displayTick
    expect(first?.seq).toBe(1)
    expect(first?.frames).toBe(10)
    expect(first?.tj[1]).toBe(101)
    expect(first?.at).toBe(EPOCH + 1000)
    frames.slice(10).forEach((f, i) => {
      emit(withTj(f, 1, i === 7 ? 88 : 60))
      vi.advanceTimersByTime(100)
    })
    const second = store.getSnapshot().displayTick
    expect(second?.seq).toBe(2)
    expect(second?.tj[1]).toBe(88)
    store.stop()
  })

  it('peak-holds only healthy samples and holds NaN for a channel that is faulted all window', () => {
    const { source, store } = setup()
    const [a, b, c] = source.runTicks(3)
    if (a === undefined || b === undefined || c === undefined) throw new Error('no frames')
    store.ingest(withFault(withTj(a, 0, 90), 1))
    store.ingest(withFault(withTj(b, 0, 85), 1))
    // T1 faults on the last frame; its earlier healthy peak still counts.
    store.ingest(withFault(withFault(c, 0), 1))
    store.emitDisplayTick()
    const tick = store.getSnapshot().displayTick
    expect(tick?.tj[0]).toBe(90)
    expect(tick?.tj[1]).toBeNaN()
    expect(tick?.heatsink[1]).toBeNaN()
    expect(tick?.hottest).toBeGreaterThanOrEqual(90)
  })

  it('writes MotionValues on every valid frame and notifies their change listeners', () => {
    const { source, store } = setup()
    const onTj = vi.fn()
    const onArmature = vi.fn()
    store.live.tj[4].on('change', onTj)
    store.live.armature.on('change', onArmature)
    const frames = source.runTicks(5).map((f, i) => withTj(f, 4, 60 + i))
    for (const f of frames) store.ingest(f)
    expect(onTj).toHaveBeenCalledTimes(5)
    expect(onTj.mock.calls.map((c) => c[0])).toEqual([60, 61, 62, 63, 64])
    expect(store.live.tj[4].get()).toBe(64)
    expect(store.live.armature.get()).toBe(frames[4]?.armature_current)
    store.ingest(null)
    expect(onTj).toHaveBeenCalledTimes(5)
  })
})
