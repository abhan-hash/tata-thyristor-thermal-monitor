import fc from 'fast-check'
import { describe } from 'vitest'
import {
  CURRENT_A_SPEC,
  DELTA_K_SPEC,
  DURATION_SPEC,
  FIGURE_SPACE,
  MINUS_SIGN,
  PLACEHOLDER,
  POWER_W_SPEC,
  TEMP_C_SPEC,
  THERMAL_RES_KW_SPEC,
  UNIT_SEPARATOR,
  formatCurrentA,
  formatDeltaK,
  formatDuration,
  formatPowerW,
  formatTempC,
  formatThermalResKW,
  formattedLength,
  type FormatSpec,
} from '../../src/domain/format'
import { propertyTest } from './runner'

/**
 * Property 7: Formatting stability.
 * For all finite x in the display range [−50, 250] and a fixed unit and precision,
 * `format(x).length` is constant and the output contains only digits, a sign position,
 * one decimal separator and the unit. NaN formats to the placeholder "— —" of the same
 * width. No HTML entities appear in any formatted string.
 *
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.6**
 */

const formatters: readonly { name: string; format: (v: number) => string; spec: FormatSpec }[] = [
  { name: 'formatTempC', format: formatTempC, spec: TEMP_C_SPEC },
  { name: 'formatDeltaK', format: formatDeltaK, spec: DELTA_K_SPEC },
  { name: 'formatCurrentA', format: formatCurrentA, spec: CURRENT_A_SPEC },
  { name: 'formatPowerW', format: formatPowerW, spec: POWER_W_SPEC },
  { name: 'formatThermalResKW', format: formatThermalResKW, spec: THERMAL_RES_KW_SPEC },
  { name: 'formatDuration', format: formatDuration, spec: DURATION_SPEC },
]

const HTML_ENTITY = /&[#A-Za-z0-9]+;/

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Sign slot (U+2212 or U+2007), integer part left-padded with U+2007 (leading only),
 * exactly one `.`, the fixed number of fraction digits, a space and the unit.
 */
function layoutPattern(spec: FormatSpec): RegExp {
  return new RegExp(
    `^[${MINUS_SIGN}${FIGURE_SPACE}]${FIGURE_SPACE}*[0-9]+\\.[0-9]{${String(spec.decimals)}}` +
      `${escapeRegExp(UNIT_SEPARATOR)}${escapeRegExp(spec.unit)}$`,
    'u',
  )
}

const displayValue = fc.oneof(
  fc.double({ min: -50, max: 250, noNaN: true, noDefaultInfinity: true }),
  fc.constantFrom(-50, -0, 0, 250, -0.04, 0.04, -0.05, 249.96),
)

const nonFinite = fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)

describe('Formatting stability', () => {
  for (const { name, format, spec } of formatters) {
    const expectedLength = formattedLength(spec)
    const pattern = layoutPattern(spec)

    propertyTest(
      7,
      `Formatting stability (${name}, finite)`,
      fc.property(displayValue, (x) => {
        const out = format(x)
        if (out.length !== expectedLength) {
          throw new Error(`${name}(${String(x)}) = "${out}" has length ${String(out.length)}, expected ${String(expectedLength)}`)
        }
        if (!pattern.test(out)) throw new Error(`${name}(${String(x)}) = "${out}" does not match ${String(pattern)}`)
        if (out.split('.').length - 1 !== (spec.unit.includes('.') ? 2 : 1)) {
          throw new Error(`${name}(${String(x)}) = "${out}" must contain exactly one decimal separator`)
        }
        if (HTML_ENTITY.test(out)) throw new Error(`${name}(${String(x)}) = "${out}" contains an HTML entity`)
        return true
      }),
    )

    propertyTest(
      7,
      `Formatting stability (${name}, placeholder)`,
      fc.property(nonFinite, (x) => {
        const out = format(x)
        if (out.length !== expectedLength) {
          throw new Error(`${name}(${String(x)}) = "${out}" has length ${String(out.length)}, expected ${String(expectedLength)}`)
        }
        if (out.replace(new RegExp(`^${FIGURE_SPACE}+`, 'u'), '') !== PLACEHOLDER) {
          throw new Error(`${name}(${String(x)}) = "${out}" is not the padded placeholder "${PLACEHOLDER}"`)
        }
        if (HTML_ENTITY.test(out)) throw new Error(`${name}(${String(x)}) = "${out}" contains an HTML entity`)
        return true
      }),
    )
  }
})
