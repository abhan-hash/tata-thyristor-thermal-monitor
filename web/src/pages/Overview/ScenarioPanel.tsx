import type { ReactNode } from 'react'
import { useFrame, useLiveValue, useScenario } from '../../data/hooks'
import { formatChannelParam, useSelectedChannel } from '../../data/selection'
import type { DriveFrame, Scenario } from '../../domain/types'
import { CropPanel } from '../../kit/CropPanel'
import { SourceGrid, type SourceItem } from '../../kit/SourceGrid'
import { HeatDisc } from '../../visuals/heat/HeatDisc'
import { marginText, rackRows } from './overviewModel'

/* ── Scenario icons (decorative, currentColor) ─────────────────────────── */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** The six drive scenarios in the reference's 2 × 3 order (Requirement 24.5). */
export const SCENARIO_ITEMS: readonly SourceItem<Scenario>[] = [
  {
    value: 'normal',
    label: 'NORMAL',
    icon: (
      <Icon>
        <path d="M3 12h3l2-5 4 10 2-5h7" />
      </Icon>
    ),
  },
  {
    value: 'bar_entry',
    label: 'BAR ENTRY',
    icon: (
      <Icon>
        <rect x="3" y="9" width="10" height="6" rx="1" />
        <path d="M15 12h6M18 9l3 3-3 3" />
      </Icon>
    ),
  },
  {
    value: 'fan_failure',
    label: 'FAN FAIL',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="2" />
        <path d="M12 10c0-4 1-6 3-6s2 3-1 6M14 12c4 0 6 1 6 3s-3 2-6-1M12 14c0 4-1 6-3 6s-2-3 1-6M10 12c-4 0-6-1-6-3s3-2 6 1" />
        <path d="M4 20 20 4" />
      </Icon>
    ),
  },
  {
    value: 'clogging',
    label: 'CLOGGING',
    icon: (
      <Icon>
        <path d="M4 7h16M4 12h16M4 17h16" />
        <path d="M8 5v4M13 10v4M17 15v4" strokeWidth={2.5} />
      </Icon>
    ),
  },
  {
    value: 'overload',
    label: 'OVERLOAD',
    icon: (
      <Icon>
        <path d="M13 3 6 13h5l-1 8 7-10h-5z" />
      </Icon>
    ),
  },
  {
    value: 'clear',
    label: 'CLEAR',
    icon: (
      <Icon>
        <path d="M5 12.5 10 17l9-10" />
      </Icon>
    ),
  },
]

/* ── Artwork card: live heat disc for the selected channel ─────────────── */

function ArtworkCard() {
  const id = useSelectedChannel()
  const ch = formatChannelParam(id)
  const tj = useLiveValue(`tj.${id}`)
  // Labels refresh only when the shown 0.1 figure changes.
  const tjText = useFrame((f: DriveFrame | null) => rackRows(f)[id - 1]?.tj ?? '')
  const margin = useFrame((f: DriveFrame | null) => marginText(f, id))
  return (
    <CropPanel
      tone="raised"
      accentBrackets
      data-part="overview-artwork"
      className="aspect-square w-full"
      labels={[
        { edge: 'top', align: 'start', text: `CH ${ch}` },
        { edge: 'right', align: 'start', text: `Tj ${tjText} °C` },
        { edge: 'bottom', align: 'end', text: `MARGIN ${margin} K` },
      ]}
    >
      <span className="absolute top-[calc(var(--crop-panel-pad)+2px)] left-[calc(var(--crop-panel-pad)+2px)] text-12 font-[800] tracking-[0.04em] text-heat-5 [font-stretch:112%]">
        STAND-04
      </span>
      <div className="grid size-full place-items-center">
        <HeatDisc tj={tj} seed={id + 10} size={240} brackets={false} label={`${ch} junction temperature`} className="h-auto w-[88%]" />
      </div>
    </CropPanel>
  )
}

/**
 * Overview second panel, top half (Requirements 24.5, 24.6): artwork card
 * with a live heat disc and rotated micro-labels, the "Inspect Stand-04 in
 * action" heading and a 2 × 3 scenario grid that calls `setScenario`.
 */
export function ScenarioPanel() {
  const { scenario, setScenario, supported } = useScenario()
  return (
    <div
      data-part="scenario-panel"
      className="grid gap-6 @min-[28rem]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @min-[28rem]:items-center"
    >
      <ArtworkCard />
      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[length:clamp(19px,0.8rem+0.5vw,22px)] leading-[1.05] font-[800] text-accent [font-stretch:108%]">
          <span className="whitespace-nowrap">Inspect Stand-04</span>
          <br />
          in action
        </h2>
        <p className="m-0 text-12 font-[600] text-text-secondary">Choose a drive scenario…</p>
        <SourceGrid
          items={SCENARIO_ITEMS}
          value={scenario}
          onChange={setScenario}
          label="Drive scenario"
          columns={2}
          disabled={!supported}
          className="max-lg:grid-cols-3 @min-[28rem]:max-w-[16rem]"
        />
      </div>
    </div>
  )
}
