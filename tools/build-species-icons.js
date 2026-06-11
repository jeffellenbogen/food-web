// Generates the SPECIES_ICONS literal inside index.html from tools/species-icons-art.js.
// Run: node tools/build-species-icons.js
const fs = require('fs');
const path = require('path');

const ART_PATH = process.env.SPECIES_ICONS_ART
  ? path.resolve(process.env.SPECIES_ICONS_ART)
  : path.join(__dirname, 'species-icons-art.js');
const HTML_PATH = path.join(__dirname, '..', 'index.html');
const START = '// === SPECIES_ICONS:START';
const END = '// === SPECIES_ICONS:END ===';

function build() {
  const art = require(ART_PATH);
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  const slugs = [...html.matchAll(/icon:\s*'([^']+)'/g)].map(m => m[1]);
  const unique = [...new Set(slugs)];

  const missing = unique.filter(s => !art[s]);
  if (missing.length) {
    console.error('MISSING art entries for these organism slugs:\n  ' + missing.join('\n  '));
    process.exit(1);
  }

  const registry = {};
  for (const slug of unique) {
    registry[slug] = { svg: art[slug] };
  }

  const literal = 'const SPECIES_ICONS = ' + JSON.stringify(registry, null, 2) + ';';
  const sLine = html.indexOf(START);
  const eLine = html.indexOf(END);
  if (sLine < 0 || eLine < 0) throw new Error('SPECIES_ICONS markers not found in index.html');
  const sEnd = html.indexOf('\n', sLine) + 1;
  if (sEnd === 0) throw new Error('No newline found after SPECIES_ICONS:START marker');
  const updated = html.slice(0, sEnd) + literal + '\n' + html.slice(eLine);
  fs.writeFileSync(HTML_PATH, updated);
  console.log('Wrote ' + Object.keys(registry).length + ' icons.');
}

if (require.main === module) build();
