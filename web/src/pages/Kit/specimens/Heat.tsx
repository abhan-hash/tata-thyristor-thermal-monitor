import { HeatDefs, svgUrl, useHeatDefIds } from '../../../visuals/heat/HeatDefs'
import { HeatDisc } from '../../../visuals/heat/HeatDisc'
import { HeatSmearTitle } from '../../../visuals/heat/HeatSmearTitle'
import { GroupLabel, Groups, Specimen, SpecimenGrid } from '../gallery'

const INTENSITIES = [0, 0.35, 0.7, 1] as const

export function HeatSmearTitleSpecimen() {
  return (
    <Groups>
      <Specimen label="Display · intensity 0.8 · 96 px" align="stretch" stageClassName="py-10 ps-10 sm:ps-24">
        <HeatSmearTitle text="THERMAL" intensity={0.8} fontSize={96} className="h-auto max-w-full" />
      </Specimen>
      <div className="flex flex-col gap-4">
        <GroupLabel>Intensity follows the hottest Tj</GroupLabel>
        <SpecimenGrid min="15rem">
          {INTENSITIES.map((i) => (
            <Specimen key={i} label={`Intensity ${i.toFixed(2)}`} stageClassName="py-8">
              <HeatSmearTitle text="TJ 118" intensity={i} fontSize={48} className="h-auto max-w-full" />
            </Specimen>
          ))}
        </SpecimenGrid>
      </div>
    </Groups>
  )
}

const DISC_STATES = [
  { tj: 48, label: 'Cool · 48 °C · normal' },
  { tj: 98.4, label: 'Running · 98.4 °C · normal' },
  { tj: 116.2, label: 'Warning · 116.2 °C' },
  { tj: 131.5, label: 'Critical · 131.5 °C' },
  { tj: Number.NaN, label: 'Sensor fault · NaN' },
] as const

export function HeatDiscSpecimen() {
  return (
    <SpecimenGrid min="13rem">
      {DISC_STATES.map((d, i) => (
        <Specimen key={d.label} label={d.label} stageClassName="py-6">
          <HeatDisc tj={d.tj} seed={i + 3} size={200} label={`Specimen ${String(i + 1)}`} className="h-auto max-w-full" />
        </Specimen>
      ))}
      <Specimen label="No brackets · 120 px" stageClassName="py-6">
        <HeatDisc tj={108} seed={11} size={120} brackets={false} label="Small specimen" className="h-auto max-w-full" />
      </Specimen>
    </SpecimenGrid>
  )
}

/** One rendered definition from a private HeatDefs instance. */
function DefSample({ kind }: { kind: 'linear' | 'blurX' | 'soften' | 'glow' | 'grain' | 'faultHatch' }) {
  const ids = useHeatDefIds()
  const W = 200
  const H = 96
  const art = {
    linear: <rect x={8} y={24} width={W - 16} height={48} rx={4} style={{ fill: svgUrl(ids.linear) }} />,
    blurX: (
      <g>
        <rect x={60} y={28} width={80} height={40} rx={4} filter={svgUrl(ids.blurX)} style={{ fill: svgUrl(ids.linear) }} />
        <rect x={60} y={28} width={80} height={40} rx={4} style={{ fill: 'none', stroke: 'var(--line-strong)' }} />
      </g>
    ),
    soften: (
      <g filter={svgUrl(ids.soften)}>
        <circle cx={W / 2} cy={H / 2} r={36} style={{ fill: 'var(--heat-5)' }} />
        <circle cx={W / 2} cy={H / 2} r={24} style={{ fill: 'var(--heat-3)' }} />
        <circle cx={W / 2} cy={H / 2} r={12} style={{ fill: 'var(--heat-1)' }} />
      </g>
    ),
    glow: (
      <g>
        <circle cx={W / 2} cy={H / 2} r={26} filter={svgUrl(ids.glow)} style={{ fill: 'var(--heat-4)' }} />
        <circle cx={W / 2} cy={H / 2} r={16} style={{ fill: 'var(--heat-3)' }} />
      </g>
    ),
    grain: (
      <g>
        <rect x={8} y={24} width={W - 16} height={48} rx={4} style={{ fill: 'var(--heat-5)' }} />
        <rect x={8} y={24} width={W - 16} height={48} rx={4} filter={svgUrl(ids.grain)} style={{ fill: 'var(--surface-page)' }} opacity={0.5} />
      </g>
    ),
    faultHatch: <rect x={8} y={24} width={W - 16} height={48} rx={4} style={{ fill: svgUrl(ids.faultHatch) }} />,
  }[kind]
  return (
    <svg viewBox={`0 0 ${String(W)} ${String(H)}`} width={W} height={H} aria-hidden="true" className="h-auto max-w-full">
      <HeatDefs ids={ids} blurX={10} />
      {art}
    </svg>
  )
}

const DEFS = [
  { kind: 'linear', label: 'linear · heat gradient' },
  { kind: 'blurX', label: 'blurX · x-only smear' },
  { kind: 'soften', label: 'soften · band edges' },
  { kind: 'glow', label: 'glow · halo' },
  { kind: 'grain', label: 'grain · matte noise' },
  { kind: 'faultHatch', label: 'faultHatch · no heat hue' },
] as const

export function HeatDefsSpecimen() {
  return (
    <Groups>
      <p className="m-0 max-w-[62ch] text-14 leading-relaxed text-text-secondary">
        Each visual renders its own <code className="text-12 text-text-primary">{'<defs>'}</code> with ids from{' '}
        <code className="text-12 text-text-primary">useHeatDefIds()</code>, so two visuals on a page never resolve each
        other’s references. Every sample below uses a separate instance.
      </p>
      <SpecimenGrid min="12rem">
        {DEFS.map((d) => (
          <Specimen key={d.kind} label={d.label}>
            <DefSample kind={d.kind} />
          </Specimen>
        ))}
      </SpecimenGrid>
    </Groups>
  )
}
