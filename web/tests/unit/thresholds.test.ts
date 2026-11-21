// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { DEFAULT_THRESHOLDS, MODEL_PARAMS } from '../../src/domain/thresholds'

// Read-only: the dashboard config is the source of truth for default thresholds.
const YAML_PATH = resolve(import.meta.dirname, '../../../thermosense_dashboard/config/thresholds.yaml')

interface YamlBand {
  warning: number
  critical: number
  hysteresis: number
  debounce: number
}

interface ThresholdsYaml {
  alarms: {
    junction_temp: YamlBand
    heatsink_temp: YamlBand
    cooling_residual: YamlBand
    rms_current: YamlBand
    residual_rate: { critical: number; debounce: number }
  }
  model: {
    R_jc: number
    R_sa_baseline: number
    tau_1: number
    tau_2: number
    tau_3: number
    V_f0: number
    r_d: number
    rated_current: number
  }
}

const yaml = load(readFileSync(YAML_PATH, 'utf8')) as ThresholdsYaml

describe('DEFAULT_THRESHOLDS mirrors config/thresholds.yaml', () => {
  const bands = ['junction_temp', 'heatsink_temp', 'cooling_residual', 'rms_current'] as const

  it.each(bands)('%s band, hysteresis and debounce match', (key) => {
    const source = yaml.alarms[key]
    expect(DEFAULT_THRESHOLDS[key]).toEqual({
      warning: source.warning,
      critical: source.critical,
      hysteresis: source.hysteresis,
      debounce_s: source.debounce,
    })
  })

  it('residual_rate matches', () => {
    expect(DEFAULT_THRESHOLDS.residual_rate).toEqual({
      critical: yaml.alarms.residual_rate.critical,
      debounce_s: yaml.alarms.residual_rate.debounce,
    })
  })

  it('covers every alarm in the YAML', () => {
    expect(Object.keys(DEFAULT_THRESHOLDS).sort()).toEqual(Object.keys(yaml.alarms).sort())
  })
})

describe('MODEL_PARAMS mirrors config/thresholds.yaml', () => {
  it('matches every model parameter', () => {
    const m = yaml.model
    expect(MODEL_PARAMS).toEqual({
      R_jc: m.R_jc,
      R_sa_baseline: m.R_sa_baseline,
      tau: [m.tau_1, m.tau_2, m.tau_3],
      V_f0: m.V_f0,
      r_d: m.r_d,
      rated_current: m.rated_current,
    })
  })
})
