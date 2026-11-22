import { formatTempC } from '../../domain/format'
import { MODEL_PARAMS } from '../../domain/thresholds'
import type { ChannelId, Status } from '../../domain/types'
import { STATUS_LABEL } from '../../kit/StatusChip'

/**
 * Pure data bindings for IsometricConsole (Requirements 16.2–16.4): how each
 * live value maps onto the disc, the knob ring arcs and the fader. Kept apart
 * from the component so the mapping can be tested without rendering.
 */

/** Knob A full scale: 150 % of rated armature current, so overload (> 100 %) stays readable. */
export const ARMATURE_FULL_SCALE_PCT = 150
/** Knob B scale for ambient temperature, °C. */
export const AMBIENT_SCALE_C = { min: 0, max: 60 } as const
/** Temperature span of the disc rim scale (°C), swept over the same 270° as the knobs. */
export const DISC_SCALE_C = { min: 35, max: 140 } as const
export const DISC_SCALE_SWEEP_DEG = 270
export const DISC_SCALE_START_DEG = 135
/** Rim ticks borrowed from sketch console-b: the Tj warning and trip limits. */
export const DISC_TICKS = [
  { id: 'warn', label: 'WARN', tempC: 110 },
  { id: 'trip', label: 'TRIP', tempC: 125 },
] as const

const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0)

/** Armature current as % of rated; NaN when either input is not usable. */
export function armaturePct(currentA: number, ratedA: number = MODEL_PARAMS.rated_current): number {
  if (!Number.isFinite(currentA) || !(ratedA > 0)) return Number.NaN
  return (currentA / ratedA) * 100
}

/** Knob A ring fraction (0..1) for an armature current. Non-finite → 0. */
export function armatureFraction(currentA: number, ratedA: number = MODEL_PARAMS.rated_current): number {
  return clamp01(armaturePct(currentA, ratedA) / ARMATURE_FULL_SCALE_PCT)
}

/** Knob B ring fraction (0..1) for an ambient temperature. Non-finite → 0. */
export function ambientFraction(ambientC: number): number {
  return clamp01((ambientC - AMBIENT_SCALE_C.min) / (AMBIENT_SCALE_C.max - AMBIENT_SCALE_C.min))
}

/** Fader fraction (0 = no airflow, 1 = full) from the store's airflow value. Non-finite → 0. */
export function faderFraction(airflow: number): number {
  return clamp01(airflow)
}

/** Local angle (degrees, SVG clockwise from +u) of a temperature on the disc rim scale. */
export function discScaleAngle(tempC: number): number {
  const f = clamp01((tempC - DISC_SCALE_C.min) / (DISC_SCALE_C.max - DISC_SCALE_C.min))
  return DISC_SCALE_START_DEG + DISC_SCALE_SWEEP_DEG * f
}

/** Whole-percent text, or the placeholder for missing values. */
export function pctText(pct: number): string {
  return Number.isFinite(pct) ? `${String(Math.round(pct))}%` : '— —'
}

export interface ConsoleReading {
  hottest: number
  channel: ChannelId | null
  status: Status
  armatureA: number
  ratedA: number
  ambientC: number
  airflow: number
}

/** Accessible name for the whole console. */
export function consoleLabel(r: ConsoleReading): string {
  const where = r.channel === null ? '' : ` (T${String(r.channel)})`
  const disc =
    r.status === 'fault'
      ? `Hottest junction${where}: ${STATUS_LABEL.fault}`
      : `Hottest junction${where} ${formatTempC(r.hottest).trim()}, ${STATUS_LABEL[r.status]}`
  const amb = formatTempC(r.ambientC).trim()
  const air = pctText(Number.isFinite(r.airflow) ? r.airflow * 100 : Number.NaN)
  return `Drive console. ${disc}. Armature ${pctText(armaturePct(r.armatureA, r.ratedA))} of rated. Ambient ${amb}. Airflow ${air}.`
}
