import { animate, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react'
import { heatStopIndex } from '../domain/heatScale'
import { heatMix, heatPosition } from '../visuals/heat/heatRamp'
import { useMotionSource, type NumberSource } from '../visuals/heat/useMotionSource'
import { EASE_OUT } from './tokens'
import { useReducedMotion } from './useReducedMotion'

/**
 * Heat fill interpolation (Requirements 33.2, 35.2, 35.4). Temperatures map to
 * a position on the heat ramp, and the position, not the colour, is tweened,
 * so every in-between colour is a mix of two neighbouring `--heat-N` tokens.
 */

/** Heat fill tween: 300 ms on `--ease-out`. */
export const HEAT_FILL_MS = 300
export const HEAT_FILL_TWEEN = { duration: HEAT_FILL_MS / 1000, ease: EASE_OUT } as const

/** Maps a temperature to a heat position. Must be a stable function. */
export type HeatPositionOf = (tempC: number) => number

/** Stepped mapping: the integer heat stop, so a resting fill is exactly one `--heat-N` token. */
export const stepPosition: HeatPositionOf = (tempC) => (Number.isFinite(tempC) ? heatStopIndex(tempC) : 0)

/**
 * Heat position that follows `source`, tweened over 300 ms. It jumps instead
 * under reduced motion and to or from a non-finite reading (a fault has no
 * in-between), so status changes always render at once.
 */
export function useHeatPosition(source: MotionValue<number>, positionOf: HeatPositionOf = heatPosition): MotionValue<number> {
  const reduced = useReducedMotion()
  const position = useMotionValue(positionOf(source.get()))
  useMotionValueEvent(source, 'change', (v) => {
    const target = positionOf(v)
    if (reduced || !Number.isFinite(v)) position.jump(target)
    else void animate(position, target, HEAT_FILL_TWEEN)
  })
  return position
}

/**
 * CSS fill colour for a live temperature, interpolated in heat-scale space.
 * `positionOf` defaults to the stepped scale, so at rest the fill equals
 * `heatToken(heatStopIndex(t))`.
 */
export function useHeatFill(tempC: NumberSource, positionOf: HeatPositionOf = stepPosition): MotionValue<string> {
  const source = useMotionSource(tempC)
  const position = useHeatPosition(source, positionOf)
  return useTransform(position, heatMix)
}
