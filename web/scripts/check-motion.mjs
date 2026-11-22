#!/usr/bin/env node
// Animated-property check (Requirement 34.1). Motion may animate only
// transform, opacity, small-element filter and SVG fill / stop-color.
//
// Fails when, anywhere under src/:
//   1. a CSS `transition` / `transition-property` value, or a property inside
//      an `@keyframes` block, names a layout property;
//   2. a TS/TSX `transition` style string, a Tailwind `transition-[…]` class
//      or `transition-all` names a layout property (or `all`);
//   3. a Motion target (`initial`, `animate`, `exit`, `while*`) or a Web
//      Animations `.animate([...])` keyframe uses a layout property as a key.
//
// Layout properties: width, height (incl. min-/max-), top, left, right,
// bottom, inset, margin*, padding*.
//
// Usage: node scripts/check-motion.mjs [rootDir]   (rootDir defaults to web/)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const LAYOUT = /^(?:(?:min|max)-?)?(?:width|height)$|^(?:top|left|right|bottom|inset)$|^(?:margin|padding)(?:-?\w+)?$/i

/** True for a property name (CSS or camelCase) that changes layout. */
export function isLayoutProperty(name) {
  return LAYOUT.test(name.trim())
}

function walk(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(?:tsx?|css)$/.test(entry.name)) out.push(full)
  }
  return out
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length

/** First word of each comma-separated transition item: "fill 300ms ease, x 1s" → ["fill", "x"]. */
const transitionProps = (value) =>
  value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean)

const CSS_TRANSITION = /\btransition(?:-property)?\s*:\s*([^;}]+)/g
const CSS_KEYFRAMES = /@keyframes\s+[\w-]+\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g
const CSS_DECL = /([\w-]+)\s*:/g
const TS_TRANSITION_STRING = /\btransition(?:Property)?\s*:\s*['"`]([^'"`]+)['"`]/g
const TW_TRANSITION = /\btransition-\[([^\]]+)\]/g
const TW_ALL = /\btransition-all\b/g
const MOTION_TARGET = /\b(?:initial|animate|exit|while[A-Z]\w*)\s*[=:]\s*\{\{?([^{}]*)\}/g
const WAAPI = /\.animate\(\s*\[([^\]]*)\]/g
const OBJECT_KEY = /([A-Za-z_$][\w$]*)\s*:/g

/** Run the check under rootDir; returns a list of violation strings. */
export function checkMotion(rootDir) {
  const root = resolve(rootDir)
  const violations = []
  for (const file of walk(join(root, 'src'))) {
    const text = readFileSync(file, 'utf8')
    const at = (index, what) => violations.push(`${relative(root, file)}:${lineOf(text, index)} animates ${what}`)
    const flagTransition = (value, index) => {
      for (const prop of transitionProps(value)) {
        if (prop === 'all' || isLayoutProperty(prop)) at(index, `layout property "${prop}" in a transition`)
      }
    }
    if (file.endsWith('.css')) {
      for (const m of text.matchAll(CSS_TRANSITION)) flagTransition(m[1], m.index)
      for (const m of text.matchAll(CSS_KEYFRAMES)) {
        for (const d of (m[1] ?? '').matchAll(CSS_DECL)) {
          if (isLayoutProperty(d[1])) at(m.index, `layout property "${d[1]}" in @keyframes`)
        }
      }
      continue
    }
    for (const m of text.matchAll(TS_TRANSITION_STRING)) flagTransition(m[1], m.index)
    for (const m of text.matchAll(TW_TRANSITION)) flagTransition(m[1], m.index)
    for (const m of text.matchAll(TW_ALL)) at(m.index, 'every property (transition-all)')
    for (const re of [MOTION_TARGET, WAAPI]) {
      for (const m of text.matchAll(re)) {
        for (const k of (m[1] ?? '').matchAll(OBJECT_KEY)) {
          if (isLayoutProperty(k[1])) at(m.index, `layout property "${k[1]}"`)
        }
      }
    }
  }
  return violations
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const rootDir = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const violations = checkMotion(rootDir)
  if (violations.length > 0) {
    console.error(`check-motion: ${violations.length} violation(s)`)
    for (const v of violations) console.error(`  ${v}`)
    process.exit(1)
  }
  console.log('check-motion: OK')
}
