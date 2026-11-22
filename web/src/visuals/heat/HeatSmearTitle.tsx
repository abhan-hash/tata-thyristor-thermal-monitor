import { useMotionValueEvent } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { HeatDefs, svgUrl, useHeatDefIds } from './HeatDefs'
import { useMotionSource, type NumberSource } from './useMotionSource'

/**
 * Heat_Smear_Title (Requirement 15.3): the reference's "THERMAL" wordmark.
 * Heat-gradient text with three trailing copies offset to the left through an
 * x-only blur. `intensity` (0..1, e.g. following the hottest Tj) sets how far
 * and how strongly the smear trails; it can be a MotionValue, in which case
 * the copies update without re-rendering.
 */
export interface HeatSmearTitleProps {
  text: string
  /** Smear strength 0..1; out-of-range values are clamped, NaN is 0. Default 0.6. */
  intensity?: NumberSource
  /** Cap height driver: font size in px. Default 64. */
  fontSize?: number
  className?: string
}

export const SMEAR_COPIES = 3
/* Per copy k (1..3): offset = k · OFFSET_EM · fontSize · intensity, opacity = OPACITY[k-1] · intensity. */
const OFFSET_EM = 0.12
const COPY_OPACITY = [0.55, 0.32, 0.16] as const
/*
 * Fallback advance per glyph for weight 800 at 125 % width (caps and digits
 * of the display face run ~0.78–0.84 em), used until the text is measured
 * and wherever SVG text measurement is unavailable (jsdom, SSR). Errs wide so
 * an unmeasured title never overflows into a neighbouring element.
 */
export const FALLBACK_ADVANCE_EM = 0.82
/* Letter spacing applied to the title, in em. */
const TRACKING_EM = 0.01

/** viewBox width before measurement: fallback advance plus tracking per glyph. */
export function estimateTitleWidth(text: string, fontSize: number): number {
  return Math.ceil(text.length * (FALLBACK_ADVANCE_EM + TRACKING_EM) * fontSize)
}

/**
 * Measured advance of an SVG text node in user units, or null when the
 * environment cannot measure it (no layout, font not applied, zero length).
 */
export function measureTextWidth(el: SVGTextElement | null): number | null {
  if (!el) return null
  let w = Number.NaN
  if (typeof el.getComputedTextLength === 'function') w = el.getComputedTextLength()
  if (!(w > 0) && typeof el.getBBox === 'function') {
    try {
      w = el.getBBox().width
    } catch {
      // getBBox throws on nodes that are not rendered (e.g. display: none ancestors).
    }
  }
  return Number.isFinite(w) && w > 0 ? w : null
}

export function clampIntensity(x: number): number {
  return Number.isNaN(x) ? 0 : Math.min(1, Math.max(0, x))
}

/** Offset (user units, ≤ 0) and opacity for smear copy `k` (1-based). */
export function smearCopy(k: number, intensity: number, fontSize: number) {
  const i = clampIntensity(intensity)
  return {
    dx: -k * OFFSET_EM * fontSize * i,
    opacity: (COPY_OPACITY[k - 1] ?? 0) * i,
  }
}

export function HeatSmearTitle({ text, intensity = 0.6, fontSize = 64, className }: HeatSmearTitleProps) {
  const ids = useHeatDefIds()
  const source = useMotionSource(intensity)
  const copies = useRef<(SVGTextElement | null)[]>([])
  const titleRef = useRef<SVGTextElement>(null)
  const [measured, setMeasured] = useState<{ key: string; width: number } | null>(null)
  const key = `${String(fontSize)}|${text}`

  // Size the viewBox to the real glyph advance so the wordmark never spills
  // past its box (e.g. into HeroLockup's divider). Re-measure once web fonts
  // settle, since the fallback face has different metrics.
  useLayoutEffect(() => {
    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const w = measureTextWidth(titleRef.current)
      if (w !== null) setMeasured({ key, width: Math.ceil(w + fontSize * 0.04) })
    }
    measure()
    // `document.fonts` is missing in jsdom despite the DOM typings, hence the optional calls.
    const fonts: FontFaceSet | undefined = typeof document === 'undefined' ? undefined : document.fonts
    void fonts?.ready.then(measure)
    fonts?.addEventListener('loadingdone', measure)
    return () => {
      cancelled = true
      fonts?.removeEventListener('loadingdone', measure)
    }
  }, [key, fontSize])

  useMotionValueEvent(source, 'change', (v) => {
    copies.current.forEach((el, idx) => {
      if (!el) return
      const c = smearCopy(idx + 1, v, fontSize)
      el.setAttribute('transform', `translate(${c.dx.toFixed(2)} 0)`)
      el.setAttribute('opacity', c.opacity.toFixed(3))
    })
  })

  const width = measured?.key === key ? measured.width : estimateTitleWidth(text, fontSize)
  const height = Math.ceil(fontSize * 1.2)
  const baseline = fontSize * 0.95
  const now = source.get()
  const textProps = {
    x: 0,
    y: baseline,
    fontSize,
    style: {
      fill: svgUrl(ids.linear),
      fontFamily: 'var(--font-sans)',
      fontWeight: 800,
      fontStretch: '125%',
      letterSpacing: `${String(TRACKING_EM)}em`,
    },
  } as const

  return (
    <svg
      role="img"
      aria-label={text}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      overflow="visible"
      className={className}
    >
      <HeatDefs ids={ids} blurX={fontSize * 0.09} />
      {/* Farthest copy first so the nearer, stronger copies paint over it. */}
      {[3, 2, 1].map((k) => {
        const c = smearCopy(k, now, fontSize)
        return (
          <text
            key={k}
            ref={(el) => {
              copies.current[k - 1] = el
            }}
            data-part="smear"
            aria-hidden="true"
            transform={`translate(${c.dx.toFixed(2)} 0)`}
            opacity={c.opacity.toFixed(3)}
            filter={svgUrl(ids.blurX)}
            {...textProps}
          >
            {text}
          </text>
        )
      })}
      <text ref={titleRef} data-part="title" {...textProps}>
        {text}
      </text>
    </svg>
  )
}
