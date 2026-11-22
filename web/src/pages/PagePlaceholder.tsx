import { HeroLockup, type HeroLockupScale } from '../kit/HeroLockup'

export interface PagePlaceholderProps {
  /** The page's h1, set in the hero lockup. */
  title: string
  subtitle: string
  scale?: HeroLockupScale
}

/**
 * Stand-in body for a routed page until its Phase 3 build lands, so every
 * route resolves to a titled page inside the shell.
 */
export function PagePlaceholder({ title, subtitle, scale = 'compact' }: PagePlaceholderProps) {
  return (
    <div className="px-[var(--nav-pad-x)] py-8">
      <HeroLockup title={title} subtitle={subtitle} scale={scale} />
    </div>
  )
}
