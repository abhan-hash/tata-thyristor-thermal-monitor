import { useFrame, useLiveValue } from '../../data/hooks'
import { formatValue, PLACEHOLDER, TEMP_C_SPEC } from '../../domain/format'
import { formatChannelParam, useChannelSelection } from '../../data/selection'
import { cx } from '../../kit/controlStyles'
import { RackRow } from '../../kit/RackRow'
import { AnimatedNumber } from '../../motion/AnimatedNumber'
import { rackRows, rowsEqual, type RackRowModel } from './overviewModel'

/** Signed bar centred on the channel mean: fills right when hotter, left when cooler. */
function DeltaBar({ frac }: { frac: number }) {
  const width = `${(Math.abs(frac) * 50).toFixed(1)}%`
  return (
    <span aria-hidden="true" className="relative block h-1.5 w-14 rounded-pill bg-surface-sunken">
      <span className="absolute inset-y-[-2px] left-1/2 w-px bg-line-strong" />
      <span
        data-part="delta-fill"
        className={cx('absolute inset-y-0 rounded-pill', frac >= 0 ? 'left-1/2 bg-accent' : 'right-1/2 bg-text-muted')}
        style={{ width }}
      />
    </span>
  )
}

function RowMeta({ row }: { row: RackRowModel }) {
  const tj = useLiveValue(`tj.${row.id}` as const)
  // The model decides when the reading is untrustworthy; the live value only supplies the digits.
  const unknown = row.tj === PLACEHOLDER
  return (
    <span className="flex items-center gap-3">
      <span className="inline-block min-w-[7ch] text-end tabular-nums">
        <AnimatedNumber
          value={tj}
          format={(v) => (unknown ? PLACEHOLDER : formatValue(v, TEMP_C_SPEC).trimStart())}
          className="text-14 font-[700] text-text-primary"
        />
        <span className="text-text-secondary"> °C</span>
      </span>
      <span className="flex items-center gap-2" aria-label={`${row.delta} K from mean`}>
        <DeltaBar frac={row.deltaFrac} />
        <span className="inline-block min-w-[5.5ch] text-end tabular-nums text-text-secondary" aria-hidden="true">
          {row.delta} K
        </span>
      </span>
    </span>
  )
}

/**
 * Rack rows T1–T6 (Requirements 23.3, 24.7): tracked label, Tj at 0.1 °C,
 * signed delta-from-mean bar, status chip and chevron. Activating a row
 * writes `?ch=` with a replace navigation; the selected row is active.
 */
export function RackList({ className }: { className?: string }) {
  const rows = useFrame(rackRows, rowsEqual)
  const { selected, select } = useChannelSelection()
  return (
    <nav aria-label="Thyristor channels" data-part="rack-list" className={className}>
      <ul className="m-0 list-none p-0">
        {rows.map((row) => (
          <li key={row.id}>
            <RackRow
              label={formatChannelParam(row.id)}
              meta={<RowMeta row={row} />}
              status={row.status}
              selected={selected === row.id}
              onSelect={() => {
                select(row.id)
              }}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}
