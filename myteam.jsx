// ═════════════════════════════════════════════════════════════════
// MY TEAM — pull a fantasy roster from Sleeper / ESPN public /
// or paste a roster (Yahoo, CBS, anything else) for quick rankings
// access without leaving Press Box.
// ═════════════════════════════════════════════════════════════════

const MYTEAM_KEY = 'pressbox.myTeam.v1';

function loadMyTeam(){
  try { return JSON.parse(localStorage.getItem(MYTEAM_KEY) || 'null'); } catch(e){ return null; }
}
function saveMyTeam(t){
  try { localStorage.setItem(MYTEAM_KEY, JSON.stringify(t)); } catch(e){}
}

// Resolve a player name → our ranked list / Sleeper index entry
function resolvePlayer(name, players, sleeperIdx){
  const target = name.toLowerCase().replace(/[^a-z0-9]/g,'');
  // 1) match against our ranked players first (best — has PB rank)
  const ranked = players.find(p => p.name.toLowerCase().replace(/[^a-z0-9]/g,'') === target);
  if (ranked) return { source: 'pb', name: ranked.name, pos: ranked.pos, team: ranked.team, rank: ranked.rank, pb: ranked.pb, sleeperId: null };
  // 2) Sleeper index by full_name
  if (sleeperIdx) {
    for (const id in sleeperIdx) {
      const s = sleeperIdx[id];
      if (!s?.full_name) continue;
      if (s.full_name.toLowerCase().replace(/[^a-z0-9]/g,'') === target) {
        return { source: 'sleeper', name: s.full_name, pos: s.position, team: s.team || 'FA', rank: null, pb: null, sleeperId: id };
      }
    }
  }
  return { source: 'unknown', name, pos: '—', team: '—', rank: null, pb: null, sleeperId: null };
}

// ── Sleeper username → leagues → roster fetcher ──────────────────
async function fetchSleeperLeagues(username, season){
  const u = await (await fetch('https://api.sleeper.app/v1/user/' + encodeURIComponent(username))).json();
  if (!u || !u.user_id) throw new Error('Sleeper user not found');
  const leagues = await (await fetch(`https://api.sleeper.app/v1/user/${u.user_id}/leagues/nfl/${season}`)).json();
  return { user: u, leagues: leagues || [] };
}

async function fetchSleeperRoster(leagueId, userId, sleeperIdx){
  const [rosters, users] = await Promise.all([
    (await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`)).json(),
    (await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`)).json()
  ]);
  const my = (rosters || []).find(r => r.owner_id === userId);
  if (!my) throw new Error('No roster found in this league for that user');
  const ids = (my.players || []);
  const starters = new Set(my.starters || []);
  const players = ids.map(id => {
    const s = sleeperIdx?.[id];
    return {
      sleeperId: id,
      name: s ? (s.full_name || `${s.first_name||''} ${s.last_name||''}`.trim()) : ('id ' + id),
      pos: s?.position || '—',
      team: s?.team || 'FA',
      starter: starters.has(id)
    };
  });
  return { roster: my, users: users || [], players };
}

// ── ESPN public-league fetcher ───────────────────────────────────
async function fetchEspnRoster(leagueId, season, teamId){
  // ESPN's "lm-api-reads" endpoint returns roster for public leagues without auth
  const url = `https://lm-api-reads.fantasy.espn.com/apiv3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?view=mRoster&view=mTeam`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('ESPN league not public or not found (HTTP ' + r.status + ')');
  const j = await r.json();
  const team = (j.teams || []).find(t => t.id === Number(teamId));
  if (!team) throw new Error('Team ID not found in this league');
  const ESPN_POS = {1:'QB',2:'RB',3:'WR',4:'TE',5:'K',16:'DEF'};
  const players = (team.roster?.entries || []).map(e => {
    const p = e.playerPoolEntry?.player || {};
    return {
      espnId: p.id, name: p.fullName || 'Unknown',
      pos: ESPN_POS[p.defaultPositionId] || '—',
      team: p.proTeamId ? '' : 'FA', // ESPN uses numeric team ids; skip mapping
      starter: e.lineupSlotId !== 20 && e.lineupSlotId !== 21
    };
  });
  return { team, players };
}

// ── Paste-roster parser ──────────────────────────────────────────
// Accepts: one player per line, optionally "Name, POS, TEAM" or "POS  Name TEAM"
function parsePastedRoster(text){
  return text.split(/\n+/).map(line => {
    const t = line.trim();
    if (!t) return null;
    // strip leading lineup slot ("QB  Patrick Mahomes  KC")
    const slotMatch = t.match(/^(QB|RB|WR|TE|K|FLEX|BN|IR|DEF|D\/ST|DST)\s+/i);
    let rest = t;
    let pos = null;
    if (slotMatch) { pos = slotMatch[1].toUpperCase(); rest = t.slice(slotMatch[0].length); }
    // strip trailing team abbreviation ("Patrick Mahomes KC" or "... KC - QB")
    const teamMatch = rest.match(/\s+([A-Z]{2,3})(?:\s*[-,]\s*(QB|RB|WR|TE|K|DEF))?\s*$/);
    let name = rest; let team = null;
    if (teamMatch) { team = teamMatch[1]; name = rest.slice(0, teamMatch.index).trim(); if (teamMatch[2]) pos = teamMatch[2]; }
    // strip leading numbers, slot tags like "1." or "*"
    name = name.replace(/^[\d.*\-•·)]+\s*/, '').replace(/,$/,'').trim();
    if (!name) return null;
    return { name, pos: pos || '—', team: team || '—', starter: false };
  }).filter(Boolean);
}

// ── Main page ────────────────────────────────────────────────────
function MyTeamPage({players, playersIdx, openDrawer}){
  const [team, setTeamRaw] = React.useState(loadMyTeam);
  const [tab, setTab] = React.useState('sleeper'); // sleeper / espn / paste
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);

  const setTeam = (t) => { setTeamRaw(t); saveMyTeam(t); };

  const sleeperIdx = playersIdx?.index || null;

  // Sleeper inputs
  const [slUser, setSlUser] = React.useState(team?.source==='sleeper' ? team.username : '');
  const [slSeason, setSlSeason] = React.useState(String(new Date().getFullYear()));
  const [slLeagues, setSlLeagues] = React.useState([]);
  const [slUserId, setSlUserId] = React.useState(null);

  async function loadSleeperLeagues(){
    setBusy(true); setError(null);
    try {
      const { user, leagues } = await fetchSleeperLeagues(slUser, slSeason);
      setSlUserId(user.user_id);
      setSlLeagues(leagues);
      if (leagues.length === 0) setError('No Sleeper leagues found for ' + slUser + ' in ' + slSeason);
    } catch(e){ setError(e.message); }
    setBusy(false);
  }
  async function pickSleeperLeague(league){
    setBusy(true); setError(null);
    try {
      // ensure player index loaded for name resolution
      const idx = sleeperIdx || (playersIdx?.ensureLoaded ? await playersIdx.ensureLoaded() : null);
      const { players: ros } = await fetchSleeperRoster(league.league_id, slUserId, idx);
      setTeam({
        source: 'sleeper', username: slUser, season: slSeason,
        leagueName: league.name, leagueId: league.league_id,
        players: ros, savedAt: Date.now()
      });
      setSlLeagues([]);
    } catch(e){ setError(e.message); }
    setBusy(false);
  }

  // ESPN inputs
  const [espnLeague, setEspnLeague] = React.useState('');
  const [espnTeam, setEspnTeam] = React.useState('');
  const [espnSeason, setEspnSeason] = React.useState(String(new Date().getFullYear()));
  async function loadEspn(){
    setBusy(true); setError(null);
    try {
      const { team: t, players: ros } = await fetchEspnRoster(espnLeague, espnSeason, espnTeam);
      setTeam({
        source: 'espn', leagueId: espnLeague, teamId: espnTeam, season: espnSeason,
        leagueName: 'ESPN League ' + espnLeague,
        players: ros, savedAt: Date.now()
      });
    } catch(e){ setError(e.message); }
    setBusy(false);
  }

  // Paste
  const [pasted, setPasted] = React.useState('');
  function loadPasted(){
    const ros = parsePastedRoster(pasted);
    if (ros.length === 0) { setError('Could not parse any players. One per line: "Patrick Mahomes KC" or "QB Patrick Mahomes KC".'); return; }
    setTeam({ source: 'paste', leagueName: 'My Pasted Roster', players: ros, savedAt: Date.now() });
    setPasted('');
  }

  function clearTeam(){
    if (confirm('Clear saved team?')) { setTeam(null); setError(null); }
  }

  // ── Resolved roster table ─────────────────────────────────────
  function rosterTable(){
    if (!team) return null;
    const resolved = team.players.map(p => {
      const r = resolvePlayer(p.name, players, sleeperIdx);
      return { ...p, ...r, name: p.name }; // keep original name display
    });
    // group by position
    const byPos = {};
    resolved.forEach(p => { (byPos[p.pos] = byPos[p.pos] || []).push(p); });
    const order = ['QB','RB','WR','TE','K','DEF','—'];

    return (
      <div style={{marginTop:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:14,paddingBottom:10,borderBottom:'1px solid var(--rule-soft)'}}>
          <div>
            <div className="eyebrow-accent">{team.leagueName}</div>
            <div className="byline" style={{fontSize:12,color:'var(--ink-3)'}}>
              {team.players.length} players · pulled {new Date(team.savedAt).toLocaleString()} · source: {team.source}
            </div>
          </div>
          <button className="btn ghost" onClick={clearTeam}>Clear</button>
        </div>
        {order.filter(p => byPos[p]).map(pos => (
          <div key={pos} style={{marginBottom:18}}>
            <div className="eyebrow" style={{marginBottom:6,color:'var(--accent)'}}>{pos}</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'var(--fs)',fontSize:14}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--rule-soft)'}}>
                  <th style={{textAlign:'left',padding:'6px 8px',fontFamily:'var(--fm)',fontSize:10,letterSpacing:'.08em',color:'var(--ink-3)'}}>Player</th>
                  <th style={{textAlign:'left',padding:'6px 8px',fontFamily:'var(--fm)',fontSize:10,letterSpacing:'.08em',color:'var(--ink-3)'}}>Team</th>
                  <th style={{textAlign:'right',padding:'6px 8px',fontFamily:'var(--fm)',fontSize:10,letterSpacing:'.08em',color:'var(--ink-3)'}}>PB Rank</th>
                  <th style={{textAlign:'right',padding:'6px 8px',fontFamily:'var(--fm)',fontSize:10,letterSpacing:'.08em',color:'var(--ink-3)'}}>PB Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {byPos[pos].map((p,i) => {
                  const ranked = p.source === 'pb';
                  const found = p.source !== 'unknown';
                  return (
                    <tr key={i} style={{borderBottom:'1px solid var(--rule-softer)',cursor: ranked?'pointer':'default'}}
                      onClick={()=>{ if (ranked && openDrawer) openDrawer(players.find(rp => rp.name === p.name)); }}>
                      <td style={{padding:'8px',fontWeight:600,opacity: found?1:0.55}}>
                        {p.starter && <span style={{color:'var(--accent)',marginRight:6,fontSize:10,fontFamily:'var(--fm)'}}>★</span>}
                        {p.name}
                      </td>
                      <td style={{padding:'8px',fontFamily:'var(--fm)',fontSize:11,color:'var(--ink-3)'}}>{p.team}</td>
                      <td style={{padding:'8px',textAlign:'right',fontFamily:'var(--fm)',fontWeight:600}}>
                        {p.rank ? '#'+p.rank : <span style={{color:'var(--ink-4)'}}>—</span>}
                      </td>
                      <td style={{padding:'8px',textAlign:'right',fontFamily:'var(--fm)',fontWeight:600,color: ranked?'var(--accent)':'var(--ink-4)'}}>
                        {p.pb ? p.pb.toFixed(1) : '—'}
                      </td>
                      <td style={{padding:'8px',textAlign:'right'}}>
                        {!found && <span style={{fontSize:10,color:'var(--ink-4)',fontStyle:'italic'}}>not in PB board</span>}
                        {ranked && <span className="btn ghost" style={{fontSize:10,padding:'2px 6px'}}>view →</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{borderBottom:'2px solid var(--rule)',paddingBottom:16,marginBottom:24}}>
        <div className="eyebrow-accent" style={{marginBottom:6}}>Quick Access</div>
        <h1 style={{fontFamily:'var(--fs)',fontSize:42,fontWeight:700,letterSpacing:'-.02em'}}>My Team</h1>
        <p className="byline" style={{marginTop:8,fontSize:14,color:'var(--ink-3)',maxWidth:'62ch'}}>
          Pull your fantasy roster from any league and see it through the Press Box lens — PB ranks, scores, and one-tap player profiles. Saved locally to this device.
        </p>
      </div>

      {!team && (
        <>
          <div style={{display:'flex',gap:0,marginBottom:18,borderBottom:'1px solid var(--rule-soft)'}}>
            {[
              {k:'sleeper', l:'Sleeper'},
              {k:'espn', l:'ESPN (Public)'},
              {k:'paste', l:'Paste Roster'},
            ].map(t => (
              <button key={t.k} onClick={()=>{setTab(t.k); setError(null);}}
                style={{padding:'10px 18px',background:'none',border:'none',borderBottom:tab===t.k?'2px solid var(--accent)':'2px solid transparent',
                  fontFamily:'var(--fm)',fontSize:11,letterSpacing:'.08em',textTransform:'uppercase',
                  color:tab===t.k?'var(--accent)':'var(--ink-3)',cursor:'pointer',marginBottom:-1}}>
                {t.l}
              </button>
            ))}
          </div>

          {tab === 'sleeper' && (
            <div style={{maxWidth:520}}>
              <p style={{fontFamily:'var(--fs)',fontSize:14,color:'var(--ink-2)',marginBottom:14,lineHeight:1.5}}>
                Enter your Sleeper username — we'll list your leagues for the season and you pick.
              </p>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr auto',gap:8,marginBottom:8}}>
                <input value={slUser} onChange={e=>setSlUser(e.target.value)} placeholder="sleeper username"
                  style={{padding:'10px 12px',fontFamily:'var(--fs)',fontSize:14,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)'}}/>
                <input value={slSeason} onChange={e=>setSlSeason(e.target.value)} placeholder="2026"
                  style={{padding:'10px 12px',fontFamily:'var(--fm)',fontSize:14,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)'}}/>
                <button className="btn primary" disabled={!slUser || busy} onClick={loadSleeperLeagues}>
                  {busy ? '…' : 'Find Leagues'}
                </button>
              </div>
              {slLeagues.length > 0 && (
                <div style={{marginTop:14,border:'1px solid var(--rule-soft)'}}>
                  {slLeagues.map(l => (
                    <button key={l.league_id} onClick={()=>pickSleeperLeague(l)}
                      style={{display:'block',width:'100%',textAlign:'left',padding:'12px 14px',background:'var(--surface)',border:'none',borderBottom:'1px solid var(--rule-softer)',cursor:'pointer',fontFamily:'var(--fs)'}}>
                      <div style={{fontWeight:600,fontSize:14}}>{l.name}</div>
                      <div className="byline" style={{fontSize:11,color:'var(--ink-3)'}}>
                        {l.total_rosters}-team · {l.scoring_settings?.rec ? 'PPR' : 'Standard'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'espn' && (
            <div style={{maxWidth:520}}>
              <p style={{fontFamily:'var(--fs)',fontSize:14,color:'var(--ink-2)',marginBottom:14,lineHeight:1.5}}>
                Works for <strong>public</strong> ESPN leagues only (private leagues need ESPN cookies — out of scope).
                Find your league ID + team ID in the ESPN league URL.
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:8}}>
                <input value={espnLeague} onChange={e=>setEspnLeague(e.target.value)} placeholder="League ID"
                  style={{padding:'10px 12px',fontFamily:'var(--fm)',fontSize:14,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)'}}/>
                <input value={espnTeam} onChange={e=>setEspnTeam(e.target.value)} placeholder="Team ID"
                  style={{padding:'10px 12px',fontFamily:'var(--fm)',fontSize:14,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)'}}/>
                <input value={espnSeason} onChange={e=>setEspnSeason(e.target.value)} placeholder="2026"
                  style={{padding:'10px 12px',fontFamily:'var(--fm)',fontSize:14,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)'}}/>
                <button className="btn primary" disabled={!espnLeague || !espnTeam || busy} onClick={loadEspn}>
                  {busy ? '…' : 'Pull'}
                </button>
              </div>
            </div>
          )}

          {tab === 'paste' && (
            <div style={{maxWidth:520}}>
              <p style={{fontFamily:'var(--fs)',fontSize:14,color:'var(--ink-2)',marginBottom:14,lineHeight:1.5}}>
                Works for <strong>any</strong> league. Copy your roster from Yahoo / CBS / NFL.com and paste below — one player per line. Optional: prefix with position (QB, RB) and suffix with team abbreviation.
              </p>
              <textarea value={pasted} onChange={e=>setPasted(e.target.value)} rows={12}
                placeholder={'Patrick Mahomes KC\nBijan Robinson ATL\nJaMarr Chase CIN\n...'}
                style={{width:'100%',padding:'12px',fontFamily:'var(--fb)',fontSize:13,lineHeight:1.5,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)',marginBottom:10,resize:'vertical'}}/>
              <button className="btn primary" disabled={!pasted.trim()} onClick={loadPasted}>Build Team</button>
            </div>
          )}

          {error && (
            <div style={{marginTop:14,padding:'10px 14px',background:'var(--bad-soft)',border:'1px solid var(--bad)',color:'var(--bad)',fontFamily:'var(--fs)',fontSize:13}}>
              {error}
            </div>
          )}
        </>
      )}

      {team && rosterTable()}
    </div>
  );
}

Object.assign(window, { MyTeamPage, loadMyTeam, parsePastedRoster });
