# Event Radar

Přehled MMA turnajů, fotbalových zápasů, tenisu a koncertů s osobním seznamem, timeline a exportem do kalendáře.

## Odkud jsou data

| Kategorie | Zdroj | Klíč |
|---|---|---|
| MMA (UFC, OKTAGON, KSW, PFL) | Wikipedia | není potřeba |
| Menší organizace (RFA, PML, Cage Warriors, ONE, …) | kalendářové feedy [next-fight.com](https://next-fight.com/en/mma-organizations) | není potřeba |
| Fotbal | [football-data.org](https://www.football-data.org) | `FOOTBALL_DATA_TOKEN` |
| Koncerty | [Ticketmaster Discovery API](https://developer.ticketmaster.com) | `TICKETMASTER_KEY` (Consumer Key) |
| Tenis | ručně v `data.js` | – |

Co se stahuje (soutěže, kluby, haly, oblíbení interpreti) se nastavuje v [scripts/config.mjs](scripts/config.mjs).

## Lokálně

```sh
cp .env.example .env   # a doplň klíče
npm run update         # stáhne data do data/auto-events.js
open index.html
```

## Automatická aktualizace (GitHub)

Workflow [.github/workflows/update.yml](.github/workflows/update.yml) každý den ráno stáhne data, uloží je do repozitáře a nasadí web na GitHub Pages.

Jednorázové nastavení:
1. Settings → Secrets and variables → Actions → přidej `FOOTBALL_DATA_TOKEN` a `TICKETMASTER_KEY`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Actions → „Aktualizace událostí a nasazení webu“ → Run workflow.
