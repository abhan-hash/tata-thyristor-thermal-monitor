import { MODEL_PARAMS } from './thresholds'
import type { ModelParams, ThyristorFrame } from './types'

/**
 * Node temperatures and stage values for the Foster_Ladder (Requirement 18).
 *
 * The ladder reads junction → case → heatsink → air. Stage k sits between
 * node k and node k + 1 and is labelled with its Foster time constant τk and
 * resistance Rk. Following `foster-a` (SELECTION.md), Rk = R_jc · share k with
 * an equal split, the same split the mock simulator uses.
 *
 * Node temperatures come from the frame, not from a second simulation:
 * - junction: `tj_estimated`;
 * - heatsink: `t_heatsink_measured`, or, when the RTD is unhealthy, the
 *   steady-state estimate ambient + P · R_sa;
 * - case: between junction and heatsink, splitting the junction rise in the
 *   ratio R1 : R2 (the case node sits after stage 1);
 * - air: the drive ambient.
 * The values are clamped so junction ≥ case ≥ heatsink ≥ air. RTD noise can
 * put the measured heatsink a fraction of a kelvin above Tj or below ambient,
 * and heat never flows backwards along the drawn ladder.
 */

/** Share of R_jc carried by each Foster stage. Mirrors FOSTER_R_FRACTIONS in the simulator. */
export const FOSTER_STAGE_SHARES = Object.freeze([1 / 3, 1 / 3, 1 / 3] as const)

export type FosterNodeKey = 'junction' | 'case' | 'heatsink' | 'air'

export const FOSTER_NODE_KEYS: readonly FosterNodeKey[] = Object.freeze([
  'junction',
  'case',
  'heatsink',
  'air',
])

export interface FosterStage {
  /** 1, 2 or 3. */
  index: 1 | 2 | 3
  /** K/W */
  r: number
  /** s */
  tau: number
  /** J/K, C = τ / R. */
  c: number
}

export interface FosterNodeTemps {
  /** °C; NaN when the junction estimate is unavailable. */
  junction: number
  case: number
  heatsink: number
  air: number
  /** True when the heatsink value is the R_sa estimate because the RTD is unhealthy. */
  heatsinkEstimated: boolean
}

/** The three ladder stages from model params: R = R_jc · share, τ from params, C = τ / R. */
export function fosterStages(params: Readonly<ModelParams> = MODEL_PARAMS): readonly [FosterStage, FosterStage, FosterStage] {
  const stage = (i: 0 | 1 | 2): FosterStage => {
    const r = params.R_jc * FOSTER_STAGE_SHARES[i]
    const tau = params.tau[i]
    return { index: (i + 1) as 1 | 2 | 3, r, tau, c: r > 0 ? tau / r : Number.NaN }
  }
  return [stage(0), stage(1), stage(2)]
}

/** Node temperatures for one channel. Any non-finite junction makes every node NaN (fault treatment). */
export function fosterNodeTemps(
  frame: Pick<ThyristorFrame, 'tj_estimated' | 't_heatsink_measured' | 'power_loss' | 'r_sa' | 'sensor_healthy'>,
  ambient: number,
  params: Readonly<ModelParams> = MODEL_PARAMS,
): FosterNodeTemps {
  const tj = frame.tj_estimated
  if (!Number.isFinite(tj) || !Number.isFinite(ambient)) {
    return { junction: Number.NaN, case: Number.NaN, heatsink: Number.NaN, air: Number.NaN, heatsinkEstimated: false }
  }
  const measured = frame.t_heatsink_measured
  const heatsinkEstimated = !frame.sensor_healthy || !Number.isFinite(measured)
  let heatsink: number
  if (heatsinkEstimated) {
    const power = Number.isFinite(frame.power_loss) ? Math.max(0, frame.power_loss) : 0
    const rSa = Number.isFinite(frame.r_sa) && frame.r_sa > 0 ? frame.r_sa : params.R_sa_baseline
    heatsink = ambient + power * rSa
  } else {
    heatsink = measured
  }
  // Enforce junction ≥ heatsink ≥ air.
  const air = Math.min(ambient, tj)
  heatsink = Math.min(tj, Math.max(air, heatsink))
  const [s1, s2] = fosterStages(params)
  const total = s1.r + s2.r
  const share = total > 0 ? s1.r / total : 0.5
  const caseTemp = tj - (tj - heatsink) * share
  return { junction: tj, case: caseTemp, heatsink, air, heatsinkEstimated }
}

/** Dash flow speed per watt of power loss, user units per second. 500 W → 30 u/s. */
export const DASH_SPEED_PER_W = 0.06

/** Dash flow speed (user units/s), proportional to power loss; 0 for non-positive or non-finite power. */
export function dashSpeed(powerW: number): number {
  if (!Number.isFinite(powerW) || powerW <= 0) return 0
  return powerW * DASH_SPEED_PER_W
}
