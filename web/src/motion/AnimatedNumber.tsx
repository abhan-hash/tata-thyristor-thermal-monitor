import { animate, useMotionValue, type MotionValue } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, type HTMLAttributes } from 'react'
import { NUMBER_TWEEN } from './presets'
import { useReducedMotion } from './useReducedMotion'

export interface AnimatedNumberProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Live source value. Each change starts a 200 ms tween toward it. */
  value: MotionValue<number>
  /**
   * Fixed-width formatter (e.g. `formatValueFlush(v, spec)`), so the text
   * width never changes. Receives the in-between values of the tween.
   */
  format: (value: number) => string
}

/**
 * Live number (Requirements 33.1, 35.2). Tweens toward `value` over `--dur-2`
 * with `--ease-out` and writes the formatted text straight to the DOM node,
 * so ticks never re-render React. Jumps instead of tweening under reduced
 * motion and to or from a non-finite value (a placeholder has no in-between).
 * Uses `.num` (tabular figures) so every digit is one cell wide.
 */
export function AnimatedNumber({ value, format, className, ...rest }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useMotionValue(value.get())
  const formatRef = useRef(format)
  const reduced = useReducedMotion()

  // A new formatter (fault flag, threshold) applies at once, without waiting for a tick.
  useLayoutEffect(() => {
    formatRef.current = format
    if (ref.current) ref.current.textContent = format(shown.get())
  }, [format, shown])

  useEffect(() => {
    const write = (v: number) => {
      if (ref.current) ref.current.textContent = formatRef.current(v)
    }
    // A different source (e.g. another channel) is a new reading, not a change: snap to it.
    shown.jump(value.get())
    write(shown.get())
    const offShown = shown.on('change', write)
    const offValue = value.on('change', (target) => {
      const from = shown.get()
      if (reduced || !Number.isFinite(target) || !Number.isFinite(from)) {
        shown.jump(target)
        write(target)
      } else {
        animate(shown, target, NUMBER_TWEEN)
      }
    })
    return () => {
      offValue()
      offShown()
      shown.stop()
    }
  }, [value, shown, reduced])

  return (
    <span ref={ref} className={className ? `num ${className}` : 'num'} {...rest}>
      {format(shown.get())}
    </span>
  )
}
