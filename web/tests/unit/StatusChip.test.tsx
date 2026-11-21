import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Status } from '../../src/domain/types'
import { STATUS_LABEL, StatusChip } from '../../src/kit/StatusChip'
import { STATUS_ICON_SHAPE, StatusIcon } from '../../src/kit/icons/StatusIcon'

const STATUSES: readonly Status[] = ['normal', 'warning', 'critical', 'fault']

const EXPECTED: Record<Status, { text: string; shape: string }> = {
  normal: { text: 'NORMAL', shape: 'check-circle' },
  warning: { text: 'WARNING', shape: 'triangle' },
  critical: { text: 'CRITICAL', shape: 'octagon' },
  fault: { text: 'SENSOR FAULT', shape: 'slashed-sensor' },
}

describe('StatusChip', () => {
  it.each(STATUSES)('renders text and the %s icon shape', (status) => {
    const { container } = render(<StatusChip status={status} />)
    expect(screen.getByText(EXPECTED[status].text)).toBeVisible()
    const icon = container.querySelector('svg')
    expect(icon).toHaveAttribute('data-shape', EXPECTED[status].shape)
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('uses a distinct label and icon shape per status', () => {
    expect(new Set(Object.values(STATUS_LABEL)).size).toBe(STATUSES.length)
    expect(new Set(Object.values(STATUS_ICON_SHAPE)).size).toBe(STATUSES.length)
  })

  it('exposes the status text as the accessible content', () => {
    const { container } = render(<StatusChip status="critical" />)
    expect(container.firstElementChild).toHaveTextContent(/^CRITICAL$/)
  })

  it('puts the fault chip on the hatch background token', () => {
    const { container } = render(<StatusChip status="fault" />)
    expect(container.firstElementChild?.className).toContain('var(--status-chip-fault-bg)')
  })

  it('scales the icon with the size prop', () => {
    const { container: sm } = render(<StatusChip status="normal" size="sm" />)
    const { container: md } = render(<StatusChip status="normal" size="md" />)
    expect(sm.querySelector('svg')).toHaveAttribute('width', '12')
    expect(md.querySelector('svg')).toHaveAttribute('width', '14')
  })

  it('appends a caller className', () => {
    const { container } = render(<StatusChip status="warning" className="ms-auto" />)
    expect(container.firstElementChild).toHaveClass('ms-auto')
  })
})

describe('StatusIcon', () => {
  it('defaults to 14 px and is not focusable', () => {
    const { container } = render(<StatusIcon status="warning" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '14')
    expect(svg).toHaveAttribute('focusable', 'false')
  })
})
