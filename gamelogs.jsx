// ═════════════════════════════════════════════════════════════════
// GAME LOGS — fetch real per-week stats from Sleeper
// ═════════════════════════════════════════════════════════════════
//
// Sleeper exposes per-week stats at:
//   https://api.sleeper.app/stats/nfl/regular/<year>/<week>
// Each call returns an object keyed by player_id. We fetch all 18 weeks
// of a season in parallel (with light concurrency cap), aggregate by
// player_id, and cache the season per-player to keep memory sane.
//
// Cache strategy: per-(playerId, season) → array of {week, stats}.
// Stored under pressbox.gamelogs.<season>.<playerId> with a 14-day TTL.

const GAMELOGS_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const GAMELOGS_PREFIX = 'pressbox.gamelogs.';

function cacheKey(season, playerId){ return `${GAMELOGS_PREFIX}${season}.${playerId}`; }

function readGameLogCache(season, playerId){
  try {
    const raw = localStorage.getItem(cacheKey(season, playerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > GAMELOGS_TTL_MS) return null;
    return parsed.data;
  } catch(e){ return null; }
}
function writeGameLogCache(season, playerId, data){
  try {
    localStorage.setItem(cacheKey(season, playerId), JSON.stringify({ ts: Date.now(), data }));
  } catch(e){
    // Quota exceeded — try to clean older logs
    try {
      Object.keys(localStorage).filter(k => k.startsWith(GAMELOGS_PREFIX)).slice(0,50).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(cacheKey(season, playerId), JSON.stringify({ ts: Date.now(), data }));
    } catch(e2){}
  }
}

// Concurrency-limited parallel fetch
async function pmap(items, fn, limit=4){
  const out = new Array(items.length);
  let i = 0;
  async function worker(){
    while (i < items.length){
      const cur = i++;
      try { out[cur] = await fn(items[cur], cur); }
      catch(e){ out[cur] = null; }
    }
  }
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
  return out;
}

async function fetchSeasonForPlayer(season, playerId){
  const cached = readGameLogCache(season, playerId);
  if (cached) return cached;

  const weeks = Array.from({length: 18}, (_, i) => i+1);
  const results = await pmap(weeks, async (wk) => {
    try {
      const r = await fetch(`https://api.sleeper.app/stats/nfl/regular/${season}/${wk}`);
      if (!r.ok) return { week: wk, stats: null };
      const json = await r.json();
      const stats = json?.[playerId];
      return { week: wk, stats: stats || null };
    } catch(e){
      return { week: wk, stats: null };
    }
  }, 4);

  // Always return a full 18-week array of {week,stats} — never null entries.
  const safe = results.map((r, i) => r && typeof r==='object' ? r : { week: i+1, stats: null });
  writeGameLogCache(season, playerId, safe);
  return safe;
}

function useGameLogs(sleeperId, season){
  const [data, setData] = React.useState(() => sleeperId && season ? readGameLogCache(season, sleeperId) : null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!sleeperId || !season) return;
    const cached = readGameLogCache(season, sleeperId);
    if (cached) { setData(cached); return; }
    let cancelled = false;
    setLoading(true); setError(null);
    fetchSeasonForPlayer(season, sleeperId)
      .then(d => { if (!cancelled) { setData(d); setLoading(false); }})
      .catch(e => { if (!cancelled) { setError(e.message||'fetch failed'); setLoading(false); }});
    return () => { cancelled = true; };
  }, [sleeperId, season]);

  return { data, loading, error };
}

// Compute fantasy points (PPR) from a stats object using common fields.
function fantasyPointsPPR(s){
  if (!s) return null;
  const pts =
    (s.pass_yd||0)*0.04 + (s.pass_td||0)*4 + (s.pass_int||0)*-2 + (s.pass_2pt||0)*2 +
    (s.rush_yd||0)*0.1 + (s.rush_td||0)*6 + (s.rush_2pt||0)*2 +
    (s.rec||0)*1 + (s.rec_yd||0)*0.1 + (s.rec_td||0)*6 + (s.rec_2pt||0)*2 +
    (s.fum_lost||0)*-2 +
    // K
    (s.fgm_0_19||0)*3 + (s.fgm_20_29||0)*3 + (s.fgm_30_39||0)*3 + (s.fgm_40_49||0)*4 + (s.fgm_50p||0)*5 + (s.xpm||0)*1 + (s.fgmiss||0)*-1 + (s.xpmiss||0)*-1;
  return pts;
}

// Stat lines per position
function statLineFor(pos, s){
  if (!s) return [];
  if (pos==='QB') return [
    ['Pass Yd', s.pass_yd||0], ['Pass TD', s.pass_td||0], ['INT', s.pass_int||0],
    ['Cmp/Att', `${s.pass_cmp||0}/${s.pass_att||0}`],
    ['Rush Yd', s.rush_yd||0], ['Rush TD', s.rush_td||0]
  ];
  if (pos==='RB') return [
    ['Rush Yd', s.rush_yd||0], ['Rush TD', s.rush_td||0], ['Att', s.rush_att||0],
    ['Rec', s.rec||0], ['Rec Yd', s.rec_yd||0], ['Rec TD', s.rec_td||0]
  ];
  if (pos==='WR' || pos==='TE') return [
    ['Rec', s.rec||0], ['Tgt', s.rec_tgt||0],
    ['Rec Yd', s.rec_yd||0], ['Rec TD', s.rec_td||0],
    ['Rush Yd', s.rush_yd||0], ['Rush TD', s.rush_td||0]
  ];
  if (pos==='K') return [
    ['FG Made', (s.fgm_0_19||0)+(s.fgm_20_29||0)+(s.fgm_30_39||0)+(s.fgm_40_49||0)+(s.fgm_50p||0)],
    ['FG 50+', s.fgm_50p||0], ['XP', s.xpm||0], ['Miss', (s.fgmiss||0)+(s.xpmiss||0)]
  ];
  return [];
}

Object.assign(window, { useGameLogs, fantasyPointsPPR, statLineFor, fetchSeasonForPlayer });
