# Custom Species Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the approved 73-species custom flat multi-color SVG artwork from `mockups/icons.js` into the live app, replacing the game-icons.net silhouettes shipped in PR #14.

**Architecture:** The artwork file moves to `tools/species-icons-art.js` (CommonJS module, `viewBox 0 0 100 100`). The build script is rewritten to read that file directly instead of a game-icons clone; it produces `{ svg }` registry entries (colors are embedded per-element, no `color` or `credit` fields). `renderSpeciesIcon` is updated to use the new viewBox and drops the outer `fill` attribute. Attribution is updated to reflect original artwork.

**Tech Stack:** Vanilla JS, Node.js (build script + tests), no new dependencies. All tests run with `node test/<name>.test.js`.

---

## File Structure

| Action | Path | Purpose |
|--------|------|---------|
| Move | `mockups/icons.js` → `tools/species-icons-art.js` | Artwork master: 73 slugs → inner SVG markup |
| Modify | `mockups/viewer.html` | Update `<script src>` to load from new path |
| Rewrite | `tools/build-species-icons.js` | Read art module, produce `{svg}` registry entries |
| Run | `node tools/build-species-icons.js` | Regenerate `SPECIES_ICONS` block in `index.html` |
| Modify | `index.html` line 404–413 | `renderSpeciesIcon`: `viewBox` + remove outer `fill` |
| Modify | `index.html` line 8 | Replace game-icons HTML comment |
| Modify | `index.html` lines 1279–1281 | Remove CC BY field-guide footer |
| Rewrite | `test/species-icons.test.js` | Update assertions for new schema |
| Create | `test/build-missing-slug.test.js` | Replaces `build-extract-inner.test.js` |
| Delete | `test/build-extract-inner.test.js` | Tests `extractInner` (no longer needed) |
| Delete | `tools/species-icon-map.json` | Old slug→game-icon mapping (obsolete) |

Note: `tools/.gitignore` does not exist in this repo — no action needed.

---

## Task 1: Pre-flight Verification

**Files:** No changes — read-only baseline check.

- [ ] **Step 1: Run the full test suite to confirm a green baseline**

  ```bash
  node test/species-icons.test.js && \
  node test/build-extract-inner.test.js && \
  node test/png-metadata.test.js && \
  node test/integration-glue.test.js
  ```

  Expected: all four scripts print `OK` and exit 0. If any fail, stop and fix before continuing.

---

## Task 2: Move Artwork File + Update Viewer

**Files:**
- Move: `mockups/icons.js` → `tools/species-icons-art.js`
- Modify: `mockups/viewer.html`

- [ ] **Step 1: Move the file with git so history is preserved**

  ```bash
  git mv mockups/icons.js tools/species-icons-art.js
  ```

- [ ] **Step 2: Update the viewer's script src**

  In `mockups/viewer.html`, change line 18:
  ```html
  <!-- before -->
  <script src="icons.js"></script>

  <!-- after -->
  <script src="../tools/species-icons-art.js"></script>
  ```

- [ ] **Step 3: Verify the viewer still works**

  Open `mockups/viewer.html` in a browser (or use `open mockups/viewer.html`). You should see the full icon grid. No console errors.

- [ ] **Step 4: Commit**

  ```bash
  git add mockups/viewer.html tools/species-icons-art.js
  git commit -m "move icon artwork to tools/species-icons-art.js, update viewer"
  ```

---

## Task 3: Rewrite Build Script

**Files:**
- Rewrite: `tools/build-species-icons.js`

The new script reads the art module directly. No game-icons clone, no `extractInner`, no `species-icon-map.json`. Entry shape is `{ svg }` — no `color`, no `credit`.

The `SPECIES_ICONS_ART` env var overrides the art path so the test in Task 6 can inject a stub.

- [ ] **Step 1: Write the new build script**

  Replace the entire contents of `tools/build-species-icons.js` with:

  ```js
  // Generates the SPECIES_ICONS literal inside index.html from tools/species-icons-art.js.
  // Run: node tools/build-species-icons.js
  const fs = require('fs');
  const path = require('path');

  const ART_PATH = process.env.SPECIES_ICONS_ART
    ? path.resolve(process.env.SPECIES_ICONS_ART)
    : path.join(__dirname, 'species-icons-art.js');
  const HTML_PATH = path.join(__dirname, '..', 'index.html');
  const START = '// === SPECIES_ICONS:START';
  const END = '// === SPECIES_ICONS:END ===';

  function build() {
    const art = require(ART_PATH);
    const html = fs.readFileSync(HTML_PATH, 'utf8');

    const slugs = [...html.matchAll(/icon:\s*'([^']+)'/g)].map(m => m[1]);
    const unique = [...new Set(slugs)];

    const missing = unique.filter(s => !art[s]);
    if (missing.length) {
      console.error('MISSING art entries for these organism slugs:\n  ' + missing.join('\n  '));
      process.exit(1);
    }

    const registry = {};
    for (const slug of unique) {
      registry[slug] = { svg: art[slug] };
    }

    const literal = 'const SPECIES_ICONS = ' + JSON.stringify(registry, null, 2) + ';';
    const sLine = html.indexOf(START);
    const eLine = html.indexOf(END);
    if (sLine < 0 || eLine < 0) throw new Error('SPECIES_ICONS markers not found in index.html');
    const sEnd = html.indexOf('\n', sLine) + 1;
    if (sEnd === 0) throw new Error('No newline found after SPECIES_ICONS:START marker');
    const updated = html.slice(0, sEnd) + literal + '\n' + html.slice(eLine);
    fs.writeFileSync(HTML_PATH, updated);
    console.log('Wrote ' + Object.keys(registry).length + ' icons.');
  }

  if (require.main === module) build();
  ```

- [ ] **Step 2: Commit the new build script**

  ```bash
  git add tools/build-species-icons.js
  git commit -m "rewrite build-species-icons to read from species-icons-art.js"
  ```

---

## Task 4: Run the Build

**Files:**
- Modify: `index.html` (SPECIES_ICONS block regenerated by the script)

- [ ] **Step 1: Run the build script**

  ```bash
  node tools/build-species-icons.js
  ```

  Expected output: `Wrote 73 icons.` with exit code 0. If you see `MISSING art entries`, a slug in `regionalData` has no artwork — check `tools/species-icons-art.js` for that slug.

- [ ] **Step 2: Confirm the registry changed**

  ```bash
  git diff index.html | grep '"color"' | wc -l
  ```

  Expected: `0` (no `color` fields in the new registry).

  ```bash
  git diff index.html | grep '"svg"' | wc -l
  ```

  Expected: > 0 (svg entries are present).

- [ ] **Step 3: Commit the regenerated index.html**

  ```bash
  git add index.html
  git commit -m "regenerate SPECIES_ICONS with custom art ({svg} schema)"
  ```

---

## Task 5: Update `renderSpeciesIcon`

**Files:**
- Modify: `index.html` lines 404–413

Two changes: `viewBox="0 0 512 512"` → `viewBox="0 0 100 100"`, and remove `fill="' + icon.color + '"` from the svg element (colors are now embedded in the markup).

- [ ] **Step 1: Update the helper**

  In `index.html`, replace the `renderSpeciesIcon` function (lines 404–413):

  ```js
  // before
  function renderSpeciesIcon(key, name, sizeClass) {
          const cls = sizeClass || 'w-10 h-10';
          const icon = SPECIES_ICONS[key];
          if (!icon) {
              return '<span class="text-3xl" role="img" aria-label="' + name + '">❓</span>';
          }
          return '<svg viewBox="0 0 512 512" width="40" height="40" class="' + cls + ' inline-block align-middle" '
              + 'fill="' + icon.color + '" role="img" aria-label="' + name + '">'
              + icon.svg + '</svg>';
      }
  ```

  ```js
  // after
  function renderSpeciesIcon(key, name, sizeClass) {
          const cls = sizeClass || 'w-10 h-10';
          const icon = SPECIES_ICONS[key];
          if (!icon) {
              return '<span class="text-3xl" role="img" aria-label="' + name + '">❓</span>';
          }
          return '<svg viewBox="0 0 100 100" width="40" height="40" class="' + cls + ' inline-block align-middle" '
              + 'role="img" aria-label="' + name + '">'
              + icon.svg + '</svg>';
      }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add index.html
  git commit -m "renderSpeciesIcon: viewBox 100, remove outer fill attr"
  ```

---

## Task 6: Update `test/species-icons.test.js`

**Files:**
- Rewrite: `test/species-icons.test.js`

Six changes from the current version:
1. Test 1 stub entry: `{ svg }` only (no `color`), fill embedded in markup; assert no `fill` attr on `<svg>` element; assert `viewBox="0 0 100 100"`.
2. Test 3 well-formedness: no `color` field expected.
3. Test 4 distinctness: signature is `svg` alone.
4. Test 5 no-duplicate: signature is `svg` alone.
5. New test 6: no `#fff` / `#ffffff` fills anywhere.

- [ ] **Step 1: Write the updated test file**

  Replace the entire contents of `test/species-icons.test.js` with:

  ```js
  // Tests the species-icon registry + renderSpeciesIcon(), extracted verbatim
  // from index.html (same pattern as the other tests in this folder).
  // Run with: node test/species-icons.test.js
  const assert = require('assert');
  const fs = require('fs');
  const path = require('path');

  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // --- Extract the generated SPECIES_ICONS literal (between markers) ---
  const START = '// === SPECIES_ICONS:START';
  const sIdx = html.indexOf(START);
  assert.ok(sIdx > -1, 'SPECIES_ICONS:START marker not found');
  const constStart = html.indexOf('const SPECIES_ICONS', sIdx);
  const END = '// === SPECIES_ICONS:END';
  const eIdx = html.indexOf(END, sIdx);
  assert.ok(eIdx > -1, 'SPECIES_ICONS:END marker not found');
  const constEnd = html.lastIndexOf('};', eIdx) + 2;
  assert.ok(constStart > -1 && constEnd > constStart, 'SPECIES_ICONS literal not found');
  const registrySrc = html.slice(constStart, constEnd);

  // --- Extract renderSpeciesIcon() ---
  const fnStart = html.indexOf('function renderSpeciesIcon');
  assert.ok(fnStart > -1, 'renderSpeciesIcon not found');
  const fnEnd = html.indexOf('\n            }', fnStart) + '\n            }'.length;
  const fnSrc = html.slice(fnStart, fnEnd);

  const { SPECIES_ICONS, renderSpeciesIcon } = new Function(
    registrySrc + '\n' + fnSrc + '\nreturn { SPECIES_ICONS, renderSpeciesIcon };'
  )();

  // 1. Helper returns a well-formed, labeled <svg> with the correct viewBox and no outer fill attr.
  SPECIES_ICONS.__test__ = { svg: '<path d="M0 0h1v1z" fill="#123456"/>' };
  const out = renderSpeciesIcon('__test__', 'Test Critter');
  assert.ok(out.includes('<svg'), 'output should contain <svg');
  assert.ok(!/<svg[^>]*\sfill=/.test(out), 'svg element should not carry a fill attribute');
  assert.ok(out.includes('fill="#123456"'), 'icon markup should contain embedded fills');
  assert.ok(out.includes('aria-label="Test Critter"'), 'output should label the species');
  assert.ok(out.includes('viewBox="0 0 100 100"'), 'output should use the 100 viewBox');
  assert.ok(out.includes('width="40"') && out.includes('height="40"'), 'output should carry explicit pixel dimensions');
  assert.ok(out.includes('w-10 h-10'), 'default sizeClass applied');
  assert.ok(renderSpeciesIcon('__test__', 'Test Critter', 'w-6 h-6').includes('w-6 h-6'), 'explicit sizeClass applied');
  delete SPECIES_ICONS.__test__;

  // 2. Unknown key falls back gracefully (❓ span, still labeled)
  const fallback = renderSpeciesIcon('does-not-exist', 'Ghost');
  assert.strictEqual(typeof fallback, 'string');
  assert.ok(fallback.includes('❓'), 'fallback should show the ❓ placeholder');
  assert.ok(fallback.includes('aria-label="Ghost"'), 'fallback should still label the species');

  // 3. Every organism's icon key exists in the registry, and no emoji remain.
  const iconKeys = [...html.matchAll(/icon:\s*'([^']+)'/g)].map(m => m[1]);
  assert.strictEqual(iconKeys.length, 75, 'expected exactly 75 organism icon refs, got ' + iconKeys.length);
  for (const key of iconKeys) {
      assert.ok(/^[a-z0-9-]+$/.test(key), 'icon key should be a slug, got: ' + key);
      assert.ok(SPECIES_ICONS[key], 'no registry entry for organism icon: ' + key);
  }
  // every registry entry is well-formed: non-empty svg, no color field expected
  for (const [k, v] of Object.entries(SPECIES_ICONS)) {
      if (k === '__stub__') continue;
      assert.ok(v.svg && v.svg.length > 0, 'empty svg for ' + k);
      assert.ok(!('color' in v), 'unexpected color field on ' + k);
  }

  // 4. Look-alike groups must be visually distinct (different svg markup).
  function distinct(keys) {
      const seen = new Set();
      for (const k of keys) {
          const e = SPECIES_ICONS[k];
          assert.ok(e, 'missing ' + k);
          const sig = e.svg;
          assert.ok(!seen.has(sig), 'identical icon in group for: ' + k);
          seen.add(sig);
      }
  }
  distinct(['black-footed-ferret', 'ermine', 'stoat', 'pine-marten']);   // mustelids
  distinct(['pika', 'prairie-dog', 'marmot', 'field-vole', 'water-vole']); // small rodents
  distinct(['golden-eagle', 'crowned-eagle', 'goshawk', 'red-tailed-hawk', 'common-buzzard']); // raptors
  distinct(['garter-snake', 'rock-python', 'gaboon-viper', 'adder']);    // snakes

  // 5. No two species anywhere share the same svg markup.
  const sigs = new Map();
  for (const [k, v] of Object.entries(SPECIES_ICONS)) {
      const sig = v.svg;
      assert.ok(!sigs.has(sig), 'identical svg: ' + sigs.get(sig) + ' vs ' + k);
      sigs.set(sig, k);
  }

  // 6. No pure white (#fff / #ffffff) fills anywhere — icons sit on white cards.
  for (const [k, v] of Object.entries(SPECIES_ICONS)) {
      assert.ok(!/fill="#fff(?:fff)?"/i.test(v.svg), 'pure white fill found in icon: ' + k);
  }

  console.log('species-icons helper: OK');
  ```

- [ ] **Step 2: Run the updated tests**

  ```bash
  node test/species-icons.test.js
  ```

  Expected: `species-icons helper: OK`

- [ ] **Step 3: Commit**

  ```bash
  git add test/species-icons.test.js
  git commit -m "test: update species-icons assertions for {svg} schema"
  ```

---

## Task 7: Replace the Build Extraction Test

**Files:**
- Delete: `test/build-extract-inner.test.js`
- Create: `test/build-missing-slug.test.js`

`extractInner` no longer exists, so its test is deleted. The replacement verifies that the build script exits 1 and logs `MISSING` when a referenced organism slug has no entry in the art module.

- [ ] **Step 1: Delete the old test**

  ```bash
  git rm test/build-extract-inner.test.js
  ```

- [ ] **Step 2: Create the replacement test**

  Create `test/build-missing-slug.test.js`:

  ```js
  // Asserts that tools/build-species-icons.js exits 1 and reports MISSING
  // when an organism slug in index.html has no entry in the art module.
  // Run with: node test/build-missing-slug.test.js
  const assert = require('assert');
  const { spawnSync } = require('child_process');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  // Create a temp art stub that exports an empty object (no slugs covered).
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-test-'));
  const stubArt = path.join(tmpDir, 'stub-art.js');
  fs.writeFileSync(stubArt, 'const ICONS = {}; module.exports = ICONS;');

  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, '..', 'tools', 'build-species-icons.js')],
    { env: { ...process.env, SPECIES_ICONS_ART: stubArt }, encoding: 'utf8' }
  );

  fs.rmSync(tmpDir, { recursive: true });

  assert.strictEqual(result.status, 1, 'build should exit 1 when slugs are missing; got ' + result.status);
  assert.ok(result.stderr.includes('MISSING'), 'build should print MISSING to stderr; got: ' + result.stderr);

  console.log('build-missing-slug: OK');
  ```

- [ ] **Step 3: Run the new test**

  ```bash
  node test/build-missing-slug.test.js
  ```

  Expected: `build-missing-slug: OK`

- [ ] **Step 4: Commit**

  ```bash
  git add test/build-missing-slug.test.js
  git commit -m "test: replace build-extract-inner with build-missing-slug test"
  ```

---

## Task 8: Delete Obsolete Files

**Files:**
- Delete: `tools/species-icon-map.json`

- [ ] **Step 1: Remove the old slug-to-icon map**

  ```bash
  git rm tools/species-icon-map.json
  ```

- [ ] **Step 2: Commit**

  ```bash
  git commit -m "remove tools/species-icon-map.json (superseded by species-icons-art.js)"
  ```

---

## Task 9: Remove Game-Icons Attribution

**Files:**
- Modify: `index.html` line 8 (HTML comment)
- Modify: `index.html` lines 1279–1281 (field guide footer)

- [ ] **Step 1: Update the HTML source comment**

  In `index.html`, replace line 8:

  ```html
  <!-- before -->
      <!-- Species icons from game-icons.net (CC BY 3.0). Authors: caro-asercion, cathelineau, delapouite, lorc. -->

  <!-- after -->
      <!-- Species icons are original artwork created for this project. -->
  ```

- [ ] **Step 2: Remove the field guide footer**

  In `index.html`, remove the three lines appended to the `showFieldGuide` innerHTML (lines 1279–1281 in the original). The assignment should end with the `.join('')` call and no appended `<p>`:

  ```js
  // before
  document.getElementById('field-guide-content').innerHTML = data.organisms.map(o => `
      <div class="border-b pb-4">
          ${renderSpeciesIcon(o.icon, o.name)} <strong class="handwritten text-3xl">${o.name}</strong>
          <p class="italic text-stone-600">${o.notes}</p>
      </div>`).join('')
      + `<p class="text-xs text-stone-500 mt-4">Species icons from
         <a href="https://game-icons.net" target="_blank" rel="noopener" class="underline">game-icons.net</a>
         (<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener" class="underline">CC BY 3.0</a>).</p>`;

  // after
  document.getElementById('field-guide-content').innerHTML = data.organisms.map(o => `
      <div class="border-b pb-4">
          ${renderSpeciesIcon(o.icon, o.name)} <strong class="handwritten text-3xl">${o.name}</strong>
          <p class="italic text-stone-600">${o.notes}</p>
      </div>`).join('');
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add index.html
  git commit -m "remove game-icons.net attribution (original artwork)"
  ```

---

## Task 10: Final Verification

**Files:** No changes — read-only verification.

- [ ] **Step 1: Run the full test suite**

  ```bash
  node test/species-icons.test.js && \
  node test/build-missing-slug.test.js && \
  node test/png-metadata.test.js && \
  node test/integration-glue.test.js
  ```

  Expected: all four print `OK` and exit 0.

- [ ] **Step 2: Verify build idempotency**

  ```bash
  node tools/build-species-icons.js
  git diff index.html
  ```

  Expected: `Wrote 73 icons.` and no diff (running the build a second time produces an identical result).

- [ ] **Step 3: Browser QA**

  Open `index.html` locally (or the GitHub Pages `/staging/` URL) and verify:
  - Species pool: multi-color icons visible for all 5 species in every habitat.
  - Field guide modal: same icons appear in the field guide, no game-icons.net footer.
  - Zero ❓ fallback icons.
  - Zero console errors.
  - Download Certificate still produces a valid PNG (icons don't appear in the certificate, but the download must succeed).

- [ ] **Step 4: File size check**

  ```bash
  wc -c index.html
  ```

  Expected: under ~256 000 bytes (~250 KB budget). The custom art markup is ~58 KB — comparable to the old single-color registry.
