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

test('producer: name first, label-verbatim headings, bodies verbatim', () => {
    assert.deepStrictEqual(o.buildSpeakParts('fern', 'Highland Ferns'), [
        { text: 'Highland Ferns.' },
        { text: 'Where it lives.', heading: true }, { text: 'HAB-TEXT' },
        { text: 'How it gets energy.', heading: true }, { text: 'ENERGY-TEXT' },
        { text: 'What eats it.', heading: true }, { text: 'EATEN-TEXT' }
    ]);
});

test('consumer: eats-label variant', () => {
    const parts = o.buildSpeakParts('chimp', 'Chimpanzee');
    assert.strictEqual(parts[3].text, 'What it eats.');
    assert.strictEqual(parts[3].heading, true);
});

// Speech must mirror the on-screen <dt> labels: question phrasing ("Where does it
// live?") made every voice mispronounce sentence-final "live" as live-as-in-alive.
test('headings mirror the on-screen section labels', () => {
    const headings = o.buildSpeakParts('fern', 'X').concat(o.buildSpeakParts('chimp', 'Y'))
        .filter(p => p.heading).map(p => p.text);
    assert.deepStrictEqual(headings, [
        'Where it lives.', 'How it gets energy.', 'What eats it.',
        'Where it lives.', 'What it eats.', 'What eats it.'
    ]);
});

test('unknown species returns null', () => {
    assert.strictEqual(o.buildSpeakParts('nope', 'Ghost'), null);
});

// --- Prosody: the shipped source must use a gentle 1.1 heading pitch, old rate dip intact ---
test('heading pitch is a gentle 1.1 lift', () => {
    assert.ok(/u\.pitch = p\.heading \? 1\.1 : 1\.0;/.test(html),
        'expected `u.pitch = p.heading ? 1.1 : 1.0;` in index.html');
});

test('heading rate dip is unchanged', () => {
    assert.ok(/u\.rate = p\.heading \? Math\.max\(0\.6, rate - 0\.1\) : rate;/.test(html),
        'expected the Math.max(0.6, rate - 0.1) heading rate dip to remain');
});

console.log('read-aloud-speech: ' + passed + ' tests OK');
