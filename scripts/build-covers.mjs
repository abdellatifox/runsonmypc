/**
 * Generates the site's own cover art as SVG.
 *
 * Why generated rather than sourced: blog posts here are about hardware and
 * tooling, not about a specific game, so there is no authentic photograph to
 * use. The previous implementation pointed every post at
 * a `cdn.` subdomain that was never set up, so all fifteen rendered
 * as broken images. Pulling SteamGridDB "hero" assets instead was rejected —
 * those are unreviewed gameplay screenshots and this project has a hard rule
 * against shipping imagery we have not checked.
 *
 * These covers are deterministic, ~2KB each, need no external request, and
 * carry the article's own title, so they degrade gracefully and stay on brand.
 *
 *   node scripts/build-covers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'covers');

const fallback = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'lib', 'fallback-data.json'), 'utf8')
);

const W = 1200, H = 630;

/** Per-category accent so a category is recognisable at thumbnail size. */
const THEMES = {
  hardware:     { a: '#B6FF00', b: '#5c8a00', label: 'Hardware' },
  optimization: { a: '#5BC8FF', b: '#1f5f85', label: 'Optimization' },
  guides:       { a: '#FFC850', b: '#8a6410', label: 'Guides' },
  builds:       { a: '#C77DFF', b: '#5f3a85', label: 'Builds' },
  news:         { a: '#7FE98A', b: '#2f7a3a', label: 'News' },
  default:      { a: '#B6FF00', b: '#5c8a00', label: 'Article' }
};

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Break a title into lines that fit the art board at the given size. */
function wrap(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = next;
    if (lines.length === maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (words.join(' ').length > lines.join(' ').length) {
      lines[maxLines - 1] = last.replace(/[\s,;:.-]*\S*$/, '') + '…';
    }
  }
  return lines;
}

/** Deterministic angle so each slug gets its own, stable, composition. */
function hashOf(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function cover({ title, category, kicker, slug }) {
  const t = THEMES[String(category || '').toLowerCase()] ?? THEMES.default;
  const h = hashOf(slug || title);
  const rot = (h % 24) - 12;
  const cx = 880 + (h % 90);
  const cy = 150 + (h % 70);

  const lines = wrap(title, 26, 3);
  const fontSize = lines.length >= 3 ? 62 : lines.length === 2 ? 70 : 78;
  const startY = H / 2 - ((lines.length - 1) * (fontSize + 12)) / 2 + 18;

  const tspans = lines.map((l, i) =>
    `<tspan x="80" y="${Math.round(startY + i * (fontSize + 12))}">${esc(l)}</tspan>`
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0F1320"/>
      <stop offset="1" stop-color="#070810"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${t.a}" stop-opacity="0.42"/>
      <stop offset="1" stop-color="${t.a}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.a}"/>
      <stop offset="1" stop-color="${t.b}"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="330" fill="url(#glow)"/>

  <!-- Angled rule set, echoing the site's accent lines -->
  <g transform="rotate(${rot} ${W - 210} ${H - 120})" opacity="0.5">
    ${[0, 1, 2, 3, 4].map(i =>
      `<rect x="${W - 330 + i * 34}" y="${H - 340}" width="8" height="460" rx="4" fill="${t.a}" opacity="${0.10 + i * 0.055}"/>`
    ).join('\n    ')}
  </g>

  <rect x="0" y="0" width="${W}" height="6" fill="url(#bar)"/>

  <g font-family="Segoe UI, system-ui, -apple-system, Helvetica, Arial, sans-serif">
    <text x="80" y="118" font-size="26" font-weight="700" letter-spacing="4" fill="${t.a}">
      ${esc((kicker || t.label).toUpperCase())}
    </text>
    <text font-size="${fontSize}" font-weight="800" fill="#F2F5F9" letter-spacing="-1">${tspans}</text>
    <text x="80" y="${H - 62}" font-size="27" font-weight="600" fill="#7E8796">
      PCGameFit<tspan fill="${t.a}">.com</tspan>
    </text>
  </g>
</svg>`;
}

/**
 * Banner variant: same visual language, no title text.
 *
 * On a card or an article header the title is already displayed right beside
 * the image, so baking it into the artwork as well printed it twice and made
 * every card needlessly tall. The titled version is kept for og:image, where
 * the text is the whole point.
 */
function banner({ category, kicker, slug }) {
  const t = THEMES[String(category || '').toLowerCase()] ?? THEMES.default;
  const h = hashOf(slug || kicker || '');
  const rot = (h % 26) - 13;
  const cx = 300 + (h % 620);
  const W2 = 1200, H2 = 420;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}" viewBox="0 0 ${W2} ${H2}" role="presentation">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0F1320"/><stop offset="1" stop-color="#070810"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${t.a}" stop-opacity="0.4"/>
      <stop offset="1" stop-color="${t.a}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W2}" height="${H2}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${100 + (h % 120)}" r="250" fill="url(#glow)"/>
  <g transform="rotate(${rot} 600 210)" opacity="0.55">
    ${[0,1,2,3,4,5,6].map(i =>
      `<rect x="${120 + i * 150}" y="-90" width="7" height="600" rx="3.5" fill="${t.a}" opacity="${0.06 + (i % 4) * 0.05}"/>`
    ).join('')}
  </g>
  <rect x="0" y="0" width="${W2}" height="5" fill="${t.a}"/>
</svg>`;
}

/** The share card used by any page that has no image of its own. */
function brandCard() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="PCGameFit">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#121A0B"/>
      <stop offset="1" stop-color="#070810"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#B6FF00" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#B6FF00" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="930" cy="170" r="360" fill="url(#glow)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="#B6FF00"/>
  <g font-family="Segoe UI, system-ui, -apple-system, Helvetica, Arial, sans-serif">
    <text x="80" y="126" font-size="26" font-weight="700" letter-spacing="4" fill="#B6FF00">FREE · INSTANT · NO DOWNLOAD</text>
    <text x="80" y="286" font-size="86" font-weight="800" fill="#F2F5F9" letter-spacing="-2">Can your PC</text>
    <text x="80" y="382" font-size="86" font-weight="800" fill="#B6FF00" letter-spacing="-2">run that game?</text>
    <text x="80" y="470" font-size="30" fill="#98A1AE">Publisher-stated requirements, checked against your parts.</text>
    <text x="80" y="${H - 62}" font-size="27" font-weight="600" fill="#7E8796">PCGameFit<tspan fill="#B6FF00">.com</tspan></text>
  </g>
</svg>`;
}

// ---------------------------------------------------------------- write

fs.mkdirSync(OUT, { recursive: true });

let n = 0;
for (const post of fallback.blog) {
  const svg = cover({
    title: post.title,
    category: post.category,
    kicker: post.category,
    slug: post.slug
  });
  fs.writeFileSync(path.join(OUT, `${post.slug}.svg`), svg);
  fs.writeFileSync(
    path.join(OUT, `${post.slug}-thumb.svg`),
    banner({ category: post.category, kicker: post.category, slug: post.slug })
  );
  n++;
}

fs.writeFileSync(path.join(OUT, 'default.svg'), brandCard());

/*
 * Section cards. Thirty-one pages were sharing the same generic brand image,
 * so a link to the bottleneck calculator and a link to the CPU database looked
 * identical in a preview. Each hub and tool gets a card naming what it is.
 */
const PAGE_CARDS = [
  ['tools',            'Toolkit',    'Every PC gaming tool, free'],
  ['games',            'Games',      'PC system requirements database'],
  ['gpus',             'Hardware',   'GPU database, ranked'],
  ['cpus',             'Hardware',   'CPU database, ranked'],
  ['gpu-tier-list',    'Tier list',  'Every graphics card ranked S to F'],
  ['cpu-tier-list',    'Tier list',  'Every gaming CPU ranked S to F'],
  ['benchmarks',       'Benchmarks', 'GPU frame rates at 1080p, 1440p and 4K'],
  ['game-lists',       'Games',      'Game lists by hardware requirement'],
  ['blog',             'Guides',     'PC gaming guides and hardware breakdowns'],
  ['can-it-run',       'Tool',       'Can I run it? Check any PC game'],
  ['bottleneck',       'Tool',       'Bottleneck calculator: CPU vs GPU'],
  ['fps-estimator',    'Tool',       'FPS calculator: estimate your frame rate'],
  ['build-suggest',    'Tool',       'Gaming PC build suggester by budget'],
  ['upgrade-advisor',  'Tool',       'What should I upgrade first?'],
  ['pc-value',         'Tool',       'What is my gaming PC worth?'],
  ['vr-ready',         'Tool',       'Is my PC VR ready?'],
  ['ray-tracing',      'Guide',      'Ray tracing games and what it costs'],
  ['dlss-fsr',         'Guide',      'DLSS vs FSR: which upscaler to use'],
  ['compare-gpu',      'Tool',       'Compare any two graphics cards'],
  ['compare-cpu',      'Tool',       'Compare any two gaming processors'],
  ['psu-calculator',   'Tool',       'What wattage PSU do I need?'],
  ['what-can-my-pc-run','Tool',      'What can my PC run?'],
  ['gpu',              'Hardware',   'Graphics card specs and benchmarks'],
  ['cpu',              'Hardware',   'Processor specs and gaming benchmarks']
];

const CARD_THEME = {
  Tool: 'optimization', Guide: 'guides', Games: 'hardware',
  Hardware: 'hardware', 'Tier list': 'hardware', Benchmarks: 'optimization',
  Toolkit: 'optimization', Guides: 'guides'
};

for (const [slug, kicker, title] of PAGE_CARDS) {
  fs.writeFileSync(
    path.join(OUT, `page-${slug}.svg`),
    cover({ title, category: CARD_THEME[kicker] ?? 'hardware', kicker, slug: 'page-' + slug })
  );
  n++;
}

// og-default.png was referenced by every page in BaseLayout but never existed.
fs.writeFileSync(path.join(ROOT, 'public', 'og-default.svg'), brandCard());

/*
 * og:image must be a raster. Facebook, X/Twitter, LinkedIn, Slack and Discord
 * all refuse SVG for link previews, so every cover is also emitted as PNG.
 * The SVG stays for on-page use — a tenth of the size and sharp at any density.
 */
// Thumbs never become og:image, so they do not need a raster twin.
const svgFiles = fs.readdirSync(OUT)
  .filter(f => f.endsWith('.svg') && !f.endsWith('-thumb.svg'));
for (const f of svgFiles) {
  const png = f.replace(/\.svg$/, '.png');
  await sharp(path.join(OUT, f)).png({ compressionLevel: 9, palette: true, quality: 88, effort: 8 }).toFile(path.join(OUT, png));
}
await sharp(path.join(ROOT, 'public', 'og-default.svg'))
  .png({ compressionLevel: 9, palette: true, quality: 88, effort: 8 })
  .toFile(path.join(ROOT, 'public', 'og-default.png'));

const svgBytes = svgFiles.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
const pngBytes = fs.readdirSync(OUT).filter(f => f.endsWith('.png'))
  .reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);

console.log(`wrote ${n} blog covers + brand card -> public/covers/`);
console.log(`  SVG (on-page)  : ${svgFiles.length} files, ${(svgBytes / 1024).toFixed(0)} KB`);
console.log(`  PNG (og:image) : ${svgFiles.length} files, ${(pngBytes / 1024).toFixed(0)} KB`);
console.log(`  public/og-default.png written (BaseLayout referenced it but it never existed)`);
