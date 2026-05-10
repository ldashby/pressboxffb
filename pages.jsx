// ═════════════════════════════════════════════════════════════════
// PAGES
// ═════════════════════════════════════════════════════════════════

const FORMATS = [
  {name:"PPR",cnt:"Full Point"},
  {name:"Half PPR",cnt:"0.5 per rec"},
  {name:"Standard",cnt:"No PPR"},
  {name:"Superflex",cnt:"2-QB boost"},
  {name:"Dynasty",cnt:"Long-term"},
  {name:"Best Ball",cnt:"Auto-optim"}
];

function FormatBar({fmt,setFmt,players}){
  return (
    <div className="format-bar">
      {FORMATS.map(f=>(
        <button key={f.name} className={`fmt-tab ${fmt===f.name?'active':''}`} onClick={()=>setFmt(f.name)}>
          {f.name}
          <span className="cnt">{f.cnt}</span>
        </button>
      ))}
    </div>
  );
}

// ═════════ RANKINGS PAGE ═════════
function RankingsPage({players,setPlayers,fmt,setFmt,mode,watched,toggleWatch,openDrawer,openImport,onReset}){
  const [posFilter,setPosFilter]=useState('ALL');
  const [search,setSearch]=useState('');
  const [sortBy,setSortBy]=useState('rank');
  const [sortDir,setSortDir]=useState('asc');
  const [dragIdx,setDragIdx]=useState(null);

  const filtered = useMemo(()=>{
    let list = [...players];
    if (posFilter!=='ALL') list = list.filter(p=>p.pos===posFilter);
    if (search) list = list.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
    list.sort((a,b)=>{
      let av=a[sortBy], bv=b[sortBy];
      if (sortBy==='name') { av=a.name; bv=b.name; }
      if (sortBy==='trend') { av=a.trend||0; bv=b.trend||0; }
      const cmp = typeof av==='string' ? av.localeCompare(bv) : (av||0)-(bv||0);
      return sortDir==='asc' ? cmp : -cmp;
    });
    return list;
  },[players,posFilter,search,sortBy,sortDir]);

  const posCounts = useMemo(()=>{
    const c={QB:0,RB:0,WR:0,TE:0,K:0,DEF:0};
    players.forEach(p=>{if(c[p.pos]!=null)c[p.pos]++});
    return c;
  },[players]);

  function doSort(key){
    if (sortBy===key) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortBy(key); setSortDir('asc'); }
  }
  function sortArrow(key){
    if (sortBy!==key) return null;
    return <span className="sort-arrow">{sortDir==='asc'?'↑':'↓'}</span>;
  }

  // drag & drop reorder
  function onDragStart(idx,e){ if(mode!=='admin')return; setDragIdx(idx); e.currentTarget.classList.add('dragging'); }
  function onDragEnd(e){ e.currentTarget.classList.remove('dragging'); document.querySelectorAll('tr.drag-over').forEach(r=>r.classList.remove('drag-over')); setDragIdx(null); }
  function onDragOver(idx,e){ e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
  function onDragLeave(e){ e.currentTarget.classList.remove('drag-over'); }
  function onDrop(ti,e){
    e.preventDefault();
    if (dragIdx==null||dragIdx===ti) return;
    const list=[...players];
    const origA = filtered[dragIdx], origB = filtered[ti];
    const ia = list.findIndex(p=>p.name===origA.name);
    const ib = list.findIndex(p=>p.name===origB.name);
    const [moved] = list.splice(ia,1);
    list.splice(ib,0,moved);
    list.forEach((p,i)=>p.rank=i+1);
    setPlayers(list);
  }

  // Sidebar consensus — use first player
  const consensusFor = filtered[0];
  const consensusRows = consensusFor ? Object.entries(SOURCES).map(([src,data])=>{
    const found = data.find(d=>norm(d.name)===norm(consensusFor.name));
    return { src, rank: found?.rank };
  }).filter(r=>r.rank) : [];

  const maxPosCount = Math.max(...Object.values(posCounts));

  return (
    <>
      <HeroStrip players={players} fmt={fmt}/>
      <NewsTicker/>
      <FormatBar fmt={fmt} setFmt={setFmt} players={players}/>

      <div className="toolbar">
        <div className="chip-row">
          {['ALL','QB','RB','WR','TE','K','DEF'].map(p=>(
            <Chip key={p} label={p} active={posFilter===p}
              className={p!=='ALL'?`chip-pos pos-${p}`:''}
              onClick={()=>setPosFilter(p)}/>
          ))}
        </div>
        <div className="tb-group">
          <span className="tb-label">Search</span>
          <input type="text" placeholder="Player name…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="tb-spacer"/>
        {mode==='admin' && <>
          <button className="btn ghost sm" onClick={()=>{
            const header = 'name,pos,team,bye,tier,rank,posRk,score,own,adp,trend,note,factors';
            const rows = players.map(p=>[p.name,p.pos,p.team,p.bye,p.tier,p.rank,p.posRk,p.score,p.own,p.adp,p.trend>=0?'+'+p.trend:p.trend,`"${p.note||''}"`,`"${(p.factors||[]).join('|')}"`].join(','));
            const csv = [header,...rows].join('\n');
            const blob = new Blob([csv],{type:'text/csv'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href=url; a.download='pressbox-rankings.csv'; a.click();
            URL.revokeObjectURL(url);
          }}>Export CSV</button>
          <button className="btn ghost sm" onClick={openImport}>Import / Add Players</button>
          <button className="btn primary sm" onClick={openImport}>+ Add Player</button>
          <button className="btn ghost sm danger" onClick={onReset}>Reset</button>
        </>}
      </div>

      <div className="rankings-grid">
        <div className="table-card">
          <table className="rtbl">
            <thead>
              <tr>
                {mode==='admin' && <th style={{width:22}} className="no-sort"></th>}
                <th style={{width:50}} className="no-sort"></th>
                <th onClick={()=>doSort('rank')}>Rank {sortArrow('rank')}</th>
                <th onClick={()=>doSort('name')}>Player {sortArrow('name')}</th>
                <th onClick={()=>doSort('tier')}>Tier {sortArrow('tier')}</th>
                <th onClick={()=>doSort('score')}>My Score {sortArrow('score')}</th>
                <th onClick={()=>doSort('trend')}>Trend {sortArrow('trend')}</th>
                <th className="no-sort">Factors</th>
                <th className="no-sort">Last 6</th>
                <th onClick={()=>doSort('own')}>Own % {sortArrow('own')}</th>
                <th onClick={()=>doSort('adp')}>ADP {sortArrow('adp')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,i)=>{
                const prev = filtered[i-1];
                const showTierBreak = sortBy==='rank' && prev && prev.tier !== p.tier;
                const isWatched = watched.has(p.name);
                return (
                  <React.Fragment key={p.name}>
                    {showTierBreak && (
                      <tr className="tier-break"><td colSpan={mode==='admin'?11:10}>Tier {p.tier} — {p.tier===1?'Elite':p.tier===2?'Core Starters':p.tier===3?'Reliable Contributors':'Flex / Depth'}</td></tr>
                    )}
                    <tr className={isWatched?'watched':''}
                        draggable={mode==='admin'}
                        onDragStart={e=>onDragStart(i,e)}
                        onDragEnd={onDragEnd}
                        onDragOver={e=>onDragOver(i,e)}
                        onDragLeave={onDragLeave}
                        onDrop={e=>onDrop(i,e)}
                        onClick={()=>openDrawer(p)}>
                      {mode==='admin' && <td onClick={e=>e.stopPropagation()}><span className="handle">⠿</span></td>}
                      <td onClick={e=>{e.stopPropagation();toggleWatch(p.name);}}>
                        <button className={`watch-btn ${isWatched?'on':''}`}>{isWatched?'★':'☆'}</button>
                      </td>
                      <td><span className="rnk num">{p.rank}<span className="pos-rk">{p.pos}{p.posRk}</span></span></td>
                      <td>
                        <span className="pname">{p.name}</span>
                        <div className="pmeta">
                          <span className="pteam">{p.team}</span>
                          <span className="bye">BYE {p.bye}</span>
                          {p.note && <span className="serif-it" style={{fontSize:11,color:'var(--ink-3)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>— {p.note}</span>}
                        </div>
                      </td>
                      <td><span className="tier-pill">T{p.tier}</span></td>
                      <td><Score value={p.score}/></td>
                      <td><Trend value={p.trend}/></td>
                      <td><FactorTags factors={p.factors}/></td>
                      <td><Sparkline data={p.weekly?.slice(-6)||[]} color="var(--ink-3)"/></td>
                      <td><OwnBar pct={p.own}/></td>
                      <td><span className="num" style={{fontSize:12,color:'var(--ink-2)',fontWeight:600}}>{p.adp?.toFixed(1)||'—'}</span></td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="side-stack">
          {consensusFor && (
            <div className="side-card">
              <div className="side-card-head">
                <h3>The Consensus</h3>
                <span className="eyebrow">Vs. {consensusFor.name.split(' ').slice(-1)[0]}</span>
              </div>
              <div className="side-card-body">
                <div style={{marginBottom:10,fontSize:12,color:'var(--ink-3)'}}>
                  <span className="serif-it">My rank:</span> <strong className="num" style={{color:'var(--accent)',fontSize:14}}>#{consensusFor.rank}</strong>
                </div>
                {consensusRows.map(r=>{
                  const diff = r.rank - consensusFor.rank;
                  return (
                    <div className="consensus-row" key={r.src}>
                      <span className="src-dot" style={{background:SRC_COLORS[r.src]}}/>
                      <div>
                        <div className="src-name">{r.src}</div>
                        <div className="src-rank">#{r.rank}</div>
                      </div>
                      <Diff value={diff}/>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="side-card">
            <div className="side-card-head">
              <h3>Positional Depth</h3>
              <span className="eyebrow">{fmt}</span>
            </div>
            <div className="side-card-body">
              <div className="pos-scarcity">
                {['QB','RB','WR','TE','K','DEF'].map(p=>(
                  <div key={p} className="scarcity-row">
                    <Pos pos={p}/>
                    <div className="scarcity-bar">
                      <div className="scarcity-fill" style={{width:`${(posCounts[p]/maxPosCount)*100}%`}}/>
                      <span className="scarcity-label">{p} ranked</span>
                    </div>
                    <span className="scarcity-total num">{posCounts[p]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tip">
            <span className="label">Landon's Take</span>
            Tier breaks are real — if you can reach one, do it. The gap between Tier 1 RBs and Tier 2 is worth at least a half-round in PPR leagues this year.
          </div>
        </aside>
      </div>
    </>
  );
}

// ═════════ MOCK DRAFT ═════════
function MockDraftPage({players, openDrawer}){
  const [teams,setTeams] = useState(12);
  const [rounds,setRounds] = useState(15);
  const [mySpot,setMySpot] = useState(6);
  const [started,setStarted] = useState(false);
  const [picks,setPicks] = useState([]);
  const [available,setAvailable] = useState([]);
  const [posFilter,setPosFilter] = useState('ALL');
  const [query,setQuery] = useState('');

  function start(){
    setPicks([]);
    setAvailable([...players].sort((a,b)=>a.rank-b.rank));
    setStarted(true);
    setTimeout(()=>advanceCPU([],[...players].sort((a,b)=>a.rank-b.rank)),400);
  }

  function pickInfo(n){
    const round = Math.floor(n/teams)+1;
    const inRound = n%teams;
    const slot = round%2===1 ? inRound+1 : teams-inRound;
    return { round, overall:n+1, slot, mine: slot===mySpot };
  }

  function makePick(player, currentPicks, currentAvail){
    const info = pickInfo(currentPicks.length);
    const newPicks = [...currentPicks, {...player, ...info}];
    const newAvail = currentAvail.filter(p=>p.name!==player.name);
    setPicks(newPicks); setAvailable(newAvail);
    if (newPicks.length < teams*rounds) {
      setTimeout(()=>advanceCPU(newPicks, newAvail), 450);
    }
  }
  function advanceCPU(currentPicks, currentAvail){
    while (currentPicks.length < teams*rounds) {
      const info = pickInfo(currentPicks.length);
      if (info.mine) break;
      const choice = currentAvail[0];
      if (!choice) break;
      currentPicks = [...currentPicks, {...choice, ...info}];
      currentAvail = currentAvail.filter(p=>p.name!==choice.name);
    }
    setPicks(currentPicks); setAvailable(currentAvail);
  }
  function myPick(player){
    const info = pickInfo(picks.length);
    if (!info.mine) return;
    makePick(player, picks, available);
  }

  const current = picks.length < teams*rounds ? pickInfo(picks.length) : null;
  const myTeam = picks.filter(p=>p.slot===mySpot);
  const filteredAvail = available.filter(p=>
    (posFilter==='ALL'||p.pos===posFilter) &&
    (!query || p.name.toLowerCase().includes(query.toLowerCase()))
  );

  if (!started) {
    return (
      <>
        <SectionHead title="Mock Draft Room" meta="Snake · CPU opponents" />
        <div style={{border:'1px solid var(--rule)',background:'var(--surface)',padding:'40px 44px',maxWidth:720}}>
          <div className="eyebrow-accent" style={{marginBottom:10}}>Pre-Draft Setup</div>
          <h2 className="display" style={{fontSize:32,marginBottom:20}}>Configure your room.</h2>
          <div className="form-grid fg2">
            <div className="field"><label>League Size</label>
              <select value={teams} onChange={e=>setTeams(+e.target.value)}>
                <option value={10}>10 Teams</option><option value={12}>12 Teams</option><option value={14}>14 Teams</option>
              </select>
            </div>
            <div className="field"><label>Rounds</label>
              <select value={rounds} onChange={e=>setRounds(+e.target.value)}>
                <option value={12}>12</option><option value={15}>15</option><option value={18}>18</option>
              </select>
            </div>
            <div className="field"><label>Your Draft Slot</label>
              <select value={mySpot} onChange={e=>setMySpot(+e.target.value)}>
                {Array.from({length:teams},(_,i)=><option key={i+1} value={i+1}>Pick #{i+1}</option>)}
              </select>
            </div>
            <div className="field"><label>Pace</label>
              <select defaultValue="normal">
                <option value="instant">Instant</option><option value="normal">Normal (0.5s/pick)</option><option value="slow">Slow</option>
              </select>
            </div>
          </div>
          <div style={{marginTop:22}}>
            <button className="btn primary" onClick={start}>▶ Start Draft</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mock-head">
        <div className="mock-pick-indicator">
          <div>
            <div className="eyebrow">{current ? `Round ${current.round}` : 'Complete'}</div>
            <div className="round-num num">{current?`Pick ${current.overall}`:`${teams*rounds} picks`}</div>
          </div>
          <div>
            <div className="ovr">{current?`Team ${current.slot} on the clock`:'Draft finished'}</div>
          </div>
        </div>
        <div className={`mock-onclock ${current?.mine?'mine':''}`}>
          {current?.mine ? <><span className="pulse"/>Your Pick</> : current ? 'CPU thinking…' : 'Review your team →'}
        </div>
      </div>

      <div className="mock-shell">
        <div>
          <div className="mock-board" style={{gridTemplateColumns:`repeat(${teams},1fr)`}}>
            {Array.from({length:teams},(_,t)=>(
              <div key={`h${t}`} className={`mb-header ${t+1===mySpot?'mine':''}`}>
                {t+1===mySpot?'YOU':`Team ${t+1}`}
              </div>
            ))}
            {Array.from({length:rounds*teams},(_,i)=>{
              const info = pickInfo(i);
              const pick = picks[i];
              const isMine = info.slot===mySpot;
              const isCurrent = current && current.overall===info.overall;
              return (
                <div key={i} className={`mock-cell ${pick?'':'empty'} ${isMine?'mine':''} ${isCurrent?'current':''}`}
                     onClick={()=>pick && openDrawer(pick)}>
                  {pick ? (
                    <>
                      <span className="p-pick num">{info.round}.{info.slot.toString().padStart(2,'0')}</span>
                      <span className="p-name">{pick.name}</span>
                      <span className="p-pos"><Pos pos={pick.pos}/>{pick.team}</span>
                    </>
                  ) : (
                    <>
                      <span className="p-pick num">{info.round}.{info.slot.toString().padStart(2,'0')}</span>
                      {isCurrent && <span style={{fontFamily:'var(--fd)',fontSize:10,fontWeight:700,letterSpacing:'.1em',color:'var(--accent)',textTransform:'uppercase'}}>On Clock</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="queue-card">
          <div className="side-card">
            <div className="side-card-head">
              <h3>My Roster</h3>
              <span className="eyebrow num">{myTeam.length}/{rounds}</span>
            </div>
            <div className="side-card-body" style={{padding:'8px 0'}}>
              {myTeam.length===0 && <div style={{padding:14,fontSize:12,color:'var(--ink-3)',fontStyle:'italic',fontFamily:'var(--fs)'}}>Your picks will appear here.</div>}
              {myTeam.map((p,i)=>(
                <div className="queue-item" key={i} onClick={()=>openDrawer(p)}>
                  <span className="q-rk">R{p.round}</span>
                  <div>
                    <div className="q-name">{p.name}</div>
                    <div className="q-note"><Pos pos={p.pos}/> · {p.team}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="side-card" style={{marginTop:20}}>
            <div className="side-card-head">
              <h3>Best Available</h3>
              <span className="eyebrow num">{available.length}</span>
            </div>
            <div style={{padding:'8px 14px',borderBottom:'1px solid var(--rule-soft)'}}>
              <input type="text" placeholder="Search…" value={query} onChange={e=>setQuery(e.target.value)}
                style={{width:'100%',border:'1px solid var(--rule-soft)',padding:'6px 10px',fontSize:12,background:'var(--paper)'}}/>
              <div style={{display:'flex',gap:4,marginTop:8}}>
                {['ALL','QB','RB','WR','TE'].map(p=>(
                  <Chip key={p} label={p} active={posFilter===p} onClick={()=>setPosFilter(p)} />
                ))}
              </div>
            </div>
            <div className="queue-list">
              {filteredAvail.slice(0,40).map(p=>(
                <div key={p.name} className={`queue-item ${current?.mine?'avail-me':''}`}
                     onClick={()=>current?.mine ? myPick(p) : openDrawer(p)}>
                  <span className="q-rk num">{p.rank}</span>
                  <div>
                    <div className="q-name">{p.name}</div>
                    <div className="q-note"><Pos pos={p.pos}/> · {p.team} · T{p.tier}</div>
                  </div>
                  <Score value={p.score}/>
                  {current?.mine && <button className="btn primary sm" onClick={e=>{e.stopPropagation();myPick(p);}}>Draft</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ═════════ START/SIT ═════════
function StartSitPage({players, openDrawer}){
  const [aName,setA]=useState(''); const [bName,setB]=useState('');
  const [opp,setOpp]=useState('avg');
  const [context,setContext]=useState('');

  const a = players.find(p=>p.name===aName);
  const b = players.find(p=>p.name===bName);

  const verdict = useMemo(()=>{
    if (!a||!b) return null;
    const starter = a.rank<b.rank ? a : b;
    const bencher = a.rank<b.rank ? b : a;
    const gap = Math.abs(a.rank-b.rank);
    const conf = gap>=15?'Lock':gap>=8?'Strong Lean':gap>=4?'Slight Lean':'Coin Flip';
    return { starter, bencher, gap, conf };
  },[a,b]);

  return (
    <>
      <SectionHead title="Start / Sit Desk" meta="Head-to-head · Decision engine"/>
      <div className="ss-card">
        <div className="ss-picker">
          <div className={`ss-slot ${a?'picked':''}`}>
            <div className="slot-label">Option A</div>
            {a ? (
              <>
                <div className="chosen-name">{a.name}</div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}>
                  <Pos pos={a.pos}/><span className="num" style={{fontSize:11,color:'var(--ink-3)'}}>{a.team} · Rank #{a.rank} · T{a.tier}</span>
                </div>
                <div style={{marginTop:10}}><Score value={a.score}/></div>
                <button className="btn ghost sm" style={{marginTop:10,alignSelf:'flex-start'}} onClick={()=>setA('')}>Change</button>
              </>
            ) : (
              <select value={aName} onChange={e=>setA(e.target.value)}>
                <option value="">— Select player —</option>
                {[...players].sort((a,b)=>a.rank-b.rank).map(p=><option key={p.name} value={p.name}>{p.name} ({p.pos} #{p.rank})</option>)}
              </select>
            )}
          </div>
          <div className="ss-vs">vs.</div>
          <div className={`ss-slot ${b?'picked':''}`}>
            <div className="slot-label">Option B</div>
            {b ? (
              <>
                <div className="chosen-name">{b.name}</div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}>
                  <Pos pos={b.pos}/><span className="num" style={{fontSize:11,color:'var(--ink-3)'}}>{b.team} · Rank #{b.rank} · T{b.tier}</span>
                </div>
                <div style={{marginTop:10}}><Score value={b.score}/></div>
                <button className="btn ghost sm" style={{marginTop:10,alignSelf:'flex-start'}} onClick={()=>setB('')}>Change</button>
              </>
            ) : (
              <select value={bName} onChange={e=>setB(e.target.value)}>
                <option value="">— Select player —</option>
                {[...players].sort((a,b)=>a.rank-b.rank).map(p=><option key={p.name} value={p.name}>{p.name} ({p.pos} #{p.rank})</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="form-grid fg2" style={{marginTop:16}}>
          <div className="field"><label>Opponent Defense</label>
            <select value={opp} onChange={e=>setOpp(e.target.value)}>
              <option value="elite">Elite Defense</option>
              <option value="good">Strong Defense</option>
              <option value="avg">Average</option>
              <option value="bad">Weak — boosts pass game</option>
            </select>
          </div>
          <div className="field"><label>Notes / Context</label>
            <input type="text" placeholder="e.g. need ceiling, trailing in matchup" value={context} onChange={e=>setContext(e.target.value)}/>
          </div>
        </div>

        {verdict && (
          <div className="ss-verdict">
            <div className="verdict-label">The Verdict — {verdict.conf}</div>
            <div className="verdict-headline">
              <span className="start">Start {verdict.starter.name}</span>.&nbsp;
              <span className="sit serif-it" style={{fontSize:24}}>Sit {verdict.bencher.name}.</span>
            </div>
            <p className="verdict-analysis">
              {verdict.starter.name} sits {verdict.gap} spots higher on our board, with a {verdict.starter.score} engine score
              versus {verdict.bencher.score} for {verdict.bencher.name.split(' ').slice(-1)[0]}.
              {opp==='bad' && ' The weak opposing defense tilts further toward the pass-catcher edge.'}
              {opp==='elite' && ' Elite opposing D — lean toward the higher-floor play regardless.'}
              {context && ` Context noted: "${context}."`}
            </p>
            <div className="ss-factors">
              <div className="ss-factor">
                <div className="f-label">Rank Gap</div>
                <div className={`f-val ${verdict.gap>=8?'f-win':''}`}>{verdict.gap} spots</div>
              </div>
              <div className="ss-factor">
                <div className="f-label">Score Δ</div>
                <div className={`f-val f-win`}>+{Math.abs(verdict.starter.score-verdict.bencher.score)}</div>
              </div>
              <div className="ss-factor">
                <div className="f-label">Tier</div>
                <div className="f-val">T{verdict.starter.tier} vs T{verdict.bencher.tier}</div>
              </div>
              <div className="ss-factor">
                <div className="f-label">Recent Form</div>
                <div className={`f-val ${verdict.starter.trend>0?'f-win':''}`}>
                  {verdict.starter.trend>0?`▲${verdict.starter.trend}`:verdict.starter.trend<0?`▼${Math.abs(verdict.starter.trend)}`:'—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ═════════ COMPARE ═════════
function ComparePage({players}){
  const [posF,setPosF]=useState('ALL');
  const filtered = players.filter(p=>posF==='ALL'||p.pos===posF).slice(0,20);
  return (
    <>
      <SectionHead title="Consensus Board" meta={`${Object.keys(SOURCES).length+1} sources compared`} />
      <div className="toolbar">
        {['ALL','QB','RB','WR','TE'].map(p=>(
          <Chip key={p} label={p} active={posF===p} className={p!=='ALL'?`chip-pos pos-${p}`:''} onClick={()=>setPosF(p)}/>
        ))}
      </div>

      <div style={{border:'1px solid var(--rule)',background:'var(--surface)'}}>
        <div style={{padding:'12px 14px',borderBottom:'2px solid var(--rule)',display:'grid',gridTemplateColumns:'200px 1fr 80px',gap:16}}>
          <span className="eyebrow">Player</span>
          <div style={{display:'flex',justifyContent:'space-between',padding:'0 10px'}}>
            {[1,5,10,15,20,25,30].map(n=><span key={n} className="eyebrow num" style={{fontSize:9}}>#{n}</span>)}
          </div>
          <span className="eyebrow" style={{textAlign:'right'}}>Consensus</span>
        </div>
        {filtered.map(p=>{
          const srcRanks = Object.entries(SOURCES).map(([src,data])=>{
            const f = data.find(d=>norm(d.name)===norm(p.name));
            return f ? { src, rank: f.rank } : null;
          }).filter(Boolean);
          const allRanks = [...srcRanks.map(s=>s.rank), p.rank];
          const avg = allRanks.reduce((a,b)=>a+b,0)/allRanks.length;
          const maxScale = 32;
          return (
            <div key={p.name} className="consensus-chart-row">
              <div>
                <div className="c-player">{p.name}</div>
                <div style={{display:'flex',gap:6,alignItems:'center',marginTop:2}}>
                  <Pos pos={p.pos}/>
                  <span className="num" style={{fontSize:10,color:'var(--ink-3)'}}>{p.team}</span>
                </div>
              </div>
              <div className="c-track">
                {srcRanks.map(s=>(
                  <div key={s.src} className="c-dot"
                       style={{left:`${(s.rank/maxScale)*100}%`, background:SRC_COLORS[s.src]}}
                       title={`${s.src}: #${s.rank}`}>
                    {s.rank}
                  </div>
                ))}
                <div className="c-dot me" style={{left:`${(p.rank/maxScale)*100}%`}} title={`My rank: #${p.rank}`}>
                  ME
                </div>
              </div>
              <div className="c-consensus">
                <div style={{fontSize:14,fontWeight:700,color:'var(--ink)'}}>#{avg.toFixed(1)}</div>
                <Diff value={Math.round(avg-p.rank)}/>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{marginTop:24,display:'flex',gap:14,flexWrap:'wrap'}}>
        {Object.entries(SRC_COLORS).slice(0,4).map(([src,color])=>(
          <span key={src} style={{display:'inline-flex',gap:6,alignItems:'center',fontSize:11,color:'var(--ink-2)'}}>
            <span style={{width:10,height:10,borderRadius:'50%',background:color,display:'inline-block'}}/>
            <span className="eyebrow" style={{letterSpacing:'.1em'}}>{src}</span>
          </span>
        ))}
        <span style={{display:'inline-flex',gap:6,alignItems:'center',fontSize:11,color:'var(--ink-2)'}}>
          <span style={{width:14,height:14,borderRadius:'50%',background:'var(--accent)',display:'inline-block'}}/>
          <span className="eyebrow" style={{letterSpacing:'.1em'}}>My Rank</span>
        </span>
      </div>
    </>
  );
}

// ═════════ DEF/K ═════════
function DefKPage(){
  const [tab,setTab]=useState('def');
  const [mode,setMode]=useState('draft');
  const data = tab==='def'?DEF_DATA:K_DATA;
  return (
    <>
      <SectionHead title={tab==='def'?'Defense & Special Teams':'Kickers'} meta={`${mode==='draft'?'Season Outlook':'Week 1 Stream'} · 2026 Predraft`}/>
      <div className="toolbar">
        <div className="chip-row">
          <Chip label="Defense" active={tab==='def'} onClick={()=>setTab('def')}/>
          <Chip label="Kickers" active={tab==='k'} onClick={()=>setTab('k')}/>
        </div>
        <div className="chip-row" style={{marginLeft:14}}>
          <Chip label="Draft Mode" active={mode==='draft'} onClick={()=>setMode('draft')}/>
          <Chip label="Week 1 Stream" active={mode==='weekly'} onClick={()=>setMode('weekly')}/>
        </div>
      </div>
      <div className="table-card">
        <table className="rtbl">
          <thead>
            <tr>
              <th style={{width:50}}>Rank</th>
              <th>{tab==='def'?'Defense':'Kicker'}</th>
              <th>Tier</th>
              <th>Score</th>
              {tab==='def' ? <><th>Opp Off</th><th>SOS</th></> : <><th>FG%</th><th>50+ yd%</th></>}
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d=>(
              <tr key={d.name||d.team}>
                <td><span className="rnk num">{d.rank}</span></td>
                <td>
                  <span className="pname">{d.name}</span>
                  <div className="pmeta"><span className="pteam">{d.team}</span></div>
                </td>
                <td><span className="tier-pill">T{d.tier}</span></td>
                <td><Score value={d.score*10}/></td>
                {tab==='def' ? (
                  <><td><span className="num">#{d.oppRk}</span></td>
                  <td><span className={`ftag ${d.sos==='Easy'?'good':d.sos==='Hard'?'bad':''}`}>{d.sos}</span></td></>
                ) : (
                  <><td><span className="num">{d.fg}%</span></td>
                  <td><span className="num">{d.lg}%</span></td></>
                )}
                <td><span className="byline" style={{fontSize:12}}>{d.note}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═════════ STRATEGY ═════════
function StrategyPage(){
  return (
    <>
      <SectionHead title="Draft Strategy Board" meta="Round-by-round philosophy"/>
      <div className="strategy-grid">
        {Object.entries(DRAFT_STRATEGY).map(([rd,s])=>(
          <div key={rd} className={`round-card primary-${s.primary}`}>
            <div className="rd-label">Round</div>
            <div className="rd-num num">{rd}</div>
            <div className="rd-note serif-it">{s.note}</div>
            <div className="rd-positions">{s.positions.map(p=><Pos key={p} pos={p}/>)}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:32}}>
        <SectionHead title="Value Windows" meta="When to target each position"/>
        <div style={{border:'1px solid var(--rule)',background:'var(--surface)'}}>
          {['RB','WR','QB','TE','DEF','K'].map(pos=>{
            const rounds = Object.entries(DRAFT_STRATEGY).filter(([,s])=>s.positions.includes(pos)).map(([r])=>+r);
            if (!rounds.length) return null;
            const min=Math.min(...rounds), max=Math.max(...rounds);
            return (
              <div key={pos} style={{display:'grid',gridTemplateColumns:'60px 1fr 120px',gap:16,alignItems:'center',padding:'12px 18px',borderBottom:'1px solid var(--rule-softer)'}}>
                <Pos pos={pos}/>
                <div style={{position:'relative',height:20,background:'var(--rule-softer)',borderRadius:2}}>
                  <div style={{position:'absolute',left:`${((min-1)/15)*100}%`,right:`${100-(max/15)*100}%`,top:0,bottom:0,background:'var(--accent)',opacity:.7,borderRadius:2}}/>
                </div>
                <span className="num" style={{fontSize:12,fontWeight:700,textAlign:'right'}}>
                  R{min}{min!==max?`–R${max}`:''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ═════════ NEWS PAGE ═════════
function NewsPage(){
  return (
    <>
      <SectionHead title="The Wire" meta="Live · Breaking news · Injury updates"/>
      <div className="news-list">
        {NEWS_ITEMS.map((n,i)=>(
          <div key={i} className="news-item">
            <div className="news-time">{n.time} ago</div>
            <div className="news-body">
              <div className="src">
                <span className={`tag ${n.tag}`} style={{fontFamily:'var(--fd)',fontSize:9,fontWeight:700,padding:'1px 5px',letterSpacing:'.14em',background:n.tag==='br'?'var(--accent)':n.tag==='inj'?'var(--bad)':'var(--ink)',color:'#fff'}}>{n.cat}</span>
                <span>{n.src}</span>
              </div>
              <h4>{n.text}</h4>
              <p>Detailed context and fantasy implications. Check player page for snap counts, target share, and projected impact on your roster.</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ═════════ WAIVERS PAGE ═════════
function WaiversPage({openDrawer}){
  return (
    <>
      <SectionHead title="Summer Wire Watch" meta="Predraft · Late-round ADP movers"/>
      <div className="table-card">
        <table className="rtbl">
          <thead>
            <tr>
              <th>Player</th>
              <th>Pos</th>
              <th>Own%</th>
              <th>Trend</th>
              <th>Why Now</th>
              <th style={{width:90}}></th>
            </tr>
          </thead>
          <tbody>
            {WAIVER_TARGETS.map(w=>(
              <tr key={w.name}>
                <td>
                  <span className="pname">{w.name}</span>
                  <div className="pmeta"><span className="pteam">{w.team}</span></div>
                </td>
                <td><Pos pos={w.pos}/></td>
                <td><OwnBar pct={w.own}/></td>
                <td><Trend value={w.trend}/></td>
                <td><span className="byline" style={{fontSize:13}}>{w.note}</span></td>
                <td><button className="btn sm">+ Watch</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═════════ TRADES PAGE ═════════
function TradesPage({players}){
  const [sideA,setSideA]=useState(['CeeDee Lamb']);
  const [sideB,setSideB]=useState(['Breece Hall','Drake London']);
  const [pickA,setPickA]=useState(''); const [pickB,setPickB]=useState('');

  const valA = sideA.reduce((t,n)=>t+(TRADE_VAL[n]||0),0);
  const valB = sideB.reduce((t,n)=>t+(TRADE_VAL[n]||0),0);
  const diff = valA - valB;
  const winner = diff>5?'Side A wins':diff<-5?'Side B wins':'Even trade';
  const pos = 50 + (diff * 1.5);
  const clamped = Math.max(4, Math.min(96, pos));

  return (
    <>
      <SectionHead title="Trade Analyzer" meta="Value-based · Custom adjustments"/>
      <div className="trade-analyzer">
        <div className="trade-sides">
          <div className="trade-side">
            <h4>You Give</h4>
            {sideA.map((n,i)=>(
              <div key={i} className="trade-player-chip">
                <span>{n}</span>
                <span style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span className="val">{TRADE_VAL[n]||'—'}</span>
                  <span className="remove" onClick={()=>setSideA(sideA.filter((_,j)=>j!==i))}>✕</span>
                </span>
              </div>
            ))}
            <select value={pickA} onChange={e=>{if(e.target.value){setSideA([...sideA,e.target.value]);setPickA('');}}} style={{marginTop:8,width:'100%',padding:6,fontSize:12}}>
              <option value="">+ Add player…</option>
              {players.map(p=><option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--rule-soft)'}}>
              <div className="eyebrow">Total Value</div>
              <div className="display num" style={{fontSize:32,color:'var(--accent)',marginTop:4}}>{valA}</div>
            </div>
          </div>
          <div className="trade-arrow">⇌</div>
          <div className="trade-side">
            <h4>You Get</h4>
            {sideB.map((n,i)=>(
              <div key={i} className="trade-player-chip">
                <span>{n}</span>
                <span style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span className="val">{TRADE_VAL[n]||'—'}</span>
                  <span className="remove" onClick={()=>setSideB(sideB.filter((_,j)=>j!==i))}>✕</span>
                </span>
              </div>
            ))}
            <select value={pickB} onChange={e=>{if(e.target.value){setSideB([...sideB,e.target.value]);setPickB('');}}} style={{marginTop:8,width:'100%',padding:6,fontSize:12}}>
              <option value="">+ Add player…</option>
              {players.map(p=><option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--rule-soft)'}}>
              <div className="eyebrow">Total Value</div>
              <div className="display num" style={{fontSize:32,color:'var(--accent)',marginTop:4}}>{valB}</div>
            </div>
          </div>
        </div>

        <div className="trade-verdict">
          <div className="eyebrow-accent">Verdict</div>
          <div className="display" style={{fontSize:28,marginTop:6}}>{winner}</div>
          <p className="byline" style={{marginTop:6}}>
            Differential of {Math.abs(diff)} trade-value points. {Math.abs(diff)<5?'Well-balanced deal — both sides can win based on fit.':'One side is clearly ahead on raw value; reject or renegotiate.'}
          </p>
          <div className="trade-meter">
            <div className="tm-marker" style={{left:`${clamped}%`}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:10,fontFamily:'var(--fd)',letterSpacing:'.14em',textTransform:'uppercase',color:'var(--ink-3)',fontWeight:700}}>
            <span>Side B Wins Big</span><span>Even</span><span>Side A Wins Big</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ═════════ NOTES ═════════
function NotesPage(){
  return (
    <>
      <SectionHead title="The Notebook" meta="Draft strategy · League-specific takes"/>
      <div className="notes-grid">
        {WEEKLY_NOTES.map((n,i)=>(
          <div key={i} className="note-card">
            <div className="nk">{n.week===0 ? 'Predraft' : `Week ${n.week}`}</div>
            <h3>{n.label}</h3>
            <div className="nb">{n.body}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ═════════ PLAYER DRAWER ═════════
function PlayerDrawer({player, onClose, players}){
  if (!player) return null;
  const weekly = player.weekly || [];
  const maxW = Math.max(...weekly.filter(v=>v>0));
  const vals = weekly.filter(v=>v>0);
  const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
  const best = vals.length ? Math.max(...vals).toFixed(1) : '—';

  const srcComps = Object.entries(SOURCES).map(([src,data])=>{
    const f = data.find(d=>norm(d.name)===norm(player.name));
    return f ? { src, rank: f.rank } : null;
  }).filter(Boolean);

  return (
    <div className="drw-body">
      <div className="drw-section">
        <p className="drw-lede">
          {player.note || `${player.name} enters the 2026 season as our ${player.pos}${player.posRk}, with an engine score of ${player.score} and a ${player.trend>0?'rising':player.trend<0?'falling':'steady'} trend line. ${player.factors?.join(', ')}.`}
        </p>
      </div>

      <div className="drw-section">
        <div className="drw-section-title">Key Metrics</div>
        <div className="stat-grid">
          <div className="stat-cell">
            <div className="label">Overall Rank</div>
            <div className="val accent num">#{player.rank}</div>
            <div className={`delta ${player.trend>0?'up':player.trend<0?'dn':''}`}>
              {player.trend>0?`▲${player.trend} this summer`:player.trend<0?`▼${Math.abs(player.trend)} this summer`:'unchanged'}
            </div>
          </div>
          <div className="stat-cell">
            <div className="label">My Score</div>
            <div className="val num">{player.score}</div>
            <div className="delta">tier {player.tier}</div>
          </div>
          <div className="stat-cell">
            <div className="label">Avg Pts/Wk</div>
            <div className="val num">{avg}</div>
            <div className="delta">2025 season</div>
          </div>
          <div className="stat-cell">
            <div className="label">Best Week</div>
            <div className="val num">{best}</div>
            <div className="delta">ceiling</div>
          </div>
          <div className="stat-cell">
            <div className="label">Rostered</div>
            <div className="val num">{player.own}%</div>
            <div className="delta">active leagues</div>
          </div>
          <div className="stat-cell">
            <div className="label">ADP</div>
            <div className="val num">{player.adp?.toFixed(1)||'—'}</div>
            <div className="delta">current drafts</div>
          </div>
        </div>
      </div>

      {weekly.length>0 && (
        <div className="drw-section">
          <div className="drw-section-title">Week-by-Week · 2025</div>
          <div className="wk-chart">
            {weekly.map((v,i)=>{
              if (v===0) return <div key={i} className="wk-bar bye" title={`Wk ${i+1}: BYE`}/>;
              const h = Math.max(4,(v/maxW)*100);
              const hi = v>=20;
              return <div key={i} className={`wk-bar ${hi?'hi':''}`} style={{height:`${h}%`}} title={`Wk ${i+1}: ${v} pts`}/>;
            })}
          </div>
          <div className="wk-labels">
            {weekly.map((_,i)=><span key={i}>{i+1}</span>)}
          </div>
        </div>
      )}

      {player.factors?.length && (
        <div className="drw-section">
          <div className="drw-section-title">Contextual Factors</div>
          <FactorTags factors={player.factors}/>
        </div>
      )}

      {srcComps.length>0 && (
        <div className="drw-section">
          <div className="drw-section-title">vs. External Sources</div>
          {srcComps.map(s=>{
            const diff = s.rank - player.rank;
            return (
              <div key={s.src} className="compare-row">
                <span style={{display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:SRC_COLORS[s.src]}}/>
                  <span className="eyebrow" style={{letterSpacing:'.1em'}}>{s.src}</span>
                </span>
                <span className="num" style={{fontSize:13,fontWeight:600}}>#{s.rank}</span>
                <Diff value={diff}/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { RankingsPage, MockDraftPage, StartSitPage, ComparePage, DefKPage, StrategyPage, NewsPage, WaiversPage, TradesPage, NotesPage, PlayerDrawer, FormatBar });
