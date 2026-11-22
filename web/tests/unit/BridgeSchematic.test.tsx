import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { heatStopIndex, heatToken } from '../../src/domain/heatScale'
import type { ChannelId } from '../../src/domain/types'
import {
  BridgeSchematic,
  deviceLabel,
  deviceTreatment,
  type BridgeDevice,
} from '../../src/visuals/bridge/BridgeSchematic'

const DEVICES: readonly BridgeDevice[] = [
  { id: 1, tj_estimated: 96.2, status: 'normal' },
  { id: 2, tj_estimated: 92.4, status: 'normal' },
  { id: 3, tj_estimated: 112.6, status: 'warning' },
  { id: 4, tj_estimated: 101.0, status: 'normal' },
  { id: 5, tj_estimated: 127.9, status: 'critical' },
  { id: 6, tj_estimated: Number.NaN, status: 'fault' },
]

const device = (id: ChannelId) => {
  const el = document.querySelector(`[role="button"][data-channel="${id}"]`)
  if (!el) throw new Error(`no device ${id}`)
  return el
}
const bodyFill = (id: ChannelId) =>
  (device(id).querySelector('[data-part="body"]') as SVGElement | null)?.style.fill

describe('BridgeSchematic', () => {
  it('exposes T1–T6 as buttons named with id, Tj and status', () => {
    render(<BridgeSchematic devices={DEVICES} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'T3, 112.6 °C, WARNING' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('button', { name: 'T5, 127.9 °C, CRITICAL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'T6, SENSOR FAULT' })).toBeInTheDocument()
  })

  it('fills each device with the heat stop of its Tj', () => {
    render(<BridgeSchematic devices={DEVICES} />)
    for (const d of DEVICES.filter((x) => x.status !== 'fault')) {
      expect(bodyFill(d.id)).toBe(heatToken(heatStopIndex(d.tj_estimated)))
    }
  })

  it('gives heat stop 7 and 8 devices a --heat-5 halo and rim, cooler devices neither', () => {
    const devices: BridgeDevice[] = [
      { id: 1, tj_estimated: 119, status: 'warning' }, // stop 7
      { id: 2, tj_estimated: 130, status: 'critical' }, // stop 8
      { id: 3, tj_estimated: 112, status: 'warning' }, // stop 6
    ]
    render(<BridgeSchematic devices={devices} />)
    for (const id of [1, 2] as const) {
      const halo = device(id).querySelector<SVGElement>('[data-part="halo"]')
      const rim = device(id).querySelector<SVGElement>('[data-part="rim"]')
      expect(halo?.style.fill).toBe('var(--heat-5)')
      expect(rim?.style.stroke).toBe('var(--heat-5)')
      expect(rim?.style.strokeWidth).toBe('1')
    }
    expect(device(3).querySelector('[data-part="halo"]')).toBeNull()
    expect(device(3).querySelector('[data-part="rim"]')).toBeNull()
  })

  it('shows fault as hatch with "— —" and no unit, never a heat colour', () => {
    render(<BridgeSchematic devices={DEVICES} />)
    expect(bodyFill(6)).toMatch(/^url\("?#.*fault-hatch"?\)$/)
    const badge = device(6).querySelector('[data-part="badge"]')
    expect(badge?.textContent).toContain('— —')
    expect(badge?.textContent).not.toContain('°C')
    expect(badge?.textContent).toContain('SENSOR FAULT')
    expect(device(6).querySelector('[data-shape="slashed-sensor"]')).not.toBeNull()
  })

  it('pairs every device with a status icon shape and word', () => {
    render(<BridgeSchematic devices={DEVICES} />)
    expect(device(1).querySelector('[data-shape="check-circle"]')).not.toBeNull()
    expect(device(3).querySelector('[data-shape="triangle"]')).not.toBeNull()
    expect(device(5).querySelector('[data-shape="octagon"]')).not.toBeNull()
    expect(device(5).textContent).toContain('CRITICAL')
  })

  it('calls onSelect on click, Enter and Space', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<BridgeSchematic devices={DEVICES} onSelect={onSelect} />)
    await user.click(device(4))
    fireEvent.keyDown(device(2), { key: 'Enter' })
    fireEvent.keyDown(device(5), { key: ' ' })
    fireEvent.keyDown(device(1), { key: 'a' })
    expect(onSelect.mock.calls).toEqual([[4], [2], [5]])
  })

  it('activates the focused device with real Enter and Space key presses', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<BridgeSchematic devices={DEVICES} onSelect={onSelect} />)
    await user.tab() // T1
    await user.keyboard('{Enter}')
    await user.tab() // T2
    await user.keyboard(' ')
    expect(onSelect.mock.calls).toEqual([[1], [2]])
  })

  it('prevents the default action on Space so the page does not scroll', () => {
    render(<BridgeSchematic devices={DEVICES} onSelect={vi.fn()} />)
    const notCancelled = fireEvent.keyDown(device(3), { key: ' ' })
    expect(notCancelled).toBe(false)
  })

  it('re-fills a device when its Tj crosses into another heat stop, tweening through heat-scale mixes', async () => {
    const cool: BridgeDevice[] = [{ id: 2, tj_estimated: 60, status: 'normal' }]
    const hot: BridgeDevice[] = [{ id: 2, tj_estimated: 125, status: 'critical' }]
    const { rerender } = render(<BridgeSchematic devices={cool} />)
    expect(bodyFill(2)).toBe(heatToken(heatStopIndex(60)))
    rerender(<BridgeSchematic devices={hot} />)
    expect(heatStopIndex(125)).not.toBe(heatStopIndex(60))
    // Settles on the new stop's token once the 300 ms fill tween ends.
    await waitFor(() => {
      expect(bodyFill(2)).toBe(heatToken(heatStopIndex(125)))
    })
  })

  it('is reachable with Tab in T1…T6 order', async () => {
    const user = userEvent.setup()
    render(<BridgeSchematic devices={DEVICES} />)
    const order: string[] = []
    for (let i = 0; i < 6; i++) {
      await user.tab()
      order.push(document.activeElement?.getAttribute('data-channel') ?? '')
    }
    expect(order).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('highlights only the selected device', () => {
    const { container } = render(<BridgeSchematic devices={DEVICES} selected={3} />)
    expect(device(3)).toHaveAttribute('aria-pressed', 'true')
    expect(device(1)).toHaveAttribute('aria-pressed', 'false')
    const marks = container.querySelectorAll('[data-part="selection"]')
    expect(marks).toHaveLength(1)
    expect(marks[0]?.textContent).toBe('?CH=3')
  })

  it('shows no highlight when nothing is selected, and moves it when selection changes', () => {
    const { container, rerender } = render(<BridgeSchematic devices={DEVICES} />)
    expect(container.querySelector('[data-part="selection"]')).toBeNull()
    expect(container.querySelector('[aria-pressed="true"]')).toBeNull()
    rerender(<BridgeSchematic devices={DEVICES} selected={5} />)
    expect(device(5)).toHaveAttribute('aria-pressed', 'true')
    expect(device(3)).toHaveAttribute('aria-pressed', 'false')
    expect(container.querySelector('[data-part="selection"]')?.textContent).toBe('?CH=5')
  })

  it('renders missing channels as sensor faults', () => {
    render(<BridgeSchematic devices={[{ id: 2, tj_estimated: 80, status: 'normal' }]} />)
    expect(screen.getAllByRole('button')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'T1, SENSOR FAULT' })).toBeInTheDocument()
  })

  it('thumbnail variant keeps heat fills but has no focus stops or badges', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <BridgeSchematic devices={DEVICES} variant="thumbnail" selected={3} onSelect={onSelect} />,
    )
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(container.querySelector('[tabindex]')).toBeNull()
    expect(container.querySelector('[data-part="badge"]')).toBeNull()
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toContain('T5 CRITICAL')
    expect(container.querySelectorAll('[data-part="device"]')).toHaveLength(6)
    // Non-normal devices keep their status shape at thumbnail scale.
    expect(container.querySelector('[data-shape="octagon"]')).not.toBeNull()
  })
})

describe('bridge helpers', () => {
  it('deviceTreatment never gives a heat colour to faults or non-finite Tj', () => {
    expect(deviceTreatment(Number.NaN, 'normal')).toEqual({ kind: 'fault' })
    expect(deviceTreatment(Number.POSITIVE_INFINITY, 'critical')).toEqual({ kind: 'fault' })
    expect(deviceTreatment(90, 'fault')).toEqual({ kind: 'fault' })
    expect(deviceTreatment(90, 'normal')).toMatchObject({ kind: 'heat', glow: 'normal' })
    expect(deviceTreatment(119, 'warning')).toMatchObject({ kind: 'heat', stop: 7, glow: 'halo' })
  })

  it('deviceLabel uses the formatter precision', () => {
    expect(deviceLabel(3, 98.44, 'warning')).toBe('T3, 98.4 °C, WARNING')
    expect(deviceLabel(6, 98.4, 'fault')).toBe('T6, SENSOR FAULT')
  })
})
