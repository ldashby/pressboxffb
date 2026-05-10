// ═════════════════════════════════════════════════════════════════
// WEIGHTED RANKINGS — your personal position formulas
// ═════════════════════════════════════════════════════════════════
//
// Formulas come straight from your weighted ranking codes:
//
//  RB:  (Carries×.25 + Rush_Yd×.02 + Rec×.20 + Rec_Yd×.02 + TDs×.30 + PFF×.03) × OppDef
//  QB:  (Pass_Yd×.04 + Pass_TD×.30 + Rush_Yd×.05 + (Pass_Yd/DB)×.25 + Big_Plays×.15) × OppDef
//  WR:  (Tgt×.20 + Rec×.25 + Rec_Yd×.02 + YAC×.03 + TDs×.30) × OppDef
//  TE:  (Tgt×.20 + Rec×.25 + Rec_Yd×.02 + RZ_Tgt×.25 + TDs×.28) × OppDef
//  K:   FG_Made×.40 + PAT_Made×.20 + Long_FG×.25 + Opp_Scoring×.15
//  DEF: (Sacks×.30 + Turnovers×.35 + 20/(PA+1) + 15/(YA+1)) × OppOff
//
// Inputs that aren't in Sleeper's free API (PFF_Grade, YAC, Big_Plays,
// Red_Zone_Targets, Opp_DVOA) default to neutral values but can be
// overridden per-player by an admin using the Tune form.
//
// Overrides persist under: pressbox.weighted.<playerName>

const WEIGHTED_OVR_KEY = 'pressbox.weighted.overrides.v1';

function loadWeightedOverrides(){
  try { return JSON.parse(localStorage.getItem(WEIGHTED_OVR_KEY) || '{}'); }
  catch(e){ return {}; }
}
function saveWeightedOverrides(obj){
  try { localStorage.setItem(WEIGHTED_OVR_KEY, JSON.stringify(obj)); } catch(e){}
}

// Aggregate per-week stats into per-game averages for the metrics each formula needs.
function aggregateGameLog(gameLog){
  const games = (gameLog||[]).filter(w => w?.stats);
  if (games.length === 0) return null;
  const sum = (k) => games.reduce((a,w) => a + (w.stats[k]||0), 0);
  const n = games.length;
  return {
    games: n,
    rush_att: sum('rush_att')/n,
    rush_yd: sum('rush_yd')/n,
    rush_td: sum('rush_td')/n,
    rec: sum('rec')/n,
    rec_tgt: sum('rec_tgt')/n,
    rec_yd: sum('rec_yd')/n,
    rec_td: sum('rec_td')/n,
    pass_att: sum('pass_att')/n,
    pass_cmp: sum('pass_cmp')/n,
    pass_yd: sum('pass_yd')/n,
    pass_td: sum('pass_td')/n,
    pass_int: sum('pass_int')/n,
    pass_yd_long: Math.max(...games.map(w=>w.stats.pass_yd_long||0), 0),
    fgm: sum('fgm_0_19')/n + sum('fgm_20_29')/n + sum('fgm_30_39')/n + sum('fgm_40_49')/n + sum('fgm_50p')/n,
    fgm_50p: sum('fgm_50p')/n,
    xpm: sum('xpm')/n,
  };
}

// Compute weighted score + breakdown for a position.
function weightedScore(pos, agg, ovr={}){
  if (!agg && pos !== 'DEF' && pos !== 'K') return null;
  const a = agg || {};

  if (pos === 'RB'){
    const carries = a.rush_att || 0;
    const rushY = a.rush_yd || 0;
    const rec = a.rec || 0;
    const recY = a.rec_yd || 0;
    const tds = (a.rush_td||0) + (a.rec_td||0);
    const pff = ovr.pff_grade ?? 75;
    const oppDef = ovr.opp_def_dvoa != null && ovr.opp_def_dvoa < 0.3 ? 1.15 : 1.0;
    const base = carries*0.25 + rushY*0.02 + rec*0.20 + recY*0.02 + tds*0.30 + pff*0.03;
    return {
      score: base * oppDef,
      breakdown: [
        ['Carries', carries.toFixed(1), 0.25, carries*0.25],
        ['Rush Yds', rushY.toFixed(1), 0.02, rushY*0.02],
        ['Receptions', rec.toFixed(1), 0.20, rec*0.20],
        ['Rec Yds', recY.toFixed(1), 0.02, recY*0.02],
        ['TDs', tds.toFixed(2), 0.30, tds*0.30],
        ['PFF Grade', pff.toFixed(0), 0.03, pff*0.03],
      ],
      multiplier: oppDef,
      multiplierLabel: oppDef > 1 ? `× ${oppDef.toFixed(2)} (favorable matchup)` : '× 1.00 (neutral)',
    };
  }

  if (pos === 'QB'){
    const passY = a.pass_yd || 0;
    const passTD = a.pass_td || 0;
    const rushY = a.rush_yd || 0;
    const db = a.pass_att || 30;
    const ypa = db ? passY/db : 0;
    const bp = ovr.big_plays ?? Math.max(0, (a.pass_yd_long || 0) / 25);
    const oppDef = ovr.opp_def_dvoa != null && ovr.opp_def_dvoa < 0.25 ? 1.10 : 1.0;
    const base = passY*0.04 + passTD*0.30 + rushY*0.05 + ypa*0.25 + bp*0.15;
    return {
      score: base * oppDef,
      breakdown: [
        ['Pass Yds', passY.toFixed(1), 0.04, passY*0.04],
        ['Pass TDs', passTD.toFixed(2), 0.30, passTD*0.30],
        ['Rush Yds', rushY.toFixed(1), 0.05, rushY*0.05],
        ['Y/Att', ypa.toFixed(2), 0.25, ypa*0.25],
        ['Big Plays', bp.toFixed(1), 0.15, bp*0.15],
      ],
      multiplier: oppDef,
      multiplierLabel: oppDef > 1 ? `× ${oppDef.toFixed(2)} (favorable matchup)` : '× 1.00 (neutral)',
    };
  }

  if (pos === 'WR'){
    const tgt = a.rec_tgt || 0;
    const rec = a.rec || 0;
    const yds = a.rec_yd || 0;
    const yac = ovr.yac ?? yds * 0.35;
    const tds = a.rec_td || 0;
    const oppDef = ovr.opp_def_dvoa != null && ovr.opp_def_dvoa < 0.25 ? 1.12 : 1.0;
    const base = tgt*0.20 + rec*0.25 + yds*0.02 + yac*0.03 + tds*0.30;
    return {
      score: base * oppDef,
      breakdown: [
        ['Targets', tgt.toFixed(1), 0.20, tgt*0.20],
        ['Receptions', rec.toFixed(1), 0.25, rec*0.25],
        ['Rec Yds', yds.toFixed(1), 0.02, yds*0.02],
        ['YAC', yac.toFixed(1), 0.03, yac*0.03],
        ['TDs', tds.toFixed(2), 0.30, tds*0.30],
      ],
      multiplier: oppDef,
      multiplierLabel: oppDef > 1 ? `× ${oppDef.toFixed(2)} (favorable matchup)` : '× 1.00 (neutral)',
    };
  }

  if (pos === 'TE'){
    const tgt = a.rec_tgt || 0;
    const rec = a.rec || 0;
    const yds = a.rec_yd || 0;
    const rzt = ovr.rz_targets ?? tgt * 0.18;
    const tds = a.rec_td || 0;
    const oppDef = ovr.opp_def_dvoa != null && ovr.opp_def_dvoa < 0.25 ? 1.10 : 1.0;
    const base = tgt*0.20 + rec*0.25 + yds*0.02 + rzt*0.25 + tds*0.28;
    return {
      score: base * oppDef,
      breakdown: [
        ['Targets', tgt.toFixed(1), 0.20, tgt*0.20],
        ['Receptions', rec.toFixed(1), 0.25, rec*0.25],
        ['Rec Yds', yds.toFixed(1), 0.02, yds*0.02],
        ['RZ Targets', rzt.toFixed(2), 0.25, rzt*0.25],
        ['TDs', tds.toFixed(2), 0.28, tds*0.28],
      ],
      multiplier: oppDef,
      multiplierLabel: oppDef > 1 ? `× ${oppDef.toFixed(2)} (favorable matchup)` : '× 1.00 (neutral)',
    };
  }

  if (pos === 'K'){
    const fgm = a.fgm || ovr.fg_made || 2.0;
    const xpm = a.xpm || ovr.pat_made || 2.5;
    const longFG = a.fgm_50p || ovr.long_fg || 0.4;
    const oppPts = ovr.opp_scoring ?? 22;
    const score = fgm*0.40 + xpm*0.20 + longFG*0.25 + oppPts*0.15;
    return {
      score,
      breakdown: [
        ['FG Made', fgm.toFixed(1), 0.40, fgm*0.40],
        ['PAT Made', xpm.toFixed(1), 0.20, xpm*0.20],
        ['Long FG (50+)', longFG.toFixed(2), 0.25, longFG*0.25],
        ['Opp Scoring', oppPts.toFixed(0), 0.15, oppPts*0.15],
      ],
      multiplier: 1,
      multiplierLabel: '(no opponent multiplier)',
    };
  }

  if (pos === 'DEF'){
    const sacks = ovr.sacks ?? 2.5;
    const tos = ovr.turnovers ?? 1.3;
    const pa = ovr.points_allowed ?? 22;
    const ya = ovr.yards_allowed ?? 330;
    const oppOff = ovr.opp_off_dvoa != null && ovr.opp_off_dvoa > 0.25 ? 1.10 : 1.0;
    const base = sacks*0.30 + tos*0.35 + 20/(pa+1) + 15/(ya+1);
    return {
      score: base * oppOff,
      breakdown: [
        ['Sacks', sacks.toFixed(1), 0.30, sacks*0.30],
        ['Turnovers', tos.toFixed(1), 0.35, tos*0.35],
        ['Pts Allowed', pa.toFixed(0), 'inv', 20/(pa+1)],
        ['Yds Allowed', ya.toFixed(0), 'inv', 15/(ya+1)],
      ],
      multiplier: oppOff,
      multiplierLabel: oppOff > 1 ? `× ${oppOff.toFixed(2)} (weak opp offense)` : '× 1.00 (neutral)',
    };
  }

  return null;
}

// Hook that fetches game logs for a Sleeper player and returns a weighted score.
// If a backend URL is configured (admin → Tweaks → Backend API URL), uses the
// API's /player/<name> endpoint instead — that endpoint runs the same formulas
// over real per-game data including PFF, YAC, etc. when present in CSVs.
function useWeightedScore(player, sleeperPlayer, season=2024){
  const sleeperId = sleeperPlayer?.player_id;
  const useGL = window.useGameLogs || (() => ({data:null}));
  const { data, loading } = useGL(sleeperId, season);
  const [overrides] = React.useState(() => loadWeightedOverrides());
  const [apiResult, setApiResult] = React.useState(null);
  const [apiLoading, setApiLoading] = React.useState(false);

  // If backend is configured, prefer it.
  React.useEffect(() => {
    const backend = (window.getBackendUrl && window.getBackendUrl()) || '';
    if (!backend || !player?.name) return;
    let cancelled = false;
    setApiLoading(true);
    fetch(`${backend}/player/${encodeURIComponent(player.name)}?year=${season}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (!cancelled && j) setApiResult(j); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setApiLoading(false); });
    return () => { cancelled = true; };
  }, [player?.name, season]);

  const ovr = overrides[player.name.toLowerCase()] || {};

  // If backend returned a per-game season row, surface that as the score.
  if (apiResult?.season_per_game?.length){
    const row = apiResult.season_per_game[0];
    const breakdown = breakdownFromBackendRow(player.pos, row);
    return {
      result: { score: row.Weighted_Score, breakdown, multiplier: row.Opp_Def_Adj || row.Opp_Off_Adj || 1, multiplierLabel: '(server-computed)' },
      agg: row, loading: apiLoading, hasData: true, source: 'backend'
    };
  }

  const agg = data ? aggregateGameLog(data) : null;
  const result = (agg || player.pos==='K' || player.pos==='DEF') ? weightedScore(player.pos, agg, ovr) : null;
  return { result, agg, loading: loading || apiLoading, hasData: !!agg, source: 'local' };
}

// Pretty breakdown when score came from the FastAPI backend.
function breakdownFromBackendRow(pos, row){
  if (pos==='RB') return [
    ['Carries', (row.Carries||0).toFixed(1), 0.25, (row.Carries||0)*0.25],
    ['Rush Yds', (row.Rush_Yards||0).toFixed(1), 0.02, (row.Rush_Yards||0)*0.02],
    ['Receptions', (row.Receptions||0).toFixed(1), 0.20, (row.Receptions||0)*0.20],
    ['Rec Yds', (row.Rec_Yards||0).toFixed(1), 0.02, (row.Rec_Yards||0)*0.02],
    ['TDs', (row.TDs||0).toFixed(2), 0.30, (row.TDs||0)*0.30],
    ['PFF Grade', (row.PFF_Grade||75).toFixed(0), 0.03, (row.PFF_Grade||75)*0.03],
  ];
  if (pos==='QB') return [
    ['Pass Yds', (row.Pass_Yards||0).toFixed(1), 0.04, (row.Pass_Yards||0)*0.04],
    ['Pass TDs', (row.Pass_TDs||0).toFixed(2), 0.30, (row.Pass_TDs||0)*0.30],
    ['Rush Yds', (row.Rush_Yards||0).toFixed(1), 0.05, (row.Rush_Yards||0)*0.05],
    ['Y/Att', ((row.Pass_Yards||0)/(row.Dropbacks||30)).toFixed(2), 0.25, ((row.Pass_Yards||0)/(row.Dropbacks||30))*0.25],
    ['Big Plays', (row.Big_Plays||0).toFixed(1), 0.15, (row.Big_Plays||0)*0.15],
  ];
  if (pos==='WR') return [
    ['Targets', (row.Targets||0).toFixed(1), 0.20, (row.Targets||0)*0.20],
    ['Receptions', (row.Receptions||0).toFixed(1), 0.25, (row.Receptions||0)*0.25],
    ['Rec Yds', (row.Yards||0).toFixed(1), 0.02, (row.Yards||0)*0.02],
    ['YAC', (row.YAC||0).toFixed(1), 0.03, (row.YAC||0)*0.03],
    ['TDs', (row.TDs||0).toFixed(2), 0.30, (row.TDs||0)*0.30],
  ];
  if (pos==='TE') return [
    ['Targets', (row.Targets||0).toFixed(1), 0.20, (row.Targets||0)*0.20],
    ['Receptions', (row.Receptions||0).toFixed(1), 0.25, (row.Receptions||0)*0.25],
    ['Rec Yds', (row.Yards||0).toFixed(1), 0.02, (row.Yards||0)*0.02],
    ['RZ Targets', (row.Red_Zone_Targets||0).toFixed(2), 0.25, (row.Red_Zone_Targets||0)*0.25],
    ['TDs', (row.TDs||0).toFixed(2), 0.28, (row.TDs||0)*0.28],
  ];
  if (pos==='K') return [
    ['FG Made', (row.FG_Made||0).toFixed(1), 0.40, (row.FG_Made||0)*0.40],
    ['PAT Made', (row.PAT_Made||0).toFixed(1), 0.20, (row.PAT_Made||0)*0.20],
    ['Long FG', (row.Long_FG||0).toFixed(2), 0.25, (row.Long_FG||0)*0.25],
    ['Opp Scoring', (row.Opp_Scoring||22).toFixed(0), 0.15, (row.Opp_Scoring||22)*0.15],
  ];
  if (pos==='DEF') return [
    ['Sacks', (row.Sacks||0).toFixed(1), 0.30, (row.Sacks||0)*0.30],
    ['Turnovers', (row.Turnovers||0).toFixed(1), 0.35, (row.Turnovers||0)*0.35],
    ['Pts Allowed', (row.Points_Allowed||22).toFixed(0), 'inv', 20/((row.Points_Allowed||22)+1)],
    ['Yds Allowed', (row.Yards_Allowed||330).toFixed(0), 'inv', 15/((row.Yards_Allowed||330)+1)],
  ];
  return [];
}

// ───────────── Tune Form (admin, per-player) ─────────────
function WeightedTuneForm({player, onClose}){
  const [overrides, setOverrides] = React.useState(() => loadWeightedOverrides());
  const key = player.name.toLowerCase();
  const cur = overrides[key] || {};
  const set = (field, val) => {
    const num = val === '' ? null : Number(val);
    const next = { ...overrides, [key]: { ...cur, [field]: num }};
    if (num === null) delete next[key][field];
    setOverrides(next);
    saveWeightedOverrides(next);
  };

  const fields = [];
  if (player.pos==='RB') fields.push(['pff_grade','PFF Grade (0-100)',75]);
  if (player.pos==='QB') fields.push(['big_plays','Big Plays / game',2.5]);
  if (player.pos==='WR') fields.push(['yac','YAC / game',25]);
  if (player.pos==='TE') fields.push(['rz_targets','Red-Zone Tgts / game',1.0]);
  if (['RB','QB','WR','TE'].includes(player.pos)){
    fields.push(['opp_def_dvoa','Opp Def DVOA (lower = favorable, e.g. .22)',null]);
  }
  if (player.pos==='K'){
    fields.push(['fg_made','FG Made / game',2.0]);
    fields.push(['pat_made','PAT Made / game',2.5]);
    fields.push(['long_fg','Long FG (50+) / game',0.4]);
    fields.push(['opp_scoring','Opp Scoring / game',22]);
  }
  if (player.pos==='DEF'){
    fields.push(['sacks','Sacks / game',2.5]);
    fields.push(['turnovers','Turnovers / game',1.3]);
    fields.push(['points_allowed','Pts Allowed / game',22]);
    fields.push(['yards_allowed','Yds Allowed / game',330]);
    fields.push(['opp_off_dvoa','Opp Off DVOA (higher = weaker, e.g. .28)',null]);
  }

  return (
    <div style={{padding:16,background:'var(--paper-2)',border:'1px solid var(--rule-soft)',marginTop:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:10}}>
        <div className="eyebrow-accent" style={{fontSize:10}}>Tune PressBox Score</div>
        <button className="btn ghost" onClick={onClose} style={{padding:'2px 8px',fontSize:10}}>✕</button>
      </div>
      <div style={{fontSize:11,fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-3)',marginBottom:12,lineHeight:1.5}}>
        Override the inputs Sleeper doesn't expose. Leave blank to use defaults.
      </div>
      <div style={{display:'grid',gap:8}}>
        {fields.map(([f,label,def]) => (
          <label key={f} style={{display:'grid',gridTemplateColumns:'1fr 90px',gap:8,alignItems:'center'}}>
            <span style={{fontSize:11,fontFamily:'var(--fd)',color:'var(--ink-2)'}}>{label}</span>
            <input type="number" step="0.01" placeholder={def!==null?String(def):'—'}
              value={cur[f] ?? ''}
              onChange={e=>set(f, e.target.value)}
              style={{padding:'5px 8px',border:'1px solid var(--rule-soft)',background:'var(--surface)',fontFamily:'var(--fm)',fontSize:11,color:'var(--ink)'}}/>
          </label>
        ))}
      </div>
    </div>
  );
}

// ───────────── Score Card (drawer section) ─────────────
function PressBoxScoreCard({player, sleeperPlayer, isAdmin}){
  const { result, loading, hasData } = useWeightedScore(player, sleeperPlayer);
  const [tune, setTune] = React.useState(false);

  return (
    <div className="drw-section">
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:10}}>
        <div className="drw-section-title" style={{margin:0}}>PressBox Score</div>
        <div style={{display:'flex',gap:6}}>
          {isAdmin && (
            <button className="btn ghost" onClick={()=>setTune(t=>!t)} style={{padding:'3px 9px',fontSize:10}}>
              {tune?'Done':'Tune'}
            </button>
          )}
        </div>
      </div>

      {loading && !result && (
        <div style={{padding:14,fontSize:12,fontStyle:'italic',color:'var(--ink-3)',fontFamily:'var(--fs)'}}>
          Computing from {player.pos==='K'||player.pos==='DEF' ? 'overrides' : '2024 game logs'}…
        </div>
      )}

      {!loading && !result && (
        <div style={{padding:14,fontSize:12,fontStyle:'italic',color:'var(--ink-3)',fontFamily:'var(--fs)'}}>
          {player.pos==='DEF' || player.pos==='K' ?
            'Set inputs in Tune to see a score.' :
            'No 2024 game data found for this player. Open Tune to set values manually.'}
        </div>
      )}

      {result && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:18,alignItems:'center',padding:'14px 16px',background:'var(--surface)',border:'1px solid var(--rule-soft)',marginBottom:12}}>
            <div className="display num" style={{fontSize:54,color:'var(--accent)',lineHeight:1,fontWeight:700}}>
              {result.score.toFixed(1)}
            </div>
            <div>
              <div className="eyebrow" style={{fontSize:9,marginBottom:4}}>{player.pos} · Per-Game Index</div>
              <div style={{fontSize:11,color:'var(--ink-3)',fontFamily:'var(--fs)',fontStyle:'italic'}}>{result.multiplierLabel}</div>
            </div>
          </div>

          <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'var(--fd)',fontSize:11.5}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--rule)'}}>
                <th className="eyebrow" style={{textAlign:'left',padding:'6px 6px',fontSize:9}}>Input</th>
                <th className="eyebrow" style={{textAlign:'right',padding:'6px 6px',fontSize:9}}>Value</th>
                <th className="eyebrow" style={{textAlign:'right',padding:'6px 6px',fontSize:9}}>Weight</th>
                <th className="eyebrow" style={{textAlign:'right',padding:'6px 6px',fontSize:9}}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map(([label, val, wgt, contrib]) => (
                <tr key={label} style={{borderBottom:'1px solid var(--rule-softer)'}}>
                  <td style={{padding:'6px 6px',fontWeight:500}}>{label}</td>
                  <td className="num" style={{textAlign:'right',padding:'6px 6px'}}>{val}</td>
                  <td className="num" style={{textAlign:'right',padding:'6px 6px',color:'var(--ink-3)'}}>
                    {typeof wgt === 'number' ? '×' + wgt.toFixed(2) : wgt}
                  </td>
                  <td className="num" style={{textAlign:'right',padding:'6px 6px',fontWeight:600,color:'var(--accent)'}}>
                    {contrib.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{fontSize:10,fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-4)',marginTop:8}}>
            Formula: your personal {player.pos} weighted code{result.multiplier!==1 ? `, multiplied by ${result.multiplier.toFixed(2)} matchup adjustment` : ''}.
          </div>
        </>
      )}

      {tune && <WeightedTuneForm player={player} onClose={()=>setTune(false)}/>}
    </div>
  );
}

Object.assign(window, {
  weightedScore, aggregateGameLog,
  useWeightedScore, PressBoxScoreCard, WeightedTuneForm,
  loadWeightedOverrides, saveWeightedOverrides,
});
