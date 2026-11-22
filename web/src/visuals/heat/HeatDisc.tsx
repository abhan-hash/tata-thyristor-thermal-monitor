import { useMotionValueEvent } from 'motion/react'
import { useHeatPosition } from '../../motion/useHeatFill'
import { useId, useMemo, useRef, useState } from 'react'
import { formatTempC } from '../../domain/format'
import { statusFor, type StatusBand } from '../../domain/status'
import { DEFAULT_THRESHOLDS } from '../../domain/thresholds'
import type { Status } from '../../domain/types'
import { StatusIcon } from '../../kit/icons/StatusIcon'
import { STATUS_LABEL } from '../../kit/StatusChip'
import { blobPath, discModel, type DiscModel } from './discGeometry'
import { HeatDefs, heatDefIds, svgUrl } from './HeatDefs'
import { useMotionSource, type NumberSource } from './useMotionSource'

/**
 * Heat_Disc (Requirement 15.2): the reference's glowing record. Orange → red
 * stepped rings around a dark irregular core with a small gold centre ring,
 * a thin gold rim and crop brackets. Ring radii and colours follow `tj`
 * through the heat scale; updates are written straight to SVG attributes, so
 * a 10 Hz MotionValue never re-renders React. The status is carried by the
 * centre marker's shape and the accessible name, never by colour alone.
 */
export interface HeatDiscProps {
  /** Temperature in °C (usually the hottest Tj). NaN / ±∞ show the fault treatment. */
  tj: NumberSource
  /** Seed for the core and band outlines. Same seed, same shape. Default 1. */
  seed?: number
  /** Rendered width and height in px. Default 240. */
  size?: number
  /** Accessible name prefix. Default "Junction temperature". */
  label?: string
  /** Band used for the status marker. Default: Tj thresholds (110 / 125 °C). */
  band?: StatusBand
  /** Draw the four crop-bracket corners. Default true. */
  brackets?: boolean
  className?: string
}

/* Geometry on a 240-unit viewBox. */
const VIEW = 240
const C = VIEW / 2
const FACE_R = 94
const RIM_R = 99
const BRACKET_INSET = 6
const BRACKET_LEN = 18

/** Status shown by the disc: fault for non-finite readings, otherwise the band classifier. */
export function discStatus(tempC: number, band: StatusBand = DEFAULT_THRESHOLDS.junction_temp): Status {
  return Number.isFinite(tempC) ? statusFor(tempC, band) : 'fault'
}

/** Accessible name, e.g. "Junction temperature 112.4 °C, WARNING". */
export function discLabel(label: string, tempC: number, status: Status): string {
  if (status === 'fault') return `${label}, ${STATUS_LABEL.fault}`
  return `${label} ${formatTempC(tempC).trim()}, ${STATUS_LABEL[status]}`
}

const bandTransform = (radius: number) => `scale(${(radius * FACE_R).toFixed(2)})`

interface DiscRefs {
  edge: SVGStopElement | null
  inner: SVGStopElement | null
  glow: SVGCircleElement | null
  bands: (SVGGElement | null)[]
  core: SVGGElement | null
}

/** Writes a model to the mounted SVG nodes (the per-frame path). */
function applyModel(refs: DiscRefs, m: DiscModel) {
  refs.edge?.style.setProperty('stop-color', m.faceEdge)
  refs.inner?.style.setProperty('stop-color', m.faceInner)
  refs.glow?.style.setProperty('fill', m.faceInner)
  refs.glow?.setAttribute('opacity', (m.glow * 0.5).toFixed(3))
  m.bands.forEach((b, i) => {
    const g = refs.bands[i]
    if (!g) return
    g.setAttribute('transform', bandTransform(b.radius))
    g.style.setProperty('fill', b.color)
  })
  refs.core?.setAttribute('transform', bandTransform(m.coreRadius))
}

function CenterMarker({ status }: { status: Status }) {
  if (status === 'normal') {
    // The reference's small gold ring.
    return (
      <circle
        data-marker="ring"
        cx={C}
        cy={C}
        r={5}
        fill="none"
        strokeWidth={1.5}
        style={{ stroke: 'var(--disc-marker)' }}
      />
    )
  }
  const s = 18
  return (
    <g data-marker={status} transform={`translate(${C - s / 2} ${C - s / 2})`} style={{ color: 'var(--disc-marker)' }}>
      <StatusIcon status={status} size={s} />
    </g>
  )
}

function CropBrackets() {
  const a = BRACKET_INSET
  const b = VIEW - BRACKET_INSET
  const l = BRACKET_LEN
  const d = [
    `M${a} ${a + l}V${a}H${a + l}`,
    `M${b - l} ${a}H${b}V${a + l}`,
    `M${b} ${b - l}V${b}H${b - l}`,
    `M${a + l} ${b}H${a}V${b - l}`,
  ].join('')
  return (
    <path
      data-part="brackets"
      d={d}
      fill="none"
      style={{ stroke: 'var(--crop-bracket-stroke)', strokeWidth: 'var(--crop-bracket-stroke-width)' }}
    />
  )
}

export function HeatDisc({
  tj,
  seed = 1,
  size = 240,
  label = 'Junction temperature',
  band = DEFAULT_THRESHOLDS.junction_temp,
  brackets = true,
  className,
}: HeatDiscProps) {
  const source = useMotionSource(tj)
  // Tweened in heat-scale space over 300 ms (Requirement 33.2).
  const position = useHeatPosition(source)
  const [status, setStatus] = useState<Status>(() => discStatus(source.get(), band))

  const raw = useId()
  const ids = useMemo(() => {
    const defs = heatDefIds(raw)
    const base = defs.linear.replace(/-linear$/, '')
    return { defs, face: `${base}-disc-face` }
  }, [raw])

  const shapes = useMemo(
    () => ({
      core: blobPath(seed, 0.3, 9),
      bands: [0, 1, 2].map((i) => blobPath(seed * 31 + i + 1, 0.06, 13)),
    }),
    [seed],
  )

  const svgRef = useRef<SVGSVGElement>(null)
  const refs = useRef<DiscRefs>({ edge: null, inner: null, glow: null, bands: [], core: null })

  useMotionValueEvent(source, 'change', (v) => {
    const next = discStatus(v, band)
    setStatus(next)
    svgRef.current?.setAttribute('aria-label', discLabel(label, v, next))
  })
  useMotionValueEvent(position, 'change', (p) => {
    applyModel(refs.current, discModel(p))
  })

  // Render-time snapshot; later frames are applied imperatively above.
  const model = discModel(position.get())
  const fault = status === 'fault'

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={discLabel(label, source.get(), status)}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      data-status={status}
      className={className}
      overflow="visible"
    >
      <HeatDefs ids={ids.defs} />
      <defs>
        <radialGradient id={ids.face} cx="0.5" cy="0.5" r="0.5">
          <stop
            ref={(el) => {
              refs.current.inner = el
            }}
            offset="0.7"
            style={{ stopColor: model.faceInner }}
          />
          <stop
            ref={(el) => {
              refs.current.edge = el
            }}
            offset="1"
            style={{ stopColor: model.faceEdge }}
          />
        </radialGradient>
      </defs>

      {!fault && (
        // The glow pulses only while critical (Requirements 33.3, 33.4).
        <circle
          className={status === 'critical' ? 'motion-critical-pulse' : undefined}
          ref={(el) => {
            refs.current.glow = el
          }}
          data-part="glow"
          cx={C}
          cy={C}
          r={FACE_R}
          opacity={(model.glow * 0.5).toFixed(3)}
          filter={svgUrl(ids.defs.glow)}
          style={{ fill: model.faceInner }}
        />
      )}

      <circle
        data-part="face"
        cx={C}
        cy={C}
        r={FACE_R}
        style={{ fill: fault ? svgUrl(ids.defs.faultHatch) : svgUrl(ids.face) }}
      />

      {!fault && (
        <g transform={`translate(${C} ${C})`} filter={svgUrl(ids.defs.soften)}>
          {shapes.bands.map((d, i) => {
            const b = model.bands[i as 0 | 1 | 2]
            return (
              <g
                key={i}
                ref={(el) => {
                  refs.current.bands[i] = el
                }}
                data-part="band"
                transform={bandTransform(b.radius)}
                style={{ fill: b.color }}
              >
                <path d={d} />
              </g>
            )
          })}
        </g>
      )}

      {/* Grain over the face, clipped to it by the filter's composite. */}
      <circle cx={C} cy={C} r={FACE_R} opacity={0.12} filter={svgUrl(ids.defs.grain)} style={{ fill: 'var(--text-primary)' }} />

      <g transform={`translate(${C} ${C})`}>
        <g
          ref={(el) => {
            refs.current.core = el
          }}
          data-part="core"
          transform={bandTransform(model.coreRadius)}
          style={{ fill: 'var(--disc-hub)' }}
        >
          <path d={shapes.core} />
        </g>
      </g>

      <circle
        data-part="rim"
        cx={C}
        cy={C}
        r={RIM_R}
        fill="none"
        strokeWidth={1.25}
        style={{ stroke: 'var(--disc-rim)' }}
      />

      <CenterMarker status={status} />
      {brackets && <CropBrackets />}
    </svg>
  )
}
