// Test for PNG tEXt-chunk metadata embed/extract used by the certificate feature.
// Run with: node test/png-metadata.test.js
//
// The functions under test (crc32, buildTextChunk, embedPngMetadata,
// readPngMetadata, jsonToB64, b64ToJson) are written exactly as they are
// ported into index.html so this test proves the in-browser logic.
//
// zlib.crc32 (Node) is used ONLY as an independent oracle to (a) build a
// guaranteed-valid base PNG and (b) cross-check our hand-rolled crc32.

const assert = require('assert');
const zlib = require('zlib');

// ---------------------------------------------------------------------------
// Functions under test (identical to the browser implementation)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
    const t = new Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
function buildTextChunk(keyword, text) {
    const data = [];
    for (let i = 0; i < keyword.length; i++) data.push(keyword.charCodeAt(i) & 0xFF);
    data.push(0);
    for (let i = 0; i < text.length; i++) data.push(text.charCodeAt(i) & 0xFF);
    const type = [0x74, 0x45, 0x58, 0x74]; // "tEXt"
    const crc = crc32(Uint8Array.from(type.concat(data)));
    const len = data.length;
    const chunk = [
        (len >>> 24) & 0xFF, (len >>> 16) & 0xFF, (len >>> 8) & 0xFF, len & 0xFF,
        ...type, ...data,
        (crc >>> 24) & 0xFF, (crc >>> 16) & 0xFF, (crc >>> 8) & 0xFF, crc & 0xFF
    ];
    return Uint8Array.from(chunk);
}
function embedPngMetadata(pngBytes, keyword, text) {
    const chunk = buildTextChunk(keyword, text);
    const insertAt = pngBytes.length - 12; // IEND is always the final 12 bytes
    const out = new Uint8Array(pngBytes.length + chunk.length);
    out.set(pngBytes.subarray(0, insertAt), 0);
    out.set(chunk, insertAt);
    out.set(pngBytes.subarray(insertAt), insertAt + chunk.length);
    return out;
}
function readPngMetadata(bytes, keyword) {
    let pos = 8; // skip 8-byte PNG signature
    while (pos + 8 <= bytes.length) {
        const len = ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
        const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
        const dataStart = pos + 8;
        if (type === 'tEXt') {
            let z = dataStart;
            const dataEnd = dataStart + len;
            while (z < dataEnd && bytes[z] !== 0) z++;
            let kw = '';
            for (let i = dataStart; i < z; i++) kw += String.fromCharCode(bytes[i]);
            if (kw === keyword) {
                let txt = '';
                for (let i = z + 1; i < dataEnd; i++) txt += String.fromCharCode(bytes[i]);
                return txt;
            }
        }
        if (type === 'IEND') break;
        pos = dataStart + len + 4; // advance past data + 4-byte CRC
    }
    return null;
}
function jsonToB64(obj) {
    const utf8 = new TextEncoder().encode(JSON.stringify(obj));
    let binary = '';
    for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
    return btoa(binary);
}
function b64ToJson(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
}

// ---------------------------------------------------------------------------
// Test helpers (independent oracle — NOT under test)
// ---------------------------------------------------------------------------
function oracleChunk(type, data) {
    const typeBytes = Buffer.from(type, 'latin1');
    const body = Buffer.concat([typeBytes, Buffer.from(data)]);
    const crc = zlib.crc32(body) >>> 0;
    const len = data.length;
    const lenBuf = Buffer.from([(len >>> 24) & 0xFF, (len >>> 16) & 0xFF, (len >>> 8) & 0xFF, len & 0xFF]);
    const crcBuf = Buffer.from([(crc >>> 24) & 0xFF, (crc >>> 16) & 0xFF, (crc >>> 8) & 0xFF, crc & 0xFF]);
    return Buffer.concat([lenBuf, typeBytes, Buffer.from(data), crcBuf]);
}
// Build a guaranteed-valid 1x1 RGBA PNG with an independent implementation.
function makeBasePng() {
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = oracleChunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
    const raw = Buffer.from([0, 255, 128, 64, 255]); // filter byte + RGBA pixel
    const idat = oracleChunk('IDAT', zlib.deflateSync(raw));
    const iend = oracleChunk('IEND', []);
    return new Uint8Array(Buffer.concat([sig, ihdr, idat, iend]));
}
// Validate that EVERY chunk's CRC verifies via the independent oracle, the
// signature is intact, and IEND is the final chunk. Returns chunk type list.
function validatePng(bytes) {
    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) assert.strictEqual(bytes[i], sig[i], 'PNG signature byte ' + i);
    const types = [];
    let pos = 8;
    while (pos < bytes.length) {
        const len = ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
        const body = Buffer.from(bytes.subarray(pos + 4, pos + 8 + len)); // type + data
        const type = body.subarray(0, 4).toString('latin1');
        const storedCrc = ((bytes[pos + 8 + len] << 24) | (bytes[pos + 9 + len] << 16) | (bytes[pos + 10 + len] << 8) | bytes[pos + 11 + len]) >>> 0;
        const calcCrc = zlib.crc32(body) >>> 0;
        assert.strictEqual(storedCrc, calcCrc, 'CRC mismatch for chunk ' + type);
        types.push(type);
        pos += 12 + len;
    }
    assert.strictEqual(types[types.length - 1], 'IEND', 'IEND must be the final chunk');
    assert.strictEqual(pos, bytes.length, 'no trailing bytes after IEND');
    return types;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok - ' + name); }

const KEYWORD = 'foodweb-progress';

test('crc32 matches zlib.crc32 oracle on varied inputs', () => {
    const samples = [
        Uint8Array.from([]),
        Uint8Array.from([0]),
        Uint8Array.from([0x74, 0x45, 0x58, 0x74]),
        Uint8Array.from(Array.from({ length: 300 }, (_, i) => (i * 7 + 3) & 0xFF)),
    ];
    for (const s of samples) {
        assert.strictEqual(crc32(s), zlib.crc32(Buffer.from(s)) >>> 0, 'crc32 differs from oracle');
    }
});

test('jsonToB64 / b64ToJson round-trips including Unicode', () => {
    const obj = { version: '2.1.1', userName: 'Zoë Náturalist 🦊', globalProgress: { na: { completed: ['forest', 'plains'] } } };
    const restored = b64ToJson(jsonToB64(obj));
    assert.deepStrictEqual(restored, obj);
    // base64 payload must be pure ASCII (safe inside a Latin-1 tEXt chunk)
    assert.ok(/^[A-Za-z0-9+/=]*$/.test(jsonToB64(obj)), 'base64 payload not pure ASCII');
});

test('base PNG built by oracle is valid', () => {
    const base = makeBasePng();
    assert.deepStrictEqual(validatePng(base), ['IHDR', 'IDAT', 'IEND']);
    assert.strictEqual(readPngMetadata(base, KEYWORD), null, 'base PNG should have no metadata');
});

test('embedPngMetadata produces a valid PNG with the tEXt chunk before IEND', () => {
    const base = makeBasePng();
    const payload = jsonToB64({ version: '2.1.1', userName: 'Ada', globalProgress: { na: { completed: ['x'] } } });
    const out = embedPngMetadata(base, KEYWORD, payload);
    const types = validatePng(out); // every chunk CRC (incl. ours) verifies via oracle
    assert.deepStrictEqual(types, ['IHDR', 'IDAT', 'tEXt', 'IEND'], 'tEXt must sit before IEND');
    assert.strictEqual(out.length, base.length + payload.length + KEYWORD.length + 1 + 12);
});

test('full round-trip: embed game progress then read it back', () => {
    const progress = {
        version: '2.1.1',
        userName: 'Zoë Náturalist 🦊',
        globalProgress: {
            na: { completed: ['forest', 'plains', 'alpine'], habitatsState: { forest: { connections: [[0, 1]], placements: { wolf: 3 } } } },
            africa: { completed: [] },
        },
    };
    const base = makeBasePng();
    const out = embedPngMetadata(base, KEYWORD, jsonToB64(progress));
    validatePng(out);
    const recovered = b64ToJson(readPngMetadata(out, KEYWORD));
    assert.deepStrictEqual(recovered, progress, 'recovered progress must equal original');
});

test('readPngMetadata returns null when keyword is absent', () => {
    const out = embedPngMetadata(makeBasePng(), KEYWORD, jsonToB64({ a: 1 }));
    assert.strictEqual(readPngMetadata(out, 'some-other-keyword'), null);
});

console.log('\n' + passed + ' tests passed.');
