import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bannerMessage, ConnectionBanner, secondsSince } from '../../src/kit/ConnectionBanner'
import { contourRingPath } from '../../src/kit/contourPath'
import { CROP_CORNERS, CropPanel } from '../../src/kit/CropPanel'
import { EMPTY_STATE_COPY, EmptyState, type EmptyStateKind } from '../../src/kit/EmptyState'
import { HeroLockup } from '../../src/kit/HeroLockup'
import { STALE_LABEL, StaleChip } from '../../src/kit/StaleChip'

describe('CropPanel', () => {
  it('draws one decorative bracket per corner around its content', () => {
    const { container } = render(<CropPanel aria-label="Artwork">content</CropPanel>)
    const brackets = container.querySelectorAll('svg[data-corner]')
    expect([...brackets].map((b) => b.getAttribute('data-corner'))).toEqual([...CROP_CORNERS])
    brackets.forEach((b) => {
      expect(b).toHaveAttribute('aria-hidden', 'true')
    })
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders edge labels as real text on their edge', () => {
    const { container } = render(
      <CropPanel
        labels={[
          { edge: 'left', text: 'CH' },
          { edge: 'right', text: 'Tj' },
          { edge: 'bottom', text: 'MARGIN', align: 'end' },
        ]}
      />,
    )
    expect(screen.getByText('CH').closest('[data-edge]')).toHaveAttribute('data-edge', 'left')
    expect(screen.getByText('MARGIN').closest('[data-edge]')).toHaveAttribute('data-edge', 'bottom')
    expect(container.querySelectorAll('[data-edge]')).toHaveLength(3)
  })

  it('applies the tone and passes through native props', () => {
    render(<CropPanel tone="bare" role="region" aria-label="Disc" />)
    expect(screen.getByRole('region', { name: 'Disc' })).toHaveAttribute('data-tone', 'bare')
  })
})

describe('HeroLockup', () => {
  it('exposes the title as the page heading and renders subtitle and secondary block', () => {
    render(<HeroLockup title="STAND-04" subtitle="Mill Drive Thyristor Monitor" secondary={<span>98.4 °C</span>} />)
    expect(screen.getByRole('heading', { level: 1, name: 'STAND-04' })).toBeInTheDocument()
    expect(screen.getByText('Mill Drive Thyristor Monitor')).toBeInTheDocument()
    expect(screen.getByText('98.4 °C')).toBeInTheDocument()
  })

  it('uses the full or compact scale and draws the smear copies', () => {
    const { container, rerender } = render(<HeroLockup title="ALARMS" secondary="x" />)
    expect(container.firstElementChild).toHaveAttribute('data-scale', 'compact')
    rerender(<HeroLockup title="ALARMS" scale="full" secondary="x" />)
    expect(container.firstElementChild).toHaveAttribute('data-scale', 'full')
    expect(container.querySelectorAll('[data-part="smear"]').length).toBeGreaterThan(0)
  })

  it('omits the divider without a secondary block', () => {
    const { container } = render(<HeroLockup title="TRENDS" />)
    expect(container.querySelector('[data-part="divider"]')).toBeNull()
  })
})

describe('EmptyState', () => {
  const KINDS: readonly EmptyStateKind[] = ['no-data', 'disconnected', 'no-alarms', 'error']

  it.each(KINDS)('%s has a contour illustration and its heading', (kind) => {
    const { container } = render(<EmptyState kind={kind} />)
    const art = container.querySelector(`svg[data-art="${kind}"]`)
    expect(art).toHaveAttribute('aria-hidden', 'true')
    expect(art?.querySelectorAll('path').length).toBeGreaterThanOrEqual(4)
    expect(screen.getByRole('heading', { level: 2, name: EMPTY_STATE_COPY[kind].heading })).toBeInTheDocument()
  })

  it('gives every kind distinct copy and artwork', () => {
    expect(new Set(KINDS.map((k) => EMPTY_STATE_COPY[k].heading)).size).toBe(KINDS.length)
    const arts = KINDS.map((kind) => {
      const { container, unmount } = render(<EmptyState kind={kind} />)
      const html = container.querySelector('svg')?.innerHTML
      unmount()
      return html
    })
    expect(new Set(arts).size).toBe(KINDS.length)
  })

  it('runs a button action and honours disabled', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    const { rerender } = render(<EmptyState kind="error" action={{ label: 'Retry', onAction }} />)
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onAction).toHaveBeenCalledTimes(1)
    rerender(<EmptyState kind="error" action={{ label: 'Retry', onAction, disabled: true }} />)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled()
  })

  it('renders a link action and accepts heading overrides', () => {
    render(
      <MemoryRouter>
        <EmptyState kind="no-data" heading="Page not found" headingLevel={3} action={{ label: 'Go to overview', to: '/' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to overview' })).toHaveAttribute('href', '/')
  })
})

describe('ConnectionBanner', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats the stale message with whole seconds and an en dash', () => {
    expect(bannerMessage('stale', 1_000, 4_900)).toBe('Data stale – last frame 3 s ago')
    expect(bannerMessage('reconnecting', 0, 12_000)).toBe('Reconnecting – last frame 12 s ago')
    expect(bannerMessage('reconnecting', null, 0)).toBe('Reconnecting to the data source')
    expect(secondsSince(5_000, 1_000)).toBe(0)
  })

  it('is hidden while live and counts up while stale', () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const { rerender } = render(<ConnectionBanner status="live" lastFrameAt={9_000} />)
    expect(screen.queryByTestId('connection-banner')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('')

    vi.setSystemTime(12_000)
    rerender(<ConnectionBanner status="stale" lastFrameAt={9_000} />)
    expect(screen.getByTestId('connection-banner')).toHaveTextContent('Data stale – last frame 3 s ago')
    expect(screen.getByRole('status')).toHaveTextContent(/Data stale/)

    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(screen.getByTestId('connection-banner')).toHaveTextContent('last frame 5 s ago')

    rerender(<ConnectionBanner status="live" lastFrameAt={14_000} />)
    expect(screen.queryByTestId('connection-banner')).toBeNull()
  })
})

describe('StaleChip', () => {
  it('shows STALE text with a decorative icon', () => {
    const { container } = render(<StaleChip />)
    expect(screen.getByText(STALE_LABEL)).toBeVisible()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('contourRingPath', () => {
  it('is deterministic, closed and a circle at zero wobble', () => {
    const ring = { cx: 60, cy: 60, r: 20, wobble: 0.15, phase: 1 }
    expect(contourRingPath(ring)).toBe(contourRingPath(ring))
    expect(contourRingPath(ring)).toMatch(/^M[\d.]+ [\d.]+(C[\d. ]+){24}Z$/)
    expect(contourRingPath({ ...ring, wobble: 0 })).toMatch(/^M80 60C/)
  })
})
