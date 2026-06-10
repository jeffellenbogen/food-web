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
const constEnd = html.indexOf('};', constStart) + 2;
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
delete SPECIES_ICONS.__test__;

// 2. Unknown key falls back gracefully (no throw, returns a string)
assert.strictEqual(typeof renderSpeciesIcon('does-not-exist', 'Ghost'), 'string');

console.log('species-icons helper: OK');
