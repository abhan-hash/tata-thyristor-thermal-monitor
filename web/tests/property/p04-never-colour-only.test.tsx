import { render } from '@testing-library/react'
import fc from 'fast-check'
import { motionValue } from 'motion/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect } from 'vitest'
import { TEMP_C_SPEC } from '../../src/domain/format'
import { DEFAULT_THRESHOLDS } from '../../src/domain/thresholds'
import type { ChannelId, Status } from '../../src/domain/types'
import { KpiTile } from '../../src/kit/KpiTile'
import { RackRow } from '../../src/kit/RackRow'
import { STATUS_LABEL, StatusChip } from '../../src/kit/StatusChip'
import { type BridgeDevice, BridgeSchematic } from '../../src/visuals/bridge/BridgeSchematic'
import { HeatDisc } from '../../src/visuals/heat/HeatDisc'
import { propertyTest } from './runner'

/**
 * Property 4: Never colour-only.
 * For every Status s and every rendered StatusChip, RackRow (or other
 * status-bearing surface) in state s, the accessible output contains a
 * non-empty text label for s and an icon with a distinct shape per status.
 *
 * Each surface is a `StatusCase`; the single property below covers every
 * case, including the bridge device (task 13.2) with arbitrary per-channel status.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 17.3, 21.1**
 */

const STATUSES: readonly Status[] = ['normal', 'warning', 'critical', 'fault']

interface StatusCase {
  name: string
  /** Element rendering the surface in `status`, with an arbitrary caller label. */
  element: (status: Status, label: string) => ReactElement
  /** The node whose accessible output must carry the status text. */
  root: (container: HTMLElement, label: string) => Element | null
  /** Shape identifier of the status icon drawn for the surface. */
  shape: (root: Element) => string | null
}

/**
 * Text a screen reader gets for `el`: its `aria-label` plus the text of
 * descendants that are not `aria-hidden`. Children of `role="img"` are
 * presentational, so an image contributes only its label.
 */
function accessibleText(el: Element): string {
  if (el.getAttribute('aria-hidden') === 'true') return ''
  const named = el.getAttribute('aria-label') ?? ''
  if (el.getAttribute('role') === 'img') return named
  let out = named
  for (const child of el.childNodes) {
    if (child.nodeType === child.TEXT_NODE) out += child.textContent ?? ''
    else if (child instanceof Element) out += ` ${accessibleText(child)} `
  }
  return out.replace(/\s+/g, ' ').trim()
}

const iconShape = (root: Element) => root.querySelector('[data-shape]')?.getAttribute('data-shape') ?? null

/** A Tj inside `status`'s band (Tj thresholds 110 / 125 °C), NaN for fault. */
function tjFor(status: Status): number {
  const { warning, critical } = DEFAULT_THRESHOLDS.junction_temp
  switch (status) {
    case 'normal':
      return warning - 20
    case 'warning':
      return (warning + critical) / 2
    case 'critical':
      return critical + 10
    case 'fault':
      return Number.NaN
  }
}

const CHANNELS: readonly ChannelId[] = [1, 2, 3, 4, 5, 6]

/** Small stable hash of the arbitrary label, used to vary the bridge layout per run. */
function seed(label: string): number {
  let h = 0
  for (const ch of label) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return h
}

/**
 * Bridge with an arbitrary Status per channel: the device under test (picked
 * from the label) is in `status`, the other five get statuses derived from the
 * label, so neighbouring devices cannot leak their status into the target.
 */
function bridgeTarget(label: string): ChannelId {
  return CHANNELS[seed(label) % CHANNELS.length] ?? 1
}

function bridgeDevices(status: Status, label: string): BridgeDevice[] {
  const target = bridgeTarget(label)
  let h = seed(label)
  return CHANNELS.map((id) => {
    h = (h * 1103515245 + 12345) >>> 0
    const s = id === target ? status : (STATUSES[h % STATUSES.length] ?? 'normal')
    return { id, tj_estimated: tjFor(s), status: s }
  })
}

const CASES: readonly StatusCase[] = [
  {
    name: 'StatusChip',
    element: (status) => <StatusChip status={status} />,
    root: (c) => c.querySelector('[data-status]'),
    shape: iconShape,
  },
  {
    name: 'RackRow (button)',
    element: (status, label) => <RackRow label={label} meta="98.4 °C" status={status} />,
    root: (c) => c.querySelector('button'),
    shape: iconShape,
  },
  {
    name: 'RackRow (link)',
    element: (status, label) => (
      <MemoryRouter>
        <RackRow as="link" to="/drive/1" label={label} status={status} />
      </MemoryRouter>
    ),
    root: (c) => c.querySelector('a'),
    shape: iconShape,
  },
  {
    name: 'KpiTile',
    element: (status, label) => (
      <KpiTile label={label} value={motionValue(84.2)} spec={TEMP_C_SPEC} status={status} />
    ),
    root: (c) => c.querySelector('[role="group"]'),
    shape: iconShape,
  },
  {
    name: 'HeatDisc',
    element: (status, label) => <HeatDisc tj={tjFor(status)} label={label} />,
    root: (c) => c.querySelector('svg[role="img"]'),
    // Normal keeps the reference's gold ring; other states swap in the status icon.
    shape: (root) => iconShape(root) ?? root.querySelector('[data-marker]')?.getAttribute('data-marker') ?? null,
  },
  {
    name: 'BridgeSchematic device',
    element: (status, label) => <BridgeSchematic devices={bridgeDevices(status, label)} />,
    // The device is a `g role="button"`; its accessible name carries id, Tj and status.
    root: (c, label) => c.querySelector(`[role="button"][data-channel="${bridgeTarget(label)}"]`),
    shape: iconShape,
  },
]

interface Observation {
  text: string
  shape: string | null
  dataStatus: string | null
}

function observe(c: StatusCase, status: Status, label: string): Observation {
  const { container, unmount } = render(c.element(status, label))
  try {
    const root = c.root(container, label)
    expect(root, `${c.name}: root element`).not.toBeNull()
    if (!root) throw new Error('unreachable')
    const statusNode = root.matches('[data-status]') ? root : root.querySelector('[data-status]')
    return {
      text: accessibleText(root),
      shape: c.shape(root),
      dataStatus: statusNode?.getAttribute('data-status') ?? null,
    }
  } finally {
    unmount()
  }
}

/** Labels as callers pass them: non-empty, may include spaces, signs and non-ASCII. */
const labelArb = fc.string({ minLength: 1, maxLength: 24 }).filter((s) => s.trim().length > 0)

const twoStatusesArb = fc
  .tuple(fc.constantFrom(...STATUSES), fc.constantFrom(...STATUSES))
  .filter(([a, b]) => a !== b)

describe('Property 4', () => {
  propertyTest(
    4,
    'Never colour-only',
    fc.property(fc.constantFrom(...CASES), twoStatusesArb, labelArb, (c, [s1, s2], label) => {
      const a = observe(c, s1, label)
      const b = observe(c, s2, label)
      for (const [status, o] of [
        [s1, a],
        [s2, b],
      ] as const) {
        // Status is in the DOM state and in the accessible text, as a non-empty label.
        expect(o.dataStatus, `${c.name} data-status`).toBe(status)
        expect(STATUS_LABEL[status].trim().length).toBeGreaterThan(0)
        expect(o.text, `${c.name} accessible text`).toContain(STATUS_LABEL[status])
        // An icon with a shape identifier is drawn.
        expect(o.shape, `${c.name} icon shape`).toBeTruthy()
      }
      // Different statuses never share a shape, so the icon alone tells them apart.
      expect(a.shape, `${c.name}: ${s1} vs ${s2} shape`).not.toBe(b.shape)
    }),
    30_000,
  )
})
