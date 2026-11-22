import { useMotionValueEvent } from 'motion/react'
import { useMemo, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { formatCurrentA, formatTempC, formatValue, PLACEHOLDER, TEMP_C_SPEC } from '../../domain/format'
import { heatStopIndex, heatToken } from '../../domain/heatScale'
import type { ChannelId, Status, ThyristorFrame } from '../../domain/types'
import { StatusIcon } from '../../kit/icons/StatusIcon'
import { STATUS_LABEL } from '../../kit/StatusChip'
import { useHeatFill } from '../../motion/useHeatFill'
import { HeatDefs, useHeatDefIds, svgUrl } from '../heat/HeatDefs'

/**
 * Bridge_Schematic (Requirement 17), built from art-direction sketch
 * `bridge-a`: a textbook 6-pulse Graetz bridge. L1–L3 enter on the left, each
 * leg carries an upper and a lower thyristor between the DC bus rails, and
 * the bus feeds the armature on the right.
 *
 * Each device is filled with the heat stop of its Tj and carries a badge with
 * id, tabular Tj, a status icon and the status word, so status never relies
 * on colour (Requirement 21.1). Devices at heat stop 7 or 8 get a wide
 * `--heat-5` halo and a 1 px `--heat-5` inner rim, so the darker maroon
 * stops never read cooler than a warning device (SELECTION.md fix).
 *
 * Focus (dotted ring) and selection (gold crop brackets + `?ch=` tag) are
 * separate treatments, so keyboard focus and the selected channel stay
 * distinguishable. The `thumbnail` variant keeps the topology and heat fills
 * but drops badges, labels and interactivity (mill cabinet door).
 */

/**
 * The per-device data the schematic needs; a decoded `ThyristorFrame` fits.
 * `sensor_healthy: false` forces the sensor-fault treatment (Requirement 21.1).
 */
export type BridgeDevice = Pick<ThyristorFrame, 'id' | 'tj_estimated' | 'status'> &
  Partial<Pick<ThyristorFrame, 'sensor_healthy'>>

export type BridgeVariant = 'full' | 'thumbnail'

export interface BridgeSchematicProps {
  /** T1–T6 readings. Missing ids render as sensor fault. */
  devices: readonly BridgeDevice[]
  /** Highlighted channel (from `?ch=`). */
  selected?: ChannelId
  /** Called on click, Enter or Space on a device. */
  onSelect?: (id: ChannelId) => void
  /** Live armature current in A, shown beside the motor. */
  armatureA?: number
  /** `thumbnail` draws the topology only, without badges or focus stops. Default `full`. */
  variant?: BridgeVariant
  className?: string
}

/* ── Geometry (sketch coordinates, bridge-a.svg) ─────────────────────────── */

const VIEW_BOX = '30 195 1000 535'
const THUMB_VIEW_BOX = '60 210 920 500'
const BUS_TOP = 230
const BUS_BOTTOM = 690
const HALF_W = 30
/** Cathode bar (apex) and anode (base) y of the upper and lower rows. */
const ROW = {
  upper: { apex: 324, base: 376 },
  lower: { apex: 544, base: 596 },
} as const
type Row = keyof typeof ROW

interface Leg {
  x: number
  phase: 'L1' | 'L2' | 'L3'
  /** y where the phase wire meets the leg midpoint. */
  tapY: number
  /** y of the phase source symbol. */
  sourceY: number
  upper: ChannelId
  lower: ChannelId
}

/** Graetz numbering: T1/T4 on L1, T3/T6 on L2, T5/T2 on L3 (firing order 1…6). */
const LEGS: readonly Leg[] = [
  { x: 250, phase: 'L1', tapY: 440, sourceY: 380, upper: 1, lower: 4 },
  { x: 475, phase: 'L2', tapY: 460, sourceY: 460, upper: 3, lower: 6 },
  { x: 700, phase: 'L3', tapY: 480, sourceY: 540, upper: 5, lower: 2 },
]

const SOURCE_X = 100
const MOTOR = { x: 920, y: 460, r: 34 }
const BADGE = { dx: 40, dy: 6, w: 140, h: 52 }
/** Selection brackets and focus ring around device + badge. */
const FRAME = { left: 46, right: 186, top: 24, bottom: 32 }

const ALL_IDS: readonly ChannelId[] = [1, 2, 3, 4, 5, 6]

function placement(id: ChannelId): { x: number; row: Row } {
  for (const leg of LEGS) {
    if (leg.upper === id) return { x: leg.x, row: 'upper' }
    if (leg.lower === id) return { x: leg.x, row: 'lower' }
  }
  return { x: LEGS[0]?.x ?? 0, row: 'upper' }
}

const trianglePath = (x: number, row: Row) =>
  `M${x - HALF_W} ${ROW[row].base}H${x + HALF_W}L${x} ${ROW[row].apex}Z`

/* ── Pure helpers (exported for tests) ───────────────────────────────────── */

/** Heat stops at or above this get the critical halo and rim. */
export const HALO_STOP = 7

export type DeviceTreatment =
  | { kind: 'fault' }
  | { kind: 'heat'; stop: number; fill: string; glow: 'normal' | 'warning' | 'halo' }

/** Fill and glow for one device. Unhealthy or non-finite readings never get a heat colour. */
export function deviceTreatment(tj: number, status: Status): DeviceTreatment {
  if (status === 'fault' || !Number.isFinite(tj)) return { kind: 'fault' }
  const stop = heatStopIndex(tj)
  const glow = stop >= HALO_STOP || status === 'critical' ? 'halo' : status === 'warning' ? 'warning' : 'normal'
  return { kind: 'heat', stop, fill: heatToken(stop), glow }
}

/** Accessible name, e.g. "T3, 112.6 °C, WARNING" or "T6, SENSOR FAULT". */
export function deviceLabel(id: ChannelId, tj: number, status: Status): string {
  if (status === 'fault' || !Number.isFinite(tj)) return `T${id}, ${STATUS_LABEL.fault}`
  return `T${id}, ${formatTempC(tj).trim()}, ${STATUS_LABEL[status]}`
}

/** Status shown for a device: `fault` for an unhealthy sensor or a non-finite Tj, else its own status. */
export function deviceStatus(device: BridgeDevice): Status {
  if (device.sensor_healthy === false || !Number.isFinite(device.tj_estimated)) return 'fault'
  return device.status
}

/**
 * Normalises the device list to T1–T6 in id order. Missing ids, unhealthy
 * sensors and non-finite readings all become sensor faults, so every part of
 * the schematic agrees on the fault treatment.
 */
export function normaliseDevices(devices: readonly BridgeDevice[]): Readonly<Record<ChannelId, BridgeDevice>> {
  const out = {} as Record<ChannelId, BridgeDevice>
  for (const id of ALL_IDS) {
    const d = devices.find((x) => x.id === id)
    out[id] = d === undefined ? { id, tj_estimated: Number.NaN, status: 'fault' } : { ...d, status: deviceStatus(d) }
  }
  return out
}

/* ── Styles ──────────────────────────────────────────────────────────────── */

const WIRE = 'var(--text-secondary)'
/* font-stretch is set through a class: the React style key is deprecated. */
const WIDE = '[font-stretch:var(--font-label-width)]'
const LABEL: CSSProperties = {
  fontWeight: 'var(--font-label-weight)',
  letterSpacing: 'var(--font-label-tracking)',
  textTransform: 'uppercase',
}
const STATUS_WORD: CSSProperties = {
  fontWeight: 'var(--font-label-weight)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}
const NUM: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontWeight: 600 }

const STATUS_COLOR: Readonly<Record<Status, string>> = {
  normal: 'var(--status-normal)',
  warning: 'var(--status-warning)',
  critical: 'var(--status-critical-text)',
  fault: 'var(--status-fault)',
}

interface LocalIds {
  glow: string
  glowTight: string
  halo: string
}

/* ── Static topology ─────────────────────────────────────────────────────── */

function Topology({ thumbnail }: { thumbnail: boolean }) {
  const stroke = { stroke: WIRE, strokeWidth: 2, fill: 'none' } as const
  return (
    <g aria-hidden="true" data-part="topology">
      {/* DC bus rails into the armature. */}
      <path d={`M${LEGS[0]?.x ?? 0} ${BUS_TOP}H${MOTOR.x}V${MOTOR.y - MOTOR.r}`} style={stroke} />
      <path d={`M${MOTOR.x} ${MOTOR.y + MOTOR.r}V${BUS_BOTTOM}H${LEGS[0]?.x ?? 0}`} style={stroke} />
      {LEGS.map((leg, i) => {
        // Phase wire with a hop over every leg it crosses.
        let wire = `M${SOURCE_X + 50} ${leg.tapY}`
        for (const prev of LEGS.slice(0, i)) wire += `H${prev.x - 8}a8 8 0 0 1 16 0`
        wire += `H${leg.x}`
        return (
          <g key={leg.phase}>
            <path
              d={`M${leg.x} ${BUS_TOP}V${ROW.upper.apex}M${leg.x} ${ROW.upper.base}V${ROW.lower.apex}M${leg.x} ${ROW.lower.base}V${BUS_BOTTOM}`}
              style={stroke}
            />
            <path d={`M${SOURCE_X + 15} ${leg.sourceY}H${SOURCE_X + 30}V${leg.tapY}H${SOURCE_X + 50}`} style={stroke} />
            <path d={wire} style={stroke} />
            {[BUS_TOP, BUS_BOTTOM, leg.tapY].map((y) => (
              <circle key={y} cx={leg.x} cy={y} r={4} style={{ fill: WIRE }} />
            ))}
            <circle
              cx={SOURCE_X}
              cy={leg.sourceY}
              r={15}
              style={{ fill: 'var(--surface-raised)', stroke: WIRE, strokeWidth: 1.5 }}
            />
            <path
              d={`M${SOURCE_X - 9} ${leg.sourceY}c3-9 6-9 9 0s6 9 9 0`}
              style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 1.5 }}
            />
            {!thumbnail && (
              <text
                x={SOURCE_X - 26}
                y={leg.sourceY + 4}
                textAnchor="end"
                fontSize={12}
                className={WIDE} style={{ ...LABEL, fill: 'var(--text-primary)' }}
              >
                {leg.phase}
              </text>
            )}
          </g>
        )
      })}
      <circle
        cx={MOTOR.x}
        cy={MOTOR.y}
        r={MOTOR.r}
        style={{ fill: 'var(--surface-raised)', stroke: WIRE, strokeWidth: 2 }}
      />
      {!thumbnail && (
        <>
          <text
            x={MOTOR.x}
            y={MOTOR.y + 6}
            textAnchor="middle"
            fontSize={17}
            style={{ fontWeight: 'var(--font-display-weight)', fill: 'var(--text-primary)' }}
          >
            M
          </text>
          <text x={320} y={BUS_TOP - 12} fontSize={10} className={WIDE} style={{ ...LABEL, fill: 'var(--text-muted)' }}>
            DC BUS +
          </text>
          <text x={320} y={BUS_BOTTOM + 22} fontSize={10} className={WIDE} style={{ ...LABEL, fill: 'var(--text-muted)' }}>
            DC BUS −
          </text>
        </>
      )}
    </g>
  )
}

/* ── Device ──────────────────────────────────────────────────────────────── */

interface DeviceProps {
  device: BridgeDevice
  selected: boolean
  thumbnail: boolean
  ids: { hatch: string; local: LocalIds }
  onSelect: ((id: ChannelId) => void) | undefined
}

function DeviceSymbol({ device, thumbnail, ids }: Omit<DeviceProps, 'selected' | 'onSelect'>) {
  const { x, row } = placement(device.id)
  const d = trianglePath(x, row)
  const t = deviceTreatment(device.tj_estimated, device.status)
  // Fill tweens between heat stops in heat-scale space (Requirement 33.2); at rest it is `t.fill`.
  const fill = useHeatFill(device.tj_estimated)
  // Written to `style.fill` (not the attribute), so `var()` and `color-mix()` resolve.
  const glowRef = useRef<SVGPathElement>(null)
  const bodyRef = useRef<SVGPathElement>(null)
  useMotionValueEvent(fill, 'change', (v) => {
    glowRef.current?.style.setProperty('fill', v)
    bodyRef.current?.style.setProperty('fill', v)
  })
  const { apex, base } = ROW[row]
  // Incentre of the triangle, for the inset rim.
  const side = Math.hypot(HALF_W, base - apex)
  const inradius = (HALF_W * (base - apex)) / (HALF_W + side)
  const rimScale = (inradius - 0.75) / inradius
  const cy = base - inradius

  return (
    <g data-part="device" data-heat-stop={t.kind === 'heat' ? t.stop : 'fault'}>
      {t.kind === 'fault' ? (
        <path
          d={d}
          data-part="body"
          style={{
            fill: svgUrl(ids.hatch),
            stroke: 'var(--status-fault)',
            strokeWidth: 1.5,
            strokeDasharray: '5 3',
          }}
        />
      ) : (
        <>
          {t.glow === 'halo' ? (
            // Pulses only while the channel is critical (Requirements 33.3, 33.4).
            <g data-part="halo-group" className={device.status === 'critical' ? 'motion-critical-pulse' : undefined}>
              {/* Critical fix: a wide, bright --heat-5 halo so maroon never reads cool. */}
              <path
                d={d}
                data-part="halo"
                filter={svgUrl(ids.local.halo)}
                opacity={0.9}
                style={{ fill: 'var(--heat-5)' }}
              />
              <path d={d} filter={svgUrl(ids.local.glowTight)} opacity={0.75} style={{ fill: 'var(--heat-5)' }} />
            </g>
          ) : (
            <path
              ref={glowRef}
              d={d}
              data-part="glow"
              filter={svgUrl(ids.local.glow)}
              opacity={t.glow === 'warning' ? 0.6 : 0.35}
              style={{ fill: fill.get() }}
            />
          )}
          <path
            ref={bodyRef}
            d={d}
            data-part="body"
            style={{
              fill: fill.get(),
              stroke: 'var(--surface-page)',
              strokeOpacity: 0.4,
              strokeWidth: 1.5,
            }}
          />
          {t.glow === 'halo' && (
            <path
              d={d}
              data-part="rim"
              transform={`translate(${x} ${cy}) scale(${rimScale}) translate(${-x} ${-cy})`}
              vectorEffect="non-scaling-stroke"
              style={{ fill: 'none', stroke: 'var(--heat-5)', strokeWidth: 1 }}
            />
          )}
        </>
      )}
      {/* Cathode bar and gate lead. */}
      <line
        x1={x - HALF_W}
        y1={apex}
        x2={x + HALF_W}
        y2={apex}
        style={{ stroke: 'var(--text-primary)', strokeWidth: 3 }}
      />
      <path
        d={`M${x + 8} ${apex + 14}L${x + 30} ${apex - 8}H${x + 42}`}
        style={{ fill: 'none', stroke: WIRE, strokeWidth: 1.5 }}
      />
      {!thumbnail && (
        <text x={x + 46} y={apex - 4} fontSize={10} className={WIDE} style={{ ...LABEL, fill: 'var(--text-muted)' }}>
          {`G${device.id}`}
        </text>
      )}
      {thumbnail && device.status !== 'normal' && (
        // Thumbnail keeps the status shape so colour is still not the only cue.
        <g
          transform={`translate(${x + 38} ${apex + 6})`}
          style={{ color: STATUS_COLOR[device.status] }}
          data-status={device.status}
        >
          <StatusIcon status={device.status} size={36} />
        </g>
      )}
    </g>
  )
}

function Badge({ device }: { device: BridgeDevice }) {
  const { x, row } = placement(device.id)
  const status = device.status === 'fault' || !Number.isFinite(device.tj_estimated) ? 'fault' : device.status
  const fault = status === 'fault'
  // A faulted sensor never shows a number, even if the frame still carries one.
  const value = fault ? PLACEHOLDER : formatValue(device.tj_estimated, TEMP_C_SPEC).trim()
  return (
    <g transform={`translate(${x + BADGE.dx} ${ROW[row].apex + BADGE.dy})`} data-part="badge">
      <rect
        width={BADGE.w}
        height={BADGE.h}
        rx={3}
        style={{ fill: 'var(--surface-raised)', stroke: 'var(--line-subtle)', strokeWidth: 1 }}
      />
      <text x={12} y={21} fontSize={14} className="num" style={{ ...NUM, fill: 'var(--text-primary)' }}>
        {`T${device.id}`}
      </text>
      <text
        x={BADGE.w - 12}
        y={21}
        fontSize={17}
        textAnchor="end"
        className="num"
        style={{ ...NUM, fill: fault ? 'var(--text-muted)' : 'var(--text-primary)' }}
      >
        {value}
        {!fault && (
          <tspan fontSize={11} style={{ fill: 'var(--text-muted)' }}>
            {' °C'}
          </tspan>
        )}
      </text>
      <g transform="translate(12 30)" style={{ color: STATUS_COLOR[status] }}>
        <StatusIcon status={status} size={14} />
      </g>
      <text x={32} y={41.5} fontSize={10} style={{ ...STATUS_WORD, fill: STATUS_COLOR[status] }}>
        {STATUS_LABEL[status]}
      </text>
    </g>
  )
}

function SelectionMark({ id }: { id: ChannelId }) {
  const { x, row } = placement(id)
  const top = ROW[row].apex - FRAME.top
  const bottom = ROW[row].base + FRAME.bottom
  const l = x - FRAME.left
  const r = x + FRAME.right
  const len = 14
  const d = [
    `M${l} ${top + len}V${top}H${l + len}`,
    `M${r - len} ${top}H${r}V${top + len}`,
    `M${r} ${bottom - len}V${bottom}H${r - len}`,
    `M${l + len} ${bottom}H${l}V${bottom - len}`,
  ].join('')
  const tagY = row === 'upper' ? top - 24 : bottom + 6
  return (
    <g aria-hidden="true" data-part="selection" pointerEvents="none">
      <path d={d} style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 1.6 }} />
      <rect x={l} y={tagY} width={74} height={18} rx={2} style={{ fill: 'var(--accent)' }} />
      <text x={l + 7} y={tagY + 13} fontSize={9.5} className={WIDE} style={{ ...LABEL, letterSpacing: '0.2em', fill: 'var(--on-accent)' }}>
        {`?CH=${id}`}
      </text>
    </g>
  )
}

function InteractiveDevice({ device, selected, ids, onSelect }: Omit<DeviceProps, 'thumbnail'>) {
  const { x, row } = placement(device.id)
  const status = device.status === 'fault' || !Number.isFinite(device.tj_estimated) ? 'fault' : device.status
  const hit = {
    x: x - FRAME.left + 6,
    y: ROW[row].apex - FRAME.top + 6,
    width: FRAME.left + FRAME.right - 12,
    height: ROW[row].base - ROW[row].apex + FRAME.top + FRAME.bottom - 12,
  }
  const activate = () => onSelect?.(device.id)
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      activate()
    }
  }
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={deviceLabel(device.id, device.tj_estimated, status)}
      aria-pressed={selected}
      data-channel={device.id}
      data-status={status}
      data-selected={selected || undefined}
      className="group cursor-pointer outline-none"
      onClick={activate}
      onKeyDown={onKeyDown}
    >
      <rect {...hit} rx={6} style={{ fill: 'transparent' }} />
      <g aria-hidden="true">
        <DeviceSymbol device={device} thumbnail={false} ids={ids} />
        <Badge device={device} />
      </g>
      {/* Focus ring: dotted, separate from the gold selection brackets. */}
      <rect
        {...hit}
        rx={6}
        data-part="focus-ring"
        className="opacity-0 group-focus-visible:opacity-100"
        style={{
          fill: 'none',
          stroke: 'var(--focus-ring-color)',
          strokeWidth: 'var(--focus-ring-width)',
          strokeDasharray: '3 3',
        }}
      />
    </g>
  )
}

/* ── Component ───────────────────────────────────────────────────────────── */

export function BridgeSchematic({
  devices,
  selected,
  onSelect,
  armatureA,
  variant = 'full',
  className,
}: BridgeSchematicProps) {
  const heatIds = useHeatDefIds()
  const ids = useMemo(() => {
    const base = heatIds.linear.replace(/-linear$/, '')
    return {
      hatch: heatIds.faultHatch,
      local: { glow: `${base}-bridge-glow`, glowTight: `${base}-bridge-glow-tight`, halo: `${base}-bridge-halo` },
    }
  }, [heatIds])
  const byId = normaliseDevices(devices)
  const thumbnail = variant === 'thumbnail'
  const ordered = ALL_IDS.map((id) => byId[id])

  const defs = (
    <>
      <HeatDefs ids={heatIds} />
      <defs>
        <filter id={ids.local.glow} x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={ids.local.glowTight} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={ids.local.halo} x="-150%" y="-150%" width="400%" height="400%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
    </>
  )

  if (thumbnail) {
    const summary = ordered
      .map((d) => `T${d.id} ${STATUS_LABEL[deviceTreatment(d.tj_estimated, d.status).kind === 'fault' ? 'fault' : d.status]}`)
      .join(', ')
    return (
      <svg
        viewBox={THUMB_VIEW_BOX}
        role="img"
        aria-label={`Thyristor bridge: ${summary}`}
        data-variant="thumbnail"
        className={className}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        {defs}
        <Topology thumbnail />
        {ordered.map((d) => (
          <DeviceSymbol key={d.id} device={d} thumbnail ids={ids} />
        ))}
      </svg>
    )
  }

  return (
    <svg
      viewBox={VIEW_BOX}
      role="group"
      aria-label="Thyristor bridge, 6-pulse"
      data-variant="full"
      className={className}
      style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
    >
      {defs}
      <Topology thumbnail={false} />
      {armatureA !== undefined && (
        <g aria-hidden="true" data-part="armature">
          <text x={MOTOR.x + 12} y={MOTOR.y + 62} fontSize={9} className={WIDE} style={{ ...LABEL, fill: 'var(--text-muted)' }}>
            ARMATURE
          </text>
          <text x={MOTOR.x + 12} y={MOTOR.y + 80} fontSize={13} className="num" style={{ ...NUM, fill: 'var(--text-secondary)' }}>
            {formatCurrentA(armatureA).trim()}
          </text>
        </g>
      )}
      {selected !== undefined && <SelectionMark id={selected} />}
      {ordered.map((d) => (
        <InteractiveDevice key={d.id} device={d} selected={d.id === selected} ids={ids} onSelect={onSelect} />
      ))}
    </svg>
  )
}
