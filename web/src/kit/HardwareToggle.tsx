import { useId, type Ref } from 'react'
import { CONTROL_CAPS, CONTROL_DISABLED, CONTROL_LABEL, cx } from './controlStyles'

export interface HardwareToggleProps {
  /** Visible tracked-caps label; the switch's accessible name. */
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  ref?: Ref<HTMLButtonElement>
  className?: string
}

const BUTTON = [
  'group inline-flex items-center justify-between gap-4 rounded-1 font-sans',
  'min-h-[var(--control-min-height)] text-start',
  // Inline padding gives the focus ring room; the negative margin keeps the
  // label aligned with neighbouring controls.
  '-mx-2 px-2',
].join(' ')

/* Recessed slot the knob slides in. */
const HOUSING = [
  'relative inline-flex shrink-0 items-center rounded-2 border',
  'h-[var(--toggle-height)] w-[var(--toggle-width)] p-[var(--toggle-inset)]',
  '[background-color:var(--toggle-housing)] [border-color:var(--toggle-housing-border)]',
  'shadow-[var(--control-well-shadow)]',
].join(' ')

/* Machined knob; slides on check, presses on :active. */
const KNOB = [
  'relative block h-full w-[var(--toggle-knob-width)] rounded-1',
  '[background-image:var(--control-cap-ribs),var(--control-cap-face)]',
  'shadow-[var(--control-cap-shadow)]',
  'transition-[translate] duration-2 ease-out',
  'group-aria-checked:translate-x-[var(--toggle-travel)]',
  'group-enabled:group-active:shadow-[var(--control-cap-shadow-pressed)]',
].join(' ')

const LED = [
  'block size-[var(--toggle-led-size)] rounded-pill',
  '[background-color:var(--toggle-led-off)]',
  'transition-[background-color] duration-1 ease-out',
  'group-aria-checked:[background-color:var(--toggle-led-on)]',
  'group-aria-checked:shadow-[var(--toggle-led-glow)]',
].join(' ')

/**
 * Slide toggle with an LED. Exposed as `role="switch"` with `aria-checked`
 * (Requirement 6.6). The LED colour is always paired with ON/OFF text
 * (Requirement 5.5); that text is hidden from assistive tech because the
 * switch state already announces it.
 */
export function HardwareToggle({
  label,
  checked,
  onChange,
  disabled = false,
  id,
  ref,
  className,
}: HardwareToggleProps) {
  const labelId = useId()
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      disabled={disabled}
      data-state={checked ? 'on' : 'off'}
      onClick={() => {
        onChange(!checked)
      }}
      className={cx(BUTTON, disabled ? CONTROL_DISABLED : 'cursor-pointer', className)}
    >
      <span id={labelId} className={CONTROL_LABEL}>
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span aria-hidden="true" className={HOUSING}>
          <span className={KNOB}>
            <span className="absolute inset-y-1.5 left-1/2 w-0.5 -translate-x-1/2 rounded-pill [background-color:var(--toggle-knob)] group-aria-checked:[background-color:var(--toggle-knob-on)]" />
          </span>
        </span>
        <span aria-hidden="true" className="flex items-center gap-2">
          <span className={LED} />
          <span
            className={cx(
              CONTROL_CAPS,
              // Reserve the width of "OFF" (with its tracking) through a zero-height
              // ghost, so the row does not shift when the state flips.
              "inline-flex flex-col after:invisible after:h-0 after:overflow-hidden after:content-['OFF']",
              'text-[color:var(--toggle-state-color)] group-aria-checked:text-[color:var(--toggle-state-color-on)]',
            )}
          >
            {checked ? 'ON' : 'OFF'}
          </span>
        </span>
      </span>
    </button>
  )
}
