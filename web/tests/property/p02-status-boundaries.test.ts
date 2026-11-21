import fc from 'fast-check'
import { describe } from 'vitest'
import { statusFor } from '../../src/domain/status'
import { DEFAULT_THRESHOLDS } from '../../src/domain/thresholds'
import type { Status } from '../../src/domain/types'
import { propertyTest } from './runner'

/**
 * Property 2: Status boundaries.
 * For all finite x, statusFor(x) is `normal` iff x < warning, `warning` iff
 * warning ≤ x < critical, and `critical` iff x ≥ critical. Checked for the
 * Tj (110/125), heatsink (80/85) and residual (4/8) bands.
 *
 * **Validates: Requirements 4.1, 4.2**
 */

/** The adjacent double towards +∞ (dir = 1) or −∞ (dir = -1). Finite, non-zero input only. */
function adjacentDouble(x: number, dir: 1 | -1): number {
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, x)
  const bits = view.getBigInt64(0)
  // For positive x, increasing the bit pattern moves towards +∞.
  view.setBigInt64(0, x > 0 ? bits + BigInt(dir) : bits - BigInt(dir))
  return view.getFloat64(0)
}

function expectedStatus(x: number, warning: number, critical: number): Status {
  if (x >= critical) return 'critical'
  if (x >= warning) return 'warning'
  return 'normal'
}

/** Finite values biased toward the band's two boundaries. */
function valueNear(warning: number, critical: number): fc.Arbitrary<number> {
  const boundary = fc.constantFrom(warning, critical)
  return fc.oneof(
    // Exact boundaries and their immediate floating-point neighbours.
    { weight: 3, arbitrary: boundary },
    {
      weight: 3,
      arbitrary: fc
        .tuple(boundary, fc.constantFrom<1 | -1>(1, -1))
        .map(([b, dir]) => adjacentDouble(b, dir)),
    },
    // Small offsets around the boundaries.
    {
      weight: 3,
      arbitrary: fc
        .tuple(boundary, fc.double({ min: -1, max: 1, noNaN: true }))
        .map(([b, d]) => b + d),
    },
    // Anywhere in the finite range.
    { weight: 1, arbitrary: fc.double({ noNaN: true, noDefaultInfinity: true }) },
  )
}

const bands = [
  { name: 'junction_temp', band: DEFAULT_THRESHOLDS.junction_temp },
  { name: 'heatsink_temp', band: DEFAULT_THRESHOLDS.heatsink_temp },
  { name: 'cooling_residual', band: DEFAULT_THRESHOLDS.cooling_residual },
] as const

describe('status boundaries', () => {
  for (const { name, band } of bands) {
    propertyTest(
      2,
      `Status boundaries (${name} ${String(band.warning)}/${String(band.critical)})`,
      fc.property(valueNear(band.warning, band.critical), (x) => {
        const actual = statusFor(x, band)
        const expected = expectedStatus(x, band.warning, band.critical)
        if (actual !== expected) {
          throw new Error(`statusFor(${String(x)}) = ${actual}, expected ${expected}`)
        }
      }),
    )
  }
})
