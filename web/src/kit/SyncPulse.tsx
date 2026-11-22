import { useConnection, useDisplayTick } from '../data/hooks'
import type { ConnectionStatus } from '../domain/types'
import { useReducedMotion } from '../motion/useReducedMotion'
import { cx } from './controlStyles'

/** Static label shown instead of the pulse under reduced motion (Requirement 35.3). */
export const SYNC_LIVE_LABEL = 'LIVE'

/**
 * Whether the pulse flashes: only while the stream is live and the tick
 * carries new frames. A tick that carries the previous values over
 * (`frames === 0`) is not new data, so the pulse stays still.
 */
export function syncPulseFlashes(status: ConnectionStatus, tickFrames: number | null): boolean {
  return status === 'live' && tickFrames !== null && tickFrames > 0
}

/**
 * Sync_Pulse (Requirements 12.4, 33.7, 35.3): a 1 px gold tick in the Top_Nav
 * that flashes once per Display_Tick while data arrives and stops while the
 * connection is stale. Re-keying the tick on the tick's `seq` restarts the
 * one-shot CSS flash. Under reduced motion a static "LIVE" label replaces it.
 */
export function SyncPulse() {
  const { status } = useConnection()
  const tick = useDisplayTick()
  const reduced = useReducedMotion()
  const live = status === 'live'
  if (reduced) {
    return (
      <span
        aria-hidden="true"
        data-part="sync-pulse"
        data-state={live ? 'live' : 'stopped'}
        className={cx(
          'text-11 leading-none font-[600] tracking-[0.2em] uppercase [font-stretch:125%]',
          live ? '[color:var(--nav-pulse)]' : '[color:var(--nav-pulse-idle)]',
        )}
      >
        {SYNC_LIVE_LABEL}
      </span>
    )
  }
  const flashes = syncPulseFlashes(status, tick?.frames ?? null)
  return (
    <span
      key={flashes ? tick?.seq : 'still'}
      aria-hidden="true"
      data-part="sync-pulse"
      data-state={live ? 'live' : 'stopped'}
      data-seq={flashes ? tick?.seq : undefined}
      className={cx(
        'inline-block h-[var(--nav-pulse-height)] w-px shrink-0',
        live ? '[background-color:var(--nav-pulse)]' : '[background-color:var(--nav-pulse-idle)]',
        flashes && 'motion-sync-flash',
      )}
    />
  )
}
