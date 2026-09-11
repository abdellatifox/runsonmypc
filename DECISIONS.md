# Second site — decisions (phase 00)

Written 2026-09-11, before any code. Follows the PCGameFit build playbook.
Everything here is fixed once phase 06 (data pipeline) starts.

## Identity
- Domain: **runsonmypc.com** (chosen 2026-09-11; take runsonmypc.net too). Brand:
  **RunsOnMyPC**, spaced "Runs On My PC". Contact `hello@runsonmypc.com`.
  All of this lives in `src/lib/site.ts` only, never typed anywhere else.
  Search sheet: `DOMAINS.md`.
- Language: **English**, `dir="ltr"`, Latin font subsets only.
- SEMrush database: **us**.
- Design: **dark, gaming-flavoured** — deliberately different from PCGameFit's look.
  Same components and logic; new tokens, type and layout.

## Data rule
- No value without a source. Game requirements come from Steam `appdetails`
  (publisher-stated); GPU/CPU scores from curated, sourced datasets.
- Missing = `null`, shown as "not stated". Never estimated.
- A tool either calculates from real data or refuses and says why.
- Every number shown on the site (counts, "X games") is derived at build time.
- Keys are Steam **appid**, never slugs.

## Image policy
- **Logos only** (SteamGridDB `nsfw=false&humor=false&types=static`). No grid, hero
  or key art.
- **No imagery depicting women, ever.** Games without a logo get a generated
  initials tile.

## Excluded content
Central list in `data/excluded-games.mjs`, enforced at every build step **and** the
live Steam paths (search fallback, fetch by appid):
- Grand Theft Auto (whole series, incl. GTA+)
- The Witcher 1/2/3 (incl. GWENT, Thronebreaker: — note the colon)
- Doki Doki Literature Club!
- Business Tour
- Governor of Poker 3
- Gambling / casino titles

## Competitors to benchmark every tool against
- pcgamecheck.com (primary reference)
- systemrequirementslab.com (Can You Run It)
- pcgamebenchmark.com
- pc-builds.com (bottleneck calculator)
- PCGameFit itself — same owner. **Do not copy its text.** Titles, descriptions,
  intros and blog posts are written fresh, or Google sees two copies of one site.

## Services
Launch with all PCGameFit services unless marked otherwise:
Can I Run It · FPS Estimator · Bottleneck · What can my PC run · Build Suggest ·
Upgrade Advisor · PSU Calculator · PC Value · GPU/CPU tier lists · Compare GPU/CPU ·
Benchmarks · Ray tracing · DLSS/FSR · VR ready · Game lists · Blog

## Infrastructure (decided now because it cannot change later)
- Cloudflare Pages created **connected to Git** (not direct upload), so every push
  deploys and GitHub never falls behind the live site.
- One Cloudflare account; `wrangler whoami` before every `create`. Never touch the
  Abdellatifbrands account or anything named `critvolt-*`.
- API token with Cache Rules + DNS + Cache Purge from day one.
- wrangler 4.
