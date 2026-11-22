# Art-direction selection

The user delegated these choices (Requirement 14). Each sketch was rendered at its native size in Chromium and compared with the reference image (`reference/Screenshot from 2026-11-20 20-43-12.png`). The visual tasks (12–15) build the chosen sketch, apply the carry-forward fixes listed with it, and do not wait for approval (Requirement 14.4).

Heat scale used below (`tokens.primitive.css`): `--heat-0` #3A2A1E is ambient, `--heat-1` #FFD9A0 to `--heat-8` #6E0B16 rise with temperature.

| Visual | Chosen | Not chosen | Builds in |
|---|---|---|---|
| Isometric console | `console-a.svg` | `console-b.svg` | Task 12 |
| Bridge schematic | `bridge-a.svg` | `bridge-b.svg` | Task 13 |
| Foster ladder | `foster-a.svg` | `foster-b.svg` | Task 14 |
| Mill cutaway | `mill-b.svg` | `mill-a.svg` | Task 15.1 |
| Airflow diagram | `airflow-b.svg` (one panel, state-driven) | `airflow-a.svg` | Task 15.2 |

## Cross-cutting fix: critical maroon reads cooler

`--heat-8` (and to a lesser degree `--heat-7`) is darker than `--heat-5`/`--heat-6`, so on a dark surface the hottest element looks the least hot. This shows up in every sketch that fills a single element with the top stop: T5 in `bridge-a`, the Tj node in `foster-a`, the blob core under the console in `console-a`. Every visual that fills an element at heat stop 7 or 8 applies one shared treatment from `<HeatDefs>`:

- a `--heat-5` halo behind the element (blur ≈ 14 px at the sketch scale, opacity ≈ 0.8, larger than the warning glow);
- a 1 px `--heat-5` inner rim stroke on the element so its edge stays bright;
- the status icon and word carry the severity, so colour is never the only signal (Requirement 21.1).

Large fields (`HeatBlobs`, disc core) keep the maroon fill. The halo is only for single small elements.

## Isometric console: `console-a` (slab on live isotherms)

**Why chosen.** It is the closest match to the reference: a dark slab at the same 30° angle, a smooth glowing disc with a dark core and gold rim, two knobs and a fader on the back strip, and isotherm blobs spilling out behind the slab. Each binding has one clear target. The disc follows `hottest` Tj, knob A shows armature current as a percentage of rated current, knob B shows ambient, the fader shows airflow and the readout plate shows the hottest channel id, °C and status word. The blobs are the `HeatBlobs` component from task 11, so the console needs no separate field. For legibility, the readout plate puts the number an operator needs in tabular type beside the disc, and the disc itself is a single gradient that reads at a glance.

**Why `console-b` lost.** The instrument deck carries more information: a Tj scale bezel with WARN 110 and TRIP 125, a needle, and six channel LEDs. But it moves away from the reference. The slab is long and thin, the controls sit on a raised module in front, the stepped bands look posterised next to the reference's smooth disc, and there are no heat blobs behind it, only a glow. The bezel ticks and LED labels also become too small to read at Overview hero size, and the LEDs duplicate the bridge schematic and rack rows. The two views would then have to agree on per-channel state.

**Carry forward into task 12.2.**
- Disc outer ring is paler than the reference. The sketch's `discGrad` runs monotonically from `--heat-7` at the centre to `--heat-3` at the rim. The reference instead has a dark core, a red inner ring, a bright orange middle and a red-orange outer band against the gold bezel. Build the disc so the brightest band sits at mid-radius and the outer 4–6% of radius darkens to `--heat-4`/`--heat-5`. The Tj-driven ring radii still set where each band falls.
- Blob core under the slab is `--heat-8` and reads as a cool shadow. Apply the cross-cutting fix at field level by drawing the innermost band with the `--heat-5` halo filter beneath it, or let `HeatBlobs` emit a soft `--heat-5` glow layer under the top band. Requirement 15.6 still holds because the innermost band fill stays `--heat-8`.
- Borrow one element from `console-b`: put WARN 110 / TRIP 125 tick marks on the disc's gold rim at low contrast (`--gold-700`). They give the disc a scale without the full bezel.
- Keep the readout plate's status word next to the value. The sketch prints "CRITICAL" small and at an angle, so make it at least the micro-label size used by the kit.

## Bridge schematic: `bridge-a` (classic Graetz schematic)

**Why chosen.** The reference has no bridge, so it contributes only the style: thin warm lines on near-black and glow used sparingly. `bridge-a` applies that style to the topology an electrical engineer expects. L1–L3 enter on the left, each leg has an upper and a lower device, the DC bus runs top and bottom, and the motor sits on the right. Every device has a badge beside it with id, tabular Tj, an icon and a status word. Fault is a hatched, dashed outline with "— —" and "SENSOR FAULT". The selected device has gold crop brackets and a `?ch=` tag. Focus is a dotted ring, separate from selection, which keeps keyboard focus and selection distinguishable (Requirements 17.4–17.6). Scaled to 30% with badges removed, it still reads as a 6-pulse bridge on the mill cabinet door.

**Why `bridge-b` lost.** Press-pack pucks on heatsink columns look closer to the hardware and echo the reference disc. But each puck is a small heat disc, so the bridge competes with the console disc on the same page. Ring count is also harder to read than one solid fill. The bus bars do not show the Graetz connection: L1–L3 just join columns, so the topology an operator uses to reason about which leg failed is lost. At thumbnail scale the six pucks become six orange dots.

**Carry forward into task 13.1.**
- T5 at `--heat-8` reads darker, and therefore cooler, than T3 at `--heat-6`. The sketch already layers a `--heat-5` glow at opacity 0.55 under the maroon fill (lines 86–88 of the SVG), but the solid fill hides most of it. Apply the cross-cutting fix: put a larger, brighter `--heat-5` halo behind critical devices and a `--heat-5` rim stroke on the triangle.
- Keep focus (dotted ring) and selection (gold brackets) as separate treatments.
- Badge numbers use the tabular numeral style. The sketch shows "— — °C" for fault, but the badge should drop the unit and show only the `— —` placeholder from task 16.1.

## Foster ladder: `foster-a` (horizontal RC ladder)

**Why chosen.** It reads left to right in the same order as the physics (junction → case → heatsink → air) and keeps every node value on one baseline. An operator can compare 127.9, 116.4, 84.6 and 38.0 without moving their eye vertically. τ chips sit above the stages they describe, R and C labels sit on the components, and the dash flow runs along a single line under the ladder. It supports both variants required by 18.5. The compact variant (Drive Detail) hides the notes and fits a wide, short panel. The annotated variant (About) adds the three one-line stage notes underneath. Its link to the reference is the restrained palette: heat colour only on the nodes, gold for τ chips, ink for wiring.

**Why `foster-b` lost.** The die → case → interface → fins cross-section is a good teaching drawing, and the top-to-bottom flow matches the hardware. But it needs about twice the height. It has no compact form, and its notes are always on, which fails the compact variant on Drive Detail. Node values are stacked vertically, which makes them harder to compare than in `foster-a`. The dotted leaders between the cross-section and the nodes add crossings that make the ladder harder to read.

**Carry forward into task 14.1.**
- The Tj node at `--heat-8` reads cooler than the Tc node at `--heat-6`. Apply the cross-cutting halo and rim fix to the node circle.
- In the sketch the callout marker ② overlaps the τ2 chip text ("τ2 0.5 s"). This is a sketch artefact, and no callouts ship in the component.
- The heat-flow dash gradient goes from `--heat-8` to `--heat-2`, so it starts almost invisible. Start it at `--heat-6`, or apply the halo, so the flow is visible from the junction end.
- If the About page later wants the cross-section from `foster-b`, it can be a static illustration beside the annotated ladder. It is not part of task 14.

## Mill cutaway: `mill-b` (side elevation)

**Why chosen.** It has the reference's signature element, layered isotherm blobs, and uses them where heat is physically produced: the strip at the roll bite. The long horizontal strip runs the full width over the table rollers and gives the spike-onset pulse (Requirement 19.3) a large, obvious target. The drive cabinet in the corner carries the `BridgeSchematic` thumbnail on its door (19.2). Of the two sketches, this one fits the visual language of the console page best.

**Why `mill-a` lost.** The front section of a 4-high stand is accurate and clear. It shows the pinion, the DC motor and the armature link to the cabinet, so the drive relationship is explicit. But it is a cold line drawing. The strip glow is a thin bar between the work rolls, so the spike pulse is small, and nothing in it echoes the reference's heat forms. It would look like a different product next to the console.

**Carry forward into task 15.1.**
- Fix the band order. The sketch's legend runs `--heat-8` (outer) → `--heat-3` (core), which puts the hottest token at the coolest edge and contradicts the heat scale (Requirement 3.5 reserves heat tokens for temperature). Order the bands so the roll bite core is the highest stop. Following the reference, the outer band is pale (`--heat-1`/`--heat-2`) and the core is red. Cap the decorative mill blobs at `--heat-6` so they never show the critical maroon, which belongs to Tj.
- The cabinet door thumbnail draws all six devices in gold. Use the real `BridgeSchematic` `thumbnail` variant so device fills follow each channel's Tj.
- Borrow from `mill-a`: draw a short armature cable from the cabinet to the stand so the drive relationship is visible. The sketch only labels "spindle · motor behind".
- Under reduced motion the strip pulse becomes a static brightness step (task 28 motion audit).

## Airflow diagram: `airflow-b` (cabinet section, running vs fan failure)

**Why chosen.** It makes the fan-failure state obvious, which is the state an operator needs to recognise. The blower gets an X and turns grey, the dots freeze, the exchanger turns warm (`--heat-4`), airflow drops to 0%, and the panel gets a red-outlined "FAN FAIL" chip with an icon. The section layout puts the heatsink with T1–T6 inside the airflow path, so the cause (no airflow) and the effect (hot devices) appear in one drawing. Its dark-surface heat bloom matches the reference. The bindings match Requirement 20 directly: `fan_status` controls dot speed and blade spin, and false stops both and sets the exchanger to a warm stop.

**Why `airflow-a` lost.** The closed-loop ring diagram is tidy, but the fan-failure state would barely change it. The blower would stop and the particles freeze, but particles along a thin duct are small, and the frozen state looks like the running state in a still frame. The loop-state card in the middle repeats the KPI tiles. The stack glow and the exchanger sit at opposite edges, so cause and effect are far apart.

**Carry forward into task 15.2.**
- Build one panel whose state comes from `fan_status`. The sketch shows two panels side by side only for comparison.
- In the fan-fail panel the heatsink device chips turn pale (`--heat-1`), which reads cooler than the orange chips in the running panel, the opposite of what happens. Fill device chips with `heatToken(heatStopIndex(tj))` from the live frame, and apply the cross-cutting halo fix at stops 7–8.
- The fan-fail bloom has a `--heat-8` outer edge and a pale centre, the same inversion as `mill-b`. If a bloom is kept, it reuses `HeatBlobs` ordering (hottest band innermost). Otherwise drop it. The bloom is not required by Requirement 20.
- Particle count stays at 40 or fewer (the running panel shows more dots), moved with CSS transforms.
