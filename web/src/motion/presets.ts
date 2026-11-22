// Motion presets (Requirement 34.1). Every preset animates only `transform`
// and `opacity`; heat fills (SVG `fill` / `stop-color`) are driven by their own
// MotionValues in the visuals. No preset touches layout properties.
import { DURATION_S, EASE_OUT } from './tokens'

/** Entrance slot: a short rise with a fade. Delays come from `entranceTimeline`. */
export const ENTRANCE = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0 },
  ease: EASE_OUT,
} as const

// Press feedback (Requirement 33.10) is CSS: `scale: 0.97` on `:active`
// over --dur-1 for every button, in styles/global.css.

/** One-off arrival of a new row: slide in from the left and fade (Requirement 33.8). */
export const ARRIVAL = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.24, ease: EASE_OUT },
} as const

/** Highlight that fades out over the arriving row, in step with `ARRIVAL`. */
export const ARRIVAL_HIGHLIGHT = {
  initial: { opacity: 1 },
  animate: { opacity: 0 },
  transition: { duration: 0.24, ease: EASE_OUT },
} as const

/** Alarm-count badge on a new alarm: a short scale-up from 0.6. */
export const ARRIVAL_POP = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.24, ease: EASE_OUT },
} as const

/** Live number tween (Requirement 33.1). */
export const NUMBER_TWEEN = { duration: DURATION_S[2], ease: EASE_OUT } as const
