/**
 * Compiles fetched Steam requirements into the compact form the Worker ships.
 *
 * Full records average ~1.5 KB each, which is far too much to bundle for
 * thousands of games. This keeps the fields that drive the verdict plus the
 * publisher's own requirement strings (the part users actually want to read),
 * drops the prose notes, and reports the resulting size so the bundle stays
 * inside the Worker budget.
 *
 *   node scripts/build-game-reqs.mjs [maxGames]
 */
import fs from 'node:fs';
import path from 'node:path';
import { MANUAL_GAMES } from '../data/games.manual.mjs';
import { isExcludedGame } from '../data/excluded-games.mjs';
import { GPU_ROWS } from '../data/gpus.source.mjs';
import { CPU_ROWS } from '../data/cpus.source.mjs';
import { buildIndex, matchRequirementLine } from '../src/lib/match-hardware.mjs';
import { splitAlternatives, parseCpuFloor } from '../src/lib/steam-parse.mjs';

const GPU_IDX = buildIndex(GPU_ROWS, 7);
const CPU_IDX = buildIndex(CPU_ROWS, 9);

/**
 * Manual entries state their parts as prose the same way Steam does, so they go
 * through the identical matcher. A game added by hand and one pulled from Steam
 * therefore produce the same verdict for the same hardware.
 */
function manualSide(x) {
  if (!x) return null;
  const g = x.gpu ? matchRequirementLine(x.gpu, GPU_IDX, splitAlternatives(x.gpu)) : null;
  const c = x.cpu ? matchRequirementLine(x.cpu, CPU_IDX, splitAlternatives(x.cpu)) : null;
  return {
    os: x.os ?? null,
    dx: x.directx ?? null,
    ram: x.ram ?? null,
    sto: x.storage ?? null,
    vram: x.vram ?? null,
    gpu: g ? { n: g.best.row[0], p: g.best.row[6], v: g.best.row[3] } : null,
    cpu: c ? { n: c.best.row[0], p: c.best.row[8] } : null,
    cf: c ? null : parseCpuFloor(x.cpu),
    rg: trim(x.gpu),
    rc: trim(x.cpu)
  };
}

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'data', 'games.requirements.json');
const OUT = path.join(ROOT, 'src', 'lib', 'game-reqs.json');

const MAX = parseInt(process.argv[2] || '3000', 10);

/** Trim a requirement string to something displayable without the boilerplate. */
function trim(s, n = 120) {
  if (!s) return null;
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function side(x) {
  if (!x) return null;
  return {
    os: x.os ?? null,
    dx: x.directx ?? null,
    ram: x.ramGb ?? null,
    sto: x.storageGb ?? null,
    vram: x.vramGb ?? null,
    gpu: x.gpu ? { n: x.gpu.name, p: x.gpu.perf, v: x.gpu.vramGb } : null,
    cpu: x.cpu ? { n: x.cpu.name, p: x.cpu.perf } : null,
    cf: x.cpuFloor ?? null,
    // Publisher's own words — shown verbatim on the site.
    rg: trim(x.raw?.gpu),
    rc: trim(x.raw?.cpu)
  };
}

// The manual (non-Steam) set is always included, even before the Steam crawl
// has produced anything — those titles do not depend on it.
const hasSteam = fs.existsSync(SRC);
if (!hasSteam) console.log('no games.requirements.json yet — bundling manual entries only');

const all = hasSteam
  ? Object.values(JSON.parse(fs.readFileSync(SRC, 'utf8')).games || {})
      .sort((a, b) => (b.owners || 0) - (a.owners || 0))
  : [];

const out = {};
const bySlug = {};
let excluded = 0;
for (const g of all.slice(0, MAX)) {
  if (isExcludedGame({ appid: g.appid, slug: g.slug, name: g.name })) { excluded++; continue; }
  const rec = {
    a: g.appid,
    n: g.name,
    y: g.releaseYear ?? null,
    g: (g.genres || [])[0] ?? null,
    d: (g.developers || [])[0] ?? null,
    img: g.headerImage ?? null,
    min: side(g.minimum),
    rec: side(g.recommended),
    src: g.source
  };
  out[g.appid] = rec;
  if (!bySlug[g.slug]) bySlug[g.slug] = g.appid;   // most-owned wins the slug
}

// Non-Steam titles use negative synthetic ids so they cannot collide with appids.
let manualId = -1;
for (const m of MANUAL_GAMES) {
  const id = manualId--;
  if (isExcludedGame({ appid: id, slug: m.slug, name: m.name })) { excluded++; continue; }
  out[id] = {
    a: id,
    n: m.name,
    y: m.year ?? null,
    g: m.genre ?? null,
    d: m.developer ?? null,
    img: null,
    min: manualSide(m.minimum),
    rec: manualSide(m.recommended),
    src: m.source,
    manual: true,
    ...(m.unpublished ? { unpublished: true, note: m.note } : {})
  };
  bySlug[m.slug] = id;   // manual entries own their slug outright
}

fs.writeFileSync(OUT, JSON.stringify({
  games: out,
  bySlug,
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    total: Object.keys(out).length,
    source: 'Steam store appdetails API (publisher-stated requirements)'
  }
}));

const kb = fs.statSync(OUT).size / 1024;
const resolvedGpu = Object.values(out).filter(g => g.min?.gpu).length;
console.log(`bundled ${Object.keys(out).length} games (${kb.toFixed(0)} KB raw)`);
console.log(`  manual (non-Steam) entries: ${MANUAL_GAMES.length}`);
console.log(`  min GPU resolved to a known part: ${resolvedGpu}`);
if (kb > 3500) console.log('  WARNING: approaching Worker bundle limits — lower maxGames');
