import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  SourceGrid,
  nextEnabledIndex,
  tabStopIndex,
  type SourceItem,
} from '../../src/kit/SourceGrid'

type Scenario = 'normal' | 'bar' | 'fan' | 'clog' | 'over' | 'clear'

const icon = <svg aria-hidden="true" />
const ITEMS: readonly SourceItem<Scenario>[] = [
  { value: 'normal', label: 'NORMAL', icon },
  { value: 'bar', label: 'BAR ENTRY', icon },
  { value: 'fan', label: 'FAN FAIL', icon, disabled: true },
  { value: 'clog', label: 'CLOGGING', icon },
  { value: 'over', label: 'OVERLOAD', icon },
  { value: 'clear', label: 'CLEAR', icon },
]

function Harness({ initial = 'normal' as Scenario | null, onChange = vi.fn() }) {
  const [value, setValue] = useState<Scenario | null>(initial)
  return (
    <>
      <button type="button">before</button>
      <SourceGrid
        label="Drive scenario"
        items={ITEMS}
        value={value}
        onChange={(v) => {
          setValue(v)
          onChange(v)
        }}
      />
      <button type="button">after</button>
    </>
  )
}

describe('SourceGrid', () => {
  it('exposes a named radiogroup of radios with aria-checked', () => {
    render(<Harness />)
    expect(screen.getByRole('radiogroup', { name: 'Drive scenario' })).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(6)
    expect(screen.getByRole('radio', { name: 'NORMAL' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'BAR ENTRY' })).toHaveAttribute('aria-checked', 'false')
  })

  it('has one tab stop and Tab leaves the group', async () => {
    const user = userEvent.setup()
    render(<Harness initial="clog" />)
    await user.tab()
    await user.tab()
    expect(screen.getByRole('radio', { name: 'CLOGGING' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus()
  })

  it('moves focus and selection with arrow keys, skipping disabled and wrapping', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    screen.getByRole('radio', { name: 'NORMAL' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'BAR ENTRY' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'CLOGGING' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'CLOGGING' })).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{Home}{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'CLEAR' })).toHaveFocus()
    expect(onChange.mock.calls.map(([v]) => v as Scenario)).toEqual(['bar', 'clog', 'normal', 'clear'])
  })

  it('selects on click and ignores disabled options', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'FAN FAIL' }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('radio', { name: 'OVERLOAD' }))
    expect(onChange).toHaveBeenCalledWith('over')
  })

  it('disables every option when the group is disabled', () => {
    render(<SourceGrid label="g" items={ITEMS} value="normal" onChange={vi.fn()} disabled />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true')
  })

  it('never truncates or splits a tile label', () => {
    render(<Harness />)
    const label = screen.getByText('BAR ENTRY')
    expect(label.className).not.toMatch(/truncate|text-ellipsis|overflow-hidden|-me-/)
  })

  it('switches between 2 and 3 columns', () => {
    const { rerender } = render(<SourceGrid label="g" items={ITEMS} value={null} onChange={vi.fn()} />)
    expect(screen.getByRole('radiogroup')).toHaveClass('grid-cols-2')
    rerender(<SourceGrid label="g" items={ITEMS} value={null} onChange={vi.fn()} columns={3} />)
    expect(screen.getByRole('radiogroup')).toHaveClass('grid-cols-3')
  })
})

describe('roving helpers', () => {
  const enabled = [true, true, false, true]
  it('nextEnabledIndex wraps and skips disabled', () => {
    expect(nextEnabledIndex(enabled, 1, 1)).toBe(3)
    expect(nextEnabledIndex(enabled, 3, 1)).toBe(0)
    expect(nextEnabledIndex(enabled, 0, -1)).toBe(3)
    expect(nextEnabledIndex([false, true, false], 1, 1)).toBe(1)
  })
  it('tabStopIndex falls back to the first enabled item', () => {
    expect(tabStopIndex(enabled, 3)).toBe(3)
    expect(tabStopIndex(enabled, 2)).toBe(0)
    expect(tabStopIndex(enabled, -1)).toBe(0)
    expect(tabStopIndex([false, false], -1)).toBe(-1)
  })
})
