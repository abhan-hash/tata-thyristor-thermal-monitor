import { useMemo, useState } from 'react'
import { useDisplayTick, useTelemetryStore } from '../../../data/hooks'
import { statusFor } from '../../../domain/status'
import { DEFAULT_THRESHOLDS } from '../../../domain/thresholds'
import type { ChannelId, DriveFrame, ThyristorFrame } from '../../../domain/types'
import { AirflowDiagram } from '../../../visuals/airflow/AirflowDiagram'
import { BridgeSchematic } from '../../../visuals/bridge/BridgeSchematic'
import { hottestChannelOf, IsometricConsole, LiveIsometricConsole } from '../../../visuals/console/IsometricConsole'
import { FosterLadder } from '../../../visuals/foster/FosterLadder'
import { HeatBlobs } from '../../../visuals/heat/HeatBlobs'
import { MillCutaway } from '../../../visuals/mill/MillCutaway'
import { GroupLabel, Groups, Specimen, SpecimenGrid } from '../gallery'

/*
 * Fixed-state fixtures for the signature visuals (Requirements 7.2, 15.5,
 * 21.1). Illustrative values only, not plant telemetry. Each scenario is one
 * drive snapshot; every visual below reads the slice it needs.
 */

const IDS = [1, 2, 3, 4, 5, 6] as const satisfies readonly ChannelId[]
const TJ_BAND = DEFAULT_THRESHOLDS.junction_temp

interface Scenario {
  readonly label: string
  readonly thyristors: readonly ThyristorFrame[]
  readonly ambient: number
  readonly armature: number
  readonly airflow: number
  readonly fan: boolean
}

/** Six channel frames from six Tj values. `fault` marks one channel's sensor unhealthy. */
function channels(tj: readonly number[], ambient: number, armature: number, fault?: ChannelId): ThyristorFrame[] {
  return IDS.map((id, i) => {
    const t = tj[i] ?? ambient
    const healthy = id !== fault
    const power = Math.max(0, (t - ambient) / 0.19)
    return {
      id,
      tj_estimated: t,
      t_heatsink_measured: healthy ? ambient + (t - ambient) * 0.78 : Number.NaN,
      power_loss: power,
      current: armature / 3,
      residual: 0.4,
      r_sa: 0.15,
      margin_to_limit: TJ_BAND.critical - t,
      status: healthy ? statusFor(t, TJ_BAND) : 'fault',
      sensor_healthy: healthy,
    }
  })
}

function scenario(
  label: string,
  tj: readonly number[],
  opts: { ambient?: number; armature?: number; airflow?: number; fan?: boolean; fault?: ChannelId } = {},
): Scenario {
  const ambient = opts.ambient ?? 38
  const armature = opts.armature ?? 720
  return {
    label,
    thyristors: channels(tj, ambient, armature, opts.fault),
    ambient,
    armature,
    airflow: opts.airflow ?? 1,
    fan: opts.fan ?? true,
  }
}

const NORMAL = scenario('Normal', [84.2, 89.6, 92.8, 86.1, 95.4, 87.3])
const WARNING = scenario('Warning', [97.8, 104.1, 113.6, 101.2, 116.4, 99.5], { armature: 1040 })
const CRITICAL = scenario('Critical · all trip', [126.4, 128.1, 131.5, 127.2, 133.8, 129.6], { armature: 1210 })
const AMBIENT = scenario('All ambient', [38, 38, 38, 38, 38, 38], { armature: 0 })
const FAULT = scenario('One sensor fault · T3', [84.2, 89.6, 92.8, 86.1, 95.4, 87.3], { fault: 3 })
const FAN_OFF = scenario('Fan failure', [108.6, 112.4, 118.9, 110.3, 121.7, 114.2], { airflow: 0, fan: false })

/** Healthy Tj maximum, NaN when every sensor is faulted. */
function hottest(s: Scenario): number {
  const healthy = s.thyristors.filter((c) => c.sensor_healthy).map((c) => c.tj_estimated)
  return healthy.length > 0 ? Math.max(...healthy) : Number.NaN
}

function hottestId(s: Scenario): ChannelId | null {
  const t = hottest(s)
  return s.thyristors.find((c) => c.sensor_healthy && c.tj_estimated === t)?.id ?? null
}

function channel(s: Scenario, id: ChannelId): ThyristorFrame {
  return s.thyristors.find((c) => c.id === id) ?? (s.thyristors[0] as ThyristorFrame)
}

/** Hottest healthy channel, or T1 when none is healthy. */
function hottestChannel(s: Scenario): ThyristorFrame {
  return channel(s, hottestId(s) ?? 1)
}

/** 30 samples of armature current at 1 Hz, oldest first. `biteAt` adds a bar-entry step from that sample. */
function currentSeries(base: number, biteAt?: number): number[] {
  return Array.from({ length: 30 }, (_, i) => {
    const ripple = base * 0.015 * Math.sin(i * 1.3)
    const bite = biteAt !== undefined && i >= biteAt ? base * 0.4 : 0
    return Math.max(0, base + ripple + bite)
  })
}

/* ── Live binding ──────────────────────────────────────────────────────── */

/** Last valid frame and live airflow, refreshed on each 1 Hz Display_Tick. */
function useTickFrame(): { frame: DriveFrame | null; airflow: number; seq: number } {
  const store = useTelemetryStore()
  const tick = useDisplayTick()
  const seq = tick?.seq ?? 0
  return useMemo(
    () => ({ frame: store.getSnapshot().frame, airflow: store.live.airflow.get(), seq }),
    // `seq` is the trigger: read the store once per tick.
    [store, seq],
  )
}

/** The last 30 display-tick armature values, oldest first. */
function useTickArmature(): readonly number[] {
  const tick = useDisplayTick()
  const [hist, setHist] = useState<{ seq: number; values: readonly number[] }>({ seq: -1, values: [] })
  if (tick !== null && tick.seq !== hist.seq) {
    setHist({ seq: tick.seq, values: [...hist.values, tick.armature].slice(-30) })
  }
  return hist.values
}

const LIVE = 'Live · store-bound'

/* ── HeatBlobs ─────────────────────────────────────────────────────────── */

function BlobStage({ s }: { s: Pick<Scenario, 'thyristors' | 'ambient'> }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-1">
      <HeatBlobs channels={s.thyristors} ambient={s.ambient} seed={4} className="absolute inset-0 size-full" />
    </div>
  )
}

function LiveHeatBlobs() {
  const { frame } = useTickFrame()
  if (frame === null) return <p className="m-0 text-12 text-text-muted">Waiting for the first frame…</p>
  return <BlobStage s={{ thyristors: frame.thyristors, ambient: frame.ambient_temp }} />
}

export function HeatBlobsSpecimen() {
  return (
    <SpecimenGrid min="16rem">
      {[NORMAL, WARNING, CRITICAL, AMBIENT, FAULT, FAN_OFF].map((s) => (
        <Specimen key={s.label} label={s.label} align="stretch" stageClassName="!p-2">
          <BlobStage s={s} />
        </Specimen>
      ))}
      <Specimen label={LIVE} align="stretch" stageClassName="!p-2">
        <LiveHeatBlobs />
      </Specimen>
    </SpecimenGrid>
  )
}

/* ── IsometricConsole ──────────────────────────────────────────────────── */

const NO_SENSOR = scenario('No healthy sensor · NaN', [90, 90, 90, 90, 90, 90], { fault: 1 })
const NO_SENSOR_ALL: Scenario = {
  ...NO_SENSOR,
  thyristors: NO_SENSOR.thyristors.map((c) => ({ ...c, sensor_healthy: false, status: 'fault' })),
}

export function IsometricConsoleSpecimen() {
  return (
    <SpecimenGrid min="26rem">
      {[NORMAL, WARNING, CRITICAL, AMBIENT, FAULT, NO_SENSOR_ALL, FAN_OFF].map((s) => (
        <Specimen key={s.label} label={s.label} align="stretch" stageClassName="!p-2">
          <IsometricConsole
            hottest={hottest(s)}
            armature={s.armature}
            ambient={s.ambient}
            airflow={s.airflow}
            hottestChannel={hottestId(s)}
          />
        </Specimen>
      ))}
      <Specimen label={LIVE} align="stretch" stageClassName="!p-2">
        <LiveIsometricConsole />
      </Specimen>
    </SpecimenGrid>
  )
}

/* ── BridgeSchematic ───────────────────────────────────────────────────── */

function LiveBridge() {
  const { frame } = useTickFrame()
  const [selected, setSelected] = useState<ChannelId>(1)
  if (frame === null) return <p className="m-0 text-12 text-text-muted">Waiting for the first frame…</p>
  return (
    <BridgeSchematic devices={frame.thyristors} armatureA={frame.armature_current} selected={selected} onSelect={setSelected} />
  )
}

export function BridgeSchematicSpecimen() {
  return (
    <Groups>
      <div className="flex flex-col gap-4">
        <GroupLabel>Full · Drive Detail</GroupLabel>
        <SpecimenGrid min="22rem">
          {[NORMAL, WARNING, CRITICAL, AMBIENT, FAULT].map((s) => (
            <Specimen key={s.label} label={s.label} align="stretch">
              <BridgeSchematic devices={s.thyristors} armatureA={s.armature} />
            </Specimen>
          ))}
          <Specimen label="Selected · T5" align="stretch">
            <BridgeSchematic devices={WARNING.thyristors} armatureA={WARNING.armature} selected={5} />
          </Specimen>
          <Specimen label="Live · click to select" align="stretch">
            <LiveBridge />
          </Specimen>
        </SpecimenGrid>
      </div>
      <div className="flex flex-col gap-4">
        <GroupLabel>Thumbnail · mill cabinet door</GroupLabel>
        <SpecimenGrid min="9rem">
          {[NORMAL, WARNING, CRITICAL, AMBIENT, FAULT].map((s) => (
            <Specimen key={s.label} label={s.label.split(' · ')[0] ?? s.label}>
              <BridgeSchematic devices={s.thyristors} variant="thumbnail" className="max-w-40" />
            </Specimen>
          ))}
        </SpecimenGrid>
      </div>
    </Groups>
  )
}

/* ── FosterLadder ──────────────────────────────────────────────────────── */

function LiveFoster() {
  const { frame } = useTickFrame()
  if (frame === null) return <p className="m-0 text-12 text-text-muted">Waiting for the first frame…</p>
  const id = hottestChannelOf(frame) ?? 1
  const ch = frame.thyristors.find((c) => c.id === id) ?? frame.thyristors[0]
  return <FosterLadder frame={ch} ambient={frame.ambient_temp} />
}

export function FosterLadderSpecimen() {
  return (
    <Groups>
      <div className="flex flex-col gap-4">
        <GroupLabel>Compact · Drive Detail · hottest channel</GroupLabel>
        <SpecimenGrid min="24rem">
          {[NORMAL, WARNING, CRITICAL, AMBIENT].map((s) => (
            <Specimen key={s.label} label={s.label} align="stretch">
              <FosterLadder frame={hottestChannel(s)} ambient={s.ambient} />
            </Specimen>
          ))}
          <Specimen label="Sensor fault · Ths estimated" align="stretch">
            <FosterLadder frame={channel(FAULT, 3)} ambient={FAULT.ambient} />
          </Specimen>
          <Specimen label="Live · hottest channel" align="stretch">
            <LiveFoster />
          </Specimen>
        </SpecimenGrid>
      </div>
      <div className="flex flex-col gap-4">
        <GroupLabel>Annotated · About</GroupLabel>
        <Specimen label="Warning · T5" align="stretch">
          <FosterLadder frame={channel(WARNING, 5)} ambient={WARNING.ambient} variant="annotated" />
        </Specimen>
      </div>
    </Groups>
  )
}

/* ── MillCutaway ───────────────────────────────────────────────────────── */

function LiveMill() {
  const { frame } = useTickFrame()
  const series = useTickArmature()
  if (frame === null) return <p className="m-0 text-12 text-text-muted">Waiting for the first frame…</p>
  return <MillCutaway devices={frame.thyristors} currentSeries={series} />
}

const MILL_STATES = [
  { s: NORMAL, series: currentSeries(NORMAL.armature), label: 'Normal · steady rolling' },
  { s: WARNING, series: currentSeries(740, 28), label: 'Warning · bar bite' },
  { s: CRITICAL, series: currentSeries(CRITICAL.armature), label: CRITICAL.label },
  { s: AMBIENT, series: currentSeries(0), label: 'All ambient · idle' },
  { s: FAULT, series: currentSeries(FAULT.armature), label: FAULT.label },
] as const

export function MillCutawaySpecimen() {
  return (
    <SpecimenGrid min="24rem">
      {MILL_STATES.map((m) => (
        <Specimen key={m.label} label={m.label} align="stretch" stageClassName="!p-2">
          <MillCutaway devices={m.s.thyristors} currentSeries={m.series} />
        </Specimen>
      ))}
      <Specimen label={LIVE} align="stretch" stageClassName="!p-2">
        <LiveMill />
      </Specimen>
    </SpecimenGrid>
  )
}

/* ── AirflowDiagram ────────────────────────────────────────────────────── */

const tjOf = (s: Scenario) => s.thyristors.map((c) => (c.sensor_healthy ? c.tj_estimated : Number.NaN))

function LiveAirflow() {
  const { frame, airflow } = useTickFrame()
  if (frame === null) return <p className="m-0 text-12 text-text-muted">Waiting for the first frame…</p>
  return (
    <AirflowDiagram
      fanStatus={frame.fan_status}
      tj={frame.thyristors.map((c) => (c.sensor_healthy ? c.tj_estimated : Number.NaN))}
      airflow={Number.isFinite(airflow) ? airflow : 1}
      className="h-auto max-w-full"
    />
  )
}

const AIRFLOW_STATES = [
  { s: NORMAL, airflow: 1, label: NORMAL.label },
  { s: WARNING, airflow: 0.55, label: 'Clogging · 55 %' },
  { s: CRITICAL, airflow: 1, label: CRITICAL.label },
  { s: AMBIENT, airflow: 1, label: AMBIENT.label },
  { s: FAULT, airflow: 1, label: FAULT.label },
  { s: FAN_OFF, airflow: 0, label: 'Fan off' },
] as const

export function AirflowDiagramSpecimen() {
  return (
    <SpecimenGrid min="15rem">
      {AIRFLOW_STATES.map((a) => (
        <Specimen key={a.label} label={a.label}>
          <AirflowDiagram fanStatus={a.s.fan} tj={tjOf(a.s)} airflow={a.airflow} className="h-auto max-w-full" />
        </Specimen>
      ))}
      <Specimen label={LIVE}>
        <LiveAirflow />
      </Specimen>
    </SpecimenGrid>
  )
}

