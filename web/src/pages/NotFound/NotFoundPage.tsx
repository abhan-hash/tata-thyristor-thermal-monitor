import { EmptyState } from '../../kit/EmptyState'

/** Catch-all for unknown paths (Requirement 22.4): an `EmptyState` with a link home. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-[var(--nav-pad-x)]">
      <EmptyState
        kind="no-data"
        headingLevel={2}
        heading="Page not found"
        message="Nothing lives at this address. The live monitor is on the overview."
        action={{ label: 'Go to overview', to: '/' }}
      />
    </div>
  )
}
