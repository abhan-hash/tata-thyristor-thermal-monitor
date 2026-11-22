export interface StaleIconProps {
  /** Rendered width and height in px. The artwork is drawn on a 16 px grid. */
  size?: number
  className?: string
}

/**
 * Decorative "stopped clock": a broken dial with frozen hands. The broken
 * rim keeps it apart from the solid check-circle used for normal status.
 */
export function StaleIcon({ size = 14, className }: StaleIconProps) {
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
      data-shape="stopped-clock"
      className={className}
    >
      <circle cx="8" cy="8" r="6.25" strokeDasharray="3.1 1.8" />
      <path d="M8 4.75V8l2.25 1.5" />
    </svg>
  )
}
