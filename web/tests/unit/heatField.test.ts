import { describe, expect, it } from 'vitest'
import {
  anchorValues,
  BAND_COUNT,
  bandThresholds,
  buildField,
  FIELD_ANCHORS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  type FieldChannel,
} from '../../src/domain/heatField'
import type { ChannelId } from '../../src/domain/types'
import { blobBands } from '../../src/visuals/heat/blobGeometry'

// Heat field unit tests (Requirements 15.5, 15.6, 21.3). Band paths and the
// rendered component are covered in HeatBlobs.test.tsx.

const IDS: ChannelId[] = [1, 2, 3, 4, 5, 6]
const channelsAt = (tjs: number[]): FieldChannel[] =>
  IDS.map((id, i) => ({ id, tj_estimated: tjs[i] as number, sensor_healthy: true }))

const withFault = (channels: FieldChannel[], id: ChannelId, tj = Number.NaN): FieldChannel[] =>
  channels.map((ch) => (ch.id === id ? { ...ch, tj_estimated: tj, sensor_healthy: false } : ch))

const anchorIndex = (id: ChannelId) => FIELD_ANCHORS.findIndex((a) => a.channel === id)

describe('buildField', () => {
  it('produces a 48 × 32 field', () => {
    const field = buildField(channelsAt([80, 90, 100, 110, 120, 130]), 35)
    expect(field).toBeInstanceOf(Float32Array)
    expect(field).toHaveLength(FIELD_WIDTH * FIELD_HEIGHT)
  })
})

describe('bandThresholds', () => {
  it('returns six strictly increasing bands at all-ambient', () => {
    const bands = bandThresholds(buildField(channelsAt([35, 35, 35, 35, 35, 35]), 35))
    expect(bands).toHaveLength(BAND_COUNT)
    bands.slice(1).forEach((b, i) => expect(b.threshold).toBeGreaterThan((bands[i] as (typeof bands)[number]).threshold))
  })

  it('returns six bands with the innermost at --heat-8 when every Tj is exactly 125 °C', () => {
    const bands = bandThresholds(buildField(channelsAt([125, 125, 125, 125, 125, 125]), 35))
    expect(bands).toHaveLength(BAND_COUNT)
    expect(bands[BAND_COUNT - 1]?.heat).toBe(8)
    expect(bands[BAND_COUNT - 1]?.token).toBe('var(--heat-8)')
  })

  it('saturates the innermost band at --heat-8 for uneven all-trip inputs', () => {
    const bands = blobBands(channelsAt([125, 158, 131, 140, 126, 150]), 40)
    expect(bands).toHaveLength(BAND_COUNT)
    expect(bands[BAND_COUNT - 1]?.token).toBe('var(--heat-8)')
  })

  it('returns six bands for an empty or all-NaN field', () => {
    expect(bandThresholds(new Float32Array(0))).toHaveLength(BAND_COUNT)
    expect(bandThresholds(new Float32Array(FIELD_WIDTH * FIELD_HEIGHT).fill(Number.NaN))).toHaveLength(BAND_COUNT)
  })
})

describe('faulted channel anchor', () => {
  const base = channelsAt([80, 100, 120, 90, 70, 110])

  it('equals the mean of its healthy ring neighbours', () => {
    const values = anchorValues(withFault(base, 3), 35)
    // T3 sits between T2 (100) and T4 (90) on the anchor ring.
    expect(values[anchorIndex(3)]).toBeCloseTo(95, 10)
    // Healthy anchors keep their own Tj.
    expect(values[anchorIndex(2)]).toBe(100)
    expect(values[anchorIndex(4)]).toBe(90)
  })

  it('ignores the faulted reading itself', () => {
    expect(anchorValues(withFault(base, 3, 400), 35)).toEqual(anchorValues(withFault(base, 3), 35))
  })

  it('wraps around the ring and treats a non-finite Tj as faulted', () => {
    const channels = base.map((ch) => (ch.id === 1 ? { ...ch, tj_estimated: Number.POSITIVE_INFINITY } : ch))
    // T1 sits between T6 (110) and T2 (100).
    expect(anchorValues(channels, 35)[anchorIndex(1)]).toBeCloseTo(105, 10)
  })

  it('interpolates by ring distance across adjacent faults', () => {
    const values = anchorValues(withFault(withFault(base, 3), 4), 35)
    // Between T2 (100) and T5 (70): one third and two thirds of the way.
    expect(values[anchorIndex(3)]).toBeCloseTo(90, 10)
    expect(values[anchorIndex(4)]).toBeCloseTo(80, 10)
  })

  it('builds the same field as a healthy channel at the interpolated value', () => {
    const faulted = buildField(withFault(base, 3), 35)
    const healthy = buildField(base.map((ch) => (ch.id === 3 ? { ...ch, tj_estimated: 95 } : ch)), 35)
    expect(Array.from(faulted)).toEqual(Array.from(healthy))
  })

  it('falls back to ambient when every channel is faulted', () => {
    const allFaulted = IDS.reduce((chs, id) => withFault(chs, id), base)
    expect(anchorValues(allFaulted, 38)).toEqual([38, 38, 38, 38, 38, 38])
    expect(bandThresholds(buildField(allFaulted, 38))).toHaveLength(BAND_COUNT)
  })
})
