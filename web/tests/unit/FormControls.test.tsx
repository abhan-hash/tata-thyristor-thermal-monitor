import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Fader, faderPosition, stepDecimals } from '../../src/kit/Fader'
import { Field } from '../../src/kit/Field'
import { FilterChip } from '../../src/kit/FilterChip'
import { HardwareToggle } from '../../src/kit/HardwareToggle'
import { NumberField } from '../../src/kit/NumberField'
import { Select } from '../../src/kit/Select'

describe('Fader', () => {
  it('is a native range input named by its label, with unit in aria-valuetext', () => {
    render(<Fader label="Warning" value={110} min={60} max={140} unit="°C" onChange={vi.fn()} />)
    const slider = screen.getByRole('slider', { name: 'Warning' })
    expect(slider).toHaveAttribute('type', 'range')
    expect(slider).toHaveAttribute('min', '60')
    expect(slider).toHaveAttribute('max', '140')
    expect(slider).toHaveValue('110')
    expect(slider).toHaveAttribute('aria-valuetext', '110 °C')
  })

  it('reports numeric values on change and formats the readout to the step', () => {
    const onChange = vi.fn()
    render(<Fader label="Hysteresis" value={2.5} min={0} max={10} step={0.5} onChange={onChange} />)
    expect(screen.getByText('2.5')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4' } })
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('takes focus from the keyboard and can be disabled', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Fader label="Airflow" value={50} min={0} max={100} onChange={vi.fn()} />)
    await user.tab()
    expect(screen.getByRole('slider')).toHaveFocus()
    rerender(<Fader label="Airflow" value={50} min={0} max={100} onChange={vi.fn()} disabled />)
    expect(screen.getByRole('slider')).toBeDisabled()
  })

  it('maps value to a clamped track position', () => {
    expect(faderPosition(50, 0, 100)).toBe(0.5)
    expect(faderPosition(-5, 0, 100)).toBe(0)
    expect(faderPosition(150, 0, 100)).toBe(1)
    expect(faderPosition(5, 5, 5)).toBe(0)
  })

  it('derives decimal places from the step', () => {
    expect(stepDecimals(1)).toBe(0)
    expect(stepDecimals(0.5)).toBe(1)
    expect(stepDecimals(0.25)).toBe(2)
    expect(stepDecimals(1e-7)).toBe(7)
  })
})

describe('HardwareToggle', () => {
  function Harness({ onChange = vi.fn() }) {
    const [on, setOn] = useState(false)
    return (
      <HardwareToggle
        label="Fan override"
        checked={on}
        onChange={(v) => {
          setOn(v)
          onChange(v)
        }}
      />
    )
  }

  it('is a switch named by its label, with visible ON/OFF text', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const toggle = screen.getByRole('switch', { name: 'Fan override' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(toggle).toHaveTextContent('OFF')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(toggle).toHaveTextContent('ON')
  })

  it('toggles with Space and Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.tab()
    await user.keyboard(' ')
    await user.keyboard('{Enter}')
    expect(onChange.mock.calls.map(([v]) => v as boolean)).toEqual([true, false])
  })

  it('ignores clicks when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<HardwareToggle label="x" checked={false} onChange={onChange} disabled />)
    await user.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('switch')).toBeDisabled()
  })
})

describe('Field, NumberField, Select', () => {
  it('Field links its error through aria-describedby and marks itself invalid', () => {
    render(<Field label="WS URL" hint="Backend phase" error="Enter a ws:// URL" defaultValue="" />)
    const input = screen.getByRole('textbox', { name: 'WS URL' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Backend phase Enter a ws:// URL')
  })

  it('Field without an error has no invalid state or description', () => {
    render(<Field label="Name" defaultValue="" />)
    const input = screen.getByRole('textbox', { name: 'Name' })
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('NumberField is a native number input that reads its unit and error', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <NumberField
        label="Critical"
        unit="°C"
        error="Critical must be above warning"
        defaultValue={100}
        onChange={onChange}
      />,
    )
    const input = screen.getByRole('spinbutton', { name: 'Critical' })
    expect(input).toHaveAttribute('type', 'number')
    expect(input).toHaveAccessibleDescription('°C Critical must be above warning')
    await user.type(input, '5')
    expect(onChange).toHaveBeenCalled()
  })

  it('Select wraps a native select and supports disabled', () => {
    render(
      <Select label="Scenario" defaultValue="b" error="Pick one" disabled>
        <option value="a">Normal</option>
        <option value="b">Bar entry</option>
      </Select>,
    )
    const select = screen.getByRole('combobox', { name: 'Scenario' })
    expect(select).toHaveValue('b')
    expect(select).toBeDisabled()
    expect(select).toHaveAccessibleDescription('Pick one')
  })
})

describe('FilterChip', () => {
  it('exposes aria-pressed, label and count, and toggles on click', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<FilterChip label="Critical" count={4} selected={false} onToggle={onToggle} />)
    const chip = screen.getByRole('button', { name: 'Critical 4' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    await user.click(chip)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('renders the full label (wrapping, never truncated) and honours disabled', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const label = 'All channels including thyristor bridge sensors'
    render(<FilterChip label={label} selected onToggle={onToggle} disabled />)
    const chip = screen.getByRole('button', { name: label })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(label).className).not.toMatch(/truncate|whitespace-nowrap|text-ellipsis/)
    await user.click(chip)
    expect(onToggle).not.toHaveBeenCalled()
  })
})
