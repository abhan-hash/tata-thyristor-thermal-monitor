import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartFrame } from '../../src/charts/ChartFrame'
import {
  bandLabel,
  clipBand,
  JUNCTION_BANDS,
  seriesExtent,
  thresholdBands,
} from '../../src/charts/chartTheme'
import { Sparkline } from '../../src/kit/Sparkline'

describe('chartTheme bands', () => {
  it('builds labelled warning and trip bands from thresholds', () => {
    expect(JUNCTION_BANDS.map((b) => b.label)).toEqual(['WARN 110 °C', 'TRIP 125 °C'])
    expect(thresholdBands({ warning: 4, critical: 8 }, 'K')).toEqual([
      { from: 4, to: 8, label: 'WARN 4 K', tone: 'warning' },
      { from: 8, to: Infinity, label: 'TRIP 8 K', tone: 'trip' },
    ])
    expect(bandLabel('warning', 82.5, '°C')).toBe('WARN 82.5 °C')
  })

  it('clips bands to the domain', () => {
    expect(clipBand({ from: 125, to: Infinity, label: 'x' }, 0, 140)).toEqual({ from: 125, to: 140 })
    expect(clipBand({ from: 125, to: Infinity, label: 'x' }, 0, 100)).toBeNull()
  })

  it('pads the finite extent of a series', () => {
    expect(seriesExtent([NaN, 10, 20], 0.1)).toEqual([9, 21])
    expect(seriesExtent([5, 5])).toEqual([4, 6])
    expect(seriesExtent([])).toEqual([0, 1])
  })
})

describe('ChartFrame', () => {
  it('draws band labels as text and names the chart', () => {
    render(
      <ChartFrame
        title="Junction temperature"
        width={480}
        height={200}
        xDomain={[-60, 0]}
        yDomain={[40, 140]}
        bands={JUNCTION_BANDS}
      >
        {({ x, y }) => <line data-testid="trace" x1={x(-60)} x2={x(0)} y1={y(90)} y2={y(100)} />}
      </ChartFrame>,
    )
    expect(screen.getByRole('img', { name: /Junction temperature/ })).toBeInTheDocument()
    expect(screen.getByText('WARN 110 °C').tagName.toLowerCase()).toBe('text')
    expect(screen.getByText('TRIP 125 °C').tagName.toLowerCase()).toBe('text')
    expect(screen.getByTestId('trace')).toBeInTheDocument()
  })

  it('renders a controlled crosshair', () => {
    render(
      <ChartFrame
        title="Shared"
        width={300}
        height={120}
        xDomain={[0, 60]}
        yDomain={[0, 10]}
        crosshairX={30}
        formatX={(v) => `${v} s`}
      />,
    )
    expect(screen.getByTestId('chart-crosshair')).toHaveTextContent('30 s')
  })
})

describe('Sparkline', () => {
  it('is decorative without a label and draws the live point', () => {
    const { container } = render(<Sparkline series={new Float32Array([1, 2, NaN, 3])} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('sparkline-head')).toBeInTheDocument()
  })

  it('exposes a name and clipped band tints when given', () => {
    const { container } = render(
      <Sparkline label="Tj, last 60 s" series={[100, 112, 118]} domain={[90, 130]} bands={JUNCTION_BANDS} />,
    )
    expect(screen.getByRole('img', { name: 'Tj, last 60 s' })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-band-tone]')).toHaveLength(2)
  })
})
