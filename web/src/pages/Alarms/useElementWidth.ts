import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Content-box width of an element, tracked with ResizeObserver. Returns
 * `fallback` until measured and wherever ResizeObserver or layout is missing
 * (jsdom), so charts always get a usable width.
 */
export function useElementWidth<T extends HTMLElement>(fallback: number): [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const w = Math.floor(el.clientWidth)
      if (w > 0) setWidth(w)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      ro.disconnect()
    }
  }, [])
  return [ref, width]
}
