import { useReducedMotion } from 'motion/react'
import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react'
import { formatCurrentA } from '../../domain/format'
import { heatToken } from '../../domain/heatScale'
import { samplesSinceOnset, type SpikeOptions } from '../../domain/spikes'
import { MODEL_PARAMS } from '../../domain/thresholds'
import { BridgeSchematic, type BridgeDevice } from '../bridge/BridgeSchematic'
import { HeatDefs, heatDefIds, svgUrl } from '../heat/HeatDefs'

/**
 * Mill_Cutaway (Requirement 19), built from art-direction sketch `mill-b`: a
 * side elevation of a 4-high stand with the front housing plate removed. The
 * strip runs left to right through the roll bite over the table rollers and
 * drags stepped isotherm bands behind the stand. The drive cabinet stands on
 * the mill floor with the live `BridgeSchematic` thumbnail on its door, and
 * an armature cable runs from the cabinet to the stand motor.
 *
 * SELECTION.md carry-forward: bands run pale (`--heat-1`) at the outer edge
 * to red (`--heat-6`) at the roll bite, capped at `--heat-6` so the critical
 * maroon stays reserved for Tj. When a bar-entry spike onset is detected in
 * `currentSeries` the strip glow pulses and the inner bands swell; under
 * reduced motion the pulse is a static brightness step.
 */

export interface MillCutawayProps {
  /** T1–T6 readings for the cabinet door thumbnail. */
  devices: readonly BridgeDevice[]
  /** Recent armature current samples, A, oldest first. The last sample is "now". */
  currentSeries: readonly number[]
  /** Rated armature current, A. Default `MODEL_PARAMS.rated_current`. */
  ratedA?: number
  /**
   * Samples after an onset during which the strip counts as pulsing. Default 3,
   * sized for the 1 Hz display series (about the 2.4 s spike length).
   */
  pulseSamples?: number
  /** Detector tuning, passed to `detectSpikeOnsets`. */
  spikeOptions?: SpikeOptions
  className?: string
}

export const MILL_PULSE_CLASS = 'mill-strip--pulse'
export const DEFAULT_PULSE_SAMPLES = 3
/** Hottest decorative band. Stops 7–8 belong to Tj only. */
export const MILL_BAND_CAP = 6

const VIEW_W = 960
const VIEW_H = 600
const BITE = { x: 430, y: 300 }
const PULSE_MS = 1400

/** Isotherm bands, outermost (coolest) first; the core sits on the roll bite. */
export const MILL_BANDS: readonly { stop: number; cx: number; rx: number; ry: number }[] = [
  { stop: 1, cx: 480, rx: 430, ry: 170 },
  { stop: 2, cx: 475, rx: 368, ry: 138 },
  { stop: 3, cx: 466, rx: 304, ry: 106 },
  { stop: 4, cx: 456, rx: 240, ry: 78 },
  { stop: 5, cx: 446, rx: 176, ry: 52 },
  { stop: MILL_BAND_CAP, cx: 436, rx: 112, ry: 30 },
]
/** Bands from this index up swell with the pulse. */
const SWELL_FROM = 3

const CAB = { x: 690, y: 382, w: 180, h: 178, depth: 44, rise: 26 }
const DOOR = { x: CAB.x + 10, y: CAB.y + 10, w: CAB.w - 20, h: CAB.h - 20 }
const THUMB = { x: DOOR.x + 8, y: DOOR.y + 10, w: DOOR.w - 16, h: 84 }
const MOTOR = { x: 540, y: 470, w: 92, h: 56 }
const FLOOR_Y = 560

const ROLLERS_IN = [60, 120, 180, 240, 300]
const ROLLERS_OUT = [560, 620, 680, 740, 800, 860, 920]

/* font-stretch goes through a class: the React style key is deprecated. */
const WIDE = '[font-stretch:var(--font-label-width)]'

const CAN_ANIMATE = typeof Element !== 'undefined' && 'animate' in Element.prototype

const LABEL: CSSProperties = {
  fontFamily: 'var(--font-family-base)',
  fontWeight: 'var(--font-label-weight)',
  letterSpacing: '0.32em',
  fontSize: 9,
}

/** Whether the strip pulses: an onset within the last `pulseSamples` samples. */
export function isStripPulsing(
  currentSeries: readonly number[],
  ratedA: number,
  pulseSamples = DEFAULT_PULSE_SAMPLES,
  options?: SpikeOptions,
): boolean {
  return samplesSinceOnset(currentSeries, ratedA, options) < pulseSamples
}

/** Accessible name, e.g. "Rolling mill cutaway: bar entry, armature 1 012.4 A". */
export function millLabel(pulsing: boolean, armatureA: number): string {
  const strip = pulsing ? 'bar entry' : 'strip rolling steady'
  const amps = Number.isFinite(armatureA) ? `, armature ${formatCurrentA(armatureA).trim()}` : ''
  return `Rolling mill cutaway: ${strip}${amps}`
}

function lastFinite(series: readonly number[]): number {
  for (let i = series.length - 1; i >= 0; i--) {
    const v = series[i] as number
    if (Number.isFinite(v)) return v
  }
  return Number.NaN
}

export function MillCutaway({
  devices,
  currentSeries,
  ratedA = MODEL_PARAMS.rated_current,
  pulseSamples = DEFAULT_PULSE_SAMPLES,
  spikeOptions,
  className,
}: MillCutawayProps) {
  const reduceMotion = useReducedMotion() === true
  const raw = useId()
  const ids = useMemo(() => {
    const defs = heatDefIds(raw)
    const base = defs.linear.replace(/-linear$/, '')
    return {
      defs,
      blob: `${base}-mill-blob`,
      bloom: `${base}-mill-bloom`,
      strip: `${base}-mill-strip`,
      roll: `${base}-mill-roll`,
      wrollT: `${base}-mill-wroll-t`,
      wrollB: `${base}-mill-wroll-b`,
      arrow: `${base}-mill-arrow`,
    }
  }, [raw])

  const pulsing = isStripPulsing(currentSeries, ratedA, pulseSamples, spikeOptions)
  const armatureA = lastFinite(currentSeries)

  const bloomEl = useRef<SVGGElement>(null)
  const swellEl = useRef<SVGGElement>(null)

  // One flash per onset (rising edge of `pulsing`); the static step stays while pulsing.
  useEffect(() => {
    if (!pulsing || reduceMotion || !CAN_ANIMATE) return
    const anims: Animation[] = []
    if (bloomEl.current) {
      anims.push(
        bloomEl.current.animate([{ opacity: 0.45 }, { opacity: 1, offset: 0.25 }, { opacity: 0.85 }], {
          duration: PULSE_MS,
          easing: 'ease-out',
        }),
      )
    }
    if (swellEl.current) {
      anims.push(
        swellEl.current.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.14)', offset: 0.3 }, { transform: 'scale(1.06)' }],
          { duration: PULSE_MS, easing: 'ease-out' },
        ),
      )
    }
    return () => {
      anims.forEach((a) => {
        a.cancel()
      })
    }
  }, [pulsing, reduceMotion])

  const bands = MILL_BANDS.map((b, i) => (
    <ellipse
      key={b.stop}
      data-part="band"
      data-heat-stop={b.stop}
      cx={b.cx}
      cy={BITE.y}
      rx={b.rx}
      ry={b.ry}
      opacity={i === 0 ? 0.85 : 1}
      style={{ fill: heatToken(b.stop) }}
    />
  ))

  const stripOuter = 'M10 293 L392 294 L430 297 L950 297 L950 303 L430 303 L392 306 L10 307 Z'
  const stripCore = 'M10 295 L392 296 L430 298 L950 298 L950 302 L430 302 L392 304 L10 305 Z'

  return (
    <svg
      role="group"
      aria-label={millLabel(pulsing, armatureA)}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      data-pulse={pulsing ? 'true' : 'false'}
      className={className}
      style={{ display: 'block', width: '100%', height: 'auto' }}
    >
      <HeatDefs ids={ids.defs} />
      <defs>
        <filter id={ids.blob} x="-20%" y="-40%" width="140%" height="180%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves={2} seed={7} result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale={70} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={1.2} />
        </filter>
        <filter id={ids.bloom} x="-10%" y="-400%" width="120%" height="900%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={9} />
        </filter>
        {/* Strip temperature: warm at entry and exit, hottest at the bite. */}
        <linearGradient id={ids.strip} gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="950" y2="0">
          <stop offset="0" style={{ stopColor: heatToken(3) }} />
          <stop offset="0.44" style={{ stopColor: heatToken(5) }} />
          <stop offset="0.6" style={{ stopColor: heatToken(4) }} />
          <stop offset="1" style={{ stopColor: heatToken(3) }} />
        </linearGradient>
        <radialGradient id={ids.roll} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" style={{ stopColor: 'var(--line-strong)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--surface-raised)' }} />
          <stop offset="1" style={{ stopColor: 'var(--surface-sunken)' }} />
        </radialGradient>
        <radialGradient id={ids.wrollT} cx="0.5" cy="0.95" r="0.8">
          <stop offset="0" style={{ stopColor: heatToken(MILL_BAND_CAP) }} />
          <stop offset="0.35" style={{ stopColor: heatToken(0) }} />
          <stop offset="1" style={{ stopColor: 'var(--surface-page)' }} />
        </radialGradient>
        <radialGradient id={ids.wrollB} cx="0.5" cy="0.05" r="0.8">
          <stop offset="0" style={{ stopColor: heatToken(MILL_BAND_CAP) }} />
          <stop offset="0.35" style={{ stopColor: heatToken(0) }} />
          <stop offset="1" style={{ stopColor: 'var(--surface-page)' }} />
        </radialGradient>
        <marker id={ids.arrow} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" style={{ fill: 'var(--accent)' }} />
        </marker>
      </defs>

      {/* Panel */}
      <rect width={VIEW_W} height={VIEW_H} rx={8} style={{ fill: 'var(--surface-page)' }} />
      <rect width={VIEW_W} height={VIEW_H} opacity={0.06} filter={svgUrl(ids.defs.grain)} style={{ fill: 'var(--text-primary)' }} />

      {/* Stepped isotherm bands: pale outside, red core at the bite. */}
      <g aria-hidden="true" data-part="bands" filter={svgUrl(ids.blob)}>
        {bands.slice(0, SWELL_FROM)}
        <g
          ref={swellEl}
          data-part="swell"
          style={{
            transformBox: 'view-box',
            transformOrigin: `${BITE.x}px ${BITE.y}px`,
            transform: pulsing && reduceMotion ? 'scale(1.06)' : undefined,
          }}
        >
          {bands.slice(SWELL_FROM)}
        </g>
      </g>

      <g aria-hidden="true">
        {/* Housing with the front plate removed (dashed outline). */}
        <path d="M340 40 H520 V560 H340 Z" opacity={0.55} style={{ fill: 'var(--surface-sunken)' }} />
        <path d="M340 40 H520 V560 H340 Z" fill="none" strokeWidth={1} strokeDasharray="6 4" style={{ stroke: 'var(--accent)' }} />
        <rect x={418} y={14} width={24} height={26} strokeWidth={1.25} style={{ fill: 'var(--surface-raised)', stroke: 'var(--accent)' }} />
        <line x1={300} y1={FLOOR_Y} x2={940} y2={FLOOR_Y} strokeWidth={1} style={{ stroke: 'var(--accent-strong)' }} />

        {/* Backup and work rolls */}
        <g strokeWidth={1.25} style={{ stroke: 'var(--accent)' }}>
          <circle cx={430} cy={142} r={78} style={{ fill: svgUrl(ids.roll) }} />
          <circle cx={430} cy={458} r={78} style={{ fill: svgUrl(ids.roll) }} />
          <circle cx={430} cy={258} r={38} style={{ fill: svgUrl(ids.wrollT) }} />
          <circle cx={430} cy={342} r={38} style={{ fill: svgUrl(ids.wrollB) }} />
        </g>
        <g strokeWidth={0.75} style={{ fill: 'var(--surface-panel)', stroke: 'var(--accent-strong)' }}>
          <circle cx={430} cy={142} r={22} />
          <circle cx={430} cy={458} r={22} />
          <circle cx={430} cy={258} r={9} />
          <circle cx={430} cy={342} r={9} />
        </g>
        <g fill="none" strokeWidth={1} style={{ stroke: 'var(--accent)' }}>
          <path d="M398 232 A 42 42 0 0 1 462 232" markerEnd={svgUrl(ids.arrow)} />
          <path d="M462 368 A 42 42 0 0 1 398 368" markerEnd={svgUrl(ids.arrow)} />
        </g>
        <line x1={430} y1={52} x2={430} y2={548} strokeWidth={0.6} strokeDasharray="10 3 2 3" style={{ stroke: 'var(--text-muted)' }} />

        {/* Strip: bloom, then the bar. The bloom brightens and flashes on a spike onset. */}
        <g
          ref={bloomEl}
          data-part="strip-glow"
          className={pulsing ? MILL_PULSE_CLASS : undefined}
          opacity={pulsing ? 0.85 : 0.45}
        >
          <path d={stripOuter} filter={svgUrl(ids.bloom)} style={{ fill: heatToken(4) }} />
          <path d={stripOuter} filter={svgUrl(ids.bloom)} opacity={pulsing ? 0.7 : 0} style={{ fill: heatToken(2) }} />
        </g>
        <path data-part="strip" d={stripCore} style={{ fill: svgUrl(ids.strip) }} />
        {/* Bright core line while pulsing: the static brightness step (also the reduced-motion form). */}
        <path data-part="strip-core" d="M10 299.2 L392 299.6 L430 299.8 L950 299.8 L950 300.2 L430 300.2 L392 300.4 L10 300.8 Z" opacity={pulsing ? 1 : 0} style={{ fill: heatToken(1) }} />

        {/* Table rollers */}
        <g strokeWidth={0.75} style={{ fill: 'var(--surface-panel)', stroke: 'var(--accent-strong)' }}>
          {ROLLERS_IN.map((x) => (
            <circle key={x} cx={x} cy={316} r={9} />
          ))}
          {ROLLERS_OUT.map((x) => (
            <circle key={x} cx={x} cy={312} r={9} />
          ))}
        </g>
        <path d="M600 274 H700" fill="none" strokeWidth={1} markerEnd={svgUrl(ids.arrow)} style={{ stroke: 'var(--accent)' }} />
        <text x={600} y={266} className={WIDE} style={{ ...LABEL, fill: 'var(--accent)' }}>ROLLING</text>

        {/* Stand motor (behind the housing) and the armature cable from the cabinet. */}
        <path
          data-part="armature-cable"
          d={`M${CAB.x} ${CAB.y + 120} H${CAB.x - 30} Q${CAB.x - 40} ${CAB.y + 120} ${CAB.x - 40} ${CAB.y + 130} V${FLOOR_Y - 10} Q${CAB.x - 40} ${FLOOR_Y - 4} ${CAB.x - 50} ${FLOOR_Y - 4} H${MOTOR.x + MOTOR.w / 2} V${MOTOR.y + MOTOR.h}`}
          fill="none"
          strokeWidth={3}
          strokeLinejoin="round"
          style={{ stroke: 'var(--text-secondary)' }}
        />
        <rect
          x={MOTOR.x}
          y={MOTOR.y}
          width={MOTOR.w}
          height={MOTOR.h}
          rx={4}
          strokeWidth={1.25}
          style={{ fill: 'var(--surface-raised)', stroke: 'var(--accent)' }}
        />
        <text
          x={MOTOR.x + MOTOR.w / 2}
          y={MOTOR.y + 26}
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-family-base)', fontWeight: 'var(--font-display-weight)', fontSize: 17, fill: 'var(--text-primary)' }}
        >
          M
        </text>
        <path
          d={`M${MOTOR.x} ${MOTOR.y + 12} C 500 ${MOTOR.y - 40}, 470 300, 439 262`}
          fill="none"
          strokeWidth={1}
          strokeDasharray="2 3"
          style={{ stroke: 'var(--accent-strong)' }}
        />
        <text x={MOTOR.x + MOTOR.w / 2 + 2} y={MOTOR.y + 44} textAnchor="middle" className={WIDE} style={{ ...LABEL, fontSize: 8, letterSpacing: '0.24em', fill: 'var(--text-muted)' }}>DC MOTOR</text>
        <text x={MOTOR.x + MOTOR.w / 2 - 8} y={FLOOR_Y - 12} textAnchor="end" className={WIDE} style={{ ...LABEL, fill: 'var(--text-muted)' }}>ARMATURE</text>
        <text
          data-part="armature-readout"
          x={MOTOR.x + MOTOR.w / 2 - 8}
          y={FLOOR_Y + 24}
          textAnchor="end"
          className="num"
          style={{ fontFamily: 'var(--font-family-base)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 14, fill: 'var(--text-secondary)' }}
        >
          {Number.isFinite(armatureA) ? formatCurrentA(armatureA).trim() : '— —'}
        </text>

        {/* Drive cabinet (oblique) */}
        <polygon
          points={`${CAB.x},${CAB.y} ${CAB.x + CAB.w},${CAB.y} ${CAB.x + CAB.w + CAB.depth},${CAB.y - CAB.rise} ${CAB.x + CAB.depth},${CAB.y - CAB.rise}`}
          strokeWidth={1.25}
          style={{ fill: 'var(--line-strong)', stroke: 'var(--accent)' }}
        />
        <polygon
          points={`${CAB.x + CAB.w},${CAB.y} ${CAB.x + CAB.w + CAB.depth},${CAB.y - CAB.rise} ${CAB.x + CAB.w + CAB.depth},${CAB.y + CAB.h - CAB.rise} ${CAB.x + CAB.w},${CAB.y + CAB.h}`}
          strokeWidth={1.25}
          style={{ fill: 'var(--surface-sunken)', stroke: 'var(--accent)' }}
        />
        <g opacity={0.5} strokeWidth={1.6} style={{ stroke: 'var(--line-strong)' }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <line
              key={i}
              x1={CAB.x + CAB.w + 10}
              y1={CAB.y + 24 + i * 7 - 6}
              x2={CAB.x + CAB.w + CAB.depth - 10}
              y2={CAB.y + 24 + i * 7 - 6 - (CAB.rise * (CAB.depth - 20)) / CAB.depth}
            />
          ))}
        </g>
        <rect x={CAB.x} y={CAB.y} width={CAB.w} height={CAB.h} strokeWidth={1.25} style={{ fill: 'var(--surface-raised)', stroke: 'var(--accent)' }} />
        <rect x={DOOR.x} y={DOOR.y} width={DOOR.w} height={DOOR.h} rx={2} strokeWidth={0.75} style={{ fill: 'var(--surface-panel)', stroke: 'var(--accent-strong)' }} />
        <rect x={THUMB.x - 2} y={THUMB.y - 2} width={THUMB.w + 4} height={THUMB.h + 4} rx={2} strokeWidth={0.75} style={{ fill: 'var(--surface-sunken)', stroke: 'var(--accent-strong)' }} />
        <circle cx={DOOR.x + 14} cy={THUMB.y + THUMB.h + 20} r={3} style={{ fill: 'var(--status-normal)' }} />
        <circle cx={DOOR.x + 26} cy={THUMB.y + THUMB.h + 20} r={3} style={{ fill: 'var(--accent)' }} />
        <rect x={DOOR.x + DOOR.w - 16} y={THUMB.y + THUMB.h + 10} width={6} height={34} rx={3} strokeWidth={0.75} style={{ fill: 'var(--line-strong)', stroke: 'var(--accent-strong)' }} />
        <text x={CAB.x + CAB.w / 2} y={FLOOR_Y + 22} textAnchor="middle" className={WIDE} style={{ ...LABEL, fill: 'var(--text-muted)' }}>DRIVE CABINET</text>
      </g>

      {/* Text cue for the pulse, so the spike never relies on glow alone. */}
      {pulsing && (
        <g data-part="bar-entry-chip" aria-hidden="true" transform="translate(24 20)">
          <rect width={132} height={22} rx={11} strokeWidth={1} style={{ fill: 'var(--surface-panel)', stroke: 'var(--accent)' }} />
          <circle cx={14} cy={11} r={3.5} style={{ fill: 'var(--accent)' }} />
          <text x={26} y={14.5} className={WIDE} style={{ ...LABEL, fill: 'var(--accent)' }}>BAR ENTRY</text>
        </g>
      )}

      {/* Cabinet door: the live bridge at thumbnail scale (Requirement 19.3). */}
      <foreignObject data-part="door-bridge" x={THUMB.x} y={THUMB.y} width={THUMB.w} height={THUMB.h}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <BridgeSchematic devices={devices} variant="thumbnail" />
        </div>
      </foreignObject>
    </svg>
  )
}
