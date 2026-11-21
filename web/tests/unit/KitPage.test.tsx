import { QueryClient } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter } from 'react-router'
import App from '../../src/App'
import { MockHistoryRepository } from '../../src/data/mock/MockHistoryRepository'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { TelemetryStore } from '../../src/data/store'
import { KIT_SECTIONS, resolveSection, sectionDomId, spacedName } from '../../src/pages/Kit/sections'
import { routes } from '../../src/routes'

/** Component names from Requirement 6.1. */
const KIT_COMPONENTS = [
  'AppShell', 'TopNav', 'HeroLockup', 'HeatSmearTitle', 'CropPanel', 'KpiTile', 'Sparkline', 'StatusChip',
  'HeatDisc', 'RackRow', 'SourceButton', 'SourceGrid', 'ChartFrame', 'Fader', 'HardwareToggle', 'Field',
  'NumberField', 'Select', 'FilterChip', 'EmptyState', 'ConnectionBanner', 'ContourBackground',
] as const

let store: TelemetryStore | undefined
/** Elements `scrollIntoView` was called on, in order. jsdom does not implement it. */
let scrolled: Element[] = []
const originalScroll = Element.prototype.scrollIntoView

beforeEach(() => {
  scrolled = []
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this)
  })
})

afterEach(() => {
  store?.stop()
  store = undefined
  Element.prototype.scrollIntoView = originalScroll
})

function renderKit(path: string) {
  store = new TelemetryStore(new MockTelemetrySource({ seed: 7 }), { decodeLogger: { marginMismatch: () => undefined } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <App store={store} repository={new MockHistoryRepository({ seed: 7 })} queryClient={new QueryClient()} router={router} />,
  )
  return router
}

/** Waits for the lazy gallery chunk to load. */
async function findGallery() {
  await screen.findByRole('heading', { level: 1, name: 'Component kit' }, { timeout: 10_000 })
}

describe('kit section registry', () => {
  it('has a section for every component in Requirement 6.1, with unique ids', () => {
    const names = KIT_SECTIONS.map((s) => s.name)
    for (const name of KIT_COMPONENTS) expect(names).toContain(name)
    expect(new Set(KIT_SECTIONS.map((s) => s.id)).size).toBe(KIT_SECTIONS.length)
  })

  it('resolves ?section= by id or by component name in any case', () => {
    expect(resolveSection('rack-row')?.name).toBe('RackRow')
    expect(resolveSection('RackRow')?.id).toBe('rack-row')
    expect(resolveSection('emptystate')?.id).toBe('empty-state')
    expect(resolveSection('nope')).toBeUndefined()
    expect(resolveSection('')).toBeUndefined()
    expect(resolveSection(null)).toBeUndefined()
  })

  it('spaces camelCase names for edge labels', () => {
    expect(spacedName('EmptyState')).toBe('Empty State')
    expect(spacedName('ContourBackground')).toBe('Contour Background')
    expect(spacedName('Fader')).toBe('Fader')
    expect(spacedName('Type scale')).toBe('Type scale')
  })
})

describe('Kit_Gallery page', () => {
  it('renders a section with a heading for every kit component', async () => {
    renderKit('/kit')
    await findGallery()
    for (const meta of KIT_SECTIONS) {
      const section = document.getElementById(sectionDomId(meta.id))
      expect(section, meta.id).not.toBeNull()
      expect(section?.tagName).toBe('SECTION')
    }
    for (const name of KIT_COMPONENTS) {
      const meta = KIT_SECTIONS.find((s) => s.name === name)
      const section = document.getElementById(sectionDomId(meta?.id ?? ''))
      expect(section).toHaveAccessibleName(name)
      // Panel edge label shows the spaced name, e.g. "Empty State".
      expect(section?.querySelector('[data-edge="top"]')).toHaveTextContent(spacedName(name))
    }
  }, 20_000)

  it('scrolls the ?section= target into view on load and when the param changes', async () => {
    const router = renderKit('/kit?section=rack-row')
    await findGallery()
    await waitFor(() => {
      expect(scrolled.at(-1)).toBe(document.getElementById('kit-rack-row'))
    })

    await act(async () => {
      await router.navigate('/kit?section=EmptyState')
    })
    await waitFor(() => {
      expect(scrolled.at(-1)).toBe(document.getElementById('kit-empty-state'))
    })
  }, 20_000)

  it('does not scroll for a missing or unknown section', async () => {
    renderKit('/kit?section=does-not-exist')
    await findGallery()
    expect(scrolled.filter((el) => el.id.startsWith('kit-'))).toHaveLength(0)
  }, 20_000)
})
