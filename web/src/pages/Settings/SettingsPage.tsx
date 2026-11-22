import { useState, type ReactNode } from 'react'
import { useBlocker, type BlockerFunction } from 'react-router'
import { mockSeed } from '../../config'
import {
  BAND_KEYS,
  canSave as canSaveDraft,
  cloneSettings,
  isDirty as isDraftDirty,
  validate,
  type BandField,
  type BandKey,
} from '../../domain/settings'
import type { Band, Scenario } from '../../domain/types'
import { cx } from '../../kit/controlStyles'
import { CropPanel } from '../../kit/CropPanel'
import { Fader } from '../../kit/Fader'
import { Field } from '../../kit/Field'
import { HardwareToggle } from '../../kit/HardwareToggle'
import { HeroLockup } from '../../kit/HeroLockup'
import { Select } from '../../kit/Select'
import { useUiStore } from '../../state/uiStore'
import { BandEditor } from './BandEditor'
import { LeaveDialog } from './LeaveDialog'
import { UnsavedBar } from './UnsavedBar'
import { CAPS, SCENARIO_OPTIONS } from './settingsUi'

/** Placeholder endpoint for the backend phase; the field stays disabled until then. */
const WS_URL_PLACEHOLDER = 'wss://plant-gateway/stand-04/telemetry'

function sameBand(a: Readonly<Band>, b: Readonly<Band>): boolean {
  return (
    Object.is(a.warning, b.warning) &&
    Object.is(a.critical, b.critical) &&
    Object.is(a.hysteresis, b.hysteresis) &&
    Object.is(a.debounce_s, b.debounce_s)
  )
}

/** Blocks leaving the page (not search-param changes) while the draft is unsaved. */
/* Store actions are read at call time; they never change identity. */
const store = () => useUiStore.getState()

const blockWhileDirty: BlockerFunction = ({ currentLocation, nextLocation }) => {
  const { draft, saved } = useUiStore.getState()
  return currentLocation.pathname !== nextLocation.pathname && isDraftDirty(draft, saved)
}

interface GroupProps {
  index: number
  kicker: string
  title: string
  description: string
  children: ReactNode
  className?: string
}

/** One settings group: a crop-bracketed panel with a numbered edge label and a gold heading. */
function SettingsGroup({ index, kicker, title, description, children, className }: GroupProps) {
  const headingId = `settings-group-${String(index)}`
  return (
    <CropPanel
      role="group"
      aria-labelledby={headingId}
      labels={[{ edge: 'top', text: `${String(index).padStart(2, '0')} · ${kicker}`, align: 'start' }]}
      className={cx('flex flex-col gap-6', className)}
    >
      <header className="flex flex-col gap-1.5">
        <h2 id={headingId} className="m-0 text-20 leading-tight font-bold [color:var(--accent)]">
          {title}
        </h2>
        <p className="m-0 max-w-prose text-12 leading-snug [color:var(--text-secondary)]">{description}</p>
      </header>
      {children}
    </CropPanel>
  )
}

/** Hero secondary block: saved state, announced politely when it changes. */
function SaveState({ dirty, justSaved }: { dirty: boolean; justSaved: boolean }) {
  let text = 'Saved in this browser'
  if (dirty) text = 'Unsaved changes'
  else if (justSaved) text = 'Saved. New thresholds are in effect'
  return (
    <>
      <span className={cx(CAPS, 'text-[10px] [color:var(--text-muted)]')}>Configuration</span>
      <p
        role="status"
        className={cx(
          'm-0 flex items-center gap-2 text-14 leading-tight font-bold',
          dirty ? '[color:var(--accent)]' : '[color:var(--text-primary)]',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'size-2 shrink-0 rounded-pill',
            dirty ? '[background-color:var(--accent)]' : '[background-color:var(--status-normal)]',
          )}
        />
        {text}
      </p>
    </>
  )
}

/**
 * Settings at `/settings` (Requirement 28): thresholds, display, data source
 * and scenario defaults, each in its own crop panel. Edits go to the UI
 * store's draft; Save persists to `localStorage` and applies the thresholds
 * to status classification and the alarm engine.
 */
export function SettingsPage() {
  const draft = useUiStore((s) => s.draft)
  const saved = useUiStore((s) => s.saved)
  const [justSaved, setJustSaved] = useState(false)

  const dirty = isDraftDirty(draft, saved)
  const saveable = canSaveDraft(draft, saved)
  const { errors } = validate(draft)
  const errorCount = BAND_KEYS.reduce((n, k) => n + Object.keys(errors[k] ?? {}).length, 0)

  const blocker = useBlocker(blockWhileDirty)

  const onBandChange = (key: BandKey) => (field: BandField | 'debounce_s', value: number) => {
    setJustSaved(false)
    if (field !== 'debounce_s') {
      store().setBandValue(key, field, value)
      return
    }
    const next = cloneSettings(store().draft)
    next.thresholds[key].debounce_s = value
    store().setDraft(next)
  }

  const onSave = () => {
    if (store().save()) setJustSaved(true)
  }
  const onDiscard = () => {
    setJustSaved(false)
    store().discard()
  }

  return (
    <div className="layout-page flex flex-col gap-8 pt-8 pb-12 lg:gap-10 lg:pt-10">
      <HeroLockup
        title="SETTINGS"
        subtitle="Thresholds, display and data source"
        secondary={<SaveState dirty={dirty} justSaved={justSaved} />}
      />

      <div className="layout-grid items-start">
        <SettingsGroup
          index={1}
          kicker="Thresholds"
          title="Alarm thresholds"
          description="A band raises a warning at its warning level and trips at critical. It clears once the value falls below the limit minus hysteresis, and must hold for the debounce time first."
          className="wide:col-span-8"
        >
          <div className="flex flex-col">
            {BAND_KEYS.map((key, i) => (
              <div
                key={key}
                className={cx(i > 0 && 'mt-6 border-t pt-6 [border-color:var(--line-subtle)]')}
              >
                <BandEditor
                  bandKey={key}
                  band={draft.thresholds[key]}
                  errors={errors[key]}
                  edited={!sameBand(draft.thresholds[key], saved.thresholds[key])}
                  onChange={onBandChange(key)}
                />
              </div>
            ))}
          </div>
        </SettingsGroup>

        <div className="grid gap-[var(--layout-gutter)] lg:grid-cols-3 wide:col-span-4 wide:grid-cols-1">
          <SettingsGroup
            index={2}
            kicker="Display"
            title="Display"
            description="How charts and the bridge schematic draw on every page."
          >
            <Fader
              label="Chart window"
              unit="s"
              min={30}
              max={300}
              step={30}
              value={draft.display.chartWindowS}
              onChange={(v) => {
                setJustSaved(false)
                store().setDisplay({ chartWindowS: v })
              }}
            />
            <div className="flex flex-col gap-1">
              <HardwareToggle
                label="Heat field"
                checked={draft.display.heatField}
                onChange={(heatField) => {
                  setJustSaved(false)
                  store().setDisplay({ heatField })
                }}
                className="w-full"
              />
              <p className="m-0 text-12 leading-snug [color:var(--text-muted)]">
                Shades the bridge schematic with the estimated junction heat.
              </p>
            </div>
          </SettingsGroup>

          <SettingsGroup
            index={3}
            kicker="Source"
            title="Data source"
            description="Where telemetry frames come from."
          >
            <div className="flex items-end justify-between gap-4 rounded-2 border px-4 py-3 [border-color:var(--line-subtle)] [background-color:var(--surface-sunken)]">
              <div className="flex flex-col gap-1">
                <span className={cx(CAPS, 'text-11 [color:var(--control-label-color)]')}>Active source</span>
                <span className="text-28 leading-none font-bold [color:var(--text-primary)]">Mock</span>
              </div>
              <span className="num text-12 [color:var(--text-muted)]">seed {mockSeed}</span>
            </div>
            <Field
              label="WebSocket URL"
              disabled
              value=""
              placeholder={WS_URL_PLACEHOLDER}
              readOnly
              hint="Connects in the backend phase. Until then the monitor runs on synthetic mock data."
            />
          </SettingsGroup>

          <SettingsGroup
            index={4}
            kicker="Scenario"
            title="Scenario defaults"
            description="What the mock source plays when the monitor loads."
          >
            <Select
              label="Start scenario"
              value={draft.scenarioDefaults.scenario}
              onChange={(e) => {
                setJustSaved(false)
                store().setScenarioDefaults({ scenario: e.currentTarget.value as Scenario })
              }}
            >
              {SCENARIO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <HardwareToggle
              label="Auto-start mock source"
              checked={draft.scenarioDefaults.autoStart}
              onChange={(autoStart) => {
                setJustSaved(false)
                store().setScenarioDefaults({ autoStart })
              }}
              className="w-full"
            />
          </SettingsGroup>
        </div>
      </div>

      {dirty && (
        <UnsavedBar errorCount={errorCount} canSave={saveable} onSave={onSave} onDiscard={onDiscard} />
      )}

      {blocker.state === 'blocked' && (
        <LeaveDialog
          onStay={() => {
            blocker.reset()
          }}
          onDiscard={() => {
            store().discard()
            blocker.proceed()
          }}
        />
      )}
    </div>
  )
}
