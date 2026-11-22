import { useSearchParams } from 'react-router'
import { useConnection, useDisplayTick, useTelemetry } from '../data/hooks'
import type { TelemetrySnapshot } from '../data/store'
import { cx } from './controlStyles'

/** Query parameter that turns the overlay on: `?dev=1`. */
export const DEV_PARAM = 'dev'

/** True when the search string asks for the dev overlay (`dev=1`). */
export function isDevEnabled(params: URLSearchParams): boolean {
  return params.get(DEV_PARAM) === '1'
}

const selectLastDecodeError = (s: TelemetrySnapshot) => s.lastDecodeError

const PANEL = [
  'pointer-events-none fixed right-3 bottom-3 z-40 min-w-48 rounded-1 border px-3 py-2',
  'border-line-strong bg-surface-raised text-11 text-text-secondary',
].join(' ')

/**
 * Developer readout (Requirement 9.9): dropped-frame count, connection status
 * and frame rate. Frame rate is the valid-frame count of the last 1 s
 * Display_Tick window. Renders nothing unless the URL has `?dev=1`.
 */
export function DevOverlay({ className }: { className?: string }) {
  const [params] = useSearchParams()
  if (!isDevEnabled(params)) return null
  return <DevOverlayPanel className={className} />
}

/* Split out so the store subscriptions only exist while the overlay is shown. */
function DevOverlayPanel({ className }: { className?: string | undefined }) {
  const { status, droppedFrames } = useConnection()
  const tick = useDisplayTick()
  const lastError = useTelemetry(selectLastDecodeError)
  const fps = tick === null ? '–' : `${tick.frames} Hz`
  return (
    <aside aria-label="Developer overlay" data-testid="dev-overlay" className={cx(PANEL, className)}>
      <dl className="num grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-text-muted">Connection</dt>
        <dd className="text-text-primary" data-testid="dev-connection">
          {status}
        </dd>
        <dt className="text-text-muted">Frame rate</dt>
        <dd className="text-text-primary" data-testid="dev-fps">
          {fps}
        </dd>
        <dt className="text-text-muted">Dropped frames</dt>
        <dd className="text-text-primary" data-testid="dev-dropped">
          {droppedFrames}
        </dd>
        {lastError !== null && (
          <>
            <dt className="text-text-muted">Last error</dt>
            <dd className="max-w-64 break-words text-text-primary" data-testid="dev-last-error">
              {lastError.path === '' ? lastError.message : `${lastError.path}: ${lastError.message}`}
            </dd>
          </>
        )}
      </dl>
    </aside>
  )
}
