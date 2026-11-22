import type { ComponentPropsWithRef } from 'react'
import { FIELD_CONTROL, FieldShell } from './Field'
import { cx } from './controlStyles'

type NativeInputProps = Omit<ComponentPropsWithRef<'input'>, 'className' | 'children' | 'id' | 'type'>

export interface NumberFieldProps extends NativeInputProps {
  label: string
  error?: string | undefined
  hint?: string | undefined
  /** Unit shown inside the box, e.g. "°C". */
  unit?: string | undefined
  id?: string | undefined
  className?: string | undefined
}

/*
 * Native number input with tabular figures. The browser spin buttons are
 * hidden for a cleaner box; arrow keys still step the value.
 */
const NUMBER_CONTROL = cx(
  FIELD_CONTROL,
  'num [appearance:textfield]',
  '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
)

/** Numeric input with an optional unit and inline validation. */
export function NumberField({
  label,
  error,
  hint,
  unit,
  id,
  className,
  disabled = false,
  'aria-describedby': describedBy,
  ...input
}: NumberFieldProps) {
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      disabled={disabled}
      id={id}
      describedBy={describedBy}
      suffix={unit}
      className={className}
    >
      {(a11y) => (
        <input
          inputMode="decimal"
          {...input}
          {...a11y}
          type="number"
          disabled={disabled}
          className={NUMBER_CONTROL}
        />
      )}
    </FieldShell>
  )
}
