import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link, NavLink } from 'react-router'
import { useAlarms, useConnection, useSourceKind } from '../data/hooks'
import { cx } from './controlStyles'

/** Route links, in reference order (Requirement 22.5). */
export const NAV_LINKS: readonly { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'OVERVIEW', end: true },
  { to: '/drive', label: 'DRIVE' },
  { to: '/alarms', label: 'ALARMS' },
  { to: '/trends', label: 'TRENDS' },
  { to: '/about', label: 'ABOUT' },
]

/** The sheet lists the route links, then SETTINGS. */
const SHEET_LINKS: readonly { to: string; label: string; end?: boolean }[] = [
  ...NAV_LINKS,
  { to: '/settings', label: 'SETTINGS' },
]

/** Viewport width from which the links sit in the bar; below it they collapse into the sheet (Requirement 22.6). */
export const NAV_SHEET_QUERY = '(min-width: 1024px)'

/** 24-hour local wall-clock time, `HH:MM:SS`. */
export function formatClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** Accessible name for the alarm bell, e.g. "Alarms, 2 active". */
export function alarmBellLabel(count: number): string {
  return count === 0 ? 'Alarms, none active' : `Alarms, ${count} active`
}

/** Wall clock, re-read once a second. */
function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [])
  return now
}

/* ---------------------------------------------------------------------------
 * Shared class strings
 * ------------------------------------------------------------------------- */

const CAPS = [
  'uppercase leading-none whitespace-nowrap',
  '[font-weight:var(--nav-link-weight)] [font-stretch:var(--nav-link-width)]',
  'tracking-[var(--nav-link-tracking)]',
].join(' ')

/** Square 44 px icon target (Requirement 26.4). */
const ICON_TARGET = [
  'relative inline-flex size-[var(--nav-target)] shrink-0 items-center justify-center rounded-2',
  '[color:var(--nav-icon-color)] hover:[color:var(--nav-icon-color-hover)] hover:[background-color:var(--nav-hover-bg)]',
  'transition-[color,background-color] duration-1 ease-out',
].join(' ')

const BAR_LINK = [
  CAPS,
  'relative inline-flex min-h-[var(--nav-target)] items-center px-3 text-[length:var(--nav-link-size)]',
  '[color:var(--nav-link-color)] hover:[color:var(--nav-link-color-hover)]',
  'aria-[current=page]:[color:var(--nav-link-color-active)]',
  // Gold tick under the active link.
  'after:absolute after:inset-x-3 after:bottom-2.5 after:h-px after:origin-left after:scale-x-0',
  'after:[background-color:var(--nav-link-indicator)] after:transition-transform after:duration-2 after:ease-out',
  'aria-[current=page]:after:scale-x-100',
  'transition-colors duration-1 ease-out',
].join(' ')

const SHEET_LINK = [
  CAPS,
  'flex min-h-[var(--nav-sheet-link-height)] items-center justify-between gap-4 px-[var(--nav-pad-x)]',
  'border-b [border-color:var(--nav-sheet-border)] text-[length:var(--nav-sheet-link-size)]',
  '[color:var(--nav-link-color)] hover:[color:var(--nav-link-color-hover)] hover:[background-color:var(--nav-hover-bg)]',
  'aria-[current=page]:[color:var(--nav-link-color-active)]',
  'transition-[color,background-color] duration-1 ease-out',
].join(' ')

/* ---------------------------------------------------------------------------
 * Pieces
 * ------------------------------------------------------------------------- */

/** Start padding equal to the tracking balances the trailing letter-spacing. */
function Caps({ children }: { children: string }) {
  return <span className="ps-[var(--nav-link-tracking)]">{children}</span>
}

function Wordmark() {
  return (
    <Link
      to="/"
      aria-label="thermosense, go to overview"
      className={cx(
        'inline-flex min-h-[var(--nav-target)] shrink-0 items-center rounded-1 leading-none lowercase',
        'text-[length:var(--nav-wordmark-size)] [color:var(--nav-wordmark-color)]',
        '[font-weight:var(--nav-wordmark-weight)] [font-stretch:var(--nav-wordmark-width)]',
        'tracking-[var(--nav-wordmark-tracking)]',
      )}
    >
      thermosense
    </Link>
  )
}

/** "MOCK" data-source badge, shown while the source kind is `mock` (Requirement 8.4). */
function SourceBadge() {
  const kind = useSourceKind()
  if (kind !== 'mock') return null
  return (
    <span
      data-testid="source-badge"
      title="Mock data source: synthetic readings, not plant telemetry"
      className={cx(
        'inline-flex h-5 shrink-0 items-center rounded-1 border px-1.5 leading-none uppercase',
        '[border-color:var(--nav-badge-border)] [color:var(--nav-badge-fg)] text-[length:var(--nav-badge-size)]',
        '[font-weight:var(--nav-link-weight)] [font-stretch:var(--nav-link-width)] tracking-[var(--nav-badge-tracking)]',
      )}
    >
      <span className="ps-[var(--nav-badge-tracking)]">MOCK</span>
    </span>
  )
}

/**
 * Sync_Pulse placeholder: a 1 px gold tick that reads as idle unless frames
 * are live. The per-Display_Tick flash and the reduced-motion "LIVE" label
 * arrive with the motion phase.
 */
function SyncPulse() {
  const { status } = useConnection()
  const live = status === 'live'
  return (
    <span
      aria-hidden="true"
      data-part="sync-pulse"
      data-state={live ? 'live' : 'stopped'}
      className={cx(
        'inline-block h-[var(--nav-pulse-height)] w-px shrink-0 transition-colors duration-2 ease-out',
        live ? '[background-color:var(--nav-pulse)]' : '[background-color:var(--nav-pulse-idle)]',
      )}
    />
  )
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 8.5a5 5 0 0 1 10 0v3.2l1.4 2.3H3.6L5 11.7z" />
      <path d="M8.2 16.5a1.9 1.9 0 0 0 3.6 0" />
    </svg>
  )
}

/** Bell linking to the Alarms page, with the active alarm count. */
function AlarmBell() {
  const count = useAlarms().length
  return (
    <Link to="/alarms" aria-label={alarmBellLabel(count)} data-testid="alarm-bell" className={ICON_TARGET}>
      <BellIcon />
      {count > 0 && (
        <span
          aria-hidden="true"
          data-part="alarm-count"
          className={cx(
            'num absolute top-1.5 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-pill px-1',
            'text-[length:var(--nav-count-size)] leading-none font-bold',
            '[background-color:var(--nav-count-bg)] [color:var(--nav-count-fg)]',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}

function Clock({ className }: { className?: string }) {
  const now = useClock()
  return (
    <time
      dateTime={now.toISOString()}
      aria-label={`Local time ${formatClock(now)}`}
      className={cx(
        'num leading-none whitespace-nowrap text-[length:var(--nav-clock-size)] [color:var(--nav-clock-color)]',
        className,
      )}
    >
      {formatClock(now)}
    </time>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {open ? (
        <path d="M5 5l10 10M15 5L5 15" />
      ) : (
        <>
          <path d="M3 6h14" />
          <path d="M3 10h14" />
          <path d="M3 14h9" />
        </>
      )}
    </svg>
  )
}

function ChevronRight() {
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
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

const FOCUSABLE = 'a[href], button:not([disabled])'

/* ---------------------------------------------------------------------------
 * TopNav
 * ------------------------------------------------------------------------- */

/**
 * Top_Nav from the reference: wordmark left, tracked-caps links centred,
 * utilities right (MOCK badge, sync pulse, clock, alarm bell, SETTINGS).
 * Below 1024 px the links and SETTINGS move into a sheet under the bar,
 * opened by a menu button. The sheet is a disclosure: Tab cycles between the
 * menu button and the sheet links, Escape or the backdrop closes it.
 */
export function TopNav() {
  const [open, setOpen] = useState(false)
  const sheetId = useId()
  const menuRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) menuRef.current?.focus()
  }, [])

  // Move focus into the sheet when it opens.
  useEffect(() => {
    if (!open) return
    sheetRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
  }, [open])

  // Close the sheet once the viewport is wide enough to show the links in the bar.
  useEffect(() => {
    if (!open || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(NAV_SHEET_QUERY)
    const onChange = () => {
      if (mq.matches) setOpen(false)
    }
    onChange()
    mq.addEventListener('change', onChange)
    return () => {
      mq.removeEventListener('change', onChange)
    }
  }, [open])

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (!open) return
    if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
      return
    }
    if (e.key !== 'Tab') return
    const menu = menuRef.current
    const sheet = sheetRef.current
    if (!menu || !sheet) return
    const ring = [menu, ...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = ring[0]
    const last = ring[ring.length - 1]
    const active = document.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last?.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first?.focus()
    }
  }

  return (
    <header data-part="top-nav" data-sheet={open ? 'open' : 'closed'} onKeyDown={onKeyDown}>
      <div
        className={cx(
          'relative z-30 flex h-[var(--nav-height)] items-center gap-3 px-[var(--nav-pad-x)]',
          'border-b [border-color:var(--nav-border)] [background-color:var(--nav-bg)] backdrop-blur-md',
        )}
      >
        <div className="flex flex-1 items-center gap-3">
          <Wordmark />
        </div>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end ?? false} className={BAR_LINK}>
                  <Caps>{link.label}</Caps>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
          <SourceBadge />
          <SyncPulse />
          <Clock className="hidden px-1 sm:inline" />
          <AlarmBell />
          <NavLink to="/settings" className={cx(BAR_LINK, 'max-lg:hidden')}>
            <Caps>SETTINGS</Caps>
          </NavLink>
          <button
            ref={menuRef}
            type="button"
            className={cx(ICON_TARGET, 'cursor-pointer lg:hidden')}
            aria-expanded={open}
            aria-controls={sheetId}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => {
              setOpen((o) => !o)
            }}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      {open && (
        <>
          <div
            aria-hidden="true"
            data-part="nav-backdrop"
            className="fixed inset-0 z-20 [background-color:var(--nav-sheet-backdrop)] lg:hidden"
            onClick={() => {
              close(true)
            }}
          />
          <div
            ref={sheetRef}
            id={sheetId}
            data-testid="nav-sheet"
            className={cx(
              'fixed inset-x-0 top-[var(--nav-height)] z-30 max-h-[calc(100dvh-var(--nav-height))] overflow-y-auto lg:hidden',
              'border-b [border-color:var(--nav-sheet-border)] [background-color:var(--nav-sheet-bg)]',
              '[box-shadow:var(--nav-sheet-shadow)]',
              'transition-[opacity,translate] duration-2 ease-out starting:-translate-y-2 starting:opacity-0',
            )}
          >
            <nav aria-label="Menu">
              <ul>
                {SHEET_LINKS.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.end ?? false}
                      className={SHEET_LINK}
                      onClick={() => {
                        close(false)
                      }}
                    >
                      <Caps>{link.label}</Caps>
                      <ChevronRight />
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex min-h-[var(--nav-sheet-link-height)] items-center justify-between px-[var(--nav-pad-x)] sm:hidden">
              <span className={cx(CAPS, 'text-[length:var(--nav-link-size)] [color:var(--nav-link-color)]')}>
                <Caps>LOCAL TIME</Caps>
              </span>
              <Clock />
            </div>
          </div>
        </>
      )}
    </header>
  )
}
