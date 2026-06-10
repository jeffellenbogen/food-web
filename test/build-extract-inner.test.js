// Run with: node test/build-extract-inner.test.js
const assert = require('assert');
const { extractInner } = require('../tools/build-species-icons.js');

const raw = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
          + '<path d="M0 0h512v512H0z" fill="#000"/>'
          + '<path d="M256 32 480 480H32z" fill="#fff"/></svg>';
const inner = extractInner(raw);

assert.ok(!inner.includes('<svg'), 'should drop the outer <svg>');
assert.ok(!inner.includes('M0 0h512v512H0z'), 'should drop the full-canvas background path');
assert.ok(inner.includes('M256 32 480 480H32z'), 'should keep the foreground path');
assert.ok(!/fill=/.test(inner), 'should strip hardcoded fills so the helper controls color');

// Background-path variants: whitespace/comma-separated tokens, and explicit </path> close tag
const rawSpaced = '<svg viewBox="0 0 512 512">'
                + '<path d="M0 0 h512 v512 H0 z" fill="#000"></path>'
                + '<path d="M256 32 480 480H32z"/></svg>';
const innerSpaced = extractInner(rawSpaced);
assert.ok(!innerSpaced.includes('h512'), 'should drop whitespace-variant background path');
assert.ok(!innerSpaced.includes('</path>'), 'should not leave an orphan close tag');
assert.ok(innerSpaced.includes('M256 32 480 480H32z'), 'should keep the foreground path (variant fixture)');

console.log('extractInner: OK');
