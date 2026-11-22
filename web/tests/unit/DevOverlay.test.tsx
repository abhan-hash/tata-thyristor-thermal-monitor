import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TelemetryProvider } from '../../src/data/hooks'
import type { TelemetrySource } from '../../src/data/ports'
import { TelemetryStore } from '../../src/data/store'
import { AppShell } from '../../src/kit/AppShell'
import { DevOverlay, isDevEnabled } from '../../src/kit/DevOverlay'

const quiet = { marginMismatch: () => undefined }

/** A source that reports `live` and emits only when the test calls `emit`. */
function manualSource() {
  let emit: (f: unknown) => void = () => undefined
  const source: TelemetrySource = {
    kind: 'mock',
    start: () => undefined,
    stop: () => undefined,
    subscribe: (cb) => {
      emit = cb as (f: unknown) => void
      return () => undefined
    },
    onStatus: (cb) => {
      cb('live')
      return () => undefined
    },
  }
  return { source, emit: (f: unknown) => emit(f) }
}

function renderAt(path: string, element = <DevOverlay />) {
  const { source, emit } = manualSource()
  const store = new TelemetryStore(source, { decodeLogger: quiet })
  const router = createMemoryRouter([{ path: '/', element }], { initialEntries: [path] })
  render(
    <TelemetryProvider store={store}>
      <RouterProvider router={router} />
    </TelemetryProvider>,
  )
  return { store, emit }
}

describe('isDevEnabled', () => {
  it('is on only for dev=1', () => {
    expect(isDevEnabled(new URLSearchParams('dev=1'))).toBe(true)
    expect(isDevEnabled(new URLSearchParams('dev=0'))).toBe(false)
    expect(isDevEnabled(new URLSearchParams('dev=true'))).toBe(false)
    expect(isDevEnabled(new URLSearchParams(''))).toBe(false)
  })
})

describe('DevOverlay', () => {
  it('renders nothing without ?dev=1', () => {
    renderAt('/')
    expect(screen.queryByTestId('dev-overlay')).toBeNull()
  })

  it('shows connection status, frame rate placeholder and zero drops', () => {
    renderAt('/?dev=1')
    expect(screen.getByRole('complementary', { name: 'Developer overlay' })).toBeInTheDocument()
    expect(screen.getByTestId('dev-connection')).toHaveTextContent('live')
    expect(screen.getByTestId('dev-fps')).toHaveTextContent('–')
    expect(screen.getByTestId('dev-dropped')).toHaveTextContent('0')
    expect(screen.queryByTestId('dev-last-error')).toBeNull()
  })

  it('counts malformed frames and shows the last decode error (Requirement 9.9)', () => {
    const { emit } = renderAt('/?dev=1')
    act(() => {
      emit({ not: 'a frame' })
      emit(null)
    })
    expect(screen.getByTestId('dev-dropped')).toHaveTextContent('2')
    expect(screen.getByTestId('dev-last-error').textContent).not.toBe('')
  })

  it('shows the valid-frame count of the last Display_Tick as the frame rate', () => {
    const { store } = renderAt('/?dev=1')
    act(() => {
      store.emitDisplayTick()
    })
    expect(screen.getByTestId('dev-fps')).toHaveTextContent('0 Hz')
  })

  it('is mounted by AppShell', () => {
    renderAt('/?dev=1', <AppShell />)
    expect(screen.getByTestId('dev-overlay')).toBeInTheDocument()
  })
})
