/**
 * Formatter: pure, fixed-width numeric formatting for readouts (Requirement 3).
 *
 * Output layout for a finite value:
 *   [sign][integer part, left-padded with U+2007][.][fraction] [unit]
 *
 * - The sign position is always present: U+2212 MINUS SIGN for negative values,
 *   U+2007 FIGURE SPACE otherwise (including values that round to zero).
 * - The integer part is padded with U+2007 to the spec's integer width, which is at
 *   least 3 digits so every value in the display range [−50, 250] has the same length.
 * - Rounding uses `Number.prototype.toFixed` on the magnitude, which rounds the exact
 *   binary value half away from zero. Values that differ by at least one step
 *   (0.1 °C for Tj) therefore always produce different strings.
 *
 * Non-finite values (NaN, ±Infinity) return the placeholder "— —" left-padded with
 * U+2007 to the same length as a finite value. Outputs are plain Unicode text and
 * never contain HTML entities.
 *
 * Magnitudes that need more integer digits than the spec's width are printed in full,
 * so the string grows rather than hiding digits.
 */

/** U+2007 FIGURE SPACE: same advance width as a tabular digit. */
export const FIGURE_SPACE = '\u2007'
/** U+2212 MINUS SIGN: same advance width as `+` and tabular digits. */
export const MINUS_SIGN = '\u2212'
/** Separator between the number and its unit. */
export const UNIT_SEPARATOR = ' '
/** Core placeholder shown for missing / faulted values. */
export const PLACEHOLDER = '\u2014 \u2014'

export interface FormatSpec {
  /** Unit symbol appended after a space, e.g. `°C`. */
  readonly unit: string
  /** Number of integer digit positions (padded with U+2007). */
  readonly intDigits: number
  /** Number of fractional digits; always ≥ 1 so one decimal separator is present. */
  readonly decimals: number
}

export const TEMP_C_SPEC: FormatSpec = Object.freeze({ unit: '°C', intDigits: 3, decimals: 1 })
export const DELTA_K_SPEC: FormatSpec = Object.freeze({ unit: 'K', intDigits: 3, decimals: 1 })
export const CURRENT_A_SPEC: FormatSpec = Object.freeze({ unit: 'A', intDigits: 4, decimals: 1 })
export const POWER_W_SPEC: FormatSpec = Object.freeze({ unit: 'W', intDigits: 4, decimals: 1 })
export const THERMAL_RES_KW_SPEC: FormatSpec = Object.freeze({ unit: 'K/W', intDigits: 3, decimals: 3 })
export const DURATION_SPEC: FormatSpec = Object.freeze({ unit: 's', intDigits: 4, decimals: 1 })

/** Length of a finite formatted value for `spec` (sign + int + `.` + fraction + space + unit). */
export function formattedLength(spec: FormatSpec): number {
  return 1 + spec.intDigits + 1 + spec.decimals + UNIT_SEPARATOR.length + spec.unit.length
}

/** Placeholder "— —" left-padded with U+2007 to the finite-value length of `spec`. */
export function placeholderFor(spec: FormatSpec): string {
  return PLACEHOLDER.padStart(formattedLength(spec), FIGURE_SPACE)
}

/** Formats `value` with the fixed-width layout described by `spec`. */
export function formatFixed(value: number, spec: FormatSpec): string {
  if (!Number.isFinite(value)) return placeholderFor(spec)
  const magnitude = Math.abs(value).toFixed(spec.decimals)
  const dot = magnitude.indexOf('.')
  const intPart = magnitude.slice(0, dot)
  const fracPart = magnitude.slice(dot + 1)
  const roundsToZero = /^[0.]+$/.test(magnitude)
  const sign = value < 0 && !roundsToZero ? MINUS_SIGN : FIGURE_SPACE
  return `${sign}${intPart.padStart(spec.intDigits, FIGURE_SPACE)}.${fracPart}${UNIT_SEPARATOR}${spec.unit}`
}

/** Temperature in °C at 0.1 °C precision (Tj readouts). */
export function formatTempC(value: number): string {
  return formatFixed(value, TEMP_C_SPEC)
}

/** Temperature difference in K at 0.1 K precision. */
export function formatDeltaK(value: number): string {
  return formatFixed(value, DELTA_K_SPEC)
}

/** Current in A at 0.1 A precision. */
export function formatCurrentA(value: number): string {
  return formatFixed(value, CURRENT_A_SPEC)
}

/** Power in W at 0.1 W precision. */
export function formatPowerW(value: number): string {
  return formatFixed(value, POWER_W_SPEC)
}

/** Thermal resistance in K/W at 0.001 K/W precision. */
export function formatThermalResKW(value: number): string {
  return formatFixed(value, THERMAL_RES_KW_SPEC)
}

/** Duration in seconds at 0.1 s precision. */
export function formatDuration(seconds: number): string {
  return formatFixed(seconds, DURATION_SPEC)
}

/** Length of the number part alone (sign + int + `.` + fraction), without separator and unit. */
export function valueLength(spec: FormatSpec): number {
  return formattedLength(spec) - UNIT_SEPARATOR.length - spec.unit.length
}

/**
 * The number part of `formatFixed(value, spec)` without the separator and unit, for
 * readouts that set the unit in a separate, smaller element. Same fixed width for every
 * finite value in range; non-finite values return "— —" padded to that width.
 */
export function formatValue(value: number, spec: FormatSpec): string {
  if (!Number.isFinite(value)) return PLACEHOLDER.padStart(valueLength(spec), FIGURE_SPACE)
  const full = formatFixed(value, spec)
  return full.slice(0, full.length - UNIT_SEPARATOR.length - spec.unit.length)
}

/**
 * Moves a leading minus sign next to the first digit, keeping the string length:
 * "−\u2007\u20070.4" → "\u2007\u2007−0.4". For readouts where the fixed sign slot would
 * read as a detached dash. Strings without a leading minus are returned unchanged.
 */
export function hugSign(text: string): string {
  const m = /^\u2212(\u2007+)/.exec(text)
  return m ? `${m[1] ?? ''}${MINUS_SIGN}${text.slice(m[0].length)}` : text
}

/**
 * `formatValue` with the sign hugging the digits and the leading padding removed, for
 * readouts that reserve the fixed width in their own box: −0.4 → "−0.4", 84.25 → "84.3".
 */
export function formatValueFlush(value: number, spec: FormatSpec): string {
  return hugSign(formatValue(value, spec)).replace(/^\u2007+/, '')
}
