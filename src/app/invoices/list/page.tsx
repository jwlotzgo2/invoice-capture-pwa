'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice } from '@/types/invoice';
import { Search, Download, Edit2, Loader2, FileText, ChevronDown, ChevronUp, X, Filter, SlidersHorizontal } from 'lucide-react';

const fmt = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const fmtZAR = (n: number | null) => n ? fmt.format(n).replace('ZAR', 'R') : '—';

const statusStyle = (s: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 6,
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px',
  background: s === 'approved' ? '#f0fdf4' : s === 'rejected' ? '#fff1f2' : s === 'reviewed' ? '#eff6ff' : '#fef9c3',
  color: s === 'approved' ? '#15803d' : s === 'rejected' ? '#be123c' : s === 'reviewed' ? '#1d4ed8' : '#854d0e',
});

const confColor = (c: number | null) => !c ? '#94a3b8' : c >= 0.9 ? '#16a34a' : c >= 0.7 ? '#d97706' : '#e11d48';

function exportToCSV(invoices: Invoice[]) {
  const headers = ['Date', 'Supplier', 'Business Name', 'Amount (ZAR)', 'VAT (ZAR)', 'Excl VAT', 'Status', 'Source', 'Description'];
  const rows = invoices.map((inv) => [
    inv.invoice_date || '',
    inv.supplier || '',
    inv.business_name || '',
    inv.amount?.toFixed(2) || '',
    inv.vat_amount?.toFixed(2) || '',
    inv.amount && inv.vat_amount ? (inv.amount - inv.vat_amount).toFixed(2) : '',
    inv.status,
    inv.source,
    (inv.description || '').replace(/,/g, ';'),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type SortKey = 'invoice_date' | 'supplier' | 'amount' | 'created_at';

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }
      const { data } = await supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setInvoices(data || []);
      setLoading(false);
    };
    load();
  }, []);

  // All unique suppliers for dropdown
  const supplierOptions = Array.from(new Set(invoices.map((i) => i.supplier).filter(Boolean))) as string[];

  const filtered = invoices
    .filter((inv) => {
      const q = search.toLowerCase();
      const matchSearch = !q || inv.supplier?.toLowerCase().includes(q) || inv.business_name?.toLowerCase().includes(q) || inv.description?.toLowerCase().includes(q);
      const matchSupplier = !supplierFilter || inv.supplier === supplierFilter;
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      const d = inv.invoice_date || inv.created_at?.split('T')[0];
      const matchFrom = !dateFrom || d >= dateFrom;
      const matchTo = !dateTo || d <= dateTo;
      return matchSearch && matchSupplier && matchStatus && matchFrom && matchTo;
    })
    .sort((a, b) => {
      let va: string | number = a[sortKey] || '';
      let vb: string | number = b[sortKey] || '';
      if (sortKey === 'amount') { va = a.amount || 0; vb = b.amount || 0; }
      return sortAsc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });

  const toggleSort = (key: SortKey) => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(false); } };
  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? sortAsc ? <ChevronUp size={13} color="#2563eb" /> : <ChevronDown size={13} color="#2563eb" />
    : <ChevronDown size={13} color="#cbd5e1" />;

  const hasFilters = supplierFilter || statusFilter !== 'all' || dateFrom || dateTo;
  const clearFilters = () => { setSupplierFilter(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); };

  // Totals for filtered set
  const totalAmount = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const totalVAT = filtered.reduce((s, i) => s + (i.vat_amount || 0), 0);

  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Invoices</div>
          <button onClick={() => exportToCSV(filtered)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Download size={15} />Export CSV
          </button>
        </div>

        {/* Search row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplier, description…"
              style={{ width: '100%', padding: '9px 32px 9px 34px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#0f172a', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}><X size={14} /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} style={{ width: 40, height: 40, borderRadius: 10, border: '1.5px solid', borderColor: hasFilters ? '#2563eb' : '#e2e8f0', background: hasFilters ? '#eff6ff' : '#fff', color: hasFilters ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div style={{ marginTop: 10, padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Filters</span>
              {hasFilters && <button onClick={clearFilters} style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Supplier</label>
                <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} style={inp}>
                  <option value="">All suppliers</option>
                  {supplierOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inp}>
                  <option value="all">All status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>From Date</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>To Date</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inp} />
              </div>
            </div>
          </div>
        )}

        {/* Summary row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: '#64748b' }}>
          <span>{filtered.length} of {invoices.length} invoices</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: '#0f172a' }}>
            {fmtZAR(totalAmount)} · VAT {fmtZAR(totalVAT)}
          </span>
        </div>
      </header>

      <main style={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={28} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <FileText size={40} color="#cbd5e1" />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: '12px 0 4px' }}>No invoices found</p>
            <p style={{ fontSize: 13, color: '#64748b' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Sort bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 60px 36px', gap: 8, padding: '4px 12px 8px', alignItems: 'center' }}>
              {[
                { label: 'Supplier', key: 'supplier' as SortKey },
                { label: 'Date', key: 'invoice_date' as SortKey },
                { label: 'Amount', key: 'amount' as SortKey },
                { label: 'Status', key: null },
                { label: '', key: null },
              ].map(({ label, key }) => (
                <button key={label} onClick={() => key && toggleSort(key)} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', background: 'none', border: 'none', cursor: key ? 'pointer' : 'default', fontFamily: 'inherit', padding: 0 }}>
                  {label}{key && <SortIcon k={key} />}
                </button>
              ))}
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((inv) => {
                const confidence = inv.raw_ocr_data?.confidence as number | null ?? null;
                return (
                  <div key={inv.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 60px 36px', gap: 8, alignItems: 'center' }}>
                      {/* Supplier */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inv.supplier || <span style={{ color: '#94a3b8' }}>No supplier</span>}
                        </div>
                        {inv.description && <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{inv.description}</div>}
                      </div>

                      {/* Date */}
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {inv.invoice_date || inv.created_at?.split('T')[0]}
                      </div>

                      {/* Amount */}
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace', textAlign: 'right' }}>
                        {fmtZAR(inv.amount)}
                      </div>

                      {/* Status + AI */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                        <span style={statusStyle(inv.status)}>{inv.status}</span>
                        {confidence !== null && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: confColor(confidence) }}>{Math.round(confidence * 100)}%</span>
                        )}
                      </div>

                      {/* Edit */}
                      <button onClick={() => router.push(`/invoices/${inv.id}`)} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom export */}
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button onClick={() => exportToCSV(filtered)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <Download size={15} />Export {filtered.length} invoices to CSV
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
