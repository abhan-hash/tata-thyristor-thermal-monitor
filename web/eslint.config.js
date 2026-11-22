// @ts-check
import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Colour literals are banned in TSX: components must use semantic/component
// tokens via CSS variables or Tailwind classes (Requirement 2.4).
// Matches #rgb, #rgba, #rrggbb, #rrggbbaa (not HTML entities like &#123;).
const HEX = String.raw`(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_])`
const RGB = String.raw`\brgba?\s*\(`
const COLOUR_MESSAGE =
  'Colour literals are not allowed in components. Use a semantic or component token (var(--…) or a Tailwind theme class).'

const colourLiteralRules = [HEX, RGB].flatMap((pattern) => [
  { selector: `Literal[value=/${pattern}/]`, message: COLOUR_MESSAGE },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message: COLOUR_MESSAGE },
  { selector: `JSXText[value=/${pattern}/]`, message: COLOUR_MESSAGE },
])

// Files covered by a tsconfig project and therefore linted with type information.
const TYPED_FILES = ['src/**/*.{ts,tsx}', 'vite.config.ts']

export default defineConfig(
  {
    ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results', 'docs'],
  },

  js.configs.recommended,

  // Type-aware strict rules for code that belongs to a tsconfig project.
  {
    files: TYPED_FILES,
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Numbers in template literals are routine (sizes, ports, counts).
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  // Remaining TypeScript (tests, tool configs) without a tsconfig project:
  // strict rules that do not need type information.
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    ignores: TYPED_FILES,
    extends: [tseslint.configs.strict],
  },

  // Node scripts and config files.
  {
    files: ['**/*.{js,mjs,cjs}', '*.config.ts', 'scripts/**', 'tests/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // React application code.
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.tsx'], // Playwright fixtures (tests/**/*.ts) use a non-React `use`
    plugins: { react },
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // Requirement 1.4: SVG is rendered through typed JSX only.
      'react/no-danger': 'error',
    },
  },

  // Requirement 2.4: no hex/rgb colour literals in component TSX.
  {
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...colourLiteralRules],
    },
  },
)
