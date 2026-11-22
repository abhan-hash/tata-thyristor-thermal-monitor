# Motion audit (Phase 4)

Requirement 34.3. Every animation left in the app, the state, arrival or
causality it communicates, and what it does under `prefers-reduced-motion:
reduce`. Animated properties are limited to `transform` (incl. `scale` /
`translate`), `opacity`, SVG `fill` / `stop-color`, `stroke-dashoffset` and
hover colour (Requirement 34.1). `npm run lint` runs `scripts/check-motion.mjs`,
which fails on layout properties (width, height, top, left, right, bottom,
inset, margin, padding) or `all` in any transition, keyframe or Motion target.

The only infinite animations are state-communicating loops: the critical glow
pulse, Foster dash flow and airflow particles / fan blades. Each stops when its
state ends, and all of them stop under reduced motion.

## Live values

| Animation | Where | Property | Communicates | Reduced motion |
|---|---|---|---|---|
| Number tween, 200 ms `--ease-out` | `motion/AnimatedNumber.tsx` (KPI tiles, Overview hero, Drive Detail readout, rack rows) | text (no layout: fixed `ch` width) | A live value changed, and in which direction | Value jumps |
| Heat fill tween, 300 ms, in heat-scale space | `motion/useHeatFill.ts`: `HeatDisc`, `IsometricConsole` disc, `BridgeSchematic` devices | `fill`, `stop-color` | Temperature changed; colour stays on the heat ramp | Jumps |
| Critical glow pulse, 1.6 s loop | `.motion-critical-pulse` in `styles/global.css`: bridge halo, Heat_Disc glow | `opacity` | The channel is critical (static for normal and warning) | Static; status still shown by icon and text |
| Chart draw-in, 600 ms, once per mount | `charts/ChartTrace.tsx` | `stroke-dashoffset` via `pathLength` (dashed traces: `opacity`) | First data has arrived | Off |
| Chart slide, one sample step per sample | `ChartTrace` `live` (Transient and Current charts) | `transform: translateX` | A new sample arrived at "NOW" | Off |
| Heat blob morph, 600 ms per 1 Hz update | `visuals/heat/HeatBlobs.tsx` | path `d` with fixed topology (48 points per ring) | The heat field moved with the channel Tj values | Paths jump |
| Drive Detail margin bar | `DriveDetailPage` Tj bar | `transform: scaleX` | Tj relative to the trip | Follows the value |
| Smear intensity | `HeatSmearTitle` | `opacity`, `transform` of trailing copies | Hottest Tj (faint when cool, full at trip) | Follows the value |

## Arrivals and events

| Animation | Where | Property | Communicates | Reduced motion |
|---|---|---|---|---|
| Page entrance, < 700 ms, once per session | `motion/useEntrance.ts` on all six pages | `opacity`, `translateY` | The page arrived; order hero → visual → secondary | Off |
| Sync_Pulse flash, one per Display_Tick | `kit/SyncPulse.tsx` | `opacity` | Fresh data arrived this second; stops while stale | Static "LIVE" label |
| Alarm row arrival, 240 ms slide + highlight | `pages/Alarms/EventList.tsx` | `translateX`, `opacity` | A new (coalesced) alarm row arrived; repeats within 5 s add "×N" with no new arrival | Highlight fades, no slide |
| Alarm badge pop, 240 ms | `TopNav` bell count | `scale`, `opacity` | Active alarm count went up | Fades only |
| Connection banner slide-in | `kit/ConnectionBanner.tsx` | `opacity`, `translate` | Connection became stale or reconnecting | Instant |
| Nav sheet slide-in | `TopNav` mobile sheet | `opacity`, `translate` | Menu opened | Instant |
| Mill strip pulse, one per spike onset | `visuals/mill/MillCutaway.tsx` | `opacity`, `transform: scale` | A bar-bite current spike heats the stand (causality) | Off; static step stays |
| Airflow bloom swell, 600 ms | `visuals/airflow/AirflowDiagram.tsx` | `transform: scale` (was `rx`/`ry`) | Heat builds up when the fan fails | Instant |
| Airflow chip / exchanger fill, 300 ms | `AirflowDiagram` | `fill` | Channel heat / fan state changed | Instant |

## Continuous state

| Animation | Where | Property | Communicates | Reduced motion |
|---|---|---|---|---|
| Foster dash flow | `visuals/foster/FosterLadder.tsx` | `stroke-dashoffset` | Heat flow; speed ∝ power loss, stops at 0 W | Off |
| Airflow particles and fan blades | `AirflowDiagram` | `transform` | Airflow rate and fan state; freeze when the fan fails | Off |

## Interaction feedback

| Animation | Where | Property | Communicates | Reduced motion |
|---|---|---|---|---|
| Press `scale(0.97)`, 120 ms | `styles/global.css` base rule for `button` and `[role=button]` | `scale` | The press registered (causality) | Instant |
| Hover colours, 120 ms | Kit controls, nav links, rack rows; all `hover:` variants are inside `@media (hover: hover)` | colour | Pointer is over an interactive element | Instant |
| Nav active tick | `TopNav` bar links | `transform: scaleX` | Current route changed | Instant |
| Toggle knob slide | `kit/HardwareToggle.tsx` | `translate` | Switch state changed | Instant |
| Chevron rotate / nudge | `EventList` row, `RackRow`, `TripPanel` | `transform` | Row expanded / link hovered | Instant |
| Rack row selected edge | `kit/RackRow.tsx` | `opacity` | Row selected | Instant |
| Replay caption | `Overview/Hero.tsx` | `opacity` | Replay step changed | Instant |

## Removed or changed in this audit

- `box-shadow` transitions on the toggle knob and LED, the fader cap and the replay button: shadow is not a cheap property and the state is already carried by position or colour. The shadow now changes at once.
- Airflow bloom `rx` / `ry` transition: replaced by a `transform: scale` swell with the same meaning.
- Bridge `transition: fill` (CSS, jumped between stepped tokens): replaced by the shared heat-space tween.
- Duplicate heat-position tweens in `HeatDisc` and `IsometricConsole`: moved into `useHeatPosition`.
- Unused Motion `PRESS` preset: press feedback is the single CSS rule above.
