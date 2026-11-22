import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { SeverityTimeline } from '../../charts/SeverityTimeline'
import { TIMELINE_WINDOW_MS, laneLabel } from '../../charts/severityTimelineModel'
import { useAcknowledge, useAlarmHistory } from '../../data/historyHooks'
import { useAlarmLog } from '../../data/hooks'
import {
  ALARM_CHANNELS,
  ALARM_KINDS,
  ALARM_SEVERITIES,
  filterEvents,
  parseAlarmParams,
  toggleValue,
  updateAlarmParams,
  type AlarmParamsPatch,
} from '../../domain/alarmFilters'
import type { AlarmEvent } from '../../domain/types'
import { CONTROL_LABEL, cx } from '../../kit/controlStyles'
import { FilterChip } from '../../kit/FilterChip'
import { HeroLockup } from '../../kit/HeroLockup'
import { QueryState } from '../../kit/QueryState'
import { STATUS_LABEL } from '../../kit/StatusChip'
import { useUiStore } from '../../state/uiStore'
import { KIND_LABEL, ackOf, announcement, isActive, mergeEvents } from './alarmUi'
import { BUTTON, BUTTON_PRIMARY, EventList } from './EventList'
import { useElementWidth } from './useElementWidth'
import { useTimelineBrush } from './useTimelineBrush'

/**
 * Alarms & History at `/alarms` (Requirement 26). Filter chips, the 24 h
 * Severity_Timeline with its brush, and the event list all read and write
 * the URL (`?sev= ?ch= ?kind= ?from= ?to= ?event=`). Live session alarms sit
 * on top of recorded history and are announced politely.
 */
export function AlarmsPage() {
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => parseAlarmParams(params), [params])
  const brush = useTimelineBrush()

  // The 24 h window is fixed at mount, so the history query key is stable.
  const [end] = useState(() => new Date())
  const query = useMemo(() => ({ from: new Date(end.getTime() - TIMELINE_WINDOW_MS), to: end }), [end])
  const history = useAlarmHistory(query)
  const live = useAlarmLog()
  const liveIds = useMemo(() => new Set(live.map((e) => e.id)), [live])
  const merged = useMemo(() => mergeEvents(live, history.data ?? []), [live, history.data])

  const scoped = useMemo(
    () =>
      filterEvents(merged, {
        ...(state.severities ? { severities: state.severities } : {}),
        ...(state.channels ? { channels: state.channels } : {}),
        ...(state.kinds ? { kinds: state.kinds } : {}),
      }),
    [merged, state.severities, state.channels, state.kinds],
  )
  const visible = useMemo(
    () => filterEvents(scoped, { ...(state.from ? { from: state.from } : {}), ...(state.to ? { to: state.to } : {}) }),
    [scoped, state.from, state.to],
  )

  const patch = useCallback(
    (p: AlarmParamsPatch) => {
      setParams((prev) => updateAlarmParams(prev, p), { replace: true })
    },
    [setParams],
  )
  const onToggleEvent = useCallback(
    (id: string) => {
      setParams(
        (prev) => updateAlarmParams(prev, { event: parseAlarmParams(prev).event === id ? undefined : id }),
        { replace: true },
      )
    },
    [setParams],
  )

  // Acknowledge: recorded events go to the History_Repository; live session
  // events are not in the repository yet, so they are held in the UI store.
  const userName = useUiStore((s) => s.sessionUser.name)
  const acks = useUiStore((s) => s.acks)
  const mutation = useAcknowledge()
  const { mutateAsync } = mutation
  const onAcknowledge = useCallback(
    async (event: AlarmEvent) => {
      if (liveIds.has(event.id)) useUiStore.getState().acknowledge(event.id, { by: userName })
      else await mutateAsync({ eventId: event.id, user: userName })
    },
    [liveIds, mutateAsync, userName],
  )
  const unacked = useMemo(() => visible.filter((e) => ackOf(e, acks) === undefined), [visible, acks])
  const onAcknowledgeAll = useCallback(async () => {
    await Promise.all(unacked.map((e) => onAcknowledge(e)))
  }, [unacked, onAcknowledge])

  const activeCount = useMemo(() => merged.filter(isActive).length, [merged])
  const message = useLiveAnnouncement(live)
  const [timelineRef, timelineWidth] = useElementWidth<HTMLDivElement>(960)
  const anyFilter = Boolean(state.severities ?? state.channels ?? state.kinds)
  const ranged = state.from !== undefined || state.to !== undefined

  return (
    <div className="layout-page flex flex-col gap-6 py-8">
      <HeroLockup
        title="ALARMS"
        subtitle="Alarms and history"
        secondary={
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <p className="flex flex-col" data-testid="active-count">
              <span className={CONTROL_LABEL}>Active</span>
              <span className="text-28 leading-none text-text-primary tabular-nums">{activeCount}</span>
            </p>
            <AckAllControl count={unacked.length} userName={userName} onConfirm={onAcknowledgeAll} />
          </div>
        }
      />

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="alarm-announcer">
        {message}
      </p>

      <section aria-label="Alarm filters" className="flex flex-col gap-3">
        <ChipRow label="Severity">
          {ALARM_SEVERITIES.map((s) => (
            <FilterChip
              key={s}
              label={STATUS_LABEL[s]}
              count={merged.filter((e) => e.severity === s).length}
              selected={state.severities?.includes(s) ?? false}
              onToggle={() => {
                patch({ severities: toggleValue(state.severities, s) })
              }}
            />
          ))}
        </ChipRow>
        <ChipRow label="Channel">
          {ALARM_CHANNELS.map((c) => (
            <FilterChip
              key={String(c)}
              label={laneLabel(c)}
              selected={state.channels?.includes(c) ?? false}
              onToggle={() => {
                patch({ channels: toggleValue(state.channels, c) })
              }}
            />
          ))}
        </ChipRow>
        <ChipRow label="Kind">
          {ALARM_KINDS.map((k) => (
            <FilterChip
              key={k}
              label={KIND_LABEL[k]}
              selected={state.kinds?.includes(k) ?? false}
              onToggle={() => {
                patch({ kinds: toggleValue(state.kinds, k) })
              }}
            />
          ))}
        </ChipRow>
      </section>

      <section aria-label="Alarm timeline" className="flex flex-col gap-2">
        <div ref={timelineRef} className="w-full min-w-0 overflow-x-auto rounded-1 border border-line-subtle bg-surface-panel">
          <SeverityTimeline
            events={scoped}
            end={end}
            channels={state.channels}
            from={brush.from}
            to={brush.to}
            onBrushChange={brush.onBrushChange}
            width={Math.max(320, timelineWidth)}
          />
        </div>
      </section>

      <section aria-labelledby="alarm-events-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="alarm-events-heading" className={CONTROL_LABEL}>
            Events · {visible.length} shown
          </h2>
          <div className="flex flex-wrap gap-2">
            {anyFilter ? (
              <button
                type="button"
                className={BUTTON}
                onClick={() => {
                  patch({ severities: undefined, channels: undefined, kinds: undefined })
                }}
              >
                Clear filters
              </button>
            ) : null}
            {ranged ? (
              <button
                type="button"
                className={BUTTON}
                onClick={() => {
                  brush.onBrushChange(null)
                }}
              >
                Clear range
              </button>
            ) : null}
          </div>
        </div>
        <QueryState
          query={history}
          loadingLabel="Loading alarm history"
          isEmpty={() => false}
        >
          {() => (
            <EventList
              events={visible}
              expandedId={state.event}
              onToggle={onToggleEvent}
              liveIds={liveIds}
              acks={acks}
              onAcknowledge={onAcknowledge}
              userName={userName}
            />
          )}
        </QueryState>
      </section>
    </div>
  )
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={`${label} filter`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className={cx(CONTROL_LABEL, 'w-20 shrink-0')}>{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

/** "Acknowledge all visible" with the same inline confirmation as a row (Requirements 26.1, 26.6, 26.8). */
function AckAllControl({
  count,
  userName,
  onConfirm,
}: {
  count: number
  userName: string
  onConfirm: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const openRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
    else if (returnFocus.current) {
      returnFocus.current = false
      openRef.current?.focus()
    }
  }, [confirming])
  const cancel = () => {
    returnFocus.current = true
    setConfirming(false)
  }
  if (!confirming) {
    return (
      <button
        ref={openRef}
        type="button"
        className={BUTTON}
        disabled={count === 0}
        onClick={() => {
          setConfirming(true)
        }}
      >
        Acknowledge all visible
      </button>
    )
  }
  return (
    <div
      role="group"
      aria-label="Confirm acknowledge all visible"
      className="flex flex-wrap items-center gap-2"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !busy) {
          e.preventDefault()
          cancel()
        }
      }}
    >
      <span className="text-12 text-text-secondary">
        Acknowledge {count} as {userName}?
      </span>
      <button
        ref={confirmRef}
        type="button"
        className={BUTTON_PRIMARY}
        disabled={busy}
        onClick={() => {
          setBusy(true)
          onConfirm()
            .catch(() => undefined)
            .finally(() => {
              setBusy(false)
              setConfirming(false)
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

/** Announcement for the newest alarm raised since mount (Requirement 26.9). */
function useLiveAnnouncement(live: readonly AlarmEvent[]): string {
  const seen = useRef<Set<string> | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(live.map((e) => e.id))
      return
    }
    let newest: AlarmEvent | undefined
    for (const e of live) {
      if (seen.current.has(e.id)) continue
      seen.current.add(e.id)
      if (e.cleared_at === undefined) newest = e
    }
    if (newest) setMessage(announcement(newest))
  }, [live])
  return message
}
