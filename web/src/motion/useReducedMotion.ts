import { MotionConfigContext, useReducedMotion as useDeviceReducedMotion } from 'motion/react'
import { useContext } from 'react'

/**
 * Reduced-motion bridge (Requirements 35.1, 35.2). True when the device asks
 * for reduced motion (`prefers-reduced-motion: reduce`) or when an enclosing
 * `<MotionConfig reducedMotion="always">` forces it (tests, kit specimens).
 * The app root sets `reducedMotion="user"`, so Motion's own transform and
 * layout animations follow the same preference.
 */
export function useReducedMotion(): boolean {
  const device = useDeviceReducedMotion() === true
  const { reducedMotion } = useContext(MotionConfigContext)
  return reducedMotion === 'always' || device
}
