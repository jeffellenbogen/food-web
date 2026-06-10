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
// closing brace of the function: find the first '\n            }' at the helper indent
const fnEnd = html.indexOf('\n            }', fnStart) + '\n            }'.length;
const fnSrc = html.slice(fnStart, fnEnd);

const { SPECIES_ICONS, renderSpeciesIcon } = new Function(
  registrySrc + '\n' + fnSrc + '\nreturn { SPECIES_ICONS, renderSpeciesIcon };'
)();

// 1. Helper returns a well-formed, colored, labeled <svg>
SPECIES_ICONS.__test__ = { svg: '<path d="M0 0h1v1z"/>', color: '#123456', credit: 'tester' };
const out = renderSpeciesIcon('__test__', 'Test Critter');
assert.ok(out.includes('<svg'), 'output should contain <svg');
assert.ok(out.includes('#123456'), 'output should apply the color');
assert.ok(out.includes('aria-label="Test Critter"'), 'output should label the species');
assert.ok(out.includes('viewBox="0 0 512 512"'), 'output should use the 512 viewBox');
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
assert.ok(iconKeys.length >= 70, 'expected ~75 organism icon refs, got ' + iconKeys.length);
for (const key of iconKeys) {
    assert.ok(/^[a-z0-9-]+$/.test(key), 'icon key should be a slug, got: ' + key);
    assert.ok(SPECIES_ICONS[key], 'no registry entry for organism icon: ' + key);
}
// every registry entry is well-formed
for (const [k, v] of Object.entries(SPECIES_ICONS)) {
    if (k === '__stub__') continue;
    assert.ok(v.svg && v.svg.length > 0, 'empty svg for ' + k);
    assert.ok(/^#[0-9a-fA-F]{6}$/.test(v.color), 'bad color for ' + k);
}

// 4. Look-alike groups must be visually distinct (different svg OR different color).
function distinct(keys) {
    const seen = new Set();
    for (const k of keys) {
        const e = SPECIES_ICONS[k];
        assert.ok(e, 'missing ' + k);
        const sig = e.svg + '|' + e.color;
        assert.ok(!seen.has(sig), 'identical icon+color in group for: ' + k);
        seen.add(sig);
    }
}
distinct(['black-footed-ferret', 'ermine', 'stoat', 'pine-marten']);   // mustelids
distinct(['pika', 'prairie-dog', 'marmot', 'field-vole', 'water-vole']); // small rodents
distinct(['golden-eagle', 'crowned-eagle', 'goshawk', 'red-tailed-hawk', 'common-buzzard']); // raptors
distinct(['garter-snake', 'rock-python', 'gaboon-viper', 'adder']);    // snakes

// 5. No two species anywhere share both svg and color.
const sigs = new Map();
for (const [k, v] of Object.entries(SPECIES_ICONS)) {
    const sig = v.svg + '|' + v.color;
    assert.ok(!sigs.has(sig), 'identical icon+color: ' + sigs.get(sig) + ' vs ' + k);
    sigs.set(sig, k);
}

console.log('species-icons helper: OK');
