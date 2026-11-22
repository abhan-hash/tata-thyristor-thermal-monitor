import { useId, useMemo } from 'react'

/**
 * Heat_Defs (Requirement 15.1): the gradients, filters and hatch pattern shared
 * by every signature visual. Each visual instance renders its own <HeatDefs>
 * with ids from `useHeatDefIds()`, so two discs on one page never resolve
 * each other's `url(#…)` references.
 */

export interface HeatDefIds {
  /** Horizontal heat ramp (crimson → orange → pale), objectBoundingBox. */
  linear: string
  /** x-only Gaussian blur for motion smears. */
  blurX: string
  /** Small isotropic blur that feathers stepped band edges. */
  soften: string
  /** Wide blur for the glow halo behind hot shapes. */
  glow: string
  /** Monochrome fractal-noise grain (matte texture). */
  grain: string
  /** Striped hatch for the fault treatment (never a heat colour). */
  faultHatch: string
}

/** Builds a full id set from a React `useId()` value (stripped to URL-safe characters). */
export function heatDefIds(rawId: string): HeatDefIds {
  const base = `heat-${rawId.replace(/[^A-Za-z0-9_-]/g, '')}`
  return {
    linear: `${base}-linear`,
    blurX: `${base}-blur-x`,
    soften: `${base}-soften`,
    glow: `${base}-glow`,
    grain: `${base}-grain`,
    faultHatch: `${base}-fault-hatch`,
  }
}

/** Unique, render-stable heat def ids for one visual instance. */
export function useHeatDefIds(): HeatDefIds {
  const raw = useId()
  return useMemo(() => heatDefIds(raw), [raw])
}

/** `url(#id)` reference for a paint server or filter. */
export function svgUrl(id: string): string {
  return `url(#${id})`
}

export interface HeatDefsProps {
  ids: HeatDefIds
  /** Horizontal standard deviation of the smear blur, in user units. Default 6. */
  blurX?: number
}

/** Renders the shared <defs>. Place it first inside the owning <svg>. */
export function HeatDefs({ ids, blurX = 6 }: HeatDefsProps) {
  return (
    <defs>
      <linearGradient id={ids.linear} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" style={{ stopColor: 'var(--heat-6)' }} />
        <stop offset="0.45" style={{ stopColor: 'var(--heat-4)' }} />
        <stop offset="0.8" style={{ stopColor: 'var(--heat-3)' }} />
        <stop offset="1" style={{ stopColor: 'var(--heat-2)' }} />
      </linearGradient>

      {/* Region widened on x only, so the smear is not clipped at the box edge. */}
      <filter id={ids.blurX} x="-30%" y="0" width="160%" height="100%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation={`${blurX} 0`} />
      </filter>

      <filter id={ids.soften} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="1.1" />
      </filter>

      <filter id={ids.glow} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="12" />
      </filter>

      {/* Grain: noise → greyscale → low alpha. The source graphic only sets the region. */}
      <filter id={ids.grain} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>

      <pattern
        id={ids.faultHatch}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(-45)"
      >
        <rect width="8" height="8" style={{ fill: 'var(--surface-panel)' }} />
        <rect width="4" height="8" style={{ fill: 'var(--line-subtle)' }} />
      </pattern>
    </defs>
  )
}
