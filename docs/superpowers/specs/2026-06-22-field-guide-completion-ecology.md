# Field Guide, Region-Completion Visuals & Ecological Accuracy (v3.1.0 → v3.2.0)

**Date:** 2026-06-22
**Status:** Implemented on `staging`, pending review/merge to `main`
**Versions:** builds on v3.0.2; ships v3.1.0 (features) then v3.2.0 (accuracy + content)

This document records *why* the changes in this release were made and the process
behind them, so the work is recoverable later. It covers GitHub issues
**#18, #19, #20**, a full ecological-accuracy audit, and the field-guide link strategy.

---

## 1. Issues #19 + #20 — Field Guide upgrade

**Goal:** let curious students (grades 3–6) get more detailed, *generalized* science per
species without revealing which tiles to connect, and make the guide fit at 100% zoom (#20).

**Design (chosen after mockups):**
- Each species is a **compact row** (icon + name + one-line teaser + a "Field Notes" chip).
  All rows fit with no inner scroll — fixes #20.
- Hover / focus / tap reveals a **floating popover** (`#fg-popover`, lives on `.modal-paper`
  so it never clips and stays open while hovered for the link). It shows three labeled lines:
  *Where it lives* / *What it eats* (or *How it gets energy* for producers) / *What eats it*,
  plus a **Learn more ↗** source link (opens in a new tab), and a **Sources** strip.
- Popover sits to the **left of the chip** so the chip and species names stay visible/clickable
  (a bug we hit when it was right-pinned over the chip).

**Data model:** `SPECIES_GUIDE` (keyed by organism id) holds `{ habitat, energy, isProducer,
eatenBy, source: { name, url } }`. Species without an entry fall back to the short `notes`
teaser. **Colorado is the pilot (~26 entries).** Nigeria + UK are **Phase 2**.

**Content guardrail (important):** diet/predators are written at the **category** level
("birds of prey", "conifer seeds") — never naming an in-habitat species — so the game stays a
reasoning exercise. Producers get a "How it gets energy" line. Content was drafted by a
research pass and then **adversarially re-checked** to (a) strip any co-habitat species name
and (b) align "eaten by" with the game's real answer key (so a blurb never contradicts a
required link, e.g. a meso-predator wrongly described as having "no predators").

## 2. Issue #18 — Region-completion visuals

When a whole region's 5 habitats are mastered (`globalProgress[r].completed.length === 5`),
a **passport-postmark stamp** (`getStampSVG(label, color, uid)`) marks it complete on three surfaces:

- **Merit Badges cover page** (`#cover-region-stamp`, rendered in `renderPatches`). The 5th-badge
  moment is detected in `checkJournal()` (4→5 transition sets `_pendingRegionStamp`), which arms a
  one-time **press-in animation** (`.stamp-press` keyframes; `void offsetWidth` reflow to restart it).
  *Placement was later shrunk/centered so its top clears the title.*
- **Landing region card** (`updateLandingBadges`) — small stamp replaces the count ribbon.
- **Certificate redesign** (`downloadCertificate`): cut from 15 habitat thumbnails to **3 region
  postage stamps** with X/5 progress pips; a completed region's stamp is "cancelled" by the postmark
  spilling off its top-right corner onto the paper. **html2canvas 1.4.1 caveat:** it ignores CSS
  `mask` and `filter`, so the perforated edge is drawn as **SVG circles** and incomplete regions are
  dimmed with a translucent overlay (not `filter: grayscale`). Resume metadata is unchanged.

## 3. Ecological accuracy audit (v3.2.0)

**Process:** a grounded, adversarially-verified audit of all 15 habitats (each habitat researched,
then re-checked by a second skeptical reviewer; only confirmed issues kept). It confirmed **11 issues**
across 7 habitats and produced concrete fixes.

**Fixes (7 habitats):**
| Habitat | Change |
|---|---|
| CO Alpine Tundra | Apex **Mountain Lion → Golden Eagle** (cougars avoid treeless alpine) |
| CO Montane Ponderosa | Removed implausible **Bobcat → Goshawk** |
| CO Steppe Shrubland | Added **Grasshopper** (L2); **Sage Thrasher** L2→L3 (it's an insectivore) |
| Nigeria Niger Delta Mangrove | **Great Blue Heron → Grey Heron** (Americas-only species); removed impossible **Heron → African Manatee** (manatee now a no-predator megaherbivore) |
| Nigeria Cross River Rainforest | Added **Giant Pouched Rat** (ground prey); **Gaboon Viper** eats the rat, not the canopy parrot |
| Nigeria "Lake Chad" | Renamed from "Lake Chad Sahel" (Dorcas Gazelle is valid there, not in Nigeria proper); removed impossible **Monitor Lizard → gazelle** |
| UK Lowland River | Added **Algae**; **Mayfly Nymph** eats algae (its real food) |

**Supporting changes:**
- **4 new icons** authored in `tools/species-icons-art.js` (grasshopper, algae, giant-pouched-rat,
  grey-heron) and built into `index.html` via `node tools/build-species-icons.js`. Great Blue Heron
  stays correct in Colorado's riparian habitat.
- **`UNUSED_SPECIES` bank** — retired creatures (currently Mountain Lion) kept with art preserved for
  future habitats. Uses `iconKey` (not `icon`) so the icon-build's organism scan ignores it.
- Three habitats now have **6 species** (Shrubland, Rainforest, River); the centering layout and the
  per-habitat badge counts are unaffected.
- The icon test count guard was updated 75 → **78** organism icon refs.

**Verification:** every modified habitat was confirmed **solvable** (built the correct web
programmatically; `isCurrentHabitatCorrect()` returns true), data integrity checked (all predator ids
resolve, levels coherent), icons render distinctly, and all node tests pass.

## 4. Field-guide "Learn more" link strategy

Evolved over three passes to land curious users on **solid, species-specific** info:
1. Britannica Kids **search** URLs — rejected (search pages, sometimes empty).
2. Britannica Kids **direct article** URLs — better, but Kids lacks many species (links fell back to
   general articles).
3. **Final:** prefer a Britannica Kids article when it is specific *and* kid-level; otherwise link the
   **species-specific main Britannica article** (`www.britannica.com/animal|plant/...`). All URLs were
   resolved against the live sites and verified to return HTTP 200.

- **Britannica Kids (10):** Bobcat, Prairie Dog, Coyote, Cottonwood, Badger, Grasshopper, Lichen,
  Marmot, Insect (for Aquatic Insects), Squirrel (for Abert's Squirrel).
- **Main Britannica (16):** Ponderosa Pine, Steller's Jay, Northern Goshawk, Blue Grama,
  Black-footed Ferret, Golden Eagle (×2), Leopard Frog, Garter Snake, Great Blue Heron, Sagebrush,
  Jackrabbit, Thrasher (for Sage Thrasher), Red-tailed Hawk, Pika, Ermine.
- **Two unavoidably general** (no species page exists anywhere): **Abert's Squirrel** → "squirrel";
  **Aquatic Insects** (a category) → "insect".
- `FIELD_GUIDE_SOURCES` credits both Britannica Kids and Britannica; each popover labels its own source.

## 5. Phase 2 — Nigeria + UK field guide (DONE)
All 52 Nigeria + UK species now have blurbs (same workflow: research-drafted, adversarially verified
for the no-spoiler guardrail and answer-key alignment, then an independent re-scan that fixed 8
co-habitant-name leaks + 5 mis-aligned "eaten by" lines). `SPECIES_GUIDE` now covers all **78** organisms.
The manatee's "no natural predators" hint is included. **Links:** Phase 2 uses species-specific **main
Britannica** articles for all 52 (all verified HTTP 200) — Britannica Kids lacks dedicated pages for most
of these species, and the goal was species-specific. So Colorado is a Kids/main mix (10 Kids) while
Nigeria + UK are all main Britannica; can move charismatic ones (leopard, lion, chimpanzee, etc.) to
Britannica Kids later if a kid-reading-level page is preferred.

## 6. Known follow-ups
- **Minor, out of scope:** CO Riparian has Leopard Frog and Garter Snake both at Level 3 (same-shelf
  predation) — pre-existing, the game handles it.

## 7. Key files / symbols
- `index.html`: `SPECIES_GUIDE`, `FIELD_GUIDE_SOURCES`, `UNUSED_SPECIES`, `getStampSVG`,
  `bindFieldGuidePopover`, `showFieldGuide`, `renderPatches`, `checkJournal`, `downloadCertificate`,
  `regionalData`.
- `tools/species-icons-art.js` (+ `tools/build-species-icons.js`) — icon source + build.
- `test/species-icons.test.js` — organism-icon registry guard (count + distinctness).
