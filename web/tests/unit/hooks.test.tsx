import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HistoryProvider, useAcknowledge, useAlarmHistory, useTrace, useWear } from '../../src/data/historyHooks'
import {
  TelemetryProvider,
  useChannel,
  useConnection,
  useDisplayTick,
  useFrame,
  useLiveValue,
  useScenario,
  useSeries,
  useSourceKind,
  useTelemetry,
} from '../../src/data/hooks'
import { MockHistoryRepository } from '../../src/data/mock/MockHistoryRepository'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import type { TelemetrySource } from '../../src/data/ports'
import { TelemetryStore, type TelemetrySnapshot } from '../../src/data/store'
import type { DriveFrame } from '../../src/domain/types'
import { ConnectionBanner } from '../../src/kit/ConnectionBanner'

const EPOCH = Date.UTC(2026, 10, 21)
const quiet = { marginMismatch: () => undefined }

function telemetry() {
  const source = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
  const store = new TelemetryStore(source, { decodeLogger: quiet })
  const feed = (n: number) => {
    act(() => {
      for (const f of source.runTicks(n)) store.ingest(f)
    })
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TelemetryProvider store={store} autoStart={false}>
      {children}
    </TelemetryProvider>
  )
  return { source, store, feed, wrapper }
}

describe('telemetry hooks', () => {
  it('useChannel re-renders only when the selected slice changes', () => {
    const { feed, wrapper } = telemetry()
    let renders = 0
    const { result } = renderHook(
      () => {
        renders++
        return useChannel(2, (ch) => ch?.sensor_healthy ?? null)
      },
      { wrapper },
    )
    expect(result.current).toBeNull()
    feed(1)
    expect(result.current).toBe(true)
    const after = renders
    feed(20)
    expect(result.current).toBe(true)
    expect(renders).toBe(after)
  })

  it('useSeries returns the trailing window by frame time', () => {
    const { feed, wrapper } = telemetry()
    const { result } = renderHook(() => useSeries(1, 'tj', 1), { wrapper })
    expect(result.current.v.length).toBe(0)
    feed(30) // 3 s at 10 Hz
    const { t, v } = result.current
    expect(v.length).toBe(t.length)
    // 1 s window inclusive of both ends at 100 ms spacing.
    expect(t.length).toBe(11)
    expect((t[t.length - 1] ?? 0) - (t[0] ?? 0)).toBeLessThanOrEqual(1000)
  })

  it('exposes connection, live values, source kind and scenario control', () => {
    const { store, feed, wrapper } = telemetry()
    const { result } = renderHook(
      () => ({ conn: useConnection(), tj3: useLiveValue('tj.3'), kind: useSourceKind(), sc: useScenario() }),
      { wrapper },
    )
    expect(result.current.kind).toBe('mock')
    expect(result.current.tj3).toBe(store.live.tj[2])
    feed(1)
    expect(result.current.conn.status).toBe('live')
    expect(result.current.tj3.get()).toBe(store.getSnapshot().frame?.thyristors[2].tj_estimated)
    expect(result.current.sc.supported).toBe(true)
    act(() => {
      result.current.sc.setScenario('fan_failure')
    })
    expect(result.current.sc.scenario).toBe('fan_failure')
  })

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useSourceKind())).toThrow(/TelemetryProvider/)
  })
})

/** A store over a source that reports `live` and emits only when told to; started by the provider. */
function manualTelemetry() {
  const sim = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
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
  const store = new TelemetryStore(source, { decodeLogger: quiet })
  const send = (...frames: unknown[]) => {
    act(() => {
      for (const f of frames) emit(f)
    })
  }
  const advance = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TelemetryProvider store={store}>{children}</TelemetryProvider>
  )
  return { sim, store, send, advance, wrapper }
}

function withTj(frame: DriveFrame, index: number, tj: number): DriveFrame {
  const thyristors = frame.thyristors.map((ch, i) =>
    i === index ? { ...ch, tj_estimated: tj, margin_to_limit: 125 - tj } : ch,
  ) as unknown as DriveFrame['thyristors']
  return { ...frame, thyristors }
}

const selectDropped = (s: TelemetrySnapshot) => s.droppedFrames

describe('selector components', () => {
  it('re-render only when their own slice changes', () => {
    const { source, store, wrapper } = telemetry()
    const renders = { dropped: 0, ambient: 0, status: 0 }
    function Dropped() {
      renders.dropped++
      return <span>{useTelemetry(selectDropped)}</span>
    }
    function Ambient() {
      renders.ambient++
      // Rounded so frame-to-frame jitter does not change the slice.
      return <span>{useFrame((f) => (f === null ? null : Math.round(f.ambient_temp / 100)))}</span>
    }
    function Status() {
      renders.status++
      return <span>{useChannel(1, (ch) => ch?.status ?? 'none')}</span>
    }
    render(
      <>
        <Dropped />
        <Ambient />
        <Status />
      </>,
      { wrapper },
    )
    const [first, ...rest] = source.runTicks(10)
    act(() => {
      store.ingest(first)
    })
    const settled = { ...renders }
    act(() => {
      for (const f of rest) store.ingest(f)
    })
    expect(renders).toEqual(settled)

    act(() => {
      store.ingest({ not: 'a frame' })
    })
    expect(renders.dropped).toBe(settled.dropped + 1)
    expect(renders.ambient).toBe(settled.ambient)
    expect(renders.status).toBe(settled.status)
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})

describe('connection and Display_Tick through the hooks', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function Banner() {
    const c = useConnection()
    return <ConnectionBanner status={c.status} lastFrameAt={c.lastFrameAt} />
  }

  it('shows the stale banner with N seconds since the last frame, and hides it on recovery', () => {
    vi.useFakeTimers({ now: EPOCH })
    const { sim, store, send, advance, wrapper } = manualTelemetry()
    render(<Banner />, { wrapper })
    send(...sim.runTicks(3))
    expect(screen.queryByTestId('connection-banner')).toBeNull()

    advance(1000)
    expect(store.getSnapshot().connection).toBe('live')
    advance(100)
    expect(store.getSnapshot().connection).toBe('stale')
    expect(screen.getByTestId('connection-banner')).toHaveTextContent('Data stale – last frame 1 s ago')

    advance(2000)
    expect(screen.getByTestId('connection-banner')).toHaveTextContent('Data stale – last frame 3 s ago')

    // An invalid frame does not count as recovery.
    send({ junk: 1 })
    expect(screen.getByTestId('connection-banner')).toBeInTheDocument()

    send(...sim.runTicks(1))
    expect(store.getSnapshot().connection).toBe('live')
    expect(screen.queryByTestId('connection-banner')).toBeNull()
  })

  it('useDisplayTick re-renders once per second with the peak, not on every frame', () => {
    vi.useFakeTimers({ now: EPOCH })
    const { sim, send, advance, wrapper } = manualTelemetry()
    let renders = 0
    const { result } = renderHook(
      () => {
        renders++
        return useDisplayTick()
      },
      { wrapper },
    )
    expect(result.current).toBeNull()
    const base = renders
    const values = [80, 92.5, 85, 79, 90, 88, 70, 91, 84, 83]
    sim.runTicks(10).forEach((f, i) => {
      send(withTj(f, 5, values[i] ?? 0))
      if (i < 9) advance(100)
    })
    expect(renders).toBe(base)
    advance(100)
    expect(renders).toBe(base + 1)
    expect(result.current?.seq).toBe(1)
    expect(result.current?.tj[5]).toBe(92.5)
  })
})

describe('live values', () => {
  it('update MotionValues on every frame without re-rendering the reader', () => {
    const { store, feed, wrapper } = telemetry()
    let renders = 0
    const { result } = renderHook(
      () => {
        renders++
        return { hottest: useLiveValue('hottest'), hs6: useLiveValue('heatsink.6'), air: useLiveValue('airflow') }
      },
      { wrapper },
    )
    const changes = vi.fn()
    result.current.hottest.on('change', changes)
    const before = renders
    feed(15)
    expect(renders).toBe(before)
    expect(changes).toHaveBeenCalled()
    const frame = store.getSnapshot().frame
    if (frame === null) throw new Error('no frame')
    expect(result.current.hottest.get()).toBe(Math.max(...frame.thyristors.map((ch) => ch.tj_estimated)))
    expect(result.current.hs6.get()).toBe(frame.thyristors[5].t_heatsink_measured)
    expect(result.current.air.get()).toBeGreaterThan(0)
    expect(result.current.hottest).toBe(store.live.hottest)
  })
})

describe('history hooks', () => {
  function history() {
    const repo = new MockHistoryRepository({ seed: 1 })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <HistoryProvider repository={repo}>{children}</HistoryProvider>
      </QueryClientProvider>
    )
    return { repo, wrapper }
  }

  it('loads wear and a disabled trace stays idle', async () => {
    const { wrapper } = history()
    const { result } = renderHook(() => ({ wear: useWear(), trace: useTrace(null) }), { wrapper })
    expect(result.current.wear.isPending).toBe(true)
    await waitFor(() => {
      expect(result.current.wear.isSuccess).toBe(true)
    })
    expect(result.current.wear.data).toHaveLength(6)
    expect(result.current.trace.fetchStatus).toBe('idle')
  })

  it('acknowledge updates the cached alarm list', async () => {
    const { wrapper } = history()
    const q = { from: new Date(0), to: new Date(8.64e15) }
    const { result } = renderHook(() => ({ list: useAlarmHistory(q), ack: useAcknowledge() }), { wrapper })
    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true)
    })
    const first = result.current.list.data?.[0]
    if (first === undefined) throw new Error('no alarms in fixtures')
    act(() => {
      result.current.ack.mutate({ eventId: first.id, user: 'op1' })
    })
    await waitFor(() => {
      expect(result.current.list.data?.find((e) => e.id === first.id)?.acknowledged_by).toBe('op1')
    })
  })
})
