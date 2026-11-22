import { useReducedMotion } from 'motion/react'
import { useEffect, useId, useMemo, useRef } from 'react'
import { formatTempC } from '../../domain/format'
import { heatStopIndex, heatToken } from '../../domain/heatScale'
import { statusFor } from '../../domain/status'
import { DEFAULT_THRESHOLDS } from '../../domain/thresholds'
import type { Status } from '../../domain/types'
import { StatusIcon } from '../../kit/icons/StatusIcon'
import {
  airflowFraction,
  airflowLanes,
  BLADE_RPS_FULL,
  bloomStops,
  exchangerFill,
  laneKeyframes,
  PARTICLE_SPEED_FULL,
  particleSpeed,
  pointAt,
  translateCss,
  type Lane,
} from './airflowGeometry'
import { HeatDefs, heatDefIds, svgUrl } from '../heat/HeatDefs'
/**
 * Airflow_Diagram (Requirement 20), built from sketch `airflow-b`: a vertical
 * section through the drive cabinet. Air rises through the thyristor
 * heatsink (T1–T6), turns at the blower, crosses the heat exchanger and drops
 * down the rear return channel. One panel, driven by `fanStatus`: when the fan
 * fails the blower stops and shows an X, the particles freeze and grey out,
 * the exchanger takes a warm heat stop and the heat bloom round the stack
 * swells. Device chips always carry the live Tj heat stop.
 */
export interface AirflowDiagramProps {
  /** `fan_status` from the drive frame. */
  fanStatus: boolean
  /** Junction temperatures T1…T6 in °C. Non-finite values get the fault hatch. */
  tj: readonly number[]
  /** Optional airflow fraction 0..1 while the fan runs (e.g. clogging). Default 1. */
  airflow?: number
  /** Rendered width in px; height follows the 420 × 480 aspect. Default 420. */
  width?: number
  className?: string
}
const VIEW_W = 420
const VIEW_H = 480
/* Cabinet section. */
const CAB = { x: 40, y: 50, w: 290, h: 372 }
const RETURN_WALL_X = 290
const SINK = { x: 90, y: 230, w: 140, h: 120 }
const HX = { x: 250, y: 58, w: 80, h: 74 }
const BLOWER = { cx: 156, cy: 96, r: 28 }
const STACK = { cx: 160, cy: 290 }
/* Device chips: two rows of three on the heatsink. */
const CHIP = { w: 30, h: 14 }
const CHIP_X = [104, 145, 186] as const
const CHIP_Y = [262, 304] as const
/* Bloom ellipse radii, outermost first, while the fan runs; fan failure swells them. */
const BLOOM_RADII: readonly [number, number][] = [
  [104, 86],
  [80, 64],
  [56, 44],
  [32, 24],
]
const BLOOM_SWELL = 1.65
const BLADE =
  'M0 -4 C 8 -22, 20 -20, 20 -8 C 14 -6, 6 -4, 0 -4 Z'
const CAN_ANIMATE = typeof Element !== 'undefined' && 'animate' in Element.prototype
const LABEL_STYLE = {
  fontFamily: 'var(--font-family-base)',
  fontWeight: 'var(--font-label-weight)',
  fontStretch: 'var(--font-label-width)',
  letterSpacing: '0.32em',
  fontSize: 9,
} as const
function channelStatus(tj: number): Status {
  return Number.isFinite(tj) ? statusFor(tj, DEFAULT_THRESHOLDS.junction_temp) : 'fault'
}
/** Accessible name, e.g. "Cabinet airflow: fan failed, blower stopped, airflow 0 %, exchanger warm, hottest T3 121.4 °C". */
export function airflowLabel(fanStatus: boolean, airflowPct: number, tj: readonly number[]): string {
  const fan = fanStatus ? 'fan running' : 'fan failed, blower stopped'
  const hx = fanStatus ? 'exchanger cool' : 'exchanger warm'
  let hottest = -1
  tj.forEach((t, i) => {
    if (Number.isFinite(t) && (hottest < 0 || t > (tj[hottest] as number))) hottest = i
  })
  const hot = hottest < 0 ? 'no valid Tj' : `hottest T${hottest + 1} ${formatTempC(tj[hottest] as number).trim()}`
  return `Cabinet airflow: ${fan}, airflow ${airflowPct} %, ${hx}, ${hot}`
}
function DeviceChip({ index, tj, ids }: { index: number; tj: number; ids: { glow: string; hatch: string } }) {
  const x = CHIP_X[index % 3] as number
  const y = CHIP_Y[Math.floor(index / 3)] as number
  const fault = !Number.isFinite(tj)
  const stop = fault ? 0 : heatStopIndex(tj)
  // Stops 7–8 read darker than the warm stops, so they get the shared halo and rim.
  const critical = !fault && stop >= 7
  const fill = fault ? svgUrl(ids.hatch) : heatToken(stop)
  const ink = fault || stop >= 6 ? 'var(--text-primary)' : 'var(--surface-page)'
  return (
    <g data-part="device" data-channel={index + 1} data-heat-stop={fault ? 'fault' : stop} data-status={channelStatus(tj)}>
      {critical && (
        <rect
          data-part="halo"
          x={x - 4}
          y={y - 4}
          width={CHIP.w + 8}
          height={CHIP.h + 8}
          rx={4}
          opacity={0.8}
          filter={svgUrl(ids.glow)}
          style={{ fill: heatToken(5) }}
        />
      )}
      <rect
        x={x}
        y={y}
        width={CHIP.w}
        height={CHIP.h}
        rx={2}
        strokeWidth={1}
        strokeDasharray={fault ? '2 2' : undefined}
        style={{
          fill,
          stroke: critical ? heatToken(5) : fault ? 'var(--line-strong)' : 'none',
          transition: 'fill 300ms var(--ease-out, ease-out)',
        }}
      />
      <text
        x={x + CHIP.w / 2}
        y={y + CHIP.h / 2 + 3}
        textAnchor="middle"
        style={{ ...LABEL_STYLE, letterSpacing: '0.08em', fontSize: 8, fill: ink }}
      >
        T{index + 1}
      </text>
    </g>
  )
}
function Bloom({ stops, swell, filterId, glowId }: { stops: readonly number[]; swell: number; filterId: string; glowId: string }) {
  if (stops.length === 0) return null
  const radii = BLOOM_RADII.slice(BLOOM_RADII.length - stops.length)
  const top = stops[stops.length - 1] as number
  const inner = radii[radii.length - 1] as [number, number]
  return (
    <g data-part="bloom" filter={svgUrl(filterId)} opacity={0.75}>
      {stops.map((s, i) => {
        const [rx, ry] = radii[i] as [number, number]
        const isTop = i === stops.length - 1
        return (
          <g key={i}>
            {/* Cross-cutting fix: a heat-5 glow under a maroon top band keeps it reading hottest. */}
            {isTop && top >= 7 && (
              <ellipse
                cx={STACK.cx}
                cy={STACK.cy}
                rx={inner[0] * swell * 1.4}
                ry={inner[1] * swell * 1.4}
                filter={svgUrl(glowId)}
                opacity={0.8}
                style={{ fill: heatToken(5) }}
              />
            )}
            <ellipse
              data-part="bloom-band"
              data-heat-stop={s}
              cx={STACK.cx}
              cy={STACK.cy + i * 2}
              rx={rx * swell}
              ry={ry * swell}
              style={{ fill: heatToken(s), transition: 'rx 600ms ease-out, ry 600ms ease-out' }}
            />
          </g>
        )
      })}
    </g>
  )
}
function FanChip({ fanStatus }: { fanStatus: boolean }) {
  const status: Status = fanStatus ? 'normal' : 'critical'
  const color = fanStatus ? 'var(--status-normal)' : 'var(--status-critical-text)'
  return (
    <g data-part="fan-chip" transform="translate(20 14)">
      <rect
        width={fanStatus ? 104 : 120}
        height={22}
        rx={11}
        style={{ fill: 'var(--surface-panel)', stroke: fanStatus ? 'var(--line-strong)' : 'var(--status-critical)' }}
      />
      <g transform="translate(9 4)" style={{ color }}>
        <StatusIcon status={status} size={14} />
      </g>
      <text x={30} y={14.5} style={{ ...LABEL_STYLE, fill: color }}>
        {fanStatus ? 'FAN ON' : 'FAN FAIL'}
      </text>
    </g>
  )
}
export function AirflowDiagram({ fanStatus, tj, airflow, width = VIEW_W, className }: AirflowDiagramProps) {
  const reduceMotion = useReducedMotion() === true
  const raw = useId()
  const ids = useMemo(() => {
    const defs = heatDefIds(raw)
    const base = defs.linear.replace(/-linear$/, '')
    return {
      defs,
      air: `${base}-air`,
      mask: `${base}-particles`,
      clip: `${base}-cabinet`,
      hub: `${base}-hub`,
      blob: `${base}-blob`,
    }
  }, [raw])
  const lanes = useMemo<Lane[]>(() => airflowLanes(), [])
  const fraction = airflowFraction(fanStatus, airflow)
  const speed = particleSpeed(fanStatus, airflow)
  const airflowPct = Math.round(fraction * 100)
  const moving = speed > 0 && !reduceMotion
  const particleEls = useRef<(SVGCircleElement | null)[]>([])
  const bladesEl = useRef<SVGGElement>(null)
  const anims = useRef<Animation[]>([])
  // Create the loops once; speed changes only touch playbackRate below.
  useEffect(() => {
    if (reduceMotion || !CAN_ANIMATE) return
    const created: Animation[] = []
    let k = 0
    lanes.forEach((lane, li) => {
      const total = lane.lengths[lane.lengths.length - 1] as number
      const frames = laneKeyframes(lane)
      const duration = (total / PARTICLE_SPEED_FULL) * 1000
      for (let p = 0; p < lane.particles; p++) {
        const el = particleEls.current[k++]
        if (!el) continue
        created.push(
          el.animate(frames, {
            duration,
            iterations: Infinity,
            iterationStart: (p + li * 0.33) / lane.particles,
            easing: 'linear',
          }),
        )
      }
    })
    if (bladesEl.current) {
      created.push(
        bladesEl.current.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
          duration: 1000 / BLADE_RPS_FULL,
          iterations: Infinity,
          easing: 'linear',
        }),
      )
    }
    anims.current = created
    return () => {
      created.forEach((a) => {
        a.cancel()
      })
      anims.current = []
    }
  }, [lanes, reduceMotion])
  // Speed from fan state: 0 freezes particles and blades where they are.
  useEffect(() => {
    const rate = speed / PARTICLE_SPEED_FULL
    anims.current.forEach((a) => {
      a.playbackRate = rate
    })
  }, [speed, reduceMotion])
  const hottestStop = tj.reduce((m, t) => (Number.isFinite(t) ? Math.max(m, heatStopIndex(t)) : m), 0)
  const stops = bloomStops(hottestStop)
  let k = 0
  const particles = lanes.flatMap((lane, li) =>
    Array.from({ length: lane.particles }, (_, p) => {
      const i = k++
      const start = pointAt(lane, (p + li * 0.33) / lane.particles)
      return (
        <circle
          key={i}
          ref={(el) => {
            particleEls.current[i] = el
          }}
          data-part="particle"
          r={1.7}
          style={{ fill: 'white', transform: translateCss(start) }}
        />
      )
    }),
  )
  const finX = Array.from({ length: 13 }, (_, i) => SINK.x + 10 + i * 10)
  const hxFinX = Array.from({ length: 9 }, (_, i) => HX.x + 8 + i * 8)
  return (
    <svg
      role="img"
      aria-label={airflowLabel(fanStatus, airflowPct, tj)}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={(width * VIEW_H) / VIEW_W}
      data-fan={fanStatus ? 'on' : 'off'}
      data-moving={moving ? 'true' : 'false'}
      data-speed={speed}
      className={className}
    >
      <HeatDefs ids={ids.defs} />
      <defs>
        {/* Air temperature: hot leaving the stack, cooling after the exchanger. */}
        <linearGradient id={ids.air} gradientUnits="userSpaceOnUse" x1="120" y1="90" x2="330" y2="390">
          <stop offset="0" style={{ stopColor: heatToken(4) }} />
          <stop offset="0.45" style={{ stopColor: heatToken(3) }} />
          <stop offset="0.6" style={{ stopColor: 'var(--accent-strong)' }} />
          <stop offset="1" style={{ stopColor: heatToken(1) }} />
        </linearGradient>
        <radialGradient id={ids.hub} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" style={{ stopColor: 'var(--line-strong)' }} />
          <stop offset="1" style={{ stopColor: 'var(--surface-page)' }} />
        </radialGradient>
        <clipPath id={ids.clip}>
          <rect x={CAB.x} y={CAB.y} width={CAB.w} height={CAB.h} />
        </clipPath>
        <filter id={ids.blob} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={2} seed={11} result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale={30} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={1.2} />
        </filter>
        {/* Particles are drawn into a mask, so each dot takes the air colour of where it is. */}
        <mask id={ids.mask} maskUnits="userSpaceOnUse" x="0" y="0" width={VIEW_W} height={VIEW_H}>
          {particles}
        </mask>
      </defs>
      {/* Panel */}
      <rect
        width={VIEW_W}
        height={VIEW_H}
        rx={8}
        style={{
          fill: 'var(--surface-raised)',
          stroke: fanStatus ? 'var(--line-subtle)' : 'color-mix(in srgb, var(--status-critical) 60%, transparent)',
        }}
      />
      <rect x={CAB.x} y={CAB.y} width={CAB.w} height={CAB.h} style={{ fill: 'var(--surface-panel)' }} />
      <rect x={CAB.x} y={CAB.y} width={CAB.w} height={CAB.h} opacity={0.08} filter={svgUrl(ids.defs.grain)} style={{ fill: 'var(--text-primary)' }} />
      {/* Heat bloom round the stack: hottest band innermost, swells when air stops. */}
      <g clipPath={svgUrl(ids.clip)}>
        <Bloom stops={stops} swell={fanStatus ? 1 : BLOOM_SWELL} filterId={ids.blob} glowId={ids.defs.glow} />
      </g>
      {/* Heat exchanger */}
      <g data-part="exchanger" data-state={fanStatus ? 'cool' : 'warm'}>
        <rect
          x={HX.x}
          y={HX.y}
          width={HX.w}
          height={HX.h}
          strokeWidth={1.25}
          style={{
            fill: exchangerFill(fanStatus),
            fillOpacity: fanStatus ? 1 : 0.85,
            stroke: 'var(--accent)',
            transition: 'fill 300ms ease-out',
          }}
        />
        <g strokeWidth={1} style={{ stroke: fanStatus ? 'var(--line-strong)' : heatToken(7) }}>
          {hxFinX.map((x) => (
            <line key={x} x1={x} y1={HX.y + 4} x2={x} y2={HX.y + HX.h - 4} />
          ))}
        </g>
      </g>
      {/* Cabinet structure */}
      <g strokeWidth={1.25} fill="none" style={{ stroke: 'var(--accent)' }}>
        <rect x={CAB.x} y={CAB.y} width={CAB.w} height={CAB.h} />
        <line x1={RETURN_WALL_X} y1={140} x2={RETURN_WALL_X} y2={362} />
      </g>
      <rect
        x={SINK.x}
        y={SINK.y}
        width={SINK.w}
        height={SINK.h}
        strokeWidth={0.75}
        style={{ fill: 'var(--surface-raised)', fillOpacity: 0.6, stroke: 'var(--line-strong)' }}
      />
      <g strokeWidth={1} style={{ stroke: 'var(--text-muted)' }} opacity={0.7}>
        {finX.map((x) => (
          <line key={x} x1={x} y1={SINK.y + 4} x2={x} y2={SINK.y + SINK.h - 4} />
        ))}
      </g>
      {/* Coolant pipes */}
      <path d={`M${CAB.x + CAB.w} 72 H392`} fill="none" strokeWidth={2} style={{ stroke: 'var(--accent-strong)' }} />
      <path d={`M${CAB.x + CAB.w} 118 H392`} fill="none" strokeWidth={2} style={{ stroke: heatToken(3) }} />
      {tj.slice(0, 6).map((t, i) => (
        <DeviceChip key={i} index={i} tj={t} ids={{ glow: ids.defs.glow, hatch: ids.defs.faultHatch }} />
      ))}
      {/* Streamlines: faint guides, then the masked particles. */}
      <g fill="none" strokeWidth={1} style={{ stroke: 'var(--line-subtle)' }}>
        {lanes.map((lane, i) => (
          <polyline key={i} points={lane.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
        ))}
      </g>
      <rect
        data-part="particles"
        width={VIEW_W}
        height={VIEW_H}
        mask={svgUrl(ids.mask)}
        style={{
          fill: fanStatus ? svgUrl(ids.air) : 'var(--text-muted)',
          opacity: fanStatus ? 1 : 0.7,
        }}
      />
      {/* Blower */}
      <g data-part="blower" data-state={fanStatus ? 'running' : 'stopped'}>
        <circle
          cx={BLOWER.cx}
          cy={BLOWER.cy}
          r={BLOWER.r}
          strokeWidth={1.25}
          style={{ fill: svgUrl(ids.hub), stroke: fanStatus ? 'var(--accent)' : 'var(--status-critical)' }}
        />
        <g transform={`translate(${BLOWER.cx} ${BLOWER.cy})`}>
          <g ref={bladesEl} style={{ fill: fanStatus ? 'var(--accent)' : 'var(--text-muted)', opacity: 0.9 }}>
            {[0, 72, 144, 216, 288].map((a) => (
              <path key={a} d={BLADE} transform={`rotate(${a})`} />
            ))}
          </g>
        </g>
        <circle
          cx={BLOWER.cx}
          cy={BLOWER.cy}
          r={5}
          style={{ fill: 'var(--line-subtle)', stroke: fanStatus ? 'var(--accent)' : 'var(--text-muted)' }}
        />
        {fanStatus ? (
          <path
            d={`M${BLOWER.cx - 28} ${BLOWER.cy - 24} A 36 36 0 0 1 ${BLOWER.cx + 20} ${BLOWER.cy - 32}`}
            fill="none"
            strokeWidth={1}
            strokeDasharray="2 3"
            style={{ stroke: 'var(--accent-strong)' }}
          />
        ) : (
          <path
            data-part="fan-x"
            d={`M${BLOWER.cx - 24} ${BLOWER.cy - 24} L${BLOWER.cx + 24} ${BLOWER.cy + 24} M${BLOWER.cx + 24} ${BLOWER.cy - 24} L${BLOWER.cx - 24} ${BLOWER.cy + 24}`}
            strokeWidth={1.6}
            style={{ stroke: 'var(--status-critical)' }}
          />
        )}
      </g>
      {/* Labels */}
      <g style={{ ...LABEL_STYLE, fill: 'var(--text-muted)' }}>
        <text x={BLOWER.cx} y={44} textAnchor="middle">BLOWER</text>
        <text x={HX.x + HX.w / 2} y={44} textAnchor="middle">HX</text>
        <text x={SINK.x + SINK.w / 2} y={372} textAnchor="middle">HEATSINK · T1–T6</text>
        <text x={392} y={64} textAnchor="end">IN</text>
        <text x={392} y={134} textAnchor="end">OUT</text>
      </g>
      <FanChip fanStatus={fanStatus} />
      {/* Readouts */}
      <g data-part="readouts">
        <text x={20} y={448} style={{ ...LABEL_STYLE, fill: 'var(--text-muted)' }}>AIRFLOW</text>
        <text
          x={20}
          y={472}
          className="num"
          style={{
            fontFamily: 'var(--font-family-base)',
            fontWeight: 'var(--font-display-weight)',
            fontSize: 22,
            fill: fanStatus ? 'var(--text-primary)' : 'var(--status-critical-text)',
          }}
        >
          {airflowPct}
          <tspan dx={3} style={{ fontSize: 11, fill: 'var(--text-muted)' }}>%</tspan>
        </text>
        <text x={130} y={448} style={{ ...LABEL_STYLE, fill: 'var(--text-muted)' }}>HX</text>
        <text
          x={130}
          y={470}
          style={{
            ...LABEL_STYLE,
            fontSize: 11,
            letterSpacing: '0.2em',
            fill: fanStatus ? 'var(--text-secondary)' : 'var(--status-critical-text)',
          }}
        >
          {fanStatus ? 'COOL' : 'WARM'}
        </text>
      </g>
    </svg>
  )
}
