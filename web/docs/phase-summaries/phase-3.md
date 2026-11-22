# Phase 3 summary: shell, routing and pages

## What was built

- **Routing and shell (tasks 17–18).** `src/routes.tsx` serves `/`, `/drive`, `/alarms`, `/trends`, `/settings`, `/about` and `/kit` under the persistent `AppShell`. Overview is bundled, every other route is lazy, and unknown paths render the `NotFound` empty state. `?ch=T1..T6` is the single selection source (`src/data/selection.ts`).
- **Overview (task 19).** Heat-smear `STAND-04` lockup with live peak Tj and guided replay, live heat blobs behind the isometric console, scenario panel, rack rows T1–T6 and the trip-margin panel (`src/pages/Overview/`).
- **Drive Detail (task 20).** Bridge schematic beside a 96 px Tj readout with margin-to-trip bar, six KPI tiles, transient and current charts with a shared crosshair and a `?window=60|300` switch, and the compact Foster ladder. Each region has its own error boundary (`src/pages/DriveDetail/`).
- **Alarms (task 21).** Filter chips, severity timeline with brush, virtualised event list, inline acknowledge with confirmation, and "acknowledge all visible" (`src/pages/Alarms/`).
- **Trends (task 22).** Channel-by-day heatmap, life-arc gauge, wear projection and event traces (`src/pages/Trends/`).
- **Settings (task 23).** Band editors with inline validation, display, data-source and scenario groups, a sticky unsaved bar, and a leave-confirmation dialog (`src/pages/Settings/`, `src/domain/settings.ts`).
- **About (task 24).** Compact lockup, banner image, annotated Foster ladder, four-step virtual-sensor flow, mill cutaway and airflow diagram (`src/pages/About/`).
- **End-to-end tests (task 25).** `tests/e2e/navigation.spec.ts`, `selection.spec.ts`, `alarms.spec.ts` and `settings.spec.ts`. `npm run test:e2e` runs them on the `w1440` project only.

## Fixes made at the checkpoint

- **Minus sign in readouts.** KPI tiles, the Drive Detail readout and the Overview peak Tj showed `−  0.4`, because the Formatter's fixed sign slot sat before the figure-space padding. The new `hugSign` and `formatValueFlush` helpers in `src/domain/format.ts` move the padding before the sign, so negative values now read `−0.4`. The readout box still reserves the fixed `ch` width. The Formatter's own output (Property 7) is unchanged.
- **Screenshots had no data.** The Playwright fixture pauses the clock, so the 10 Hz mock source never ticked and every page was captured showing `— —` and SENSOR FAULT. `tests/visual/capture.spec.ts` now advances the frozen clock by 62 s before capturing page routes. Kit routes are captured as before.
- **Overview callout contrast.** The gold "Junction Heat, Finally Visible" heading and its body text sat on the pale outer isotherms with a faint radial scrim. It now sits on a dark frosted plate (`src/pages/Overview/Hero.tsx`).
- **E2E stability.** The navigation spec uses the plain Playwright `test`, because the fake clock stubs `performance.getEntriesByType` to return `[]`. The alarms spec advances the clock until its target appears instead of by a fixed 500 ms. The alarms spec failed once in a full run but could not be reproduced afterwards.

## Checkpoint results

| Check | Result |
| --- | --- |
| `npm run lint` (ESLint + token check) | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 73 files, 671 tests pass |
| `npm run test:property` | 15 files, 29 tests pass (200 runs each) |
| `npm run coverage` | Statements 96.99%, branches 91.22%, functions 98.38%, lines 98.93% (`domain` 98.57% lines, `data` 98.85%, `data/mock` 99.49%) |
| `npm run test:e2e` (w1440) | 6 tests pass; also 18/18 passed with `--repeat-each=3 --workers=8` |

## Screenshots

`docs/screenshots/phase-3/`, 39 PNGs at 1440, 1024 and 390 px:

- Pages: `root`, `drive`, `alarms`, `trends`, `settings`, `about`
- Kit: `kit`, `kit-heat-blobs`, `kit-isometric-console`, `kit-bridge-schematic`, `kit-foster-ladder`, `kit-mill-cutaway`, `kit-airflow-diagram`

## Known gaps

- Top_Nav links do not carry `?ch=`, so moving between pages from the nav resets the selection to T1. The selection e2e test checks Overview through the shared URL.
- On the Overview at 1440 px, the callout plate slightly overlaps the top edge of the console's readout plate.
- Only the 1440 px captures of `/` and `/drive` were reviewed for visual defects this phase, in one pass. The other pages and widths were captured but not reviewed.
- Motion (Sync_Pulse flash, page transitions, number tweening) is still a placeholder until Phase 4.
