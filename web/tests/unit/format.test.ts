// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  CURRENT_A_SPEC,
  DELTA_K_SPEC,
  DURATION_SPEC,
  FIGURE_SPACE as F,
  MINUS_SIGN as M,
  POWER_W_SPEC,
  TEMP_C_SPEC,
  THERMAL_RES_KW_SPEC,
  formatCurrentA,
  formatDeltaK,
  formatDuration,
  formatPowerW,
  formatTempC,
  formatThermalResKW,
  formattedLength,
  type FormatSpec,
} from '../../src/domain/format'

const FORMATTERS: ReadonlyArray<[string, (v: number) => string, FormatSpec]> = [
  ['formatTempC', formatTempC, TEMP_C_SPEC],
  ['formatDeltaK', formatDeltaK, DELTA_K_SPEC],
  ['formatCurrentA', formatCurrentA, CURRENT_A_SPEC],
  ['formatPowerW', formatPowerW, POWER_W_SPEC],
  ['formatThermalResKW', formatThermalResKW, THERMAL_RES_KW_SPEC],
  ['formatDuration', formatDuration, DURATION_SPEC],
]

describe('formatTempC', () => {
  it('formats with sign position, padded integer, one decimal and unit', () => {
    expect(formatTempC(98.4)).toBe(`${F}${F}98.4 °C`)
    expect(formatTempC(125)).toBe(`${F}125.0 °C`)
    expect(formatTempC(-50)).toBe(`${M}${F}50.0 °C`)
    expect(formatTempC(0)).toBe(`${F}${F}${F}0.0 °C`)
  })

  it('never shows a minus sign for values that round to zero', () => {
    expect(formatTempC(-0)).toBe(formatTempC(0))
    expect(formatTempC(-0.04)).toBe(formatTempC(0))
  })

  it('rounds to 0.1 °C and distinguishes values 0.1 °C apart', () => {
    expect(formatTempC(109.96)).toBe(`${F}110.0 °C`)
    expect(formatTempC(109.9)).not.toBe(formatTempC(110.0))
    expect(formatTempC(-0.1)).toBe(`${M}${F}${F}0.1 °C`)
  })

  it('returns the padded placeholder for NaN and infinities', () => {
    const placeholder = `${F.repeat(6)}— —`
    expect(formatTempC(Number.NaN)).toBe(placeholder)
    expect(formatTempC(Number.POSITIVE_INFINITY)).toBe(placeholder)
    expect(placeholder.length).toBe(formatTempC(98.4).length)
  })
})

describe('other formatters', () => {
  it('use their unit and precision', () => {
    expect(formatDeltaK(-3.25)).toBe(`${M}${F}${F}3.3 K`)
    expect(formatCurrentA(1000)).toBe(`${F}1000.0 A`)
    expect(formatPowerW(2200.46)).toBe(`${F}2200.5 W`)
    expect(formatThermalResKW(0.15)).toBe(`${F}${F}${F}0.150 K/W`)
    expect(formatDuration(12.34)).toBe(`${F}${F}${F}12.3 s`)
  })
})

describe.each(FORMATTERS)('%s', (_name, format, spec) => {
  it('keeps a constant length across the display range and for NaN', () => {
    const expected = formattedLength(spec)
    for (const v of [-50, -49.95, -1, -0.001, 0, 0.5, 9.99, 99.9, 249.94, 250]) {
      expect(format(v)).toHaveLength(expected)
    }
    expect(format(Number.NaN)).toHaveLength(expected)
  })

  it('uses only digits, sign/padding, one ".", a space and the unit', () => {
    const allowed = new RegExp(`^[${M}${F}][0-9${F}]+\\.[0-9]+ ${spec.unit}$`)
    for (const v of [-50, -12.3, 0, 42.42, 250]) {
      const out = format(v)
      expect(out).toMatch(allowed)
      expect(out).not.toMatch(/&[#a-zA-Z0-9]+;/)
    }
  })
})
