import { useState, type ReactNode } from 'react'
import { FilterChip } from '../../../kit/FilterChip'
import { RackRow } from '../../../kit/RackRow'
import { SourceButton } from '../../../kit/SourceButton'
import { SourceGrid, type SourceItem } from '../../../kit/SourceGrid'
import { cx } from '../../../kit/controlStyles'
import { CAPS, GroupLabel, Groups, Specimen, SpecimenGrid, type ForcedState } from '../gallery'

/* ---------- RackRow ---------- */

interface RowState {
  label: string
  force?: ForcedState
  selected?: boolean
  disabled?: boolean
}

const ROW_STATES: readonly RowState[] = [
  { label: 'Default' },
  { label: 'Hover', force: 'hover' },
  { label: 'Pressed', force: 'active' },
  { label: 'Focus', force: 'focus' },
  { label: 'Selected', selected: true },
  { label: 'Disabled', disabled: true },
]

/** A full-width row specimen: state caption on the left, the row on the right. */
function RowSpecimen({ caption, force, children }: { caption: string; force?: ForcedState | undefined; children: ReactNode }) {
  return (
    <div className="grid items-center gap-x-6 gap-y-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <span className={cx(CAPS, 'flex items-center gap-2 text-[10px] [color:var(--kit-caption-color)]')}>
        <span aria-hidden="true" className="size-1 shrink-0 rounded-pill [background-color:var(--kit-caption-mark)]" />
        {caption}
      </span>
      <div {...(force ? { 'data-force-state': force } : {})} className="min-w-0 rounded-1 border [border-color:var(--kit-stage-border)]">
        {children}
      </div>
    </div>
  )
}

export function RackRowSpecimen() {
  const [selected, setSelected] = useState('T3')
  const channels = [
    { id: 'T1', label: 'THY A+', tj: '098.4 °C', status: 'normal' },
    { id: 'T2', label: 'THY B−', tj: '101.7 °C', status: 'normal' },
    { id: 'T3', label: 'THY C+', tj: '112.4 °C', status: 'warning' },
    { id: 'T4', label: 'THY A−', tj: '— — °C', status: 'fault' },
  ] as const
  return (
    <Groups>
      <div className="flex flex-col gap-4">
        <GroupLabel>States</GroupLabel>
        <div className="flex flex-col gap-3">
          {ROW_STATES.map((s) => (
            <RowSpecimen key={s.label} caption={s.label} force={s.force}>
              <RackRow
                label="T1 · THY A+"
                meta="098.4 °C"
                status="normal"
                selected={s.selected ?? false}
                disabled={s.disabled ?? false}
              />
            </RowSpecimen>
          ))}
          <RowSpecimen caption="Long label · wraps">
            <RackRow label="T2 · Thyristor B− bridge leg, north cabinet" meta="104.2 °C" status="warning" />
          </RowSpecimen>
          <RowSpecimen caption="Label only">
            <RackRow label="T5 · THY B+" />
          </RowSpecimen>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <GroupLabel>Interactive list · each status</GroupLabel>
        <div className="flex flex-col overflow-hidden rounded-1 border [border-color:var(--kit-stage-border)]">
          {channels.map((c) => (
            <RackRow
              key={c.id}
              label={`${c.id} · ${c.label}`}
              meta={c.tj}
              status={c.status}
              selected={selected === c.id}
              onSelect={() => {
                setSelected(c.id)
              }}
            />
          ))}
          <RackRow as="link" to="/kit?section=rack-row" label="T6 · as link" meta="131.5 °C" status="critical" />
        </div>
      </div>
    </Groups>
  )
}

/* ---------- Scenario icons (decorative, currentColor) ---------- */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

const ICONS = {
  normal: (
    <Icon>
      <path d="M3 12h3l2-5 4 10 2-5h7" />
    </Icon>
  ),
  bar_entry: (
    <Icon>
      <rect x="3" y="9" width="10" height="6" rx="1" />
      <path d="M15 12h6M18 9l3 3-3 3" />
    </Icon>
  ),
  fan_failure: (
    <Icon>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 10c0-4 1-6 3-6s2 3-1 6M14 12c4 0 6 1 6 3s-3 2-6-1M12 14c0 4-1 6-3 6s-2-3 1-6M10 12c-4 0-6-1-6-3s3-2 6 1" />
      <path d="M4 20 20 4" />
    </Icon>
  ),
  clogging: (
    <Icon>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <path d="M8 5v4M13 10v4M17 15v4" strokeWidth={2.5} />
    </Icon>
  ),
  overload: (
    <Icon>
      <path d="M13 3 6 13h5l-1 8 7-10h-5z" />
    </Icon>
  ),
  clear: (
    <Icon>
      <path d="M5 12.5 10 17l9-10" />
    </Icon>
  ),
} as const

type Scenario = keyof typeof ICONS

const SCENARIOS: readonly SourceItem<Scenario>[] = [
  { value: 'normal', label: 'Normal', icon: ICONS.normal },
  { value: 'bar_entry', label: 'Bar entry', icon: ICONS.bar_entry },
  { value: 'fan_failure', label: 'Fan failure', icon: ICONS.fan_failure },
  { value: 'clogging', label: 'Clogging', icon: ICONS.clogging },
  { value: 'overload', label: 'Overload', icon: ICONS.overload },
  { value: 'clear', label: 'Clear', icon: ICONS.clear },
]

/* ---------- SourceButton ---------- */

const BUTTON_STATES: readonly { label: string; force?: ForcedState; checked?: boolean; disabled?: boolean }[] = [
  { label: 'Default' },
  { label: 'Hover', force: 'hover' },
  { label: 'Pressed', force: 'active' },
  { label: 'Focus', force: 'focus' },
  { label: 'Checked', checked: true },
  { label: 'Checked · focus', checked: true, force: 'focus' },
  { label: 'Disabled', disabled: true },
  { label: 'Checked · disabled', checked: true, disabled: true },
]

export function SourceButtonSpecimen() {
  return (
    <SpecimenGrid min="8.5rem">
      {BUTTON_STATES.map((s) => (
        <Specimen key={s.label} label={s.label} {...(s.force ? { force: s.force } : {})}>
          {/* A lone radio needs a group for valid ARIA. */}
          <div role="radiogroup" aria-label={`Source button, ${s.label}`} className="w-28">
            <SourceButton
              label="Bar entry"
              icon={ICONS.bar_entry}
              checked={s.checked ?? false}
              disabled={s.disabled ?? false}
              tabIndex={0}
            />
          </div>
        </Specimen>
      ))}
    </SpecimenGrid>
  )
}

/* ---------- SourceGrid ---------- */

export function SourceGridSpecimen() {
  const [a, setA] = useState<Scenario>('normal')
  const [b, setB] = useState<Scenario>('fan_failure')
  const [c, setC] = useState<Scenario | null>(null)
  const withDisabled = SCENARIOS.map((s) => (s.value === 'overload' ? { ...s, disabled: true } : s))
  return (
    <SpecimenGrid min="15rem">
      <Specimen label="2 × 3 · interactive" stageClassName="py-6">
        <SourceGrid label="Drive scenario, 2 columns" items={SCENARIOS} value={a} onChange={setA} className="w-full max-w-64" />
      </Specimen>
      <Specimen label="3 × 2 · one option disabled" stageClassName="py-6">
        <SourceGrid label="Drive scenario, 3 columns" items={withDisabled} value={b} onChange={setB} columns={3} className="w-full max-w-80" />
      </Specimen>
      <Specimen label="Nothing checked yet" stageClassName="py-6">
        <SourceGrid label="Drive scenario, unset" items={SCENARIOS} value={c} onChange={setC} columns={3} className="w-full max-w-80" />
      </Specimen>
      <Specimen label="Whole group disabled" stageClassName="py-6">
        <SourceGrid label="Drive scenario, disabled" items={SCENARIOS} value="clear" onChange={() => undefined} disabled className="w-full max-w-64" />
      </Specimen>
    </SpecimenGrid>
  )
}

/* ---------- FilterChip ---------- */

const CHIP_STATES: readonly { label: string; force?: ForcedState; selected?: boolean; disabled?: boolean }[] = [
  { label: 'Default' },
  { label: 'Hover', force: 'hover' },
  { label: 'Pressed', force: 'active' },
  { label: 'Focus', force: 'focus' },
  { label: 'Selected', selected: true },
  { label: 'Disabled', disabled: true },
]

export function FilterChipSpecimen() {
  const [on, setOn] = useState<readonly string[]>(['Critical'])
  const toggle = (k: string) => {
    setOn((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))
  }
  return (
    <Groups>
      <div className="flex flex-col gap-4">
        <GroupLabel>States</GroupLabel>
        <SpecimenGrid min="10rem">
          {CHIP_STATES.map((s) => (
            <Specimen key={s.label} label={s.label} {...(s.force ? { force: s.force } : {})}>
              <FilterChip label="Warning" count={12} selected={s.selected ?? false} disabled={s.disabled ?? false} onToggle={() => undefined} />
            </Specimen>
          ))}
          <Specimen label="Long label · wraps">
            <div className="w-40">
              <FilterChip label="All channels and severities" count={200} selected={false} onToggle={() => undefined} />
            </div>
          </Specimen>
          <Specimen label="No count">
            <FilterChip label="Sensor" selected onToggle={() => undefined} />
          </Specimen>
        </SpecimenGrid>
      </div>
      <div className="flex flex-col gap-4">
        <GroupLabel>Interactive set</GroupLabel>
        <div className="flex flex-wrap gap-2">
          {[
            ['Normal', 148],
            ['Warning', 41],
            ['Critical', 9],
            ['Sensor fault', 2],
          ].map(([k, n]) => (
            <FilterChip
              key={k}
              label={String(k)}
              count={Number(n)}
              selected={on.includes(String(k))}
              onToggle={() => {
                toggle(String(k))
              }}
            />
          ))}
        </div>
      </div>
    </Groups>
  )
}
