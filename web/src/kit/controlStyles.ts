/** Class strings shared by the form controls (Fader, HardwareToggle, Field, Select). */

/** Tracked-caps type for control micro-labels (no colour). */
export const CONTROL_CAPS = [
  'uppercase leading-tight',
  'text-[length:var(--control-label-size)]',
  '[font-weight:var(--control-label-weight)] [font-stretch:var(--control-label-width)]',
  'tracking-[var(--control-label-tracking)]',
].join(' ')

/** Tracked-caps control label, the reference console's micro-labels. */
export const CONTROL_LABEL = `${CONTROL_CAPS} text-[color:var(--control-label-color)]`

/** Disabled look for a control wrapper. */
export const CONTROL_DISABLED = 'cursor-not-allowed opacity-[var(--control-disabled-opacity)]'

/** Join class names, dropping empty values. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
