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

## Identity

Domain, brand, contact address and fetcher User-Agent live only in
`src/lib/site.ts`. Never type them anywhere else.

## Status

| Phase | State |
|---|---|
| 00 Decisions | done |
| 01 Domain | chosen: runsonmypc.com — not yet registered |
| 02 Keywords | waiting on SEMrush API units |
| 04 Repo | local git; no GitHub remote yet |
| 05 Cloudflare | not started — `wrangler.toml` ids are placeholders |
| 07 Design | not started — still PCGameFit's look |
| 08 Brand assets | not started — no favicon, logo or share cards yet |

Known leftovers to clear in phase 06: `migrations/0002–0004` and the
`gpus`/`cpus`/`games` in `src/lib/fallback-data.json` are PCGameFit's old
seed (image URLs still point at cdn.pcgamefit.com). The live pages read the
Steam-derived JSON instead.
