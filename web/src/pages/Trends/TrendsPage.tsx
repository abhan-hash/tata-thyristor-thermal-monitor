import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { ChannelDayHeatmap } from '../../charts/ChannelDayHeatmap'
import { LifeArcGauge, formatLifePct, remainingLifePct } from '../../charts/LifeArcGauge'
import { WearProjection } from '../../charts/WearProjection'
import { useDailyPeaks, useWear } from '../../data/historyHooks'
import type { ChannelId, WearRecord } from '../../domain/types'
import { CONTROL_CAPS, cx } from '../../kit/controlStyles'
import { CropPanel } from '../../kit/CropPanel'
import { FilterChip } from '../../kit/FilterChip'
import { HeroLockup } from '../../kit/HeroLockup'
import { StatusIcon } from '../../kit/icons/StatusIcon'
import { QueryState } from '../../kit/QueryState'
import { useThresholds } from '../../state/uiStore'

/** Wear rate (× baseline) above which a channel carries a wear advisory (Requirement 27.6). */
export const ADVISORY_WEAR_RATE = 2.0

/** Heatmap ranges offered by `?days=`; anything else falls back to the default. */
export const TRENDS_DAY_OPTIONS = [7, 30] as const
export type TrendsDays = (typeof TRENDS_DAY_OPTIONS)[number]
export const DEFAULT_TRENDS_DAYS: TrendsDays = 30

/** Days shown for a `?days=` value: 7 or 30, defaulting to 30 (Requirement 27.4). */
export function parseTrendsDays(raw: string | null): TrendsDays {
  return raw === '7' ? 7 : DEFAULT_TRENDS_DAYS
}

/** True when the channel wears faster than the advisory limit. */
export function hasWearAdvisory(record: Pick<WearRecord, 'wear_rate_vs_baseline'>): boolean {
  return record.wear_rate_vs_baseline > ADVISORY_WEAR_RATE
}

const byChannel = (a: WearRecord, b: WearRecord) => a.channel - b.channel

/** Below 640 px the projection draws at a phone design size so its labels stay legible. */
const NARROW_QUERY = '(max-width: 639px)'
function subscribeNarrow(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => undefined
  const mq = window.matchMedia(NARROW_QUERY)
  mq.addEventListener('change', onChange)
  return () => {
    mq.removeEventListener('change', onChange)
  }
}
function isNarrow(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(NARROW_QUERY).matches
}
function useNarrow(): boolean {
  return useSyncExternalStore(subscribeNarrow, isNarrow, () => false)
}

interface SectionProps {
  index: number
  kicker: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** One page section: a crop-bracketed panel with a numbered edge label and a gold heading. */
function Section({ index, kicker, title, description, actions, children, className }: SectionProps) {
  const headingId = `trends-section-${String(index)}`
  return (
    <CropPanel
      role="region"
      aria-labelledby={headingId}
      labels={[{ edge: 'top', text: `${String(index).padStart(2, '0')} · ${kicker}`, align: 'start' }]}
      className={cx('flex flex-col gap-6', className)}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id={headingId} className="m-0 text-20 leading-tight font-bold [color:var(--accent)]">
            {title}
          </h2>
          {description !== undefined && (
            <p className="m-0 max-w-prose text-12 leading-snug [color:var(--text-secondary)]">{description}</p>
          )}
        </div>
        {actions}
      </header>
      {children}
    </CropPanel>
  )
}

/** Hero secondary block: the channel with the least life left, and the advisory count. */
function FleetSummary({ wear }: { wear: readonly WearRecord[] | undefined }) {
  if (!wear || wear.length === 0) {
    return <span className={cx(CONTROL_CAPS, '[color:var(--text-muted)]')}>Loading wear records</span>
  }
  const lowest = wear.reduce((a, b) => (b.consumed_life_pct > a.consumed_life_pct ? b : a))
  const advisories = wear.filter(hasWearAdvisory).length
  return (
    <>
      <span className={cx(CONTROL_CAPS, '[color:var(--text-muted)]')}>Least life left</span>
      <p className="m-0 flex items-baseline gap-2 leading-none">
        <span className="num text-28 font-bold [color:var(--text-primary)]">
          {formatLifePct(remainingLifePct(lowest.consumed_life_pct))}
        </span>
        <span className={cx(CONTROL_CAPS, '[color:var(--text-secondary)]')}>CH {lowest.channel}</span>
      </p>
      <p
        data-testid="advisory-count"
        className={cx(
          CONTROL_CAPS,
          'm-0 inline-flex items-center gap-1.5',
          advisories > 0 ? 'text-[color:var(--status-warning)]' : 'text-[color:var(--text-secondary)]',
        )}
      >
        <StatusIcon status={advisories > 0 ? 'warning' : 'normal'} size={12} />
        {advisories === 0 ? 'No wear advisories' : `${String(advisories)} wear ${advisories === 1 ? 'advisory' : 'advisories'}`}
      </p>
    </>
  )
}

/** One row of the wear ledger; selects the channel shown in the projection. */
function LedgerRow({ record, selected, onSelect }: { record: WearRecord; selected: boolean; onSelect: () => void }) {
  const advisory = hasWearAdvisory(record)
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        data-channel={record.channel}
        data-advisory={advisory || undefined}
        onClick={onSelect}
        className={cx(
          'grid min-h-[var(--control-min-height)] w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1',
          'rounded-1 border px-3 py-2.5 text-start font-sans',
          'transition-[background-color,border-color] duration-1 ease-out',
          selected
            ? '[border-color:var(--filter-chip-border-selected)] [background-color:var(--filter-chip-bg-selected)]'
            : '[border-color:var(--line-subtle)] hover:[background-color:var(--filter-chip-bg-hover)]',
        )}
      >
        <span className={cx(CONTROL_CAPS, 'text-[color:var(--text-primary)]')}>CH {record.channel}</span>
        <span className="num text-12 [color:var(--text-secondary)]">
          {record.cycles_above_100C.toLocaleString('en-GB')} cycles &gt; 100 °C
        </span>
        <span
          className={cx(
            'num inline-flex items-center gap-1 text-14 font-bold',
            advisory ? '[color:var(--status-warning)]' : '[color:var(--text-primary)]',
          )}
        >
          {advisory && <StatusIcon status="warning" size={12} />}
          {record.wear_rate_vs_baseline.toFixed(2)}×
        </span>
        {advisory && (
          <span
            data-testid="ledger-advisory"
            className={cx(CONTROL_CAPS, 'col-span-3 text-[color:var(--status-warning)]')}
          >
            Wear advisory · above {ADVISORY_WEAR_RATE.toFixed(1)}× baseline
          </span>
        )}
      </button>
    </li>
  )
}

/**
 * Trends & Wear at `/trends` (Requirement 27): remaining life per channel,
 * a channel × day heatmap of peak Tj over `?days=7|30` (default 30) and a
 * consumed-life projection for the selected channel. Channels wearing faster
 * than 2× baseline carry an advisory icon and text.
 */
export function TrendsPage() {
  const [params, setParams] = useSearchParams()
  const days = parseTrendsDays(params.get('days'))
  const peaks = useDailyPeaks(days)
  const wear = useWear()
  const band = useThresholds().junction_temp
  const [picked, setPicked] = useState<ChannelId | null>(null)
  const narrow = useNarrow()

  const records = wear.data ? [...wear.data].sort(byChannel) : undefined
  // Until the operator picks one, the projection shows the first advisory channel.
  const selectedChannel = picked ?? records?.find(hasWearAdvisory)?.channel ?? records?.[0]?.channel ?? 1

  const setDays = (next: TrendsDays) => {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('days', String(next))
        return p
      },
      { replace: true },
    )
  }

  const rangeChips = (
    <div role="group" aria-label="Heatmap range" className="flex shrink-0 gap-2">
      {TRENDS_DAY_OPTIONS.map((d) => (
        <FilterChip
          key={d}
          label={`${String(d)} days`}
          selected={days === d}
          onToggle={() => {
            setDays(d)
          }}
        />
      ))}
    </div>
  )

  return (
    <div className="layout-page flex flex-col gap-8 pt-8 pb-12 lg:gap-10 lg:pt-10">
      <HeroLockup title="TRENDS" subtitle="Trends and wear" secondary={<FleetSummary wear={records} />} />

      <div className="layout-grid items-start">
        <Section
          index={1}
          kicker="Life"
          title="Remaining life"
          description="Life left in each thyristor pair, from the thermal cycles counted since commissioning."
        >
          <QueryState query={wear} loadingLabel="Loading wear records" className="min-h-40">
            {() => (
              <ul className="m-0 grid list-none grid-cols-3 gap-x-4 gap-y-6 p-0 lg:grid-cols-6">
                {(records ?? []).map((r) => (
                  <li key={r.channel} className="flex justify-center">
                    <LifeArcGauge
                      channel={r.channel}
                      consumedLifePct={r.consumed_life_pct}
                      advisory={hasWearAdvisory(r)}
                      size={132}
                      className="w-full"
                    />
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Section>

        <Section
          index={2}
          kicker="Peaks"
          title="Daily peak junction temperature"
          description={`Hottest estimated Tj per channel for each of the last ${String(days)} days.`}
          actions={rangeChips}
        >
          <QueryState query={peaks} loadingLabel="Loading daily peaks" className="min-h-40">
            {(data) => (
              <ChannelDayHeatmap
                peaks={data}
                band={band}
                label={`Daily peak junction temperature by channel, last ${String(days)} days`}
              />
            )}
          </QueryState>
        </Section>

        <Section
          index={3}
          kicker="Projection"
          title={`CH ${String(selectedChannel)} wear projection`}
          description="Consumed life with the P10–P90 band over the next year. The dashed line is wear at twice the baseline rate."
          className="lg:col-span-8 wide:col-span-8"
        >
          <QueryState query={wear} loadingLabel="Loading wear projection" className="min-h-60">
            {() => {
              const record = records?.find((r) => r.channel === selectedChannel)
              return record ? (
                <WearProjection
                  record={record}
                  advisoryFactor={ADVISORY_WEAR_RATE}
                  {...(narrow ? { width: 360, height: 260 } : {})}
                />
              ) : null
            }}
          </QueryState>
        </Section>

        <Section
          index={4}
          kicker="Ledger"
          title="Wear rate"
          description="Rate against baseline. Select a channel to project it."
          className="lg:col-span-8 wide:col-span-4"
        >
          <QueryState query={wear} loadingLabel="Loading wear ledger" className="min-h-40">
            {() => (
              <ul aria-label="Channel wear rates" className="m-0 flex list-none flex-col gap-2 p-0">
                {(records ?? []).map((r) => (
                  <LedgerRow
                    key={r.channel}
                    record={r}
                    selected={r.channel === selectedChannel}
                    onSelect={() => {
                      setPicked(r.channel)
                    }}
                  />
                ))}
              </ul>
            )}
          </QueryState>
        </Section>
      </div>
    </div>
  )
}
