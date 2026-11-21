/** Routes captured by `npm run screenshots`. Later phases append their routes here. */
export const CAPTURE_ROUTES: readonly string[] = ['/kit']

/** Turns a route path into a file-name slug: `/kit` → `kit`, `/drives/a` → `drives-a`, `/` → `root`. */
export function routeSlug(route: string): string {
  const slug = route
    .split('?')[0]
    ?.replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
  return slug === undefined || slug === '' ? 'root' : slug
}
