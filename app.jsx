// ═════════════════════════════════════════════════════════════════
// APP SHELL
// ═════════════════════════════════════════════════════════════════

const {
  RankingsPage, MockDraftPage, StartSitPage, ComparePage, DefKPage,
  StrategyPage, NewsPage, WaiversPage, TradesPage, NotesPage,
  PlayerDrawer, PlayerProfile, HeroStrip, NewsTicker, SectionHead,
  Pos, Score, Diff, Trend, Sparkline, OwnBar, FactorTags, Chip,
  SEED_PLAYERS, SOURCES, SRC_COLORS, NEWS_ITEMS, norm, ImportModal,
  ArticlesPage, useAdmin, AdminGate, AdminPassChanger,
  LiveTicker, LiveWirePage, MyTeamPage, useLivewire,
  useSleeper, formatRelTime, ConsensusLinks, CONSENSUS_SOURCES,
  usePlayersIndex
} = window;

const STORAGE_KEY = 'pressbox.players.v2026';
function loadPlayers(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch(e){}
  return [...SEED_PLAYERS];
}
function savePlayers(list){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch(e){}
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "red",
  "fonts": "classic",
  "theme": "light",
  "density": "cozy",
  "showTickerAd": true,
  "defaultFormat": "PPR"
}/*EDITMODE-END*/;

const NAV = [
  {id:"home",label:"Front Page"},
  {id:"rankings",label:"Rankings"},
  {id:"articles",label:"Articles"},
  {id:"mock",label:"Mock Draft"},
  {id:"startsit",label:"Start/Sit"},
  {id:"compare",label:"Consensus"},
  {id:"strategy",label:"Strategy"},
  {id:"waivers",label:"Waivers"},
  {id:"trades",label:"Trades"},
  {id:"defk",label:"DEF / K"},
  {id:"myteam",label:"My Team"},
  {id:"news",label:"Wire"}
];

// ───────────── Live Sleeper strip on Home ─────────────
function LiveSleeperStrip({sleeper, onRefresh, playersIdx, onPick}){
  const { data, loading } = sleeper;
  const adds = data?.adds?.slice(0,5) || [];
  const drops = data?.drops?.slice(0,5) || [];
  const idx = playersIdx?.index || {};
  const idxLoading = playersIdx?.loading;
  function lookup(id){ return idx[id]; }
  function row(p, i, color){
    const sl = lookup(p.player_id);
    const name = sl
      ? (sl.full_name || `${sl.first_name||''} ${sl.last_name||''}`.trim())
      : (idxLoading ? 'loading…' : `id ${p.player_id}`);
    const meta = sl
      ? [sl.position, sl.team || 'FA'].filter(Boolean).join(' · ')
      : (idxLoading ? 'loading…' : '');
    return (
      <div key={p.player_id}
        onClick={()=> sl && onPick && onPick({ id: p.player_id, name, pos: sl.position, team: sl.team, sleeper: sl })}
        style={{display:'grid',gridTemplateColumns:'18px 1fr auto',gap:8,alignItems:'baseline',fontSize:12,cursor: sl?'pointer':'default',padding:'2px 0'}}>
        <span className="num" style={{color:'var(--ink-4)',fontSize:10}}>{i+1}</span>
        <span style={{display:'flex',gap:6,alignItems:'baseline',minWidth:0}}>
          <span style={{fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</span>
          {meta && <span style={{fontFamily:'var(--fm)',fontSize:9,color:'var(--ink-4)',textTransform:'uppercase',letterSpacing:'.06em'}}>{meta}</span>}
        </span>
        <span className="num" style={{color,fontSize:11,fontWeight:600}}>{color==='var(--good)'?'+':'−'}{(p.count||0).toLocaleString()}</span>
      </div>
    );
  }
  const week = data?.state?.week;
  const season = data?.state?.season;
  const seasonType = data?.state?.season_type;

  return (
    <div style={{border:'1px solid var(--rule-soft)',background:'var(--paper-2)',padding:'14px 18px',marginBottom:24}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',gap:12,alignItems:'baseline'}}>
          <span className="eyebrow-accent">Live · Sleeper Wire</span>
          {season && (
            <span className="byline" style={{fontSize:11,color:'var(--ink-3)'}}>
              {seasonType ? seasonType.toUpperCase() : ''} {season}{week ? ` · Week ${week}` : ''}
            </span>
          )}
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          {data?.ts && (
            <span style={{fontSize:10,fontFamily:'var(--fm)',color:'var(--ink-4)'}}>
              updated {formatRelTime(data.ts)}
            </span>
          )}
          <button className="btn ghost" style={{fontSize:10,padding:'3px 8px'}}
            onClick={()=>onRefresh(true)} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {!data && !loading && (
        <div style={{fontSize:12,color:'var(--ink-3)',fontStyle:'italic',fontFamily:'var(--fs)'}}>
          Live feed unavailable. Check back shortly.
        </div>
      )}
      {loading && !data && (
        <div style={{fontSize:12,color:'var(--ink-3)',fontStyle:'italic',fontFamily:'var(--fs)'}}>
          Pulling fresh data from Sleeper…
        </div>
      )}

      {data && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
          <div>
            <div className="eyebrow" style={{fontSize:9,marginBottom:6,color:'var(--good)'}}>Trending Adds (24h)</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {adds.length===0 && <div style={{fontSize:12,color:'var(--ink-4)'}}>—</div>}
              {adds.map((p, i) => row(p, i, 'var(--good)'))}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{fontSize:9,marginBottom:6,color:'var(--bad)'}}>Trending Drops (24h)</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {drops.length===0 && <div style={{fontSize:12,color:'var(--ink-4)'}}>—</div>}
              {drops.map((p, i) => row(p, i, 'var(--bad)'))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────── Home (Front Page) ─────────────
function HomePage({players, go, openDrawer, openImport, isAdmin, sleeper, articles, playersIdx, wire}){
  const top5 = players.slice(0,5);
  const risers = [...players].filter(p=>p.trend>0).sort((a,b)=>b.trend-a.trend).slice(0,4);
  const fallers = [...players].filter(p=>p.trend<0).sort((a,b)=>a.trend-b.trend).slice(0,4);
  const latestArticle = articles[0];

  return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'2.3fr 1fr',gap:28,marginBottom:28,borderBottom:'2px solid var(--rule)',paddingBottom:28}}>
        <div>
          <div className="eyebrow-accent" style={{marginBottom:10}}>The Lead Story · 2026 Predraft</div>
          <h1 className="display" style={{fontSize:64,lineHeight:1,marginBottom:16,letterSpacing:'-.03em'}}>
            {latestArticle ? (
              <>
                <span style={{cursor:'pointer'}} onClick={()=>go('articles')}>
                  {latestArticle.title.split(' ').slice(0,-2).join(' ')} <em style={{fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--accent)',fontWeight:600}}>{latestArticle.title.split(' ').slice(-2).join(' ')}</em>
                </span>
              </>
            ) : (
              <>The case for <em style={{fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--accent)',fontWeight:600}}>fading RB</em> in the early rounds.</>
            )}
          </h1>
          <p className="byline" style={{fontSize:16,marginBottom:18,lineHeight:1.5,maxWidth:'56ch'}}>
            {latestArticle?.summary || `Drafts open in weeks. Our ${players.length}-deep 2026 board is live, rookies are locked in, and the ADP market is still soft in places worth exploiting.`}
          </p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button className="btn primary" onClick={()=>go('rankings')}>See the Board →</button>
            <button className="btn" onClick={()=>go('articles')}>Read the Articles</button>
            <button className="btn" onClick={()=>go('mock')}>Run a Mock Draft</button>
            <button className="btn ghost" onClick={()=>go('compare')}>Compare to FantasyPros / ESPN</button>
            {isAdmin && <button className="btn ghost" onClick={openImport}>↑ Import 2026 Players</button>}
          </div>
        </div>
        <div style={{borderLeft:'1px solid var(--rule-soft)',paddingLeft:24}}>
          <div className="eyebrow" style={{marginBottom:10}}>At a Glance</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'var(--rule-soft)',border:'1px solid var(--rule-soft)'}}>
            <div style={{background:'var(--surface)',padding:'14px 16px'}}>
              <div className="eyebrow" style={{fontSize:9,marginBottom:4}}>Ranked</div>
              <div className="display num" style={{fontSize:32}}>{players.length}</div>
            </div>
            <div style={{background:'var(--surface)',padding:'14px 16px'}}>
              <div className="eyebrow" style={{fontSize:9,marginBottom:4}}>Articles</div>
              <div className="display num" style={{fontSize:32}}>{articles.length}</div>
            </div>
            <div style={{background:'var(--surface)',padding:'14px 16px'}}>
              <div className="eyebrow" style={{fontSize:9,marginBottom:4}}>Rising</div>
              <div className="display num" style={{fontSize:32,color:'var(--good)'}}>{risers.length}</div>
            </div>
            <div style={{background:'var(--surface)',padding:'14px 16px'}}>
              <div className="eyebrow" style={{fontSize:9,marginBottom:4}}>Falling</div>
              <div className="display num" style={{fontSize:32,color:'var(--bad)'}}>{fallers.length}</div>
            </div>
          </div>
          <div className="tip" style={{marginTop:16}}>
            <span className="label">Predraft Take</span>
            Robin Hood build: elite WR+RB in rounds 1-2, fade RB until round 5, pounce on Jeanty/Hampton at 8-10.
          </div>
        </div>
      </div>

      <LiveTicker wire={wire}/>

      <LiveSleeperStrip sleeper={sleeper} onRefresh={sleeper.refresh} playersIdx={playersIdx} onPick={openDrawer}/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:24,marginTop:8}}>
        <div>
          <SectionHead title="Top of the Board" meta="The elite tier"/>
          {top5.map(p=>(
            <div key={p.name} onClick={()=>openDrawer(p)} style={{display:'grid',gridTemplateColumns:'40px 1fr auto',gap:12,alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--rule-softer)',cursor:'pointer'}}>
              <span className="display num" style={{fontSize:26,color:'var(--accent)'}}>{p.rank}</span>
              <div>
                <div style={{fontFamily:'var(--fs)',fontSize:16,fontWeight:600,letterSpacing:'-.01em'}}>{p.name}</div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginTop:2}}>
                  <Pos pos={p.pos}/>
                  <span className="num" style={{fontSize:10,color:'var(--ink-3)'}}>{p.team}</span>
                </div>
              </div>
              <Score value={p.score}/>
            </div>
          ))}
        </div>

        <div>
          <SectionHead title="Risers" meta="Press Box trend"/>
          {risers.map(p=>(
            <div key={p.name} onClick={()=>openDrawer(p)} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,padding:'12px 0',borderBottom:'1px solid var(--rule-softer)',cursor:'pointer'}}>
              <div>
                <div style={{fontFamily:'var(--fs)',fontSize:15,fontWeight:600}}>{p.name}</div>
                <div style={{display:'flex',gap:8,marginTop:2}}>
                  <Pos pos={p.pos}/>
                  <span className="num" style={{fontSize:10,color:'var(--ink-3)'}}>{p.team} · #{p.rank}</span>
                </div>
              </div>
              <Trend value={p.trend}/>
            </div>
          ))}
        </div>

        <div>
          <SectionHead title="Fallers" meta="Proceed with caution"/>
          {fallers.map(p=>(
            <div key={p.name} onClick={()=>openDrawer(p)} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,padding:'12px 0',borderBottom:'1px solid var(--rule-softer)',cursor:'pointer'}}>
              <div>
                <div style={{fontFamily:'var(--fs)',fontSize:15,fontWeight:600}}>{p.name}</div>
                <div style={{display:'flex',gap:8,marginTop:2}}>
                  <Pos pos={p.pos}/>
                  <span className="num" style={{fontSize:10,color:'var(--ink-3)'}}>{p.team} · #{p.rank}</span>
                </div>
              </div>
              <Trend value={p.trend}/>
            </div>
          ))}
        </div>
      </div>

      {/* Recent articles preview + Consensus links */}
      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:32,marginTop:32,paddingTop:28,borderTop:'1px solid var(--rule-soft)'}}>
        <div>
          <SectionHead title="From the Editorial" meta="Recent articles"/>
          {articles.slice(0,3).map(a => (
            <div key={a.id} onClick={()=>go('articles')} style={{padding:'14px 0',borderBottom:'1px solid var(--rule-softer)',cursor:'pointer'}}>
              <div className="eyebrow-accent" style={{fontSize:9,marginBottom:5}}>{a.category}</div>
              <div style={{fontFamily:'var(--fs)',fontSize:18,fontWeight:600,letterSpacing:'-.01em',marginBottom:4}}>{a.title}</div>
              {a.summary && <div style={{fontFamily:'var(--fs)',fontStyle:'italic',fontSize:13,color:'var(--ink-2)',lineHeight:1.4,maxWidth:'58ch'}}>{a.summary}</div>}
            </div>
          ))}
          <button className="btn ghost" onClick={()=>go('articles')} style={{marginTop:12}}>All articles →</button>
        </div>
        <div>
          <SectionHead title="Compare Consensus" meta="Other rankings"/>
          <p style={{fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-3)',fontSize:13,lineHeight:1.5,marginBottom:12}}>
            See how Press Box stacks up against the industry. All links open in a new tab.
          </p>
          <ConsensusLinks compact/>
          <button className="btn" onClick={()=>go('compare')} style={{marginTop:12}}>Open the Consensus tool →</button>
        </div>
      </div>
    </>
  );
}

// ───────────── Consensus Page (with external links) ─────────────
function ConsensusPageWrapped(props){
  return (
    <div>
      <div style={{borderBottom:'2px solid var(--rule)',paddingBottom:16,marginBottom:24}}>
        <div className="eyebrow-accent" style={{marginBottom:6}}>The Consensus</div>
        <h1 style={{fontFamily:'var(--fs)',fontSize:42,fontWeight:700,letterSpacing:'-.02em',marginBottom:8}}>How we stack up</h1>
        <p style={{fontFamily:'var(--fs)',fontStyle:'italic',fontSize:16,color:'var(--ink-2)',maxWidth:'62ch',lineHeight:1.5}}>
          Press Box rankings, side-by-side with the sources we trust most. The big-board view below shows
          where we agree and disagree. Direct links go to the most current rankings on each site so you
          can verify everything yourself.
        </p>
      </div>

      <div style={{marginBottom:32}}>
        <div className="eyebrow" style={{marginBottom:12}}>Compare to other sites</div>
        <ConsensusLinks/>
      </div>

      <ComparePage {...props}/>
    </div>
  );
}

// ───────────── Drawer (unchanged) ─────────────
function Drawer({player, onClose, players, playersIdx, sleeper, isAdmin, setPlayers}){
  if (!player) return null;
  return (
    <>
      <PlayerProfile player={player} onClose={onClose} players={players} playersIdx={playersIdx} sleeper={sleeper} isAdmin={isAdmin} setPlayers={setPlayers}/>
    </>
  );
}

// ───────────── App ─────────────
function App(){
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);
  const [page, setPage] = useState('home');
  const [players, setPlayersRaw] = useState(loadPlayers);
  const [importOpen, setImportOpen] = useState(false);
  const admin = useAdmin();
  const sleeper = useSleeper();
  const playersIdx = usePlayersIndex();
  const wire = useLivewire();

  // Articles state lives at the top level so Home can preview them.
  const [articles, setArticlesRaw] = useState(()=>{
    try {
      const raw = localStorage.getItem('pressbox.articles.v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e){}
    return [...(window.SEED_ARTICLES || [])];
  });
  // Re-sync when ArticlesPage saves
  useEffect(()=>{
    const sync = () => {
      try {
        const raw = localStorage.getItem('pressbox.articles.v1');
        if (raw) setArticlesRaw(JSON.parse(raw));
      } catch(e){}
    };
    window.addEventListener('storage', sync);
    const id = setInterval(sync, 1500); // light poll for in-tab updates
    return () => { window.removeEventListener('storage', sync); clearInterval(id); };
  }, []);

  const setPlayers = (list) => {
    const next = typeof list === 'function' ? list(players) : list;
    setPlayersRaw(next);
    savePlayers(next);
  };
  function handleImport(newList, replace){
    let merged;
    if (replace) merged = newList;
    else {
      const existingByName = new Map(players.map(p=>[p.name.toLowerCase(), p]));
      newList.forEach(p => existingByName.set(p.name.toLowerCase(), p));
      merged = [...existingByName.values()];
    }
    merged.sort((a,b)=>(a.rank||999)-(b.rank||999));
    merged.forEach((p,i)=>p.rank = i+1);
    setPlayers(merged);
  }
  function handleAddOne(p){
    const existingByName = new Map(players.map(pl=>[pl.name.toLowerCase(), pl]));
    existingByName.set(p.name.toLowerCase(), p);
    const merged = [...existingByName.values()].sort((a,b)=>(a.rank||999)-(b.rank||999));
    merged.forEach((pl,i)=>pl.rank = i+1);
    setPlayers(merged);
  }
  function handleReset(){
    if (confirm('Reset to default seed players? This will discard your imported roster.')) {
      setPlayers([...SEED_PLAYERS]);
    }
  }

  const [fmt, setFmt] = useState(TWEAK_DEFAULTS.defaultFormat);
  const [watched, setWatched] = useState(new Set());
  const [drawerPlayer, setDrawerPlayer] = useState(null);

  // Apply tweaks to <html>
  useEffect(()=>{
    document.documentElement.dataset.accent = tweaks.accent;
    document.documentElement.dataset.fonts = tweaks.fonts;
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
  },[tweaks]);

  // Nav bar / mode button / drawer wiring
  useEffect(()=>{
    const bar = document.getElementById('navBar');
    bar.innerHTML = '';
    NAV.forEach(n=>{
      const b = document.createElement('button');
      b.className = `nav-tab ${page===n.id?'active':''}`;
      b.textContent = n.label;
      b.onclick = ()=> setPage(n.id);
      bar.appendChild(b);
    });
    const modeBtn = document.getElementById('mode-btn');
    if (modeBtn) {
      modeBtn.textContent = admin.unlocked ? '● Admin' : '○ Viewer';
      modeBtn.className = `mode-pill ${admin.unlocked?'admin':''}`;
      modeBtn.onclick = ()=> {
        if (admin.unlocked) {
          if (confirm('Sign out of admin mode?')) admin.lock();
        } else {
          admin.promptUnlock();
        }
      };
    }
  },[page, admin.unlocked]);

  // drawer open/close
  useEffect(()=>{
    const dr = document.getElementById('drawer');
    const ov = document.getElementById('overlay');
    if (drawerPlayer) { dr.classList.add('open'); ov.classList.add('open'); }
    else { dr.classList.remove('open'); ov.classList.remove('open'); }
    ov.onclick = ()=> setDrawerPlayer(null);
    const esc = e=>{ if (e.key==='Escape') setDrawerPlayer(null); };
    window.addEventListener('keydown',esc);
    return ()=> window.removeEventListener('keydown',esc);
  },[drawerPlayer]);

  function toggleWatch(name){
    setWatched(w=>{
      const n = new Set(w);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  }

  // mode prop kept for compatibility with existing pages that gate UI on it.
  const mode = admin.unlocked ? 'admin' : 'viewer';

  const pageProps = {
    players, setPlayers, fmt, setFmt, mode, isAdmin: admin.unlocked,
    watched, toggleWatch, openDrawer:setDrawerPlayer, go:setPage,
    openImport:()=>setImportOpen(true), onReset:handleReset,
    sleeper, articles, playersIdx, wire
  };

  const ACCENTS = [
    {v:'red',c:'#d2391a'},{v:'blue',c:'#1a5fd2'},{v:'green',c:'#2d6a3e'},{v:'purple',c:'#6b3e8c'},{v:'ink',c:'#14120d'}
  ];

  return (
    <>
      {page==='home' && <HomePage {...pageProps}/>}
      {page==='rankings' && <RankingsPage {...pageProps}/>}
      {page==='articles' && <ArticlesPage isAdmin={admin.unlocked}/>}
      {page==='mock' && <MockDraftPage {...pageProps}/>}
      {page==='startsit' && <StartSitPage {...pageProps}/>}
      {page==='compare' && <ConsensusPageWrapped {...pageProps}/>}
      {page==='strategy' && <StrategyPage {...pageProps}/>}
      {page==='waivers' && <WaiversPage {...pageProps}/>}
      {page==='trades' && <TradesPage {...pageProps}/>}
      {page==='defk' && <DefKPage {...pageProps}/>}
      {page==='news' && <LiveWirePage wire={wire} isAdmin={admin.unlocked}/>}
      {page==='myteam' && <MyTeamPage {...pageProps}/>}
      {page==='notes' && <NotesPage {...pageProps}/>}

      {importOpen && admin.unlocked && (
        <ImportModal onClose={()=>setImportOpen(false)}
          onImport={handleImport} onAddOne={handleAddOne} currentCount={players.length}/>
      )}

      {admin.showGate && (
        <AdminGate onClose={admin.closeGate} onUnlock={admin.tryUnlock}/>
      )}

      <TweaksPanel>
        <TweakSection title="Brand Accent">
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {ACCENTS.map(a=>(
              <button key={a.v} onClick={()=>setTweaks({accent:a.v})}
                style={{width:32,height:32,borderRadius:'50%',background:a.c,border:tweaks.accent===a.v?'3px solid var(--ink)':'1px solid var(--rule-soft)',cursor:'pointer'}}
                title={a.v}/>
            ))}
          </div>
        </TweakSection>
        <TweakRadio label="Type Pairing" value={tweaks.fonts}
          onChange={v=>setTweaks({fonts:v})}
          options={[{value:'classic',label:'Editorial'},{value:'modern',label:'Modern Sans'},{value:'editorial',label:'Mixed'}]}/>
        <TweakRadio label="Theme" value={tweaks.theme}
          onChange={v=>setTweaks({theme:v})}
          options={[{value:'light',label:'Daylight'},{value:'dark',label:'Night'}]}/>
        <TweakRadio label="Row Density" value={tweaks.density}
          onChange={v=>setTweaks({density:v})}
          options={[{value:'compact',label:'Compact'},{value:'cozy',label:'Cozy'},{value:'spacious',label:'Spacious'}]}/>
        <TweakSelect label="Default Format" value={tweaks.defaultFormat}
          onChange={v=>{setTweaks({defaultFormat:v}); setFmt(v);}}
          options={[{value:'PPR',label:'PPR'},{value:'Half PPR',label:'Half PPR'},{value:'Standard',label:'Standard'},{value:'Superflex',label:'Superflex'},{value:'Dynasty',label:'Dynasty'},{value:'Best Ball',label:'Best Ball'}]}/>
        {admin.unlocked && (
          <TweakSection title="Admin">
            <button className="btn ghost" onClick={admin.lock} style={{width:'100%',marginBottom:8}}>Sign Out of Admin</button>
            <AdminPassChanger/>
            <BackendUrlSetting/>
          </TweakSection>
        )}
      </TweaksPanel>

      {drawerPlayer && ReactDOM.createPortal(
        <Drawer player={drawerPlayer} onClose={()=>setDrawerPlayer(null)} players={players} playersIdx={playersIdx} sleeper={sleeper} isAdmin={admin.unlocked} setPlayers={setPlayers}/>,
        document.getElementById('drawer')
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App/>);
