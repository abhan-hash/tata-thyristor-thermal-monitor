import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // Keep console output from passing tests so the fast-check seed is always logged.
      silent: false,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/property/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        include: ['src/domain/**/*.{ts,tsx}', 'src/data/**/*.{ts,tsx}'],
        reporter: ['text', 'html', 'json-summary'],
        thresholds: {
          'src/domain/**': { lines: 90 },
          'src/data/**': { lines: 90 },
        },
      },
    },
  }),
)
