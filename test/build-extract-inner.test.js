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

console.log('extractInner: OK');
