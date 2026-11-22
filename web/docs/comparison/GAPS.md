# Remaining gaps

Comparison image: [`overview-vs-reference.png`](overview-vs-reference.png). It shows the reference (`reference/Screenshot from 2026-11-20 20-43-12.png`, 1173 × 894, scaled to 900 px high) next to `/` at 1440 × 900 with seed 1337, a frozen clock and 62 s of simulated time. The Overview capture on its own is [`overview-1440.png`](overview-1440.png). The reference file is read only. It is not committed.

## Against the reference

- **Blob colour at normal load.** The reference fills the hero with saturated red and orange. Our blobs are coloured by live Tj, so at normal load (about 89 °C) they render in the pale peach-to-orange stops (`--heat-1` to `--heat-3`). The red look only appears near warning or trip. This is deliberate: the heat ramp encodes temperature. The side-by-side still looks much lighter than the reference.
- **Hero callout backing.** The reference sets "Granular Finally Becomes Musical" straight onto the blobs. Our "Junction Heat, Finally Visible" sits on a dark translucent card so the body text stays readable over light heat stops. The card is heavier than anything in the reference.
- **Page framing.** The reference shows two staggered product panels floating on a contour backdrop, with a small nav inside the left panel. Ours has a full-width top nav and fills more of the viewport. The staggered right panel and the contour backdrop are there, but the gaps between the panels are tighter.
- **Hero glow.** The reference has a wide warm radial glow behind the title block. Ours is smaller and fainter.
- **Rack rows.** The reference rows are label-only with a subtle noise texture. Ours carry Tj, a margin bar, a delta and a status chip. That is more information, but the rows look busier and the texture barely shows.
- **Second text panel.** The reference has an "Infinite Ideas in Seconds" copy panel beside the rack. The Overview has no equivalent block next to the rack rows.
- **Disc core.** Our disc core is smaller and rounder than the reference's large irregular dark core at normal load.

## Against the brief (requirements)

### Phase 5 items skipped (a reduced Phase 5 was agreed)

- **Soak (Requirement 40.1, 40.2).** There is no 5-minute run, heap-growth check or long-task observer. Memory growth and jank over time are unmeasured.
- **Stress fixtures (Requirement 36).** The `?mock=` fixtures `stress-trip`, `stress-ambient`, `stress-nan`, `stress-200-alarms` and `stress-long-labels` are not built, and there are no stress specs. All-trip layout stability, 200-alarm virtualisation and long-label truncation are unverified end to end.
- **200% zoom and visual regression (Requirements 30.7, 37.1).** There are no `toHaveScreenshot` baselines and no 200% zoom pass. Screenshots are captured for review only and are not compared automatically.
- **Performance (Requirements 40.3 to 40.8).** There are no frame-budget or blob-cost benchmarks, no chart profiling or uPlot fallback, no bundle-size budget check, and no check on where filters are placed.
- **Security and isolation (Requirements 1.2 to 1.5, 26.11).** There is no CSP or external-request spec against the preview, no storage audit after acknowledge, and no automated check that the legacy Python files are untouched.
- **Full keyboard traversal and target size (Requirements 38.4, 30.4).** Only a sanity check runs: 12 Tab stops on `/` and `/drive` must each show an outline or box-shadow. Visual order, Enter/Space activation, arrow keys on `SourceGrid` and `Fader`, and the 44 × 44 px targets at 390 px are not asserted. Bridge devices draw their focus ring as an SVG rect, which this check does not inspect.
- **Coverage gate (Requirement 41.2).** Coverage was not re-run in Phase 5. Phase 4 measured 98.87% lines overall. The 90% floor per `src/domain` and `src/data` is not enforced.
- **axe scope.** The axe check runs at 1440 px only, on the default state of each route. Dialogs, error states, stale states and narrower widths are not audited. The decorative ghost numerals on `/about` are excluded as pure decoration.

### Known issues

- **Navigation drops `?ch=`.** Top_Nav links do not carry the selected channel, so moving from `/drive?ch=3` to another page and back resets the selection.
- **Mock data only.** Every page runs on `MockTelemetrySource` and the mock History_Repository. No real plant telemetry has been connected.
- **Backend not built.** The WebSocket/REST adapters behind the data ports and the server they would talk to do not exist. Settings and acknowledgements live in the browser only.
- **Digit widths change.** The hero peak Tj and the rack-row numbers use tabular figures, but they are not padded to a fixed number of digits. Moving between 99.9 and 100.0 changes the text width and nudges nearby elements.
- **Blobs jump when bands change.** Isotherm morphs run only when ring counts match. When a heat band gains or loses an outline, the blob paths jump instead of morphing.
- **Chart slide spacing.** The live chart slide uses the last sample spacing, clamped to 50–500 ms, so irregular frame timing shows as uneven motion.
