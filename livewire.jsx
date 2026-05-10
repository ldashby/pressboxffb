// ═════════════════════════════════════════════════════════════════
// LIVE WIRE — admin-pinned posts + live ESPN news feed
// ═════════════════════════════════════════════════════════════════

const TAG_COLORS = {
  br: 'var(--accent)', BR: 'var(--accent)',
  inj: 'var(--bad)', INJ: 'var(--bad)',
  upd: 'var(--ink)', UPD: 'var(--ink)',
  adp: 'var(--good)', ADP: 'var(--good)',
  trd: 'var(--accent)', TRD: 'var(--accent)'
};

function fmtAgo(ts){
  if (!ts) return '';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m/60);
  if (h < 24) return h + 'h';
  return Math.floor(h/24) + 'd';
}

// ── Marquee ticker (used in masthead) ─────────────────────────────
function LiveTicker({wire}){
  const items = wire.combined.slice(0, 12);
  if (items.length === 0) {
    return (
      <div className="news-ticker">
        <div className="ticker-label"><span className="blink"/>Live Wire</div>
        <div className="ticker-track">
          <div className="ticker-content" style={{paddingLeft:24,fontStyle:'italic',color:'var(--ink-3)'}}>
            Loading league news…
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="news-ticker">
      <div className="ticker-label"><span className="blink"/>Live Wire</div>
      <div className="ticker-track">
        <div className="ticker-content">
          {[...items, ...items].map((n, i) => (
            <span key={i} className="ticker-item">
              {n._pinned && <span style={{background:'var(--accent)',color:'#fff',padding:'1px 6px',marginRight:8,fontSize:9,letterSpacing:'.08em',fontFamily:'var(--fm)'}}>PINNED</span>}
              <span className="news-tag" style={{background:TAG_COLORS[(n.tag||'').toLowerCase()]||'var(--ink)'}}>{(n.cat||n.tag||'NEWS').toUpperCase()}</span>
              <span style={{color:'var(--ink-3)',marginRight:10,fontSize:11,fontFamily:'var(--fm)'}}>{fmtAgo(n.publishedAt)}</span>
              {n.link
                ? <a href={n.link} target="_blank" rel="noopener" style={{color:'inherit',textDecoration:'none'}}>{n.text}</a>
                : <span>{n.text}</span>}
              <em style={{color:'var(--ink-4)',marginLeft:10,fontStyle:'italic',fontFamily:'var(--fs)'}}>— {n.src||'PressBox'}</em>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Admin editor for pinned posts ─────────────────────────────────
function LiveWireEditor({post, onSave, onCancel, onDelete}){
  const [text, setText] = React.useState(post?.text || '');
  const [cat, setCat] = React.useState(post?.cat || 'BREAKING');
  const [tag, setTag] = React.useState(post?.tag || 'br');
  const [src, setSrc] = React.useState(post?.src || 'PressBox');

  function save(){
    if (!text.trim()) { alert('Text required.'); return; }
    onSave({
      id: post?.id || ('w-' + Date.now()),
      text: text.trim(), cat: cat.trim().toUpperCase(), tag: tag.toLowerCase(),
      src: src.trim() || 'PressBox', pinned: true,
      publishedAt: post?.publishedAt || Date.now()
    });
  }

  return (
    <div style={{border:'2px solid var(--ink)',padding:16,background:'var(--surface)',marginBottom:16}}>
      <div className="eyebrow-accent" style={{marginBottom:10}}>{post ? 'Edit Wire Post' : 'New Wire Post'}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
        <label>
          <span className="eyebrow" style={{display:'block',marginBottom:3}}>Tag</span>
          <select value={tag} onChange={e=>setTag(e.target.value)}
            style={{width:'100%',padding:'6px 8px',fontFamily:'var(--fm)',fontSize:12,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)'}}>
            <option value="br">br · breaking</option>
            <option value="inj">inj · injury</option>
            <option value="upd">upd · update</option>
            <option value="adp">adp · adp move</option>
            <option value="trd">trd · trade</option>
          </select>
        </label>
        <label>
          <span className="eyebrow" style={{display:'block',marginBottom:3}}>Category Label</span>
          <input value={cat} onChange={e=>setCat(e.target.value)}
            style={{width:'100%',padding:'6px 8px',fontFamily:'var(--fm)',fontSize:12,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)',textTransform:'uppercase'}}/>
        </label>
        <label>
          <span className="eyebrow" style={{display:'block',marginBottom:3}}>Source</span>
          <input value={src} onChange={e=>setSrc(e.target.value)}
            style={{width:'100%',padding:'6px 8px',fontFamily:'var(--fs)',fontSize:13,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)'}}/>
        </label>
      </div>
      <label style={{display:'block',marginBottom:10}}>
        <span className="eyebrow" style={{display:'block',marginBottom:3}}>Text</span>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={3}
          placeholder="Ashton Jeanty named Raiders RB1 out of OTAs; Zamir White to backup"
          style={{width:'100%',padding:'10px 12px',fontFamily:'var(--fs)',fontSize:14,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)',resize:'vertical'}}/>
      </label>
      <div style={{display:'flex',gap:8,justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:8}}>
          <button className="btn primary" onClick={save}>Publish</button>
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
        </div>
        {post && onDelete && (
          <button className="btn ghost" style={{color:'var(--bad)'}}
            onClick={()=>{ if(confirm('Delete this post?')) onDelete(post.id); }}>Delete</button>
        )}
      </div>
    </div>
  );
}

// ── Full page: admin manages pinned, viewer sees combined feed ───
function LiveWirePage({wire, isAdmin}){
  const [editing, setEditing] = React.useState(null);

  return (
    <div>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',borderBottom:'2px solid var(--rule)',paddingBottom:16,marginBottom:24}}>
        <div>
          <div className="eyebrow-accent" style={{marginBottom:6}}>Live · The Wire</div>
          <h1 style={{fontFamily:'var(--fs)',fontSize:42,fontWeight:700,letterSpacing:'-.02em'}}>League News & Notes</h1>
          <p className="byline" style={{marginTop:6,fontSize:13,color:'var(--ink-3)'}}>
            Press Box pinned posts (yours) + ESPN NFL feed (live, refreshed every 30 min)
          </p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {isAdmin && !editing && (
            <button className="btn primary" onClick={()=>setEditing('new')}>+ New Post</button>
          )}
          <button className="btn ghost" onClick={()=>wire.refresh()} disabled={wire.loading}>
            {wire.loading ? '…' : '↻'}
          </button>
        </div>
      </div>

      {isAdmin && editing && (
        <LiveWireEditor
          post={editing === 'new' ? null : editing}
          onSave={async (p) => { await wire.save(p); setEditing(null); }}
          onCancel={()=>setEditing(null)}
          onDelete={async (id) => { await wire.remove(id); setEditing(null); }}/>
      )}

      {/* Pinned posts (admin section) */}
      {wire.posts.length > 0 && (
        <div style={{marginBottom:28}}>
          <div className="eyebrow" style={{marginBottom:10,color:'var(--accent)'}}>Pinned · Press Box</div>
          {wire.posts.map(p => (
            <div key={p.id} style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:14,alignItems:'baseline',padding:'12px 0',borderBottom:'1px solid var(--rule-soft)'}}>
              <span style={{background:TAG_COLORS[(p.tag||'').toLowerCase()]||'var(--ink)',color:'#fff',padding:'3px 8px',fontSize:9,letterSpacing:'.08em',fontFamily:'var(--fm)',whiteSpace:'nowrap'}}>{(p.cat||p.tag||'NEWS').toUpperCase()}</span>
              <div>
                <div style={{fontFamily:'var(--fs)',fontSize:16,lineHeight:1.4,marginBottom:3}}>{p.text}</div>
                <div className="byline" style={{fontSize:11,color:'var(--ink-4)'}}>{p.src} · {fmtAgo(p.publishedAt)} ago</div>
              </div>
              {isAdmin && (
                <button className="btn ghost" style={{fontSize:10,padding:'3px 8px'}} onClick={()=>setEditing(p)}>edit</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ESPN feed */}
      <div className="eyebrow" style={{marginBottom:10}}>From ESPN</div>
      {wire.espn.length === 0 && (
        <div style={{color:'var(--ink-3)',fontStyle:'italic',fontFamily:'var(--fs)'}}>
          {wire.loading ? 'Loading ESPN feed…' : 'ESPN feed unavailable.'}
        </div>
      )}
      {wire.espn.map(p => (
        <a key={p.id} href={p.link} target="_blank" rel="noopener"
          style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:14,alignItems:'baseline',padding:'12px 0',borderBottom:'1px solid var(--rule-soft)',textDecoration:'none',color:'inherit'}}>
          <span style={{background:'var(--ink)',color:'#fff',padding:'3px 8px',fontSize:9,letterSpacing:'.08em',fontFamily:'var(--fm)',whiteSpace:'nowrap'}}>{p.cat || 'NFL'}</span>
          <div style={{fontFamily:'var(--fs)',fontSize:15,lineHeight:1.4}}>{p.text}</div>
          <span className="byline" style={{fontSize:11,color:'var(--ink-4)',whiteSpace:'nowrap'}}>{fmtAgo(p.publishedAt)} ago</span>
        </a>
      ))}
    </div>
  );
}

Object.assign(window, { LiveWirePage, LiveTicker });
