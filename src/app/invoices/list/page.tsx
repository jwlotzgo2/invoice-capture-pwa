'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice, DocumentType, DOCUMENT_TYPE_LABELS } from '@/types/invoice';
import { Search, X, Download, ChevronUp, ChevronDown, SlidersHorizontal, TrendingUp } from 'lucide-react';

type SortField = 'created_at' | 'invoice_date' | 'amount' | 'supplier';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  yellow: '#e5e5e5', yellowGlow: 'rgba(229,229,229,0.1)',
  blue: '#8a8a8a', blueGlow: 'rgba(138,138,138,0.15)',
  text: '#f0f0f0', textDim: '#8a8a8a', textMuted: '#6b6b6b',
  error: '#fca5a5', success: '#86efac', warning: '#fdba74',
};

function findDuplicate(inv: Invoice, all: Invoice[]): Invoice | null {
  return all.find(other => {
    if (other.id === inv.id) return false;
    const aRef = inv.document_number?.trim().toLowerCase() || '';
    const bRef = other.document_number?.trim().toLowerCase() || '';
    const sameRef = aRef.length >= 3 && bRef.length >= 3 && aRef === bRef;
    const aSupplier = inv.supplier?.trim().toLowerCase() || '';
    const bSupplier = other.supplier?.trim().toLowerCase() || '';
    const sameCombo =
      aSupplier.length > 0 && bSupplier.length > 0 &&
      aSupplier === bSupplier &&
      inv.amount != null && other.amount != null && inv.amount === other.amount &&
      inv.invoice_date && other.invoice_date && inv.invoice_date === other.invoice_date;
    return !!(sameRef || sameCombo);
  }) ?? null;
}

function getMatchStatus(inv: Invoice): 'match' | 'off' | 'none' {
  const items = Array.isArray(inv.line_items) ? inv.line_items : [];
  if (items.length === 0) return 'none';
  const itemsTotal = items.reduce((s: number, i: any) => s + (i.line_total ?? 0), 0);
  const invoiceTotal = inv.amount ?? 0;
  if (invoiceTotal === 0) return 'none';
  const exclTotal = invoiceTotal - (inv.vat_amount ?? 0);
  return Math.abs(itemsTotal - exclTotal) < 1 ? 'match' : 'off';
}

const css = `
  * { box-sizing:border-box; }
  body { background:${T.bg};margin:0; }
  .list-page { font-family:Inter, system-ui, sans-serif;min-height:100svh;background:${T.bg};color:${T.text};overflow-x:hidden; }
  .scanline { position:fixed;top:0;left:0;right:0;bottom:0;
    background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);
    pointer-events:none;z-index:1000; }
  .list-header { background:${T.surface};border-bottom:1px solid ${T.border};position:sticky;top:0;z-index:40;box-shadow:0 0 20px rgba(138,138,138,0.08); }
  .list-header-top { padding:12px 16px;display:flex;align-items:center;gap:10px; }
  .list-search { flex:1;display:flex;align-items:center;gap:8px;background:${T.bg};border:1px solid ${T.border};border-radius:6px;padding:8px 12px; }
  .list-search input { flex:1;border:none;background:transparent;outline:none;font-size:13px;font-family:Inter, system-ui, sans-serif;color:${T.text};letter-spacing:0.5px; }
  .list-search input::placeholder { color:${T.textMuted}; }
  .icon-btn { width:38px;height:38px;border-radius:6px;border:1px solid ${T.border};background:transparent;display:flex;align-items:center;justify-content:center;color:${T.textDim};cursor:pointer;flex-shrink:0;transition:border-color 0.2s,color 0.2s; }
  .icon-btn:hover { border-color:${T.blue};color:${T.blue}; }
  .icon-btn.active { border-color:${T.yellow};background:${T.yellowGlow};color:${T.yellow}; }
  .filter-panel { padding:12px 16px;background:${T.surface};border-top:1px solid ${T.border};display:flex;flex-wrap:wrap;gap:8px;align-items:center; }
  .f-select,.f-input { padding:7px 10px;border:1px solid ${T.border};border-radius:4px;font-size:12px;font-family:Inter, system-ui, sans-serif;color:${T.text};background:${T.bg};outline:none; }
  .f-input { width:130px; }
  .summary-bar { padding:8px 16px;background:${T.surface};border-bottom:1px solid ${T.border};display:flex;align-items:center;justify-content:space-between;font-size:12px;color:${T.textDim};letter-spacing:0.5px; }
  .sort-bar { display:flex;gap:6px;padding:10px 16px;overflow-x:auto;scrollbar-width:none; }
  .sort-bar::-webkit-scrollbar { display:none; }
  .sort-pill { padding:5px 12px;border-radius:4px;border:1px solid ${T.border};background:transparent;font-size:11px;color:${T.textDim};cursor:pointer;font-family:Inter, system-ui, sans-serif;display:flex;align-items:center;gap:4px;white-space:nowrap;letter-spacing:0.2px;text-transform:none; }
  .sort-pill.active { border-color:${T.yellow};background:${T.yellowGlow};color:${T.yellow}; }
  .card-list { padding:0 16px 100px;display:flex;flex-direction:column;gap:10px; }
  .inv-card { background:${T.surface};border-radius:8px;border:1px solid ${T.border};padding:14px;cursor:pointer;transition:border-color 0.15s,box-shadow 0.15s;position:relative;overflow:hidden; }
  .inv-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${T.blue},transparent);opacity:0.3; }
  .inv-card:hover { border-color:${T.blue};box-shadow:0 0 16px rgba(138,138,138,0.12); }
  .inv-card.duplicate { border-color:rgba(251,146,60,0.4); }
  .inv-card.duplicate::before { background:linear-gradient(90deg,transparent,${T.warning},transparent); }
  .badge { display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:10px;text-transform:none;letter-spacing:0.2px;border:1px solid;font-family:Inter, system-ui, sans-serif; }
  .empty-state { text-align:center;padding:60px 24px;color:${T.textMuted};font-size:13px;letter-spacing:0.2px; }
  .filter-chip { padding:4px 10px;border-radius:4px;border:1px solid ${T.border};background:transparent;font-size:11px;color:${T.textDim};cursor:pointer;font-family:Inter, system-ui, sans-serif;letter-spacing:0.2px;text-transform:none;transition:all 0.15s;white-space:nowrap; }
  .filter-chip.active { border-color:${T.yellow};background:${T.yellowGlow};color:${T.yellow}; }
`;

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterMatched, setFilterMatched] = useState<'all'|'match'|'off'|'none'>('all');
  const [filterDuplicates, setFilterDuplicates] = useState<'all'|'dupes'|'clean'>('all');
  const [filterPaid, setFilterPaid] = useState<'all'|'paid'|'unpaid'>('all');
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const router = useRouter();
  const supabase = createClient();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
      const { data } = await supabase.from('invoices').select('*').eq('user_id', user?.id || '').order(sortBy, { ascending: sortDir === 'asc' });
      setInvoices(data || []);
    } finally { setLoading(false); }
  }, [sortBy, sortDir]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    const load = async () => {
      const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
      const { data } = await supabase.from('projects').select('id,name').eq('user_id', user?.id||'').order('name');
      setProjects(data || []);
    };
    load();
  }, []);

  const filtered = invoices.filter(inv => {
    if (filterSupplier && !(inv.supplier||'').toLowerCase().includes(filterSupplier.toLowerCase())) return false;
    if (filterProject && (inv as any).project_id !== filterProject) return false;
    if (filterDateFrom && inv.invoice_date && inv.invoice_date < filterDateFrom) return false;
    if (filterDateTo && inv.invoice_date && inv.invoice_date > filterDateTo) return false;
    if (filterMatched !== 'all' && getMatchStatus(inv) !== filterMatched) return false;
    if (filterDuplicates === 'dupes' && !findDuplicate(inv, invoices) !== null) return false;
    if (filterPaid === 'paid' && !inv.is_paid) return false;
    if (filterPaid === 'unpaid' && inv.is_paid) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(inv.supplier||'').toLowerCase().includes(q) && !(inv.description||'').toLowerCase().includes(q) && !(inv.document_number||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const suppliers = [...new Set(invoices.map(i => i.supplier).filter(Boolean))];
  const dupeCount = invoices.filter(i => findDuplicate(i, invoices) !== null).length;

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const exportCSV = () => {
    const rows = [
      ['Date','Doc No.','Supplier','Business','Description','Amount','VAT','Category','Paid','Payment Method','Duplicate','Match'],
      ...filtered.map(i => [
        i.invoice_date||'', i.document_number||'', i.supplier||'', i.business_name||'',
        i.description||'', i.amount||'', i.vat_amount||'', i.category||'',
        i.is_paid?'Yes':'No', i.payment_method||'',
        findDuplicate(i, invoices) !== null?'Yes':'No', getMatchStatus(i),
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `documents-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const fmtZAR = (n: number) => `R ${Math.round(n).toLocaleString('en-ZA')}`;
  const SortIcon = ({ f }: { f: SortField }) => sortBy===f ? (sortDir==='desc'?<ChevronDown size={12}/>:<ChevronUp size={12}/>):null;

  return (
    <>
      <style>{css}</style>
      <div className="list-page">
        <div className="scanline" />

        <header className="list-header">
          <div className="list-header-top">
            <button onClick={() => router.push('/')} style={{ width:36,height:36,borderRadius:6,border:`1px solid ${T.border}`,background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:T.textDim,cursor:'pointer',flexShrink:0,fontSize:16,fontFamily:'monospace' }}>←</button>
            <div className="list-search">
              <Search size={16} color={T.textMuted} />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplier, description, doc no…" />
              {search && <button onClick={()=>setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:T.textMuted,padding:0}}><X size={14}/></button>}
            </div>
            <button className={`icon-btn${showFilters?' active':''}`} onClick={()=>setShowFilters(f=>!f)}><SlidersHorizontal size={16}/></button>
            <button className="icon-btn" onClick={() => router.push('/invoices/open')} title="Open invoices report"><TrendingUp size={16}/></button>
            <button className="icon-btn" onClick={exportCSV}><Download size={16}/></button>
          </div>

          {/* Quick filter chips */}
          <div style={{ display:'flex',gap:6,padding:'8px 16px',overflowX:'auto',scrollbarWidth:'none',maxWidth:'100vw' }}>
            <button className={`filter-chip${filterMatched==='match'?' active':''}`} onClick={()=>setFilterMatched(v=>v==='match'?'all':'match')}>✓ Matched</button>
            <button className={`filter-chip${filterMatched==='off'?' active':''}`} onClick={()=>setFilterMatched(v=>v==='off'?'all':'off')}>⚠ Off</button>
            <button className={`filter-chip${filterDuplicates==='dupes'?' active':''}`} style={{ borderColor: filterDuplicates==='dupes'?T.warning:T.border, color: filterDuplicates==='dupes'?T.warning:T.textDim, background: filterDuplicates==='dupes'?'rgba(253,186,116,0.12)':'transparent' }} onClick={()=>setFilterDuplicates(v=>v==='dupes'?'all':'dupes')}>
              ⚡ Dupes{dupeCount>0?` (${dupeCount})`:''}</button>
            <button className={`filter-chip${filterPaid==='paid'?' active':''}`} style={{ borderColor: filterPaid==='paid'?T.success:T.border, color: filterPaid==='paid'?T.success:T.textDim, background: filterPaid==='paid'?'rgba(134,239,172,0.1)':'transparent' }} onClick={()=>setFilterPaid(v=>v==='paid'?'all':'paid')}>✓ Paid</button>
            <button className={`filter-chip${filterPaid==='unpaid'?' active':''}`} style={{ borderColor: filterPaid==='unpaid'?T.error:T.border, color: filterPaid==='unpaid'?T.error:T.textDim, background: filterPaid==='unpaid'?'rgba(252,165,165,0.1)':'transparent' }} onClick={()=>setFilterPaid(v=>v==='unpaid'?'all':'unpaid')}>✗ Unpaid</button>
          </div>

          {showFilters && (
            <div className="filter-panel">
              <select className="f-select" value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)}>
                <option value="">All Suppliers</option>
                {suppliers.map(s=><option key={s} value={s!}>{s}</option>)}
              </select>
              {projects.length>0 && (
                <select className="f-select" value={filterProject} onChange={e=>setFilterProject(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <input type="date" className="f-input" value={filterDateFrom} onChange={e=>setFilterDateFrom(e.target.value)} />
              <input type="date" className="f-input" value={filterDateTo} onChange={e=>setFilterDateTo(e.target.value)} />
              {(filterSupplier||filterProject||filterDateFrom||filterDateTo) && (
                <button onClick={()=>{setFilterSupplier('');setFilterProject('');setFilterDateFrom('');setFilterDateTo('');}}
                  style={{fontSize:12,color:T.error,background:'none',border:'none',cursor:'pointer',fontFamily:'Inter, system-ui, sans-serif',letterSpacing:1}}>CLEAR</button>
              )}
            </div>
          )}
        </header>

        <div className="summary-bar">
          <span>{filtered.length} of {invoices.length} documents</span>
          <span style={{display:'flex',gap:12,alignItems:'center'}}>
            <span style={{color:T.success,fontSize:11}}>{fmtZAR(filtered.filter(i=>i.is_paid).reduce((s,i)=>s+(i.amount||0),0))} paid</span>
            <span style={{color:T.error,fontSize:11}}>{fmtZAR(filtered.filter(i=>!i.is_paid).reduce((s,i)=>s+(i.amount||0),0))} unpaid</span>
            <span style={{color:T.yellow,fontFamily:'Inter, system-ui, sans-serif'}}>{fmtZAR(total)}</span>
          </span>
        </div>

        <div className="sort-bar">
          {([['supplier','Supplier'],['invoice_date','Date'],['amount','Amount'],['created_at','Added']] as [SortField,string][]).map(([f,l])=>(
            <button key={f} className={`sort-pill${sortBy===f?' active':''}`} onClick={()=>toggleSort(f)}>
              {l}<SortIcon f={f}/>
            </button>
          ))}
        </div>

        <div className="card-list">
          {loading ? (
            <div className="empty-state">LOADING…</div>
          ) : filtered.length===0 ? (
            <div className="empty-state">[ NO Documents FOUND ]</div>
          ) : filtered.map(inv => {
            const matchStatus = getMatchStatus(inv);
            const dupedDoc = findDuplicate(inv, invoices);
            return (
              <div key={inv.id} className={`inv-card${dupedDoc?' duplicate':''}`} onClick={()=>router.push(`/invoices/${inv.id}`)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.supplier||'Unknown Supplier'}</div>
                    {inv.document_number && <div style={{fontSize:11,color:T.textMuted,fontFamily:'Inter, system-ui, sans-serif',marginTop:2}}>#{inv.document_number}</div>}
                    {inv.description && <div style={{fontSize:12,color:T.textMuted,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.description}</div>}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                    <div style={{fontSize:16,color:T.yellow,fontFamily:'Inter, system-ui, sans-serif'}}>{inv.amount?fmtZAR(inv.amount):'—'}</div>
                    {inv.invoice_date && <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{new Date(inv.invoice_date).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}</div>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6,alignItems:'center'}}>
                  {matchStatus==='match' && <span className="badge" style={{background:'rgba(134,239,172,0.12)',color:T.success,borderColor:T.success}}>✓ Match</span>}
                  {matchStatus==='off' && <span className="badge" style={{background:'rgba(252,165,165,0.12)',color:T.error,borderColor:T.error}}>⚠ Off</span>}
                  {dupedDoc && (
                    <span className="badge" style={{background:'rgba(253,186,116,0.12)',color:T.warning,borderColor:T.warning}}>
                      ⚡ Dup of: {dupedDoc.supplier||'Unknown'}{dupedDoc.document_number?` #${dupedDoc.document_number}`:''}{dupedDoc.invoice_date?` · ${new Date(dupedDoc.invoice_date).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}` :''}
                    </span>
                  )}
                  {inv.category && <span className="badge" style={{background:T.blueGlow,color:T.blue,borderColor:T.blue}}>{inv.category}</span>}
                  <button
                    onClick={async e => {
                      e.stopPropagation();
                      const supabase = createClient();
                      const newPaid = !inv.is_paid;
                      await supabase.from('invoices').update({ is_paid: newPaid }).eq('id', inv.id);
                      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, is_paid: newPaid } : i));
                    }}
                    style={{ marginLeft:'auto', padding:'2px 10px', borderRadius:4, border:`1px solid ${inv.is_paid?T.success:T.border}`, background: inv.is_paid?'rgba(134,239,172,0.1)':'transparent', color: inv.is_paid?T.success:T.textMuted, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.3px' }}
                  >{inv.is_paid ? '✓ Paid' : 'Mark Paid'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
