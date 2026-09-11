# PCGameFit — Deployment Guide

## Prerequisites
- Node.js 20+
- Cloudflare account with Workers/Pages enabled
- Wrangler CLI: `npm install -g wrangler`

## Step 1: Install Dependencies

```bash
cd "Gaming 2/pcgamefit"
npm install
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

## Step 3: Create D1 Database

```bash
wrangler d1 create pcgamefit-db
```

Copy the `database_id` from the output and paste it in `wrangler.toml` where it says `your-d1-id-here`.

## Step 4: Create KV Namespace

```bash
wrangler kv:namespace create PGF_KV
```

Copy the `id` from the output and paste it in `wrangler.toml` where it says `your-kv-id-here`.

## Step 5: Create R2 Bucket

```bash
wrangler r2 bucket create pcgamefit-assets
```

## Step 6: Run Database Migrations

`wrangler.toml` already points `migrations_dir` at `./migrations`, so all five files
(schema + GPU/CPU/game/blog seeds) apply in order with one command:

```bash
npm run db:migrate          # applies to the live (remote) D1 database
npm run db:migrate:local    # applies to the local dev D1 emulation instead
```

## Step 7: Test Locally

```bash
npm run dev
```

Visit http://localhost:4321

## Step 8: Build & Deploy

```bash
npm run build
npm run deploy
```

Or deploy directly via Cloudflare Pages dashboard by connecting your GitHub repo.

## Step 9: Configure Custom Domain

In Cloudflare Pages dashboard:
1. Go to your project → Custom domains
2. Add `pcgamefit.com`
3. Update your domain's nameservers to Cloudflare

## Step 10: Verify SEO

- Check https://pcgamefit.com/sitemap.xml
- Submit to Google Search Console
- Submit sitemap at https://search.google.com/search-console

---

## Architecture Overview

```
pcgamefit/
├── astro.config.mjs          ← Astro + Cloudflare adapter config
├── wrangler.toml             ← Cloudflare bindings (D1, KV, R2)
├── package.json
├── tsconfig.json
├── migrations/
│   ├── 0001_schema.sql       ← DB schema (games, gpus, cpus, blog)
│   ├── 0002_seed_gpus.sql    ← 70+ GPU records with benchmark scores
│   ├── 0003_seed_cpus.sql    ← 60+ CPU records
│   ├── 0004_seed_games.sql   ← 50+ game requirements
│   └── 0005_seed_blog.sql    ← 15 SEO blog posts
├── public/
└── src/
    ├── env.d.ts              ← Cloudflare type declarations
    ├── styles/
    │   └── global.css        ← Dark + neon green design system
    ├── layouts/
    │   └── BaseLayout.astro  ← HTML shell, SEO meta, nav, footer
    ├── components/
    │   └── Navbar.astro      ← Sticky glassmorphism navbar
    ├── lib/
    │   └── benchmark-data.ts ← GPU patterns for WebGL auto-detect
    └── pages/
        ├── index.astro                  ← Homepage (SSG)
        ├── can-it-run.astro             ← Main tool (SSR)
        ├── fps-estimator.astro          ← FPS Calculator (SSR)
        ├── bottleneck.astro             ← Bottleneck Calculator (SSR)
        ├── gpu-tier-list.astro          ← GPU Tier List (SSG)
        ├── cpu-tier-list.astro          ← CPU Tier List (SSG)
        ├── compare-gpu.astro            ← GPU Comparison (SSR)
        ├── psu-calculator.astro         ← PSU Calculator (SSG)
        ├── what-can-my-pc-run.astro     ← Reverse lookup (SSR)
        ├── about.astro                  ← About page (SSG)
        ├── privacy.astro                ← Privacy policy (SSG)
        ├── sitemap.xml.ts               ← Dynamic sitemap
        ├── robots.txt.ts                ← Robots.txt
        ├── game/[slug].astro            ← Game detail pages (SSR)
        ├── gpu/[slug].astro             ← GPU spec pages (SSR)
        ├── can-it-run/[game]/[gpu].astro ← Programmatic SEO (SSR)
        ├── blog/
        │   ├── index.astro              ← Blog listing (SSR)
        │   └── [slug].astro             ← Blog post (SSR)
        └── api/
            ├── games/search.ts          ← GET /api/games/search?q=
            ├── gpus/search.ts           ← GET /api/gpus/search?q=
            ├── cpus/search.ts           ← GET /api/cpus/search?q=
            ├── tools/can-it-run.ts      ← POST /api/tools/can-it-run
            ├── tools/fps-estimate.ts    ← POST /api/tools/fps-estimate
            ├── tools/bottleneck.ts      ← POST /api/tools/bottleneck
            ├── blog/posts.ts            ← GET /api/blog/posts
            └── blog/[slug].ts           ← GET /api/blog/:slug
```

## Why This Beats pcgamecheck.com in SEO

1. **Astro generates clean, fast HTML** → Better Core Web Vitals → Higher rankings
2. **Programmatic SEO** → `/can-it-run/{game}/{gpu}` generates thousands of indexed pages
3. **Schema.org markup** → Rich snippets in search results
4. **Domain** → 'pcgamefit.com' is clear and memorable. Note that keyword-in-domain
   has not been a ranking factor since Google's 2012 EMD update; it helps click-through, not rank.
5. **Superior content** → Rewritten, expanded blog articles target same keywords
6. **Edge rendering** → Cloudflare Workers serve from 300+ PoPs worldwide → Fast TTFB globally
