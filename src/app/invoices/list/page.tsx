'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice, DocumentType, DOC_STATUS_LABELS, DOCUMENT_TYPE_LABELS } from '@/types/invoice';
import { Search, SlidersHorizontal, X, Download, ChevronUp, ChevronDown } from 'lucide-react';

type SortField = 'created_at' | 'invoice_date' | 'amount' | 'supplier';

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
  .list-page { font-family: 'DM Sans', sans-serif; min-height: 100svh; background: #f8fafc; }
  .list-header { background: #fff; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 40; }
  .list-header-top { padding: 12px 16px; display: flex; align-items: center; gap: 10px; }
  .list-search { flex: 1; display: flex; align-items: center; gap: 8px; background: #f1f5f9; border-radius: 10px; padding: 8px 12px; }
  .list-search input { flex: 1; border: none; background: transparent; outline: none; font-size: 14px; font-family: inherit; color: #0f172a; }
  .list-search input::placeholder { color: #94a3b8; }
  .list-icon-btn { width: 38px; height: 38px; border-radius: 9px; border: 1.5px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; color: #64748b; cursor: pointer; flex-shrink: 0; }
  .list-icon-btn.active { border-color: #2563eb; background: #eff6ff; color: #2563eb; }

  /* Doc type tabs */
  .doc-tabs { display: flex; gap: 0; overflow-x: auto; padding: 0 16px; scrollbar-width: none; border-top: 1px solid #f1f5f9; }
  .doc-tabs::-webkit-scrollbar { display: none; }
  .doc-tab { padding: 10px 14px; font-size: 13px; font-weight: 600; color: #64748b; border: none; background: transparent; cursor: pointer; font-family: inherit; white-space: nowrap; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; }
  .doc-tab.active { color: #2563eb; border-bottom-color: #2563eb; }

  /* Filter panel */
  .filter-panel { padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .filter-select { padding: 7px 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-family: inherit; color: #334155; background: #fff; outline: none; }
  .filter-input { padding: 7px 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-family: inherit; color: #334155; background: #fff; outline: none; width: 130px; }

  /* Summary bar */
  .summary-bar { padding: 8px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #64748b; }

  /* Sort bar */
  .sort-bar { display: flex; gap: 6px; padding: 10px 16px; overflow-x: auto; scrollbar-width: none; }
  .sort-bar::-webkit-scrollbar { display: none; }
  .sort-pill { padding: '5px 12px'; border-radius: 20px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 4px; white-space: nowrap; padding: 5px 12px; }
  .sort-pill.active { border-color: #2563eb; background: #eff6ff; color: #2563eb; }

  /* Cards */
  .card-list { padding: 0 16px 100px; display: flex; flex-direction: column; gap: 10px; }
  .inv-card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s; }
  .inv-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: #bfdbfe; }
  .inv-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
  .inv-supplier { font-size: 15px; font-weight: 700; color: #0f172a; }
  .inv-amount { font-size: 17px; font-weight: 700; color: #0f172a; font-family: 'DM Mono', monospace; }
  .inv-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
  .inv-desc { font-size: 13px; color: #64748b; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .empty-state { text-align: center; padding: 60px 24px; color: #94a3b8; font-size: 15px; }
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
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const router = useRouter();
  const supabase = createClient();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let q = supabase.from('invoices').select('*').eq('user_id', user?.id || '').order(sortBy, { ascending: sortDir === 'asc' });
      const { data } = await q;
      setInvoices(data || []);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortDir]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('projects').select('id, name').eq('user_id', user?.id || '').order('name');
      setProjects(data || []);
    };
    load();
  }, []);

  // Filtering
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
  const totalVat = filtered.reduce((s, i) => s + (i.vat_amount || 0), 0);
  const suppliers = [...new Set(invoices.map(i => i.supplier).filter(Boolean))];

  // Tab counts
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
      ['Date','Doc Type','Doc No.','Supplier','Business','Description','Amount','VAT','Excl VAT','Paid','Payment','Doc Status','Category'],
      ...filtered.map(i => [
        i.invoice_date || '', DOCUMENT_TYPE_LABELS[i.document_type as DocumentType] || 'Invoice',
        i.document_number || '', i.supplier || '', i.business_name || '', i.description || '',
        i.amount || '', i.vat_amount || '', i.amount && i.vat_amount ? (i.amount - i.vat_amount).toFixed(2) : '',
        i.is_paid ? 'Yes' : 'No', i.payment_method || '', i.doc_status || '', i.category || '',
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `documents-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const fmtZAR = (n: number) => `R ${Math.round(n).toLocaleString('en-ZA')}`;
  const SortIcon = ({ f }: { f: SortField }) => sortBy === f ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : null;

  return (
    <>
      <style>{css}</style>
      <div className="list-page">

        {/* Header */}
        <header className="list-header">
          <div className="list-header-top">
            <button onClick={() => router.push('/invoices')} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', flexShrink: 0 }}>
              ←
            </button>
            <div className="list-search">
              <Search size={16} color="#94a3b8" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier, description, doc no…" />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}><X size={14} /></button>}
            </div>
            <button className={`list-icon-btn${showFilters ? ' active' : ''}`} onClick={() => setShowFilters(f => !f)}><SlidersHorizontal size={16} /></button>
            <button className="list-icon-btn" onClick={exportCSV}><Download size={16} /></button>
          </div>

          {/* Doc type tabs */}
          <div className="doc-tabs">
            {DOC_TABS.map(t => (
              <button key={t.key} className={`doc-tab${docTab === t.key ? ' active' : ''}`} onClick={() => setDocTab(t.key)}>
                {t.label}{tabCounts[t.key] > 0 ? ` (${tabCounts[t.key]})` : ''}
              </button>
            ))}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="filter-panel">
              <select className="filter-select" value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
                <option value="">All Suppliers</option>
                {suppliers.map(s => <option key={s} value={s!}>{s}</option>)}
              </select>
              <select className="filter-select" value={filterDocStatus} onChange={e => setFilterDocStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {Object.entries(DOC_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {projects.length > 0 && (
                <select className="filter-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <input type="date" className="filter-input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
              <input type="date" className="filter-input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
              {(filterSupplier || filterDocStatus || filterProject || filterDateFrom || filterDateTo) && (
                <button onClick={() => { setFilterSupplier(''); setFilterDocStatus(''); setFilterProject(''); setFilterDateFrom(''); setFilterDateTo(''); }} style={{ fontSize: 12, color: '#e11d48', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Clear</button>
              )}
            </div>
          )}
        </header>

        {/* Summary */}
        <div className="summary-bar">
          <span>{filtered.length} of {invoices.length} documents</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#0f172a' }}>{fmtZAR(total)}</span>
        </div>

        {/* Sort pills */}
        <div className="sort-bar">
          {([['supplier','Supplier'],['invoice_date','Date'],['amount','Amount'],['created_at','Added']] as [SortField, string][]).map(([f, l]) => (
            <button key={f} className={`sort-pill${sortBy === f ? ' active' : ''}`} onClick={() => toggleSort(f)}>
              {l}<SortIcon f={f} />
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="card-list">
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">No documents found</div>
          ) : filtered.map(inv => {

            return (
              <div key={inv.id} className="inv-card" onClick={() => router.push(`/invoices/${inv.id}`)}>
                <div className="inv-card-top">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="inv-supplier">{inv.supplier || 'Unknown Supplier'}</div>
                    {inv.business_name && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{inv.business_name}</div>}
                    {inv.description && <div className="inv-desc">{inv.description}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div className="inv-amount">{inv.amount ? fmtZAR(inv.amount) : '—'}</div>
                    {inv.invoice_date && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{new Date(inv.invoice_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                  </div>
                </div>
                <div className="inv-meta">
                  {inv.category && <span className="badge" style={{ background: '#eff6ff', color: '#2563eb' }}>{inv.category}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
