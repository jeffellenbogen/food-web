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
