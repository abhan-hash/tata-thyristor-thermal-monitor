import { useEffect, useState } from 'react'
import type { ConnectionStatus } from '../domain/types'
import { StaleIcon } from './icons/StaleIcon'

export interface ConnectionBannerProps {
  status: ConnectionStatus
  /** `Date.now()` time of the last valid frame, or null if none has arrived. */
  lastFrameAt: number | null
  className?: string
}

/** Statuses that show the banner. `live`, `connecting` and `offline` are covered elsewhere. */
export function isBannerStatus(status: ConnectionStatus): status is 'stale' | 'reconnecting' {
  return status === 'stale' || status === 'reconnecting'
}

/** Whole seconds since the last frame, never negative. */
export function secondsSince(lastFrameAt: number, now: number): number {
  return Math.max(0, Math.floor((now - lastFrameAt) / 1000))
}

/**
 * Visible banner text (Requirement 12.3). Uses an en dash, as specified:
 * "Data stale – last frame 3 s ago".
 */
export function bannerMessage(status: 'stale' | 'reconnecting', lastFrameAt: number | null, now: number): string {
  const lead = status === 'stale' ? 'Data stale' : 'Reconnecting'
  if (lastFrameAt === null) {
    return status === 'stale' ? `${lead} – no frame received yet` : `${lead} to the data source`
  }
  return `${lead} – last frame ${secondsSince(lastFrameAt, now)} s ago`
}

/** Short, non-counting text for the live region, so screen readers hear the change once. */
const ANNOUNCEMENT: Readonly<Record<'stale' | 'reconnecting', string>> = {
  stale: 'Data stale. Readings are frozen at the last frame.',
  reconnecting: 'Reconnecting to the data source.',
}

/** Current time, read on mount and once a second after. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [])
  return now
}

function ReconnectIcon() {
  // Two arcs chasing each other; spins slowly (stopped by reduced motion).
  return (
    <svg
      viewBox="0 0 16 16"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-shape="reconnect"
      className="shrink-0 animate-[spin_1.4s_linear_infinite]"
    >
      <path d="M13.25 8A5.25 5.25 0 0 1 4 11.4" />
      <path d="M2.75 8A5.25 5.25 0 0 1 12 4.6" />
      <path d="M12.4 2.4 12 4.6l-2.2-.3" />
      <path d="M3.6 13.6 4 11.4l2.2.3" />
    </svg>
  )
}

const BAR = [
  'flex min-h-[var(--conn-banner-height)] items-center justify-center gap-2.5 px-4 py-2',
  'border-b [border-color:var(--conn-banner-border)] [background-color:var(--conn-banner-bg)]',
  'text-[length:var(--conn-banner-size)] [color:var(--conn-banner-fg)] text-center',
  // Enters from just above with a short fade; leaves instantly when data returns.
  'transition-[opacity,translate] duration-2 ease-out starting:-translate-y-1 starting:opacity-0',
].join(' ')

/**
 * Strip shown while the stream is stale or reconnecting. The live region is
 * always mounted so assistive tech announces the change; the seconds counter
 * sits outside it so it is not re-announced every tick.
 */
export function ConnectionBanner({ status, lastFrameAt, className }: ConnectionBannerProps) {
  const visible = isBannerStatus(status)
  return (
    <div className={className} data-status={status}>
      <p role="status" className="sr-only">
        {visible ? ANNOUNCEMENT[status] : ''}
      </p>
      {visible && <BannerBar status={status} lastFrameAt={lastFrameAt} />}
    </div>
  )
}

/* Mounted only while visible, so the clock starts fresh each time the banner appears. */
function BannerBar({ status, lastFrameAt }: { status: 'stale' | 'reconnecting'; lastFrameAt: number | null }) {
  const now = useNow()
  return (
    <div className={BAR} data-testid="connection-banner">
      <span className="flex [color:var(--conn-banner-icon)]">
        {status === 'stale' ? <StaleIcon size={14} className="shrink-0" /> : <ReconnectIcon />}
      </span>
      <span className="num">{bannerMessage(status, lastFrameAt, now)}</span>
    </div>
  )
}
