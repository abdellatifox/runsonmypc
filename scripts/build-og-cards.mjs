/**
 * Builds a share card per game.
 *
 * Game pages had been advertising the SteamGridDB logo URL as their og:image.
 * That is a third-party origin the rest of the site no longer touches, and the
 * asset itself is a transparent PNG of arbitrary shape — social platforms
 * composite transparency onto black or white and crop to their own ratio, so
 * the card rendered badly wherever it was shared.
 *
 * These are 1200x630 JPEGs built from the art we already host: the game's logo
 * centred on the brand ground, wordmark bottom-left. Games without local art
 * keep the site default card.
 *
 * Run: node scripts/build-og-cards.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SITE_NAME_PARTS, SITE_DOMAIN } from '../src/lib/site.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = path.join(ROOT, 'public', 'art');
const OUT = path.join(ROOT, 'public', 'og');

const W = 1200;
const H = 630;

fs.mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'art-manifest.json'), 'utf8'));
const slugs = Object.keys(manifest);

const ground = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
     <defs>
       <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="#151B30"/><stop offset="1" stop-color="#070A12"/>
       </linearGradient>
       <radialGradient id="w" cx="0.5" cy="0.34" r="0.55">
         <stop offset="0" stop-color="#8E7DFF" stop-opacity="0.24"/>
         <stop offset="1" stop-color="#8E7DFF" stop-opacity="0"/>
       </radialGradient>
     </defs>
     <rect width="${W}" height="${H}" fill="url(#g)"/>
     <rect width="${W}" height="${H}" fill="url(#w)"/>
     <rect width="${W}" height="6" fill="#8E7DFF"/>
   </svg>`
);

/* Wordmark sits bottom-left, small enough to stay out of the artwork's way.
   Drawn as vector — the same mark as src/components/BrandMark.astro — rather
   than read from a brand image file, so it cannot go missing the way the old
   brand's logo.png did when that brand was removed. */
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const wordmark = await sharp(Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="44" viewBox="0 0 420 44">
     <defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="#8E7DFF"/><stop offset="1" stop-color="#45C9FF"/>
     </linearGradient></defs>
     <g transform="translate(0 4) scale(1.1)">
       <path d="M4 5.5h24v13.5l-4 4H4z" fill="#0F1424" stroke="url(#m)" stroke-width="2.2"/>
       <path d="M13 9.5l7.5 4.75L13 19z" fill="#45C9FF"/>
       <path d="M11 27.5h10" stroke="#8E7DFF" stroke-width="2.2"/>
     </g>
     <text x="46" y="31" font-family="Segoe UI, system-ui, Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#E6E9F5">${esc(SITE_NAME_PARTS.bold)}<tspan fill="#8E7DFF">${esc(SITE_NAME_PARTS.rest)}</tspan><tspan fill="#8089A8" font-weight="600">.${esc(SITE_DOMAIN.split('.').pop())}</tspan></text>
   </svg>`
)).png().toBuffer();

let made = 0;
let skipped = 0;
let bytes = 0;

for (const slug of slugs) {
  // 640 is the widest tier we hold; anything narrower would upscale badly.
  const src = path.join(ART, `${slug}-640.webp`);
  if (!fs.existsSync(src)) { skipped++; continue; }

  try {
    const logo = await sharp(src)
      .resize({ width: 780, height: 300, fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();

    const card = await sharp(ground)
      .composite([
        { input: logo, gravity: 'center' },
        { input: wordmark, top: H - 78, left: 64 }
      ])
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(path.join(OUT, `${slug}.jpg`), card);
    bytes += card.length;
    made++;
  } catch {
    skipped++;
  }
}

console.log(`og cards -> public/og/`);
console.log(`  built   : ${made}`);
console.log(`  skipped : ${skipped} (no local art — these fall back to the default card)`);
console.log(`  total   : ${(bytes / 1048576).toFixed(1)} MB, avg ${(bytes / made / 1024).toFixed(1)} KB`);
