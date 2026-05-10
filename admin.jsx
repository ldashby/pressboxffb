// ═════════════════════════════════════════════════════════════════
// ADMIN GATE — passcode protected. Owner-only edit access.
// Default passcode: "pressbox" (you can change it from the admin panel).
// ═════════════════════════════════════════════════════════════════

const ADMIN_KEY = 'pressbox.admin.v1';
const ADMIN_PASS_KEY = 'pressbox.adminPass.v1';
const DEFAULT_PASS = 'pressbox';

function isAdminUnlocked(){
  try { return localStorage.getItem(ADMIN_KEY) === '1'; } catch(e) { return false; }
}
function getAdminPass(){
  try { return localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASS; } catch(e) { return DEFAULT_PASS; }
}
function setAdminPass(p){
  try { localStorage.setItem(ADMIN_PASS_KEY, p); } catch(e){}
}
function setAdminUnlocked(v){
  try {
    if (v) localStorage.setItem(ADMIN_KEY, '1');
    else localStorage.removeItem(ADMIN_KEY);
  } catch(e){}
}

function useAdmin(){
  const [unlocked, setUnlocked] = React.useState(isAdminUnlocked);
  const [showGate, setShowGate] = React.useState(false);

  const tryUnlock = (pass) => {
    if (pass === getAdminPass()) {
      setAdminUnlocked(true);
      setUnlocked(true);
      setShowGate(false);
      return true;
    }
    return false;
  };
  const lock = () => { setAdminUnlocked(false); setUnlocked(false); };
  const promptUnlock = () => setShowGate(true);
  const closeGate = () => setShowGate(false);

  return { unlocked, showGate, tryUnlock, lock, promptUnlock, closeGate };
}

function AdminGate({onClose, onUnlock}){
  const [val, setVal] = React.useState('');
  const [err, setErr] = React.useState(false);
  const inputRef = React.useRef(null);
  React.useEffect(()=>{ inputRef.current?.focus(); }, []);

  function attempt(){
    if (!onUnlock(val)) { setErr(true); setVal(''); inputRef.current?.focus(); }
  }

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(20,18,13,.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--surface)',border:'2px solid var(--ink)',padding:32,maxWidth:380,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div className="eyebrow-accent" style={{marginBottom:8}}>Restricted Area</div>
        <h2 style={{fontFamily:'var(--fs)',fontSize:30,fontWeight:700,letterSpacing:'-.02em',marginBottom:6}}>
          Admin Sign-in
        </h2>
        <p style={{fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-3)',fontSize:14,marginBottom:20,lineHeight:1.4}}>
          Editing rankings and articles is reserved for the editor. Enter the passcode to unlock.
        </p>
        <input ref={inputRef} type="password" value={val}
          onChange={e=>{setVal(e.target.value); setErr(false);}}
          onKeyDown={e=>{ if (e.key==='Enter') attempt(); }}
          placeholder="Passcode"
          style={{
            width:'100%',padding:'12px 14px',fontFamily:'var(--fm)',fontSize:14,
            border: err ? '2px solid var(--bad)' : '1px solid var(--rule-soft)',
            background:'var(--paper)',color:'var(--ink)',marginBottom:err?6:18,letterSpacing:'.1em'
          }}/>
        {err && (
          <div style={{color:'var(--bad)',fontSize:12,fontFamily:'var(--fd)',marginBottom:14}}>
            Incorrect passcode. Try again.
          </div>
        )}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={attempt}>Unlock</button>
        </div>
        <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid var(--rule-soft)',fontSize:11,color:'var(--ink-4)',fontFamily:'var(--fd)',lineHeight:1.5}}>
          First time here? Default passcode is <code style={{fontFamily:'var(--fm)',background:'var(--paper-2)',padding:'1px 5px',color:'var(--ink-2)'}}>pressbox</code>. Change it from the admin panel after unlocking.
        </div>
      </div>
    </div>
  );
}

function AdminBadge({unlocked, onClick}){
  return (
    <button onClick={onClick} className={`mode-pill ${unlocked?'admin':''}`} style={{cursor:'pointer'}}>
      {unlocked ? '● Admin' : '○ Viewer'}
    </button>
  );
}

function AdminPassChanger({onClose}){
  const [cur, setCur] = React.useState('');
  const [next, setNext] = React.useState('');
  const [next2, setNext2] = React.useState('');
  const [msg, setMsg] = React.useState(null);

  function go(){
    if (cur !== getAdminPass()) { setMsg({type:'err',text:'Current passcode wrong.'}); return; }
    if (!next || next.length < 4) { setMsg({type:'err',text:'New passcode must be at least 4 characters.'}); return; }
    if (next !== next2) { setMsg({type:'err',text:'Passcodes do not match.'}); return; }
    setAdminPass(next);
    setMsg({type:'ok',text:'Passcode updated.'});
    setCur(''); setNext(''); setNext2('');
  }

  const inp = {width:'100%',padding:'8px 10px',fontFamily:'var(--fm)',fontSize:13,border:'1px solid var(--rule-soft)',background:'var(--paper)',color:'var(--ink)',marginBottom:8};

  return (
    <div style={{border:'1px solid var(--rule-soft)',padding:16,background:'var(--paper-2)',marginTop:16}}>
      <div className="eyebrow" style={{marginBottom:10}}>Change Passcode</div>
      <input type="password" placeholder="Current passcode" value={cur} onChange={e=>setCur(e.target.value)} style={inp}/>
      <input type="password" placeholder="New passcode" value={next} onChange={e=>setNext(e.target.value)} style={inp}/>
      <input type="password" placeholder="Confirm new passcode" value={next2} onChange={e=>setNext2(e.target.value)} style={inp}/>
      {msg && (
        <div style={{fontSize:12,color: msg.type==='err'?'var(--bad)':'var(--good)',fontFamily:'var(--fd)',marginBottom:8}}>
          {msg.text}
        </div>
      )}
      <button className="btn primary" onClick={go}>Save Passcode</button>
    </div>
  );
}

Object.assign(window, { useAdmin, AdminGate, AdminBadge, AdminPassChanger, BackendUrlSetting, isAdminUnlocked, getBackendUrl });

// ───────────── Backend URL setting (admin only) ─────────────
const BACKEND_URL_KEY = 'pressbox.backendUrl.v1';
function getBackendUrl(){
  try { return (localStorage.getItem(BACKEND_URL_KEY) || '').replace(/\/$/, ''); } catch(e){ return ''; }
}
function setBackendUrl(v){
  try { localStorage.setItem(BACKEND_URL_KEY, v); } catch(e){}
}

function BackendUrlSetting(){
  const [url, setUrl] = React.useState(getBackendUrl);
  const [status, setStatus] = React.useState(null);
  const [testing, setTesting] = React.useState(false);

  function save(){
    const clean = url.trim().replace(/\/$/, '');
    setBackendUrl(clean);
    setStatus({type:'ok', text: clean ? 'Saved.' : 'Backend disabled (using local computation).'});
  }
  async function test(){
    const clean = url.trim().replace(/\/$/, '');
    if (!clean){ setStatus({type:'err',text:'Enter a URL first.'}); return; }
    setTesting(true); setStatus(null);
    try {
      const r = await fetch(clean + '/');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const json = await r.json();
      setStatus({type:'ok', text: `Connected — ${json.service||'API'} v${json.version||''} · ${json.data_source||''}`});
    } catch(e){
      setStatus({type:'err', text:'Could not reach API: ' + e.message});
    } finally { setTesting(false); }
  }

  const inp = {width:'100%',padding:'8px 10px',marginBottom:8,fontFamily:'var(--fm)',fontSize:12,
    border:'1px solid var(--rule-soft)',background:'var(--surface)',color:'var(--ink)'};

  return (
    <div style={{border:'1px solid var(--rule-soft)',padding:14,background:'var(--paper-2)',marginTop:12}}>
      <div className="eyebrow" style={{marginBottom:8,fontSize:9}}>Backend API URL</div>
      <div style={{fontSize:11,fontFamily:'var(--fs)',fontStyle:'italic',color:'var(--ink-3)',marginBottom:10,lineHeight:1.5}}>
        Optional. Leave blank to compute weighted scores locally (in-browser). Paste your deployed Render/Railway URL to use real per-game data + your CSVs server-side.
      </div>
      <input type="url" placeholder="https://your-api.onrender.com" value={url}
        onChange={e=>{setUrl(e.target.value); setStatus(null);}} style={inp}/>
      {status && (
        <div style={{fontSize:11,color: status.type==='err'?'var(--bad)':'var(--good)',fontFamily:'var(--fd)',marginBottom:8}}>{status.text}</div>
      )}
      <div style={{display:'flex',gap:6}}>
        <button className="btn ghost" onClick={test} disabled={testing} style={{flex:1,fontSize:11}}>{testing?'Testing…':'Test Connection'}</button>
        <button className="btn primary" onClick={save} style={{flex:1,fontSize:11}}>Save</button>
      </div>
    </div>
  );
}
