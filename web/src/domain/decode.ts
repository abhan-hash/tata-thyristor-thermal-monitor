import { maxSeverity } from './status'
import { DEFAULT_THRESHOLDS } from './thresholds'
import type { ChannelId, DriveFrame, Status, ThyristorFrame } from './types'

/**
 * Frame_Decoder (Requirement 9). Validates and normalises an untrusted frame
 * before it reaches the Telemetry_Store. Pure apart from the injected logger.
 *
 * Rejection rules (error result):
 * - input or a thyristor entry is not a plain object
 * - a required key is missing or has the wrong type
 * - `thyristors` is not an array of exactly six entries with ids 1..6 in order
 * - any numeric field is ±∞
 * - a channel numeric field is NaN while that channel's `sensor_healthy` is true
 *   (NaN is accepted only on channels flagged unhealthy)
 * - a drive-level numeric field is NaN (there is no sensor flag to excuse it)
 * - `timestamp` is not a parseable date string
 *
 * Normalisation rules:
 * - `margin_to_limit = 125 − tj_estimated`; input mismatches > 0.01 K are logged
 * - channels with `sensor_healthy` false get status `fault`
 * - `overall_status` = `maxSeverity` of the channel statuses
 * - unknown keys are dropped (output objects contain only known keys)
 */

/** Tj trip limit used for `margin_to_limit` (°C). Fixed at 125 by Requirement 9.5. */
export const TJ_LIMIT_C: number = DEFAULT_THRESHOLDS.junction_temp.critical

/** Largest accepted difference between an input margin and the recomputed one (K). */
export const MARGIN_TOLERANCE_K = 0.01

export interface DecodeError {
  /** Dotted path to the offending value, e.g. `thyristors[2].tj_estimated`. Empty for the root. */
  path: string
  message: string
}

export type DecodeResult = { ok: true; frame: DriveFrame } | { ok: false; error: DecodeError }

export interface MarginMismatch {
  channel: ChannelId
  input: number
  computed: number
}

export interface DecodeLogger {
  marginMismatch(details: MarginMismatch): void
}

export interface DecodeOptions {
  logger?: DecodeLogger
}

/** Default logger: reports margin mismatches with `console.warn`. */
export const consoleDecodeLogger: DecodeLogger = {
  marginMismatch({ channel, input, computed }) {
    console.warn(
      `decodeDriveFrame: margin_to_limit mismatch on channel ${channel}: input ${input}, computed ${computed}`,
    )
  },
}

const STATUSES: ReadonlySet<string> = new Set<Status>(['normal', 'warning', 'critical', 'fault'])

/** Channel numeric fields other than `margin_to_limit`, which is recomputed. */
const CHANNEL_NUMBERS = [
  'tj_estimated',
  't_heatsink_measured',
  'power_loss',
  'current',
  'residual',
  'r_sa',
] as const

class Reject extends Error {
  readonly path: string
  constructor(path: string, message: string) {
    super(message)
    this.path = path
  }
}

type Rec = Readonly<Record<string, unknown>>

function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function at(base: string, key: string): string {
  return base === '' ? key : `${base}.${key}`
}

function field(obj: Rec, key: string, path: string): unknown {
  if (!Object.hasOwn(obj, key)) throw new Reject(at(path, key), 'missing required key')
  return obj[key]
}

/** A number that is not ±∞. NaN passes only when `allowNaN` is true. */
function num(obj: Rec, key: string, path: string, allowNaN: boolean): number {
  const v = field(obj, key, path)
  const p = at(path, key)
  if (typeof v !== 'number') throw new Reject(p, 'expected a number')
  if (Number.isNaN(v)) {
    if (!allowNaN) throw new Reject(p, 'NaN is only allowed on a channel with sensor_healthy false')
    return v
  }
  if (!Number.isFinite(v)) throw new Reject(p, 'infinite value')
  return v
}

function bool(obj: Rec, key: string, path: string): boolean {
  const v = field(obj, key, path)
  if (typeof v !== 'boolean') throw new Reject(at(path, key), 'expected a boolean')
  return v
}

function status(obj: Rec, key: string, path: string): Status {
  const v = field(obj, key, path)
  if (typeof v !== 'string' || !STATUSES.has(v)) {
    throw new Reject(at(path, key), 'expected one of normal, warning, critical, fault')
  }
  return v as Status
}

function decodeChannel(input: unknown, index: number, logger: DecodeLogger): ThyristorFrame {
  const path = `thyristors[${index}]`
  if (!isRecord(input)) throw new Reject(path, 'expected an object')

  const expectedId = (index + 1) as ChannelId
  const id = field(input, 'id', path)
  if (id !== expectedId) throw new Reject(at(path, 'id'), `expected id ${expectedId}`)

  const sensor_healthy = bool(input, 'sensor_healthy', path)
  const allowNaN = !sensor_healthy
  const [tj_estimated, t_heatsink_measured, power_loss, current, residual, r_sa] =
    CHANNEL_NUMBERS.map((key) => num(input, key, path, allowNaN)) as [
      number,
      number,
      number,
      number,
      number,
      number,
    ]

  // Recomputed below, so only the type matters; any number (including ±∞, NaN) is tolerated.
  const marginIn = field(input, 'margin_to_limit', path)
  if (typeof marginIn !== 'number') throw new Reject(at(path, 'margin_to_limit'), 'expected a number')
  const margin_to_limit = TJ_LIMIT_C - tj_estimated
  const bothNaN = Number.isNaN(marginIn) && Number.isNaN(margin_to_limit)
  if (!bothNaN && !(Math.abs(marginIn - margin_to_limit) <= MARGIN_TOLERANCE_K)) {
    logger.marginMismatch({ channel: expectedId, input: marginIn, computed: margin_to_limit })
  }

  const statusIn = status(input, 'status', path)

  return {
    id: expectedId,
    tj_estimated,
    t_heatsink_measured,
    power_loss,
    current,
    residual,
    r_sa,
    margin_to_limit,
    status: sensor_healthy ? statusIn : 'fault',
    sensor_healthy,
  }
}

function decode(input: unknown, logger: DecodeLogger): DriveFrame {
  if (!isRecord(input)) throw new Reject('', 'expected an object')

  const timestamp = field(input, 'timestamp', '')
  if (typeof timestamp !== 'string' || Number.isNaN(Date.parse(timestamp))) {
    throw new Reject('timestamp', 'expected an ISO 8601 date string')
  }

  const list = field(input, 'thyristors', '')
  if (!Array.isArray(list)) throw new Reject('thyristors', 'expected an array')
  if (list.length !== 6) throw new Reject('thyristors', `expected 6 thyristors, got ${list.length}`)
  const thyristors = (list as readonly unknown[]).map((ch, i) =>
    decodeChannel(ch, i, logger),
  ) as unknown as DriveFrame['thyristors']

  const armature_current = num(input, 'armature_current', '', false)
  const ambient_temp = num(input, 'ambient_temp', '', false)
  const fan_status = bool(input, 'fan_status', '')
  // Validated for type, then replaced by the worst channel status.
  status(input, 'overall_status', '')
  const active_alarms_count = num(input, 'active_alarms_count', '', false)
  if (!Number.isInteger(active_alarms_count) || active_alarms_count < 0) {
    throw new Reject('active_alarms_count', 'expected a non-negative integer')
  }

  return {
    timestamp,
    thyristors,
    armature_current,
    ambient_temp,
    fan_status,
    overall_status: maxSeverity(thyristors.map((ch) => ch.status)),
    active_alarms_count,
  }
}

/**
 * Validates and normalises one frame. Never throws: any failure, including an
 * unexpected exception from exotic input or the logger, becomes an error result.
 */
export function decodeDriveFrame(input: unknown, options: DecodeOptions = {}): DecodeResult {
  const logger = options.logger ?? consoleDecodeLogger
  try {
    return { ok: true, frame: decode(input, logger) }
  } catch (e) {
    if (e instanceof Reject) return { ok: false, error: { path: e.path, message: e.message } }
    let message = 'unexpected error while decoding'
    try {
      if (e instanceof Error) message = `${message}: ${e.message}`
    } catch {
      // e.message itself threw; keep the generic message.
    }
    return { ok: false, error: { path: '', message } }
  }
}
