# Phase 4 summary: motion system, live transitions and motion audit

## What was built
- **Foundations (task 27, done before this run).** Motion tokens, the reduced-motion bridge, once-per-session page entrances and `AnimatedNumber` (`src/motion/`).
- **Heat fills and critical pulse (28.1).** `src/motion/useHeatFill.ts` tweens a heat-ramp position over 300 ms and maps it to a `--heat-N` mix. `HeatDisc`, the console disc and the bridge devices share it (the disc and console previously had their own copies). The bridge halo and the Heat_Disc glow get `.motion-critical-pulse` only while critical. Normal and warning glows stay static.
- **Charts and blobs (28.2).** `ChartTrace` draws the line in once over 600 ms (`pathLength`; dashed traces fade in). Live traces then slide left by one sample step per new sample. `HeatBlobs` resamples every isotherm ring to 48 points and morphs between 1 Hz updates when the ring counts match. All of this is off under reduced motion.
- **Sync pulse and substitutions (28.3).** `src/kit/SyncPulse.tsx` replaces the TopNav placeholder. It flashes once per Display_Tick that carries new frames, stops while stale, and shows a static "LIVE" label under reduced motion. `useIsStale()` dims the KPI tiles and the Overview peak Tj to `--text-muted` and adds a STALE chip while stale. Foster dash flow and airflow particles were already off under reduced motion; tests now cover that.
- **Alarm arrivals and press (28.4).** `src/domain/coalesceAlarms.ts` merges repeats of the same channel and kind within 5 s into one row with "×N". A new row plays one 240 ms slide-and-highlight, and the bell badge pops when the count rises. Every `button` / `[role=button]` scales to 0.97 over 120 ms on press (`styles/global.css`). Hover styles were already gated by `@media (hover: hover)`.
- **Tests (28.5).** `tests/unit/liveMotion.test.tsx` covers coalescing, pulse-only-on-critical, draw-in on and off, Foster/airflow under reduced motion, the "LIVE" label and the stale stop. `tests/unit/check-motion.test.ts` covers the new lint script.
- **Motion audit (29.1).** `web/docs/motion-audit.md` lists every animation with the state it communicates. `scripts/check-motion.mjs` now runs as part of `npm run lint` and fails on layout properties in transitions, keyframes or Motion targets.

## Removed or changed by the audit
- `box-shadow` transitions on the toggle, fader and replay button.
- The airflow bloom's `rx`/`ry` transition, now a `transform: scale` swell.
- The bridge's CSS `fill` transition, now the shared heat-space tween.
- The unused Motion `PRESS` preset, now the single CSS press rule.

## Checkpoint results
| Check | Result |
| --- | --- |
| `npm run lint` (ESLint + token check + motion check) | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 76 files, 697 tests pass |
| `npm run test:property` | 15 files, 29 tests pass |
| `npm run coverage` | Statements 96.98%, branches 90.65%, functions 98.4%, lines 98.87% |
| `npm run test:e2e` (w1440) | 6 tests pass |
| `PHASE=4 npm run screenshots` | 39 PNGs in `web/docs/screenshots/phase-4/` |

Note: the 697 count includes `liveMotion.test.tsx` and `check-motion.test.ts`.

## Changed tests
- `BridgeSchematic.test.tsx`: the re-fill test now waits for the 300 ms fill tween to settle.

## Known limits
- Blob morphs are skipped (the paths jump) on ticks where a band gains or loses a ring.
- The chart slide uses the last sample spacing, clamped to 50–500 ms.
