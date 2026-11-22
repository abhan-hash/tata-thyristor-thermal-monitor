import { useState } from 'react'
import { Fader } from '../../../kit/Fader'
import { Field } from '../../../kit/Field'
import { HardwareToggle } from '../../../kit/HardwareToggle'
import { NumberField } from '../../../kit/NumberField'
import { Select } from '../../../kit/Select'
import { Specimen, SpecimenGrid, type ForcedState } from '../gallery'

interface ControlState {
  label: string
  force?: ForcedState
  disabled?: boolean
}

const STATES: readonly ControlState[] = [
  { label: 'Default' },
  { label: 'Hover', force: 'hover' },
  { label: 'Pressed', force: 'active' },
  { label: 'Focus', force: 'focus' },
  { label: 'Disabled', disabled: true },
]

function forceProp(s: { force?: ForcedState }) {
  return s.force ? { force: s.force } : {}
}

function FaderSample({ initial, disabled }: { initial: number; disabled: boolean }) {
  const [v, setV] = useState(initial)
  return <Fader label="Trip limit" value={v} min={100} max={140} step={0.5} unit="°C" onChange={setV} disabled={disabled} className="w-full" />
}

export function FaderSpecimen() {
  return (
    <SpecimenGrid min="15rem">
      {STATES.map((s, i) => (
        <Specimen key={s.label} label={s.label} align="stretch" {...forceProp(s)}>
          <FaderSample initial={110 + i * 4.5} disabled={s.disabled ?? false} />
        </Specimen>
      ))}
      <Specimen label="At minimum" align="stretch">
        <FaderSample initial={100} disabled={false} />
      </Specimen>
    </SpecimenGrid>
  )
}

function ToggleSample({ initial, disabled, label }: { initial: boolean; disabled: boolean; label: string }) {
  const [on, setOn] = useState(initial)
  return <HardwareToggle label={label} checked={on} onChange={setOn} disabled={disabled} />
}

export function HardwareToggleSpecimen() {
  const rows: readonly (ControlState & { on: boolean })[] = [
    { label: 'Off', on: false },
    { label: 'On', on: true },
    { label: 'Hover · off', on: false, force: 'hover' },
    { label: 'Pressed · on', on: true, force: 'active' },
    { label: 'Focus · off', on: false, force: 'focus' },
    { label: 'Disabled · off', on: false, disabled: true },
    { label: 'Disabled · on', on: true, disabled: true },
  ]
  return (
    <SpecimenGrid min="13rem">
      {rows.map((s) => (
        <Specimen key={s.label} label={s.label} {...forceProp(s)}>
          <ToggleSample label="Fan" initial={s.on} disabled={s.disabled ?? false} />
        </Specimen>
      ))}
    </SpecimenGrid>
  )
}

const FIELD_STATES: readonly (ControlState & { value?: string; error?: string })[] = [
  { label: 'Empty · placeholder' },
  { label: 'Filled', value: 'Stand 04 · north bay' },
  { label: 'Hover', value: 'Stand 04 · north bay', force: 'hover' },
  { label: 'Focus', value: 'Stand 04 · north bay', force: 'focus' },
  { label: 'Error', value: 'S', error: 'Use at least 3 characters.' },
  { label: 'Disabled', value: 'Stand 04 · north bay', disabled: true },
]

export function FieldSpecimen() {
  return (
    <SpecimenGrid min="15rem">
      {FIELD_STATES.map((s) => (
        <Specimen key={s.label} label={s.label} align="stretch" {...forceProp(s)}>
          <Field
            label="Drive name"
            placeholder="e.g. Stand 04"
            defaultValue={s.value}
            hint={s.error ? undefined : 'Shown in the nav and reports.'}
            error={s.error}
            disabled={s.disabled ?? false}
          />
        </Specimen>
      ))}
      <Specimen label="With suffix" align="stretch">
        <Field label="Operator" defaultValue="R. Sharma" suffix="SHIFT B" />
      </Specimen>
    </SpecimenGrid>
  )
}

const NUMBER_STATES: readonly (ControlState & { value: string; error?: string })[] = [
  { label: 'Default', value: '110.0' },
  { label: 'Hover', value: '110.0', force: 'hover' },
  { label: 'Focus', value: '110.0', force: 'focus' },
  { label: 'Error', value: '131.0', error: 'Warning must be below the 125.0 °C trip.' },
  { label: 'Disabled', value: '110.0', disabled: true },
  { label: 'Empty', value: '' },
]

export function NumberFieldSpecimen() {
  return (
    <SpecimenGrid min="15rem">
      {NUMBER_STATES.map((s) => (
        <Specimen key={s.label} label={s.label} align="stretch" {...forceProp(s)}>
          <NumberField
            label="Tj warning"
            unit="°C"
            step={0.5}
            defaultValue={s.value}
            placeholder="110.0"
            error={s.error}
            disabled={s.disabled ?? false}
          />
        </Specimen>
      ))}
    </SpecimenGrid>
  )
}

const SELECT_STATES: readonly (ControlState & { error?: string })[] = [
  { label: 'Default' },
  { label: 'Hover', force: 'hover' },
  { label: 'Focus', force: 'focus' },
  { label: 'Error', error: 'Pick a window for the trend.' },
  { label: 'Disabled', disabled: true },
]

export function SelectSpecimen() {
  return (
    <SpecimenGrid min="15rem">
      {SELECT_STATES.map((s) => (
        <Specimen key={s.label} label={s.label} align="stretch" {...forceProp(s)}>
          <Select label="Trend window" defaultValue={s.error ? '' : '60'} error={s.error} disabled={s.disabled ?? false}>
            <option value="" disabled>
              Choose…
            </option>
            <option value="60">Last 60 s</option>
            <option value="300">Last 5 min</option>
            <option value="3600">Last hour</option>
          </Select>
        </Specimen>
      ))}
    </SpecimenGrid>
  )
}
