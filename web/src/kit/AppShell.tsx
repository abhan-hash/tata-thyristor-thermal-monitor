import { Outlet } from 'react-router'
import { useConnection } from '../data/hooks'
import { ContourBackground } from '../visuals/heat/ContourBackground'
import { ConnectionBanner } from './ConnectionBanner'
import { cx } from './controlStyles'
import { TopNav } from './TopNav'

/** Id of the page's main landmark, the skip link's target. */
export const MAIN_ID = 'main'

/**
 * Route layout (Requirement 22.2): contour texture, top nav with the
 * connection banner under it, and the routed page. It stays mounted across
 * navigations, so the nav and its live readouts never remount.
 */
export function AppShell() {
  const { status, lastFrameAt } = useConnection()
  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <a
        href={`#${MAIN_ID}`}
        className={cx(
          'sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-1 focus:px-4 focus:py-3',
          'focus:[background-color:var(--skip-link-bg)] focus:[color:var(--skip-link-fg)] focus:text-14',
        )}
      >
        Skip to content
      </a>
      <ContourBackground />
      <div className="sticky top-0 z-20">
        <TopNav />
        <ConnectionBanner status={status} lastFrameAt={lastFrameAt} />
      </div>
      <main id={MAIN_ID} tabIndex={-1} className="relative flex-1 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
