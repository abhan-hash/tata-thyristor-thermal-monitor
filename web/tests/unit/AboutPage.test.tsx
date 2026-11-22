import { act, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TelemetryProvider } from '../../src/data/hooks'
import { MockTelemetrySource } from '../../src/data/mock/MockTelemetrySource'
import { TelemetryStore } from '../../src/data/store'
import { ABOUT_BANNER_ALT, AboutPage, VIRTUAL_SENSOR_STEPS } from '../../src/pages/About/AboutPage'

const quiet = { marginMismatch: () => undefined }
const EPOCH = Date.UTC(2026, 10, 21)

function mount() {
  const source = new MockTelemetrySource({ seed: 7, epochMs: EPOCH })
  const store = new TelemetryStore(source, { decodeLogger: quiet })
  const view = render(
    <TelemetryProvider store={store} autoStart={false}>
      <AboutPage />
    </TelemetryProvider>,
  )
  const feed = (n: number) => {
    act(() => {
      for (const f of source.runTicks(n)) store.ingest(f)
      store.emitDisplayTick()
    })
  }
  return { ...view, feed }
}

describe('AboutPage', () => {
  it('shows the banner copied into web/public with alt text (29.1)', () => {
    mount()
    const img = screen.getByRole('img', { name: ABOUT_BANNER_ALT })
    expect(img.getAttribute('src')).toMatch(/about_hero_banner\.webp$/)
  })

  it('lists the four virtual-sensor steps in order (29.3)', () => {
    mount()
    const list = screen.getByRole('heading', { name: 'How the virtual sensor works' }).closest('section')
    expect(list).not.toBeNull()
    const titles = within(list as HTMLElement)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(titles).toEqual(['Measure', 'Model', 'Estimate', 'Validate'])
    expect(VIRTUAL_SENSOR_STEPS.map((s) => s.inputs)).toEqual([
      'RTD · current',
      'Power loss',
      'Foster network',
      'Cooling residual',
    ])
  })

  it('waits for a frame, then renders the Foster ladder, mill cutaway and airflow diagram (29.2, 29.4)', () => {
    const { container, feed } = mount()
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(3)
    feed(10)
    expect(screen.queryByText('Waiting for the first frame…')).toBeNull()
    expect(within(screen.getByRole('region', { name: 'Foster network diagram' })).getByRole('img')).toBeInTheDocument()
    const figures = container.querySelectorAll('figure svg')
    expect(figures.length).toBeGreaterThanOrEqual(2)
  })
})
