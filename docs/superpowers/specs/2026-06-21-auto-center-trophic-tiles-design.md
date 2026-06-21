# Auto-centering tiles within trophic layers

**Date:** 2026-06-21
**Status:** Approved
**Version target:** 3.0.1 → 3.0.2 (patch)

## Goal

On each habitat workspace, the species tiles in a trophic layer should center
themselves as a group whenever a tile is dragged into or out of that layer. A
centered, pyramid-style stack keeps the SVG energy-flow arrows short and mostly
vertical, so they are easier to see and follow while the student drags links
between species across levels.

## Current behavior

- Each habitat has four `.trophic-shelf` rows (levels 1–4, Producers → Apex),
  each containing one `.drop-zone` (`index.html` ~line 111).
- The drop-zone is a flexbox: `display: flex; flex-wrap: wrap; gap: 0.75rem;
  align-items: center` with **no `justify-content`**, so tiles pack to the left.
- Dropping a tile simply `appendChild`s it into the drop-zone
  (`shelf.ondrop`, ~line 832). There is no per-tile positioning — layout is pure
  flexbox flow.
- Arrows are SVG quadratic curves drawn center-to-center between tiles via
  `getBoundingClientRect()`, rebuilt on every placement by `drawArrows()`
  (~line 1029).

Because layers are left-aligned, arrows fan out diagonally and cross,
especially in the typical pyramid where lower layers hold more species.

## Design

### 1. Centering (core change)

Add `justify-content: center` to the `.drop-zone` rule. Since drop-zones are
already flexbox, every layer's tiles re-flow to horizontally centered
automatically each time a tile is added or removed. No per-tile positioning, no
state changes, no change to the existing append-into-drop-zone flow.

### 2. Smooth re-center slide (FLIP)

When tiles shift to re-center, existing tiles glide to their new positions
(~180–200ms) rather than snapping. Implemented with the standard FLIP technique
in one isolated method, `flipReflow(mutate)` on the `app` object:

1. Record `getBoundingClientRect()` of every tile currently in a drop-zone
   (`.drop-zone .sidebar-item`) into a `Map` (First).
2. Run `mutate()` — the caller's DOM move (the `appendChild`).
3. For each still-placed tile, measure its new rect (Last); compute
   `dx = first.left - last.left`, `dy = first.top - last.top`.
4. For tiles that actually moved, set `transition: none` and
   `transform: translate(dx, dy)` so they *look* unmoved (Invert).
5. On the next animation frame, restore `transition`/`transform` to `''` so they
   animate to their natural centered positions (Play). The empty `transition`
   reverts to the `transition: all 0.2s` already declared on `.sidebar-item`
   (~line 116), keeping timing consistent with the rest of the UI.
6. During the glide, call `drawArrows()` on each animation frame for ~260ms so
   the arrows track the moving tiles instead of jumping to the final layout.

Behavioral notes:
- A tile arriving **from the pool** is not in the First map, so it does not
  slide — it appears at its centered position (current pop-in behavior) while
  the existing tiles slide to accommodate it.
- A tile **removed to the pool** is no longer a `.drop-zone .sidebar-item` after
  the move, so it does not animate; the remaining layer tiles slide to re-center.
- A tile **moved between shelves** is in the First map, so it slides from its old
  spot to the new layer — a coherent, intentional motion.
- If no tile moved (e.g. first tile into an empty layer), `flipReflow` simply
  calls `drawArrows()` once and returns.

### 3. Wiring (two call sites)

- `shelf.ondrop` (~line 832): wrap the `appendChild` in `flipReflow(...)`, then
  call `updatePlacement(...)` as today.
- `pool.ondrop` (~line 844): wrap the `appendChild` in `flipReflow(...)` so
  removing a tile re-centers the remaining layer.

`updatePlacement()` and `createLink()` keep their existing single `drawArrows()`
call; it is harmless alongside the FLIP frame loop. Initial habitat render
(`startHabitat`) is left untouched — saved placements load instantly with no
animation.

### 4. Version bump

Patch bump `3.0.1 → 3.0.2`. Update every place the version string appears
(UI labels, certificate/export metadata, etc.).

## Components / units

- `flipReflow(mutate)` — single-purpose method: animate the re-center reflow
  caused by a DOM mutation, keeping arrows synced. Inputs: a `mutate` callback
  that performs the DOM move. No return value. Depends on `drawArrows()`,
  `document.querySelectorAll('.drop-zone .sidebar-item')`, and
  `requestAnimationFrame`/`performance.now`. Testable by reasoning about its
  First/Last/Invert/Play steps; verified visually in-browser.
- `.drop-zone` CSS rule — one declaration added.
- Two one-line wiring changes at the drop handlers.

## Error handling / edge cases

- Rapid successive drops mid-animation: a new `flipReflow` re-captures current
  (possibly mid-transform) rects and self-corrects on the next settle. Acceptable
  for this single-user interaction.
- Floating-point jitter: only animate tiles whose `|dx|` or `|dy|` exceeds ~0.5px.
- Cleanup: `transform`/`transition` inline styles are reset to `''` so they do
  not interfere with subsequent layouts or the `:active` drag scale.

## Testing

The project's tests (`test/*.test.js`, run via `node`) cover pure extracted
helpers (certificate/PNG plumbing, species icons); there is no DOM/layout
harness and `getBoundingClientRect` is not meaningful under Node. Consistent with
how DOM behavior is already handled here, this change is verified by driving the
real app in a browser:

1. Open a habitat; drag several species into the same layer → tiles stay
   centered as a group and re-center as more are added.
2. Drag a tile out to the pool → remaining layer tiles slide back to centered.
3. Switch to Links mode and draw arrows → arrows render short/vertical and track
   tiles during the re-center slide.
4. Confirm existing flows (check journal, completion ribbon, certificate
   download) are unaffected.

## Scope guard

- The sidebar **pool** layout is unchanged; only placed-in-layer tiles center.
- No changes to save format, data model, or arrow-correctness logic.
- No unrelated refactoring.
