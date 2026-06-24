# Six Species Per Habitat (v3.4.0)

**Date:** 2026-06-24
**Status:** Implemented on `staging`, pending review/merge to `main`
**Version:** ships v3.4.0 (also includes the v3.3.x stamp-placement, bobcat-icon, and red-ink tweaks)

Goal: give every one of the 15 habitats **6 species** (was 5 in 12 of them; 3 already had 6),
and deliberately vary the trophic *shape* of each web so the 15 food webs feel distinct
rather than all being the same 1–2–1–1 chain.

---

## 1. Process (how the species were chosen)

This was done with a multi-agent **Workflow**, not by hand-picking:

1. **Map** — extracted the current 5 organisms + trophic levels + predation links for all 15
   habitats from `regionalData`. Found 3 habitats already had 6 species (CO Shrubland, NG Cross
   River Rainforest, UK Lowland River) — left untouched.
2. **Assign archetypes** — each of the remaining 12 habitats was pre-assigned a *different*
   structural archetype (add a producer / add a primary / add a secondary / add a co-apex) so the
   final 15 webs span six distinct shapes.
3. **Design** (1 agent per habitat) — proposed the most ecologically defensible real species for
   the assigned archetype, with web-searched evidence of regional presence and real predation links,
   a no-spoiler grade-3–6 field-guide blurb, a Britannica source URL, and an icon concept.
4. **Adversarially verify** (1 skeptic agent per proposal) — tried to refute presence, link
   direction, trophic level, no-spoiler compliance, and source validity.
5. **Synthesize** — applied the verifiers' corrections and wired everything in.

Two corrections the skeptics caught (both applied):
- **White-tailed Ptarmigan** — original draft had the Bobcat preying on it; bobcats avoid alpine
  tundra (the real wild-cat predator is the mountain lion, absent from that web). Fix: only the
  **Ermine** eats it.
- **Hen Harrier** — its field-guide blurb named "heather," an in-habitat organism (a spoiler).
  Fix: reworded to "low, scrubby vegetation."

Bonus fix found during a connectivity audit: the **Mudskipper** (NG Mangrove) had *no food source*
in the web even though its own note says it eats algae — connected it to the Red Mangrove's
algae/detritus film (the same source the new Fiddler Crab grazes).

## 2. The 12 additions

| Habitat | New species | Level / role | Eats → Eaten by | New shape (P-1°-2°-apex) |
|---|---|---|---|---|
| CO Eastern Shortgrass | Scarlet Globemallow | L1 producer | — → Prairie Dog | 2-1-2-1 |
| CO Alpine Tundra | White-tailed Ptarmigan | L2 herbivore | Lichen → Ermine | 1-3-1-1 |
| CO Riparian Wetland | Longnose Dace (native fish) | L3 meso | Aquatic Insects → Great Blue Heron | 1-1-3-1 |
| CO Montane Ponderosa | Gray Fox | L3 meso | Squirrel + Jay → Goshawk + Mtn Lion | 1-2-2-1 |
| NG Yankari Savanna | Spotted Hyena | L4 co-apex | Patas Monkey → — | 1-2-1-2 |
| NG Niger Delta Mangrove | Fiddler Crab | L2 grazer | Mangrove detritus → Dwarf Croc + Grey Heron | 1-3-1-1 |
| NG Gashaka Highlands | Wild Fig Tree (*Ficus sur*) | L1 producer | — → Chimp + Duiker | 2-2-1-1 |
| NG Lake Chad (Sahel) | Cram-cram grass | L1 producer | — → Gazelle + Locust | 2-2-1-1 |
| UK Caledonian Pinewood | Scottish Crossbill | L2 seed-eater | Scots Pine → Pine Marten + Golden Eagle | 1-3-1-1 |
| UK Heather Moorland | Hen Harrier | L4 co-apex | Red Grouse + Mtn Hare → — | 1-2-1-2 |
| UK Chalk Downland | Least Weasel | L3 meso | Field Vole → Common Buzzard | 1-2-2-1 |
| UK Rocky Seashore | Sea Lettuce | L1 producer | — → Limpet + Periwinkle | 2-2-1-1 |

Note: `predators` in `regionalData` means *who eats this organism*. Adding a consumer therefore
also appends its id to each prey organism's `predators` array; adding a producer only sets the new
organism's own `predators` (its grazers).

## 3. Resulting variety (all 15 webs, including the 3 pre-existing 6-species ones)

- **2 producers, one apex (2-2-1-1):** Highlands, Sahel, Seashore, River
- **3 primary consumers (1-3-1-1):** Tundra, Mangrove, Pinewood, Rainforest
- **3 secondary consumers (1-1-3-1):** Riparian *(unique)*
- **2 secondary consumers (1-2-2-1):** Forest, Downland, Shrubland
- **2 apex predators (1-2-1-2):** Savanna, Moorland
- **2 producers + 1 primary (2-1-2-1):** Grassland *(unique)*

Six distinct shapes; two habitats are one-of-a-kind.

## 4. Supporting changes

- **12 new icons** authored in `tools/species-icons-art.js` (10 drafted by a parallel icon Workflow,
  2 — least-weasel, sea-lettuce — hand-drawn after the agents hit a session limit), built into
  `index.html` via `node tools/build-species-icons.js`. Flat multi-color, viewBox `0 0 100 100`,
  no pure-white fills, each visually distinct.
- **12 `SPECIES_GUIDE` entries** (no-spoiler: diet/predators at category level only). All 90
  organisms now have an entry — no teaser fallbacks remain.
- **Britannica links:** all 12 verified **HTTP 200** via a same-origin browser fetch (WebFetch is
  bot-blocked with 403). 7 are species-specific; 5 are genus/group-level where no species page exists
  (mallow, hyena, *Ficus*, sandbur/*Cenchrus*, crossbill) — consistent with the prior link strategy.
- **Test guard:** `test/species-icons.test.js` organism count updated 78 → **90**, plus new
  look-alike distinctness groups (foxes, hyenas, game-birds, fish, crabs, seaweeds; least-weasel added
  to mustelids, hen-harrier to raptors).

## 5. Verification

- All `node test/*.test.js` pass; icon build writes 89 unique icons (90 refs; Golden Eagle reused once).
- Browser audit: every habitat has exactly 6 organisms; all predator ids resolve; levels 1–4 coherent;
  every habitat has a producer + apex; every consumer has a food source and every non-apex has a
  predator — **except two intentional cases**: the Goshawk (a co-top L3 raptor nothing eats) and the
  African Manatee (the deliberate no-predator megaherbivore from the v3.2.0 ecology audit).
- Species pool fits 6 tiles with no scroll at 1440×820; field-guide popover renders the new entries
  with working source links.
