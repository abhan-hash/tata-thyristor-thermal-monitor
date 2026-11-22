/** Kit sections captured on their own, as `/kit?section=<id>` (Phase 2 signature visuals). */
const VISUAL_SECTIONS = [
  'heat-blobs',
  'isometric-console',
  'bridge-schematic',
  'foster-ladder',
  'mill-cutaway',
  'airflow-diagram',
] as const

/** Routes captured by `npm run screenshots`. Later phases append their routes here. */
export const CAPTURE_ROUTES: readonly string[] = ['/kit', ...VISUAL_SECTIONS.map((id) => `/kit?section=${id}`)]

/** The `?section=` value of a route, if any. */
export function routeSection(route: string): string | undefined {
  const query = route.split('?')[1]
  if (query === undefined) return undefined
  const value = new URLSearchParams(query).get('section')
  return value === null || value === '' ? undefined : value
}

/**
 * Turns a route path into a file-name slug: `/kit` → `kit`, `/drives/a` → `drives-a`, `/` → `root`,
 * `/kit?section=heat-blobs` → `kit-heat-blobs`.
 */
export function routeSlug(route: string): string {
  const section = routeSection(route)
  const slug = [route.split('?')[0], section]
    .filter((part): part is string => part !== undefined)
    .join('-')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug === '' ? 'root' : slug
}
