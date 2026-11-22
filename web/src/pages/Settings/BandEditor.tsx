import { useId, type ChangeEvent } from 'react'
import type { BandField, BandKey } from '../../domain/settings'
import type { Band } from '../../domain/types'
import { cx } from '../../kit/controlStyles'
import { Fader } from '../../kit/Fader'
import { NumberField } from '../../kit/NumberField'
import { BAND_META, CAPS, formatForStep } from './settingsUi'

export interface BandEditorProps {
  bandKey: BandKey
  band: Readonly<Band>
  /** Inline errors from `validate`, by field. */
  errors?: Partial<Record<BandField, string>> | undefined
  /** The band differs from the saved settings. */
  edited: boolean
  onChange: (field: BandField | 'debounce_s', value: number) => void
}

/** Controlled number input value; an empty box is held as NaN in the draft. */
function inputValue(v: number): number | string {
  return Number.isFinite(v) ? v : ''
}

/**
 * Where the limits sit on a short scale: normal, warning and critical zones,
 * with a tick at each clear point (limit minus hysteresis). Hidden while the
 * band is invalid, since the zones would overlap.
 */
function BandScale({ band, unit, step, valid }: { band: Readonly<Band>; unit: string; step: number; valid: boolean }) {
  const { warning, critical, hysteresis } = band
  if (!valid) {
    return (
      <div
        aria-hidden="true"
        data-part="band-scale"
        data-state="invalid"
        className="h-2 rounded-pill [background-image:var(--status-fault-hatch)] opacity-60"
      />
    )
  }
  const span = critical - warning
  const lo = warning - span * 1.4
  const hi = critical + span * 0.7
  const pct = (v: number) => `${(((v - lo) / (hi - lo)) * 100).toFixed(2)}%`
  return (
    <div aria-hidden="true" data-part="band-scale" className="flex flex-col gap-1.5">
      <div className="relative h-2 overflow-hidden rounded-pill [background-color:var(--surface-sunken)] shadow-[var(--control-well-shadow)]">
        <span
          className="absolute inset-y-0 [background-color:var(--status-warning)] opacity-80"
          style={{ left: pct(warning), right: `calc(100% - ${pct(critical)})` }}
        />
        <span
          className="absolute inset-y-0 right-0 [background-color:var(--status-critical)]"
          style={{ left: pct(critical) }}
        />
        {[warning - hysteresis, critical - hysteresis].map((clear, i) => (
          <span
            key={i}
            className="absolute inset-y-0 w-px [background-color:var(--text-primary)] opacity-50"
            style={{ left: pct(clear) }}
          />
        ))}
      </div>
      <div className={cx(CAPS, 'flex justify-between gap-3 text-[10px] whitespace-nowrap')}>
        <span className="num [color:var(--status-warning)]">
          Warn {formatForStep(warning, step)}
          <span className="ms-1 normal-case tracking-normal [color:var(--text-muted)]">{unit}</span>
        </span>
        <span className="num [color:var(--status-critical-text)]">
          Trip {formatForStep(critical, step)}
          <span className="ms-1 normal-case tracking-normal [color:var(--text-muted)]">{unit}</span>
        </span>
      </div>
    </div>
  )
}

/** One threshold band: scale preview, warning/critical/hysteresis fields and a debounce fader. */
export function BandEditor({ bandKey, band, errors, edited, onChange }: BandEditorProps) {
  const meta = BAND_META[bandKey]
  const headingId = useId()
  const valid = errors === undefined
  const numberChange = (field: BandField) => (e: ChangeEvent<HTMLInputElement>) => {
    onChange(field, e.currentTarget.valueAsNumber)
  }
  return (
    <section aria-labelledby={headingId} data-band={bandKey} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-3">
            <h3 id={headingId} className="m-0 text-16 leading-tight font-bold [color:var(--text-primary)]">
              {meta.title}
            </h3>
            <span className={cx(CAPS, 'text-[10px] [color:var(--text-muted)]')}>{meta.symbol}</span>
            {edited && (
              <span
                className={cx(
                  CAPS,
                  'inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[10px]',
                  '[border-color:var(--accent)] [color:var(--accent)]',
                )}
              >
                <span aria-hidden="true" className="size-1.5 rounded-pill [background-color:var(--accent)]" />
                Edited
              </span>
            )}
          </div>
          <p className="m-0 text-12 leading-snug [color:var(--text-secondary)]">{meta.note}</p>
        </div>
        <div className="w-full shrink-0 sm:w-64">
          <BandScale band={band} unit={meta.unit} step={meta.step} valid={valid} />
        </div>
      </div>
      <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 md:grid-cols-4">
        <NumberField
          label={`${meta.symbol} warning`}
          unit={meta.unit}
          step={meta.step}
          value={inputValue(band.warning)}
          error={errors?.warning}
          onChange={numberChange('warning')}
        />
        <NumberField
          label={`${meta.symbol} critical`}
          unit={meta.unit}
          step={meta.step}
          value={inputValue(band.critical)}
          error={errors?.critical}
          onChange={numberChange('critical')}
        />
        <NumberField
          label={`${meta.symbol} hysteresis`}
          unit={meta.unit}
          step={meta.step}
          min={0}
          value={inputValue(band.hysteresis)}
          error={errors?.hysteresis}
          onChange={numberChange('hysteresis')}
        />
        <Fader
          label={`${meta.symbol} debounce`}
          unit="s"
          min={0}
          max={meta.debounce.max}
          step={meta.debounce.step}
          value={band.debounce_s}
          onChange={(v) => {
            onChange('debounce_s', v)
          }}
        />
      </div>
    </section>
  )
}
