# Phase 2 summary: art direction and signature visuals

## What was built

- **Art-direction sketches (task 10).** Two SVG sketches per visual in `docs/art-direction/` (`console-a/b`, `bridge-a/b`, `foster-a/b`, `mill-a/b`, `airflow-a/b`), compared against `reference/Screenshot from 2026-11-20 20-43-12.png`. The choice and its carry-forward fixes are recorded in `docs/art-direction/SELECTION.md`.
- **`HeatBlobs` (task 11).** Heat field from the six channel Tj values and stepped isotherm bands, hottest innermost (`src/domain/heatField.ts`, `src/visuals/heat/`).
- **`IsometricConsole` (task 12).** 30° isometric projection, slab mesh and frame bindings: disc follows hottest Tj, knob A armature current, knob B ambient, fader airflow, readout plate shows channel, °C and status word (`src/visuals/console/`).
- **`BridgeSchematic` (task 13).** Six-pulse Graetz bridge with heat-filled devices and status badges, full and cabinet-door thumbnail variants, separate focus and selection treatments (`src/visuals/bridge/`).
- **`FosterLadder` (task 14).** Junction → case → heatsink → air RC ladder with τ chips, compact and annotated variants (`src/domain/fosterNodes.ts`, `src/visuals/foster/`).
- **`MillCutaway` and `AirflowDiagram` (task 15).** Spike-onset detection driving the strip pulse (`src/domain/spikes.ts`, `src/visuals/mill/`); cabinet air path whose particles and blower stop on fan failure (`src/visuals/airflow/`).
- **Sensor-fault treatment and gallery (task 16).** Hatched fill and `— —` placeholder across visuals and kit components; a "Visuals" chapter in `/kit` (`src/pages/Kit/specimens/Visuals.tsx`).

## Art-direction selection

The user delegated the choice (Requirement 14). Full reasoning is in `docs/art-direction/SELECTION.md`.

| Visual | Chosen | Main reason |
| --- | --- | --- |
| Isometric console | `console-a` (slab on live isotherms) | Closest to the reference: slab, glowing disc, knobs, fader and heat blobs behind it. `console-b` drifted from the reference and its bezel text was unreadable at hero size. |
| Bridge schematic | `bridge-a` (classic Graetz schematic) | Shows the topology an engineer reasons with and still reads at thumbnail scale. `bridge-b` pucks competed with the console disc and hid the Graetz connection. |
| Foster ladder | `foster-a` (horizontal RC ladder) | Node values on one baseline in physical order, with a compact form for Drive Detail. `foster-b` was twice as tall and had no compact variant. |
| Mill cutaway | `mill-b` (side elevation) | Uses the reference's isotherm blobs at the roll bite and gives the spike pulse a large target. `mill-a` was a cold line drawing with a small pulse. |
| Airflow diagram | `airflow-b` (one panel, state-driven) | Fan failure is unmistakable (X on blower, frozen particles, warm exchanger, FAN FAIL chip). In `airflow-a` the failed state looked like the running one. |

Cross-cutting fix applied in every visual: elements filled at heat stop 7–8 (critical maroon) get a `--heat-5` halo and rim so the hottest element never reads cooler, and the status icon and word always carry the severity.

## Checkpoint results

| Check | Result |
| --- | --- |
| `npm run lint` (ESLint + token check) | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 55 files, 527 tests pass |
| `npm run test:property` | 13 files, 27 tests pass (200 runs each) |
| `npm run coverage` | Statements 95.84%, branches 89.04%, functions 95.6%, lines 98.09% |

Property 4 (never colour-only) now also covers bridge devices (task 13.2). No new numbered properties were added in this phase.

## Screenshots

Captured with `PHASE=2 npm run screenshots` into `docs/screenshots/phase-2/`. `tests/visual/routes.ts` now lists one `/kit?section=<id>` route per signature visual; those routes capture only the section element (`#kit-<id>`), and `/kit` is still captured full page.

- `kit-{1440,1024,390}.png`: full gallery
- `kit-heat-blobs-{1440,1024,390}.png`
- `kit-isometric-console-{1440,1024,390}.png`
- `kit-bridge-schematic-{1440,1024,390}.png`
- `kit-foster-ladder-{1440,1024,390}.png`
- `kit-mill-cutaway-{1440,1024,390}.png`
- `kit-airflow-diagram-{1440,1024,390}.png`

## Known gaps

- The "Live" specimens in the captures show their waiting state (the bridge shows "Waiting for the first frame…", the console shows no healthy sensor), because the screenshot is taken before the mock source emits its first frame. The fixed-state specimens show every status.
- Selection is still local to the gallery. The `?ch=` Selection_Hook and wiring into `BridgeSchematic` and rack rows arrive in task 18.2.
- Lowest branch coverage among new files: `src/domain/fosterNodes.ts` (83%).
- Reduced-motion behaviour of the strip pulse and airflow particles is implemented but is audited in task 28.
