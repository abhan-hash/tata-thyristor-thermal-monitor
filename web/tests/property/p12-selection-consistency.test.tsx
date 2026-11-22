import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import fc from 'fast-check'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect } from 'vitest'
import {
  formatChannelParam,
  parseChannelParam,
  useChannelSelection,
  useSelectedChannel,
} from '../../src/data/selection'
import type { ChannelId } from '../../src/domain/types'
import { RackRow } from '../../src/kit/RackRow'
import { type BridgeDevice, BridgeSchematic } from '../../src/visuals/bridge/BridgeSchematic'
import { propertyTest } from './runner'

/**
 * Property 12: Selection consistency.
 * For any sequence of selection actions (bridge click, rack row click,
 * keyboard, URL edit, invalid `?ch=`), exactly one channel in 1..6 is
 * selected, and every view (bridge highlight, rack row, readout, charts)
 * reports the same channel as `useSelectedChannel()`.
 *
 * The harness is the same memory-router setup as `tests/unit/selection.test.tsx`
 * with the real BridgeSchematic and RackRow, plus independent readout and
 * chart probes that each call `useSelectedChannel()` themselves. Commands run
 * through `fc.commands` against a model holding the expected channel.
 *
 * **Validates: Requirements 17.5, 17.6, 23.1, 23.2, 23.3, 23.4**
 */

const IDS: readonly ChannelId[] = [1, 2, 3, 4, 5, 6]
const DEVICES: readonly BridgeDevice[] = IDS.map((id) => ({ id, tj_estimated: 90 + id, status: 'normal' }))

function Readout() {
  return <output data-testid="readout">{formatChannelParam(useSelectedChannel())}</output>
}

function ChartProbe() {
  const ch = useSelectedChannel()
  return <figure data-testid="chart" data-channel={ch} aria-label={`Junction temperature, ${formatChannelParam(ch)}`} />
}

function Harness() {
  const { selected, select } = useChannelSelection()
  return (
    <div>
      <div data-testid="bridge">
        <BridgeSchematic devices={DEVICES} selected={selected} onSelect={select} />
      </div>
      <div data-testid="rack">
        {IDS.map((id) => (
          <RackRow key={id} label={`ROW T${id}`} selected={selected === id} onSelect={() => select(id)} />
        ))}
      </div>
      <Readout />
      <ChartProbe />
    </div>
  )
}

type Router = ReturnType<typeof createMemoryRouter>
interface Model {
  ch: ChannelId
}
interface Real {
  router: Router
  user: UserEvent
}
type Cmd = fc.AsyncCommand<Model, Real>

const flush = () => act(async () => {})
const deviceButton = (id: ChannelId) => screen.getByRole('button', { name: new RegExp(`^T${String(id)},`) })

/** Checks every view against the model and against each other. */
function assertConsistent(model: Model, real: Real): void {
  const expected = formatChannelParam(model.ch)

  // URL: exactly one canonical ?ch= value.
  const params = new URLSearchParams(real.router.state.location.search)
  expect(params.getAll('ch')).toEqual([expected])

  // Bridge: exactly one pressed device, and its selection mark, both for the model channel.
  const bridge = screen.getByTestId('bridge')
  const devices = within(bridge).getAllByRole('button')
  expect(devices).toHaveLength(6)
  const pressed = devices.filter((d) => d.getAttribute('aria-pressed') === 'true')
  expect(pressed).toHaveLength(1)
  expect(pressed[0]?.getAttribute('data-channel')).toBe(String(model.ch))
  const marks = bridge.querySelectorAll('[data-part="selection"]')
  expect(marks).toHaveLength(1)
  expect(marks[0]?.textContent).toBe(`?CH=${String(model.ch)}`)

  // Rack rows: exactly one current row, the model channel.
  const rack = screen.getByTestId('rack')
  const current = within(rack)
    .getAllByRole('button')
    .filter((r) => r.hasAttribute('aria-current'))
  expect(current).toHaveLength(1)
  expect(current[0]).toHaveAccessibleName(`ROW ${expected}`)

  // Readout and chart probes (independent useSelectedChannel calls).
  expect(screen.getByTestId('readout').textContent).toBe(expected)
  expect(screen.getByTestId('chart').getAttribute('data-channel')).toBe(String(model.ch))
}

/** A selection write must be a replace navigation whenever the channel changed. */
function assertReplacedIfChanged(before: ChannelId, model: Model, real: Real): void {
  if (before !== model.ch) expect(real.router.state.historyAction).toBe('REPLACE')
}

class BridgeClick implements Cmd {
  readonly id: ChannelId
  constructor(id: ChannelId) {
    this.id = id
  }
  check = () => true
  async run(model: Model, real: Real) {
    const before = model.ch
    await real.user.click(deviceButton(this.id))
    await flush()
    model.ch = this.id
    assertReplacedIfChanged(before, model, real)
    assertConsistent(model, real)
  }
  toString = () => `BridgeClick(T${String(this.id)})`
}

class RackRowClick implements Cmd {
  readonly id: ChannelId
  constructor(id: ChannelId) {
    this.id = id
  }
  check = () => true
  async run(model: Model, real: Real) {
    const before = model.ch
    await real.user.click(within(screen.getByTestId('rack')).getByRole('button', { name: `ROW T${String(this.id)}` }))
    await flush()
    model.ch = this.id
    assertReplacedIfChanged(before, model, real)
    assertConsistent(model, real)
  }
  toString = () => `RackRowClick(T${String(this.id)})`
}

class KeyboardActivate implements Cmd {
  readonly id: ChannelId
  readonly key: 'Enter' | 'Space'
  constructor(id: ChannelId, key: 'Enter' | 'Space') {
    this.id = id
    this.key = key
  }
  check = () => true
  async run(model: Model, real: Real) {
    const before = model.ch
    act(() => {
      deviceButton(this.id).focus()
    })
    await real.user.keyboard(this.key === 'Enter' ? '{Enter}' : ' ')
    await flush()
    model.ch = this.id
    assertReplacedIfChanged(before, model, real)
    assertConsistent(model, real)
  }
  toString = () => `KeyboardActivate(T${String(this.id)}, ${this.key})`
}

/** Navigates to a new URL with a valid ?ch=, keeping an arbitrary extra param. */
class UrlEdit implements Cmd {
  readonly id: ChannelId
  readonly extra: string | null
  constructor(id: ChannelId, extra: string | null) {
    this.id = id
    this.extra = extra
  }
  check = () => true
  async run(model: Model, real: Real) {
    const params = new URLSearchParams()
    if (this.extra !== null) params.set('dev', this.extra)
    params.set('ch', formatChannelParam(this.id))
    await act(async () => {
      await real.router.navigate(`/drive?${params.toString()}`)
    })
    await flush()
    model.ch = this.id
    if (this.extra !== null) {
      expect(new URLSearchParams(real.router.state.location.search).get('dev')).toBe(this.extra)
    }
    assertConsistent(model, real)
  }
  toString = () => `UrlEdit(T${String(this.id)}, dev=${String(this.extra)})`
}

/** Navigates to a URL whose ?ch= is missing, repeated or invalid; expects T1 via replace. */
class InvalidCh implements Cmd {
  readonly search: string
  constructor(search: string) {
    this.search = search
  }
  check = () => true
  async run(model: Model, real: Real) {
    await act(async () => {
      await real.router.navigate(`/drive${this.search}`)
    })
    await flush()
    model.ch = 1
    expect(real.router.state.historyAction).toBe('REPLACE')
    assertConsistent(model, real)
  }
  toString = () => `InvalidCh(${JSON.stringify(this.search)})`
}

const idArb = fc.constantFrom(...IDS)
const extraArb = fc.option(fc.constantFrom('1', '0', 'x y', '&=?'), { nil: null })

/** Single ch values that parseChannelParam rejects, biased towards near-misses. */
const badValueArb = fc.oneof(
  fc.constantFrom('', 't3', 'T0', 'T7', '3', ' T3', 'T3 ', 'T3,T4', 'TT1', 'T-1', 'T1.0'),
  fc.string({ maxLength: 6 }).filter((s) => parseChannelParam(s) === undefined),
)

const invalidSearchArb = fc.oneof(
  fc.constant(''),
  fc.constant('?dev=1'),
  badValueArb.map((v) => `?${new URLSearchParams({ ch: v }).toString()}`),
  fc.tuple(idArb, idArb).map(([a, b]) => `?ch=T${String(a)}&ch=T${String(b)}`),
)

const commandsArb = fc.commands(
  [
    idArb.map((id) => new BridgeClick(id)),
    idArb.map((id) => new RackRowClick(id)),
    fc.tuple(idArb, fc.constantFrom('Enter' as const, 'Space' as const)).map(([id, k]) => new KeyboardActivate(id, k)),
    fc.tuple(idArb, extraArb).map(([id, extra]) => new UrlEdit(id, extra)),
    invalidSearchArb.map((s) => new InvalidCh(s)),
  ],
  { maxCommands: 12 },
)

/** Start URLs: valid, missing or invalid ?ch=. */
const startArb = fc.oneof(
  idArb.map((id) => ({ entry: `/drive?ch=T${String(id)}`, ch: id })),
  invalidSearchArb.map((s) => ({ entry: `/drive${s}`, ch: 1 as ChannelId })),
)

describe('selection', () => {
  propertyTest(
    12,
    'Selection consistency',
    fc.asyncProperty(startArb, commandsArb, async (start, cmds) => {
      const router = createMemoryRouter([{ path: '/drive', Component: Harness }], { initialEntries: [start.entry] })
      try {
        render(<RouterProvider router={router} />)
        await flush()
        const real: Real = { router, user: userEvent.setup({ delay: null }) }
        const model: Model = { ch: start.ch }
        assertConsistent(model, real)
        await fc.asyncModelRun(() => ({ model, real }), cmds)
      } finally {
        cleanup()
        router.dispose()
      }
    }),
    120_000,
  )
})
