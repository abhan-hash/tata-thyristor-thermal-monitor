import { useMotionValue, type MotionValue } from 'motion/react'
import { useEffect } from 'react'

/** A live value from the store bridge, or a plain number for static use (kit gallery, tests). */
export type NumberSource = number | MotionValue<number>

/**
 * Normalises a NumberSource to a MotionValue. A MotionValue passes through
 * untouched; a plain number is mirrored into a local MotionValue, so visuals
 * have one code path that updates SVG attributes without re-rendering.
 */
export function useMotionSource(value: NumberSource): MotionValue<number> {
  const local = useMotionValue(typeof value === 'number' ? value : value.get())
  useEffect(() => {
    if (typeof value === 'number') local.set(value)
  }, [value, local])
  return typeof value === 'number' ? local : value
}
