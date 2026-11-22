import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FluidLabel, fluidScale } from '../../src/kit/FluidLabel'
import { QUERY_ERROR_HEADING, QueryState, RETRY_LABEL } from '../../src/kit/QueryState'
import { RELOAD_LABEL, RegionErrorBoundary } from '../../src/kit/RegionErrorBoundary'

afterEach(() => {
  vi.restoreAllMocks()
})

/** React logs caught render errors; keep the test output readable. */
function silenceRenderErrors() {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
}

describe('RegionErrorBoundary', () => {
  it('contains a throwing region while siblings keep rendering, and reload remounts it', async () => {
    silenceRenderErrors()
    let shouldThrow = true
    function Fragile() {
      if (shouldThrow) throw new Error('boom')
      return <p>Bridge OK</p>
    }
    const onError = vi.fn()
    render(
      <>
        <RegionErrorBoundary region="bridge" onError={onError}>
          <Fragile />
        </RegionErrorBoundary>
        <RegionErrorBoundary region="rack">
          <p>Rack OK</p>
        </RegionErrorBoundary>
      </>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('data-region', 'bridge')
    expect(alert.querySelector('[data-kind="error"]')).not.toBeNull()
    expect(screen.getByText('Rack OK')).toBeInTheDocument()
    expect(onError).toHaveBeenCalledTimes(1)

    shouldThrow = false
    await userEvent.click(screen.getByRole('button', { name: RELOAD_LABEL }))
    expect(screen.getByText('Bridge OK')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('resets on its own when a reset key changes', async () => {
    silenceRenderErrors()
    function Page({ path }: { path: string }) {
      if (path === '/bad') throw new Error('bad page')
      return <p>Page {path}</p>
    }
    function Harness() {
      const [path, setPath] = useState('/bad')
      return (
        <>
          <button type="button" onClick={() => setPath('/good')}>
            Navigate
          </button>
          <RegionErrorBoundary region="page" resetKeys={[path]}>
            <Page path={path} />
          </RegionErrorBoundary>
        </>
      )
    }
    render(<Harness />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Navigate' }))
    expect(screen.getByText('Page /good')).toBeInTheDocument()
  })
})

describe('QueryState', () => {
  function renderQuery(queryFn: () => Promise<string[]>) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function Panel() {
      const query = useQuery({ queryKey: ['history', 'test'], queryFn })
      return (
        <QueryState query={query} empty={{ kind: 'no-alarms' }}>
          {(rows) => (
            <ul>
              {rows.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </QueryState>
      )
    }
    render(
      <QueryClientProvider client={client}>
        <Panel />
        <p>Other panel</p>
      </QueryClientProvider>,
    )
  }

  it('shows loading, then the data', async () => {
    renderQuery(() => Promise.resolve(['A1', 'A2']))
    expect(screen.getByRole('status', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByText('A1')).toBeInTheDocument()
  })

  it('shows the empty state for an empty list', async () => {
    renderQuery(() => Promise.resolve([]))
    expect(await screen.findByRole('heading', { name: 'No alarms' })).toBeInTheDocument()
  })

  it('shows an inline error whose Retry re-issues the request', async () => {
    const queryFn = vi.fn<() => Promise<string[]>>().mockRejectedValueOnce(new Error('down')).mockResolvedValue(['A1'])
    renderQuery(queryFn)
    expect(await screen.findByRole('heading', { name: QUERY_ERROR_HEADING })).toBeInTheDocument()
    expect(screen.getByText('Other panel')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: RETRY_LABEL }))
    expect(await screen.findByText('A1')).toBeInTheDocument()
    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(2)
    })
  })
})

describe('FluidLabel', () => {
  const long = 'T3 junction overtemperature during bar entry'

  it('wraps by default without hiding text', () => {
    render(<FluidLabel text={long} />)
    const el = screen.getByText(long)
    expect(el).toHaveAttribute('data-label-mode', 'wrap')
    expect(el).not.toHaveAttribute('title')
  })

  it('shrinks long labels with clamp() and leaves short ones alone', () => {
    render(
      <>
        <FluidLabel text={long} mode="fluid" designLength={40} />
        <FluidLabel text="T1" mode="fluid" />
      </>,
    )
    const shrunk = screen.getByText(long)
    expect(shrunk.className).toContain('[font-size:clamp(')
    expect(Number(shrunk.style.getPropertyValue('--fluid-label-scale'))).toBeCloseTo(40 / long.length, 2)
    expect(screen.getByText('T1').className).not.toContain('clamp(')
  })

  it('puts the full text in title and aria-label when truncating', () => {
    render(<FluidLabel text={long} mode="truncate" />)
    const el = screen.getByText(long)
    expect(el).toHaveAttribute('title', long)
    expect(el).toHaveAttribute('aria-label', long)
  })

  it('scales in proportion to the overflow, floored at minScale', () => {
    expect(fluidScale(10, 16, 0.75)).toBe(1)
    expect(fluidScale(20, 16, 0.75)).toBeCloseTo(0.8)
    expect(fluidScale(100, 16, 0.75)).toBe(0.75)
  })
})

describe('layout.css', () => {
  const css = readFileSync(resolve(import.meta.dirname, '../../src/styles/layout.css'), 'utf8')
  const block = (media: string | null) => {
    const re =
      media === null
        ? /^:root\s*\{([^}]*)\}/m
        : new RegExp(String.raw`@media \(min-width: ${media}\)\s*\{\s*:root\s*\{([^}]*)\}`)
    return re.exec(css)?.[1] ?? ''
  }

  it('defines 4, 8 and 12 columns with the specified gutters and margins', () => {
    expect(block(null)).toMatch(/--layout-columns:\s*4;/)
    expect(block('1024px')).toMatch(/--layout-columns:\s*8;/)
    const wide = block('1440px')
    expect(wide).toMatch(/--layout-columns:\s*12;/)
    expect(wide).toMatch(/--layout-gutter:\s*var\(--space-6\);/) // 24 px
    expect(wide).toMatch(/--layout-margin:\s*72px;/)
  })
})
