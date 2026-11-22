# Phase 5 summary: accessibility pass, contrast checks, reference comparison and gap list

This was a reduced Phase 5, as agreed. Soak, stress fixtures, frame-budget benchmarks, bundle and perf profiling, security checks and full visual regression were skipped. [`../comparison/GAPS.md`](../comparison/GAPS.md) lists them.

## What was built

- **axe spec (33.2).** `tests/e2e/a11y.spec.ts` runs `@axe-core/playwright` with the WCAG 2.1 A/AA tags on `/`, `/drive`, `/alarms`, `/trends`, `/settings`, `/about` and `/kit` at 1440 px, and expects zero violations. On failure it prints the node HTML with foreground, background and ratio. It also runs a short keyboard check: 12 Tab stops on `/` and `/drive`, each with a visible outline or box-shadow. The spec uses the plain Playwright `test` with `?seed=1337`, because axe relies on timers that never fire under the shared fixture's paused clock.
- **Contrast test (33.3).** `tests/unit/contrast.test.ts` reads the primitive, semantic and component token files, resolves `var()` and `color-mix(in srgb, …)`, and checks 31 pairs. Body text (primary, secondary and muted text on every surface, critical text, accent, field suffix and hint) must reach 4.5:1. Large text and UI boundaries (focus ring, source-button border, field and filter-chip borders, critical status) must reach 3:1.
- **Reference comparison (36.1).** [`../comparison/overview-vs-reference.png`](../comparison/overview-vs-reference.png) puts the reference next to `/` at 1440 × 900. The Overview capture on its own is `overview-1440.png`. A temporary Playwright spec built the image and was then deleted. The reference file was read but not committed.

## Accessibility fixes

| Issue (axe or contrast test) | Fix |
| --- | --- |
| `--text-muted` (ink-400 `#6E6A63`) measured 3.05–3.68:1 on every surface, on all routes | New primitive `--ink-350 #8E8981`. `--text-muted` now maps to it (5.05:1 on raised, 5.34:1 on panel). |
| Field and filter-chip borders (`--line-strong`) measured about 1.6:1 against their backgrounds | New semantic `--line-control` (ink-400, 3.45:1 on panel, 3.68:1 on sunken), used by `--field-border` and `--filter-chip-border`. |
| `label-content-name-mismatch` on bridge device buttons: the visible text "G2T2 82.6 °CNORMAL" did not match the name "T2, 82.6 °C, NORMAL" | The gate label `G{n}` moved outside the button group. Whitespace between the badge's SVG text runs keeps the words separate. |
| Dimmed text in the disabled Field and Fader specimens on `/kit` | The wrappers set `aria-disabled` when disabled, so axe treats them as inactive components (WCAG 1.4.3 exemption). |
| Ghost step numerals on `/about` (aria-hidden, 1.1:1) | Marked `data-a11y-decorative` and excluded from axe as pure decoration. |

The design doc's primitive and semantic tables now list `--ink-350` and `--line-control`. `tests/unit/tokens.test.ts` asserts the new mappings.

## Checkpoint results

| Check | Result |
| --- | --- |
| `npm run lint` (ESLint + token check + motion check) | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 77 files, 732 tests pass |
| `npm run test:property` | 15 files, 29 tests pass |
| `npm run test:e2e` (w1440, includes the a11y spec) | 15 tests pass |
| `PHASE=5 npm run screenshots` | 39 PNGs in `web/docs/screenshots/phase-5/` |

Coverage was not re-run in this phase.

## Known limits

[`../comparison/GAPS.md`](../comparison/GAPS.md) covers these. In short: the skipped Phase 5 QA items, navigation that drops `?ch=`, mock data only, no backend, hero and rack numbers without fixed digit widths, and blob paths that jump when a heat band gains or loses an outline.
