import { describe, expect, it } from 'vitest'
import {
  applyMatrix,
  CONSOLE_LAYOUT,
  CONSOLE_SLAB,
  contactShadow,
  COS30,
  cropBrackets,
  discMatrix,
  faderGeometry,
  isoMatrix,
  knobPointer,
  knobStack,
  matrixAttr,
  pointsAttr,
  project,
  ringArc,
  SIN30,
  slabBounds,
  slabFaces,
  topFaceMatrix,
  unproject,
  type Vec2,
} from '../../src/visuals/console/iso'

const close = (a: Vec2, b: Vec2, digits = 6): void => {
  expect(a[0]).toBeCloseTo(b[0], digits)
  expect(a[1]).toBeCloseTo(b[1], digits)
}

describe('30° projection', () => {
  it('maps the local axes onto the 30° screen directions', () => {
    close(project(1, 0), [COS30, SIN30])
    close(project(0, 1), [-COS30, SIN30])
    close(project(0, 0, 10), [0, -10])
    expect(SIN30).toBeCloseTo(0.5, 12)
    expect(Math.atan2(SIN30, COS30) * (180 / Math.PI)).toBeCloseTo(30, 10)
  })

  it('matches the sketch matrix and agrees with project()', () => {
    const m = isoMatrix([470, 200])
    expect(matrixAttr(m)).toBe('matrix(0.866 0.5 -0.866 0.5 470 200)')
    for (const p of [[0, 0], [560, 0], [218, 66], [560, 420]] as const) {
      close(applyMatrix(m, p), project(p[0], p[1], 0, [470, 200]))
    }
  })

  it('unproject inverts project at a known height', () => {
    const o: Vec2 = [470, 230]
    for (const [u, v, h] of [[0, 0, 0], [218, 66, 50], [560, 420, 30], [-12.5, 7, 3]] as const) {
      const [x, y] = project(u, v, h, o)
      close(unproject(x, y, h, o), [u, v])
    }
  })
})

describe('slab faces', () => {
  const faces = slabFaces(CONSOLE_SLAB)

  it('puts the top face at the sketch position (origin 470,200 at thickness 30)', () => {
    close(faces.top[0], [470, 200])
    close(faces.top[1], [470 + 560 * COS30, 200 + 280])
    close(faces.top[2], [470 + 140 * COS30, 200 + 490])
    close(faces.top[3], [470 - 420 * COS30, 200 + 210])
  })

  it('shares the top front and right edges and drops the sides by the thickness', () => {
    close(faces.front[0], faces.top[3])
    close(faces.front[1], faces.top[2])
    close(faces.right[0], faces.top[1])
    close(faces.right[1], faces.top[2])
    close(faces.front[2], [faces.front[1][0], faces.front[1][1] + 30])
    close(faces.right[3], [faces.right[0][0], faces.right[0][1] + 30])
  })

  it('bounds cover every face corner', () => {
    const b = slabBounds(CONSOLE_SLAB)
    expect(b.x).toBeCloseTo(470 - 420 * COS30, 6)
    expect(b.y).toBeCloseTo(200, 6)
    expect(b.width).toBeCloseTo(980 * COS30, 6)
    expect(b.height).toBeCloseTo(490 + 30, 6)
  })

  it('centres the contact shadow under the footprint', () => {
    const s = contactShadow(CONSOLE_SLAB, 1, 0)
    close([s.cx, s.cy], project(280, 210, 0, CONSOLE_SLAB.origin))
    expect(s.rx).toBeCloseTo(490 * COS30, 6)
    expect(s.ry).toBeCloseTo(245, 6)
  })

  it('formats polygon points', () => {
    expect(pointsAttr([[1, 2], [3.14159, -0.0001]])).toBe('1,2 3.142,0')
  })
})

describe('knobs', () => {
  it('matches the sketch knob A ellipses', () => {
    const k = knobStack(CONSOLE_SLAB, CONSOLE_LAYOUT.knobA)
    expect(k.top.cx).toBeCloseTo(601.6, 1)
    expect(k.top.cy).toBeCloseTo(322, 6)
    expect(k.top.rx).toBeCloseTo(29.4, 1)
    expect(k.top.ry).toBeCloseTo(17, 1)
    expect(k.base.cy).toBeCloseTo(342, 6)
    expect(k.base.rx).toBeGreaterThan(k.top.rx)
    expect(k.inner.rx).toBeLessThan(k.top.rx)
    expect(k.top.ry / k.top.rx).toBeCloseTo(Math.tan(Math.PI / 6), 10)
    expect(k.side).toBe('M572.242 322V342A29.394 16.971 0 0 0 631.03 342V322Z')
  })

  it('ring arc fills 0 → 75 of a 100 path over the 270° sweep, clamped', () => {
    expect(ringArc(0).value).toBe('0 100')
    expect(ringArc(0.5).value).toBe('37.5 100')
    expect(ringArc(1).value).toBe('75 100')
    expect(ringArc(2).value).toBe('75 100')
    expect(ringArc(Number.NaN).value).toBe('0 100')
    expect(ringArc(0.3).track).toBe('75 100')
    expect(ringArc(0.3).rotateDeg).toBe(135)
  })

  it('pointer ends on the cap at the value angle', () => {
    const knob = CONSOLE_LAYOUT.knobA
    const h = CONSOLE_SLAB.thickness + knob.height
    const p = knobPointer(CONSOLE_SLAB, knob, 0, 0, 1)
    const [u1, v1] = unproject(p.x2, p.y2, h, CONSOLE_SLAB.origin)
    const a = (135 * Math.PI) / 180
    expect(u1).toBeCloseTo(knob.u + knob.radius * Math.cos(a), 6)
    expect(v1).toBeCloseTo(knob.v + knob.radius * Math.sin(a), 6)
    const [u0, v0] = unproject(p.x1, p.y1, h, CONSOLE_SLAB.origin)
    expect(u0).toBeCloseTo(knob.u, 6)
    expect(v0).toBeCloseTo(knob.v, 6)
  })
})

describe('fader', () => {
  const f = CONSOLE_LAYOUT.fader

  it('moves the cap along u from well start to well end, clamped', () => {
    const at0 = faderGeometry(CONSOLE_SLAB, f, 0).capCenter
    const at1 = faderGeometry(CONSOLE_SLAB, f, 1).capCenter
    const atHalf = faderGeometry(CONSOLE_SLAB, f, 0.5).capCenter
    close(at0, [f.x + f.capSize / 2, f.y + f.width / 2])
    close(at1, [f.x + f.length - f.capSize / 2, f.y + f.width / 2])
    close(atHalf, [(at0[0] + at1[0]) / 2, at0[1]])
    close(faderGeometry(CONSOLE_SLAB, f, -1).capCenter, at0)
    close(faderGeometry(CONSOLE_SLAB, f, 5).capCenter, at1)
  })

  it('projects the cap box above the top face', () => {
    const g = faderGeometry(CONSOLE_SLAB, f, 0.5)
    const top = CONSOLE_SLAB.thickness + f.capHeight
    const [cu, cv] = g.capCenter
    close(g.cap.top[0], project(cu - f.capSize / 2, cv - f.capSize / 2, top, CONSOLE_SLAB.origin))
    close(g.cap.front[3], project(cu - f.capSize / 2, cv + f.capSize / 2, CONSOLE_SLAB.thickness, CONSOLE_SLAB.origin))
    expect(g.well).toEqual({ x: 398, y: 57, width: 130, height: 18 })
    expect(g.innerShadow.x).toBe(403)
    expect(g.lip).toBe('M398 75H528V57')
  })
})

describe('heat disc transform', () => {
  it('lays a size×size disc on the top face, centred and scaled to the radius', () => {
    const { cx, cy, radius } = CONSOLE_LAYOUT.disc
    const m = discMatrix(CONSOLE_SLAB, cx, cy, radius, 240)
    const top = topFaceMatrix(CONSOLE_SLAB)
    close(applyMatrix(m, [120, 120]), applyMatrix(top, [cx, cy]))
    close(applyMatrix(m, [0, 0]), applyMatrix(top, [cx - radius, cy - radius]))
    close(applyMatrix(m, [240, 120]), applyMatrix(top, [cx + radius, cy]))
  })

  it('builds four crop-bracket corners', () => {
    const paths = cropBrackets(292, 274, 116, 12, 18)
    expect(paths).toHaveLength(4)
    expect(paths[0]).toBe('M164 164V146H182')
    expect(paths[2]).toBe('M420 384V402H402')
  })
})
