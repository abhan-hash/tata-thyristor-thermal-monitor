import { motion, useTransform, type MotionValue } from 'motion/react'
import { useMemo, useRef, type CSSProperties } from 'react'
import { thresholdBands } from '../../charts/chartTheme'
import { CurrentChart } from '../../charts/CurrentChart'
import { CrosshairProvider } from '../../charts/sharedCrosshair'
import { TransientChart } from '../../charts/TransientChart'
import { useChannel, useFrame, useIsStale, useLiveValue, useSeries } from '../../data/hooks'
import { useChannelSelection } from '../../data/selection'
import {
  DELTA_K_SPEC,
  formatValueFlush,
  POWER_W_SPEC,
  TEMP_C_SPEC,
  THERMAL_RES_KW_SPEC,
  type FormatSpec,
} from '../../domain/format'
import { statusFor } from '../../domain/status'
import type { ChannelId, DriveFrame, Status, ThyristorFrame } from '../../domain/types'
import { cx } from '../../kit/controlStyles'
import { CropPanel } from '../../kit/CropPanel'
import { FilterChip } from '../../kit/FilterChip'
import { HeroLockup } from '../../kit/HeroLockup'
import { KpiTile } from '../../kit/KpiTile'
import { RegionErrorBoundary } from '../../kit/RegionErrorBoundary'
import { StatusChip } from '../../kit/StatusChip'
import { AnimatedNumber } from '../../motion/AnimatedNumber'
import { useEntrance } from '../../motion/useEntrance'
import { useUiStore } from '../../state/uiStore'
import { BridgeSchematic } from '../../visuals/bridge/BridgeSchematic'
import { FosterLadder } from '../../visuals/foster/FosterLadder'
import {
  marginSeries,
  seriesDelta,
  SPARK_WINDOW_S,
  tripFill,
  useChannelMotion,
  useChartWindow,
  useElementWidth,
  useRecentSamples,
  WINDOW_OPTIONS,
} from './driveDetailModel'

/* Stable field pickers for the per-frame MotionValues. */
const pickPower = (ch: ThyristorFrame) => ch.power_loss
const pickResidual = (ch: ThyristorFrame) => ch.residual
const pickRsa = (ch: ThyristorFrame) => ch.r_sa
const pickStatus = (ch: ThyristorFrame | null): Status => ch?.status ?? 'fault'
const pickHealthy = (ch: ThyristorFrame | null) => ch?.sensor_healthy ?? false
const pickHeatsink = (ch: ThyristorFrame | null) => ch?.t_heatsink_measured ?? Number.NaN
const pickResidualValue = (ch: ThyristorFrame | null) => ch?.residual ?? Number.NaN
const pickDevices = (f: DriveFrame | null) => f?.thyristors ?? null
const pickArmature = (f: DriveFrame | null) => f?.armature_current ?? Number.NaN
const pickAmbient = (f: DriveFrame | null) => f?.ambient_temp ?? Number.NaN

/** Lower end of the margin-to-trip bar, °C (a cold drive). */
const BAR_FLOOR_C = 25

const MICRO = 'text-11 font-[600] tracking-[0.24em] text-text-muted uppercase [font-stretch:125%]'

const PAGE_VARS = {
  '--drive-tj-size': 'clamp(64px, 3rem + 3.4vw, 96px)',
} as CSSProperties

/** Readout text without the Formatter's leading pad, sign next to the digits. */
function trimmed(v: number, spec: FormatSpec): string {
  return formatValueFlush(v, spec)
}

/* ── Focal readout: 96 px Tj, status, margin-to-trip bar ─────────────── */

function TjReadout({ channel }: { channel: ChannelId }) {
  const tj = useLiveValue(`tj.${channel}` as const)
  const status = useChannel(channel, pickStatus)
  const junction = useUiStore((s) => s.saved.thresholds.junction_temp)
  const trip = junction.critical
  const fault = status === 'fault'
  const fill = useTransform(tj, (v) => tripFill(v, trip, BAR_FLOOR_C))
  const warnAt = tripFill(junction.warning, trip, BAR_FLOOR_C)
  const tone =
    status === 'critical'
      ? 'bg-status-critical'
      : status === 'warning'
        ? 'bg-status-warning'
        : 'bg-accent'
  return (
    <section
      aria-label={`T${String(channel)} junction temperature`}
      data-part="drive-readout"
      className="flex h-full flex-col justify-between gap-8 rounded-3 bg-surface-panel p-6 lg:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={MICRO}>Selected · T{channel}</span>
        <StatusChip status={status} />
      </div>
      <div>
        <p className="m-0 text-14 font-[600] text-text-secondary">Estimated junction</p>
        <p className="m-0 mt-2 flex items-baseline gap-2 leading-none" data-testid="drive-tj">
          <AnimatedNumber
            value={tj}
            format={(v) => trimmed(fault ? Number.NaN : v, TEMP_C_SPEC)}
            data-part="drive-tj-value"
            className="text-[length:var(--drive-tj-size)] font-[800] tracking-[-0.01em] tabular-nums [font-stretch:106%]"
          />
          <span className="text-[length:calc(var(--drive-tj-size)*0.4)] font-[700] text-text-secondary">°C</span>
        </p>
      </div>
      <div className="flex flex-col gap-3" data-part="margin-to-trip">
        <div className="flex items-baseline justify-between gap-3">
          <span className={MICRO}>Margin to trip</span>
          <span className="num text-16 font-[700] tabular-nums">
            <AnimatedNumber
              value={tj}
              format={(v) => trimmed(fault ? Number.NaN : trip - v, DELTA_K_SPEC)}
              data-testid="drive-margin"
            />{' '}
            <span className="text-12 text-text-secondary">K</span>
          </span>
        </div>
        <div
          role="meter"
          aria-label="Junction temperature toward trip"
          aria-valuemin={BAR_FLOOR_C}
          aria-valuemax={trip}
          aria-valuenow={Number.isFinite(tj.get()) ? Math.round(tj.get()) : BAR_FLOOR_C}
          className="relative h-2 overflow-hidden rounded-pill bg-surface-sunken"
        >
          <motion.div
            aria-hidden="true"
            style={{ scaleX: fault ? 0 : fill }}
            className={cx('absolute inset-0 origin-left rounded-pill', tone)}
          />
          <span
            aria-hidden="true"
            className="absolute inset-y-0 w-0.5 bg-status-warning"
            style={{ left: `${String(warnAt * 100)}%` }}
          />
        </div>
        <div className={cx(MICRO, 'flex justify-between tracking-[0.16em]')}>
          <span>{BAR_FLOOR_C} °C</span>
          <span>Warn {junction.warning}</span>
          <span>Trip {trip} °C</span>
        </div>
      </div>
    </section>
  )
}

/* ── Bridge schematic ───────────────────────────────────────────────── */

function BridgePanel({ selected, onSelect }: { selected: ChannelId; onSelect: (id: ChannelId) => void }) {
  const devices = useFrame(pickDevices)
  const armature = useFrame(pickArmature)
  return (
    <CropPanel
      tone="raised"
      accentBrackets
      labels={[
        { edge: 'top', text: 'Six-pulse bridge', align: 'start' },
        { edge: 'bottom', text: `Selected T${String(selected)}`, align: 'end' },
      ]}
      className="h-full p-4 lg:p-8"
      data-part="drive-bridge"
    >
      <BridgeSchematic
        devices={devices ?? []}
        selected={selected}
        onSelect={onSelect}
        {...(Number.isFinite(armature) ? { armatureA: armature } : {})}
        className="block h-auto w-full"
      />
    </CropPanel>
  )
}

/* ── KPI strip ──────────────────────────────────────────────────────── */

function KpiStrip({ channel }: { channel: ChannelId }) {
  const thresholds = useUiStore((s) => s.saved.thresholds)
  const status = useChannel(channel, pickStatus)
  const healthy = useChannel(channel, pickHealthy)
  const heatsinkNow = useChannel(channel, pickHeatsink)
  const residualNow = useChannel(channel, pickResidualValue)
  const trip = thresholds.junction_temp.critical

  const tj = useLiveValue(`tj.${channel}` as const)
  const heatsink = useLiveValue(`heatsink.${channel}` as const)
  const power = useChannelMotion(channel, pickPower)
  const residual = useChannelMotion(channel, pickResidual)
  const rsa = useChannelMotion(channel, pickRsa)
  const margin = useTransform(tj, (v) => trip - v)

  const tjS = useSeries(channel, 'tj', SPARK_WINDOW_S).v
  const hsS = useSeries(channel, 'heatsink', SPARK_WINDOW_S).v
  const powerS = useSeries(channel, 'power', SPARK_WINDOW_S).v
  const residualS = useSeries(channel, 'residual', SPARK_WINDOW_S).v
  const rsaS = useRecentSamples(channel, pickRsa)
  const marginS = useMemo(() => marginSeries(tjS, trip), [tjS, trip])

  const tjBands = useMemo(() => thresholdBands(thresholds.junction_temp, '°C'), [thresholds.junction_temp])
  const sensor: Status | undefined = healthy ? undefined : 'fault'
  const stale = useIsStale()
  const hsStatus = sensor ?? statusFor(heatsinkNow, thresholds.heatsink_temp)
  const residualStatus = sensor ?? statusFor(residualNow, thresholds.cooling_residual)

  const tiles: readonly {
    key: string
    label: string
    value: MotionValue<number>
    spec: FormatSpec
    series: Float32Array
    status?: Status
    bands?: ReturnType<typeof thresholdBands>
  }[] = [
    { key: 'tj', label: 'Junction Tj', value: tj, spec: TEMP_C_SPEC, series: tjS, status, bands: tjBands },
    { key: 'heatsink', label: 'Heatsink', value: heatsink, spec: TEMP_C_SPEC, series: hsS, status: hsStatus },
    { key: 'power', label: 'Power loss', value: power, spec: POWER_W_SPEC, series: powerS },
    {
      key: 'residual',
      label: 'Cooling residual',
      value: residual,
      spec: DELTA_K_SPEC,
      series: residualS,
      status: residualStatus,
    },
    {
      key: 'rsa',
      label: 'R_sa',
      value: rsa,
      spec: THERMAL_RES_KW_SPEC,
      series: rsaS,
      ...(sensor ? { status: sensor } : {}),
    },
    { key: 'margin', label: 'Margin to trip', value: margin, spec: DELTA_K_SPEC, series: marginS },
  ]

  return (
    <section
      aria-label={`T${String(channel)} live readings`}
      data-part="drive-kpis"
      className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 wide:grid-cols-6"
    >
      {tiles.map((t) => (
        <KpiTile
          key={t.key}
          label={t.label}
          value={t.value}
          spec={t.spec}
          series={t.series}
          delta={seriesDelta(t.series)}
          deltaLabel="60 S"
          stale={stale}
          {...(t.status ? { status: t.status } : {})}
          {...(t.bands ? { bands: t.bands } : {})}
        />
      ))}
    </section>
  )
}

/* ── Stacked charts with a shared crosshair ─────────────────────────── */

function ChartsPanel({ channel, windowS }: { channel: ChannelId; windowS: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const width = useElementWidth(ref, 720)
  const narrow = width < 560
  return (
    <section
      aria-label="Transient and current charts"
      data-part="drive-charts"
      data-window={windowS}
      className="flex h-full flex-col gap-6 rounded-3 bg-surface-panel p-4 lg:p-6"
    >
      <div ref={ref} className="flex min-w-0 flex-col gap-6">
        <CrosshairProvider>
          <TransientChart channel={channel} windowS={windowS} width={width} height={narrow ? 220 : 280} />
          <CurrentChart windowS={windowS} width={width} height={narrow ? 150 : 180} />
        </CrosshairProvider>
      </div>
    </section>
  )
}

/* ── Foster ladder ──────────────────────────────────────────────────── */

function FosterPanel({ channel }: { channel: ChannelId }) {
  const frame = useChannel(channel)
  const ambient = useFrame(pickAmbient)
  const power = useChannelMotion(channel, pickPower)
  return (
    <CropPanel
      tone="panel"
      labels={[{ edge: 'top', text: `Foster model · T${String(channel)}`, align: 'start' }]}
      className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:gap-10 lg:p-8"
      data-part="drive-foster"
    >
      <div className="lg:max-w-[18rem] lg:shrink-0">
        <h2 className="m-0 text-20 leading-tight font-[800] text-accent [font-stretch:112%]">Heat path</h2>
        <p className="m-0 mt-1 text-12 leading-snug text-text-secondary">
          Junction to air through three RC stages. Dash speed follows the live power loss.
        </p>
      </div>
      {frame ? (
        <FosterLadder
          frame={frame}
          ambient={Number.isFinite(ambient) ? ambient : 25}
          power={power}
          variant="compact"
          className="mx-auto w-full max-w-[52rem] min-w-0 flex-1"
        />
      ) : (
        <p className="m-0 text-14 text-text-muted">Waiting for the first frame.</p>
      )}
    </CropPanel>
  )
}

/* ── Page ───────────────────────────────────────────────────────────── */

/**
 * Drive Detail at `/drive` (Requirement 25): the bridge schematic as the focal
 * point beside a 96 px Tj readout for the `?ch=` channel, a live KPI strip,
 * the stacked transient and current charts (`?window=60|300`) and the
 * selected channel's Foster ladder. Each region fails on its own.
 */
export function DriveDetailPage() {
  const { selected, select } = useChannelSelection()
  const [windowS, setWindow] = useChartWindow()
  const entrance = useEntrance('drive')

  const secondary = (
    <div className="flex flex-col gap-2">
      <span className={MICRO}>Chart window</span>
      <div role="group" aria-label="Chart window" className="flex gap-2">
        {WINDOW_OPTIONS.map((w) => (
          <FilterChip
            key={w}
            label={`${String(w)} S`}
            selected={windowS === w}
            onToggle={() => {
              setWindow(w)
            }}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className="layout-page flex flex-col gap-8 py-8" style={PAGE_VARS} data-page="drive-detail">
      <motion.div {...entrance.slot('hero')}>
        <HeroLockup title="DRIVE" subtitle={`Thyristor T${String(selected)} · Stand-04`} secondary={secondary} />
      </motion.div>

      <div className="layout-grid items-stretch">
        <motion.div className="lg:col-span-5 wide:col-span-7" {...entrance.slot('visual')}>
          <RegionErrorBoundary region="bridge">
            <BridgePanel selected={selected} onSelect={select} />
          </RegionErrorBoundary>
        </motion.div>
        <motion.div className="lg:col-span-3 wide:col-span-5" {...entrance.slot('secondary')}>
          <RegionErrorBoundary region="readout">
            <TjReadout channel={selected} />
          </RegionErrorBoundary>
        </motion.div>

        <motion.div {...entrance.slot('secondary')}>
          <RegionErrorBoundary region="kpis">
            <KpiStrip channel={selected} />
          </RegionErrorBoundary>
        </motion.div>

        <motion.div {...entrance.slot('secondary')}>
          <RegionErrorBoundary region="charts">
            <ChartsPanel channel={selected} windowS={windowS} />
          </RegionErrorBoundary>
        </motion.div>
        <motion.div {...entrance.slot('secondary')}>
          <RegionErrorBoundary region="foster">
            <FosterPanel channel={selected} />
          </RegionErrorBoundary>
        </motion.div>
      </div>
    </div>
  )
}
