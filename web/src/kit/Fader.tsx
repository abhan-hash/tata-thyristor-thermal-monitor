import { useId, type CSSProperties, type Ref } from 'react'
import { CONTROL_DISABLED, CONTROL_LABEL, cx } from './controlStyles'

export interface FaderProps {
  /** Visible tracked-caps label; also the input's accessible name. */
  label: string
  value: number
  min: number
  max: number
  /** Default 1. Also sets the readout's decimal places unless `format` is given. */
  step?: number
  /** Unit shown after the readout and in `aria-valuetext`, e.g. "°C". */
  unit?: string
  onChange: (value: number) => void
  disabled?: boolean
  /** Readout formatter. Default: fixed to the step's decimal places. */
  format?: (value: number) => string
  id?: string
  ref?: Ref<HTMLInputElement>
  className?: string
}

/** Decimal places in a step, so a 0.5 step reads "12.5" and a 1 step reads "12". */
export function stepDecimals(step: number): number {
  if (!Number.isFinite(step)) return 0
  const text = String(step)
  const exp = /e-(\d+)$/.exec(text)
  if (exp) return Number(exp[1])
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

/** Value as a 0…1 position along the track, clamped. Degenerate ranges sit at 0. */
export function faderPosition(value: number, min: number, max: number): number {
  if (!(max > min) || !Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/*
 * The native range input sits on top of the drawn track at opacity 0, so it
 * keeps its role, arrow/Home/End/PageUp keys and pointer behaviour, while the
 * well, slot and cap underneath give the hardware look. Its thumb is sized to
 * the cap so pointer positions map onto the cap exactly.
 */
const WELL = [
  'relative flex items-center rounded-2 border',
  'h-[var(--fader-well-height)] px-[var(--fader-well-pad-x)]',
  '[background-color:var(--fader-track)] [border-color:var(--fader-track-border)]',
  'shadow-[var(--control-well-shadow)]',
  'has-focus-visible:shadow-[var(--control-well-shadow),var(--focus-ring)]',
].join(' ')

const INPUT = [
  'peer absolute inset-0 z-10 m-0 h-full w-full appearance-none bg-transparent opacity-0',
  'enabled:cursor-grab enabled:active:cursor-grabbing disabled:cursor-not-allowed',
  '[&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:h-[var(--fader-cap-height)] [&::-webkit-slider-thumb]:w-[var(--fader-cap-width)]',
  '[&::-moz-range-thumb]:h-[var(--fader-cap-height)] [&::-moz-range-thumb]:w-[var(--fader-cap-width)]',
  '[&::-moz-range-thumb]:border-0',
].join(' ')

/* A row of short scale ticks, spanning the cap centre's travel. */
const TICKS = [
  'pointer-events-none absolute inset-x-[calc(var(--fader-cap-width)/2)] h-1',
  '[background-image:var(--fader-ticks)] [background-repeat:no-repeat]',
].join(' ')

const CAP = [
  'pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-1',
  'h-[var(--fader-cap-height)] w-[var(--fader-cap-width)]',
  'left-[calc(var(--fader-pos)*(100%-var(--fader-cap-width)))]',
  '[background-image:var(--control-cap-ribs),var(--control-cap-face)]',
  'shadow-[var(--control-cap-shadow)]',
  'peer-active:shadow-[var(--control-cap-shadow-pressed)]',
].join(' ')

/**
 * Horizontal fader: a recessed well with a slot, a gold fill up to the cap,
 * a ribbed machined cap with a gold index line, and a unit readout.
 * Built on `<input type="range">` (Requirements 6.5, 38.2).
 */
export function Fader({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  disabled = false,
  format,
  id: idProp,
  ref,
  className,
}: FaderProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const fmt = format ?? ((v: number) => v.toFixed(stepDecimals(step)))
  const text = fmt(value)
  // Reserve the widest end of the range so the readout never shifts the layout.
  const readoutCh = Math.max(fmt(min).length, fmt(max).length, text.length)
  const pos = faderPosition(value, min, max)

  return (
    // aria-disabled marks the whole control (label, hint, readout) as inactive, so contrast
    // checks treat the dimmed text as a disabled component (WCAG 1.4.3 exemption).
    <div
      aria-disabled={disabled || undefined}
      className={cx('flex flex-col gap-2', disabled && CONTROL_DISABLED, className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={CONTROL_LABEL}>
          {label}
        </label>
        <span aria-hidden="true" className="flex items-baseline gap-1 leading-none">
          <span
            className="num text-end text-[length:var(--fader-readout-size)] text-[color:var(--fader-readout-color)]"
            style={{ minWidth: `${readoutCh}ch` }}
          >
            {text}
          </span>
          {unit ? (
            <span className="text-12 text-[color:var(--fader-unit-color)]">{unit}</span>
          ) : null}
        </span>
      </div>
      <div className={WELL}>
        <div className="relative h-full flex-1" style={{ '--fader-pos': pos } as CSSProperties}>
          <input
            ref={ref}
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            aria-valuetext={unit ? `${text} ${unit}` : text}
            onChange={(e) => {
              onChange(e.currentTarget.valueAsNumber)
            }}
            className={INPUT}
          />
          {/* Scale ticks along the slot, then the slot itself with the fill. */}
          <span aria-hidden="true" className={cx(TICKS, 'top-0.5')} />
          <span aria-hidden="true" className={cx(TICKS, 'bottom-0.5')} />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[calc(var(--fader-cap-width)/2)] top-1/2 -translate-y-1/2 h-[var(--fader-slot-height)] rounded-pill [background-color:var(--fader-slot-bg)] shadow-[inset_0_1px_1px_var(--fader-slot-bg)]"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-pill [background-color:var(--fader-fill)] w-[calc(var(--fader-pos)*100%)]"
            />
          </span>
          <span aria-hidden="true" className={CAP}>
            {/* Index line across the grip, perpendicular to travel. */}
            <span className="absolute inset-y-1 left-1/2 w-0.5 -translate-x-1/2 rounded-pill [background-color:var(--fader-cap-index)]" />
          </span>
        </div>
      </div>
    </div>
  )
}
