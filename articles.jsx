// ═════════════════════════════════════════════════════════════════
// ARTICLES — admin-authored posts, viewer-readable
// ═════════════════════════════════════════════════════════════════

const ARTICLES_KEY = 'pressbox.articles.v1';

const SEED_ARTICLES = [
  {
    id: 'a-001',
    title: 'The case for fading RB in the early rounds',
    category: 'Strategy',
    author: 'Press Box Desk',
    publishedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    summary: 'Robin Hood drafting in 2026: lock the elite WR1 and a single elite RB, then fade the position until round five.',
    body: `Drafts are weeks away and the ADP market is still soft in places worth exploiting.\n\nThe core thesis: running back scoring volatility hit a five-year peak last year, and the rookie class — Jeanty, Hampton, Hunter — gives you usable lottery tickets in rounds 8–10 that look a lot like the early-round picks at half the cost.\n\nWHO TO TARGET\n• Round 1: Chase, Bijan, Gibbs, Saquon — true elite tier only\n• Rounds 2–4: ride the WR window — Jefferson, Lamb, Nabers, BTJ\n• Rounds 5–7: target Daniels at QB, McBride/Bowers at TE\n• Rounds 8–10: pounce on Jeanty, Hampton, Achane, JSN\n\nWHO TO FADE\n• Derrick Henry (age cliff)\n• Tyreek (YAC cliff)\n• Mahomes-Worthy stack until round 8`
  },
  {
    id: 'a-002',
    title: 'Predraft notebook: rookie tiers',
    category: 'Rookies',
    author: 'Press Box Desk',
    publishedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    summary: 'The 2026 rookie class has three Tier-1 picks. Travis Hunter is the cheat code in any format that matters.',
    body: `Tier 1 — must roster\n• Ashton Jeanty (RB, LV) — workhorse; no backfield competition\n• Travis Hunter (WR, JAX) — 80% offensive snaps the floor\n• Omarion Hampton (RB, LAC) — Harbaugh = run-heavy\n\nTier 2 — startable\n• Bryce Underwood handcuffs\n• Tre Harris contingent on TEN backfield clarity\n\nDynasty owners should be paying first-round prices for all three of Tier 1. Redraft owners should be paying late-round prices and praying.`
  },
  {
    id: 'a-003',
    title: 'How to use this site',
    category: 'Welcome',
    author: 'Press Box Desk',
    publishedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    summary: 'A quick tour of the rankings, mock draft tool, start/sit, and the consensus comparison.',
    body: `Welcome to Press Box. Here is the short version:\n\n1) RANKINGS — the board. Tap a player for the deep view (snap share, target share, schedule, news).\n\n2) MOCK DRAFT — ADP-aware draft simulator. Pick your slot and run it.\n\n3) START/SIT — head-to-head this week's questions.\n\n4) CONSENSUS — see how Press Box stacks up against FantasyPros, ESPN, Yahoo, CBS, and the Fantasy Footballers. Direct links below every comparison so you can verify.\n\n5) WIRE / WAIVERS — trending adds & drops, refreshed live from Sleeper.\n\nIf you want to talk shop, the email is in the footer.`
  }
];

function loadArticles(){
  try {
    const raw = localStorage.getItem(ARTICLES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch(e){}
  return [...SEED_ARTICLES];
}
function saveArticles(list){
  try { localStorage.setItem(ARTICLES_KEY, JSON.stringify(list)); } catch(e){}
}

function fmtArticleDate(ts){
  const d = new Date(ts);
  return d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
}

function ArticleEditor({article, onSave, onCancel, onDelete}){
  const [title, setTitle] = React.useState(article?.title || '');
  const [category, setCategory] = React.useState(article?.category || 'Strategy');
  const [summary, setSummary] = React.useState(article?.summary || '');
  const [body, setBody] = React.useState(article?.body || '');

  function handleSave(){
    if (!title.trim() || !body.trim()) { alert('Title and body required.'); return; }
    onSave({
      id: article?.id || ('a-' + Date.now()),
      title: title.trim(),
      category: category.trim() || 'Notes',
      author: article?.author || 'Press Box Desk',
      publishedAt: article?.publishedAt || Date.now(),
      summary: summary.trim(),
      body
    });
  }

  return (
    <div style={{border:'2px solid var(--ink)',padding:20,background:'var(--surface)',marginBottom:24}}>
      <div className="eyebrow-accent" style={{marginBottom:14}}>
        {article ? 'Edit Article' : 'New Article'}
      </div>
      <label style={{display:'block',marginBottom:12}}>
        <span className="eyebrow" style={{display:'block',marginBottom:4}}>Title</span>
        <input type="text" value={title} onChange={e=>setTitle(e.target.value)}
          style={{width:'100%',padding:'10px 12px',fontFamily:'var(--fs)',fontSize:22,fontWeight:600,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)',letterSpacing:'-.01em'}}/>
      </label>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <label>
          <span className="eyebrow" style={{display:'block',marginBottom:4}}>Category</span>
          <input type="text" value={category} onChange={e=>setCategory(e.target.value)}
            list="cat-list"
            style={{width:'100%',padding:'8px 10px',fontFamily:'var(--fd)',fontSize:13,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)'}}/>
          <datalist id="cat-list">
            <option value="Strategy"/><option value="Rookies"/><option value="Waivers"/>
            <option value="Start/Sit"/><option value="Trades"/><option value="Dynasty"/>
            <option value="Welcome"/><option value="Notes"/>
          </datalist>
        </label>
      </div>
      <label style={{display:'block',marginBottom:12}}>
        <span className="eyebrow" style={{display:'block',marginBottom:4}}>Summary <span style={{color:'var(--ink-4)',textTransform:'none',letterSpacing:0,fontSize:10}}>(one sentence shown on the index)</span></span>
        <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={2}
          style={{width:'100%',padding:'10px 12px',fontFamily:'var(--fs)',fontSize:14,fontStyle:'italic',border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink-2)',resize:'vertical'}}/>
      </label>
      <label style={{display:'block',marginBottom:14}}>
        <span className="eyebrow" style={{display:'block',marginBottom:4}}>Body <span style={{color:'var(--ink-4)',textTransform:'none',letterSpacing:0,fontSize:10}}>(plain text; double newlines = paragraph break)</span></span>
        <textarea value={body} onChange={e=>setBody(e.target.value)} rows={16}
          style={{width:'100%',padding:'12px 14px',fontFamily:'var(--fb)',fontSize:14,lineHeight:1.6,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)',resize:'vertical'}}/>
      </label>
      <div style={{display:'flex',gap:8,justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:8}}>
          <button className="btn primary" onClick={handleSave}>Publish</button>
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
        </div>
        {article && onDelete && (
          <button className="btn ghost" style={{color:'var(--bad)'}} onClick={()=>{
            if (confirm('Delete this article? This cannot be undone.')) onDelete(article.id);
          }}>Delete</button>
        )}
      </div>
    </div>
  );
}

function ArticleCard({article, onOpen, isAdmin, onEdit}){
  return (
    <article style={{borderBottom:'1px solid var(--rule-soft)',paddingBottom:24,marginBottom:24,cursor:'pointer'}} onClick={()=>onOpen(article)}>
      <div style={{display:'flex',gap:10,alignItems:'baseline',marginBottom:8}}>
        <span className="eyebrow-accent">{article.category}</span>
        <span className="eyebrow" style={{color:'var(--ink-4)'}}>{fmtArticleDate(article.publishedAt)}</span>
        {isAdmin && (
          <button className="btn ghost" style={{marginLeft:'auto',fontSize:10,padding:'3px 8px'}}
            onClick={(e)=>{e.stopPropagation(); onEdit(article);}}>Edit</button>
        )}
      </div>
      <h2 style={{fontFamily:'var(--fs)',fontSize:30,lineHeight:1.05,fontWeight:700,letterSpacing:'-.02em',marginBottom:8,color:'var(--ink)'}}>
        {article.title}
      </h2>
      {article.summary && (
        <p style={{fontFamily:'var(--fs)',fontStyle:'italic',fontSize:16,color:'var(--ink-2)',lineHeight:1.5,maxWidth:'62ch'}}>
          {article.summary}
        </p>
      )}
      <div className="byline" style={{marginTop:10,fontSize:11,color:'var(--ink-3)'}}>
        By {article.author}
      </div>
    </article>
  );
}

function ArticleReader({article, onClose, onEdit, isAdmin}){
  return (
    <div style={{maxWidth:680}}>
      <button className="btn ghost" onClick={onClose} style={{marginBottom:16}}>← Back to Articles</button>
      <div className="eyebrow-accent" style={{marginBottom:8}}>{article.category}</div>
      <h1 style={{fontFamily:'var(--fs)',fontSize:48,lineHeight:1.05,fontWeight:700,letterSpacing:'-.025em',marginBottom:14}}>
        {article.title}
      </h1>
      {article.summary && (
        <p style={{fontFamily:'var(--fs)',fontStyle:'italic',fontSize:19,color:'var(--ink-2)',lineHeight:1.45,marginBottom:18,maxWidth:'58ch'}}>
          {article.summary}
        </p>
      )}
      <div className="byline" style={{display:'flex',gap:12,alignItems:'center',paddingBottom:16,borderBottom:'1px solid var(--rule-soft)',marginBottom:24}}>
        <span>By <strong>{article.author}</strong></span>
        <span>·</span>
        <span>{fmtArticleDate(article.publishedAt)}</span>
        {isAdmin && (
          <button className="btn ghost" onClick={()=>onEdit(article)} style={{marginLeft:'auto'}}>Edit</button>
        )}
      </div>
      <div style={{fontFamily:'var(--fb)',fontSize:16,lineHeight:1.7,color:'var(--ink)',maxWidth:'62ch'}}>
        {article.body.split(/\n\n+/).map((para,i)=>(
          <p key={i} style={{marginBottom:18,whiteSpace:'pre-wrap'}}>{para}</p>
        ))}
      </div>
    </div>
  );
}

function ArticlesPage({isAdmin}){
  const { articles, save, remove } = window.useArticles();
  const [reading, setReading] = React.useState(null);
  const [editing, setEditing] = React.useState(null);

  async function handleSave(article){
    await save(article);
    setEditing(null);
    setReading(article);
  }
  async function handleDelete(id){
    await remove(id);
    setEditing(null); setReading(null);
  }

  if (editing) {
    const art = editing === 'new' ? null : editing;
    return <ArticleEditor article={art} onSave={handleSave} onCancel={()=>setEditing(null)} onDelete={handleDelete}/>;
  }

  if (reading) {
    return <ArticleReader article={reading} onClose={()=>setReading(null)}
      isAdmin={isAdmin} onEdit={(a)=>{setReading(null); setEditing(a);}}/>;
  }

  const sorted = [...articles].sort((a,b)=>b.publishedAt - a.publishedAt);
  const featured = sorted[0];
  const rest = sorted.slice(1);

  return (
    <div>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',borderBottom:'2px solid var(--rule)',paddingBottom:16,marginBottom:28}}>
        <div>
          <div className="eyebrow-accent" style={{marginBottom:6}}>The Editorial</div>
          <h1 style={{fontFamily:'var(--fs)',fontSize:42,fontWeight:700,letterSpacing:'-.02em'}}>Articles & Analysis</h1>
        </div>
        {isAdmin && (
          <button className="btn primary" onClick={()=>setEditing('new')}>+ New Article</button>
        )}
      </div>

      {featured && (
        <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:32,marginBottom:36,paddingBottom:32,borderBottom:'1px solid var(--rule-soft)'}}>
          <div>
            <div className="eyebrow-accent" style={{marginBottom:8}}>The Lead · {featured.category}</div>
            <h2 onClick={()=>setReading(featured)} style={{fontFamily:'var(--fs)',fontSize:54,lineHeight:1,fontWeight:700,letterSpacing:'-.03em',marginBottom:14,cursor:'pointer'}}>
              {featured.title}
            </h2>
            <p style={{fontFamily:'var(--fs)',fontStyle:'italic',fontSize:18,color:'var(--ink-2)',lineHeight:1.45,marginBottom:14,maxWidth:'52ch'}}>
              {featured.summary}
            </p>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <button className="btn primary" onClick={()=>setReading(featured)}>Read →</button>
              {isAdmin && <button className="btn ghost" onClick={()=>setEditing(featured)}>Edit</button>}
              <span className="byline" style={{fontSize:11,color:'var(--ink-3)'}}>
                {fmtArticleDate(featured.publishedAt)} · {featured.author}
              </span>
            </div>
          </div>
          <div style={{borderLeft:'1px solid var(--rule-soft)',paddingLeft:24}}>
            <div className="eyebrow" style={{marginBottom:10}}>Also in this edition</div>
            {rest.slice(0,4).map(a => (
              <div key={a.id} onClick={()=>setReading(a)} style={{padding:'10px 0',borderBottom:'1px solid var(--rule-softer)',cursor:'pointer'}}>
                <div className="eyebrow" style={{fontSize:9,color:'var(--accent)',marginBottom:3}}>{a.category}</div>
                <div style={{fontFamily:'var(--fs)',fontSize:15,fontWeight:600,letterSpacing:'-.01em',lineHeight:1.2}}>{a.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="eyebrow" style={{marginBottom:18}}>The Archive</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32}}>
        {rest.map(a => (
          <ArticleCard key={a.id} article={a} onOpen={setReading}
            isAdmin={isAdmin} onEdit={(art)=>setEditing(art)}/>
        ))}
        {rest.length===0 && (
          <div style={{color:'var(--ink-3)',fontStyle:'italic',fontFamily:'var(--fs)'}}>
            More articles coming soon.
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ArticlesPage, loadArticles, saveArticles, SEED_ARTICLES });
