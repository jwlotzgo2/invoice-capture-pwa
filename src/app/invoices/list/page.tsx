'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice } from '@/types/invoice';
import { Search, Download, Edit2, Loader2, FileText, X, SlidersHorizontal, ChevronUp, ChevronDown, CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';

const fmtZAR = (n: number | null) => n
  ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n).replace('ZAR', 'R')
  : '—';

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:  { background: '#fef9c3', color: '#854d0e' },
  reviewed: { background: '#eff6ff', color: '#1d4ed8' },
  approved: { background: '#f0fdf4', color: '#15803d' },
  rejected: { background: '#fff1f2', color: '#be123c' },
};

const PMT_ICON: Record<string, React.ReactNode> = {
  cash: <Banknote size={11} />,
  card: <CreditCard size={11} />,
  eft:  <ArrowLeftRight size={11} />,
};

function exportToCSV(invoices: Invoice[]) {
  const headers = ['Date', 'Supplier', 'Business Name', 'Amount', 'VAT', 'Excl VAT', 'Paid', 'Payment Method', 'Status', 'Source', 'Description'];
  const rows = invoices.map((inv) => [
    inv.invoice_date || '',
    inv.supplier || '',
    inv.business_name || '',
    inv.amount?.toFixed(2) || '',
    inv.vat_amount?.toFixed(2) || '',
    inv.amount && inv.vat_amount ? (inv.amount - inv.vat_amount).toFixed(2) : '',
    (inv as any).is_paid ? 'Yes' : 'No',
    (inv as any).payment_method || '',
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

  const supplierOptions = Array.from(new Set(invoices.map((i) => i.supplier).filter(Boolean))) as string[];

  const filtered = invoices
    .filter((inv) => {
      const q = search.toLowerCase();
      const matchSearch = !q || inv.supplier?.toLowerCase().includes(q) || inv.business_name?.toLowerCase().includes(q) || inv.description?.toLowerCase().includes(q);
      const matchSupplier = !supplierFilter || inv.supplier === supplierFilter;
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      const d = inv.invoice_date || inv.created_at?.split('T')[0];
      return matchSearch && matchSupplier && matchStatus && (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
    })
    .sort((a, b) => {
      const va: string | number = sortKey === 'amount' ? (a.amount || 0) : (a[sortKey] || '');
      const vb: string | number = sortKey === 'amount' ? (b.amount || 0) : (b[sortKey] || '');
      return sortAsc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });

  const toggleSort = (key: SortKey) => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(false); } };
  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? sortAsc ? <ChevronUp size={12} color="#2563eb" /> : <ChevronDown size={12} color="#2563eb" />
    : <ChevronDown size={12} color="#cbd5e1" />;

  const hasFilters = supplierFilter || statusFilter !== 'all' || dateFrom || dateTo;
  const clearFilters = () => { setSupplierFilter(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); };

  const totalAmount = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const totalVAT = filtered.reduce((s, i) => s + (i.vat_amount || 0), 0);

  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', outline: 'none', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Invoices</div>
          <button onClick={() => exportToCSV(filtered)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Download size={14} />Export
          </button>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search supplier, description…"
              style={{ width: '100%', padding: '9px 30px 9px 34px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#0f172a', outline: 'none', fontFamily: 'inherit', background: '#f8fafc', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
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
                  <option value="">All</option>
                  {supplierOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inp}>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inp} />
              </div>
            </div>
          </div>
        )}

        {/* Sort bar */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingBottom: 2 }}>
          {([['supplier', 'Supplier'], ['invoice_date', 'Date'], ['amount', 'Amount']] as [SortKey, string][]).map(([key, label]) => (
            <button key={key} onClick={() => toggleSort(key)} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 20, border: '1.5px solid', borderColor: sortKey === key ? '#2563eb' : '#e2e8f0', background: sortKey === key ? '#eff6ff' : '#fff', fontSize: 12, fontWeight: 600, color: sortKey === key ? '#2563eb' : '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
              {label}<SortIcon k={key} />
            </button>
          ))}
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#64748b' }}>
          <span>{filtered.length} of {invoices.length} invoices</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: '#0f172a' }}>
            {fmtZAR(totalAmount)} · VAT {fmtZAR(totalVAT)}
          </span>
        </div>
      </header>

      <main style={{ padding: '12px 16px 80px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((inv) => {
              const isPaid = (inv as any).is_paid;
              const paymentMethod = (inv as any).payment_method as string | null;
              const confidence = (inv.raw_ocr_data as any)?.confidence as number | null ?? null;
              const date = inv.invoice_date || inv.created_at?.split('T')[0];

              return (
                <div key={inv.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  {/* Row 1: Supplier + Edit */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 1 }}>
                        {inv.supplier || <span style={{ color: '#94a3b8', fontWeight: 500 }}>No supplier</span>}
                      </div>
                      {inv.business_name && inv.business_name !== inv.supplier && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>{inv.business_name}</div>
                      )}
                      {inv.description && (
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.description}</div>
                      )}
                    </div>
                    <button onClick={() => router.push(`/invoices/${inv.id}`)} style={{ width: 34, height: 34, borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', flexShrink: 0 }}>
                      <Edit2 size={14} />
                    </button>
                  </div>

                  {/* Row 2: Amount + Date */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace' }}>
                      {fmtZAR(inv.amount)}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{date}</div>
                  </div>

                  {/* Row 3: Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {/* Status */}
                    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', ...STATUS_STYLES[inv.status] }}>
                      {inv.status}
                    </span>

                    {/* Paid / Unpaid */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', background: isPaid ? '#f0fdf4' : '#fafafa', color: isPaid ? '#15803d' : '#94a3b8', border: isPaid ? 'none' : '1px solid #e2e8f0' }}>
                      {isPaid && paymentMethod && PMT_ICON[paymentMethod]}
                      {isPaid ? (paymentMethod ? paymentMethod.toUpperCase() : 'PAID') : 'UNPAID'}
                    </span>

                    {/* AI confidence */}
                    {confidence !== null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: confidence >= 0.9 ? '#16a34a' : confidence >= 0.7 ? '#d97706' : '#e11d48', marginLeft: 'auto' }}>
                        AI {Math.round(confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button onClick={() => exportToCSV(filtered)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <Download size={15} />Export {filtered.length} invoices to CSV
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
