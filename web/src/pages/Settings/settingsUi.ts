import type { BandKey } from '../../domain/settings'
import type { Scenario } from '../../domain/types'

/** Copy, units and input ranges for one threshold band on the Settings page. */
export interface BandMeta {
  /** Band name, e.g. "Junction temperature". */
  title: string
  /** Short symbol used in field labels, e.g. "Tj". */
  symbol: string
  unit: string
  /** One line on where the value comes from. */
  note: string
  /** Step for the warning, critical and hysteresis fields. */
  step: number
  /** Debounce fader range, seconds. */
  debounce: { max: number; step: number }
}

export const BAND_META: Readonly<Record<BandKey, BandMeta>> = {
  junction_temp: {
    title: 'Junction temperature',
    symbol: 'Tj',
    unit: '°C',
    note: 'Estimated by the virtual sensor. The drive trips at critical.',
    step: 0.5,
    debounce: { max: 10, step: 0.5 },
  },
  heatsink_temp: {
    title: 'Heatsink temperature',
    symbol: 'Ths',
    unit: '°C',
    note: 'Measured by the heatsink RTDs.',
    step: 0.5,
    debounce: { max: 30, step: 1 },
  },
  cooling_residual: {
    title: 'Cooling residual',
    symbol: 'ΔT',
    unit: 'K',
    note: 'Measured minus modelled heatsink rise. Grows as airflow degrades.',
    step: 0.5,
    debounce: { max: 60, step: 1 },
  },
  rms_current: {
    title: 'RMS current',
    symbol: 'Irms',
    unit: '%',
    note: 'Percent of rated current, over a rolling window.',
    step: 1,
    debounce: { max: 1800, step: 30 },
  },
}

export const SCENARIO_OPTIONS: readonly { value: Scenario; label: string }[] = [
  { value: 'normal', label: 'Normal rolling' },
  { value: 'bar_entry', label: 'Bar entry' },
  { value: 'fan_failure', label: 'Fan failure' },
  { value: 'clogging', label: 'Filter clogging' },
  { value: 'overload', label: 'Overload' },
  { value: 'clear', label: 'Clear (idle)' },
]

/** Tracked-caps micro type for page chrome. */
export const CAPS = [
  'uppercase leading-tight',
  '[font-weight:var(--font-label-weight)] [font-stretch:var(--font-label-width)]',
  'tracking-[var(--font-label-tracking)]',
].join(' ')

/** Shared base for the bar and dialog buttons. */
const BUTTON_BASE = [
  CAPS,
  'inline-flex min-h-[var(--control-min-height)] items-center whitespace-nowrap justify-center gap-2 rounded-1 px-5 text-11',
  'transition-[background-color,border-color,color,scale] duration-1 ease-out',
  'enabled:cursor-pointer enabled:active:scale-[0.97] disabled:cursor-not-allowed',
  'disabled:opacity-[var(--control-disabled-opacity)]',
].join(' ')

/** Gold filled primary action. */
export const PRIMARY_BUTTON = [
  BUTTON_BASE,
  'border [border-color:var(--accent)] [background-color:var(--accent)] [color:var(--on-accent)]',
  'enabled:hover:[background-color:var(--accent-strong)] enabled:hover:[border-color:var(--accent-strong)]',
].join(' ')

/** Neutral outlined secondary action. */
export const SECONDARY_BUTTON = [
  BUTTON_BASE,
  'border [border-color:var(--line-strong)] bg-transparent [color:var(--text-primary)]',
  'enabled:hover:[border-color:var(--text-muted)] enabled:hover:[background-color:var(--surface-raised)]',
].join(' ')

/** Fixed decimals for a step, so 0.5 steps read "2.5" and whole steps read "2". */
export function formatForStep(value: number, step: number): string {
  if (!Number.isFinite(value)) return '—'
  const decimals = Number.isInteger(step) ? 0 : 1
  return value.toFixed(Number.isInteger(value) ? 0 : decimals)
}
