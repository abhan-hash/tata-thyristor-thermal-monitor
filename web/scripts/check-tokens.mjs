#!/usr/bin/env node
// Token-usage and provenance check (Requirements 1.3, 2.4, 8.5).
//
// Fails when:
//   1. a component file (src/kit, src/visuals, src/pages, src/charts) references
//      a primitive token (--ink-*, --gold-*); components may use only semantic
//      and component tokens;
//   2. any CSS file (or index.html) imports a stylesheet or asset from an
//      external host;
//   3. any file in src/data/mock/ does not begin with the MOCK header line.
//
// Usage: node scripts/check-tokens.mjs [rootDir]   (rootDir defaults to web/)

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, relative, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MOCK_HEADER = '// MOCK DATA – synthetic, not plant telemetry'
export const COMPONENT_DIRS = ['src/kit', 'src/visuals', 'src/pages', 'src/charts']
const COMPONENT_EXT = /\.(?:tsx?|css)$/
const IGNORED_FILES = new Set(['.gitkeep', '.DS_Store'])

const PRIMITIVE_TOKEN = /(?<![\w-])--(?:ink|gold)-[\w-]*/g
// External = absolute http(s) URL or protocol-relative //host.
const EXTERNAL = String.raw`(?:https?:)?\/\/`
const CSS_EXTERNAL_IMPORT = new RegExp(String.raw`@import\s+(?:url\(\s*)?["']?\s*${EXTERNAL}`, 'gi')
const CSS_EXTERNAL_URL = new RegExp(String.raw`url\(\s*["']?\s*${EXTERNAL}`, 'gi')
const HTML_EXTERNAL_STYLESHEET = new RegExp(
  String.raw`<link\b(?=[^>]*\brel=["']?(?:stylesheet|preload)\b)[^>]*\bhref=["']?\s*${EXTERNAL}[^>]*>`,
  'gi',
)

/** Recursively list files under dir (absolute paths). Missing dir → []. */
function walk(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.isFile() && !IGNORED_FILES.has(entry.name)) out.push(full)
  }
  return out
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length
}

/** Run every check under rootDir; returns a list of violation strings. */
export function checkTokens(rootDir) {
  const root = resolve(rootDir)
  const rel = (p) => relative(root, p)
  const violations = []

  // 1. Primitive tokens in component files.
  for (const dir of COMPONENT_DIRS) {
    for (const file of walk(join(root, dir))) {
      if (!COMPONENT_EXT.test(file)) continue
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(PRIMITIVE_TOKEN)) {
        violations.push(
          `${rel(file)}:${lineOf(text, m.index)} references primitive token ${m[0]}; use a semantic or component token`,
        )
      }
    }
  }

  // 2. External CSS imports.
  const cssFiles = walk(join(root, 'src')).filter((f) => f.endsWith('.css'))
  for (const file of cssFiles) {
    const text = readFileSync(file, 'utf8')
    const lines = new Set()
    for (const re of [CSS_EXTERNAL_IMPORT, CSS_EXTERNAL_URL]) {
      for (const m of text.matchAll(re)) lines.add(lineOf(text, m.index))
    }
    for (const line of [...lines].sort((a, b) => a - b)) {
      violations.push(`${rel(file)}:${line} loads CSS or assets from an external host`)
    }
  }
  const indexHtml = join(root, 'index.html')
  if (existsSync(indexHtml) && statSync(indexHtml).isFile()) {
    const text = readFileSync(indexHtml, 'utf8')
    for (const m of text.matchAll(HTML_EXTERNAL_STYLESHEET)) {
      violations.push(`index.html:${lineOf(text, m.index)} links a stylesheet or font from an external host`)
    }
  }

  // 3. MOCK header on every file in src/data/mock/.
  for (const file of walk(join(root, 'src/data/mock'))) {
    const firstLine = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0]
    if (firstLine !== MOCK_HEADER) {
      violations.push(`${rel(file)}:1 must begin with "${MOCK_HEADER}"`)
    }
  }

  return violations
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const rootDir = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const violations = checkTokens(rootDir)
  if (violations.length > 0) {
    console.error(`check-tokens: ${violations.length} violation(s)`)
    for (const v of violations) console.error(`  ${v}`)
    process.exit(1)
  }
  console.log('check-tokens: OK')
}
