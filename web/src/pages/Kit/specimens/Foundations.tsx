import { HEAT_BREAKPOINTS_C } from '../../../domain/heatScale'
import type { Status } from '../../../domain/types'
import { cx } from '../../../kit/controlStyles'
import { ChevronIcon } from '../../../kit/icons/ChevronIcon'
import { StaleIcon } from '../../../kit/icons/StaleIcon'
import { STATUS_ICON_SHAPE, StatusIcon } from '../../../kit/icons/StatusIcon'
import { STATUS_LABEL } from '../../../kit/StatusChip'
import { CAPS, GroupLabel, Groups, Specimen, SpecimenGrid } from '../gallery'

interface Swatch {
  token: string
  use: string
  /** Draw a hairline around light-on-dark-invisible swatches. */
  outline?: boolean
}

const SWATCH_GROUPS: readonly { title: string; swatches: readonly Swatch[] }[] = [
  {
    title: 'Surfaces',
    swatches: [
      { token: '--surface-page', use: 'Page under the contours', outline: true },
      { token: '--surface-panel', use: 'Panels', outline: true },
      { token: '--surface-raised', use: 'Rack rows, cards', outline: true },
      { token: '--surface-sunken', use: 'Fader wells, stages', outline: true },
    ],
  },
  {
    title: 'Lines and text',
    swatches: [
      { token: '--line-subtle', use: 'Dividers' },
      { token: '--line-strong', use: 'Brackets, strong edges' },
      { token: '--text-primary', use: 'Primary text' },
      { token: '--text-secondary', use: 'Secondary text' },
      { token: '--text-muted', use: 'Large captions only' },
    ],
  },
  {
    title: 'Accent',
    swatches: [
      { token: '--accent', use: 'Headings, outlines' },
      { token: '--accent-strong', use: 'Focus ring, hover' },
      { token: '--on-accent', use: 'Text on gold', outline: true },
    ],
  },
  {
    title: 'Status',
    swatches: [
      { token: '--status-normal', use: 'Normal + check' },
      { token: '--status-warning', use: 'Warning + triangle' },
      { token: '--status-critical', use: 'Critical + octagon' },
      { token: '--status-critical-text', use: 'Critical as small text' },
      { token: '--status-fault', use: 'Fault on hatch' },
    ],
  },
]

function SwatchCard({ token, use, outline = false }: Swatch) {
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2.5">
      <div
        aria-hidden="true"
        className={cx(
          'h-16 rounded-2 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--text-primary)_8%,transparent)]',
          outline && 'border [border-color:var(--kit-stage-border)]',
        )}
        style={{ background: `var(${token})` }}
      />
      <figcaption className="flex min-w-0 flex-col gap-0.5">
        <code className="num text-12 text-text-primary [overflow-wrap:anywhere]">{token}</code>
        <span className="text-12 leading-snug text-text-secondary">{use}</span>
      </figcaption>
    </figure>
  )
}

const HEAT_STOPS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const

/** Lower bound in °C of each heat stop, from the Heat_Scale breakpoints. */
function stopFloor(i: number): string {
  if (i === 0) return '< ' + String(HEAT_BREAKPOINTS_C[0] ?? '')
  return '≥ ' + String(HEAT_BREAKPOINTS_C[i - 1] ?? '')
}

export function TokensSpecimen() {
  return (
    <Groups>
      {SWATCH_GROUPS.map((g) => (
        <div key={g.title} className="flex flex-col gap-4">
          <GroupLabel>{g.title}</GroupLabel>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] gap-4">
            {g.swatches.map((s) => (
              <SwatchCard key={s.token} {...s} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-4">
        <GroupLabel>Heat ramp · temperature encoding only</GroupLabel>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2 sm:grid-cols-9">
          {HEAT_STOPS.map((i) => (
            <figure key={i} className="m-0 flex min-w-0 flex-col">
              <div aria-hidden="true" className="h-14" style={{ background: `var(--heat-${String(i)})` }} />
              <figcaption className="flex flex-col gap-0.5 px-2 py-2 [background-color:var(--kit-stage-bg)]">
                <code className="num text-11 text-text-primary">--heat-{i}</code>
                <span className="num text-11 text-text-secondary">{stopFloor(i)} °C</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <GroupLabel>Focus ring and hatch</GroupLabel>
        <SpecimenGrid min="12rem">
          <Specimen label="Focus ring">
            <span className="h-10 w-28 rounded-1 shadow-[var(--focus-ring)] [background-color:var(--surface-raised)]" />
          </Specimen>
          <Specimen label="Fault hatch">
            <span className="h-10 w-28 rounded-1 [background-image:var(--status-fault-hatch)]" />
          </Specimen>
        </SpecimenGrid>
      </div>
    </Groups>
  )
}

const TYPE_SCALE = [96, 64, 40, 28, 20, 16, 14, 12, 11] as const

const ROLES = [
  {
    role: 'Display',
    spec: 'wght 800 · wdth 112',
    className: 'text-40 leading-none [font-weight:var(--font-display-weight)] [font-stretch:var(--font-display-width)] text-accent',
    sample: 'Junction 112.4 °C',
  },
  {
    role: 'Label',
    spec: 'wght 600 · wdth 125 · 0.32em · caps',
    className: cx(CAPS, 'text-12 text-text-primary'),
    sample: 'Thyristor A+',
  },
  {
    role: 'Body',
    spec: 'wght 400 · wdth 100',
    className: 'text-16 leading-relaxed text-text-secondary',
    sample: 'The Foster model estimates junction temperature from current and heatsink readings.',
  },
  {
    role: 'Numerals',
    spec: 'tabular-nums · .num',
    className: 'num text-28 leading-none text-text-primary [font-weight:700]',
    sample: '098.4  101.7  111.1',
  },
] as const

export function TypeScaleSpecimen() {
  return (
    <Groups>
      <div className="flex flex-col gap-4">
        <GroupLabel>Roles</GroupLabel>
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r.role} className="flex min-w-0 flex-col gap-2 border-t pt-4 [border-color:var(--kit-rule)]">
              <p className={cx(CAPS, 'm-0 flex flex-wrap justify-between gap-2 text-[10px] text-text-secondary')}>
                <span className="text-accent">{r.role}</span>
                <span className="normal-case tracking-normal">{r.spec}</span>
              </p>
              <p className={cx('m-0 [overflow-wrap:anywhere]', r.className)}>{r.sample}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <GroupLabel>Scale · px</GroupLabel>
        <ol className="m-0 flex list-none flex-col p-0">
          {TYPE_SCALE.map((size) => (
            <li
              key={size}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-4 border-b py-3 [border-color:var(--kit-rule)] last:border-b-0"
            >
              <code className="num text-12 text-text-secondary">{size}</code>
              <span
                className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap leading-[1.05] text-text-primary [font-weight:var(--font-display-weight)] [font-stretch:var(--font-display-width)]"
                style={{ fontSize: `var(--text-${String(size)})` }}
              >
                Thermosense
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Groups>
  )
}

const STATUSES: readonly Status[] = ['normal', 'warning', 'critical', 'fault']

const STATUS_TONE: Readonly<Record<Status, string>> = {
  normal: 'text-status-normal',
  warning: 'text-status-warning',
  critical: 'text-status-critical',
  fault: 'text-status-fault',
}

export function IconsSpecimen() {
  return (
    <Groups>
      <div className="flex flex-col gap-4">
        <GroupLabel>Status glyphs</GroupLabel>
        <SpecimenGrid min="9rem">
          {STATUSES.map((s) => (
            <Specimen key={s} label={STATUS_LABEL[s]}>
              <div className="flex flex-col items-center gap-3">
                <span className={cx('flex', STATUS_TONE[s])}>
                  <StatusIcon status={s} size={32} />
                </span>
                <code className="num text-11 text-text-secondary">{STATUS_ICON_SHAPE[s]}</code>
              </div>
            </Specimen>
          ))}
        </SpecimenGrid>
      </div>
      <div className="flex flex-col gap-4">
        <GroupLabel>Utility glyphs</GroupLabel>
        <SpecimenGrid min="9rem">
          <Specimen label="Chevron">
            <ChevronIcon size={24} className="text-text-primary" />
          </Specimen>
          <Specimen label="Stale">
            <StaleIcon size={24} className="text-text-primary" />
          </Specimen>
          <Specimen label="Greyscale check">
            <div className="flex gap-3 text-text-secondary">
              {STATUSES.map((s) => (
                <StatusIcon key={s} status={s} size={20} />
              ))}
            </div>
          </Specimen>
        </SpecimenGrid>
      </div>
    </Groups>
  )
}
