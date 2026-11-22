import type { Status } from '../../domain/types'

/**
 * One distinct silhouette per Status (Requirement 5.2), so status reads
 * without colour: the outline alone tells normal, warning, critical and
 * fault apart, even in greyscale.
 */
export type StatusIconShape = 'check-circle' | 'triangle' | 'octagon' | 'slashed-sensor'

export const STATUS_ICON_SHAPE: Readonly<Record<Status, StatusIconShape>> = {
  normal: 'check-circle',
  warning: 'triangle',
  critical: 'octagon',
  fault: 'slashed-sensor',
}

export interface StatusIconProps {
  status: Status
  /** Rendered width and height in px. The artwork is drawn on a 16 px grid. */
  size?: number
  className?: string
}

/*
 * Artwork on a 16 × 16 grid, 1.5 px strokes on half-pixel coordinates so the
 * lines land crisply at 1× and 2×. Glyph marks (check, exclamation) share the
 * same weight as the outline so the icons sit together as a family.
 */
function Glyph({ shape }: { shape: StatusIconShape }) {
  switch (shape) {
    case 'check-circle':
      return (
        <>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M5.25 8.25 7.1 10.1 10.75 6.25" />
        </>
      )
    case 'triangle':
      return (
        <>
          <path d="M8 1.9 14.6 13.6H1.4Z" />
          <path d="M8 6.25v3.25" />
          <circle cx="8" cy="11.6" r="0.2" />
        </>
      )
    case 'octagon':
      return (
        <>
          <path d="M5.4 1.75h5.2l3.65 3.65v5.2l-3.65 3.65H5.4L1.75 10.6V5.4Z" />
          <path d="M8 4.9v3.6" />
          <circle cx="8" cy="10.9" r="0.2" />
        </>
      )
    case 'slashed-sensor':
      // A probe (stem + bulb) struck through: the reading cannot be trusted.
      return (
        <>
          <path d="M6.5 9.4V3.5a1.5 1.5 0 0 1 3 0v5.9a2.75 2.75 0 1 1-3 0Z" />
          <path d="M2.25 2.25 13.75 13.75" />
        </>
      )
  }
}

/** Decorative status icon. The accompanying text carries the meaning. */
export function StatusIcon({ status, size = 14, className }: StatusIconProps) {
  const shape = STATUS_ICON_SHAPE[status]
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-shape={shape}
      className={className}
    >
      <Glyph shape={shape} />
    </svg>
  )
}
