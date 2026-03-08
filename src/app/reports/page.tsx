'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice } from '@/types/invoice';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from 'date-fns';

type Period = 'this_month' | 'last_month' | 'this_year' | 'all';
type View = 'category' | 'supplier' | 'project' | 'trend';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  yellow: '#e5e5e5', yellowGlow: 'rgba(229,229,229,0.1)',
  blue: '#8a8a8a', blueGlow: 'rgba(138,138,138,0.15)',
  text: '#f0f0f0', textDim: '#8a8a8a', textMuted: '#6b6b6b',
  error: '#fca5a5', success: '#86efac', warning: '#fdba74',
};

const CAT_COLORS = ['#8a8a8a','#e5e5e5','#86efac','#fca5a5','#fdba74','#06b6d4','#8b5cf6','#ec4899','#10b981','#8a8a8a'];

const PERIODS: {key:Period;label:string}[] = [
  {key:'this_month',label:'This Month'},
  {key:'last_month',label:'Last Month'},
  {key:'this_year',label:'This Year'},
  {key:'all',label:'All Time'},
];

const VIEWS: {key:View;label:string}[] = [
  {key:'category',label:'Category'},
  {key:'supplier',label:'Supplier'},
  {key:'project',label:'Project'},
  {key:'trend',label:'Trend'},
];

function getPeriodRange(period: Period) {
  const now = new Date();
  switch (period) {
    case 'this_month': return {from:startOfMonth(now),to:endOfMonth(now)};
    case 'last_month': {const lm=subMonths(now,1);return{from:startOfMonth(lm),to:endOfMonth(lm)};}
    case 'this_year': return {from:startOfYear(now),to:endOfYear(now)};
    default: return {from:null,to:null};
  }
}

const fmtZAR = (n:number)=>`R ${Math.round(n).toLocaleString('en-ZA')}`;

const css = `
  * { box-sizing:border-box; }
  body { background:${T.bg};margin:0; }
  .rep-page { min-height:100svh;background:${T.bg};font-family:Inter, system-ui, sans-serif,Inter, system-ui, sans-serif;color:${T.text};
    background-image:radial-gradient(ellipse at 20% 20%,rgba(99,102,241,0.06) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(250,204,21,0.04) 0%,transparent 50%); }
  .scanline { position:fixed;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);pointer-events:none;z-index:1000; }
  .rep-header { background:${T.surface};border-bottom:1px solid ${T.border};padding:14px 16px;position:sticky;top:0;z-index:40;box-shadow:0 0 20px rgba(138,138,138,0.08); }
  .rep-title { font-family:Inter, system-ui, sans-serif;font-size:22px;letter-spacing:0.3px;color:${T.yellow};text-shadow:0 0 10px rgba(229,229,229,0.12); }
  .period-strip { display:flex;gap:6px;padding:12px 16px 0;overflow-x:auto;scrollbar-width:none; }
  .period-strip::-webkit-scrollbar { display:none; }
  .period-btn { flex-shrink:0;padding:6px 14px;border-radius:4px;font-size:11px;letter-spacing:0.2px;border:1px solid ${T.border};background:transparent;color:${T.textDim};cursor:pointer;font-family:Inter, system-ui, sans-serif;text-transform:none;transition:all 0.15s; }
  .period-btn.active { background:${T.yellowGlow};border-color:${T.yellow};color:${T.yellow};box-shadow:0 0 8px rgba(229,229,229,0.1); }
  .view-tabs { display:flex;gap:0;overflow-x:auto;scrollbar-width:none;border-top:1px solid ${T.border};padding:0 4px;background:${T.surface}; }
  .view-tabs::-webkit-scrollbar { display:none; }
  .view-tab { padding:10px 14px;font-size:11px;letter-spacing:0.2px;color:${T.textDim};border:none;background:transparent;cursor:pointer;font-family:Inter, system-ui, sans-serif;white-space:nowrap;border-bottom:2px solid transparent;text-transform:none;transition:color 0.15s; }
  .view-tab.active { color:${T.yellow};border-bottom-color:${T.yellow}; }
  .t-card { background:${T.surface};border:1px solid ${T.border};border-radius:8px;padding:16px;margin-bottom:12px;position:relative;overflow:hidden; }
  .t-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${T.blue},transparent);opacity:0.4; }
  .t-card-title { font-family:Inter, system-ui, sans-serif;font-size:16px;letter-spacing:0.3px;color:${T.yellow};text-transform:none;margin-bottom:16px;display:flex;align-items:center;gap:6px; }
  .t-card-title::before { content:'>';color:${T.blue}; }
  .rank-row { display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid ${T.border}; }
  .rank-row:last-child { border-bottom:none; }
  .rank-num { width:24px;height:24px;border-radius:4px;background:${T.surfaceHigh};display:flex;align-items:center;justify-content:center;font-family:Inter, system-ui, sans-serif;font-size:18px;color:${T.textDim};flex-shrink:0; }
  .rank-bar-track { height:4px;background:${T.border};border-radius:2px;overflow:hidden;margin-top:4px; }
  .rank-bar-fill { height:100%;border-radius:2px;transition:width 0.6s; }
  .kpi-row { display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px; }
  .kpi-small { background:${T.surface};border:1px solid ${T.border};border-radius:6px;padding:12px;position:relative;overflow:hidden; }
  .kpi-small::before { content:'';position:absolute;top:0;left:0;right:0;height:2px; }
  .kpi-small.yellow::before { background:${T.yellow}; }
  .kpi-small.blue::before { background:${T.blue}; }
  .kpi-small.green::before { background:${T.success}; }
  .kpi-small-label { font-size:9px;letter-spacing:0.3px;color:${T.textDim};text-transform:none;margin-bottom:4px; }
  .kpi-small-value { font-family:Inter, system-ui, sans-serif;font-size:20px;color:${T.text};line-height:1; }
  .trend-bar-row { display:flex;align-items:flex-end;gap:4px;height:120px;margin-bottom:8px; }
  .trend-bar { flex:1;border-radius:3px 3px 0 0;transition:height 0.4s;cursor:default;position:relative; }
  .trend-bar:hover { opacity:0.8; }
  .trend-labels { display:flex;gap:4px; }
  .trend-label { flex:1;font-size:9px;color:${T.textMuted};text-align:center;letter-spacing:0.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  .donut-wrap { display:flex;align-items:center;gap:20px; }
  .legend-item { display:flex;align-items:center;gap:8px;padding:4px 0; }
  .legend-dot { width:10px;height:10px;border-radius:2px;flex-shrink:0; }
  .t-cursor { animation:tblink 1s step-end infinite;color:${T.yellow}; }
  @keyframes tblink { 0%,100%{opacity:1} 50%{opacity:0} }
`;

export default function ReportsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('this_month');
  const [view, setView] = useState<View>('category');
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('invoices').select('*').eq('user_id', user?.id||'').order('invoice_date');
    setInvoices(data || []);
    const { data: proj } = await supabase.from('projects').select('id,name').eq('user_id', user?.id||'');
    setProjects(proj || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { from, to } = getPeriodRange(period);
  const periodInvoices = from && to
    ? invoices.filter(i => { const d = i.invoice_date ? new Date(i.invoice_date) : new Date(i.created_at); return d >= from && d <= to; })
    : invoices;

  const totalAmount = periodInvoices.reduce((s,i)=>s+(i.amount??0),0);
  const totalVAT = periodInvoices.reduce((s,i)=>s+(i.vat_amount??0),0);
  const totalExcl = totalAmount - totalVAT;

  // Category breakdown
  const catMap: Record<string,number> = {};
  periodInvoices.forEach(i => { const c = i.category||'Uncategorised'; catMap[c]=(catMap[c]||0)+(i.amount??0); });
  const cats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const catTotal = cats.reduce((s,[,v])=>s+v,0)||1;

  // Supplier breakdown
  const supMap: Record<string,{total:number;count:number}> = {};
  periodInvoices.forEach(i => { const s=i.supplier||'Unknown'; if(!supMap[s])supMap[s]={total:0,count:0}; supMap[s].total+=(i.amount??0); supMap[s].count++; });
  const sups = Object.entries(supMap).sort((a,b)=>b[1].total-a[1].total).slice(0,10);
  const supMax = sups[0]?.[1]?.total || 1;

  // Project breakdown
  const projMap: Record<string,number> = {};
  periodInvoices.forEach(i => {
    const projId = (i as any).project_id;
    const projName = projId ? (projects.find(p=>p.id===projId)?.name||'Unknown') : 'No Project';
    projMap[projName]=(projMap[projName]||0)+(i.amount??0);
  });
  const projs = Object.entries(projMap).sort((a,b)=>b[1]-a[1]);
  const projMax = projs[0]?.[1]||1;

  // Monthly trend (last 12 months)
  const months: {label:string;total:number}[] = [];
  for (let i=11;i>=0;i--) {
    const d = subMonths(new Date(), i);
    const mFrom = startOfMonth(d); const mTo = endOfMonth(d);
    const total = invoices.filter(inv => { const dd = inv.invoice_date ? new Date(inv.invoice_date) : new Date(inv.created_at); return dd>=mFrom&&dd<=mTo; }).reduce((s,inv)=>s+(inv.amount??0),0);
    months.push({label:format(d,'MMM'),total});
  }
  const trendMax = Math.max(...months.map(m=>m.total),1);

  // Donut SVG
  const DonutChart = () => {
    const size = 120; const r = 46; const cx = 60; const cy = 60;
    const circ = 2*Math.PI*r;
    let offset = 0;
    return (
      <svg width={size} height={size} style={{flexShrink:0}}>
        {cats.slice(0,8).map(([cat,val],i) => {
          const pct = val/catTotal;
          const dash = pct*circ;
          const seg = (
            <circle key={cat} cx={cx} cy={cy} r={r}
              fill="none" stroke={CAT_COLORS[i%CAT_COLORS.length]} strokeWidth={14}
              strokeDasharray={`${dash} ${circ-dash}`}
              strokeDashoffset={-offset}
              style={{transition:'stroke-dashoffset 0.4s'}}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return seg;
        })}
        <circle cx={cx} cy={cy} r={r-7} fill={T.surface}/>
        <text x={cx} y={cy-6} textAnchor="middle" fill={T.textMuted} fontSize="9" fontFamily="Inter, system-ui, sans-serif" letterSpacing="1">TOTAL</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill={T.yellow} fontSize="12" fontFamily="Inter, system-ui, sans-serif">{fmtZAR(catTotal)}</text>
      </svg>
    );
  };

  return (
    <>
      <style>{css}</style>
      <div className="rep-page">
        <div className="scanline"/>
        <header className="rep-header">
          <div className="rep-title">REPORTS<span className="t-cursor">_</span></div>
        </header>

        {/* Period filter */}
        <div className="period-strip">
          {PERIODS.map(({key,label})=>(
            <button key={key} className={`period-btn${period===key?' active':''}`} onClick={()=>setPeriod(key)}>{label}</button>
          ))}
        </div>

        {/* KPI row */}
        <div style={{padding:'12px 16px 0'}}>
          <div className="kpi-row">
            <div className="kpi-small yellow">
              <div className="kpi-small-label">Total</div>
              <div className="kpi-small-value">{fmtZAR(totalAmount)}</div>
            </div>
            <div className="kpi-small green">
              <div className="kpi-small-label">Excl VAT</div>
              <div className="kpi-small-value">{fmtZAR(totalExcl)}</div>
            </div>
            <div className="kpi-small blue">
              <div className="kpi-small-label">VAT</div>
              <div className="kpi-small-value">{fmtZAR(totalVAT)}</div>
            </div>
          </div>
        </div>

        {/* View tabs */}
        <div className="view-tabs">
          {VIEWS.map(({key,label})=>(
            <button key={key} className={`view-tab${view===key?' active':''}`} onClick={()=>setView(key)}>{label}</button>
          ))}
        </div>

        <div style={{padding:'12px 16px 100px'}}>
          {loading ? (
            <div style={{textAlign:'center',padding:40,color:T.textMuted,letterSpacing:0.5}}>LOADING…</div>
          ) : periodInvoices.length === 0 ? (
            <div style={{textAlign:'center',padding:40,color:T.textMuted,letterSpacing:0.5}}>[ NO DATA FOR THIS PERIOD ]</div>
          ) : (

            <>
              {/* ── CATEGORY ── */}
              {view === 'category' && (
                <div className="t-card">
                  <div className="t-card-title">By Category</div>
                  <div className="donut-wrap">
                    <DonutChart/>
                    <div style={{flex:1,minWidth:0}}>
                      {cats.slice(0,8).map(([cat,val],i)=>(
                        <div key={cat} className="legend-item">
                          <div className="legend-dot" style={{background:CAT_COLORS[i%CAT_COLORS.length]}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:11,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{cat}</div>
                            <div style={{fontSize:10,color:T.textMuted}}>
                              {Math.round(val/catTotal*100)}% · {fmtZAR(val)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Full bar chart */}
                  <div style={{marginTop:20}}>
                    {cats.map(([cat,val],i)=>(
                      <div key={cat} style={{marginBottom:10}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                          <span style={{color:T.textDim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'60%'}}>{cat}</span>
                          <span style={{color:T.yellow,fontFamily:'Inter, system-ui, sans-serif',flexShrink:0}}>{fmtZAR(val)}</span>
                        </div>
                        <div style={{height:4,background:T.border,borderRadius:2,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${val/catTotal*100}%`,background:CAT_COLORS[i%CAT_COLORS.length],borderRadius:2,transition:'width 0.6s'}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SUPPLIER ── */}
              {view === 'supplier' && (
                <div className="t-card">
                  <div className="t-card-title">By Supplier</div>
                  {sups.map(([name,stats],i)=>(
                    <div key={name} className="rank-row">
                      <div className="rank-num">{i+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:13,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
                          <span style={{fontSize:13,color:T.yellow,fontFamily:'Inter, system-ui, sans-serif',flexShrink:0,marginLeft:8}}>{fmtZAR(stats.total)}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div className="rank-bar-track" style={{flex:1}}>
                            <div className="rank-bar-fill" style={{width:`${stats.total/supMax*100}%`,background:T.blue}}/>
                          </div>
                          <span style={{fontSize:10,color:T.textMuted,flexShrink:0}}>{stats.count} doc{stats.count!==1?'s':''}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── PROJECT ── */}
              {view === 'project' && (
                <div className="t-card">
                  <div className="t-card-title">By Project</div>
                  {projs.length === 0 ? (
                    <div style={{fontSize:13,color:T.textMuted,textAlign:'center',padding:20}}>No project data</div>
                  ) : projs.map(([name,total],i)=>(
                    <div key={name} className="rank-row">
                      <div className="rank-num">{i+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:13,color:name==='No Project'?T.textMuted:T.text}}>{name}</span>
                          <span style={{fontSize:13,color:T.yellow,fontFamily:'Inter, system-ui, sans-serif'}}>{fmtZAR(total)}</span>
                        </div>
                        <div className="rank-bar-track">
                          <div className="rank-bar-fill" style={{width:`${total/projMax*100}%`,background:CAT_COLORS[i%CAT_COLORS.length]}}/>
                        </div>
                        <div style={{fontSize:10,color:T.textMuted,marginTop:3}}>
                          {Math.round(total/catTotal*100)}% of total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TREND ── */}
              {view === 'trend' && (
                <div className="t-card">
                  <div className="t-card-title">Monthly Trend · Last 12 Months</div>
                  <div className="trend-bar-row">
                    {months.map(({label,total},i)=>(
                      <div key={i} title={`${label}: ${fmtZAR(total)}`}
                        className="trend-bar"
                        style={{
                          height:`${Math.max(total/trendMax*100,total>0?4:1)}%`,
                          background: total === Math.max(...months.map(m=>m.total)) ? T.yellow : T.blue,
                          opacity: total===0 ? 0.2 : 1,
                        }}
                      />
                    ))}
                  </div>
                  <div className="trend-labels">
                    {months.map(({label},i)=>(
                      <div key={i} className="trend-label">{label}</div>
                    ))}
                  </div>
                  <div style={{marginTop:16,borderTop:`1px solid ${T.border}`,paddingTop:12}}>
                    {months.filter(m=>m.total>0).reverse().slice(0,6).map(({label,total},i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${T.border}`}}>
                        <span style={{fontSize:12,color:T.textDim}}>{label}</span>
                        <span style={{fontSize:12,color:T.yellow,fontFamily:'Inter, system-ui, sans-serif'}}>{fmtZAR(total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
