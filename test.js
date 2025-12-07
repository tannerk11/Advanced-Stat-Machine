// test.js
const { getGameStats } = require('./scraper'); // or 'n./scraper-javascript' if you kept that name

(async () => {
  const url = 'https://naiastats.prestosports.com/sports/mbkb/2025-26/boxscores/20251125_fopn.xml?view=boxscore';
  const stats = await getGameStats(url);
  console.log(JSON.stringify(stats, null, 2));
})();
