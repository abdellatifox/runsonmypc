# RunsOnMyPC

runsonmypc.com — will this game run on my PC? Publisher-stated requirements
checked against your parts, plus FPS, bottleneck and hardware tools.

Built from PCGameFit's codebase with the same services and a new design,
following the PCGameFit build playbook phase by phase.

- `DECISIONS.md` — phase 00 rules that do not change (data, images, exclusions).
- `DOMAINS.md` — how the domain was chosen.
- `DATA.md` — the data pipeline.

## Run it

```bash
npm ci
npm run dev        # http://localhost:4321
npm run build
```

## Design

All colours, fonts and radii are tokens at the top of `src/styles/global.css`.
Pages use the tokens (`var(--accent)`, `rgb(var(--accent-rgb) / .1)`), never literals.

## SEO

- `src/lib/year.ts` owns every year label. `SEO_YEAR` rolls to the next year
  from September (`ROLLOVER_MONTH`), so titles never advertise a past year.
  Prerendered pages bake it in at build time — the monthly refresh rebuilds.
- `src/lib/seo.ts` fits titles (65) and descriptions (165) so a long game or
  part name drops a clause instead of being cut off in the results.
- `npm run seo:audit` checks one URL per template and each title format against
  the longest name in the data. Keep it at 0 problems.
- Unreleased games: `data/upcoming-games.mjs` lists them by appid,
  `npm run data:upcoming` fetches each one's Steam listing, and
  `/upcoming-games-<year>` is generated per year from that data. Placeholder
  requirement text ("TBD", "Coming Soon", Steam's 64-bit boilerplate) is
  stripped, and a game with nothing measurable says so rather than showing a
  guessed spec.

## Identity

Domain, brand, contact address and fetcher User-Agent live only in
`src/lib/site.ts`. Never type them anywhere else.

## Status

| Phase | State |
|---|---|
| 00 Decisions | done |
| 01 Domain | chosen: runsonmypc.com — not yet registered |
| 02 Keywords | waiting on SEMrush API units |
| 2027 coverage | 50 unreleased titles tracked, 19 with published requirements |
| 04 Repo | pushed to github.com/abdellatifox/runsonmypc (public) |
| 05 Cloudflare | not started — `wrangler.toml` ids are placeholders |
| 07 Design | first pass done — violet/cyan instrument-panel look, new homepage; inner page layouts still PCGameFit's |
| 08 Brand assets | mark (BrandMark.astro) + SVG favicon done; PNG icons, manifest icons and share cards not yet |

Known leftovers to clear in phase 06: `migrations/0002–0004` and the
`gpus`/`cpus`/`games` in `src/lib/fallback-data.json` are PCGameFit's old
seed (image URLs still point at cdn.pcgamefit.com). The live pages read the
Steam-derived JSON instead.
