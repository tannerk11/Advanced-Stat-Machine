## Quick orientation

This is a small Node.js project that scrapes NAIA box score pages and exposes a tiny API plus a static frontend.

- Entry points:
  - `server.js` — Express server. Serves `public/` and exposes GET `/api/stats?url=...` which calls the scraper.
  - `scraper.js` — HTML scraping logic using Cheerio and built-in `fetch` (Node 24+). Exports `getGameStats(url)`.
  - `test.js` — minimal script that calls `getGameStats()` with an example box-score URL and prints the output.
  - `public/index.html` — tiny frontend that calls `/api/stats` and renders results.

## High-level architecture / data flow

1. Frontend (`public/index.html`) sends GET /api/stats?url=<boxscore-url> to the same origin.
2. `server.js` receives the request and forwards the `url` to `getGameStats(url)` from `scraper.js`.
3. `scraper.js` fetches the remote HTML, parses it with Cheerio and returns a structured object containing:
   - `homeTeam`, `visitorTeam` (strings)
   - `home` and `visitor` objects with numeric fields: `pts`, `fgm`, `fga`, `ftm`, `fta`, `oreb`, `turnovers`, `possessions`, `ppp`
   - `threePointPercent` is left as the original percentage string (e.g. "35.0%")
4. The server returns JSON; the frontend renders it. The frontend is defensive and will accept PPP exposed under several names (`ppp`, `pointsPerPossession`, `pointsperpossession`).

## Important patterns and conventions (project-specific)

- CommonJS modules (require / module.exports). Keep edits in the same style unless converting the whole project.
- Scraper expects tightly-coupled CSS selectors targeting the element with id "boxscore-tabpanel" (for the `.home` and `.visitor` blocks) and specific `td:nth-of-type(...)` positions — changes to the source HTML will break parsing.
- Several scraper fields are parsed from compound strings (e.g. "25-64" → `fgm`/`fga`, "15-20 35.0%" → `ftm`/`fta` + `3P%`). Treat these parsing steps as fragile and add checks if you change them.
- Numeric fields are returned as Numbers. Percentage values for 3P are returned as raw strings.

## Common developer workflows / commands (how to run locally)

1. Install dependencies (project doesn't include package.json in the repo snapshot). From the project root, install at least:

   npm install express cors cheerio

   - If using Node <24, also install `node-fetch` and update `scraper.js` accordingly.

2. Run the server:

   node server.js

   - Server starts on port 3000 and serves `public/` at http://localhost:3000

3. Quick scraper smoke test (no server):

   node test.js

   - `test.js` uses an example NAIA boxscore URL; output is printed to stdout.

## Known failure modes / debugging tips

- If parsed numeric values are NaN, inspect the raw HTML and the selectors in `scraper.js` — the site structure likely changed.
- If `fetch` is undefined on your Node version, install and require `node-fetch` or run on Node 24+.
- Check `console.error` output from `server.js` — the server logs scraper exceptions and returns a 500.
- Frontend will log the full API response to the browser console (`console.log('FULL API DATA:', data)`), which helps diagnose shape mismatches.

## Useful examples from the codebase

- API usage example (frontend): `/api/stats?url=${encodeURIComponent(url)}` — see `public/index.html`.
- Test URL used in `test.js`:
  `https://naiastats.prestosports.com/sports/mbkb/2025-26/boxscores/20251125_fopn.xml?view=boxscore`
- PPP fallback logic in `public/index.html` demonstrates tolerant consumers — prefer adding `ppp` to the server response, but the frontend will accept alternate names.

## Small maintenance notes for contributors

- If you update selectors in `scraper.js`, add one-line comments showing the example HTML snippet or a link to a sample page used for testing.
- Keep the API shape stable: `home` / `visitor` objects with numeric primitives are relied upon by the frontend.

---
If you'd like, I can (a) create a minimal `package.json` and install dependencies, (b) add a small unit test that validates the parsing logic for one example HTML fragment, or (c) expand this file to include a short troubleshooting checklist. Which would you prefer? 
