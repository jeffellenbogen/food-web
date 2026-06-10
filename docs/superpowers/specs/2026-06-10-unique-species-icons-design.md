# Design: Unique Per-Species Icons

**Date:** 2026-06-10
**Project:** Global Food Web Expedition (`index.html`)
**Status:** Proposed — awaiting review

## Problem

Every organism in the food web is rendered with an emoji stored in its `icon`
field. Emoji are reused across many different species, which is confusing for
students who are trying to tell organisms apart. Examples of the reuse:

- 🐾 represents **Black-footed Ferret, Badger, Striped Hyena, and Pine Marten**
- 🦦 represents **Ermine, Stoat, and Eurasian Otter**
- 🐦 represents ~8 different birds (Steller's Jay, Sage Thrasher, Grey Parrot,
  Capercaillie, Red Grouse, Herring Gull, and two different "Great Blue Herons")
- 🦅 represents 6 different raptors (Golden Eagle, Goshawk, Red-tailed Hawk,
  Crowned Eagle, Common Buzzard)
- 🌲 represents both **Ponderosa Pine and Mahogany Tree**

There are **73 organism entries** across 3 regions (Colorado, Nigeria, United
Kingdom), 15 habitats. Because two species recur across regions (Golden Eagle,
Great Blue Heron), there are **~71 unique species** to give icons to.

## Goal

Give every species a **unique, recognizable, flat-color icon** that fits the
hand-drawn field-journal aesthetic, so students can distinguish organisms at a
glance — without breaking the app's single-file, offline-friendly,
certificate-exporting design.

## Decisions (confirmed with the user)

1. **Visual style:** Flat color icons — brighter and game-like, high
   recognizability for young students (naturalistic per-species colors: brown
   eagle, green pine, grey badger).
2. **Source:** A free open-source SVG library, mapped uniquely per species.
3. **Rollout:** All 73 organisms in a single pass.

### Reconciliation note

The only free library that covers this many *specific* species is
[game-icons.net](https://game-icons.net/) (4,170+ icons, CC BY 3.0). Its icons
are **single-color solid silhouettes**, not multi-color flat icons. This is
actually ideal for the chosen "flat color" look: a solid silhouette filled with
one natural color reads as a clean, bright, game-style icon and keeps one
consistent style across all 71 species. Full source SVGs live on GitHub
(<https://github.com/game-icons/icons>), so we self-host/inline them — no CDN,
stays offline-capable, and works with the existing `html2canvas` certificate
export.

## Architecture

The app is a single self-contained `index.html`: Tailwind via CDN, vanilla JS,
hand-drawn fonts, `html2canvas` for the certificate export, deployed to GitHub
Pages. We preserve all of those properties.

### Data model

Repurpose the existing `icon` field on each organism. Today:

```js
{ id: 'g5', name: 'Golden Eagle', level: 4, icon: '🦅', notes: "...", predators: [] }
```

After:

```js
{ id: 'g5', name: 'Golden Eagle', level: 4, icon: 'golden-eagle', notes: "...", predators: [] }
```

`icon` becomes a **slug key** into a new central registry. This keeps the change
localized to (a) the icon strings in the data and (b) two render call sites.

### Icon registry

Add one module-level constant near the top of the script:

```js
const SPECIES_ICONS = {
  'golden-eagle': { svg: '<path d="..."/>', color: '#6b4f2a', credit: 'Lorc' },
  'scots-pine':   { svg: '<path d="..."/>', color: '#2f5d34', credit: 'Delapouite' },
  // ... one entry per unique species
};
```

- `svg`: the **inner markup** of the game-icons SVG (everything inside `<svg>`),
  not just a single `d` string — some icons use multiple paths or a fill-rule.
  All game-icons foreground art is on a `0 0 512 512` viewBox.
- `color`: a naturalistic flat fill color for that species.
- `credit`: the icon author, recorded for CC BY 3.0 attribution.

### Render helper

```js
function renderSpeciesIcon(key, name, sizeClass = 'w-10 h-10') {
  const icon = SPECIES_ICONS[key];
  if (!icon) return `<span class="text-3xl">❓</span>`; // graceful fallback
  return `<svg viewBox="0 0 512 512" class="${sizeClass} inline-block align-middle"
            fill="${icon.color}" role="img" aria-label="${name}">${icon.svg}</svg>`;
}
```

Replace both current render sites:

- **Species pool / sidebar** — `index.html:710`
  `<span class="text-3xl">${org.icon}</span>` → `${renderSpeciesIcon(org.icon, org.name)}`
- **Field-guide modal** — `index.html:894`
  `<span class="text-3xl">${o.icon}</span>` → `${renderSpeciesIcon(o.icon, o.name)}`

Inline SVG with explicit dimensions and `fill` follows the existing
`getRibbonSVG()` precedent, which already renders correctly inside the
`html2canvas` certificate flow.

### Color treatment

Naturalistic per-species fills (the user's chosen look). A small curated natural
palette keeps it cohesive:

- Producers (plants/algae): greens — `#2f5d34`, `#5a7d3a`, `#7a8b3a`
- Mammals: browns/greys — `#6b4f2a`, `#8a7355`, `#7d7d7d`
- Birds/raptors: warm browns and slate — `#5a4632`, `#566273`
- Reptiles/amphibians: olive/teal — `#4a6b3a`, `#3a6b5d`
- Fish/aquatic/invertebrates: blues/teals — `#3a5d7a`, `#3a6b6b`

Icons render as a solid colored silhouette (no heavy background chip), matching
the flat-icon style. *Optional later enhancement (not in this pass): a faint
trophic-level background tint to reinforce producer→apex tiers.*

### Attribution (license compliance)

CC BY 3.0 requires crediting authors. We will:

- Record each icon's author in the registry (`credit` field).
- Add a single visible attribution line in the field-guide modal footer:
  *"Species icons from game-icons.net (CC BY 3.0)."* linking to the site.
- Add an HTML source comment listing the icon authors used.

## The core artifact: species → icon mapping

The heart of the work is a verified mapping from each species to a game-icons
slug. Below is the **candidate** mapping; slugs marked *(verify)* must be
confirmed against the live library during the build, each with a documented
nearest-match fallback. Common species (fox, otter, crab, snail, gorilla,
elephant, lion, leopard, parrot, frog, snake, squirrel, badger, eagle,
crocodile, grasshopper, lizard) are near-certain to exist.

### Colorado
| Species | Candidate icon | Color family |
|---|---|---|
| Blue Grama Grass | `high-grass` | green |
| Prairie Dog | `prairie-dog` *(verify → `marmot`/`rat`)* | brown |
| Black-footed Ferret | `ferret` *(verify → `weasel`)* | tan |
| Coyote | `wolf-head` *(verify → `wolf`)* | grey-brown |
| Golden Eagle | `eagle-emblem` *(verify → `eagle-head`)* | brown |
| Lichen | `lichen` *(verify → `moss`/`mushroom`)* | green-grey |
| Pika | `rabbit` *(verify → `rat`)* | grey |
| Marmot | `marmot` *(verify → `groundhog`)* | brown |
| Ermine | `weasel` *(verify → `stoat`)* | tan |
| Mountain Lion | `cougar` *(verify → `lion`/`cat`)* | tan |
| Cottonwood Tree | `oak` *(verify → `tree`)* | green |
| Aquatic Insects | `water-bug` *(verify → `beetle`/`fly`)* | teal |
| Leopard Frog | `frog` | green |
| Garter Snake | `snake` | olive |
| Great Blue Heron | `heron` *(verify → `crane-bird`/`flamingo`)* | slate |
| Ponderosa Pine | `pine-tree` | dark green |
| Abert's Squirrel | `squirrel` | brown |
| Steller's Jay | `bird` *(verify → `crow`)* | blue |
| Goshawk | `hawk` *(verify → `falcon`)* | brown |
| Bobcat | `wildcat` *(verify → `cat`)* | tan |
| Sagebrush | `bush` *(verify → `shrub`/`plant`)* | sage green |
| Jackrabbit | `rabbit` | tan |
| Sage Thrasher | `sparrow` *(verify → `bird`)* | brown |
| Badger | `badger` | grey |
| Red-tailed Hawk | `hawk` *(verify → `falcon`)* | rust |

### Nigeria
| Species | Candidate icon | Color family |
|---|---|---|
| Elephant Grass | `reed`/`high-grass` *(verify)* | green |
| Bush Elephant | `elephant` | grey |
| Patas Monkey | `monkey` | brown |
| Rock Python | `coiled-snake` *(verify → `snake`)* | olive |
| West African Lion | `lion` | tan |
| Red Mangrove | `mangrove` *(verify → `tree`/`roots`)* | green |
| African Manatee | `manatee` *(verify → `whale`/`seal`)* | grey-blue |
| Mudskipper | `fish` *(verify → `flatfish`)* | teal |
| Dwarf Crocodile | `crocodile` *(verify → `croc-jaws`)* | olive |
| Mahogany Tree | `tree` *(verify → `oak`)* | green |
| Cross River Gorilla | `gorilla` | dark grey |
| Grey Parrot | `parrot` | grey |
| Gaboon Viper | `snake`/`viper` *(verify)* | olive |
| Leopard | `leopard` *(verify → `panther`)* | gold |
| Highland Ferns | `fern` *(verify → `plant`)* | green |
| Chimpanzee | `monkey` *(verify → distinct from Patas)* | dark brown |
| Yellow-backed Duiker | `antelope` *(verify → `deer`/`gazelle`)* | brown |
| Golden Cat | `cat` *(verify → `wildcat`)* | gold |
| Crowned Eagle | `eagle-head` *(verify → distinct from Golden)* | brown |
| Baobab Tree | `baobab` *(verify → `tree`)* | brown-green |
| Dorcas Gazelle | `gazelle` *(verify → `antelope`)* | tan |
| Sahel Locust | `grasshopper` *(verify → `locust`)* | green |
| Monitor Lizard | `lizard` *(verify → `gecko`)* | olive |
| Striped Hyena | `hyena` *(verify → `jackal`/`wolf`)* | grey-brown |

### United Kingdom
| Species | Candidate icon | Color family |
|---|---|---|
| Scots Pine | `pine-tree` | dark green |
| Red Squirrel | `squirrel` | rust |
| Capercaillie | `bird` *(verify → `turkey`/`grouse`)* | dark |
| Pine Marten | `marten` *(verify → `weasel`, distinct from Ermine/Stoat)* | brown |
| Heather | `flower`/`bush` *(verify)* | purple-green |
| Red Grouse | `partridge`/`bird` *(verify)* | rust |
| Mountain Hare | `hare` *(verify → `rabbit`, distinct from Rabbit)* | grey |
| Stoat | `stoat` *(verify → `weasel`, distinct from Ermine)* | tan |
| Red Fox | `fox-head` *(verify → `fox`)* | rust |
| Meadow Grasses | `wheat`/`high-grass` *(verify)* | green |
| Rabbit | `rabbit` | tan |
| Field Vole | `mouse`/`rat` *(verify → vole)* | brown |
| Adder | `snake`/`viper` *(verify, distinct from other snakes)* | grey |
| Common Buzzard | `vulture`/`hawk` *(verify, distinct from eagles)* | brown |
| Kelp | `seaweed`/`kelp` *(verify → `algae`)* | green-brown |
| Common Limpet | `seashell`/`limpet` *(verify)* | grey |
| Periwinkle | `snail`/`sea-snail` *(verify)* | grey-brown |
| Shore Crab | `crab` | orange |
| Herring Gull | `seagull` *(verify → `bird`)* | grey-white |
| Common Reed | `reed`/`cattail` *(verify)* | green |
| Water Vole | `beaver`/`rat` *(verify, distinct from Field Vole)* | brown |
| Mayfly Nymph | `dragonfly`/`fly` *(verify → `larva`)* | teal |
| Brown Trout | `trout`/`fish` *(verify → `salmon`)* | brown |
| Eurasian Otter | `otter` | brown |

**Shared species** (one icon used in two regions): Golden Eagle (Colorado +
UK), Great Blue Heron (Colorado + Nigeria). **Distinctness requirement:** the
mustelids (Ferret, Ermine, Stoat, Pine Marten), the small rodents (Pika,
Field Vole, Water Vole, Prairie Dog, Marmot), the eagles/hawks, and the snakes
must each get a *visibly different* icon — even if the library only has a few
base shapes, vary by icon choice and/or color so no two are identical.

## Out of scope

- Changing the food-web data itself (species, notes, predators).
- Trophic-level background tinting (possible later enhancement).
- Animations or hover effects on icons.
- Replacing the habitat photos (Unsplash `img` fields).

## Testing / verification

This is a static single-file app with no build step. Verification is manual +
the existing test suite:

1. Open `index.html` in a browser; for each of the 15 habitats, open the
   workspace and confirm every species in the pool shows a unique, correct icon.
2. Open the Field Guide modal in several habitats; confirm icons + names render.
3. Confirm the mustelids / small rodents / raptors / snakes are visually
   distinct from one another.
4. Complete a habitat and **Download Certificate**; confirm icons render in the
   `html2canvas` PNG export (the key compatibility risk).
5. Run existing tests: `test/png-metadata.test.js`,
   `test/integration-glue.test.js` — confirm no regressions.
6. Confirm the attribution line appears and links correctly.

## Risks

- **html2canvas rendering inline SVG:** mitigated by the `getRibbonSVG()`
  precedent and explicit pixel dimensions; fallback is rendering each icon to a
  data-URI `<img>` if a problem appears in the certificate export.
- **Library coverage for exotic species:** mitigated by documented nearest-match
  fallbacks in the mapping table.
- **File size:** ~71 inline SVG paths add weight to `index.html`. Game-icons
  paths are compact; expected to be modest, but we'll sanity-check the final
  size.
