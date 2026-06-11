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
