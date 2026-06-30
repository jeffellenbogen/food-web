# Guided Check-Journal Feedback + Larger Field Guide Text

**Date:** 2026-06-24
**Status:** Designed & approved; pending implementation
**Builds on:** v3.4.2

Two changes that make the game a better learning tool for young players (grades 3–6,
tested with a 6-year-old):

1. **Guided Check Journal feedback** — replace the vague "wrong layer / an arrow is
   missing" messages with conceptual nudges that teach *why* something is off and point
   the learner to the Field Guide, without ever giving the answer.
2. **Larger Field Guide text** — bump the Field Guide text ~30% (fixed, not adjustable).

---

## 1. Guided Check Journal feedback

### Problem
Today `checkJournal()` produces messages that don't help a learner reason:
- Wrong layer → *"Move the Coyote to a different layer."* (which way? why?)
- Missing arrow → *"Draw the energy arrow leaving the Coyote."* (to what?)
- Extra arrows → *"Remove 2 energy arrows that don't belong."* (which ones?)

### Decisions (from brainstorming)
- **Hint style:** *conceptual nudge only* — name the species + the kind of mistake + a
  thinking question. Never state the target shelf or the correct link.
- **Nudge source:** *tie to the Field Guide* — each nudge points the learner to that
  species' notes, reusing the existing (no-spoiler, category-level) diet/predator content.
- **Visual cue:** when a hint names a species, softly **pulse/glow that species' tile** so a
  young learner can find it.

### Placement nudges (species on the wrong layer / not placed)
The conceptual *frame* is chosen from the species' true trophic level (`o.level` — ground
truth), so edge cases stay correct. Phrased as guiding questions; never names the shelf.

- **Not placed:** 🌱 "The **Blue Grama Grass** isn't on a layer yet — drag it where it belongs."
- **Producer (level 1):** 🤔 "The **Blue Grama Grass** is on the wrong layer. It makes its own
  food from sunlight — and that's where every food chain *begins*. Where should it go?"
- **Primary consumer (level 2):** 🤔 "The **Prairie Dog** is on the wrong layer. It eats
  producers — the plants and algae. Which layer feeds directly on the food-makers? Peek at its
  Field Guide notes."
- **Secondary consumer (level 3):** 🤔 "The **Coyote** is on the wrong layer. It hunts other
  animals that eat plants. Open its Field Guide notes — what it eats and what hunts it will
  point you to the right shelf."
- **Top predator (level === habitat max):** 🤔 "The **Golden Eagle** is on the wrong layer.
  It's a top hunter at the very end of the chain. Where does that belong?"

Framing on `o.level` (not on predator counts) keeps oddballs correct — e.g. the **African
Manatee** (level 2, but nothing eats it) gets the primary-consumer frame ("it eats producers"),
which is true, instead of being mis-framed as a top predator.

### Energy-arrow nudges (only after every species is on the right layer — gating unchanged)
Organized **by the eater**, to teach the core misconception that *animals don't eat
everything on the layer below them*. The hint names the **eater** (and glows its tile) and
sends the learner to that animal's notes; it never names the specific food to add/remove.

Order of checks:
1. **Backward arrow** (a drawn arrow `S→T` that is invalid while `T→S` is valid) — detected
   first so it isn't also reported as a "wrong food":
   🔄 "The arrow from the **Golden Eagle** points the wrong way — energy flows *toward* the
   animal that eats. Who's the meal here?"
2. **Too many / wrong food** (an eater E has an incoming arrow from a food it doesn't eat):
   🔗 "Take another look at what the **Shore Crab** eats — animals don't eat *every* food on the
   layer below them. One arrow connects it to a food it doesn't actually eat. Check its notes,
   then remove that link."
3. **Too few** (E is missing an arrow from a food it really eats):
   🔗 "The **Golden Eagle** eats more than you've shown so far. Check its Field Guide — there's
   another food it really eats that still needs an arrow."

Per eater: `actualFoods(E)` = organisms whose `predators` include E; `drawnFoods(E)` = sources
of arrows whose target is E. Extra = drawn − actual (excluding arrows already flagged as
backward); missing = actual − drawn.

### Visual highlight
- Tiles named by a hint get a soft pulsing glow: **amber** for a layer hint, **blue** for an
  arrow hint (matching the existing feedback-panel colors). Unplaced species glow in the pool.
- The glow is applied to the tiles (behind the modal) and **persists after the feedback modal
  is closed**, so the learner closes the panel and sees exactly which tiles to rethink.
- Cleared at the start of the next Check Journal run, and when a tile is moved (so a corrected
  tile stops glowing).

### Volume control
- Show at most **3 nudges at once** ("Let's fix these first") so a young learner isn't faced
  with a wall of text; the next Check surfaces the rest. Count the remaining and hint that more
  remain (e.g. a small "…and more to check after these" line) when truncated.
- The celebratory success stamp on a fully-correct habitat is unchanged.

### Implementation surface
Contained to `checkJournal()` (rewrite the issue-collection + message generation), a small
`highlightTiles()` helper, the drag/placement handlers (clear glow on move), and CSS for the
glow. **No data or content authoring** — specifics come from the existing Field Guide.

---

## 2. Larger Field Guide text (+30%, fixed)

The only readability complaint is the Field Guide. Increase its text size by ~30% on both
surfaces:
- the **Field Research Notes** list rows (species name, one-line teaser, "Field Note" chip), and
- the **species popover** (`#fg-popover`): name, the *Where it lives / What it eats / What eats
  it* sections, and the Sources strip.

Not user-adjustable (no S/M/L control — that idea was dropped to keep things simple). The Field
Guide modal and popover already cap height and scroll, so the larger text reflows/scrolls
rather than overflowing; verify at the 30% bump.

---

## 3. Verification
- Manual play of a habitat: wrong-layer, missing-arrow, extra-arrow, and backward-arrow cases
  each produce the right nudge; tiles glow the right color and clear on move / next Check;
  no more than 3 nudges show at once.
- Spot-check the Manatee (mangrove) and Goshawk (forest) edge cases produce sensible nudges.
- Field Guide list + popover render larger text without clipping (scroll is fine).
- All `node test/*.test.js` pass; version bump (patch) and the changes pushed to `staging`.
