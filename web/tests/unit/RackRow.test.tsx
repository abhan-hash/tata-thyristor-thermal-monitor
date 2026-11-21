import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RackRow, rackRowState } from '../../src/kit/RackRow'

describe('RackRow', () => {
  it('renders a native button whose name includes label, value and status text', () => {
    const { container } = render(<RackRow label="THY A+" meta="98.4 °C" status="warning" />)
    const row = screen.getByRole('button')
    expect(row.tagName).toBe('BUTTON')
    expect(row).toHaveAccessibleName(/THY A\+.*98\.4 °C.*WARNING/)
    expect(container.querySelector('[data-shape="triangle"]')).not.toBeNull()
  })

  it('calls onSelect on click, Enter and Space', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<RackRow label="THY B-" onSelect={onSelect} />)
    await user.click(screen.getByRole('button'))
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onSelect).toHaveBeenCalledTimes(3)
  })

  it('marks the selected row with aria-current and the selected state', () => {
    render(<RackRow label="THY A-" selected />)
    const row = screen.getByRole('button')
    expect(row).toHaveAttribute('aria-current', 'true')
    expect(row).toHaveAttribute('data-state', 'selected')
  })

  it('is disabled natively and does not fire onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<RackRow label="THY C+" disabled onSelect={onSelect} />)
    const row = screen.getByRole('button')
    expect(row).toBeDisabled()
    await user.click(row)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('renders as a router link with as="link"', () => {
    render(
      <MemoryRouter>
        <RackRow as="link" to="/drive/stand-04" label="STAND-04" status="normal" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/drive/stand-04')
  })

  it('drops the href of a disabled link', () => {
    render(
      <MemoryRouter>
        <RackRow as="link" to="/drive/stand-04" label="STAND-04" disabled />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link')
    expect(link).not.toHaveAttribute('href')
    expect(link).toHaveAttribute('aria-disabled', 'true')
  })

  it('never truncates the label: no ellipsis or clipping classes', () => {
    render(<RackRow label="GUITAR & KEYS FEEDBACK CHANNEL" />)
    const label = screen.getByText('GUITAR & KEYS FEEDBACK CHANNEL').parentElement
    expect(label?.className).not.toMatch(/truncate|text-ellipsis|whitespace-nowrap|overflow-hidden/)
    expect(label?.className).toContain('var(--rack-row-label-size)')
  })

  it('gives disabled precedence over selected', () => {
    expect(rackRowState(true, true)).toBe('disabled')
    expect(rackRowState(true, false)).toBe('selected')
    expect(rackRowState(false, false)).toBe('idle')
  })
})
