/**
 * Checks one live URL per template against the site's SEO budget.
 *
 * Run it against the dev server or the deployed site — it only reads HTML:
 *
 *   node scripts/audit-seo.mjs                      # http://localhost:4321
 *   node scripts/audit-seo.mjs https://runsonmypc.com
 *
 * The budgets are 65 characters for a title and 165 for a description, because
 * beyond those Google truncates and the end of the line — which is where the
 * brand and the year sit — stops being read.
 *
 * Note for anyone extending this: the icon sprite contains <title> elements of
 * its own, so the document title has to be read from <head>, not from the
 * first <title> in the file.
 */
const BASE = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');

const TITLE_MAX = 65;
const DESC_MAX = 165;

/** One URL per template, so a regression anywhere shows up here. */
const PAGES = [
  ['home', '/'],
  ['upcoming year hub', '/upcoming-games-2027'],
  ['game (released)', '/game/cyberpunk-2077'],
  ['game (upcoming, has reqs)', '/game/fable'],
  ['game (upcoming, no reqs)', '/game/final-fantasy-vii-revelation'],
  ['gpu', '/gpu/nvidia-geforce-rtx-4070-ti-super'],
  ['cpu', '/cpu/amd-ryzen-5-5600'],
  ['gpu tier list', '/gpu-tier-list'],
  ['cpu tier list', '/cpu-tier-list'],
  ['matchup', '/can-it-run/fable/nvidia-geforce-rtx-4060'],
  ['games index', '/games'],
  ['game list', '/game-list/low-end-pc-games'],
  ['tools', '/tools'],
  ['tool page', '/fps-estimator'],
  // The blog is deliberately noindex until it has posts of its own.
  ['blog index', '/blog', { noindexOk: true }],
  ['about', '/about']
];

const head = html => html.slice(0, html.indexOf('</head>') + 7);

/* Measure what Google measures: "&amp;" is one character on the results page,
   not five. Without this every title containing an ampersand looked 4 over. */
const decode = s => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const titleOf = html => decode((head(html).match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim() ?? '');
const metaOf = (html, name) =>
  decode((head(html).match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) || [])[1] ?? '');
const attrOf = (html, re) => (head(html).match(re) || [])[1] ?? '';

let problems = 0;
const seenTitles = new Map();
const seenDescs = new Map();

for (const [label, path, opts = {}] of PAGES) {
  let res, html;
  try {
    res = await fetch(BASE + path, { redirect: 'follow' });
    html = await res.text();
  } catch (e) {
    console.log(`FAIL ${path} — ${e.message}`);
    problems++;
    continue;
  }

  const title = titleOf(html);
  const desc = metaOf(html, 'description');
  const canonical = attrOf(html, /<link rel="canonical" href="([^"]*)"/);
  const robots = metaOf(html, 'robots');
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  const jsonLd = (html.match(/application\/ld\+json/g) || []).length;
  const ogImage = attrOf(html, /<meta property="og:image" content="([^"]*)"/);

  const issues = [];
  if (res.status !== 200) issues.push(`status ${res.status}`);
  if (!title) issues.push('no title');
  else if (title.length > TITLE_MAX) issues.push(`title ${title.length} > ${TITLE_MAX}`);
  if (!desc) issues.push('no description');
  else if (desc.length > DESC_MAX) issues.push(`description ${desc.length} > ${DESC_MAX}`);
  if (!canonical) issues.push('no canonical');
  if (h1s !== 1) issues.push(`${h1s} h1 tags`);
  if (!jsonLd) issues.push('no JSON-LD');
  if (!ogImage) issues.push('no og:image');
  if (/noindex/.test(robots) && !opts.noindexOk) issues.push('noindex');

  if (seenTitles.has(title)) issues.push(`title duplicates ${seenTitles.get(title)}`);
  else seenTitles.set(title, path);
  if (desc && seenDescs.has(desc)) issues.push(`description duplicates ${seenDescs.get(desc)}`);
  else if (desc) seenDescs.set(desc, path);

  problems += issues.length;
  console.log(
    `${issues.length ? 'FAIL' : ' ok '} ${String(title.length).padStart(3)}t ${String(desc.length).padStart(3)}d  ${label.padEnd(26)} ${path}`
  );
  for (const i of issues) console.log(`       - ${i}`);
}

/* Sampling one URL per template cannot catch a title that only overflows for
   the longest name in the data — that is how 167 GPU pages ended up over
   budget on the first site. So check each format against its worst case. */
/* The bundle is read from disk rather than through games.ts: that module
   imports JSON, which plain Node will not do without import attributes. */
const { readFileSync } = await import('node:fs');
const { fileURLToPath } = await import('node:url');
const bundlePath = fileURLToPath(new URL('../src/lib/game-reqs.json', import.meta.url));
const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
const { SITE_NAME } = await import('../src/lib/site.ts');
const { SEO_YEAR } = await import('../src/lib/year.ts');

const names = Object.values(bundle.games).map(g => g.n);
const longestName = names.reduce((a, b) => (a.length >= b.length ? a : b));
const hw = JSON.parse(readFileSync(fileURLToPath(new URL('../src/lib/hardware-data.json', import.meta.url)), 'utf8'));
const longestGpu = hw.gpus.map(g => g.name).reduce((a, b) => (a.length >= b.length ? a : b));
const longestCpu = hw.cpus.map(c => c.name).reduce((a, b) => (a.length >= b.length ? a : b));
const { fitTitle } = await import('../src/lib/seo.ts');

const formats = [
  ['game page', fitTitle(longestName, [` System Requirements (${SEO_YEAR})`, ` PC Requirements (${SEO_YEAR})`, ` Requirements (${SEO_YEAR})`], ` | ${SITE_NAME}`)],
  ['gpu page', fitTitle(longestGpu, [' — Benchmarks & FPS', ' Benchmarks & FPS', ' Benchmarks'], ` | ${SITE_NAME}`)],
  ['cpu page', fitTitle(longestCpu, [' — Gaming Benchmarks & Specs', ' — Gaming Benchmarks', ' Benchmarks'], ` | ${SITE_NAME}`)],
  ['upcoming hub', `Upcoming PC Games ${SEO_YEAR} — System Requirements | ${SITE_NAME}`]
];
console.log('');
for (const [label, t] of formats) {
  const over = t.length > TITLE_MAX;
  if (over) problems++;
  console.log(`${over ? 'FAIL' : ' ok '} ${String(t.length).padStart(3)}t  ${label} worst case: ${t}`);
}

console.log(`\n${PAGES.length} templates checked, ${problems} problem${problems === 1 ? '' : 's'}`);
process.exit(problems ? 1 : 0);
