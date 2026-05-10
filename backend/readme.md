# Press Box Backend

Personal weighted-rankings API. Implements the six position formulas (RB / QB / WR / TE / K / DEF) over real NFL data.

## Run locally

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://127.0.0.1:8000/docs for an interactive Swagger UI.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health + capability check |
| GET | `/formulas` | The six weighted formulas as plain text |
| GET | `/stats/{position}?year=2024&top=25` | Per-game weighted scores, sorted |
| GET | `/rankings?year=2024&top=10` | Top N at every position in one call |
| GET | `/player/{name}?year=2024` | One player's weekly + season scores |

Position values: `RB`, `QB`, `WR`, `TE`, `K`, `DEF`.

## Data sources (priority order)

1. **`./data/<pos>_<year>.csv`** — drop your own CSV here for that year/position. Column names match the formula inputs (Player, Team, Week, Carries, Rush_Yards, …).
2. **`nfl_data_py`** — pulls real per-game stats from nflverse (1999-present). Installed by default.
3. **Sample stub** — two fake players per position so the API works before any real data lands.

## Deploy free (Render)

1. Push this `backend/` folder to a GitHub repo.
2. Sign in to https://render.com → **New → Web Service**.
3. Connect the repo, pick the `backend/` subdirectory.
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Free plan. After it boots you'll get a URL like `https://press-box-api.onrender.com`.

Then in the Press Box site: **gear icon → Tweaks → Backend API URL** → paste the URL. Done.

## Deploy free (Railway)

1. https://railway.app → **New Project → Deploy from GitHub**
2. Select repo, set root directory to `backend/`
3. Add start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Railway auto-detects Python + requirements.txt.

## Deploy free (Fly.io)

```bash
fly launch
fly deploy
```

Use the auto-generated `fly.toml` and a Dockerfile with `python:3.11-slim`.

## CSV format

`backend/data/rb_2024.csv`:
```
Player,Team,Week,Carries,Rush_Yards,Receptions,Rec_Yards,TDs,Opp_DVOA,PFF_Grade
Saquon Barkley,PHI,1,24,109,2,23,2,0.22,90
...
```

The formulas are tolerant of missing columns — e.g. PFF_Grade defaults to 75, Opp_DVOA defaults to neutral. Add what you have.
