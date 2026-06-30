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
assert.strictEqual(iconKeys.length, 90, 'expected exactly 90 organism icon refs, got ' + iconKeys.length);
for (const key of iconKeys) {
    assert.ok(/^[a-z0-9-]+$/.test(key), 'icon key should be a slug, got: ' + key);
    assert.ok(SPECIES_ICONS[key], 'no registry entry for organism icon: ' + key);
}
// every registry entry is well-formed: non-empty svg, no color field expected
for (const [k, v] of Object.entries(SPECIES_ICONS)) {
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
distinct(['black-footed-ferret', 'ermine', 'stoat', 'pine-marten', 'least-weasel']);   // mustelids
distinct(['pika', 'prairie-dog', 'marmot', 'field-vole', 'water-vole']); // small rodents
distinct(['golden-eagle', 'crowned-eagle', 'goshawk', 'red-tailed-hawk', 'common-buzzard', 'hen-harrier']); // raptors
distinct(['garter-snake', 'rock-python', 'gaboon-viper', 'adder']);    // snakes
distinct(['red-fox', 'gray-fox']);                                     // foxes
distinct(['striped-hyena', 'spotted-hyena']);                          // hyenas
distinct(['capercaillie', 'red-grouse', 'white-tailed-ptarmigan']);    // game birds
distinct(['brown-trout', 'longnose-dace']);                            // fish
distinct(['shore-crab', 'fiddler-crab']);                              // crabs
distinct(['kelp', 'algae', 'sea-lettuce']);                            // seaweeds/algae

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
