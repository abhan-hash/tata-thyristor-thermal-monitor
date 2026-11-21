// @vitest-environment node
import { resolve } from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const WEB = resolve(import.meta.dirname, '../..')
// Linted in memory under src/ so the component rules apply; nothing is written.
const FIXTURE_PATH = resolve(WEB, 'src/__lint_fixture__.tsx')

async function lint(code: string): Promise<{ ruleId: string | null; severity: number }[]> {
  const eslint = new ESLint({
    cwd: WEB,
    // The fixture never exists on disk, so let the project service type it
    // with its default project instead of a tsconfig.
    overrideConfig: {
      files: ['src/**/*.tsx'],
      languageOptions: {
        parserOptions: {
          projectService: { allowDefaultProject: ['src/__lint_fixture__.tsx'] },
          tsconfigRootDir: WEB,
        },
      },
    },
  })
  const [result] = await eslint.lintText(code, { filePath: FIXTURE_PATH })
  return result?.messages ?? []
}

// The first type-aware lint spins up the TypeScript project service (seconds).
describe('ESLint component rules', { timeout: 30_000 }, () => {
  it('reports a hex colour literal in .tsx', async () => {
    const messages = await lint(`export const A = () => <div style={{ color: '#F2B533' }} />\n`)
    expect(messages).toContainEqual(expect.objectContaining({ ruleId: 'no-restricted-syntax', severity: 2 }))
  })

  it('reports dangerouslySetInnerHTML', async () => {
    const messages = await lint(`export const A = () => <div dangerouslySetInnerHTML={{ __html: 'x' }} />\n`)
    expect(messages).toContainEqual(expect.objectContaining({ ruleId: 'react/no-danger', severity: 2 }))
  })

  it('accepts a token reference', async () => {
    const messages = await lint(`export const A = () => <div style={{ color: 'var(--accent)' }} />\n`)
    // Only the rules under test: the default project has no React types, so
    // unrelated type-aware rules may fire on this in-memory fixture.
    const ruleIds = messages.map((m) => m.ruleId)
    expect(ruleIds).not.toContain('no-restricted-syntax')
    expect(ruleIds).not.toContain('react/no-danger')
    expect(ruleIds).not.toContain(null) // no parse errors
  })
})
