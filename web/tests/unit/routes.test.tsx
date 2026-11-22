import { QueryClient } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter } from 'react-router'
import type { RouteObject } from 'react-router'
import App from '../../src/App'
import { MockHistoryRepository } from '../../src/data/mock/MockHistoryRepository'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { TelemetryStore } from '../../src/data/store'
import { AppShell } from '../../src/kit/AppShell'
import { NAV_LINKS } from '../../src/kit/TopNav'
import { routes } from '../../src/routes'

let store: TelemetryStore | undefined

afterEach(() => {
  store?.stop()
  store = undefined
  vi.restoreAllMocks()
})

function renderAt(path: string, table: RouteObject[] = routes) {
  store = new TelemetryStore(new MockTelemetrySource({ seed: 7 }), { decodeLogger: { marginMismatch: () => undefined } })
  const router = createMemoryRouter(table, { initialEntries: [path] })
  render(
    <App
      store={store}
      repository={new MockHistoryRepository({ seed: 7 })}
      queryClient={new QueryClient()}
      router={router}
    />,
  )
  return router
}

describe('app router', () => {
  it('renders the shell with the nav and main landmark at /', async () => {
    renderAt('/')
    expect(await screen.findByRole('main')).toBeInTheDocument()
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
  })

  it('renders the Overview eagerly at /', async () => {
    renderAt('/')
    const index = routes[0]?.children?.find((r) => r.index === true)
    expect(index?.Component).toBeTypeOf('function')
    expect(index?.lazy).toBeUndefined()
    expect(await screen.findByRole('heading', { level: 1, name: 'STAND-04' })).toBeInTheDocument()
  })

  it.each([
    ['/drive', 'DRIVE'],
    ['/alarms', 'ALARMS'],
    ['/trends', 'TRENDS'],
    ['/settings', 'SETTINGS'],
    ['/about', 'ABOUT'],
  ])('lazy-loads %s inside the shell', async (path, title) => {
    renderAt(path)
    const route = routes[0]?.children?.find((r) => r.path === path.slice(1))
    expect(route?.lazy).toBeTypeOf('function')
    // Lazy chunks can be slow to import under a loaded parallel run.
    const heading = await screen.findByRole('heading', { level: 1, name: title }, { timeout: 10_000 })
    expect(screen.getByRole('main')).toContainElement(heading)
  }, 15_000)

  it('shows an EmptyState with a link home for unknown paths', async () => {
    renderAt('/no-such-page')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to overview' })).toHaveAttribute('href', '/')
  })

  it('registers a route for every nav link', () => {
    const children = routes[0]?.children ?? []
    for (const to of [...NAV_LINKS.map((l) => l.to), '/settings']) {
      const found = to === '/' ? children.some((r) => r.index === true) : children.some((r) => r.path === to.slice(1))
      expect(found, to).toBe(true)
    }
  })

  it('lazy-loads the kit page inside the shell at /kit', async () => {
    renderAt('/kit')
    const kitRoute = routes[0]?.children?.find((r) => r.path === 'kit')
    expect(kitRoute?.lazy).toBeTypeOf('function')
    // The gallery chunk is large; give the lazy import time under a loaded parallel run.
    const heading = await screen.findByRole('heading', { level: 1, name: 'Component kit' }, { timeout: 10_000 })
    expect(screen.getByRole('main')).toContainElement(heading)
  }, 15_000)

  it('contains a throwing page in its boundary while the shell keeps rendering', async () => {
    // React logs caught render errors; keep the output readable.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    function Broken(): never {
      throw new Error('page exploded')
    }
    const table: RouteObject[] = [
      {
        path: '/',
        Component: AppShell,
        children: [
          { index: true, Component: () => <h1>Home OK</h1> },
          { path: 'boom', Component: Broken },
        ],
      },
    ]
    const router = renderAt('/boom', table)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveAttribute('data-region', 'page')
    expect(screen.getByRole('main')).toContainElement(alert)
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
    // Navigating away resets the page boundary.
    await act(() => router.navigate('/'))
    expect(await screen.findByRole('heading', { name: 'Home OK' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
