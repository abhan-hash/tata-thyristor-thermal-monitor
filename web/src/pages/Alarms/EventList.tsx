import { useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { EventTrace } from '../../charts/EventTrace'
import { useTrace } from '../../data/historyHooks'
import type { AlarmEvent } from '../../domain/types'
import { cx } from '../../kit/controlStyles'
import { EmptyState } from '../../kit/EmptyState'
import { ChevronIcon } from '../../kit/icons/ChevronIcon'
import { QueryState } from '../../kit/QueryState'
import { StatusChip } from '../../kit/StatusChip'
import { ARRIVAL, ARRIVAL_HIGHLIGHT } from '../../motion/presets'
import type { Acknowledgement } from '../../state/uiStore'
import {
  KIND_LABEL,
  VIRTUALIZE_THRESHOLD,
  ackOf,
  describeEvent,
  formatEventDateTime,
  formatEventTime,
  isActive,
} from './alarmUi'
import { useElementWidth } from './useElementWidth'

export interface EventListProps {
  /** Filtered events, newest first. */
  events: readonly AlarmEvent[]
  /** Expanded event id (`?event=`), or undefined. */
  expandedId: string | undefined
  /** Expands `id`, or collapses when `id` is the expanded one. */
  onToggle: (id: string) => void
  /** Live session ids. They have no recorded trace yet, so the trace query is skipped. */
  liveIds: ReadonlySet<string>
  /** Rows that just arrived; each plays one slide-and-highlight when it mounts. */
  arrivals?: ReadonlySet<string>
  acks: Readonly<Record<string, Acknowledgement>>
  /** Acknowledge as the session user. Resolves when recorded. */
  onAcknowledge: (event: AlarmEvent) => Promise<void>
  /** Session user's display name, shown in the confirmation. */
  userName: string
  className?: string
}

/** Estimated collapsed row height for the virtualiser, px. */
const ROW_ESTIMATE = 64

export const BUTTON = [
  'inline-flex min-h-[var(--control-min-height)] shrink-0 items-center justify-center rounded-1 border px-3',
  'border-line-strong text-text-primary text-12 uppercase [font-weight:var(--font-label-weight)]',
  'tracking-[var(--control-label-tracking)] cursor-pointer hover:bg-surface-raised',
  'disabled:cursor-not-allowed disabled:opacity-[var(--control-disabled-opacity)]',
].join(' ')
export const BUTTON_PRIMARY = cx(BUTTON, 'border-accent bg-accent text-on-accent hover:bg-accent-strong')

/**
 * Event list (Requirements 26.5, 26.10). Rows expand in place to show the
 * Event_Trace and details. At 200 or more events the list is virtualised.
 */
export function EventList(props: EventListProps) {
  if (props.events.length === 0) {
    return (
      <EmptyState
        kind="no-alarms"
        heading="No matching alarms"
        message="No event matches the current filter and time range. Clear a filter or the brush to see more."
        headingLevel={2}
        {...(props.className !== undefined ? { className: props.className } : {})}
      />
    )
  }
  return props.events.length >= VIRTUALIZE_THRESHOLD ? <VirtualList {...props} /> : <PlainList {...props} />
}

function PlainList({ events, className, ...row }: EventListProps) {
  return (
    <ul aria-label="Alarm events" data-virtualized="false" className={cx('flex flex-col gap-2', className)}>
      {events.map((event, i) => (
        <li key={event.id} aria-setsize={events.length} aria-posinset={i + 1}>
          <EventRow event={event} {...row} />
        </li>
      ))}
    </ul>
  )
}

function VirtualList({ events, className, expandedId, ...row }: EventListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // The virtualiser is read fresh each render; this component is not compiler-memoised.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE,
    getItemKey: (i) => events[i]?.id ?? i,
    overscan: 6,
    gap: 8,
  })
  // Bring a deep-linked expanded row into view once.
  const initialExpanded = useRef(expandedId)
  useEffect(() => {
    const id = initialExpanded.current
    if (id === undefined) return
    const index = events.findIndex((e) => e.id === id)
    if (index > 0) virtualizer.scrollToIndex(index, { align: 'start' })
    initialExpanded.current = undefined
  }, [events, virtualizer])
  return (
    <div
      ref={scrollRef}
      data-testid="event-list-scroll"
      className={cx('max-h-[70vh] overflow-y-auto overscroll-contain', className)}
    >
      <ul
        aria-label="Alarm events"
        data-virtualized="true"
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const event = events[item.index]
          if (!event) return null
          return (
            <li
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              aria-setsize={events.length}
              aria-posinset={item.index + 1}
              className="absolute inset-x-0 top-0"
              style={{ transform: `translateY(${String(item.start)}px)` }}
            >
              <EventRow event={event} expandedId={expandedId} {...row} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type RowProps = Omit<EventListProps, 'events' | 'className'> & { event: AlarmEvent }

/** Events merged into a coalesced row (`coalesceAlarms`), 1 for a plain event. */
export function repeatsOf(event: AlarmEvent): number {
  return 'repeats' in event && typeof event.repeats === 'number' ? event.repeats : 1
}

function EventRow({ event, expandedId, onToggle, liveIds, arrivals, acks, onAcknowledge, userName }: RowProps) {
  const expanded = expandedId === event.id
  const arriving = arrivals?.has(event.id) === true
  const repeats = repeatsOf(event)
  const detailsId = `event-details-${event.id.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const ack = ackOf(event, acks)
  const active = isActive(event)
  return (
    <motion.article
      data-event-id={event.id}
      data-expanded={expanded}
      data-arriving={arriving || undefined}
      // One 240 ms slide-in on mount for a new row (Requirement 33.8); `initial` is read on mount only.
      initial={arriving ? ARRIVAL.initial : false}
      animate={ARRIVAL.animate}
      transition={ARRIVAL.transition}
      className={cx(
        'relative rounded-1 border bg-surface-panel',
        expanded ? 'border-line-strong' : 'border-line-subtle',
      )}
    >
      {arriving && (
        <motion.span
          aria-hidden="true"
          data-part="arrival-highlight"
          {...ARRIVAL_HIGHLIGHT}
          className="pointer-events-none absolute inset-0 rounded-1 bg-accent/12"
        />
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-2 sm:flex-nowrap">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => {
            onToggle(event.id)
          }}
          className="flex min-h-[var(--control-min-height)] min-w-0 basis-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-1 px-1 text-start sm:flex-1 sm:basis-auto sm:flex-nowrap"
        >
          <ChevronIcon
            size={14}
            className={cx('shrink-0 text-text-secondary transition-transform duration-1', expanded && 'rotate-90')}
          />
          {/* The summary text names the severity, so the chip is not read twice. */}
          <span aria-hidden="true" className="shrink-0">
            <StatusChip status={event.severity} size="sm" />
          </span>
          <span className="min-w-[12rem] flex-1">
            <span className="block truncate text-14 text-text-primary">{describeEvent(event)}</span>
            <span className="block text-12 text-text-secondary tabular-nums">
              {formatEventTime(event.raised_at)} · peak {event.peak_value.toFixed(1)} {event.unit}
              {repeats > 1 ? ` · ×${String(repeats)}` : ''}
              {active ? ' · ACTIVE' : ''}
              {liveIds.has(event.id) ? ' · LIVE' : ''}
            </span>
          </span>
        </button>
        <AckControl event={event} ack={ack} onAcknowledge={onAcknowledge} userName={userName} />
      </div>
      {expanded ? (
        <div id={detailsId} className="border-t border-line-subtle p-3">
          <EventDetails event={event} live={liveIds.has(event.id)} ack={ack} />
        </div>
      ) : null}
    </motion.article>
  )
}

interface AckControlProps {
  event: AlarmEvent
  ack: Acknowledgement | undefined
  onAcknowledge: (event: AlarmEvent) => Promise<void>
  userName: string
}

/**
 * Acknowledge with inline confirmation (Requirements 26.6–26.8). Native
 * buttons only, so Tab, Enter and Space work; Escape cancels and returns
 * focus to Acknowledge.
 */
export function AckControl({ event, ack, onAcknowledge, userName }: AckControlProps) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const ackRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
    else if (returnFocus.current) {
      returnFocus.current = false
      ackRef.current?.focus()
    }
  }, [confirming])

  if (ack) {
    return (
      <p className="shrink-0 text-12 text-text-secondary tabular-nums" data-testid="ack-record">
        <span className="uppercase tracking-[var(--control-label-tracking)] text-status-normal">ACK</span>{' '}
        {ack.by} · {formatEventTime(ack.at)}
      </p>
    )
  }
  const cancel = () => {
    returnFocus.current = true
    setConfirming(false)
  }
  if (!confirming) {
    return (
      <button
        ref={ackRef}
        type="button"
        className={BUTTON}
        aria-label={`Acknowledge ${describeEvent(event)} at ${formatEventTime(event.raised_at)}`}
        onClick={() => {
          setError(false)
          setConfirming(true)
        }}
      >
        Acknowledge
      </button>
    )
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && !busy) {
      e.preventDefault()
      cancel()
    }
  }
  return (
    <div
      role="group"
      aria-label="Confirm acknowledgement"
      onKeyDown={onKeyDown}
      className="flex shrink-0 flex-wrap items-center gap-2"
    >
      <span className="text-12 text-text-secondary">
        {error ? 'Could not acknowledge. Try again?' : `Acknowledge as ${userName}?`}
      </span>
      <button
        ref={confirmRef}
        type="button"
        className={BUTTON_PRIMARY}
        disabled={busy}
        onClick={() => {
          setBusy(true)
          onAcknowledge(event)
            .then(() => {
              setConfirming(false)
            })
            .catch(() => {
              setError(true)
            })
            .finally(() => {
              setBusy(false)
            })
        }}
      >
        {busy ? 'Saving' : 'Confirm'}
      </button>
      <button type="button" className={BUTTON} disabled={busy} onClick={cancel}>
        Cancel
      </button>
    </div>
  )
}

function EventDetails({ event, live, ack }: { event: AlarmEvent; live: boolean; ack: Acknowledgement | undefined }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(640)
  const trace = useTrace(live ? null : event.id)
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-12 sm:grid-cols-4">
        <Detail term="Kind" value={KIND_LABEL[event.kind]} />
        <Detail term="Raised" value={formatEventDateTime(event.raised_at)} />
        <Detail term="Cleared" value={event.cleared_at ? formatEventDateTime(event.cleared_at) : 'Active'} />
        <Detail term="Peak" value={`${event.peak_value.toFixed(1)} ${event.unit}`} />
        <Detail term="Acknowledged" value={ack ? `${ack.by}, ${formatEventDateTime(ack.at)}` : 'Not acknowledged'} />
        <Detail term="Event id" value={event.id} />
      </dl>
      {live ? (
        <EmptyState
          kind="no-data"
          headingLevel={3}
          heading="Trace not recorded yet"
          message="This alarm was raised in the current session. Its trace is available once the history store has recorded it."
        />
      ) : (
        <QueryState
          query={trace}
          loadingLabel="Loading event trace"
          errorHeading="Could not load the trace"
          isEmpty={(d) => d.t.length === 0}
          empty={{ heading: 'No trace recorded', message: 'The history store holds no samples for this event.' }}
        >
          {(data) => <EventTrace event={event} trace={data} width={width} height={width < 480 ? 180 : 220} />}
        </QueryState>
      )}
    </div>
  )
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="uppercase tracking-[var(--control-label-tracking)] text-text-muted">{term}</dt>
      <dd className="break-words text-text-primary tabular-nums">{value}</dd>
    </div>
  )
}
