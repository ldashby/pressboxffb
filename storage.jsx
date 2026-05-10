// ═════════════════════════════════════════════════════════════════
// SYNC ADAPTER — backend-first with localStorage fallback
// One unified API: read returns from backend if URL is set & reachable,
// otherwise from localStorage. Writes go to BOTH so phone/desktop stay
// in lockstep when backend is on, and the user keeps their data offline.
// ═════════════════════════════════════════════════════════════════

const PASS_KEY = 'pressbox.adminPasscode.v1';
const SNAP_TS_KEY = 'pressbox.snapshotTs.v1';

function _backend(){
  return (window.getBackendUrl && window.getBackendUrl()) || '';
}
function _passcode(){
  try { return localStorage.getItem(PASS_KEY) || 'pressbox'; } catch(e){ return 'pressbox'; }
}

async function _fetch(path, opts){
  const base = _backend();
  if (!base) throw new Error('no backend');
  const r = await fetch(base + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) }
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function _adminFetch(path, opts){
  return _fetch(path, {
    ...opts,
    headers: { 'X-Admin-Pass': _passcode(), ...(opts?.headers || {}) }
  });
}

// ── Articles ─────────────────────────────────────────────────────
const ARTICLES_KEY = 'pressbox.articles.v1';
function _localArticles(){
  try { return JSON.parse(localStorage.getItem(ARTICLES_KEY) || 'null') || (window.SEED_ARTICLES || []).slice(); }
  catch(e){ return (window.SEED_ARTICLES || []).slice(); }
}
function _saveLocalArticles(list){
  try { localStorage.setItem(ARTICLES_KEY, JSON.stringify(list)); } catch(e){}
}

async function fetchArticles(){
  if (_backend()) {
    try {
      const r = await _fetch('/sync/articles');
      // Backend uses publishedAt camelCase already
      const list = r.articles || [];
      // Map backend shape to frontend shape (category := tag)
      const mapped = list.map(a => ({
        id: a.id, title: a.title, author: a.author,
        category: a.tag || 'Notes', summary: a.summary, body: a.body,
        publishedAt: a.publishedAt
      }));
      _saveLocalArticles(mapped);
      return mapped;
    } catch(e){
      // fall through to local
    }
  }
  return _localArticles();
}

async function upsertArticle(article){
  // Always update local cache so UI is responsive
  const cur = _localArticles();
  const next = cur.find(a=>a.id===article.id)
    ? cur.map(a => a.id===article.id ? article : a)
    : [article, ...cur];
  _saveLocalArticles(next);

  if (_backend()) {
    try {
      await _adminFetch('/sync/articles/' + encodeURIComponent(article.id), {
        method: 'PUT',
        body: JSON.stringify({
          title: article.title, author: article.author, tag: article.category,
          summary: article.summary, body: article.body, publishedAt: article.publishedAt
        })
      });
    } catch(e){ console.warn('article sync failed', e); }
  }
  return next;
}

async function deleteArticle(id){
  const cur = _localArticles();
  const next = cur.filter(a => a.id !== id);
  _saveLocalArticles(next);
  if (_backend()) {
    try { await _adminFetch('/sync/articles/' + encodeURIComponent(id), { method: 'DELETE' }); }
    catch(e){ console.warn('article delete failed', e); }
  }
  return next;
}

// ── Live Wire ────────────────────────────────────────────────────
const LIVEWIRE_KEY = 'pressbox.livewire.v1';
function _localLivewire(){
  try { return JSON.parse(localStorage.getItem(LIVEWIRE_KEY) || '[]'); }
  catch(e){ return []; }
}
function _saveLocalLivewire(list){
  try { localStorage.setItem(LIVEWIRE_KEY, JSON.stringify(list)); } catch(e){}
}

async function fetchLivewire(){
  if (_backend()) {
    try {
      const r = await _fetch('/sync/livewire');
      const list = r.livewire || [];
      _saveLocalLivewire(list);
      return list;
    } catch(e){}
  }
  return _localLivewire();
}

async function upsertLivewire(post){
  const cur = _localLivewire();
  const next = cur.find(p=>p.id===post.id)
    ? cur.map(p => p.id===post.id ? post : p)
    : [post, ...cur];
  _saveLocalLivewire(next);

  if (_backend()) {
    try {
      await _adminFetch('/sync/livewire/' + encodeURIComponent(post.id), {
        method: 'PUT', body: JSON.stringify(post)
      });
    } catch(e){ console.warn('livewire sync failed', e); }
  }
  return next;
}

async function deleteLivewire(id){
  const cur = _localLivewire();
  const next = cur.filter(p => p.id !== id);
  _saveLocalLivewire(next);
  if (_backend()) {
    try { await _adminFetch('/sync/livewire/' + encodeURIComponent(id), { method: 'DELETE' }); }
    catch(e){ console.warn('livewire delete failed', e); }
  }
  return next;
}

// ── ESPN news feed (public, no key needed) ──────────────────────
const ESPN_NEWS_CACHE_KEY = 'pressbox.espnNews.v1';
const ESPN_NEWS_TTL_MS = 30 * 60 * 1000; // 30 min

async function fetchEspnNews(force){
  if (!force) {
    try {
      const raw = localStorage.getItem(ESPN_NEWS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.ts < ESPN_NEWS_TTL_MS) return parsed.items;
      }
    } catch(e){}
  }
  try {
    const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=20');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const items = (j.articles || []).map(a => ({
      id: 'espn-' + (a.id || a.guid || a.headline),
      tag: 'inj', // best effort; refined below
      cat: (a.categories?.[0]?.description || a.type || 'NFL').toUpperCase().slice(0,12),
      text: a.headline,
      link: a.links?.web?.href || a.links?.mobile?.href || '',
      src: 'ESPN',
      publishedAt: new Date(a.published || a.lastModified || Date.now()).getTime()
    }));
    try { localStorage.setItem(ESPN_NEWS_CACHE_KEY, JSON.stringify({ ts: Date.now(), items })); } catch(e){}
    return items;
  } catch(e){
    return [];
  }
}

// ── React hooks ──────────────────────────────────────────────────
function useArticles(){
  const [articles, setArticles] = React.useState(_localArticles);
  const [loading, setLoading] = React.useState(false);
  const refresh = React.useCallback(async () => {
    setLoading(true);
    const list = await fetchArticles();
    setArticles(list); setLoading(false);
  }, []);
  React.useEffect(() => { refresh(); }, []);

  const save = async (article) => {
    const next = await upsertArticle(article);
    setArticles(next);
  };
  const remove = async (id) => {
    const next = await deleteArticle(id);
    setArticles(next);
  };
  return { articles, loading, refresh, save, remove };
}

function useLivewire(){
  const [posts, setPosts] = React.useState(_localLivewire);
  const [espn, setEspn] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const refresh = React.useCallback(async () => {
    setLoading(true);
    const [pinned, news] = await Promise.all([fetchLivewire(), fetchEspnNews()]);
    setPosts(pinned); setEspn(news);
    setLoading(false);
  }, []);
  React.useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const save = async (post) => {
    const next = await upsertLivewire(post);
    setPosts(next);
  };
  const remove = async (id) => {
    const next = await deleteLivewire(id);
    setPosts(next);
  };

  // Combined feed: pinned posts first, then ESPN news, deduped & sorted by ts
  const combined = React.useMemo(() => {
    const all = [
      ...posts.map(p => ({ ...p, _pinned: true })),
      ...espn.map(p => ({ ...p, _pinned: false }))
    ];
    return all.sort((a,b) => {
      if (a._pinned !== b._pinned) return a._pinned ? -1 : 1;
      return (b.publishedAt||0) - (a.publishedAt||0);
    });
  }, [posts, espn]);

  return { posts, espn, combined, loading, refresh, save, remove };
}

Object.assign(window, {
  fetchArticles, upsertArticle, deleteArticle,
  fetchLivewire, upsertLivewire, deleteLivewire, fetchEspnNews,
  useArticles, useLivewire
});
