import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'
import { StatusIcon } from './icons/StatusIcon'
import { CONTROL_DISABLED, CONTROL_LABEL, cx } from './controlStyles'

/** Ids and ARIA wiring shared by Field, NumberField and Select. */
export interface FieldA11y {
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}

export interface FieldShellProps {
  label: string
  /** Inline validation message. When set, the control is marked invalid and describes itself by it. */
  error?: string | undefined
  /** Persistent help text under the control. */
  hint?: string | undefined
  disabled?: boolean | undefined
  id?: string | undefined
  /** Extra ids for `aria-describedby`, kept ahead of the suffix, hint and error. */
  describedBy?: string | undefined
  /** Trailing adornment inside the box, e.g. a unit. Read as part of the description. */
  suffix?: ReactNode
  className?: string | undefined
  /** Renders the control (inside the bordered box) with the ARIA props to spread on it. */
  children: (a11y: FieldA11y) => ReactNode
}

/* The bordered, recessed box. The control inside is transparent, so the
   focus ring and error border live here. */
export const FIELD_BOX = [
  'relative flex items-center gap-2 rounded-1 border px-3',
  'min-h-[var(--control-min-height)]',
  '[background-color:var(--field-bg)] [border-color:var(--field-border)]',
  'shadow-[var(--field-shadow)]',
  'transition-[border-color] duration-1 ease-out',
  'has-[:enabled]:hover:[border-color:var(--field-border-hover)]',
  'has-focus-visible:shadow-[var(--field-shadow),var(--focus-ring)]',
  'data-invalid:[border-color:var(--field-border-error)] data-invalid:hover:[border-color:var(--field-border-error)]',
].join(' ')

/* The native control: transparent, fills the box, no ring of its own. */
export const FIELD_CONTROL = [
  'min-w-0 flex-1 self-stretch bg-transparent font-sans outline-none focus-visible:shadow-none',
  'text-[length:var(--field-text-size)] text-[color:var(--field-text)]',
  'placeholder:text-[color:var(--field-placeholder)] disabled:cursor-not-allowed',
].join(' ')

const MESSAGE = 'flex items-start gap-1.5 text-[length:var(--field-message-size)] leading-snug'

/**
 * Label, bordered box and messages around one native control. The error and
 * hint are linked by `aria-describedby` (Requirement 6.7).
 */
export function FieldShell({
  label,
  error,
  hint,
  disabled = false,
  id: idProp,
  describedBy,
  suffix,
  className,
  children,
}: FieldShellProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const suffixId = `${id}-suffix`
  const describedByIds =
    [describedBy, suffix ? suffixId : undefined, hint ? hintId : undefined, error ? errorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className={cx('flex flex-col gap-2', disabled && CONTROL_DISABLED, className)}>
      <label htmlFor={id} className={CONTROL_LABEL}>
        {label}
      </label>
      <div className={FIELD_BOX} data-invalid={error ? '' : undefined}>
        {children({
          id,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': describedByIds,
        })}
        {suffix ? (
          <span id={suffixId} className="shrink-0 text-12 text-[color:var(--field-suffix-color)]">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className={cx(MESSAGE, 'm-0 text-[color:var(--field-hint-color)]')}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={cx(MESSAGE, 'm-0 text-[color:var(--field-error-color)]')}>
          <StatusIcon status="critical" size={12} className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

type NativeInputProps = Omit<ComponentPropsWithRef<'input'>, 'className' | 'children' | 'id'>

export interface FieldProps extends NativeInputProps {
  label: string
  error?: string | undefined
  hint?: string | undefined
  /** Trailing adornment inside the box, e.g. a unit. */
  suffix?: ReactNode
  id?: string | undefined
  className?: string | undefined
}

/** Text input with label, hint and inline validation. */
export function Field({
  label,
  error,
  hint,
  suffix,
  id,
  className,
  disabled = false,
  'aria-describedby': describedBy,
  ...input
}: FieldProps) {
  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      disabled={disabled}
      id={id}
      describedBy={describedBy}
      suffix={suffix}
      className={className}
    >
      {(a11y) => (
        <input type="text" {...input} {...a11y} disabled={disabled} className={FIELD_CONTROL} />
      )}
    </FieldShell>
  )
}
