# Implementation Plan: THERMOSENSE Frontend Redesign

## Overview

The plan builds the standalone `web/` app in TypeScript (Vite, React, Tailwind, Motion, visx, Zustand, TanStack Query) in five phases that match Requirement 42: design system, data layer and kit; signature visuals; pages; motion; QA. Each task is sized for one sub-agent run and builds on earlier tasks. Pure logic lives in `web/src/domain` and `web/src/data` and is tested with Vitest and fast-check. Browser behaviour is tested with Playwright.

Property-based test tasks are marked **[PBT]**. Each one implements exactly one design property as one fast-check test in `web/tests/property/`, named `Feature: thermosense-frontend-redesign, Property N: <title>`, using the shared runner from task 1.2 (200 runs by default, `FC_NUM_RUNS=2000` for nightly, seed logged).

Every phase ends with a checkpoint that runs lint, typecheck and tests, captures Playwright screenshots into `web/docs/screenshots/phase-N/`, and commits only `web/` and `.kiro/specs/`. The working tree currently has unrelated uncommitted deletions (`stage1_loss.py`, `stage2_rc.py`, `take_screenshot.py`) and an untracked `reference/` folder. Checkpoint commits must never stage these.

## Tasks

### Phase 1: Design system, data layer and component kit

- [x] 1. Scaffold the `web/` project
  - [x] 1.1 Create the Vite + React + TypeScript project in `web/`
    - Run `npm create vite` (react-ts template) in `web/`, enable `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` in `tsconfig.json`
    - Install runtime deps: `react-router`, `motion`, `@visx/shape`, `@visx/scale`, `@visx/axis`, `@visx/group`, `@visx/event`, `d3-contour`, `d3-shape`, `zustand`, `@tanstack/react-query`, `@tanstack/react-virtual`, `@fontsource-variable/archivo`
    - Install dev deps: `tailwindcss` (+ PostCSS/Vite plugin), `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `fast-check`, `@playwright/test`, `@axe-core/playwright`, `eslint`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `js-yaml`, `@types/*` as needed
    - Create the folder skeleton from the design (`src/styles`, `src/domain`, `src/data/mock/fixtures`, `src/kit`, `src/visuals/{console,bridge,foster,mill,airflow,heat}`, `src/charts`, `src/motion`, `src/pages`, `src/state`, `tests/{unit,property,e2e,visual}`, `docs/{art-direction,screenshots}`, `scripts`)
    - Add `web/.gitignore` covering `node_modules`, `dist`, `coverage`, `test-results`, `playwright-report`
    - Add npm scripts: `dev`, `build`, `preview`, `lint`, `typecheck` (`tsc -b --noEmit`), `test` (`vitest run`), `test:property`, `test:property:nightly` (`FC_NUM_RUNS=2000`), `coverage`, `test:e2e`, `screenshots`, `check` (lint + typecheck + test + token check)
    - Do not touch any file outside `web/`
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Configure Vitest and the shared fast-check runner
    - `vitest.config.ts` with jsdom, Testing Library setup, `tests/unit/**` and `tests/property/**` globs
    - Coverage via v8 with a 90% line threshold scoped to `src/domain/**` and `src/data/**`
    - `tests/property/runner.ts` exporting `propertyTest(n, title, property)` that reads `FC_NUM_RUNS` (default 200), logs the seed on every run, and names the test `Feature: thermosense-frontend-redesign, Property N: <title>`
    - _Requirements: 41.2, 41.3, 41.4_

  - [x] 1.3 Configure ESLint and the token-usage check
    - `eslint.config.js` (flat) with `typescript-eslint` strict-type-checked, `react-hooks`, and `react/no-danger` as an error
    - `no-restricted-syntax` rule that errors on hex (`#rgb`, `#rrggbb`, `#rrggbbaa`) and `rgb(`/`rgba(` literals in `src/**/*.tsx`
    - `scripts/check-tokens.mjs`: fails if a component file (`src/kit`, `src/visuals`, `src/pages`, `src/charts`) references a primitive token (`--ink-*`, `--gold-*`), if any CSS imports from an external host, or if any file in `src/data/mock/` lacks the first line `// MOCK DATA – synthetic, not plant telemetry`
    - Wire the check into `npm run lint`
    - _Requirements: 1.3, 1.4, 2.4, 8.5_

  - [x] 1.4 Configure Playwright and the phase screenshot capture
    - `playwright.config.ts`: Chromium, `webServer` running `npm run build && npm run preview -- --port 4173 --strictPort`, projects for 1440, 1024 and 390 px widths
    - `tests/fixtures.ts`: fixture that installs a frozen clock (`page.clock.install` at a fixed instant) and appends `?seed=1337` to every navigation
    - `tests/visual/routes.ts`: exported list of routes to capture (starts with `/kit` only; later phases append)
    - `tests/visual/capture.spec.ts`: for each route and project width, writes `docs/screenshots/phase-${PHASE}/<route-slug>-<width>.png`; `npm run screenshots` runs only this spec and requires `PHASE`
    - _Requirements: 37.1, 42.2_

  - [x] 1.5 Self-hosted fonts and production CSP
    - Import `@fontsource-variable/archivo` (Latin subset, `font-display: swap`) from `src/main.tsx` and preload the woff2 in `index.html`
    - Vite plugin in `vite.config.ts` that, for `build` only, injects `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'">` and verifies no inline `<script>` remains in `dist/index.html`
    - Read the mock seed from `?seed=` or `VITE_MOCK_SEED` in a small `src/config.ts`
    - _Requirements: 1.3, 1.5_

- [x] 2. Build the three-layer token system
  - [x] 2.1 Write the token CSS files
    - `src/styles/tokens.primitive.css`: every primitive in the design table (ink, gold, heat-0..8, signal, type roles and the 11–96 px scale, 4-pt space scale, radii, elevation, easings, durations)
    - `src/styles/tokens.semantic.css`: surfaces, lines, text, accent, status, `--heat-[0..8]` aliases, `--focus-ring`
    - `src/styles/tokens.component.css`: rack row, source button, KPI, crop bracket, chart bands, fader, toggle, disc rim tokens
    - `src/styles/global.css`: imports the three layers, base page styles, `.num` utility with `font-variant-numeric: tabular-nums`, global `:focus-visible` ring from `--focus-ring`, `prefers-reduced-motion` base rule
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 3.7_

  - [x] 2.2 Map the Tailwind theme to semantic variables
    - `tailwind.config.ts` (or Tailwind v4 `@theme` block) mapping colours (`surface-*`, `line-*`, `text-*`, `accent*`, `status-*`, `heat-0..8`), spacing, radii, font sizes, easing and durations to `var(--…)`
    - Keep `heat-*` utilities in a separate namespace so they are only used for temperature encoding
    - _Requirements: 2.3, 2.5_

  - [x] 2.3 Write unit tests for the token system
    - Parse the CSS files and assert every primitive from the design exists with its sampled value
    - Assert the Tailwind class `bg-surface-raised` compiles to `var(--surface-raised)`
    - Lint fixture test: running ESLint on a `.tsx` snippet with `#F2B533` reports an error; `dangerouslySetInnerHTML` reports an error
    - _Requirements: 1.4, 2.2, 2.3, 2.4_

- [x] 3. Implement domain types, status, heat scale and formatting
  - [x] 3.1 Define domain types and thresholds
    - `src/domain/types.ts`: `ChannelId`, `Status`, `ThyristorFrame`, `DriveFrame`, `Thresholds`, `Band`, `ModelParams`, `Scenario`, `AlarmEvent`, `WearRecord`, `ConnectionStatus` with snake_case keys exactly as in the design
    - `src/domain/thresholds.ts`: `DEFAULT_THRESHOLDS` and `MODEL_PARAMS` mirroring `thermosense_dashboard/config/thresholds.yaml` (debounce in seconds)
    - Unit test that loads the YAML with `js-yaml` (read-only) and asserts every band value, hysteresis, debounce and model parameter matches
    - _Requirements: 4.4, 8.6_

  - [x] 3.2 Implement the Status_Classifier
    - `src/domain/status.ts`: `statusFor(value, band)`, `severityRank(status)`, `maxSeverity(statuses)`; normal below warning, warning in [warning, critical), critical at or above critical
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.3 [PBT] Write property test for status monotonicity
    - **Property 1: Status monotonicity**
    - File `tests/property/p01-status-monotonicity.test.ts`; generate arbitrary valid bands (warning < critical) and finite a ≤ b
    - **Validates: Requirements 4.3**

  - [x] 3.4 [PBT] Write property test for status boundaries
    - **Property 2: Status boundaries**
    - File `tests/property/p02-status-boundaries.test.ts`; cover Tj (110/125), heatsink (80/85) and residual (4/8) bands from `DEFAULT_THRESHOLDS`, with generators biased toward the boundary values
    - **Validates: Requirements 4.1, 4.2**

  - [x] 3.5 Implement the Heat_Scale
    - `src/domain/heatScale.ts`: `heatStopIndex(tempC)` returning 0..8 (ambient ≈ 35 °C → 0, ≥ 125 °C → 8, monotone breakpoints in between), `heatToken(index)` returning `var(--heat-N)`, and `heatTreatment(temp)` returning `{ kind: "heat", index } | { kind: "fault" }` for non-finite input
    - _Requirements: 4.5, 4.6_

  - [x] 3.6 [PBT] Write property test for heat scale monotonicity and range
    - **Property 3: Heat scale monotonicity and range**
    - File `tests/property/p03-heat-scale.test.ts`; include ±∞ and NaN in the generator and assert non-finite input yields the fault treatment
    - **Validates: Requirements 4.5, 4.6**

  - [x] 3.7 Implement the Formatter
    - `src/domain/format.ts`: `formatTempC`, `formatDeltaK`, `formatCurrentA`, `formatPowerW`, `formatThermalResKW`, `formatDuration`, each with a fixed precision (Tj at 0.1 °C)
    - Fixed-width output: one sign position (`−` or U+2007 figure space), integer part left-padded with U+2007 to the width needed for [−50, 250], one `.`, the fractional digits, a space, then the unit
    - NaN returns `— —` padded with U+2007 to the same length; no output may contain `&` entities
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.8 [PBT] Write property test for formatting stability
    - **Property 7: Formatting stability**
    - File `tests/property/p07-format-stability.test.ts`; for each formatter, assert constant length over [−50, 250], the allowed character class (digits, sign/padding position, one `.`, space, unit), the NaN placeholder width, and no `&…;` sequences
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.6**

  - [x] 3.9 [PBT] Write property test for precision revealing differences
    - **Property 8: Precision reveals differences**
    - File `tests/property/p08-format-precision.test.ts`; for a, b in the display range with |a − b| ≥ 0.1, `formatTempC(a) !== formatTempC(b)`
    - **Validates: Requirements 3.5**

  - [x] 3.10 Implement derived frame helpers
    - `src/domain/derive.ts`: `hottestTj(frame)` over healthy channels only (NaN when none), `channelMean`, `deltaFromMean(frame, id)`, `marginToTrip`, `timeToWarning(series, warning)` (linear extrapolation over the last 10 s, `null` when not rising)
    - Unit tests including a frame with a faulted hottest channel
    - _Requirements: 21.2, 24.7, 24.8_

- [x] 4. Implement the Frame_Decoder
  - [x] 4.1 Write `decodeDriveFrame`
    - `src/domain/decode.ts`: `decodeDriveFrame(input: unknown): { ok: true; frame } | { ok: false; error }`, never throws (wrap in try/catch as a last resort)
    - Reject: missing required keys, wrong types, thyristor count ≠ 6, ids not 1..6 in order, infinite temperatures, NaN temperature with `sensor_healthy` true
    - Normalise: recompute `margin_to_limit = 125 − tj_estimated` and log mismatches > 0.01 K through an injectable logger; force `fault` for unhealthy channels; recompute `overall_status` with `maxSeverity`; drop unknown keys
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [x] 4.2 [PBT] Write property test for overall status
    - **Property 5: Overall status is the worst channel**
    - File `tests/property/p05-overall-status.test.ts`; generate valid frames with random statuses and health flags (including contradictory input `overall_status`)
    - **Validates: Requirements 9.6, 9.7**

  - [x] 4.3 [PBT] Write property test for margin consistency
    - **Property 6: Margin consistency**
    - File `tests/property/p06-margin-consistency.test.ts`; generate frames with arbitrary input `margin_to_limit` values
    - **Validates: Requirements 9.5**

  - [x] 4.4 [PBT] Write property test for decode robustness
    - **Property 14: Decode robustness**
    - File `tests/property/p14-decode-robustness.test.ts`; mix `fc.jsonValue()`, `fc.anything()` and mutated valid frames (removed keys, extra keys, wrong counts, ±∞, NaN); assert no throw and that every ok result satisfies Properties 5 and 6
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.8**

  - [x] 4.5 Write unit tests for each decoder rejection and normalisation rule
    - One example per rule in 4.1, plus a mismatch-logging assertion
    - _Requirements: 9.2, 9.3, 9.5, 9.8_

- [x] 5. Implement the data ports and mock telemetry
  - [x] 5.1 Define ports and the seeded PRNG
    - `src/data/ports.ts`: `TelemetrySource` and `HistoryRepository` exactly as in the design
    - `src/data/mock/rng.ts`: mulberry32, `gaussian(rng)`; file starts with the MOCK header
    - _Requirements: 8.1, 8.2, 8.5_

  - [x] 5.2 Implement the Foster simulation step
    - `src/data/mock/fosterSim.ts` (MOCK header): pure `step(state, dt, rng, params)` producing the next sim state and a `DriveFrame`
    - Current: 55% rated base + bar-entry spike (+40% rated, Gaussian envelope, every 8 s, 2.4 s) + 2% noise; `I = armature / 3` per device
    - Power `V_f0·I + r_d·I²`; 3-stage Foster junction rise (τ 0.02 / 0.5 / 20 s) with exact exponential discretisation; heatsink first-order lag toward `ambient + P·R_sa` plus 0.08 °C RTD noise; ambient `35 + 3·sin(t/120)`
    - Fixed per-channel offsets: R_sa ±4%, current share ±2%, so steady-state T1–T6 differ by 1–4 K
    - Clamp outputs to the physical bounds listed in Requirement 10.7
    - _Requirements: 10.3, 10.4, 10.5, 10.7_

  - [x] 5.3 Implement scenarios and `MockTelemetrySource`
    - `src/data/mock/scenarios.ts` (MOCK header): `fan_failure` (R_sa × 2.2, `fan_status` false), `clogging` (R_sa +60% ramp over 60 s), `overload` (base 115% rated), `bar_entry` (spike now), `clear` (baseline)
    - `src/data/mock/MockTelemetrySource.ts` (MOCK header): `kind = "mock"`, 100 ms interval, timestamps from the sim clock (+100 ms per tick), `subscribe`, `onStatus` (`connecting` → `live`), `setScenario`, and a synchronous `runTicks(n)` for tests
    - _Requirements: 10.1, 10.2, 10.6, 12.1_

  - [x] 5.4 [PBT] Write property test for mock physical bounds
    - **Property 9: Mock physical bounds**
    - File `tests/property/p09-mock-bounds.test.ts`; generate seed, a scenario script (scenario + tick index pairs) and run length ≤ 3000 via `runTicks`; assert every bound and the 100 ms ± 1 ms timestamp step
    - **Validates: Requirements 10.1, 10.7**

  - [x] 5.5 [PBT] Write property test for mock determinism
    - **Property 10: Mock determinism**
    - File `tests/property/p10-mock-determinism.test.ts`; two sources with the same seed and script produce deep-equal frame sequences
    - **Validates: Requirements 10.2**

  - [x] 5.6 Implement mock fixtures and `MockHistoryRepository`
    - `src/data/mock/fixtures/{history,alarms,wear}.ts` (MOCK header): from a fixed seed at module load, 30 days of daily peaks per channel, 200 alarm events across all kinds and severities, wear records with p10/p50/p90 projections, and a per-event trace generator (±60 s at 10 Hz)
    - `src/data/mock/MockHistoryRepository.ts` (MOCK header): in-memory filtering by time range, channels and severities; `acknowledge` sets `acknowledged_by` and `acknowledged_at`; every call resolves after a seeded 80–200 ms delay
    - _Requirements: 10.8, 10.9_

  - [x] 5.7 Implement the Source_Factory
    - `src/data/createSource.ts`: `createTelemetrySource(env)` and `createHistoryRepository(env)` returning the mocks when `VITE_DATA_SOURCE` is `mock` or unset; throw a clear "not implemented in this phase" error for `ws`
    - _Requirements: 8.3_

  - [x] 5.8 Write unit tests for scenarios, history repository and factory
    - Each scenario changes the expected parameter; repository filters correctly and respects latency bounds (fake timers); factory returns mocks for unset and `mock`
    - _Requirements: 8.3, 10.6, 10.8, 10.9_

- [x] 6. Implement the ring buffer, alarm engine and telemetry store
  - [x] 6.1 Implement the Ring_Buffer
    - `src/data/ringBuffer.ts`: fixed-capacity `Float32Array`/`Float64Array` backed buffer with `push`, `length`, `toArray`, `window(n)`, and a `revision` counter; no allocation after construction
    - _Requirements: 11.1, 11.2_

  - [x] 6.2 [PBT] Write property test for ring buffer bounds
    - **Property 13: Ring buffer bounds**
    - File `tests/property/p13-ring-buffer.test.ts`; arbitrary capacity and push sequences; assert length ≤ capacity, contents equal the last `capacity` pushes in order, and the backing array identity is unchanged after reaching capacity
    - **Validates: Requirements 11.2**

  - [x] 6.3 Implement the Alarm_Engine
    - `src/domain/alarmEngine.ts`: pure `evaluate(frame, prevState, thresholds, nowMs)` → `{ state, events }`
    - Kinds: `junction_temp`, `heatsink_temp`, `cooling_residual`, `rms_current` (from armature current % rated), `residual_rate` (K/min from residual history held in state), `sensor` (unhealthy channel)
    - Raise when value ≥ level for the band's debounce; clear only after value < level − hysteresis for the debounce, setting `cleared_at`; stay active otherwise
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 6.4 [PBT] Write property test for alarm hysteresis
    - **Property 11: Alarm hysteresis**
    - File `tests/property/p11-alarm-hysteresis.test.ts`; generate value sequences around the Tj and heatsink bands with random dt; assert clears only after the hysteresis-plus-debounce condition and no raise/clear pair falls within one debounce window
    - **Validates: Requirements 13.3, 13.4, 13.5**

  - [x] 6.5 Write unit tests for each alarm kind
    - Example sequences that raise and clear each of the six kinds
    - _Requirements: 13.2, 13.3, 13.4_

  - [x] 6.6 Implement the Telemetry_Store
    - `src/data/store.ts`: plain TS class that subscribes to a `TelemetrySource`, decodes every frame, drops invalid frames (keeps last good frame, increments `droppedFrames`), pushes per-channel values into 3000-sample ring buffers, runs the alarm engine, and tracks connection status
    - Enter `stale` when no valid frame for > 1 s (timer); return to `live` on the next valid frame
    - Emit a 1 Hz Display_Tick carrying the peak value per channel over the preceding 1 s window
    - Hold a MotionValue map (`tj[i]`, `heatsink[i]`, `hottest`, `armature`, `ambient`, `airflow`) written on every frame
    - Slice subscription API (`subscribe(selector, listener)` with equality check) for `useSyncExternalStore`
    - _Requirements: 9.9, 11.1, 11.3, 11.4, 11.5, 11.6, 12.1, 12.2, 12.5_

  - [x] 6.7 Implement data hooks and providers
    - `src/data/hooks.ts`: `TelemetryProvider`, `useFrame(selector)`, `useChannel(id, selector)`, `useSeries(id, field, windowS)`, `useAlarms()`, `useConnection()`, `useDisplayTick()`, `useLiveValue(key)` (MotionValue), `useSourceKind()`, `useScenario()`
    - `src/data/historyHooks.ts`: TanStack Query hooks `useAlarmHistory`, `useTrace`, `useDailyPeaks`, `useWear`, `useAcknowledge` over the `HistoryRepository` from context
    - _Requirements: 8.1, 8.2, 11.3, 11.4_

  - [x] 6.8 Write unit tests for the store and hooks
    - Selector components re-render only when their slice changes; invalid frame is dropped and counted; stale after 1 s and banner text N; live on recovery; Display_Tick peak-hold value; MotionValues update without React render
    - _Requirements: 9.9, 11.3, 11.4, 11.5, 11.6, 12.2, 12.5_

- [x] 7. Build the component kit
  - [x] 7.1 Implement `StatusChip` and status icons
    - `src/kit/StatusChip.tsx`, `src/kit/icons/StatusIcon.tsx`: check-circle (normal), triangle (warning), octagon (critical), slashed sensor (fault); text always rendered ("NORMAL", "WARNING", "CRITICAL", "SENSOR FAULT"); `size` prop; fault uses the hatch background token
    - _Requirements: 5.1, 5.2_

  - [x] 7.2 Implement `RackRow`, `SourceButton` and `SourceGrid`
    - `RackRow`: native `<button>` (or router link via `as`), tracked-caps label, inline value slot, `StatusChip`, chevron, `selected` active style, `disabled`, fluid `clamp()` label sizing
    - `SourceButton`/`SourceGrid`: gold-outlined icon buttons, active filled gold, `role="radiogroup"`/`role="radio"` with `aria-checked`, roving tabindex, arrow keys move and select, Tab leaves the group, configurable column count (2 × 3 or 3 × 2)
    - _Requirements: 5.3, 6.2, 6.3, 6.4, 38.2_

  - [x] 7.3 [PBT] Write property test for never colour-only (kit components)
    - **Property 4: Never colour-only**
    - File `tests/property/p04-never-colour-only.test.tsx`; for arbitrary Status and label, render `StatusChip` and `RackRow` and assert non-empty status text in the accessible output and an icon whose shape identifier is distinct per Status; structure the test so task 13.2 can add the bridge device case
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 7.4 Implement form controls
    - `Fader` on native `<input type="range">` inside a recessed well with custom track/thumb and unit readout
    - `HardwareToggle` with `role="switch"`, `aria-checked`, LED plus ON/OFF text
    - `Field`, `NumberField`, `Select` with `error` prop rendering a message linked by `aria-describedby`
    - `FilterChip` with label, count, `aria-pressed`, wrapping to two lines
    - Every control takes `disabled` and uses the token focus ring
    - _Requirements: 5.5, 6.2, 6.5, 6.6, 6.7, 6.8, 38.2_

  - [x] 7.5 Implement `KpiTile`, `Sparkline` and `ChartFrame`
    - `Sparkline`: visx `LinePath` from a typed array, no axes, optional bands
    - `KpiTile`: label, MotionValue-bound value rendered with the Formatter in a fixed `ch` width with `.num`, unit, sparkline, delta, optional status
    - `ChartFrame` + `src/charts/chartTheme.ts`: axes, grid, crosshair, warning/trip bands with text labels ("WARN 110 °C", "TRIP 125 °C") built from thresholds
    - _Requirements: 3.7, 5.4, 6.9_

  - [x] 7.6 Implement layout and state components
    - `CropPanel` (SVG crop brackets sized by tokens, optional rotated edge micro-labels), `HeroLockup` (`full` and `compact` scales), `EmptyState` (`no-data`, `disconnected`, `no-alarms`, `error`, each with a contour illustration, gold heading, optional action), `ConnectionBanner` ("Data stale – last frame N s ago" / reconnecting), `StaleChip`
    - _Requirements: 12.3, 31.4_

  - [x] 7.7 Implement shared heat visuals
    - `src/visuals/heat/HeatDefs.tsx`: heat gradients, x-only blur, turbulence and blur filters, fault hatch pattern, with stable ids
    - `HeatDisc`: orange-red rings, seeded irregular dark core path, thin gold rim, centre marker; ring radii and stop mix bound to a `tj` MotionValue through `heatScale`
    - `HeatSmearTitle`: SVG `<text>` with heat-gradient fill plus three trailing copies offset left through the x-only blur, `intensity` 0..1
    - `ContourBackground`: renders `public/textures/contours.svg` (generated once by `scripts/generate-contours.mjs` from a fixed seed) at 6% opacity with `pointer-events: none`
    - _Requirements: 15.1, 15.2, 15.3, 15.7_

  - [x] 7.8 Implement `AppShell` and `TopNav`
    - `AppShell`: `ContourBackground`, `TopNav`, `ConnectionBanner`, `<Outlet />`
    - `TopNav`: "thermosense" wordmark, tracked-caps links OVERVIEW / DRIVE / ALARMS / TRENDS / ABOUT, "MOCK" badge while `useSourceKind() === "mock"`, alarm bell with active count, SETTINGS link, clock, `SyncPulse` placeholder element; below 1024 px the links collapse into a sheet opened by a menu button
    - _Requirements: 8.4, 22.5, 22.6_

  - [x] 7.9 Write unit tests for the kit
    - Roles and names, `disabled` on every interactive component, `SourceGrid` roving tabindex and arrow keys, `Fader` arrow keys, `HardwareToggle` switch state, `Field` `aria-describedby`, `FilterChip` wrapping class, `KpiTile` fixed width, `ChartFrame` band labels, MOCK badge, nav sheet below 1024 px
    - _Requirements: 5.4, 5.5, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 6.9, 8.4, 22.6_

- [x] 8. Build the `/kit` gallery route
  - [x] 8.1 Wire the app entry and a minimal router
    - `src/main.tsx` creates the source, history repository, `TelemetryStore`, `QueryClient`, and renders providers plus `RouterProvider`
    - `src/routes.tsx` with `createBrowserRouter`, `AppShell` as layout, and a lazy `/kit` route (other routes are added in Phase 3)
    - _Requirements: 7.1, 22.3_

  - [x] 8.2 Implement the Kit_Gallery page
    - `src/pages/Kit/KitPage.tsx`: one section per kit component showing default, hover, active/pressed, focus, disabled, loading/empty and each Status (forced states via a `data-state` prop or wrapper class)
    - Semantic token swatches and the type scale
    - `?section=` scrolls the named section into view on load and on change
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 8.3 Write unit tests for the gallery
    - Every component name from Requirement 6.1 has a section; `?section=` calls `scrollIntoView` on the right element
    - _Requirements: 7.2, 7.3_

- [x] 9. Checkpoint – Phase 1
  - Ensure all tests pass, ask the user if questions arise.
  - In `web/`: run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:property` and `npm run coverage`; fix failures before continuing
  - Run `PHASE=1 npm run screenshots` and confirm PNGs exist in `web/docs/screenshots/phase-1/`
  - Write `web/docs/phase-summaries/phase-1.md` (what was built, screenshot list, known gaps)
  - Commit only feature paths from the repo root: `git add -- web .kiro/specs`, then check `git diff --cached --name-only` lists only `web/` and `.kiro/specs/` paths (abort and unstage otherwise), then `git commit -m "feat(web): phase 1 – design system, data layer, component kit"`
  - Do not stage `stage1_loss.py`, `stage2_rc.py`, `take_screenshot.py`, `reference/` or anything under `thermosense_dashboard/`
  - _Requirements: 1.2, 37.2, 41.1, 42.1, 42.2_

### Phase 2: Art direction and signature visuals

- [x] 10. Produce art-direction sketches
  - [x] 10.1 Sketch the console, bridge and Foster ladder
    - Two distinct SVG sketches each in `web/docs/art-direction/`: `console-a.svg`, `console-b.svg`, `bridge-a.svg`, `bridge-b.svg`, `foster-a.svg`, `foster-b.svg`
    - Sketches use the token palette values and show where live data binds
    - _Requirements: 14.1_

  - [x] 10.2 Sketch the mill cutaway and airflow diagram
    - `mill-a.svg`, `mill-b.svg`, `airflow-a.svg`, `airflow-b.svg` in `web/docs/art-direction/`
    - _Requirements: 14.1_

  - [x] 10.3 Record the art-direction selection
    - `web/docs/art-direction/SELECTION.md`: per visual, the chosen sketch, a rationale referring to the reference image, the data binding and operator legibility, and why the other sketch was not chosen
    - Later visual tasks build the chosen sketch without waiting for approval
    - _Requirements: 14.2, 14.3, 14.4_

- [x] 11. Build `HeatBlobs`
  - [x] 11.1 Implement the heat field
    - `src/domain/heatField.ts`: pure `buildField(channels, ambient)` producing a 48 × 32 `Float32Array` from six fixed anchor points (inverse-distance or Gaussian kernel), interpolating unhealthy channel anchors from neighbouring channels, and `bandThresholds(field)` returning exactly six levels; when all Tj ≥ 125 the innermost level maps to `--heat-8`
    - _Requirements: 15.4, 15.5, 15.6, 21.3_

  - [x] 11.2 Implement the `HeatBlobs` component
    - `src/visuals/heat/HeatBlobs.tsx`: `d3-contour` isobands over the field, one `<path>` per band (always six, empty paths allowed), recomputed on each Display_Tick, fills from heat tokens
    - _Requirements: 15.4, 15.5, 34.2_

  - [x] 11.3 Write unit tests for the heat field and blobs
    - Six bands at all-ambient and all-trip inputs; innermost band is `--heat-8` at all-trip; faulted channel anchor equals the neighbour interpolation
    - _Requirements: 15.5, 15.6, 21.3_

- [x] 12. Build the `IsometricConsole`
  - [x] 12.1 Implement isometric geometry
    - `src/visuals/console/iso.ts`: 30° projection matrix, slab face polygons (top, front, right), knob ellipse stacks, fader well and disc transform
    - Unit tests on projected coordinates
    - _Requirements: 16.1_

  - [x] 12.2 Implement the console component from the chosen sketch
    - `src/visuals/console/IsometricConsole.tsx`: tone-stepped faces, 1 px top-edge bevel, contact shadow, turbulence texture clipped to the top face (static layer), two knobs with ring arcs, recessed fader well, tracked-caps micro-labels, projected `HeatDisc` with crop brackets
    - Bind disc to `hottest`, knob arcs to armature % rated and ambient, fader to airflow MotionValue
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 40.7_

  - [x] 12.3 Write unit tests for console bindings
    - Fader position decreases under `fan_failure` and `clogging`; knob arcs follow current and ambient; disc follows hottest healthy Tj
    - _Requirements: 16.2, 16.3, 16.4_

- [x] 13. Build the `BridgeSchematic`
  - [x] 13.1 Implement the bridge from the chosen sketch
    - `src/visuals/bridge/BridgeSchematic.tsx`: three AC inputs, DC bus, T1–T6 thyristor symbols filled by `heatToken(heatStopIndex(tj))`, Status icon badge per device, selected-device highlight
    - Each device is a focusable `<g role="button" tabIndex={0}>` with accessible name "T3, 98.4 °C, warning"; click, Enter and Space call `onSelect(id)`; `selected` and `onSelect` props (router wiring in task 18.2); `thumbnail` size variant without interactivity
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [x] 13.2 [PBT] Extend the never colour-only property test to bridge devices
    - **Property 4: Never colour-only**
    - Add the bridge-device case to `tests/property/p04-never-colour-only.test.tsx` (same single property test): for arbitrary Status per channel, each device's accessible output has status text and a distinct icon shape
    - **Validates: Requirements 5.3, 17.3, 21.1**

  - [x] 13.3 Write unit tests for the bridge
    - Accessible names include id, Tj and Status; Enter and Space call `onSelect`; selected device has the highlight; fill follows the heat scale
    - _Requirements: 17.2, 17.4, 17.5, 17.6_

- [x] 14. Build the `FosterLadder`
  - [x] 14.1 Implement node temperatures and the ladder component
    - `src/domain/fosterNodes.ts`: node temperatures for junction, case, heatsink and air from a `ThyristorFrame`, ambient and model params, plus stage R values
    - `src/visuals/foster/FosterLadder.tsx`: 3-stage RC ladder from the chosen sketch, node fills via heat scale, dash flow speed proportional to power loss, labels τ1 0.02 s, τ2 0.5 s, τ3 20 s and R values, `variant: "compact" | "annotated"` with per-stage annotations
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 14.2 Write unit tests for the Foster ladder
    - Node temperatures are ordered junction ≥ case ≥ heatsink ≥ air for positive power; dash speed scales with power loss; labels and annotated variant text present
    - _Requirements: 18.2, 18.3, 18.4, 18.5_

- [x] 15. Build the `MillCutaway` and `AirflowDiagram`
  - [x] 15.1 Implement spike detection and the mill cutaway
    - `src/domain/spikes.ts`: `detectSpikeOnsets(currentSeries, ratedA)` returning onset indices (shared with the bar-bite markers in task 20.1)
    - `src/visuals/mill/MillCutaway.tsx`: rolling stand cutaway, drive cabinet with a thumbnail `BridgeSchematic` on the door, glowing strip that pulses when a spike onset is detected
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 15.2 Implement the airflow diagram
    - `src/visuals/airflow/AirflowDiagram.tsx`: heat exchanger and blower from the chosen sketch, at most 40 particles moved with CSS transforms, speed from fan state; when `fan_status` is false the blower and particles stop and the exchanger fill moves to a warm heat stop
    - _Requirements: 20.1, 20.2, 20.3_

  - [x] 15.3 Write unit tests for spikes, mill and airflow
    - Spike onsets found in a synthetic series; strip pulse class toggles on onset; particle count ≤ 40; fan-off state stops particles and changes exchanger fill
    - _Requirements: 19.2, 20.2, 20.3_

- [x] 16. Add sensor-fault presentation and gallery coverage
  - [x] 16.1 Apply the sensor-fault treatment across visuals and kit
    - For `sensor_healthy` false: fault hatch fill, "SENSOR FAULT" `StatusChip` and the `— —` placeholder in `RackRow`, bridge device, `HeatDisc` readouts and `KpiTile`; restore normal presentation when healthy frames return
    - _Requirements: 21.1, 21.4_

  - [x] 16.2 Add a visuals section to `/kit`
    - Show each signature visual with fixed-state examples (normal, warning, critical/all-trip, all-ambient, one sensor fault, fan failure) and one live-bound instance
    - _Requirements: 7.2, 15.5, 21.1_

  - [x] 16.3 Write unit tests for fault presentation
    - A faulted channel renders hatch, "SENSOR FAULT" and `— —`, is excluded from hottest Tj, and restores after healthy frames
    - _Requirements: 21.1, 21.2, 21.4_

- [x] 17. Checkpoint – Phase 2
  - Ensure all tests pass, ask the user if questions arise.
  - In `web/`: run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:property` and `npm run coverage`; fix failures before continuing
  - Add the `/kit?section=visuals` route to `tests/visual/routes.ts`, run `PHASE=2 npm run screenshots`, confirm PNGs in `web/docs/screenshots/phase-2/`
  - Write `web/docs/phase-summaries/phase-2.md`
  - `git add -- web .kiro/specs`, verify `git diff --cached --name-only` lists only `web/` and `.kiro/specs/` paths, then `git commit -m "feat(web): phase 2 – art direction and signature visuals"`; never stage the deleted `stage*.py`/`take_screenshot.py` files or `reference/`
  - _Requirements: 1.2, 37.2, 41.1, 42.1, 42.2_

### Phase 3: Shell, routing and pages

- [x] 18. Complete routing, selection and error isolation
  - [x] 18.1 Register all routes
    - `src/routes.tsx`: `/` (eager Overview), lazy `/drive`, `/alarms`, `/trends`, `/settings`, `/about`, `/kit`, and a catch-all rendering `EmptyState` with a link to `/`; `AppShell` stays mounted as the layout route; create placeholder page modules so routes resolve
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

  - [x] 18.2 Implement the Selection_Hook and wire selection
    - `src/data/selection.ts`: `useSelectedChannel()` parsing `?ch=T1..T6`; missing or invalid values select T1 and rewrite the URL with `replace`; `useSelectChannel()` writes `?ch=` with `replace` while preserving other params
    - Pass `selected`/`onSelect` from the hook into `BridgeSchematic` and `RackRow` call sites
    - _Requirements: 17.5, 23.1, 23.2, 23.3_

  - [x] 18.3 [PBT] Write property test for selection consistency
    - **Property 12: Selection consistency**
    - File `tests/property/p12-selection-consistency.test.tsx`; use `fc.commands` over a `MemoryRouter` harness rendering the bridge, rack rows, a readout probe and a chart probe; commands: bridge click, rack row click, keyboard activation, URL edit, invalid `?ch=`; assert exactly one channel in 1..6 is selected and every view reports `useSelectedChannel()`
    - **Validates: Requirements 17.5, 17.6, 23.1, 23.2, 23.3, 23.4**

  - [x] 18.4 Implement error boundaries, query states and layout utilities
    - `src/kit/RegionErrorBoundary.tsx` showing `EmptyState` (error) with a reload control that resets the region
    - `src/kit/QueryState.tsx` rendering loading, inline `EmptyState` error with Retry calling `refetch`, and empty states
    - `src/styles/layout.css` grid utilities: 12 columns at 1440 (24 px gutter, 72 px margin), 8 at 1024, 4 at 390
    - `src/kit/FluidLabel.tsx`: wraps or uses `clamp()` sizing; when truncation is unavoidable it sets `title` and full `aria-label`
    - _Requirements: 30.1, 30.5, 30.6, 31.1, 31.2, 31.3_

  - [x] 18.5 Implement the dev overlay
    - `src/kit/DevOverlay.tsx` shown with `?dev=1`: dropped-frame counter, connection status, frame rate; mounted in `AppShell`
    - _Requirements: 9.9_

  - [x] 18.6 Write unit tests for routing and error isolation
    - Unknown path shows `EmptyState` with home link; a throwing child is contained by its boundary while siblings render; Retry re-issues a failed query; invalid `?ch=` normalises to T1 with replace
    - _Requirements: 22.4, 23.2, 31.1, 31.2, 31.3_

- [x] 19. Build the Overview page
  - [x] 19.1 Implement the Overview hero
    - `src/pages/Overview/OverviewPage.tsx` + `Hero.tsx`: full-scale `HeroLockup` with `HeatSmearTitle` "STAND-04" (intensity from hottest Tj), subtitle "Mill Drive Thyristor Monitor", vertical divider, live hottest Tj in tabular figures or "TRIP" when every Tj ≥ 125 °C
    - Gold-ringed play button "Watch the virtual sensor work" running a 20 s guided replay (`src/data/mock/replay.ts`, MOCK header: bar entry → fan failure → recovery with timed captions) through `setScenario`
    - `HeatBlobs` layered behind `IsometricConsole`; gold callout "Junction Heat, Finally Visible" with a two-line body about estimating Tj from heatsink RTDs
    - _Requirements: 22.7, 24.1, 24.2, 24.3, 24.4, 24.9_

  - [x] 19.2 Implement the Overview second panel and rack rows
    - `src/pages/Overview/ScenarioPanel.tsx`: `CropPanel` artwork card with live `HeatDisc` and rotated micro-labels CH, Tj, MARGIN; heading "Inspect Stand-04 in action"; prompt "Choose a drive scenario…"; 2 × 3 `SourceGrid` (NORMAL, BAR ENTRY, FAN FAIL, CLOGGING, OVERLOAD, CLEAR with icons) calling `setScenario`
    - `src/pages/Overview/RackList.tsx`: six `RackRow`s with tracked label, Tj at 0.1 °C, signed delta-from-mean bar, `StatusChip`, chevron; selected row active; click selects via `useSelectChannel`
    - `src/pages/Overview/TripPanel.tsx`: "Know Before It Trips" with margin to 125 °C, time-to-warning estimate and a link to `/drive?ch=`
    - _Requirements: 23.3, 23.4, 24.5, 24.6, 24.7, 24.8_

  - [x] 19.3 Make the Overview responsive
    - At 1024 px the second panel moves below the hero; at 390 px the console is full width, the `SourceGrid` is 3 × 2, rack rows are full width, and all targets are at least 44 × 44 px
    - _Requirements: 30.2, 30.3, 30.4_

  - [x] 19.4 Write unit tests for the Overview
    - Source selection calls `setScenario` with the right scenario; replay calls scenarios in order with captions (fake timers); "TRIP" appears when all Tj ≥ 125; rack row click updates `?ch=`
    - _Requirements: 24.2, 24.6, 24.7, 24.9_

- [x] 20. Build the Drive Detail page
  - [x] 20.1 Implement the transient and current charts
    - `src/charts/series.ts`: pure `windowSeries(buffer, windowS)` and min/max `downsample` to at most 600 points, memoised by buffer revision
    - `src/charts/TransientChart.tsx` (Tj + heatsink) and `src/charts/CurrentChart.tsx` (armature current with rated reference line) in `ChartFrame` with WARN/TRIP bands, a shared crosshair via context, and labelled vertical bar-bite markers at `detectSpikeOnsets` indices
    - Unit test that paths never exceed 600 points
    - _Requirements: 25.2, 25.4, 25.5, 40.5_

  - [x] 20.2 Implement the Drive Detail page
    - `src/pages/DriveDetail/DriveDetailPage.tsx`: compact `HeroLockup`; `BridgeSchematic` across 7 columns next to a 96 px tabular Tj readout (unit at 40%), `StatusChip` and margin-to-trip bar for the selected channel; charts stacked with shared crosshair; `?window=60|300` (default 60); `KpiTile` strip for heatsink, power loss, residual and R_sa with 60 s sparklines; compact `FosterLadder` bound to the selected channel; each region inside `RegionErrorBoundary`
    - _Requirements: 23.5, 25.1, 25.2, 25.3, 25.6, 25.7_

  - [x] 20.3 Write unit tests for Drive Detail
    - `?window=` switches the chart window and defaults to 60; changing `?ch=` re-binds readout and charts without remounting `AppShell` (mount counter)
    - _Requirements: 23.5, 25.3_

- [x] 21. Build the Alarms page
  - [x] 21.1 Implement alarm filtering and URL state
    - `src/domain/alarmFilters.ts`: pure `filterEvents(events, { severities, channels, kinds, from, to })`, plus parse/serialise helpers for `?sev=`, `?ch=`, `?from=`, `?to=`, `?event=`
    - Unit tests for filtering and round-trip of params
    - _Requirements: 26.2, 26.4, 26.5_

  - [x] 21.2 Implement the `SeverityTimeline`
    - `src/charts/SeverityTimeline.tsx`: 24 h, one lane per channel (plus drive), severity marks with icons, brush writing `?from=`/`?to=`; bins events into time buckets when there are 200 or more
    - _Requirements: 26.3, 26.4, 26.10_

  - [x] 21.3 Implement the event list and event trace
    - `src/pages/Alarms/EventList.tsx`: virtualised with `@tanstack/react-virtual` at ≥ 200 events; rows expand in place, writing `?event=`, to show `src/charts/EventTrace.tsx` (Tj ±60 s via `useTrace`) and details; loading and error via `QueryState`
    - _Requirements: 26.5, 26.10, 31.2_

  - [x] 21.4 Implement the Alarms page and acknowledge flow
    - `src/pages/Alarms/AlarmsPage.tsx`: compact `HeroLockup` with active count and "Acknowledge all visible"; `FilterChip` rows for severity, channel and kind; timeline above the list
    - Acknowledge opens an inline confirmation; confirming calls `acknowledge` with the mock session user from `uiStore` (name only, no credentials) and shows user and time; all controls keyboard operable
    - Live alarms from the store are merged at the top of the list and announced in an `aria-live="polite"` region
    - _Requirements: 26.1, 26.2, 26.6, 26.7, 26.8, 26.9, 26.11_

  - [x] 21.5 Write unit tests for the Alarms page
    - Filter chips update params and list; inline confirm then acknowledge shows user and time; keyboard-only acknowledge; new alarm inserted at top and announced; 200 events use the virtualiser and binned timeline
    - _Requirements: 26.2, 26.6, 26.7, 26.8, 26.9, 26.10_

- [x] 22. Build the Trends page
  - [x] 22.1 Implement the trends charts
    - `src/charts/LifeArcGauge.tsx` (remaining life % as text), `src/charts/ChannelDayHeatmap.tsx` (rows per channel, cells per day, heat tokens, focusable cells showing peak Tj and date on hover/focus), `src/charts/WearProjection.tsx` (consumed-life line, p10–p90 band, advisory line at 2× baseline)
    - _Requirements: 27.1, 27.2, 27.3, 27.5_

  - [x] 22.2 Implement the Trends page
    - `src/pages/Trends/TrendsPage.tsx`: compact `HeroLockup`; six gauges; heatmap with `?days=7|30` (default 30); wear projection; advisory icon and text for channels with `wear_rate_vs_baseline` > 2.0; `QueryState` for loading and errors
    - _Requirements: 27.1, 27.4, 27.6, 31.2_

  - [x] 22.3 Write unit tests for the Trends page
    - `?days=` controls cell count; focusing a cell shows peak and date; advisory shown only above 2.0
    - _Requirements: 27.3, 27.4, 27.6_

- [x] 23. Build the Settings page
  - [x] 23.1 Implement settings validation and persistence
    - `src/domain/settings.ts`: `validate(draft)` returning per-field errors (warning < critical, 0 ≤ hysteresis < critical − warning for every band), `isDirty(draft, saved)`, `canSave(draft, saved)`
    - `src/state/uiStore.ts` (Zustand): saved settings persisted to `localStorage`, draft, session user, ack state, `entrancePlayed` flags; a `useThresholds()` hook that the store's status classification and alarm engine read so saved thresholds apply immediately
    - _Requirements: 4.4, 28.3, 28.6, 28.7_

  - [x] 23.2 [PBT] Write property test for settings validation
    - **Property 15: Settings validation**
    - File `tests/property/p15-settings-validation.test.ts`; arbitrary drafts (including invalid bands) and saved settings; assert `validate` accepts iff the band rule holds for every band and `canSave` iff valid and dirty
    - **Validates: Requirements 28.3, 28.6**

  - [x] 23.3 Implement the Settings page
    - `src/pages/Settings/SettingsPage.tsx`: `CropPanel` groups for thresholds (`Fader` + `NumberField`), display, data source ("Mock", WebSocket URL `Field` disabled with "backend phase" note) and scenario defaults (`HardwareToggle`, `Select`); inline errors on offending fields; sticky Save/Discard bar while dirty; Save enabled iff `canSave`; Save persists and applies thresholds; Discard restores saved; `useBlocker` confirmation offering Stay or Discard on navigation with a dirty draft
    - _Requirements: 28.1, 28.2, 28.4, 28.5, 28.6, 28.7, 28.8, 28.9_

  - [x] 23.4 Write unit tests for the Settings page
    - Invalid input shows inline error and disables Save; Save writes `localStorage` and changes classification; Discard restores; blocker dialog appears on dirty navigation
    - _Requirements: 28.4, 28.5, 28.7, 28.8, 28.9_

- [x] 24. Build the About page
  - [x] 24.1 Implement the About page
    - Copy `thermosense_dashboard/assets/about_hero_banner.webp` to `web/public/about_hero_banner.webp` (copy only; leave the source untouched)
    - `src/pages/About/AboutPage.tsx`: compact `HeroLockup`, banner image with alt text, annotated `FosterLadder`, 4-step "How the virtual sensor works" flow (Measure, Model, Estimate, Validate), `MillCutaway` and `AirflowDiagram`
    - _Requirements: 1.2, 29.1, 29.2, 29.3, 29.4_

- [x] 25. Write Playwright end-to-end tests for core flows
  - [x] 25.1 Test navigation and selection sync
    - `tests/e2e/navigation.spec.ts`: clicking every nav link changes route with `performance.getEntriesByType("navigation").length === 1` and a window marker that survives; Top_Nav stays mounted
    - `tests/e2e/selection.spec.ts`: select T3 on the bridge, check the Overview rack row, Drive Detail readout and charts agree; invalid `?ch=` becomes T1
    - _Requirements: 22.2, 23.2, 23.4, 41.5_

  - [x] 25.2 Test acknowledge and settings flows
    - `tests/e2e/alarms.spec.ts`: keyboard-only acknowledge with inline confirm shows user and time
    - `tests/e2e/settings.spec.ts`: invalid band shows inline error and disables Save; edit shows the unsaved bar; navigating away shows the blocker; Save persists across reload
    - _Requirements: 26.6, 26.7, 26.8, 28.4, 28.5, 28.9, 41.5_

- [x] 26. Checkpoint – Phase 3
  - Ensure all tests pass, ask the user if questions arise.
  - In `web/`: run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:property`, `npm run coverage` and `npm run test:e2e`; fix failures before continuing
  - Add `/`, `/drive`, `/alarms`, `/trends`, `/settings`, `/about` to `tests/visual/routes.ts`, run `PHASE=3 npm run screenshots`, confirm PNGs in `web/docs/screenshots/phase-3/`
  - Write `web/docs/phase-summaries/phase-3.md`
  - `git add -- web .kiro/specs`, verify `git diff --cached --name-only` lists only `web/` and `.kiro/specs/` paths, then `git commit -m "feat(web): phase 3 – shell, routing and pages"`; never stage the deleted `stage*.py`/`take_screenshot.py` files or `reference/`
  - _Requirements: 1.2, 37.2, 41.1, 41.5, 42.1, 42.2_

### Phase 4: Motion system

- [x] 27. Build motion foundations
  - [x] 27.1 Implement motion tokens and the reduced-motion bridge
    - `src/motion/tokens.ts`: durations and easings matching the CSS tokens; `src/motion/presets.ts`: entrance, press, arrival presets using only `transform`, `opacity`, small-element `filter`, SVG `fill`/`stop-color`
    - `src/motion/useReducedMotion.ts` wrapping Motion's hook; `MotionConfig reducedMotion="user"` in `main.tsx`
    - _Requirements: 34.1, 35.1, 35.2_

  - [x] 27.2 Implement page entrances
    - `src/motion/useEntrance.ts(pageKey)`: plays once per session using `uiStore.entrancePlayed`; order hero lockup → main visual → secondary panels with offsets ≤ 60 ms and total < 700 ms; children of an entering container animate with the container (no child stagger); skipped under reduced motion
    - Apply to all six pages
    - _Requirements: 32.1, 32.2, 32.3, 35.1_

  - [x] 27.3 Implement `AnimatedNumber`
    - `src/motion/AnimatedNumber.tsx`: tweens a MotionValue over 200 ms with `--ease-out`, writes formatted text directly to the DOM node with `.num` and fixed width; instant under reduced motion
    - Use it in `KpiTile`, the Overview hero readout, the Drive Detail readout and rack rows (text driven by Display_Tick values)
    - _Requirements: 33.1, 35.2_

  - [x] 27.4 Write unit tests for entrances and numbers
    - Entrance plays once per session and its timeline satisfies < 700 ms and ≤ 60 ms offsets; second visit renders final state; `AnimatedNumber` width is constant and reduced motion sets value immediately
    - _Requirements: 32.1, 32.2, 33.1, 35.2_

- [ ] 28. Add live-value and event motion
  - [-] 28.1 Interpolate heat fills and pulse critical glows
    - `src/motion/useHeatFill.ts`: interpolates in heat-scale index space over 300 ms and outputs a fill colour; used by `HeatDisc` and bridge devices
    - Glow pulse only while a channel is critical; static for normal and warning; status changes still render under reduced motion
    - _Requirements: 33.2, 33.3, 33.4, 35.4_

  - [ ] 28.2 Animate charts and blob morphs
    - Charts: `pathLength` draw-in over 600 ms on first data, then translate the path left by one sample step per new sample; disabled under reduced motion
    - `HeatBlobs`: morph between 1 Hz updates with fixed topology (resample each band to a fixed point count before interpolating)
    - _Requirements: 33.5, 33.6, 34.2, 35.1_

  - [ ] 28.3 Implement the sync pulse and reduced-motion substitutions
    - `src/kit/SyncPulse.tsx`: 1 px gold tick flashes once per Display_Tick, stops while stale, replaced by a static "LIVE" label under reduced motion; replace the placeholder in `TopNav`
    - Stale readouts dim to `--text-muted` with `StaleChip`
    - Disable Foster dash flow and airflow particles under reduced motion
    - _Requirements: 12.4, 33.7, 35.1, 35.3_

  - [ ] 28.4 Animate alarm arrivals and press/hover feedback
    - `src/domain/coalesceAlarms.ts`: pure merge of repeats of the same channel+kind within 5 s into one row with a repeat count
    - One 240 ms slide-and-highlight per new (coalesced) alarm row via `AnimatePresence`
    - Global press `scale(0.97)` over 120 ms on interactive kit components; hover styles inside `@media (hover: hover)` only
    - _Requirements: 33.8, 33.9, 33.10, 33.11_

  - [ ] 28.5 Write unit tests for live and event motion
    - Coalescing within 5 s yields one row; pulse class only on critical; reduced motion disables draw-in, dash flow and particles and shows "LIVE"; sync pulse stops when stale
    - _Requirements: 12.4, 33.3, 33.4, 33.9, 35.1, 35.3_

- [ ] 29. Audit motion
  - [ ] 29.1 Write the motion audit and enforce animated-property limits
    - `web/docs/motion-audit.md`: every remaining animation with the state, arrival or causality it communicates; remove any animation that communicates none
    - `scripts/check-motion.mjs` (wired into `npm run lint`): fails when Motion `animate`/`transition` targets or CSS `transition`/`@keyframes` use layout properties (width, height, top, left, margin, padding)
    - _Requirements: 34.1, 34.3_

- [ ] 30. Checkpoint – Phase 4
  - Ensure all tests pass, ask the user if questions arise.
  - In `web/`: run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:property`, `npm run coverage` and `npm run test:e2e`; fix failures before continuing
  - Run `PHASE=4 npm run screenshots` (frozen clock, final states), confirm PNGs in `web/docs/screenshots/phase-4/`
  - Write `web/docs/phase-summaries/phase-4.md`
  - `git add -- web .kiro/specs`, verify `git diff --cached --name-only` lists only `web/` and `.kiro/specs/` paths, then `git commit -m "feat(web): phase 4 – motion system"`; never stage the deleted `stage*.py`/`take_screenshot.py` files or `reference/`
  - _Requirements: 1.2, 34.3, 37.2, 41.1, 42.1, 42.2_

### Phase 5: QA

- [ ] 31. Add stress fixtures
  - [ ] 31.1 Implement `?mock=` stress fixtures
    - `src/data/mock/stress.ts` (MOCK header): `stress-trip` (all Tj ≥ 125), `stress-ambient` (Tj ≈ ambient), `stress-nan` (two or more unhealthy channels with NaN readings), `stress-200-alarms`, `stress-long-labels` (long channel and event names); selected in `createSource.ts` from `?mock=`
    - _Requirements: 36.1_

  - [ ] 31.2 Write Playwright stress specs
    - `tests/e2e/stress.spec.ts`: trip shows critical chips on every channel, "TRIP" in the hero and saturated blobs, with element bounding boxes equal to the normal layout; ambient renders the disc at heat stops 0–1 and six bands; nan shows the fault presentation per affected channel; 200 alarms renders the virtualised list and binned timeline; long labels are fully readable (no clipped text, or `title` + `aria-label` when truncated)
    - _Requirements: 30.5, 30.6, 36.2, 36.3, 36.4, 36.5, 36.6_

- [ ] 32. Add visual regression and viewport coverage
  - [ ] 32.1 Write the visual regression suite
    - `tests/visual/regression.spec.ts`: `toHaveScreenshot` for every route and `/kit` at 1440, 1024 and 390 px and at 200% zoom (half-width viewport with `deviceScaleFactor: 2`), frozen clock, fixed seed, animations disabled; baselines committed under `tests/visual/`
    - At 200% zoom, assert nav links (via the sheet), primary actions and page content are reachable
    - _Requirements: 30.7, 37.1_

- [ ] 33. Verify keyboard access and WCAG AA
  - [ ] 33.1 Write the keyboard traversal spec
    - `tests/e2e/keyboard.spec.ts`: per route, Tab through every focus stop; assert visual order (top-to-bottom, left-to-right within rows), a visible focus ring from `--focus-ring` (computed outline or box-shadow), and Enter/Space activation on sampled controls; arrow keys on `SourceGrid` and `Fader`
    - Fix any order or focus-ring defects found
    - _Requirements: 2.6, 38.1, 38.2, 38.3, 38.4_

  - [ ] 33.2 Write the axe spec and fix violations
    - `tests/e2e/a11y.spec.ts`: `@axe-core/playwright` with WCAG 2.1 A/AA tags on every route and `/kit`; zero violations; every interactive element has an accessible name
    - Fix violations in the components
    - _Requirements: 39.1, 39.3_

  - [ ] 33.3 Write the token contrast test
    - `tests/unit/contrast.test.ts`: compute contrast for semantic text/surface pairs (≥ 4.5:1 for body text including `--text-muted` on panel, ≥ 3:1 for large text and component boundaries such as source-button borders and the focus ring); adjust semantic mappings if a pair fails
    - _Requirements: 39.2_

  - [ ] 33.4 Write the 390 px target-size check
    - `tests/e2e/targets.spec.ts`: at 390 px, every visible interactive element on every route has a bounding box of at least 44 × 44 px
    - _Requirements: 30.4_

- [ ] 34. Verify soak and performance budgets
  - [ ] 34.1 Write the soak spec
    - `tests/e2e/soak.spec.ts` (tagged `@soak`, run with `npm run test:soak`): 5 minutes on `/` and `/drive` at 10 Hz; sample `performance.memory.usedJSHeapSize` after forced GC via CDP at start and end (growth ≤ 10%); `PerformanceObserver` for `longtask` after the entrance must record zero tasks > 50 ms
    - _Requirements: 40.1, 40.2_

  - [ ] 34.2 Write frame-budget and blob-cost benchmarks
    - Playwright spec with CDP `Emulation.setCPUThrottlingRate(4)` measuring per-frame store update + MotionValue writes + SVG attribute changes via `performance.measure` marks in the store (dev-only); assert p95 < 4 ms
    - Vitest test timing `buildField` + contour computation over 100 runs; assert median < 2 ms
    - _Requirements: 40.3, 40.6_

  - [ ] 34.3 Profile charts and apply the uPlot fallback if needed
    - Measure `TransientChart` and `CurrentChart` per-frame cost at 10 Hz with 4× throttle; if either exceeds 4 ms, install `uplot` and implement canvas versions behind the same props, keeping band labels as text; record the measurement in `web/docs/perf.md`
    - _Requirements: 40.4, 40.5_

  - [ ] 34.4 Check bundle size and filter placement
    - `scripts/check-bundle.mjs` (wired into `npm run check`): gzip size of the initial route's JS + CSS from the Vite manifest < 250 KB
    - Unit test that `feTurbulence` and large-radius blur filters are referenced only from components marked static (e.g. `data-layer="static"`)
    - _Requirements: 40.7, 40.8_

- [ ] 35. Verify security, isolation and coverage
  - [ ] 35.1 Write security and isolation checks
    - `tests/e2e/security.spec.ts` against the production preview: CSP meta present with `default-src 'self'`, no inline scripts, no requests to external hosts (fonts included), no `localStorage`/`sessionStorage` keys containing passwords or tokens after the acknowledge flow
    - `scripts/check-isolation.mjs`: `git diff --name-only <commit before phase 1>..HEAD -- thermosense_dashboard model.py 'stage*.py'` is empty, and `grep` finds no `dangerouslySetInnerHTML` in `web/src`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 26.11_

  - [ ] 35.2 Close coverage gaps
    - Run `npm run coverage`; add unit tests until `src/domain` and `src/data` each reach at least 90% line coverage
    - _Requirements: 41.2_

  - [ ]* 35.3 Add a nightly CI workflow for property tests
    - Nice-to-have: `.github/workflows/web-nightly.yml` running `npm run test:property:nightly` (2000 runs) and uploading logged seeds; the npm script from task 1.1 already satisfies local nightly runs
    - _Requirements: 41.3_

- [ ] 36. Produce the reference comparison and gap list
  - [ ] 36.1 Create the side-by-side comparison and gap list
    - `tests/visual/compare.spec.ts`: capture the Overview at 1440 px, render it next to `reference/Screenshot from 2026-11-20 20-43-12.png` in a local HTML page, save `web/docs/comparison/overview-vs-reference.png` (read the reference image only; do not commit `reference/`)
    - `web/docs/gap-list.md`: an honest list of visual and behavioural gaps against the reference and the requirements
    - _Requirements: 37.3_

- [ ] 37. Final checkpoint – Phase 5
  - Ensure all tests pass, ask the user if questions arise.
  - In `web/`: run `npm run check`, `npm run coverage`, `npm run test:e2e` (including stress, keyboard, a11y, security) and `npm run test:soak`; fix failures before continuing
  - Run `PHASE=5 npm run screenshots`, confirm PNGs in `web/docs/screenshots/phase-5/`, and update the visual regression baselines
  - Write `web/docs/phase-summaries/phase-5.md`
  - `git add -- web .kiro/specs`, verify `git diff --cached --name-only` lists only `web/` and `.kiro/specs/` paths, then `git commit -m "feat(web): phase 5 – QA, stress, a11y, soak"`; never stage the deleted `stage*.py`/`take_screenshot.py` files or `reference/`
  - _Requirements: 1.2, 37.2, 41.1, 42.1, 42.2_

## Notes

- **[PBT]** marks property-based test tasks. All 15 design properties have a task: P1 3.3, P2 3.4, P3 3.6, P4 7.3 (extended in 13.2), P5 4.2, P6 4.3, P7 3.8, P8 3.9, P9 5.4, P10 5.5, P11 6.4, P12 18.3, P13 6.2, P14 4.4, P15 23.2.
- Only task 35.3 (nightly CI workflow) is optional (`*`). Every other task, including unit and property tests, is required.
- Checkpoints stage with `git add -- web .kiro/specs` only. The uncommitted deletions of `stage1_loss.py`, `stage2_rc.py` and `take_screenshot.py`, and the untracked `reference/` folder, belong to the user and stay out of every commit.
- Playwright starts and stops its own preview server through `webServer`. No task should start `npm run dev` or another watcher manually.
- Art-direction choices are delegated (Requirement 14.4). Visual tasks in Phase 2 build the sketch named in `SELECTION.md` without waiting for approval.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "3.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "3.5", "3.7", "6.2"] },
    { "id": 4, "tasks": ["2.3", "3.3", "3.4", "3.6", "3.8", "3.9", "3.10", "4.1", "5.2"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4", "4.5", "5.3", "6.3", "7.1"] },
    { "id": 6, "tasks": ["5.4", "5.5", "5.6", "6.4", "6.5", "7.2", "7.4", "7.5", "7.6", "7.7"] },
    { "id": 7, "tasks": ["5.7", "5.8", "7.3", "6.6"] },
    { "id": 8, "tasks": ["6.7"] },
    { "id": 9, "tasks": ["6.8", "7.8"] },
    { "id": 10, "tasks": ["7.9", "8.1"] },
    { "id": 11, "tasks": ["8.2"] },
    { "id": 12, "tasks": ["8.3"] },
    { "id": 13, "tasks": ["10.1", "10.2"] },
    { "id": 14, "tasks": ["10.3", "11.1"] },
    { "id": 15, "tasks": ["11.2", "12.1", "13.1", "14.1", "15.2"] },
    { "id": 16, "tasks": ["11.3", "12.2", "13.2", "13.3", "14.2", "15.1"] },
    { "id": 17, "tasks": ["12.3", "15.3", "16.1"] },
    { "id": 18, "tasks": ["16.2", "16.3"] },
    { "id": 19, "tasks": ["18.1", "21.1", "23.1"] },
    { "id": 20, "tasks": ["18.2", "18.4", "18.5", "23.2"] },
    { "id": 21, "tasks": ["18.3", "18.6", "19.1", "20.1", "21.2", "22.1", "23.3", "24.1"] },
    { "id": 22, "tasks": ["19.2", "20.2", "21.3", "22.2", "23.4"] },
    { "id": 23, "tasks": ["19.3", "20.3", "21.4", "22.3"] },
    { "id": 24, "tasks": ["19.4", "21.5", "25.1"] },
    { "id": 25, "tasks": ["25.2"] },
    { "id": 26, "tasks": ["27.1"] },
    { "id": 27, "tasks": ["27.2"] },
    { "id": 28, "tasks": ["27.3", "28.1", "28.2"] },
    { "id": 29, "tasks": ["27.4", "28.3", "28.4"] },
    { "id": 30, "tasks": ["28.5", "29.1"] },
    { "id": 31, "tasks": ["31.1", "33.3", "35.1"] },
    { "id": 32, "tasks": ["31.2", "32.1", "33.1", "34.2", "34.4"] },
    { "id": 33, "tasks": ["33.2", "33.4", "34.1", "34.3", "35.2"] },
    { "id": 34, "tasks": ["35.3", "36.1"] }
  ]
}
```
