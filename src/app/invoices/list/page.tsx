'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice, DocumentType, DOC_STATUS_LABELS, DOCUMENT_TYPE_LABELS } from '@/types/invoice';
import { Search, SlidersHorizontal, X, Download, ChevronUp, ChevronDown } from 'lucide-react';

type SortField = 'created_at' | 'invoice_date' | 'amount' | 'supplier';

const T = {
  bg: '#0d0d0d', surface: '#1a1a1a', surfaceHigh: '#242424', border: '#2a2a2a',
  yellow: '#facc15', yellowGlow: 'rgba(250,204,21,0.15)',
  blue: '#6366f1', blueGlow: 'rgba(99,102,241,0.2)',
  text: '#e2e8f0', textDim: '#94a3b8', textMuted: '#475569',
  error: '#f87171', success: '#4ade80',
};

const DOC_TABS: { key: 'all' | DocumentType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'invoice', label: 'Invoices' },
  { key: 'quote', label: 'Quotes' },
  { key: 'purchase_order', label: 'Orders' },
  { key: 'credit_note', label: 'Credits' },
  { key: 'delivery_note', label: 'Delivery' },
  { key: 'receipt', label: 'Receipts' },
];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
  * { box-sizing:border-box; }
  body { background:${T.bg};margin:0; }
  .list-page { font-family:'Share Tech Mono','Courier New',monospace;min-height:100svh;background:${T.bg};color:${T.text}; }
  .scanline { position:fixed;top:0;left:0;right:0;bottom:0;
    background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);
    pointer-events:none;z-index:1000; }
  .list-header { background:${T.surface};border-bottom:1px solid ${T.border};
    position:sticky;top:0;z-index:40;box-shadow:0 0 20px rgba(99,102,241,0.08); }
  .list-header-top { padding:12px 16px;display:flex;align-items:center;gap:10px; }
  .list-search { flex:1;display:flex;align-items:center;gap:8px;background:${T.bg};
    border:1px solid ${T.border};border-radius:6px;padding:8px 12px; }
  .list-search input { flex:1;border:none;background:transparent;outline:none;font-size:13px;
    font-family:'Share Tech Mono',monospace;color:${T.text};letter-spacing:0.5px; }
  .list-search input::placeholder { color:${T.textMuted}; }
  .icon-btn { width:38px;height:38px;border-radius:6px;border:1px solid ${T.border};
    background:transparent;display:flex;align-items:center;justify-content:center;
    color:${T.textDim};cursor:pointer;flex-shrink:0;transition:border-color 0.2s,color 0.2s; }
  .icon-btn:hover { border-color:${T.blue};color:${T.blue}; }
  .icon-btn.active { border-color:${T.yellow};background:${T.yellowGlow};color:${T.yellow}; }
  .doc-tabs { display:flex;gap:0;overflow-x:auto;padding:0 4px;scrollbar-width:none;border-top:1px solid ${T.border}; }
  .doc-tabs::-webkit-scrollbar { display:none; }
  .doc-tab { padding:10px 14px;font-size:11px;letter-spacing:1px;color:${T.textDim};
    border:none;background:transparent;cursor:pointer;font-family:'Share Tech Mono',monospace;
    white-space:nowrap;border-bottom:2px solid transparent;text-transform:uppercase;transition:color 0.15s; }
  .doc-tab.active { color:${T.yellow};border-bottom-color:${T.yellow}; }
  .filter-panel { padding:12px 16px;background:${T.surface};border-top:1px solid ${T.border};
    display:flex;flex-wrap:wrap;gap:8px;align-items:center; }
  .f-select,.f-input { padding:7px 10px;border:1px solid ${T.border};border-radius:4px;font-size:12px;
    font-family:'Share Tech Mono',monospace;color:${T.text};background:${T.bg};outline:none; }
  .f-input { width:130px; }
  .summary-bar { padding:8px 16px;background:${T.surface};border-bottom:1px solid ${T.border};
    display:flex;align-items:center;justify-content:space-between;font-size:12px;
    color:${T.textDim};letter-spacing:0.5px; }
  .sort-bar { display:flex;gap:6px;padding:10px 16px;overflow-x:auto;scrollbar-width:none; }
  .sort-bar::-webkit-scrollbar { display:none; }
  .sort-pill { padding:5px 12px;border-radius:4px;border:1px solid ${T.border};background:transparent;
    font-size:11px;color:${T.textDim};cursor:pointer;font-family:'Share Tech Mono',monospace;
    display:flex;align-items:center;gap:4px;white-space:nowrap;letter-spacing:1px;text-transform:uppercase; }
  .sort-pill.active { border-color:${T.yellow};background:${T.yellowGlow};color:${T.yellow}; }
  .card-list { padding:0 16px 100px;display:flex;flex-direction:column;gap:10px; }
  .inv-card { background:${T.surface};border-radius:8px;border:1px solid ${T.border};
    padding:14px;cursor:pointer;transition:border-color 0.15s,box-shadow 0.15s;
    position:relative;overflow:hidden; }
  .inv-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent,${T.blue},transparent);opacity:0.3; }
  .inv-card:hover { border-color:${T.blue};box-shadow:0 0 16px rgba(99,102,241,0.15); }
  .inv-supplier { font-size:14px;color:${T.text}; }
  .inv-amount { font-size:16px;color:${T.yellow};font-family:'Share Tech Mono',monospace; }
  .inv-date { font-size:11px;color:${T.textMuted};margin-top:2px; }
  .badge { display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;
    font-size:10px;text-transform:uppercase;letter-spacing:1px;border:1px solid; }
  .empty-state { text-align:center;padding:60px 24px;color:${T.textMuted};font-size:13px;letter-spacing:1px; }
`;

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [docTab, setDocTab] = useState<'all' | DocumentType>('all');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterDocStatus, setFilterDocStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [projects, setProjects] = useState<{id:string;name:string}[]>([]);
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const router = useRouter();
  const supabase = createClient();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('invoices').select('*').eq('user_id', user?.id || '').order(sortBy, { ascending: sortDir === 'asc' });
      setInvoices(data || []);
    } finally { setLoading(false); }
  }, [sortBy, sortDir]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('projects').select('id,name').eq('user_id', user?.id || '').order('name');
      setProjects(data || []);
    };
    load();
  }, []);

  const filtered = invoices.filter(inv => {
    if (docTab !== 'all' && (inv.document_type || 'invoice') !== docTab) return false;
    if (filterSupplier && !(inv.supplier || '').toLowerCase().includes(filterSupplier.toLowerCase())) return false;
    if (filterDocStatus && inv.doc_status !== filterDocStatus) return false;
    if (filterProject && (inv as any).project_id !== filterProject) return false;
    if (filterDateFrom && inv.invoice_date && inv.invoice_date < filterDateFrom) return false;
    if (filterDateTo && inv.invoice_date && inv.invoice_date > filterDateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(inv.supplier || '').toLowerCase().includes(q) && !(inv.description || '').toLowerCase().includes(q) && !(inv.document_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const suppliers = [...new Set(invoices.map(i => i.supplier).filter(Boolean))];
  const tabCounts = DOC_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? invoices.length : invoices.filter(i => (i.document_type || 'invoice') === t.key).length;
    return acc;
  }, {} as Record<string, number>);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const exportCSV = () => {
    const rows = [
      ['Date','Doc Type','Doc No.','Supplier','Business','Description','Amount','VAT','Paid','Category'],
      ...filtered.map(i => [
        i.invoice_date||'', DOCUMENT_TYPE_LABELS[i.document_type as DocumentType]||'Invoice',
        i.document_number||'', i.supplier||'', i.business_name||'', i.description||'',
        i.amount||'', i.vat_amount||'', i.is_paid?'Yes':'No', i.category||'',
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `documents-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const fmtZAR = (n: number) => `R ${Math.round(n).toLocaleString('en-ZA')}`;
  const SortIcon = ({ f }: { f: SortField }) => sortBy === f ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : null;

  return (
    <>
      <style>{css}</style>
      <div className="list-page">
        <div className="scanline" />

        <header className="list-header">
          <div className="list-header-top">
            <button onClick={() => router.push('/invoices')} style={{ width:36,height:36,borderRadius:6,border:`1px solid ${T.border}`,background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:T.textDim,cursor:'pointer',flexShrink:0,fontFamily:'monospace',fontSize:16 }}>
              ←
            </button>
            <div className="list-search">
              <Search size={16} color={T.textMuted} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier, description, doc no…" />
              {search && <button onClick={() => setSearch('')} style={{ background:'none',border:'none',cursor:'pointer',color:T.textMuted,padding:0 }}><X size={14} /></button>}
            </div>
            <button className={`icon-btn${showFilters?' active':''}`} onClick={() => setShowFilters(f=>!f)}><SlidersHorizontal size={16} /></button>
            <button className="icon-btn" onClick={exportCSV}><Download size={16} /></button>
          </div>

          <div className="doc-tabs">
            {DOC_TABS.map(t => (
              <button key={t.key} className={`doc-tab${docTab===t.key?' active':''}`} onClick={() => setDocTab(t.key)}>
                {t.label}{tabCounts[t.key] > 0 ? ` (${tabCounts[t.key]})` : ''}
              </button>
            ))}
          </div>

          {showFilters && (
            <div className="filter-panel">
              <select className="f-select" value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
                <option value="">All Suppliers</option>
                {suppliers.map(s => <option key={s} value={s!}>{s}</option>)}
              </select>
              <select className="f-select" value={filterDocStatus} onChange={e => setFilterDocStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {Object.entries(DOC_STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {projects.length > 0 && (
                <select className="f-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <input type="date" className="f-input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
              <input type="date" className="f-input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
              {(filterSupplier||filterDocStatus||filterProject||filterDateFrom||filterDateTo) && (
                <button onClick={() => { setFilterSupplier('');setFilterDocStatus('');setFilterProject('');setFilterDateFrom('');setFilterDateTo(''); }}
                  style={{ fontSize:12,color:T.error,background:'none',border:'none',cursor:'pointer',fontFamily:'Share Tech Mono,monospace',letterSpacing:1 }}>
                  CLEAR
                </button>
              )}
            </div>
          )}
        </header>

        <div className="summary-bar">
          <span>{filtered.length} of {invoices.length} documents</span>
          <span style={{ color:T.yellow,fontFamily:'Share Tech Mono,monospace' }}>{fmtZAR(total)}</span>
        </div>

        <div className="sort-bar">
          {([['supplier','Supplier'],['invoice_date','Date'],['amount','Amount'],['created_at','Added']] as [SortField,string][]).map(([f,l]) => (
            <button key={f} className={`sort-pill${sortBy===f?' active':''}`} onClick={() => toggleSort(f)}>
              {l}<SortIcon f={f} />
            </button>
          ))}
        </div>

        <div className="card-list">
          {loading ? (
            <div className="empty-state">LOADING…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">[ NO DOCUMENTS FOUND ]</div>
          ) : filtered.map(inv => (
            <div key={inv.id} className="inv-card" onClick={() => router.push(`/invoices/${inv.id}`)}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6 }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <div className="inv-supplier">{inv.supplier || 'Unknown Supplier'}</div>
                  {inv.description && <div style={{ fontSize:12,color:T.textMuted,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{inv.description}</div>}
                </div>
                <div style={{ textAlign:'right',flexShrink:0,marginLeft:12 }}>
                  <div className="inv-amount">{inv.amount ? fmtZAR(inv.amount) : '—'}</div>
                  {inv.invoice_date && <div className="inv-date">{new Date(inv.invoice_date).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}</div>}
                </div>
              </div>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginTop:4 }}>
                {inv.category && (
                  <span className="badge" style={{ background:T.blueGlow,color:T.blue,borderColor:T.blue }}>{inv.category}</span>
                )}
                {inv.is_paid && (
                  <span className="badge" style={{ background:'rgba(74,222,128,0.1)',color:T.success,borderColor:T.success }}>
                    {inv.payment_method ? inv.payment_method.toUpperCase() : 'PAID'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
