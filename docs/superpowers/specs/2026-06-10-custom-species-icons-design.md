# Design: Custom Hand-Drawn Species Icons (Style A)

**Date:** 2026-06-10
**Project:** Global Food Web Expedition (`index.html`)
**Status:** Mock-up approved — awaiting implementation plan
**Mock-up:** `mockups/icons.js` (all 73 icons), `mockups/viewer.html` (browsable grid), `mockups/custom-contact-sheet-all73.png`

## Problem

The current species icons (shipped 2026-06-10, PR #14) are single-color silhouettes
from game-icons.net. The library's coverage forced compromises: claw marks stand in
for the pine marten, a sperm whale for the manatee, a tiger for the leopard, and the
four mustelids share two glyphs distinguished only by color. Icons identify the
*category* of organism, not the species.

## Goal

Replace all 73 registry icons with original, flat multi-color artwork in which each
species is identifiable by its real field marks — the black-footed ferret's eye mask,
the red-tailed hawk's red tail fan, the adder's zigzag — at the app's 40 px render
size.

## Decisions (confirmed with the user)

1. **Style A — flat multi-color** ("adorable", approved twice: 12-icon pilot, then
   the full 73-icon contact sheet). 3–6 solid naturalistic colors per icon, no
   gradients, no full-figure outlines, organisms fill ~70–85 % of the canvas.
2. **No pure white (`#fff`) anywhere in the artwork** — icons sit on white cards
   (`.sidebar-item`, field guide). Light areas use warm off-whites (`#f6ede0`,
   `#e8e3d8`, `#e3e7ea`).
3. **Original artwork** — created in-session, no third-party icon library. The
   CC BY 3.0 attribution for game-icons.net becomes obsolete and is removed.
4. The artwork itself is **done** (`mockups/icons.js`); this spec covers wiring it
   into the app.

## Architecture

The app keeps its single-file, offline-friendly design. The existing icon plumbing
from PR #14 is reused; only the payload and one rendering detail change.

### Icon source of truth

`mockups/icons.js` is moved (not copied) to `tools/species-icons-art.js` — a
CommonJS module mapping each of the 73 species slugs to its inner SVG markup (drawn
on a `0 0 100 100` viewBox with embedded `fill` colors). This file becomes the
hand-edited artwork master; `mockups/viewer.html` is updated to load
`../tools/species-icons-art.js` so the browsable grid keeps working, and the
contact-sheet PNGs stay in `mockups/` as the approved visual baseline.

### Registry and build script

`tools/build-species-icons.js` is rewritten to read `species-icons-art.js` instead
of a game-icons checkout — no clone, no slug resolution, no fill-stripping. It
regenerates the marker-delimited block in `index.html` as before:

```js
const SPECIES_ICONS = {
  "red-fox": { "svg": "<path d=\"...\" fill=\"#d2622a\"/>..." },
  ...
};
```

Entry shape changes from `{ svg, color, credit }` to `{ svg }`: colors are embedded
per-element in the markup, and `credit` is dropped with the third-party library.
The build still fails loudly if any of the 75 organism `icon:` slugs in
`regionalData` lacks an art entry. `tools/species-icon-map.json` (slug → game-icons
name + color) is deleted; `tools/.gitignore` for the clone is deleted.

### Render helper

`renderSpeciesIcon(key, name, sizeClass)` changes in two ways and keeps everything
else (explicit `width="40" height="40"`, size classes, `role="img"`,
`aria-label`, ❓ fallback):

- `viewBox="0 0 512 512"` → `viewBox="0 0 100 100"`
- the `fill="<color>"` attribute on the `<svg>` is removed — fills live in the
  markup.

Both render sites (species pool, field guide) are untouched.

### Attribution

- Remove the field-guide footer line linking game-icons.net / CC BY 3.0.
- Replace the HTML source comment crediting game-icons authors with:
  `<!-- Species icons are original artwork created for this project. -->`

### Tests

`test/species-icons.test.js` updates:
- helper assertions: expect `viewBox="0 0 100 100"`; replace the "applies the
  color" assertion with "does NOT emit a fill attribute on the svg element" plus
  "icon markup contains embedded fill colors".
- registry well-formedness: entry has non-empty `svg`; no `color` field expected.
- distinctness: signature becomes the svg markup alone (every icon is unique art,
  so the groups and the global check both assert on `svg`).
- new assertion: no `#fff`/`#ffffff` fill appears anywhere in the registry
  (decision 2, enforced).

`test/build-extract-inner.test.js` is deleted along with `extractInner` (no
third-party SVG to sanitize). A small replacement unit test asserts the build fails
when an organism slug is missing from the art module.

## Out of scope

- Changing the food-web data (species, notes, predators) or habitat photos.
- New art beyond the approved 73 icons (touch-ups during QA are fine).
- Trophic-level tinting, animations, hover effects.

## Testing / verification

1. Full suite: `node test/species-icons.test.js && node test/png-metadata.test.js
   && node test/integration-glue.test.js` — green.
2. Rebuild idempotency: `node tools/build-species-icons.js` twice → no diff.
3. Browser QA (existing `/tmp/icon-qa` Playwright harness or manual): all 15
   habitats show 5 multi-color icons in pool + field guide, zero ❓ fallbacks,
   zero console errors.
4. Certificate regression: Download Certificate still produces a valid PNG with
   embedded progress metadata (icons don't appear in the certificate).
5. File size: registry payload is ~58 KB of markup (comparable to the current
   single-color registry); `index.html` must stay in the same size class (~250 KB
   budget).

## Risks

- **Multi-color SVG in html2canvas:** lower risk than the shipped version (plain
  paths with static fills, no `<defs>`, no gradients); certificate doesn't render
  species icons anyway.
- **Art regressions during wiring:** mitigated by the contact-sheet PNGs in
  `mockups/` as the approved visual baseline.
- **Tailwind-independence:** unchanged — explicit pixel dimensions already shipped.
