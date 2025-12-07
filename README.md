# MitchPom — NAIA Box Score Scraper

Small Node.js project that scrapes NAIA box score pages and exposes a tiny API plus a static frontend.

## What it does
- Fetches an NAIA box-score page (prestoSports) and parses team-level box score data with Cheerio.
- Computes several derived team stats (possessions, points-per-possession, eFG%, FT rate, True Shooting %, Off/Def/Net ratings, shot volume, and more).
- Serves a tiny static frontend (in `public/`) that calls the API and renders a compact comparison table.

## Quick start

Requirements: Node 18+ is OK but Node 24+ is recommended so the built-in `fetch` is available. If using an older Node, install `node-fetch` and update `scraper.js`.

Install dependencies:

```bash
npm install express cors cheerio
```

Run the server (serves `public/` on port 3000 by default):

```bash
node server.js
```

Smoke-test the scraper without the server:

```bash
node test.js
```

## API

GET /api/stats?url=<boxscore-url>

Example response shape (top-level):

{
  homeTeam: string,
  visitorTeam: string,
  home: { pts, fgm, fga, ftm, fta, oreb, defensiveRebounds, possessions, ppp, efg, efgPercent, ftRate, ftRateStr, ts, tsPercent, offrtg, defrtg, netrtg, ... },
  visitor: { ... }
}

Notes:
- Numeric fields are returned as Numbers. Several percent/derived values are returned both as numeric primitives and as friendly strings (e.g. `ftRate` and `ftRateStr`).
- The scraper relies on CSS selectors targeting the site structure under `#boxscore-tabpanel`; if the source HTML changes the parser may break.

## Frontend

Open http://localhost:3000 in a browser. Paste a box-score URL into the input and click "Get Stats". The frontend is defensive and accepts PPP under several keys (`ppp`, `pointsPerPossession`, `pointsperpossession`).

UX additions in this repo:
- Tooltips on any formula-based stat label (e.g. eFG%, TS%, Off/Def/Net) explaining the formula.
- A blue primary Get Stats button with hover / focus styles.
- Responsive layout: input and button sit inline and share height; they stack on narrow screens.

## Tests

A tiny smoke test exists at `tests/test_ratings.js` that asserts rating fields exist for both teams. Run it with:

```bash
node tests/test_ratings.js
```

## Troubleshooting
- If parsed numeric values are `NaN` or missing, inspect the raw HTML and the selectors in `scraper.js` — site structure changes are the most common cause.
- If `fetch` is undefined on your Node version, install `node-fetch` or upgrade Node.
- The frontend logs the full API response to the browser console (`console.log('FULL API DATA:', data)`) to help diagnose shape mismatches.

## Contributing / Notes
- The code uses CommonJS modules (require / module.exports). Keep edits in that style unless converting the whole project.
- Consider adding deterministic unit tests that use stored HTML fixtures (instead of calling the live site) for CI stability.

---
If you'd like, I can: (a) add a minimal `package.json` and lockfile, (b) add fixture-based unit tests for the scraper parsing logic, or (c) improve accessibility on the tooltips (aria-describedby and unique ids). Tell me which and I'll implement it.
