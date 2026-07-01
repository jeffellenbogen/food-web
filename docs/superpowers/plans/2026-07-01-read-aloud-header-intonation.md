# Read-Aloud Header Intonation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Field Guide read-aloud speak section headers as natural questions with a gentle pitch lift instead of the current flat/cartoonish 1.4-pitch fragments.

**Architecture:** The whole app lives in `index.html`. `buildSpeakParts()` builds an array of `{text, heading?}` pieces; `toggleSpeak()` turns each piece into a `SpeechSynthesisUtterance` with per-piece pitch/rate. We change only the heading *strings* (fragments → questions, which every TTS voice intones correctly) and the heading *pitch* (1.4 → 1.1). Spec: `docs/superpowers/specs/2026-07-01-read-aloud-header-intonation-design.md`.

**Tech Stack:** Vanilla JS in a single `index.html`; browser `speechSynthesis` API; tests are plain Node scripts using `assert` that extract the real code from `index.html` via string markers (see `test/species-icons.test.js` for the established pattern).

## Global Constraints

- On-screen Field Guide labels ("WHERE IT LIVES" etc.) are **unchanged** — speech only.
- Ships as **v3.5.3**; all five version strings in `index.html` must agree.
- Browser `speechSynthesis` only — no network TTS, no libraries.
- Heading pitch exactly **1.1**; body pitch 1.0; heading rate stays `Math.max(0.6, rate - 0.1)`.
- **No** pause/chaining machinery — explicitly deferred (spec §3).
- Tests: plain Node + `assert`, run as `node test/<file>.test.js`, extracting code verbatim from `index.html`.

## File Structure

- Modify: `index.html` — `buildSpeakParts()` (~line 1718), `toggleSpeak()` utterance mapping (~line 1746), five version strings (~lines 376, 396, 434, 1942, 1950).
- Create: `test/read-aloud-speech.test.js` — speech parts + prosody assertions.
- Create: `test/version-consistency.test.js` — all version strings agree (durable invariant).

---

### Task 1: Question-phrased spoken headers in `buildSpeakParts()`

**Files:**
- Modify: `index.html:1718-1729`
- Test: `test/read-aloud-speech.test.js` (create)

**Interfaces:**
- Consumes: `SPECIES_GUIDE[id]` entries: `{ isProducer?, habitat, energy, eatenBy }` (existing global; the test stubs it).
- Produces: `buildSpeakParts(id, name)` → `Array<{text: string, heading?: true}>` — name piece first, then heading/body pairs; `null` for unknown id. `toggleSpeak()` consumes this shape unchanged.

- [ ] **Step 1: Write the failing test**

Create `test/read-aloud-speech.test.js`:

```js
// Tests the Field Guide read-aloud speech parts + prosody, extracted verbatim
// from index.html (same pattern as the other tests in this folder).
// Run with: node test/read-aloud-speech.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// --- Extract buildSpeakParts() verbatim (method shorthand inside the app object) ---
const start = html.indexOf('buildSpeakParts(id, name) {');
assert.ok(start > -1, 'buildSpeakParts not found');
const CLOSE = '\n            },';
const end = html.indexOf(CLOSE, start);
assert.ok(end > start, 'buildSpeakParts close not found');
const methodSrc = html.slice(start, end + CLOSE.length);

const make = new Function('SPECIES_GUIDE', 'const o = {' + methodSrc + '\n};\nreturn o;');
const guide = {
    fern:  { isProducer: true,  habitat: 'HAB-TEXT', energy: 'ENERGY-TEXT', eatenBy: 'EATEN-TEXT' },
    chimp: { isProducer: false, habitat: 'H2', energy: 'E2', eatenBy: 'B2' }
};
const o = make(guide);

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok - ' + name); }

test('producer: name first, question headings, bodies verbatim', () => {
    assert.deepStrictEqual(o.buildSpeakParts('fern', 'Highland Ferns'), [
        { text: 'Highland Ferns.' },
        { text: 'Where does it live?', heading: true }, { text: 'HAB-TEXT' },
        { text: 'How does it get energy?', heading: true }, { text: 'ENERGY-TEXT' },
        { text: 'What eats it?', heading: true }, { text: 'EATEN-TEXT' }
    ]);
});

test('consumer: eats-question variant', () => {
    const parts = o.buildSpeakParts('chimp', 'Chimpanzee');
    assert.strictEqual(parts[3].text, 'What does it eat?');
    assert.strictEqual(parts[3].heading, true);
});

test('every heading is a question', () => {
    const parts = o.buildSpeakParts('fern', 'X').concat(o.buildSpeakParts('chimp', 'Y'));
    const headings = parts.filter(p => p.heading);
    assert.strictEqual(headings.length, 6);
    headings.forEach(h => assert.ok(h.text.endsWith('?'), '"' + h.text + '" should end with ?'));
});

test('unknown species returns null', () => {
    assert.strictEqual(o.buildSpeakParts('nope', 'Ghost'), null);
});

console.log('read-aloud-speech: ' + passed + ' tests OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/read-aloud-speech.test.js`
Expected: FAIL — `AssertionError` in the first test (actual text is `'Where it lives.'`, expected `'Where does it live?'`).

- [ ] **Step 3: Change the heading strings in `index.html`**

Replace this block (currently at `index.html:1718-1729`):

```js
            // Build the spoken pieces: name, then each section as a higher-pitch heading + its body.
            buildSpeakParts(id, name) {
                const g = SPECIES_GUIDE[id];
                if (!g) return null;
                const eatsLabel = g.isProducer ? 'How it gets energy' : 'What it eats';
                return [
                    { text: name + '.' },
                    { text: 'Where it lives.', heading: true }, { text: g.habitat },
                    { text: eatsLabel + '.', heading: true }, { text: g.energy },
                    { text: 'What eats it.', heading: true }, { text: g.eatenBy }
                ];
            },
```

with:

```js
            // Build the spoken pieces: name, then each section as a question heading + its body.
            // Questions get a natural rising contour on every voice (screen labels are unchanged).
            buildSpeakParts(id, name) {
                const g = SPECIES_GUIDE[id];
                if (!g) return null;
                const eatsQuestion = g.isProducer ? 'How does it get energy?' : 'What does it eat?';
                return [
                    { text: name + '.' },
                    { text: 'Where does it live?', heading: true }, { text: g.habitat },
                    { text: eatsQuestion, heading: true }, { text: g.energy },
                    { text: 'What eats it?', heading: true }, { text: g.eatenBy }
                ];
            },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/read-aloud-speech.test.js`
Expected: PASS — `read-aloud-speech: 4 tests OK`

- [ ] **Step 5: Run the whole suite (regression)**

Run: `for f in test/*.test.js; do node "$f" || exit 1; done`
Expected: every file prints its OK line; exit 0.

- [ ] **Step 6: Commit**

```bash
git add index.html test/read-aloud-speech.test.js
git commit -m "feat(a11y): speak field-guide headers as natural questions

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Gentle heading pitch (1.4 → 1.1) in `toggleSpeak()`

**Files:**
- Modify: `index.html:1746-1753`
- Test: `test/read-aloud-speech.test.js` (append)

**Interfaces:**
- Consumes: the utterance-mapping block in `toggleSpeak()` — `u.pitch = p.heading ? 1.4 : 1.0;`
- Produces: heading utterances with `pitch === 1.1`; body utterances unchanged (`pitch 1.0`). Verified in-browser in Task 4 via `window.__spoken`.

- [ ] **Step 1: Append the failing prosody tests**

Append to `test/read-aloud-speech.test.js` (before the final `console.log` line):

```js
// --- Prosody: the shipped source must use a gentle 1.1 heading pitch, old rate dip intact ---
test('heading pitch is a gentle 1.1 lift', () => {
    assert.ok(/u\.pitch = p\.heading \? 1\.1 : 1\.0;/.test(html),
        'expected `u.pitch = p.heading ? 1.1 : 1.0;` in index.html');
});

test('heading rate dip is unchanged', () => {
    assert.ok(/u\.rate = p\.heading \? Math\.max\(0\.6, rate - 0\.1\) : rate;/.test(html),
        'expected the Math.max(0.6, rate - 0.1) heading rate dip to remain');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/read-aloud-speech.test.js`
Expected: FAIL — 'heading pitch is a gentle 1.1 lift' (source still has `1.4`).

- [ ] **Step 3: Change pitch and update the stale comment**

In `index.html` (~1746-1753), replace:

```js
                // One short utterance per piece: headings get a higher pitch (and slightly slower
                // rate) so the heading is clearly heard before its section. Short utterances also
                // dodge Chrome's long-utterance cutoff.
                const utterances = parts.map(p => {
                    const u = new SpeechSynthesisUtterance(p.text);
                    if (voice) u.voice = voice;
                    u.rate = p.heading ? Math.max(0.6, rate - 0.1) : rate;
                    u.pitch = p.heading ? 1.4 : 1.0;
```

with:

```js
                // One short utterance per piece: headings are questions, so every voice gives them
                // a natural rising contour (Google network voices ignore pitch entirely); voices
                // that honor pitch add a gentle 1.1 lift on top. Short utterances also dodge
                // Chrome's long-utterance cutoff.
                const utterances = parts.map(p => {
                    const u = new SpeechSynthesisUtterance(p.text);
                    if (voice) u.voice = voice;
                    u.rate = p.heading ? Math.max(0.6, rate - 0.1) : rate;
                    u.pitch = p.heading ? 1.1 : 1.0;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/read-aloud-speech.test.js`
Expected: PASS — `read-aloud-speech: 6 tests OK`

- [ ] **Step 5: Commit**

```bash
git add index.html test/read-aloud-speech.test.js
git commit -m "feat(a11y): soften read-aloud heading pitch from 1.4 to 1.1

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Version bump to v3.5.3 + version-consistency test

**Files:**
- Modify: `index.html:376,396,434,1942,1950`
- Test: `test/version-consistency.test.js` (create)

**Interfaces:**
- Consumes: the five version strings — three `<div class="version-tag">Build v3.5.2 GLOBAL EXPEDITION</div>`, one `<span>BUILD v3.5.2</span>`, one `version: "3.5.2",`
- Produces: all five read `3.5.3`; a durable test that fails whenever any future bump misses a spot.

- [ ] **Step 1: Write the consistency test**

Create `test/version-consistency.test.js`:

```js
// Asserts every version string in index.html agrees (3 version-tag divs,
// the BUILD label, and the exported journal `version:` property), so a
// version bump can never miss a spot silently.
// Run with: node test/version-consistency.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const tagVersions = [...html.matchAll(/Build v(\d+\.\d+\.\d+) GLOBAL EXPEDITION/g)].map(m => m[1]);
const buildLabel = html.match(/BUILD v(\d+\.\d+\.\d+)</);
const verProp = html.match(/version: "(\d+\.\d+\.\d+)"/);

assert.strictEqual(tagVersions.length, 3, 'expected 3 version-tag divs, got ' + tagVersions.length);
assert.ok(buildLabel, 'BUILD vX.Y.Z label not found');
assert.ok(verProp, 'version: "X.Y.Z" property not found');

const all = tagVersions.concat([buildLabel[1], verProp[1]]);
const unique = [...new Set(all)];
assert.strictEqual(unique.length, 1, 'version strings disagree: ' + all.join(', '));

console.log('version-consistency: OK (v' + unique[0] + ' in ' + all.length + ' places)');
```

- [ ] **Step 2: Run it (baseline)**

Run: `node test/version-consistency.test.js`
Expected: PASS — `version-consistency: OK (v3.5.2 in 5 places)`. (An invariant test, not TDD — the bump is a data edit; this test exists to catch missed spots on every future bump.)

- [ ] **Step 3: Bump every version string**

First confirm the only `3.5.2` occurrences are the five version spots:

Run: `grep -cn "3\.5\.2" index.html`
Expected: `5`

Then replace all five (Edit tool with `replace_all`, old `3.5.2` → new `3.5.3`), yielding:
- 3 × `<div class="version-tag">Build v3.5.3 GLOBAL EXPEDITION</div>`
- 1 × `<span>BUILD v3.5.3</span>`
- 1 × `version: "3.5.3",`

- [ ] **Step 4: Verify**

Run: `node test/version-consistency.test.js && grep -c "3\.5\.3" index.html`
Expected: `version-consistency: OK (v3.5.3 in 5 places)` then `5`.

- [ ] **Step 5: Full suite**

Run: `for f in test/*.test.js; do node "$f" || exit 1; done`
Expected: all files OK; exit 0.

- [ ] **Step 6: Commit**

```bash
git add index.html test/version-consistency.test.js
git commit -m "chore(release): bump version to v3.5.3

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: In-browser verification (no code changes)

**Files:**
- Create (if absent, untracked): `.claude/launch.json`

**Interfaces:**
- Consumes: the shipped `index.html`; `window.__spoken` instrumentation array of `{text, pitch, rate}`.
- Produces: evidence — logged utterance parameters, clean console, screenshot. No commit.

- [ ] **Step 1: Serve the app**

If `.claude/launch.json` doesn't exist, create:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "food-web", "runtimeExecutable": "python3", "runtimeArgs": ["-m", "http.server", "4173"], "port": 4173 }
  ]
}
```

Start it with the preview tools (`preview_start` → `food-web`).

- [ ] **Step 2: Instrument `speechSynthesis.speak`**

Via `preview_eval`:

```js
(() => {
  window.__spoken = [];
  const orig = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = (u) => { window.__spoken.push({ text: u.text, pitch: u.pitch, rate: u.rate }); return orig(u); };
  return 'instrumented';
})()
```

- [ ] **Step 3: Trigger a read-aloud**

Use `preview_snapshot` to find the way in (pick a region if the landing page shows, open the Field Guide, then click the first `.speak-pill`). Then read `window.__spoken` via `preview_eval`.

Expected shape (species name piece pitch 1, then alternating heading/body):

```json
[
  { "text": "Highland Ferns.", "pitch": 1, "rate": 0.95 },
  { "text": "Where does it live?", "pitch": 1.1, "rate": 0.85 },
  { "text": "Highland ferns grow in the cool, misty…", "pitch": 1, "rate": 0.95 },
  { "text": "How does it get energy?", "pitch": 1.1, "rate": 0.85 }
]
```

Assert: every `heading` text ends in `?` and has `pitch 1.1`; body pieces `pitch 1`; rates track the speed picker (default 0.95, headings 0.85).

- [ ] **Step 4: Check console + screenshot**

`preview_console_logs` (level: error) — expected: none. `preview_screenshot` of the Field Guide popover with the version footer visible (v3.5.3) as proof for the user. The actual *listening* sign-off is the user's, on a Google voice and a macOS voice.
