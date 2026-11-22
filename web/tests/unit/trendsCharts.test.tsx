import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { cellReadout, ChannelDayHeatmap, heatmapGrid } from '../../src/charts/ChannelDayHeatmap'
import { formatLifePct, LifeArcGauge, remainingLifePct } from '../../src/charts/LifeArcGauge'
import { advisoryLinePct, baselinePctPerDay, WearProjection } from '../../src/charts/WearProjection'
import { generateDailyPeaks, HISTORY_DAYS } from '../../src/data/mock/fixtures/history'
import { generateWear, MOCK_WEAR } from '../../src/data/mock/fixtures/wear'
import { DEFAULT_THRESHOLDS } from '../../src/domain/thresholds'
import type { WearRecord } from '../../src/domain/types'

const TJ_BAND = DEFAULT_THRESHOLDS.junction_temp
const NOW = Date.UTC(2026, 10, 21, 12)

describe('LifeArcGauge', () => {
  it('shows remaining life as percentage text and a meter value', () => {
    render(<LifeArcGauge channel={3} consumedLifePct={28.4} />)
    const meter = screen.getByRole('meter', { name: 'CH 3 remaining life' })
    expect(meter).toHaveAttribute('aria-valuenow', '72')
    expect(meter).toHaveAttribute('aria-valuetext', '72 % remaining')
    expect(meter).toHaveTextContent('72 %')
    expect(meter).toHaveTextContent('CH 3')
    expect(screen.queryByTestId('life-advisory')).toBeNull()
  })

  it('marks an advisory with icon and text', () => {
    render(<LifeArcGauge channel={4} consumedLifePct={40} advisory />)
    const advisory = screen.getByTestId('life-advisory')
    expect(advisory).toHaveTextContent(/wear advisory/i)
    expect(advisory.querySelector('[data-shape="triangle"]')).not.toBeNull()
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '60 % remaining, wear advisory')
  })

  it('clamps remaining life and shows a placeholder when unknown', () => {
    expect(remainingLifePct(120)).toBe(0)
    expect(remainingLifePct(-5)).toBe(100)
    expect(formatLifePct(remainingLifePct(NaN))).toBe('\u2014 \u2014')
    render(<LifeArcGauge channel={1} consumedLifePct={NaN} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Unknown')
    expect(screen.queryByTestId('life-arc-fill')).toBeNull()
  })
})

describe('ChannelDayHeatmap', () => {
  const peaks = generateDailyPeaks(1, NOW)

  it('draws one row per channel and one cell per day', () => {
    render(<ChannelDayHeatmap peaks={peaks} />)
    const grid = screen.getByRole('grid')
    expect(grid).toHaveAttribute('data-days', String(HISTORY_DAYS))
    expect(within(grid).getAllByRole('rowheader')).toHaveLength(6)
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(6 * HISTORY_DAYS)
  })

  it('draws only the days it is given', () => {
    const last7 = heatmapGrid(peaks).days.slice(-7)
    render(<ChannelDayHeatmap peaks={peaks.filter((p) => last7.includes(p.day))} />)
    expect(screen.getAllByRole('gridcell')).toHaveLength(6 * 7)
  })

  it('colours cells with heat tokens and adds a status icon at or above warning', () => {
    const day = '2026-11-20'
    render(
      <ChannelDayHeatmap
        channels={[1, 2, 3]}
        peaks={[
          { channel: 1, day, peak_tj: 95 },
          { channel: 2, day, peak_tj: 112 },
          { channel: 3, day, peak_tj: 126 },
        ]}
      />,
    )
    const [normal, warning, critical] = screen.getAllByRole('gridcell')
    expect(normal?.style.backgroundColor).toBe('var(--heat-4)')
    expect(normal?.querySelector('[data-shape]')).toBeNull()
    expect(warning?.querySelector('[data-shape="triangle"]')).not.toBeNull()
    expect(warning).toHaveAccessibleName(`CH 2 · ${day} · PEAK 112.0 °C · WARNING`)
    expect(critical?.querySelector('[data-shape="octagon"]')).not.toBeNull()
    expect(critical?.style.backgroundColor).toBe('var(--heat-8)')
  })

  it('shows peak Tj and date for the hovered cell', () => {
    render(<ChannelDayHeatmap peaks={[{ channel: 1, day: '2026-11-20', peak_tj: 101.3 }]} channels={[1]} />)
    fireEvent.pointerEnter(screen.getByRole('gridcell'))
    expect(screen.getByTestId('heatmap-readout')).toHaveTextContent('CH 1 · 2026-11-20 · PEAK 101.3 °C')
  })

  it('has one tab stop, moves with arrow keys and shows the focused cell', async () => {
    const user = userEvent.setup()
    const { days } = heatmapGrid(peaks)
    render(<ChannelDayHeatmap peaks={peaks} />)
    const cells = screen.getAllByRole('gridcell')
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1)

    await user.tab()
    expect(cells[0]).toHaveFocus()
    await user.keyboard('{ArrowRight}{ArrowDown}')
    const focused = document.activeElement as HTMLElement
    expect(focused.dataset.row).toBe('1')
    expect(focused.dataset.col).toBe('1')
    const peak = peaks.find((p) => p.channel === 2 && p.day === days[1])
    if (!peak) throw new Error('fixture missing CH 2 day 1')
    expect(screen.getByTestId('heatmap-readout')).toHaveTextContent(cellReadout({ ...peak, peak: peak.peak_tj }, TJ_BAND))
    expect(screen.getByTestId('heatmap-readout')).toHaveTextContent(days[1] ?? '')
  })

  it('treats a missing reading as no data, not as a colour', () => {
    expect(cellReadout({ channel: 5, day: '2026-11-01', peak: NaN }, TJ_BAND)).toBe(
      'CH 5 · 2026-11-01 · PEAK \u2014 \u2014 · NO DATA',
    )
  })
})

describe('WearProjection', () => {
  const record = MOCK_WEAR.find((r) => r.channel === 4) as WearRecord

  it('recovers the baseline wear rate from the median projection', () => {
    for (const r of generateWear(7)) expect(baselinePctPerDay(r)).toBeCloseTo(0.02, 3)
    expect(advisoryLinePct(record, 100)).toBeCloseTo(record.consumed_life_pct + 2 * 0.02 * 100, 1)
  })

  it('draws the consumed-life line, the p10–p90 band and the 2× advisory line, each named in text', () => {
    render(<WearProjection record={record} />)
    expect(screen.getByRole('img', { name: /CH 4 consumed life/ })).toBeInTheDocument()
    for (const id of ['wear-median-line', 'wear-band', 'wear-advisory-line']) {
      expect(screen.getByTestId(id).getAttribute('d')).toMatch(/^M/)
    }
    expect(screen.getByText(/P10–P90 band/i)).toBeInTheDocument()
    expect(screen.getByText(/Advisory 2× baseline wear/i)).toBeInTheDocument()
    expect(screen.getByText(/Consumed life P50/i)).toBeInTheDocument()
  })

  it('flags a wear rate above the advisory factor with an icon and text', () => {
    const { rerender } = render(<WearProjection record={{ ...record, wear_rate_vs_baseline: 2.3 }} />)
    const rate = screen.getByTestId('wear-rate')
    expect(rate).toHaveTextContent('Wear rate 2.30× baseline · advisory')
    expect(rate.querySelector('[data-shape="triangle"]')).not.toBeNull()

    rerender(<WearProjection record={{ ...record, wear_rate_vs_baseline: 2.0 }} />)
    expect(screen.getByTestId('wear-rate')).not.toHaveTextContent(/advisory/i)
  })
})
