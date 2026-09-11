# Domain search (phase 01)

Checked 2026-09-11. Re-check the chosen name right before buying — availability changes.

Requirement from the owner: the name must say what the site does (checks whether a
game runs on your PC: requirements, FPS, bottleneck). Abstract brands like
rigverdicts.com were rejected.

Method: 133 descriptive candidates, each checked for registration via Verisign RDAP
(`404` = unregistered), for Wayback Machine history, and with a web search for an
existing brand. 90 were unregistered. The best were re-checked a second time.

## Shortlist — all unregistered, zero archived history, `.net` also free

| Domain | Length | Reads as | Notes |
|---|---|---|---|
| **runsonmypc.com** | 14 | "Runs On My PC" | The exact question the site answers. Natural phrase, easy to say and remember. |
| **pcreqs.com** | 10 | "PC Reqs" (requirements) | Shortest. "Reqs" is common gamer shorthand. Matches the biggest template (game requirements pages). |
| **willitrunpc.com** | 15 | "Will It Run — PC" | Matches "will it run" searches; grammar slightly off. |
| **sysreqcheck.com** | 15 | "System Requirements Check" | Very literal. Close in idea to the competitor sysrqmts.com. |
| **pcgamereqs.com** | 14 | "PC Game Requirements" | Descriptive, but the `pcgame…` shape is close to pcgamecheck.com — the main competitor. |
| **gamereqcheck.com** | 16 | "Game Requirements Check" | One character over the 15 limit. |

## Rejected — unregistered but with a past
- **canirunthisgame.com** — a large site archived 2013–2022, then dropped.
- **mypccheck.com** — a site archived from 2011, 200/403 captures over years.
- **willmypcrunit.com** — captures in 2016–2017.
- **canmyrigrunit.com** — a capture in 2025.

## Rejected by the owner (round 1)
rigverdicts.com, pcverdict.com, rigreckon.com, specjudge.com — not descriptive enough.

## Commands
```bash
# 404 = unregistered
curl -s -o /dev/null -w "%{http_code}\n" https://rdap.verisign.com/com/v1/domain/NAME.com
# any rows = the name has a past
curl -s "http://web.archive.org/cdx/search/cdx?url=NAME.com*&output=txt"
```
