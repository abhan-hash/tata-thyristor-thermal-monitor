import { useMotionValue, type MotionValue } from 'motion/react'
import { useCallback, useEffect, useState, type RefObject } from 'react'
import { useSearchParams } from 'react-router'
import { useTelemetryStore } from '../../data/hooks'
import type { TelemetrySnapshot } from '../../data/store'
import type { ChannelId, ThyristorFrame } from '../../domain/types'

/** `?window=` values the Drive Detail charts accept (Requirement 25.3). */
export const WINDOW_OPTIONS = [60, 300] as const
export type ChartWindow = (typeof WINDOW_OPTIONS)[number]
export const WINDOW_PARAM = 'window'
export const DEFAULT_WINDOW: ChartWindow = 60
/** KPI sparkline window, s (Requirement 25.6). */
export const SPARK_WINDOW_S = 60

/** `"300"` → 300; missing or anything other than 60/300 → 60. */
export function parseWindowParam(value: string | null | undefined): ChartWindow {
  const n = Number(value)
  return (WINDOW_OPTIONS as readonly number[]).includes(n) ? (n as ChartWindow) : DEFAULT_WINDOW
}

/** The chart window from `?window=` and a setter that writes it with `replace`, keeping other params. */
export function useChartWindow(): [ChartWindow, (w: ChartWindow) => void] {
  const [params, setParams] = useSearchParams()
  const windowS = parseWindowParam(params.get(WINDOW_PARAM))
  const setWindow = useCallback(
    (w: ChartWindow) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set(WINDOW_PARAM, String(w))
          return next
        },
        { replace: true, preventScrollReset: true },
      )
    },
    [setParams],
  )
  return [windowS, setWindow]
}

/** Newest minus oldest finite sample; NaN with fewer than two finite samples. */
export function seriesDelta(series: ArrayLike<number>): number {
  let first = Number.NaN
  let last = Number.NaN
  for (let i = 0; i < series.length; i++) {
    const v = series[i] ?? Number.NaN
    if (!Number.isFinite(v)) continue
    if (Number.isNaN(first)) first = v
    last = v
  }
  return last - first
}

/** Trip margin series (K) from a Tj series: `trip − tj`, NaN preserved. */
export function marginSeries(tj: Float32Array, trip: number): Float32Array {
  return tj.map((v) => trip - v)
}

/** Bar fill 0..1 for the margin-to-trip bar: how much of the span from `floor` to `trip` Tj has used. */
export function tripFill(tj: number, trip: number, floor: number): number {
  if (!Number.isFinite(tj) || trip <= floor) return 0
  return Math.min(1, Math.max(0, (tj - floor) / (trip - floor)))
}

type ChannelPick = (ch: ThyristorFrame) => number

/**
 * A MotionValue following one field of the selected channel, written on every
 * frame without re-rendering React. NaN before the first frame.
 */
export function useChannelMotion(id: ChannelId, pick: ChannelPick): MotionValue<number> {
  const store = useTelemetryStore()
  const mv = useMotionValue(Number.NaN)
  useEffect(() => {
    const select = (s: TelemetrySnapshot) => {
      const ch = s.frame?.thyristors[id - 1]
      return ch ? pick(ch) : Number.NaN
    }
    mv.set(select(store.getSnapshot()))
    return store.subscribe(select, (next) => {
      mv.set(next)
    })
  }, [store, id, pick, mv])
  return mv
}

/** Max samples kept by `useRecentSamples`: 60 s at 10 Hz. */
const RECENT_CAPACITY = SPARK_WINDOW_S * 10

/**
 * The last 60 s of one channel field that the store does not buffer (R_sa),
 * collected from the frames seen since mount or since the channel changed.
 */
export function useRecentSamples(id: ChannelId, pick: ChannelPick): Float32Array {
  const store = useTelemetryStore()
  const [samples, setSamples] = useState<{ id: ChannelId; v: Float32Array }>(() => ({ id, v: new Float32Array() }))
  useEffect(() => {
    let t: number[] = []
    let v: number[] = []
    const push = (frame: TelemetrySnapshot['frame']) => {
      const ch = frame?.thyristors[id - 1]
      if (!frame || !ch) return
      const at = Date.parse(frame.timestamp)
      t.push(at)
      v.push(pick(ch))
      const cutoff = at - SPARK_WINDOW_S * 1000
      let drop = 0
      while (drop < t.length && ((t[drop] ?? at) < cutoff || t.length - drop > RECENT_CAPACITY)) drop++
      if (drop > 0) {
        t = t.slice(drop)
        v = v.slice(drop)
      }
      setSamples({ id, v: Float32Array.from(v) })
    }
    push(store.getSnapshot().frame)
    return store.subscribe((s) => s.frame, push)
  }, [store, id, pick])
  return samples.id === id ? samples.v : new Float32Array()
}

/** Rendered width of `ref` in px, tracked with a ResizeObserver; `fallback` until measured. */
export function useElementWidth(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const w = Math.round(el.getBoundingClientRect().width)
      if (w > 0) setWidth(w)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      ro.disconnect()
    }
  }, [ref])
  return width
}
