import { animate } from 'motion/react'
import { Fragment, useLayoutEffect, useMemo, useRef } from 'react'
import { DEFAULT_AMBIENT_C, type FieldChannel } from '../../domain/heatField'
import { EASE_IN_OUT } from '../../motion/tokens'
import { useReducedMotion } from '../../motion/useReducedMotion'
import { HeatDefs, svgUrl, useHeatDefIds } from './HeatDefs'
import {
  BLOB_VIEW_HEIGHT,
  BLOB_VIEW_WIDTH,
  blobBands,
  coreHeat,
  lerpRings,
  ringsPath,
  sameTopology,
  type BlobBand,
} from './blobGeometry'

/**
 * Heat_Blobs (Requirements 15.4, 15.5, 15.6, 34.2): the reference's huge
 * stepped heat shapes, drawn as live isotherms of the six channel Tj values.
 *
 * Always six `<path>`s (empty `d` allowed) in a fixed order, outermost (pale)
 * first and hottest innermost, so the path topology stays stable for the
 * 1 Hz morph. The parent re-renders on each Display_Tick; the field is
 * recomputed only when the channels or ambient change.
 *
 * Decorative: the numbers live in the console readout and rack rows, so the
 * SVG is hidden from assistive technology.
 */
export interface HeatBlobsProps {
  channels: readonly FieldChannel[]
  /** Ambient temperature (°C). Non-finite falls back to the default ambient. */
  ambient?: number
  /** Seed for the organic warp. Same seed, same outline. Default 1. */
  seed?: number
  /** `slice` (default) fills the box like a backdrop; `meet` shows the whole field. */
  fit?: 'slice' | 'meet'
  className?: string
}

/** Morph between two 1 Hz updates; shorter than the update period so each settles. */
export const BLOB_MORPH_MS = 600
const MORPH = { duration: BLOB_MORPH_MS / 1000, ease: EASE_IN_OUT } as const

/**
 * Morphs the band paths from the previous bands to the new ones (Requirement
 * 34.2). Runs only when both frames share a topology (same ring count per
 * band, each ring `RING_POINTS` long); otherwise, and under reduced motion,
 * React's own `d` stands. Writes `d` straight to the nodes, no re-render.
 */
function useBlobMorph(bands: readonly BlobBand[]) {
  const reduced = useReducedMotion()
  const paths = useRef<(SVGPathElement | null)[]>([])
  const prev = useRef<readonly BlobBand[] | null>(null)
  useLayoutEffect(() => {
    const from = prev.current
    prev.current = bands
    if (reduced || from === null || from === bands || !sameTopology(from, bands)) return
    const write = (t: number) => {
      bands.forEach((band, i) => {
        const a = from[i]
        if (a) paths.current[i]?.setAttribute('d', ringsPath(lerpRings(a.rings, band.rings, t)))
      })
    }
    write(0)
    const controls = animate(0, 1, { ...MORPH, onUpdate: write })
    return () => {
      controls.stop()
    }
  }, [bands, reduced])
  return paths
}

/** Core stops dark enough to read cool on a dark surface get the shared --heat-5 halo (SELECTION.md). */
const HALO_FROM_HEAT = 7

export function HeatBlobs({
  channels,
  ambient = DEFAULT_AMBIENT_C,
  seed = 1,
  fit = 'slice',
  className,
}: HeatBlobsProps) {
  const ids = useHeatDefIds()
  const bands = useMemo(() => blobBands(channels, ambient, seed), [channels, ambient, seed])
  const core = bands[bands.length - 1]
  const showHalo = core !== undefined && core.d !== '' && coreHeat(bands) >= HALO_FROM_HEAT
  const paths = useBlobMorph(bands)

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-part="heat-blobs"
      className={className}
      viewBox={`0 0 ${BLOB_VIEW_WIDTH} ${BLOB_VIEW_HEIGHT}`}
      preserveAspectRatio={`xMidYMid ${fit}`}
      style={{ pointerEvents: 'none', overflow: 'visible' }}
    >
      <HeatDefs ids={ids} />
      <g data-part="heat-blob-bands">
        {bands.map((band) => (
          <Fragment key={band.index}>
            {/* The halo sits beneath the innermost band, so the maroon fill stays --heat-8
                (Requirement 15.6) while its edge glows. */}
            {showHalo && band === core && (
              <path
                data-part="heat-blob-halo"
                d={band.d}
                filter={svgUrl(ids.glow)}
                opacity={0.8}
                style={{ fill: 'var(--heat-5)' }}
              />
            )}
            <path
              ref={(el) => {
                paths.current[band.index] = el
              }}
              data-band={band.index}
              data-heat={band.heat}
              d={band.d}
              fillRule="evenodd"
              vectorEffect="non-scaling-stroke"
              style={{
                fill: band.token,
                // Subtle isoline: the band's own colour pulled toward the page.
                stroke: `color-mix(in srgb, ${band.token} 55%, var(--surface-page))`,
                strokeOpacity: 0.7,
                strokeWidth: 1.25,
              }}
            />
          </Fragment>
        ))}
      </g>
    </svg>
  )
}
