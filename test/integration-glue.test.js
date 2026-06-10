// Integration test: exercises the ACTUAL helper functions extracted verbatim from
// index.html through the same glue the browser runs in downloadCertificate() and
// importJournal(). Proves the dataURL/atob/base64 plumbing — not just the byte logic.
//
// Run with: node test/integration-glue.test.js

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// --- Extract the real helper block from index.html and evaluate it ---
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf("const CERT_METADATA_KEYWORD");
const endMarker = "const b64ToJson = ";
const endIdx = html.indexOf("};", html.indexOf(endMarker)) + 2;
assert.ok(start > -1 && endIdx > start, 'could not locate helper block in index.html');
const helperSrc = html.slice(start, endIdx);

const sandbox = {};
// Expose the consts on `sandbox` by evaluating in a function that returns them.
const factory = new Function(
    helperSrc + '\nreturn { CERT_METADATA_KEYWORD, crc32, buildTextChunk, embedPngMetadata, readPngMetadata, jsonToB64, b64ToJson };'
);
const H = factory();

// --- Build a guaranteed-valid 1x1 RGBA PNG (independent oracle) ---
function oracleChunk(type, data) {
    const typeBytes = Buffer.from(type, 'latin1');
    const body = Buffer.concat([typeBytes, Buffer.from(data)]);
    const crc = zlib.crc32(body) >>> 0;
    const len = data.length;
    return Buffer.concat([
        Buffer.from([(len >>> 24) & 0xFF, (len >>> 16) & 0xFF, (len >>> 8) & 0xFF, len & 0xFF]),
        typeBytes, Buffer.from(data),
        Buffer.from([(crc >>> 24) & 0xFF, (crc >>> 16) & 0xFF, (crc >>> 8) & 0xFF, crc & 0xFF]),
    ]);
}
function makeBasePng() {
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = oracleChunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
    const idat = oracleChunk('IDAT', zlib.deflateSync(Buffer.from([0, 255, 128, 64, 255])));
    const iend = oracleChunk('IEND', []);
    return Buffer.concat([sig, ihdr, idat, iend]);
}

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok - ' + name); }

// Simulate canvas.toDataURL('image/png') for our base PNG.
function fakeToDataURL(pngBuffer) {
    return 'data:image/png;base64,' + pngBuffer.toString('base64');
}

const progress = {
    version: '2.1.1',
    userName: 'José "Eagle" Náturalist 🦅',
    globalProgress: {
        na: { completed: ['forest', 'plains', 'alpine', 'wetland', 'desert'], habitatsState: { forest: { connections: [[0, 2], [2, 4]], placements: { wolf: 3, hawk: 4 } } } },
        africa: { completed: ['savanna'] },
    },
};

test('downloadCertificate glue: dataURL -> bytes -> embed produces a valid PNG carrying progress', () => {
    // ---- exact glue from downloadCertificate() ----
    const name = progress.userName;
    const payload = H.jsonToB64({ version: '2.1.1', userName: name, globalProgress: progress.globalProgress });
    const dataUrl = fakeToDataURL(makeBasePng());
    const binary = atob(dataUrl.split(',')[1]);
    const pngBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) pngBytes[i] = binary.charCodeAt(i);
    const withMeta = H.embedPngMetadata(pngBytes, H.CERT_METADATA_KEYWORD, payload);
    // ---- end glue ----

    // Validate every chunk CRC via the independent oracle.
    let pos = 8; const types = [];
    while (pos < withMeta.length) {
        const len = ((withMeta[pos] << 24) | (withMeta[pos + 1] << 16) | (withMeta[pos + 2] << 8) | withMeta[pos + 3]) >>> 0;
        const bodyBuf = Buffer.from(withMeta.subarray(pos + 4, pos + 8 + len));
        const type = bodyBuf.subarray(0, 4).toString('latin1');
        const storedCrc = ((withMeta[pos + 8 + len] << 24) | (withMeta[pos + 9 + len] << 16) | (withMeta[pos + 10 + len] << 8) | withMeta[pos + 11 + len]) >>> 0;
        assert.strictEqual(storedCrc, zlib.crc32(bodyBuf) >>> 0, 'CRC mismatch in ' + type);
        types.push(type);
        pos += 12 + len;
    }
    assert.deepStrictEqual(types, ['IHDR', 'IDAT', 'tEXt', 'IEND']);
    global.__withMeta = withMeta; // hand off to the import test
});

test('importJournal glue: re-uploaded PNG bytes restore the exact progress', () => {
    // ---- exact glue from importJournal() PNG branch (input is the ArrayBuffer-equivalent) ----
    const bytes = new Uint8Array(global.__withMeta);
    const meta = H.readPngMetadata(bytes, H.CERT_METADATA_KEYWORD);
    assert.ok(meta, 'metadata must be present in re-uploaded certificate');
    const data = H.b64ToJson(meta);
    // ---- end glue ----
    assert.ok(data.globalProgress, 'restored data must contain globalProgress');
    assert.strictEqual(data.userName, progress.userName);
    assert.deepStrictEqual(data.globalProgress, progress.globalProgress);
});

test('importJournal glue: a plain PNG with no metadata yields null (handled as error)', () => {
    const plain = new Uint8Array(makeBasePng());
    assert.strictEqual(H.readPngMetadata(plain, H.CERT_METADATA_KEYWORD), null);
});

console.log('\n' + passed + ' integration tests passed.');
