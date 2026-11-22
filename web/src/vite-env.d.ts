/// <reference types="vite/client" />

// App-specific build-time variables (Requirement 8.3).
interface ImportMetaEnv {
  /** `mock` (default when unset) or `ws`. */
  readonly VITE_DATA_SOURCE?: string
  /** Seed for the mock PRNG; `?seed=` overrides it. */
  readonly VITE_MOCK_SEED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
