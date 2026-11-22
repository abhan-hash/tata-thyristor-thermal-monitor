import { Group } from '@visx/group'
import { Arc } from '@visx/shape'
import { PLACEHOLDER, UNIT_SEPARATOR } from '../domain/format'
import type { ChannelId } from '../domain/types'
import { CONTROL_CAPS, cx } from '../kit/controlStyles'
import { StatusIcon } from '../kit/icons/StatusIcon'

export interface LifeArcGaugeProps {
  channel: ChannelId
  /** Consumed life, 0..100 %. Remaining life is `100 − consumed`. */
  consumedLifePct: number
  /**
   * Marks the channel with a warning icon and "WEAR ADVISORY" text, e.g. when
   * its wear rate exceeds 2× baseline (Requirement 27.6). Never colour-only.
   */
  advisory?: boolean
  /** Drawing size of the arc in px; scales down to the container through its viewBox. Default 120. */
  size?: number
  className?: string
}

/** The arc sweeps 270°, open at the bottom. Angles are d3 radians: 0 at 12 o'clock, clockwise. */
const SWEEP = (3 * Math.PI) / 2
const START = -SWEEP / 2

/** Remaining life in [0, 100] for a consumed-life percentage; NaN when not finite. */
export function remainingLifePct(consumedLifePct: number): number {
  if (!Number.isFinite(consumedLifePct)) return NaN
  return Math.min(100, Math.max(0, 100 - consumedLifePct))
}

/** Remaining life as whole-percent text, e.g. "72 %"; "— —" when unknown. */
export function formatLifePct(remaining: number): string {
  return Number.isFinite(remaining) ? `${String(Math.round(remaining))}${UNIT_SEPARATOR}%` : PLACEHOLDER
}

/**
 * Remaining-life arc gauge for one channel (Requirement 27.1). The arc is
 * decoration; the remaining-life percentage is always shown as text and
 * exposed as a `meter` value.
 */
export function LifeArcGauge({ channel, consumedLifePct, advisory = false, size = 120, className }: LifeArcGaugeProps) {
  const remaining = remainingLifePct(consumedLifePct)
  const known = Number.isFinite(remaining)
  const text = formatLifePct(remaining)
  const outer = size / 2 - 2
  const inner = outer - Math.max(6, size * 0.09)
  const fillEnd = START + SWEEP * (known ? remaining / 100 : 0)

  return (
    <div
      role="meter"
      aria-label={`CH ${String(channel)} remaining life`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={known ? Math.round(remaining) : undefined}
      aria-valuetext={known ? `${text} remaining${advisory ? ', wear advisory' : ''}` : 'Unknown'}
      data-channel={channel}
      data-advisory={advisory || undefined}
      className={cx('flex flex-col items-center gap-2 font-sans', className)}
    >
      <div className="relative w-full" style={{ maxWidth: size }}>
        <svg
          aria-hidden="true"
          width={size}
          height={size}
          viewBox={`0 0 ${String(size)} ${String(size)}`}
          className="block h-auto w-full"
        >
          <Group left={size / 2} top={size / 2}>
            <Arc
              innerRadius={inner}
              outerRadius={outer}
              startAngle={START}
              endAngle={START + SWEEP}
              cornerRadius={2}
              className="[fill:var(--line-subtle)]"
            />
            {known && remaining > 0 && (
              <Arc
                data-testid="life-arc-fill"
                innerRadius={inner}
                outerRadius={outer}
                startAngle={START}
                endAngle={fillEnd}
                cornerRadius={2}
                className={advisory ? '[fill:var(--status-warning)]' : '[fill:var(--accent)]'}
              />
            )}
          </Group>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-[length:var(--text-20)] leading-none text-[color:var(--text-primary)]">
            {text}
          </span>
          <span className={cx(CONTROL_CAPS, 'mt-1 text-[color:var(--text-muted)]')}>Left</span>
        </div>
      </div>
      <span className={cx(CONTROL_CAPS, 'text-[color:var(--text-secondary)]')}>CH {channel}</span>
      {advisory && (
        <span
          data-testid="life-advisory"
          className={cx(CONTROL_CAPS, 'inline-flex items-center gap-1 text-[color:var(--status-warning)]')}
        >
          <StatusIcon status="warning" size={12} />
          Wear advisory
        </span>
      )}
    </div>
  )
}
