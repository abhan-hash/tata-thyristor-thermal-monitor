import { useAnimationFrame, useMotionValueEvent } from 'motion/react'
import { useReducedMotion } from '../../motion/useReducedMotion'
import { useId, useMemo, useRef, type CSSProperties } from 'react'
import {
  dashSpeed,
  fosterNodeTemps,
  fosterStages,
  type FosterNodeKey,
  type FosterNodeTemps,
  type FosterStage,
} from '../../domain/fosterNodes'
import { formatPowerW, formatTempC, formatThermalResKW, PLACEHOLDER } from '../../domain/format'
import { heatTreatment, heatToken } from '../../domain/heatScale'
import { MODEL_PARAMS } from '../../domain/thresholds'
import type { ModelParams, ThyristorFrame } from '../../domain/types'
import { HeatDefs, heatDefIds, svgUrl } from '../heat/HeatDefs'
import { useMotionSource, type NumberSource } from '../heat/useMotionSource'

/**
 * Foster_Ladder (Requirement 18), built from art-direction sketch `foster-a`:
 * a horizontal 3-stage RC ladder, junction → case → heatsink → air, left to
 * right. Node fills follow the heat scale of each node's temperature, the dash
 * line under the ladder moves at a speed proportional to power loss, and each
 * stage carries its τ chip and R / C labels. The annotated variant adds one
 * plain-language note per stage (About page); the compact variant (Drive
 * Detail) hides them and uses smaller readouts.
 *
 * Carry-forward fixes from SELECTION.md:
 * - nodes at heat stop 7 or 8 get a `--heat-5` halo and a 1 px `--heat-5`
 *   inner rim, so the hottest node never reads cooler than the case node;
 * - the heat-flow gradient starts at `--heat-6` (not `--heat-8`), so the flow
 *   is visible from the junction end.
 */

export type FosterLadderVariant = 'compact' | 'annotated'

export interface FosterLadderProps {
  /** The bound channel's frame. */
  frame: Pick<ThyristorFrame, 'id' | 'tj_estimated' | 't_heatsink_measured' | 'power_loss' | 'r_sa' | 'sensor_healthy'>
  /** Drive ambient, °C. */
  ambient: number
  /** Live power loss for the dash speed (10 Hz MotionValue). Defaults to `frame.power_loss`. */
  power?: NumberSource
  params?: Readonly<ModelParams>
  variant?: FosterLadderVariant
  /** Rendered width in px; height follows the viewBox. Default: fills the container. */
  width?: number
  className?: string
}

/* Geometry, in user units. */
const VIEW_W = 920
const NODE_Y = 150
const NODE_R = 36
const NODE_X: Record<FosterNodeKey, number> = { junction: 190, case: 400, heatsink: 610, air: 820 }
const NODE_ORDER: readonly FosterNodeKey[] = ['junction', 'case', 'heatsink', 'air']
const STAGE_TOP = 90
const STAGE_BOTTOM = 210
const STAGE_INSET = 54
const STAGE_WIDTH = 102
const SOURCE_X = 50
const SOURCE_Y = 250
const SOURCE_R = 26
const LOOP_RIGHT = 890
const LOOP_BOTTOM = 350
const FLOW_Y = 305
const FLOW_X0 = NODE_X.junction
const FLOW_X1 = NODE_X.air
const DASH = 8
const GAP = 6
const NOTES_Y = 410
const COMPACT_H = 372
const ANNOTATED_H = 490

const NODE_TAG: Record<FosterNodeKey, string> = { junction: 'Tj', case: 'Tc', heatsink: 'Ths', air: 'Ta' }
const NODE_NAME: Record<FosterNodeKey, string> = {
  junction: 'Junction',
  case: 'Case',
  heatsink: 'Heatsink',
  air: 'Air',
}

/** One-line note per stage for the annotated variant (Requirement 18.5). */
export const STAGE_NOTES: readonly [readonly [string, string], readonly [string, string], readonly [string, string]] = [
  ['Die and solder:', 'reacts within a mains cycle.'],
  ['Case and press-pack:', 'follows each bar bite.'],
  ['Heatsink mass:', 'drifts with load and airflow.'],
]

/* font-stretch is set through a class: the React style key is deprecated. */
const WIDE = '[font-stretch:var(--font-label-width)]'
const DISPLAY = '[font-stretch:var(--font-display-width)]'

const LABEL_STYLE: CSSProperties = {
  fontWeight: 600,
  letterSpacing: '0.32em',
  textTransform: 'uppercase',
}
const NUM_STYLE: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontWeight: 600 }

/** "1.5 J/K", "38 J/K", "1.5 kJ/K". */
export function formatCapacitance(c: number): string {
  if (!Number.isFinite(c)) return PLACEHOLDER
  if (c >= 1000) return `${trimNumber(c / 1000)} kJ/K`
  return `${trimNumber(c)} J/K`
}

function trimNumber(x: number): string {
  // Two significant figures, no trailing zeros: 1.5, 38, 1.5.
  return String(Number(x.toPrecision(2)))
}

/** "τ1 0.02 s" (Requirement 18.4). */
export function tauLabel(stage: FosterStage): string {
  return `τ${String(stage.index)} ${String(stage.tau)} s`
}

/** "R1 0.013 K/W". */
export function resistanceLabel(stage: FosterStage): string {
  return `R${String(stage.index)} ${formatThermalResKW(stage.r).trim()}`
}

/** Accessible summary of the ladder, e.g. "T5 Foster ladder: junction 127.9 °C, …, power loss 1203.4 W". */
export function ladderLabel(channel: number, nodes: FosterNodeTemps, powerW: number): string {
  const parts = NODE_ORDER.map((k) => {
    const est = k === 'heatsink' && nodes.heatsinkEstimated ? ' (estimated)' : ''
    return `${NODE_NAME[k].toLowerCase()} ${formatTempC(nodes[k]).trim()}${est}`
  })
  return `T${String(channel)} Foster ladder: ${parts.join(', ')}, power loss ${formatPowerW(powerW).trim()}`
}

/** Text colour that stays legible on a heat fill: dark ink on the pale stops 1–4. */
function nodeTextColor(stop: number): string {
  return stop >= 1 && stop <= 4 ? 'var(--surface-page)' : 'var(--text-primary)'
}

function Resistor({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const mid = (x0 + x1) / 2
  const half = 20
  const zig = [-half, -15, -10, -5, 0, 5, 10, 15, half]
  const pts = zig.map((dx, i) => `${(mid + dx).toFixed(1)} ${String(i === 0 || i === zig.length - 1 ? y : i % 2 ? y - 8 : y + 8)}`)
  return <path d={`M${String(x0)} ${String(y)}H${String(mid - half)}L${pts.join('L')}H${String(x1)}`} fill="none" />
}

function Capacitor({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const mid = (x0 + x1) / 2
  const g = 4
  return (
    <g>
      <path d={`M${String(x0)} ${String(y)}H${String(mid - g)}M${String(mid + g)} ${String(y)}H${String(x1)}`} fill="none" />
      <path d={`M${String(mid - g)} ${String(y - 14)}V${String(y + 14)}M${String(mid + g)} ${String(y - 14)}V${String(y + 14)}`} fill="none" strokeWidth={2.5} />
    </g>
  )
}

function StageCell({ stage, x }: { stage: FosterStage; x: number }) {
  const x0 = x + STAGE_INSET
  const x1 = x0 + STAGE_WIDTH
  const cx = (x0 + x1) / 2
  const chipW = 92
  return (
    <g data-part="stage" data-stage={stage.index}>
      <g style={{ stroke: 'var(--line-strong)', strokeWidth: 1.5 }}>
        <path d={`M${String(x + NODE_R)} ${String(NODE_Y)}H${String(x0)}M${String(x1)} ${String(NODE_Y)}H${String(x + 210 - NODE_R)}`} fill="none" />
        <path d={`M${String(x0)} ${String(STAGE_TOP)}V${String(STAGE_BOTTOM)}M${String(x1)} ${String(STAGE_TOP)}V${String(STAGE_BOTTOM)}`} fill="none" />
        <Resistor x0={x0} x1={x1} y={STAGE_TOP} />
        <Capacitor x0={x0} x1={x1} y={STAGE_BOTTOM} />
      </g>
      <g data-part="tau">
        <rect x={cx - chipW / 2} y={16} width={chipW} height={26} rx={13} fill="none" style={{ stroke: 'var(--accent)' }} />
        <text x={cx} y={33.5} textAnchor="middle" fontSize={12} style={{ ...NUM_STYLE, fill: 'var(--accent-strong)' }}>
          {tauLabel(stage)}
        </text>
      </g>
      <text data-part="r-label" x={cx} y={66} textAnchor="middle" fontSize={10} style={{ ...NUM_STYLE, fontWeight: 500, fill: 'var(--text-secondary)' }}>
        {resistanceLabel(stage)}
      </text>
      <text data-part="c-label" x={cx} y={244} textAnchor="middle" fontSize={10} style={{ ...NUM_STYLE, fontWeight: 500, fill: 'var(--text-muted)' }}>
        {`C${String(stage.index)} ${formatCapacitance(stage.c)}`}
      </text>
    </g>
  )
}

interface NodeProps {
  node: FosterNodeKey
  temp: number
  estimated: boolean
  valueSize: number
  glowId: string
  hatchId: string
}

function Node({ node, temp, estimated, valueSize, glowId, hatchId }: NodeProps) {
  const x = NODE_X[node]
  const treatment = heatTreatment(temp)
  const fault = treatment.kind === 'fault'
  const stop = fault ? 0 : treatment.index
  const hot = stop >= 7
  const value = fault ? PLACEHOLDER : formatTempC(temp).replace(/\s*°C$/, '').trim()
  return (
    <g data-part="node" data-node={node} data-heat-stop={fault ? 'fault' : stop} data-halo={hot ? 'true' : undefined}>
      {hot && (
        <circle data-part="halo" cx={x} cy={NODE_Y} r={NODE_R + 8} opacity={0.8} filter={svgUrl(glowId)} style={{ fill: 'var(--heat-5)' }} />
      )}
      <circle cx={x} cy={NODE_Y} r={NODE_R + 4} fill="none" strokeWidth={1} style={{ stroke: 'var(--accent)' }} />
      <circle
        data-part="node-fill"
        cx={x}
        cy={NODE_Y}
        r={NODE_R}
        style={{ fill: fault ? svgUrl(hatchId) : heatToken(stop) }}
      />
      {hot && (
        <circle data-part="rim" cx={x} cy={NODE_Y} r={NODE_R - 0.5} fill="none" strokeWidth={1} style={{ stroke: 'var(--heat-5)' }} />
      )}
      <text
        x={x}
        y={NODE_Y + 5}
        textAnchor="middle"
        fontSize={15}
        className={DISPLAY}
        style={{ fontWeight: 800, fill: fault ? 'var(--text-primary)' : nodeTextColor(stop) }}
      >
        {NODE_TAG[node]}
      </text>
      <text x={x} y={NODE_Y + 67} textAnchor="middle" fontSize={9} className={WIDE} style={{ ...LABEL_STYLE, fill: 'var(--text-muted)' }}>
        {estimated ? `${NODE_NAME[node]} est` : NODE_NAME[node]}
      </text>
      <text data-part="node-value" x={x} y={NODE_Y + 70 + valueSize} textAnchor="middle" style={{ ...NUM_STYLE, fill: 'var(--text-primary)' }}>
        <tspan fontSize={valueSize}>{value}</tspan>
        {!fault && (
          <tspan fontSize={valueSize * 0.45} dx={2} style={{ fill: 'var(--text-muted)', fontWeight: 500 }}>
            °C
          </tspan>
        )}
      </text>
    </g>
  )
}

export function FosterLadder({
  frame,
  ambient,
  power,
  params = MODEL_PARAMS,
  variant = 'compact',
  width,
  className,
}: FosterLadderProps) {
  const annotated = variant === 'annotated'
  const viewH = annotated ? ANNOTATED_H : COMPACT_H
  const valueSize = annotated ? 22 : 16
  const stages = useMemo(() => fosterStages(params), [params])
  const nodes = fosterNodeTemps(frame, ambient, params)
  const powerInput = power ?? frame.power_loss
  const powerSource = useMotionSource(powerInput)
  const reduceMotion = useReducedMotion()

  const raw = useId()
  const ids = useMemo(() => {
    const defs = heatDefIds(raw)
    const base = defs.linear.replace(/-linear$/, '')
    return { defs, flow: `${base}-foster-flow` }
  }, [raw])

  const flowRef = useRef<SVGPathElement>(null)
  const powerTextRef = useRef<SVGTSpanElement>(null)
  const offset = useRef(0)
  const speed = useRef(dashSpeed(powerSource.get()))

  useMotionValueEvent(powerSource, 'change', (p) => {
    speed.current = dashSpeed(p)
    flowRef.current?.setAttribute('data-flowing', speed.current > 0 ? 'true' : 'false')
    if (powerTextRef.current) powerTextRef.current.textContent = formatPowerW(p).replace(/\s*W$/, '').trim()
  })

  // Dash flow: offset advances at `speed` u/s toward the air end. Static under reduced motion.
  useAnimationFrame((_, delta) => {
    if (reduceMotion || speed.current === 0 || !flowRef.current) return
    const period = DASH + GAP
    offset.current = (offset.current - (speed.current * Math.min(delta, 100)) / 1000) % period
    flowRef.current.setAttribute('stroke-dashoffset', offset.current.toFixed(2))
  })

  // Read the incoming prop, not the local mirror: a plain-number source only catches up in an
  // effect after this render, so `powerSource.get()` would still hold the previous power here.
  const powerW = typeof powerInput === 'number' ? powerInput : powerInput.get()
  const label = ladderLabel(frame.id, nodes, powerW)
  const flowing = dashSpeed(powerW) > 0

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${String(VIEW_W)} ${String(viewH)}`}
      width={width ?? '100%'}
      height={width === undefined ? undefined : (width * viewH) / VIEW_W}
      data-variant={variant}
      className={className}
      style={{ fontFamily: 'var(--font-sans)', overflow: 'visible' }}
    >
      <HeatDefs ids={ids.defs} />
      <defs>
        {/* Starts at --heat-6 so the flow is visible from the junction end (SELECTION.md). */}
        <linearGradient id={ids.flow} gradientUnits="userSpaceOnUse" x1={FLOW_X0} x2={FLOW_X1 + 20} y1={0} y2={0}>
          <stop offset="0" style={{ stopColor: 'var(--heat-6)' }} />
          <stop offset="0.4" style={{ stopColor: 'var(--heat-5)' }} />
          <stop offset="0.75" style={{ stopColor: 'var(--heat-4)' }} />
          <stop offset="1" style={{ stopColor: 'var(--heat-2)' }} />
        </linearGradient>
      </defs>

      {/* Return loop: source → junction, air → back to source. */}
      <path
        data-part="loop"
        d={`M${String(SOURCE_X)} ${String(SOURCE_Y - SOURCE_R)}V${String(NODE_Y)}H${String(NODE_X.junction - NODE_R - 4)}M${String(NODE_X.air + NODE_R + 4)} ${String(NODE_Y)}H${String(LOOP_RIGHT)}V${String(LOOP_BOTTOM)}H${String(SOURCE_X)}V${String(SOURCE_Y + SOURCE_R)}`}
        fill="none"
        style={{ stroke: 'var(--line-strong)', strokeWidth: 1.5 }}
      />

      {stages.map((s, i) => (
        <StageCell key={s.index} stage={s} x={NODE_X[NODE_ORDER[i] ?? 'junction']} />
      ))}

      {/* Power source with its P loss readout. */}
      <g data-part="source">
        <circle cx={SOURCE_X} cy={SOURCE_Y} r={SOURCE_R} style={{ fill: 'var(--surface-panel)', stroke: 'var(--text-secondary)', strokeWidth: 1.5 }} />
        <path
          d={`M${String(SOURCE_X)} ${String(SOURCE_Y + 14)}V${String(SOURCE_Y - 14)}M${String(SOURCE_X - 7)} ${String(SOURCE_Y - 7)}L${String(SOURCE_X)} ${String(SOURCE_Y - 14)}L${String(SOURCE_X + 7)} ${String(SOURCE_Y - 7)}`}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: 'var(--accent)' }}
        />
        <text x={SOURCE_X + 12} y={186} fontSize={9} className={WIDE} style={{ ...LABEL_STYLE, fill: 'var(--text-muted)' }}>
          P loss
        </text>
        <text data-part="power" x={SOURCE_X + 12} y={186 + 8 + valueSize} style={{ ...NUM_STYLE, fill: 'var(--text-primary)' }}>
          <tspan ref={powerTextRef} fontSize={valueSize}>
            {formatPowerW(powerW).replace(/\s*W$/, '').trim()}
          </tspan>
          <tspan fontSize={valueSize * 0.45} dx={2} style={{ fill: 'var(--text-muted)', fontWeight: 500 }}>
            W
          </tspan>
        </text>
      </g>

      {NODE_ORDER.map((k) => (
        <Node
          key={k}
          node={k}
          temp={nodes[k]}
          estimated={k === 'heatsink' && nodes.heatsinkEstimated}
          valueSize={valueSize}
          glowId={ids.defs.glow}
          hatchId={ids.defs.faultHatch}
        />
      ))}

      {/* Heat flow: dash speed ∝ power loss. */}
      <g data-part="flow">
        <text x={FLOW_X0} y={FLOW_Y - 18} fontSize={9} className={WIDE} style={{ ...LABEL_STYLE, fill: 'var(--text-muted)' }}>
          Heat flow · dash speed ∝ P loss
        </text>
        <path
          ref={flowRef}
          data-part="flow-line"
          data-flowing={flowing ? 'true' : 'false'}
          d={`M${String(FLOW_X0)} ${String(FLOW_Y)}H${String(FLOW_X1)}`}
          fill="none"
          strokeWidth={2.5}
          strokeDasharray={`${String(DASH)} ${String(GAP)}`}
          style={{ stroke: svgUrl(ids.flow) }}
        />
        <path
          d={`M${String(FLOW_X1 + 2)} ${String(FLOW_Y - 6)}L${String(FLOW_X1 + 12)} ${String(FLOW_Y)}L${String(FLOW_X1 + 2)} ${String(FLOW_Y + 6)}`}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: 'var(--heat-2)' }}
        />
      </g>

      {annotated &&
        stages.map((s, i) => {
          const x0 = NODE_X[NODE_ORDER[i] ?? 'junction'] + 20
          const [lead, rest] = STAGE_NOTES[i] ?? ['', '']
          return (
            <g key={s.index} data-part="note" data-stage={s.index}>
              <path d={`M${String(x0)} ${String(NOTES_Y)}H${String(x0 + 190)}`} style={{ stroke: 'var(--accent)', strokeOpacity: 0.6 }} />
              <text x={x0} y={NOTES_Y + 22} fontSize={10} className={WIDE} style={{ ...LABEL_STYLE, fill: 'var(--accent)' }}>
                {`Stage ${String(s.index)}`}
              </text>
              <text x={x0} y={NOTES_Y + 44} fontSize={12} style={{ fontWeight: 500, fill: 'var(--text-secondary)' }}>
                {lead}
              </text>
              <text x={x0} y={NOTES_Y + 61} fontSize={12} style={{ fontWeight: 500, fill: 'var(--text-secondary)' }}>
                {rest}
              </text>
            </g>
          )
        })}
    </svg>
  )
}
