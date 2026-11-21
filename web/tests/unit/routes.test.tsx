import { QueryClient } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryRouter } from 'react-router'
import App from '../../src/App'
import { MockHistoryRepository } from '../../src/data/mock/MockHistoryRepository'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { TelemetryStore } from '../../src/data/store'
import { routes } from '../../src/routes'

let store: TelemetryStore | undefined

afterEach(() => {
  store?.stop()
  store = undefined
})

function renderAt(path: string) {
  store = new TelemetryStore(new MockTelemetrySource({ seed: 7 }), { decodeLogger: { marginMismatch: () => undefined } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
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

  it('lazy-loads the kit page inside the shell at /kit', async () => {
    renderAt('/kit')
    const kitRoute = routes[0]?.children?.find((r) => r.path === 'kit')
    expect(kitRoute?.lazy).toBeTypeOf('function')
    // The gallery chunk is large; give the lazy import time under a loaded parallel run.
    const heading = await screen.findByRole('heading', { level: 1, name: 'Component kit' }, { timeout: 10_000 })
    expect(screen.getByRole('main')).toContainElement(heading)
  }, 15_000)
})
