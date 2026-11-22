export interface ChevronIconProps {
  /** Rendered width and height in px. The artwork is drawn on a 16 px grid. */
  size?: number
  className?: string
}

/** Decorative right-pointing chevron, same 1.5 px stroke family as StatusIcon. */
export function ChevronIcon({ size = 16, className }: ChevronIconProps) {
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
      className={className}
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}
