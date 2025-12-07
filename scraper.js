// scraper.js
// scraper.js
const cheerio = require('cheerio');

// Small helpers to keep parsing robust and readable
function textOrEmpty($el) {
  return ($el && $el.text) ? $el.text().trim() : '';
}

function toNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function safeSplit(str = '', sep = '-') {
  const parts = String(str).split(sep).map(s => s.trim());
  return parts;
}

function parseMakeAttempt(str) {
  // "7-20 49.2%" or "7-20" -> {made:7, att:20}
  const token = String(str).trim().split(/\s+/)[0] || '';
  const [a, b] = (token && token.split('-')) || [];
  return { made: toNumber(a), att: toNumber(b) };
}

function parseFtAndPercent(str) {
  // "15-20 35.0%" -> {ftm:15, fta:20, pct: '35.0%'}
  const parts = String(str).split(/\s+/).filter(Boolean);
  const ft = parts[0] || '';
  const pct = parts[1] || null;
  const [ftm, fta] = safeSplit(ft, '-').map(toNumber);
  return { ftm, fta, pct };
}

function parseTurnoversPlusPercent(str) {
  // "12 30.0%" -> {turnovers: 12, pct: '30.0%'}
  const parts = String(str).split(/\s+/).filter(Boolean);
  return { turnovers: toNumber(parts[0]), pct: parts[1] || null };
}

async function getGameStats(url) {
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);

  // Short helper to query within the #boxscore-tabpanel
  const q = sel => $(`#boxscore-tabpanel ${sel}`);

  // Team names
  const homeTeam = textOrEmpty(q('.home .team-name'));
  const visitorTeam = textOrEmpty(q('.visitor .team-name'));

  // Raw fields from the totals row (selectors are fragile; keep comments)
  const raw = {
    homePoints: textOrEmpty(q('.home .totals td:nth-of-type(13)')),
    visitorPoints: textOrEmpty(q('.visitor .totals td:nth-of-type(13)')),

    homeFGMA: textOrEmpty(q('.home .totals td:nth-of-type(2)')), // "25-64"
    visitorFGMA: textOrEmpty(q('.visitor .totals td:nth-of-type(2)')),

    homeFTMA3PP: textOrEmpty(q('.home .totals td:nth-of-type(4)')), // "15-20 35.0%"
    visitorFTMA3PP: textOrEmpty(q('.visitor .totals td:nth-of-type(4)')),

    home3PMAFGP: textOrEmpty(q('.home .totals td:nth-of-type(3)')), // "7-20 49.2%"
    visitor3PMAFGP: textOrEmpty(q('.visitor .totals td:nth-of-type(3)')),

    homeOREB: textOrEmpty(q('.home .totals td:nth-last-of-type(9)')),
  visitorOREB: textOrEmpty(q('.visitor .totals td:nth-last-of-type(9)')),
  // Defensive rebounds (assumed to be next to offensive rebounds in totals)
  homeDREB: textOrEmpty(q('.home .totals td:nth-last-of-type(8)')),
  visitorDREB: textOrEmpty(q('.visitor .totals td:nth-last-of-type(8)')),

    homeTurnovers3PP: textOrEmpty(q('.home .totals td:nth-last-of-type(3)')), // "12 30.0%"
    visitorTurnovers3PP: textOrEmpty(q('.visitor .totals td:nth-last-of-type(3)')),
  };

  // Parse numeric fields with guards
  const homePoints = toNumber(raw.homePoints);
  const visitorPoints = toNumber(raw.visitorPoints);

  const [homefgm, homefga] = safeSplit(raw.homeFGMA, '-').map(toNumber);
  const [visitorfgm, visitorfga] = safeSplit(raw.visitorFGMA, '-').map(toNumber);

  const { ftm: homeftm, fta: homefta, pct: homeFTPct } = parseFtAndPercent(raw.homeFTMA3PP);
  const { ftm: visitorftm, fta: visitorfta, pct: visitorFTPct } = parseFtAndPercent(raw.visitorFTMA3PP);

  const { made: home3PM, att: home3PA } = parseMakeAttempt(raw.home3PMAFGP);
  const home3PPct = (String(raw.home3PMAFGP).split(/\s+/)[1] || null);

  const { made: visitor3PM, att: visitor3PA } = parseMakeAttempt(raw.visitor3PMAFGP);
  const visitor3PPct = (String(raw.visitor3PMAFGP).split(/\s+/)[1] || null);

  const homeOREB = toNumber(raw.homeOREB);
  const visitorOREB = toNumber(raw.visitorOREB);
  const homeDREB = toNumber(raw.homeDREB);
  const visitorDREB = toNumber(raw.visitorDREB);

  const { turnovers: homeTurnovers } = parseTurnoversPlusPercent(raw.homeTurnovers3PP);
  const { turnovers: visitorTurnovers } = parseTurnoversPlusPercent(raw.visitorTurnovers3PP);

  // Advanced stats
  // Possessions (Dean Oliver estimate): FGA - OREB + TOV + 0.475 * FTA
  const homePossessions = (homefga - homeOREB + homeTurnovers) + (0.475 * homefta);
  const visitorPossessions = (visitorfga - visitorOREB + visitorTurnovers) + (0.475 * visitorfta);

  const homeppp = homePossessions ? (homePoints / homePossessions) : 0;
  const visitorppp = visitorPossessions ? (visitorPoints / visitorPossessions) : 0;

  // Turnover percentage: turnovers / possessions (as percent)
  const homeTurnoverPct = homePossessions ? (homeTurnovers / homePossessions) * 100 : null;
  const visitorTurnoverPct = visitorPossessions ? (visitorTurnovers / visitorPossessions) * 100 : null;

  // Effective field goal % (as numeric and string, rounded to 2 decimals)
  const homeEfg = homefga ? ((homefgm + 0.5 * home3PM) / homefga) * 100 : null;
  const visitorEfg = visitorfga ? ((visitorfgm + 0.5 * visitor3PM) / visitorfga) * 100 : null;

  const homeEfgStr = homeEfg != null ? `${homeEfg.toFixed(2)}%` : '—';
  const visitorEfgStr = visitorEfg != null ? `${visitorEfg.toFixed(2)}%` : '—';

  // Free Throw Rate = FTA / FGA
  const homeFtRate = homefga ? (homefta / homefga) : null;
  const visitorFtRate = visitorfga ? (visitorfta / visitorfga) : null;

  const homeFtRateNum = homeFtRate != null ? Number(homeFtRate.toFixed(3)) : null;
  const visitorFtRateNum = visitorFtRate != null ? Number(visitorFtRate.toFixed(3)) : null;

  // Expose FT rate both as a numeric fraction (ftRate) and a human-friendly percent string (ftRateStr)
  // e.g. ftRate: 0.39, ftRateStr: "39.0%"
  const homeFtRateStr = homeFtRate != null ? `${(homeFtRate * 100).toFixed(1)}%` : '—';
  const visitorFtRateStr = visitorFtRate != null ? `${(visitorFtRate * 100).toFixed(1)}%` : '—';

  // Field goal % (as percent) and difference between EFG and FG%
  const homeFgPct = homefga ? (homefgm / homefga) * 100 : null;
  const visitorFgPct = visitorfga ? (visitorfgm / visitorfga) * 100 : null;

  const homeFgEfgDiff = (homeEfg != null && homeFgPct != null) ? (homeEfg - homeFgPct) : null;
  const visitorFgEfgDiff = (visitorEfg != null && visitorFgPct != null) ? (visitorEfg - visitorFgPct) : null;

  const homeFgPctStr = homeFgPct != null ? `${homeFgPct.toFixed(2)}%` : '—';
  const visitorFgPctStr = visitorFgPct != null ? `${visitorFgPct.toFixed(2)}%` : '—';

  const homeFgEfgDiffStr = homeFgEfgDiff != null ? `${homeFgEfgDiff.toFixed(2)}%` : '—';
  const visitorFgEfgDiffStr = visitorFgEfgDiff != null ? `${visitorFgEfgDiff.toFixed(2)}%` : '—';

  // Offensive Rebound % (OR%) = OREB / (OREB + opponent DREB)
  // opponent DREB is the other team's defensive rebounds
  const homeOrPct = (homeOREB + visitorDREB) ? (homeOREB / (homeOREB + visitorDREB)) * 100 : null;
  const visitorOrPct = (visitorOREB + homeDREB) ? (visitorOREB / (visitorOREB + homeDREB)) * 100 : null;

  const homeOrPctStr = homeOrPct != null ? `${homeOrPct.toFixed(2)}%` : '—';
  const visitorOrPctStr = visitorOrPct != null ? `${visitorOrPct.toFixed(2)}%` : '—';

  // Shot Volume: (FGA + 0.475 * FTA) / Possessions
  const homeRawShot = (homefga + 0.475 * homefta);
  const visitorRawShot = (visitorfga + 0.475 * visitorfta);
  const homeShotVolume = homePossessions ? (homeRawShot / homePossessions) : null;
  const visitorShotVolume = visitorPossessions ? (visitorRawShot / visitorPossessions) : null;
  const homeShotVolumeNum = homeShotVolume != null ? Number(homeShotVolume.toFixed(3)) : null;
  const visitorShotVolumeNum = visitorShotVolume != null ? Number(visitorShotVolume.toFixed(3)) : null;
  const homeShotVolumeStr = homeShotVolume != null ? `${homeShotVolume.toFixed(3)}` : '—';
  const visitorShotVolumeStr = visitorShotVolume != null ? `${visitorShotVolume.toFixed(3)}` : '—';

  // Return a stable, frontend-friendly shape. Keep old keys but add a few helpful extras.
  return {
    homeTeam,
    visitorTeam,
    home: {
      pts: homePoints,
      fgm: homefgm,
      fga: homefga,
      ftm: homeftm,
      fta: homefta,
      oreb: homeOREB,
      defensiveRebounds: homeDREB,
      turnovers: homeTurnovers,
      threePointPercent: home3PPct || homeFTPct || null,
      possessions: homePossessions,
      ppp: Number(homeppp.toFixed(3)),
      turnoverPercent: homeTurnoverPct != null ? Number(homeTurnoverPct.toFixed(2)) : null,
      turnoverPercentStr: homeTurnoverPct != null ? `${homeTurnoverPct.toFixed(2)}%` : '—',
      offensiveReboundPercent: homeOrPct != null ? Number(homeOrPct.toFixed(2)) : null,
      offensiveReboundPercentStr: homeOrPct != null ? homeOrPctStr : '—',
      fgPercent: homeFgPct != null ? Number(homeFgPct.toFixed(2)) : null,
      fgPercentStr: homeFgPct != null ? homeFgPctStr : '—',
      fgEfgDiff: homeFgEfgDiff != null ? Number(homeFgEfgDiff.toFixed(2)) : null,
      fgEfgDiffStr: homeFgEfgDiff != null ? homeFgEfgDiffStr : '—',
      ftRate: homeFtRateNum,
      ftRateStr: homeFtRateStr,
      shotVolume: homeShotVolumeNum,
      shotVolumeStr: homeShotVolumeStr,
      threePointMade: home3PM,
      threePointAttempted: home3PA,
      threePointPercentRaw: home3PPct || null,
      efg: homeEfg != null ? Number(homeEfg.toFixed(2)) : null,
      efgPercent: homeEfgStr,
    },
    visitor: {
      pts: visitorPoints,
      fgm: visitorfgm,
      fga: visitorfga,
      ftm: visitorftm,
      fta: visitorfta,
      oreb: visitorOREB,
      defensiveRebounds: visitorDREB,
      turnovers: visitorTurnovers,
      threePointPercent: visitor3PPct || visitorFTPct || null,
      possessions: visitorPossessions,
      ppp: Number(visitorppp.toFixed(3)),
      turnoverPercent: visitorTurnoverPct != null ? Number(visitorTurnoverPct.toFixed(2)) : null,
      turnoverPercentStr: visitorTurnoverPct != null ? `${visitorTurnoverPct.toFixed(2)}%` : '—',
      offensiveReboundPercent: visitorOrPct != null ? Number(visitorOrPct.toFixed(2)) : null,
      offensiveReboundPercentStr: visitorOrPct != null ? visitorOrPctStr : '—',
      fgPercent: visitorFgPct != null ? Number(visitorFgPct.toFixed(2)) : null,
      fgPercentStr: visitorFgPct != null ? visitorFgPctStr : '—',
      fgEfgDiff: visitorFgEfgDiff != null ? Number(visitorFgEfgDiff.toFixed(2)) : null,
      fgEfgDiffStr: visitorFgEfgDiff != null ? visitorFgEfgDiffStr : '—',
  ftRate: visitorFtRateNum,
  ftRateStr: visitorFtRateStr,
      shotVolume: visitorShotVolumeNum,
      shotVolumeStr: visitorShotVolumeStr,
      threePointMade: visitor3PM,
      threePointAttempted: visitor3PA,
      threePointPercentRaw: visitor3PPct || null,
      efg: visitorEfg != null ? Number(visitorEfg.toFixed(2)) : null,
      efgPercent: visitorEfgStr,
    },
  };
}

module.exports = { getGameStats };
