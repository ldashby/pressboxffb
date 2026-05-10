// ═════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═════════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo, useRef } = React || window.React;

const norm = s => (s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const scoreClass = s => s>=85?'hi':s>=72?'md':'lo';

// Tiny sparkline
function Sparkline({ data, w=44, h=14, color }) {
  const vals = data.filter(v=>v!=null && v>0);
  if (!vals.length) return null;
  const min=Math.min(...vals), max=Math.max(...vals);
  const range = max-min || 1;
  const pts = data.map((v,i) => {
    const x = (i/(data.length-1))*w;
    if (v==null||v===0) return null;
    const y = h - ((v-min)/range)*h;
    return `${x},${y}`;
  }).filter(Boolean).join(' ');
  return (
    <svg className="spark" width={w} height={h} style={{overflow:'visible'}}>
      <polyline points={pts} fill="none" stroke={color||'currentColor'} strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}

function Pos({pos}){ return <span className={`pos pos-${pos}`}>{pos}</span>; }

function Score({value}){
  const cls = scoreClass(value);
  return (
    <span className={`score ${cls}`}>
      <span className="bar"><span className="bar-fill" style={{width:`${Math.min(100,value)}%`}}/></span>
      {value}
    </span>
  );
}

function Diff({value}){
  if (value === 0 || value == null) return <span className="diff z">—</span>;
  const cls = value > 0 ? 'up' : 'dn';
  return <span className={`diff ${cls}`}>{value > 0 ? `+${value}` : value}</span>;
}

function Trend({value}){
  if (!value) return <span className="trend-cell nc">—</span>;
  const cls = value > 0 ? 'up' : 'dn';
  const arrow = value > 0 ? '▲' : '▼';
  return <span className={`trend-cell ${cls}`}>{arrow} {Math.abs(value)}</span>;
}

function OwnBar({pct}){
  return (
    <span className="own-bar-wrap">
      <span className="own-bar"><span className="own-fill" style={{width:`${pct}%`}}/></span>
      <span className="own-pct num">{pct}%</span>
    </span>
  );
}

function FactorTags({factors}){
  if(!factors?.length) return null;
  return (
    <div className="factor-tags">
      {factors.map((f,i)=>{
        const good = /elite|alpha|hog|machine|workhorse|3-down|target|catcher|floor|gl|td/i.test(f);
        const bad = /risk|returning|aging|wr2/i.test(f);
        const hot = /rookie|upside|explosive/i.test(f);
        const cls = bad?'bad':hot?'hot':good?'good':'';
        return <span key={i} className={`ftag ${cls}`}>{f}</span>;
      })}
    </div>
  );
}

function Chip({label,active,onClick,style,className=""}){
  return <button className={`chip ${className} ${active?'active':''}`} style={style} onClick={onClick}>{label}</button>;
}

function SectionHead({title,meta,right}){
  return (
    <div className="section-head">
      <h2>{title}</h2>
      <div style={{display:'flex',gap:14,alignItems:'baseline'}}>
        {meta && <span className="meta">{meta}</span>}
        {right}
      </div>
    </div>
  );
}

function HeroStrip({players, fmt}){
  const total = players.length;
  const avgScore = total ? Math.round(players.reduce((a,p)=>a+(p.score||0),0)/total) : 0;
  const risers = players.filter(p=>p.trend>0).length;
  return (
    <div className="hero-strip">
      <div className="hero-lead">
        <div className="eyebrow-accent">Editor's Note · 2026 Predraft</div>
        <h1>The Board is Set. Here's What Still Matters Before Your Draft.</h1>
        <p className="dek">
          Three weeks out from playoffs, the consensus has finally caught up to what we've been saying since training camp.
          Our board reflects {total} ranked players across {Object.keys(SOURCES).length+1} sources — with {risers} trending upward
          this week. If you're still tweaking your roster, start here.
        </p>
      </div>
      <div className="hero-stat">
        <div>
          <div className="label">Players Ranked</div>
          <div className="value num">{total}</div>
        </div>
        <div className="trend"><span className="up">+12</span> since last week</div>
      </div>
      <div className="hero-stat">
        <div>
          <div className="label">Format</div>
          <div className="value accent" style={{fontSize:28}}>{fmt}</div>
        </div>
        <div className="trend">Consensus-adjusted</div>
      </div>
      <div className="hero-stat">
        <div>
          <div className="label">Avg. Score</div>
          <div className="value num">{avgScore}</div>
        </div>
        <div className="trend"><span className="up">▲ 2.1</span> vs. week 11</div>
      </div>
    </div>
  );
}

function NewsTicker(){
  const items = [...NEWS_ITEMS, ...NEWS_ITEMS]; // loop
  return (
    <div className="news-ticker">
      <div className="ticker-label"><span className="blink"/>Live Wire</div>
      <div className="ticker-track">
        <div className="ticker-content">
          {items.map((n,i)=>(
            <span className="ticker-item" key={i}>
              <span className={`tag ${n.tag}`}>{n.cat}</span>
              <span className="time">{n.time}</span>
              <strong>{n.text}</strong>
              <span className="byline" style={{fontSize:11}}>— {n.src}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Sparkline, Pos, Score, Diff, Trend, OwnBar, FactorTags, Chip, SectionHead, HeroStrip, NewsTicker, norm, scoreClass, useState, useEffect, useMemo, useRef });
