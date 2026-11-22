import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { HistoryProvider } from '../../src/data/historyHooks'
import { MockHistoryRepository } from '../../src/data/mock/MockHistoryRepository'
import { MOCK_WEAR } from '../../src/data/mock/fixtures/wear'
import type { WearRecord } from '../../src/domain/types'
import { hasWearAdvisory, parseTrendsDays, TrendsPage } from '../../src/pages/Trends/TrendsPage'
import { resetUiStore } from '../../src/state/uiStore'

beforeEach(() => {
  localStorage.clear()
  resetUiStore()
})

function renderTrends(path = '/trends', wear?: readonly WearRecord[]) {
  const router = createMemoryRouter([{ path: '/trends', Component: TrendsPage }], { initialEntries: [path] })
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <HistoryProvider repository={new MockHistoryRepository({ seed: 7, ...(wear ? { wear } : {}) })}>
        <RouterProvider router={router} />
      </HistoryProvider>
    </QueryClientProvider>,
  )
  return router
}

/** Wear records with the given rates for channels 1..6, else the fixture records. */
function wearWithRates(rates: readonly number[]): WearRecord[] {
  return MOCK_WEAR.map((w, i) => ({ ...w, wear_rate_vs_baseline: rates[i] ?? w.wear_rate_vs_baseline }))
}

describe('parseTrendsDays', () => {
  it('accepts 7 and 30 and defaults everything else to 30', () => {
    expect(parseTrendsDays('7')).toBe(7)
    expect(parseTrendsDays('30')).toBe(30)
    expect(parseTrendsDays(null)).toBe(30)
    expect(parseTrendsDays('14')).toBe(30)
  })
})

describe('TrendsPage', () => {
  it('shows six gauges with remaining life as text', async () => {
    renderTrends()
    const gauges = await screen.findAllByRole('meter', { name: /remaining life/ })
    expect(gauges).toHaveLength(6)
    for (const g of gauges) expect(g).toHaveTextContent(/\d+ %/)
  })

  it('?days= controls the number of heatmap day columns, 30 by default', async () => {
    const router = renderTrends('/trends?days=7')
    let grid = await screen.findByRole('grid')
    expect(grid).toHaveAttribute('data-days', '7')
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(6 * 7)

    await userEvent.click(screen.getByRole('button', { name: /30 days/i }))
    expect(router.state.location.search).toBe('?days=30')
    grid = await screen.findByRole('grid', { name: /last 30 days/ })
    expect(await within(grid).findAllByRole('gridcell')).toHaveLength(6 * 30)
  })

  it('defaults to 30 days without the param', async () => {
    renderTrends('/trends')
    expect(await screen.findByRole('grid')).toHaveAttribute('data-days', '30')
    expect(screen.getByRole('button', { name: /30 days/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('focusing a heatmap cell shows its peak Tj and date', async () => {
    renderTrends('/trends?days=7')
    const grid = await screen.findByRole('grid')
    const first = within(grid).getAllByRole('gridcell')[0]
    if (!first) throw new Error('no cell')
    act(() => {
      first.focus()
    })
    const readout = screen.getByTestId('heatmap-readout')
    expect(readout).toHaveTextContent(/CH 1 · \d{4}-\d{2}-\d{2} · PEAK +\d+\.\d °C/)
    expect(readout.textContent).toContain(first.getAttribute('aria-label')?.split(' · ')[1] ?? '?')
  })

  it('marks only channels above 2.0× baseline with an advisory', async () => {
    renderTrends('/trends', wearWithRates([1.0, 2.0, 2.01, 1.5, 3.2, 0.9]))
    const gauges = await screen.findAllByRole('meter', { name: /remaining life/ })
    const flagged = gauges.filter((g) => g.hasAttribute('data-advisory')).map((g) => g.dataset.channel)
    expect(flagged).toEqual(['3', '5'])
    expect(screen.getAllByTestId('life-advisory')).toHaveLength(2)
    expect(screen.getAllByTestId('ledger-advisory')).toHaveLength(2)
    expect(screen.getByTestId('advisory-count')).toHaveTextContent('2 wear advisories')
    expect(hasWearAdvisory({ wear_rate_vs_baseline: 2.0 })).toBe(false)
  })

  it('shows no advisory when every channel is at or below 2.0×', async () => {
    renderTrends('/trends', wearWithRates([1, 1, 2, 1, 1, 1]))
    await screen.findAllByRole('meter', { name: /remaining life/ })
    expect(screen.queryByTestId('life-advisory')).toBeNull()
    expect(screen.getByTestId('advisory-count')).toHaveTextContent('No wear advisories')
  })

  it('projects the selected channel', async () => {
    renderTrends()
    const ledger = await screen.findByRole('list', { name: 'Channel wear rates' })
    await userEvent.click(within(ledger).getByRole('button', { name: /CH 2/ }))
    expect(screen.getByRole('heading', { name: 'CH 2 wear projection' })).toBeInTheDocument()
    expect(document.querySelector('figure[data-channel="2"]')).not.toBeNull()
    expect(within(ledger).getByRole('button', { name: /CH 2/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
