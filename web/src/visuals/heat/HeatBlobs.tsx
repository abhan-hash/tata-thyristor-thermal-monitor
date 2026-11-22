import { Fragment, useMemo } from 'react'
import { DEFAULT_AMBIENT_C, type FieldChannel } from '../../domain/heatField'
import { HeatDefs, svgUrl, useHeatDefIds } from './HeatDefs'
import { BLOB_VIEW_HEIGHT, BLOB_VIEW_WIDTH, blobBands, coreHeat } from './blobGeometry'

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
