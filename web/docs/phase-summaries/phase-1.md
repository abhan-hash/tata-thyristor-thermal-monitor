# Phase 1 summary: design system, data layer, component kit and `/kit` gallery

## What was built

- **Project scaffold (task 1).** Vite + React 19 + TypeScript in `web/`. Vitest with a shared fast-check runner (`FC_NUM_RUNS`, seed logging). ESLint with a token-usage check (`scripts/check-tokens.mjs`). Playwright with three viewport projects (1440, 1024, 390) and the phase screenshot capture (`tests/visual/capture.spec.ts`). Self-hosted Archivo variable font and a production CSP.
- **Token system (task 2).** Three layers, `tokens.primitive.css` → `tokens.semantic.css` → `tokens.component.css`, mapped into Tailwind through `tailwind.theme.css`.
- **Domain (tasks 3–4).** Types and thresholds, Status_Classifier, Heat_Scale, Formatter, derived frame helpers and `decodeDriveFrame` (`src/domain/`).
- **Data layer (tasks 5–6).** Ports and seeded PRNG, Foster thermal simulation, scenarios, `MockTelemetrySource`, fixtures, `MockHistoryRepository`, Source_Factory, Ring_Buffer, Alarm_Engine, Telemetry_Store, data hooks and providers (`src/data/`).
- **Component kit (task 7).** Status chips and icons, rack rows, source buttons and grid, form controls (Fader, NumberField, Select, FilterChip, HardwareToggle, Field), KpiTile, Sparkline, ChartFrame, layout and state components (EmptyState, ConnectionBanner, StaleChip, CropPanel, HeroLockup), shared heat visuals, AppShell and TopNav (`src/kit/`, `src/charts/`).
- **`/kit` gallery (task 8).** App entry, minimal router and the Kit_Gallery page (`src/pages/Kit/`).

## Checkpoint results

| Check | Result |
| --- | --- |
| `npm run lint` (ESLint + token check) | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 46 files, 436 tests pass |
| `npm run test:property` | 13 files, 27 tests pass (200 runs each) |
| `npm run coverage` | Statements 94.78%, branches 87%, functions 95.21%, lines 97.8% |

Property tests passing in this phase (`tests/property/`): P1 status monotonicity, P2 status boundaries, P3 heat scale, P4 never colour-only (kit), P5 overall status, P6 margin consistency, P7 format stability, P8 format precision, P9 mock physical bounds, P10 mock determinism, P11 alarm hysteresis, P13 ring buffer bounds, P14 decode robustness.

## Screenshots

Captured with `PHASE=1 npm run screenshots`:

- `docs/screenshots/phase-1/kit-1440.png`
- `docs/screenshots/phase-1/kit-1024.png`
- `docs/screenshots/phase-1/kit-390.png`

## Known gaps

- Only the `/kit` route exists, so it is the only route captured. Operator pages arrive in later phases.
- Coverage is lowest in `src/data/historyHooks.ts` (74% statements, 58% branches) and `src/domain/decode.ts` (86% statements, 82% branches). The configured threshold (90% lines for `src/domain/**` and `src/data/**`) is met in aggregate, but these files are worth extending when history views are built.
- The 390 px gallery capture is a very tall single page (about 41,000 px), because the gallery stacks every kit section vertically. This is fine for review but is not a layout target.
- `src/motion/`, `src/state/` and `src/visuals/` are empty placeholders for later phases. `docs/art-direction/` is reserved for the Phase 2 sketches.
