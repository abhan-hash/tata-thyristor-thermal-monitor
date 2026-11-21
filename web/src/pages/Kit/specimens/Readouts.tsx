import { LinePath } from '@visx/shape'
import { useMotionValue } from 'motion/react'
import { ChartFrame } from '../../../charts/ChartFrame'
import { JUNCTION_BANDS, thresholdBands } from '../../../charts/chartTheme'
import { CURRENT_A_SPEC, POWER_W_SPEC, TEMP_C_SPEC, type FormatSpec } from '../../../domain/format'
import { DEFAULT_THRESHOLDS } from '../../../domain/thresholds'
import type { Status } from '../../../domain/types'
import { KpiTile, type KpiTileProps } from '../../../kit/KpiTile'
import { Sparkline } from '../../../kit/Sparkline'
import { StaleChip } from '../../../kit/StaleChip'
import { STATUS_LABEL, StatusChip } from '../../../kit/StatusChip'
import { GroupLabel, Groups, Specimen, SpecimenGrid } from '../gallery'
import { sampleTrace, withGap } from './sample'

const STATUSES: readonly Status[] = ['normal', 'warning', 'critical', 'fault']

export function StatusChipSpecimen() {
  return (
    <Groups>
      {(['md', 'sm'] as const).map((size) => (
        <div key={size} className="flex flex-col gap-4">
          <GroupLabel>{size === 'md' ? 'Medium · readouts' : 'Small · dense rows'}</GroupLabel>
          <SpecimenGrid min="11rem">
            {STATUSES.map((s) => (
              <Specimen key={s} label={STATUS_LABEL[s]}>
                <StatusChip status={s} size={size} />
              </Specimen>
            ))}
          </SpecimenGrid>
        </div>
      ))}
    </Groups>
  )
}

export function StaleChipSpecimen() {
  return (
    <SpecimenGrid min="11rem">
      <Specimen label="Small">
        <StaleChip size="sm" />
      </Specimen>
      <Specimen label="Medium">
        <StaleChip size="md" />
      </Specimen>
      <Specimen label="Beside a status chip">
        <span className="flex items-center gap-2">
          <StatusChip status="warning" size="sm" />
          <StaleChip size="sm" />
        </span>
      </Specimen>
    </SpecimenGrid>
  )
}

const TJ_SERIES = sampleTrace(120, 96, 16)
const HS_SERIES = sampleTrace(120, 70, 9, 2)
const CURRENT_SERIES = sampleTrace(120, 2100, 160, 4)

/** KpiTile with its MotionValue created from a plain number. */
function KpiSample({ initial, ...props }: Omit<KpiTileProps, 'value'> & { initial: number; spec: FormatSpec }) {
  const value = useMotionValue(initial)
  return <KpiTile value={value} {...props} />
}

export function KpiTileSpecimen() {
  return (
    <Groups>
      <div className="flex flex-col gap-4">
        <GroupLabel>Each status</GroupLabel>
        <SpecimenGrid min="16rem">
          <Specimen label="Normal" align="stretch" stageClassName="!justify-start !p-3">
            <KpiSample label="Heatsink" initial={74.6} spec={TEMP_C_SPEC} series={HS_SERIES} delta={0.4} deltaLabel="60 S" status="normal" />
          </Specimen>
          <Specimen label="Warning" align="stretch" stageClassName="!justify-start !p-3">
            <KpiSample
              label="Hottest Tj"
              initial={112.4}
              spec={TEMP_C_SPEC}
              series={TJ_SERIES}
              bands={JUNCTION_BANDS}
              seriesDomain={[90, 130]}
              delta={2.7}
              deltaLabel="60 S"
              status="warning"
            />
          </Specimen>
          <Specimen label="Critical" align="stretch" stageClassName="!justify-start !p-3">
            <KpiSample
              label="Hottest Tj"
              initial={127.9}
              spec={TEMP_C_SPEC}
              series={sampleTrace(120, 108, 18, 1)}
              bands={JUNCTION_BANDS}
              seriesDomain={[90, 135]}
              delta={6.1}
              deltaLabel="60 S"
              status="critical"
            />
          </Specimen>
          <Specimen label="Sensor fault · no value" align="stretch" stageClassName="!justify-start !p-3">
            <KpiSample label="T5 junction" initial={Number.NaN} spec={TEMP_C_SPEC} series={withGap(TJ_SERIES, 70, 120)} delta={Number.NaN} status="fault" />
          </Specimen>
        </SpecimenGrid>
      </div>
      <div className="flex flex-col gap-4">
        <GroupLabel>Without status · loading</GroupLabel>
        <SpecimenGrid min="16rem">
          <Specimen label="Default · falling delta" align="stretch" stageClassName="!justify-start !p-3">
            <KpiSample label="Armature current" initial={2186.5} spec={CURRENT_A_SPEC} series={CURRENT_SERIES} delta={-12.4} deltaLabel="60 S" />
          </Specimen>
          <Specimen label="Value only" align="stretch" stageClassName="!justify-start !p-3">
            <KpiSample label="Power loss" initial={412.8} spec={POWER_W_SPEC} />
          </Specimen>
          <Specimen label="Loading · empty series" align="stretch" stageClassName="!justify-start !p-3">
            <KpiSample label="Ambient" initial={Number.NaN} spec={TEMP_C_SPEC} series={[]} />
          </Specimen>
        </SpecimenGrid>
      </div>
    </Groups>
  )
}

const HS_BANDS = thresholdBands(DEFAULT_THRESHOLDS.heatsink_temp, '°C')

export function SparklineSpecimen() {
  return (
    <SpecimenGrid min="13rem">
      <Specimen label="Default · auto domain">
        <Sparkline series={TJ_SERIES} label="Tj, last 60 s" />
      </Specimen>
      <Specimen label="Warning and trip bands">
        <Sparkline series={TJ_SERIES} domain={[95, 130]} bands={JUNCTION_BANDS} label="Tj with bands" />
      </Specimen>
      <Specimen label="Heatsink bands">
        <Sparkline series={sampleTrace(120, 76, 8, 3)} domain={[70, 90]} bands={HS_BANDS} label="Heatsink with bands" />
      </Specimen>
      <Specimen label="Gap · dropped samples">
        <Sparkline series={withGap(TJ_SERIES, 40, 62)} label="Tj with gap" />
      </Specimen>
      <Specimen label="Flat">
        <Sparkline series={new Array<number>(60).fill(42)} label="Flat trace" />
      </Specimen>
      <Specimen label="Empty · no samples">
        <Sparkline series={[]} label="No samples" />
      </Specimen>
    </SpecimenGrid>
  )
}

const CHART_TJ = sampleTrace(121, 100, 18)
const CHART_HS = sampleTrace(121, 72, 10, 2)
const xAtIndex = (i: number) => i * 0.5 - 60

function ChartTraces({ x, y }: { x: (v: number) => number; y: (v: number) => number }) {
  const idx = Array.from({ length: CHART_TJ.length }, (_, i) => i)
  return (
    <>
      <LinePath
        data={idx}
        x={(i) => x(xAtIndex(i))}
        y={(i) => y(CHART_HS[i] ?? Number.NaN)}
        className="[fill:none] [stroke:var(--text-secondary)] [stroke-width:1.25px] [stroke-dasharray:3_3]"
      />
      <LinePath
        data={idx}
        x={(i) => x(xAtIndex(i))}
        y={(i) => y(CHART_TJ[i] ?? Number.NaN)}
        className="[fill:none] [stroke:var(--sparkline-stroke)] [stroke-width:2px] [stroke-linejoin:round]"
      />
    </>
  )
}

const fmtX = (v: number) => (v === 0 ? 'NOW' : `${String(v)} S`)
const fmtY = (v: number) => String(v)

export function ChartFrameSpecimen() {
  return (
    <Groups>
      <Specimen label="Default · Tj and heatsink · bands · pointer crosshair" align="stretch" stageClassName="!p-3 sm:!p-5">
        <ChartFrame
          title="Junction and heatsink temperature, last 60 s"
          width={720}
          height={280}
          xDomain={[-60, 0]}
          yDomain={[60, 135]}
          bands={JUNCTION_BANDS}
          formatX={fmtX}
          formatY={fmtY}
          className="w-full"
        >
          {(s) => <ChartTraces x={s.x} y={s.y} />}
        </ChartFrame>
      </Specimen>
      <SpecimenGrid min="18rem">
        <Specimen label="Crosshair · controlled at −18 s" align="stretch" stageClassName="!justify-start !p-3">
          <ChartFrame
            title="Junction temperature with crosshair"
            width={420}
            height={220}
            xDomain={[-60, 0]}
            yDomain={[60, 135]}
            bands={JUNCTION_BANDS}
            formatX={fmtX}
            formatY={fmtY}
            crosshairX={-18}
            className="w-full"
          >
            {(s) => <ChartTraces x={s.x} y={s.y} />}
          </ChartFrame>
        </Specimen>
        <Specimen label="Empty · no samples yet" align="stretch" stageClassName="!justify-start !p-3">
          <div className="relative">
            <ChartFrame
              title="Junction temperature, no data"
              width={420}
              height={220}
              xDomain={[-60, 0]}
              yDomain={[60, 135]}
              bands={JUNCTION_BANDS}
              formatX={fmtX}
              formatY={fmtY}
              crosshair={false}
              className="w-full opacity-50"
            />
            <p className="absolute inset-0 m-0 flex items-center justify-center">
              <span className="rounded-1 border px-3 py-2 text-12 text-text-primary [background-color:var(--surface-raised)] [border-color:var(--line-strong)]">
                No readings yet
              </span>
            </p>
          </div>
        </Specimen>
      </SpecimenGrid>
    </Groups>
  )
}
