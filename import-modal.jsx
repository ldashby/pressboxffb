// ═════════════════════════════════════════════════════════════════
// IMPORT / ADD PLAYER MODAL
// ═════════════════════════════════════════════════════════════════

const IMPORT_TEMPLATE = `name,pos,team,bye,tier,rank,posRk,score,own,adp,trend,note
Patrick Mahomes,QB,KC,10,1,1,1,95,99,8.2,0,2026 MVP favorite
Justin Jefferson,WR,MIN,7,1,2,1,94,98,3.1,+2,Target monster
Bijan Robinson,RB,ATL,5,1,3,1,93,99,2.4,+1,Elite workload`;

function parseCSV(text){
  const lines = text.trim().split(/\r?\n/).filter(l=>l.trim());
  if (!lines.length) return {players:[],errors:['Empty input']};
  const header = lines[0].split(',').map(h=>h.trim().toLowerCase());
  const required = ['name','pos','team'];
  const missing = required.filter(r=>!header.includes(r));
  if (missing.length) return {players:[],errors:[`Missing required columns: ${missing.join(', ')}`]};

  const players = [];
  const errors = [];
  for (let i=1; i<lines.length; i++) {
    // Handle quoted commas
    const cells = [];
    let cur='', inQ=false;
    for (const c of lines[i]){
      if (c==='"') inQ=!inQ;
      else if (c===',' && !inQ){ cells.push(cur); cur=''; }
      else cur+=c;
    }
    cells.push(cur);

    const row = {};
    header.forEach((h,j)=>{ row[h] = (cells[j]||'').trim(); });
    if (!row.name) continue;

    const p = {
      name: row.name,
      pos: (row.pos||'').toUpperCase(),
      team: (row.team||'').toUpperCase(),
      bye: +row.bye || 0,
      tier: +row.tier || 4,
      rank: +row.rank || (i),
      posRk: +row.posrk || +row['pos_rk'] || 0,
      score: +row.score || 60,
      own: +row.own || 50,
      adp: +row.adp || +row.rank || i,
      trend: row.trend ? (row.trend.startsWith('+') ? +row.trend.slice(1) : +row.trend) : 0,
      note: row.note || '',
      factors: row.factors ? row.factors.split('|').map(f=>f.trim()).filter(Boolean) : [],
      weekly: []
    };
    if (!['QB','RB','WR','TE','K','DEF'].includes(p.pos)) {
      errors.push(`Row ${i+1} (${p.name}): invalid position "${p.pos}"`);
      continue;
    }
    players.push(p);
  }
  // Auto-compute posRk if missing
  const posGroups = {};
  players.forEach(p=>{ if(!posGroups[p.pos]) posGroups[p.pos]=[]; posGroups[p.pos].push(p); });
  Object.values(posGroups).forEach(group=>{
    group.sort((a,b)=>a.rank-b.rank);
    group.forEach((p,i)=>{ if(!p.posRk) p.posRk = i+1; });
  });
  return {players, errors};
}

// Sleeper bye-week table for 2026 (manual; Sleeper API doesn't include byes)
const BYE_2026 = {
  ARI:11, ATL:5, BAL:7, BUF:7, CAR:14, CHI:5, CIN:10, CLE:9,
  DAL:10, DEN:12, DET:8, GB:5, HOU:14, IND:11, JAX:8, KC:10,
  LV:8, LAC:5, LAR:8, MIA:12, MIN:6, NE:14, NO:11, NYG:14,
  NYJ:9, PHI:9, PIT:5, SF:14, SEA:8, TB:9, TEN:10, WAS:14
};

async function fetchSleeperPlayers(opts={}){
  const { signal, onProgress } = opts;
  onProgress?.('Connecting to Sleeper API…');
  const res = await fetch('https://api.sleeper.app/v1/players/nfl', { signal });
  if (!res.ok) throw new Error(`Sleeper returned ${res.status}`);
  onProgress?.('Downloading player database (~10MB)…');
  const all = await res.json();
  onProgress?.('Filtering to fantasy-relevant players…');

  const FF_POS = new Set(['QB','RB','WR','TE','K']);
  const list = [];
  for (const id in all){
    const p = all[id];
    if (!p || !p.active || !p.team) continue;
    if (!FF_POS.has(p.position)) continue;
    // search_rank is Sleeper's fantasy-relevance ranking (lower = more relevant)
    // 9999999 = irrelevant; we keep <= 600 which is roughly the draftable pool
    const sr = p.search_rank;
    if (sr == null || sr >= 700) continue;
    list.push({
      name: p.full_name || `${p.first_name||''} ${p.last_name||''}`.trim(),
      pos: p.position,
      team: p.team,
      sleeperRank: sr,
      yearsExp: p.years_exp || 0,
      age: p.age || null,
      sleeperId: id
    });
  }
  // Sort by Sleeper's own fantasy rank
  list.sort((a,b)=>a.sleeperRank-b.sleeperRank);
  onProgress?.(`Found ${list.length} fantasy-relevant players.`);
  return list;
}

function sleeperToBoardPlayer(sp, idx){
  const posTotals = {}; // computed by caller
  return {
    name: sp.name,
    pos: sp.pos,
    team: sp.team,
    bye: BYE_2026[sp.team] || 10,
    tier: idx < 12 ? 1 : idx < 36 ? 2 : idx < 72 ? 3 : idx < 120 ? 4 : idx < 180 ? 5 : 6,
    rank: idx + 1,
    posRk: 0, // filled below
    score: Math.max(35, Math.round(95 - (idx * 0.18))),
    own: Math.max(5, Math.round(99 - (idx * 0.45))),
    adp: +(idx + 1 + (Math.random() * 0.9 - 0.45)).toFixed(1),
    trend: 0,
    note: `${sp.pos}${sp.team ? ' · '+sp.team : ''} · Sleeper rank ${sp.sleeperRank}${sp.age ? ' · age '+sp.age : ''}${sp.yearsExp != null ? ' · '+sp.yearsExp+'y exp' : ''}`,
    factors: [],
    weekly: [],
    sleeperId: sp.sleeperId
  };
}

function ImportModal({onClose, onImport, onAddOne, currentCount}){
  const [tab,setTab] = useState('sleeper');
  const [csv,setCsv] = useState('');
  const [preview,setPreview] = useState(null);
  const [newP,setNewP] = useState({name:'',pos:'WR',team:'',bye:10,tier:3,rank:'',posRk:'',score:70,own:50,adp:'',trend:0,note:'',factors:''});
  const [replace,setReplace] = useState(false);
  const [sleeperState, setSleeperState] = useState({status:'idle', msg:'', players:null, error:null});

  async function doSleeperSync(){
    setSleeperState({status:'loading', msg:'Starting…', players:null, error:null});
    try {
      const raw = await fetchSleeperPlayers({
        onProgress: (msg) => setSleeperState(s => ({...s, msg}))
      });
      // Build board players
      const board = raw.map((sp,i) => sleeperToBoardPlayer(sp,i));
      // Compute posRk
      const posCounts = {};
      board.forEach(p => {
        posCounts[p.pos] = (posCounts[p.pos]||0) + 1;
        p.posRk = posCounts[p.pos];
      });
      setSleeperState({status:'ready', msg:`${board.length} players ready to import.`, players:board, error:null});
    } catch(err) {
      setSleeperState({status:'error', msg:'', players:null, error: String(err.message || err)});
    }
  }

  function doSleeperImport(){
    if (!sleeperState.players) return;
    onImport(sleeperState.players, replace);
    onClose();
  }

  function doParse(){
    const res = parseCSV(csv);
    setPreview(res);
  }

  function doImport(){
    if (!preview?.players?.length) return;
    onImport(preview.players, replace);
    onClose();
  }

  function doAddOne(){
    if (!newP.name || !newP.pos || !newP.team) return;
    const p = {
      ...newP,
      rank: +newP.rank || currentCount+1,
      posRk: +newP.posRk || 99,
      adp: +newP.adp || +newP.rank || currentCount+1,
      trend: +newP.trend || 0,
      bye: +newP.bye || 10,
      tier: +newP.tier || 3,
      score: +newP.score || 70,
      own: +newP.own || 50,
      factors: newP.factors ? newP.factors.split(',').map(f=>f.trim()).filter(Boolean) : [],
      weekly: []
    };
    onAddOne(p);
    setNewP({...newP,name:'',team:'',note:''});
  }

  function loadTemplate(){ setCsv(IMPORT_TEMPLATE); }

  function handleFile(e){
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setCsv(ev.target.result); setTab('paste'); };
    r.readAsText(f);
  }

  return (
    <div className="imp-overlay" onClick={onClose}>
      <div className="imp-modal" onClick={e=>e.stopPropagation()}>
        <div className="imp-head">
          <div>
            <div className="eyebrow-accent" style={{marginBottom:6}}>Roster Management</div>
            <h2 className="display" style={{fontSize:26}}>Load Your 2026 Player Pool</h2>
          </div>
          <button className="close-x" onClick={onClose}>✕</button>
        </div>

        <div className="imp-tabs">
          <button className={`imp-tab ${tab==='sleeper'?'active':''}`} onClick={()=>setTab('sleeper')}>⚡ Sleeper Sync</button>
          <button className={`imp-tab ${tab==='paste'?'active':''}`} onClick={()=>setTab('paste')}>Paste CSV</button>
          <button className={`imp-tab ${tab==='file'?'active':''}`} onClick={()=>setTab('file')}>Upload File</button>
          <button className={`imp-tab ${tab==='add'?'active':''}`} onClick={()=>setTab('add')}>Add One</button>
          <button className={`imp-tab ${tab==='help'?'active':''}`} onClick={()=>setTab('help')}>Format Guide</button>
        </div>

        <div className="imp-body">
          {tab==='sleeper' && (
            <div style={{padding:'4px 0'}}>
              <div className="eyebrow-accent" style={{marginBottom:6}}>Live Sync · 2026 Season</div>
              <h3 className="display" style={{fontSize:24,marginBottom:8}}>Pull every active NFL player from Sleeper</h3>
              <p className="byline" style={{marginBottom:18,maxWidth:'62ch'}}>
                Hits <code style={{fontFamily:'var(--fm)',background:'var(--paper-2)',padding:'1px 6px',fontSize:12}}>api.sleeper.app/v1/players/nfl</code> directly,
                filters to fantasy-relevant QB/RB/WR/TE/K on active rosters, sorts by Sleeper's own fantasy rank, and
                builds a 2026 draft board with team byes pre-filled. ~5–10 seconds depending on your connection.
              </p>

              {sleeperState.status === 'idle' && (
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <button className="btn primary" onClick={doSleeperSync}>⚡ Sync from Sleeper API</button>
                  <span className="byline" style={{fontSize:12}}>No login required · Public endpoint</span>
                </div>
              )}

              {sleeperState.status === 'loading' && (
                <div style={{padding:24,border:'1px solid var(--rule-soft)',background:'var(--paper-2)',display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:18,height:18,border:'2px solid var(--rule)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div>
                  <div>
                    <div style={{fontFamily:'var(--fs)',fontSize:14,fontWeight:600}}>Syncing with Sleeper…</div>
                    <div className="byline" style={{fontSize:12,marginTop:2}}>{sleeperState.msg}</div>
                  </div>
                </div>
              )}

              {sleeperState.status === 'error' && (
                <div style={{padding:16,border:'1px solid var(--bad)',background:'rgba(180,40,40,0.06)',color:'var(--bad)'}}>
                  <div style={{fontFamily:'var(--fs)',fontWeight:700,marginBottom:4}}>⚠ Sync failed</div>
                  <div style={{fontSize:13}}>{sleeperState.error}</div>
                  <div style={{marginTop:10}}>
                    <button className="btn ghost sm" onClick={doSleeperSync}>Retry</button>
                  </div>
                </div>
              )}

              {sleeperState.status === 'ready' && sleeperState.players && (
                <div className="imp-preview">
                  <div className="imp-preview-head">
                    <span className="eyebrow">Live Sleeper Data · Top 10</span>
                    <span className="num" style={{fontSize:13,fontWeight:700,color:'var(--good)'}}>
                      ✓ {sleeperState.players.length} players ready
                    </span>
                  </div>
                  <div className="imp-preview-list">
                    {sleeperState.players.slice(0,10).map((p,i)=>(
                      <div key={i} className="imp-preview-row">
                        <span className="num" style={{color:'var(--ink-3)',width:24}}>{p.rank}</span>
                        <Pos pos={p.pos}/>
                        <span style={{fontFamily:'var(--fs)',fontWeight:600}}>{p.name}</span>
                        <span className="num" style={{color:'var(--ink-3)',fontSize:11,marginLeft:'auto'}}>{p.team} · BYE {p.bye} · T{p.tier}</span>
                      </div>
                    ))}
                    <div style={{padding:10,textAlign:'center',color:'var(--ink-3)',fontSize:12,fontStyle:'italic',fontFamily:'var(--fs)'}}>…and {sleeperState.players.length-10} more</div>
                  </div>
                  <div className="imp-options">
                    <label style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',fontSize:13}}>
                      <input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/>
                      <span><strong>Replace</strong> existing {currentCount} players (recommended for fresh 2026 board). Otherwise append + dedupe by name.</span>
                    </label>
                  </div>
                  <div style={{marginTop:10,fontSize:11,color:'var(--ink-3)',fontFamily:'var(--fd)',letterSpacing:'.04em'}}>
                    Note: Sleeper doesn't include scouting notes, ADP, or weekly fantasy points — those fields are seeded with sensible defaults you can edit per-player.
                  </div>
                </div>
              )}

              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {tab==='paste' && (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div className="eyebrow">Paste your rankings CSV below</div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn ghost sm" onClick={loadTemplate}>Load Template</button>
                  <button className="btn sm" onClick={doParse} disabled={!csv.trim()}>Preview</button>
                </div>
              </div>
              <textarea className="imp-textarea" placeholder={`name,pos,team,bye,tier,rank,posRk,score,own,adp,trend,note\nPatrick Mahomes,QB,KC,10,1,1,1,95,99,8.2,0,MVP favorite\n...`}
                value={csv} onChange={e=>setCsv(e.target.value)}/>
              {preview && (
                <div className="imp-preview">
                  <div className="imp-preview-head">
                    <span className="eyebrow">Preview</span>
                    <span className="num" style={{fontSize:13,fontWeight:700}}>
                      {preview.players.length} players ready
                      {preview.errors.length>0 && <span style={{color:'var(--bad)',marginLeft:8}}>· {preview.errors.length} errors</span>}
                    </span>
                  </div>
                  {preview.errors.length>0 && (
                    <div className="imp-errors">
                      {preview.errors.slice(0,5).map((e,i)=><div key={i}>⚠ {e}</div>)}
                    </div>
                  )}
                  <div className="imp-preview-list">
                    {preview.players.slice(0,8).map((p,i)=>(
                      <div key={i} className="imp-preview-row">
                        <span className="num" style={{color:'var(--ink-3)',width:24}}>{p.rank}</span>
                        <Pos pos={p.pos}/>
                        <span style={{fontFamily:'var(--fs)',fontWeight:600}}>{p.name}</span>
                        <span className="num" style={{color:'var(--ink-3)',fontSize:11,marginLeft:'auto'}}>{p.team} · BYE {p.bye} · T{p.tier}</span>
                      </div>
                    ))}
                    {preview.players.length>8 && <div style={{padding:10,textAlign:'center',color:'var(--ink-3)',fontSize:12,fontStyle:'italic',fontFamily:'var(--fs)'}}>…and {preview.players.length-8} more</div>}
                  </div>
                  <div className="imp-options">
                    <label style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',fontSize:13}}>
                      <input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/>
                      <span>Replace existing {currentCount} players (otherwise: append + dedupe by name)</span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {tab==='file' && (
            <div className="imp-file-drop">
              <div className="imp-drop-icon">↓</div>
              <h3 className="display" style={{fontSize:22,marginBottom:6}}>Upload CSV</h3>
              <p className="byline" style={{marginBottom:14}}>Export rankings from FantasyPros, Sleeper, or ESPN and drop the file here.</p>
              <input type="file" accept=".csv,.txt" onChange={handleFile} style={{fontFamily:'var(--fd)',fontSize:12}}/>
              <div style={{marginTop:16,fontSize:11,color:'var(--ink-3)',fontFamily:'var(--fd)',letterSpacing:'.05em'}}>
                We'll parse the file, show a preview, then you confirm.
              </div>
            </div>
          )}

          {tab==='add' && (
            <>
              <div className="eyebrow" style={{marginBottom:12}}>Add a single player manually</div>
              <div className="form-grid fg4">
                <div className="field" style={{gridColumn:'span 2'}}><label>Name *</label>
                  <input type="text" value={newP.name} onChange={e=>setNewP({...newP,name:e.target.value})} placeholder="e.g. Patrick Mahomes"/>
                </div>
                <div className="field"><label>Position *</label>
                  <select value={newP.pos} onChange={e=>setNewP({...newP,pos:e.target.value})}>
                    {['QB','RB','WR','TE','K','DEF'].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field"><label>Team *</label>
                  <input type="text" value={newP.team} onChange={e=>setNewP({...newP,team:e.target.value.toUpperCase()})} placeholder="KC" maxLength="3"/>
                </div>
                <div className="field"><label>Overall Rank</label>
                  <input type="number" value={newP.rank} onChange={e=>setNewP({...newP,rank:e.target.value})} placeholder={currentCount+1}/>
                </div>
                <div className="field"><label>Pos Rank</label>
                  <input type="number" value={newP.posRk} onChange={e=>setNewP({...newP,posRk:e.target.value})}/>
                </div>
                <div className="field"><label>Tier</label>
                  <select value={newP.tier} onChange={e=>setNewP({...newP,tier:e.target.value})}>
                    {[1,2,3,4,5,6].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field"><label>Bye Week</label>
                  <input type="number" value={newP.bye} onChange={e=>setNewP({...newP,bye:e.target.value})} min="4" max="14"/>
                </div>
                <div className="field"><label>Score (0-100)</label>
                  <input type="number" value={newP.score} onChange={e=>setNewP({...newP,score:e.target.value})} min="0" max="100"/>
                </div>
                <div className="field"><label>Rostered %</label>
                  <input type="number" value={newP.own} onChange={e=>setNewP({...newP,own:e.target.value})} min="0" max="100"/>
                </div>
                <div className="field"><label>ADP</label>
                  <input type="number" step="0.1" value={newP.adp} onChange={e=>setNewP({...newP,adp:e.target.value})}/>
                </div>
                <div className="field"><label>Trend (+/-)</label>
                  <input type="number" value={newP.trend} onChange={e=>setNewP({...newP,trend:e.target.value})}/>
                </div>
                <div className="field" style={{gridColumn:'span 4'}}><label>Factors (comma-separated)</label>
                  <input type="text" value={newP.factors} onChange={e=>setNewP({...newP,factors:e.target.value})} placeholder="Elite OL, Pass-Heavy, Target Hog"/>
                </div>
                <div className="field" style={{gridColumn:'span 4'}}><label>Note</label>
                  <input type="text" value={newP.note} onChange={e=>setNewP({...newP,note:e.target.value})} placeholder="Elite target share, WR1 floor"/>
                </div>
              </div>
            </>
          )}

          {tab==='help' && (
            <div style={{fontFamily:'var(--fs)',fontSize:14,lineHeight:1.6,color:'var(--ink-2)',maxWidth:'68ch'}}>
              <h3 className="display" style={{fontSize:22,marginBottom:10,fontFamily:'var(--fs)'}}>Expected Format</h3>
              <p style={{marginBottom:12}}>A standard CSV with a header row. Only <code style={{fontFamily:'var(--fm)',background:'var(--paper-2)',padding:'1px 6px'}}>name</code>, <code style={{fontFamily:'var(--fm)',background:'var(--paper-2)',padding:'1px 6px'}}>pos</code>, and <code style={{fontFamily:'var(--fm)',background:'var(--paper-2)',padding:'1px 6px'}}>team</code> are required. Missing columns will be filled with sensible defaults.</p>

              <div style={{border:'1px solid var(--rule-soft)',padding:14,background:'var(--paper-2)',marginBottom:14}}>
                <div className="eyebrow" style={{marginBottom:8}}>Columns</div>
                <table style={{width:'100%',fontSize:12,fontFamily:'var(--fb)',borderCollapse:'collapse'}}>
                  <tbody>
                    {[
                      ['name','string','Player full name'],
                      ['pos','QB|RB|WR|TE|K|DEF','Position'],
                      ['team','string','3-letter team code'],
                      ['bye','int','Bye week (4-14)'],
                      ['tier','int','Your tier grouping (1-6)'],
                      ['rank','int','Overall rank'],
                      ['posRk','int','Position rank (auto-computed if blank)'],
                      ['score','0-100','Your engine score'],
                      ['own','0-100','Rostered percentage'],
                      ['adp','float','Average draft position'],
                      ['trend','+/- int','Week-over-week rank change'],
                      ['note','string','Quick scouting note'],
                      ['factors','pipe-sep','Tags like "Elite OL|Pass Catcher"']
                    ].map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid var(--rule-softer)'}}>
                        <td style={{padding:'4px 0',fontFamily:'var(--fm)',fontWeight:700,color:'var(--accent)',width:70}}>{r[0]}</td>
                        <td style={{padding:'4px 8px',fontFamily:'var(--fm)',color:'var(--ink-3)',width:120}}>{r[1]}</td>
                        <td style={{padding:'4px 0'}}>{r[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{fontStyle:'italic'}}>Tip: FantasyPros export, Sleeper roster export, and ESPN CSV all work with minor tweaking. Once imported, data persists in your browser.</p>
            </div>
          )}
        </div>

        <div className="imp-foot">
          <span className="byline" style={{fontSize:12}}>
            {tab==='sleeper' && sleeperState.status==='ready' && `${sleeperState.players.length} ready · ${currentCount} currently loaded`}
            {tab==='sleeper' && sleeperState.status!=='ready' && `${currentCount} players currently loaded`}
            {tab==='paste' && preview && `${preview.players.length} ready · ${currentCount} currently loaded`}
            {tab==='add' && `${currentCount} players currently loaded`}
            {(tab==='file'||tab==='help') && `${currentCount} players currently loaded`}
          </span>
          <div style={{display:'flex',gap:10}}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            {tab==='sleeper' && sleeperState.status==='ready' && <button className="btn primary" onClick={doSleeperImport}>{replace?'Replace with':'Append'} {sleeperState.players.length} Sleeper Players</button>}
            {tab==='paste' && <button className="btn primary" onClick={doImport} disabled={!preview?.players?.length}>{replace?'Replace':'Append'} {preview?.players?.length||0} Players</button>}
            {tab==='add' && <button className="btn primary" onClick={doAddOne} disabled={!newP.name||!newP.team}>+ Add Player</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ImportModal, parseCSV });
