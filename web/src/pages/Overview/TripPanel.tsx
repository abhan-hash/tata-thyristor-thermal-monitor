import { Link } from 'react-router'
import { useFrame, useSeries } from '../../data/hooks'
import { formatChannelParam, useSelectedChannel } from '../../data/selection'
import { TIME_TO_WARNING_WINDOW_S, timeToWarning } from '../../domain/derive'
import { DEFAULT_THRESHOLDS } from '../../domain/thresholds'
import type { DriveFrame } from '../../domain/types'
import { cx } from '../../kit/controlStyles'
import { ChevronIcon } from '../../kit/icons/ChevronIcon'
import { marginText, timeToWarningText } from './overviewModel'
import { TRIP_C } from './Hero'

const WARNING_C = DEFAULT_THRESHOLDS.junction_temp.warning

/**
 * "Know Before It Trips" (Requirement 24.8): the selected channel's margin
 * to the 125 °C trip, a time-to-warning estimate from a linear fit over the
 * last 10 s, and a link to Drive Detail for that channel.
 */
export function TripPanel({ className }: { className?: string }) {
  const id = useSelectedChannel()
  const ch = formatChannelParam(id)
  const margin = useFrame((f: DriveFrame | null) => marginText(f, id))
  const series = useSeries(id, 'tj', TIME_TO_WARNING_WINDOW_S)
  const ttw = timeToWarningText(timeToWarning(series, WARNING_C), WARNING_C)

  return (
    <section
      aria-labelledby="trip-panel-heading"
      data-part="trip-panel"
      className={cx(
        'relative flex flex-col justify-center gap-4 rounded-2 p-6 [background:radial-gradient(120%_90%_at_0%_0%,var(--surface-raised),var(--surface-sunken))]',
        className,
      )}
    >
      <h2
        id="trip-panel-heading"
        className="m-0 text-[length:clamp(20px,0.9rem+0.6vw,24px)] leading-[1.05] font-[800] text-accent [font-stretch:112%]"
      >
        Know Before
        <br />
        It Trips
      </h2>
      <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 leading-none" aria-label={`${ch} margin to trip`}>
        <span data-part="trip-margin" className="text-[length:40px] font-[800] tabular-nums [font-stretch:106%]">
          {margin}
        </span>
        <span className="text-16 font-[700] text-text-secondary">K</span>
        <span className="ms-1 whitespace-nowrap text-11 font-[600] tracking-[0.24em] text-text-muted uppercase [font-stretch:125%]">
          {ch} to {TRIP_C} °C trip
        </span>
      </p>
      <p data-part="trip-ttw" className="m-0 max-w-[30ch] text-12 leading-snug text-text-secondary">
        {ttw}
      </p>
      <Link
        to={{ pathname: '/drive', search: `?ch=${ch}` }}
        className={cx(
          'group inline-flex min-h-11 items-center gap-2 self-start rounded-1 text-14 font-[600] text-text-primary',
          'outline-none hover:text-accent focus-visible:[box-shadow:var(--focus-ring)]',
        )}
      >
        Open {ch} in Drive Detail
        <ChevronIcon className="transition-transform duration-1 ease-out group-hover:translate-x-0.5" />
      </Link>
    </section>
  )
}
