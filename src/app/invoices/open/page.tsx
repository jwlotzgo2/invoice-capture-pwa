'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Invoice } from '@/types/invoice';
import { ArrowLeft, Download, RefreshCw, AlertCircle, Clock, TrendingUp, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

const T = {
  bg: '#1c1c1c', surface: '#282828', surfaceHigh: '#323232', border: '#383838',
  text: '#f0f0f0', textDim: '#a3a3a3', textMuted: '#6b6b6b',
  yellow: '#e5e5e5', success: '#86efac', warning: '#fdba74', error: '#fca5a5', blue: '#60a5fa',
};

const BUCKETS = [
  { label: 'Current',   min: 0,   max: 30,  color: '#86efac', bg: 'rgba(134,239,172,0.1)' },
  { label: '31–60 days',min: 31,  max: 60,  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  { label: '61–90 days',min: 61,  max: 90,  color: '#fdba74', bg: 'rgba(253,186,116,0.1)' },
  { label: '90+ days',  min: 91,  max: Infinity, color: '#fca5a5', bg: 'rgba(252,165,165,0.1)' },
];

function ageDays(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getBucket(days: number) {
  return BUCKETS.find(b => days >= b.min && days <= b.max) || BUCKETS[3];
}

const fmtZAR = (n: number) => `R ${Math.round(n).toLocaleString('en-ZA')}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; }
  .oi { font-family: Inter, system-ui, sans-serif; min-height: 100svh; background: ${T.bg}; color: ${T.text}; }
  .oi-header { background: ${T.surface}; border-bottom: 1px solid ${T.border}; padding: 14px 16px; position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 12px; }
  .oi-back { width: 34px; height: 34px; border: 1px solid ${T.border}; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: none; color: ${T.textDim}; flex-shrink: 0; }
  .oi-main { max-width: 800px; margin: 0 auto; padding: 16px 16px 80px; display: flex; flex-direction: column; gap: 16px; }
  .oi-grid-4 { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
  @media(min-width:600px){ .oi-grid-4 { grid-template-columns: repeat(4,1fr); } }
  .oi-grid-2 { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media(min-width:600px){ .oi-grid-2 { grid-template-columns: 1fr 1fr; } }
  .oi-kpi { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 12px; padding: 14px; }
  .oi-kpi-val { font-size: 22px; font-weight: 700; color: ${T.text}; line-height: 1; font-variant-numeric: tabular-nums; }
  .oi-kpi-label { font-size: 11px; color: ${T.textMuted}; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
  .oi-section { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 12px; overflow: hidden; }
  .oi-section-header { padding: 14px 16px; border-bottom: 1px solid ${T.border}; display: flex; align-items: center; justify-content: space-between; }
  .oi-section-title { font-size: 12px; font-weight: 700; color: ${T.textMuted}; text-transform: uppercase; letter-spacing: 0.8px; }
  .oi-bucket-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid ${T.border}; cursor: pointer; transition: background 0.1s; }
  .oi-bucket-row:last-child { border-bottom: none; }
  .oi-bucket-row:hover { background: ${T.surfaceHigh}; }
  .oi-bar-track { flex: 1; height: 6px; background: ${T.surfaceHigh}; border-radius: 99px; overflow: hidden; }
  .oi-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s ease; }
  .oi-supplier-row { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid ${T.border}; }
  .oi-supplier-row:last-child { border-bottom: none; }
  .oi-table { width: 100%; border-collapse: collapse; }
  .oi-table th { font-size: 10px; font-weight: 700; color: ${T.textMuted}; text-transform: uppercase; letter-spacing: 0.6px; padding: 10px 16px; text-align: left; background: ${T.surfaceHigh}; }
  .oi-table td { font-size: 12px; color: ${T.text}; padding: 10px 16px; border-top: 1px solid ${T.border}; vertical-align: middle; }
  .oi-table tr:hover td { background: ${T.surfaceHigh}; }
  .oi-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; border: 1px solid; white-space: nowrap; }
  .oi-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
  .spin { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

interface SupplierRow { supplier: string; total: number; count: number; oldest: number; }
interface CategoryRow { category: string; total: number; count: number; }

export default function OpenInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBucket, setExpandedBucket] = useState<number | null>(null);
  const [sortField, setSortField] = useState<'date'|'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const router = useRouter();
  const supabase = createClient();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', session?.user?.id || '')
      .eq('is_paid', false)
      .order('invoice_date', { ascending: true });
    setInvoices((data || []).filter(i => i.amount && i.amount > 0));
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const total = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const oldest = invoices.length ? Math.max(...invoices.map(i => ageDays(i.invoice_date))) : 0;

  // Bucket grouping
  const bucketData = BUCKETS.map(b => ({
    ...b,
    invoices: invoices.filter(i => { const d = ageDays(i.invoice_date); return d >= b.min && d <= b.max; }),
  }));
  const bucketTotals = bucketData.map(b => b.invoices.reduce((s, i) => s + (i.amount || 0), 0));
  const maxBucket = Math.max(...bucketTotals, 1);

  // Supplier breakdown
  const supplierMap: Record<string, SupplierRow> = {};
  invoices.forEach(inv => {
    const s = inv.supplier || 'Unknown';
    if (!supplierMap[s]) supplierMap[s] = { supplier: s, total: 0, count: 0, oldest: 0 };
    supplierMap[s].total += inv.amount || 0;
    supplierMap[s].count++;
    supplierMap[s].oldest = Math.max(supplierMap[s].oldest, ageDays(inv.invoice_date));
  });
  const suppliers = Object.values(supplierMap).sort((a, b) => b.total - a.total);
  const maxSupplierTotal = Math.max(...suppliers.map(s => s.total), 1);

  // Category breakdown
  const catMap: Record<string, CategoryRow> = {};
  invoices.forEach(inv => {
    const c = inv.category || 'Uncategorised';
    if (!catMap[c]) catMap[c] = { category: c, total: 0, count: 0 };
    catMap[c].total += inv.amount || 0;
    catMap[c].count++;
  });
  const categories = Object.values(catMap).sort((a, b) => b.total - a.total);

  // Sorted invoice table
  const sorted = [...invoices].sort((a, b) => {
    if (sortField === 'date') {
      const da = ageDays(a.invoice_date), db = ageDays(b.invoice_date);
      return sortDir === 'asc' ? db - da : da - db;
    } else {
      const aa = a.amount || 0, ba = b.amount || 0;
      return sortDir === 'asc' ? ba - aa : aa - ba;
    }
  });

  const toggleSort = (f: 'date'|'amount') => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  const exportCSV = () => {
    const rows = [
      ['Supplier','Doc No.','Invoice Date','Days Outstanding','Amount','VAT','Category','Aging Bucket'],
      ...sorted.map(i => {
        const days = ageDays(i.invoice_date);
        return [i.supplier||'', i.document_number||'', i.invoice_date||'', days, i.amount||'', i.vat_amount||'', i.category||'', getBucket(days).label];
      })
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `open-invoices-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const SortIcon = ({ f }: { f: 'date'|'amount' }) => sortField === f
    ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
    : null;

  return (
    <div className="oi">
      <style>{css}</style>

      <header className="oi-header">
        <button className="oi-back" onClick={() => router.push('/invoices/list')}><ArrowLeft size={16} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Open Invoices</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Unpaid · outstanding</div>
        </div>
        <button className="oi-back" onClick={exportCSV} title="Export CSV"><Download size={15} /></button>
        <button className="oi-back" onClick={fetchInvoices} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} /></button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
          <RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />Loading...
        </div>
      ) : (
        <div className="oi-main">

          {/* KPIs */}
          <div className="oi-grid-4">
            <div className="oi-kpi">
              <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><DollarSign size={11} color={T.error} />Total Outstanding</div>
              <div className="oi-kpi-val" style={{ color: T.error }}>{fmtZAR(total)}</div>
            </div>
            <div className="oi-kpi">
              <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><AlertCircle size={11} color={T.warning} />Open Invoices</div>
              <div className="oi-kpi-val">{invoices.length}</div>
            </div>
            <div className="oi-kpi">
              <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={11} color={T.warning} />Oldest</div>
              <div className="oi-kpi-val" style={{ color: oldest > 60 ? T.error : oldest > 30 ? T.warning : T.text }}>{oldest} days</div>
            </div>
            <div className="oi-kpi">
              <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><TrendingUp size={11} color={T.blue} />Avg per Invoice</div>
              <div className="oi-kpi-val">{invoices.length ? fmtZAR(total / invoices.length) : '—'}</div>
            </div>
          </div>

          <div className="oi-grid-2">
            {/* Aging buckets */}
            <div className="oi-section">
              <div className="oi-section-header">
                <span className="oi-section-title">Aging Buckets</span>
                <span style={{ fontSize: 11, color: T.textMuted }}>{fmtZAR(total)}</span>
              </div>
              {bucketData.map((b, bi) => (
                <div key={b.label}>
                  <div className="oi-bucket-row" onClick={() => setExpandedBucket(expandedBucket === bi ? null : bi)}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: b.color, flexShrink: 0 }} />
                    <div style={{ width: 90, fontSize: 12, fontWeight: 600, color: T.text, flexShrink: 0 }}>{b.label}</div>
                    <div className="oi-bar-track">
                      <div className="oi-bar-fill" style={{ width: `${(bucketTotals[bi] / maxBucket) * 100}%`, background: b.color }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: b.color, minWidth: 80, textAlign: 'right', flexShrink: 0 }}>{fmtZAR(bucketTotals[bi])}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, minWidth: 20, textAlign: 'right', flexShrink: 0 }}>{b.invoices.length}</div>
                    {expandedBucket === bi ? <ChevronUp size={13} color={T.textMuted} /> : <ChevronDown size={13} color={T.textMuted} />}
                  </div>
                  {expandedBucket === bi && b.invoices.length > 0 && (
                    <div style={{ background: T.surfaceHigh, borderTop: `1px solid ${T.border}` }}>
                      {b.invoices.map(inv => (
                        <div key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px 9px 32px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{inv.supplier || 'Unknown'}</div>
                            <div style={{ fontSize: 10, color: T.textMuted }}>{fmtDate(inv.invoice_date)} · {ageDays(inv.invoice_date)} days</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: b.color }}>{fmtZAR(inv.amount || 0)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div className="oi-section">
              <div className="oi-section-header">
                <span className="oi-section-title">By Category</span>
                <span style={{ fontSize: 11, color: T.textMuted }}>{categories.length} categories</span>
              </div>
              {categories.length === 0 ? (
                <div style={{ padding: '20px 16px', color: T.textMuted, fontSize: 13 }}>No categories assigned</div>
              ) : categories.map(c => (
                <div key={c.category} style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, fontSize: 12, color: T.text }}>{c.category}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{c.count}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.yellow, minWidth: 80, textAlign: 'right' }}>{fmtZAR(c.total)}</div>
                  <div style={{ width: 50, height: 4, background: T.surfaceHigh, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(c.total / total) * 100}%`, background: T.blue, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supplier breakdown */}
          <div className="oi-section">
            <div className="oi-section-header">
              <span className="oi-section-title">By Supplier</span>
              <span style={{ fontSize: 11, color: T.textMuted }}>{suppliers.length} suppliers</span>
            </div>
            {suppliers.map(s => (
              <div key={s.supplier} className="oi-supplier-row">
                <div style={{ width: 32, height: 32, borderRadius: 8, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: T.textDim, flexShrink: 0 }}>
                  {s.supplier[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.supplier}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{ flex: 1, height: 4, background: T.surfaceHigh, borderRadius: 99, overflow: 'hidden', maxWidth: 200 }}>
                      <div style={{ height: '100%', width: `${(s.total / maxSupplierTotal) * 100}%`, background: s.oldest > 60 ? T.error : s.oldest > 30 ? T.warning : T.success, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 10, color: T.textMuted }}>{s.count} inv · {s.oldest}d oldest</span>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.oldest > 60 ? T.error : s.oldest > 30 ? T.warning : T.text, flexShrink: 0 }}>{fmtZAR(s.total)}</div>
              </div>
            ))}
          </div>

          {/* Full invoice table */}
          <div className="oi-section">
            <div className="oi-section-header">
              <span className="oi-section-title">All Open Invoices</span>
              <span style={{ fontSize: 11, color: T.textMuted }}>{sorted.length} invoices · {fmtZAR(total)}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="oi-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Doc No.</th>
                    <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>Date <SortIcon f="date" /></span>
                    </th>
                    <th>Aging</th>
                    <th>Category</th>
                    <th onClick={() => toggleSort('amount')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>Amount <SortIcon f="amount" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(inv => {
                    const days = ageDays(inv.invoice_date);
                    const bucket = getBucket(days);
                    return (
                      <tr key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 600 }}>{inv.supplier || '—'}</td>
                        <td style={{ color: T.textMuted }}>{inv.document_number || '—'}</td>
                        <td style={{ color: T.textMuted }}>{fmtDate(inv.invoice_date)}</td>
                        <td>
                          <span className="oi-badge" style={{ background: bucket.bg, color: bucket.color, borderColor: bucket.color }}>
                            {days}d · {bucket.label}
                          </span>
                        </td>
                        <td style={{ color: T.textMuted }}>{inv.category || '—'}</td>
                        <td style={{ fontWeight: 700, color: bucket.color, textAlign: 'right' }}>{fmtZAR(inv.amount || 0)}</td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: T.textMuted, padding: 32 }}>No open invoices 🎉</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ fontWeight: 700, color: T.textMuted, paddingTop: 12 }}>Total Outstanding</td>
                    <td style={{ fontWeight: 700, color: T.error, textAlign: 'right', paddingTop: 12 }}>{fmtZAR(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
