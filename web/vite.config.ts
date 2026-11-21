import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const CSP =
  "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'"

// Matches the latin Archivo variable face imported by src/styles/fonts.css.
const PRELOAD_FONT = /archivo-latin-standard-normal[^/]*\.woff2$/

/**
 * Build-only plugin: injects the production CSP meta tag and a preload link
 * for the self-hosted latin Archivo woff2, then fails the build if any inline
 * <script> (one without a src attribute) remains in dist/index.html.
 */
function productionCsp(): Plugin {
  return {
    name: 'thermosense:production-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const tags: { tag: string; attrs: Record<string, string | boolean>; injectTo: 'head-prepend' }[] = [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
            injectTo: 'head-prepend',
          },
        ]
        const font = Object.values(ctx.bundle ?? {}).find(
          (file) => file.type === 'asset' && PRELOAD_FONT.test(file.fileName),
        )
        if (font) {
          tags.push({
            tag: 'link',
            attrs: {
              rel: 'preload',
              href: `/${font.fileName}`,
              as: 'font',
              type: 'font/woff2',
              crossorigin: true,
            },
            injectTo: 'head-prepend',
          })
        }
        return { html, tags }
      },
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') return
      const html = String(index.source)
      if (!html.includes('http-equiv="Content-Security-Policy"')) {
        this.error('dist/index.html is missing the Content-Security-Policy meta tag')
      }
      const inline = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(
        (match) => !/\bsrc\s*=/.test(match[1] ?? ''),
      )
      if (inline.length > 0) {
        this.error(`dist/index.html contains ${inline.length} inline <script> tag(s); CSP forbids them`)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), productionCsp()],
})
