// Generates the SPECIES_ICONS literal inside index.html from
// tools/species-icon-map.json + a local clone of github.com/game-icons/icons.
//
// Setup (once):  git clone --depth 1 https://github.com/game-icons/icons tools/game-icons
// Run:           node tools/build-species-icons.js
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ICONS_REPO = path.join(__dirname, 'game-icons');
const MAP_PATH = path.join(__dirname, 'species-icon-map.json');
const HTML_PATH = path.join(__dirname, '..', 'index.html');
const START = '// === SPECIES_ICONS:START';
const END = '// === SPECIES_ICONS:END ===';

function extractInner(raw) {
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '');
  const noBg = inner
    .replace(/<path[^>]*d=("|')M0[\s,]+0[\s,]*h512[\s,]*v512[\s,]*H0[\s,]*z\1[^>]*(?:\/>|><\/path>|>)/g, '')
    .replace(/<rect[^>]*\/?>/g, '');
  return noBg.replace(/\s+fill=("|')[^"']*\1/g, '').trim();
}

function findIconSvg(slug) {
  let matches = [];
  try {
    matches = cp.execSync(
      'find ' + JSON.stringify(ICONS_REPO) + ' -type f -name ' + JSON.stringify(slug + '.svg'),
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);
  } catch (e) { /* find returns non-zero only on error; empty result is fine */ }
  if (!matches.length) return null;
  const file = matches[0];
  if (matches.length > 1) console.warn('  [warn] multiple files for slug "' + slug + '", using: ' + file);
  return { svg: extractInner(fs.readFileSync(file, 'utf8')), author: path.basename(path.dirname(file)) };
}

function build() {
  if (!fs.existsSync(ICONS_REPO)) {
    console.error('Missing ' + ICONS_REPO + '. Run:\n  git clone --depth 1 https://github.com/game-icons/icons tools/game-icons');
    process.exit(2);
  }
  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const registry = {};
  const authors = {};
  const missing = [];
  for (const [species, entry] of Object.entries(map)) {
    const found = findIconSvg(entry.gameIcon);
    if (!found) { missing.push(species + ' -> ' + entry.gameIcon); continue; }
    registry[species] = { svg: found.svg, color: entry.color, credit: found.author };
    authors[found.author] = true;
  }
  if (missing.length) {
    console.error('MISSING icons (pick a different slug in species-icon-map.json):\n  ' + missing.join('\n  '));
    process.exit(1);
  }
  const literal = 'const SPECIES_ICONS = ' + JSON.stringify(registry, null, 2) + ';';
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const sLine = html.indexOf(START);
  const eLine = html.indexOf(END);
  if (sLine < 0 || eLine < 0) throw new Error('SPECIES_ICONS markers not found in index.html');
  const sEnd = html.indexOf('\n', sLine) + 1;            // start of line after START marker
  if (sEnd === 0) throw new Error('No newline found after SPECIES_ICONS:START marker');
  const updated = html.slice(0, sEnd) + literal + '\n' + html.slice(eLine);
  fs.writeFileSync(HTML_PATH, updated);
  console.log('Wrote ' + Object.keys(registry).length + ' icons.');
  console.log('Authors (for attribution): ' + Object.keys(authors).sort().join(', '));
}

module.exports = { extractInner, findIconSvg };
if (require.main === module) build();
