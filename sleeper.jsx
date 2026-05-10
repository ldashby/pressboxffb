// ═════════════════════════════════════════════════════════════════
// SLEEPER API — live NFL data, 24h cache
// ═════════════════════════════════════════════════════════════════

const SLEEPER_CACHE_KEY = 'pressbox.sleeper.v1';
const SLEEPER_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Full players index is ~5MB — cache for 7 days. We derive a slim lookup
// (id → name, team, position, age, height, weight, college, years_exp,
// fantasy_positions, depth_chart_position, depth_chart_order, status,
// injury_status, injury_notes, news_updated, headshot/full_name etc.)
// from the raw payload to keep memory reasonable.
const SLEEPER_PLAYERS_KEY = 'pressbox.sleeperPlayers.v1';
const SLEEPER_PLAYERS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function fetchJSON(url){
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

function readCache(){
  try {
    const raw = localStorage.getItem(SLEEPER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts) return null;
    if (Date.now() - parsed.ts > SLEEPER_TTL_MS) return null;
    return parsed;
  } catch(e) { return null; }
}

function writeCache(data){
  try {
    localStorage.setItem(SLEEPER_CACHE_KEY, JSON.stringify({ ts: Date.now(), ...data }));
  } catch(e){}
}

// Fetch + cache: NFL state, trending adds, trending drops.
// We deliberately AVOID the full /players/nfl payload (~5MB). Trending
// endpoints give us ids; we use the seeded player list as the labels.
async function refreshSleeper(force){
  if (!force) {
    const cached = readCache();
    if (cached) return cached;
  }
  try {
    const [state, addsRaw, dropsRaw] = await Promise.all([
      fetchJSON('https://api.sleeper.app/v1/state/nfl'),
      fetchJSON('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=15'),
      fetchJSON('https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=15')
    ]);
    const data = { state, adds: addsRaw, drops: dropsRaw };
    writeCache(data);
    return { ts: Date.now(), ...data };
  } catch(e){
    // Network blocked or offline — return null so UI can fall back gracefully.
    return null;
  }
}

function useSleeper(){
  const [data, setData] = React.useState(() => readCache());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const refresh = React.useCallback(async (force) => {
    setLoading(true); setError(null);
    const result = await refreshSleeper(force);
    if (result) setData(result); else setError('Live feed unavailable');
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!data) refresh(false);
    // schedule auto-refresh once per hour to catch the 24h window
    const id = setInterval(() => refresh(false), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return { data, loading, error, refresh };
}

// ───────────── Players index (rich profile data) ─────────────

function readPlayersCache(){
  try {
    const raw = localStorage.getItem(SLEEPER_PLAYERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts) return null;
    if (Date.now() - parsed.ts > SLEEPER_PLAYERS_TTL_MS) return null;
    return parsed.data;
  } catch(e){ return null; }
}
function writePlayersCache(data){
  try {
    localStorage.setItem(SLEEPER_PLAYERS_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch(e){
    // QuotaExceededError is real — try a smaller subset (active fantasy-relevant only)
    try {
      const trimmed = {};
      const ACTIVE_POS = new Set(['QB','RB','WR','TE','K','DEF']);
      Object.entries(data).forEach(([id, p]) => {
        if (p && p.team && ACTIVE_POS.has(p.position)) trimmed[id] = p;
      });
      localStorage.setItem(SLEEPER_PLAYERS_KEY, JSON.stringify({ ts: Date.now(), data: trimmed }));
    } catch(e2){ /* give up gracefully */ }
  }
}

// Slim a player record so we don't bloat localStorage with kickers' middle names.
function slimPlayer(p){
  if (!p) return null;
  return {
    player_id: p.player_id,
    full_name: p.full_name || ((p.first_name||'')+' '+(p.last_name||'')).trim(),
    first_name: p.first_name,
    last_name: p.last_name,
    team: p.team,
    position: p.position,
    fantasy_positions: p.fantasy_positions,
    age: p.age,
    height: p.height,
    weight: p.weight,
    college: p.college,
    years_exp: p.years_exp,
    number: p.number,
    status: p.status,
    injury_status: p.injury_status,
    injury_body_part: p.injury_body_part,
    injury_notes: p.injury_notes,
    depth_chart_position: p.depth_chart_position,
    depth_chart_order: p.depth_chart_order,
    news_updated: p.news_updated,
    birth_date: p.birth_date
  };
}

async function fetchPlayersIndex(){
  // Pulls the giant players/nfl payload, slims it, caches.
  const raw = await fetchJSON('https://api.sleeper.app/v1/players/nfl');
  const slim = {};
  Object.entries(raw).forEach(([id, p]) => {
    if (!p) return;
    // Filter to fantasy-relevant: must have a team OR fantasy_positions overlap.
    const isActive = p.team || (p.fantasy_positions && p.fantasy_positions.length);
    if (!isActive) return;
    slim[id] = slimPlayer(p);
  });
  writePlayersCache(slim);
  return slim;
}

function usePlayersIndex(){
  const [index, setIndex] = React.useState(() => readPlayersCache());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const ensureLoaded = React.useCallback(async () => {
    if (index) return index;
    setLoading(true); setError(null);
    try {
      const data = await fetchPlayersIndex();
      setIndex(data);
      setLoading(false);
      return data;
    } catch(e){
      setError(e.message || 'Failed to load player index');
      setLoading(false);
      return null;
    }
  }, [index]);

  React.useEffect(() => {
    if (!index) ensureLoaded();
  }, []);

  return { index, loading, error, ensureLoaded };
}

// Resolve by id, or by normalized name match (used for our seeded players).
function findInIndex(index, { id, name }){
  if (!index) return null;
  if (id && index[id]) return index[id];
  if (!name) return null;
  const target = name.toLowerCase().replace(/[^a-z0-9]/g,'');
  for (const id in index){
    const p = index[id];
    if (!p?.full_name) continue;
    if (p.full_name.toLowerCase().replace(/[^a-z0-9]/g,'') === target) return p;
  }
  return null;
}

// Build a depth chart for a team from the index.
function teamDepthChart(index, team){
  if (!index || !team) return {};
  const byPos = { QB:[], RB:[], WR:[], TE:[], K:[] };
  Object.values(index).forEach(p => {
    if (p.team !== team) return;
    const pos = p.depth_chart_position || p.position;
    if (!byPos[pos]) return;
    byPos[pos].push(p);
  });
  Object.keys(byPos).forEach(pos => {
    byPos[pos].sort((a,b) => (a.depth_chart_order||99) - (b.depth_chart_order||99));
  });
  return byPos;
}

function formatRelTime(ts){
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

Object.assign(window, {
  useSleeper, refreshSleeper, formatRelTime,
  usePlayersIndex, findInIndex, teamDepthChart, fetchPlayersIndex
});
