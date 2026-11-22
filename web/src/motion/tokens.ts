// Motion tokens for JS-driven animation (Requirement 34.1). They mirror the
// CSS tokens in `styles/tokens.primitive.css` (`--dur-*`, `--ease-*`); a unit
// test keeps the two in step. Motion takes seconds, so both units are given.

export type CubicBezier = readonly [number, number, number, number]

/** `--ease-out`: fast start, long settle. Entrances, value tweens, arrivals. */
export const EASE_OUT: CubicBezier = [0.23, 1, 0.32, 1]
/** `--ease-in-out`: for elements that move between two on-screen positions. */
export const EASE_IN_OUT: CubicBezier = [0.77, 0, 0.175, 1]

/** Durations in milliseconds, keyed like the CSS tokens. */
export const DURATION_MS = {
  /** `--dur-1`: press feedback, hover colour. */
  1: 120,
  /** `--dur-2`: live number tweens. */
  2: 200,
  /** `--dur-3`: heat fill interpolation, small reveals. */
  3: 320,
  /** `--dur-entrance`: the whole page entrance, first slot start to last slot end. */
  entrance: 640,
} as const

/** The same durations in seconds, for Motion's `transition.duration`. */
export const DURATION_S = {
  1: DURATION_MS[1] / 1000,
  2: DURATION_MS[2] / 1000,
  3: DURATION_MS[3] / 1000,
  entrance: DURATION_MS.entrance / 1000,
} as const
