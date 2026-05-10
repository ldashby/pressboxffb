// ═════════════════════════════════════════════════════════════════
// CONSENSUS LINKS — direct links out to other rankings sites
// (Their rankings can't be embedded directly due to CORS.
// We give the user fast comparison links + a side-by-side own/them table.)
// ═════════════════════════════════════════════════════════════════

const CONSENSUS_SOURCES = [
  { id:'fp',  name:'FantasyPros',     url:'https://www.fantasypros.com/nfl/rankings/consensus-cheatsheets.php', color:'#1a5fd2', tagline:'Industry consensus' },
  { id:'ffb', name:'The Fantasy Footballers', url:'https://www.thefantasyfootballers.com/draft-kit/', color:'#d2391a', tagline:'Andy, Mike & Jason' },
  { id:'esp', name:'ESPN',            url:'https://www.espn.com/fantasy/football/story/_/page/24RanksPreseasonStandardCheatSheet/2024-fantasy-football-rankings-cheat-sheet-print-version', color:'#cc0000', tagline:'Berry / Karabell' },
  { id:'yh',  name:'Yahoo',           url:'https://football.fantasysports.yahoo.com/f1/draftanalysis', color:'#6b3e8c', tagline:'Funston / Behrens' },
  { id:'cbs', name:'CBS Sports',      url:'https://www.cbssports.com/fantasy/football/rankings/', color:'#003366', tagline:'Dave Richard / Jamey Eisenberg' },
  { id:'pff', name:'PFF',             url:'https://www.pff.com/fantasy-football/rankings', color:'#b8681f', tagline:'Premium analytics' },
  { id:'sl',  name:'Sleeper',         url:'https://sleeper.com/draft', color:'#3a8dde', tagline:'Sleeper rankings' },
  { id:'ud',  name:'Underdog',        url:'https://underdogfantasy.com/draft/lobby', color:'#222', tagline:'Best ball ADP' }
];

function ConsensusLinks({compact}){
  if (compact) {
    return (
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {CONSENSUS_SOURCES.slice(0,6).map(s => (
          <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
            className="btn ghost" style={{fontSize:11,padding:'4px 10px',textDecoration:'none',borderColor:s.color,color:s.color}}>
            {s.name} ↗
          </a>
        ))}
      </div>
    );
  }
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:1,background:'var(--rule-soft)',border:'1px solid var(--rule-soft)'}}>
      {CONSENSUS_SOURCES.map(s => (
        <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
          style={{background:'var(--surface)',padding:'14px 16px',textDecoration:'none',color:'var(--ink)',borderTop:`3px solid ${s.color}`,display:'block',transition:'background .15s'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--paper-2)'}
          onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3}}>
            <strong style={{fontFamily:'var(--fs)',fontSize:16,letterSpacing:'-.01em'}}>{s.name}</strong>
            <span style={{fontSize:11,color:'var(--ink-3)'}}>↗</span>
          </div>
          <div className="byline" style={{fontSize:11,color:'var(--ink-3)'}}>{s.tagline}</div>
        </a>
      ))}
    </div>
  );
}

Object.assign(window, { CONSENSUS_SOURCES, ConsensusLinks });
