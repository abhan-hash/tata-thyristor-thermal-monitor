import type { ComponentPropsWithRef } from 'react'
import { FIELD_CONTROL, FieldShell } from './Field'
import { ChevronIcon } from './icons/ChevronIcon'
import { cx } from './controlStyles'

type NativeSelectProps = Omit<ComponentPropsWithRef<'select'>, 'className' | 'id'>

export interface SelectProps extends NativeSelectProps {
  label: string
  error?: string | undefined
  hint?: string | undefined
  id?: string | undefined
  className?: string | undefined
}

/* Native select with the platform arrow removed; a chevron is drawn instead.
   Negative margins let the select fill the whole box so any point opens it. */
const SELECT_CONTROL = cx(
  FIELD_CONTROL,
  'appearance-none -mx-3 cursor-pointer px-3 pr-9 [background-color:var(--field-bg)]',
)

/** Native `<select>` with label, hint and inline validation. Pass `<option>`s as children. */
export function Select({
  label,
  error,
  hint,
  id,
  className,
  disabled = false,
  children,
  'aria-describedby': describedBy,
  ...select
}: SelectProps) {
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      disabled={disabled}
      id={id}
      describedBy={describedBy}
      className={className}
    >
      {(a11y) => (
        <>
          <select {...select} {...a11y} disabled={disabled} className={SELECT_CONTROL}>
            {children}
          </select>
          <ChevronIcon
            size={14}
            className="pointer-events-none absolute right-3 rotate-90 text-[color:var(--field-suffix-color)]"
          />
        </>
      )}
    </FieldShell>
  )
}
