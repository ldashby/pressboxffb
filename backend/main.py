"""
Press Box Sports — Personal Weighted Rankings API
==================================================

Implements the six personal weighted-ranking formulas (RB / QB / WR / TE / K / DEF)
from the Press Box editor over real NFL game-log data.

Data source priority:
  1. nfl_data_py (preferred — clean per-game stats from nflverse, 1999-present)
  2. CSV fallback in ./data/ (drop your own CSV; columns documented below)
  3. Sample stub data (so the API works out of the box)

Endpoints:
  GET /                            — health
  GET /stats/{position}            — per-game weighted scores for a position
       ?year=2024 &week=8 &top=25 &name=Jefferson
  GET /rankings                    — top N at every position, 1 call
       ?year=2024 &top=10
  GET /player/{name}               — full per-game log + rolling weighted score
       ?year=2024
  GET /formulas                    — pretty-printed formulas (transparency)

Deploy:
  Render / Railway / Fly.io free tier — see backend/README.md.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Optional, List, Dict, Any
import os
import glob

app = FastAPI(
    title="Press Box Sports — Personal Weighted Rankings API",
    version="1.0.0",
    description="Personal weighted ranking formulas applied to real NFL data.",
)

# Open CORS so the static HTML site can call this from any host (Netlify, GitHub Pages, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Sync layer (articles / live wire / blobs / passcode) — see storage.py
from storage import router as sync_router
app.include_router(sync_router)

# ─────────────────────────────────────────────────────────────────
# WEIGHTED-SCORE FUNCTIONS (Press Box editor's personal formulas)
# ─────────────────────────────────────────────────────────────────

def calculate_rb_score(df: pd.DataFrame) -> pd.DataFrame:
    """RB: (Carries×.25 + RushYd×.02 + Rec×.20 + RecYd×.02 + TDs×.30 + PFF×.03) × OppDef
    OppDef multiplier = 1.15 if opp DVOA < 0.30 else 1.0."""
    df = df.copy()
    if 'Opp_DVOA' not in df: df['Opp_DVOA'] = 0.30
    if 'PFF_Grade' not in df: df['PFF_Grade'] = 75
    df['Opp_Def_Adj'] = np.where(df['Opp_DVOA'] < 0.30, 1.15, 1.0)
    df['Weighted_Score'] = (
        df['Carries'].fillna(0)    * 0.25 +
        df['Rush_Yards'].fillna(0) * 0.02 +
        df['Receptions'].fillna(0) * 0.20 +
        df['Rec_Yards'].fillna(0)  * 0.02 +
        df['TDs'].fillna(0)        * 0.30 +
        df['PFF_Grade'].fillna(75) * 0.03
    ) * df['Opp_Def_Adj']
    return df

def calculate_qb_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if 'Opp_DVOA' not in df: df['Opp_DVOA'] = 0.25
    df['Opp_Def_Adj'] = np.where(df['Opp_DVOA'] < 0.25, 1.10, 1.0)
    db = df['Dropbacks'].replace(0, np.nan)
    df['Weighted_Score'] = (
        df['Pass_Yards'].fillna(0) * 0.04 +
        df['Pass_TDs'].fillna(0)   * 0.30 +
        df['Rush_Yards'].fillna(0) * 0.05 +
        (df['Pass_Yards'] / db).fillna(0) * 0.25 +
        df['Big_Plays'].fillna(0)  * 0.15
    ) * df['Opp_Def_Adj']
    return df

def calculate_wr_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if 'Opp_DVOA' not in df: df['Opp_DVOA'] = 0.25
    if 'YAC' not in df: df['YAC'] = df.get('Yards', 0) * 0.35
    df['Opp_Def_Adj'] = np.where(df['Opp_DVOA'] < 0.25, 1.12, 1.0)
    df['Weighted_Score'] = (
        df['Targets'].fillna(0)    * 0.20 +
        df['Receptions'].fillna(0) * 0.25 +
        df['Yards'].fillna(0)      * 0.02 +
        df['YAC'].fillna(0)        * 0.03 +
        df['TDs'].fillna(0)        * 0.30
    ) * df['Opp_Def_Adj']
    return df

def calculate_te_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if 'Opp_DVOA' not in df: df['Opp_DVOA'] = 0.25
    if 'Red_Zone_Targets' not in df: df['Red_Zone_Targets'] = df.get('Targets', 0) * 0.18
    df['Opp_Def_Adj'] = np.where(df['Opp_DVOA'] < 0.25, 1.10, 1.0)
    df['Weighted_Score'] = (
        df['Targets'].fillna(0)          * 0.20 +
        df['Receptions'].fillna(0)       * 0.25 +
        df['Yards'].fillna(0)            * 0.02 +
        df['Red_Zone_Targets'].fillna(0) * 0.25 +
        df['TDs'].fillna(0)              * 0.28
    ) * df['Opp_Def_Adj']
    return df

def calculate_k_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['Weighted_Score'] = (
        df['FG_Made'].fillna(0)      * 0.40 +
        df['PAT_Made'].fillna(0)     * 0.20 +
        df['Long_FG'].fillna(0)      * 0.25 +
        df['Opp_Scoring'].fillna(22) * 0.15
    )
    return df

def calculate_def_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if 'Opp_Off_DVOA' not in df: df['Opp_Off_DVOA'] = 0.25
    df['Opp_Off_Adj'] = np.where(df['Opp_Off_DVOA'] > 0.25, 1.10, 1.0)
    pa = df['Points_Allowed'].fillna(22)
    ya = df['Yards_Allowed'].fillna(330)
    df['Weighted_Score'] = (
        df['Sacks'].fillna(0)     * 0.30 +
        df['Turnovers'].fillna(0) * 0.35 +
        20 / (pa + 1) +
        15 / (ya + 1)
    ) * df['Opp_Off_Adj']
    return df

SCORE_FUNCS = {
    'RB': calculate_rb_score, 'QB': calculate_qb_score,
    'WR': calculate_wr_score, 'TE': calculate_te_score,
    'K':  calculate_k_score,  'DEF': calculate_def_score,
}

FORMULAS = {
    'RB':  '(Carries×.25 + RushYd×.02 + Rec×.20 + RecYd×.02 + TDs×.30 + PFF×.03) × OppDef',
    'QB':  '(PassYd×.04 + PassTD×.30 + RushYd×.05 + (PassYd/Dropbacks)×.25 + BigPlays×.15) × OppDef',
    'WR':  '(Targets×.20 + Rec×.25 + Yards×.02 + YAC×.03 + TDs×.30) × OppDef',
    'TE':  '(Targets×.20 + Rec×.25 + Yards×.02 + RedZoneTgts×.25 + TDs×.28) × OppDef',
    'K':   'FG_Made×.40 + PAT_Made×.20 + Long_FG×.25 + Opp_Scoring×.15',
    'DEF': '(Sacks×.30 + Turnovers×.35 + 20/(PA+1) + 15/(YA+1)) × OppOff',
}

# ─────────────────────────────────────────────────────────────────
# DATA LOADERS
# ─────────────────────────────────────────────────────────────────

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# Try to import nfl_data_py — optional dependency
try:
    import nfl_data_py as nfl  # type: ignore
    HAS_NFL_DATA_PY = True
except Exception:
    HAS_NFL_DATA_PY = False

_CACHE: Dict[str, pd.DataFrame] = {}

def load_weekly_from_nfl_data_py(year: int) -> Optional[pd.DataFrame]:
    """Load per-week stats from nflverse. Returns one row per (player, week)."""
    if not HAS_NFL_DATA_PY:
        return None
    cache_key = f"weekly_{year}"
    if cache_key in _CACHE:
        return _CACHE[cache_key]
    try:
        df = nfl.import_weekly_data([year])
        _CACHE[cache_key] = df
        return df
    except Exception as e:
        print(f"[nfl_data_py] failed for {year}: {e}")
        return None

def load_weekly_from_csv(year: int, position: str) -> Optional[pd.DataFrame]:
    """Look for ./data/<position>_<year>.csv with the columns the formulas expect."""
    path = os.path.join(DATA_DIR, f"{position.lower()}_{year}.csv")
    if not os.path.exists(path):
        return None
    try:
        df = pd.read_csv(path)
        return df
    except Exception as e:
        print(f"[csv] failed for {path}: {e}")
        return None

def shape_for_position(df: pd.DataFrame, position: str) -> pd.DataFrame:
    """Map nfl_data_py weekly columns to the columns the formulas expect."""
    pos = position.upper()
    df = df.copy()

    # Filter to position if column exists
    if 'position' in df.columns:
        df = df[df['position'] == pos]

    # Common columns
    if 'player_display_name' in df.columns and 'Player' not in df.columns:
        df['Player'] = df['player_display_name']
    elif 'player_name' in df.columns and 'Player' not in df.columns:
        df['Player'] = df['player_name']
    if 'recent_team' in df.columns and 'Team' not in df.columns:
        df['Team'] = df['recent_team']
    if 'week' in df.columns and 'Week' not in df.columns:
        df['Week'] = df['week']

    if pos == 'RB':
        df['Carries']    = df.get('carries', 0)
        df['Rush_Yards'] = df.get('rushing_yards', 0)
        df['Receptions'] = df.get('receptions', 0)
        df['Rec_Yards']  = df.get('receiving_yards', 0)
        df['TDs']        = df.get('rushing_tds', 0).fillna(0) + df.get('receiving_tds', 0).fillna(0)
        df['PFF_Grade']  = 75   # neutral default
    elif pos == 'QB':
        df['Pass_Yards'] = df.get('passing_yards', 0)
        df['Pass_TDs']   = df.get('passing_tds', 0)
        df['Rush_Yards'] = df.get('rushing_yards', 0)
        df['Dropbacks']  = df.get('attempts', 0).fillna(0) + df.get('sacks', 0).fillna(0)
        df['Big_Plays']  = df.get('passing_first_downs', 0)
    elif pos == 'WR':
        df['Targets']    = df.get('targets', 0)
        df['Receptions'] = df.get('receptions', 0)
        df['Yards']      = df.get('receiving_yards', 0)
        df['YAC']        = df.get('receiving_yards_after_catch', df['Yards'] * 0.35)
        df['TDs']        = df.get('receiving_tds', 0)
    elif pos == 'TE':
        df['Targets']    = df.get('targets', 0)
        df['Receptions'] = df.get('receptions', 0)
        df['Yards']      = df.get('receiving_yards', 0)
        df['Red_Zone_Targets'] = df.get('targets', 0) * 0.18  # estimate
        df['TDs']        = df.get('receiving_tds', 0)
    elif pos == 'K':
        df['FG_Made']  = df.get('fg_made', 0)
        df['PAT_Made'] = df.get('pat_made', 0)
        df['Long_FG']  = df.get('fg_made_50_', df.get('fg_made_50_plus', 0))
        df['Opp_Scoring'] = 22
    elif pos == 'DEF':
        df['Sacks']     = df.get('def_sacks', df.get('sacks', 0))
        df['Turnovers'] = df.get('def_interceptions', 0).fillna(0) + df.get('def_fumbles_recovered', 0).fillna(0)
        df['Points_Allowed'] = df.get('points_allowed', 22)
        df['Yards_Allowed'] = df.get('yards_allowed', 330)

    keep = ['Player','Team','Week']
    keep = [c for c in keep if c in df.columns]
    extra_cols = ['Carries','Rush_Yards','Receptions','Rec_Yards','TDs','PFF_Grade',
                  'Pass_Yards','Pass_TDs','Dropbacks','Big_Plays',
                  'Targets','Yards','YAC','Red_Zone_Targets',
                  'FG_Made','PAT_Made','Long_FG','Opp_Scoring',
                  'Sacks','Turnovers','Points_Allowed','Yards_Allowed',
                  'Opp_DVOA','Opp_Off_DVOA']
    keep += [c for c in extra_cols if c in df.columns]
    return df[keep]

def get_weekly_data(year: int, position: str) -> pd.DataFrame:
    """Try nfl_data_py → CSV → sample stub, in that order."""
    pos = position.upper()
    df = load_weekly_from_csv(year, pos)
    if df is None or df.empty:
        df = load_weekly_from_nfl_data_py(year)
        if df is not None and not df.empty:
            df = shape_for_position(df, pos)
    if df is None or df.empty:
        df = sample_data(pos)
    return df

def sample_data(position: str) -> pd.DataFrame:
    """Tiny stub so the API works on first boot before any data is loaded."""
    if position == 'RB':
        return pd.DataFrame({
            'Player':['Sample RB1','Sample RB2'], 'Team':['DET','IND'], 'Week':[1,1],
            'Carries':[18,20],'Rush_Yards':[95,105],'Receptions':[5,3],'Rec_Yards':[35,25],
            'TDs':[1,1],'Opp_DVOA':[0.20,0.15],'PFF_Grade':[88,90]})
    if position == 'QB':
        return pd.DataFrame({
            'Player':['Sample QB1','Sample QB2'], 'Team':['BUF','KC'], 'Week':[1,1],
            'Pass_Yards':[275,290],'Pass_TDs':[2,2],'Rush_Yards':[45,20],
            'Dropbacks':[34,37],'Big_Plays':[3,4],'Opp_DVOA':[0.22,0.18]})
    if position == 'WR':
        return pd.DataFrame({
            'Player':['Sample WR1','Sample WR2'],'Team':['MIN','CIN'],'Week':[1,1],
            'Targets':[10,9],'Receptions':[7,6],'Yards':[105,90],'YAC':[35,30],
            'TDs':[1,0],'Opp_DVOA':[0.22,0.27]})
    if position == 'TE':
        return pd.DataFrame({
            'Player':['Sample TE1','Sample TE2'],'Team':['ARI','DET'],'Week':[1,1],
            'Targets':[8,7],'Receptions':[5,4],'Yards':[65,60],
            'Red_Zone_Targets':[1.5,1.2],'TDs':[0.5,0.6],'Opp_DVOA':[0.27,0.24]})
    if position == 'K':
        return pd.DataFrame({
            'Player':['Sample K1','Sample K2'],'Team':['BAL','KC'],'Week':[1,1],
            'FG_Made':[2.3,2.2],'PAT_Made':[3.1,3.3],'Long_FG':[0.6,0.5],'Opp_Scoring':[25,27]})
    if position == 'DEF':
        return pd.DataFrame({
            'Team':['Ravens','Chiefs'],'Week':[1,1],
            'Sacks':[3.6,3.1],'Turnovers':[1.6,1.4],'Points_Allowed':[19,21],
            'Yards_Allowed':[295,305],'Opp_Off_DVOA':[0.25,0.28]})
    return pd.DataFrame()

def aggregate_to_per_game(df: pd.DataFrame) -> pd.DataFrame:
    """Average per-week stats to per-game so the formulas produce one score per player."""
    if df.empty:
        return df
    group_keys = [c for c in ['Player','Team'] if c in df.columns] or ['Team']
    numeric = df.select_dtypes(include=[np.number]).columns.tolist()
    numeric = [c for c in numeric if c != 'Week']
    if not numeric:
        return df
    agg = df.groupby(group_keys, as_index=False)[numeric].mean()
    agg['Games'] = df.groupby(group_keys).size().values
    return agg

# ─────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "Press Box Sports — Personal Weighted Rankings API",
        "version": "1.0.0",
        "data_source": "nfl_data_py" if HAS_NFL_DATA_PY else "csv+sample",
        "csv_files": sorted([os.path.basename(p) for p in glob.glob(os.path.join(DATA_DIR,'*.csv'))]),
        "endpoints": ["/stats/{position}", "/rankings", "/player/{name}", "/formulas"],
        "positions": list(SCORE_FUNCS.keys()),
        "timestamp": datetime.now().isoformat(),
    }

@app.get("/formulas")
def get_formulas():
    return FORMULAS

@app.get("/stats/{position}")
def get_player_stats(
    position: str,
    year: int = Query(2024, ge=2015, le=2026),
    week: Optional[int] = Query(None, ge=1, le=18),
    top: int = Query(50, ge=1, le=500),
    name: Optional[str] = None,
):
    pos = position.upper()
    if pos not in SCORE_FUNCS:
        raise HTTPException(400, f"Position {pos!r} not supported. Try one of {list(SCORE_FUNCS)}.")

    df = get_weekly_data(year, pos)
    if df.empty:
        return {"position": pos, "year": year, "week": week, "data": [], "note": "no data found"}

    if week is not None and 'Week' in df.columns:
        df = df[df['Week'] == week]

    # If we still have weekly granularity, average to per-game first.
    if 'Week' in df.columns and df['Week'].nunique() > 1:
        df = aggregate_to_per_game(df)

    df = SCORE_FUNCS[pos](df)

    if name and 'Player' in df.columns:
        df = df[df['Player'].str.contains(name, case=False, na=False)]

    df = df.sort_values('Weighted_Score', ascending=False).head(top)
    df = df.replace([np.inf, -np.inf], np.nan).fillna(0)

    return {
        "position": pos,
        "year": year,
        "week": week,
        "formula": FORMULAS[pos],
        "count": int(len(df)),
        "timestamp": datetime.now().isoformat(),
        "data": df.to_dict(orient="records"),
    }

@app.get("/rankings")
def get_rankings(
    year: int = Query(2024, ge=2015, le=2026),
    top: int = Query(15, ge=1, le=100),
):
    out = {}
    for pos in SCORE_FUNCS:
        try:
            df = get_weekly_data(year, pos)
            if df.empty: out[pos] = []; continue
            if 'Week' in df.columns and df['Week'].nunique() > 1:
                df = aggregate_to_per_game(df)
            df = SCORE_FUNCS[pos](df)
            df = df.sort_values('Weighted_Score', ascending=False).head(top)
            df = df.replace([np.inf, -np.inf], np.nan).fillna(0)
            out[pos] = df.to_dict(orient="records")
        except Exception as e:
            out[pos] = {"error": str(e)}
    return {"year": year, "top": top, "timestamp": datetime.now().isoformat(), "rankings": out}

@app.get("/player/{name}")
def get_player(name: str, year: int = Query(2024, ge=2015, le=2026)):
    """Find a player anywhere across positions and return per-week + season scores."""
    for pos in SCORE_FUNCS:
        df = get_weekly_data(year, pos)
        if df.empty or 'Player' not in df.columns:
            continue
        match = df[df['Player'].str.contains(name, case=False, na=False)]
        if match.empty:
            continue
        weekly = SCORE_FUNCS[pos](match.copy())
        season = aggregate_to_per_game(match)
        if not season.empty:
            season = SCORE_FUNCS[pos](season)
        weekly = weekly.replace([np.inf,-np.inf], np.nan).fillna(0)
        season = season.replace([np.inf,-np.inf], np.nan).fillna(0)
        return {
            "name": name, "position": pos, "year": year,
            "season_per_game": season.to_dict(orient="records"),
            "weekly": weekly.sort_values('Week' if 'Week' in weekly else 'Weighted_Score').to_dict(orient="records"),
        }
    raise HTTPException(404, f"No matches for {name!r} in {year}.")

# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
