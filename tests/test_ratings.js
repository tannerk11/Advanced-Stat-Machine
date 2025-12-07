const assert = require('assert');
const { getGameStats } = require('../scraper');

(async () => {
  const url = 'https://naiastats.prestosports.com/sports/mbkb/2025-26/boxscores/20251125_fopn.xml?view=boxscore';
  const stats = await getGameStats(url);
  console.log('Got stats keys:', Object.keys(stats.home));

  // Basic assertions for the new metrics
  assert(stats.home.offrtg != null, 'home.offrtg should be present');
  assert(stats.home.defrtg != null, 'home.defrtg should be present');
  assert(stats.home.netrtg != null, 'home.netrtg should be present');

  assert(stats.visitor.offrtg != null, 'visitor.offrtg should be present');
  assert(stats.visitor.defrtg != null, 'visitor.defrtg should be present');
  assert(stats.visitor.netrtg != null, 'visitor.netrtg should be present');

  // Types
  assert(typeof stats.home.offrtg === 'number', 'home.offrtg should be a number');
  assert(typeof stats.home.defrtg === 'number', 'home.defrtg should be a number');
  assert(typeof stats.home.netrtg === 'number', 'home.netrtg should be a number');

  console.log('Rating tests passed.');
})().catch(err => {
  console.error('Rating test failed:', err);
  process.exit(1);
});
