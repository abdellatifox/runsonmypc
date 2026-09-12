/**
 * Builds the blog from the site's own data.
 *
 * Every article here is about the unreleased games in data/upcoming-games.mjs,
 * and every number in them is computed from the publishers' Steam listings
 * (data/upcoming.requirements.json) and the hardware index
 * (src/lib/hardware-data.json) at build time. Nothing is typed in by hand, so
 * when `npm run data:refresh` picks up a newly published spec, the articles
 * change with it instead of quietly going out of date.
 *
 * Each article answers a question no other page on the site targets, so they
 * do not compete with /upcoming-games-2027 (release list) or /game/<slug>
 * (one game's requirements) for the same search.
 *
 *   node scripts/build-blog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { SEO_YEAR } from '../src/lib/year.ts';
import { UPCOMING_GAMES } from '../data/upcoming-games.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src', 'lib', 'blog-posts.json');

const UPCOMING = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'upcoming.requirements.json'), 'utf8'));
const BUNDLE = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'game-reqs.json'), 'utf8'));
const HW = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'hardware-data.json'), 'utf8'));

/** First publication dates are fixed; only the "updated" date follows the data. */
const PUBLISHED = {
  'pc-requirements-2027-games': '2026-09-12',
  'best-gpu-for-2027-games': '2026-09-12',
  'ram-and-storage-for-2027-games': '2026-09-12',
  'most-wishlisted-upcoming-pc-games': '2026-09-12'
};

// --------------------------------------------------------------- helpers

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const a = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const list = items => items.length <= 1 ? (items[0] ?? '')
  : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
const median = nums => {
  const s = [...nums].sort((x, y) => x - y);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};
const table = (head, rows) => `<div class="table-scroll"><table class="data-table">
<thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n')}</tbody>
</table></div>`;
const readTime = html => Math.max(3, Math.ceil(html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 220));
const longDate = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// ------------------------------------------------------------------ data

const BUZZ = new Map(UPCOMING_GAMES.filter(g => g.buzz).map(g => [g.appid, g.buzz]));

/* Only games that still have a page: shipped or excluded titles drop out of the
   bundle, and an article must never link to a 404. */
const games = Object.values(UPCOMING.games)
  .filter(g => g.comingSoon && BUNDLE.bySlug[g.slug] === g.appid)
  .map(g => {
    const min = g.minimum, rec = g.recommended;
    const rawText = JSON.stringify([min?.raw, rec?.raw]);
    const os = (min?.raw?.os || rec?.raw?.os || '').replace(/®/g, '');
    return {
      name: g.name.trim().replace(/™/g, ''),
      slug: g.slug,
      date: g.releaseDate,
      year: g.expectedYear,
      dated: /\d{4}/.test(g.releaseDate || ''),
      hasReqs: g.hasRequirements,
      buzz: BUZZ.get(g.appid) ?? null,
      minGpu: min?.gpu ?? null,
      recGpu: rec?.gpu ?? null,
      minGpuText: min?.raw?.gpu ?? null,
      recGpuText: rec?.raw?.gpu ?? null,
      // Only a VRAM figure the publisher actually wrote down, never the memory
      // of whichever card they happened to name.
      minVram: min?.vramGb ?? null,
      recVram: rec?.vramGb ?? null,
      minRam: min?.ramGb ?? null,
      recRam: rec?.ramGb ?? null,
      storage: min?.storageGb ?? rec?.storageGb ?? null,
      storageText: min?.raw?.storage ?? rec?.raw?.storage ?? null,
      ssd: /\bssd\b/i.test(rawText),
      os,
      win11Only: /\b11\b/.test(os) && !/\b10\b/.test(os)
    };
  });

const withReqs = games.filter(g => g.hasReqs);
const dataDate = Object.values(UPCOMING.games).map(g => g.fetchedAt).filter(Boolean).sort().pop()
  ?? new Date().toISOString().slice(0, 10);

const gameLink = g => a(`/game/${g.slug}`, g.name);
const due = g => g.dated ? esc(g.date) : 'Not announced';

const desktopGpus = HW.gpus.filter(g => !/laptop|mobile|max-q/i.test(g.name));
const gpuByName = new Map(desktopGpus.map(g => [g.name, g]));

function meets(card, need, vram) {
  if (!need) return null;                       // nothing named to compare with
  if (card.perf < need.perf) return false;
  if (vram && card.vram_gb < vram) return false;
  return true;
}

const sources = `<h2>Where these numbers come from</h2>
<p>Every requirement quoted here is the publisher's own, read from the game's Steam store page on ${longDate(dataDate)}. Placeholder entries — "TBD", "TBA", "Coming soon" — are treated as not published, never as a spec. Where we compare a graphics card or processor against a requirement, we use the performance index described in our ${a('/editorial-standards', 'editorial standards')}. We re-read every listing monthly, and this article is regenerated from that data each time, so its figures move when the publishers' do.</p>`;

// ============================================================ article 1
// "What do 2027 PC games require?" — the full side-by-side comparison.

function articleRequirements() {
  const slug = 'pc-requirements-2027-games';
  const namedMin = withReqs.filter(g => g.minGpu).sort((x, y) => y.minGpu.perf - x.minGpu.perf);
  const namedRec = withReqs.filter(g => g.recGpu);
  const hardestMin = namedMin[0];
  const lightestMin = namedMin[namedMin.length - 1];
  const hardestRec = [...namedRec].sort((x, y) => y.recGpu.perf - x.recGpu.perf)[0];
  const medianMin = namedMin[Math.floor((namedMin.length - 1) / 2)];

  const minRams = withReqs.map(g => g.minRam).filter(v => v != null);
  const recRams = withReqs.map(g => g.recRam).filter(v => v != null);
  const topMinRam = Object.entries(minRams.reduce((m, v) => (m[v] = (m[v] || 0) + 1, m), {}))
    .sort((x, y) => y[1] - x[1] || Number(y[0]) - Number(x[0]))[0];
  const rec16 = recRams.filter(v => v === 16).length;

  const win11 = withReqs.filter(g => g.win11Only);
  const ssd = withReqs.filter(g => g.ssd);
  const stated = withReqs.filter(g => g.storage != null);

  const gpuRows = [...namedMin, ...withReqs.filter(g => !g.minGpu)].map(g => [
    gameLink(g),
    due(g),
    esc(g.minGpuText ?? 'Not stated'),
    esc(g.recGpuText ?? 'Not stated')
  ]);

  const content = `
<p><strong>${plural(withReqs.length, 'game')} due in ${SEO_YEAR} or announced for PC have already published system requirements</strong>, out of the ${games.length} upcoming titles we track. Together they set a clear bar: ${topMinRam[0]}GB is the most common minimum amount of memory, the middle minimum graphics card is roughly ${esc(medianMin.minGpu.name)} class, and ${rec16} of the ${recRams.length} recommended specs that state memory ask for 16GB.</p>
<p>Below is every published spec side by side, followed by the details that are easy to miss — the games that need Windows 11, the ones that insist on an SSD, and how much space they take.</p>

<h2>Graphics cards: minimum and recommended</h2>
<p>Most demanding first, ranked by the minimum card each publisher names. The wording is the publisher's.</p>
${table(['Game', 'Due', 'Minimum GPU', 'Recommended GPU'], gpuRows)}
<p>The spread is wide. <strong>${gameLink(hardestMin)} names ${esc(hardestMin.minGpu.name)} as its minimum</strong> — the highest floor of any game here — while ${gameLink(lightestMin)} starts at ${esc(lightestMin.minGpu.name)}. At the top of the recommended column, ${gameLink(hardestRec)} asks for ${esc(hardestRec.recGpu.name)}.</p>
<p>${plural(withReqs.length - namedMin.length, 'game')} with published requirements ${withReqs.length - namedMin.length === 1 ? 'does' : 'do'} not name a graphics card at all yet, and ${withReqs.length - namedRec.length} name no recommended card.</p>

<h2>Memory</h2>
<p>${list(Object.entries(minRams.reduce((m, v) => (m[v] = (m[v] || 0) + 1, m), {})).sort((x, y) => Number(y[0]) - Number(x[0])).map(([gb, n]) => `${n} ${n === 1 ? 'asks' : 'ask'} for ${gb}GB`))} as a minimum. For the recommended tier, 16GB is close to universal; ${list(withReqs.filter(g => g.recRam === 32).map(gameLink)) || 'none'} ${withReqs.filter(g => g.recRam === 32).length === 1 ? 'recommends' : 'recommend'} 32GB. The full breakdown is in ${a('/blog/ram-and-storage-for-2027-games', `how much RAM and storage ${SEO_YEAR} games need`)}.</p>

<h2>Storage and SSDs</h2>
<p>${plural(stated.length, 'game')} state an install size, from ${Math.min(...stated.map(g => g.storage))}GB to ${Math.max(...stated.map(g => g.storage))}GB, with a median of ${median(stated.map(g => g.storage))}GB. ${ssd.length ? `${list(ssd.map(gameLink))} mention an SSD in their requirements.` : 'None mention an SSD yet.'}</p>

<h2>Windows 11 only</h2>
<p>${win11.length
    ? `${list(win11.map(gameLink))} list Windows 11 and no earlier version. Every other game here that names an operating system still accepts Windows 10.`
    : `Every game here that names an operating system still accepts Windows 10.`}</p>

<h2>Check your own PC</h2>
<p>Every game above has its own page with the full publisher table, and the checker compares your graphics card, processor and memory against it directly. Start from the ${a(`/upcoming-games-${SEO_YEAR}`, `full list of ${SEO_YEAR} releases`)}, or see ${a('/blog/best-gpu-for-2027-games', `which graphics cards clear these specs`)}.</p>

${sources}`;

  return {
    slug,
    title: `${SEO_YEAR} PC Game Requirements: Every Published Spec`,
    excerpt: `${withReqs.length} upcoming PC games have published system requirements. Their GPU, RAM, storage and Windows needs, side by side and sourced from Steam.`,
    category: 'guides',
    content
  };
}

// ============================================================ article 2
// "Which graphics card do I need for 2027 games?"

function articleBestGpu() {
  const slug = 'best-gpu-for-2027-games';
  const minGames = withReqs.filter(g => g.minGpu);
  const recGames = withReqs.filter(g => g.recGpu);

  const score = card => ({
    card,
    min: minGames.filter(g => meets(card, g.minGpu, g.minVram)).length,
    rec: recGames.filter(g => meets(card, g.recGpu, g.recVram)).length,
    missesRec: recGames.filter(g => !meets(card, g.recGpu, g.recVram))
  });

  /* A selection of widely owned current and last-generation cards. Only cards
     present in the hardware index are shown, and only launch MSRP is quoted —
     street prices move weekly and we do not track them. */
  const PICKS = [
    'NVIDIA GeForce GTX 1660 SUPER', 'NVIDIA GeForce RTX 2060', 'AMD Radeon RX 6600',
    'AMD Radeon RX 7600', 'NVIDIA GeForce RTX 4060', 'Intel Arc B580', 'NVIDIA GeForce RTX 5060',
    'NVIDIA GeForce RTX 4060 Ti', 'AMD Radeon RX 7700 XT', 'NVIDIA GeForce RTX 4070',
    'NVIDIA GeForce RTX 5070', 'AMD Radeon RX 9070', 'AMD Radeon RX 9070 XT',
    'NVIDIA GeForce RTX 5070 Ti', 'NVIDIA GeForce RTX 5080'
  ];
  const shown = PICKS.map(n => gpuByName.get(n)).filter(Boolean).map(score)
    .sort((x, y) => x.card.perf - y.card.perf);

  const all = desktopGpus.filter(g => g.msrp_usd).map(score);
  const clearsAllRec = all.filter(s => s.rec === recGames.length).sort((x, y) => x.card.msrp_usd - y.card.msrp_usd)[0];
  const clearsAllMin = all.filter(s => s.min === minGames.length).sort((x, y) => x.card.msrp_usd - y.card.msrp_usd)[0];

  // The one game whose minimum sits far above the rest distorts "every minimum".
  const outlier = [...minGames].sort((x, y) => y.minGpu.perf - x.minGpu.perf)[0];
  const allButOutlier = all
    .filter(s => minGames.filter(g => g !== outlier).every(g => meets(s.card, g.minGpu, g.minVram)))
    .sort((x, y) => x.card.msrp_usd - y.card.msrp_usd)[0];

  const recRamStated = withReqs.filter(g => g.recRam != null).length;
  const recRamAtLeast16 = withReqs.filter(g => g.recRam != null && g.recRam >= 16).length;

  const budget = shown.filter(s => s.card.msrp_usd <= 350)
    .sort((x, y) => y.rec - x.rec || x.card.msrp_usd - y.card.msrp_usd)[0];

  const rows = shown.map(s => [
    a(`/gpu/${s.card.slug}`, s.card.name),
    `$${s.card.msrp_usd}`,
    `${s.min}/${minGames.length}`,
    `${s.rec}/${recGames.length}`,
    esc(s.missesRec.length && s.missesRec.length <= 3 ? s.missesRec.map(g => g.name).join(', ') : s.missesRec.length ? `${s.missesRec.length} games` : 'None')
  ]);

  const content = `
<p><strong>The cheapest graphics card that clears every recommended spec published for a ${SEO_YEAR} PC game so far is the ${a(`/gpu/${clearsAllRec.card.slug}`, clearsAllRec.card.name)}</strong>, which launched at $${clearsAllRec.card.msrp_usd}. On a tighter budget, the ${a(`/gpu/${budget.card.slug}`, budget.card.name)} ($${budget.card.msrp_usd} at launch) meets the recommended card for ${budget.rec} of ${recGames.length} games and the minimum for ${budget.min} of ${minGames.length}.</p>
<p>That answer comes from comparing each card against the requirements publishers have actually posted, not from predictions. ${minGames.length} of the ${games.length} upcoming games we track name a minimum graphics card and ${recGames.length} name a recommended one.</p>

<h2>How popular cards compare</h2>
<p>"Minimum met" counts the games whose minimum card your card matches or beats in our performance index; "recommended met" does the same for the recommended card. Where a publisher states a VRAM amount, the card must have at least that much.</p>
${table(['Graphics card', 'Launch MSRP', 'Minimum met', 'Recommended met', 'Recommended specs missed'], rows)}

<h2>The picks</h2>
<ul>
<li><strong>Clears every recommended spec:</strong> ${a(`/gpu/${clearsAllRec.card.slug}`, clearsAllRec.card.name)} — the lowest launch price of any card that matches or beats all ${recGames.length} recommended cards.</li>
<li><strong>Best value under $350:</strong> ${a(`/gpu/${budget.card.slug}`, budget.card.name)} — the most recommended specs met (${budget.rec}) at that price.</li>
<li><strong>Clears every minimum:</strong> ${clearsAllMin ? `${a(`/gpu/${clearsAllMin.card.slug}`, clearsAllMin.card.name)} ($${clearsAllMin.card.msrp_usd} at launch). One game sets that bar on its own: ${gameLink(outlier)} names ${esc(outlier.minGpu.name)} as its minimum.` : 'no card in our index yet.'} Leave it out, and the ${a(`/gpu/${allButOutlier.card.slug}`, allButOutlier.card.name)} ($${allButOutlier.card.msrp_usd}) meets every other minimum.</li>
</ul>

<h2>What "meets the recommended spec" does not tell you</h2>
<p>Publishers rarely say what resolution, settings or frame rate a recommended card is meant to deliver, so clearing it is a sign a card is in the right class — not a promise of 60 frames per second at 1440p. For a frame-rate estimate on a specific game, use the ${a('/fps-estimator', 'FPS estimator')}; to see where any card ranks overall, see the ${a('/gpu-tier-list', `GPU tier list ${SEO_YEAR}`)}.</p>
<p>Memory matters too: ${recRamAtLeast16} of the ${recRamStated} games that state a recommended amount ask for 16GB or more. Details are in ${a('/blog/ram-and-storage-for-2027-games', `how much RAM and storage ${SEO_YEAR} games need`)}.</p>

${sources}
<p>Launch MSRP is the manufacturer's price at release, in US dollars — not today's price, which we do not track.</p>`;

  return {
    slug,
    title: `Best GPU for ${SEO_YEAR} Games, by Published Requirements`,
    excerpt: `Which graphics cards clear the minimum and recommended specs of upcoming ${SEO_YEAR} PC games — compared against ${recGames.length} published requirements, not guesses.`,
    category: 'hardware',
    content
  };
}

// ============================================================ article 3
// "How much RAM and storage do 2027 games need?"

function articleRamStorage() {
  const slug = 'ram-and-storage-for-2027-games';
  const minRamGames = withReqs.filter(g => g.minRam != null);
  const recRamGames = withReqs.filter(g => g.recRam != null);
  const byMin = {};
  for (const g of minRamGames) (byMin[g.minRam] ||= []).push(g);
  const byRec = {};
  for (const g of recRamGames) (byRec[g.recRam] ||= []).push(g);
  const topMin = Object.entries(byMin).sort((x, y) => y[1].length - x[1].length || Number(y[0]) - Number(x[0]))[0];
  const maxMin = Math.max(...minRamGames.map(g => g.minRam));
  const above16Rec = recRamGames.filter(g => g.recRam > 16);

  const stored = withReqs.filter(g => g.storage != null).sort((x, y) => y.storage - x.storage);
  const total = stored.reduce((s, g) => s + g.storage, 0);
  const ssd = withReqs.filter(g => g.ssd);

  const ramRows = (buckets) => Object.entries(buckets)
    .sort((x, y) => Number(y[0]) - Number(x[0]))
    .map(([gb, gs]) => [`${gb}GB`, String(gs.length), gs.map(gameLink).join(', ')]);

  const content = `
<p><strong>16GB of RAM covers every ${SEO_YEAR} PC game that has published its requirements so far — at the minimum.</strong> ${topMin[1].length} of the ${minRamGames.length} games that state a minimum ask for exactly ${topMin[0]}GB, the most common figure, and none asks for more than ${maxMin}GB. The recommended tier is where 16GB stops being enough for everyone: ${above16Rec.length ? `${list(above16Rec.map(gameLink))} recommend ${list([...new Set(above16Rec.map(g => g.recRam + 'GB'))])}.` : 'none recommend more than 16GB.'}</p>
<p>Storage varies far more than memory — from ${stored[stored.length - 1].storage}GB to ${stored[0].storage}GB — and a handful of games now name an SSD outright.</p>

<h2>Minimum RAM</h2>
${table(['Minimum RAM', 'Games', 'Which'], ramRows(byMin))}

<h2>Recommended RAM</h2>
${table(['Recommended RAM', 'Games', 'Which'], ramRows(byRec))}
<p>If you are buying memory now, the published specs point one way: 16GB is the floor for the most demanding of these games, and 32GB is what the heaviest ones recommend.</p>

<h2>Install size</h2>
<p>${plural(stored.length, 'game')} state how much space they need. The median is ${median(stored.map(g => g.storage))}GB; installing all of them together would take ${total}GB.</p>
${table(['Game', 'Storage', 'SSD named'], stored.map(g => [gameLink(g), `${g.storage}GB`, g.ssd ? 'Yes' : '—']))}

<h2>Which games need an SSD</h2>
<p>${ssd.length
    ? `${list(ssd.map(gameLink))} mention an SSD in their published requirements.`
    : `None of the published specs mention an SSD yet.`} Every other game here states only a size, which does not mean a hard drive is enough — it means the publisher has not said.</p>

<h2>Check a specific game</h2>
<p>Each game's page shows its full requirement table, and the ${a('/can-it-run', 'checker')} compares your memory, graphics card and processor against it. For graphics cards specifically, see ${a('/blog/best-gpu-for-2027-games', `the best GPU for ${SEO_YEAR} games`)}; for everything side by side, ${a('/blog/pc-requirements-2027-games', `every published ${SEO_YEAR} requirement`)}.</p>

${sources}`;

  return {
    slug,
    title: `How Much RAM and Storage Do ${SEO_YEAR} PC Games Need?`,
    excerpt: `16GB of RAM meets every published ${SEO_YEAR} minimum, but not every recommended spec. Memory, install sizes and SSD needs for upcoming PC games, from Steam.`,
    category: 'guides',
    content
  };
}

// ============================================================ article 4
// "Which upcoming PC games are most anticipated, and what do they need?"

function articleWishlisted() {
  const slug = 'most-wishlisted-upcoming-pc-games';
  const ranked = games.filter(g => g.buzz);
  const published = ranked.filter(g => g.hasReqs);
  const sourcesUsed = [...new Map(ranked.map(g => [g.buzz.source, g.buzz.label])).entries()];

  const rows = ranked
    .sort((x, y) => Number(y.dated) - Number(x.dated) || (x.name.localeCompare(y.name)))
    .map(g => [
      gameLink(g),
      due(g),
      g.hasReqs ? esc(g.minGpuText ?? 'Published, no GPU named') : 'Not published yet',
      g.hasReqs ? a(`/can-it-run?game=${g.slug}`, 'Check my PC') : a(`/game/${g.slug}`, 'Follow')
    ]);

  const content = `
<p><strong>${published.length} of the ${ranked.length} most wishlisted upcoming PC games we track have published their system requirements</strong>${published.length ? ` — ${list(published.map(gameLink))}` : ''}. ${
  published.length / ranked.length > withReqs.length / games.length
    ? `That is a higher share than upcoming games overall, where ${withReqs.length} of ${games.length} have posted specs: the biggest launches tend to publish sooner.`
    : published.length / ranked.length < withReqs.length / games.length
    ? `That is a lower share than upcoming games overall, where ${withReqs.length} of ${games.length} have posted specs.`
    : `That matches upcoming games overall, where ${withReqs.length} of ${games.length} have posted specs.`
}</p>
<p>The rankings are not ours. We list a game here only when a named source ranked it, and link that source, so nothing on this page is our guess at what is popular.</p>

<h2>The games and their specs</h2>
${table(['Game', 'Due', 'Minimum GPU', ''], rows)}

<h2>Why ${ranked.length - published.length} of them have no specs yet</h2>
<p>A Steam page can go live years before launch, and publishers usually post requirements late, once the game is close to final. Until then the store page often carries placeholders — "TBD", "Coming soon" — which we do not treat as requirements. Each game's page here says plainly that nothing has been published, and fills in the day the listing changes.</p>

${published.length ? `<h2>What the ones with published specs ask for</h2>
<ul>${published.map(g => `<li>${gameLink(g)}: ${esc(g.minGpuText ? `minimum ${g.minGpuText}` : 'no GPU named')}${g.minRam ? `, ${g.minRam}GB RAM` : ''}${g.storage ? `, ${g.storage}GB storage` : ''}${g.win11Only ? ', Windows 11 only' : ''}.</li>`).join('')}</ul>` : ''}

<h2>Rankings used</h2>
<ul>${sourcesUsed.map(([src, label]) => `<li><a href="${esc(src)}" rel="nofollow noopener" target="_blank">${esc(label)}</a></li>`).join('')}</ul>
<p>For every upcoming game we track, dated or not, see the ${a(`/upcoming-games-${SEO_YEAR}`, `${SEO_YEAR} release list`)}.</p>

${sources}`;

  return {
    slug,
    title: 'Most Wishlisted Upcoming PC Games and Their Specs',
    excerpt: `The most wishlisted upcoming PC games on Steam, with each one's release window and whether it has published system requirements yet — sourced, not guessed.`,
    category: 'news',
    content
  };
}

// ------------------------------------------------------------------ write

if (withReqs.length < 5) {
  console.log(`only ${withReqs.length} upcoming games with requirements — not enough to write data articles; keeping the previous posts`);
  process.exit(0);
}

const posts = [articleRequirements(), articleBestGpu(), articleRamStorage(), articleWishlisted()].map(p => ({
  title: p.title,
  slug: p.slug,
  excerpt: p.excerpt,
  content: p.content.trim(),
  category: p.category,
  author: 'RunsOnMyPC Data Desk',
  image_url: '',
  read_time: readTime(p.content),
  featured: 1,
  published_at: PUBLISHED[p.slug],
  updated_at: dataDate
}));

for (const p of posts) {
  if (p.title.length > 52) console.log(`  WARNING: "${p.title}" is ${p.title.length} chars; the brand suffix will be dropped from its <title>`);
  if (p.excerpt.length > 165) console.log(`  WARNING: excerpt for ${p.slug} is ${p.excerpt.length} chars`);
  const links = [...p.content.matchAll(/href="(\/[^"]*)"/g)].map(m => m[1]);
  for (const href of links) {
    const game = href.match(/^\/game\/([^/?#]+)/);
    if (game && !BUNDLE.bySlug[game[1]]) console.log(`  BROKEN LINK in ${p.slug}: ${href}`);
    const gpu = href.match(/^\/gpu\/([^/?#]+)/);
    if (gpu && !HW.gpus.some(g => g.slug === gpu[1])) console.log(`  BROKEN LINK in ${p.slug}: ${href}`);
  }
}

fs.writeFileSync(OUT, JSON.stringify({ posts, meta: { generated: new Date().toISOString().slice(0, 10), dataDate } }, null, 1));
console.log(`wrote ${posts.length} posts (data as of ${dataDate}) -> ${path.relative(ROOT, OUT)}`);
for (const p of posts) console.log(`  ${String(p.read_time).padStart(2)} min  ${p.title.length}t ${p.excerpt.length}d  /blog/${p.slug}`);
