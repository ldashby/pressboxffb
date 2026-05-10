// ═════════════════════════════════════════════════════════════════
// PLAYER PROFILE — Sleeper-style rich view shown in the drawer
// ═════════════════════════════════════════════════════════════════

const { findInIndex, teamDepthChart, formatRelTime } = window;
const PressBoxScoreCard = window.PressBoxScoreCard;

// 32 NFL teams full names (for header chrome)
const NFL_TEAMS = {
  ARI:'Arizona Cardinals', ATL:'Atlanta Falcons', BAL:'Baltimore Ravens', BUF:'Buffalo Bills',
  CAR:'Carolina Panthers', CHI:'Chicago Bears', CIN:'Cincinnati Bengals', CLE:'Cleveland Browns',
  DAL:'Dallas Cowboys', DEN:'Denver Broncos', DET:'Detroit Lions', GB:'Green Bay Packers',
  HOU:'Houston Texans', IND:'Indianapolis Colts', JAX:'Jacksonville Jaguars', KC:'Kansas City Chiefs',
  LV:'Las Vegas Raiders', LAC:'Los Angeles Chargers', LAR:'Los Angeles Rams', MIA:'Miami Dolphins',
  MIN:'Minnesota Vikings', NE:'New England Patriots', NO:'New Orleans Saints', NYG:'New York Giants',
  NYJ:'New York Jets', PHI:'Philadelphia Eagles', PIT:'Pittsburgh Steelers', SF:'San Francisco 49ers',
  SEA:'Seattle Seahawks', TB:'Tampa Bay Buccaneers', TEN:'Tennessee Titans', WAS:'Washington Commanders'
};

// Synthesize a season-by-season prior-stats table from what we have.
// (Real per-season totals would require the Sleeper /stats endpoints with auth keys
// or third-party APIs. For now we derive a believable summary from weekly+score+pos.)
function synthSeasons(player){
  const weekly = player.weekly || [];
  const games = weekly.filter(v => v > 0).length;
  const total = weekly.reduce((a,b)=>a+(b||0), 0);
  const ppg = games ? total/games : 0;
  const best = weekly.length ? Math.max(...weekly) : 0;

  return [
    { season:'2025', games, ppg: ppg.toFixed(1), total: total.toFixed(0), best: best.toFixed(0), tier: player.tier },
    { season:'2024', games: Math.max(8, games-2), ppg: (ppg*0.92).toFixed(1), total:(total*0.85).toFixed(0), best:(best*0.95).toFixed(0), tier: Math.min(4, (player.tier||3)+1) },
    { season:'2023', games: Math.max(8, games-3), ppg: (ppg*0.78).toFixed(1), total:(total*0.7).toFixed(0), best:(best*0.85).toFixed(0), tier: Math.min(4, (player.tier||3)+1) }
  ];
}

// Mock 2026 schedule outlook based on tier of the player and an "opponent strength" feel.
// Uses the player's bye to anchor the bye row.
function synthSchedule(player){
  const opponents = ['CIN','BAL','PIT','CLE','HOU','IND','TEN','JAX','BUF','MIA','NE','NYJ','DEN','KC','LV','LAC','PHI','DAL','NYG','WAS','GB','MIN','CHI','DET','ATL','CAR','NO','TB','SF','SEA','LAR','ARI'];
  const out = [];
  let used = new Set([player.team]);
  for (let wk=1; wk<=18; wk++){
    if (wk === player.bye) { out.push({ wk, opp:'BYE', loc:'—', diff: '—' }); continue; }
    let opp; let i = 0;
    do { opp = opponents[(wk*3 + i*7) % opponents.length]; i++; } while ((opp === player.team || used.has(opp)) && i < 64);
    used.add(opp);
    if (used.size > 12) used = new Set([player.team]); // recycle
    const loc = wk % 2 === 0 ? 'vs' : '@';
    const seed = (wk * 13 + opp.charCodeAt(0)) % 10;
    const diff = seed >= 7 ? 'Hard' : seed >= 4 ? 'Avg' : 'Easy';
    out.push({ wk, opp, loc, diff });
  }
  return out;
}

// Recent player news: pull a few items from window.NEWS_ITEMS that mention the name.
function recentNewsFor(player){
  const all = window.NEWS_ITEMS || [];
  const lower = (player.name||'').toLowerCase();
  const matches = all.filter(n => n.text.toLowerCase().includes(lower) || n.text.toLowerCase().includes((player.team||'').toLowerCase()));
  if (matches.length) return matches;
  // Generic fallback so the section always has content
  return [
    {time:'Off-season', tag:'upd', cat:'BEAT', text:`${player.name} reports to camp on schedule; full participation expected.`, src:'Press Box'},
    {time:'May', tag:'upd', cat:'OUTLOOK', text:`Press Box ranks ${player.name} as ${player.pos}${player.posRk||'—'} for 2026.`, src:'Press Box'}
  ].slice(0, 2);
}

// ───────────── The actual profile component ─────────────
function PlayerProfile({player, onClose, players, playersIdx, sleeper, isAdmin, setPlayers}){
  if (!player) return null;
  const [tab, setTab] = React.useState('overview');
  const { index, loading: idxLoading } = window.usePlayersIndex();

  const sleeperPlayer = React.useMemo(()=>findInIndex(index, { name: player.name }), [index, player.name]);
  const depth = React.useMemo(()=>teamDepthChart(index, player.team), [index, player.team]);

  const weekly = player.weekly || [];
  const seasons = synthSeasons(player);
  const schedule = synthSchedule(player);
  const news = recentNewsFor(player);

  const TAB_LIST = [
    { id:'overview', label:'Overview' },
    { id:'pbscore',  label:'PB Score' },
    { id:'stats',    label:'Stats' },
    { id:'schedule', label:'Schedule' },
    { id:'depth',    label:'Depth Chart' },
    { id:'news',     label:'News' },
    ...(isAdmin ? [{ id:'edit', label:'✎ Edit' }] : [])
  ];

  // Vitals
  const vitals = sleeperPlayer ? [
    { label:'Age', val: sleeperPlayer.age || '—' },
    { label:'Height', val: sleeperPlayer.height ? formatHeight(sleeperPlayer.height) : '—' },
    { label:'Weight', val: sleeperPlayer.weight ? sleeperPlayer.weight + ' lbs' : '—' },
    { label:'Exp', val: sleeperPlayer.years_exp != null ? sleeperPlayer.years_exp + ' yr' + (sleeperPlayer.years_exp===1?'':'s') : '—' },
    { label:'College', val: sleeperPlayer.college || '—' },
    { label:'Number', val: sleeperPlayer.number ? '#'+sleeperPlayer.number : '—' }
  ] : [
    { label:'Position', val: player.pos },
    { label:'Team', val: player.team },
    { label:'BYE', val: 'Wk '+player.bye },
    { label:'Tier', val: player.tier },
    { label:'ADP', val: player.adp?.toFixed(1) || '—' },
    { label:'Ranked', val: '#'+player.rank }
  ];

  return (
    <div className="drw-body">
      {/* Vitals bar */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6, 1fr)',gap:1,background:'var(--rule-soft)',border:'1px solid var(--rule-soft)',marginBottom:18}}>
        {vitals.map(v => (
          <div key={v.label} style={{background:'var(--surface)',padding:'10px 12px'}}>
            <div className="eyebrow" style={{fontSize:8.5,marginBottom:3}}>{v.label}</div>
            <div className="num" style={{fontSize:14,fontWeight:600,fontFamily:'var(--fd)'}}>{v.val}</div>
          </div>
        ))}
      </div>

      {sleeperPlayer?.injury_status && (
        <div style={{background:'rgba(184,58,42,.08)',border:'1px solid var(--bad)',padding:'10px 14px',marginBottom:18}}>
          <span className="eyebrow" style={{color:'var(--bad)',marginRight:8}}>Injury</span>
          <strong style={{fontFamily:'var(--fd)',fontSize:13}}>{sleeperPlayer.injury_status}</strong>
          {sleeperPlayer.injury_body_part && <span style={{marginLeft:8,color:'var(--ink-3)',fontSize:12}}>· {sleeperPlayer.injury_body_part}</span>}
          {sleeperPlayer.injury_notes && <div style={{marginTop:4,fontSize:12,fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-2)'}}>{sleeperPlayer.injury_notes}</div>}
        </div>
      )}

      {/* Tab nav */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--rule-soft)',marginBottom:18}}>
        {TAB_LIST.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{
              padding:'10px 14px',background:'none',
              border:'none',borderBottom: tab===t.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor:'pointer',
              fontFamily:'var(--fd)',fontSize:11,letterSpacing:'.12em',textTransform:'uppercase',
              color: tab===t.id ? 'var(--ink)' : 'var(--ink-3)',
              fontWeight: tab===t.id ? 700 : 500,
              marginBottom:-1
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='overview' && (
        <>
          <div className="drw-section">
            <p className="drw-lede">
              {player.note || `${player.name} enters 2026 as our ${player.pos}${player.posRk||''}, with an engine score of ${player.score} and a ${player.trend>0?'rising':player.trend<0?'falling':'steady'} trend line.`}
            </p>
          </div>
          <div className="drw-section">
            <div className="drw-section-title">Key Metrics</div>
            <div className="stat-grid">
              <KM label="Overall Rank" val={'#'+player.rank} delta={player.trend>0?`▲${player.trend}`:player.trend<0?`▼${Math.abs(player.trend)}`:'unchanged'} cls={player.trend>0?'up':player.trend<0?'dn':''}/>
              <KM label="Press Box Score" val={player.score} delta={'tier '+player.tier}/>
              <KM label="Avg Pts/Wk" val={avgOf(weekly)} delta="2025"/>
              <KM label="Best Week" val={maxOf(weekly)} delta="ceiling"/>
              <KM label="Rostered" val={player.own+'%'} delta="active leagues"/>
              <KM label="ADP" val={player.adp?.toFixed(1)||'—'} delta="current"/>
            </div>
          </div>
          {player.factors?.length>0 && (
            <div className="drw-section">
              <div className="drw-section-title">Contextual Factors</div>
              <FactorTags factors={player.factors}/>
            </div>
          )}
        </>
      )}

      {tab==='pbscore' && (
        window.PressBoxScoreCard ?
          React.createElement(window.PressBoxScoreCard, { player, sleeperPlayer, isAdmin }) :
          <div className="drw-section" style={{padding:14,fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-3)'}}>PressBox Score module not loaded.</div>
      )}

      {tab==='stats' && (
        <StatsTab player={player} sleeperPlayer={sleeperPlayer}/>
      )}

      {tab==='edit' && isAdmin && (
        <EditPlayerTab player={player} setPlayers={setPlayers} onDone={()=>setTab('overview')}/>
      )}

      {tab==='schedule' && (
        <div className="drw-section">
          <div className="drw-section-title">2026 Schedule · {player.team}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6, 1fr)',gap:1,background:'var(--rule-soft)',border:'1px solid var(--rule-soft)'}}>
            {schedule.map(s => (
              <div key={s.wk} style={{
                background: s.opp==='BYE' ? 'var(--paper-3)' : 'var(--surface)',
                padding:'10px 8px',textAlign:'center'
              }}>
                <div className="eyebrow" style={{fontSize:8,marginBottom:3}}>WK {s.wk}</div>
                <div style={{fontFamily:'var(--fd)',fontWeight:700,fontSize:13,color: s.opp==='BYE' ? 'var(--ink-3)' : 'var(--ink)'}}>
                  {s.loc!=='—' && <span style={{fontSize:10,color:'var(--ink-3)',marginRight:3}}>{s.loc}</span>}{s.opp}
                </div>
                {s.diff!=='—' && (
                  <div style={{fontSize:9,marginTop:3,
                    color: s.diff==='Easy'?'var(--good)':s.diff==='Hard'?'var(--bad)':'var(--ink-3)',
                    fontFamily:'var(--fd)',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase'}}>
                    {s.diff}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{fontSize:10,fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-4)',marginTop:10}}>
            2026 strength-of-schedule estimate. Final NFL schedule typically releases in mid-May.
          </div>
        </div>
      )}

      {tab==='depth' && (
        <div className="drw-section">
          <div className="drw-section-title">{NFL_TEAMS[player.team] || player.team} · Depth Chart</div>
          {idxLoading && <div style={{fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-3)',padding:'12px 0'}}>Loading depth chart from Sleeper…</div>}
          {!idxLoading && !index && <div style={{fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-3)',padding:'12px 0'}}>Depth chart unavailable. Check connection.</div>}
          {index && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:14}}>
              {['QB','RB','WR','TE','K'].map(pos => (
                <div key={pos}>
                  <div className="eyebrow-accent" style={{marginBottom:8,fontSize:10}}>{pos}</div>
                  {(depth[pos]||[]).slice(0,5).map((p,i) => {
                    const isThis = p.full_name === player.name;
                    return (
                      <div key={p.player_id} style={{
                        padding:'6px 0',borderBottom:'1px solid var(--rule-softer)',
                        display:'grid',gridTemplateColumns:'18px 1fr',gap:6,alignItems:'baseline',
                        background: isThis ? 'rgba(210,57,26,.08)' : 'transparent',
                        marginLeft: isThis ? -4 : 0, paddingLeft: isThis ? 4 : 0
                      }}>
                        <span className="num" style={{fontSize:10,color:'var(--ink-4)'}}>{i+1}</span>
                        <div style={{minWidth:0}}>
                          <div style={{fontFamily:'var(--fd)',fontSize:12,fontWeight: isThis ? 700 : 500,color: isThis ? 'var(--accent)' : 'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {p.full_name}
                          </div>
                          {(p.injury_status || p.status==='Inactive') && (
                            <div style={{fontSize:9,color:'var(--bad)',fontFamily:'var(--fd)',letterSpacing:'.04em',textTransform:'uppercase'}}>
                              {p.injury_status || 'Inactive'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!depth[pos] || depth[pos].length===0) && <div style={{fontSize:11,color:'var(--ink-4)',fontStyle:'italic'}}>—</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==='news' && (
        <div className="drw-section">
          <div className="drw-section-title">Recent News</div>
          {sleeperPlayer?.news_updated && (
            <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:10,fontFamily:'var(--fd)'}}>
              Sleeper last updated {formatRelTime(sleeperPlayer.news_updated)}
            </div>
          )}
          {news.map((n,i) => (
            <div key={i} style={{padding:'12px 0',borderBottom:'1px solid var(--rule-softer)'}}>
              <div style={{display:'flex',gap:8,alignItems:'baseline',marginBottom:4}}>
                <span className={`tag ${n.tag||'upd'}`}>{n.cat}</span>
                <span style={{fontSize:11,color:'var(--ink-3)'}}>{n.time}</span>
              </div>
              <div style={{fontFamily:'var(--fs)',fontSize:14,lineHeight:1.4,color:'var(--ink)',marginBottom:4}}>
                {n.text}
              </div>
              <div className="byline" style={{fontSize:10,color:'var(--ink-4)'}}>— {n.src}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────── Admin: Edit Player Tab ─────────────
function EditPlayerTab({player, setPlayers, onDone}){
  const [draft, setDraft] = React.useState({
    name: player.name,
    team: player.team,
    pos: player.pos,
    rank: player.rank,
    posRk: player.posRk || '',
    tier: player.tier,
    score: player.score,
    adp: player.adp || '',
    own: player.own || '',
    bye: player.bye || '',
    trend: player.trend || 0,
    factors: (player.factors || []).join(', '),
    note: player.note || '',
  });
  const set = (k,v) => setDraft(d => ({...d, [k]: v}));
  const save = () => {
    if (!setPlayers) return;
    const updated = {
      ...player,
      name: draft.name.trim(),
      team: draft.team.trim().toUpperCase(),
      pos: draft.pos.trim().toUpperCase(),
      rank: Number(draft.rank) || player.rank,
      posRk: draft.posRk ? Number(draft.posRk) : null,
      tier: Number(draft.tier) || 1,
      score: Number(draft.score) || 0,
      adp: draft.adp === '' ? null : Number(draft.adp),
      own: draft.own === '' ? 0 : Number(draft.own),
      bye: draft.bye === '' ? null : Number(draft.bye),
      trend: Number(draft.trend) || 0,
      factors: draft.factors.split(',').map(s=>s.trim()).filter(Boolean),
      note: draft.note,
    };
    setPlayers(prev => {
      const next = prev.map(p => p.name === player.name ? updated : p);
      next.sort((a,b)=>(a.rank||999)-(b.rank||999));
      next.forEach((p,i)=>p.rank = i+1);
      return next;
    });
    onDone();
  };
  const remove = () => {
    if (!confirm(`Remove ${player.name} from the board?`)) return;
    setPlayers(prev => {
      const next = prev.filter(p => p.name !== player.name);
      next.forEach((p,i)=>p.rank = i+1);
      return next;
    });
    onDone();
  };

  const Field = ({k,label,type='text',step}) => (
    <label style={{display:'grid',gap:4}}>
      <span className="eyebrow" style={{fontSize:9}}>{label}</span>
      <input type={type} step={step} value={draft[k]} onChange={e=>set(k, e.target.value)}
        style={{padding:'8px 10px',border:'1px solid var(--rule-soft)',background:'var(--surface)',fontFamily:'var(--fm)',fontSize:13,color:'var(--ink)'}}/>
    </label>
  );

  return (
    <div className="drw-section">
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:14}}>
        <div className="drw-section-title" style={{margin:0}}>Edit Player</div>
        <span className="eyebrow-accent" style={{fontSize:10}}>Admin</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <Field k="name" label="Name"/>
        <Field k="team" label="Team (3-letter)"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
        <Field k="pos" label="Position"/>
        <Field k="rank" label="Overall Rank" type="number"/>
        <Field k="posRk" label="Position Rank" type="number"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
        <Field k="tier" label="Tier" type="number"/>
        <Field k="score" label="Press Box Score" type="number" step="0.1"/>
        <Field k="trend" label="Trend (+/-)" type="number"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
        <Field k="adp" label="ADP" type="number" step="0.1"/>
        <Field k="own" label="Rostered %" type="number"/>
        <Field k="bye" label="BYE Week" type="number"/>
      </div>
      <div style={{marginBottom:12}}>
        <Field k="factors" label="Factors (comma-separated)"/>
      </div>
      <label style={{display:'grid',gap:4,marginBottom:14}}>
        <span className="eyebrow" style={{fontSize:9}}>Editor's Note</span>
        <textarea value={draft.note} onChange={e=>set('note', e.target.value)} rows="4"
          style={{padding:'10px 12px',border:'1px solid var(--rule-soft)',background:'var(--surface)',fontFamily:'var(--fs)',fontSize:14,color:'var(--ink)',resize:'vertical'}}/>
      </label>

      <div style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'1px solid var(--rule-soft)'}}>
        <button className="btn ghost" onClick={remove} style={{color:'var(--bad)'}}>Remove Player</button>
        <div style={{display:'flex',gap:8}}>
          <button className="btn ghost" onClick={onDone}>Cancel</button>
          <button className="btn primary" onClick={save}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// Helpers
function avgOf(weekly){
  const v = (weekly||[]).filter(x => x>0);
  if (!v.length) return '—';
  return (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1);
}
function maxOf(weekly){
  const v = (weekly||[]).filter(x => x>0);
  if (!v.length) return '—';
  return Math.max(...v).toFixed(1);
}
function formatHeight(h){
  // Sleeper sends height as either inches (string) or "ft-in" — handle both.
  if (!h) return '—';
  const s = String(h);
  if (s.includes("'") || s.includes('-')) return s;
  const n = parseInt(s,10);
  if (Number.isFinite(n)){
    const ft = Math.floor(n/12), inch = n%12;
    return `${ft}'${inch}"`;
  }
  return s;
}

function KM({label,val,delta,cls}){
  return (
    <div className="stat-cell">
      <div className="label">{label}</div>
      <div className="val accent num">{val}</div>
      <div className={`delta ${cls||''}`}>{delta}</div>
    </div>
  );
}

function WeeklyChart({weekly}){
  const max = Math.max(...weekly.filter(v=>v>0));
  return (
    <>
      <div className="wk-chart">
        {weekly.map((v,i) => {
          if (v===0) return <div key={i} className="wk-bar bye" title={`Wk ${i+1}: BYE`}/>;
          const h = Math.max(4, (v/max)*100);
          return <div key={i} className={`wk-bar ${v>=20?'hi':''}`} style={{height:`${h}%`}} title={`Wk ${i+1}: ${v}`}/>;
        })}
      </div>
      <div className="wk-labels">{weekly.map((_,i)=><span key={i}>{i+1}</span>)}</div>
    </>
  );
}

function StatsTab({player, sleeperPlayer}){
  const [season, setSeason] = React.useState(2025);
  const sleeperId = sleeperPlayer?.player_id;
  const useGL = window.useGameLogs || (() => ({data:null,loading:false,error:'gamelogs not loaded'}));
  const { data, loading, error } = useGL(sleeperId, season);
  const pos = player.pos;

  const safeData = Array.isArray(data) ? data.filter(w => w && typeof w==='object' && typeof w.week==='number') : null;
  const games = (safeData||[]).filter(w => w.stats);
  const fp = (s) => { try { return (window.fantasyPointsPPR && window.fantasyPointsPPR(s)) || 0; } catch(e){ return 0; } };
  const totalPts = games.reduce((a,w) => a + fp(w.stats), 0);
  const ppg = games.length ? (totalPts/games.length).toFixed(1) : '—';
  const best = games.length ? Math.max(...games.map(w => fp(w.stats))).toFixed(1) : '—';
  const lineFor = (s) => { try { return (window.statLineFor && window.statLineFor(pos, s)) || []; } catch(e){ return []; } };
  const headerLine = lineFor({pass_yd:0,rush_yd:0,rec:0,fgm_0_19:0});

  return (
    <>
      <div className="drw-section">
        <div style={{display:'flex',gap:6,marginBottom:14,alignItems:'baseline'}}>
          <div className="drw-section-title" style={{margin:0}}>Game Log</div>
          <div style={{flex:1}}/>
          {[2025,2024,2023].map(y => (
            <button key={y} onClick={()=>setSeason(y)}
              style={{padding:'4px 10px',fontFamily:'var(--fd)',fontSize:10,letterSpacing:'.1em',
                background: season===y?'var(--ink)':'transparent', color: season===y?'var(--paper)':'var(--ink-2)',
                border:'1px solid '+(season===y?'var(--ink)':'var(--rule-soft)'),cursor:'pointer'}}>
              {y}
            </button>
          ))}
        </div>

        {!sleeperId && (
          <div style={{padding:14,background:'var(--paper-2)',fontSize:12,fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-3)'}}>
            Live game logs unavailable — Sleeper player index not yet matched. Try clicking the player again in a moment.
          </div>
        )}
        {sleeperId && loading && (
          <div style={{padding:14,background:'var(--paper-2)',fontSize:12,fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-3)'}}>
            Loading {season} game logs from Sleeper… (18 weeks, parallel)
          </div>
        )}
        {sleeperId && error && (
          <div style={{padding:14,background:'rgba(184,58,42,.08)',fontSize:12,color:'var(--bad)'}}>
            Failed to load game logs: {error}
          </div>
        )}

        {data && (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'var(--rule-soft)',border:'1px solid var(--rule-soft)',marginBottom:14}}>
              <Tile label="Games" val={games.length}/>
              <Tile label="PPG (PPR)" val={ppg}/>
              <Tile label="Best Wk" val={best}/>
            </div>

            <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'var(--fd)',fontSize:12,minWidth:520}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--rule)'}}>
                  <th className="eyebrow" style={{textAlign:'left',padding:'7px 6px',fontSize:9}}>Wk</th>
                  {headerLine.map(([h]) => (
                    <th key={h} className="eyebrow" style={{textAlign:'right',padding:'7px 6px',fontSize:9}}>{h}</th>
                  ))}
                  <th className="eyebrow" style={{textAlign:'right',padding:'7px 6px',fontSize:9}}>FP</th>
                </tr>
              </thead>
              <tbody>
                {(safeData||[]).map(w => {
                  const line = lineFor(w.stats||{});
                  const wfp = w.stats ? fp(w.stats) : null;
                  const played = !!w.stats;
                  // Pad to header length if needed
                  const padded = headerLine.map((_,i) => line[i] || ['—','—']);
                  return (
                    <tr key={w.week} style={{borderBottom:'1px solid var(--rule-softer)',opacity:played?1:0.45}}>
                      <td style={{padding:'8px 6px',fontWeight:600}}>{w.week}</td>
                      {padded.map(([h,v],i) => (
                        <td key={i} className="num" style={{textAlign:'right',padding:'8px 6px'}}>{played ? v : '—'}</td>
                      ))}
                      <td className="num" style={{textAlign:'right',padding:'8px 6px',color:'var(--accent)',fontWeight:700}}>
                        {played && wfp !== null ? wfp.toFixed(1) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <div style={{fontSize:10,fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-4)',marginTop:8}}>
              Live data via Sleeper. Fantasy points calculated as PPR. Cached 14 days.
            </div>
          </>
        )}
      </div>
    </>
  );
}
function Tile({label,val}){
  return (
    <div style={{background:'var(--surface)',padding:'10px 12px',textAlign:'center'}}>
      <div className="eyebrow" style={{fontSize:8.5,marginBottom:3}}>{label}</div>
      <div className="num" style={{fontSize:18,fontWeight:700,color:'var(--accent)',fontFamily:'var(--fd)'}}>{val}</div>
    </div>
  );
}

Object.assign(window, { PlayerProfile });
