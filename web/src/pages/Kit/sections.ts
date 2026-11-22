/**
 * Kit_Gallery table of contents (Requirements 7.2, 7.3). One entry per
 * gallery section, grouped into chapters. `id` is the `?section=` value and
 * the suffix of the section's DOM id; `name` is the component name from
 * Requirement 6.1 (or a foundations topic).
 */
export interface KitSectionMeta {
  readonly id: string
  readonly name: string
  /** One line under the section heading. */
  readonly summary: string
}

export interface KitChapterMeta {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly sections: readonly KitSectionMeta[]
}

export const KIT_CHAPTERS = [
  {
    id: 'foundations',
    title: 'Foundations',
    summary: 'Semantic colour tokens, the heat ramp, the Archivo type scale and the status glyphs.',
    sections: [
      { id: 'tokens', name: 'Tokens', summary: 'Semantic swatches. Components read these, never the primitive ink and gold values.' },
      { id: 'type-scale', name: 'Type scale', summary: 'One variable family: display, tracked label and body roles on an 11–96 px scale.' },
      { id: 'icons', name: 'Icons', summary: 'A distinct shape per status, so status never depends on colour.' },
    ],
  },
  {
    id: 'layout',
    title: 'Layout and shell',
    summary: 'The persistent frame, page headers and the bracketed panels every page is built from.',
    sections: [
      { id: 'app-shell', name: 'AppShell', summary: 'Contour texture, sticky nav and banner, then the routed page. This page runs inside it.' },
      { id: 'top-nav', name: 'TopNav', summary: 'Wordmark, tracked-caps links, MOCK badge, alarm bell, clock and sync pulse.' },
      { id: 'hero-lockup', name: 'HeroLockup', summary: 'Heat-smear title, subtitle, divider and a secondary block, at two scales.' },
      { id: 'crop-panel', name: 'CropPanel', summary: 'Printer’s crop marks on the corners and micro-labels set along the edges.' },
      { id: 'contour-background', name: 'ContourBackground', summary: 'Static topographic texture behind every page, at 6% opacity.' },
    ],
  },
  {
    id: 'heat',
    title: 'Heat visuals',
    summary: 'The signature heat language: a smeared wordmark, the glowing disc and their shared SVG definitions.',
    sections: [
      { id: 'heat-smear-title', name: 'HeatSmearTitle', summary: 'Heat-gradient wordmark with three trailing copies through an x-only blur.' },
      { id: 'heat-disc', name: 'HeatDisc', summary: 'Rings, core and centre marker follow Tj through the heat scale.' },
      { id: 'heat-defs', name: 'HeatDefs', summary: 'Gradients, blur and grain filters and the fault hatch, with per-instance ids.' },
    ],
  },
  {
    id: 'visuals',
    title: 'Signature visuals',
    summary: 'The drive drawn as heat, hardware and circuit. Each in fixed states, then bound to the live store.',
    sections: [
      { id: 'heat-blobs', name: 'HeatBlobs', summary: 'Stepped isotherms of the six channel Tj values, hottest innermost.' },
      { id: 'isometric-console', name: 'IsometricConsole', summary: 'Matte slab with the hottest Tj on the disc, armature and ambient knobs and an airflow fader.' },
      { id: 'bridge-schematic', name: 'BridgeSchematic', summary: 'Six-pulse bridge with heat-filled devices; full and cabinet-door thumbnail.' },
      { id: 'foster-ladder', name: 'FosterLadder', summary: 'Junction → case → heatsink → air RC ladder with τ chips; compact and annotated.' },
      { id: 'mill-cutaway', name: 'MillCutaway', summary: 'Stand cutaway whose strip pulses on each bar-entry current spike.' },
      { id: 'airflow-diagram', name: 'AirflowDiagram', summary: 'Cabinet air path; particles stop and the exchanger changes fill when the fan fails.' },
    ],
  },
  {
    id: 'readouts',
    title: 'Status and readouts',
    summary: 'How a value, its trend and its status are read at a glance.',
    sections: [
      { id: 'status-chip', name: 'StatusChip', summary: 'Icon plus text for every status, in two sizes.' },
      { id: 'stale-chip', name: 'StaleChip', summary: 'Marks a readout whose source has stopped updating.' },
      { id: 'kpi-tile', name: 'KpiTile', summary: 'Label, fixed-width tabular value, unit, sparkline and window delta.' },
      { id: 'sparkline', name: 'Sparkline', summary: '60 s mini trend without axes, with optional bands and gaps.' },
      { id: 'chart-frame', name: 'ChartFrame', summary: 'Axes, grid, crosshair and warning/trip bands labelled in text.' },
    ],
  },
  {
    id: 'selection',
    title: 'Selection',
    summary: 'Rows, tiles and chips that pick a channel, a scenario or a filter.',
    sections: [
      { id: 'rack-row', name: 'RackRow', summary: 'Native button or link with tracked label, inline value, status and chevron.' },
      { id: 'source-button', name: 'SourceButton', summary: 'Gold-outlined icon tile; solid gold when checked.' },
      { id: 'source-grid', name: 'SourceGrid', summary: 'Radio group with roving tabindex. Arrow keys move and select.' },
      { id: 'filter-chip', name: 'FilterChip', summary: 'Toggle with count. Long labels wrap instead of truncating.' },
    ],
  },
  {
    id: 'controls',
    title: 'Controls',
    summary: 'Hardware-styled inputs built on native elements, with inline validation.',
    sections: [
      { id: 'fader', name: 'Fader', summary: 'Native range input in a recessed well with a machined cap and readout.' },
      { id: 'hardware-toggle', name: 'HardwareToggle', summary: 'Switch with a sliding knob and an LED paired with ON/OFF text.' },
      { id: 'field', name: 'Field', summary: 'Text input with hint, suffix and an error linked by aria-describedby.' },
      { id: 'number-field', name: 'NumberField', summary: 'Numeric input with tabular figures and a unit.' },
      { id: 'select', name: 'Select', summary: 'Native select with a drawn chevron.' },
    ],
  },
  {
    id: 'feedback',
    title: 'Feedback',
    summary: 'What a region says when it has nothing to show or its data has gone quiet.',
    sections: [
      { id: 'empty-state', name: 'EmptyState', summary: 'Contour illustration, gold heading, one line and an optional action.' },
      { id: 'connection-banner', name: 'ConnectionBanner', summary: 'Strip under the nav while data is stale or reconnecting.' },
    ],
  },
] as const satisfies readonly KitChapterMeta[]

export type KitSectionId = (typeof KIT_CHAPTERS)[number]['sections'][number]['id']

/** Every section in page order. */
export const KIT_SECTIONS: readonly KitSectionMeta[] = (KIT_CHAPTERS as readonly KitChapterMeta[]).flatMap(
  (c) => c.sections,
)

/** Component name with a space at each camelCase join, e.g. `EmptyState` → `Empty State`. */
export function spacedName(name: string): string {
  return name.replace(/(?<=[a-z0-9])(?=[A-Z])/g, ' ')
}

/** DOM id of a section, e.g. `rack-row` → `kit-rack-row`. */
export function sectionDomId(id: string): string {
  return `kit-${id}`
}

/**
 * Resolves a `?section=` value to a section. Accepts the section id
 * (`rack-row`) or the component name in any case (`RackRow`, `rackrow`).
 */
export function resolveSection(param: string | null): KitSectionMeta | undefined {
  if (param === null) return undefined
  const wanted = param.trim().toLowerCase()
  if (wanted === '') return undefined
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  return (
    KIT_SECTIONS.find((s) => s.id === wanted) ??
    KIT_SECTIONS.find((s) => squash(s.name) === squash(wanted))
  )
}
