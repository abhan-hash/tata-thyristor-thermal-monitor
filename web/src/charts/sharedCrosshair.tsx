import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/** One crosshair position (x domain value, seconds relative to now) shared by stacked charts. */
export interface SharedCrosshair {
  readonly x: number | null
  readonly setX: (x: number | null) => void
}

const CrosshairContext = createContext<SharedCrosshair | null>(null)

/**
 * Shares one crosshair between every chart below it (Requirement 25.2):
 * pointing at the Transient_Chart moves the Current_Chart crosshair too.
 */
export function CrosshairProvider({ children }: { children?: ReactNode }) {
  const [x, setX] = useState<number | null>(null)
  const value = useMemo(() => ({ x, setX }), [x])
  return <CrosshairContext.Provider value={value}>{children}</CrosshairContext.Provider>
}

/** The shared crosshair, or `null` outside a `CrosshairProvider` (the chart then keeps its own). */
export function useSharedCrosshair(): SharedCrosshair | null {
  return useContext(CrosshairContext)
}
