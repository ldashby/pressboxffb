"""
Press Box — sync layer for editable content.
SQLite-backed CRUD for articles, live-wire posts, player overrides,
scores config, and the admin passcode. Single shared passcode auth
via the `X-Admin-Pass` header on every write.
"""
from fastapi import APIRouter, HTTPException, Header, Body, Query
from typing import Optional, Any, Dict, List
import sqlite3
import json
import os
import time
import secrets

# ─────────── DB setup ───────────
DB_PATH = os.environ.get("PRESSBOX_DB", os.path.join(os.path.dirname(__file__), "pressbox.db"))

def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL;")
    return c

def _init():
    with _conn() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS kv (
          k TEXT PRIMARY KEY,
          v TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS articles (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          author TEXT,
          tag TEXT,
          summary TEXT,
          body TEXT,
          published_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS livewire (
          id TEXT PRIMARY KEY,
          tag TEXT,
          cat TEXT,
          text TEXT NOT NULL,
          src TEXT,
          pinned INTEGER NOT NULL DEFAULT 1,
          published_at INTEGER NOT NULL
        );
        """)

# Default admin passcode = "pressbox" until changed.
def _passcode() -> str:
    with _conn() as c:
        row = c.execute("SELECT v FROM kv WHERE k='admin_passcode'").fetchone()
    return row["v"] if row else "pressbox"

def _check_admin(passcode: Optional[str]):
    if not passcode or passcode != _passcode():
        raise HTTPException(401, "Invalid or missing admin passcode")

def _put_kv(k: str, v: Any):
    with _conn() as c:
        c.execute(
            "INSERT INTO kv (k, v, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at",
            (k, json.dumps(v), int(time.time() * 1000)),
        )

def _get_kv(k: str, default=None):
    with _conn() as c:
        row = c.execute("SELECT v FROM kv WHERE k=?", (k,)).fetchone()
    return json.loads(row["v"]) if row else default

# ─────────── Router ───────────
router = APIRouter(prefix="/sync", tags=["sync"])

@router.on_event("startup")
def _startup():
    _init()

# ── auth ─────────────────────────────────────────
@router.get("/ping")
def ping():
    _init()
    return {"ok": True, "ts": int(time.time() * 1000)}

@router.post("/auth/check")
def auth_check(passcode: Optional[str] = Header(None, alias="X-Admin-Pass")):
    _check_admin(passcode)
    return {"ok": True}

@router.post("/auth/passcode")
def set_passcode(
    body: Dict[str, str] = Body(...),
    passcode: Optional[str] = Header(None, alias="X-Admin-Pass"),
):
    _check_admin(passcode)
    new = body.get("new", "").strip()
    if len(new) < 4:
        raise HTTPException(400, "New passcode must be at least 4 characters")
    _put_kv("admin_passcode", new)
    return {"ok": True}

# ── articles ─────────────────────────────────────
@router.get("/articles")
def list_articles():
    _init()
    with _conn() as c:
        rows = c.execute(
            "SELECT id,title,author,tag,summary,body,published_at as publishedAt,updated_at as updatedAt "
            "FROM articles ORDER BY published_at DESC"
        ).fetchall()
    return {"articles": [dict(r) for r in rows]}

@router.put("/articles/{aid}")
def upsert_article(
    aid: str,
    body: Dict[str, Any] = Body(...),
    passcode: Optional[str] = Header(None, alias="X-Admin-Pass"),
):
    _check_admin(passcode)
    now = int(time.time() * 1000)
    pub = int(body.get("publishedAt") or now)
    with _conn() as c:
        c.execute(
            "INSERT INTO articles (id,title,author,tag,summary,body,published_at,updated_at) "
            "VALUES (?,?,?,?,?,?,?,?) "
            "ON CONFLICT(id) DO UPDATE SET title=excluded.title, author=excluded.author, "
            "tag=excluded.tag, summary=excluded.summary, body=excluded.body, "
            "published_at=excluded.published_at, updated_at=excluded.updated_at",
            (aid, body.get("title", "Untitled"), body.get("author", "PressBox"),
             body.get("tag", "ANALYSIS"), body.get("summary", ""), body.get("body", ""),
             pub, now),
        )
    return {"ok": True, "id": aid}

@router.delete("/articles/{aid}")
def delete_article(
    aid: str,
    passcode: Optional[str] = Header(None, alias="X-Admin-Pass"),
):
    _check_admin(passcode)
    with _conn() as c:
        c.execute("DELETE FROM articles WHERE id=?", (aid,))
    return {"ok": True}

# ── live wire (admin pinned posts) ────────────────
@router.get("/livewire")
def list_livewire():
    _init()
    with _conn() as c:
        rows = c.execute(
            "SELECT id,tag,cat,text,src,pinned,published_at as publishedAt "
            "FROM livewire ORDER BY published_at DESC LIMIT 50"
        ).fetchall()
    return {"livewire": [dict(r) for r in rows]}

@router.put("/livewire/{wid}")
def upsert_livewire(
    wid: str,
    body: Dict[str, Any] = Body(...),
    passcode: Optional[str] = Header(None, alias="X-Admin-Pass"),
):
    _check_admin(passcode)
    now = int(time.time() * 1000)
    pub = int(body.get("publishedAt") or now)
    with _conn() as c:
        c.execute(
            "INSERT INTO livewire (id,tag,cat,text,src,pinned,published_at) "
            "VALUES (?,?,?,?,?,?,?) "
            "ON CONFLICT(id) DO UPDATE SET tag=excluded.tag, cat=excluded.cat, "
            "text=excluded.text, src=excluded.src, pinned=excluded.pinned, "
            "published_at=excluded.published_at",
            (wid, body.get("tag", "upd"), body.get("cat", "UPDATE"),
             body.get("text", ""), body.get("src", "PressBox"),
             1 if body.get("pinned", True) else 0, pub),
        )
    return {"ok": True, "id": wid}

@router.delete("/livewire/{wid}")
def delete_livewire(
    wid: str,
    passcode: Optional[str] = Header(None, alias="X-Admin-Pass"),
):
    _check_admin(passcode)
    with _conn() as c:
        c.execute("DELETE FROM livewire WHERE id=?", (wid,))
    return {"ok": True}

# ── generic blob storage (players, scoresConfig, watchlist) ──
# These are stored as JSON in the kv table — small, infrequently written,
# always replaced as a whole. Read endpoints are public; writes need the passcode.
BLOB_KEYS = {"players", "scoresConfig", "watchlist", "rankings"}

@router.get("/blob/{key}")
def get_blob(key: str):
    if key not in BLOB_KEYS:
        raise HTTPException(404, "Unknown blob key")
    _init()
    return {"key": key, "value": _get_kv(key)}

@router.put("/blob/{key}")
def put_blob(
    key: str,
    body: Dict[str, Any] = Body(...),
    passcode: Optional[str] = Header(None, alias="X-Admin-Pass"),
):
    if key not in BLOB_KEYS:
        raise HTTPException(404, "Unknown blob key")
    _check_admin(passcode)
    _init()
    _put_kv(key, body.get("value"))
    return {"ok": True, "key": key}

# ── full snapshot (one call to hydrate the SPA) ──
@router.get("/snapshot")
def snapshot():
    _init()
    with _conn() as c:
        articles = [dict(r) for r in c.execute(
            "SELECT id,title,author,tag,summary,body,published_at as publishedAt,updated_at as updatedAt "
            "FROM articles ORDER BY published_at DESC"
        ).fetchall()]
        livewire = [dict(r) for r in c.execute(
            "SELECT id,tag,cat,text,src,pinned,published_at as publishedAt "
            "FROM livewire ORDER BY published_at DESC LIMIT 50"
        ).fetchall()]
    return {
        "ts": int(time.time() * 1000),
        "articles": articles,
        "livewire": livewire,
        "players": _get_kv("players"),
        "scoresConfig": _get_kv("scoresConfig"),
        "watchlist": _get_kv("watchlist"),
        "rankings": _get_kv("rankings"),
    }
