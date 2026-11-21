import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TelemetryProvider } from '../../src/data/hooks'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { TelemetryStore } from '../../src/data/store'
import { AppShell, MAIN_ID } from '../../src/kit/AppShell'
import { Fader } from '../../src/kit/Fader'
import { alarmBellLabel, formatClock, NAV_LINKS, NAV_SHEET_QUERY, TopNav } from '../../src/kit/TopNav'

const EPOCH = Date.UTC(2026, 10, 21)
const quiet = { marginMismatch: () => undefined }

function renderWithShell({ kind = 'mock', path = '/' }: { kind?: 'mock' | 'ws'; path?: string } = {}) {
  const source = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
  if (kind === 'ws') Object.defineProperty(source, 'kind', { value: 'ws' })
  const store = new TelemetryStore(source, { decodeLogger: quiet })
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <h1>Overview page</h1> },
          { path: 'drive', element: <h1>Drive page</h1> },
          { path: 'alarms', element: <h1>Alarms page</h1> },
          { path: 'trends', element: <h1>Trends page</h1> },
          { path: 'about', element: <h1>About page</h1> },
          { path: 'settings', element: <h1>Settings page</h1> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(
    <TelemetryProvider store={store} autoStart={false}>
      <RouterProvider router={router} />
    </TelemetryProvider>,
  )
  return { router, store }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TopNav helpers', () => {
  it('formats the clock as zero-padded HH:MM:SS', () => {
    expect(formatClock(new Date(2026, 10, 21, 7, 5, 9))).toBe('07:05:09')
    expect(formatClock(new Date(2026, 10, 21, 23, 59, 0))).toBe('23:59:00')
  })

  it('names the alarm bell with the active count', () => {
    expect(alarmBellLabel(0)).toBe('Alarms, none active')
    expect(alarmBellLabel(3)).toBe('Alarms, 3 active')
  })

  it('lists the route links in reference order and collapses below 1024 px', () => {
    expect(NAV_LINKS.map((l) => l.label)).toEqual(['OVERVIEW', 'DRIVE', 'ALARMS', 'TRENDS', 'ABOUT'])
    expect(NAV_SHEET_QUERY).toBe('(min-width: 1024px)')
  })
})

describe('TopNav', () => {
  it('shows the MOCK badge while the source kind is mock', () => {
    renderWithShell({ kind: 'mock' })
    const badge = screen.getByTestId('source-badge')
    expect(badge).toHaveTextContent('MOCK')
    expect(badge).toHaveAttribute('title', expect.stringMatching(/mock data source/i))
  })

  it('hides the MOCK badge for a live WebSocket source', () => {
    renderWithShell({ kind: 'ws' })
    expect(screen.queryByTestId('source-badge')).toBeNull()
  })

  it('renders a primary nav with the route links, marking the current page', () => {
    renderWithShell({ path: '/drive' })
    const primary = screen.getByRole('navigation', { name: 'Primary' })
    const links = within(primary).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['OVERVIEW', 'DRIVE', 'ALARMS', 'TRENDS', 'ABOUT'])
    expect(within(primary).getByRole('link', { name: 'DRIVE' })).toHaveAttribute('aria-current', 'page')
    expect(within(primary).getByRole('link', { name: 'OVERVIEW' })).not.toHaveAttribute('aria-current')
  })

  it('exposes the wordmark, alarm bell and clock with accessible names', () => {
    renderWithShell()
    expect(screen.getByRole('link', { name: 'thermosense, go to overview' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Alarms, none active' })).toHaveAttribute('href', '/alarms')
    expect(screen.getAllByLabelText(/^Local time \d{2}:\d{2}:\d{2}$/).length).toBeGreaterThan(0)
  })

  it('hides the bar links and shows the menu button below 1024 px (lg breakpoint)', () => {
    renderWithShell()
    const primary = screen.getByRole('navigation', { name: 'Primary' })
    expect(primary).toHaveClass('hidden', 'lg:block')
    const menu = screen.getByRole('button', { name: 'Open menu' })
    expect(menu).toHaveClass('lg:hidden')
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('nav-sheet')).toBeNull()
  })

  it('opens the nav sheet with the route links plus SETTINGS, focusing the first link', async () => {
    const user = userEvent.setup()
    renderWithShell()
    const menu = screen.getByRole('button', { name: 'Open menu' })
    await user.click(menu)
    const sheet = screen.getByTestId('nav-sheet')
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    expect(menu).toHaveAttribute('aria-controls', sheet.id)
    expect(menu).toHaveAccessibleName('Close menu')
    expect(sheet).toHaveClass('lg:hidden')
    const links = within(within(sheet).getByRole('navigation', { name: 'Menu' })).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual([
      'OVERVIEW',
      'DRIVE',
      'ALARMS',
      'TRENDS',
      'ABOUT',
      'SETTINGS',
    ])
    expect(links[0]).toHaveFocus()
  })

  it('closes the sheet on Escape and returns focus to the menu button', async () => {
    const user = userEvent.setup()
    renderWithShell()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('nav-sheet')).toBeNull()
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus()
  })

  it('cycles Tab between the menu button and the sheet links', async () => {
    const user = userEvent.setup()
    renderWithShell()
    const menu = screen.getByRole('button', { name: 'Open menu' })
    await user.click(menu)
    const links = within(screen.getByTestId('nav-sheet')).getAllByRole('link')
    links[links.length - 1]?.focus()
    await user.tab()
    expect(menu).toHaveFocus()
    await user.tab({ shift: true })
    expect(links[links.length - 1]).toHaveFocus()
  })

  it('navigates and closes the sheet when a sheet link is chosen', async () => {
    const user = userEvent.setup()
    const { router } = renderWithShell()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(within(screen.getByTestId('nav-sheet')).getByRole('link', { name: 'SETTINGS' }))
    expect(router.state.location.pathname).toBe('/settings')
    expect(screen.queryByTestId('nav-sheet')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Settings page' })).toBeInTheDocument()
  })

  it('closes the sheet from the backdrop', async () => {
    const user = userEvent.setup()
    renderWithShell()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const backdrop = document.querySelector('[data-part="nav-backdrop"]')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop as Element)
    expect(screen.queryByTestId('nav-sheet')).toBeNull()
  })

  it('closes an open sheet once the viewport reaches 1024 px', async () => {
    let matches = false
    const listeners = new Set<() => void>()
    const matchMedia = vi.fn((query: string) => ({
      get matches() {
        return query === NAV_SHEET_QUERY ? matches : false
      },
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }))
    vi.stubGlobal('matchMedia', matchMedia)
    const user = userEvent.setup()
    renderWithShell()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByTestId('nav-sheet')).toBeInTheDocument()
    expect(matchMedia).toHaveBeenCalledWith(NAV_SHEET_QUERY)
    act(() => {
      matches = true
      for (const fn of listeners) fn()
    })
    expect(screen.queryByTestId('nav-sheet')).toBeNull()
  })

  it('renders standalone inside a router', () => {
    const source = new MockTelemetrySource({ seed: 1, epochMs: EPOCH })
    const store = new TelemetryStore(source, { decodeLogger: quiet })
    const router = createMemoryRouter([{ path: '/', element: <TopNav /> }])
    render(
      <TelemetryProvider store={store} autoStart={false}>
        <RouterProvider router={router} />
      </TelemetryProvider>,
    )
    expect(screen.getByRole('banner')).toHaveAttribute('data-sheet', 'closed')
  })
})

describe('AppShell', () => {
  it('provides a skip link to the main landmark and renders the routed page', () => {
    renderWithShell({ path: '/trends' })
    const skip = screen.getByRole('link', { name: 'Skip to content' })
    expect(skip).toHaveAttribute('href', `#${MAIN_ID}`)
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', MAIN_ID)
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(within(main).getByRole('heading', { name: 'Trends page' })).toBeInTheDocument()
  })

  it('keeps the nav mounted across navigations', async () => {
    const user = userEvent.setup()
    renderWithShell()
    const header = screen.getByRole('banner')
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', { name: 'ALARMS' }))
    expect(screen.getByRole('heading', { name: 'Alarms page' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBe(header)
  })

  it('does not show the connection banner before the source has gone stale', () => {
    renderWithShell()
    expect(screen.queryByTestId('connection-banner')).toBeNull()
  })
})

describe('Fader keyboard', () => {
  it('leaves arrow keys to the native range input (no default prevented)', () => {
    render(<Fader label="Warning" value={110} min={60} max={140} step={5} onChange={vi.fn()} />)
    const slider = screen.getByRole('slider', { name: 'Warning' })
    expect(slider).toHaveAttribute('step', '5')
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
      expect(fireEvent.keyDown(slider, { key })).toBe(true)
    }
  })
})
