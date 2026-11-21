import { act, render, screen } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { describe, expect, it } from 'vitest'
import {
  formattedLength,
  formatValue,
  POWER_W_SPEC,
  TEMP_C_SPEC,
  valueLength,
} from '../../src/domain/format'
import { formatDelta, KpiTile, kpiValueWidthCh } from '../../src/kit/KpiTile'

describe('formatValue', () => {
  it('drops the unit and keeps a constant width', () => {
    expect(formatValue(84.25, TEMP_C_SPEC)).toBe('\u2007\u200784.3')
    expect(formatValue(-12, TEMP_C_SPEC)).toBe('\u2212\u200712.0')
    expect(formatValue(NaN, TEMP_C_SPEC)).toHaveLength(valueLength(TEMP_C_SPEC))
    expect(valueLength(TEMP_C_SPEC)).toBe(formattedLength(TEMP_C_SPEC) - ' °C'.length)
  })
})

describe('formatDelta', () => {
  it('signs positive, negative and zero deltas', () => {
    expect(formatDelta(1.24, TEMP_C_SPEC)).toBe('+1.2')
    expect(formatDelta(-0.4, TEMP_C_SPEC)).toBe('\u22120.4')
    expect(formatDelta(0.01, TEMP_C_SPEC)).toBe('\u00B10.0')
  })
})

describe('KpiTile', () => {
  it('renders label, formatted value, unit and status', () => {
    const value = motionValue(72.46)
    render(<KpiTile label="Heatsink" value={value} spec={TEMP_C_SPEC} status="warning" />)
    expect(screen.getByRole('group', { name: 'Heatsink' })).toBeInTheDocument()
    expect(screen.getByTestId('kpi-value')).toHaveTextContent('72.5')
    expect(screen.getByText('°C')).toBeInTheDocument()
    expect(screen.getByText('WARNING')).toBeInTheDocument()
  })

  it('reserves a fixed ch width for the value (Requirement 6.9)', () => {
    const value = motionValue(5)
    render(<KpiTile label="Power loss" value={value} spec={POWER_W_SPEC} />)
    const readout = screen.getByTestId('kpi-readout')
    const width = kpiValueWidthCh(POWER_W_SPEC)
    expect(width).toBe(valueLength(POWER_W_SPEC))
    const expected = `calc(${width}ch + var(--kpi-unit-reserve))`
    expect(readout.getAttribute('style')).toContain(expected)
    expect(screen.getByTestId('kpi-value')).toHaveClass('num')
    act(() => {
      value.set(1234.5)
    })
    expect(readout.getAttribute('style')).toContain(expected)
    expect(screen.getByTestId('kpi-value').textContent).toBe('1234.5')
  })

  it('updates the value text from the MotionValue without a React render', () => {
    const value = motionValue(100)
    render(<KpiTile label="Tj" value={value} spec={TEMP_C_SPEC} />)
    act(() => {
      value.set(118.04)
    })
    expect(screen.getByTestId('kpi-value').textContent).toBe('118.0')
    act(() => {
      value.set(NaN)
    })
    expect(screen.getByTestId('kpi-value').textContent).toBe('\u2014 \u2014')
  })

  it('renders the sparkline and delta when given', () => {
    const value = motionValue(80)
    const { container } = render(
      <KpiTile
        label="Heatsink"
        value={value}
        spec={TEMP_C_SPEC}
        series={new Float32Array([78, 79, 80])}
        delta={2}
        deltaLabel="60 s"
      />,
    )
    expect(container.querySelector('svg[data-samples="3"]')).not.toBeNull()
    expect(screen.getByTestId('kpi-delta')).toHaveTextContent('+2.0 °C')
  })
})
