# Requirements Document

## Introduction

THERMOSENSE estimates thyristor junction temperature (Tj) for a 6-pulse DC mill drive using a 3-stage Foster RC model. This feature replaces the Streamlit frontend with a standalone single-page app in `web/` (Vite, React, TypeScript, Tailwind, Motion, visx, hand-built SVG). The visual benchmark is the Output "THERMAL" landing page (`reference/Screenshot from 2026-11-20 20-43-12.png`), translated to the mill-drive domain while staying usable for mill operators.

Scope is UI only. All data comes from a clearly marked mock telemetry layer behind the `TelemetrySource` and `HistoryRepository` interfaces. The FastAPI backend, the WebSocket adapter, real authentication, and any change to `thermosense_dashboard/` or the Python model files are out of scope.

The requirements are grouped by delivery phase:

| Phase | Content | Requirements |
|---|---|---|
| 1 | Design system, component kit, `/kit` route, data layer foundations | 1–13 |
| 2 | Signature SVG visuals and art direction | 14–21 |
| 3 | Six pages plus kit, routing, selection, responsive layout | 22–31 |
| 4 | Motion system with reduced-motion support | 32–35 |
| 5 | QA: stress cases, viewports, keyboard/focus, WCAG AA, soak, lint/tests, delivery | 36–42 |

The user has delegated art-direction choices: Requirement 14 replaces the blocking sketch approval with two sketches per visual and a written selection rationale.

## Glossary

- **THERMOSENSE_App**: The single-page web application in `web/` specified by this document.
- **App_Shell**: The persistent layout (Contour_Background, Top_Nav, route outlet) that stays mounted across routes.
- **Top_Nav**: The top navigation bar with wordmark, route links and utilities (data-source badge, alarm count, clock, settings link, Sync_Pulse).
- **Router**: The React Router configuration that maps URL paths and search params to pages.
- **Selection_Hook**: The `useSelectedChannel()` hook that derives the selected Channel from the `?ch=` search param.
- **Channel**: One of the six thyristors T1–T6 of the bridge, identified by id 1..6.
- **Tj**: Estimated junction temperature of a Channel in °C (`tj_estimated`).
- **Hottest_Tj**: The maximum Tj across all Channels whose sensor is healthy.
- **Status**: One of `normal`, `warning`, `critical`, `fault`.
- **Severity_Rank**: The ordering normal (0) < warning (1) < critical (2) < fault (3).
- **DriveFrame**: One telemetry sample for the whole drive, with fields mirroring `DriveData.to_dict()` and `ThyristorData.to_dict()` in `thermosense_dashboard/data/data_source.py`.
- **Scenario**: A mock drive condition: `normal`, `bar_entry`, `fan_failure`, `clogging`, `overload`, `clear`.
- **Display_Tick**: A 1 Hz event emitted by the Telemetry_Store that drives operator-readable text updates.
- **Token_System**: The three-layer set of CSS custom properties (primitive, semantic, component) in `web/src/styles/`.
- **Lint_Check**: The ESLint configuration and CI token-usage check for `web/`.
- **Component_Kit**: The Phase 1 library of token-driven React primitives in `web/src/kit/`.
- **Kit_Gallery**: The `/kit` route that displays every Component_Kit component in each state.
- **Status_Chip**: Kit component that renders a Status as icon plus text.
- **Rack_Row**: Kit component for one Channel row with tracked-caps label, value, Status_Chip and chevron.
- **Source_Grid**: Kit component of gold-outlined Scenario buttons acting as a radio group.
- **Kpi_Tile**: Kit component showing label, live value, unit, sparkline and delta.
- **Fader**: Kit range-input component styled as a recessed fader.
- **Hardware_Toggle**: Kit rocker switch with LED and ON/OFF text.
- **Field**: Kit text, number or select input with inline validation (covers `Field`, `NumberField`, `Select`).
- **Filter_Chip**: Kit toggleable filter with label and count.
- **Chart_Frame**: Kit chart wrapper with axes, grid, crosshair and labelled warning/trip bands.
- **Empty_State**: Kit component for no-data, disconnected, no-alarms and error states.
- **Connection_Banner**: Kit banner that reports stale or reconnecting data.
- **Contour_Background**: Static page-level topographic texture.
- **Heat_Defs**: Shared SVG definitions (gradients, filters, hatch patterns) used by all signature visuals.
- **Heat_Disc**: Radial heat disc visual driven by a temperature value.
- **Heat_Smear_Title**: Heat-gradient wordmark with a leftward motion smear.
- **Heat_Blobs**: Stepped isotherm bands computed from the six Channel temperatures.
- **Isometric_Console**: Isometric hardware console visual with Heat_Disc, knobs and fader.
- **Bridge_Schematic**: 6-pulse Graetz bridge visual with T1–T6 as selectable thyristor symbols.
- **Foster_Ladder**: 3-stage RC ladder visual from junction to air.
- **Mill_Cutaway**: Rolling stand cutaway visual with drive cabinet and strip.
- **Airflow_Diagram**: Heat exchanger and blower visual with flow particles.
- **Art_Direction_Record**: The sketches and selection notes in `web/docs/art-direction/`.
- **Delivery_Process**: The phased build process for this feature, including commits, screenshots and phase reviews.
- **Telemetry_Source**: The push-stream port (`start`, `stop`, `subscribe`, `onStatus`, optional `setScenario`) for live DriveFrames.
- **Mock_Telemetry_Source**: The Telemetry_Source implementation that simulates the drive at 10 Hz from a seeded PRNG.
- **Source_Factory**: `createTelemetrySource(env)`, which selects the Telemetry_Source from `VITE_DATA_SOURCE`.
- **History_Repository**: The request/response port for alarms, traces, daily peaks, wear and acknowledgement.
- **Mock_History_Repository**: The History_Repository implementation backed by seeded in-memory fixtures.
- **Mock_Layer**: All files under `web/src/data/mock/`.
- **Frame_Decoder**: `decodeDriveFrame`, the runtime validator applied to every incoming frame.
- **Telemetry_Store**: The external store holding the latest frame, ring buffers, connection status and alarm state.
- **Ring_Buffer**: Fixed-capacity per-channel sample buffer in the Telemetry_Store.
- **Alarm_Engine**: Pure function that evaluates frames against thresholds with hysteresis and debounce.
- **Status_Classifier**: Pure function `statusFor(value, band)` that maps a value to a Status.
- **Heat_Scale**: Pure function that maps a temperature to a heat stop index 0..8 or to the fault treatment.
- **Formatter**: Pure functions that format °C, K, A, W, K/W and durations for display.
- **Motion_System**: Motion tokens, presets and hooks in `web/src/motion/`.
- **Animated_Number**: Component that tweens a numeric MotionValue for display.
- **Sync_Pulse**: The 1 px gold tick in the Top_Nav that flashes on each Display_Tick.
- **Overview_Page**: The `/` route.
- **Drive_Detail_Page**: The `/drive` route.
- **Alarms_Page**: The `/alarms` route.
- **Trends_Page**: The `/trends` route.
- **Settings_Page**: The `/settings` route.
- **Settings_Validator**: Pure function `validate(draft)` for settings drafts.
- **About_Page**: The `/about` route.
- **Error_Boundary**: Per-region React error boundary.
- **Transient_Chart**: Chart of Tj and heatsink temperature for the selected Channel.
- **Current_Chart**: Chart of armature current with a rated-current reference line.
- **Severity_Timeline**: Alarms chart with per-channel event lanes and a time brush.
- **Event_Trace**: Tj trace from 60 s before to 60 s after an alarm event.
- **Channel_Day_Heatmap**: Grid of daily peak Tj per Channel.
- **Wear_Projection**: Consumed-life chart with p10–p90 projection band.
- **Life_Arc_Gauge**: Remaining-life arc gauge per Channel.
- **Stress_Fixture**: A mock data set selected with `?mock=` to exercise extreme cases.
- **QA_Suite**: The Vitest, fast-check and Playwright test suites in `web/tests/`.

## Requirements

### Requirement 1: Standalone App Scaffolding

**User Story:** As a developer, I want the new frontend isolated in its own project with safe rendering defaults, so that the existing dashboard keeps working and the old sanitizer and font defects do not recur.

#### Acceptance Criteria

1. THE THERMOSENSE_App SHALL be a standalone single-page application in `web/` built with Vite, React, TypeScript, Tailwind, Motion and visx.
2. THE Delivery_Process SHALL leave every file in `thermosense_dashboard/`, `model.py` and the `stage*.py` files unmodified.
3. THE THERMOSENSE_App SHALL load fonts from the local bundle via `@fontsource-variable/archivo` with `font-display: swap`, with zero runtime CSS imports from external hosts.
4. THE THERMOSENSE_App SHALL render every SVG through typed JSX components, with zero uses of `dangerouslySetInnerHTML`.
5. WHERE the production build is served, THE THERMOSENSE_App SHALL apply a Content Security Policy of `default-src 'self'` with no inline scripts.

### Requirement 2: Design Tokens

**User Story:** As a designer, I want a three-layer token system sampled from the reference, so that every component shares one consistent visual language.

#### Acceptance Criteria

1. THE Token_System SHALL define primitive, semantic and component token layers as CSS custom properties.
2. THE Token_System SHALL define the primitive values listed in the design: ink neutrals, gold, the 9-stop heat ramp, signal colours, Archivo Variable type roles and the 11–96 px scale, the 4-pt spacing scale, radii, elevation, easing curves and durations.
3. THE Token_System SHALL map the Tailwind theme to the semantic CSS variables, so that a class such as `bg-surface-raised` resolves to `var(--surface-raised)`.
4. WHEN a hex or rgb colour literal appears in `src/**/*.tsx`, THE Lint_Check SHALL report an error.
5. THE THERMOSENSE_App SHALL use the `--heat-0` to `--heat-8` tokens for temperature encoding only.
6. THE THERMOSENSE_App SHALL style every interactive element on `:focus-visible` with the `--focus-ring` token (2 px gold-300 ring with 2 px ink-950 offset).

### Requirement 3: Numeric Formatting

**User Story:** As a mill operator, I want readouts that keep a fixed width and show small differences, so that I can read and compare values at a glance.

#### Acceptance Criteria

1. THE Formatter SHALL format temperatures in °C, temperature differences in K, current in A, power in W, thermal resistance in K/W, and durations.
2. THE Formatter SHALL return strings of constant character length for all finite values from −50 to 250 at a fixed unit and precision.
3. THE Formatter SHALL return strings composed of digits, one sign position, one decimal separator and the unit symbol only.
4. IF the value to format is NaN, THEN THE Formatter SHALL return the placeholder "— —" padded to the same character length as a finite formatted value.
5. THE Formatter SHALL format Tj readouts at 0.1 °C precision, so that two values that differ by at least 0.1 °C produce different strings.
6. THE Formatter SHALL return strings and chart titles that contain zero HTML entities.
7. THE THERMOSENSE_App SHALL render numeric readouts with `font-variant-numeric: tabular-nums`.

### Requirement 4: Status Classification and Heat Scale

**User Story:** As a mill operator, I want status and heat colour to follow the configured thresholds exactly, so that the display matches the plant's alarm limits.

#### Acceptance Criteria

1. THE Status_Classifier SHALL classify a Tj below 110 °C as normal, from 110 °C to below 125 °C as warning, and at or above 125 °C as critical.
2. THE Status_Classifier SHALL classify heatsink temperature with boundaries at 80 °C and 85 °C, and cooling residual with boundaries at 4 K and 8 K, using the same normal/warning/critical pattern.
3. THE Status_Classifier SHALL return a Severity_Rank that is non-decreasing as the input value increases, for any threshold set.
4. THE THERMOSENSE_App SHALL take default threshold values (bands, hysteresis and debounce) from `thermosense_dashboard/config/thresholds.yaml`.
5. THE Heat_Scale SHALL map every temperature to a heat stop index from 0 to 8 inclusive that is non-decreasing as temperature increases.
6. IF the input to the Heat_Scale is non-finite, THEN THE Heat_Scale SHALL return the fault treatment instead of a heat stop.

### Requirement 5: Status Is Never Colour-Only

**User Story:** As a mill operator with colour-vision deficiency, I want every status shown with an icon and text, so that I can read status without relying on colour.

#### Acceptance Criteria

1. THE Status_Chip SHALL render every Status as an icon plus a non-empty text label.
2. THE Status_Chip SHALL use a distinct icon shape per Status: check-circle for normal, triangle for warning, octagon for critical, slashed sensor for fault.
3. WHEN a Rack_Row or a Bridge_Schematic device displays a Status, THE THERMOSENSE_App SHALL include the Status text label and the Status icon in the rendered output.
4. THE Chart_Frame SHALL label warning and trip bands with text, such as "WARN 110 °C" and "TRIP 125 °C".
5. THE Hardware_Toggle SHALL pair the LED colour with ON or OFF text.

### Requirement 6: Component Kit

**User Story:** As a developer, I want a token-driven component kit, so that pages are assembled from consistent, accessible primitives.

#### Acceptance Criteria

1. THE Component_Kit SHALL provide AppShell, TopNav, HeroLockup, HeatSmearTitle, CropPanel, KpiTile, Sparkline, StatusChip, HeatDisc, RackRow, SourceButton, SourceGrid, ChartFrame, Fader, HardwareToggle, Field, NumberField, Select, FilterChip, EmptyState, ConnectionBanner and ContourBackground.
2. THE Component_Kit SHALL give every interactive component a `disabled` prop and token-driven `:focus-visible` styling.
3. THE Source_Grid SHALL expose `role="radiogroup"` with roving tabindex, so that arrow keys move between options and Tab leaves the group.
4. THE Rack_Row SHALL render as a native button or link element.
5. THE Fader SHALL be built on a native `<input type="range">`.
6. THE Hardware_Toggle SHALL expose `role="switch"` with its checked state.
7. WHEN a Field has a validation error, THE Field SHALL display the error message and reference the message through `aria-describedby`.
8. WHEN a Filter_Chip label exceeds the available width, THE Filter_Chip SHALL wrap the label onto a second line.
9. THE Kpi_Tile SHALL reserve a fixed character width for its value, so that value changes leave the surrounding layout unchanged.

### Requirement 7: Kit Gallery Route

**User Story:** As a reviewer, I want every kit component on one route in every state, so that I can review the design system before pages are built.

#### Acceptance Criteria

1. THE Router SHALL serve the Kit_Gallery at `/kit`.
2. THE Kit_Gallery SHALL display every Component_Kit component in each applicable state: default, hover, active/pressed, focus, disabled, loading/empty, and each Status.
3. WHEN the `?section=` param names a Kit_Gallery section, THE Kit_Gallery SHALL scroll that section into view.
4. THE Kit_Gallery SHALL display the semantic token swatches and the type scale.

### Requirement 8: Swappable Data Ports

**User Story:** As a developer, I want all data behind two typed ports with a clearly marked mock, so that a backend adapter can replace the mock without touching components.

#### Acceptance Criteria

1. THE THERMOSENSE_App SHALL read live telemetry only through the Telemetry_Source interface.
2. THE THERMOSENSE_App SHALL read alarms, traces, daily peaks and wear only through the History_Repository interface.
3. WHEN `VITE_DATA_SOURCE` is `mock` or unset, THE Source_Factory SHALL return the Mock_Telemetry_Source.
4. WHILE the active Telemetry_Source kind is `mock`, THE Top_Nav SHALL display a "MOCK" data-source badge.
5. THE Mock_Layer SHALL begin every file with the header `// MOCK DATA – synthetic, not plant telemetry`.
6. THE THERMOSENSE_App SHALL define DriveFrame and ThyristorFrame types with the same snake_case field names as `DriveData.to_dict()` and `ThyristorData.to_dict()`.

### Requirement 9: Frame Decoding

**User Story:** As a developer, I want every frame validated and normalised before use, so that the UI shows consistent data even from an untrusted source.

#### Acceptance Criteria

1. WHEN a frame arrives from any Telemetry_Source, THE Frame_Decoder SHALL validate the frame before the frame reaches the Telemetry_Store.
2. IF a frame lacks a required key, has a thyristor count other than six, has thyristor ids other than 1..6 in order, or has an infinite temperature, THEN THE Frame_Decoder SHALL return an error result.
3. IF a temperature field is NaN while `sensor_healthy` is true, THEN THE Frame_Decoder SHALL return an error result.
4. THE Frame_Decoder SHALL return either a decoded frame or an error result for any JSON input, without throwing an exception.
5. WHEN decoding a frame, THE Frame_Decoder SHALL set `margin_to_limit` to `125 − tj_estimated` for each Channel and log any input mismatch above 0.01 K.
6. WHEN a Channel has `sensor_healthy` false, THE Frame_Decoder SHALL set that Channel's Status to fault.
7. WHEN decoding a frame, THE Frame_Decoder SHALL set `overall_status` to the highest Severity_Rank among the Channel Statuses.
8. WHEN a frame contains unknown keys, THE Frame_Decoder SHALL ignore the unknown keys.
9. IF the Frame_Decoder returns an error result, THEN THE Telemetry_Store SHALL drop the frame, keep the last good frame and increment the dropped-frame counter shown in the dev overlay.

### Requirement 10: Mock Telemetry Simulation

**User Story:** As a reviewer, I want a reproducible, physically plausible mock drive, so that the UI can be demonstrated and tested without plant data.

#### Acceptance Criteria

1. WHILE started, THE Mock_Telemetry_Source SHALL emit one DriveFrame every 100 ms, with timestamps that increase by 100 ms ± 1 ms.
2. THE Mock_Telemetry_Source SHALL produce identical frame sequences for an identical seed and Scenario script.
3. THE Mock_Telemetry_Source SHALL compute per-device power loss as `V_f0·I + r_d·I²` with `I` equal to armature current divided by 3, and junction rise through a 3-stage Foster network with τ of 0.02 s, 0.5 s and 20 s.
4. THE Mock_Telemetry_Source SHALL generate armature current as a 55% rated base load, plus a bar-entry spike of +40% rated every 8 s lasting 2.4 s, plus 2% noise.
5. THE Mock_Telemetry_Source SHALL apply fixed per-channel offsets in R_sa (±4%) and current share (±2%), so that T1–T6 differ by 1 K to 4 K in steady state.
6. WHEN `setScenario` is called, THE Mock_Telemetry_Source SHALL apply the Scenario: `fan_failure` multiplies R_sa by 2.2 and sets `fan_status` false, `clogging` ramps R_sa by +60% over 60 s, `overload` sets base load to 115% rated, `bar_entry` forces a spike immediately, and `clear` restores baseline.
7. THE Mock_Telemetry_Source SHALL keep every frame of a run of up to 3000 ticks within these bounds: ambient 30–40 °C, heatsink ≥ ambient − 0.5 °C, Tj ≥ heatsink − 0.5 °C for healthy Channels, Tj ≤ 160 °C, power loss ≥ 0 W, armature current from 0 to 1.6 × rated.
8. THE Mock_History_Repository SHALL serve fixtures generated from a fixed seed: 30 days of daily peaks per Channel, 200 alarm events, wear records with p10/p50/p90 projections, and per-event traces.
9. WHEN the Mock_History_Repository receives a request, THE Mock_History_Repository SHALL respond after a simulated latency from 80 ms to 200 ms.

### Requirement 11: Telemetry Store and Ring Buffers

**User Story:** As a developer, I want a store that handles 10 Hz data without re-rendering the whole tree, so that the UI stays smooth and memory stays bounded.

#### Acceptance Criteria

1. WHEN a decoded frame arrives, THE Telemetry_Store SHALL append each Channel's values to a Ring_Buffer with a capacity of 3000 samples.
2. THE Ring_Buffer SHALL hold at most its capacity, contain the most recently pushed elements in push order, and allocate no further memory after reaching capacity.
3. WHEN a frame changes a selected slice of store state, THE Telemetry_Store SHALL notify only the subscribers of that slice.
4. WHEN a decoded frame arrives, THE Telemetry_Store SHALL write live numeric values to MotionValues that update SVG attributes and text without a React re-render.
5. THE Telemetry_Store SHALL emit a Display_Tick once per second.
6. WHEN a Display_Tick fires, THE THERMOSENSE_App SHALL update operator-readable text readouts to the peak value over the preceding 1 s window.

### Requirement 12: Connection Status

**User Story:** As a mill operator, I want to know when data has stopped arriving, so that I never trust a frozen reading.

#### Acceptance Criteria

1. THE Telemetry_Source SHALL report a connection status of `connecting`, `live`, `stale`, `reconnecting` or `offline`.
2. IF no valid frame has arrived for more than 1 s, THEN THE Telemetry_Store SHALL enter the `stale` status.
3. WHILE the connection status is `stale`, THE Connection_Banner SHALL display "Data stale – last frame N s ago", where N is the number of seconds since the last valid frame.
4. WHILE the connection status is `stale`, THE THERMOSENSE_App SHALL dim live readouts to `--text-muted`, show a STALE chip on each readout and stop the Sync_Pulse.
5. WHEN a valid frame arrives while the connection status is `stale`, THE THERMOSENSE_App SHALL return to the `live` status and hide the Connection_Banner.

### Requirement 13: Alarm Engine

**User Story:** As a mill operator, I want alarms that raise and clear with hysteresis and debounce, so that alarms do not chatter around a threshold.

#### Acceptance Criteria

1. THE Alarm_Engine SHALL evaluate each frame as a pure function of the frame, the previous alarm state and the thresholds, and return the new alarm state and new AlarmEvents.
2. THE Alarm_Engine SHALL evaluate the alarm kinds `junction_temp`, `heatsink_temp`, `cooling_residual`, `rms_current`, `residual_rate` and `sensor`.
3. WHEN a monitored value stays at or above a level (warning or critical) for the band's debounce duration, THE Alarm_Engine SHALL raise an AlarmEvent at that level.
4. WHEN the value of a raised alarm has stayed below the level minus the band's hysteresis for the debounce duration, THE Alarm_Engine SHALL clear the alarm and set `cleared_at`.
5. WHILE the value of a raised alarm stays at or above the level minus the band's hysteresis, THE Alarm_Engine SHALL keep the alarm active.

### Requirement 14: Art Direction Sketches

**User Story:** As the product owner, I want two sketches per signature visual with a documented choice, so that art direction is deliberate without blocking the build on my approval.

#### Acceptance Criteria

1. THE Art_Direction_Record SHALL contain two distinct SVG sketches in `web/docs/art-direction/` for each of the Isometric_Console, Bridge_Schematic, Foster_Ladder, Mill_Cutaway and Airflow_Diagram before that visual is built.
2. THE Art_Direction_Record SHALL name one chosen sketch per visual with a written rationale that refers to the reference image, the data binding and operator legibility.
3. THE Art_Direction_Record SHALL state, for each visual, why the other sketch was not chosen.
4. WHEN the Art_Direction_Record names a chosen sketch for a visual, THE Delivery_Process SHALL proceed to build that visual without waiting for user approval.

### Requirement 15: Shared Heat Visuals

**User Story:** As a mill operator, I want the reference's heat imagery to carry live data, so that the decoration also tells me how hot the drive is.

#### Acceptance Criteria

1. THE Heat_Defs SHALL provide the gradients, blur and turbulence filters and hatch patterns shared by all signature visuals.
2. THE Heat_Disc SHALL render orange-red rings, a seeded irregular dark core, a thin gold rim and a centre marker, with ring radii and gradient stop mix set from the input temperature.
3. THE Heat_Smear_Title SHALL render the title text with a heat-gradient fill and three trailing copies offset to the left through an x-only blur, with smear strength set by an intensity input from 0 to 1.
4. THE Heat_Blobs SHALL render isotherm bands computed from a 48 × 32 field seeded with the six Channel temperatures at fixed anchor points, recomputed once per second.
5. THE Heat_Blobs SHALL render exactly six bands for every input, including all Channels at ambient and all Channels at or above 125 °C.
6. IF every Channel Tj is at or above 125 °C, THEN THE Heat_Blobs SHALL saturate the innermost band at `--heat-8`.
7. THE Contour_Background SHALL render a static pre-generated topographic SVG at 6% opacity with `pointer-events: none`.

### Requirement 16: Isometric Console

**User Story:** As a mill operator, I want the hero console to show the drive's hottest point and operating conditions, so that the landing view is glanceable.

#### Acceptance Criteria

1. THE Isometric_Console SHALL render a matte slab in a 30° isometric projection with separate top, front and right faces, a 1 px top-edge bevel, a contact shadow, a turbulence texture clipped to the top face, two knobs, a recessed fader well, tracked-caps micro-labels, and a projected Heat_Disc with crop brackets.
2. THE Isometric_Console SHALL drive its Heat_Disc from Hottest_Tj.
3. THE Isometric_Console SHALL show armature current as a percentage of rated current on one knob ring arc and ambient temperature on the other knob ring arc.
4. THE Isometric_Console SHALL set the fader position from fan airflow, so that the `fan_failure` and `clogging` Scenarios move the fader toward reduced airflow.

### Requirement 17: Bridge Schematic

**User Story:** As a mill operator, I want a bridge schematic that shows each thyristor's heat and lets me select one, so that I can find and inspect a hot device.

#### Acceptance Criteria

1. THE Bridge_Schematic SHALL draw a 6-pulse Graetz bridge with three AC phase inputs, a DC bus output and T1–T6 as thyristor symbols.
2. THE Bridge_Schematic SHALL fill each thyristor symbol with the Heat_Scale colour of that Channel's Tj.
3. THE Bridge_Schematic SHALL display a Status icon badge on each thyristor symbol.
4. THE Bridge_Schematic SHALL expose each thyristor symbol as a focusable element with button role and an accessible name that includes the Channel id, Tj and Status.
5. WHEN a thyristor symbol is clicked or activated with Enter or Space, THE Bridge_Schematic SHALL set the `?ch=` param to that Channel.
6. THE Bridge_Schematic SHALL highlight the thyristor symbol of the selected Channel.

### Requirement 18: Foster Ladder

**User Story:** As an engineer, I want to see the thermal network the estimate comes from, so that I understand and trust the Tj value.

#### Acceptance Criteria

1. THE Foster_Ladder SHALL draw a 3-stage RC ladder with nodes for junction, case, heatsink and air.
2. THE Foster_Ladder SHALL fill each node with the Heat_Scale colour of the node's estimated temperature for the bound Channel.
3. THE Foster_Ladder SHALL animate dash flow along the ladder at a speed proportional to the bound Channel's power loss.
4. THE Foster_Ladder SHALL label the time constants τ1 0.02 s, τ2 0.5 s and τ3 20 s and the stage R values.
5. WHERE the annotated variant is used, THE Foster_Ladder SHALL display an explanatory annotation for each stage.

### Requirement 19: Mill Cutaway

**User Story:** As a visitor to the About page, I want to see where the drive sits in the mill, so that I understand what the monitored thyristors power.

#### Acceptance Criteria

1. THE Mill_Cutaway SHALL draw a rolling stand cutaway with a drive cabinet and a glowing strip.
2. WHEN a bar-entry spike begins, THE Mill_Cutaway SHALL pulse the strip glow.
3. THE Mill_Cutaway SHALL display the Bridge_Schematic at thumbnail scale on the cabinet door.

### Requirement 20: Heat Exchanger and Blower Diagram

**User Story:** As an engineer, I want to see the cooling path react to fan state, so that cooling faults are easy to recognise.

#### Acceptance Criteria

1. THE Airflow_Diagram SHALL draw a heat exchanger and a blower.
2. THE Airflow_Diagram SHALL render at most 40 flow particles moved with CSS transforms, with particle speed set from fan state.
3. WHEN `fan_status` is false, THE Airflow_Diagram SHALL stop the blower and particles and change the heat exchanger fill to a warm heat stop.

### Requirement 21: Sensor Fault Presentation

**User Story:** As a mill operator, I want a failed sensor shown clearly and kept out of aggregate values, so that one bad RTD does not mislead me.

#### Acceptance Criteria

1. IF a Channel has `sensor_healthy` false, THEN THE THERMOSENSE_App SHALL render that Channel with the fault hatch pattern, a "SENSOR FAULT" Status_Chip and the "— —" placeholder.
2. IF a Channel has `sensor_healthy` false, THEN THE THERMOSENSE_App SHALL exclude that Channel from Hottest_Tj.
3. IF a Channel has `sensor_healthy` false, THEN THE Heat_Blobs SHALL interpolate that Channel's anchor value from neighbouring Channels.
4. WHEN healthy frames return for a faulted Channel, THE THERMOSENSE_App SHALL restore that Channel's normal presentation.

### Requirement 22: App Shell, Navigation and Routing

**User Story:** As a mill operator, I want to move between pages instantly, so that navigation never interrupts the live view.

#### Acceptance Criteria

1. THE Router SHALL serve the Overview_Page at `/`, the Drive_Detail_Page at `/drive`, the Alarms_Page at `/alarms`, the Trends_Page at `/trends`, the Settings_Page at `/settings`, the About_Page at `/about` and the Kit_Gallery at `/kit`.
2. WHEN the operator navigates between routes, THE App_Shell SHALL keep the Top_Nav and the Telemetry_Store mounted and complete the navigation without a full document reload.
3. THE Router SHALL lazy-load every route except the Overview_Page.
4. IF the requested path matches no route, THEN THE Router SHALL render an Empty_State with a link to `/`.
5. THE Top_Nav SHALL display the "thermosense" wordmark, the tracked-caps links OVERVIEW, DRIVE, ALARMS, TRENDS and ABOUT, the data-source badge, an alarm bell with the active alarm count, a SETTINGS link, a clock and the Sync_Pulse.
6. WHILE the viewport is narrower than 1024 px, THE Top_Nav SHALL collapse the links into a sheet opened by a menu button.
7. THE THERMOSENSE_App SHALL render a compact HeroLockup header on every page except the Overview_Page, which uses the full-scale HeroLockup.

### Requirement 23: Channel Selection

**User Story:** As a mill operator, I want one shareable channel selection that every view agrees on, so that I always know which thyristor I am looking at.

#### Acceptance Criteria

1. THE Selection_Hook SHALL derive the selected Channel from the `?ch=` param with values T1 to T6.
2. IF the `?ch=` param is missing or invalid, THEN THE Selection_Hook SHALL select T1 and rewrite the URL with a replace navigation.
3. WHEN the operator selects a Channel through the Bridge_Schematic, a Rack_Row, a Kpi_Tile or the keyboard, THE Router SHALL write `?ch=` with a replace navigation.
4. THE THERMOSENSE_App SHALL show the Channel reported by the Selection_Hook in the Bridge_Schematic highlight, the selected Rack_Row, the readout and the charts.
5. WHEN the selected Channel changes, THE Drive_Detail_Page SHALL re-bind the charts and readout to the new Channel without remounting the App_Shell.

### Requirement 24: Overview Page

**User Story:** As a mill operator, I want a landing page in the reference's style that carries live drive data, so that I see drive health at a glance.

#### Acceptance Criteria

1. THE Overview_Page SHALL display a hero with the Heat_Smear_Title "STAND-04", the subtitle "Mill Drive Thyristor Monitor", a vertical divider, the live Hottest_Tj in tabular figures, and a gold-ringed play button labelled "Watch the virtual sensor work".
2. WHEN the play button is activated, THE Overview_Page SHALL run a 20 s guided replay on the Mock_Telemetry_Source (bar entry, then fan failure, then recovery) with captions.
3. THE Overview_Page SHALL render the Heat_Blobs behind the Isometric_Console.
4. THE Overview_Page SHALL display the gold editorial callout "Junction Heat, Finally Visible" with a two-line body about estimating Tj from heatsink RTDs.
5. THE Overview_Page SHALL display a second panel with a CropPanel artwork card containing a live Heat_Disc and rotated micro-labels CH, Tj and MARGIN, the heading "Inspect Stand-04 in action", the prompt "Choose a drive scenario…", and a 2 × 3 Source_Grid of NORMAL, BAR ENTRY, FAN FAIL, CLOGGING, OVERLOAD and CLEAR, each with an icon.
6. WHEN a Source_Grid option is selected, THE Overview_Page SHALL call `setScenario` on the Telemetry_Source with the matching Scenario.
7. THE Overview_Page SHALL display six Rack_Rows for T1–T6, each with a tracked label, Tj at 0.1 °C, a signed bar for the difference from the channel mean, a Status_Chip and a chevron, with the selected Channel's row in the active style.
8. THE Overview_Page SHALL display a "Know Before It Trips" panel with the selected Channel's margin to the 125 °C trip, a time-to-warning estimate and a link to the Drive_Detail_Page.
9. IF every Channel Tj is at or above 125 °C, THEN THE Overview_Page SHALL display "TRIP" in the hero secondary block.

### Requirement 25: Drive Detail Page

**User Story:** As an engineer, I want a detailed view of one thyristor's thermal behaviour, so that I can investigate transients and cooling.

#### Acceptance Criteria

1. THE Drive_Detail_Page SHALL display the Bridge_Schematic across 7 columns next to a readout of the selected Channel's Tj at 96 px in tabular figures, with the unit at 40% size, a Status_Chip and a margin-to-trip bar.
2. THE Drive_Detail_Page SHALL stack the Transient_Chart (Tj and heatsink) above the Current_Chart with a shared crosshair.
3. WHEN the `?window=` param is 60 or 300, THE Drive_Detail_Page SHALL show that many seconds in the Transient_Chart and the Current_Chart, with 60 s as the default.
4. THE Transient_Chart SHALL display labelled WARN and TRIP bands and a labelled vertical bar-bite marker at each detected current-spike onset.
5. THE Current_Chart SHALL display a rated-current reference line.
6. THE Drive_Detail_Page SHALL display a Kpi_Tile strip for heatsink temperature, power loss, cooling residual and R_sa, each with a 60 s sparkline.
7. THE Drive_Detail_Page SHALL display a compact Foster_Ladder bound to the selected Channel.

### Requirement 26: Alarms and History Page

**User Story:** As a shift supervisor, I want to filter, inspect and acknowledge alarms, so that I can track and close out events.

#### Acceptance Criteria

1. THE Alarms_Page SHALL display the active alarm count and an "Acknowledge all visible" action in the header secondary block.
2. WHEN a severity, channel or kind Filter_Chip changes, THE Alarms_Page SHALL show only matching events in the Severity_Timeline and the event list and write the filter to the `?sev=` and `?ch=` params.
3. THE Severity_Timeline SHALL display 24 h of events in one lane per Channel with a time brush.
4. WHEN the operator brushes a time range, THE Alarms_Page SHALL restrict the event list to that range and write the range to the `?from=` and `?to=` params.
5. WHEN an event is expanded, THE Alarms_Page SHALL show the Event_Trace and event details in place and write the event id to the `?event=` param.
6. WHEN the operator activates Acknowledge on an event, THE Alarms_Page SHALL show an inline confirmation.
7. WHEN the operator confirms an acknowledgement, THE Alarms_Page SHALL call `acknowledge` on the History_Repository with the mock session user and display the acknowledging user and time.
8. THE Alarms_Page SHALL make the Acknowledge and confirmation controls operable by keyboard alone.
9. WHEN a new alarm arrives, THE Alarms_Page SHALL insert the alarm at the top of the list and announce the alarm through an `aria-live="polite"` region.
10. WHILE the event list holds 200 or more events, THE Alarms_Page SHALL virtualise the list and bin events in the Severity_Timeline.
11. THE THERMOSENSE_App SHALL store zero credentials in the browser.

### Requirement 27: Trends and Wear Page

**User Story:** As a maintenance planner, I want long-term peaks and wear projections, so that I can schedule thyristor replacement.

#### Acceptance Criteria

1. THE Trends_Page SHALL display six Life_Arc_Gauges, one per Channel, each with remaining life as a percentage in text.
2. THE Trends_Page SHALL display a Channel_Day_Heatmap with one row per Channel and one cell per day, coloured with heat tokens.
3. WHEN a Channel_Day_Heatmap cell receives hover or keyboard focus, THE Channel_Day_Heatmap SHALL display the cell's peak Tj and date.
4. WHEN the `?days=` param is 7 or 30, THE Trends_Page SHALL show that many days, with 30 as the default.
5. THE Wear_Projection SHALL display the consumed-life line, a p10–p90 projection band and an advisory line at 2× baseline wear rate.
6. IF a Channel's `wear_rate_vs_baseline` exceeds 2.0, THEN THE Trends_Page SHALL mark that Channel with an advisory icon and text.

### Requirement 28: Settings Page

**User Story:** As an engineer, I want to edit thresholds and display settings with validation, so that I cannot save an inconsistent configuration.

#### Acceptance Criteria

1. THE Settings_Page SHALL group settings into CropPanels for thresholds, display, data source and scenario defaults, using Fader, Field and Hardware_Toggle inputs.
2. THE Settings_Page SHALL show the data source as "Mock" and display the WebSocket URL Field disabled with a "backend phase" note.
3. THE Settings_Validator SHALL accept a settings draft if and only if, for every band, warning is less than critical and hysteresis is at least 0 and less than critical minus warning.
4. IF a settings draft fails validation, THEN THE Settings_Page SHALL display an inline error on each offending Field.
5. WHILE the settings draft differs from the saved settings, THE Settings_Page SHALL display a sticky bar with Save and Discard actions.
6. THE Settings_Page SHALL enable Save if and only if the draft is valid and differs from the saved settings.
7. WHEN the operator activates Save, THE Settings_Page SHALL persist the settings to `localStorage` and apply the new thresholds to the Status_Classifier and Alarm_Engine.
8. WHEN the operator activates Discard, THE Settings_Page SHALL restore the draft to the saved settings.
9. WHEN the operator navigates away with an unsaved draft, THE Router SHALL show a confirmation that offers to stay or discard.

### Requirement 29: About Page

**User Story:** As a new operator, I want an explanation of the virtual sensor, so that I understand how Tj is estimated.

#### Acceptance Criteria

1. THE About_Page SHALL display a banner using `about_hero_banner.webp` copied from `thermosense_dashboard/assets/` into `web/public/`.
2. THE About_Page SHALL display the annotated Foster_Ladder variant as an explainer.
3. THE About_Page SHALL display a 4-step "How the virtual sensor works" flow: Measure (RTD and current), Model (power loss), Estimate (Foster network), Validate (cooling residual).
4. THE About_Page SHALL display the Mill_Cutaway and the Airflow_Diagram.

### Requirement 30: Responsive Layout

**User Story:** As a mill operator, I want the app to work on desktop, tablet and phone, so that I can check the drive from any device.

#### Acceptance Criteria

1. THE THERMOSENSE_App SHALL lay out pages on a 12-column grid at 1440 px (24 px gutter, 72 px margin), an 8-column grid at 1024 px and a 4-column grid at 390 px.
2. WHILE the viewport is 1024 px wide, THE Overview_Page SHALL place the second panel below the hero.
3. WHILE the viewport is 390 px wide, THE Overview_Page SHALL scale the Isometric_Console to full width, arrange the Source_Grid as 3 × 2 and render Rack_Rows at full width.
4. WHILE the viewport is 390 px wide, THE THERMOSENSE_App SHALL size every interactive target to at least 44 × 44 px.
5. WHEN a Channel or event label exceeds the design length, THE THERMOSENSE_App SHALL wrap the label to a second line or reduce the label size with fluid `clamp()` sizing.
6. IF a label is truncated, THEN THE THERMOSENSE_App SHALL provide the full text in a tooltip and in the `aria-label`.
7. WHILE the browser zoom is 200%, THE THERMOSENSE_App SHALL keep all content and functions available.

### Requirement 31: Error Isolation and Empty States

**User Story:** As a mill operator, I want a failure in one panel to stay in that panel, so that the rest of the monitor keeps working.

#### Acceptance Criteria

1. IF a visual throws an exception during render, THEN THE Error_Boundary for that region SHALL display an Empty_State with a reload control while the App_Shell and other regions keep running.
2. IF a History_Repository request fails, THEN THE THERMOSENSE_App SHALL display an inline Empty_State with a Retry action in the affected panel while other panels keep working.
3. WHEN the operator activates Retry, THE THERMOSENSE_App SHALL re-issue the failed History_Repository request.
4. THE Empty_State SHALL provide no-data, disconnected, no-alarms and error variants, each with a contour illustration and a gold heading.

### Requirement 32: Entrance Choreography

**User Story:** As a user, I want each page to arrive with one short, ordered entrance, so that the page feels composed without slowing me down.

#### Acceptance Criteria

1. WHEN a page is first shown in a session, THE Motion_System SHALL play one entrance lasting less than 700 ms that reveals the hero lockup, then the main visual, then the secondary panels, with offsets of at most 60 ms.
2. WHEN a page is shown again in the same session, THE Motion_System SHALL render the page in its final state without an entrance.
3. THE Motion_System SHALL animate the children of an entering container together with the container.

### Requirement 33: Live Value Motion

**User Story:** As a mill operator, I want live values to change smoothly and consistently, so that motion tells me what changed without distracting me.

#### Acceptance Criteria

1. WHEN a live number changes, THE Animated_Number SHALL tween to the new value over 200 ms with the `--ease-out` curve at a constant text width.
2. WHEN a temperature changes, THE Motion_System SHALL interpolate Heat_Disc and Bridge_Schematic fills in heat-scale space over 300 ms.
3. WHILE a Channel Status is critical, THE Motion_System SHALL pulse that Channel's glow.
4. WHILE a Channel Status is normal or warning, THE Motion_System SHALL keep that Channel's glow static apart from temperature interpolation.
5. WHEN a chart receives its first data, THE Motion_System SHALL draw the line in once over 600 ms.
6. WHEN a chart receives a new sample after the first data, THE Motion_System SHALL translate the path left by one sample step.
7. WHEN a Display_Tick fires, THE Sync_Pulse SHALL flash once.
8. WHEN a new alarm row appears, THE Motion_System SHALL play one 240 ms slide-and-highlight on that row.
9. WHEN the same alarm repeats within 5 s, THE Alarms_Page SHALL coalesce the repeats into one row with one arrival animation.
10. WHEN an interactive element is pressed, THE Motion_System SHALL scale the element to 0.97 over 120 ms.
11. WHERE the device supports hover (`@media (hover: hover)`), THE Motion_System SHALL apply hover effects.

### Requirement 34: Motion Constraints and Audit

**User Story:** As a developer, I want motion limited to cheap properties and to motion that carries meaning, so that animation stays smooth and purposeful.

#### Acceptance Criteria

1. THE Motion_System SHALL animate only `transform`, `opacity`, `filter` on small elements, and SVG `fill` and `stop-color`.
2. THE Motion_System SHALL morph Heat_Blobs paths at 1 Hz with a fixed path topology.
3. WHEN Phase 4 completes, THE Delivery_Process SHALL record an audit in `web/docs/` that lists each remaining animation with the state, arrival or causality it communicates, and SHALL remove every animation that communicates none of these.

### Requirement 35: Reduced Motion

**User Story:** As a user who is sensitive to motion, I want the app to respect my reduced-motion setting, so that I can use it comfortably.

#### Acceptance Criteria

1. WHILE `prefers-reduced-motion: reduce` is set, THE Motion_System SHALL disable page entrances, chart draw-ins, Foster_Ladder dash flow and Airflow_Diagram particles.
2. WHILE `prefers-reduced-motion: reduce` is set, THE Motion_System SHALL update live values immediately without tweening.
3. WHILE `prefers-reduced-motion: reduce` is set, THE Top_Nav SHALL replace the Sync_Pulse with a static "LIVE" label.
4. WHILE `prefers-reduced-motion: reduce` is set, THE THERMOSENSE_App SHALL render every Status change.

### Requirement 36: Stress Cases

**User Story:** As a reviewer, I want extreme data cases selectable by URL, so that I can verify the layout under stress.

#### Acceptance Criteria

1. WHEN the `?mock=` param is `stress-trip`, `stress-ambient`, `stress-nan`, `stress-200-alarms` or `stress-long-labels`, THE Mock_Telemetry_Source and Mock_History_Repository SHALL serve the matching Stress_Fixture.
2. WHILE the `stress-trip` Stress_Fixture is active, THE THERMOSENSE_App SHALL show critical Status_Chips on every Channel, "TRIP" in the Overview hero and saturated Heat_Blobs, with element positions equal to the normal-data layout.
3. WHILE the `stress-ambient` Stress_Fixture is active, THE THERMOSENSE_App SHALL render the Heat_Disc at heat stops 0 to 1 and six Heat_Blobs bands.
4. WHILE the `stress-nan` Stress_Fixture is active, THE THERMOSENSE_App SHALL render the sensor fault presentation for every affected Channel.
5. WHILE the `stress-200-alarms` Stress_Fixture is active, THE Alarms_Page SHALL render a virtualised event list and a binned Severity_Timeline.
6. WHILE the `stress-long-labels` Stress_Fixture is active, THE THERMOSENSE_App SHALL display every label in full through wrapping or fluid sizing.

### Requirement 37: Viewport and Visual Regression

**User Story:** As a reviewer, I want screenshots of every route at three widths and at high zoom, so that regressions are visible between phases.

#### Acceptance Criteria

1. THE QA_Suite SHALL capture Playwright screenshots of every route and `/kit` at 1440 px, 1024 px and 390 px widths and at 200% zoom, using a frozen clock and a fixed seed.
2. WHEN a phase completes, THE Delivery_Process SHALL commit the screenshot baselines for that phase.
3. WHEN Phase 5 completes, THE Delivery_Process SHALL place an Overview_Page screenshot side by side with the reference image and write a gap list in `web/docs/`.

### Requirement 38: Keyboard and Focus

**User Story:** As a keyboard user, I want to reach and operate every control with a visible focus indicator, so that I can use the app without a mouse.

#### Acceptance Criteria

1. THE THERMOSENSE_App SHALL make every interactive element reachable with Tab in visual order and operable with Enter or Space.
2. THE Source_Grid and the Fader SHALL respond to arrow keys.
3. WHEN an element receives keyboard focus, THE THERMOSENSE_App SHALL display the `--focus-ring` on that element.
4. THE QA_Suite SHALL run a keyboard-only traversal on every route that asserts a visible focus indicator at each focus stop.

### Requirement 39: WCAG AA Accessibility

**User Story:** As a user with a disability, I want the app to meet WCAG 2.1 AA, so that I can use it with assistive technology.

#### Acceptance Criteria

1. THE QA_Suite SHALL run `@axe-core/playwright` on every route and report zero WCAG 2.1 AA violations.
2. THE THERMOSENSE_App SHALL render body text with a contrast ratio of at least 4.5:1, and large text and UI component boundaries with at least 3:1, against their backgrounds.
3. THE THERMOSENSE_App SHALL give every interactive element an accessible name.

### Requirement 40: Soak and Performance

**User Story:** As a mill operator, I want the monitor to run for a full shift without slowing down, so that it stays reliable on the control-room screen.

#### Acceptance Criteria

1. WHEN the QA_Suite runs a 5-minute soak at 10 Hz, THE THERMOSENSE_App SHALL show heap growth of at most 10% between the start and end samples.
2. WHEN the QA_Suite runs the 5-minute soak, THE THERMOSENSE_App SHALL record zero main-thread tasks longer than 50 ms after the page entrance.
3. WHEN a frame arrives, THE THERMOSENSE_App SHALL complete the store update, MotionValue writes and SVG attribute changes in less than 4 ms of main-thread time on a mid-range laptop at 4× CPU throttle.
4. IF profiling shows the visx Transient_Chart or Current_Chart above 4 ms per frame at 10 Hz, THEN THE THERMOSENSE_App SHALL render those charts with uPlot behind the same props.
5. THE THERMOSENSE_App SHALL build chart paths from the visible window only, with at most 600 points per path.
6. THE Heat_Blobs SHALL compute each 1 Hz field update in less than 2 ms.
7. THE THERMOSENSE_App SHALL apply turbulence and large blur filters to static layers only.
8. THE THERMOSENSE_App SHALL keep the initial route bundle below 250 KB gzipped.

### Requirement 41: Lint, Type Checks and Tests

**User Story:** As a developer, I want automated checks on every change, so that defects are caught before review.

#### Acceptance Criteria

1. THE QA_Suite SHALL pass ESLint and TypeScript strict type checking with zero errors.
2. THE QA_Suite SHALL reach at least 90% line coverage on `web/src/domain` and `web/src/data`.
3. THE QA_Suite SHALL implement each design correctness property as one fast-check property test in `web/tests/property/`, running 200 iterations by default and 2000 in the nightly CI run, and logging the seed.
4. THE QA_Suite SHALL tag each property test with "Feature: thermosense-frontend-redesign, Property N: <property title>".
5. THE QA_Suite SHALL include Playwright end-to-end tests for navigation without full reload, channel selection sync across views, the acknowledge flow, settings validation and the unsaved-changes bar.

### Requirement 42: Phased Delivery

**User Story:** As the product owner, I want the work delivered in five reviewed phases, so that I can follow progress and catch problems early.

#### Acceptance Criteria

1. THE Delivery_Process SHALL deliver the work in five phases in order: design system and kit, signature visuals, pages, motion, QA.
2. WHEN a phase completes, THE Delivery_Process SHALL create a git commit, capture Playwright screenshots and present a phase summary for review.
