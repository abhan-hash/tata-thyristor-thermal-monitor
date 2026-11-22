import type { CSSProperties } from 'react'
import { cx } from './controlStyles'

/**
 * - `wrap`: breaks onto a second line when the label is longer than the
 *   design allows (default).
 * - `fluid`: stays on as few lines as possible and shrinks with `clamp()`
 *   in proportion to how far the label exceeds `designLength`.
 * - `truncate`: clips to `maxLines` with an ellipsis. Only for places where
 *   neither wrapping nor shrinking fits; the full text is then in `title`
 *   (tooltip) and `aria-label`.
 */
export type FluidLabelMode = 'wrap' | 'fluid' | 'truncate'

export interface FluidLabelProps {
  text: string
  mode?: FluidLabelMode
  /** Characters the design was drawn for. Default 16. */
  designLength?: number
  /** Smallest size in `fluid` mode, as a fraction of the inherited size. Default 0.75. */
  minScale?: number
  /** Lines shown in `truncate` mode. Default 1. */
  maxLines?: 1 | 2
  as?: 'span' | 'div' | 'p'
  className?: string
}

/** Shrinks with the overflow ratio, eases back up with viewport width, never above the inherited size. */
const FLUID_SIZE =
  '[font-size:clamp(var(--fluid-label-min),calc(var(--fluid-label-scale)*1em_+_0.25vw),1em)]'

/** Font scale in `fluid` mode: 1 up to `designLength`, then shrinking, never below `minScale`. */
export function fluidScale(length: number, designLength: number, minScale: number): number {
  if (length <= designLength || length === 0) return 1
  return Math.max(minScale, designLength / length)
}

/**
 * A channel or event label that keeps its full text available when it
 * outgrows the design (Requirements 30.5, 30.6).
 */
export function FluidLabel({
  text,
  mode = 'wrap',
  designLength = 16,
  minScale = 0.75,
  maxLines = 1,
  as: Tag = 'span',
  className,
}: FluidLabelProps) {
  if (mode === 'truncate') {
    const style: CSSProperties | undefined =
      maxLines === 2
        ? { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }
        : undefined
    return (
      <Tag
        data-label-mode="truncate"
        title={text}
        aria-label={text}
        className={cx('min-w-0', maxLines === 1 && 'block truncate', className)}
        style={style}
      >
        {text}
      </Tag>
    )
  }

  if (mode === 'fluid') {
    const scale = fluidScale(text.length, designLength, minScale)
    const style =
      scale < 1
        ? ({ '--fluid-label-scale': scale.toFixed(3), '--fluid-label-min': `${minScale.toFixed(3)}em` } as CSSProperties)
        : undefined
    return (
      <Tag
        data-label-mode="fluid"
        className={cx('min-w-0 [overflow-wrap:anywhere]', scale < 1 && FLUID_SIZE, className)}
        style={style}
      >
        {text}
      </Tag>
    )
  }

  return (
    <Tag data-label-mode="wrap" className={cx('min-w-0 [overflow-wrap:anywhere] [text-wrap:balance]', className)}>
      {text}
    </Tag>
  )
}
