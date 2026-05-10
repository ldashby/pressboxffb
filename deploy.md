# Press Box — Deploy as a Website

This guide takes you from the project files in this folder to a public URL anyone can visit on phone, tablet, or desktop.

---

## What you're deploying

| Piece | Required? | What it does |
|---|---|---|
| **Frontend** — `index.html` + `*.jsx` files | **Yes.** | The whole Press Box site — rankings, mock draft, articles, player profiles, PB Score, Live Wire, My Team. Stores your edits in the browser's localStorage by default. |
| **Backend** — `backend/` (FastAPI + SQLite) | Optional. | Server-side weighted scoring with real PFF / DVOA inputs **and** cross-device sync (articles, Live Wire posts, passcode). Without it, edits live only on the device that made them. |

---

## ⚡ Fastest path — 60 seconds to live

1. **Download the project as a zip** (download card at the bottom of this chat → unzip).
2. Open **https://app.netlify.com/drop**.
3. Drag the unzipped folder onto the page.
4. You get a public URL like `https://lucky-otter-9c12.netlify.app`. That's your site.
5. Default admin passcode: **`pressbox`** — change it from the Tweaks panel → Admin → Change Passcode.

That's it. Skip the rest of this doc unless you want a custom domain, real PFF/DVOA inputs, or cross-device editing.

---

## A. Frontend hosting (pick one)

All four are free, support custom domains, and serve the entire site from this folder as-is. No build step.

### 1. Netlify Drop — recommended

1. Drag the project folder onto **https://app.netlify.com/drop**.
2. (Optional) Sign up to claim the site, rename it (`pressbox.netlify.app`), or attach a custom domain.
3. To redeploy after edits: zip the folder again and drop it on the same site's **Deploys** page.

### 2. Cloudflare Pages — best for ongoing edits via GitHub

1. Push this folder to a GitHub repo.
2. https://pages.cloudflare.com → **Create Project** → connect repo.
3. Build command: *(leave blank)*. Output directory: *(leave blank)*. Framework: **None**.
4. Deploy. Every git push auto-deploys.

### 3. GitHub Pages

1. Push to a repo named `<your-username>.github.io` (or any repo with Pages enabled).
2. Repo **Settings → Pages** → Source: **`main` branch / root** → Save.
3. Visit `https://<username>.github.io` (give it ~1 minute to publish).

### 4. Vercel

1. https://vercel.com → **New Project** → import the repo.
2. Framework Preset: **Other**. Click Deploy.

### Custom domain (optional)

After deploying, every host above lets you point a domain you own (`pressbox.tld`) at the site:
- **Netlify / Vercel / Cloudflare**: Domain settings → Add custom domain → follow the DNS instructions (usually one CNAME record).
- **GitHub Pages**: Settings → Pages → Custom domain → add a `CNAME` file to the repo.

---

## B. Editing from your phone

Once deployed, the entire admin surface works on mobile Safari / Chrome:

- Tap **Viewer** in the masthead → enter passcode → you're now Admin.
- Tap any player → **✎ Edit** to change name, rank, tier, score, ADP, factors, editor's note.
- Tap a player → **PB Score → Tune** to set per-player PFF, YAC, Opp DVOA, etc.
- Articles tab → **+ New Article** to publish.
- Tweaks panel (gear icon) → Import Data to paste CSV/JSON.

Without the backend, your edits stay on the device that made them. With the backend (Section C), every device sees the same articles, Live Wire posts, and passcode.

---

## C. Backend — cross-device sync + real data (optional)

The backend is a FastAPI app in `backend/`. It does two things:

1. **Sync layer** — articles, Live Wire pinned posts, and the admin passcode persist server-side in SQLite, so your phone and laptop see the same content.
2. **Server-side scoring** — runs the six weighted formulas on real per-game data from `nfl_data_py` or CSVs you drop in `backend/data/`. The frontend falls back to in-browser computation if the backend is unreachable, so this never breaks the site.

### Run it locally first

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Open **http://127.0.0.1:8000/docs** — Swagger UI lets you hit every endpoint.

### Deploy to Render — recommended free tier

1. Push the **whole project** (including `backend/`) to GitHub.
2. https://render.com → **New → Web Service** → connect repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
4. Deploy. After ~3 min you'll get `https://your-app.onrender.com`.
5. Sanity check: visit `https://your-app.onrender.com/docs`.

> Free Render web services sleep after 15 min idle and take ~30s to wake on the next request. Fine for personal use.

### Or Railway

1. https://railway.app → **New → GitHub Repo** → select repo.
2. **Root Directory** → `backend`.
3. **Start Command** → `uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. Deploy → **Generate Domain**.

### Or Fly.io

```bash
cd backend
fly launch
fly deploy
```

### Hook the frontend to the backend

Once the API is live:

1. Open your deployed Press Box site.
2. Sign in as Admin.
3. Tweaks panel → Admin → **Backend API URL** → paste the Render URL (no trailing slash).
4. Click **Test Connection** → should show `Connected — Press Box Sports API v1.0.0`.
5. **Save**.

You now have:
- Cross-device sync for articles, Live Wire posts, admin passcode.
- Real PFF / YAC / DVOA inputs powering PB Scores.
- Anyone visiting the site reads from the same DB.

The DB lives at `backend/pressbox.db`. To survive a redeploy on Render, attach a disk and set `PRESSBOX_DB` env var to a path on it (e.g. `/var/data/pressbox.db`).

### Sync API endpoints

```
GET    /sync/snapshot          — full hydration in one call
GET    /sync/articles          — list
PUT    /sync/articles/{id}     — upsert       (X-Admin-Pass header)
DELETE /sync/articles/{id}     — delete       (X-Admin-Pass header)
GET    /sync/livewire          — list
PUT    /sync/livewire/{id}     — upsert       (admin)
DELETE /sync/livewire/{id}     — delete       (admin)
POST   /sync/auth/check        — verify passcode
POST   /sync/auth/passcode     — change passcode (admin)
```

### Drop your own CSVs

Place files in `backend/data/` named `<position>_<year>.csv`:

```
backend/data/rb_2024.csv
backend/data/qb_2024.csv
backend/data/wr_2024.csv
```

Expected columns (case-sensitive; missing columns use neutral defaults):

| Position | Columns |
|---|---|
| RB  | `Player, Team, Week, Carries, Rush_Yards, Receptions, Rec_Yards, TDs, Opp_DVOA, PFF_Grade` |
| QB  | `Player, Team, Week, Pass_Yards, Pass_TDs, Rush_Yards, Dropbacks, Big_Plays, Opp_DVOA` |
| WR  | `Player, Team, Week, Targets, Receptions, Yards, YAC, TDs, Opp_DVOA` |
| TE  | `Player, Team, Week, Targets, Receptions, Yards, Red_Zone_Targets, TDs, Opp_DVOA` |
| K   | `Player, Team, Week, FG_Made, PAT_Made, Long_FG, Opp_Scoring` |
| DEF | `Team, Week, Sacks, Turnovers, Points_Allowed, Yards_Allowed, Opp_Off_DVOA` |

Commit + push → Render auto-redeploys. CSVs override `nfl_data_py` for that year/position.

---

## D. Security model

The admin passcode lives client-side in localStorage (and server-side in SQLite if the backend is connected). It's a "keep casual visitors out" gate, not bank-grade auth — perfect for a personal site shared with friends and family.

**Default passcode: `pressbox`** — change it from Tweaks → Admin → Change Passcode immediately after deploy.

If you ever want real per-user accounts, that needs Supabase Auth or similar layered onto the backend.

---

## E. Troubleshooting

| Symptom | Fix |
|---|---|
| Site loads but data is blank | Hard refresh (Cmd/Ctrl + Shift + R) — Babel transpiles in-browser, an old service worker cache can stick. |
| Stats tab blank | Sleeper rate-limited; refresh. Failed weeks render as `—`. |
| Trending players show numeric IDs | Visit the site once on a fast connection so the Sleeper players index (~5 MB) can cache. |
| Backend **Test Connection** fails | Confirm `https://` prefix, no trailing slash. CORS is open by default. |
| Admin pill missing | Tap the **Viewer** pill in the masthead to open the passcode prompt. |
| Edits don't sync across devices | Without backend: expected (localStorage is per-device). With backend: confirm the URL is saved and Test Connection passes. |
| Live Wire shows only ESPN, no pinned posts | Pin posts as Admin from the Wire tab → **+ New Post**. |
| ESPN feed empty | ESPN's CDN rate-limits occasionally — refresh in 30s. Cached for 30 min. |
| My Team can't find ESPN league | Only **public** leagues work without ESPN cookies. Make the league public, or use the Paste Roster tab. |
| Sleeper username not found | Use your Sleeper *username*, not display name. Case-sensitive. |

---

## F. Project layout

```
index.html              ← entry point — drop this folder on any host
app.jsx                 ← main React app + routing
admin.jsx               ← admin gate + backend URL setting
articles.jsx            ← articles read/write (synced via storage.jsx)
livewire.jsx            ← Live Wire ticker + admin-pinned posts + ESPN feed
myteam.jsx              ← Sleeper / ESPN public / paste-roster flows
storage.jsx             ← backend-first sync adapter (articles, livewire, blobs)
weighted.jsx            ← six personal weighted formulas (in-browser fallback)
gamelogs.jsx            ← Sleeper per-week stats
profile.jsx             ← player drawer (Overview / PB Score / Stats / Schedule / Depth / News / ✎ Edit)
sleeper.jsx             ← Sleeper API integration
pages.jsx               ← rankings, mock draft, articles, strategy, etc.
components.jsx          ← shared UI primitives (chips, tags, tables)
data.jsx                ← seed player rankings + news
consensus.jsx           ← FantasyPros / ESPN / Yahoo / CBS / PFF compare links
import-modal.jsx        ← CSV/JSON admin import
tweaks-panel.jsx        ← floating Tweaks panel (theme, density, fonts, admin)
backend/
  main.py               ← FastAPI app — six weighted formulas + sync endpoints
  storage.py            ← SQLite CRUD for articles, live wire, passcode
  pressbox.db           ← auto-created on first request
  requirements.txt
  Procfile              ← Heroku-style deploys
  runtime.txt
  data/                 ← drop your CSVs here
  README.md             ← backend-specific notes
DEPLOY.md               ← this file
```

---

## TL;DR checklist

- [ ] Drag folder onto Netlify Drop → grab the URL.
- [ ] Open the site, sign in as Admin, change the passcode.
- [ ] (Optional) Deploy `backend/` to Render → paste URL into Tweaks → Admin → Test Connection → Save.
- [ ] (Optional) Attach a custom domain.
- [ ] Share the URL.

You're live.
