import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import {
  formatChannelParam,
  parseChannelParam,
  resolveChannel,
  useChannelSelection,
  useSelectedChannel,
  withChannel,
} from '../../src/data/selection'
import type { ChannelId } from '../../src/domain/types'
import { RackRow } from '../../src/kit/RackRow'
import { BridgeSchematic, type BridgeDevice } from '../../src/visuals/bridge/BridgeSchematic'

const IDS: readonly ChannelId[] = [1, 2, 3, 4, 5, 6]
const DEVICES: readonly BridgeDevice[] = IDS.map((id) => ({ id, tj_estimated: 90 + id, status: 'normal' }))

function Harness() {
  const { selected, select } = useChannelSelection()
  return (
    <div>
      <BridgeSchematic devices={DEVICES} selected={selected} onSelect={select} />
      {IDS.map((id) => (
        <RackRow key={id} label={`ROW T${id}`} selected={selected === id} onSelect={() => select(id)} />
      ))}
      <output data-testid="readout">{formatChannelParam(selected)}</output>
    </div>
  )
}

function ReadOnly() {
  return <output data-testid="readout">{formatChannelParam(useSelectedChannel())}</output>
}

function setup(entry: string) {
  const router = createMemoryRouter(
    [
      { path: '/drive', Component: Harness },
      { path: '/alarms', Component: ReadOnly },
    ],
    { initialEntries: [entry] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const readout = () => screen.getByTestId('readout').textContent

describe('selection param helpers', () => {
  it('parses only exact T1..T6 tokens', () => {
    expect(parseChannelParam('T1')).toBe(1)
    expect(parseChannelParam('T6')).toBe(6)
    for (const bad of ['t3', 'T0', 'T7', '3', ' T3', 'T3,T4', '', null, undefined]) {
      expect(parseChannelParam(bad)).toBeUndefined()
    }
  })

  it('treats a repeated ch param as invalid', () => {
    expect(resolveChannel(new URLSearchParams('ch=T2&ch=T3'))).toEqual({ channel: 1, canonical: false })
    expect(resolveChannel(new URLSearchParams('ch=T4'))).toEqual({ channel: 4, canonical: true })
  })

  it('sets ch while keeping other params', () => {
    expect(withChannel('?dev=1&ch=T2&mock=fan', 5)).toBe('?dev=1&ch=T5&mock=fan')
    expect(withChannel('', 3)).toBe('?ch=T3')
  })
})

describe('useChannelSelection', () => {
  it('reads ?ch= into every view', () => {
    setup('/drive?ch=T4')
    expect(readout()).toBe('T4')
    expect(screen.getByRole('button', { name: /^T4,/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'ROW T4' })).toHaveAttribute('aria-current')
  })

  it.each(['/drive', '/drive?ch=T9', '/drive?ch=t2&dev=1'])('normalises %s to T1 with replace', async (entry) => {
    const router = setup(entry)
    expect(readout()).toBe('T1')
    await act(async () => {})
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('ch')).toBe('T1')
    expect(router.state.historyAction).toBe('REPLACE')
    if (entry.includes('dev=1')) expect(params.get('dev')).toBe('1')
  })

  it('bridge click, keyboard and rack row write ?ch= with replace, preserving params', async () => {
    const user = userEvent.setup()
    const router = setup('/drive?ch=T1&dev=1')
    await user.click(screen.getByRole('button', { name: /^T3,/ }))
    expect(router.state.location.search).toBe('?ch=T3&dev=1')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(readout()).toBe('T3')

    screen.getByRole('button', { name: /^T5,/ }).focus()
    await user.keyboard('{Enter}')
    expect(readout()).toBe('T5')

    await user.click(screen.getByRole('button', { name: 'ROW T2' }))
    expect(router.state.location.search).toBe('?ch=T2&dev=1')
    expect(readout()).toBe('T2')
    expect(screen.getByRole('button', { name: /^T2,/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('leaves the Alarms ?ch= filter list untouched', async () => {
    const router = setup('/alarms?ch=T1,T4,drive&sev=critical')
    await act(async () => {})
    expect(router.state.location.search).toBe('?ch=T1,T4,drive&sev=critical')
    expect(router.state.historyAction).toBe('POP')
    expect(readout()).toBe('T1')
  })
})
